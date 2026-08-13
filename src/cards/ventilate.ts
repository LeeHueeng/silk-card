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
import { isActive, isUnavailable, toggleEntity, moreInfo, haptic } from '../shared/service';
import { registerEditor } from '../shared/editor';
import { fetchSeries } from '../data';
import { resampleHold, niceDomain, toPxYs, buildLinePath, buildAreaPath, extremeIndices } from '../graph';
import { formatNumber } from '../format';

export const META = {
  type: 'silk-ventilate-card',
  name: 'Silk Ventilate',
  description: "Open a window now, or don't.",
};

export interface SilkVentilateCardConfig extends LovelaceCardConfig {
  co2: string;
  outdoor_temp?: string;
  /** Fan, window or switch to run straight from the card. */
  fan?: string;
  name?: string;
  icon?: string;
}

type Band = 'good' | 'fair' | 'poor';

const FAIR_PPM = 800;
const POOR_PPM = 1200;

const BAND_WORD: Record<Band, string> = { good: 'Good', fair: 'Fair', poor: 'Poor' };

// An air verdict is genuine status, which is the one sanctioned use of
// success/warning/error chroma in Silk.
const BAND_COLOR: Record<Band, string> = {
  good: 'var(--success-color, #57ad60)',
  fair: 'var(--warning-color, #e6a23c)',
  poor: 'var(--error-color, #db4437)',
};

const bandOf = (ppm: number): Band => (ppm < FAIR_PPM ? 'good' : ppm < POOR_PPM ? 'fair' : 'poor');

const HOURS = 2;
/** 24 samples over two hours — one every five minutes. */
const POINTS = 24;
/** Samples the slope is fitted over (~40 minutes). */
const SLOPE_POINTS = 9;
/** Rising this fast means the room is filling up faster than it clears. */
const RISING_PPM_PER_H = 50;
/** Falling this fast means a window is already doing its job. */
const CLEARING_PPM_PER_H = -80;
/** Below this, outdoor air is cold enough that airing out costs real heat. */
const COLD_C = 8;

const PAD_TOP = 8;
const PAD_BOTTOM = 4;
const REFRESH_INTERVAL_MS = 300_000;
const REFRESH_THROTTLE_MS = 60_000;
const OPTIMISTIC_TIMEOUT_MS = 2000;

let uidCounter = 0;

const isFahrenheit = (unit: string | undefined): boolean => !!unit && unit.toUpperCase().includes('F');

const toCelsius = (v: number, unit: string | undefined): number =>
  isFahrenheit(unit) ? ((v - 32) * 5) / 9 : v;

/**
 * Least-squares slope over the tail of the series, in ppm per hour. Needs at
 * least three finite samples; a flat or unknown trend returns null.
 */
function slopePerHour(vals: Float64Array, count: number, minutesPerPoint: number): number | null {
  const from = Math.max(0, vals.length - count);
  let n = 0;
  let sx = 0;
  let sy = 0;
  let sxy = 0;
  let sxx = 0;
  for (let i = from; i < vals.length; i++) {
    const v = vals[i];
    if (!Number.isFinite(v)) continue;
    n++;
    sx += i;
    sy += v;
    sxy += i * v;
    sxx += i * i;
  }
  if (n < 3) return null;
  const denom = n * sxx - sx * sx;
  if (!denom) return null;
  return ((n * sxy - sx * sy) / denom) * (60 / minutesPerPoint);
}

const EDITOR_TAG = 'silk-ventilate-card-editor';

registerEditor(
  EDITOR_TAG,
  [
    {
      name: 'co2',
      required: true,
      selector: { entity: { domain: ['sensor'], device_class: ['carbon_dioxide'] } },
    },
    {
      name: 'outdoor_temp',
      selector: { entity: { domain: ['sensor'], device_class: ['temperature'] } },
    },
    {
      name: 'fan',
      selector: { entity: { domain: ['fan', 'switch', 'cover', 'input_boolean', 'script'] } },
    },
    { name: 'name', selector: { text: {} } },
    { name: 'icon', selector: { icon: {} } },
  ],
  {
    co2: 'CO₂ sensor',
    outdoor_temp: 'Outdoor temperature',
    fan: 'Fan or window',
    name: 'Name',
    icon: 'Icon',
  }
);

