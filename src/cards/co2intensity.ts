import { LitElement, html, css, nothing, TemplateResult } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { HomeAssistant, LovelaceCardConfig } from '../types';
import { silkControlStyles } from '../shared/base';
import { isUnavailable, moreInfo } from '../shared/service';
import { registerEditor } from '../shared/editor';
import { formatNumber } from '../format';

export const META = {
  type: 'silk-carbon-card',
  name: 'Silk Carbon',
  description: 'How clean the grid is right now.',
};

export interface SilkCarbonCardConfig extends LovelaceCardConfig {
  /** Grid carbon intensity sensor, in gCO₂/kWh. */
  entity: string;
  name?: string;
  /** Attribute holding the hourly forecast list. Default 'forecast'. */
  forecast_attribute?: string;
}

type Band = 'very-clean' | 'clean' | 'moderate' | 'dirty' | 'very-dirty';

const BANDS: readonly { band: Band; below: number; word: string }[] = [
  { band: 'very-clean', below: 100, word: 'Very clean' },
  { band: 'clean', below: 200, word: 'Clean' },
  { band: 'moderate', below: 300, word: 'Moderate' },
  { band: 'dirty', below: 400, word: 'Dirty' },
  { band: 'very-dirty', below: Infinity, word: 'Very dirty' },
];

const BAND_RANK: Record<Band, number> = {
  'very-clean': 0,
  clean: 1,
  moderate: 2,
  dirty: 3,
  'very-dirty': 4,
};

/**
 * "How clean is the grid" is a genuine status verdict — the one place Silk
 * spends success/warning/error chroma. Five bands share three colors; the word
 * beside the number carries the finer distinction.
 */
const BAND_COLOR: Record<Band, string> = {
  'very-clean': 'var(--success-color, #43a047)',
  clean: 'var(--success-color, #43a047)',
  moderate: 'var(--warning-color, #ffa600)',
  dirty: 'var(--error-color, #db4437)',
  'very-dirty': 'var(--error-color, #db4437)',
};

const DEFAULT_UNIT = 'gCO₂/kWh';
const DEFAULT_FORECAST_ATTR = 'forecast';
const FORECAST_HOURS = 24;
const HOUR_MS = 3_600_000;

/** Keys real integrations use for the hour stamp of a forecast entry. */
const TIME_KEYS = ['start', 'datetime', 'from', 'time', 'period_start', 'timestamp', 'date'];
/** Keys real integrations use for the intensity of a forecast entry. */
const VALUE_KEYS = [
  'intensity',
  'value',
  'carbon_intensity',
  'carbonIntensity',
  'co2_intensity',
  'co2',
  'forecast',
  'mean',
];

interface ForecastHour {
  /** Hour start, epoch ms. */
  t: number;
  v: number;
}

function bandOf(value: number): Band {
  for (const entry of BANDS) {
    if (value < entry.below) return entry.band;
  }
  return 'very-dirty';
}

function bandWord(band: Band): string {
  return BANDS.find((entry) => entry.band === band)!.word;
}

function toMs(raw: unknown): number {
  if (typeof raw === 'number' && Number.isFinite(raw)) {
    // Integrations send either seconds or milliseconds; 1e11 splits them.
    return raw > 1e11 ? raw : raw * 1000;
  }
  if (typeof raw === 'string') {
    const parsed = Date.parse(raw);
    if (Number.isFinite(parsed)) return parsed;
  }
  return NaN;
}

/** Intensity out of an entry value, digging one level for {forecast, actual}. */
function toIntensity(raw: unknown): number {
  if (typeof raw === 'number' && Number.isFinite(raw)) return raw;
  if (typeof raw === 'string') {
    const parsed = Number(raw);
    if (Number.isFinite(parsed)) return parsed;
  }
  if (raw && typeof raw === 'object') {
    const obj = raw as Record<string, unknown>;
    for (const key of ['forecast', 'actual', 'value', 'mean']) {
      const v = obj[key];
      if (typeof v === 'number' && Number.isFinite(v)) return v;
    }
  }
  return NaN;
}

const EDITOR_TAG = 'silk-carbon-card-editor';

registerEditor(
  EDITOR_TAG,
  [
    { name: 'entity', required: true, selector: { entity: { domain: ['sensor'] } } },
    { name: 'name', selector: { text: {} } },
    { name: 'forecast_attribute', selector: { text: {} } },
  ],
  { entity: 'Entity', name: 'Name', forecast_attribute: 'Forecast attribute' },
  { forecast_attribute: DEFAULT_FORECAST_ATTR }
);

/**
 * Grid carbon intensity as a decision, not a datapoint: the number, the word
 * for it, the next 24 hours as bars so a better hour is visible, and one line
 * telling you whether to run the washer now.
 */
