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
import { isUnavailable, moreInfo, clamp } from '../shared/service';
import { accentFor } from '../shared/color';
import { registerEditor } from '../shared/editor';
import { formatNumber } from '../format';

export const META = {
  type: 'silk-week-card',
  name: 'Silk Week',
  description: 'Daily totals as honest little bars.',
};

export interface SilkWeekCardConfig extends LovelaceCardConfig {
  entity: string;
  name?: string;
  icon?: string;
  /** Accent override. */
  color?: string;
  /** Day bars to show, ending today. Default 7. */
  days?: number;
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

interface DayBar {
  /** Local midnight (ms) the bar covers. */
  ts: number;
  /** Daily total (`change`) or daily mean; null when the recorder has no row. */
  v: number | null;
}

const DEFAULT_DAYS = 7;
const MAX_DAYS = 31;
const GAP = 2;
const BAR_RADIUS = 4;
const MIN_BAR = 2;
/** Top band that keeps the two direct value labels clear of the tallest bar. */
const TOP_BAND = 14;
/** Bottom band for the weekday-initial labels. */
const LABEL_BAND = 12;
/** Daily stats update hourly; refetch 90s after each hour boundary. */
const HOURLY_SLACK_MS = 90_000;

/** Local calendar-day key — DST-proof, unlike epoch-day arithmetic. */
function dayKey(d: Date): string {
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

const round1 = (n: number): number => Math.round(n * 10) / 10;

const EDITOR_TAG = 'silk-week-card-editor';

registerEditor(
  EDITOR_TAG,
  [
    { name: 'entity', required: true, selector: { entity: { domain: ['sensor'] } } },
    { name: 'name', selector: { text: {} } },
    {
      name: '',
      type: 'grid',
      schema: [
        { name: 'icon', selector: { icon: {} } },
        { name: 'color', selector: { ui_color: {} } },
      ],
    },
    { name: 'days', selector: { number: { min: 1, max: MAX_DAYS, mode: 'box' } } },
  ],
  { entity: '엔티티', name: '이름', icon: '아이콘', color: '강조 색상', days: '표시 일수' },
  { days: DEFAULT_DAYS }
);

@customElement('silk-week-card')
export class SilkWeekCard extends LitElement {
  @property({ attribute: false }) public hass?: HomeAssistant;

  @state() private _config?: SilkWeekCardConfig;
  @state() private _bars: DayBar[] | null = null;
  /** True when the recorder has no long-term statistics for the entity. */
  @state() private _noStats = false;
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

  public static getStubConfig(hass: HomeAssistant): Partial<SilkWeekCardConfig> {
    const ids = Object.keys(hass.states).filter((id) => id.startsWith('sensor.'));
    const byClass = (cls: string) =>
      ids.find((id) => hass.states[id].attributes.device_class === cls);
    return {
      type: 'custom:silk-week-card',
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

  public setConfig(config: SilkWeekCardConfig): void {
    if (!config.entity) {
      throw new Error('silk-week-card: `entity` is required');
    }
    if (config.days !== undefined && !(Number(config.days) > 0)) {
      throw new Error('silk-week-card: `days` must be a positive number');
    }
    this._config = config;
    this._bars = null;
    this._noStats = false;
    this._fetchStarted = false;
  }

  public getCardSize(): number {
    return 2;
  }

  public getGridOptions(): Record<string, number> {
    return { columns: 6, rows: 2, min_columns: 3, min_rows: 2 };
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
    const days = this._days();
    const seq = ++this._fetchSeq;
    const now = new Date();
    // Bars end with today, so the window opens at local midnight days−1 ago.
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
        period: 'day',
        types: ['change', 'mean'],
      });
    } catch (err) {
      console.warn('silk-week-card: statistics fetch failed', err);
      return;
    }
    if (seq !== this._fetchSeq) return; // a newer fetch superseded this one
    const rows = resp?.[config.entity] ?? [];
    const finite = (x: number | null | undefined): x is number =>
      typeof x === 'number' && Number.isFinite(x);
    // Prefer daily totals (`change`, energy-style sums); fall back to means.
    // One dataset-level choice — mixing the two would compare unlike numbers.
    const hasChange = rows.some((row) => finite(row.change));
    const hasMean = rows.some((row) => finite(row.mean));
    if (!hasChange && !hasMean) {
      this._noStats = true;
      this._bars = null;
      return;
    }
    const colOf = new Map<string, number>(dayStarts.map((ms, i) => [dayKey(new Date(ms)), i]));
    const values: (number | null)[] = new Array(days).fill(null);
    for (const row of rows) {
      const t = typeof row.start === 'number' ? row.start : Date.parse(row.start);
      if (!Number.isFinite(t)) continue;
      const col = colOf.get(dayKey(new Date(t)));
      if (col === undefined) continue;
      const v = hasChange ? row.change : row.mean;
      if (finite(v)) values[col] = v;
    }
    this._noStats = false;
    this._bars = dayStarts.map((ts, i) => ({ ts, v: values[i] }));
  }

  private _locale(): string {
    return this.hass?.locale?.language ?? this.hass?.language ?? 'en';
  }

  private _onCardClick(): void {
    if (this._config) moreInfo(this, this._config.entity);
  }

  /** A bar with rounded top corners only, anchored flat to the baseline. */
  private _barPath(x: number, baseline: number, w: number, h: number, today: boolean): SVGTemplateResult {
    const r = Math.min(BAR_RADIUS, w / 2, h);
    const top = baseline - h;
    const d =
      `M${round1(x)},${round1(baseline)} V${round1(top + r)} Q${round1(x)},${round1(top)} ${round1(x + r)},${round1(top)} ` +
      `H${round1(x + w - r)} Q${round1(x + w)},${round1(top)} ${round1(x + w)},${round1(top + r)} V${round1(baseline)} Z`;
    return svg`<path class="bar ${today ? 'today' : 'past'}" d=${d}></path>`;
  }

  private _renderBars(unit: string): TemplateResult | typeof nothing {
    if (this._noStats) {
      return html`<div class="note">No long-term statistics</div>`;
    }
    const size = this._plot;
    const bars = this._bars;
    const config = this._config;
    if (!size || !bars || !bars.length || !config) return nothing;
    const n = bars.length;
    const plotH = size.h - TOP_BAND - LABEL_BAND;
    const pitch = (size.w + GAP) / n; // bar + gap; no gap trails the last bar
    const barW = pitch - GAP;
    if (barW <= 1 || plotH <= 8) return nothing;
    const baseline = TOP_BAND + plotH;

    let maxIdx = -1;
    let max = 0;
    bars.forEach((b, i) => {
      if (b.v !== null && b.v > max) {
        max = b.v;
        maxIdx = i;
      }
    });
    const todayIdx = n - 1;
    const locale = this._locale();
    const initialFmt = new Intl.DateTimeFormat(locale, { weekday: 'narrow' });
    const titleFmt = new Intl.DateTimeFormat(locale, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });

    const marks: SVGTemplateResult[] = [];
    const labels: SVGTemplateResult[] = [];
    for (let i = 0; i < n; i++) {
      const b = bars[i];
      const x = i * pitch;
      const hasV = b.v !== null;
      // Height normalized to the window max; only a positive value earns a
      // mark (min 2px so tiny days stay visible). A zero, negative or missing
      // day draws nothing — the hover target below still reports it honestly.
      const h =
        hasV && max > 0 && (b.v as number) > 0
          ? Math.max(MIN_BAR, ((b.v as number) / max) * plotH)
          : 0;
      if (h > 0) marks.push(this._barPath(x, baseline, barW, h, i === todayIdx));
      // Selective direct labels: only the max day and today carry a number.
      if (hasV && (i === maxIdx || i === todayIdx)) {
        labels.push(
          svg`<text class="val" x=${round1(x + barW / 2)} y=${round1(Math.max(9, baseline - h - 4))} text-anchor="middle">${formatNumber(this.hass, config.entity, b.v as number)}</text>`
        );
      }
      labels.push(
        svg`<text class="axis" x=${round1(x + barW / 2)} y=${size.h - 2} text-anchor="middle">${initialFmt.format(new Date(b.ts))}</text>`
      );
      // Full-column hover target — bigger than the mark, per interaction rules.
      const valueText = hasV ? `${formatNumber(this.hass, config.entity, b.v as number)}${unit}` : '—';
      marks.push(
        svg`<rect class="hit" x=${round1(x)} y="0" width=${round1(barW)} height=${size.h - LABEL_BAND}>
          <title>${titleFmt.format(new Date(b.ts))} · ${valueText}</title>
        </rect>`
      );
    }
    return html`
      <svg width=${size.w} height=${size.h} aria-hidden="true">
        <g class="chart">${marks}${labels}</g>
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
    const todayV = this._bars?.length ? this._bars[this._bars.length - 1].v : null;

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
            <span class="value">${todayV !== null ? formatNumber(hass, config.entity, todayV) : '—'}</span>
            ${todayV !== null && unit ? html`<span class="unit">${unit}</span>` : nothing}
          </div>
        </div>
        <div class="plot">${this._renderBars(unit)}</div>
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
      .plot {
        position: relative;
        flex: 1;
        min-height: 40px;
      }
      .plot svg {
        position: absolute;
        inset: 0;
        display: block;
      }
      .bar.today {
        fill: var(--silk-accent);
      }
      .bar.past {
        fill: var(--silk-accent);
        fill-opacity: 0.35;
      }
      .hit {
        fill: transparent;
      }
      .chart {
        animation: silk-week-in 250ms var(--silk-ease-out);
      }
      .axis {
        font-size: 9px;
        fill: var(--primary-text-color);
        opacity: 0.45;
        pointer-events: none;
      }
      .val {
        font-size: 10px;
        font-weight: 500;
        fill: var(--primary-text-color);
        opacity: 0.75;
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
      @keyframes silk-week-in {
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
    'silk-week-card': SilkWeekCard;
  }
}
