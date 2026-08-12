import { LitElement, html, css, nothing, PropertyValues, TemplateResult } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { HomeAssistant, HassEntity, LovelaceCardConfig } from '../types';
import { silkControlStyles } from '../shared/base';
import { domainOf, isUnavailable, moreInfo, stateText } from '../shared/service';
import { accentFor } from '../shared/color';
import { registerEditor } from '../shared/editor';

export const META = {
  type: 'silk-weather-card',
  name: 'Silk Weather',
  description: "Now plus the next six hours, nothing you don't need.",
};

export interface SilkWeatherCardConfig extends LovelaceCardConfig {
  entity: string;
  name?: string;
  /** Hide the hourly strip with `false`; defaults to shown. */
  show_forecast?: boolean;
}

/**
 * Local extension of the shared HomeAssistant type: the modern forecast API
 * lives on the raw websocket connection, which `src/types.ts` doesn't expose.
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

/** One hourly forecast row as delivered by `weather/subscribe_forecast`. */
interface ForecastEntry {
  datetime: string;
  condition?: string;
  temperature?: number;
}

interface ForecastEvent {
  forecast?: ForecastEntry[] | null;
}

/** HA weather condition → mdi icon. */
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

/** Readable condition labels for when hass.formatEntityState is unavailable. */
const CONDITION_LABELS: Record<string, string> = {
  'clear-night': 'Clear night',
  cloudy: 'Cloudy',
  exceptional: 'Exceptional',
  fog: 'Fog',
  hail: 'Hail',
  lightning: 'Lightning',
  'lightning-rainy': 'Lightning, rainy',
  partlycloudy: 'Partly cloudy',
  pouring: 'Pouring',
  rainy: 'Rainy',
  snowy: 'Snowy',
  'snowy-rainy': 'Snowy, rainy',
  sunny: 'Sunny',
  windy: 'Windy',
  'windy-variant': 'Windy',
};

const FORECAST_HOURS = 6;

const EDITOR_TAG = 'silk-weather-card-editor';

registerEditor(
  EDITOR_TAG,
  [
    { name: 'entity', required: true, selector: { entity: { domain: ['weather'] } } },
    { name: 'name', selector: { text: {} } },
    { name: 'show_forecast', selector: { boolean: {} } },
  ],
  {
    entity: 'Entity',
    name: 'Name',
    show_forecast: 'Show hourly forecast',
  },
  { show_forecast: true }
);

@customElement('silk-weather-card')
export class SilkWeatherCard extends LitElement {
  @property({ attribute: false }) public hass?: HomeAssistant;

  @state() private _config?: SilkWeatherCardConfig;

  /** Hourly rows from the live subscription (null = nothing received yet). */
  @state() private _forecast: ForecastEntry[] | null = null;

  /** True once subscribing proved impossible → fall back to attributes.forecast. */
  @state() private _subFailed = false;

  /** Entity the current subscription (or attempt) belongs to. */
  private _subEntity?: string;
  private _unsubPromise?: Promise<UnsubscribeFunc>;

  public static getStubConfig(hass: HomeAssistant): Partial<SilkWeatherCardConfig> {
    const entity = Object.keys(hass.states).find((id) => id.startsWith('weather.'));
    return { type: 'custom:silk-weather-card', entity };
  }

  public static async getConfigElement(): Promise<HTMLElement> {
    return document.createElement(EDITOR_TAG);
  }

