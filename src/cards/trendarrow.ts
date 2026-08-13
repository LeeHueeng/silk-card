import { LitElement, html, svg, css, nothing, PropertyValues, TemplateResult } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { HomeAssistant, LovelaceCardConfig, Point } from '../types';
import { silkControlStyles } from '../shared/base';
import { isUnavailable, moreInfo, haptic } from '../shared/service';
import { accentFor } from '../shared/color';
import { registerEditor } from '../shared/editor';
import { fetchSeries } from '../data';
import {
  resampleHold,
  niceDomain,
  toPxYs,
  buildLinePath,
  buildAreaPath,
  firstFiniteIndex,
} from '../graph';
import { formatNumber } from '../format';

export const META = {
  type: 'silk-trend-card',
  name: 'Silk Trend',
  description: 'The number, the direction, the proof.',
};

export interface SilkTrendCardConfig extends LovelaceCardConfig {
  entity: string;
  name?: string;
  /** Unit override; the entity's own unit by default. */
  unit?: string;
  /** Comparison window, in hours. Default 24. */
  hours_to_show?: number;
  /** When true, rising is the bad direction (cost, usage, latency). */
  invert?: boolean;
  /** Fixed decimal places for the hero number. */
  decimals?: number;
  /** Accent override. */
  color?: string;
}

/** Where the trend chip's tint comes from — never decoration, always meaning. */
type Tone = 'good' | 'bad' | 'flat';

const DEFAULT_HOURS = 24;
const POINTS = 60;
const SPARK_H = 34;
const SPARK_PAD = 4;
/** The sparkline is background, not a figure: it sits well under the number. */
const SPARK_OPACITY = 0.22;
const REFRESH_INTERVAL_MS = 300_000;
const REFRESH_THROTTLE_MS = 60_000;

/** 10×10 glyphs, drawn as paths — Silk never ships emoji. */
const GLYPH_UP = 'M5 1.6 L9.2 8.4 L0.8 8.4 Z';
const GLYPH_DOWN = 'M5 8.4 L0.8 1.6 L9.2 1.6 Z';
const GLYPH_FLAT = 'M1 4.2 L9 4.2 L9 5.8 L1 5.8 Z';

const EDITOR_TAG = 'silk-trend-card-editor';

registerEditor(
  EDITOR_TAG,
  [
    {
      name: 'entity',
      required: true,
      selector: { entity: { domain: ['sensor', 'number', 'input_number', 'counter'] } },
    },
    { name: 'name', selector: { text: {} } },
    {
      name: '',
      type: 'grid',
      schema: [
        { name: 'unit', selector: { text: {} } },
        { name: 'hours_to_show', selector: { number: { min: 1, mode: 'box' } } },
      ],
    },
    {
      name: '',
      type: 'grid',
      schema: [
        { name: 'decimals', selector: { number: { min: 0, max: 5, mode: 'box' } } },
        { name: 'invert', selector: { boolean: {} } },
      ],
    },
  ],
  {
    entity: 'Entity',
    name: 'Name',
    unit: 'Unit',
    hours_to_show: 'Hours to show',
    decimals: 'Decimals',
    invert: 'Invert (up = bad)',
  },
  { hours_to_show: DEFAULT_HOURS }
);

@customElement('silk-trend-card')
export class SilkTrendCard extends LitElement {
  @property({ attribute: false }) public hass?: HomeAssistant;

  @state() private _config?: SilkTrendCardConfig;
  @state() private _size: { w: number; h: number } | null = null;
  @state() private _rev = 0;

  private _vals: Float64Array | null = null;
  /** The value at the start of the window — the "vs 24h ago" anchor. */
  private _past: number | null = null;
  private _fetchStarted = false;
  private _fetchSeq = 0;
  private _lastFetch = 0;
  private _lastUpdated?: string;
  private _refreshTimer?: number;
  private _intervalTimer?: number;
  private _resize?: ResizeObserver;

