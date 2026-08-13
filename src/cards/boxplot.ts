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
import { HomeAssistant, LovelaceCardConfig } from '../types';
import { silkControlStyles } from '../shared/base';
import { isUnavailable, moreInfo, haptic, clamp } from '../shared/service';
import { accentFor } from '../shared/color';
import { registerEditor } from '../shared/editor';
import { formatNumber } from '../format';

export const META = {
  type: 'silk-box-card',
  name: 'Silk Spread',
  description: 'Median, spread, and the outliers.',
};

export interface SilkBoxCardConfig extends LovelaceCardConfig {
  entity: string;
  name?: string;
  icon?: string;
  /** Accent override. */
  color?: string;
  /** Day columns to show, ending today. Default 7, max 14. */
  days?: number;
}

/**
 * Row from `recorder/statistics_during_period` — Silk's minimal HomeAssistant
 * type doesn't model recorder responses, so it is typed locally.
 */
interface StatisticsRow {
  start: number | string;
  mean?: number | null;
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

/** One day's distribution, computed from that day's hourly means. */
interface DayBox {
  /** Local midnight (ms) the column covers. */
  ts: number;
  p5: number;
  p25: number;
  p50: number;
  p75: number;
  p95: number;
  /** Hours outside the whiskers, drawn as dots. */
  outliers: number[];
  /** Hourly samples the day contributed. */
  n: number;
}

const DEFAULT_DAYS = 7;
const MAX_DAYS = 14;
const MIN_DAYS = 2;
const GAP = 2;
/** Right band for the two value labels. */
const GUTTER_RIGHT = 34;
/** Bottom band for the weekday labels. */
const LABEL_BAND = 12;
/** Breathing room so the min/max labels never clip the plot edges. */
const PAD_Y = 8;
const BOX_MAX_W = 26;
const BOX_RADIUS = 2;
const MEDIAN_W = 2;
const BOX_STROKE = 1.5;
const OUTLIER_R = 1.5;
/** Hourly stats land just past the hour; refetch 90s after each boundary. */
const HOURLY_SLACK_MS = 90_000;

/** Local calendar-day key — DST-proof, unlike epoch-day arithmetic. */
function dayKey(d: Date): string {
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

/** Linear-interpolated quantile of an ascending-sorted array. */
function quantile(sorted: number[], q: number): number {
  if (!sorted.length) return NaN;
  const pos = (sorted.length - 1) * q;
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo);
}

const round1 = (n: number): number => Math.round(n * 10) / 10;

const EDITOR_TAG = 'silk-box-card-editor';

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
        { name: 'color', selector: { text: {} } },
      ],
    },
  ],
  { entity: 'Entity', name: 'Name', days: 'Days to show', color: 'Color' },
  { days: DEFAULT_DAYS }
);

@customElement('silk-box-card')
export class SilkBoxCard extends LitElement {
  @property({ attribute: false }) public hass?: HomeAssistant;

  @state() private _config?: SilkBoxCardConfig;
  /** One entry per day column, oldest → today; null where nothing was recorded. */
  @state() private _boxes: (DayBox | null)[] | null = null;
  /** Day starts for the columns, so empty days still get a label. */
  @state() private _dayStarts: number[] = [];
  /** Shared domain across every column — one axis, honestly comparable. */
  @state() private _domain: [number, number] | null = null;
  /** Friendly inline note when there is nothing to draw. */
  @state() private _note: string | null = null;
  /** Measured plot box; the columns are laid out in exact pixels from it. */
  @state() private _plot: { w: number; h: number } | null = null;

  private _fetchStarted = false;
  private _fetchSeq = 0;
  private _hourlyTimer?: number;
  private _resize?: ResizeObserver;
  private _connection?: HassWithConnection['connection'];
  private readonly _onWsReady = (): void => {
    this._refresh();
  };

  public static getStubConfig(hass: HomeAssistant): Partial<SilkBoxCardConfig> {
    const ids = Object.keys(hass.states).filter(
      (id) => id.startsWith('sensor.') && Number.isFinite(Number(hass.states[id].state))
    );
    const byClass = (cls: string) =>
      ids.find((id) => hass.states[id].attributes.device_class === cls);
    return {
      type: 'custom:silk-box-card',
      entity: byClass('temperature') ?? byClass('humidity') ?? byClass('power') ?? ids[0],
    };
  }

  public static async getConfigElement(): Promise<HTMLElement> {
    return document.createElement(EDITOR_TAG);
  }

