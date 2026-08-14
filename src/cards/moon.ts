import { LitElement, html, css, nothing, TemplateResult } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { HomeAssistant, HassEntity, LovelaceCardConfig } from '../types';
import { silkControlStyles } from '../shared/base';
import { isUnavailable, moreInfo, stateText, clamp } from '../shared/service';
import { accentFor } from '../shared/color';
import { registerEditor } from '../shared/editor';

export const META = {
  type: 'silk-moon-card',
  name: 'Silk Moon',
  description: 'The phase, drawn correctly.',
};

export interface SilkMoonCardConfig extends LovelaceCardConfig {
  /** A moon phase sensor. Omit to compute the phase locally from the date. */
  entity?: string;
  name?: string;
  /** Disc diameter cap in px. Default 96. */
  size?: number;
}

type PhaseKey =
  | 'new'
  | 'waxing_crescent'
  | 'first_quarter'
  | 'waxing_gibbous'
  | 'full'
  | 'waning_gibbous'
  | 'last_quarter'
  | 'waning_crescent';

const PHASE_LABELS: Record<PhaseKey, string> = {
  new: 'New moon',
  waxing_crescent: 'Waxing crescent',
  first_quarter: 'First quarter',
  waxing_gibbous: 'Waxing gibbous',
  full: 'Full moon',
  waning_gibbous: 'Waning gibbous',
  last_quarter: 'Last quarter',
  waning_crescent: 'Waning crescent',
};

/**
 * Phase bins as fractions of the cycle; each entry is that bin's upper bound.
 * The four exact phases get a ±0.75 day window — wider than HA's own sensor
 * uses, because a mean-synodic model drifts up to ~0.6 day against the real
 * moon and a tighter window would print "waning crescent" on new moon night.
 */
const PHASE_BINS: [number, PhaseKey][] = [
  [0.0254, 'new'],
  [0.2246, 'waxing_crescent'],
  [0.2754, 'first_quarter'],
  [0.4746, 'waxing_gibbous'],
  [0.5254, 'full'],
  [0.7246, 'waning_gibbous'],
  [0.7754, 'last_quarter'],
  [0.9746, 'waning_crescent'],
  [1.0001, 'new'],
];

const DAY_MS = 86_400_000;
/** Mean synodic month, and a new moon to count from: 2000-01-06T18:14Z. */
const SYNODIC_DAYS = 29.530588853;
const KNOWN_NEW_MOON_MS = Date.UTC(2000, 0, 6, 18, 14);
/** The disc changes by ~5%/day at most; half-hourly is plenty. */
const TICK_MS = 1_800_000;

const DEFAULT_SIZE = 96;
const MIN_SIZE = 48;
const MAX_SIZE = 200;

/** Drawing geometry — viewBox is square so the disc never distorts. */
const VIEW = 100;
const CX = 50;
const CY = 50;
const R = 46;

interface MoonPhase {
  /** Position through the synodic cycle, 0 (new) … 1 (next new). */
  p: number;
  /** Illuminated fraction of the disc, 0 … 1. */
  fraction: number;
  waxing: boolean;
  key: PhaseKey;
  /** Days until the next full moon. */
  daysToFull: number;
}

/** Standard synodic approximation — accurate to a few hours, plenty here. */
function computePhase(nowMs: number): MoonPhase {
  const cycles = (nowMs - KNOWN_NEW_MOON_MS) / DAY_MS / SYNODIC_DAYS;
  const p = cycles - Math.floor(cycles); // always 0..1, also for pre-2000 dates
  const key = PHASE_BINS.find(([limit]) => p < limit)?.[1] ?? 'new';
  return {
    p,
    // Illumination follows the phase angle, not the elapsed days: a linear
    // ramp would draw the quarters in the wrong place.
    fraction: (1 - Math.cos(2 * Math.PI * p)) / 2,
    waxing: p < 0.5,
    key,
    daysToFull: ((0.5 - p + 1) % 1) * SYNODIC_DAYS,
  };
}

/** Sensor state → phase key form, e.g. 'Waxing Crescent' → 'waxing_crescent'. */
function normalizeState(state: string): string {
  return state.toLowerCase().trim().replace(/\s+/g, '_');
}

/** Waxing/waning implied by a sensor state; null when the state can't say. */
function waxingFromState(state: string): boolean | null {
  if (state.startsWith('waxing') || state === 'first_quarter') return true;
  if (state.startsWith('waning') || state === 'last_quarter' || state === 'third_quarter') {
    return false;
  }
  return null; // new / full / unrecognized — the disc is symmetric anyway
}

