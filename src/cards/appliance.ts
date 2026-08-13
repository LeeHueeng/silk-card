import { LitElement, html, css, nothing, PropertyValues, TemplateResult } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { HomeAssistant, HassEntity, LovelaceCardConfig } from '../types';
import { silkControlStyles } from '../shared/base';
import { isUnavailable, moreInfo, stateText, clamp } from '../shared/service';
import { accentFor } from '../shared/color';
import { registerEditor } from '../shared/editor';

export const META = {
  type: 'silk-appliance-card',
  name: 'Silk Appliance',
  description: "Washer, dryer, dishwasher — and when they'll be done.",
};

export interface SilkApplianceCardConfig extends LovelaceCardConfig {
  name: string;
  icon?: string;
  /** Machine state sensor: idle / running / finished / … */
  state?: string;
  /** Live power draw; the fallback witness when the state sensor says idle. */
  power?: string;
  /** Watts above which the machine counts as running. Default 5. */
  power_threshold?: number;
  /** Time-remaining sensor; its unit decides the format. */
  remaining?: string;
  /** Timestamp sensor for the finish time. Wins over `remaining` in the state line. */
  finish_at?: string;
  /** Cycle/program sensor, shown as a chip. */
  program?: string;
  /** States that mean "cycle over". Default finished/complete/done/ready. */
  done_states?: string[];
  /** Accent override (YAML). */
  color?: string;
}

type Verdict = 'running' | 'finished' | 'idle';

const DEFAULT_ICON = 'mdi:washing-machine';
const DEFAULT_POWER_THRESHOLD = 5;
const DEFAULT_DONE_STATES = ['finished', 'complete', 'done', 'ready'];
/** Only the finish_at path needs a local clock; 30s keeps the bar honest. */
const TICK_MS = 30_000;
const PULSE_MS = 250;

/** States that mean the drum is still — the power sensor may still overrule. */
const IDLE_STATES = new Set([
  'idle',
  'off',
  'standby',
  'stopped',
  'paused',
  'none',
  'unknown',
  'unavailable',
  '',
]);

/** Program states worth showing as a chip. */
const NO_PROGRAM = new Set(['none', 'unknown', 'unavailable', 'off', 'idle', '']);

const HOUR_UNITS = new Set(['h', 'hr', 'hrs', 'hour', 'hours']);
const MINUTE_UNITS = new Set(['min', 'mins', 'minute', 'minutes']);
const SECOND_UNITS = new Set(['s', 'sec', 'secs', 'second', 'seconds']);

/** Seconds per unit of a duration sensor; appliances default to minutes. */
function unitSeconds(unit: string): number {
  const u = unit.trim().toLowerCase();
  if (HOUR_UNITS.has(u)) return 3600;
  if (SECOND_UNITS.has(u)) return 1;
  if (MINUTE_UNITS.has(u)) return 60;
  return 60;
}

/** '1h 32m left' / '32m left'. */
function minutesLeft(totalMinutes: number): string {
  const t = Math.max(0, Math.round(totalMinutes));
  const h = Math.floor(t / 60);
  const m = t % 60;
  return h > 0 ? `${h}h ${m}m left` : `${m}m left`;
}

/** Seconds from an 'H:MM:SS' state — some integrations report the ETA that way. */
function parseClock(text: string): number | null {
  const m = /^(\d+):([0-5]\d):([0-5]\d)$/.exec(text.trim());
  if (!m) return null;
  return Number(m[1]) * 3600 + Number(m[2]) * 60 + Number(m[3]);
}

/** Numeric state, NaN when the entity is missing/unavailable/non-numeric. */
function numericState(stateObj?: HassEntity): number {
  if (!stateObj || isUnavailable(stateObj) || stateObj.state === '') return NaN;
  return Number(stateObj.state);
}

/** Power in watts, honoring kW/MW units; NaN when the entity can't speak. */
function powerWatts(stateObj?: HassEntity): number {
  const value = numericState(stateObj);
  if (!Number.isFinite(value)) return NaN;
  const unit = String(stateObj?.attributes.unit_of_measurement ?? 'W')
    .trim()
    .toLowerCase();
  if (unit === 'kw') return value * 1000;
  if (unit === 'mw') return value * 1_000_000;
  return value;
}

