import { LitElement, html, css, nothing, PropertyValues, TemplateResult } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { HomeAssistant, HassEntity, LovelaceCardConfig } from '../types';
import { silkControlStyles } from '../shared/base';
import { domainOf, isUnavailable, moreInfo, clamp } from '../shared/service';
import { accentFor } from '../shared/color';
import { registerEditor } from '../shared/editor';

export const META = {
  type: 'silk-forecast-card',
  name: 'Silk Forecast',
  description: 'Seven days, honestly ranged.',
};

export interface SilkForecastCardConfig extends LovelaceCardConfig {
  entity: string;
  name?: string;
  /** Day rows to show, 1–7. Default 5. */
  days?: number;
}

/**
 * Local extension of the shared HomeAssistant type: the modern forecast API
 * lives on the raw websocket connection, which `src/types.ts` doesn't expose.
 * Mirrors the declaration in `weather.ts` (not exported from there).
 */
type UnsubscribeFunc = () => Promise<void>;
interface HassWithConnection extends HomeAssistant {
  connection?: {
    subscribeMessage<T>(
      callback: (message: T) => void,
      message: { type: string; [key: string]: unknown }
    ): Promise<UnsubscribeFunc>;
  };
}

/** One daily row as delivered by `weather/subscribe_forecast`. */
interface DailyForecast {
  datetime: string;
  condition?: string;
  /** Daily high. */
  temperature?: number;
  /** Daily low; absent on providers that only publish one number. */
  templow?: number;
  precipitation_probability?: number;
}

interface ForecastEvent {
  forecast?: DailyForecast[] | null;
}

/** HA weather condition → mdi icon (same table as `weather.ts`). */
const CONDITION_ICONS: Record<string, string> = {
  'clear-night': 'mdi:weather-night',
  cloudy: 'mdi:weather-cloudy',
  exceptional: 'mdi:alert-circle-outline',
  fog: 'mdi:weather-fog',
  hail: 'mdi:weather-hail',
  lightning: 'mdi:weather-lightning',
  'lightning-rainy': 'mdi:weather-lightning-rainy',
  partlycloudy: 'mdi:weather-partly-cloudy',
  pouring: 'mdi:weather-pouring',
  rainy: 'mdi:weather-rainy',
  snowy: 'mdi:weather-snowy',
  'snowy-rainy': 'mdi:weather-snowy-rainy',
  sunny: 'mdi:weather-sunny',
  windy: 'mdi:weather-windy',
  'windy-variant': 'mdi:weather-windy-variant',
};

const FALLBACK_ICON = 'mdi:weather-partly-cloudy';

const DEFAULT_DAYS = 5;
const MAX_DAYS = 7;
/**
 * Shortest segment, in track percent, so a day whose high equals its low still
 * reads as a mark rather than vanishing.
 */
const MIN_BAR_PCT = 8;

/** A parsed forecast day, already reduced to what the row draws. */
interface DayRow {
  /** Local midnight (ms) of the day the entry falls on. */
  dayStart: number;
  ts: number;
  icon: string;
  lo: number | null;
  hi: number | null;
  /** Precipitation probability in percent, or null when not published. */
  pop: number | null;
}

