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
import { HomeAssistant, LovelaceCardConfig, Point } from '../types';
import { silkControlStyles } from '../shared/base';
import { isUnavailable, moreInfo, haptic, clamp } from '../shared/service';
import { accentFor } from '../shared/color';
import { registerEditor } from '../shared/editor';
import { fetchSeries } from '../data';
import { resampleHold, niceDomain, toPxYs, buildLinePath, buildAreaPath } from '../graph';
import { formatNumber } from '../format';

export const META = {
  type: 'silk-peak-card',
  name: 'Silk Peak',
  description: "Today's biggest moment of demand.",
};

export interface SilkPeakCardConfig extends LovelaceCardConfig {
  /** Live power sensor (W). */
  entity: string;
  name?: string;
  /** Limit line; the header chip turns warning-colored while it is exceeded. */
  threshold?: number;
  /** Window length. Omit to track today, from local midnight. */
  hours_to_show?: number;
  /** Accent override. */
  color?: string;
}

const POINTS = 90;
const SPARK_H = 40;
/** Headroom for the peak label above the tallest sample. */
const PAD_TOP = 14;
const PAD_BOTTOM = 3;
const REFRESH_INTERVAL_MS = 300_000;
const REFRESH_THROTTLE_MS = 60_000;
/** How far above the day's own range a limit line may still be plotted. */
const LIMIT_HEADROOM = 2.2;

/** The measured maximum inside the window. */
interface Peak {
  /** Unix seconds. */
  t: number;
  v: number;
}

/** The window a render is drawn against, frozen at fetch time. */
interface Span {
  start: number;
  end: number;
  /** True when the window opens at local midnight rather than N hours back. */
  today: boolean;
}

const EDITOR_TAG = 'silk-peak-card-editor';

registerEditor(
  EDITOR_TAG,
  [
    {
      name: 'entity',
      required: true,
      selector: { entity: { domain: ['sensor'], device_class: ['power'] } },
    },
    { name: 'name', selector: { text: {} } },
    {
      name: '',
      type: 'grid',
      schema: [
        { name: 'threshold', selector: { number: { min: 0, mode: 'box' } } },
        { name: 'hours_to_show', selector: { number: { min: 1, mode: 'box' } } },
        { name: 'color', selector: { ui_color: {} } },
      ],
    },
  ],
  {
    entity: '전력 센서',
    name: '이름',
    threshold: '한계 전력',
    hours_to_show: '표시 시간 (비우면 오늘)',
    color: '강조 색상',
  }
);

/**
 * Peak demand: the single biggest moment the house has had today, marked on
 * the day's own curve, with the live value riding the right edge. One accent,
 * one dashed limit, two labels — the peak and now.
 */
@customElement('silk-peak-card')
export class SilkPeakCard extends LitElement {
  @property({ attribute: false }) public hass?: HomeAssistant;

  @state() private _config?: SilkPeakCardConfig;
  @state() private _width = 0;
  @state() private _height = 0;
  @state() private _peak: Peak | null = null;
  /** True when the history call failed; the plot degrades to a note. */
  @state() private _failed = false;
  @state() private _rev = 0;

  private _span: Span | null = null;
  private _pxYs: Float64Array | null = null;
  private _vals: Float64Array | null = null;
  private _domain: [number, number] = [0, 1];
  private _fetchStarted = false;
  private _fetchSeq = 0;
  private _lastFetch = 0;
  private _lastUpdated?: string;
  private _refreshTimer?: number;
  private _intervalTimer?: number;
  private _resizeObserver?: ResizeObserver;

  public static getStubConfig(hass: HomeAssistant): Partial<SilkPeakCardConfig> {
    const ids = Object.keys(hass.states).filter((id) => id.startsWith('sensor.'));
    const entity =
      ids.find(
        (id) =>
          hass.states[id].attributes.device_class === 'power' &&
          Number.isFinite(Number(hass.states[id].state))
      ) ?? ids.find((id) => hass.states[id].attributes.unit_of_measurement === 'W');
    return { type: 'custom:silk-peak-card', entity };
  }

  public static async getConfigElement(): Promise<HTMLElement> {
    return document.createElement(EDITOR_TAG);
  }

