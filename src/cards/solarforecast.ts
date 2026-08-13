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
import { HomeAssistant, HassEntity, LovelaceCardConfig, Point } from '../types';
import { silkControlStyles } from '../shared/base';
import { isUnavailable, moreInfo, clamp } from '../shared/service';
import { accentFor } from '../shared/color';
import { registerEditor } from '../shared/editor';
import { fetchSeries } from '../data';
import {
  resampleHold,
  niceDomain,
  toPxYs,
  buildLinePath,
  buildAreaPath,
  lastFiniteIndex,
} from '../graph';

export const META = {
  type: 'silk-solar-forecast-card',
  name: 'Silk Solar Forecast',
  description: 'What the roof should make today.',
};

export interface SilkSolarForecastCardConfig extends LovelaceCardConfig {
  /** Forecast sensor carrying an hourly production curve in its attributes. */
  entity: string;
  /** Live production sensor (W or kW) — drawn as the solid "so far" line. */
  actual?: string;
  name?: string;
  icon?: string;
  /** Accent override. */
  color?: string;
}

/**
 * One point of the expected-production curve. `t` is epoch ms, `w` is watts —
 * everything is normalized to watts on the way in so the two lines share one
 * axis (this card never draws a second y-axis).
 *
 * Supported attribute shapes, checked in this order:
 *
 *   attributes.watts     Forecast.Solar — `{ "2026-08-13 07:00:00": 120, … }`
 *                        in W, or an array of `{ datetime, watts }`.
 *   attributes.forecast  Solcast/generic — an array of
 *                        `{ period_start|datetime|start, pv_estimate (kW) |
 *                        watts|power (W) | value (W) }`, or the same map shape.
 *   attributes.wh_hours  Forecast.Solar — `{ "2026-08-13 07:00:00": 120, … }`,
 *                        Wh accumulated inside that hour. Wh over one hour is
 *                        numerically the average power in W, so the numbers
 *                        plot unchanged; only the day total is summed instead
 *                        of integrated, which keeps it exact.
 */
interface Sample {
  t: number;
  w: number;
}

/** Value keys in priority order, with the factor that turns them into watts. */
const VALUE_KEYS: [string, number][] = [
  ['watts', 1],
  ['power', 1],
  ['pv_estimate', 1000],
  ['pv_estimate10', 1000],
  ['pv_estimate90', 1000],
  ['value', 1],
];

const TIME_KEYS = ['datetime', 'period_start', 'start', 'time'];

/** 15-minute grid across the day: 96 intervals, 97 samples. */
const SAMPLES = 97;
const PER_HOUR = 4;
/** Headroom for the peak label. */
const TOP_BAND = 14;
/** Bottom band for the hour labels. */
const LABEL_BAND = 12;
const REFRESH_INTERVAL_MS = 300_000;
const REFRESH_THROTTLE_MS = 60_000;
/** The `now` hairline and the day window move on a one-minute tick. */
const TICK_MS = 60_000;
const HOUR_MS = 3_600_000;

const EDITOR_TAG = 'silk-solar-forecast-card-editor';

registerEditor(
  EDITOR_TAG,
  [
    { name: 'entity', required: true, selector: { entity: { domain: ['sensor'] } } },
    { name: 'actual', selector: { entity: { domain: ['sensor'], device_class: 'power' } } },
    { name: 'name', selector: { text: {} } },
    { name: 'icon', selector: { icon: {} } },
  ],
  {
    entity: 'Forecast sensor (hourly watts)',
    actual: 'Live production (W)',
    name: 'Name',
    icon: 'Icon',
  }
);

/** Local midnight (ms) for a timestamp — DST-proof, unlike epoch arithmetic. */
function localDayStart(ms: number): number {
  const d = new Date(ms);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

function localDayEnd(ms: number): number {
  const d = new Date(ms);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1).getTime();
}

