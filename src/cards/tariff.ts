import { LitElement, html, svg, css, nothing, TemplateResult, SVGTemplateResult } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { HomeAssistant, HassEntity, LovelaceCardConfig } from '../types';
import { silkControlStyles } from '../shared/base';
import { isUnavailable, moreInfo, clamp } from '../shared/service';
import { accentFor } from '../shared/color';
import { registerRowsEditor } from '../shared/rows';

export const META = {
  type: 'silk-tariff-card',
  name: 'Silk Tariff',
  description: "Today's electricity price, hour by hour.",
};

/** A price band: applies when `above <= price`. The highest match wins. */
export interface TariffLevel {
  above: number;
  color: string;
}

export interface SilkTariffCardConfig extends LovelaceCardConfig {
  entity: string;
  name?: string;
  /** Price unit; defaults to the entity's own unit_of_measurement. */
  unit?: string;
  /** Absolute price bands; replaces the relative default banding. */
  levels?: TariffLevel[];
  /** Accent override. */
  color?: string;
}

/**
 * Price bands are genuine status semantics — cheap / normal / expensive — so
 * they earn status colors. Without configured levels the thirds are relative
 * to today's own range, which is what makes a flat day read as flat.
 */
const CHEAP = '#5ec78d';
const MID = '#e6a23c';
const EXPENSIVE = '#ef6c6c';

const GAP = 2;
const BAR_RADIUS = 4;
const MIN_BAR = 2;
/** Top band reserved for the direct value labels. */
const TOP_BAND = 12;
/** Room under the baseline: only negative prices need a label band down there. */
const BOTTOM_BAND = 2;
const BOTTOM_BAND_NEG = 12;
/** Approximate advance width of the 10px tabular label glyphs. */
const LABEL_CH = 5.6;
const MAX_HOURS = 24;
/** Re-render this long after each hour boundary so "now" keeps up. */
const HOURLY_SLACK_MS = 2_000;

/** Attributes that commonly hold a day of hourly prices, in priority order. */
const FORECAST_KEYS = ['raw_today', 'today', 'prices'];
const VALUE_KEYS = ['value', 'price', 'total', 'cost', 'amount'];
const TIME_KEYS = ['start', 'hour', 'time', 'datetime', 'from', 'start_time'];

interface PricePoint {
  /** Local hour of day, 0–23. */
  hour: number;
  value: number;
}

const r1 = (n: number): number => Math.round(n * 10) / 10;

/** Numeric state, NaN when the entity is missing/unavailable/non-numeric. */
function numericState(stateObj?: HassEntity): number {
  if (!stateObj || isUnavailable(stateObj) || stateObj.state === '') return NaN;
  const v = Number(stateObj.state);
  return Number.isFinite(v) ? v : NaN;
}

/** Local hour from an item's time field: hour index, epoch, or ISO string. */
function hourOf(raw: unknown): number {
  if (typeof raw === 'number' && Number.isFinite(raw)) {
    if (raw >= 0 && raw <= 23) return raw;
    // Epoch seconds and epoch milliseconds both show up in the wild.
    const ms = raw > 1e11 ? raw : raw * 1000;
    return new Date(ms).getHours();
  }
  const text = String(raw ?? '');
  const parsed = Date.parse(text);
  if (Number.isFinite(parsed)) return new Date(parsed).getHours();
  const n = Number(text);
  if (Number.isFinite(n) && n >= 0 && n <= 23) return n;
  return NaN;
}

/**
 * Pull a day of hourly prices out of the entity's attributes. Integrations
 * disagree on both the array key and the item shape (Nordpool ships bare
 * numbers in `today` and `{start,value}` objects in `raw_today`; Tibber-style
 * ones use `{startsAt,total}`), so every common shape is accepted and the
 * result is normalised to one point per local hour.
 */
