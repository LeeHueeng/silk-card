import { LitElement, html, svg, css, nothing, PropertyValues, TemplateResult } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { HomeAssistant, SilkCardConfig, SeriesConfig, Point } from '../types';
import { fetchSeries } from '../data';
import {
  resampleHold,
  niceDomain,
  toPxYs,
  buildLinePath,
  buildAreaPath,
  firstFiniteIndex,
  lastFiniteIndex,
  extremeIndices,
  easeOutCubic,
  easeOutQuart,
} from '../graph';
import { formatNumber, formatDelta, formatTime } from '../format';
import '../editor';

export const META = {
  type: 'silk-card',
  name: 'Silk Graph',
  description: 'Buttery-smooth, interactive history graph. Scrub it, zoom it, watch it morph.',
};

const PALETTE = [
  'var(--primary-color, #4aa8ff)',
  '#ef6c6c',
  '#5ec78d',
  '#f0b357',
  '#a97ee8',
  '#e879b9',
  '#6ad4d4',
];

const DEFAULT_RANGES = ['1h', '12h', '1d', '1w', '1m'];
const RANGE_UNIT_HOURS: Record<string, number> = { h: 1, d: 24, w: 168, m: 720 };
const REFRESH_THROTTLE_MS = 15_000;
const REFRESH_INTERVAL_MS = 300_000;

let uidCounter = 0;

function parseRange(range: string): number | null {
  const match = /^(\d+)([hdwm])$/i.exec(range.trim());
  if (!match) return null;
  return Number(match[1]) * RANGE_UNIT_HOURS[match[2].toLowerCase()];
}

@customElement('silk-card')
export class SilkCard extends LitElement {
  @property({ attribute: false }) public hass?: HomeAssistant;

  @state() private _config?: SilkCardConfig;
  @state() private _hours = 24;
  @state() private _scrubIndex: number | null = null;
  @state() private _focusIndex: number | null = null;
  @state() private _width = 0;
  @state() private _height = 0;
  @state() private _drawProgress = 0;
  @state() private _rev = 0;

  private _uid = `silk${++uidCounter}`;
  private _seriesCfgs: SeriesConfig[] = [];
  private _points: Point[][] = [];
  private _vals: Float64Array[] = [];
  private _pxYs: Float64Array[] = [];
  private _domain: [number, number] = [0, 1];
  private _windowStart = 0;
  private _windowEnd = 0;
  private _hasDrawn = false;
  private _fetchStarted = false;
  private _fetchSeq = 0;
  private _lastFetch = 0;
  private _refreshTimer?: number;
  private _intervalTimer?: number;
  private _animId?: number;
  private _resizeObserver?: ResizeObserver;
  private _lastUpdated: Record<string, string> = {};

  public static getStubConfig(hass: HomeAssistant): Partial<SilkCardConfig> {
    const ids = Object.keys(hass.states).filter(
      (id) =>
        id.startsWith('sensor.') &&
        Number.isFinite(Number(hass.states[id].state)) &&
        hass.states[id].attributes.unit_of_measurement
    );
    const temp = ids.find((id) => hass.states[id].attributes.device_class === 'temperature');
    return { type: 'custom:silk-card', entity: temp ?? ids[0] };
  }

  public static async getConfigElement(): Promise<HTMLElement> {
    return document.createElement('silk-card-editor');
  }

  public setConfig(config: SilkCardConfig): void {
    if (!config.entity && !config.entities?.length) {
      throw new Error('silk-card: define an `entity` or a list of `entities`');
    }
    const raw = config.entities ?? [config.entity!];
    this._seriesCfgs = raw.map((item, i) => {
      const obj = typeof item === 'string' ? { entity: item } : item;
      return {
        entity: obj.entity,
        name: obj.name,
        color: obj.color ?? config.color ?? PALETTE[i % PALETTE.length],
      };
    });
    this._config = config;
    this._hours = config.hours_to_show ?? 24;
    this._fetchStarted = false;
    this._hasDrawn = false;
    this._vals = [];
    this._pxYs = [];
    this._focusIndex = null;
  }

  public getCardSize(): number {
    return 3;
  }

  public getGridOptions(): Record<string, number> {
    return { columns: 12, rows: 3, min_rows: 2, min_columns: 4 };
  }

  public connectedCallback(): void {
    super.connectedCallback();
    this._intervalTimer = window.setInterval(() => this._refresh(true), REFRESH_INTERVAL_MS);
  }

