import {
  LitElement,
  html,
  svg,
  css,
  nothing,
  PropertyValues,
  TemplateResult,
  SVGTemplateResult,
} from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { HomeAssistant, HassEntity, LovelaceCardConfig, Point } from '../types';
import { silkControlStyles } from '../shared/base';
import { isUnavailable, moreInfo, haptic, clamp } from '../shared/service';
import { accentFor } from '../shared/color';
import { registerEditor } from '../shared/editor';
import { fetchSeries } from '../data';
import { resampleHold } from '../graph';
import { formatNumber } from '../format';

export const META = {
  type: 'silk-comfort-card',
  name: 'Silk Comfort',
  description: 'Temperature and humidity, judged together.',
};

/** Comfort box bounds, always in °C and %RH regardless of sensor units. */
export interface ComfortZone {
  t_min?: number;
  t_max?: number;
  h_min?: number;
  h_max?: number;
}

export interface SilkComfortCardConfig extends LovelaceCardConfig {
  temperature: string;
  humidity: string;
  name?: string;
  color?: string;
  /** Comfort box override, in °C / %RH; set from the editor's own section. */
  zone?: ComfortZone;
}

/** Plot domain — the range a living space realistically moves through. */
const T_MIN = 16;
const T_MAX = 32;
const H_MIN = 20;
const H_MAX = 80;

/** ASHRAE-flavoured default comfort box, in °C / %RH. */
const ZONE_DEFAULT: Required<ComfortZone> = { t_min: 20, t_max: 26, h_min: 30, h_max: 60 };

/**
 * How far outside the box still counts as "nearly there" (warning) rather than
 * genuinely wrong (error). Temperature in °C, humidity in points of RH.
 */
const TEMP_TOLERANCE = 2;
const HUM_TOLERANCE = 10;

const TRAIL = 12;
const HOURS = 24;

const PAD_L = 25;
const PAD_R = 8;
const PAD_T = 10;
const PAD_B = 15;

const REFRESH_INTERVAL_MS = 300_000;
const REFRESH_THROTTLE_MS = 60_000;

type Severity = 'good' | 'warn' | 'bad';

// Status colors carry a real verdict here, which is the one sanctioned use of
// success/warning/error chroma in Silk.
const SEVERITY_COLOR: Record<Severity, string> = {
  good: 'var(--success-color, #57ad60)',
  warn: 'var(--warning-color, #e6a23c)',
  bad: 'var(--error-color, #db4437)',
};

interface Verdict {
  word: string;
  severity: Severity;
}

interface TrailDot {
  /** Temperature in °C. */
  t: number;
  /** Relative humidity, percent. */
  h: number;
  /** Sample time, unix seconds. */
  ts: number;
}

/** Sensors may report °F; the comfort box and its math are defined in °C. */
function toCelsius(value: number, unit: string | undefined): number {
  return unit && unit.toUpperCase().includes('F') ? ((value - 32) * 5) / 9 : value;
}

/** Back to the sensor's own unit, for axis labels the reader recognises. */
function fromCelsius(value: number, unit: string | undefined): number {
  return unit && unit.toUpperCase().includes('F') ? (value * 9) / 5 + 32 : value;
}

const EDITOR_TAG = 'silk-comfort-card-editor';

registerEditor(
  EDITOR_TAG,
  [
    {
      name: 'temperature',
      required: true,
      selector: { entity: { domain: ['sensor'], device_class: ['temperature'] } },
    },
    {
      name: 'humidity',
      required: true,
      selector: { entity: { domain: ['sensor'], device_class: ['humidity'] } },
    },
    { name: 'name', selector: { text: {} } },
    { name: 'color', selector: { ui_color: {} } },
    {
      // `zone` is a map of four numbers, not a list — ha-form's expandable
      // section nests its fields under its own name, which is exactly that
      // shape, so the comfort box is dialled in rather than typed as YAML.
      name: 'zone',
      type: 'expandable',
      title: '쾌적 범위',
      schema: [
        {
          name: '',
          type: 'grid',
          schema: [
            { name: 't_min', selector: { number: { min: 0, max: 40, step: 0.5, mode: 'box' } } },
            { name: 't_max', selector: { number: { min: 0, max: 40, step: 0.5, mode: 'box' } } },
            { name: 'h_min', selector: { number: { min: 0, max: 100, mode: 'box' } } },
            { name: 'h_max', selector: { number: { min: 0, max: 100, mode: 'box' } } },
          ],
        },
      ],
    },
  ],
  {
    temperature: '온도 센서',
    humidity: '습도 센서',
    name: '이름',
    color: '강조 색상',
    zone: '쾌적 범위',
    t_min: '최저 온도(°C)',
    t_max: '최고 온도(°C)',
    h_min: '최저 습도(%)',
    h_max: '최고 습도(%)',
  },
  { zone: ZONE_DEFAULT }
);