function parseForecast(attributes: Record<string, any>): PricePoint[] | null {
  for (const key of FORECAST_KEYS) {
    const raw = attributes[key];
    if (!Array.isArray(raw) || raw.length < 2) continue;
    const byHour = new Map<number, number>();
    raw.forEach((item: unknown, index: number) => {
      let value = NaN;
      let hour = NaN;
      if (typeof item === 'number') {
        value = item;
      } else if (item && typeof item === 'object') {
        const row = item as Record<string, unknown>;
        for (const k of VALUE_KEYS) {
          const n = Number(row[k]);
          if (row[k] !== undefined && row[k] !== null && Number.isFinite(n)) {
            value = n;
            break;
          }
        }
        for (const k of TIME_KEYS) {
          if (row[k] === undefined || row[k] === null) continue;
          hour = hourOf(row[k]);
          if (Number.isFinite(hour)) break;
        }
      }
      if (!Number.isFinite(value)) return;
      // Position is the last resort — plain number arrays are hour-indexed.
      if (!Number.isFinite(hour)) hour = index;
      hour = Math.round(hour);
      if (hour < 0 || hour > 23 || byHour.has(hour)) return;
      byHour.set(hour, value);
    });
    if (byHour.size >= 2) {
      return [...byHour.entries()]
        .map(([hour, value]) => ({ hour, value }))
        .sort((a, b) => a.hour - b.hour)
        .slice(0, MAX_HOURS);
    }
  }
  return null;
}

/** Bar with rounded corners on the end that points away from the baseline. */
function barPath(x: number, w: number, top: number, bottom: number, up: boolean): string {
  const h = bottom - top;
  const r = Math.min(BAR_RADIUS, w / 2, h);
  if (up) {
    return (
      `M${r1(x)},${r1(bottom)} V${r1(top + r)} Q${r1(x)},${r1(top)} ${r1(x + r)},${r1(top)} ` +
      `H${r1(x + w - r)} Q${r1(x + w)},${r1(top)} ${r1(x + w)},${r1(top + r)} V${r1(bottom)} Z`
    );
  }
  return (
    `M${r1(x)},${r1(top)} V${r1(bottom - r)} Q${r1(x)},${r1(bottom)} ${r1(x + r)},${r1(bottom)} ` +
    `H${r1(x + w - r)} Q${r1(x + w)},${r1(bottom)} ${r1(x + w)},${r1(bottom - r)} V${r1(top)} Z`
  );
}

const EDITOR_TAG = 'silk-tariff-card-editor';

// Price bands are a list of {above, color} rows — the one part of this card a
// flat form cannot express, so it gets the repeater instead of YAML.
registerRowsEditor(EDITOR_TAG, {
  field: 'levels',
  title: '가격 구간 (비우면 오늘 범위의 1/3씩)',
  addLabel: '구간 추가',
  blank: { above: 0, color: 'green' },
  row: [
    {
      name: 'above',
      label: '이 가격 이상',
      selector: { number: { mode: 'box', step: 'any' } },
    },
    { name: 'color', label: '색상', selector: { ui_color: {} } },
  ],
  schema: [
    { name: 'entity', required: true, selector: { entity: { domain: ['sensor'] } } },
    { name: 'name', selector: { text: {} } },
    {
      name: '',
      type: 'grid',
      schema: [
        { name: 'unit', selector: { text: {} } },
        { name: 'color', selector: { ui_color: {} } },
      ],
    },
  ],
  labels: { entity: '엔티티', name: '이름', unit: '단위', color: '강조 색상' },
});

@customElement('silk-tariff-card')
export class SilkTariffCard extends LitElement {
  @property({ attribute: false }) public hass?: HomeAssistant;

  @state() private _config?: SilkTariffCardConfig;
  /** Measured plot box; bars are laid out in exact pixels from it. */
  @state() private _plot: { w: number; h: number } | null = null;
  /** Wall-clock hour, so "now" moves without a state change. */
  @state() private _hour = new Date().getHours();