  public disconnectedCallback(): void {
    super.disconnectedCallback();
    window.clearInterval(this._intervalTimer);
    window.clearTimeout(this._refreshTimer);
    if (this._animId) cancelAnimationFrame(this._animId);
    this._resizeObserver?.disconnect();
    this._resizeObserver = undefined;
  }

  protected willUpdate(changed: PropertyValues): void {
    if (!this.hass || !this._config) return;
    if (!this._fetchStarted) {
      this._fetchStarted = true;
      this._refresh(false);
      return;
    }
    if (changed.has('hass')) this._onStatesChanged();
  }

  protected updated(): void {
    if (this._resizeObserver) return;
    const graph = this.renderRoot.querySelector('.graph');
    if (!graph) return;
    this._resizeObserver = new ResizeObserver((entries) => {
      const rect = entries[0].contentRect;
      if (rect.width === this._width && rect.height === this._height) return;
      this._width = rect.width;
      this._height = rect.height;
      this._recompute(false);
    });
    this._resizeObserver.observe(graph);
  }

  private _onStatesChanged(): void {
    let changed = false;
    for (const cfg of this._seriesCfgs) {
      const stamp = this.hass!.states[cfg.entity]?.last_updated;
      if (stamp && stamp !== this._lastUpdated[cfg.entity]) {
        this._lastUpdated[cfg.entity] = stamp;
        changed = true;
      }
    }
    if (!changed || this._refreshTimer) return;
    const wait = Math.max(0, REFRESH_THROTTLE_MS - (Date.now() - this._lastFetch));
    this._refreshTimer = window.setTimeout(() => {
      this._refreshTimer = undefined;
      this._refresh(true);
    }, wait);
  }

  private async _refresh(morph: boolean): Promise<void> {
    if (!this.hass || !this._seriesCfgs.length) return;
    const seq = ++this._fetchSeq;
    const end = Date.now() / 1000;
    const start = end - this._hours * 3600;
    let data: Record<string, Point[]>;
    try {
      data = await fetchSeries(
        this.hass,
        this._seriesCfgs.map((s) => s.entity),
        start,
        end,
        this._hours
      );
    } catch (err) {
      console.warn('silk-card: history fetch failed', err);
      return;
    }
    if (seq !== this._fetchSeq) return; // a newer fetch superseded this one
    this._lastFetch = Date.now();
    this._windowStart = start;
    this._windowEnd = end;
    const n = this._config?.points ?? 120;
    this._points = this._seriesCfgs.map((s) => data[s.entity] ?? []);
    this._vals = this._points.map((pts) => resampleHold(pts, start, end, n));
    this._domain = niceDomain(this._vals, this._config?.y_min, this._config?.y_max);
    this._recompute(morph);
  }

  private _recompute(morph: boolean): void {
    if (!this._vals.length || !this._width || !this._height) return;
    const extremes = this._config?.extremes !== false;
    const padTop = extremes ? 22 : 10;
    const padBottom = extremes ? 18 : 8;
    const target = this._vals.map((vals) => toPxYs(vals, this._domain, this._height, padTop, padBottom));
    this._setDisplay(target, morph);
  }

  private _setDisplay(target: Float64Array[], morph: boolean): void {
    if (this._animId) cancelAnimationFrame(this._animId);
    const canMorph =
      morph && this._pxYs.length === target.length && this._pxYs[0]?.length === target[0]?.length;
    if (!canMorph) {
      this._pxYs = target;
      this._rev++;
      if (!this._hasDrawn) {
        this._hasDrawn = true;
        this._animateDrawIn();
      } else {
        this._drawProgress = 1;
      }
      return;
    }
    const from = this._pxYs.map((arr) => Float64Array.from(arr));
    const t0 = performance.now();
    const duration = 420;
    const step = (now: number) => {
      const p = Math.min((now - t0) / duration, 1);
      const e = easeOutCubic(p);
      for (let i = 0; i < target.length; i++) {
        const src = from[i];
        const dst = target[i];
        const cur = this._pxYs[i];
        for (let j = 0; j < dst.length; j++) {
          const f = src[j];
          const t = dst[j];
          cur[j] = !Number.isFinite(f) || !Number.isFinite(t) ? (p < 0.5 ? f : t) : f + (t - f) * e;
        }
      }
      this._rev++;
      if (p < 1) this._animId = requestAnimationFrame(step);
    };
    this._animId = requestAnimationFrame(step);
  }

  private _animateDrawIn(): void {
    const t0 = performance.now();
    const duration = 900;
    const step = (now: number) => {
      const p = Math.min((now - t0) / duration, 1);
      this._drawProgress = easeOutQuart(p);
      if (p < 1) this._animId = requestAnimationFrame(step);
    };
    this._animId = requestAnimationFrame(step);
  }