  public static getStubConfig(hass: HomeAssistant): Partial<SilkTrendCardConfig> {
    const ids = Object.keys(hass.states).filter(
      (id) =>
        id.startsWith('sensor.') &&
        Number.isFinite(Number(hass.states[id].state)) &&
        hass.states[id].attributes.unit_of_measurement
    );
    const byClass = (cls: string) =>
      ids.find((id) => hass.states[id].attributes.device_class === cls);
    return {
      type: 'custom:silk-trend-card',
      entity: byClass('power') ?? byClass('temperature') ?? ids[0],
    };
  }

  public static async getConfigElement(): Promise<HTMLElement> {
    return document.createElement(EDITOR_TAG);
  }

  public setConfig(config: SilkTrendCardConfig): void {
    if (!config.entity) {
      throw new Error('silk-trend-card: `entity` is required');
    }
    if (config.hours_to_show !== undefined && !(Number(config.hours_to_show) > 0)) {
      throw new Error('silk-trend-card: `hours_to_show` must be a positive number');
    }
    if (config.decimals !== undefined && !(Number(config.decimals) >= 0)) {
      throw new Error('silk-trend-card: `decimals` must be 0 or more');
    }
    this._config = config;
    this._vals = null;
    this._past = null;
    this._fetchStarted = false;
    this._lastUpdated = undefined;
  }

  public getCardSize(): number {
    return 2;
  }

  public getGridOptions(): Record<string, number> {
    return { columns: 3, rows: 2, min_columns: 3, min_rows: 2 };
  }

