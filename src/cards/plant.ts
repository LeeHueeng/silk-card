import { LitElement, html, css, nothing, TemplateResult } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { HomeAssistant, HassEntity, LovelaceCardConfig } from '../types';
import { silkControlStyles } from '../shared/base';
import { isUnavailable, moreInfo, clamp } from '../shared/service';
import { accentFor } from '../shared/color';
import { registerEditor } from '../shared/editor';
import { formatNumber } from '../format';

export const META = {
  type: 'silk-plant-card',
  name: 'Silk Plant',
  description: "Moisture, light, and a plant that tells you when it's thirsty.",
};

/** Care limits. Anything omitted falls back to the Mi Flora-ish defaults. */
export interface PlantThresholds {
  moisture_min?: number;
  moisture_max?: number;
  light_min?: number;
}

export interface SilkPlantCardConfig extends LovelaceCardConfig {
  /** The plant's name — the one required key. */
  name: string;
  /** Photo URL for the 56px thumb; falls back to `icon` when absent or broken. */
  image?: string;
  /** Thumb icon when there is no image, defaults to mdi:flower. */
  icon?: string;
  /** Soil moisture sensor (%). */
  moisture?: string;
  /** Illuminance sensor (lx). */
  light?: string;
  temperature?: string;
  /** Soil conductivity sensor (µS/cm). */
  conductivity?: string;
  battery?: string;
  thresholds?: PlantThresholds;
  /** Accent override; otherwise derived from the moisture sensor. */
  color?: string;
}

const DEFAULT_ICON = 'mdi:flower';
const DEFAULT_MOISTURE_MIN = 20;
const DEFAULT_MOISTURE_MAX = 60;
const DEFAULT_LIGHT_MIN = 1500;

/** Display ceilings for the micro-bars — a readable scale, not a threshold. */
const TEMP_C_MAX = 40;
const TEMP_F_MIN = 32;
const TEMP_F_MAX = 104;
const EC_MAX = 2000;
const BATTERY_LOW = 20;
const BATTERY_WARN = 50;

type MetricKey = 'moisture' | 'light' | 'temperature' | 'conductivity' | 'battery';

const METRIC_ORDER: MetricKey[] = [
  'moisture',
  'light',
  'temperature',
  'conductivity',
  'battery',
];

const METRIC_LABELS: Record<MetricKey, string> = {
  moisture: 'Moisture',
  light: 'Light',
  temperature: 'Temp',
  conductivity: 'EC',
  battery: 'Battery',
};

/** Bar tint. `neutral` = the card accent; the rest are genuine status bands. */
type Band = 'crit' | 'warn' | 'good' | 'neutral';

type VerdictKey = 'thirsty' | 'wet' | 'light' | 'healthy' | 'none';

interface Verdict {
  key: VerdictKey;
  label: string;
  /** CSS color for the dot, the word, and the thumb tint. */
  color: string;
}

const VERDICTS: Record<VerdictKey, Verdict> = {
  thirsty: { key: 'thirsty', label: 'Thirsty', color: 'var(--error-color, #db4437)' },
  wet: { key: 'wet', label: 'Too wet', color: 'var(--warning-color, #ffa600)' },
  light: { key: 'light', label: 'Needs light', color: 'var(--warning-color, #ffa600)' },
  healthy: { key: 'healthy', label: 'Healthy', color: 'var(--success-color, #43a047)' },
  none: { key: 'none', label: 'No data', color: 'var(--secondary-text-color)' },
};

/** One mini readout: label above, value below, micro-bar underneath. */
interface Readout {
  key: MetricKey;
  entityId: string;
  label: string;
  value: string;
  /** 0–1 bar fill; null when the sensor has no usable reading. */
  fill: number | null;
  band: Band;
  title: string;
}

const EDITOR_TAG = 'silk-plant-card-editor';

registerEditor(
  EDITOR_TAG,
  [
    { name: 'name', required: true, selector: { text: {} } },
    { name: 'icon', selector: { icon: {} } },
    {
      name: '',
      type: 'grid',
      schema: [
        { name: 'moisture', selector: { entity: { domain: ['sensor', 'number'] } } },
        { name: 'light', selector: { entity: { domain: ['sensor'] } } },
        { name: 'temperature', selector: { entity: { domain: ['sensor'] } } },
        { name: 'conductivity', selector: { entity: { domain: ['sensor'] } } },
      ],
    },
  ],
  {
    name: 'Name',
    icon: 'Icon',
    moisture: 'Moisture sensor',
    light: 'Light sensor',
    temperature: 'Temperature sensor',
    conductivity: 'Conductivity sensor',
  },
  { icon: DEFAULT_ICON }
);