  public setConfig(config: SilkPeakCardConfig): void {
    if (!config.entity) {
      throw new Error('silk-peak-card: `entity` is required');
    }
    if (config.threshold !== undefined && !Number.isFinite(Number(config.threshold))) {
      throw new Error('silk-peak-card: `threshold` must be a number');
    }
    if (config.hours_to_show !== undefined && !(Number(config.hours_to_show) > 0)) {
      throw new Error('silk-peak-card: `hours_to_show` must be a positive number');
    }
    this._config = config;
    this._fetchStarted = false;
    this._peak = null;
    this._failed = false;
    this._vals = null;
    this._pxYs = null;
    this._span = null;
    this._lastUpdated = undefined;
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
    this._intervalTimer = undefined;
    window.clearTimeout(this._refreshTimer);
    this._refreshTimer = undefined;
    this._resizeObserver?.disconnect();
    this._resizeObserver = undefined;
  }

  protected willUpdate(changed: PropertyValues): void {
    if (!this.hass || !this._config) return;
    if (!this._fetchStarted) {
      this._fetchStarted = true;
      this._refresh();
      return;
    }
    if (changed.has('hass')) {
      this._trackLivePeak();
      this._onStatesChanged();
    }
  }

  protected updated(): void {
    if (this._resizeObserver) return;
    const spark = this.renderRoot.querySelector('.spark');
    if (!spark) return;
    this._resizeObserver = new ResizeObserver((entries) => {
      const rect = entries[entries.length - 1].contentRect;
      if (rect.width === this._width && rect.height === this._height) return;
      this._width = rect.width;
      this._height = rect.height;
      this._recompute();
    });
    this._resizeObserver.observe(spark);
  }

  private _threshold(): number | null {
    const raw = this._config?.threshold;
    return raw !== undefined && Number.isFinite(Number(raw)) ? Number(raw) : null;
  }

  private _liveValue(): number | null {
    const stateObj = this.hass?.states[this._config!.entity];
    if (!stateObj || isUnavailable(stateObj) || stateObj.state === '') return null;
    const v = Number(stateObj.state);
    return Number.isFinite(v) ? v : null;
  }

  /** A new record between refetches belongs on the card immediately. */
  private _trackLivePeak(): void {
    const v = this._liveValue();
    if (v === null) return;
    if (!this._peak || v > this._peak.v) this._peak = { t: Date.now() / 1000, v };
  }

  /** Refetch when the entity actually records a new state, throttled to 60s. */
  private _onStatesChanged(): void {
    const stamp = this.hass?.states[this._config!.entity]?.last_updated;
    if (!stamp || stamp === this._lastUpdated) return;
    this._lastUpdated = stamp;
    if (this._refreshTimer) return;
    const wait = Math.max(0, REFRESH_THROTTLE_MS - (Date.now() - this._lastFetch));
    this._refreshTimer = window.setTimeout(() => {
      this._refreshTimer = undefined;
      this._refresh();
    }, wait);
  }

  private _makeSpan(): Span {
    const end = Date.now() / 1000;
    const hours = this._config?.hours_to_show;
    if (hours !== undefined && Number(hours) > 0) {
      return { start: end - Number(hours) * 3600, end, today: false };
    }
    const now = new Date();
    const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime() / 1000;
    return { start: midnight, end, today: true };
  }

  private async _refresh(): Promise<void> {
    if (!this.hass || !this._config) return;
    const entity = this._config.entity;
    const span = this._makeSpan();
    const hours = Math.max((span.end - span.start) / 3600, 0.5);
    const seq = ++this._fetchSeq;
    let data: Record<string, Point[]>;
    try {
      data = await fetchSeries(this.hass, [entity], span.start, span.end, hours);
    } catch (err) {
      console.warn('silk-peak-card: history fetch failed', err);
      if (seq === this._fetchSeq) this._failed = true;
      return;
    }
    if (seq !== this._fetchSeq) return; // a newer fetch superseded this one
    this._lastFetch = Date.now();
    this._failed = false;
    this._span = span;

    const points = data[entity] ?? [];
    let peak: Peak | null = null;
    for (const p of points) {
      if (!Number.isFinite(p.v) || p.t < span.start || p.t > span.end) continue;
      if (!peak || p.v > peak.v) peak = { t: p.t, v: p.v };
    }
    const live = this._liveValue();
    if (live !== null && (!peak || live > peak.v)) peak = { t: span.end, v: live };
    this._peak = peak;

    const vals = resampleHold(points, span.start, span.end, POINTS);
    // Previous-value hold can alias a short spike away; lifting the sample
    // nearest the peak to the true maximum keeps line and marker in agreement.
    if (peak && span.end > span.start) {
      const idx = Math.round(((peak.t - span.start) / (span.end - span.start)) * (POINTS - 1));
      const i = clamp(idx, 0, POINTS - 1);
      if (!Number.isFinite(vals[i]) || vals[i] < peak.v) vals[i] = peak.v;
    }
    this._vals = vals;
    this._domain = this._domainFor(vals);
    this._recompute();
  }

