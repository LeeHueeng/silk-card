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
  type: 'silk-year-card',
  name: 'Silk Year',
  description: 'A year of daily totals in one grid.',
};

export interface SilkYearCardConfig extends LovelaceCardConfig {
  entity: string;
  name?: string;
  icon?: string;
  /** Accent override; the whole ramp is this one hue at varying opacity. */
  color?: string;
  /** Week columns to show, ending with the current week. Default 53. */
  weeks?: number;
}

/**
 * Row from `recorder/statistics_during_period` — Silk's minimal HomeAssistant
 * type doesn't model recorder responses, so it is typed locally. Sum-based
 * statistics (energy, total_increasing) carry `change`; measurement
 * statistics carry `mean`.
 */
interface StatisticsRow {
  start: number | string;
  change?: number | null;
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

interface YearCell {
  /** Local midnight (ms) the cell covers. */
  ts: number;
  /** The day's total (`change`) or mean; null when nothing was recorded. */
  v: number | null;
  /** Days after today: they haven't happened, so they are never drawn. */
  future: boolean;
}

const DEFAULT_WEEKS = 53;
const MAX_WEEKS = 53;
const MIN_WEEKS = 4;
const ROWS = 7;
const GAP = 2;
/** Cell edge at full size; the grid shrinks below this to fit its card. */
const CELL_MAX = 10;
const CELL_RADIUS = 2;
/** Left band for the M/W/F weekday initials. */
const GUTTER_LEFT = 14;
/** Top band for the month initials. */
const MONTH_BAND = 12;
/** Columns a month label needs to itself before the next one may print. */
const MONTH_LABEL_SPACING = 3;
/**
 * Sequential single-hue ramp (correct for magnitude data): one accent at five
 * opacity steps, cut at the quintiles of the year's non-zero days so a single
 * enormous day can't flatten twelve months of ordinary ones.
 */
const OPACITY_STEPS = [0.16, 0.34, 0.54, 0.74, 0.95];
const OPACITY_EMPTY = 0.04;
/** Daily stats roll up hourly; refetch 90s after each hour boundary. */
const HOURLY_SLACK_MS = 90_000;

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

const finite = (x: number | null | undefined): x is number =>
  typeof x === 'number' && Number.isFinite(x);

const EDITOR_TAG = 'silk-year-card-editor';

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
        { name: 'icon', selector: { icon: {} } },
        { name: 'weeks', selector: { number: { min: MIN_WEEKS, max: MAX_WEEKS, mode: 'box' } } },
        { name: 'color', selector: { ui_color: {} } },
      ],
    },
  ],
  { entity: '엔티티', name: '이름', icon: '아이콘', weeks: '표시 주 수', color: '강조 색상' },
  { weeks: DEFAULT_WEEKS }
);

@customElement('silk-year-card')
export class SilkYearCard extends LitElement {
  @property({ attribute: false }) public hass?: HomeAssistant;

  @state() private _config?: SilkYearCardConfig;
  @state() private _cells: YearCell[] | null = null;
  /** Quintile cut points of the window's positive days; empty = one flat step. */
  @state() private _cuts: number[] = [];
  /** Current-year total (sum mode) or daily average (mean mode). */
  @state() private _headline: number | null = null;
  @state() private _mode: 'change' | 'mean' = 'change';
  /** Friendly inline note when there is nothing to draw. */
  @state() private _note: string | null = null;
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

  public static getStubConfig(hass: HomeAssistant): Partial<SilkYearCardConfig> {
    const ids = Object.keys(hass.states).filter((id) => id.startsWith('sensor.'));
    const byClass = (cls: string) =>
      ids.find((id) => hass.states[id].attributes.device_class === cls);
    return {
      type: 'custom:silk-year-card',
      entity:
        byClass('energy') ??
        byClass('gas') ??
        byClass('water') ??
        ids.find((id) => Number.isFinite(Number(hass.states[id].state))),
    };
  }

  public static async getConfigElement(): Promise<HTMLElement> {
    return document.createElement(EDITOR_TAG);
  }