@customElement('silk-comfort-card')
export class SilkComfortCard extends LitElement {
  @property({ attribute: false }) public hass?: HomeAssistant;

  @state() private _config?: SilkComfortCardConfig;
  @state() private _trail: TrailDot[] = [];
  /** Set when history is unreachable, so the plot can say so quietly. */
  @state() private _noHistory = false;
  /** Measured plot box; the scatter is laid out in exact pixels from it. */
  @state() private _plot: { w: number; h: number } | null = null;

  private _zone: Required<ComfortZone> = ZONE_DEFAULT;
  private _fetchStarted = false;
  private _fetchSeq = 0;
  private _lastFetch = 0;
  private _stamps = '';
  private _refreshTimer?: number;
  private _intervalTimer?: number;
  private _resize?: ResizeObserver;

  public static getStubConfig(hass: HomeAssistant): Partial<SilkComfortCardConfig> {
    const ids = Object.keys(hass.states).filter((id) => id.startsWith('sensor.'));
    const byClass = (cls: string): string | undefined =>
      ids.find((id) => hass.states[id].attributes.device_class === cls);
    return {
      type: 'custom:silk-comfort-card',
      temperature: byClass('temperature'),
      humidity: byClass('humidity'),
    };
  }

  public static async getConfigElement(): Promise<HTMLElement> {
    return document.createElement(EDITOR_TAG);
  }

  public setConfig(config: SilkComfortCardConfig): void {
    if (!config.temperature) {
      throw new Error('silk-comfort-card: `temperature` is required');
    }
    if (!config.humidity) {
      throw new Error('silk-comfort-card: `humidity` is required');
    }
    if (config.zone !== undefined && (typeof config.zone !== 'object' || Array.isArray(config.zone))) {
      throw new Error('silk-comfort-card: `zone` must be an object of {t_min, t_max, h_min, h_max}');
    }
    const zone = { ...ZONE_DEFAULT, ...(config.zone ?? {}) };
    for (const key of ['t_min', 't_max', 'h_min', 'h_max'] as const) {
      if (!Number.isFinite(zone[key])) {
        throw new Error(`silk-comfort-card: \`zone.${key}\` must be a number`);
      }
    }
    if (zone.t_min >= zone.t_max || zone.h_min >= zone.h_max) {
      throw new Error('silk-comfort-card: `zone` minimums must be below their maximums');
    }
    this._zone = zone;
    this._config = config;
    this._trail = [];
    this._noHistory = false;
    this._fetchStarted = false;
    this._stamps = '';
  }

  public getCardSize(): number {
    return 3;
  }

  public getGridOptions(): Record<string, number> {
    return { columns: 4, rows: 3, min_columns: 3, min_rows: 2 };
  }

  public connectedCallback(): void {
    super.connectedCallback();
    this._intervalTimer = window.setInterval(() => this._refresh(), REFRESH_INTERVAL_MS);
    // firstUpdated never runs twice: re-observe the plot after a DOM re-attach.
    if (this.hasUpdated) {
      this._observePlot();
      if (this._fetchStarted) this._refresh();
    }
  }

  public disconnectedCallback(): void {
    super.disconnectedCallback();
    window.clearInterval(this._intervalTimer);
    window.clearTimeout(this._refreshTimer);
    this._refreshTimer = undefined;
    this._resize?.disconnect();
    this._resize = undefined;
  }