const capitalize = (text: string): string =>
  text.length ? text.charAt(0).toUpperCase() + text.slice(1) : text;

/** Normalized state token — 'Cycle Finished' and 'cycle_finished' compare equal. */
const normalize = (text: string): string => text.toLowerCase().replace(/[\s-]+/g, '_');

const EDITOR_TAG = 'silk-appliance-card-editor';

registerEditor(
  EDITOR_TAG,
  [
    { name: 'name', required: true, selector: { text: {} } },
    {
      name: '',
      type: 'grid',
      schema: [
        { name: 'icon', selector: { icon: {} } },
        { name: 'state', selector: { entity: { domain: ['sensor', 'binary_sensor'] } } },
        { name: 'power', selector: { entity: { domain: ['sensor'] } } },
        { name: 'program', selector: { entity: { domain: ['sensor', 'select'] } } },
        { name: 'remaining', selector: { entity: { domain: ['sensor'] } } },
        { name: 'finish_at', selector: { entity: { domain: ['sensor'] } } },
      ],
    },
  ],
  {
    name: 'Name',
    icon: 'Icon',
    state: 'State sensor',
    power: 'Power (W)',
    program: 'Program',
    remaining: 'Time remaining',
    finish_at: 'Finish time',
  },
  { icon: DEFAULT_ICON }
);

/**
 * One appliance, one question: is it running, and when will it be done? The
 * verdict comes from the state sensor, with live power as the fallback witness
 * when that sensor claims idle. A finished machine turns the accent to the
 * theme success color and asks to be unloaded.
 */
@customElement('silk-appliance-card')
export class SilkApplianceCard extends LitElement {
  @property({ attribute: false }) public hass?: HomeAssistant;

  @state() private _config?: SilkApplianceCardConfig;

  /** Render clock — advanced by the tick so a finish_at bar keeps moving. */
  @state() private _now = Date.now();

  /** One-shot arrival pulse on the icon, cleared when the animation ends. */
  @state() private _pulse = false;

  /**
   * Full cycle length in seconds, captured when we *watched* this run start.
   * Mounting mid-cycle leaves it null on purpose — inventing a total from a
   * partial remaining would draw a bar that lies.
   */
  private _totalS: number | null = null;
  private _lastVerdict?: Verdict;
  private _pulseTimer?: number;
  private _tick?: number;

  public static getStubConfig(hass: HomeAssistant): Partial<SilkApplianceCardConfig> {
    const ids = Object.keys(hass.states);
    const machine = /washer|washing|dryer|dishwasher|laundry/;
    const state = ids.find((id) => id.startsWith('sensor.') && machine.test(id));
    const power = ids.find(
      (id) =>
        id.startsWith('sensor.') &&
        machine.test(id) &&
        hass.states[id].attributes.device_class === 'power'
    );
    return { type: 'custom:silk-appliance-card', name: 'Washer', icon: DEFAULT_ICON, state, power };
  }

  public static async getConfigElement(): Promise<HTMLElement> {
    return document.createElement(EDITOR_TAG);
  }

  public setConfig(config: SilkApplianceCardConfig): void {
    if (!config.name) {
      throw new Error('silk-appliance-card: `name` is required');
    }
    if (config.power_threshold !== undefined && !Number.isFinite(Number(config.power_threshold))) {
      throw new Error('silk-appliance-card: `power_threshold` must be a number of watts');
    }
    if (
      config.done_states !== undefined &&
      (!Array.isArray(config.done_states) ||
        config.done_states.some((s) => typeof s !== 'string'))
    ) {
      throw new Error('silk-appliance-card: `done_states` must be a list of state strings');
    }
    this._config = config;
    this._totalS = null;
    this._lastVerdict = undefined;
  }

  public getCardSize(): number {
    return 2;
  }

  public getGridOptions(): Record<string, number> {
    return { columns: 6, rows: 2, min_columns: 4, min_rows: 1 };
  }

