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
import { isUnavailable, moreInfo, clamp } from '../shared/service';
import { accentFor } from '../shared/color';
import { registerEditor } from '../shared/editor';
import { formatNumber } from '../format';

export const META = {
  type: 'silk-heatmap-card',
  name: 'Silk Heatmap',
  description: 'Seven days of rhythm in one glance.',
};

export interface SilkHeatmapCardConfig extends LovelaceCardConfig {
  entity: string;
  name?: string;
  icon?: string;
  /** Accent override; the whole ramp is this one hue at varying opacity. */
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
 * A raw history row from `history/history_during_period` with minimal_response:
 * the first row per entity is a full state object, the rest are `{s, lu}`.
 */
interface HistoryRow {
  s?: string;
  state?: string;
  lu?: number | string;
  last_updated?: number | string;
  lc?: number;
  last_changed?: string;
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

interface HeatmapData {
  /** Local midnight (ms) of each day column, oldest → today. */
  days: number[];
  /** grid[dayIndex][hour] — the hour's mean, or null when nothing was recorded. */
  grid: (number | null)[][];
  /** p5/p95 of the window's values — the endpoints of the opacity ramp. */
  lo: number;
  hi: number;
}

const DEFAULT_DAYS = 7;
const MAX_DAYS = 14;
const HOURS = 24;
const GAP = 2;
const CELL_RADIUS = 2;
/** Left band for the 0/6/12/18 hour labels. */
const GUTTER_LEFT = 18;
/** Bottom band for the weekday labels. */
const LABEL_BAND = 12;
/**
 * Sequential single-hue ramp (correct for magnitude data): one accent, opacity
 * 0.06 → 0.95 across the window's p5..p95. Percentile endpoints keep one hot
 * hour from flattening a week of normal rhythm.
 */
const OPACITY_MIN = 0.06;
const OPACITY_MAX = 0.95;
const OPACITY_MISSING = 0.03;
/** Hourly stats land just past the hour; refetch 90s after each boundary. */
const HOURLY_SLACK_MS = 90_000;

const GAP_STATES = new Set(['unavailable', 'unknown', 'none', '']);

/** Local calendar-day key — DST-proof, unlike epoch-day arithmetic. */
function dayKey(d: Date): string {
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

/** Linear-interpolated quantile of an ascending-sorted array. */
function quantile(sorted: number[], q: number): number {
  if (!sorted.length) return 0;
  const pos = (sorted.length - 1) * q;
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo);
}

function emptyGrid(days: number): (number | null)[][] {
  return Array.from({ length: days }, () => new Array<number | null>(HOURS).fill(null));
}

const EDITOR_TAG = 'silk-heatmap-card-editor';

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
        { name: 'days', selector: { number: { min: 1, max: MAX_DAYS, step: 1, mode: 'box' } } },
        { name: 'icon', selector: { icon: {} } },
        { name: 'color', selector: { ui_color: {} } },
      ],
    },
  ],
  { entity: '엔티티', name: '이름', days: '표시 일수', icon: '아이콘', color: '강조 색상' },
  { days: DEFAULT_DAYS }
);

@customElement('silk-heatmap-card')
export class SilkHeatmapCard extends LitElement {
  @property({ attribute: false }) public hass?: HomeAssistant;

  @state() private _config?: SilkHeatmapCardConfig;
  @state() private _data: HeatmapData | null = null;
  /** Measured plot box; the grid is laid out in exact pixels from it. */
  @state() private _plot: { w: number; h: number } | null = null;

  private _fetchStarted = false;
  private _fetchSeq = 0;
  private _hourlyTimer?: number;
  private _resize?: ResizeObserver;
  private _connection?: HassWithConnection['connection'];
  private readonly _onWsReady = (): void => {
    this._refresh();
  };

  public static getStubConfig(hass: HomeAssistant): Partial<SilkHeatmapCardConfig> {
    const numeric = Object.keys(hass.states).filter(
      (id) => id.startsWith('sensor.') && Number.isFinite(Number(hass.states[id].state))
    );
    const byClass = (cls: string) =>
      numeric.find((id) => hass.states[id].attributes.device_class === cls);
    return {
      type: 'custom:silk-heatmap-card',
      entity: byClass('temperature') ?? byClass('humidity') ?? byClass('power') ?? numeric[0],
    };
  }

  public static async getConfigElement(): Promise<HTMLElement> {
    return document.createElement(EDITOR_TAG);
  }

  public setConfig(config: SilkHeatmapCardConfig): void {
    if (!config.entity) {
      throw new Error('silk-heatmap-card: `entity` is required');
    }
    if (config.days !== undefined && !(Number(config.days) > 0)) {
      throw new Error('silk-heatmap-card: `days` must be a positive number');
    }
    this._config = config;
    this._data = null;
    this._fetchStarted = false;
  }

  public getCardSize(): number {
    return 3;
  }