  protected willUpdate(changed: PropertyValues): void {
    if (!this.hass || !this._config) return;
    if (!this._fetchStarted) {
      this._fetchStarted = true;
      this._refresh();
      return;
    }
    if (changed.has('hass')) this._onStatesChanged();
  }

  protected updated(): void {
    this._observePlot();
  }

  private _observePlot(): void {
    const el = this.renderRoot.querySelector('.plot');
    if (!el) return;
    if (!this._resize) {
      this._resize = new ResizeObserver((entries) => {
        const rect = entries[entries.length - 1].contentRect;
        const w = Math.round(rect.width);
        const h = Math.round(rect.height);
        if (!this._plot || this._plot.w !== w || this._plot.h !== h) this._plot = { w, h };
      });
    }
    this._resize.observe(el);
  }

  /** Refetch when either sensor records a new state, throttled to 60s. */
  private _onStatesChanged(): void {
    const config = this._config!;
    const stamps = `${this.hass?.states[config.temperature]?.last_updated ?? ''}|${
      this.hass?.states[config.humidity]?.last_updated ?? ''
    }`;
    if (stamps === '|' || stamps === this._stamps) return;
    this._stamps = stamps;
    if (this._refreshTimer) return;
    const wait = Math.max(0, REFRESH_THROTTLE_MS - (Date.now() - this._lastFetch));
    this._refreshTimer = window.setTimeout(() => {
      this._refreshTimer = undefined;
      this._refresh();
    }, wait);
  }

  private async _refresh(): Promise<void> {
    const hass = this.hass;
    const config = this._config;
    if (!hass || !config) return;
    const seq = ++this._fetchSeq;
    const end = Date.now() / 1000;
    const start = end - HOURS * 3600;
    let data: Record<string, Point[]>;
    try {
      data = await fetchSeries(hass, [config.temperature, config.humidity], start, end, HOURS);
    } catch (err) {
      console.warn('silk-comfort-card: history fetch failed', err);
      if (seq === this._fetchSeq) this._noHistory = true;
      return;
    }
    if (seq !== this._fetchSeq) return; // a newer fetch superseded this one
    this._lastFetch = Date.now();
    const unit = hass.states[config.temperature]?.attributes.unit_of_measurement as
      | string
      | undefined;
    // TRAIL + 1 samples: the last one is "now", already drawn as the live dot.
    const temps = resampleHold(data[config.temperature] ?? [], start, end, TRAIL + 1);
    const hums = resampleHold(data[config.humidity] ?? [], start, end, TRAIL + 1);
    const trail: TrailDot[] = [];
    for (let i = 0; i < TRAIL; i++) {
      if (!Number.isFinite(temps[i]) || !Number.isFinite(hums[i])) continue;
      trail.push({
        t: toCelsius(temps[i], unit),
        h: hums[i],
        ts: start + ((end - start) * i) / TRAIL,
      });
    }
    this._noHistory = false;
    this._trail = trail;
  }

  private _locale(): string {
    return this.hass?.locale?.language ?? this.hass?.language ?? 'en';
  }

  private _num(value: number, digits = 1): string {
    return new Intl.NumberFormat(this._locale(), { maximumFractionDigits: digits }).format(value);
  }

  /**
   * One word for the room. Temperature is decided first: people register too
   * warm or too cold long before they notice dry or clammy air.
   */
  private _verdict(t: number, h: number): Verdict {
    const zone = this._zone;
    if (t < zone.t_min) {
      return { word: 'Too cold', severity: zone.t_min - t > TEMP_TOLERANCE ? 'bad' : 'warn' };
    }
    if (t > zone.t_max) {
      return { word: 'Too warm', severity: t - zone.t_max > TEMP_TOLERANCE ? 'bad' : 'warn' };
    }
    if (h < zone.h_min) {
      return { word: 'Too dry', severity: zone.h_min - h > HUM_TOLERANCE ? 'bad' : 'warn' };
    }
    if (h > zone.h_max) {
      return { word: 'Too humid', severity: h - zone.h_max > HUM_TOLERANCE ? 'bad' : 'warn' };
    }
    return { word: 'Comfortable', severity: 'good' };
  }

  private _onCardClick(): void {
    if (!this._config) return;
    haptic(this);
    moreInfo(this, this._config.temperature);
  }

