import { LitElement, html, svg, css, nothing, TemplateResult } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { HomeAssistant, HassEntity, LovelaceCardConfig } from '../types';
import { silkControlStyles } from '../shared/base';
import { isUnavailable, moreInfo, clamp } from '../shared/service';
import { accentFor } from '../shared/color';
import { registerEditor } from '../shared/editor';

export const META = {
  type: 'silk-server-card',
  name: 'Silk Server',
  description: 'CPU, memory, disk, in one breath.',
};

export interface SilkServerCardConfig extends LovelaceCardConfig {
  /** Each metric is a sensor reporting a percentage, 0–100. */
  cpu?: string;
  memory?: string;
  disk?: string;
  swap?: string;
  /** Boot timestamp or an elapsed-time sensor; renders as `up 15d`. */
  uptime?: string;
  /** Load average, renders as `load 0.42`. */
  load?: string;
  name?: string;
  /** Host chip label; defaults to the Home Assistant location name. */
  host?: string;
  /** Accent override; the warning/error tiers still win. */
  color?: string;
}

/**
 * `config` is absent from Silk's minimal HomeAssistant type — the instance's
 * location name is the honest default for the host chip.
 */
interface HassWithConfig extends HomeAssistant {
  config?: { location_name?: string };
}

interface Metric {
  label: string;
  entityId: string;
  /** Percent 0–100; undefined when the sensor has nothing to say. */
  pct?: number;
}

const DEFAULT_NAME = 'Server';
/** Past these the number is a problem, not a color choice. */
const WARN_PCT = 80;
const CRIT_PCT = 90;

/**
 * Arc geometry — a 28px box holding a 270° sweep with the gap centered at the
 * bottom, drawn clockwise from bottom-left, exactly like the gauge card.
 */
const BOX = 28;
const CX = BOX / 2;
const CY = BOX / 2;
const R = 11;
const SWEEP_DEG = 270;
const START_DEG = 90 + (360 - SWEEP_DEG) / 2; // 135°

function polar(deg: number): [number, number] {
  const rad = (deg * Math.PI) / 180;
  return [CX + R * Math.cos(rad), CY + R * Math.sin(rad)];
}

const [X0, Y0] = polar(START_DEG);
const [X1, Y1] = polar(START_DEG + SWEEP_DEG);
const ARC_PATH = `M ${X0.toFixed(2)} ${Y0.toFixed(2)} A ${R} ${R} 0 1 1 ${X1.toFixed(2)} ${Y1.toFixed(2)}`;
/** `pathLength` normalizes the arc to 100, so dashoffset = 100 − percent. */
const ARC_UNITS = 100;
/** Relative uptime only needs a minute hand. */
const TICK_MS = 60_000;

const EDITOR_TAG = 'silk-server-card-editor';

registerEditor(
  EDITOR_TAG,
  [
    {
      name: '',
      type: 'grid',
      schema: [
        { name: 'cpu', selector: { entity: { domain: ['sensor'] } } },
        { name: 'memory', selector: { entity: { domain: ['sensor'] } } },
        { name: 'disk', selector: { entity: { domain: ['sensor'] } } },
        { name: 'swap', selector: { entity: { domain: ['sensor'] } } },
      ],
    },
    {
      name: '',
      type: 'grid',
      schema: [
        { name: 'uptime', selector: { entity: { domain: ['sensor'] } } },
        { name: 'load', selector: { entity: { domain: ['sensor'] } } },
      ],
    },
    { name: 'name', selector: { text: {} } },
    { name: 'host', selector: { text: {} } },
  ],
  {
    cpu: 'CPU (%)',
    memory: 'Memory (%)',
    disk: 'Disk (%)',
    swap: 'Swap (%)',
    uptime: 'Uptime',
    load: 'Load average',
    name: 'Name',
    host: 'Host label',
  }
);

const SECOND_UNITS: Record<string, number> = {
  s: 1,
  sec: 1,
  secs: 1,
  second: 1,
  seconds: 1,
  min: 60,
  mins: 60,
  minute: 60,
  minutes: 60,
  h: 3600,
  hr: 3600,
  hrs: 3600,
  hour: 3600,
  hours: 3600,
  d: 86400,
  day: 86400,
  days: 86400,
};

function readPercent(stateObj?: HassEntity): number | undefined {
  if (!stateObj || isUnavailable(stateObj) || stateObj.state === '') return undefined;
  const value = Number(stateObj.state);
  return Number.isFinite(value) ? clamp(value, 0, 100) : undefined;
}

/** The coarsest honest unit — `15d`, `7h`, `12m`. */
function humanizeSeconds(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '—';
  if (seconds >= 86400) return `${Math.floor(seconds / 86400)}d`;
  if (seconds >= 3600) return `${Math.floor(seconds / 3600)}h`;
  if (seconds >= 60) return `${Math.floor(seconds / 60)}m`;
  return `${Math.floor(seconds)}s`;
}