  public setConfig(config: SilkYearCardConfig): void {
    if (!config.entity) {
      throw new Error('silk-year-card: `entity` is required');
    }
    if (config.weeks !== undefined && !(Number(config.weeks) > 0)) {
      throw new Error('silk-year-card: `weeks` must be a positive number');
    }
    this._config = config;
    this._cells = null;
    this._cuts = [];
    this._headline = null;
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

  private _weeks(): number {
    return clamp(Math.round(this._config?.weeks ?? DEFAULT_WEEKS), MIN_WEEKS, MAX_WEEKS);
  }

  /** Refetch shortly after each hour boundary — stat rows update on the hour. */
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
    const weeks = this._weeks();
    const seq = ++this._fetchSeq;
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    // Columns are Monday-first weeks; the last column holds today.
    const mondayOffset = (today.getDay() + 6) % 7;
    const gridStart = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate() - mondayOffset - (weeks - 1) * 7
    );

    let resp: Record<string, StatisticsRow[]>;
    try {
      resp = await hass.callWS<Record<string, StatisticsRow[]>>({
        type: 'recorder/statistics_during_period',
        start_time: gridStart.toISOString(),
        end_time: now.toISOString(),
        statistic_ids: [config.entity],
        period: 'day',
        types: ['change', 'mean'],
      });
    } catch (err) {
      console.warn('silk-year-card: statistics fetch failed', err);
      if (seq === this._fetchSeq && !this._cells) this._note = 'History unavailable';
      return;
    }
    if (seq !== this._fetchSeq) return; // a newer fetch superseded this one

    const rows = resp?.[config.entity] ?? [];
    // Prefer daily totals (`change`, energy-style sums); fall back to means.
    // One dataset-level choice — mixing the two would compare unlike numbers.
    const hasChange = rows.some((row) => finite(row.change));
    const hasMean = rows.some((row) => finite(row.mean));
    if (!hasChange && !hasMean) {
      this._note = 'No long-term statistics';
      this._cells = null;
      this._headline = null;
      return;
    }
    const mode: 'change' | 'mean' = hasChange ? 'change' : 'mean';
    const values = new Map<string, number>();
    for (const row of rows) {
      const t = typeof row.start === 'number' ? row.start : Date.parse(row.start);
      if (!Number.isFinite(t)) continue;
      const v = mode === 'change' ? row.change : row.mean;
      if (finite(v)) values.set(dayKey(new Date(t)), v);
    }

    const cells: YearCell[] = [];
    for (let i = 0; i < weeks * ROWS; i++) {
      const d = new Date(gridStart.getFullYear(), gridStart.getMonth(), gridStart.getDate() + i);
      const ts = d.getTime();
      const future = ts > today.getTime();
      cells.push({ ts, v: future ? null : (values.get(dayKey(d)) ?? null), future });
    }

    // Quintile cuts over the days that actually happened. Totals ramp from
    // zero (a zero day is an empty day); means are ranked across their whole
    // range, so a cold January still reads as cold rather than as missing.
    const sample = cells
      .filter((c) => c.v !== null && (mode === 'mean' || (c.v as number) > 0))
      .map((c) => c.v as number)
      .sort((a, b) => a - b);
    const cuts = [0.2, 0.4, 0.6, 0.8].map((q) => quantile(sample, q));
    // A run of identical values collapses to no cuts at all, which paints one
    // honest flat step instead of a meaningless ramp.
    const flat = !sample.length || cuts[0] === cuts[cuts.length - 1];

    const year = now.getFullYear();
    const thisYear = cells.filter((c) => c.v !== null && new Date(c.ts).getFullYear() === year);
    const sum = thisYear.reduce((acc, c) => acc + (c.v as number), 0);