@customElement('silk-carbon-card')
export class SilkCarbonCard extends LitElement {
  @property({ attribute: false }) public hass?: HomeAssistant;

  @state() private _config?: SilkCarbonCardConfig;
  /** False for the first paint so the strip grows in from the baseline. */
  @state() private _drawn = false;
  /** Render clock; the "current hour" bar has to move at the hour boundary. */
  @state() private _now = Date.now();

  private _hourTimer?: number;

  public static getStubConfig(hass: HomeAssistant): Partial<SilkCarbonCardConfig> {
    const ids = Object.keys(hass.states).filter((id) => id.startsWith('sensor.'));
    const entity =
      ids.find((id) => /co2[_-]?intensity|carbon[_-]?intensity/i.test(id)) ??
      ids.find((id) =>
        String(hass.states[id].attributes.unit_of_measurement ?? '')
          .replace(/\s/g, '')
          .toLowerCase()
          .includes('co2/kwh')
      );
    return { type: 'custom:silk-carbon-card', entity };
  }

  public static async getConfigElement(): Promise<HTMLElement> {
    return document.createElement(EDITOR_TAG);
  }

  public setConfig(config: SilkCarbonCardConfig): void {
    if (!config.entity) {
      throw new Error('silk-carbon-card: `entity` is required');
    }
    if (
      config.forecast_attribute !== undefined &&
      (typeof config.forecast_attribute !== 'string' || !config.forecast_attribute)
    ) {
      throw new Error('silk-carbon-card: `forecast_attribute` must be an attribute name');
    }
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
    this._scheduleHour();
  }

  public disconnectedCallback(): void {
    super.disconnectedCallback();
    window.clearTimeout(this._hourTimer);
    this._hourTimer = undefined;
  }

