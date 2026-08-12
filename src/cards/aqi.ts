import { LitElement, html, css, nothing, TemplateResult } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { HomeAssistant, HassEntity, LovelaceCardConfig } from '../types';
import { silkControlStyles } from '../shared/base';
import { isUnavailable, moreInfo } from '../shared/service';
import { formatNumber } from '../format';

export const META = {
  type: 'silk-aqi-card',
  name: 'Silk Air',
  description: 'One verdict for your air, with receipts.',
};

export type AirMetric = 'pm25' | 'pm10' | 'co2' | 'voc' | 'humidity';

export interface AirEntities {
  pm25?: string;
  pm10?: string;
  co2?: string;
  voc?: string;
  humidity?: string;
}

export interface SilkAqiCardConfig extends LovelaceCardConfig {
  entities: AirEntities;
  name?: string;
  icon?: string;
}

type Band = 'good' | 'fair' | 'poor';

const METRICS: AirMetric[] = ['pm25', 'pm10', 'co2', 'voc', 'humidity'];

const LABELS: Record<AirMetric, string> = {
  pm25: 'PM2.5',
  pm10: 'PM10',
  co2: 'CO₂',
  voc: 'VOC',
  humidity: 'Humidity',
};

/** Unit shown when the sensor doesn't report one. */
const FALLBACK_UNITS: Record<AirMetric, string> = {
  pm25: 'µg/m³',
  pm10: 'µg/m³',
  co2: 'ppm',
  voc: '',
  humidity: '%',
};

/** Local banding table — WHO/EPA-flavored breakpoints, one verdict per metric. */
const BAND_OF: Record<AirMetric, (v: number) => Band> = {
  pm25: (v) => (v < 12 ? 'good' : v < 35 ? 'fair' : 'poor'),
  pm10: (v) => (v < 54 ? 'good' : v < 154 ? 'fair' : 'poor'),
  co2: (v) => (v < 800 ? 'good' : v < 1200 ? 'fair' : 'poor'),
  voc: (v) => (v < 220 ? 'good' : v < 660 ? 'fair' : 'poor'),
  humidity: (v) => (v >= 30 && v <= 60 ? 'good' : v >= 25 && v <= 70 ? 'fair' : 'poor'),
};

const BAND_RANK: Record<Band, number> = { good: 0, fair: 1, poor: 2 };
const BAND_WORD: Record<Band, string> = { good: 'Good', fair: 'Fair', poor: 'Poor' };
// Status colors carry real meaning here (air verdicts), so they are the one
// sanctioned use of success/warning/error chroma in Silk.
const BAND_COLOR: Record<Band, string> = {
  good: 'var(--success-color, #57ad60)',
  fair: 'var(--warning-color, #e6a23c)',
  poor: 'var(--error-color, #db4437)',
};

interface Reading {
  metric: AirMetric;
  entityId: string;
  stateObj?: HassEntity;
  value: number | null;
  band: Band | null;
}

const EDITOR_TAG = 'silk-aqi-card-editor';

const EDITOR_SCHEMA = [
  { name: 'pm25', selector: { entity: { domain: ['sensor'] } } },
  { name: 'pm10', selector: { entity: { domain: ['sensor'] } } },
  { name: 'co2', selector: { entity: { domain: ['sensor'] } } },
  { name: 'voc', selector: { entity: { domain: ['sensor'] } } },
  { name: 'humidity', selector: { entity: { domain: ['sensor'] } } },
  { name: 'name', selector: { text: {} } },
];

const EDITOR_LABELS: Record<string, string> = {
  pm25: 'PM2.5 sensor',
  pm10: 'PM10 sensor',
  co2: 'CO₂ sensor',
  voc: 'VOC sensor',
  humidity: 'Humidity sensor',
  name: 'Name',
};

/**
 * Local editor instead of the shared registerEditor: `entities` is a nested
 * object, which ha-form addresses only as flat keys — so the five metric
 * entity ids are flattened into the form and folded back on change.
 */
