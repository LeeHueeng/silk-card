import { LitElement, html, css, nothing, TemplateResult } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { HomeAssistant, HassEntity, LovelaceCardConfig } from '../types';
import { silkControlStyles } from '../shared/base';
import { isUnavailable, moreInfo, haptic, clamp } from '../shared/service';
import { accentFor } from '../shared/color';
import { registerEditor } from '../shared/editor';

export const META = {
  type: 'silk-dewpoint-card',
  name: 'Silk Dew Point',
  description: 'What it really feels like.',
};

export interface SilkDewpointCardConfig extends LovelaceCardConfig {
  temperature: string;
  humidity: string;
  name?: string;
  icon?: string;
  color?: string;
  /** Display unit; defaults to whatever the temperature sensor reports. */
  unit?: 'C' | 'F';
}

/**
 * Magnus–Tetens coefficients (Sonntag 1990, over water, −45…60 °C):
 *   γ  = ln(RH/100) + (b·T)/(c+T)
 *   Td = (c·γ) / (b − γ)
 * Accurate to ~0.1 °C across normal indoor conditions.
 */
const MAGNUS_B = 17.62;
const MAGNUS_C = 243.12;

/**
 * Bands by dew point in °C — the standard muggy-meter used by forecasters.
 * `to` is the exclusive upper bound; the last band is open-ended but the
 * scale draws it up to SCALE_MAX so the bar keeps honest proportions.
 */
interface DewBand {
  word: string;
  /** Lower bound, °C. */
  from: number;
  /** Upper bound, °C (drawn bound for the last band). */
  to: number;
}

const SCALE_MIN = 0;
const SCALE_MAX = 24;

const BANDS: DewBand[] = [
  { word: 'Dry', from: SCALE_MIN, to: 10 },
  { word: 'Pleasant', from: 10, to: 16 },
  { word: 'Sticky', from: 16, to: 18 },
  { word: 'Muggy', from: 18, to: 21 },
  { word: 'Oppressive', from: 21, to: SCALE_MAX },
];

/**
 * One accent hue, opacity rising with discomfort — magnitude, never rainbow.
 * Non-current bands recede to ~45% of their weight (floored so the driest band
 * stays visible), which is what marks the current band as current.
 */
const BAND_MIX = [14, 26, 40, 58, 80];
const RECESSIVE = 0.45;
const RECESSIVE_FLOOR = 9;

/** Saturation vapour pressure, hPa (Magnus form used by the AT formula). */
function vapourPressure(tC: number, rh: number): number {
  return (rh / 100) * 6.105 * Math.exp((17.27 * tC) / (237.7 + tC));
}

/**
 * Dew point in °C from dry-bulb °C and %RH. RH is clamped to 1% so the log
 * stays finite for sensors that briefly report 0.
 */
function dewPointC(tC: number, rh: number): number {
  const gamma = Math.log(clamp(rh, 1, 100) / 100) + (MAGNUS_B * tC) / (MAGNUS_C + tC);
  return (MAGNUS_C * gamma) / (MAGNUS_B - gamma);
}

/**
 * Apparent temperature (Steadman's Australian AT, shade, no-wind form):
 *   AT = T + 0.33·e − 4.00
 * Humidity alone shifts the felt temperature; without an anemometer the wind
 * term (−0.70·ws) is simply left out, which is why this is a "simple" number.
 */
function feelsLikeC(tC: number, rh: number): number {
  return tC + 0.33 * vapourPressure(tC, rh) - 4;
}

function isFahrenheitUnit(unit: string | undefined): boolean {
  return !!unit && unit.toUpperCase().includes('F');
}

const toCelsius = (v: number, unit: string | undefined): number =>
  isFahrenheitUnit(unit) ? ((v - 32) * 5) / 9 : v;

const fromCelsius = (v: number, fahrenheit: boolean): number =>
  fahrenheit ? (v * 9) / 5 + 32 : v;

const EDITOR_TAG = 'silk-dewpoint-card-editor';