  public connectedCallback(): void {
    super.connectedCallback();
    // Nudge an update so `updated()` restarts the tick after a re-attach.
    this._now = Date.now();
  }

  public disconnectedCallback(): void {
    super.disconnectedCallback();
    window.clearInterval(this._tick);
    this._tick = undefined;
    window.clearTimeout(this._pulseTimer);
    this._pulseTimer = undefined;
  }

  protected willUpdate(changed: PropertyValues): void {
    if (!this.hass || !this._config) return;
    if (changed.has('hass')) this._now = Date.now();
    // A dark machine is unknown, not idle: freeze the bookkeeping so a blip
    // mid-cycle cannot read as a fresh run (and mint a bogus total) on recovery.
    if (this._allUnavailable()) return;
    const verdict = this._verdict();
    const previous = this._lastVerdict;
    this._lastVerdict = verdict;
    if (verdict === previous) {
      // A program can grow mid-run (extra rinse): keep the total honest.
      if (verdict === 'running' && this._totalS !== null) {
        const remaining = this._remainingSeconds();
        if (remaining !== null && remaining > this._totalS) this._totalS = remaining;
      }
      return;
    }
    if (previous === undefined) return; // first paint: no arrival, no total
    if (verdict === 'running') {
      // We watched this cycle begin, so what is left now is the whole of it.
      this._totalS = this._remainingSeconds();
    } else {
      this._totalS = null;
      if (verdict === 'finished') this._firePulse();
    }
  }

  protected updated(): void {
    // The finish_at path has no state pushes of its own; tick it while running.
    const running =
      this.isConnected && this._lastVerdict === 'running' && !!this._config?.finish_at;
    if (running && this._tick === undefined) {
      this._tick = window.setInterval(() => {
        this._now = Date.now();
      }, TICK_MS);
    } else if (!running && this._tick !== undefined) {
      window.clearInterval(this._tick);
      this._tick = undefined;
    }
  }

  private _firePulse(): void {
    this._pulse = true;
    window.clearTimeout(this._pulseTimer);
    this._pulseTimer = window.setTimeout(() => {
      this._pulse = false;
      this._pulseTimer = undefined;
    }, PULSE_MS + 40);
  }

  private _doneStates(): Set<string> {
    return new Set((this._config?.done_states ?? DEFAULT_DONE_STATES).map(normalize));
  }

  private _verdict(): Verdict {
    const config = this._config;
    const hass = this.hass;
    if (!config || !hass) return 'idle';
    const watts = powerWatts(config.power ? hass.states[config.power] : undefined);
    const threshold = Number(config.power_threshold ?? DEFAULT_POWER_THRESHOLD);
    const busy = Number.isFinite(watts) && watts > threshold;
    const stateObj = config.state ? hass.states[config.state] : undefined;
    if (stateObj && !isUnavailable(stateObj)) {
      const token = normalize(stateObj.state);
      if (this._doneStates().has(token)) return 'finished';
      if (!IDLE_STATES.has(token)) return 'running';
      // The state sensor claims idle — the plug gets the last word.
      return busy ? 'running' : 'idle';
    }
    return busy ? 'running' : 'idle';
  }

  /** Finish time in epoch ms from the timestamp sensor, or null. */
  private _finishTs(): number | null {
    const id = this._config?.finish_at;
    if (!id || !this.hass) return null;
    const stateObj = this.hass.states[id];
    if (!stateObj || isUnavailable(stateObj) || stateObj.state === '') return null;
    const ms = Date.parse(stateObj.state);
    return Number.isFinite(ms) ? ms : null;
  }

  /** Seconds left, from the duration sensor first, the finish time otherwise. */
  private _remainingSeconds(): number | null {
    const config = this._config;
    const hass = this.hass;
    if (!config || !hass) return null;
    const id = config.remaining;
    if (id) {
      const stateObj = hass.states[id];
      if (stateObj && !isUnavailable(stateObj) && stateObj.state !== '') {
        const value = Number(stateObj.state);
        if (Number.isFinite(value)) {
          return Math.max(
            0,
            value * unitSeconds(String(stateObj.attributes.unit_of_measurement ?? ''))
          );
        }
        const seconds = parseClock(stateObj.state);
        if (seconds !== null) return seconds;
      }
    }
    const ts = this._finishTs();
    return ts === null ? null : Math.max(0, (ts - this._now) / 1000);
  }