  public getGridOptions(): Record<string, number> {
    return { columns: 6, rows: 3, min_columns: 4, min_rows: 3 };
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
    return clamp(Math.round(this._config?.days ?? DEFAULT_DAYS), 1, MAX_DAYS);
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
    const endMs = now.getTime();
    let grid: (number | null)[][] | null;
    try {
      grid = await this._fetchStatistics(hass, config.entity, dayStarts, endMs);
      if (!grid) {
        // No long-term statistics for this entity — bucket raw history instead.
        grid = await this._fetchHistoryMeans(hass, config.entity, dayStarts, endMs);
      }
    } catch (err) {
      console.warn('silk-heatmap-card: data fetch failed', err);
      return;
    }
    if (seq !== this._fetchSeq) return; // a newer fetch superseded this one
    const values = grid
      .flat()
      .filter((v): v is number => v !== null)
      .sort((a, b) => a - b);
    this._data = {
      days: dayStarts,
      grid,
      lo: quantile(values, 0.05),
      hi: quantile(values, 0.95),
    };
  }

  /** Hourly means from long-term statistics; null when the recorder has none. */
  private async _fetchStatistics(
    hass: HomeAssistant,
    entity: string,
    dayStarts: number[],
    endMs: number
  ): Promise<(number | null)[][] | null> {
    const resp = await hass.callWS<Record<string, StatisticsRow[]>>({
      type: 'recorder/statistics_during_period',
      start_time: new Date(dayStarts[0]).toISOString(),
      end_time: new Date(endMs).toISOString(),
      statistic_ids: [entity],
      period: 'hour',
      types: ['mean'],
    });
    const rows = (resp?.[entity] ?? []).filter(
      (row) => typeof row.mean === 'number' && Number.isFinite(row.mean)
    );
    if (!rows.length) return null;
    const colOf = new Map<string, number>(dayStarts.map((ms, i) => [dayKey(new Date(ms)), i]));
    // Sum/count per cell: the DST fall-back day hands one local hour two rows.
    const sums = emptyGrid(dayStarts.length);
    const counts = emptyGrid(dayStarts.length);
    for (const row of rows) {
      const t = typeof row.start === 'number' ? row.start : Date.parse(row.start);
      if (!Number.isFinite(t)) continue;
      const d = new Date(t);
      const col = colOf.get(dayKey(d));
      if (col === undefined) continue;
      const h = d.getHours();
      sums[col][h] = (sums[col][h] ?? 0) + (row.mean as number);
      counts[col][h] = (counts[col][h] ?? 0) + 1;
    }
    const grid = emptyGrid(dayStarts.length);
    for (let c = 0; c < dayStarts.length; c++) {
      for (let h = 0; h < HOURS; h++) {
        const n = counts[c][h];
        if (n) grid[c][h] = (sums[c][h] as number) / n;
      }
    }
    return grid;
  }

  /**
   * Fallback path: raw history (as in status.ts), reduced to per-hour means.
   * Values hold until the next sample, so each hour gets a time-weighted mean
   * rather than a mean of whatever samples happened to land inside it.
   */
  private async _fetchHistoryMeans(
    hass: HomeAssistant,
    entity: string,
    dayStarts: number[],
    endMs: number
  ): Promise<(number | null)[][]> {
    const resp = await hass.callWS<Record<string, HistoryRow[]>>({
      type: 'history/history_during_period',
      start_time: new Date(dayStarts[0]).toISOString(),
      end_time: new Date(endMs).toISOString(),
      entity_ids: [entity],
      minimal_response: true,
      no_attributes: true,
      significant_changes_only: false,
    });
    const endSec = endMs / 1000;
    const samples: Point[] = (resp?.[entity] ?? [])
      .map((row): Point => {
        const raw = row.lu ?? row.last_updated ?? row.lc ?? row.last_changed ?? NaN;
        const t = typeof raw === 'number' ? raw : Date.parse(raw) / 1000;
        const s = String(row.s ?? row.state ?? '').toLowerCase();
        const v = GAP_STATES.has(s) ? NaN : Number(row.s ?? row.state);
        return { t, v: Number.isFinite(v) ? v : NaN };
      })
      .filter((p) => Number.isFinite(p.t) && p.t <= endSec)
      .sort((a, b) => a.t - b.t);

    const grid = emptyGrid(dayStarts.length);
    let i = 0; // buckets advance in time, so the sample cursor never rewinds
    for (let c = 0; c < dayStarts.length; c++) {
      const day = new Date(dayStarts[c]);
      for (let h = 0; h < HOURS; h++) {
        // Date-constructed bounds keep buckets on local hour lines across DST.
        const b0 = new Date(day.getFullYear(), day.getMonth(), day.getDate(), h).getTime() / 1000;
        const b1 = Math.min(
          new Date(day.getFullYear(), day.getMonth(), day.getDate(), h + 1).getTime() / 1000,
          endSec
        );
        if (b1 <= b0) continue;
        while (i + 1 < samples.length && samples[i + 1].t <= b0) i++;
        let sum = 0;
        let weight = 0;
        for (let j = i; j < samples.length && samples[j].t < b1; j++) {
          const a = Math.max(samples[j].t, b0);
          const b = Math.min(j + 1 < samples.length ? samples[j + 1].t : endSec, b1);
          if (b > a && Number.isFinite(samples[j].v)) {
            sum += samples[j].v * (b - a);
            weight += b - a;
          }
        }
        if (weight > 0) grid[c][h] = sum / weight;
      }
    }
    return grid;
  }

