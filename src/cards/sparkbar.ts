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
import { formatNumber, formatTime } from '../format';

export const META = {
  type: 'silk-sparkbar-card',
  name: 'Silk Sparkbar',
  description: 'Hourly bars, small enough for any slot.',
};

/** `change` = hourly total (meters), `mean` = hourly average (measurements). */
export type SparkbarMode = 'mean' | 'change' | 'auto';

export interface SilkSparkbarCardConfig extends LovelaceCardConfig {
  entity: string;
  name?: string;
  icon?: string;
  /** Accent override. */
  color?: string;
  /** Hourly bars to show, ending with the current hour. Default 24. */
  hours?: number;
  /** Which statistic each bar draws. Default `auto` (state_class decides). */
  mode?: SparkbarMode;
}

/**
 * Row from `recorder/statistics_during_period` — Silk's minimal HomeAssistant
 * type doesn't model recorder responses, so it is typed locally. Sum-based
 * statistics (energy, total_increasing) carry `change`; measurement
 * statistics carry `mean`.
 */
interface StatisticsRow {
  start: number | string;
  mean?: number | null;
  change?: number | null;
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

interface HourBar {
  /** Start of the hour (ms). */
  ts: number;
  /** The hour's value; null when the recorder has no row for it. */
  v: number | null;
}

interface SparkbarData {
  bars: HourBar[];
  /** The statistic the bars actually draw, after `auto` resolution. */
  mode: 'mean' | 'change';
}

const DEFAULT_HOURS = 24;
const MIN_HOURS = 4;
const MAX_HOURS = 72;
const HOUR_MS = 3_600_000;
const GAP = 2;
const BAR_RADIUS = 3;
/** Finite-but-tiny values still deserve a visible mark. */
const MIN_BAR = 2;
/** Bottom band that carries the baseline label when the floor isn't zero. */
const FLOOR_BAND = 11;
/** Hourly stats land just past the hour; refetch 90s after each boundary. */
const HOURLY_SLACK_MS = 90_000;
/** state_class values whose honest hourly bar is a total, not an average. */
const SUM_CLASSES = new Set(['total', 'total_increasing']);

const r1 = (n: number): number => Math.round(n * 10) / 10;

const isFinite2 = (x: number | null | undefined): x is number =>
  typeof x === 'number' && Number.isFinite(x);

/**
 * A bar between the baseline and the value, rounded only on the end away from
 * the baseline — so negative bars hang below zero and still read as bars.
 */
function barPath(x: number, w: number, baseY: number, valY: number): string {
  const up = valY <= baseY;
  const top = up ? valY : baseY;
  const bottom = up ? baseY : valY;
  const r = Math.min(BAR_RADIUS, w / 2, bottom - top);
  const x0 = r1(x);
  const x1 = r1(x + w);
  const yT = r1(top);
  const yB = r1(bottom);
  if (up) {
    return (
      `M${x0},${yB} V${r1(top + r)} Q${x0},${yT} ${r1(x + r)},${yT} ` +
      `H${r1(x + w - r)} Q${x1},${yT} ${x1},${r1(top + r)} V${yB} Z`
    );
  }
  return (
    `M${x0},${yT} V${r1(bottom - r)} Q${x0},${yB} ${r1(x + r)},${yB} ` +
    `H${r1(x + w - r)} Q${x1},${yB} ${x1},${r1(bottom - r)} V${yT} Z`
  );
}

const EDITOR_TAG = 'silk-sparkbar-card-editor';

registerEditor(
  EDITOR_TAG,
  [
    {
      name: 'entity',
      required: true,
      selector: { entity: { domain: ['sensor', 'counter', 'number', 'input_number'] } },
    },
    { name: 'name', selector: { text: {} } },
    {
      name: '',
      type: 'grid',
      schema: [
        { name: 'icon', selector: { icon: {} } },
        { name: 'hours', selector: { number: { min: MIN_HOURS, max: MAX_HOURS, mode: 'box' } } },
      ],
    },
    {
      name: 'mode',
      selector: {
        select: {
          mode: 'dropdown',
          options: [
            { value: 'auto', label: 'Auto' },
            { value: 'mean', label: 'Hourly average' },
            { value: 'change', label: 'Hourly total' },
          ],
        },
      },
    },
  ],
  { entity: 'Entity', name: 'Name', icon: 'Icon', hours: 'Hours to show', mode: 'Bar value' },
  { hours: DEFAULT_HOURS, mode: 'auto' }
);

@customElement('silk-sparkbar-card')
export class SilkSparkbarCard extends LitElement {
  @property({ attribute: false }) public hass?: HomeAssistant;

  @state() private _config?: SilkSparkbarCardConfig;
  @state() private _data: SparkbarData | null = null;
  /** True when the recorder has no hourly statistics for the entity. */
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

