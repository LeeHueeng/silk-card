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
import { resampleHold, niceDomain } from '../graph';
import { formatNumber, formatTime } from '../format';

export const META = {
  type: 'silk-scatter-card',
  name: 'Silk Scatter',
  description: 'Two sensors, one relationship.',
};

export interface SilkScatterCardConfig extends LovelaceCardConfig {
  /** X axis entity. */
  entity: string;
  /** Y axis entity. */
  entity2: string;
  name?: string;
  icon?: string;
  /** Accent override. */
  color?: string;
  hours_to_show?: number;
  /** Draw a least-squares fit line and print its r². */
  trend?: boolean;
}

/** One paired sample: both series resampled onto the same time grid. */
interface Pair {
  t: number;
  x: number;
  y: number;
}

const DEFAULT_HOURS = 24;
const MAX_HOURS = 24 * 30;
/** Both series are resampled onto this many slots, so pairing is by index. */
const POINTS = 96;
const DOT_R = 2;
const NOW_R = 3;
/** Oldest sample opacity; time is encoded as opacity, documented in the legend. */
const OLDEST_OPACITY = 0.25;
const LEFT_GUTTER = 30;
const BOTTOM_BAND = 12;
const TOP_PAD = 7;
const RIGHT_PAD = 7;
const REFRESH_INTERVAL_MS = 300_000;
const REFRESH_THROTTLE_MS = 60_000;

const r1 = (n: number): number => Math.round(n * 10) / 10;

/**
 * Liang–Barsky clip of a segment to the plot box, so a steep fit line stops at
 * the frame instead of drawing over the labels. Returns null when it misses.
 */
function clipToBox(
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  left: number,
  top: number,
  right: number,
  bottom: number
): [number, number, number, number] | null {
  const dx = x1 - x0;
  const dy = y1 - y0;
  let t0 = 0;
  let t1 = 1;
  const edges: [number, number][] = [
    [-dx, x0 - left],
    [dx, right - x0],
    [-dy, y0 - top],
    [dy, bottom - y0],
  ];
  for (const [p, q] of edges) {
    if (p === 0) {
      if (q < 0) return null; // parallel and outside
      continue;
    }
    const t = q / p;
    if (p < 0) {
      if (t > t1) return null;
      if (t > t0) t0 = t;
    } else {
      if (t < t0) return null;
      if (t < t1) t1 = t;
    }
  }
  return [x0 + t0 * dx, y0 + t0 * dy, x0 + t1 * dx, y0 + t1 * dy];
}

const EDITOR_TAG = 'silk-scatter-card-editor';

registerEditor(
  EDITOR_TAG,
  [
    {
      name: 'entity',
      required: true,
      selector: { entity: { domain: ['sensor', 'number', 'input_number'] } },
    },
    {
      name: 'entity2',
      required: true,
      selector: { entity: { domain: ['sensor', 'number', 'input_number'] } },
    },
    { name: 'name', selector: { text: {} } },
    {
      name: '',
      type: 'grid',
      schema: [
        { name: 'hours_to_show', selector: { number: { min: 1, max: MAX_HOURS, mode: 'box' } } },
        { name: 'trend', selector: { boolean: {} } },
      ],
    },
  ],
  {
    entity: 'X entity',
    entity2: 'Y entity',
    name: 'Name',
    hours_to_show: 'Hours to show',
    trend: 'Show trend line',
  },
  { hours_to_show: DEFAULT_HOURS, trend: false }
);

@customElement('silk-scatter-card')
export class SilkScatterCard extends LitElement {
  @property({ attribute: false }) public hass?: HomeAssistant;

  @state() private _config?: SilkScatterCardConfig;
  @state() private _pairs: Pair[] | null = null;
  /** True when neither entity returned usable history for the window. */
  @state() private _noData = false;
  /** Measured plot box; points are laid out in exact pixels from it. */
  @state() private _plot: { w: number; h: number } | null = null;

  private _fetchStarted = false;
  private _fetchSeq = 0;
  private _lastFetch = 0;
  private _lastStamp = '';
  private _refreshTimer?: number;
  private _intervalTimer?: number;
  private _resize?: ResizeObserver;