@customElement('silk-ventilate-card')
export class SilkVentilateCard extends LitElement {
  @property({ attribute: false }) public hass?: HomeAssistant;

  @state() private _config?: SilkVentilateCardConfig;
  @state() private _width = 0;
  @state() private _height = 0;
  @state() private _rev = 0;
  @state() private _noHistory = false;
  /** Optimistic fan/window target (null = trust the real state). */
  @state() private _optimistic: boolean | null = null;

  private _uid = `silk-vent${++uidCounter}`;
  private _vals: Float64Array | null = null;
  private _pxYs: Float64Array | null = null;
  private _domain: [number, number] = [0, 1];
  private _start = 0;
  private _end = 0;
  private _slope: number | null = null;
  private _fetchStarted = false;
  private _fetchSeq = 0;
  private _lastFetch = 0;
  private _lastUpdated?: string;
  private _refreshTimer?: number;
  private _intervalTimer?: number;
  private _resize?: ResizeObserver;
  private _optimisticBase = '';
  private _optimisticTimer?: number;

  public static getStubConfig(hass: HomeAssistant): Partial<SilkVentilateCardConfig> {
    const ids = Object.keys(hass.states);
    const byClass = (cls: string): string | undefined =>
      ids.find((id) => id.startsWith('sensor.') && hass.states[id].attributes.device_class === cls);
    const outdoorish = /out(door|side)|extern|balcon|garden/i;
    const outdoor = ids.find(
      (id) =>
        id.startsWith('sensor.') &&
        hass.states[id].attributes.device_class === 'temperature' &&
        (outdoorish.test(id) || outdoorish.test(String(hass.states[id].attributes.friendly_name ?? '')))
    );
    return {
      type: 'custom:silk-ventilate-card',
      co2: byClass('carbon_dioxide'),
      outdoor_temp: outdoor,
      fan: ids.find((id) => id.startsWith('fan.')),
    };
  }

  public static async getConfigElement(): Promise<HTMLElement> {
    return document.createElement(EDITOR_TAG);
  }

  public setConfig(config: SilkVentilateCardConfig): void {
    if (!config.co2) {
      throw new Error('silk-ventilate-card: `co2` is required');
    }
    if (config.fan !== undefined && typeof config.fan !== 'string') {
      throw new Error('silk-ventilate-card: `fan` must be an entity id');
    }
    this._config = config;
    this._vals = null;
    this._pxYs = null;
    this._slope = null;
    this._noHistory = false;
    this._fetchStarted = false;
    this._lastUpdated = undefined;
    this._clearOptimistic();
  }

  public getCardSize(): number {
    return 2;
  }

  public getGridOptions(): Record<string, number> {
    return { columns: 6, rows: 2, min_columns: 4, min_rows: 2 };
  }

  public connectedCallback(): void {
    super.connectedCallback();
    this._intervalTimer = window.setInterval(() => this._refresh(), REFRESH_INTERVAL_MS);
    if (this.hasUpdated && this._fetchStarted) this._refresh();
  }

  public disconnectedCallback(): void {
    super.disconnectedCallback();
    window.clearInterval(this._intervalTimer);
    window.clearTimeout(this._refreshTimer);
    window.clearTimeout(this._optimisticTimer);
    this._refreshTimer = undefined;
    this._optimisticTimer = undefined;
    this._resize?.disconnect();
    this._resize = undefined;
  }

  protected willUpdate(changed: PropertyValues): void {
    if (!this.hass || !this._config) return;
    if (changed.has('hass') && this._optimistic !== null && this._config.fan) {
      const fanObj = this.hass.states[this._config.fan];
      if (fanObj && fanObj.last_updated !== this._optimisticBase) this._clearOptimistic();
    }
    if (!this._fetchStarted) {
      this._fetchStarted = true;
      this._refresh();
      return;
    }
    if (changed.has('hass')) this._onStatesChanged();
  }