  private _locale(): string {
    return this.hass?.locale?.language ?? this.hass?.language ?? 'en';
  }

  /** 'done at 19:42' — with a weekday when the cycle ends on another day. */
  private _finishText(ms: number): string {
    const locale = this._locale();
    const target = new Date(ms);
    const now = new Date(this._now);
    const time = new Intl.DateTimeFormat(locale, { hour: 'numeric', minute: '2-digit' }).format(
      target
    );
    const sameDay =
      target.getFullYear() === now.getFullYear() &&
      target.getMonth() === now.getMonth() &&
      target.getDate() === now.getDate();
    if (sameDay) return `done at ${time}`;
    return `done ${new Intl.DateTimeFormat(locale, { weekday: 'short' }).format(target)} ${time}`;
  }

  /** True only when every entity the card was given has gone dark. */
  private _allUnavailable(): boolean {
    const hass = this.hass;
    if (!hass) return false;
    const tracked = this._tracked();
    return tracked.length > 0 && tracked.every((id) => isUnavailable(hass.states[id]));
  }

  /** Every entity this card was given — used for the unavailable verdict. */
  private _tracked(): string[] {
    const c = this._config;
    if (!c) return [];
    return [c.state, c.power, c.remaining, c.finish_at, c.program].filter(
      (id): id is string => typeof id === 'string' && id !== ''
    );
  }

  private _primaryEntity(): string | undefined {
    const c = this._config;
    if (!c) return undefined;
    return c.state ?? c.remaining ?? c.finish_at ?? c.power ?? c.program;
  }

  private _onCardClick(): void {
    const entity = this._primaryEntity();
    if (entity) moreInfo(this, entity);
  }

  private _renderPower(stateObj?: HassEntity): TemplateResult | typeof nothing {
    const watts = powerWatts(stateObj);
    if (!Number.isFinite(watts)) return nothing;
    const kilo = Math.abs(watts) >= 1000;
    const value = new Intl.NumberFormat(this._locale(), {
      minimumFractionDigits: kilo ? 1 : 0,
      maximumFractionDigits: kilo ? 1 : 0,
    }).format(kilo ? watts / 1000 : watts);
    return html`
      <div class="trailing">
        <span class="value">${value}</span><span class="unit">${kilo ? 'kW' : 'W'}</span>
      </div>
    `;
  }

