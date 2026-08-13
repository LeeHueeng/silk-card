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
  type: 'silk-candle-card',
  name: 'Silk Candles',
  description: 'Daily highs and lows, at a glance.',
};

export interface SilkCandleCardConfig extends LovelaceCardConfig {
  entity: string;
  name?: string;
  icon?: string;
  /** Accent override. */
  color?: string;
  /** Day candles to show, ending today. Default 7, max 14. */
  days?: number;
}

/**
 * Row from `recorder/statistics_during_period` — Silk's minimal HomeAssistant
 * type doesn't model recorder responses, so it is typed locally.
 */
interface StatisticsRow {
  start: number | string;
  min?: number | null;
  max?: number | null;
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

interface Candle {
  /** Local midnight (ms) the candle covers. */
  ts: number;
  /** Day low / high / average; null when the recorder has no row. */
  min: number | null;
  max: number | null;
  mean: number | null;
}

const DEFAULT_DAYS = 7;
const MIN_DAYS = 2;
const MAX_DAYS = 14;
const GAP = 2;
const BODY_RADIUS = 3;
/** Candles stay candle-shaped: a wide card gives air, not fat slabs. */
const MAX_BODY_W = 18;
/** A day whose low equals its high still gets a visible body. */
const MIN_BODY_H = 2;
const MEAN_TICK_H = 2;
/** Top/bottom breathing room so the extreme candles don't touch the edges. */
const PLOT_PAD = 4;
/** Bottom band for the weekday initials. */
const LABEL_BAND = 12;
/** Daily stats roll up hourly; refetch 90s after each hour boundary. */
const HOURLY_SLACK_MS = 90_000;

const r1 = (n: number): number => Math.round(n * 10) / 10;

const isFinite2 = (x: number | null | undefined): x is number =>
  typeof x === 'number' && Number.isFinite(x);

/** Local calendar-day key — DST-proof, unlike epoch-day arithmetic. */
function dayKey(d: Date): string {
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

/** A rounded body spanning [top, bottom]; radius collapses on short bodies. */
function bodyPath(x: number, w: number, top: number, bottom: number): string {
  const h = Math.max(bottom - top, MIN_BODY_H);
  const r = Math.min(BODY_RADIUS, w / 2, h / 2);
  const x0 = r1(x);
  const x1 = r1(x + w);
  const yT = r1(top);
  const yB = r1(top + h);
  return (
    `M${x0},${r1(top + r)} Q${x0},${yT} ${r1(x + r)},${yT} H${r1(x + w - r)} ` +
    `Q${x1},${yT} ${x1},${r1(top + r)} V${r1(top + h - r)} ` +
    `Q${x1},${yB} ${r1(x + w - r)},${yB} H${r1(x + r)} Q${x0},${yB} ${x0},${r1(top + h - r)} Z`
  );
}

const EDITOR_TAG = 'silk-candle-card-editor';

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
        { name: 'icon', selector: { icon: {} } },
        { name: 'days', selector: { number: { min: MIN_DAYS, max: MAX_DAYS, mode: 'box' } } },
      ],
    },
  ],
  { entity: 'Entity', name: 'Name', icon: 'Icon', days: 'Days to show' },
  { days: DEFAULT_DAYS }
);

@customElement('silk-candle-card')
export class SilkCandleCard extends LitElement {
  @property({ attribute: false }) public hass?: HomeAssistant;

  @state() private _config?: SilkCandleCardConfig;
  @state() private _candles: Candle[] | null = null;
  /** Friendly inline note when the recorder can't answer; null when it can. */
  @state() private _note: string | null = null;
  /** Measured plot box; candles are laid out in exact pixels from it. */
  @state() private _plot: { w: number; h: number } | null = null;

  private _fetchStarted = false;
  private _fetchSeq = 0;
  private _hourlyTimer?: number;
  private _resize?: ResizeObserver;
  private _connection?: HassWithConnection['connection'];
  private readonly _onWsReady = (): void => {
    this._refresh();
  };