  private _selectRange(hours: number): void {
    if (hours === this._hours) return;
    this._hours = hours;
    this._scrubIndex = null;
    this._refresh(true);
  }

  private _onPointerDown(ev: PointerEvent): void {
    (ev.currentTarget as HTMLElement).setPointerCapture(ev.pointerId);
    this._scrub(ev);
  }

  private _onPointerMove(ev: PointerEvent): void {
    if (this._scrubIndex === null) return;
    this._scrub(ev);
  }

  private _onPointerEnd(): void {
    this._scrubIndex = null;
  }

  private _scrub(ev: PointerEvent): void {
    if (!this._width || !this._vals.length) return;
    const rect = (ev.currentTarget as HTMLElement).getBoundingClientRect();
    const x = Math.min(Math.max(ev.clientX - rect.left, 0), this._width);
    const n = this._vals[0].length;
    this._scrubIndex = Math.round((x / this._width) * (n - 1));
  }

  private _toggleFocus(index: number): void {
    this._focusIndex = this._focusIndex === index ? null : index;
  }

  private get _primaryIndex(): number {
    return this._focusIndex ?? 0;
  }

  private _valueAt(seriesIndex: number, sampleIndex: number): number {
    return this._vals[seriesIndex]?.[sampleIndex] ?? NaN;
  }

  private _timeAt(sampleIndex: number): number {
    const n = this._vals[0]?.length ?? 1;
    return this._windowStart + ((this._windowEnd - this._windowStart) * sampleIndex) / Math.max(n - 1, 1);
  }

  protected render(): TemplateResult | typeof nothing {
    if (!this._config) return nothing;
    void this._rev; // reactive dependency for imperative data updates
    const hass = this.hass;
    const primaryCfg = this._seriesCfgs[this._primaryIndex];
    const stateObj = hass?.states[primaryCfg.entity];
    if (hass && !stateObj) {
      return html`<ha-card><div class="warning">Entity not found: ${primaryCfg.entity}</div></ha-card>`;
    }

    const scrubbing = this._scrubIndex !== null && this._vals.length > 0;
    const value = scrubbing
      ? this._valueAt(this._primaryIndex, this._scrubIndex!)
      : Number(stateObj?.state);
    const unit = this._config.unit ?? stateObj?.attributes.unit_of_measurement ?? '';
    const name =
      this._config.name ?? primaryCfg.name ?? stateObj?.attributes.friendly_name ?? primaryCfg.entity;

    return html`
      <ha-card>
        <div class="header">
          <div class="title-row">
            <span class="name">
              ${this._config.icon ? html`<ha-icon .icon=${this._config.icon}></ha-icon>` : nothing}
              ${name}
            </span>
            ${this._renderRangeChips()}
          </div>
          <div class="value-row">
            <span class="value">${formatNumber(hass, primaryCfg.entity, value)}</span>
            <span class="unit">${unit}</span>
            ${scrubbing ? this._renderScrubTime() : this._renderDelta(primaryCfg.entity)}
          </div>
          ${this._seriesCfgs.length > 1 ? this._renderLegend() : nothing}
        </div>
        <div
          class="graph"
          @pointerdown=${this._onPointerDown}
          @pointermove=${this._onPointerMove}
          @pointerup=${this._onPointerEnd}
          @pointercancel=${this._onPointerEnd}
        >
          ${this._renderSvg()}
        </div>
      </ha-card>
    `;
  }

  private _renderRangeChips(): TemplateResult | typeof nothing {
    if (this._config?.range_selector === false) return nothing;
    const ranges = this._config?.ranges ?? DEFAULT_RANGES;
    return html`
      <span class="ranges">
        ${ranges.map((label) => {
          const hours = parseRange(label);
          if (hours === null) return nothing;
          return html`
            <button
              class="chip ${hours === this._hours ? 'active' : ''}"
              @click=${() => this._selectRange(hours)}
            >
              ${label.toUpperCase()}
            </button>
          `;
        })}
      </span>
    `;
  }

  private _renderDelta(entityId: string): TemplateResult | typeof nothing {
    if (this._config?.delta === false || !this._vals.length) return nothing;
    const vals = this._vals[this._primaryIndex];
    const first = firstFiniteIndex(vals);
    const last = lastFiniteIndex(vals);
    if (first < 0 || last <= first) return nothing;
    const delta = vals[last] - vals[first];
    return html`<span class="delta">${formatDelta(this.hass, entityId, delta)}</span>`;
  }

