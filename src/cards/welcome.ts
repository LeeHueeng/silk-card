import { LitElement, html, css, nothing, TemplateResult } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { HomeAssistant, HassEntity, LovelaceCardConfig } from '../types';
import { silkControlStyles } from '../shared/base';
import { isActive, isUnavailable } from '../shared/service';
import { registerListEditor } from '../shared/listeditor';
import { entityListSelector } from '../shared/list';
import { formatNumber } from '../format';

export const META = {
  type: 'silk-welcome-card',
  name: 'Silk Welcome',
  description: 'A greeting that knows your home.',
};

export interface SilkWelcomeCardConfig extends LovelaceCardConfig {
  /** Who to greet; falls back to the logged-in HA user's name. */
  name?: string;
  /** Numeric sensor rendered as a readout segment (e.g. indoor temperature). */
  temperature?: string;
  /** Icon for that readout. `false` hides it. Defaults to mdi:home-thermometer. */
  temperature_icon?: string | false;
  /** Entities counted into the "N devices on" segment. */
  count_active?: string[];
  /** Weather entity for the condition icon + outdoor temperature. */
  weather?: string;
}

/** `hass.user` exists at runtime but is not part of Silk's minimal type. */
interface HassWithUser extends HomeAssistant {
  user?: { name?: string };
}

/** HA weather condition → mdi icon (mirrors weather.ts, which keeps its map private). */
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

const FALLBACK_CONDITION_ICON = 'mdi:weather-partly-cloudy';

/** Glyph in front of the temperature readout, unless config says otherwise. */
const DEFAULT_TEMPERATURE_ICON = 'mdi:home-thermometer';

const REFRESH_INTERVAL_MS = 60_000;

/** '°C'/'°F' → '°'; everything else trimmed and appended without a space. */
function condenseUnit(unit: string): string {
  const u = unit.trim();
  return u.startsWith('°') ? '°' : u;
}

const EDITOR_TAG = 'silk-welcome-card-editor';

registerListEditor(EDITOR_TAG, {
  schema: [
    { name: 'name', selector: { text: {} } },
    { name: 'temperature', selector: { entity: { domain: ['sensor'] } } },
    { name: 'temperature_icon', selector: { icon: {} } },
    { name: 'weather', selector: { entity: { domain: ['weather'] } } },
    entityListSelector('count_active'),
  ],
  labels: {
    name: '인사할 이름',
    temperature: '온도 엔티티',
    temperature_icon: '온도 아이콘',
    weather: '날씨 엔티티',
    count_active: '켜짐 개수 집계',
  },
  defaults: { temperature_icon: DEFAULT_TEMPERATURE_ICON },
  listFields: ['count_active'],
});

@customElement('silk-welcome-card')
export class SilkWelcomeCard extends LitElement {
  @property({ attribute: false }) public hass?: HomeAssistant;

  @state() private _config?: SilkWelcomeCardConfig;

  private _clockTimer?: number;

  public static getStubConfig(hass: HomeAssistant): Partial<SilkWelcomeCardConfig> {
    const ids = Object.keys(hass.states);
    const weather = ids.find((id) => id.startsWith('weather.'));
    const temperature = ids.find(
      (id) =>
        id.startsWith('sensor.') && hass.states[id].attributes.device_class === 'temperature'
    );
    return { type: 'custom:silk-welcome-card', weather, temperature };
  }

  public static async getConfigElement(): Promise<HTMLElement> {
    return document.createElement(EDITOR_TAG);
  }

  public setConfig(config: SilkWelcomeCardConfig): void {
    if (config.count_active !== undefined && !Array.isArray(config.count_active)) {
      throw new Error('silk-welcome-card: `count_active` must be a list of entity ids');
    }
    this._config = config;
  }

  public getCardSize(): number {
    return 2;
  }

  public getGridOptions(): Record<string, number> {
    return { columns: 12, rows: 1, min_rows: 1 };
  }

  public connectedCallback(): void {
    super.connectedCallback();
    // The greeting and the date only move with the wall clock, not with hass
    // state; a coarse 60s tick keeps them honest across midnight and noon.
    this._clockTimer = window.setInterval(() => this.requestUpdate(), REFRESH_INTERVAL_MS);
  }

  public disconnectedCallback(): void {
    super.disconnectedCallback();
    window.clearInterval(this._clockTimer);
    this._clockTimer = undefined;
  }

  private _locale(): string {
    return this.hass?.locale?.language ?? this.hass?.language ?? 'en';
  }