  private _renderPlot(unit: string | undefined, now: TrailDot | null): TemplateResult | typeof nothing {
    const size = this._plot;
    if (!size) return nothing;
    const boxW = size.w - PAD_L - PAD_R;
    const boxH = size.h - PAD_T - PAD_B;
    if (boxW < 24 || boxH < 24) return nothing;

    // Readings outside the domain clamp to the frame edge: an extreme value
    // still shows where it pushes, it never silently vanishes.
    const xOf = (t: number): number => PAD_L + clamp((t - T_MIN) / (T_MAX - T_MIN), 0, 1) * boxW;
    const yOf = (h: number): number => PAD_T + (1 - clamp((h - H_MIN) / (H_MAX - H_MIN), 0, 1)) * boxH;

    const zone = this._zone;
    const zx = xOf(zone.t_min);
    const zy = yOf(zone.h_max);
    const zw = Math.max(2, xOf(zone.t_max) - zx);
    const zh = Math.max(2, yOf(zone.h_min) - zy);
    const deg = (c: number): string => `${this._num(fromCelsius(c, unit), 0)}°`;
    const timeFmt = new Intl.DateTimeFormat(this._locale(), { hour: 'numeric', minute: '2-digit' });

    const dots: SVGTemplateResult[] = this._trail.map((d, i) => {
      // Oldest samples recede, the newest sits just under the live dot: one
      // accent hue, opacity alone carries age.
      const opacity = 0.12 + (0.36 * i) / Math.max(1, TRAIL - 1);
      return svg`<circle
        class="trail"
        cx=${xOf(d.t).toFixed(1)}
        cy=${yOf(d.h).toFixed(1)}
        r="2.5"
        style="opacity:${opacity.toFixed(2)}"
      ><title>${timeFmt.format(new Date(d.ts * 1000))} · ${deg(d.t)} · ${Math.round(d.h)}%</title></circle>`;
    });

    return html`
      <svg width=${size.w} height=${size.h}>
        <g class="frame">
          <line x1=${PAD_L} y1=${PAD_T + boxH} x2=${PAD_L + boxW} y2=${PAD_T + boxH}></line>
          <line x1=${PAD_L} y1=${PAD_T} x2=${PAD_L} y2=${PAD_T + boxH}></line>
        </g>
        <rect class="zone" x=${zx.toFixed(1)} y=${zy.toFixed(1)} width=${zw.toFixed(1)} height=${zh.toFixed(1)} rx="7">
          <title>${`Comfort zone · ${deg(zone.t_min)}–${deg(zone.t_max)} · ${zone.h_min}–${zone.h_max}%`}</title>
        </rect>
        <g class="dots">${dots}</g>
        ${now
          ? svg`<g class="now" style="transform:translate(${xOf(now.t).toFixed(1)}px,${yOf(now.h).toFixed(1)}px)">
              <circle class="halo" r="6.5"></circle>
              <circle class="live" r="4.5"></circle>
              <title>Now · ${deg(now.t)} · ${Math.round(now.h)}%</title>
            </g>`
          : nothing}
        <g class="axis">
          <text x=${PAD_L} y=${size.h - 3}>${deg(T_MIN)}</text>
          <text x=${PAD_L + boxW} y=${size.h - 3} text-anchor="end">${deg(T_MAX)}</text>
          <text x=${PAD_L - 5} y=${PAD_T + 4} text-anchor="end">${H_MAX}%</text>
          <text x=${PAD_L - 5} y=${PAD_T + boxH} text-anchor="end">${H_MIN}%</text>
        </g>
      </svg>
      ${this._noHistory ? html`<div class="note">History unavailable</div>` : nothing}
    `;
  }

