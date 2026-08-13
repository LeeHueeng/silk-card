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
import { resampleHold } from '../graph';
import { formatNumber } from '../format';

export const META = {
  type: 'silk-histogram-card',
  name: 'Silk Histogram',
  description: 'Where a sensor actually spends its time.',
};

export interface SilkHistogramCardConfig extends LovelaceCardConfig {
  entity: string;
  name?: string;
  icon?: string;
  /** Accent override. */
  color?: string;
  /** Days of history to bucket. Default 7. */
  days?: number;
  /** Bar count across the p1–p99 range. Default 12. */
  bins?: number;
}

/**
 * `hass.connection` is absent from Silk's minimal HomeAssistant type. The WS
 * connection emits `ready` after every reconnect — our refetch trigger.
 */
interface HassWithConnection extends HomeAssistant {
  connection?: {
    addEventListener(type: string, listener: () => void): void;
    removeEventListener(type: string, listener: () => void): void;
  };
}

interface Distribution {
  /** Bucket edges: bins + 1 values from p1 to p99. */
  edges: number[];
  /** Samples per bucket. */
  counts: number[];
  /** Samples inside the p1–p99 range — the denominator for the percentages. */
  total: number;
  median: number;
}

const DEFAULT_DAYS = 7;
const MIN_DAYS = 1;
const MAX_DAYS = 31;
const DEFAULT_BINS = 12;
const MIN_BINS = 4;
const MAX_BINS = 24;
const GAP = 2;
const BAR_RADIUS = 3;
/** A non-empty bucket always earns a visible mark. */
const MIN_BAR = 2;
/** Top band for the "now" label. */
const TOP_BAND = 12;
/** Bottom band for the range labels and the median tick. */
const BOTTOM_BAND = 12;
const MEDIAN_TICK = 5;
/** One sample per hour, so bar height reads as share of time. */
const SAMPLES_PER_DAY = 24;
/** Hourly stats land just past the hour; refetch 90s after each boundary. */
const HOURLY_SLACK_MS = 90_000;

const r1 = (n: number): number => Math.round(n * 10) / 10;

/** Linear-interpolated quantile of an ascending-sorted array. */
function quantile(sorted: number[], q: number): number {
  if (!sorted.length) return NaN;
  const pos = (sorted.length - 1) * q;
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo);
}

const EDITOR_TAG = 'silk-histogram-card-editor';

registerEditor(
  EDITOR_TAG,
  [
    {
      name: 'entity',
      required: true,
      selector: { entity: { domain: ['sensor', 'number', 'input_number'] } },
    },
    { name: 'name', selector: { text: {} } },
    {
      name: '',
      type: 'grid',
      schema: [
        { name: 'days', selector: { number: { min: MIN_DAYS, max: MAX_DAYS, mode: 'box' } } },
        { name: 'bins', selector: { number: { min: MIN_BINS, max: MAX_BINS, mode: 'box' } } },
      ],
    },
    { name: 'icon', selector: { icon: {} } },
  ],
  { entity: 'Entity', name: 'Name', days: 'Days to bucket', bins: 'Bars', icon: 'Icon' },
  { days: DEFAULT_DAYS, bins: DEFAULT_BINS }
);

@customElement('silk-histogram-card')
export class SilkHistogramCard extends LitElement {
  @property({ attribute: false }) public hass?: HomeAssistant;

  @state() private _config?: SilkHistogramCardConfig;
  @state() private _dist: Distribution | null = null;
  /** True when the window came back without a single numeric sample. */
  @state() private _noData = false;
  /** Measured plot box; bars are laid out in exact pixels from it. */
  @state() private _plot: { w: number; h: number } | null = null;

  private _fetchStarted = false;
  private _fetchSeq = 0;
  private _hourlyTimer?: number;
  private _resize?: ResizeObserver;
  private _connection?: HassWithConnection['connection'];
  private readonly _onWsReady = (): void => {
    this._refresh();
  };

  public static getStubConfig(hass: HomeAssistant): Partial<SilkHistogramCardConfig> {
    const ids = Object.keys(hass.states).filter(
      (id) => id.startsWith('sensor.') && Number.isFinite(Number(hass.states[id].state))
    );
    const byClass = (cls: string) =>
      ids.find((id) => hass.states[id].attributes.device_class === cls);
    return {
      type: 'custom:silk-histogram-card',
      entity: byClass('temperature') ?? byClass('humidity') ?? ids[0],
    };
  }