  protected render(): TemplateResult | typeof nothing {
    const config = this._config;
    const hass = this.hass;
    if (!config || !hass) return nothing;

    const primary = this._primaryEntity();
    if (primary && !hass.states[primary]) {
      return html`
        <ha-card class="control">
          <div class="warning">Entity not found: ${primary}</div>
        </ha-card>
      `;
    }

    const stateObj = config.state ? hass.states[config.state] : undefined;
    const powerObj = config.power ? hass.states[config.power] : undefined;
    const programObj = config.program ? hass.states[config.program] : undefined;
    const unavailable = this._allUnavailable();

    const verdict: Verdict = unavailable ? 'idle' : this._verdict();
    const running = verdict === 'running';
    const finished = verdict === 'finished';
    // Completion reads as success everywhere; otherwise the domain accent.
    const accent = finished
      ? 'var(--success-color, #43a047)'
      : accentFor(stateObj ?? powerObj, config.color);

    const program =
      programObj && !isUnavailable(programObj) && !NO_PROGRAM.has(normalize(programObj.state))
        ? capitalize(stateText(hass, programObj))
        : undefined;

    const finishTs = this._finishTs();
    const remainingS = this._remainingSeconds();
    const timing =
      finishTs !== null
        ? this._finishText(finishTs)
        : remainingS !== null
          ? minutesLeft(Math.ceil(remainingS / 60))
          : undefined;
    const machineText =
      stateObj && !isUnavailable(stateObj) ? capitalize(stateText(hass, stateObj)) : undefined;
    const line = unavailable
      ? 'Unavailable'
      : finished
        ? 'Ready to unload'
        : running
          ? (timing ?? machineText ?? 'Running')
          : (machineText ?? 'Idle');

    // A determinate bar needs both ends of the story: what is left, and of what.
    const total = this._totalS;
    const determinate = running && remainingS !== null && total !== null && total > 0;
    const done = determinate ? clamp(1 - remainingS! / total!, 0, 1) : 0;

    return html`
      <ha-card
        class="control ${unavailable ? 'unavailable' : ''}"
        style="--silk-accent:${accent}"
        @click=${this._onCardClick}
      >
        <div class="top">
          <div class="icon ${(running || finished) && !unavailable ? 'on' : ''} ${this._pulse ? 'pulse' : ''}">
            <ha-icon .icon=${config.icon ?? DEFAULT_ICON}></ha-icon>
          </div>
          <div class="info">
            <div class="name">${config.name}</div>
            <div class="state">
              ${program ? html`<span class="pchip">${program}</span>` : nothing}
              <span class="stext">${line}</span>
            </div>
          </div>
          ${this._renderPower(powerObj)}
        </div>
        ${running && !unavailable
          ? determinate
            ? html`
                <div
                  class="track"
                  role="progressbar"
                  aria-valuemin="0"
                  aria-valuemax="100"
                  aria-valuenow=${Math.round(done * 100)}
                >
                  <div class="bar" style="width:${(done * 100).toFixed(2)}%"></div>
                </div>
              `
            : html`
                <div class="track ind" aria-label="Running" role="progressbar">
                  <span class="seg"></span>
                </div>
              `
          : nothing}
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
        gap: 10px;
      }
      .top {
        flex: none;
        display: flex;
        align-items: center;
        gap: 12px;
        min-width: 0;
      }
      /* Display card: no control action, so the icon presses with the card. */
      .icon {
        cursor: pointer;
      }
      .icon:active {
        transform: none;
      }
      /* One-shot arrival note when the cycle ends — never a loop. */
      .icon.pulse {
        animation: silk-appliance-pop 250ms var(--silk-spring);
      }
      .state {
        display: flex;
        align-items: center;
        gap: 6px;
      }
      .stext {
        min-width: 0;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .pchip {
        flex: 0 1 auto;
        max-width: 45%;
        padding: 2px 8px;
        border-radius: 999px;
        font-size: 11px;
        font-weight: 600;
        letter-spacing: 0.02em;
        line-height: 1.4;
        color: var(--secondary-text-color);
        background: rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.08);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .track {
        position: relative;
        flex: none;
        height: 4px;
        border-radius: 999px;
        background: rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.08);
        overflow: hidden;
      }
      .bar {
        position: absolute;
        inset: 0 auto 0 0;
        border-radius: 999px;
        background: var(--silk-accent);
        transition:
          width 400ms var(--silk-ease-out),
          background 200ms ease;
      }
      /* No total to divide by: a thinner track carries real activity instead. */
      .track.ind {
        height: 2px;
      }
      .seg {
        position: absolute;
        top: 0;
        bottom: 0;
        width: 30%;
        border-radius: 999px;
        background: var(--silk-accent);
        transform: translateX(-100%);
        animation: silk-appliance-travel 1600ms ease-in-out infinite;
        will-change: transform;
      }
      @keyframes silk-appliance-travel {
        from {
          transform: translateX(-100%);
        }
        to {
          transform: translateX(333%);
        }
      }
      @keyframes silk-appliance-pop {
        0% {
          transform: scale(1);
        }
        45% {
          transform: scale(1.12);
        }
        100% {
          transform: scale(1);
        }
      }
      @media (prefers-reduced-motion: reduce) {
        /* Hold the segment still rather than strobe it at zero duration. */
        .seg {
          animation: none;
          width: 100%;
          transform: none;
          opacity: 0.5;
        }
      }
      .unavailable .track {
        opacity: 0.45;
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    'silk-appliance-card': SilkApplianceCard;
  }
}