  public static getStubConfig(hass: HomeAssistant): Partial<SilkScatterCardConfig> {
    const ids = Object.keys(hass.states).filter(
      (id) => id.startsWith('sensor.') && Number.isFinite(Number(hass.states[id].state))
    );
    const byClass = (cls: string) =>
      ids.find((id) => hass.states[id].attributes.device_class === cls);
    const x = byClass('temperature') ?? ids[0];
    const y = byClass('humidity') ?? ids.find((id) => id !== x);
    return { type: 'custom:silk-scatter-card', entity: x, entity2: y };
  }

  public static async getConfigElement(): Promise<HTMLElement> {
    return document.createElement(EDITOR_TAG);
  }

  public setConfig(config: SilkScatterCardConfig): void {
    if (!config.entity || !config.entity2) {
      throw new Error('silk-scatter-card: `entity` (x) and `entity2` (y) are required');
    }
    if (config.hours_to_show !== undefined && !(Number(config.hours_to_show) > 0)) {
      throw new Error('silk-scatter-card: `hours_to_show` must be a positive number');
    }
    this._config = config;
    this._pairs = null;
    this._noData = false;
    this._fetchStarted = false;
    this._lastStamp = '';
  }

  public getCardSize(): number {
    return 3;
  }

  public getGridOptions(): Record<string, number> {
    return { columns: 6, rows: 3, min_columns: 4, min_rows: 2 };
  }

  public connectedCallback(): void {
    super.connectedCallback();
    this._intervalTimer = window.setInterval(() => this._refresh(), REFRESH_INTERVAL_MS);
    // On a DOM re-attach firstUpdated won't run again: re-observe and refetch.
    if (this.hasUpdated) {
      this._observePlot();
      if (this._fetchStarted) this._refresh();
    }
  }

  public disconnectedCallback(): void {
    super.disconnectedCallback();
    window.clearInterval(this._intervalTimer);
    window.clearTimeout(this._refreshTimer);
    this._refreshTimer = undefined;
    this._resize?.disconnect();
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
    return clamp(Math.round(this._config?.hours_to_show ?? DEFAULT_HOURS), 1, MAX_HOURS);
  }

  /** Refetch when either entity records a new state, throttled to 60s. */
  private _onStatesChanged(): void {
    const config = this._config!;
    const a = this.hass?.states[config.entity]?.last_updated ?? '';
    const b = this.hass?.states[config.entity2]?.last_updated ?? '';
    if (!a && !b) return;
    const stamp = `${a}|${b}`;
    if (stamp === this._lastStamp) return;
    this._lastStamp = stamp;
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
    const hours = this._hours();
    const seq = ++this._fetchSeq;
    const end = Date.now() / 1000;
    const start = end - hours * 3600;
    let data: Record<string, Point[]>;
    try {
      data = await fetchSeries(hass, [config.entity, config.entity2], start, end, hours);
    } catch (err) {
      console.warn('silk-scatter-card: history fetch failed', err);
      return;
    }
    if (seq !== this._fetchSeq) return; // a newer fetch superseded this one
    this._lastFetch = Date.now();
    // Both series land on the same grid of POINTS slots, so index i is the same
    // instant on both axes — that identity is what makes the pairing honest.
    const xs = resampleHold(data[config.entity] ?? [], start, end, POINTS);
    const ys = resampleHold(data[config.entity2] ?? [], start, end, POINTS);
    const pairs: Pair[] = [];
    for (let i = 0; i < POINTS; i++) {
      const x = xs[i];
      const y = ys[i];
      if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
      pairs.push({ t: start + ((end - start) * i) / (POINTS - 1), x, y });
    }
    this._pairs = pairs;
    this._noData = pairs.length === 0;
  }

  /** Least-squares fit over the pairs, plus r² (0–1). */
  private _fit(pairs: Pair[]): { slope: number; intercept: number; r2: number } | null {
    const n = pairs.length;
    if (n < 3) return null;
    let sx = 0;
    let sy = 0;
    for (const p of pairs) {
      sx += p.x;
      sy += p.y;
    }
    const mx = sx / n;
    const my = sy / n;
    let sxx = 0;
    let syy = 0;
    let sxy = 0;
    for (const p of pairs) {
      const dx = p.x - mx;
      const dy = p.y - my;
      sxx += dx * dx;
      syy += dy * dy;
      sxy += dx * dy;
    }
    if (sxx <= 0) return null; // a vertical cloud has no y-on-x fit
    const slope = sxy / sxx;
    return {
      slope,
      intercept: my - slope * mx,
      r2: syy > 0 ? (sxy * sxy) / (sxx * syy) : 0,
    };
  }