  protected render(): TemplateResult | typeof nothing {
    const config = this._config;
    const hass = this.hass;
    if (!config) return nothing;
    const tempObj: HassEntity | undefined = hass?.states[config.temperature];
    const humObj: HassEntity | undefined = hass?.states[config.humidity];
    if (hass && (!tempObj || !humObj)) {
      return html`<ha-card
        ><div class="warning">Entity not found: ${!tempObj ? config.temperature : config.humidity}</div></ha-card
      >`;
    }

    const unit = tempObj?.attributes.unit_of_measurement as string | undefined;
    const tRaw = tempObj && !isUnavailable(tempObj) ? Number(tempObj.state) : NaN;
    const hRaw = humObj && !isUnavailable(humObj) ? Number(humObj.state) : NaN;
    const hasBoth = Number.isFinite(tRaw) && Number.isFinite(hRaw);
    const now: TrailDot | null = hasBoth
      ? { t: toCelsius(tRaw, unit), h: hRaw, ts: Date.now() / 1000 }
      : null;
    const verdict = now ? this._verdict(now.t, now.h) : null;
    const accent = accentFor(tempObj, config.color);
    const name = config.name ?? tempObj?.attributes.friendly_name ?? config.temperature;

    return html`
      <ha-card
        class="control ${hasBoth ? '' : 'unavailable'}"
        style="--silk-accent:${accent}"
        @click=${this._onCardClick}
      >
        <div class="name" title=${name}>${name}</div>
        <div class="plot">${this._renderPlot(unit, now)}</div>
        <div class="foot">
          <span
            class="verdict"
            style=${verdict ? `color:${SEVERITY_COLOR[verdict.severity]}` : ''}
          >
            <span class="vdot"></span>
            <span class="word">${verdict ? verdict.word : '—'}</span>
          </span>
          <span class="read">
            ${Number.isFinite(tRaw) ? formatNumber(hass, config.temperature, tRaw) : '—'}${unit ??
            '°'}<span class="sep">·</span>${Number.isFinite(hRaw) ? Math.round(hRaw) : '—'}%
          </span>
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
        gap: 6px;
        transition: transform 250ms var(--silk-spring);
      }
      ha-card:active {
        transform: scale(0.98);
        transition-duration: 120ms;
        transition-timing-function: var(--silk-ease-out);
      }
      .name {
        flex: none;
      }
      .plot {
        position: relative;
        flex: 1;
        min-height: 70px;
      }
      .plot svg {
        position: absolute;
        inset: 0;
        display: block;
        animation: silk-comfort-in 300ms var(--silk-ease-out);
      }
      .frame line {
        stroke: rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.14);
        stroke-width: 1;
      }
      .zone {
        fill: color-mix(in srgb, var(--silk-accent) 10%, transparent);
        stroke: color-mix(in srgb, var(--silk-accent) 40%, transparent);
        stroke-width: 1;
      }
      .trail {
        fill: var(--silk-accent);
      }
      .now {
        transition: transform 400ms var(--silk-ease-out);
      }
      .halo {
        fill: var(--card-background-color, #fff);
      }
      .live {
        fill: var(--silk-accent);
      }
      .axis text {
        font-size: 9px;
        fill: var(--primary-text-color);
        opacity: 0.4;
        font-variant-numeric: tabular-nums;
        pointer-events: none;
      }
      .note {
        position: absolute;
        left: 0;
        right: 0;
        top: 50%;
        transform: translateY(-50%);
        text-align: center;
        font-size: 11px;
        color: var(--secondary-text-color);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .foot {
        flex: none;
        display: flex;
        align-items: baseline;
        justify-content: space-between;
        gap: 8px;
        min-width: 0;
      }
      .verdict {
        display: flex;
        align-items: center;
        gap: 6px;
        min-width: 0;
        font-size: 15px;
        font-weight: 600;
        letter-spacing: -0.01em;
        color: var(--secondary-text-color);
        white-space: nowrap;
        transition: color 200ms ease;
      }
      .vdot {
        flex: none;
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background: currentColor;
      }
      .word {
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .read {
        flex: none;
        font-size: 12.5px;
        color: var(--secondary-text-color);
        font-variant-numeric: tabular-nums;
        white-space: nowrap;
      }
      .read .sep {
        opacity: 0.5;
        margin: 0 3px;
      }
      .unavailable .plot,
      .unavailable .foot {
        opacity: 0.45;
      }
      @keyframes silk-comfort-in {
        from {
          opacity: 0;
        }
        to {
          opacity: 1;
        }
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    'silk-comfort-card': SilkComfortCard;
  }
}