  private _levels: TariffLevel[] = [];
  private _hourlyTimer?: number;
  private _resize?: ResizeObserver;

  public static getStubConfig(hass: HomeAssistant): Partial<SilkTariffCardConfig> {
    const ids = Object.keys(hass.states).filter((id) => id.startsWith('sensor.'));
    const withForecast = ids.find((id) => parseForecast(hass.states[id].attributes) !== null);
    const monetary = ids.find((id) => hass.states[id].attributes.device_class === 'monetary');
    return { type: 'custom:silk-tariff-card', entity: withForecast ?? monetary ?? ids[0] };
  }

  public static async getConfigElement(): Promise<HTMLElement> {
    return document.createElement(EDITOR_TAG);
  }

  public setConfig(config: SilkTariffCardConfig): void {
    if (!config.entity) {
      throw new Error('silk-tariff-card: `entity` is required');
    }
    if (config.levels !== undefined && !Array.isArray(config.levels)) {
      throw new Error('silk-tariff-card: `levels` must be a list of {above, color}');
    }
    this._levels = (config.levels ?? [])
      .filter(
        (level): level is TariffLevel =>
          typeof level?.above === 'number' &&
          Number.isFinite(level.above) &&
          typeof level?.color === 'string'
      )
      .sort((a, b) => a.above - b.above);
    this._config = config;
  }

  public getCardSize(): number {
    return 2;
  }

  public getGridOptions(): Record<string, number> {
    return { columns: 6, rows: 2, min_columns: 4, min_rows: 2 };
  }

  public connectedCallback(): void {
    super.connectedCallback();
    this._hour = new Date().getHours();
    this._scheduleHourly();
    // firstUpdated does not run again on a DOM re-attach: re-observe the box.
    if (this.hasUpdated) this._observePlot();
  }