  private _renderScrubTime(): TemplateResult {
    return html`<span class="scrub-time">${formatTime(this.hass, this._timeAt(this._scrubIndex!), this._hours)}</span>`;
  }

  private _renderLegend(): TemplateResult {
    return html`
      <div class="legend">
        ${this._seriesCfgs.map((cfg, i) => {
          const stateObj = this.hass?.states[cfg.entity];
          const label = cfg.name ?? stateObj?.attributes.friendly_name ?? cfg.entity;
          const dim = this._focusIndex !== null && this._focusIndex !== i;
          return html`
            <button class="legend-chip ${dim ? 'dim' : ''}" @click=${() => this._toggleFocus(i)}>
              <span class="dot" style="background:${cfg.color}"></span>
              ${label}
            </button>
          `;
        })}
      </div>
    `;
  }

  private _renderSvg(): TemplateResult | typeof nothing {
    const w = this._width;
    const h = this._height;
    if (!w || !h || !this._pxYs.length) return nothing;
    const lineWidth = this._config?.line_width ?? 2.5;
    const fill = this._config?.fill !== false;
    const clipId = `${this._uid}-clip`;

    return html`
      <svg viewBox="0 0 ${w} ${h}" width=${w} height=${h}>
        <defs>
          <clipPath id=${clipId}>
            <rect x="0" y="0" width=${w * this._drawProgress} height=${h}></rect>
          </clipPath>
          ${this._seriesCfgs.map(
            (cfg, i) => svg`
              <linearGradient id="${this._uid}-fill-${i}" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stop-color="currentColor" stop-opacity="0.30" style="color:${cfg.color}"></stop>
                <stop offset="100%" stop-color="currentColor" stop-opacity="0.02" style="color:${cfg.color}"></stop>
              </linearGradient>
            `
          )}
        </defs>
        <g clip-path="url(#${clipId})">
          ${this._seriesCfgs.map((cfg, i) => this._renderSeries(cfg, i, w, h, lineWidth, fill))}
        </g>
        ${this._renderExtremes(w)}
        ${this._renderScrubOverlay(w, h)}
      </svg>
    `;
  }

  private _renderSeries(
    cfg: SeriesConfig,
    i: number,
    w: number,
    h: number,
    lineWidth: number,
    fill: boolean
  ): TemplateResult {
    const ys = this._pxYs[i];
    const dim = this._focusIndex !== null && this._focusIndex !== i;
    const line = buildLinePath(ys, w);
    const area = fill ? buildAreaPath(ys, w, h) : '';
    const last = lastFiniteIndex(ys);
    const lastX = last >= 0 ? (last / (ys.length - 1)) * w : 0;
    return svg`
      <g style="color:${cfg.color}" opacity=${dim ? 0.22 : 1} class="series">
        ${fill ? svg`<path class="area" d=${area} fill="url(#${this._uid}-fill-${i})"></path>` : nothing}
        <path
          class="line"
          d=${line}
          fill="none"
          stroke="currentColor"
          stroke-width=${lineWidth}
          stroke-linecap="round"
          stroke-linejoin="round"
        ></path>
        ${
          last >= 0 && this._drawProgress >= 1
            ? svg`
              <circle class="pulse" cx=${lastX} cy=${ys[last]} r="4" fill="currentColor"></circle>
              <circle cx=${lastX} cy=${ys[last]} r="3" fill="currentColor"></circle>
            `
            : nothing
        }
      </g>
    `;
  }

  private _renderExtremes(w: number): TemplateResult | typeof nothing {
    if (this._config?.extremes === false || !this._pxYs.length) return nothing;
    const i = this._primaryIndex;
    const vals = this._vals[i];
    const ys = this._pxYs[i];
    if (!vals) return nothing;
    const { min, max } = extremeIndices(vals);
    if (min < 0 || max < 0 || min === max) return nothing;
    const entity = this._seriesCfgs[i].entity;
    const mark = (idx: number, below: boolean) => {
      const x = (idx / (vals.length - 1)) * w;
      const anchor = x < 40 ? 'start' : x > w - 40 ? 'end' : 'middle';
      return svg`
        <circle cx=${x} cy=${ys[idx]} r="2.5" class="extreme-dot"></circle>
        <text x=${x} y=${ys[idx] + (below ? 14 : -8)} text-anchor=${anchor} class="extreme-label">
          ${formatNumber(this.hass, entity, vals[idx])}
        </text>
      `;
    };
    return svg`${mark(max, false)}${mark(min, true)}`;
  }