registerEditor(
  EDITOR_TAG,
  [
    {
      name: 'temperature',
      required: true,
      selector: { entity: { domain: ['sensor'], device_class: ['temperature'] } },
    },
    {
      name: 'humidity',
      required: true,
      selector: { entity: { domain: ['sensor'], device_class: ['humidity'] } },
    },
    { name: 'name', selector: { text: {} } },
    {
      name: '',
      type: 'grid',
      schema: [
        { name: 'icon', selector: { icon: {} } },
        {
          name: 'unit',
          selector: {
            select: {
              mode: 'dropdown',
              options: [
                { value: 'C', label: '섭씨 (°C)' },
                { value: 'F', label: '화씨 (°F)' },
              ],
            },
          },
        },
        { name: 'color', selector: { ui_color: {} } },
      ],
    },
  ],
  {
    temperature: '온도 센서',
    humidity: '습도 센서',
    name: '이름',
    icon: '아이콘',
    unit: '표시 단위',
    color: '강조 색상',
  }
);

@customElement('silk-dewpoint-card')
export class SilkDewpointCard extends LitElement {
  @property({ attribute: false }) public hass?: HomeAssistant;

  @state() private _config?: SilkDewpointCardConfig;

  public static getStubConfig(hass: HomeAssistant): Partial<SilkDewpointCardConfig> {
    const ids = Object.keys(hass.states).filter((id) => id.startsWith('sensor.'));
    const byClass = (cls: string): string | undefined =>
      ids.find((id) => hass.states[id].attributes.device_class === cls);
    return {
      type: 'custom:silk-dewpoint-card',
      temperature: byClass('temperature'),
      humidity: byClass('humidity'),
    };
  }

  public static async getConfigElement(): Promise<HTMLElement> {
    return document.createElement(EDITOR_TAG);
  }

  public setConfig(config: SilkDewpointCardConfig): void {
    if (!config.temperature) {
      throw new Error('silk-dewpoint-card: `temperature` is required');
    }
    if (!config.humidity) {
      throw new Error('silk-dewpoint-card: `humidity` is required');
    }
    if (config.unit !== undefined && config.unit !== 'C' && config.unit !== 'F') {
      throw new Error("silk-dewpoint-card: `unit` must be 'C' or 'F'");
    }
    this._config = config;
  }

  public getCardSize(): number {
    return 2;
  }

  public getGridOptions(): Record<string, number> {
    return { columns: 6, rows: 2, min_columns: 4, min_rows: 2 };
  }

  private _locale(): string {
    return this.hass?.locale?.language ?? this.hass?.language ?? 'en';
  }

  private _num(value: number, digits = 1): string {
    return new Intl.NumberFormat(this._locale(), { maximumFractionDigits: digits }).format(value);
  }

  private _onCardClick(): void {
    if (!this._config) return;
    haptic(this);
    moreInfo(this, this._config.temperature);
  }

  private _renderScale(dewC: number | null, current: number, fahrenheit: boolean): TemplateResult {
    const deg = (c: number): string => `${this._num(fromCelsius(c, fahrenheit), 0)}°`;
    return html`
      <div class="scale">
        ${BANDS.map((band, i) => {
          const on = i === current;
          const mix = on ? BAND_MIX[i] : Math.max(RECESSIVE_FLOOR, Math.round(BAND_MIX[i] * RECESSIVE));
          // Marker rides inside its own band, so the 2px gaps between bands
          // never skew where it lands.
          const within =
            on && dewC !== null ? clamp((dewC - band.from) / (band.to - band.from), 0, 1) * 100 : 0;
          return html`
            <div
              class="seg ${on ? 'on' : ''}"
              style="flex-grow:${band.to - band.from};background:color-mix(in srgb, var(--silk-accent) ${mix}%, transparent)"
              title=${`${band.word} · dew point ${deg(band.from)}–${deg(band.to)}`}
            >
              ${on ? html`<span class="marker" style="left:${within.toFixed(1)}%"></span>` : nothing}
            </div>
          `;
        })}
      </div>
      <div class="ends" aria-hidden="true">
        <span>${BANDS[0].word.toLowerCase()}</span>
        <span>${BANDS[BANDS.length - 1].word.toLowerCase()}</span>
      </div>
    `;
  }