  /** Data domain, widened just enough to keep the limit line on the plot. */
  private _domainFor(vals: Float64Array): [number, number] {
    const [lo, hi] = niceDomain([vals]);
    const threshold = this._threshold();
    if (threshold === null) return [lo, hi];
    // A limit far above anything the day measured would squash the curve into
    // a flat line. Past this much headroom it stays off-plot and the state
    // line carries the number instead.
    if (threshold > lo + (hi - lo) * LIMIT_HEADROOM) return [lo, hi];
    const pad = Math.max((hi - lo) * 0.08, Math.abs(threshold) * 0.02, 0.5);
    return [Math.min(lo, threshold - pad), Math.max(hi, threshold + pad)];
  }

  private _recompute(): void {
    if (!this._vals || !this._width || !this._height) return;
    this._pxYs = toPxYs(this._vals, this._domain, this._height, PAD_TOP, PAD_BOTTOM);
    this._rev++;
  }

  /** One value into plot-space y, using the same mapping as the line. */
  private _yOf(value: number): number {
    return toPxYs(
      Float64Array.from([value]),
      this._domain,
      this._height,
      PAD_TOP,
      PAD_BOTTOM
    )[0];
  }

  private _locale(): string {
    return this.hass?.locale?.language ?? this.hass?.language ?? 'en';
  }

  private _time(seconds: number): string {
    return new Intl.DateTimeFormat(this._locale(), {
      hour: 'numeric',
      minute: '2-digit',
    }).format(new Date(seconds * 1000));
  }

  private _onTap(): void {
    if (!this._config) return;
    haptic(this);
    moreInfo(this, this._config.entity);
  }

  private _renderSpark(unit: string): TemplateResult | typeof nothing {
    if (this._failed) {
      return html`<div class="note">History unavailable</div>`;
    }
    const w = this._width;
    const h = this._height;
    const ys = this._pxYs;
    const span = this._span;
    if (!w || !h || !ys || !span) return nothing;

    const line = buildLinePath(ys, w);
    const area = buildAreaPath(ys, w, h);
    const threshold = this._threshold();
    // Only a limit inside the plotted domain gets a line; see _domainFor.
    const onPlot =
      threshold !== null && threshold >= this._domain[0] && threshold <= this._domain[1];
    const thresholdY = onPlot ? clamp(this._yOf(threshold as number), 1, h - 1) : null;
    const peak = this._peak;
    const duration = span.end - span.start || 1;

    let peakMark: SVGTemplateResult | typeof nothing = nothing;
    if (peak) {
      const px = clamp(((peak.t - span.start) / duration) * w, 0, w);
      const py = clamp(this._yOf(peak.v), 3, h - 3);
      const peakText = `${formatNumber(this.hass, this._config!.entity, peak.v)} ${unit} at ${this._time(peak.t)}`;
      // The label leans away from the edge it is nearest, so it never clips;
      // its surface-colored halo keeps it legible over the line and the limit.
      const rightSide = px > w * 0.55;
      const above = py - 7 >= 9 || py + 12 > h - 1;
      peakMark = svg`
        <g class="peak" style="transform:translate(${px.toFixed(1)}px, ${py.toFixed(1)}px)">
          <circle class="peak-dot" r="2"><title>Peak ${peakText}</title></circle>
          <text
            class="peak-label"
            x=${rightSide ? -6 : 6}
            y=${above ? -7 : 12}
            text-anchor=${rightSide ? 'end' : 'start'}
          >${peakText}</text>
        </g>`;
    }

    const live = this._liveValue();
    const nowY = live !== null ? clamp(this._yOf(live), 3, h - 3) : null;

    return html`
      <svg viewBox="0 0 ${w} ${h}" width=${w} height=${h}>
        <g class="chart">
          <path class="area" d=${area}></path>
          <path class="line" d=${line}></path>
          ${thresholdY !== null
            ? svg`<line
                class="limit"
                x1="0"
                x2=${w}
                y1=${thresholdY.toFixed(1)}
                y2=${thresholdY.toFixed(1)}
              ><title>Limit ${formatNumber(this.hass, this._config!.entity, threshold as number)} ${unit}</title></line>`
            : nothing}
          ${peakMark}
          ${nowY !== null
            ? svg`<g class="now" style="transform:translate(${(w - 2).toFixed(1)}px, ${nowY.toFixed(1)}px)">
                <circle class="now-dot" r="2.5"><title>Now ${formatNumber(
                  this.hass,
                  this._config!.entity,
                  live as number
                )} ${unit}</title></circle>
              </g>`
            : nothing}
        </g>
      </svg>
    `;
  }