  private _opacity(v: number, lo: number, hi: number): number {
    if (hi <= lo) return (OPACITY_MIN + OPACITY_MAX) / 2;
    const f = clamp((v - lo) / (hi - lo), 0, 1);
    return Math.round((OPACITY_MIN + f * (OPACITY_MAX - OPACITY_MIN)) * 1000) / 1000;
  }

  private _locale(): string {
    return this.hass?.locale?.language ?? this.hass?.language ?? 'en';
  }

  private _onCardClick(): void {
    if (this._config) moreInfo(this, this._config.entity);
  }

  private _renderGrid(unit: string): TemplateResult | typeof nothing {
    const size = this._plot;
    const data = this._data;
    const config = this._config;
    if (!size || !data || !config) return nothing;
    const cols = data.days.length;
    const gridW = size.w - GUTTER_LEFT;
    const gridH = size.h - LABEL_BAND;
    const pitchX = (gridW + GAP) / cols; // cell + gap; no gap trails the last cell
    const cellW = pitchX - GAP;
    // 24 rows get tight fast: drop to a 1px seam before starving the cells.
    const gapY = gridH / HOURS >= 6 ? GAP : 1;
    const pitchY = (gridH + gapY) / HOURS;
    const cellH = pitchY - gapY;
    if (cellW <= 1 || cellH <= 0.5) return nothing;
    const rx = Math.min(CELL_RADIUS, cellW / 2, cellH / 2);
    const nowMs = Date.now();
    const locale = this._locale();
    const dayFmt = new Intl.DateTimeFormat(locale, { weekday: cellW < 24 ? 'narrow' : 'short' });
    const titleFmt = new Intl.DateTimeFormat(locale, { weekday: 'short' });

    const cells: SVGTemplateResult[] = [];
    for (let c = 0; c < cols; c++) {
      const day = new Date(data.days[c]);
      const x = Math.round(GUTTER_LEFT + c * pitchX);
      for (let h = 0; h < HOURS; h++) {
        // Today's not-yet-elapsed hours don't exist; drawing them would read
        // as "missing data", which they are not.
        if (new Date(day.getFullYear(), day.getMonth(), day.getDate(), h).getTime() > nowMs) break;
        const v = data.grid[c][h];
        const opacity = v === null ? OPACITY_MISSING : this._opacity(v, data.lo, data.hi);
        const valueText = v === null ? '—' : `${formatNumber(this.hass, config.entity, v)}${unit}`;
        cells.push(
          svg`<rect class="cell" x=${x} y=${(h * pitchY).toFixed(1)} width=${cellW.toFixed(1)} height=${cellH.toFixed(1)} rx=${rx.toFixed(1)} fill-opacity=${opacity}>
            <title>${titleFmt.format(day)} ${h}:00 · ${valueText}</title>
          </rect>`
        );
      }
    }
    const hourLabels = [0, 6, 12, 18].map(
      (h) =>
        svg`<text class="axis" x=${GUTTER_LEFT - 6} y=${(h * pitchY + cellH / 2).toFixed(1)} text-anchor="end" dominant-baseline="central">${h}</text>`
    );
    const dayLabels = data.days.map(
      (ms, c) =>
        svg`<text class="axis" x=${(GUTTER_LEFT + c * pitchX + cellW / 2).toFixed(1)} y=${size.h - 2} text-anchor="middle">${dayFmt.format(new Date(ms))}</text>`
    );
    return html`
      <svg width=${size.w} height=${size.h} aria-hidden="true">
        <g class="cells">${cells}</g>
        ${hourLabels}${dayLabels}
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
        <div class="plot">${this._renderGrid(unit)}</div>
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
      .plot {
        position: relative;
        flex: 1;
        min-height: 48px;
      }
      .plot svg {
        position: absolute;
        inset: 0;
        display: block;
      }
      .cell {
        fill: var(--silk-accent);
        transition: fill-opacity 200ms ease;
      }
      .cells {
        animation: silk-heatmap-in 250ms var(--silk-ease-out);
      }
      .axis {
        font-size: 9px;
        fill: var(--primary-text-color);
        opacity: 0.45;
        font-variant-numeric: tabular-nums;
        pointer-events: none;
      }
      .unavailable .plot {
        opacity: 0.45;
      }
      @keyframes silk-heatmap-in {
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
    'silk-heatmap-card': SilkHeatmapCard;
  }
}