/** °C/°F condense to a bare degree sign; anything else renders as-is. */
function condenseUnit(unit: unknown): string {
  if (typeof unit !== 'string' || !unit) return '';
  if (unit === '°C' || unit === '°F') return '°';
  return unit;
}

/**
 * A plant's health in one glance: the verdict up top in plain words, the
 * numbers below. Bars that carry a real care threshold (moisture, light,
 * battery) take status colors; the rest stay on the single card accent.
 */
@customElement('silk-plant-card')
export class SilkPlantCard extends LitElement {
  @property({ attribute: false }) public hass?: HomeAssistant;

  @state() private _config?: SilkPlantCardConfig;

  /** True once the configured image fails to load → fall back to the icon. */
  @state() private _imageBroken = false;

  public static getStubConfig(hass: HomeAssistant): Partial<SilkPlantCardConfig> {
    const ids = Object.keys(hass.states).filter((id) => id.startsWith('sensor.'));
    const byName = (re: RegExp) =>
      ids.find((id) => re.test(`${id} ${String(hass.states[id].attributes.friendly_name ?? '')}`));
    const byClass = (cls: string) =>
      ids.find((id) => hass.states[id].attributes.device_class === cls);
    return {
      type: 'custom:silk-plant-card',
      name: 'Plant',
      icon: DEFAULT_ICON,
      moisture: byName(/moisture/i),
      light: byName(/illuminance|light/i) ?? byClass('illuminance'),
      temperature: byClass('temperature'),
      conductivity: byName(/conductivity/i),
    };
  }

  public static async getConfigElement(): Promise<HTMLElement> {
    return document.createElement(EDITOR_TAG);
  }

  public setConfig(config: SilkPlantCardConfig): void {
    if (!config.name) {
      throw new Error('silk-plant-card: `name` is required');
    }
    if (config.thresholds !== undefined) {
      if (typeof config.thresholds !== 'object' || Array.isArray(config.thresholds)) {
        throw new Error(
          'silk-plant-card: `thresholds` must be a map of {moisture_min, moisture_max, light_min}'
        );
      }
      for (const key of ['moisture_min', 'moisture_max', 'light_min'] as const) {
        const value = config.thresholds[key];
        if (value !== undefined && !Number.isFinite(Number(value))) {
          throw new Error(`silk-plant-card: threshold \`${key}\` must be a number`);
        }
      }
    }
    this._config = config;
    this._imageBroken = false;
  }

  public getCardSize(): number {
    return 2;
  }

  public getGridOptions(): Record<string, number> {
    return { columns: 6, rows: 2, min_columns: 3, min_rows: 2 };
  }

  private _thresholds(): { moistureMin: number; moistureMax: number; lightMin: number } {
    const t = this._config?.thresholds ?? {};
    const num = (value: unknown, fallback: number): number =>
      Number.isFinite(Number(value)) ? Number(value) : fallback;
    return {
      moistureMin: num(t.moisture_min, DEFAULT_MOISTURE_MIN),
      moistureMax: num(t.moisture_max, DEFAULT_MOISTURE_MAX),
      lightMin: num(t.light_min, DEFAULT_LIGHT_MIN),
    };
  }

  /** Configured metrics, in a fixed order, skipping the ones left out. */
  private _metrics(): { key: MetricKey; entityId: string }[] {
    const config = this._config;
    if (!config) return [];
    const out: { key: MetricKey; entityId: string }[] = [];
    for (const key of METRIC_ORDER) {
      const entityId = config[key];
      if (typeof entityId === 'string' && entityId) out.push({ key, entityId });
    }
    return out;
  }

  private _stateObj(entityId?: string): HassEntity | undefined {
    return entityId ? this.hass?.states[entityId] : undefined;
  }

  /** Numeric reading, or null when the sensor is missing, unavailable or text. */
  private _num(entityId?: string): number | null {
    const stateObj = this._stateObj(entityId);
    if (!stateObj || isUnavailable(stateObj) || stateObj.state === '') return null;
    const value = Number(stateObj.state);
    return Number.isFinite(value) ? value : null;
  }