  protected render(): TemplateResult | typeof nothing {
    const config = this._config;
    const hass = this.hass;
    if (!config) return nothing;
    const tempObj: HassEntity | undefined = hass?.states[config.temperature];
    const humObj: HassEntity | undefined = hass?.states[config.humidity];
    if (hass && (!tempObj || !humObj)) {
      return html`<ha-card
        ><div class="warning">Entity not found: ${!tempObj ? config.temperature : config.humidity}</div></ha-card
      >`;
    }

    const sensorUnit = tempObj?.attributes.unit_of_measurement as string | undefined;
    const fahrenheit = config.unit ? config.unit === 'F' : isFahrenheitUnit(sensorUnit);
    const tRaw = tempObj && !isUnavailable(tempObj) ? Number(tempObj.state) : NaN;
    const rh = humObj && !isUnavailable(humObj) ? Number(humObj.state) : NaN;
    const ready = Number.isFinite(tRaw) && Number.isFinite(rh);
    const tC = ready ? toCelsius(tRaw, sensorUnit) : NaN;
    const dewC = ready ? dewPointC(tC, rh) : null;
    const feelsC = ready ? feelsLikeC(tC, rh) : null;
    const bandIdx =
      dewC === null ? -1 : BANDS.findIndex((b, i) => dewC < b.to || i === BANDS.length - 1);
    const accent = accentFor(tempObj, config.color);
    const name = config.name ?? tempObj?.attributes.friendly_name ?? config.temperature;

    return html`
      <ha-card
        class="control ${ready ? '' : 'unavailable'}"
        style="--silk-accent:${accent}"
        @click=${this._onCardClick}
      >
        <div class="top">
          <div class="icon ${ready ? 'on' : ''}">
            <ha-icon .icon=${config.icon ?? 'mdi:water-thermometer'}></ha-icon>
          </div>
          <div class="info">
            <div class="name" title=${name}>${name}</div>
            <div class="state">
              <span class="word">${bandIdx >= 0 ? BANDS[bandIdx].word : '—'}</span
              ><span class="sep">·</span>${feelsC !== null
                ? `feels like ${this._num(fromCelsius(feelsC, fahrenheit))}°`
                : 'no reading'}
            </div>
          </div>
          <div class="trailing">
            <span class="hero">${dewC !== null ? this._num(fromCelsius(dewC, fahrenheit)) : '—'}</span>
            <span class="deg">°</span>
          </div>
        </div>
        <div class="bar">${this._renderScale(dewC, bandIdx, fahrenheit)}</div>
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
        gap: 10px;
        transition: transform 250ms var(--silk-spring);
      }
      ha-card:active {
        transform: scale(0.98);
        transition-duration: 120ms;
        transition-timing-function: var(--silk-ease-out);
      }
      .top {
        flex: none;
        display: flex;
        align-items: center;
        gap: 12px;
        min-width: 0;
      }
      /* A reading, not a control: the icon presses with the card. */
      .icon {
        cursor: pointer;
      }
      .icon:active {
        transform: none;
      }
      .word {
        font-weight: 600;
        color: var(--primary-text-color);
      }
      .trailing {
        align-items: baseline;
        gap: 1px;
      }
      .hero {
        font-size: 24px;
        font-weight: 600;
        letter-spacing: -0.02em;
        line-height: 1.1;
        color: var(--primary-text-color);
        font-variant-numeric: tabular-nums;
      }
      .deg {
        font-size: 15px;
        font-weight: 500;
        color: var(--secondary-text-color);
      }
      .bar {
        flex: none;
      }
      .scale {
        display: flex;
        align-items: center;
        gap: 2px;
        height: 10px;
      }
      .seg {
        position: relative;
        flex: 1 1 0;
        height: 8px;
        border-radius: 4px;
        transition: background 250ms ease;
      }
      .seg.on {
        height: 10px;
      }
      .marker {
        position: absolute;
        left: 0;
        top: 50%;
        width: 10px;
        height: 10px;
        margin-left: -5px;
        margin-top: -5px;
        border-radius: 50%;
        background: var(--silk-accent);
        box-shadow: 0 0 0 2px var(--card-background-color, #fff);
      }
      .ends {
        display: flex;
        justify-content: space-between;
        margin-top: 4px;
        font-size: 10px;
        line-height: 1;
        color: var(--primary-text-color);
        opacity: 0.4;
        pointer-events: none;
      }
      .unavailable .bar {
        opacity: 0.45;
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    'silk-dewpoint-card': SilkDewpointCard;
  }
}