/** Epoch ms from an ISO string, a "YYYY-MM-DD HH:mm:ss" key, or a number. */
function parseTime(raw: unknown): number | null {
  if (typeof raw === 'number' && Number.isFinite(raw)) {
    // Seconds and milliseconds both appear in the wild.
    return raw > 1e11 ? raw : raw * 1000;
  }
  if (typeof raw !== 'string') return null;
  const t = Date.parse(raw.includes('T') ? raw : raw.replace(' ', 'T'));
  return Number.isFinite(t) ? t : null;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function fromMap(map: Record<string, unknown>): Sample[] {
  const out: Sample[] = [];
  for (const [key, raw] of Object.entries(map)) {
    const t = parseTime(key);
    const w = Number(raw);
    if (t !== null && Number.isFinite(w)) out.push({ t, w });
  }
  return out;
}

function fromArray(rows: unknown[]): Sample[] {
  const out: Sample[] = [];
  for (const row of rows) {
    if (!isPlainObject(row)) continue;
    let t: number | null = null;
    for (const key of TIME_KEYS) {
      t = parseTime(row[key]);
      if (t !== null) break;
    }
    if (t === null) continue;
    for (const [key, scale] of VALUE_KEYS) {
      const w = Number(row[key]);
      if (Number.isFinite(w)) {
        out.push({ t, w: w * scale });
        break;
      }
    }
  }
  return out;
}

function readShape(source: unknown): Sample[] {
  if (Array.isArray(source)) return fromArray(source);
  if (isPlainObject(source)) return fromMap(source);
  return [];
}

/** Factor that turns the entity's own unit into watts. */
function unitScaleOf(stateObj?: HassEntity): number {
  const unit = String(stateObj?.attributes.unit_of_measurement ?? 'W').trim();
  if (unit === 'kW') return 1000;
  if (unit === 'MW') return 1_000_000;
  if (unit === 'mW') return 0.001;
  return 1;
}

/** Numeric state in watts, NaN when the entity cannot speak. */
function powerWatts(stateObj?: HassEntity): number {
  if (!stateObj || isUnavailable(stateObj) || stateObj.state === '') return NaN;
  const value = Number(stateObj.state);
  if (!Number.isFinite(value)) return NaN;
  return value * unitScaleOf(stateObj);
}

/** Trapezoid integral of watts over time, in watt-hours. */
function integrateWh(samples: Sample[], from: number, to: number): number {
  let wh = 0;
  for (let i = 0; i < samples.length - 1; i++) {
    const a = samples[i];
    const b = samples[i + 1];
    const span = b.t - a.t;
    if (!(span > 0)) continue;
    const t0 = Math.max(a.t, from);
    const t1 = Math.min(b.t, to);
    if (t1 <= t0) continue;
    const w0 = a.w + ((t0 - a.t) / span) * (b.w - a.w);
    const w1 = a.w + ((t1 - a.t) / span) * (b.w - a.w);
    wh += ((w0 + w1) / 2) * ((t1 - t0) / HOUR_MS);
  }
  return wh;
}

/**
 * Linear resample onto n evenly spaced samples. Hourly forecast points are a
 * curve, not a step function, so this interpolates rather than holding; outside
 * the covered range it stays NaN so the line simply stops being drawn.
 */
function resampleLinear(samples: Sample[], start: number, end: number, n: number): Float64Array {
  const out = new Float64Array(n).fill(NaN);
  if (samples.length < 2 || end <= start) return out;
  const first = samples[0].t;
  const last = samples[samples.length - 1].t;
  let j = 0;
  for (let i = 0; i < n; i++) {
    const t = start + ((end - start) * i) / (n - 1);
    if (t < first || t > last) continue;
    while (j < samples.length - 2 && samples[j + 1].t < t) j++;
    const a = samples[j];
    const b = samples[j + 1];
    const span = b.t - a.t;
    out[i] = span > 0 ? a.w + ((t - a.t) / span) * (b.w - a.w) : a.w;
  }
  return out;
}

/** Everything the SVG needs, rebuilt only when the data or the box changes. */
interface Built {
  area: string;
  forecastLine: string;
  actualLine: string;
  nowX: number;
  baseY: number;
  peak: { x: number; y: number; label: string } | null;
  head: { x: number; y: number } | null;
  hits: { x: number; w: number; title: string }[];
  axis: { x: number; label: string }[];
}

@customElement('silk-solar-forecast-card')
export class SilkSolarForecastCard extends LitElement {
  @property({ attribute: false }) public hass?: HomeAssistant;

  @state() private _config?: SilkSolarForecastCardConfig;
  /** Measured plot box; the curve is laid out in exact pixels from it. */
  @state() private _plot: { w: number; h: number } | null = null;
  @state() private _now = Date.now();
  /** History for the `actual` sensor (null = nothing fetched yet). */
  @state() private _actual: Point[] | null = null;
  @state() private _actualFailed = false;

  private _built: Built | null = null;
  private _sig = '';
  private _expectedWh: number | null = null;
  private _producedWh: number | null = null;
  private _peakW: number | null = null;
  private _peakAt: number | null = null;
  private _hasCurve = false;
  /** True while the roof is producing (or, without `actual`, should be). */
  private _producing = false;

  private _fetchStarted = false;
  private _fetchSeq = 0;
  private _lastFetch = 0;
  private _lastActualStamp?: string;
  private _tickTimer?: number;
  private _intervalTimer?: number;
  private _refreshTimer?: number;
  private _resize?: ResizeObserver;

  public static getStubConfig(hass: HomeAssistant): Partial<SilkSolarForecastCardConfig> {
    const ids = Object.keys(hass.states);
    const forecast = ids.find((id) => {
      if (!id.startsWith('sensor.')) return false;
      const attrs = hass.states[id].attributes;
      return (
        isPlainObject(attrs.watts) ||
        Array.isArray(attrs.watts) ||
        isPlainObject(attrs.wh_hours) ||
        (Array.isArray(attrs.forecast) && /solar|pv|solcast/i.test(id))
      );
    });
    const actual = ids.find(
      (id) =>
        hass.states[id].attributes.device_class === 'power' && /solar|pv|inverter|produc/i.test(id)
    );
    return {
      type: 'custom:silk-solar-forecast-card',
      entity: forecast ?? ids.find((id) => /solar|pv/i.test(id) && id.startsWith('sensor.')),
      actual,
    };
  }

  public static async getConfigElement(): Promise<HTMLElement> {
    return document.createElement(EDITOR_TAG);
  }

  public setConfig(config: SilkSolarForecastCardConfig): void {
    if (!config.entity) {
      throw new Error('silk-solar-forecast-card: `entity` is required (a solar forecast sensor)');
    }
    if (config.actual !== undefined && typeof config.actual !== 'string') {
      throw new Error('silk-solar-forecast-card: `actual` must be a power sensor entity id');
    }
    this._config = config;
    this._actual = null;
    this._actualFailed = false;
    this._fetchStarted = false;
    this._lastActualStamp = undefined;
    this._sig = '';
  }

  public getCardSize(): number {
    return 3;
  }

  public getGridOptions(): Record<string, number> {
    return { columns: 6, rows: 3, min_columns: 4, min_rows: 2 };
  }

  public connectedCallback(): void {
    super.connectedCallback();
    this._now = Date.now();
    this._tickTimer = window.setInterval(() => {
      this._now = Date.now();
    }, TICK_MS);
    this._intervalTimer = window.setInterval(() => this._refreshActual(), REFRESH_INTERVAL_MS);
    // A DOM re-attach never re-runs firstUpdated: re-observe and refetch.
    if (this.hasUpdated) {
      this._observePlot();
      if (this._fetchStarted) this._refreshActual();
    }
  }

  public disconnectedCallback(): void {
    super.disconnectedCallback();
    window.clearInterval(this._tickTimer);
    window.clearInterval(this._intervalTimer);
    window.clearTimeout(this._refreshTimer);
    this._refreshTimer = undefined;
    this._resize?.disconnect();
  }

  protected willUpdate(changed: PropertyValues): void {
    if (!this.hass || !this._config) return;
    if (!this._fetchStarted) {
      this._fetchStarted = true;
      this._refreshActual();
    } else if (changed.has('hass')) {
      this._onStatesChanged();
    }
    this._rebuild();
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

  /** Refetch when the live sensor actually records something, throttled to 60s. */
  private _onStatesChanged(): void {
    const id = this._config?.actual;
    if (!id) return;
    const stamp = this.hass?.states[id]?.last_updated;
    if (!stamp || stamp === this._lastActualStamp) return;
    this._lastActualStamp = stamp;
    if (this._refreshTimer) return;
    const wait = Math.max(0, REFRESH_THROTTLE_MS - (Date.now() - this._lastFetch));
    this._refreshTimer = window.setTimeout(() => {
      this._refreshTimer = undefined;
      this._refreshActual();
    }, wait);
  }

  private async _refreshActual(): Promise<void> {
    const hass = this.hass;
    const config = this._config;
    if (!hass || !config) return;
    if (!config.actual) {
      this._actual = null;
      return;
    }
    const seq = ++this._fetchSeq;
    const endSec = Date.now() / 1000;
    const startSec = localDayStart(Date.now()) / 1000;
    try {
      const resp = await fetchSeries(
        hass,
        [config.actual],
        startSec,
        endSec,
        Math.max((endSec - startSec) / 3600, 1)
      );
      if (seq !== this._fetchSeq) return;
      this._lastFetch = Date.now();
      this._actual = resp[config.actual] ?? [];
      this._actualFailed = false;
      this._sig = '';
    } catch (err) {
      if (seq !== this._fetchSeq) return;
      console.warn('silk-solar-forecast-card: history fetch failed', err);
      this._actualFailed = true;
    }
  }

  private _locale(): string {
    return this.hass?.locale?.language ?? this.hass?.language ?? 'en';
  }

  private _kwh(wh: number): string {
    const kwh = wh / 1000;
    return new Intl.NumberFormat(this._locale(), {
      maximumFractionDigits: Math.abs(kwh) >= 100 ? 0 : 1,
      minimumFractionDigits: Math.abs(kwh) >= 100 ? 0 : 1,
    }).format(kwh);
  }

  private _power(w: number): string {
    const locale = this._locale();
    if (Math.abs(w) >= 1000) {
      return `${new Intl.NumberFormat(locale, { maximumFractionDigits: 1, minimumFractionDigits: 1 }).format(w / 1000)} kW`;
    }
    return `${new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }).format(w)} W`;
  }

  private _clock(ms: number): string {
    return new Intl.DateTimeFormat(this._locale(), { hour: 'numeric', minute: '2-digit' }).format(
      new Date(ms)
    );
  }

  /** The forecast curve, normalized to watts and clipped to today. */
  private _curve(stateObj?: HassEntity): { samples: Sample[]; hourlyWh: boolean } {
    const attrs = stateObj?.attributes ?? {};
    let samples = readShape(attrs.watts);
    let hourlyWh = false;
    if (!samples.length) samples = readShape(attrs.forecast);
    if (!samples.length) {
      samples = readShape(attrs.wh_hours);
      hourlyWh = samples.length > 0;
    }
    samples.sort((a, b) => a.t - b.t);
    return { samples, hourlyWh };
  }

  /**
   * Rebuild the numbers and the geometry. Guarded by a signature so a card that
   * re-renders on every unrelated state change does not re-integrate the day.
   */
  private _rebuild(): void {
    const hass = this.hass;
    const config = this._config;
    if (!hass || !config) return;
    const stateObj = hass.states[config.entity];
    const actualObj = config.actual ? hass.states[config.actual] : undefined;
    const sig = [
      this._plot?.w ?? 0,
      this._plot?.h ?? 0,
      Math.floor(this._now / TICK_MS),
      stateObj?.last_updated ?? '',
      actualObj?.last_updated ?? '',
      this._actual?.length ?? -1,
    ].join('|');
    if (sig === this._sig) return;
    this._sig = sig;

    const dayStart = localDayStart(this._now);
    const dayEnd = localDayEnd(this._now);
    const now = clamp(this._now, dayStart, dayEnd);
    const { samples, hourlyWh } = this._curve(stateObj);
    const today = samples.filter((s) => s.t >= dayStart - HOUR_MS && s.t <= dayEnd + HOUR_MS);
    this._hasCurve = today.length >= 2;

    // Day total: hourly Wh buckets sum exactly; a power curve is integrated.
    if (!this._hasCurve) {
      this._expectedWh = null;
    } else if (hourlyWh) {
      this._expectedWh = today
        .filter((s) => s.t >= dayStart && s.t < dayEnd)
        .reduce((sum, s) => sum + s.w, 0);
    } else {
      this._expectedWh = integrateWh(today, dayStart, dayEnd);
    }

    const fcVals = resampleLinear(today, dayStart, dayEnd, SAMPLES);

    // Actual: history for the day, plus the live reading so the line reaches now.
    const unitScale = unitScaleOf(actualObj);
    const actPoints: Point[] = [];
    for (const p of this._actual ?? []) {
      if (!Number.isFinite(p.t)) continue;
      actPoints.push({ t: p.t, v: Number.isFinite(p.v) ? p.v * unitScale : NaN });
    }
    const liveW = powerWatts(actualObj);
    if (Number.isFinite(liveW)) actPoints.push({ t: now / 1000, v: liveW });
    // The tick that defines `now` lags real time by up to a minute, so the live
    // sample can land just before the newest history row — resort to be safe.
    actPoints.sort((a, b) => a.t - b.t);

    // Null until the day's history has actually landed — a bare live reading
    // would otherwise report "0.0 kWh so far" for a roof that has been working.
    if (!actualObj || this._actual === null) {
      this._producedWh = null;
    } else {
      const finite: Sample[] = actPoints
        .filter((p) => Number.isFinite(p.v))
        .map((p) => ({ t: p.t * 1000, w: p.v }));
      this._producedWh = finite.length >= 2 ? integrateWh(finite, dayStart, now) : 0;
    }

    const actVals = actualObj
      ? resampleHold(actPoints, dayStart / 1000, dayEnd / 1000, SAMPLES)
      : new Float64Array(SAMPLES).fill(NaN);
    // Hold-resampling would run the last reading to midnight; the actual line
    // must end at now, so everything past it is cleared.
    const nowIdx = ((now - dayStart) / (dayEnd - dayStart)) * (SAMPLES - 1);
    for (let i = 0; i < SAMPLES; i++) if (i > nowIdx) actVals[i] = NaN;

    const expectedNow = fcVals[Math.round(clamp(nowIdx, 0, SAMPLES - 1))];
    this._producing = actualObj
      ? Number.isFinite(liveW) && liveW > 0
      : Number.isFinite(expectedNow) && expectedNow > 0;

    let peakIdx = -1;
    for (let i = 0; i < SAMPLES; i++) {
      const v = fcVals[i];
      if (Number.isFinite(v) && (peakIdx < 0 || v > fcVals[peakIdx])) peakIdx = i;
    }
    this._peakW = peakIdx >= 0 ? fcVals[peakIdx] : null;
    this._peakAt =
      peakIdx >= 0 ? dayStart + ((dayEnd - dayStart) * peakIdx) / (SAMPLES - 1) : null;

    const size = this._plot;
    if (!size || size.w < 8 || size.h < TOP_BAND + LABEL_BAND + 8) {
      this._built = null;
      return;
    }

    const domain = niceDomain([fcVals, actVals], 0);
    const fcYs = toPxYs(fcVals, domain, size.h, TOP_BAND, LABEL_BAND);
    const actYs = toPxYs(actVals, domain, size.h, TOP_BAND, LABEL_BAND);
    const baseY = size.h - LABEL_BAND;
    const xOf = (i: number): number => (i / (SAMPLES - 1)) * size.w;

    const hourFmt = new Intl.DateTimeFormat(this._locale(), { hour: 'numeric' });
    const hits: Built['hits'] = [];
    for (let h = 0; h < 24; h++) {
      const i = h * PER_HOUR;
      const expectedW = fcVals[i];
      const actualW = actVals[i];
      const parts = [hourFmt.format(new Date(dayStart + h * HOUR_MS))];
      parts.push(
        Number.isFinite(expectedW) ? `${this._power(expectedW)} expected` : 'no forecast'
      );
      if (actualObj && Number.isFinite(actualW)) parts.push(`${this._power(actualW)} actual`);
      hits.push({ x: xOf(i), w: size.w / 24, title: parts.join(' · ') });
    }

    const axis: Built['axis'] = [];
    // Recessive axis: three anchors, never a full hourly ruler.
    for (const h of [6, 12, 18]) {
      axis.push({ x: xOf(h * PER_HOUR), label: hourFmt.format(new Date(dayStart + h * HOUR_MS)) });
    }

    const headIdx = lastFiniteIndex(actYs);
    this._built = {
      area: buildAreaPath(fcYs, size.w, baseY),
      forecastLine: buildLinePath(fcYs, size.w),
      actualLine: buildLinePath(actYs, size.w),
      nowX: xOf(nowIdx),
      baseY,
      peak:
        peakIdx >= 0 && Number.isFinite(fcYs[peakIdx]) && (this._peakW ?? 0) > 0
          ? {
              x: clamp(xOf(peakIdx), 18, size.w - 18),
              y: Math.max(9, fcYs[peakIdx] - 5),
              label: this._power(fcVals[peakIdx]),
            }
          : null,
      head: headIdx >= 0 ? { x: xOf(headIdx), y: actYs[headIdx] } : null,
      hits,
      axis,
    };
  }

  private _onCardClick(): void {
    if (this._config) moreInfo(this, this._config.entity);
  }

  private _renderPlot(): TemplateResult | typeof nothing {
    if (!this._hasCurve) {
      return html`<div class="note">No hourly forecast on this sensor</div>`;
    }
    const built = this._built;
    const size = this._plot;
    if (!built || !size) return nothing;
    const marks: SVGTemplateResult[] = built.hits.map(
      (hit) => svg`<rect
        class="hit"
        x=${hit.x.toFixed(1)}
        y="0"
        width=${hit.w.toFixed(1)}
        height=${built.baseY}
      ><title>${hit.title}</title></rect>`
    );
    return html`
      <svg width=${size.w} height=${size.h} aria-hidden="true">
        <g class="chart">
          ${built.area ? svg`<path class="area" d=${built.area}></path>` : nothing}
          ${built.forecastLine
            ? svg`<path class="fc-line" d=${built.forecastLine}></path>`
            : nothing}
          <line
            class="now"
            x1=${built.nowX.toFixed(1)}
            y1="0"
            x2=${built.nowX.toFixed(1)}
            y2=${built.baseY}
          ></line>
          ${built.actualLine
            ? svg`<path class="act-line" d=${built.actualLine}></path>`
            : nothing}
          ${built.head
            ? svg`<circle class="head" cx=${built.head.x.toFixed(1)} cy=${built.head.y.toFixed(1)} r="3"></circle>`
            : nothing}
          ${built.peak
            ? svg`<text class="peak" x=${built.peak.x.toFixed(1)} y=${built.peak.y.toFixed(1)} text-anchor="middle">${built.peak.label}</text>`
            : nothing}
          ${built.axis.map(
            (tick) =>
              svg`<text class="axis" x=${tick.x.toFixed(1)} y=${size.h - 2} text-anchor="middle">${tick.label}</text>`
          )}
          ${marks}
        </g>
      </svg>
    `;
  }

  protected render(): TemplateResult | typeof nothing {
    const config = this._config;
    const hass = this.hass;
    if (!config || !hass) return nothing;
    const stateObj = hass.states[config.entity];
    if (!stateObj) {
      return html`
        <ha-card class="control">
          <div class="warning">Entity not found: ${config.entity}</div>
        </ha-card>
      `;
    }

    const unavailable = isUnavailable(stateObj);
    const accent = accentFor(stateObj, config.color);
    const name = config.name ?? stateObj.attributes.friendly_name ?? config.entity;
    const expected = this._expectedWh;
    const produced = this._producedWh;

    const stateLine = config.actual
      ? this._actualFailed
        ? html`History unavailable`
        : html`So far ${produced === null ? '—' : `${this._kwh(produced)} kWh`}`
      : this._peakW !== null && this._peakAt !== null && this._peakW > 0
        ? html`Peak ${this._power(this._peakW)}<span class="sep">·</span>${this._clock(this._peakAt)}`
        : html`Expected today`;

    return html`
      <ha-card
        class="control ${unavailable ? 'unavailable' : ''}"
        style="--silk-accent:${accent}"
        @click=${this._onCardClick}
      >
        <div class="top">
          <div class="icon ${!unavailable && this._producing ? 'on' : ''}">
            ${config.icon
              ? html`<ha-icon .icon=${config.icon}></ha-icon>`
              : html`<ha-icon icon="mdi:solar-power-variant"></ha-icon>`}
          </div>
          <div class="info">
            <div class="name">${name}</div>
            <div class="state">${stateLine}</div>
          </div>
          <div class="trailing">
            <span class="value">${expected === null ? '—' : this._kwh(expected)}</span>
            <span class="unit">kWh</span>
          </div>
        </div>
        <div class="plot">${this._renderPlot()}</div>
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
      /* A data card: the icon presses with the card, it is not a control. */
      .icon {
        cursor: pointer;
      }
      .icon:active {
        transform: none;
      }
      .plot {
        position: relative;
        flex: 1;
        min-height: 52px;
      }
      .plot svg {
        position: absolute;
        inset: 0;
        display: block;
        overflow: visible;
      }
      .chart {
        animation: silk-solar-in 250ms var(--silk-ease-out);
      }
      /* One accent hue throughout: the forecast recedes in opacity, the actual
         reading owns the full-strength stroke. */
      .area {
        fill: var(--silk-accent);
        fill-opacity: 0.15;
        stroke: none;
      }
      .fc-line {
        fill: none;
        stroke: var(--silk-accent);
        stroke-opacity: 0.5;
        stroke-width: 1.5;
        stroke-linecap: round;
        stroke-linejoin: round;
      }
      .act-line {
        fill: none;
        stroke: var(--silk-accent);
        stroke-width: 2;
        stroke-linecap: round;
        stroke-linejoin: round;
      }
      .head {
        fill: var(--silk-accent);
      }
      .now {
        stroke: var(--primary-text-color);
        stroke-opacity: 0.22;
        stroke-width: 1;
      }
      .peak {
        font-size: 10px;
        font-weight: 500;
        fill: var(--primary-text-color);
        opacity: 0.75;
        font-variant-numeric: tabular-nums;
        pointer-events: none;
      }
      .axis {
        font-size: 9px;
        fill: var(--primary-text-color);
        opacity: 0.4;
        font-variant-numeric: tabular-nums;
        pointer-events: none;
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
      @keyframes silk-solar-in {
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
    'silk-solar-forecast-card': SilkSolarForecastCard;
  }
}