class SilkAqiCardEditor extends LitElement {
  @property({ attribute: false }) public hass?: HomeAssistant;
  @state() private _config?: SilkAqiCardConfig;

  public setConfig(config: SilkAqiCardConfig): void {
    this._config = config;
  }

  protected render(): TemplateResult | typeof nothing {
    if (!this.hass || !this._config) return nothing;
    const data = { name: this._config.name, ...(this._config.entities ?? {}) };
    return html`
      <ha-form
        .hass=${this.hass}
        .data=${data}
        .schema=${EDITOR_SCHEMA}
        .computeLabel=${(s: { name: string }) => EDITOR_LABELS[s.name] ?? s.name}
        @value-changed=${this._valueChanged}
      ></ha-form>
    `;
  }

  private _valueChanged(ev: CustomEvent): void {
    ev.stopPropagation();
    const value = ev.detail.value as Record<string, unknown>;
    const entities: AirEntities = {};
    for (const metric of METRICS) {
      const id = value[metric];
      if (typeof id === 'string' && id) entities[metric] = id;
    }
    const config: SilkAqiCardConfig = { ...this._config!, entities };
    if (typeof value.name === 'string' && value.name) config.name = value.name;
    else delete config.name;
    this.dispatchEvent(
      new CustomEvent('config-changed', {
        detail: { config },
        bubbles: true,
        composed: true,
      })
    );
  }
}

if (!customElements.get(EDITOR_TAG)) customElements.define(EDITOR_TAG, SilkAqiCardEditor);

@customElement('silk-aqi-card')
export class SilkAqiCard extends LitElement {
  @property({ attribute: false }) public hass?: HomeAssistant;

  @state() private _config?: SilkAqiCardConfig;

  /** Configured metrics in canonical order, set by setConfig. */
  private _metrics: AirMetric[] = [];

  public static getStubConfig(hass: HomeAssistant): Partial<SilkAqiCardConfig> {
    const ids = Object.keys(hass.states).filter((id) => id.startsWith('sensor.'));
    const byClass = (cls: string): string | undefined =>
      ids.find((id) => hass.states[id].attributes.device_class === cls);
    const found: [AirMetric, string | undefined][] = [
      ['pm25', byClass('pm25')],
      ['pm10', byClass('pm10')],
      ['co2', byClass('carbon_dioxide')],
      ['voc', byClass('volatile_organic_compounds')],
      ['humidity', byClass('humidity')],
    ];
    const entities: AirEntities = {};
    for (const [metric, id] of found) if (id) entities[metric] = id;
    return { type: 'custom:silk-aqi-card', entities };
  }

  public static async getConfigElement(): Promise<HTMLElement> {
    return document.createElement(EDITOR_TAG);
  }

  public setConfig(config: SilkAqiCardConfig): void {
    const entities = config.entities;
    const configured =
      entities && typeof entities === 'object'
        ? METRICS.filter((m) => typeof entities[m] === 'string' && entities[m])
        : [];
    if (configured.length === 0) {
      throw new Error(
        'silk-aqi-card: `entities` needs at least one of pm25, pm10, co2, voc, humidity'
      );
    }
    this._config = config;
    this._metrics = configured;
  }

  public getCardSize(): number {
    return 2;
  }

  public getGridOptions(): Record<string, number> {
    return { columns: 6, rows: 2, min_columns: 4, min_rows: 1 };
  }

  private _readings(hass: HomeAssistant): Reading[] {
    return this._metrics.map((metric) => {
      const entityId = this._config!.entities[metric]!;
      const stateObj = hass.states[entityId];
      const raw = stateObj && !isUnavailable(stateObj) ? Number(stateObj.state) : NaN;
      const ok = Number.isFinite(raw);
      return {
        metric,
        entityId,
        stateObj,
        value: ok ? raw : null,
        band: ok ? BAND_OF[metric](raw) : null,
      };
    });
  }

  private _onCardClick(): void {
    const first = this._metrics[0];
    if (this._config && first) moreInfo(this, this._config.entities[first]!);
  }