  private _onCardClick(): void {
    if (!this._config) return;
    haptic(this);
    moreInfo(this, this._config.entity);
  }

  private _renderPlot(xUnit: string, yUnit: string): TemplateResult | typeof nothing {
    if (this._noData) {
      return html`<div class="note">No overlapping history</div>`;
    }
    const size = this._plot;
    const pairs = this._pairs;
    const config = this._config;
    if (!size || !pairs || !pairs.length || !config) return nothing;
    const boxW = size.w - LEFT_GUTTER - RIGHT_PAD;
    const boxH = size.h - BOTTOM_BAND - TOP_PAD;
    if (boxW <= 12 || boxH <= 12) return nothing;

    const xArr = Float64Array.from(pairs.map((p) => p.x));
    const yArr = Float64Array.from(pairs.map((p) => p.y));
    const [xLo, xHi] = niceDomain([xArr]);
    const [yLo, yHi] = niceDomain([yArr]);
    const xSpan = xHi - xLo || 1;
    const ySpan = yHi - yLo || 1;
    const pxOf = (v: number): number => LEFT_GUTTER + ((v - xLo) / xSpan) * boxW;
    const pyOf = (v: number): number => TOP_PAD + (1 - (v - yLo) / ySpan) * boxH;
    const left = LEFT_GUTTER;
    const right = LEFT_GUTTER + boxW;
    const top = TOP_PAD;
    const bottom = TOP_PAD + boxH;

    const hours = this._hours();
    const fmtX = (v: number): string => formatNumber(this.hass, config.entity, v);
    const fmtY = (v: number): string => formatNumber(this.hass, config.entity2, v);

    const dots: SVGTemplateResult[] = [];
    const last = pairs.length - 1;
    for (let i = 0; i < pairs.length; i++) {
      const p = pairs[i];
      const newest = i === last;
      // Opacity carries time: oldest 25% → newest full. Same hue throughout.
      const op = OLDEST_OPACITY + (1 - OLDEST_OPACITY) * (last ? i / last : 1);
      dots.push(
        svg`<circle
          class="dot ${newest ? 'now' : ''}"
          cx=${r1(pxOf(p.x))}
          cy=${r1(pyOf(p.y))}
          r=${newest ? NOW_R : DOT_R}
          style="opacity:${newest ? 1 : r1(op * 100) / 100}"
        ><title>${newest ? 'now' : formatTime(this.hass, p.t, hours)} · ${fmtX(p.x)}${xUnit} · ${fmtY(p.y)}${yUnit}</title></circle>`
      );
    }

    let trend: SVGTemplateResult | typeof nothing = nothing;
    const fit = config.trend ? this._fit(pairs) : null;
    if (fit) {
      const seg = clipToBox(
        pxOf(xLo),
        pyOf(fit.intercept + fit.slope * xLo),
        pxOf(xHi),
        pyOf(fit.intercept + fit.slope * xHi),
        left,
        top,
        right,
        bottom
      );
      if (seg) {
        trend = svg`<line class="trend" x1=${r1(seg[0])} y1=${r1(seg[1])} x2=${r1(seg[2])} y2=${r1(seg[3])}>
          <title>Least-squares fit · r² ${fit.r2.toFixed(2)}</title>
        </line>`;
      }
    }

    return html`
      <svg width=${size.w} height=${size.h} aria-hidden="true">
        <g class="chart">
          <text class="axis" x=${LEFT_GUTTER - 4} y=${top + 4} text-anchor="end">${fmtY(yHi)}</text>
          <text class="axis" x=${LEFT_GUTTER - 4} y=${bottom} text-anchor="end">${fmtY(yLo)}</text>
          <text class="axis" x=${left} y=${size.h - 2} text-anchor="start">${fmtX(xLo)}</text>
          <text class="axis" x=${right} y=${size.h - 2} text-anchor="end">${fmtX(xHi)}</text>
          ${trend}${dots}
        </g>
      </svg>
    `;
  }