  public static getStubConfig(hass: HomeAssistant): Partial<SilkSparkbarCardConfig> {
    const ids = Object.keys(hass.states).filter((id) => id.startsWith('sensor.'));
    const byClass = (cls: string) =>
      ids.find((id) => hass.states[id].attributes.device_class === cls);
    return {
      type: 'custom:silk-sparkbar-card',
      entity:
        byClass('power') ??
        byClass('energy') ??
        ids.find((id) => Number.isFinite(Number(hass.states[id].state))),
    };
  }

  public static async getConfigElement(): Promise<HTMLElement> {
    return document.createElement(EDITOR_TAG);
  }

  public setConfig(config: SilkSparkbarCardConfig): void {
    if (!config.entity) {
      throw new Error('silk-sparkbar-card: `entity` is required');
    }
    if (config.hours !== undefined && !(Number(config.hours) > 0)) {
      throw new Error('silk-sparkbar-card: `hours` must be a positive number');
    }
    if (config.mode !== undefined && !['mean', 'change', 'auto'].includes(config.mode)) {
      throw new Error("silk-sparkbar-card: `mode` must be 'mean', 'change' or 'auto'");
    }
    this._config = config;
    this._data = null;
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

  private _hours(): number {
    return clamp(Math.round(this._config?.hours ?? DEFAULT_HOURS), MIN_HOURS, MAX_HOURS);
  }

  /** Refetch shortly after each hour boundary — new stat rows land on the hour. */
  private _scheduleHourly(): void {
    window.clearTimeout(this._hourlyTimer);
    const now = Date.now();
    const next = (Math.floor(now / HOUR_MS) + 1) * HOUR_MS + HOURLY_SLACK_MS;
    this._hourlyTimer = window.setTimeout(() => {
      this._refresh();
      this._scheduleHourly();
    }, next - now);
  }

  private async _refresh(): Promise<void> {
    const hass = this.hass;
    const config = this._config;
    if (!hass || !config) return;
    const hours = this._hours();
    const seq = ++this._fetchSeq;
    const nowMs = Date.now();
    // Bars end with the hour we're in, so the window opens hours−1 hours back.
    const firstHour = Math.floor(nowMs / HOUR_MS) * HOUR_MS - (hours - 1) * HOUR_MS;
    let resp: Record<string, StatisticsRow[]>;
    try {
      resp = await hass.callWS<Record<string, StatisticsRow[]>>({
        type: 'recorder/statistics_during_period',
        start_time: new Date(firstHour).toISOString(),
        end_time: new Date(nowMs).toISOString(),
        statistic_ids: [config.entity],
        period: 'hour',
        types: ['mean', 'change'],
      });
    } catch (err) {
      console.warn('silk-sparkbar-card: statistics fetch failed', err);
      return;
    }
    if (seq !== this._fetchSeq) return; // a newer fetch superseded this one
    const rows = resp?.[config.entity] ?? [];
    const hasChange = rows.some((row) => isFinite2(row.change));
    const hasMean = rows.some((row) => isFinite2(row.mean));
    if (!hasChange && !hasMean) {
      this._noStats = true;
      this._data = null;
      return;
    }
    // One dataset-level choice: mixing totals and averages would put unlike
    // numbers on one axis. `auto` follows state_class, then falls back to
    // whichever statistic the recorder actually has.
    const stateClass = this.hass?.states[config.entity]?.attributes.state_class;
    const wanted =
      this._config?.mode === 'mean' || this._config?.mode === 'change'
        ? this._config.mode
        : SUM_CLASSES.has(String(stateClass))
          ? 'change'
          : 'mean';
    const mode: 'mean' | 'change' =
      wanted === 'change' ? (hasChange ? 'change' : 'mean') : hasMean ? 'mean' : 'change';

    const values = new Array<number | null>(hours).fill(null);
    for (const row of rows) {
      const t = typeof row.start === 'number' ? row.start : Date.parse(row.start);
      if (!Number.isFinite(t)) continue;
      const col = Math.round((t - firstHour) / HOUR_MS);
      if (col < 0 || col >= hours) continue;
      const v = mode === 'change' ? row.change : row.mean;
      if (isFinite2(v)) values[col] = v;
    }
    this._noStats = false;
    this._data = {
      mode,
      bars: values.map((v, i) => ({ ts: firstHour + i * HOUR_MS, v })),
    };
  }

  private _onCardClick(): void {
    if (!this._config) return;
    haptic(this);
    moreInfo(this, this._config.entity);
  }

  private _renderBars(unit: string): TemplateResult | typeof nothing {
    if (this._noStats) {
      return html`<div class="note">No hourly statistics</div>`;
    }
    const size = this._plot;
    const data = this._data;
    const config = this._config;
    if (!size || !data || !config) return nothing;
    const bars = data.bars;
    const finite = bars.map((b) => b.v).filter(isFinite2);
    if (!bars.length) return nothing;
    if (!finite.length) return html`<div class="note">Nothing recorded in this window</div>`;

    const min = Math.min(...finite);
    const max = Math.max(...finite);
    // Totals always read from zero. Averages that already cross zero keep it;
    // otherwise the floor is the window minimum and gets labelled below, so
    // the clipped baseline is stated rather than implied.
    const zeroBased = data.mode === 'change' || min <= 0;
    const floor = zeroBased ? Math.min(0, min) : min;
    const ceil = zeroBased ? Math.max(0, max) : max;
    const span = ceil - floor || 1;
    const band = zeroBased ? 0 : FLOOR_BAND;
    const plotH = size.h - band;
    const n = bars.length;
    const pitch = (size.w + GAP) / n; // bar + gap; no gap trails the last bar
    const barW = pitch - GAP;
    if (barW <= 0.5 || plotH <= 8) return nothing;
    const yOf = (v: number): number => (1 - (v - floor) / span) * plotH;
    const baseY = yOf(zeroBased ? 0 : floor);

    const marks: SVGTemplateResult[] = [];
    const overlay: SVGTemplateResult[] = [];
    const nowIdx = n - 1;
    const hours = this._hours();
    for (let i = 0; i < n; i++) {
      const bar = bars[i];
      const x = i * pitch;
      // A true zero on a zero-based axis draws nothing: a stub would claim an
      // hour had something in it. Elsewhere the floor still earns a 2px mark.
      if (bar.v !== null && !(zeroBased && bar.v === 0)) {
        let valY = yOf(bar.v);
        if (Math.abs(valY - baseY) < MIN_BAR) {
          valY = bar.v < 0 ? baseY + MIN_BAR : baseY - MIN_BAR;
        }
        marks.push(
          svg`<path class="bar ${i === nowIdx ? 'now' : 'past'}" d=${barPath(x, barW, baseY, valY)}></path>`
        );
      }
      // Full-column hover target — bigger than the mark, per interaction rules.
      const label = bar.v === null ? '—' : `${formatNumber(this.hass, config.entity, bar.v)}${unit}`;
      overlay.push(
        svg`<rect class="hit" x=${r1(x)} y="0" width=${r1(barW)} height=${plotH}>
          <title>${formatTime(this.hass, bar.ts / 1000, hours)} · ${label}</title>
        </rect>`
      );
    }
    if (zeroBased && floor < 0) {
      overlay.push(svg`<line class="zero" x1="0" y1=${r1(baseY)} x2=${size.w} y2=${r1(baseY)}></line>`);
    }
    const floorLabel = zeroBased
      ? nothing
      : svg`<text class="axis" x="0" y=${size.h - 1} text-anchor="start">${formatNumber(this.hass, config.entity, floor)}</text>`;

    return html`
      <svg width=${size.w} height=${size.h} aria-hidden="true">
        <g class="chart">${marks}${overlay}${floorLabel}</g>
      </svg>
    `;
  }

  /** `24h · avg 21.3 °C` — the window summed or averaged, matching the bars. */
  private _summary(unit: string): string {
    const data = this._data;
    const config = this._config;
    const hours = this._hours();
    if (!data || !config) return `${hours}h`;
    const finite = data.bars.map((b) => b.v).filter(isFinite2);
    if (!finite.length) return `${hours}h`;
    const total = finite.reduce((a, b) => a + b, 0);
    const value = data.mode === 'change' ? total : total / finite.length;
    const word = data.mode === 'change' ? 'total' : 'avg';
    return `${hours}h · ${word} ${formatNumber(this.hass, config.entity, value)}${unit}`;
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
    const bars = this._data?.bars;
    const latest = bars?.length ? bars[bars.length - 1].v : null;

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
              >${latest !== null ? formatNumber(hass, config.entity, latest) : '—'}</span
            >
            ${latest !== null && unit ? html`<span class="unit">${unit}</span>` : nothing}
          </div>
        </div>
        <div class="plot">${this._renderBars(unit ? ` ${unit}` : '')}</div>
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
        min-height: 28px;
      }
      .plot svg {
        position: absolute;
        inset: 0;
        display: block;
      }
      .bar.now {
        fill: var(--silk-accent);
      }
      .bar.past {
        fill: var(--silk-accent);
        fill-opacity: 0.35;
      }
      .zero {
        stroke: rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.18);
        stroke-width: 1;
        pointer-events: none;
      }
      .hit {
        fill: transparent;
      }
      .chart {
        animation: silk-sparkbar-in 250ms var(--silk-ease-out);
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
      @keyframes silk-sparkbar-in {
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
    'silk-sparkbar-card': SilkSparkbarCard;
  }
}