  private _locale(): string {
    return this.hass?.locale?.language ?? this.hass?.language ?? 'en';
  }

  /** Big-range metrics (lx, µS/cm) compact to `1.2k` so the cell never wraps. */
  private _compact(entityId: string, value: number): string {
    if (Math.abs(value) < 1000) return formatNumber(this.hass, entityId, value);
    const k = value / 1000;
    return `${new Intl.NumberFormat(this._locale(), {
      maximumFractionDigits: Math.abs(k) >= 10 ? 0 : 1,
    }).format(k)}k`;
  }

  private _verdict(): Verdict {
    const { moistureMin, moistureMax, lightMin } = this._thresholds();
    const moisture = this._num(this._config?.moisture);
    const light = this._num(this._config?.light);
    if (moisture !== null && moisture < moistureMin) return VERDICTS.thirsty;
    if (moisture !== null && moisture > moistureMax) return VERDICTS.wet;
    if (light !== null && light < lightMin) return VERDICTS.light;
    const anyData = this._metrics().some((m) => this._num(m.entityId) !== null);
    return anyData ? VERDICTS.healthy : VERDICTS.none;
  }

  /** Bar fill (0–1) and tint for one metric. */
  private _band(key: MetricKey, value: number, stateObj: HassEntity): { fill: number; band: Band } {
    const { moistureMin, moistureMax, lightMin } = this._thresholds();
    switch (key) {
      case 'moisture':
        return {
          fill: clamp(value / 100, 0, 1),
          band: value < moistureMin ? 'crit' : value > moistureMax ? 'warn' : 'good',
        };
      case 'light':
        // The threshold sits at the bar's midpoint, so "enough light" reads as
        // past halfway without needing a tick mark.
        return {
          fill: clamp(value / (Math.max(lightMin, 1) * 2), 0, 1),
          band: value < lightMin ? 'warn' : 'good',
        };
      case 'battery':
        return {
          fill: clamp(value / 100, 0, 1),
          band: value < BATTERY_LOW ? 'crit' : value < BATTERY_WARN ? 'warn' : 'good',
        };
      case 'temperature': {
        const fahrenheit = String(stateObj.attributes.unit_of_measurement ?? '').includes('F');
        const fill = fahrenheit
          ? (value - TEMP_F_MIN) / (TEMP_F_MAX - TEMP_F_MIN)
          : value / TEMP_C_MAX;
        return { fill: clamp(fill, 0, 1), band: 'neutral' };
      }
      default:
        return { fill: clamp(value / EC_MAX, 0, 1), band: 'neutral' };
    }
  }

  private _readout(key: MetricKey, entityId: string): Readout {
    const stateObj = this._stateObj(entityId);
    const friendly = String(stateObj?.attributes.friendly_name ?? entityId);
    const value = this._num(entityId);
    if (!stateObj || value === null) {
      return {
        key,
        entityId,
        label: METRIC_LABELS[key],
        value: '—',
        fill: null,
        band: 'neutral',
        title: friendly,
      };
    }
    const { fill, band } = this._band(key, value, stateObj);
    const unit = condenseUnit(stateObj.attributes.unit_of_measurement);
    // Percentages and degrees read cleanest whole; the rest keep HA's precision.
    const numeric =
      key === 'moisture' || key === 'battery'
        ? String(Math.round(value))
        : key === 'light' || key === 'conductivity'
          ? this._compact(entityId, value)
          : formatNumber(this.hass, entityId, value);
    let label = METRIC_LABELS[key];
    let text = numeric;
    if (unit === '%' || unit === '°') text += unit;
    else if (unit && unit.length <= 2) text += ` ${unit}`;
    // A long unit (µS/cm) would push the value to an ellipsis — park it in the
    // 10px label instead, where there is room for it.
    else if (unit) label = `${label} ${unit}`;
    return { key, entityId, label, value: text, fill, band, title: `${friendly}: ${text}` };
  }

  private _onCardClick(): void {
    const target = this._config?.moisture ?? this._metrics()[0]?.entityId;
    if (target) moreInfo(this, target);
  }

  private _renderReadout(readout: Readout): TemplateResult {
    return html`
      <div class="metric" title=${readout.title}>
        <div class="mlabel">${readout.label}</div>
        <div class="mvalue">${readout.value}</div>
        <div class="mbar">
          ${readout.fill === null
            ? nothing
            : html`<span
                class="mfill ${readout.band}"
                style="width:${(readout.fill * 100).toFixed(1)}%"
              ></span>`}
        </div>
      </div>
    `;
  }