  protected render(): TemplateResult | typeof nothing {
    const config = this._config;
    if (!config) return nothing;
    void this._rev; // reactive dependency for the imperatively built sparkline
    const hass = this.hass;
    const stateObj = hass?.states[config.entity];
    if (hass && !stateObj) {
      return html`<ha-card><div class="warning">Entity not found: ${config.entity}</div></ha-card>`;
    }

    const unavailable = isUnavailable(stateObj);
    const accent = accentFor(stateObj, config.color);
    const unit = (stateObj?.attributes.unit_of_measurement as string | undefined) ?? 'W';
    const name = config.name ?? stateObj?.attributes.friendly_name ?? config.entity;
    const live = this._liveValue();
    const threshold = this._threshold();
    const over = threshold !== null && live !== null && live > threshold;
    const hours = config.hours_to_show;
    const windowText =
      hours !== undefined && Number(hours) > 0 ? `Last ${Number(hours)}h` : 'Since midnight';

    return html`
      <ha-card
        class="control ${unavailable ? 'unavailable' : ''}"
        style="--silk-accent:${accent}"
        @click=${this._onTap}
      >
        <div class="top">
          <div class="icon">
            <ha-state-icon .hass=${hass} .stateObj=${stateObj}></ha-state-icon>
          </div>
          <div class="info">
            <div class="name">${name}</div>
            <div class="state">
              ${windowText}${threshold !== null
                ? html`<span class="sep">·</span>limit
                    ${formatNumber(hass, config.entity, threshold)} ${unit}`
                : nothing}
            </div>
          </div>
          <div class="trailing">
            <span
              class="chip ${over ? 'over' : ''}"
              aria-label=${`Now ${
                live !== null ? formatNumber(hass, config.entity, live) : 'unknown'
              } ${unit}`}
            >
              ${live !== null ? formatNumber(hass, config.entity, live) : '—'} ${unit}
            </span>
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
        gap: 8px;
      }
      .top {
        flex: none;
        display: flex;
        align-items: center;
        gap: 12px;
        min-width: 0;
      }
      /* Data card: the icon presses with the card, it is not a control. */
      .icon {
        cursor: pointer;
      }
      .icon:active {
        transform: none;
      }
      .chip {
        cursor: inherit;
        white-space: nowrap;
        font-variant-numeric: tabular-nums;
      }
      .chip:hover {
        background: rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.06);
      }
      /* Crossing a configured limit is real status, so it earns warning chroma. */
      .chip.over {
        color: var(--warning-color, #ffa600);
        background: color-mix(in srgb, var(--warning-color, #ffa600) 16%, transparent);
      }
      .chip.over:hover {
        background: color-mix(in srgb, var(--warning-color, #ffa600) 16%, transparent);
      }
      .spark {
        position: relative;
        flex: 1;
        min-height: ${SPARK_H}px;
        margin: 0 -2px;
      }
      .spark svg {
        position: absolute;
        inset: 0;
        display: block;
        overflow: visible;
      }
      .chart {
        animation: silk-peak-in 300ms var(--silk-ease-out);
      }
      .area {
        fill: var(--silk-accent);
        fill-opacity: 0.12;
      }
      .line {
        fill: none;
        stroke: var(--silk-accent);
        stroke-width: 2;
        stroke-linecap: round;
        stroke-linejoin: round;
      }
      /* The limit is a reference, not a verdict: recessive until it is crossed. */
      .limit {
        stroke: rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.4);
        stroke-width: 2;
        stroke-dasharray: 3 4;
        stroke-linecap: round;
      }
      .peak,
      .now {
        transition: transform 400ms var(--silk-ease-out);
      }
      .peak-dot {
        fill: var(--silk-accent);
        stroke: var(--card-background-color, #fff);
        stroke-width: 1.5;
      }
      .now-dot {
        fill: var(--silk-accent);
        stroke: var(--card-background-color, #fff);
        stroke-width: 1.5;
      }
      /* Cut out of the card surface — a hard halo, zero blur, never a glow. */
      .peak-label {
        font-size: 10px;
        font-weight: 500;
        fill: var(--primary-text-color);
        stroke: var(--card-background-color, #fff);
        stroke-width: 3;
        stroke-linejoin: round;
        paint-order: stroke fill;
        opacity: 0.8;
        font-variant-numeric: tabular-nums;
        pointer-events: none;
      }
      .note {
        position: absolute;
        inset: 0;
        display: grid;
        place-items: center;
        font-size: 12px;
        color: var(--secondary-text-color);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .unavailable .spark {
        opacity: 0.45;
      }
      @keyframes silk-peak-in {
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
    'silk-peak-card': SilkPeakCard;
  }
}