  protected updated(): void {
    if (this._resize) return;
    const spark = this.renderRoot.querySelector('.spark');
    if (!spark) return;
    this._resize = new ResizeObserver((entries) => {
      const rect = entries[entries.length - 1].contentRect;
      if (rect.width === this._width && rect.height === this._height) return;
      this._width = rect.width;
      this._height = rect.height;
      this._recompute();
    });
    this._resize.observe(spark);
  }

  /** Refetch when the sensor records a new reading, throttled to 60s. */
  private _onStatesChanged(): void {
    const stamp = this.hass?.states[this._config!.co2]?.last_updated;
    if (!stamp || stamp === this._lastUpdated) return;
    this._lastUpdated = stamp;
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
      data = await fetchSeries(hass, [config.co2], start, end, HOURS);
    } catch (err) {
      console.warn('silk-ventilate-card: history fetch failed', err);
      if (seq === this._fetchSeq) this._noHistory = true;
      return;
    }
    if (seq !== this._fetchSeq) return; // a newer fetch superseded this one
    this._lastFetch = Date.now();
    this._start = start;
    this._end = end;
    this._vals = resampleHold(data[config.co2] ?? [], start, end, POINTS);
    this._domain = niceDomain([this._vals]);
    this._slope = slopePerHour(this._vals, SLOPE_POINTS, (HOURS * 60) / (POINTS - 1));
    this._noHistory = false;
    this._recompute();
  }

  private _recompute(): void {
    if (!this._vals || !this._width || !this._height) return;
    this._pxYs = toPxYs(this._vals, this._domain, this._height, PAD_TOP, PAD_BOTTOM);
    this._rev++;
  }

  private _clearOptimistic(): void {
    window.clearTimeout(this._optimisticTimer);
    this._optimisticTimer = undefined;
    this._optimistic = null;
  }

  private _locale(): string {
    return this.hass?.locale?.language ?? this.hass?.language ?? 'en';
  }

  private _num(value: number, digits = 1): string {
    return new Intl.NumberFormat(this._locale(), { maximumFractionDigits: digits }).format(value);
  }

  /**
   * The whole point of the card: whether opening a window is worth it right
   * now, given both the trend indoors and the price of the air outside.
   */
  private _verdict(band: Band | null): string {
    if (!band) return 'No reading';
    const slope = this._slope;
    const needsAir = band === 'poor' || (band === 'fair' && slope !== null && slope >= RISING_PPM_PER_H);
    if (!needsAir) {
      if (band !== 'good' && slope !== null && slope <= CLEARING_PPM_PER_H) return 'Clearing out';
      return 'Air is fine';
    }
    const config = this._config!;
    const outObj = config.outdoor_temp ? this.hass?.states[config.outdoor_temp] : undefined;
    const outRaw = outObj && !isUnavailable(outObj) ? Number(outObj.state) : NaN;
    if (!Number.isFinite(outRaw)) return 'Ventilate now';
    const unit = outObj?.attributes.unit_of_measurement as string | undefined;
    const shown = `${this._num(outRaw, 0)}°`;
    return toCelsius(outRaw, unit) <= COLD_C
      ? `Ventilating would cost heat — outside ${shown}`
      : `Ventilate now — outside is ${shown}`;
  }

  private _onCardClick(): void {
    if (!this._config) return;
    haptic(this);
    moreInfo(this, this._config.co2);
  }

  private _onActionClick(ev: Event): void {
    ev.stopPropagation();
    const config = this._config;
    const hass = this.hass;
    if (!config?.fan || !hass) return;
    const fanObj = hass.states[config.fan];
    if (!fanObj || isUnavailable(fanObj)) return;
    haptic(this);
    this._optimistic = !isActive(fanObj);
    this._optimisticBase = fanObj.last_updated;
    window.clearTimeout(this._optimisticTimer);
    this._optimisticTimer = window.setTimeout(() => this._clearOptimistic(), OPTIMISTIC_TIMEOUT_MS);
    toggleEntity(hass, config.fan);
  }

  private _renderSpark(unit: string): TemplateResult | typeof nothing {
    const w = this._width;
    const h = this._height;
    const ys = this._pxYs;
    const vals = this._vals;
    if (this._noHistory) return html`<div class="note">History unavailable</div>`;
    if (!w || !h || !ys || !vals) return nothing;
    const line = buildLinePath(ys, w);
    const area = buildAreaPath(ys, w, h);
    const gradId = `${this._uid}-fill`;
    const step = w / (POINTS - 1);
    const timeFmt = new Intl.DateTimeFormat(this._locale(), { hour: 'numeric', minute: '2-digit' });

    const hits: SVGTemplateResult[] = [];
    for (let i = 0; i < POINTS; i++) {
      const t = this._start + ((this._end - this._start) * i) / (POINTS - 1);
      const reading = Number.isFinite(vals[i])
        ? `${formatNumber(this.hass, this._config!.co2, vals[i])}${unit ? ` ${unit}` : ''}`
        : '—';
      hits.push(
        svg`<rect class="hit" x=${(i * step - step / 2).toFixed(1)} y="0" width=${step.toFixed(1)} height=${h}>
          <title>${timeFmt.format(new Date(t * 1000))} · ${reading}</title>
        </rect>`
      );
    }

    // One selective label: the peak, and only when it is clearly above the
    // live value the hero already states.
    const { max } = extremeIndices(vals);
    const last = vals[POINTS - 1];
    const showMax =
      max >= 0 && Number.isFinite(last) && vals[max] > last * 1.05 && max < POINTS - 2;
    const maxX = max >= 0 ? max * step : 0;

    return html`
      <svg viewBox="0 0 ${w} ${h}" width=${w} height=${h}>
        <defs>
          <linearGradient id=${gradId} x1="0" y1="0" x2="0" y2="1">
            <stop
              offset="0%"
              stop-color="currentColor"
              stop-opacity="0.25"
              style="color:var(--silk-accent)"
            ></stop>
            <stop
              offset="100%"
              stop-color="currentColor"
              stop-opacity="0.02"
              style="color:var(--silk-accent)"
            ></stop>
          </linearGradient>
        </defs>
        <g class="chart" style="color:var(--silk-accent)">
          <path d=${area} fill="url(#${gradId})"></path>
          <path
            d=${line}
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          ></path>
          ${showMax
            ? svg`<text
                class="peak"
                x=${Math.min(Math.max(maxX, 12), w - 12).toFixed(1)}
                y=${Math.max(9, ys[max] - 5).toFixed(1)}
                text-anchor=${maxX > w / 2 ? 'end' : 'start'}
              >${formatNumber(this.hass, this._config!.co2, vals[max])}</text>`
            : nothing}
          ${hits}
        </g>
      </svg>
    `;
  }

  private _renderAction(): TemplateResult | typeof nothing {
    const config = this._config;
    const hass = this.hass;
    if (!config?.fan || !hass) return nothing;
    const fanObj: HassEntity | undefined = hass.states[config.fan];
    if (!fanObj) return nothing;
    const unavailable = isUnavailable(fanObj);
    const active = this._optimistic ?? isActive(fanObj);
    const label = (fanObj.attributes.friendly_name as string | undefined) ?? config.fan;
    return html`
      <button
        class="act ${active ? 'on' : ''}"
        .disabled=${unavailable}
        aria-pressed=${active ? 'true' : 'false'}
        aria-label=${`Toggle ${label}`}
        title=${label}
        @click=${this._onActionClick}
      >
        <ha-state-icon .hass=${hass} .stateObj=${fanObj}></ha-state-icon>
      </button>
    `;
  }

  protected render(): TemplateResult | typeof nothing {
    const config = this._config;
    const hass = this.hass;
    if (!config) return nothing;
    void this._rev; // reactive dependency for the measured sparkline
    const co2Obj: HassEntity | undefined = hass?.states[config.co2];
    if (hass && !co2Obj) {
      return html`<ha-card><div class="warning">Entity not found: ${config.co2}</div></ha-card>`;
    }

    const ppm = co2Obj && !isUnavailable(co2Obj) ? Number(co2Obj.state) : NaN;
    const ready = Number.isFinite(ppm);
    const band: Band | null = ready ? bandOf(ppm) : null;
    const accent = band ? BAND_COLOR[band] : 'var(--primary-color, #4aa8ff)';
    const unit = (co2Obj?.attributes.unit_of_measurement as string | undefined) ?? 'ppm';
    const name = config.name ?? co2Obj?.attributes.friendly_name ?? config.co2;

    return html`
      <ha-card
        class="control ${ready ? '' : 'unavailable'}"
        style="--silk-accent:${accent}"
        @click=${this._onCardClick}
      >
        <div class="top">
          <div class="icon ${ready ? 'on' : ''}">
            <ha-icon .icon=${config.icon ?? 'mdi:molecule-co2'}></ha-icon>
          </div>
          <div class="info">
            <div class="name" title=${name}>${name}</div>
            <div class="state">
              <span class="word">${band ? BAND_WORD[band] : '—'}</span>
              <span class="sep">·</span>${this._verdict(band)}
            </div>
          </div>
          <div class="trailing">
            <span class="hero">${ready ? formatNumber(hass, config.co2, ppm) : '—'}</span>
            <span class="unit">${unit}</span>
            ${this._renderAction()}
          </div>
        </div>
        <div class="spark">${this._renderSpark(unit)}</div>
      </ha-card>
    `;
  }

  static styles = [
    silkControlStyles,
    css`
      ha-card {
        flex-direction: column;
        align-items: stretch;
        gap: 0;
      }
      .top {
        flex: none;
        display: flex;
        align-items: center;
        gap: 12px;
        min-width: 0;
      }
      /* A reading, not a control: the icon presses with the card. */
      .icon {
        cursor: pointer;
      }
      .icon:active {
        transform: none;
      }
      .word {
        font-weight: 600;
        color: var(--silk-accent);
        transition: color 200ms ease;
      }
      .trailing {
        align-items: baseline;
        gap: 3px;
      }
      .hero {
        font-size: 24px;
        font-weight: 600;
        letter-spacing: -0.02em;
        line-height: 1.1;
        color: var(--primary-text-color);
        font-variant-numeric: tabular-nums;
      }
      .act {
        flex: none;
        position: relative;
        align-self: center;
        width: 36px;
        height: 36px;
        margin-left: 3px;
        border: none;
        border-radius: 12px;
        display: grid;
        place-items: center;
        padding: 0;
        cursor: pointer;
        color: var(--secondary-text-color);
        background: rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.06);
        transition:
          transform 250ms var(--silk-spring),
          background 200ms ease,
          color 200ms ease;
      }
      /* Invisible halo lifts the touch target past 40px without growing the key. */
      .act::after {
        content: '';
        position: absolute;
        inset: -3px;
        border-radius: 14px;
      }
      .act:active {
        transform: scale(0.9);
        transition-duration: 120ms;
        transition-timing-function: var(--silk-ease-out);
      }
      .act.on {
        color: var(--silk-accent);
        background: color-mix(in srgb, var(--silk-accent) 20%, transparent);
      }
      .act:disabled {
        cursor: default;
        opacity: 0.45;
      }
      .act ha-state-icon {
        --mdc-icon-size: 20px;
        pointer-events: none;
      }
      .spark {
        flex: 1;
        position: relative;
        min-height: 38px;
        margin: 6px -12px -12px;
      }
      .spark svg {
        position: absolute;
        inset: 0;
        display: block;
        animation: silk-vent-in 300ms var(--silk-ease-out);
      }
      .hit {
        fill: transparent;
      }
      .peak {
        font-size: 10px;
        font-weight: 500;
        fill: var(--primary-text-color);
        opacity: 0.6;
        font-variant-numeric: tabular-nums;
        pointer-events: none;
      }
      .note {
        position: absolute;
        left: 12px;
        right: 12px;
        bottom: 14px;
        font-size: 11px;
        color: var(--secondary-text-color);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .unavailable .spark {
        opacity: 0.45;
      }
      @keyframes silk-vent-in {
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
    'silk-ventilate-card': SilkVentilateCard;
  }
}