  protected firstUpdated(): void {
    // Commit one frame at zero height so the 350ms bar transition sweeps in.
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        this._drawn = true;
      });
    });
  }

  /** Re-render just after each hour boundary so "now" tracks the clock. */
  private _scheduleHour(): void {
    window.clearTimeout(this._hourTimer);
    const now = Date.now();
    const next = Math.floor(now / HOUR_MS) * HOUR_MS + HOUR_MS + 1000;
    this._hourTimer = window.setTimeout(() => {
      this._now = Date.now();
      this._scheduleHour();
    }, next - now);
  }

  private _locale(): string {
    return this.hass?.locale?.language ?? this.hass?.language ?? 'en';
  }

  /**
   * Forecast rows, normalized to {t, v} hours from the current hour forward.
   * Every integration shapes this attribute differently, so unknown shapes
   * degrade to an empty strip rather than a broken one.
   */
  private _forecast(attr: unknown, hourStart: number, current: number | null): ForecastHour[] {
    const hours: ForecastHour[] = [];
    if (Array.isArray(attr)) {
      attr.forEach((item, i) => {
        if (typeof item === 'number') {
          // A bare list of numbers is hour offsets from the current hour.
          if (Number.isFinite(item)) hours.push({ t: hourStart + i * HOUR_MS, v: item });
          return;
        }
        if (!item || typeof item !== 'object') return;
        const obj = item as Record<string, unknown>;
        let t = NaN;
        for (const key of TIME_KEYS) {
          if (key in obj) {
            t = toMs(obj[key]);
            if (Number.isFinite(t)) break;
          }
        }
        let v = NaN;
        for (const key of VALUE_KEYS) {
          if (key in obj) {
            v = toIntensity(obj[key]);
            if (Number.isFinite(v)) break;
          }
        }
        if (!Number.isFinite(v)) return;
        hours.push({ t: Number.isFinite(t) ? Math.floor(t / HOUR_MS) * HOUR_MS : hourStart + i * HOUR_MS, v });
      });
    }
    const future = hours
      .filter((h) => h.t >= hourStart)
      .sort((a, b) => a.t - b.t)
      .filter((h, i, list) => i === 0 || h.t !== list[i - 1].t);
    if (!future.length) return [];
    // When the forecast starts next hour, the live reading is the "now" bar.
    if (future[0].t > hourStart && current !== null) {
      future.unshift({ t: hourStart, v: current });
    }
    return future.slice(0, FORECAST_HOURS);
  }

  private _advice(band: Band | null, hours: ForecastHour[], hourStart: number): string {
    if (band === null) return 'No reading';
    const later = hours.filter((h) => h.t > hourStart);
    const best = later.reduce<ForecastHour | null>(
      (acc, h) => (acc === null || h.v < acc.v ? h : acc),
      null
    );
    const hourFmt = new Intl.DateTimeFormat(this._locale(), { hour: 'numeric' });
    if (BAND_RANK[band] <= 1) return 'Good time to run the washer';
    if (best && BAND_RANK[bandOf(best.v)] < BAND_RANK[band]) {
      return `Cleaner from ${hourFmt.format(new Date(best.t))}`;
    }
    if (band === 'moderate') return 'Fine for the essentials';
    return 'Hold off on the big loads';
  }

  private _onCardClick(): void {
    if (this._config) moreInfo(this, this._config.entity);
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
    const numeric = Number(stateObj?.state);
    const hasValue = !unavailable && stateObj?.state !== '' && Number.isFinite(numeric);
    const current = hasValue ? numeric : null;
    const band = current !== null ? bandOf(current) : null;
    const accent = band ? BAND_COLOR[band] : 'var(--secondary-text-color)';
    const unit =
      (stateObj?.attributes.unit_of_measurement as string | undefined) ?? DEFAULT_UNIT;
    const name = config.name ?? stateObj?.attributes.friendly_name ?? config.entity;

    void this._now; // the hour tick is a real render dependency
    const hourStart = Math.floor(Date.now() / HOUR_MS) * HOUR_MS;
    const attrName = config.forecast_attribute ?? DEFAULT_FORECAST_ATTR;
    const hours = this._forecast(stateObj?.attributes[attrName], hourStart, current);
    const peak = hours.reduce((acc, h) => Math.max(acc, h.v), current ?? 0);
    const timeFmt = new Intl.DateTimeFormat(this._locale(), { hour: 'numeric' });

    return html`
      <ha-card
        class="control ${unavailable ? 'unavailable' : ''}"
        style="--silk-accent:${accent}"
        @click=${this._onCardClick}
      >
        <div class="head" title=${name}>${name}</div>
        <div class="hero">
          <span class="reading"
            >${current !== null ? formatNumber(hass, config.entity, current) : '—'}</span
          >
          <span class="unit">${unit}</span>
          <span class="band">${band ? bandWord(band) : '—'}</span>
        </div>
        ${hours.length
          ? html`
              <div class="strip" aria-hidden="true">
                ${hours.map((hour) => {
                  const now = hour.t === hourStart;
                  const height = peak > 0 ? Math.max((hour.v / peak) * 100, 4) : 4;
                  return html`<span
                    class="fbar ${now ? 'now' : ''}"
                    style="height:${this._drawn ? height : 0}%"
                    title="${now ? 'Now' : timeFmt.format(new Date(hour.t))} · ${formatNumber(
                      hass,
                      config.entity,
                      hour.v
                    )} ${unit} · ${bandWord(bandOf(hour.v))}"
                  ></span>`;
                })}
              </div>
            `
          : nothing}
        <div class="advice">${this._advice(band, hours, hourStart)}</div>
      </ha-card>
    `;
  }

  static styles = [
    silkControlStyles,
    css`
      ha-card {
        flex-direction: column;
        align-items: stretch;
        justify-content: center;
        gap: 6px;
        padding: 10px 14px;
      }
      .head {
        flex: none;
        font-size: 14px;
        font-weight: 500;
        line-height: 1.3;
        color: var(--primary-text-color);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .hero {
        flex: none;
        display: flex;
        align-items: baseline;
        gap: 6px;
        min-width: 0;
      }
      .reading {
        flex: none;
        font-size: 26px;
        font-weight: 700;
        letter-spacing: -0.02em;
        line-height: 1.15;
        color: var(--primary-text-color);
        font-variant-numeric: tabular-nums;
      }
      .unit {
        flex: none;
      }
      .band {
        flex: 1;
        min-width: 0;
        text-align: right;
        font-size: 14px;
        font-weight: 600;
        line-height: 1.2;
        color: var(--silk-accent);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        transition: color 200ms ease;
      }
      /* 2px of card surface between adjacent bars. */
      .strip {
        flex: none;
        display: flex;
        align-items: flex-end;
        gap: 2px;
        height: 22px;
        min-width: 0;
      }
      /* One hue: the hour's intensity is its height, "now" is full opacity. */
      .fbar {
        flex: 1 1 0;
        min-width: 0;
        min-height: 2px;
        border-radius: 2px;
        background: var(--silk-accent);
        opacity: 0.28;
        transition:
          height 350ms var(--silk-ease-out),
          opacity 200ms ease,
          background 200ms ease;
      }
      .fbar.now {
        opacity: 1;
      }
      .advice {
        flex: none;
        font-size: 12px;
        line-height: 1.3;
        color: var(--secondary-text-color);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .unavailable .head,
      .unavailable .hero,
      .unavailable .strip,
      .unavailable .advice {
        opacity: 0.45;
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    'silk-carbon-card': SilkCarbonCard;
  }
}