/** Local midnight for a timestamp — DST-proof, unlike epoch-day arithmetic. */
function localDayStart(ms: number): number {
  const d = new Date(ms);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

const EDITOR_TAG = 'silk-forecast-card-editor';

registerEditor(
  EDITOR_TAG,
  [
    { name: 'entity', required: true, selector: { entity: { domain: ['weather'] } } },
    { name: 'name', selector: { text: {} } },
    { name: 'days', selector: { number: { min: 1, max: MAX_DAYS, mode: 'box' } } },
  ],
  { entity: 'Entity', name: 'Name', days: 'Days to show' },
  { days: DEFAULT_DAYS }
);

@customElement('silk-forecast-card')
export class SilkForecastCard extends LitElement {
  @property({ attribute: false }) public hass?: HomeAssistant;

  @state() private _config?: SilkForecastCardConfig;

  /** Daily rows from the live subscription (null = nothing received yet). */
  @state() private _forecast: DailyForecast[] | null = null;

  /** True once subscribing proved impossible → fall back to attributes.forecast. */
  @state() private _subFailed = false;

  /** Entity the current subscription (or attempt) belongs to. */
  private _subEntity?: string;
  private _unsubPromise?: Promise<UnsubscribeFunc>;

  public static getStubConfig(hass: HomeAssistant): Partial<SilkForecastCardConfig> {
    const entity = Object.keys(hass.states).find((id) => id.startsWith('weather.'));
    return { type: 'custom:silk-forecast-card', entity };
  }

  public static async getConfigElement(): Promise<HTMLElement> {
    return document.createElement(EDITOR_TAG);
  }

  public setConfig(config: SilkForecastCardConfig): void {
    if (!config.entity || domainOf(config.entity) !== 'weather') {
      throw new Error('silk-forecast-card: define a weather `entity` (e.g. weather.home)');
    }
    if (config.days !== undefined && !(Number(config.days) > 0)) {
      throw new Error('silk-forecast-card: `days` must be a positive number');
    }
    if (this._subEntity !== undefined && this._subEntity !== config.entity) {
      this._teardownSubscription();
      this._forecast = null;
      this._subFailed = false;
    }
    this._config = config;
  }

  public getCardSize(): number {
    return 3;
  }

  public getGridOptions(): Record<string, number> {
    return { columns: 6, rows: 3, min_columns: 4, min_rows: 2 };
  }

  public connectedCallback(): void {
    super.connectedCallback();
    void this._subscribeForecast();
  }

  public disconnectedCallback(): void {
    super.disconnectedCallback();
    this._teardownSubscription();
  }

  protected updated(changed: PropertyValues): void {
    if (!changed.has('hass') && !changed.has('_config')) return;
    void this._subscribeForecast();
  }

  private async _subscribeForecast(): Promise<void> {
    const config = this._config;
    const hass = this.hass as HassWithConnection | undefined;
    if (!config || !hass || !this.isConnected) return;
    if (this._subEntity === config.entity) return; // already live (or attempted)

    this._teardownSubscription();
    const entity = config.entity;
    this._subEntity = entity;

    const connection = hass.connection;
    if (!connection || typeof connection.subscribeMessage !== 'function') {
      this._subFailed = true;
      return;
    }
    try {
      const promise = connection.subscribeMessage<ForecastEvent>(
        (event) => {
          if (this._subEntity === entity) {
            this._forecast = Array.isArray(event.forecast) ? event.forecast : [];
          }
        },
        { type: 'weather/subscribe_forecast', forecast_type: 'daily', entity_id: entity }
      );
      this._unsubPromise = promise;
      await promise;
    } catch {
      if (this._subEntity === entity) {
        this._unsubPromise = undefined;
        this._subFailed = true;
      }
    }
  }

  /** Drop the live subscription; safe even while the subscribe is in flight. */
  private _teardownSubscription(): void {
    const pending = this._unsubPromise;
    this._unsubPromise = undefined;
    this._subEntity = undefined;
    if (pending) {
      pending.then((unsub) => unsub()).catch(() => undefined);
    }
  }

  private _days(): number {
    return clamp(Math.round(this._config?.days ?? DEFAULT_DAYS), 1, MAX_DAYS);
  }

  /** Live subscription first, attribute fallback second; null = still waiting. */
  private _source(stateObj: HassEntity): DailyForecast[] | null {
    let source: unknown = this._forecast;
    if (source === null && this._subFailed) source = stateObj.attributes.forecast;
    return Array.isArray(source) ? (source as DailyForecast[]) : null;
  }

  /**
   * Parse the provider rows into day rows, starting at today. Providers
   * occasionally lead with a day that has already passed; those are skipped,
   * unless every row is stale — then the data is shown as delivered rather
   * than silently blanking the card.
   */
  private _rows(stateObj: HassEntity): DayRow[] | null {
    const source = this._source(stateObj);
    if (!source) return null;
    const parsed: DayRow[] = [];
    for (const entry of source) {
      if (!entry || typeof entry.datetime !== 'string') continue;
      const ts = Date.parse(entry.datetime);
      if (!Number.isFinite(ts)) continue;
      const high = Number(entry.temperature);
      const low = Number(entry.templow);
      const pop = Number(entry.precipitation_probability);
      parsed.push({
        dayStart: localDayStart(ts),
        ts,
        icon: CONDITION_ICONS[entry.condition ?? ''] ?? FALLBACK_ICON,
        lo: Number.isFinite(low) ? low : null,
        hi: Number.isFinite(high) ? high : null,
        pop: Number.isFinite(pop) && pop > 0 ? clamp(Math.round(pop), 0, 100) : null,
      });
    }
    const today = localDayStart(Date.now());
    const from = parsed.findIndex((row) => row.dayStart >= today);
    const usable = from > 0 ? parsed.slice(from) : parsed;
    return usable.slice(0, this._days());
  }

  private _locale(): string {
    return this.hass?.locale?.language ?? this.hass?.language ?? 'en';
  }

  private _onCardClick(): void {
    if (this._config) moreInfo(this, this._config.entity);
  }

  private _renderRows(rows: DayRow[]): TemplateResult {
    const today = localDayStart(Date.now());
    const locale = this._locale();
    const weekdayFmt = new Intl.DateTimeFormat(locale, { weekday: 'short' });
    const titleFmt = new Intl.DateTimeFormat(locale, {
      weekday: 'long',
      month: 'short',
      day: 'numeric',
    });

    // One domain for the whole week: every bar is mapped onto the same
    // min..max, which is what makes the ranges comparable row to row.
    let dMin = Infinity;
    let dMax = -Infinity;
    for (const row of rows) {
      for (const v of [row.lo, row.hi]) {
        if (v === null) continue;
        if (v < dMin) dMin = v;
        if (v > dMax) dMax = v;
      }
    }
    const span = dMax - dMin;
    const scaled = Number.isFinite(dMin) && span > 0;

    // Magnitude ramp inside the single accent hue — warmer day, denser fill.
    const means = rows.map((row) =>
      row.lo !== null && row.hi !== null ? (row.lo + row.hi) / 2 : (row.hi ?? row.lo)
    );
    let mMin = Infinity;
    let mMax = -Infinity;
    for (const m of means) {
      if (m === null) continue;
      if (m < mMin) mMin = m;
      if (m > mMax) mMax = m;
    }
    const ramp = Number.isFinite(mMin) && mMax > mMin;

    const showPop = rows.some((row) => row.pop !== null);
    const cols = `34px 18px ${showPop ? '32px ' : ''}28px minmax(24px, 1fr) 28px`;

    return html`
      <div class="days" style="--silk-cols:${cols}">
        ${rows.map((row, i) => {
          const isToday = row.dayStart === today;
          const lo = row.lo ?? row.hi;
          const hi = row.hi ?? row.lo;
          let x0 = 0;
          let w = 100;
          if (scaled && lo !== null && hi !== null) {
            x0 = ((Math.min(lo, hi) - dMin) / span) * 100;
            const x1 = ((Math.max(lo, hi) - dMin) / span) * 100;
            w = x1 - x0;
            if (w < MIN_BAR_PCT) {
              w = MIN_BAR_PCT;
              x0 = clamp((x0 + x1) / 2 - MIN_BAR_PCT / 2, 0, 100 - MIN_BAR_PCT);
            }
          }
          const mean = means[i];
          const opacity =
            ramp && mean !== null ? (0.5 + 0.5 * ((mean - mMin) / (mMax - mMin))).toFixed(2) : '1';
          const loText = row.lo !== null ? `${Math.round(row.lo)}°` : '—';
          const hiText = row.hi !== null ? `${Math.round(row.hi)}°` : '—';
          return html`
            <div class="row" title="${titleFmt.format(new Date(row.ts))} · ${loText} – ${hiText}">
              <span class="day ${isToday ? 'today' : ''}"
                >${isToday ? 'Today' : weekdayFmt.format(new Date(row.ts))}</span
              >
              <ha-icon .icon=${row.icon}></ha-icon>
              <!-- The column is reserved for the whole week or for none of it,
                   so the bars stay aligned; dry days hold it open empty. -->
              ${showPop
                ? row.pop !== null
                  ? html`<span class="pop">${row.pop}%</span>`
                  : html`<span></span>`
                : nothing}
              <span class="t lo">${loText}</span>
              <div class="track">
                ${lo !== null && hi !== null
                  ? html`<div
                      class="fill"
                      style="left:${x0.toFixed(2)}%;width:${w.toFixed(2)}%;opacity:${opacity}"
                    ></div>`
                  : nothing}
              </div>
              <span class="t hi">${hiText}</span>
            </div>
          `;
        })}
      </div>
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
    const accent = accentFor(stateObj); // weather is neutral → primary
    const name = config.name ?? stateObj.attributes.friendly_name ?? config.entity;
    const temp = Number(stateObj.attributes.temperature);
    const rows = this._rows(stateObj);
    // Whole degrees everywhere: the rows are a list, and half a degree of
    // precision would only add noise beside the range bars.

    return html`
      <ha-card
        class="control ${unavailable ? 'unavailable' : ''}"
        style="--silk-accent:${accent}"
        @click=${this._onCardClick}
      >
        <div class="head">
          <div class="name">${name}</div>
          <div class="now">${Number.isFinite(temp) ? `${Math.round(temp)}°` : '—'}</div>
        </div>
        ${rows && rows.length
          ? this._renderRows(rows)
          : rows
            ? html`<div class="note">No daily forecast</div>`
            : nothing}
      </ha-card>
    `;
  }

  static styles = [
    silkControlStyles,
    css`
      ha-card {
        flex-direction: column;
        align-items: stretch;
        justify-content: flex-start;
        gap: 8px;
        padding: 12px 14px;
      }
      .head {
        flex: none;
        display: flex;
        align-items: baseline;
        justify-content: space-between;
        gap: 8px;
        min-width: 0;
      }
      .now {
        flex: none;
        font-size: 20px;
        font-weight: 600;
        letter-spacing: -0.02em;
        line-height: 1;
        color: var(--primary-text-color);
        font-variant-numeric: tabular-nums;
        white-space: nowrap;
      }
      .days {
        flex: 1;
        min-height: 0;
        display: grid;
        grid-auto-rows: minmax(20px, 1fr);
        gap: 2px;
        position: relative;
        z-index: 1;
        animation: silk-rise-in 250ms var(--silk-ease-out);
      }
      @keyframes silk-rise-in {
        from {
          opacity: 0;
          transform: translateY(4px);
        }
      }
      .row {
        display: grid;
        grid-template-columns: var(--silk-cols);
        align-items: center;
        gap: 8px;
        min-width: 0;
      }
      .day {
        font-size: 11px;
        line-height: 1.2;
        color: var(--secondary-text-color);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .day.today {
        font-weight: 500;
        color: var(--primary-text-color);
      }
      .row ha-icon {
        --mdc-icon-size: 18px;
        color: var(--secondary-text-color);
      }
      .pop {
        justify-self: center;
        font-size: 10px;
        line-height: 1.4;
        padding: 1px 5px;
        border-radius: 999px;
        color: var(--secondary-text-color);
        background: rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.07);
        font-variant-numeric: tabular-nums;
        white-space: nowrap;
      }
      .t {
        font-size: 11px;
        line-height: 1.2;
        font-variant-numeric: tabular-nums;
        white-space: nowrap;
      }
      .t.lo {
        text-align: right;
        color: var(--secondary-text-color);
      }
      .t.hi {
        text-align: left;
        font-weight: 500;
        color: var(--primary-text-color);
      }
      .track {
        position: relative;
        height: 6px;
        border-radius: 3px;
        background: rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.08);
      }
      .fill {
        position: absolute;
        top: 0;
        bottom: 0;
        border-radius: 3px;
        background: var(--silk-accent);
      }
      .note {
        flex: 1;
        display: grid;
        place-items: center;
        font-size: 12px;
        color: var(--secondary-text-color);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .unavailable .days,
      .unavailable .note {
        opacity: 0.45;
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    'silk-forecast-card': SilkForecastCard;
  }
}