/**
 * Some moon sensors publish an illumination attribute; both 0–1 and 0–100
 * conventions occur in the wild, so anything above 1 is read as a percentage.
 */
function attrFraction(stateObj?: HassEntity): number | null {
  if (!stateObj) return null;
  const raw = stateObj.attributes.illumination ?? stateObj.attributes.moon_illumination;
  if (raw === undefined || raw === null || raw === '') return null;
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0) return null;
  return clamp(n > 1 ? n / 100 : n, 0, 1);
}

/**
 * The shadow as one path: the dark limb (a true half-circle) plus the
 * terminator (a true half-ellipse whose semi-minor axis is |1 − 2f|·r, zero at
 * the quarters where the terminator is a straight line). Both sweep flags flip
 * at half moon — before it the terminator bulges into the lit side, after it
 * away — and mirroring the limb flips waxing to waning.
 */
function shadowPath(fraction: number, waxing: boolean): string {
  const rx = Math.abs(1 - 2 * fraction) * R;
  // sweep 0 draws the limb down the left of the disc, 1 down the right.
  const limbSweep = waxing ? 0 : 1;
  const termSweep = fraction < 0.5 ? limbSweep : 1 - limbSweep;
  const top = CY - R;
  const bottom = CY + R;
  return (
    `M ${CX} ${top} A ${R} ${R} 0 0 ${limbSweep} ${CX} ${bottom} ` +
    `A ${rx.toFixed(3)} ${R} 0 0 ${termSweep} ${CX} ${top} Z`
  );
}

const EDITOR_TAG = 'silk-moon-card-editor';

registerEditor(
  EDITOR_TAG,
  [
    { name: 'entity', selector: { entity: { domain: ['sensor'] } } },
    { name: 'name', selector: { text: {} } },
    {
      name: 'size',
      selector: { number: { min: MIN_SIZE, max: MAX_SIZE, step: 4, mode: 'box' } },
    },
  ],
  { entity: '달 위상 센서 (선택)', name: '이름', size: '원반 크기 (px)' },
  { size: DEFAULT_SIZE }
);

@customElement('silk-moon-card')
export class SilkMoonCard extends LitElement {
  @property({ attribute: false }) public hass?: HomeAssistant;

  @state() private _config?: SilkMoonCardConfig;
  /** Wall-clock tick so a locally computed phase stays current. */
  @state() private _now = Date.now();

  private _tickTimer?: number;

  public static getStubConfig(hass: HomeAssistant): Partial<SilkMoonCardConfig> {
    const entity = Object.keys(hass.states).find(
      (id) => id.startsWith('sensor.') && id.includes('moon')
    );
    return { type: 'custom:silk-moon-card', entity };
  }

  public static async getConfigElement(): Promise<HTMLElement> {
    return document.createElement(EDITOR_TAG);
  }

  public setConfig(config: SilkMoonCardConfig): void {
    if (config.size !== undefined && !(Number(config.size) > 0)) {
      throw new Error('silk-moon-card: `size` must be a positive number');
    }
    this._config = config;
  }

  public getCardSize(): number {
    return 2;
  }

  public getGridOptions(): Record<string, number> {
    return { columns: 3, rows: 2, min_columns: 2, min_rows: 2 };
  }

  public connectedCallback(): void {
    super.connectedCallback();
    this._now = Date.now();
    this._tickTimer = window.setInterval(() => {
      this._now = Date.now();
    }, TICK_MS);
  }

  public disconnectedCallback(): void {
    super.disconnectedCallback();
    window.clearInterval(this._tickTimer);
  }

  /** Humanized phase name: the sensor's own wording when it has one. */
  private _phaseLabel(stateObj: HassEntity | undefined, computed: MoonPhase): string {
    if (stateObj && !isUnavailable(stateObj)) {
      if (this.hass?.formatEntityState) return stateText(this.hass, stateObj);
      const key = normalizeState(stateObj.state);
      if (key in PHASE_LABELS) return PHASE_LABELS[key as PhaseKey];
      const words = stateObj.state.replace(/_/g, ' ');
      return words.charAt(0).toUpperCase() + words.slice(1);
    }
    return PHASE_LABELS[computed.key];
  }

  private _onCardClick(): void {
    const entity = this._config?.entity;
    if (entity) moreInfo(this, entity);
  }