/**
 * Uptime arrives two ways: a boot *timestamp* (device_class: timestamp, the
 * systemmonitor style) or an elapsed count with a unit. Both land on seconds.
 */
function uptimeSeconds(stateObj: HassEntity | undefined, now: number): number | undefined {
  if (!stateObj || isUnavailable(stateObj) || stateObj.state === '') return undefined;
  const numeric = Number(stateObj.state);
  if (Number.isFinite(numeric)) {
    const unit = (stateObj.attributes.unit_of_measurement as string | undefined) ?? 's';
    return numeric * (SECOND_UNITS[unit.trim().toLowerCase()] ?? 1);
  }
  const booted = Date.parse(stateObj.state);
  if (!Number.isFinite(booted)) return undefined;
  return Math.max(0, (now - booted) / 1000);
}

/**
 * The machine in one breath: four little arcs, four numbers, and the one line
 * that says how long it has been holding.
 */
@customElement('silk-server-card')
export class SilkServerCard extends LitElement {
  @property({ attribute: false }) public hass?: HomeAssistant;

  @state() private _config?: SilkServerCardConfig;
  /** False for the first paint so the arcs sweep in from zero on mount. */
  @state() private _drawn = false;
  /** Ticks the relative uptime label. */
  @state() private _now = Date.now();

  private _tick?: number;

  public static getStubConfig(hass: HomeAssistant): Partial<SilkServerCardConfig> {
    const pct = Object.keys(hass.states).filter(
      (id) =>
        id.startsWith('sensor.') &&
        hass.states[id].attributes.unit_of_measurement === '%' &&
        Number.isFinite(Number(hass.states[id].state))
    );
    const pick = (re: RegExp): string | undefined => pct.find((id) => re.test(id));
    return {
      type: 'custom:silk-server-card',
      cpu: pick(/processor|cpu/i) ?? pct[0],
      memory: pick(/memory|ram/i),
      disk: pick(/disk|storage/i),
      swap: pick(/swap/i),
    };
  }

  public static async getConfigElement(): Promise<HTMLElement> {
    return document.createElement(EDITOR_TAG);
  }

  public setConfig(config: SilkServerCardConfig): void {
    const keys: (keyof SilkServerCardConfig)[] = ['cpu', 'memory', 'disk', 'swap', 'uptime', 'load'];
    for (const key of keys) {
      const value = config[key];
      if (value !== undefined && (typeof value !== 'string' || !value.includes('.'))) {
        throw new Error(`silk-server-card: \`${String(key)}\` must be an entity id`);
      }
    }
    if (!config.cpu && !config.memory && !config.disk && !config.swap) {
      throw new Error(
        'silk-server-card: at least one of `cpu`, `memory`, `disk` or `swap` is required'
      );
    }
    this._config = config;
  }

  public getCardSize(): number {
    return 2;
  }

  public getGridOptions(): Record<string, number> {
    return { columns: 6, rows: 2, min_columns: 4, min_rows: 2 };
  }

  public connectedCallback(): void {
    super.connectedCallback();
    this._tick = window.setInterval(() => {
      this._now = Date.now();
    }, TICK_MS);
  }

  public disconnectedCallback(): void {
    super.disconnectedCallback();
    window.clearInterval(this._tick);
    this._tick = undefined;
  }