    this._note = null;
    this._mode = mode;
    this._cuts = flat ? [] : cuts;
    this._cells = cells;
    this._headline = thisYear.length
      ? mode === 'change'
        ? sum
        : sum / thisYear.length
      : null;
  }

  /** Opacity step for a day; unrecorded (and, for totals, zero) days go faint. */
  private _opacity(v: number | null): number {
    if (v === null) return OPACITY_EMPTY;
    if (this._mode === 'change' && !(v > 0)) return OPACITY_EMPTY;
    const cuts = this._cuts;
    if (!cuts.length) return OPACITY_STEPS[2];
    let step = 0;
    while (step < cuts.length && v > cuts[step]) step++;
    return OPACITY_STEPS[Math.min(step, OPACITY_STEPS.length - 1)];
  }

  private _locale(): string {
    return this.hass?.locale?.language ?? this.hass?.language ?? 'en';
  }

  private _onCardClick(): void {
    if (!this._config) return;
    haptic(this);
    moreInfo(this, this._config.entity);
  }

  private _renderGrid(unit: string): TemplateResult | typeof nothing {
    if (this._note) return html`<div class="note">${this._note}</div>`;
    const size = this._plot;
    const cells = this._cells;
    const config = this._config;
    if (!size || !cells || !config) return nothing;
    const cols = cells.length / ROWS;
    // Square cells that fit both axes, never larger than the 10px full size.
    const cell = Math.min(
      CELL_MAX,
      (size.w - GUTTER_LEFT + GAP) / cols - GAP,
      (size.h - MONTH_BAND + GAP) / ROWS - GAP
    );
    if (cell < 2) return nothing;
    const pitch = cell + GAP;
    const rx = Math.min(CELL_RADIUS, cell / 2);
    const round = (n: number): number => Math.round(n * 10) / 10;
    // At full 10px cells a short window leaves slack; center the block (with
    // its gutter) rather than stranding it against the left edge.
    const x0 = GUTTER_LEFT + Math.max(0, (size.w - GUTTER_LEFT - (cols * pitch - GAP)) / 2);
    const y0 = MONTH_BAND + Math.max(0, (size.h - MONTH_BAND - (ROWS * pitch - GAP)) / 2);
    const locale = this._locale();
    const monthFmt = new Intl.DateTimeFormat(locale, { month: 'narrow' });
    const weekdayFmt = new Intl.DateTimeFormat(locale, { weekday: 'narrow' });
    const titleFmt = new Intl.DateTimeFormat(locale, {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    });
    const unitText = unit ? (unit.startsWith('°') ? unit : ` ${unit}`) : '';

    const marks: SVGTemplateResult[] = [];
    const labels: SVGTemplateResult[] = [];
    let prevMonth = -1;
    let lastLabelCol = -MONTH_LABEL_SPACING;
    for (let c = 0; c < cols; c++) {
      const x = round(x0 + c * pitch);
      const monday = new Date(cells[c * ROWS].ts);
      const month = monday.getMonth();
      if (month !== prevMonth) {
        if (c - lastLabelCol >= MONTH_LABEL_SPACING) {
          labels.push(
            svg`<text class="axis" x=${x} y=${round(y0 - 3)}>${monthFmt.format(monday)}</text>`
          );
          lastLabelCol = c;
        }
        prevMonth = month;
      }
      for (let r = 0; r < ROWS; r++) {
        const item = cells[c * ROWS + r];
        if (item.future) continue;
        const y = round(y0 + r * pitch);
        const day = new Date(item.ts);
        const valueText = item.v === null ? '—' : `${formatNumber(this.hass, config.entity, item.v)}${unitText}`;
        marks.push(
          svg`<rect class="cell" x=${x} y=${y} width=${round(cell)} height=${round(cell)} rx=${round(rx)} fill-opacity=${this._opacity(item.v)}>
            <title>${titleFmt.format(day)} · ${valueText}</title>
          </rect>`
        );
      }
    }
    // Mon / Wed / Fri only: seven initials down a 10px grid is noise.
    for (const r of [0, 2, 4]) {
      const day = new Date(cells[r].ts);
      labels.push(
        svg`<text class="axis" x=${round(x0 - 4)} y=${round(y0 + r * pitch + cell / 2)} text-anchor="end" dominant-baseline="central">${weekdayFmt.format(day)}</text>`
      );
    }
    return html`
      <svg width=${size.w} height=${size.h} aria-hidden="true">
        <g class="cells">${marks}</g>
        ${labels}
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
    const year = new Date().getFullYear();
    const headline = this._headline;
    const headlineTitle = this._mode === 'change' ? `Total in ${year}` : `Daily average in ${year}`;

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
          <div class="trailing" title=${headlineTitle}>
            <span class="tag">${year}</span>
            <span class="value">${headline !== null ? formatNumber(hass, config.entity, headline) : '—'}</span>
            ${headline !== null && unit ? html`<span class="unit">${unit}</span>` : nothing}
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
      .trailing {
        align-items: baseline;
        gap: 4px;
      }
      .tag {
        font-size: 11px;
        line-height: 1;
        color: var(--secondary-text-color);
        font-variant-numeric: tabular-nums;
      }
      .plot {
        position: relative;
        flex: 1;
        min-height: 62px;
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
        animation: silk-year-in 250ms var(--silk-ease-out);
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
      @keyframes silk-year-in {
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
    'silk-year-card': SilkYearCard;
  }
}