  private _renderScrubOverlay(w: number, h: number): TemplateResult | typeof nothing {
    if (this._scrubIndex === null || !this._pxYs.length) return nothing;
    const n = this._pxYs[0].length;
    const x = (this._scrubIndex / (n - 1)) * w;
    return svg`
      <line x1=${x} y1="0" x2=${x} y2=${h} class="scrub-line"></line>
      ${this._pxYs.map((ys, i) => {
        const y = ys[this._scrubIndex!];
        if (!Number.isFinite(y)) return nothing;
        return svg`<circle cx=${x} cy=${y} r="4.5" class="scrub-dot" style="color:${this._seriesCfgs[i].color}" fill="currentColor"></circle>`;
      })}
    `;
  }

  static styles = css`
    :host {
      display: block;
      height: 100%;
    }
    ha-card {
      height: 100%;
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }
    .warning {
      padding: 16px;
      color: var(--error-color, #db4437);
    }
    .header {
      padding: 14px 16px 2px;
    }
    .title-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      min-height: 24px;
    }
    .name {
      font-size: 14px;
      font-weight: 500;
      color: var(--secondary-text-color);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      display: inline-flex;
      align-items: center;
      gap: 6px;
    }
    .name ha-icon {
      --mdc-icon-size: 18px;
      color: var(--secondary-text-color);
    }
    .ranges {
      display: inline-flex;
      gap: 4px;
      flex-shrink: 0;
    }
    .chip {
      border: none;
      font: inherit;
      font-size: 11px;
      font-weight: 600;
      letter-spacing: 0.02em;
      padding: 3px 8px;
      border-radius: 999px;
      cursor: pointer;
      color: var(--secondary-text-color);
      background: rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.06);
      transition: background 0.15s ease, color 0.15s ease;
    }
    .chip:hover {
      background: rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.12);
    }
    .chip.active {
      color: var(--primary-color);
      background: rgba(var(--rgb-primary-color, 74, 168, 255), 0.14);
    }
    .value-row {
      display: flex;
      align-items: baseline;
      gap: 6px;
      margin-top: 2px;
    }
    .value {
      font-size: 28px;
      font-weight: 600;
      letter-spacing: -0.02em;
      line-height: 1.15;
      color: var(--primary-text-color);
      font-variant-numeric: tabular-nums;
    }
    .unit {
      font-size: 15px;
      font-weight: 500;
      color: var(--secondary-text-color);
    }
    .delta,
    .scrub-time {
      font-size: 13px;
      font-weight: 500;
      color: var(--secondary-text-color);
      margin-left: 4px;
      font-variant-numeric: tabular-nums;
    }
    .legend {
      display: flex;
      flex-wrap: wrap;
      gap: 4px 8px;
      margin-top: 6px;
    }
    .legend-chip {
      border: none;
      background: none;
      font: inherit;
      font-size: 12px;
      color: var(--secondary-text-color);
      display: inline-flex;
      align-items: center;
      gap: 5px;
      padding: 2px 0;
      cursor: pointer;
      transition: opacity 0.15s ease;
    }
    .legend-chip.dim {
      opacity: 0.35;
    }
    .legend-chip .dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
    }
    .graph {
      flex: 1;
      position: relative;
      min-height: 80px;
      cursor: crosshair;
      touch-action: pan-y;
    }
    svg {
      position: absolute;
      inset: 0;
      display: block;
      overflow: visible;
    }
    .extreme-dot {
      fill: var(--secondary-text-color);
      opacity: 0.7;
    }
    .extreme-label {
      font-size: 10px;
      font-weight: 500;
      fill: var(--secondary-text-color);
      opacity: 0.8;
      font-variant-numeric: tabular-nums;
    }
    .scrub-line {
      stroke: var(--secondary-text-color);
      stroke-width: 1;
      opacity: 0.4;
    }
    .scrub-dot {
      stroke: var(--card-background-color, #fff);
      stroke-width: 2;
    }
    .pulse {
      animation: silk-pulse 2.4s ease-out infinite;
      transform-box: fill-box;
      transform-origin: center;
    }
    @keyframes silk-pulse {
      0% {
        transform: scale(1);
        opacity: 0.5;
      }
      70% {
        transform: scale(3.2);
        opacity: 0;
      }
      100% {
        transform: scale(3.2);
        opacity: 0;
      }
    }
  `;
}

/** Alias so `custom:silk-graph-card` also works, matching the suite naming. */
@customElement('silk-graph-card')
export class SilkGraphCard extends SilkCard {}

declare global {
  interface HTMLElementTagNameMap {
    'silk-card': SilkCard;
    'silk-graph-card': SilkGraphCard;
  }
}