  protected firstUpdated(): void {
    // Commit one frame at zero so the dashoffset transition sweeps in.
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        this._drawn = true;
      });
    });
  }

  private _metrics(): Metric[] {
    const hass = this.hass!;
    const config = this._config!;
    const wanted: [string, string | undefined][] = [
      ['CPU', config.cpu],
      ['RAM', config.memory],
      ['Disk', config.disk],
      ['Swap', config.swap],
    ];
    return wanted
      .filter((pair): pair is [string, string] => typeof pair[1] === 'string')
      .map(([label, entityId]) => ({
        label,
        entityId,
        pct: readPercent(hass.states[entityId]),
      }));
  }

  private _stateLine(): TemplateResult | typeof nothing {
    const hass = this.hass!;
    const config = this._config!;
    const parts: string[] = [];
    if (config.uptime) {
      const seconds = uptimeSeconds(hass.states[config.uptime], this._now);
      if (seconds !== undefined) parts.push(`up ${humanizeSeconds(seconds)}`);
    }
    if (config.load) {
      const stateObj = hass.states[config.load];
      const value = stateObj && !isUnavailable(stateObj) ? Number(stateObj.state) : NaN;
      if (Number.isFinite(value)) {
        parts.push(
          `load ${new Intl.NumberFormat(
            hass.locale?.language ?? hass.language ?? 'en',
            { minimumFractionDigits: 2, maximumFractionDigits: 2 }
          ).format(value)}`
        );
      }
    }
    if (!parts.length) return nothing;
    return html`
      <div class="state">
        ${parts.map((part, i) =>
          i ? html`<span class="sep">·</span>${part}` : html`${part}`
        )}
      </div>
    `;
  }

  private _tier(pct?: number): string {
    if (pct === undefined) return '';
    if (pct >= CRIT_PCT) return 'crit';
    if (pct >= WARN_PCT) return 'warn';
    return '';
  }

  private _onCellClick(ev: Event, entityId: string): void {
    ev.stopPropagation();
    moreInfo(this, entityId);
  }

  private _renderMetric(metric: Metric): TemplateResult {
    const pct = metric.pct;
    const shown = this._drawn && pct !== undefined ? pct : 0;
    const tier = this._tier(pct);
    const readout = pct === undefined ? '—' : `${Math.round(pct)}%`;
    const title = `${metric.label} · ${readout}`;
    return html`
      <button
        class="cell ${pct === undefined ? 'unknown' : ''}"
        title=${title}
        aria-label=${title}
        @click=${(ev: Event) => this._onCellClick(ev, metric.entityId)}
      >
        <svg viewBox="0 0 ${BOX} ${BOX}" width=${BOX} height=${BOX} aria-hidden="true">
          <path class="track" d=${ARC_PATH}></path>
          <path
            class="arc ${tier}"
            d=${ARC_PATH}
            pathLength=${ARC_UNITS}
            stroke-dasharray=${ARC_UNITS}
            style="stroke-dashoffset:${ARC_UNITS - shown};opacity:${shown > 0 ? 1 : 0}"
          ></path>
          ${svg`<title>${title}</title>`}
        </svg>
        <span class="pct">${readout}</span>
        <span class="label">${metric.label}</span>
      </button>
    `;
  }

  protected render(): TemplateResult | typeof nothing {
    const config = this._config;
    const hass = this.hass;
    if (!config || !hass) return nothing;

    const metrics = this._metrics();
    const host = config.host ?? (hass as HassWithConfig).config?.location_name;
    const primary = metrics[0]?.entityId;

    return html`
      <ha-card
        class="control"
        style="--silk-accent:${accentFor(undefined, config.color)}"
        @click=${() => primary && moreInfo(this, primary)}
      >
        <div class="header">
          <div class="hname">${config.name ?? DEFAULT_NAME}</div>
          ${host ? html`<span class="host" title=${host}>${host}</span>` : nothing}
        </div>
        <div class="quad">${metrics.map((metric) => this._renderMetric(metric))}</div>
        ${this._stateLine()}
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
        padding: 12px 14px;
      }
      .header {
        flex: none;
        display: flex;
        align-items: center;
        gap: 8px;
        min-height: 20px;
      }
      .hname {
        flex: 1;
        min-width: 0;
        font-size: 13px;
        font-weight: 600;
        color: var(--secondary-text-color);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .host {
        flex: none;
        max-width: 45%;
        font-size: 11px;
        font-weight: 600;
        line-height: 1;
        padding: 4px 9px;
        border-radius: 999px;
        color: var(--secondary-text-color);
        background: rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.06);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .quad {
        flex: none;
        display: flex;
        align-items: flex-start;
        justify-content: space-around;
        gap: 6px;
      }
      .cell {
        flex: 1 1 0;
        min-width: 0;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 1px;
        margin: 0;
        padding: 4px 2px;
        border: none;
        border-radius: 10px;
        background: none;
        font: inherit;
        color: inherit;
        cursor: pointer;
        outline: none;
        transition:
          transform 250ms var(--silk-spring),
          background 150ms ease-out;
      }
      .cell:hover {
        background: rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.05);
      }
      .cell:active {
        transform: scale(0.94);
        transition-duration: 120ms;
        transition-timing-function: var(--silk-ease-out);
      }
      .cell:focus-visible {
        box-shadow: inset 0 0 0 2px color-mix(in srgb, var(--silk-accent) 70%, transparent);
      }
      .cell.unknown {
        opacity: 0.45;
      }
      svg {
        display: block;
        overflow: visible;
      }
      .track,
      .arc {
        fill: none;
        stroke-width: 4;
        stroke-linecap: round;
      }
      .track {
        stroke: rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.09);
      }
      .arc {
        stroke: var(--silk-accent);
        transition:
          stroke-dashoffset 450ms var(--silk-ease-out),
          stroke 200ms ease,
          opacity 200ms ease;
      }
      .arc.warn {
        stroke: var(--warning-color, #ffa600);
      }
      .arc.crit {
        stroke: var(--error-color, #db4437);
      }
      .pct {
        margin-top: 3px;
        font-size: 12px;
        font-weight: 600;
        line-height: 1.2;
        letter-spacing: -0.01em;
        color: var(--primary-text-color);
        font-variant-numeric: tabular-nums;
        white-space: nowrap;
      }
      .label {
        max-width: 100%;
        font-size: 10px;
        line-height: 1.2;
        color: var(--secondary-text-color);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .state {
        flex: none;
        text-align: center;
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    'silk-server-card': SilkServerCard;
  }
}
