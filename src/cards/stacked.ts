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
import { HomeAssistant, LovelaceCardConfig, SeriesUserConfig, Point } from '../types';
import { silkControlStyles } from '../shared/base';
import { isUnavailable, moreInfo, haptic, clamp } from '../shared/service';
import { accentFor } from '../shared/color';
import { registerEditor } from '../shared/editor';
import { fetchSeries } from '../data';
import { resampleHold, toPxYs } from '../graph';
import { formatNumber } from '../format';

export const META = {
  type: 'silk-stacked-card',
  name: 'Silk Stacked',
  description: 'How the whole splits over time.',
};

export interface SilkStackedCardConfig extends LovelaceCardConfig {
  entities: (string | SeriesUserConfig)[];
  name?: string;
  hours_to_show?: number;
  /** Unit override for the header total. */
  unit?: string;
}

/**
 * The shared Silk categorical palette. Order is the contract: band 1 always
 * takes the primary accent, so two stacked cards side by side agree. Six
 * colors, no seventh — beyond that a stack stops being readable.
 */
const PALETTE = [
  'var(--primary-color, #4aa8ff)',
  '#ef6c6c',
  '#5ec78d',
  '#f0b357',
  '#a97ee8',
  '#e879b9',
];

const MAX_SERIES = 6;
const DEFAULT_HOURS = 24;
const PAD_TOP = 10;
const PAD_BOTTOM = 6;
/** Surface-colored seam drawn on every shared edge, so bands never touch. */
const SEAM = 2;
const REFRESH_INTERVAL_MS = 300_000;
const REFRESH_THROTTLE_MS = 20_000;

interface Series {
  entity: string;
  name?: string;
  color: string;
}

interface Band {
  /** Closed area between this band's top edge and the one below it. */
  fill: string;
  /** The top edge alone, stroked in the card surface color as the seam. */
  edge: string;
  /** True for every band except the topmost — only shared edges get a seam. */
  seam: boolean;
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

const r1 = (n: number): string => (Math.round(n * 10) / 10).toString();

const EDITOR_TAG = 'silk-stacked-card-editor';

registerEditor(
  EDITOR_TAG,
  [
    {
      name: 'entities',
      required: true,
      selector: { entity: { multiple: true, domain: ['counter', 'input_number', 'number', 'sensor'] } },
    },
    { name: 'name', selector: { text: {} } },
    { name: 'hours_to_show', selector: { number: { min: 1, mode: 'box' } } },
  ],
  {
    entities: `Entities (up to ${MAX_SERIES})`,
    name: 'Name',
    hours_to_show: 'Hours to show',
  },
  { hours_to_show: DEFAULT_HOURS }
);

@customElement('silk-stacked-card')
export class SilkStackedCard extends LitElement {
  @property({ attribute: false }) public hass?: HomeAssistant;

  @state() private _config?: SilkStackedCardConfig;
  @state() private _bands: Band[] | null = null;
  /** Index of the isolated band, or null when the whole stack is shown. */
  @state() private _isolated: number | null = null;
  @state() private _plot: { w: number; h: number } | null = null;
  @state() private _failed = false;

  private _series: Series[] = [];
  private _points: Point[][] = [];
  private _windowStart = 0;
  private _windowEnd = 0;
  private _fetchStarted = false;
  private _fetchSeq = 0;
  private _lastFetch = 0;
  private _lastUpdated: Record<string, string> = {};
  private _refreshTimer?: number;
  private _intervalTimer?: number;
  private _resize?: ResizeObserver;
  private _connection?: HassWithConnection['connection'];
  private readonly _onWsReady = (): void => {
    this._refresh();
  };

  public static getStubConfig(hass: HomeAssistant): Partial<SilkStackedCardConfig> {
    const numeric = Object.keys(hass.states).filter(
      (id) =>
        id.startsWith('sensor.') &&
        hass.states[id].state !== '' &&
        Number.isFinite(Number(hass.states[id].state))
    );
    const byClass = (cls: string) =>
      numeric.filter((id) => hass.states[id].attributes.device_class === cls);
    const pick = byClass('power').length >= 2 ? byClass('power') : numeric;
    return { type: 'custom:silk-stacked-card', entities: pick.slice(0, 3) };
  }

  public static async getConfigElement(): Promise<HTMLElement> {
    return document.createElement(EDITOR_TAG);
  }