  protected render(): TemplateResult | typeof nothing {
    const config = this._config;
    if (!config) return nothing;
    const hass = this.hass;
    const entityId = config.entity;
    const stateObj = entityId ? hass?.states[entityId] : undefined;
    if (entityId && hass && !stateObj) {
      return html`<ha-card><div class="warning">Entity not found: ${entityId}</div></ha-card>`;
    }

    // The phase is astronomy, so it is always computed: the sensor supplies the
    // wording (and an illumination number when it has one). An unavailable
    // sensor still dims the card, per the shared unavailable treatment, but the
    // drawing below it stays correct rather than going blank.
    const computed = computePhase(this._now);
    const unavailable = entityId !== undefined && isUnavailable(stateObj);
    const live = stateObj && !isUnavailable(stateObj) ? stateObj : undefined;
    // Only a sensor that actually names a phase is trusted for illumination —
    // `illumination` means lux on plenty of other sensors.
    const isPhaseSensor = live !== undefined && normalizeState(live.state) in PHASE_LABELS;
    const fraction = (isPhaseSensor ? attrFraction(live) : null) ?? computed.fraction;
    const waxing = (live ? waxingFromState(normalizeState(live.state)) : null) ?? computed.waxing;

    const accent = accentFor(stateObj);
    const size = clamp(Math.round(Number(config.size) || DEFAULT_SIZE), MIN_SIZE, MAX_SIZE);
    const label = this._phaseLabel(stateObj, computed);
    const percent = Math.round(fraction * 100);
    const days = Math.round(computed.daysToFull);
    // Just past full, daysToFull wraps to ~29 — say the honest thing instead.
    const nextFull = entityId
      ? null
      : computed.key === 'full' || days < 1
        ? 'Full moon tonight'
        : `Next full moon in ${days} day${days === 1 ? '' : 's'}`;

    return html`
      <ha-card
        class="${unavailable ? 'unavailable' : ''} ${entityId ? '' : 'static'}"
        style="--silk-accent:${accent};--silk-moon-size:${size}px"
        @click=${this._onCardClick}
      >
        ${config.name ? html`<div class="head">${config.name}</div>` : nothing}
        <div class="disc">
          <svg viewBox="0 0 ${VIEW} ${VIEW}" role="img" aria-label="${label}, ${percent}% illuminated">
            <circle class="body" cx=${CX} cy=${CY} r=${R}></circle>
            <circle class="crater" cx="37" cy="36" r="9"></circle>
            <circle class="crater" cx="63" cy="59" r="6"></circle>
            <circle class="crater" cx="44" cy="70" r="4.5"></circle>
            <path class="shadow" d=${shadowPath(fraction, waxing)}></path>
            <circle class="limb" cx=${CX} cy=${CY} r=${R}></circle>
          </svg>
        </div>
        <div class="phase" title=${label}>${label}</div>
        <div class="sub">${percent}% illuminated</div>
        ${nextFull ? html`<div class="sub">${nextFull}</div>` : nothing}
      </ha-card>
    `;
  }

  static styles = [
    silkControlStyles,
    css`
      ha-card {
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 2px;
        padding: 12px;
        text-align: center;
      }
      ha-card.static {
        cursor: default;
      }
      .head {
        flex: none;
        max-width: 100%;
        margin-bottom: 2px;
        font-size: 12px;
        line-height: 1.3;
        color: var(--secondary-text-color);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .disc {
        flex: 1 1 auto;
        min-height: 0;
        width: 100%;
        display: grid;
        place-items: center;
        margin-bottom: 4px;
      }
      svg {
        display: block;
        width: 100%;
        height: 100%;
        max-width: var(--silk-moon-size);
        max-height: var(--silk-moon-size);
      }
      /* The moon is a depiction, so it keeps its own soft grey-blue in both
         themes; the card's chroma budget stays with --silk-accent. */
      .body {
        fill: #dfe6f2;
      }
      .crater {
        fill: rgba(0, 0, 0, 0.055);
      }
      /* The unlit side is sky: it takes the card's own background. */
      .shadow {
        fill: var(--ha-card-background, var(--card-background-color, #fff));
      }
      .limb {
        fill: none;
        stroke: rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.14);
        stroke-width: 1;
        vector-effect: non-scaling-stroke;
      }
      .phase {
        flex: none;
        max-width: 100%;
        font-size: 13px;
        font-weight: 500;
        line-height: 1.3;
        color: var(--primary-text-color);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .sub {
        flex: none;
        max-width: 100%;
        font-size: 11px;
        line-height: 1.3;
        color: var(--secondary-text-color);
        font-variant-numeric: tabular-nums;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .unavailable .disc,
      .unavailable .head,
      .unavailable .phase,
      .unavailable .sub {
        opacity: 0.45;
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    'silk-moon-card': SilkMoonCard;
  }
}