  public connectedCallback(): void {
    super.connectedCallback();
    this._intervalTimer = window.setInterval(() => this._refresh(), REFRESH_INTERVAL_MS);
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
    if (this._resize) return;
    const spark = this.renderRoot.querySelector('.spark');
    if (!spark) return;
    this._resize = new ResizeObserver((entries) => {
      const rect = entries[entries.length - 1].contentRect;
      const w = Math.round(rect.width);
      const h = Math.round(rect.height);
      if (!this._size || this._size.w !== w || this._size.h !== h) this._size = { w, h };
    });
    this._resize.observe(spark);
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

  private _hours(): number {
    return Math.max(Number(this._config?.hours_to_show ?? DEFAULT_HOURS), 0.25);
  }

  private async _refresh(): Promise<void> {
    if (!this.hass || !this._config) return;
    const entity = this._config.entity;
    const hours = this._hours();
    const seq = ++this._fetchSeq;
    const end = Date.now() / 1000;
    const start = end - hours * 3600;
    let data: Record<string, Point[]>;
    try {
      data = await fetchSeries(this.hass, [entity], start, end, hours);
    } catch (err) {
      console.warn('silk-trend-card: history fetch failed', err);
      return;
    }
    if (seq !== this._fetchSeq) return; // a newer fetch superseded this one
    this._lastFetch = Date.now();
    const vals = resampleHold(data[entity] ?? [], start, end, POINTS);
    const first = firstFiniteIndex(vals);
    this._vals = vals;
    this._past = first >= 0 ? vals[first] : null;
    this._rev++;
  }

  private _locale(): string {
    return this.hass?.locale?.language ?? this.hass?.language ?? 'en';
  }

  private _formatHero(value: number): string {
    const decimals = this._config?.decimals;
    if (decimals !== undefined && Number.isFinite(Number(decimals))) {
      const d = Math.min(Math.max(Math.round(Number(decimals)), 0), 5);
      return new Intl.NumberFormat(this._locale(), {
        minimumFractionDigits: d,
        maximumFractionDigits: d,
      }).format(value);
    }
    return formatNumber(this.hass, this._config!.entity, value);
  }

  /** `24h ago` / `3d ago` — the anchor the chip compares against. */
  private _agoLabel(): string {
    const hours = Math.round(this._hours());
    if (hours >= 48 && hours % 24 === 0) return `${hours / 24}d ago`;
    return `${Math.max(hours, 1)}h ago`;
  }

  private _onTap(): void {
    if (!this._config) return;
    haptic(this);
    moreInfo(this, this._config.entity);
  }

  /** The chip: direction glyph, the change, and what it is measured against. */
  private _renderTrend(current: number, unitText: string): TemplateResult {
    const ago = this._agoLabel();
    const past = this._past;
    let tone: Tone = 'flat';
    let glyph = GLYPH_FLAT;
    let text = '—';
    let title = `No history for the last ${ago.replace(' ago', '')}`;

    if (Number.isFinite(current) && past !== null) {
      const delta = current - past;
      // Percent needs a non-zero anchor; otherwise the honest answer is the
      // absolute change, in the entity's own unit.
      const pct = past !== 0 ? (delta / Math.abs(past)) * 100 : NaN;
      const magnitude = Number.isFinite(pct) ? Math.abs(pct) : Math.abs(delta);
      const digits = magnitude >= 10 ? 0 : 1;
      const shown = new Intl.NumberFormat(this._locale(), {
        minimumFractionDigits: digits,
        maximumFractionDigits: digits,
      }).format(magnitude);
      // A change that rounds away to zero is no change at all — say so plainly
      // rather than printing an arrow next to "0%".
      if (Number(magnitude.toFixed(digits)) === 0) {
        tone = 'flat';
        glyph = GLYPH_FLAT;
        text = `no change vs ${ago}`;
      } else {
        const rising = delta > 0;
        tone = rising === !this._config?.invert ? 'good' : 'bad';
        glyph = rising ? GLYPH_UP : GLYPH_DOWN;
        text = Number.isFinite(pct)
          ? `${shown}% vs ${ago}`
          : `${shown}${unitText} vs ${ago}`;
      }
      title = `${this._formatHero(past)}${unitText} → ${this._formatHero(current)}${unitText} · last ${ago.replace(' ago', '')}`;
    }

    return html`
      <div class="trend ${tone}" title=${title}>
        <svg class="glyph" viewBox="0 0 10 10" aria-hidden="true">
          <path d=${glyph}></path>
        </svg>
        <span class="delta">${text}</span>
      </div>
    `;
  }

  private _renderSpark(unitText: string): TemplateResult | typeof nothing {
    const size = this._size;
    const vals = this._vals;
    if (!size || !size.w || !vals) return nothing;
    const domain = niceDomain([vals]);
    const ys = toPxYs(vals, domain, size.h || SPARK_H, SPARK_PAD, 0);
    const line = buildLinePath(ys, size.w);
    if (!line) return nothing;
    const area = buildAreaPath(ys, size.w, size.h || SPARK_H);
    let lo = Infinity;
    let hi = -Infinity;
    for (let i = 0; i < vals.length; i++) {
      const v = vals[i];
      if (!Number.isFinite(v)) continue;
      if (v < lo) lo = v;
      if (v > hi) hi = v;
    }
    const entity = this._config!.entity;
    const range = Number.isFinite(lo)
      ? `min ${formatNumber(this.hass, entity, lo)}${unitText} · max ${formatNumber(this.hass, entity, hi)}${unitText}`
      : 'no data';
    return html`
      <svg width=${size.w} height=${size.h || SPARK_H} aria-hidden="true">
        <g class="marks">
          <path class="area" d=${area}></path>
          <path class="line" d=${line}></path>
          ${svg`<rect class="hit" x="0" y="0" width=${size.w} height=${size.h || SPARK_H}>
            <title>Last ${this._agoLabel().replace(' ago', '')} · ${range}</title>
          </rect>`}
        </g>
      </svg>
    `;
  }

  protected render(): TemplateResult | typeof nothing {
    const config = this._config;
    if (!config) return nothing;
    void this._rev; // reactive dependency for fetched sparkline data
    const hass = this.hass;
    const stateObj = hass?.states[config.entity];
    if (hass && !stateObj) {
      return html`<ha-card><div class="warning">Entity not found: ${config.entity}</div></ha-card>`;
    }

    const unavailable = isUnavailable(stateObj);
    const accent = accentFor(stateObj, config.color);
    const name = config.name ?? stateObj?.attributes.friendly_name ?? config.entity;
    const unit = config.unit ?? stateObj?.attributes.unit_of_measurement ?? '';
    const unitText = unit ? (unit.startsWith('°') ? unit : ` ${unit}`) : '';
    const numeric = Number(stateObj?.state);
    const hasValue =
      !unavailable && stateObj !== undefined && stateObj.state !== '' && Number.isFinite(numeric);

    return html`
      <ha-card
        class="control ${unavailable ? 'unavailable' : ''}"
        style="--silk-accent:${accent}"
        @click=${this._onTap}
      >
        <div class="spark">${this._renderSpark(unitText)}</div>
        <div class="body">
          <div class="label" title=${name}>${name}</div>
          <div class="hero">
            <span class="big">${hasValue ? this._formatHero(numeric) : '—'}</span>
            ${unit ? html`<span class="unit">${unit}</span>` : nothing}
          </div>
          ${hasValue ? this._renderTrend(numeric, unitText) : nothing}
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
        gap: 0;
        transition: transform 250ms var(--silk-spring);
      }
      ha-card:active {
        transform: scale(0.97);
        transition-duration: 120ms;
        transition-timing-function: var(--silk-ease-out);
      }
      /* Full-bleed background: the chart is evidence, the number is the point. */
      .spark {
        position: absolute;
        left: 0;
        right: 0;
        bottom: 0;
        height: ${SPARK_H}px;
        z-index: 0;
        opacity: ${SPARK_OPACITY};
        pointer-events: none;
      }
      .spark svg {
        display: block;
      }
      .spark .marks {
        animation: silk-trend-in 300ms var(--silk-ease-out);
      }
      .area {
        fill: var(--silk-accent);
        fill-opacity: 0.55;
      }
      .line {
        fill: none;
        stroke: var(--silk-accent);
        stroke-width: 2;
        stroke-linecap: round;
        stroke-linejoin: round;
      }
      .hit {
        fill: transparent;
        pointer-events: auto;
      }
      .body {
        position: relative;
        z-index: 1;
        min-width: 0;
      }
      .label {
        font-size: 12.5px;
        line-height: 1.3;
        color: var(--secondary-text-color);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .hero {
        display: flex;
        align-items: baseline;
        gap: 4px;
        min-width: 0;
        margin-top: 2px;
      }
      .big {
        font-size: 34px;
        font-weight: 700;
        line-height: 1.05;
        letter-spacing: -0.02em;
        color: var(--primary-text-color);
        font-variant-numeric: tabular-nums;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .hero .unit {
        font-size: 14px;
        white-space: nowrap;
      }
      .trend {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        max-width: 100%;
        margin-top: 5px;
        padding: 2px 7px;
        border-radius: 999px;
        font-size: 11.5px;
        font-weight: 600;
        line-height: 1.4;
        color: var(--secondary-text-color);
        background: rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.06);
        font-variant-numeric: tabular-nums;
        transition: color 200ms ease, background 200ms ease;
      }
      .trend .delta {
        min-width: 0;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .glyph {
        flex: none;
        width: 8px;
        height: 8px;
        fill: currentColor;
      }
      .trend.good {
        color: var(--success-color, #43a047);
        background: color-mix(in srgb, var(--success-color, #43a047) 14%, transparent);
      }
      .trend.bad {
        color: var(--warning-color, #ffa600);
        background: color-mix(in srgb, var(--warning-color, #ffa600) 16%, transparent);
      }
      .unavailable .spark,
      .unavailable .body {
        opacity: 0.45;
      }
      @keyframes silk-trend-in {
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
    'silk-trend-card': SilkTrendCard;
  }
}