  private _onChipClick(ev: Event, entityId: string): void {
    ev.stopPropagation();
    moreInfo(this, entityId);
  }

  protected render(): TemplateResult | typeof nothing {
    const config = this._config;
    const hass = this.hass;
    if (!config || !hass) return nothing;

    const readings = this._readings(hass);
    if (readings.every((r) => !r.stateObj)) {
      return html`<ha-card
        ><div class="warning">Entity not found: ${readings[0].entityId}</div></ha-card
      >`;
    }

    const worst = readings.reduce<Band | null>(
      (acc, r) => (r.band && (!acc || BAND_RANK[r.band] > BAND_RANK[acc]) ? r.band : acc),
      null
    );
    const unavailable = readings.every((r) => r.band === null);
    const accent = worst ? BAND_COLOR[worst] : 'var(--primary-color, #4aa8ff)';
    const name = config.name ?? 'Air quality';

    return html`
      <ha-card
        class="control ${unavailable ? 'unavailable' : ''}"
        style="--silk-accent:${accent}"
        @click=${this._onCardClick}
      >
        <div class="top">
          ${config.icon
            ? html`<div class="icon ${worst ? 'on' : ''}">
                <ha-icon .icon=${config.icon}></ha-icon>
              </div>`
            : nothing}
          <div class="info">
            <div class="verdict ${worst ? '' : 'none'}">
              <span class="vdot"></span>
              <span class="word">${worst ? BAND_WORD[worst] : '—'}</span>
            </div>
            <div class="state">${name}</div>
          </div>
        </div>
        <div class="chips">
          ${readings.map((r) => {
            const unit = r.stateObj?.attributes.unit_of_measurement ?? FALLBACK_UNITS[r.metric];
            const reading =
              r.value !== null
                ? `${formatNumber(hass, r.entityId, r.value)}${unit ? ` ${unit}` : ''}`
                : '—';
            return html`
              <button
                class="chip ${r.band ?? ''}"
                aria-label=${`${LABELS[r.metric]}: ${reading}`}
                @click=${(ev: Event) => this._onChipClick(ev, r.entityId)}
              >
                <span class="metric">${LABELS[r.metric]}</span>
                <span class="reading">${reading}</span>
              </button>
            `;
          })}
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
        justify-content: center;
        gap: 10px;
      }
      .top {
        flex: none;
        display: flex;
        align-items: center;
        gap: 12px;
        min-width: 0;
      }
      /* The verdict card has no control action: the icon presses with the card. */
      .icon {
        cursor: pointer;
      }
      .icon:active {
        transform: none;
      }
      .verdict {
        display: flex;
        align-items: center;
        gap: 7px;
        font-size: 20px;
        font-weight: 700;
        letter-spacing: -0.01em;
        line-height: 1.2;
        color: var(--silk-accent);
        white-space: nowrap;
        min-width: 0;
        transition: color 200ms ease;
      }
      .verdict.none {
        color: var(--secondary-text-color);
      }
      .vdot {
        flex: none;
        width: 10px;
        height: 10px;
        border-radius: 50%;
        background: currentColor;
      }
      .word {
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .chips {
        flex: none;
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
        min-width: 0;
      }
      .chip {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        white-space: nowrap;
        font-variant-numeric: tabular-nums;
      }
      .chip .reading {
        font-weight: 500;
      }
      .chip.good {
        color: var(--success-color, #57ad60);
        background: color-mix(in srgb, var(--success-color, #57ad60) 14%, transparent);
      }
      .chip.fair {
        color: var(--warning-color, #e6a23c);
        background: color-mix(in srgb, var(--warning-color, #e6a23c) 14%, transparent);
      }
      .chip.poor {
        color: var(--error-color, #db4437);
        background: color-mix(in srgb, var(--error-color, #db4437) 14%, transparent);
      }
      .unavailable .top,
      .unavailable .chips {
        opacity: 0.45;
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    'silk-aqi-card': SilkAqiCard;
  }
}
