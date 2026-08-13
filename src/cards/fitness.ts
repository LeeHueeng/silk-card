import { LitElement, html, svg, css, nothing, TemplateResult, SVGTemplateResult } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { HomeAssistant, HassEntity, LovelaceCardConfig } from '../types';
import { silkControlStyles } from '../shared/base';
import { isUnavailable, moreInfo } from '../shared/service';
import { accentFor } from '../shared/color';
import { registerEditor } from '../shared/editor';
import { formatNumber } from '../format';

export const META = {
  type: 'silk-fitness-card',
  name: 'Silk Fitness',
  description: 'Three rings, one glance.',
};

/** A ring: the sensor and the goal it is measured against. */
export interface FitnessRingConfig {
  entity: string;
  goal?: number;
}

export interface SilkFitnessCardConfig extends LovelaceCardConfig {
  /** Each ring accepts `entity: sensor.x` or the bare entity id. */
  steps?: FitnessRingConfig | string;
  exercise?: FitnessRingConfig | string;
  stand?: FitnessRingConfig | string;
  /** Sub-label under the center value; defaults to the primary ring's name. */
  name?: string;
  /** Accent override for the card (rings keep their own hues). */
  color?: string;
}

type MetricKey = 'steps' | 'exercise' | 'stand';

/**
 * The shared Silk categorical palette, in order. Activity rings are genuinely
 * categorical — three different measures, not three levels of one — so each
 * metric keeps its own hue no matter how many rings are configured.
 */
const PALETTE = [
  'var(--primary-color, #4aa8ff)',
  '#ef6c6c',
  '#5ec78d',
  '#f0b357',
  '#a97ee8',
  '#e879b9',
];

const METRICS: Record<MetricKey, { label: string; color: string; goal: number }> = {
  steps: { label: 'Steps', color: PALETTE[0], goal: 10000 },
  exercise: { label: 'Exercise', color: PALETTE[1], goal: 30 },
  stand: { label: 'Stand', color: PALETTE[2], goal: 12 },
};

const ORDER: MetricKey[] = ['steps', 'exercise', 'stand'];

/**
 * Ring geometry. Stroke 8 with a 2px surface gap between rings, so radii step
 * by 10. `pathLength` normalizes each circumference to 100, making
 * dashoffset = 100 − percent. The SVG scales with the card; the center value
 * is HTML at a fixed size, the same split the gauge card uses.
 */
const SIZE = 120;
const CENTER = SIZE / 2;
const STROKE = 8;
const RING_PITCH = STROKE + 2;
const OUTER_R = (SIZE - STROKE) / 2;
const ARC_UNITS = 100;
/** Only a sliver of progress still deserves a visible mark. */
const MIN_ARC = 1.2;

interface Ring {
  key: MetricKey;
  entity: string;
  label: string;
  color: string;
  goal: number;
  /** Current value; undefined when missing or unavailable. */
  value?: number;
  /** value / goal, undefined when there is no value. */
  ratio?: number;
}

const EDITOR_TAG = 'silk-fitness-card-editor';

/**
 * ha-form nests an expandable section's fields under its own name, which is
 * exactly the `{entity, goal}` shape each ring takes in YAML.
 */
const ringSection = (name: MetricKey, title: string) => ({
  name,
  type: 'expandable',
  title,
  schema: [
    { name: 'entity', selector: { entity: { domain: ['sensor', 'input_number', 'counter'] } } },
    { name: 'goal', selector: { number: { min: 1, mode: 'box' } } },
  ],
});

registerEditor(
  EDITOR_TAG,
  [
    { name: 'name', selector: { text: {} } },
    ringSection('steps', 'Steps ring'),
    ringSection('exercise', 'Exercise ring'),
    ringSection('stand', 'Stand ring'),
  ],
  { name: 'Name', entity: 'Entity', goal: 'Goal' }
);

@customElement('silk-fitness-card')
export class SilkFitnessCard extends LitElement {
  @property({ attribute: false }) public hass?: HomeAssistant;

  @state() private _config?: SilkFitnessCardConfig;
  /** False for the first paint so every ring sweeps in from zero. */
  @state() private _drawn = false;

  public static getStubConfig(hass: HomeAssistant): Partial<SilkFitnessCardConfig> {
    const ids = Object.keys(hass.states).filter((id) => id.startsWith('sensor.'));
    const find = (...needles: string[]) =>
      ids.find((id) => needles.some((n) => id.toLowerCase().includes(n)));
    const steps = find('steps', 'step_count');
    const exercise = find('exercise', 'active_minutes', 'activity');
    const stand = find('stand', 'stand_hours');
    const config: Partial<SilkFitnessCardConfig> = { type: 'custom:silk-fitness-card' };
    if (steps) config.steps = { entity: steps, goal: METRICS.steps.goal };
    if (exercise) config.exercise = { entity: exercise, goal: METRICS.exercise.goal };
    if (stand) config.stand = { entity: stand, goal: METRICS.stand.goal };
    if (!steps && !exercise && !stand && ids.length) {
      config.steps = { entity: ids[0], goal: METRICS.steps.goal };
    }
    return config;
  }