  private _greeting(now: Date): string {
    const hour = now.getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  }

  /** Weather segment: 16px condition icon + current temperature. */
  private _renderWeather(): TemplateResult | typeof nothing {
    const entityId = this._config?.weather;
    const stateObj = entityId ? this.hass?.states[entityId] : undefined;
    if (!stateObj || isUnavailable(stateObj)) return nothing;
    const icon = CONDITION_ICONS[stateObj.state] ?? FALLBACK_CONDITION_ICON;
    const temp = Number(stateObj.attributes.temperature);
    return html`
      <span class="seg">
        <ha-icon .icon=${icon}></ha-icon>
        ${Number.isFinite(temp)
          ? html`<span>${formatNumber(this.hass, stateObj.entity_id, temp)}°</span>`
          : nothing}
      </span>
    `;
  }

  /**
   * Numeric readout of the configured temperature entity. It carries an icon
   * of its own so it never reads as a second outdoor number next to the
   * weather segment — this one is the house.
   */
  private _renderTemperature(): TemplateResult | typeof nothing {
    const entityId = this._config?.temperature;
    const stateObj = entityId ? this.hass?.states[entityId] : undefined;
    if (!stateObj || isUnavailable(stateObj) || stateObj.state === '') return nothing;
    const value = Number(stateObj.state);
    if (!Number.isFinite(value)) return nothing;
    const unit = stateObj.attributes.unit_of_measurement;
    const text = formatNumber(this.hass, stateObj.entity_id, value);
    const icon = this._config?.temperature_icon ?? DEFAULT_TEMPERATURE_ICON;
    return html`
      <span class="seg">
        ${icon === false ? nothing : html`<ha-icon .icon=${icon}></ha-icon>`}
        <span>${unit ? `${text}${condenseUnit(String(unit))}` : text}</span>
      </span>
    `;
  }

  /** "N devices on" over count_active; accent when anything is on. Not a control. */
  private _renderDevices(): TemplateResult | typeof nothing {
    const ids = this._config?.count_active;
    const hass = this.hass;
    if (!hass || !Array.isArray(ids) || ids.length === 0) return nothing;
    const n = ids.filter((id): boolean => isActive(hass.states[id] as HassEntity | undefined))
      .length;
    return html`
      <span class="seg devices ${n > 0 ? 'some' : ''}">
        ${n} ${n === 1 ? 'device' : 'devices'} on
      </span>
    `;
  }

  protected render(): TemplateResult | typeof nothing {
    const config = this._config;
    if (!config) return nothing;

    const now = new Date();
    const name = config.name ?? (this.hass as HassWithUser | undefined)?.user?.name;
    const greeting = `${this._greeting(now)}${name ? `, ${name}` : ''}`;
    const date = new Intl.DateTimeFormat(this._locale(), {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
    }).format(now);

    const segments: TemplateResult[] = [html`<span class="seg">${date}</span>`];
    for (const seg of [this._renderWeather(), this._renderTemperature(), this._renderDevices()]) {
      if (seg !== nothing) segments.push(seg as TemplateResult);
    }

    return html`
      <ha-card>
        <div class="greeting" title=${greeting}>${greeting}</div>
        <div class="sub">
          ${segments.map((seg, i) => (i ? html`<span class="sep">·</span>${seg}` : seg))}
        </div>
      </ha-card>
    `;
  }

  static styles = [
    silkControlStyles,
    css`
      /* A welcome header floats on the view background, like a divider. */
      ha-card {
        background: none;
        border: none;
        box-shadow: none;
        border-radius: 0;
        flex-direction: column;
        align-items: stretch;
        justify-content: center;
        gap: 2px;
        padding: 6px 10px;
        cursor: default;
      }
      .greeting {
        font-size: 20px;
        font-weight: 700;
        letter-spacing: -0.01em;
        line-height: 1.25;
        color: var(--primary-text-color);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .sub {
        font-size: 13px;
        line-height: 1.4;
        color: var(--secondary-text-color);
        font-variant-numeric: tabular-nums;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .sub .sep {
        opacity: 0.5;
        margin: 0 5px;
      }
      .seg {
        display: inline-flex;
        align-items: center;
        gap: 3px;
        vertical-align: bottom;
      }
      .seg ha-icon {
        --mdc-icon-size: 16px;
        flex: none;
      }
      .devices {
        transition: color 200ms ease;
      }
      .devices.some {
        color: var(--silk-accent);
        font-weight: 500;
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    'silk-welcome-card': SilkWelcomeCard;
  }
}