  public setConfig(config: SilkWeatherCardConfig): void {
    if (!config.entity || domainOf(config.entity) !== 'weather') {
      throw new Error('silk-weather-card: define a weather `entity` (e.g. weather.home)');
    }
    if (this._subEntity !== undefined && this._subEntity !== config.entity) {
      this._teardownSubscription();
      this._forecast = null;
      this._subFailed = false;
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
    void this._subscribeForecast();
  }

  public disconnectedCallback(): void {
    super.disconnectedCallback();
    this._teardownSubscription();
  }

  protected updated(changed: PropertyValues): void {
    if (!changed.has('hass') && !changed.has('_config')) return;
    if (this._config?.show_forecast === false) {
      this._teardownSubscription();
    } else {
      void this._subscribeForecast();
    }
  }

  private async _subscribeForecast(): Promise<void> {
    const config = this._config;
    const hass = this.hass as HassWithConnection | undefined;
    if (!config || !hass || !this.isConnected) return;
    if (config.show_forecast === false) return;
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
        { type: 'weather/subscribe_forecast', forecast_type: 'hourly', entity_id: entity }
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

  /** Up to six upcoming rows: live subscription first, attribute fallback second. */
  private _visibleForecast(stateObj: HassEntity): ForecastEntry[] | null {
    if (this._config?.show_forecast === false) return null;
    let source: unknown = this._forecast;
    if (source === null && this._subFailed) source = stateObj.attributes.forecast;
    if (!Array.isArray(source)) return null;
    const entries = (source as ForecastEntry[])
      .filter((entry) => entry && typeof entry.datetime === 'string')
      .slice(0, FORECAST_HOURS);
    return entries.length > 0 ? entries : null;
  }

  private _locale(): string {
    return this.hass?.locale?.language ?? this.hass?.language ?? 'en';
  }

  private _formatTemp(value: number): string {
    const precision = this.hass?.entities?.[this._config!.entity]?.display_precision;
    const options: Intl.NumberFormatOptions =
      precision !== undefined
        ? { minimumFractionDigits: precision, maximumFractionDigits: precision }
        : { maximumFractionDigits: 1 };
    return new Intl.NumberFormat(this._locale(), options).format(value);
  }

  private _hourLabel(datetime: string): string {
    const date = new Date(datetime);
    if (Number.isNaN(date.getTime())) return '—';
    return new Intl.DateTimeFormat(this._locale(), { hour: 'numeric' }).format(date);
  }

  private _conditionText(hass: HomeAssistant, stateObj: HassEntity): string {
    if (hass.formatEntityState) return stateText(hass, stateObj);
    return CONDITION_LABELS[stateObj.state] ?? stateObj.state.replace(/_/g, ' ');
  }

  private _onCardClick(): void {
    if (this._config) moreInfo(this, this._config.entity);
  }

  private _renderHour(entry: ForecastEntry): TemplateResult {
    const temp = Number(entry.temperature);
    const icon = CONDITION_ICONS[entry.condition ?? ''] ?? FALLBACK_ICON;
    return html`
      <div class="cell">
        <span class="hour">${this._hourLabel(entry.datetime)}</span>
        <ha-icon .icon=${icon}></ha-icon>
        <span class="t">${Number.isFinite(temp) ? `${Math.round(temp)}°` : '—'}</span>
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
    const humidity = Number(stateObj.attributes.humidity);
    const icon = CONDITION_ICONS[stateObj.state] ?? FALLBACK_ICON;
    const entries = this._visibleForecast(stateObj);

    return html`
      <ha-card
        class="control ${unavailable ? 'unavailable' : ''}"
        style="--silk-accent:${accent}"
        @click=${this._onCardClick}
      >
        <div class="top">
          <div class="icon ${unavailable ? '' : 'on'}">
            <ha-icon .icon=${icon}></ha-icon>
          </div>
          <div class="info">
            <div class="name">${name}</div>
            <div class="state">
              ${this._conditionText(hass, stateObj)}${Number.isFinite(humidity)
                ? html`<span class="sep">·</span>${Math.round(humidity)}%`
                : nothing}
            </div>
          </div>
          <div class="trailing">
            <span class="temp">${Number.isFinite(temp) ? `${this._formatTemp(temp)}°` : '—'}</span>
          </div>
        </div>
        ${entries ? html`<div class="hours">${entries.map((entry) => this._renderHour(entry))}</div>` : nothing}
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
        gap: 12px;
      }
      .top {
        display: flex;
        align-items: center;
        gap: 12px;
        min-width: 0;
      }
      .temp {
        font-size: 28px;
        font-weight: 600;
        letter-spacing: -0.02em;
        line-height: 1;
        color: var(--primary-text-color);
        font-variant-numeric: tabular-nums;
        white-space: nowrap;
      }
      .hours {
        display: grid;
        grid-template-columns: repeat(${FORECAST_HOURS}, minmax(0, 1fr));
        gap: 4px;
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
      .cell {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 3px;
        min-width: 0;
      }
      .hour {
        font-size: 11px;
        line-height: 1.2;
        color: var(--secondary-text-color);
        max-width: 100%;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        font-variant-numeric: tabular-nums;
      }
      .cell ha-icon {
        --mdc-icon-size: 18px;
        color: var(--secondary-text-color);
      }
      .t {
        font-size: 13px;
        font-weight: 500;
        line-height: 1.2;
        color: var(--primary-text-color);
        font-variant-numeric: tabular-nums;
      }
      .unavailable .hours {
        opacity: 0.45;
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    'silk-weather-card': SilkWeatherCard;
  }
}