  public setConfig(config: SilkBoxCardConfig): void {
    if (!config.entity) {
      throw new Error('silk-box-card: `entity` is required');
    }
    if (config.days !== undefined && !(Number(config.days) > 0)) {
      throw new Error('silk-box-card: `days` must be a positive number');
    }
    this._config = config;
    this._boxes = null;
    this._domain = null;
    this._note = null;
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
    const seq = ++this._fetchSeq;
    const now = new Date();
    // Columns end with today, so the window opens at local midnight days−1 ago.
    const dayStarts: number[] = [];
    for (let i = 0; i < days; i++) {
      dayStarts.push(
        new Date(now.getFullYear(), now.getMonth(), now.getDate() - (days - 1 - i)).getTime()
      );
    }

    let resp: Record<string, StatisticsRow[]>;
    try {
      resp = await hass.callWS<Record<string, StatisticsRow[]>>({
        type: 'recorder/statistics_during_period',
        start_time: new Date(dayStarts[0]).toISOString(),
        end_time: now.toISOString(),
        statistic_ids: [config.entity],
        period: 'hour',
        types: ['mean'],
      });
    } catch (err) {
      console.warn('silk-box-card: statistics fetch failed', err);
      if (seq === this._fetchSeq && !this._boxes) this._note = 'History unavailable';
      return;
    }
    if (seq !== this._fetchSeq) return; // a newer fetch superseded this one

    const rows = (resp?.[config.entity] ?? []).filter(
      (row) => typeof row.mean === 'number' && Number.isFinite(row.mean)
    );
    if (!rows.length) {
      this._note = 'No long-term statistics';
      this._boxes = null;
      this._dayStarts = dayStarts;
      return;
    }
    const colOf = new Map<string, number>(dayStarts.map((ms, i) => [dayKey(new Date(ms)), i]));
    const buckets: number[][] = Array.from({ length: days }, () => []);
    for (const row of rows) {
      const t = typeof row.start === 'number' ? row.start : Date.parse(row.start);
      if (!Number.isFinite(t)) continue;
      const col = colOf.get(dayKey(new Date(t)));
      if (col === undefined) continue;
      buckets[col].push(row.mean as number);
    }

    let lo = Infinity;
    let hi = -Infinity;
    const boxes = buckets.map((values, i): DayBox | null => {
      if (!values.length) return null;
      const sorted = [...values].sort((a, b) => a - b);
      const p5 = quantile(sorted, 0.05);
      const p95 = quantile(sorted, 0.95);
      lo = Math.min(lo, sorted[0]);
      hi = Math.max(hi, sorted[sorted.length - 1]);
      return {
        ts: dayStarts[i],
        p5,
        p25: quantile(sorted, 0.25),
        p50: quantile(sorted, 0.5),
        p75: quantile(sorted, 0.75),
        p95,
        outliers: sorted.filter((v) => v < p5 || v > p95),
        n: sorted.length,
      };
    });

    if (!Number.isFinite(lo)) {
      this._note = 'No long-term statistics';
      this._boxes = null;
      this._dayStarts = dayStarts;
      return;
    }
    if (hi === lo) hi = lo + 1; // a perfectly flat window still deserves a line
    this._note = null;
    this._dayStarts = dayStarts;
    this._boxes = boxes;
    this._domain = [lo, hi];
  }

  private _locale(): string {
    return this.hass?.locale?.language ?? this.hass?.language ?? 'en';
  }

  private _onCardClick(): void {
    if (!this._config) return;
    haptic(this);
    moreInfo(this, this._config.entity);
  }