  protected render(): TemplateResult | typeof nothing {
    const config = this._config;
    const hass = this.hass;
    if (!config || !hass) return nothing;

    const metrics = this._metrics();
    const verdict = this._verdict();
    const accent = accentFor(this._stateObj(config.moisture ?? metrics[0]?.entityId), config.color);
    const image = config.image && !this._imageBroken ? config.image : undefined;
    const unavailable = verdict.key === 'none';

    return html`
      <ha-card
        class="control ${unavailable ? 'unavailable' : ''}"
        style="--silk-accent:${accent};--silk-verdict:${verdict.color}"
        @click=${this._onCardClick}
      >
        <div class="top">
          ${image
            ? html`<img
                class="thumb"
                src=${image}
                alt=${config.name}
                loading="lazy"
                @error=${() => {
                  this._imageBroken = true;
                }}
              />`
            : html`<div class="icon">
                <ha-icon .icon=${config.icon ?? DEFAULT_ICON}></ha-icon>
              </div>`}
          <div class="info">
            <div class="name">${config.name}</div>
            <div class="state verdict">
              <span class="dot"></span><span class="word">${verdict.label}</span>
            </div>
          </div>
        </div>
        ${metrics.length
          ? html`<div class="metrics">
              ${metrics.map((m) => this._renderReadout(this._readout(m.key, m.entityId)))}
            </div>`
          : html`<div class="empty">No sensors configured</div>`}
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
        padding: 10px 12px;
      }
      .top {
        flex: none;
        display: flex;
        align-items: center;
        gap: 12px;
        min-width: 0;
      }
      .thumb,
      .icon {
        flex: none;
        width: 56px;
        height: 56px;
        border-radius: 14px;
      }
      .thumb {
        display: block;
        object-fit: cover;
        background: rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.06);
        /* Hard 2px ring, zero blur — a border in the verdict color, not a glow. */
        box-shadow: 0 0 0 2px color-mix(in srgb, var(--silk-verdict) 55%, transparent);
        transition: box-shadow 200ms ease;
      }
      /* The thumb reads the verdict as surface: tinted fill, matching glyph. */
      .icon {
        cursor: pointer;
        color: var(--silk-verdict);
        background: color-mix(in srgb, var(--silk-verdict) 16%, transparent);
      }
      .icon:active {
        transform: none;
      }
      .icon ha-icon {
        --mdc-icon-size: 26px;
      }
      .name {
        font-size: 15px;
        font-weight: 600;
      }
      .verdict {
        display: flex;
        align-items: center;
        gap: 6px;
        min-width: 0;
      }
      .dot {
        flex: none;
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background: var(--silk-verdict);
        transition: background 200ms ease;
      }
      .word {
        min-width: 0;
        font-weight: 500;
        color: var(--silk-verdict);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        transition: color 200ms ease;
      }
      .metrics {
        flex: none;
        display: flex;
        align-items: flex-end;
        gap: 10px;
        min-width: 0;
      }
      .metric {
        flex: 1 1 0;
        min-width: 0;
      }
      .mlabel {
        font-size: 10px;
        line-height: 1.2;
        color: var(--secondary-text-color);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .mvalue {
        font-size: 13px;
        font-weight: 600;
        line-height: 1.25;
        color: var(--primary-text-color);
        font-variant-numeric: tabular-nums;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .mbar {
        height: 4px;
        margin-top: 3px;
        border-radius: 2px;
        overflow: hidden;
        background: rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.08);
      }
      .mfill {
        display: block;
        height: 100%;
        border-radius: 2px;
        background: var(--silk-accent);
        transition:
          width 400ms var(--silk-ease-out),
          background 200ms ease;
      }
      .mfill.crit {
        background: var(--error-color, #db4437);
      }
      .mfill.warn {
        background: var(--warning-color, #ffa600);
      }
      .mfill.good {
        background: var(--success-color, #43a047);
      }
      .empty {
        flex: none;
        font-size: 12px;
        color: var(--secondary-text-color);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .unavailable .thumb,
      .unavailable .metrics {
        opacity: 0.45;
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    'silk-plant-card': SilkPlantCard;
  }
}