  public static async getConfigElement(): Promise<HTMLElement> {
    return document.createElement(EDITOR_TAG);
  }

  public setConfig(config: SilkFitnessCardConfig): void {
    let count = 0;
    for (const key of ORDER) {
      const raw = config[key];
      if (raw === undefined) continue;
      const entity = typeof raw === 'string' ? raw : raw?.entity;
      if (typeof entity !== 'string' || entity === '') {
        throw new Error(`silk-fitness-card: \`${key}\` needs an \`entity\``);
      }
      const goal = typeof raw === 'string' ? undefined : raw?.goal;
      if (goal !== undefined && !(Number(goal) > 0)) {
        throw new Error(`silk-fitness-card: \`${key}.goal\` must be a positive number`);
      }
      count++;
    }
    if (count === 0) {
      throw new Error('silk-fitness-card: configure at least one of `steps`, `exercise`, `stand`');
    }
    this._config = config;
    this._drawn = false;
  }

  public getCardSize(): number {
    return 3;
  }

  public getGridOptions(): Record<string, number> {
    return { columns: 4, rows: 3, min_columns: 3, min_rows: 3 };
  }

  protected firstUpdated(): void {
    // Commit one frame at zero so the 450ms dashoffset transition sweeps in.
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        this._drawn = true;
      });
    });
  }

  /** Configured rings, outermost first, in steps → exercise → stand order. */
  private _rings(): Ring[] {
    const config = this._config;
    const hass = this.hass;
    if (!config) return [];
    const rings: Ring[] = [];
    for (const key of ORDER) {
      const raw = config[key];
      if (raw === undefined) continue;
      const entity = typeof raw === 'string' ? raw : raw.entity;
      if (typeof entity !== 'string' || !entity) continue;
      const meta = METRICS[key];
      const goal = Number(typeof raw === 'string' ? meta.goal : (raw.goal ?? meta.goal));
      const stateObj: HassEntity | undefined = hass?.states[entity];
      const numeric = Number(stateObj?.state);
      const value =
        stateObj && !isUnavailable(stateObj) && stateObj.state !== '' && Number.isFinite(numeric)
          ? numeric
          : undefined;
      rings.push({
        key,
        entity,
        label: meta.label,
        color: meta.color,
        goal: goal > 0 ? goal : meta.goal,
        value,
        ratio: value === undefined ? undefined : Math.max(value, 0) / (goal > 0 ? goal : meta.goal),
      });
    }
    return rings;
  }

  private _onCardClick(): void {
    const first = this._rings()[0];
    if (first) moreInfo(this, first.entity);
  }

  private _onLegendClick(ev: Event, entity: string): void {
    ev.stopPropagation();
    moreInfo(this, entity);
  }

  private _pct(ring: Ring): string {
    return ring.ratio === undefined ? '—' : `${Math.round(ring.ratio * 100)}%`;
  }

  private _locale(): string {
    return this.hass?.locale?.language ?? this.hass?.language ?? 'en';
  }

  /**
   * Activity counts are whole things — 22 minutes, not 22.0. Only a configured
   * display precision or a genuinely fractional value earns decimals.
   */
  private _num(entity: string, value: number): string {
    const precision = this.hass?.entities?.[entity]?.display_precision;
    if (precision === undefined && Number.isInteger(value)) {
      return new Intl.NumberFormat(this._locale(), { maximumFractionDigits: 0 }).format(value);
    }
    return formatNumber(this.hass, entity, value);
  }

  private _title(ring: Ring): string {
    const value = ring.value === undefined ? '—' : this._num(ring.entity, ring.value);
    return `${ring.label} · ${value} / ${this._num(ring.entity, ring.goal)} · ${this._pct(ring)}`;
  }

  /** One ring: its track, its progress arc, and a second lap past the goal. */
  private _renderRing(ring: Ring, slot: number): SVGTemplateResult {
    const r = OUTER_R - slot * RING_PITCH;
    const ratio = this._drawn ? (ring.ratio ?? 0) : 0;
    const first = Math.min(ratio, 1) * ARC_UNITS;
    const lap = Math.min(Math.max(ratio - 1, 0), 1) * ARC_UNITS;
    return svg`
      <g class="ring">
        <title>${this._title(ring)}</title>
        <circle
          class="track"
          cx=${CENTER}
          cy=${CENTER}
          r=${r}
          style="stroke: color-mix(in srgb, ${ring.color} 18%, transparent)"
        ></circle>
        <circle
          class="arc"
          cx=${CENTER}
          cy=${CENTER}
          r=${r}
          pathLength=${ARC_UNITS}
          stroke-dasharray=${ARC_UNITS}
          style="stroke:${ring.color};stroke-dashoffset:${ARC_UNITS - first};opacity:${
            first >= MIN_ARC ? 1 : 0
          }"
        ></circle>
        <circle
          class="arc lap"
          cx=${CENTER}
          cy=${CENTER}
          r=${r}
          pathLength=${ARC_UNITS}
          stroke-dasharray=${ARC_UNITS}
          style="stroke:${ring.color};stroke-dashoffset:${ARC_UNITS - lap};opacity:${
            lap >= MIN_ARC ? 0.4 : 0
          }"
        ></circle>
      </g>
    `;
  }

  protected render(): TemplateResult | typeof nothing {
    const config = this._config;
    const hass = this.hass;
    if (!config || !hass) return nothing;

    const rings = this._rings();
    if (rings.length === 0) return nothing;
    if (rings.every((ring) => !hass.states[ring.entity])) {
      return html`
        <ha-card class="control">
          <div class="warning">Entity not found: ${rings.map((r) => r.entity).join(', ')}</div>
        </ha-card>
      `;
    }

    const primary = rings[0];
    const unavailable = rings.every((ring) => ring.value === undefined);
    const accent = accentFor(hass.states[primary.entity], config.color);
    const label = config.name ?? primary.label;
    const centerValue =
      primary.value === undefined ? '—' : this._num(primary.entity, primary.value);

    return html`
      <ha-card
        class="control ${unavailable ? 'unavailable' : ''}"
        style="--silk-accent:${accent}"
        @click=${this._onCardClick}
      >
        <div class="rings">
          <svg viewBox="0 0 ${SIZE} ${SIZE}">
            <g transform="rotate(-90 ${CENTER} ${CENTER})">
              ${rings.map((ring, slot) => this._renderRing(ring, slot))}
            </g>
          </svg>
          <div class="readout">
            <div class="value">${centerValue}</div>
            <div class="label" title=${label}>${label}</div>
          </div>
        </div>
        <div class="legend">
          ${rings.map(
            (ring) => html`
              <button
                class="lrow"
                title=${this._title(ring)}
                aria-label=${this._title(ring)}
                @click=${(ev: Event) => this._onLegendClick(ev, ring.entity)}
              >
                <span class="dot" style="background:${ring.color}"></span>
                <span class="llabel">${ring.label}</span>
                <span class="lval">
                  ${ring.value === undefined ? '—' : this._num(ring.entity, ring.value)} /
                  ${this._num(ring.entity, ring.goal)}
                </span>
                <span class="lpct">${this._pct(ring)}</span>
              </button>
            `
          )}
        </div>
      </ha-card>
    `;
  }

  static styles = [
    silkControlStyles,
    css`
      ha-card {
        flex-direction: column;
        align-items: stretch;
        justify-content: center;
        gap: 8px;
        padding: 12px;
      }
      .rings {
        position: relative;
        flex: none;
        width: 100%;
        max-width: 104px;
        aspect-ratio: 1;
        margin: 0 auto;
      }
      .rings svg {
        position: absolute;
        inset: 0;
        display: block;
        width: 100%;
        height: 100%;
      }
      .track,
      .arc {
        fill: none;
        stroke-width: ${STROKE};
      }
      .arc {
        stroke-linecap: round;
        transition:
          stroke-dashoffset 450ms var(--silk-ease-out),
          opacity 200ms ease;
      }
      .readout {
        position: absolute;
        left: 50%;
        top: 50%;
        transform: translate(-50%, -50%);
        text-align: center;
        pointer-events: none;
        max-width: 88%;
      }
      .value {
        font-size: 18px;
        font-weight: 700;
        letter-spacing: -0.02em;
        line-height: 1.1;
        color: var(--primary-text-color);
        font-variant-numeric: tabular-nums;
        white-space: nowrap;
      }
      .label {
        font-size: 10px;
        line-height: 1.2;
        margin-top: 1px;
        color: var(--secondary-text-color);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .legend {
        display: flex;
        flex-direction: column;
        gap: 1px;
        margin: 0 -4px;
      }
      .lrow {
        display: flex;
        align-items: center;
        gap: 6px;
        width: 100%;
        min-width: 0;
        min-height: 18px;
        margin: 0;
        padding: 1px 4px;
        border: none;
        border-radius: 8px;
        background: none;
        font: inherit;
        color: inherit;
        text-align: left;
        cursor: pointer;
        outline: none;
        transition: background 150ms ease-out;
      }
      .lrow:hover {
        background: rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.05);
      }
      .lrow:focus-visible {
        box-shadow: inset 0 0 0 2px color-mix(in srgb, var(--silk-accent) 70%, transparent);
      }
      .dot {
        flex: none;
        width: 7px;
        height: 7px;
        border-radius: 50%;
      }
      .llabel {
        flex: 1 1 auto;
        min-width: 0;
        font-size: 11px;
        font-weight: 500;
        line-height: 1.3;
        color: var(--primary-text-color);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .lval {
        flex: none;
        font-size: 11px;
        line-height: 1.3;
        color: var(--secondary-text-color);
        font-variant-numeric: tabular-nums;
        white-space: nowrap;
      }
      .lpct {
        flex: none;
        min-width: 30px;
        font-size: 11px;
        font-weight: 600;
        line-height: 1.3;
        text-align: right;
        color: var(--primary-text-color);
        font-variant-numeric: tabular-nums;
      }
      .unavailable .rings,
      .unavailable .legend {
        opacity: 0.45;
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    'silk-fitness-card': SilkFitnessCard;
  }
}