  public disconnectedCallback(): void {
    super.disconnectedCallback();
    window.clearTimeout(this._hourlyTimer);
    this._resize?.disconnect();
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

  /** Wake just after the hour turns so the accent bar moves with the clock. */
  private _scheduleHourly(): void {
    window.clearTimeout(this._hourlyTimer);
    const now = Date.now();
    const next = (Math.floor(now / 3_600_000) + 1) * 3_600_000 + HOURLY_SLACK_MS;
    this._hourlyTimer = window.setTimeout(() => {
      this._hour = new Date().getHours();
      this._scheduleHourly();
    }, next - now);
  }

  private _locale(): string {
    return this.hass?.locale?.language ?? this.hass?.language ?? 'en';
  }

  /**
   * Prices need finer precision than a generic sensor: a tenth of a cent is
   * the whole story on a €/kWh tariff. The entity's own display precision
   * wins when it declares one. Chosen once per card from the largest value on
   * screen, so every number in the chart shares one scale.
   */
  private _digits(reference: number): number {
    const declared = this.hass?.entities?.[this._config!.entity]?.display_precision;
    if (declared !== undefined) return declared;
    const abs = Math.abs(reference);
    return abs >= 100 ? 0 : abs >= 1 ? 2 : 3;
  }

  private _price(value: number, digits: number): string {
    if (!Number.isFinite(value)) return '—';
    return new Intl.NumberFormat(this._locale(), {
      minimumFractionDigits: digits,
      maximumFractionDigits: digits,
    }).format(value);
  }

  private _hourText(hour: number): string {
    const d = new Date();
    d.setHours(hour, 0, 0, 0);
    return new Intl.DateTimeFormat(this._locale(), { hour: 'numeric', minute: '2-digit' }).format(d);
  }

  /** Band color for a price: configured levels first, else today's thirds. */
  private _levelColor(value: number, lo: number, hi: number): string {
    if (this._levels.length) {
      for (let i = this._levels.length - 1; i >= 0; i--) {
        if (this._levels[i].above <= value) return this._levels[i].color;
      }
      return CHEAP;
    }
    const span = hi - lo;
    if (!(span > 0)) return CHEAP;
    if (value <= lo + span / 3) return CHEAP;
    if (value <= lo + (2 * span) / 3) return MID;
    return EXPENSIVE;
  }

  private _onCardClick(): void {
    if (this._config) moreInfo(this, this._config.entity);
  }

  private _renderBars(
    points: PricePoint[],
    nowIdx: number,
    unit: string,
    digits: number
  ): TemplateResult | typeof nothing {
    const size = this._plot;
    if (!size) return nothing;
    const n = points.length;
    const values = points.map((p) => p.value);
    const minV = Math.min(...values);
    const maxV = Math.max(...values);
    const bottomBand = minV < 0 ? BOTTOM_BAND_NEG : BOTTOM_BAND;
    const plotH = size.h - TOP_BAND - bottomBand;
    const pitch = (size.w + GAP) / n; // bar + gap; no gap trails the last bar
    const barW = pitch - GAP;
    if (barW <= 1 || plotH <= 8) return nothing;

    const avg = values.reduce((sum, v) => sum + v, 0) / n;
    // Bars are magnitudes, so they must grow from zero; a negative price
    // (it happens) hangs below the same baseline instead of being flipped.
    const lo = Math.min(0, minV);
    const hi = Math.max(0, maxV);
    const span = hi - lo || 1;
    const yOf = (v: number): number => TOP_BAND + ((hi - v) / span) * plotH;
    const zeroY = yOf(0);

    const marks: SVGTemplateResult[] = [];
    const hits: SVGTemplateResult[] = [];
    const tops: number[] = [];
    const bottoms: number[] = [];
    let nowX = -1;

    for (let i = 0; i < n; i++) {
      const v = values[i];
      const x = i * pitch;
      const up = v >= 0;
      const edge = yOf(v);
      const top = up ? Math.min(edge, zeroY - MIN_BAR) : zeroY;
      const bottom = up ? zeroY : Math.max(edge, zeroY + MIN_BAR);
      tops.push(top);
      bottoms.push(bottom);
      const isNow = i === nowIdx;
      if (isNow) nowX = x;
      marks.push(
        svg`<path
          class="bar ${isNow ? 'now' : i < nowIdx ? 'past' : 'ahead'}"
          style=${isNow ? '' : `fill:${this._levelColor(v, minV, maxV)}`}
          d=${barPath(x, barW, top, bottom, up)}
        ></path>`
      );
      hits.push(
        svg`<rect class="hit" x=${r1(x)} y="0" width=${r1(barW)} height=${size.h}>
          <title>${this._hourText(points[i].hour)} · ${this._price(v, digits)}${unit ? ` ${unit}` : ''}</title>
        </rect>`
      );
    }

    // Three numbers only — now, max, min — and each is dropped rather than
    // allowed to collide with one already placed. Later bars win ties on
    // min/max so the label sits nearest the current hour.
    const labels: SVGTemplateResult[] = [];
    const placed: [number, number][] = [];
    const seen = new Set<number>();
    for (const i of [nowIdx, values.indexOf(maxV), values.indexOf(minV)]) {
      if (i < 0 || seen.has(i)) continue;
      seen.add(i);
      const text = this._price(values[i], digits);
      const half = (text.length * LABEL_CH) / 2;
      const cx = clamp(i * pitch + barW / 2, half, Math.max(half, size.w - half));
      if (placed.some(([a, b]) => cx - half < b + 3 && cx + half > a - 3)) continue;
      placed.push([cx - half, cx + half]);
      const up = values[i] >= 0;
      const y = up
        ? Math.max(9, tops[i] - 3)
        : Math.min(size.h - 1, bottoms[i] + 9);
      labels.push(
        svg`<text class="val ${i === nowIdx ? 'now' : ''}" x=${r1(cx)} y=${r1(y)} text-anchor="middle">${text}</text>`
      );
    }

    const avgY = r1(yOf(avg)) + 0.5;
    const baseY = Math.round(zeroY) + 0.5;

    return html`
      <svg width=${size.w} height=${size.h} aria-hidden="true">
        <g class="chart">
          <line class="avg" x1="0" y1=${avgY} x2=${size.w} y2=${avgY}>
            <title>Average · ${this._price(avg, digits)}${unit ? ` ${unit}` : ''}</title>
          </line>
          ${marks}
          <line class="base" x1="0" y1=${baseY} x2=${size.w} y2=${baseY}></line>
          ${nowX >= 0
            ? svg`<line class="base now" x1=${r1(nowX)} y1=${baseY} x2=${r1(nowX + barW)} y2=${baseY}></line>`
            : nothing}
          ${labels}${hits}
        </g>
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
    const unit =
      config.unit ?? (stateObj?.attributes.unit_of_measurement as string | undefined) ?? '';
    const points = stateObj ? parseForecast(stateObj.attributes) : null;
    const nowIdx = points ? points.findIndex((p) => p.hour === this._hour) : -1;

    // The live state is the authority on the current price; the forecast slot
    // stands in when the sensor itself is not a price readout.
    const stateValue = numericState(stateObj);
    const current = Number.isFinite(stateValue)
      ? stateValue
      : points && nowIdx >= 0
        ? points[nowIdx].value
        : NaN;
    // One precision for the header and every label, set by the biggest number
    // on screen — mixed decimals would break the tabular column.
    const reference = Math.max(
      Number.isFinite(current) ? Math.abs(current) : 0,
      ...(points ? points.map((p) => Math.abs(p.value)) : [0])
    );
    const digits = this._digits(reference);

    return html`
      <ha-card
        class="control ${unavailable ? 'unavailable' : ''}"
        style="--silk-accent:${accent}"
        @click=${this._onCardClick}
      >
        <div class="head">
          <div class="info"><div class="name" title=${name}>${name}</div></div>
          <div class="trailing">
            <span class="price">${this._price(current, digits)}</span>
            ${unit ? html`<span class="unit">${unit}</span>` : nothing}
          </div>
        </div>
        <div class="plot">
          ${points
            ? this._renderBars(points, nowIdx, unit, digits)
            : html`<div class="note">No hourly forecast on this entity</div>`}
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
      .head {
        flex: none;
        display: flex;
        align-items: baseline;
        gap: 10px;
        min-width: 0;
      }
      .trailing {
        align-items: baseline;
        gap: 3px;
      }
      .price {
        font-size: 20px;
        font-weight: 600;
        line-height: 1.1;
        letter-spacing: -0.02em;
        color: var(--primary-text-color);
        font-variant-numeric: tabular-nums;
        white-space: nowrap;
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
      .chart {
        animation: silk-tariff-in 250ms var(--silk-ease-out);
      }
      .bar {
        transition: fill 200ms ease;
      }
      .bar.past {
        fill-opacity: 0.4;
      }
      .bar.ahead {
        fill-opacity: 0.75;
      }
      .bar.now {
        fill: var(--silk-accent);
      }
      /* Recessive reference lines: the data reads first. */
      .avg {
        stroke: rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.28);
        stroke-width: 1;
        stroke-dasharray: 3 3;
      }
      .base {
        stroke: rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.14);
        stroke-width: 1;
        shape-rendering: crispEdges;
      }
      .base.now {
        stroke: var(--silk-accent);
      }
      .val {
        font-size: 10px;
        font-weight: 500;
        fill: var(--primary-text-color);
        opacity: 0.65;
        font-variant-numeric: tabular-nums;
        pointer-events: none;
      }
      .val.now {
        opacity: 0.9;
      }
      .hit {
        fill: transparent;
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
      @keyframes silk-tariff-in {
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
    'silk-tariff-card': SilkTariffCard;
  }
}