  public setConfig(config: SilkStackedCardConfig): void {
    if (!Array.isArray(config.entities) || !config.entities.length) {
      throw new Error('silk-stacked-card: `entities` must be a non-empty list');
    }
    if (config.entities.length > MAX_SERIES) {
      throw new Error(`silk-stacked-card: at most ${MAX_SERIES} entities can be stacked`);
    }
    if (config.hours_to_show !== undefined && !(Number(config.hours_to_show) > 0)) {
      throw new Error('silk-stacked-card: `hours_to_show` must be a positive number');
    }
    this._series = config.entities.map((item, i) => {
      const obj: SeriesUserConfig = typeof item === 'string' ? { entity: item } : item;
      if (!obj?.entity || typeof obj.entity !== 'string') {
        throw new Error('silk-stacked-card: every entry needs an `entity`');
      }
      return { entity: obj.entity, name: obj.name, color: obj.color ?? PALETTE[i] };
    });
    this._config = config;
    this._bands = null;
    this._points = [];
    this._isolated = null;
    this._failed = false;
    this._fetchStarted = false;
    this._lastUpdated = {};
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
    this._resize = undefined;
    this._connection?.removeEventListener('ready', this._onWsReady);
    this._connection = undefined;
  }

  protected willUpdate(changed: PropertyValues): void {
    if (!this.hass || !this._config) return;
    if (!this._connection) {
      const conn = (this.hass as HassWithConnection).connection;
      if (conn) {
        conn.addEventListener('ready', this._onWsReady);
        this._connection = conn;
      }
    }
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
        if (this._plot && this._plot.w === w && this._plot.h === h) return;
        this._plot = { w, h };
        this._rebuild();
      });
    }
    this._resize.observe(el);
  }

  /** Refetch when any tracked entity records a new state, throttled. */
  private _onStatesChanged(): void {
    let moved = false;
    for (const s of this._series) {
      const stamp = this.hass!.states[s.entity]?.last_updated;
      if (stamp && stamp !== this._lastUpdated[s.entity]) {
        this._lastUpdated[s.entity] = stamp;
        moved = true;
      }
    }
    if (!moved || this._refreshTimer) return;
    const wait = Math.max(0, REFRESH_THROTTLE_MS - (Date.now() - this._lastFetch));
    this._refreshTimer = window.setTimeout(() => {
      this._refreshTimer = undefined;
      this._refresh();
    }, wait);
  }

  private _hours(): number {
    return Number(this._config?.hours_to_show ?? DEFAULT_HOURS);
  }

  private async _refresh(): Promise<void> {
    const hass = this.hass;
    if (!hass || !this._series.length) return;
    const hours = this._hours();
    const seq = ++this._fetchSeq;
    const end = Date.now() / 1000;
    const start = end - hours * 3600;
    let data: Record<string, Point[]>;
    try {
      data = await fetchSeries(
        hass,
        this._series.map((s) => s.entity),
        start,
        end,
        hours
      );
    } catch (err) {
      console.warn('silk-stacked-card: history fetch failed', err);
      if (seq === this._fetchSeq && !this._bands) this._failed = true;
      return;
    }
    if (seq !== this._fetchSeq) return; // a newer fetch superseded this one
    this._lastFetch = Date.now();
    this._failed = false;
    this._windowStart = start;
    this._windowEnd = end;
    this._points = this._series.map((s) => data[s.entity] ?? []);
    this._rebuild();
  }

  /**
   * Resample every series onto one shared grid (roughly a sample every 2px, so
   * straight segments read as a curve) and stack them in config order.
   * Non-finite and negative samples count as zero: a stack only means anything
   * when every part adds to the whole.
   */
  private _rebuild(): void {
    const size = this._plot;
    if (!size || size.w < 8 || size.h < 16 || !this._points.length) return;
    const n = clamp(Math.round(size.w / 2), 24, 240);
    const start = this._windowStart;
    const end = this._windowEnd;
    if (end <= start) return;

    const running = new Float64Array(n);
    const tops: Float64Array[] = [];
    let peak = 0;
    for (const pts of this._points) {
      const raw = resampleHold(pts, start, end, n);
      const top = new Float64Array(n);
      for (let i = 0; i < n; i++) {
        const v = raw[i];
        running[i] += Number.isFinite(v) && v > 0 ? v : 0;
        top[i] = running[i];
        if (running[i] > peak) peak = running[i];
      }
      tops.push(top);
    }
    if (peak <= 0) {
      this._bands = [];
      return;
    }

    const domain: [number, number] = [0, peak * 1.08];
    const pxTops = tops.map((arr) => toPxYs(arr, domain, size.h, PAD_TOP, PAD_BOTTOM));
    const baseline = new Float64Array(n).fill(size.h - PAD_BOTTOM);
    const bands: Band[] = [];
    for (let i = 0; i < pxTops.length; i++) {
      const below = i === 0 ? baseline : pxTops[i - 1];
      bands.push({
        fill: this._areaPath(pxTops[i], below, size.w),
        edge: this._edgePath(pxTops[i], size.w),
        seam: i < pxTops.length - 1,
      });
    }
    this._bands = bands;
  }

  private _areaPath(top: Float64Array, bottom: Float64Array, w: number): string {
    const n = top.length;
    const dx = n > 1 ? w / (n - 1) : 0;
    const parts: string[] = [`M${r1(0)},${r1(top[0])}`];
    for (let i = 1; i < n; i++) parts.push(`L${r1(i * dx)},${r1(top[i])}`);
    for (let i = n - 1; i >= 0; i--) parts.push(`L${r1(i * dx)},${r1(bottom[i])}`);
    parts.push('Z');
    return parts.join('');
  }

  private _edgePath(top: Float64Array, w: number): string {
    const n = top.length;
    const dx = n > 1 ? w / (n - 1) : 0;
    const parts: string[] = [`M${r1(0)},${r1(top[0])}`];
    for (let i = 1; i < n; i++) parts.push(`L${r1(i * dx)},${r1(top[i])}`);
    return parts.join('');
  }

  private _label(s: Series): string {
    return s.name ?? this.hass?.states[s.entity]?.attributes.friendly_name ?? s.entity;
  }

  /** Current numeric value of a series; NaN when it has none right now. */
  private _now(entity: string): number {
    const stateObj = this.hass?.states[entity];
    if (!stateObj || isUnavailable(stateObj)) return NaN;
    const v = Number(stateObj.state);
    return Number.isFinite(v) ? v : NaN;
  }

  private _unit(): string {
    return (
      this._config?.unit ??
      (this.hass?.states[this._series[0]?.entity]?.attributes.unit_of_measurement as
        | string
        | undefined) ??
      ''
    );
  }

  private _onChipClick(ev: Event, index: number): void {
    ev.stopPropagation();
    haptic(this, 'selection');
    this._isolated = this._isolated === index ? null : index;
  }

  private _onCardClick(): void {
    const s = this._series[this._isolated ?? 0];
    if (s) moreInfo(this, s.entity);
  }

  private _renderBands(): TemplateResult | typeof nothing {
    if (this._failed) {
      return html`<div class="note">History unavailable</div>`;
    }
    const size = this._plot;
    const bands = this._bands;
    if (!size || !bands) return nothing;
    if (!bands.length) {
      return html`<div class="note">Nothing recorded in this window</div>`;
    }
    const unit = this._unit();
    const total = this._series.reduce((sum, s) => {
      const v = this._now(s.entity);
      return sum + (Number.isFinite(v) && v > 0 ? v : 0);
    }, 0);

    const marks: SVGTemplateResult[] = [];
    // Painted bottom-up so each seam sits over the band it separates.
    bands.forEach((band, i) => {
      const s = this._series[i];
      const dim = this._isolated !== null && this._isolated !== i;
      const v = this._now(s.entity);
      const share =
        total > 0 && Number.isFinite(v) && v > 0 ? `${Math.round((v / total) * 100)}%` : '—';
      const value = Number.isFinite(v) ? `${formatNumber(this.hass, s.entity, v)}${unit}` : '—';
      marks.push(svg`
        <path
          class="band ${dim ? 'dim' : ''}"
          d=${band.fill}
          fill=${s.color}
        ><title>${this._label(s)} · ${value} · ${share} of now</title></path>
      `);
      if (band.seam) {
        // The seam follows its band: an isolated stack needs no dividers.
        marks.push(svg`<path class="seam ${dim ? 'dim' : ''}" d=${band.edge}></path>`);
      }
    });

    return html`
      <svg width=${size.w} height=${size.h} aria-hidden="true">
        <g class="stack">${marks}</g>
      </svg>
    `;
  }

  private _renderLegend(): TemplateResult {
    const unit = this._unit();
    return html`
      <div class="legend">
        ${this._series.map((s, i) => {
          const v = this._now(s.entity);
          const dim = this._isolated !== null && this._isolated !== i;
          return html`
            <button
              class="lg ${dim ? 'dim' : ''}"
              aria-pressed=${this._isolated === i ? 'true' : 'false'}
              title=${this._label(s)}
              @click=${(ev: Event) => this._onChipClick(ev, i)}
            >
              <span class="dot" style="background:${s.color}"></span>
              <span class="lgname">${this._label(s)}</span>
              <span class="lgval"
                >${Number.isFinite(v) ? `${formatNumber(this.hass, s.entity, v)}${unit}` : '—'}</span
              >
            </button>
          `;
        })}
      </div>
    `;
  }

  protected render(): TemplateResult | typeof nothing {
    const config = this._config;
    const hass = this.hass;
    if (!config || !hass) return nothing;

    const missing = this._series.filter((s) => !hass.states[s.entity]);
    if (missing.length === this._series.length) {
      return html`<ha-card
        ><div class="warning">Entity not found: ${missing[0].entity}</div></ha-card
      >`;
    }
    const allOut = this._series.every((s) => isUnavailable(hass.states[s.entity]));
    const accent = accentFor(hass.states[this._series[0].entity], config.color);
    const unit = this._unit();
    const total = this._series.reduce((sum, s) => {
      const v = this._now(s.entity);
      return sum + (Number.isFinite(v) && v > 0 ? v : 0);
    }, 0);
    const name = config.name ?? 'Stacked';

    return html`
      <ha-card
        class="control ${allOut ? 'unavailable' : ''}"
        style="--silk-accent:${accent}"
        @click=${this._onCardClick}
      >
        <div class="top">
          <div class="info">
            <div class="name" title=${name}>${name}</div>
            <div class="state">Last ${this._hours()}h</div>
          </div>
          <div class="trailing">
            <span class="value"
              >${allOut ? '—' : formatNumber(hass, this._series[0].entity, total)}</span
            >
            ${unit && !allOut ? html`<span class="unit">${unit}</span>` : nothing}
          </div>
        </div>
        <div class="plot">${this._renderBands()}</div>
        ${this._renderLegend()}
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
      .stack {
        animation: silk-stacked-in 260ms var(--silk-ease-out);
      }
      .band {
        fill-opacity: 0.55;
        transition: opacity 200ms ease;
      }
      .band.dim {
        opacity: 0.12;
      }
      /* The seam is the card surface showing through, never a colored outline. */
      .seam {
        fill: none;
        stroke: var(--card-background-color, #fff);
        stroke-width: ${SEAM};
        stroke-linejoin: round;
        pointer-events: none;
        transition: opacity 200ms ease;
      }
      .seam.dim {
        opacity: 0.12;
      }
      .legend {
        flex: none;
        display: flex;
        flex-wrap: wrap;
        gap: 4px 6px;
        margin: 0 -4px -2px;
      }
      .lg {
        display: inline-flex;
        align-items: center;
        gap: 5px;
        max-width: 100%;
        min-height: 22px;
        margin: 0;
        padding: 2px 6px;
        border: none;
        border-radius: 999px;
        background: none;
        font: inherit;
        font-size: 11.5px;
        color: var(--secondary-text-color);
        cursor: pointer;
        outline: none;
        transition: opacity 150ms ease, background 150ms ease-out;
      }
      .lg:hover {
        background: rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.06);
      }
      .lg:focus-visible {
        box-shadow: inset 0 0 0 2px color-mix(in srgb, var(--silk-accent) 70%, transparent);
      }
      .lg.dim {
        opacity: 0.4;
      }
      .dot {
        flex: none;
        width: 8px;
        height: 8px;
        border-radius: 50%;
        opacity: 0.85;
      }
      .lgname {
        min-width: 0;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .lgval {
        flex: none;
        color: var(--primary-text-color);
        font-weight: 500;
        font-variant-numeric: tabular-nums;
      }
      .note {
        position: absolute;
        inset: 0;
        display: grid;
        place-items: center;
        padding: 0 8px;
        font-size: 12px;
        color: var(--secondary-text-color);
        text-align: center;
      }
      .unavailable .plot,
      .unavailable .legend {
        opacity: 0.45;
      }
      @keyframes silk-stacked-in {
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
    'silk-stacked-card': SilkStackedCard;
  }
}