  protected render(): TemplateResult | typeof nothing {
    const config = this._config;
    if (!config) return nothing;
    const hass = this.hass;
    const xObj = hass?.states[config.entity];
    const yObj = hass?.states[config.entity2];
    if (hass && (!xObj || !yObj)) {
      return html`<ha-card
        ><div class="warning">Entity not found: ${!xObj ? config.entity : config.entity2}</div></ha-card
      >`;
    }

    const unavailable = isUnavailable(xObj) && isUnavailable(yObj);
    const accent = accentFor(xObj, config.color);
    const xName = (xObj?.attributes.friendly_name as string | undefined) ?? config.entity;
    const yName = (yObj?.attributes.friendly_name as string | undefined) ?? config.entity2;
    const name = config.name ?? `${yName} vs ${xName}`;
    const xUnit = (xObj?.attributes.unit_of_measurement as string | undefined) ?? '';
    const yUnit = (yObj?.attributes.unit_of_measurement as string | undefined) ?? '';
    const fit = config.trend && this._pairs ? this._fit(this._pairs) : null;

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
              : html`<ha-state-icon .hass=${hass} .stateObj=${xObj}></ha-state-icon>`}
          </div>
          <div class="info">
            <div class="name">${name}</div>
            <div class="state">
              ${xName}${xUnit ? ` (${xUnit})` : ''}<span class="sep">→</span>${yName}${yUnit
                ? ` (${yUnit})`
                : ''}
            </div>
          </div>
          ${fit
            ? html`<div class="trailing"><span class="r2">r² ${fit.r2.toFixed(2)}</span></div>`
            : nothing}
        </div>
        <div class="plot">
          ${this._renderPlot(xUnit ? ` ${xUnit}` : '', yUnit ? ` ${yUnit}` : '')}
        </div>
        <div class="legend">
          <span class="ramp" aria-hidden="true"
            ><i style="opacity:0.25"></i><i style="opacity:0.5"></i><i style="opacity:0.75"></i
            ><i></i
          ></span>
          <span class="legend-text">older → newer</span>
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
      .state .sep {
        opacity: 0.5;
        margin: 0 4px;
      }
      .r2 {
        font-size: 12.5px;
        font-weight: 600;
        color: var(--secondary-text-color);
        font-variant-numeric: tabular-nums;
        white-space: nowrap;
      }
      .plot {
        position: relative;
        flex: 1;
        min-height: 60px;
      }
      .plot svg {
        position: absolute;
        inset: 0;
        display: block;
      }
      .dot {
        fill: var(--silk-accent);
      }
      /* The newest sample carries a card-colored rim so it stays findable in
         a dense cloud — the only "now" mark on the chart. */
      .dot.now {
        stroke: var(--card-background-color, #fff);
        stroke-width: 1;
      }
      .trend {
        stroke: var(--silk-accent);
        stroke-width: 1.5;
        stroke-dasharray: 3 3;
        stroke-linecap: round;
        opacity: 0.7;
      }
      .chart {
        animation: silk-scatter-in 300ms var(--silk-ease-out);
      }
      .axis {
        font-size: 10px;
        fill: var(--primary-text-color);
        opacity: 0.45;
        font-variant-numeric: tabular-nums;
        pointer-events: none;
      }
      .legend {
        flex: none;
        display: flex;
        align-items: center;
        gap: 6px;
        min-width: 0;
        font-size: 10px;
        line-height: 1;
        color: var(--secondary-text-color);
      }
      .ramp {
        flex: none;
        display: flex;
        align-items: center;
        gap: 3px;
      }
      .ramp i {
        display: block;
        width: 4px;
        height: 4px;
        border-radius: 50%;
        background: var(--silk-accent);
      }
      .legend-text {
        min-width: 0;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
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
      .unavailable .plot,
      .unavailable .legend {
        opacity: 0.45;
      }
      @keyframes silk-scatter-in {
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
    'silk-scatter-card': SilkScatterCard;
  }
}