  public static async getConfigElement(): Promise<HTMLElement> {
    return document.createElement(EDITOR_TAG);
  }

  public setConfig(config: SilkHistogramCardConfig): void {
    if (!config.entity) {
      throw new Error('silk-histogram-card: `entity` is required');
    }
    if (config.days !== undefined && !(Number(config.days) > 0)) {
      throw new Error('silk-histogram-card: `days` must be a positive number');
    }
    if (config.bins !== undefined && !(Number(config.bins) >= MIN_BINS)) {
      throw new Error(`silk-histogram-card: \`bins\` must be at least ${MIN_BINS}`);
    }
    this._config = config;
    this._dist = null;
    this._noData = false;
    this._fetchStarted = false;
  }

  public getCardSize(): number {
    return 3;
  }

  public getGridOptions(): Record<string, number> {
    return { columns: 6, rows: 3, min_columns: 4, min_rows: 2 };
  }

  public connectedCallback(): void {
    super.connectedCallback();
    this._scheduleHourly();
    // On a DOM re-attach firstUpdated won't run again: re-observe and refetch.
    if (this.hasUpdated) {
      this._observePlot();
      if (this._fetchStarted) this._refresh();
    }
  }

  public disconnectedCallback(): void {
    super.disconnectedCallback();
    window.clearTimeout(this._hourlyTimer);
    this._resize?.disconnect();
    this._connection?.removeEventListener?.('ready', this._onWsReady);
    this._connection = undefined;
  }

  protected willUpdate(_changed: PropertyValues): void {
    if (!this.hass || !this._config) return;
    if (!this._connection) {
      const conn = (this.hass as HassWithConnection).connection;
      if (typeof conn?.addEventListener === 'function') {
        conn.addEventListener('ready', this._onWsReady);
        this._connection = conn;
      }
    }
    if (!this._fetchStarted) {
      this._fetchStarted = true;
      this._refresh();
    }
  }

  /**
   * Runs after every render, not just the first: if the first paint was the
   * "entity not found" warning, `.plot` only exists once the entity registers.
   * Re-observing an already-observed element is a no-op.
   */
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

  private _days(): number {
    return clamp(Math.round(this._config?.days ?? DEFAULT_DAYS), MIN_DAYS, MAX_DAYS);
  }

  private _bins(): number {
    return clamp(Math.round(this._config?.bins ?? DEFAULT_BINS), MIN_BINS, MAX_BINS);
  }

  /** Refetch shortly after each hour boundary — new stat rows land on the hour. */
  private _scheduleHourly(): void {
    window.clearTimeout(this._hourlyTimer);
    const now = Date.now();
    const next = (Math.floor(now / 3_600_000) + 1) * 3_600_000 + HOURLY_SLACK_MS;
    this._hourlyTimer = window.setTimeout(() => {
      this._refresh();
      this._scheduleHourly();
    }, next - now);
  }

  private async _refresh(): Promise<void> {
    const hass = this.hass;
    const config = this._config;
    if (!hass || !config) return;
    const days = this._days();
    const hours = days * 24;
    const seq = ++this._fetchSeq;
    const end = Date.now() / 1000;
    const start = end - hours * 3600;
    let data: Record<string, Point[]>;
    try {
      // fetchSeries reads hourly long-term statistics for windows past 48h and
      // falls back to raw history when an entity has none.
      data = await fetchSeries(hass, [config.entity], start, end, hours);
    } catch (err) {
      console.warn('silk-histogram-card: history fetch failed', err);
      return;
    }
    if (seq !== this._fetchSeq) return; // a newer fetch superseded this one
    // Evenly spaced samples with previous-value hold: every sample stands for
    // the same slice of time, which is what makes a bar a share of the window.
    const samples = resampleHold(data[config.entity] ?? [], start, end, days * SAMPLES_PER_DAY);
    const values: number[] = [];
    for (let i = 0; i < samples.length; i++) {
      if (Number.isFinite(samples[i])) values.push(samples[i]);
    }
    if (values.length < 2) {
      this._noData = true;
      this._dist = null;
      return;
    }
    values.sort((a, b) => a - b);
    // p1–p99 keeps one spike from squashing the whole distribution; the two
    // tails are dropped, and the axis labels state the range they cover.
    let lo = quantile(values, 0.01);
    let hi = quantile(values, 0.99);
    if (!(hi > lo)) {
      const pad = Math.max(Math.abs(hi) * 0.05, 0.5);
      lo -= pad;
      hi += pad;
    }
    const bins = this._bins();
    const width = (hi - lo) / bins;
    const counts = new Array<number>(bins).fill(0);
    let total = 0;
    for (const v of values) {
      if (v < lo || v > hi) continue;
      const idx = clamp(Math.floor((v - lo) / width), 0, bins - 1);
      counts[idx]++;
      total++;
    }
    this._noData = false;
    this._dist = {
      edges: Array.from({ length: bins + 1 }, (_, i) => lo + width * i),
      counts,
      total,
      median: quantile(values, 0.5),
    };
  }