  private _renderPlot(unit: string): TemplateResult | typeof nothing {
    if (this._note) return html`<div class="note">${this._note}</div>`;
    const size = this._plot;
    const boxes = this._boxes;
    const domain = this._domain;
    const config = this._config;
    if (!size || !boxes || !domain || !config) return nothing;
    const cols = boxes.length;
    const plotW = size.w - GUTTER_RIGHT;
    const plotH = size.h - LABEL_BAND;
    const pitch = (plotW + GAP) / cols; // column + gap; no gap trails the last one
    const colW = pitch - GAP;
    const usable = plotH - PAD_Y * 2;
    if (colW <= 3 || usable <= 12) return nothing;
    const boxW = Math.min(colW, BOX_MAX_W);
    const capW = boxW * 0.5;
    const [lo, hi] = domain;
    const y = (v: number): number => PAD_Y + (1 - (v - lo) / (hi - lo)) * usable;
    const unitText = unit ? (unit.startsWith('°') ? unit : ` ${unit}`) : '';
    const fmt = (v: number): string => formatNumber(this.hass, config.entity, v);
    const locale = this._locale();
    const dayFmt = new Intl.DateTimeFormat(locale, { weekday: colW < 26 ? 'narrow' : 'short' });
    const titleFmt = new Intl.DateTimeFormat(locale, {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    });

    const marks: SVGTemplateResult[] = [];
    const labels: SVGTemplateResult[] = [];
    const hits: SVGTemplateResult[] = [];
    for (let c = 0; c < cols; c++) {
      const cx = round1(c * pitch + colW / 2);
      const box = boxes[c];
      const day = new Date(this._dayStarts[c] ?? 0);
      if (box) {
        const yTop = y(box.p75);
        const yBottom = y(box.p25);
        // Whisker stem first, so the box fill sits over it.
        marks.push(
          svg`<line class="whisker" x1=${cx} y1=${round1(y(box.p95))} x2=${cx} y2=${round1(y(box.p5))}></line>`,
          svg`<line class="whisker" x1=${round1(cx - capW / 2)} y1=${round1(y(box.p95))} x2=${round1(cx + capW / 2)} y2=${round1(y(box.p95))}></line>`,
          svg`<line class="whisker" x1=${round1(cx - capW / 2)} y1=${round1(y(box.p5))} x2=${round1(cx + capW / 2)} y2=${round1(y(box.p5))}></line>`,
          svg`<rect class="box" x=${round1(cx - boxW / 2)} y=${round1(yTop)} width=${round1(boxW)} height=${round1(Math.max(1, yBottom - yTop))} rx=${BOX_RADIUS}></rect>`,
          svg`<line class="median" x1=${round1(cx - boxW / 2)} y1=${round1(y(box.p50))} x2=${round1(cx + boxW / 2)} y2=${round1(y(box.p50))}></line>`
        );
        for (const v of box.outliers) {
          marks.push(svg`<circle class="outlier" cx=${cx} cy=${round1(y(v))} r=${OUTLIER_R}></circle>`);
        }
      }
      labels.push(
        svg`<text class="axis" x=${cx} y=${size.h - 2} text-anchor="middle">${dayFmt.format(day)}</text>`
      );
      const title = box
        ? `${titleFmt.format(day)} · median ${fmt(box.p50)}${unitText} · ${fmt(box.p25)}–${fmt(box.p75)}`
        : `${titleFmt.format(day)} · —`;
      hits.push(
        svg`<rect class="hit" x=${round1(c * pitch)} y="0" width=${round1(colW)} height=${plotH}>
          <title>${title}</title>
        </rect>`
      );
    }
    // Recessive right-hand axis: the two numbers that bound everything else.
    labels.push(
      svg`<text class="axis" x=${size.w} y=${round1(y(hi))} text-anchor="end" dominant-baseline="central">${fmt(hi)}</text>`,
      svg`<text class="axis" x=${size.w} y=${round1(y(lo))} text-anchor="end" dominant-baseline="central">${fmt(lo)}</text>`
    );

    return html`
      <svg width=${size.w} height=${size.h}>
        <g class="chart">${marks}${labels}</g>
        ${hits}
      </svg>
    `;
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
    const numeric = Number(stateObj?.state);
    const hasValue =
      !unavailable && stateObj !== undefined && stateObj.state !== '' && Number.isFinite(numeric);

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
          </div>
          <div class="trailing">
            <span class="value">${hasValue ? formatNumber(hass, config.entity, numeric) : '—'}</span>
            ${hasValue && unit ? html`<span class="unit">${unit}</span>` : nothing}
          </div>
        </div>
        <div class="plot">${this._renderPlot(unit)}</div>
      </ha-card>
    `;
  }

  static styles = [
    silkControlStyles,
    css`
      ha-card {
        flex-direction: column;
        align-items: stretch;
        gap: 10px;
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
      .trailing {
        align-items: baseline;
        gap: 3px;
      }
      .plot {
        position: relative;
        flex: 1;
        min-height: 72px;
      }
      .plot svg {
        position: absolute;
        inset: 0;
        display: block;
      }
      .chart {
        animation: silk-box-in 250ms var(--silk-ease-out);
      }
      .box {
        fill: color-mix(in srgb, var(--silk-accent) 30%, transparent);
        stroke: var(--silk-accent);
        stroke-width: ${BOX_STROKE};
      }
      .median {
        stroke: var(--silk-accent);
        stroke-width: ${MEDIAN_W};
        stroke-linecap: round;
      }
      .whisker {
        stroke: var(--silk-accent);
        stroke-width: 1;
        opacity: 0.55;
      }
      .outlier {
        fill: var(--silk-accent);
        opacity: 0.6;
      }
      .hit {
        fill: transparent;
      }
      .axis {
        font-size: 9px;
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
      @keyframes silk-box-in {
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
    'silk-box-card': SilkBoxCard;
  }
}