  public static getStubConfig(hass: HomeAssistant): Partial<SilkCandleCardConfig> {
    const ids = Object.keys(hass.states).filter(
      (id) => id.startsWith('sensor.') && Number.isFinite(Number(hass.states[id].state))
    );
    const byClass = (cls: string) =>
      ids.find((id) => hass.states[id].attributes.device_class === cls);
    return {
      type: 'custom:silk-candle-card',
      entity: byClass('temperature') ?? byClass('humidity') ?? ids[0],
    };
  }

  public static async getConfigElement(): Promise<HTMLElement> {
    return document.createElement(EDITOR_TAG);
  }

  public setConfig(config: SilkCandleCardConfig): void {
    if (!config.entity) {
      throw new Error('silk-candle-card: `entity` is required');
    }
    if (config.days !== undefined && !(Number(config.days) > 0)) {
      throw new Error('silk-candle-card: `days` must be a positive number');
    }
    this._config = config;
    this._candles = null;
    this._note = null;
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
    return clamp(Math.round(this._config?.days ?? DEFAULT_DAYS), MIN_DAYS, MAX_DAYS);
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
    // Candles end with today, so the window opens at local midnight days−1 ago.
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
        types: ['min', 'max', 'mean'],
      });
    } catch (err) {
      console.warn('silk-candle-card: statistics fetch failed', err);
      return;
    }
    if (seq !== this._fetchSeq) return; // a newer fetch superseded this one
    const rows = resp?.[config.entity] ?? [];
    if (!rows.some((row) => isFinite2(row.min) || isFinite2(row.max))) {
      // Sum statistics (energy meters) keep no daily min/max — say which of the
      // two nothings it is instead of a blank chart.
      this._note = rows.length ? 'No daily range recorded' : 'No long-term statistics';
      this._candles = null;
      return;
    }
    const colOf = new Map<string, number>(dayStarts.map((ms, i) => [dayKey(new Date(ms)), i]));
    const candles: Candle[] = dayStarts.map((ts) => ({ ts, min: null, max: null, mean: null }));
    for (const row of rows) {
      const t = typeof row.start === 'number' ? row.start : Date.parse(row.start);
      if (!Number.isFinite(t)) continue;
      const col = colOf.get(dayKey(new Date(t)));
      if (col === undefined) continue;
      const candle = candles[col];
      // A DST day can hand one local date two rows: keep the widest range.
      if (isFinite2(row.min)) candle.min = candle.min === null ? row.min : Math.min(candle.min, row.min);
      if (isFinite2(row.max)) candle.max = candle.max === null ? row.max : Math.max(candle.max, row.max);
      if (isFinite2(row.mean)) candle.mean = candle.mean === null ? row.mean : (candle.mean + row.mean) / 2;
    }
    this._note = null;
    this._candles = candles;
  }

  private _locale(): string {
    return this.hass?.locale?.language ?? this.hass?.language ?? 'en';
  }

  private _onCardClick(): void {
    if (!this._config) return;
    haptic(this);
    moreInfo(this, this._config.entity);
  }

  private _renderCandles(unit: string): TemplateResult | typeof nothing {
    if (this._note) {
      return html`<div class="note">${this._note}</div>`;
    }
    const size = this._plot;
    const candles = this._candles;
    const config = this._config;
    if (!size || !candles || !candles.length || !config) return nothing;
    const lows = candles.map((c) => c.min).filter(isFinite2);
    const highs = candles.map((c) => c.max).filter(isFinite2);
    if (!lows.length || !highs.length) {
      return html`<div class="note">Nothing recorded in this window</div>`;
    }

    // One shared domain across the window: candles are only comparable when
    // every day is measured against the same scale.
    let lo = Math.min(...lows);
    let hi = Math.max(...highs);
    if (hi === lo) {
      const pad = Math.max(Math.abs(hi) * 0.05, 0.5);
      lo -= pad;
      hi += pad;
    }
    const span = hi - lo;
    const n = candles.length;
    const plotH = size.h - LABEL_BAND - PLOT_PAD * 2;
    const pitch = size.w / n;
    const bodyW = clamp(pitch - GAP, 3, MAX_BODY_W);
    if (bodyW <= 1 || plotH <= 8) return nothing;
    const yOf = (v: number): number => PLOT_PAD + (1 - (v - lo) / span) * plotH;

    const todayIdx = n - 1;
    const locale = this._locale();
    const initialFmt = new Intl.DateTimeFormat(locale, { weekday: 'narrow' });
    const titleFmt = new Intl.DateTimeFormat(locale, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
    const fmt = (v: number): string => formatNumber(this.hass, config.entity, v);

    const marks: SVGTemplateResult[] = [];
    const labels: SVGTemplateResult[] = [];
    for (let i = 0; i < n; i++) {
      const c = candles[i];
      const today = i === todayIdx;
      const cx = i * pitch + pitch / 2;
      const x = cx - bodyW / 2;
      if (c.min !== null && c.max !== null) {
        const top = yOf(c.max);
        // Mirrors bodyPath: a flat day still occupies MIN_BODY_H pixels.
        const bottom = Math.max(yOf(c.min), top + MIN_BODY_H);
        marks.push(
          svg`<path class="body ${today ? 'today' : 'past'}" d=${bodyPath(x, bodyW, top, bottom)}></path>`
        );
        if (c.mean !== null) {
          // The day's average, clamped inside its own body so the tick reads
          // as part of the candle even on a hair-thin day.
          const ty = clamp(yOf(c.mean) - MEAN_TICK_H / 2, top, bottom - MEAN_TICK_H);
          marks.push(
            svg`<rect class="mean ${today ? 'today' : 'past'}" x=${r1(x)} y=${r1(ty)} width=${r1(bodyW)} height=${MEAN_TICK_H}></rect>`
          );
        }
      }
      labels.push(
        svg`<text class="axis ${today ? 'today' : ''}" x=${r1(cx)} y=${size.h - 2} text-anchor="middle">${initialFmt.format(new Date(c.ts))}</text>`
      );
      // Full-column hover target — bigger than the mark, per interaction rules.
      const range =
        c.min !== null && c.max !== null ? `${fmt(c.min)} – ${fmt(c.max)}${unit}` : '—';
      const avg = c.mean !== null ? ` · avg ${fmt(c.mean)}${unit}` : '';
      marks.push(
        svg`<rect class="hit" x=${r1(i * pitch)} y="0" width=${r1(pitch)} height=${size.h - LABEL_BAND}>
          <title>${titleFmt.format(new Date(c.ts))} · ${range}${avg}</title>
        </rect>`
      );
    }

    return html`
      <svg width=${size.w} height=${size.h} aria-hidden="true">
        <g class="chart">${marks}${labels}</g>
      </svg>
    `;
  }

  /** `High 24.0 · Low 18.2` over the window — the numbers the candles span. */
  private _summary(unit: string): string {
    const candles = this._candles;
    const config = this._config;
    const days = this._days();
    if (!candles || !config) return `${days}d`;
    const lows = candles.map((c) => c.min).filter(isFinite2);
    const highs = candles.map((c) => c.max).filter(isFinite2);
    if (!lows.length || !highs.length) return `${days}d`;
    const fmt = (v: number): string => formatNumber(this.hass, config.entity, v);
    return `High ${fmt(Math.max(...highs))}${unit} · Low ${fmt(Math.min(...lows))}${unit}`;
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
        <div class="plot">${this._renderCandles(unit ? ` ${unit}` : '')}</div>
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
        min-height: 40px;
      }
      .plot svg {
        position: absolute;
        inset: 0;
        display: block;
      }
      /* One accent: opacity separates today from the days behind it. */
      .body {
        fill: var(--silk-accent);
      }
      .body.past {
        fill-opacity: 0.35;
      }
      .body.today {
        fill-opacity: 0.6;
      }
      .mean {
        fill: var(--silk-accent);
      }
      .mean.past {
        fill-opacity: 0.75;
      }
      .hit {
        fill: transparent;
      }
      .chart {
        animation: silk-candle-in 250ms var(--silk-ease-out);
      }
      .axis {
        font-size: 9px;
        fill: var(--primary-text-color);
        opacity: 0.45;
        pointer-events: none;
      }
      .axis.today {
        opacity: 0.75;
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
      @keyframes silk-candle-in {
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
    'silk-candle-card': SilkCandleCard;
  }
}