  private _onCardClick(): void {
    if (!this._config) return;
    haptic(this);
    moreInfo(this, this._config.entity);
  }

  private _renderPlot(unit: string): TemplateResult | typeof nothing {
    if (this._noData) {
      return html`<div class="note">No history for this window</div>`;
    }
    const size = this._plot;
    const dist = this._dist;
    const config = this._config;
    if (!size || !dist || !config) return nothing;
    const bins = dist.counts.length;
    const plotH = size.h - TOP_BAND - BOTTOM_BAND;
    const pitch = (size.w + GAP) / bins; // bar + gap; no gap trails the last bar
    const barW = pitch - GAP;
    if (barW <= 0.5 || plotH <= 8) return nothing;
    const baseline = TOP_BAND + plotH;
    const maxCount = Math.max(...dist.counts);
    const lo = dist.edges[0];
    const hi = dist.edges[bins];
    const span = hi - lo || 1;
    // Map a value onto the *bar* geometry, not the raw width, so the markers
    // land exactly where their bucket is drawn (gaps included).
    const xOf = (v: number): number => {
      const f = clamp((v - lo) / span, 0, 1) * bins;
      const i = Math.min(Math.floor(f), bins - 1);
      return i * pitch + (f - i) * barW;
    };

    const stateObj = this.hass?.states[config.entity];
    const current = Number(stateObj?.state);
    const hasCurrent = !isUnavailable(stateObj) && Number.isFinite(current);
    const currentBin = hasCurrent
      ? clamp(Math.floor(((current - lo) / span) * bins), 0, bins - 1)
      : -1;
    const fmt = (v: number): string => formatNumber(this.hass, config.entity, v);

    const marks: SVGTemplateResult[] = [];
    const overlay: SVGTemplateResult[] = [];
    for (let i = 0; i < bins; i++) {
      const count = dist.counts[i];
      const x = i * pitch;
      if (count > 0 && maxCount > 0) {
        const h = Math.max(MIN_BAR, (count / maxCount) * plotH);
        const top = baseline - h;
        const r = Math.min(BAR_RADIUS, barW / 2, h);
        const d =
          `M${r1(x)},${r1(baseline)} V${r1(top + r)} Q${r1(x)},${r1(top)} ${r1(x + r)},${r1(top)} ` +
          `H${r1(x + barW - r)} Q${r1(x + barW)},${r1(top)} ${r1(x + barW)},${r1(top + r)} V${r1(baseline)} Z`;
        marks.push(
          svg`<path class="bar ${i === currentBin && hasCurrent ? 'live' : ''}" d=${d}></path>`
        );
      }
      const pct = dist.total ? (count / dist.total) * 100 : 0;
      const pctText = pct > 0 && pct < 1 ? '<1%' : `${Math.round(pct)}%`;
      // Full-column hover target — bigger than the mark, per interaction rules.
      overlay.push(
        svg`<rect class="hit" x=${r1(x)} y=${TOP_BAND} width=${r1(barW)} height=${plotH}>
          <title>${fmt(dist.edges[i])} – ${fmt(dist.edges[i + 1])}${unit} · ${pctText} of the time</title>
        </rect>`
      );
    }

    // The median: a thin, recessive tick under the baseline, never a bar.
    const medianX = clamp(xOf(dist.median), 0, size.w);
    if (dist.median >= lo && dist.median <= hi) {
      overlay.push(
        svg`<line class="median" x1=${r1(medianX)} y1=${r1(baseline)} x2=${r1(medianX)} y2=${r1(baseline + MEDIAN_TICK)}>
          <title>Median ${fmt(dist.median)}${unit}</title>
        </line>`
      );
    }

    // "Now": only drawn when the live value sits inside the plotted range, so
    // the marker never lies about where it is.
    let nowMark: SVGTemplateResult | typeof nothing = nothing;
    if (hasCurrent && current >= lo && current <= hi) {
      const nx = xOf(current);
      const anchor = nx < 24 ? 'start' : nx > size.w - 24 ? 'end' : 'middle';
      nowMark = svg`<g class="now">
        <line x1=${r1(nx)} y1=${TOP_BAND} x2=${r1(nx)} y2=${r1(baseline)}></line>
        <text x=${r1(clamp(nx, 0, size.w))} y=${TOP_BAND - 3} text-anchor=${anchor}>${fmt(current)}</text>
        <title>Now ${fmt(current)}${unit}</title>
      </g>`;
    }

    return html`
      <svg width=${size.w} height=${size.h} aria-hidden="true">
        <g class="chart">
          ${marks}${overlay}${nowMark}
          <text class="axis" x="0" y=${size.h - 1} text-anchor="start">${fmt(lo)}</text>
          <text class="axis" x=${size.w} y=${size.h - 1} text-anchor="end">${fmt(hi)}</text>
        </g>
      </svg>
    `;
  }

  /** `7d · median 21.2 °C` — the window and its middle. */
  private _summary(unit: string): string {
    const days = this._days();
    const label = `${days}d`;
    const dist = this._dist;
    if (!dist || !this._config) return label;
    return `${label} · median ${formatNumber(this.hass, this._config.entity, dist.median)}${unit}`;
  }

  protected render(): TemplateResult | typeof nothing {
    const config = this._config;
    if (!config) return nothing;
    const hass = this.hass;
    const stateObj = hass?.states[config.entity];
    if (hass && !stateObj) {
      return html`<ha-card><div class="warning">Entity not found: ${config.entity}</div></ha-card>`;
    }

    const unavailable = isUnavailable(stateObj);
    const accent = accentFor(stateObj, config.color);
    const name = config.name ?? stateObj?.attributes.friendly_name ?? config.entity;
    const unit = (stateObj?.attributes.unit_of_measurement as string | undefined) ?? '';
    const current = Number(stateObj?.state);
    const hasCurrent = !unavailable && Number.isFinite(current);

    return html`
      <ha-card
        class="control ${unavailable ? 'unavailable' : ''}"
        style="--silk-accent:${accent}"
        @click=${this._onCardClick}
      >
        <div class="top">
          <div class="icon">
            ${config.icon
              ? html`<ha-icon .icon=${config.icon}></ha-icon>`
              : html`<ha-state-icon .hass=${hass} .stateObj=${stateObj}></ha-state-icon>`}
          </div>
          <div class="info">
            <div class="name">${name}</div>
            <div class="state">${this._summary(unit ? ` ${unit}` : '')}</div>
          </div>
          <div class="trailing">
            <span class="value"
              >${hasCurrent ? formatNumber(hass, config.entity, current) : '—'}</span
            >
            ${hasCurrent && unit ? html`<span class="unit">${unit}</span>` : nothing}
          </div>
        </div>
        <div class="plot">${this._renderPlot(unit ? ` ${unit}` : '')}</div>
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
      .plot {
        position: relative;
        flex: 1;
        min-height: 56px;
      }
      .plot svg {
        position: absolute;
        inset: 0;
        display: block;
      }
      /* One accent: the bucket holding the live value is the only one at full. */
      .bar {
        fill: var(--silk-accent);
        fill-opacity: 0.45;
      }
      .bar.live {
        fill-opacity: 1;
      }
      .now line {
        stroke: var(--silk-accent);
        stroke-width: 2;
        stroke-linecap: round;
      }
      .now text {
        font-size: 10px;
        font-weight: 600;
        fill: var(--silk-accent);
        font-variant-numeric: tabular-nums;
      }
      .median {
        stroke: var(--primary-text-color);
        stroke-width: 1;
        opacity: 0.45;
      }
      .hit {
        fill: transparent;
      }
      .chart {
        animation: silk-histogram-in 250ms var(--silk-ease-out);
      }
      .axis {
        font-size: 10px;
        fill: var(--primary-text-color);
        opacity: 0.45;
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
      .unavailable .plot {
        opacity: 0.45;
      }
      @keyframes silk-histogram-in {
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
    'silk-histogram-card': SilkHistogramCard;
  }
}
