import { LitElement, html, css, nothing, PropertyValues, TemplateResult } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { HomeAssistant, HassEntity, LovelaceCardConfig } from '../types';
import { silkControlStyles } from '../shared/base';
import {
  domainOf,
  isActive,
  isUnavailable,
  toggleEntity,
  moreInfo,
  haptic,
  clamp,
} from '../shared/service';
import { accentFor } from '../shared/color';
import { registerEditor } from '../shared/editor';
import { formatNumber } from '../format';

export const META = {
  type: 'silk-aquarium-card',
  name: 'Silk Aquarium',
  description: 'The tank, in numbers that matter.',
};

export interface SilkAquariumCardConfig extends LovelaceCardConfig {
  /** Water temperature sensor — the one required reading. */
  temperature: string;
  ph?: string;
  /** Total dissolved solids, in ppm. */
  tds?: string;
  /** Percentage sensor, or a binary_sensor that trips when the tank is low. */
  water_level?: string;
  /** Light switch. */
  light?: string;
  /** Circulation pump switch. */
  pump?: string;
  /** Feeder: a button, script or scene — pressed, never toggled. */
  feeder?: string;
  name?: string;
  /** Header icon; defaults to mdi:fishbowl-outline. */
  icon?: string;
  /** Accent override. */
  color?: string;
}

type MetricKey = 'temperature' | 'ph' | 'tds' | 'water_level';

/** Reading health. `neutral` = no safe range applies, so it wears the accent. */
type Band = 'good' | 'warn' | 'crit' | 'neutral';

interface SafeRange {
  /** Inclusive safe window, in the canonical unit. */
  lo: number;
  hi: number;
  /** How far outside the window still counts as "drifting" rather than "wrong". */
  tolerance: number;
  /** Display scale for the 4px band bar — a readable axis, not a threshold. */
  scaleMin: number;
  scaleMax: number;
}

/** Hobbyist-standard tropical freshwater ranges; temps are canonically °C. */
const RANGES: Record<'temperature' | 'ph' | 'tds', SafeRange> = {
  temperature: { lo: 24, hi: 27, tolerance: 1.5, scaleMin: 18, scaleMax: 33 },
  ph: { lo: 6.5, hi: 7.5, tolerance: 0.4, scaleMin: 5, scaleMax: 9 },
  tds: { lo: 150, hi: 400, tolerance: 75, scaleMin: 0, scaleMax: 600 },
};

const METRIC_ORDER: MetricKey[] = ['temperature', 'ph', 'tds', 'water_level'];

const METRIC_LABELS: Record<MetricKey, string> = {
  temperature: 'Temp',
  ph: 'pH',
  tds: 'TDS',
  water_level: 'Level',
};

/** Word for the header when a reading needs attention. */
const CHECK_LABELS: Record<MetricKey, string> = {
  temperature: 'Check temp',
  ph: 'Check pH',
  tds: 'Check TDS',
  water_level: 'Check level',
};

const DEFAULT_ICON = 'mdi:fishbowl-outline';
const OPTIMISTIC_TIMEOUT_MS = 2000;
/** How long the Feed chip stays acknowledged after a press. */
const FED_TIMEOUT_MS = 2500;
const SEVERITY: Record<Band, number> = { neutral: 0, good: 0, warn: 1, crit: 2 };

interface Readout {
  key: MetricKey;
  entityId: string;
  label: string;
  value: string;
  /** 0–1 along the display scale; null when there is nothing to draw. */
  fill: number | null;
  band: Band;
  title: string;
}

interface ControlChip {
  key: 'light' | 'pump' | 'feeder';
  entityId: string;
  label: string;
  stateObj?: HassEntity;
}

/** '°C'/'°F' → '°'; everything else trimmed. */
function condenseUnit(unit: unknown): string {
  const u = String(unit ?? '').trim();
  return u.startsWith('°') ? '°' : u;
}

function bandFor(value: number, range: SafeRange): Band {
  if (value >= range.lo && value <= range.hi) return 'good';
  if (value >= range.lo - range.tolerance && value <= range.hi + range.tolerance) return 'warn';
  return 'crit';
}

const EDITOR_TAG = 'silk-aquarium-card-editor';

registerEditor(
  EDITOR_TAG,
  [
    { name: 'temperature', required: true, selector: { entity: { domain: ['sensor'] } } },
    {
      name: '',
      type: 'grid',
      schema: [
        { name: 'ph', selector: { entity: { domain: ['sensor'] } } },
        { name: 'tds', selector: { entity: { domain: ['sensor'] } } },
      ],
    },
    {
      name: 'water_level',
      selector: { entity: { domain: ['sensor', 'binary_sensor'] } },
    },
    {
      name: '',
      type: 'grid',
      schema: [
        { name: 'light', selector: { entity: { domain: ['switch', 'light'] } } },
        { name: 'pump', selector: { entity: { domain: ['switch'] } } },
      ],
    },
    { name: 'feeder', selector: { entity: { domain: ['button', 'input_button', 'script', 'scene'] } } },
    { name: 'name', selector: { text: {} } },
  ],
  {
    temperature: 'Temperature',
    ph: 'pH',
    tds: 'TDS',
    water_level: 'Water level',
    light: 'Light',
    pump: 'Pump',
    feeder: 'Feeder',
    name: 'Name',
  }
);

/**
 * The tank at a glance: four readings with a hairline band bar each, and the
 * three things you actually reach for. Colour here is genuinely semantic —
 * a bar only leaves the accent when the water has left its safe range.
 */
@customElement('silk-aquarium-card')
export class SilkAquariumCard extends LitElement {
  @property({ attribute: false }) public hass?: HomeAssistant;

  @state() private _config?: SilkAquariumCardConfig;

  /** Optimistic on/off per control entity (absent key = trust the real state). */
  @state() private _optimistic: Record<string, boolean> = {};

  /** Epoch ms of the last feeder press, or 0 — drives the "Fed" chip label. */
  @state() private _fedAt = 0;

  /** last_updated snapshots at toggle time; a newer stamp clears the override. */
  private _optimisticBase: Record<string, string> = {};
  private _optimisticTimers: Record<string, number> = {};
  private _fedTimer?: number;

  public static getStubConfig(hass: HomeAssistant): Partial<SilkAquariumCardConfig> {
    const ids = Object.keys(hass.states);
    const looksAquatic = (id: string): boolean =>
      /aquarium|tank|fish|water/i.test(
        `${id} ${String(hass.states[id].attributes.friendly_name ?? '')}`
      );
    const temps = ids.filter(
      (id) => id.startsWith('sensor.') && hass.states[id].attributes.device_class === 'temperature'
    );
    return {
      type: 'custom:silk-aquarium-card',
      temperature: temps.find(looksAquatic) ?? temps[0],
      light: ids.filter((id) => id.startsWith('switch.')).find(looksAquatic),
    };
  }

  public static async getConfigElement(): Promise<HTMLElement> {
    return document.createElement(EDITOR_TAG);
  }

  public setConfig(config: SilkAquariumCardConfig): void {
    if (!config.temperature) {
      throw new Error('silk-aquarium-card: `temperature` is required');
    }
    const feeder = config.feeder;
    if (feeder && !['button', 'input_button', 'script', 'scene'].includes(domainOf(feeder))) {
      throw new Error('silk-aquarium-card: `feeder` must be a button, script or scene entity');
    }
    this._config = config;
    this._clearOptimistic();
  }

  public getCardSize(): number {
    return 3;
  }

  public getGridOptions(): Record<string, number> {
    return { columns: 6, rows: 3, min_columns: 4, min_rows: 3 };
  }

  public disconnectedCallback(): void {
    super.disconnectedCallback();
    this._clearOptimistic();
    window.clearTimeout(this._fedTimer);
    this._fedTimer = undefined;
  }

  protected willUpdate(changed: PropertyValues): void {
    if (!changed.has('hass') || !this.hass) return;
    // Drop each override the moment HA reports a fresher state for it.
    for (const id of Object.keys(this._optimistic)) {
      const stateObj = this.hass.states[id];
      if (stateObj && stateObj.last_updated !== this._optimisticBase[id]) this._release(id);
    }
  }

  private _clearOptimistic(): void {
    for (const timer of Object.values(this._optimisticTimers)) window.clearTimeout(timer);
    this._optimisticTimers = {};
    this._optimisticBase = {};
    this._optimistic = {};
  }

  private _release(entityId: string): void {
    window.clearTimeout(this._optimisticTimers[entityId]);
    delete this._optimisticTimers[entityId];
    delete this._optimisticBase[entityId];
    const next = { ...this._optimistic };
    delete next[entityId];
    this._optimistic = next;
  }

  private _stateObj(entityId?: string): HassEntity | undefined {
    return entityId ? this.hass?.states[entityId] : undefined;
  }

  /** Numeric reading, or null when the sensor has nothing usable to say. */
  private _num(entityId?: string): number | null {
    const stateObj = this._stateObj(entityId);
    if (!stateObj || isUnavailable(stateObj) || stateObj.state === '') return null;
    const value = Number(stateObj.state);
    return Number.isFinite(value) ? value : null;
  }

  private _configured(): { key: MetricKey; entityId: string }[] {
    const config = this._config;
    if (!config) return [];
    return METRIC_ORDER.filter((key) => !!config[key]).map((key) => ({
      key,
      entityId: String(config[key]),
    }));
  }

  /** Band + bar fill for one reading. Fahrenheit is folded back to °C first. */
  private _band(key: MetricKey, value: number, stateObj: HassEntity): { fill: number; band: Band } {
    if (key === 'water_level') {
      // A plain level percentage carries no safe range — accent, no verdict.
      return { fill: clamp(value / 100, 0, 1), band: 'neutral' };
    }
    const range = RANGES[key];
    let canonical = value;
    if (key === 'temperature' && String(stateObj.attributes.unit_of_measurement ?? '').includes('F')) {
      canonical = ((value - 32) * 5) / 9;
    }
    const span = range.scaleMax - range.scaleMin;
    return {
      fill: clamp((canonical - range.scaleMin) / (span || 1), 0, 1),
      band: bandFor(canonical, range),
    };
  }

  private _readout(key: MetricKey, entityId: string): Readout {
    const stateObj = this._stateObj(entityId);
    const friendly = String(stateObj?.attributes.friendly_name ?? entityId);
    const blank: Readout = {
      key,
      entityId,
      label: METRIC_LABELS[key],
      value: '—',
      fill: null,
      band: 'neutral',
      title: `${friendly}: unavailable`,
    };
    if (!stateObj || isUnavailable(stateObj)) return blank;

    // A binary water-level sensor is a genuine status, not a measurement.
    if (key === 'water_level' && domainOf(entityId) === 'binary_sensor') {
      const low = stateObj.state === 'on';
      return {
        key,
        entityId,
        label: METRIC_LABELS[key],
        value: low ? 'Low' : 'OK',
        fill: low ? 0.18 : 1,
        band: low ? 'crit' : 'good',
        title: `${friendly}: ${low ? 'low' : 'ok'}`,
      };
    }

    const value = this._num(entityId);
    if (value === null) return blank;
    const { fill, band } = this._band(key, value, stateObj);
    const unit = condenseUnit(stateObj.attributes.unit_of_measurement);
    // pH is unitless and reads best at one decimal; the rest keep HA's precision.
    const numeric =
      key === 'ph'
        ? new Intl.NumberFormat(this._locale(), { maximumFractionDigits: 1 }).format(value)
        : formatNumber(this.hass, entityId, value);
    let label = METRIC_LABELS[key];
    let text = numeric;
    if (unit === '°' || unit === '%') text += unit;
    // A long unit (ppm, µS/cm) would push the value into an ellipsis — it
    // lives in the 10px label instead, where there is room for it.
    else if (unit) label = `${label} ${unit}`;
    return { key, entityId, label, value: text, fill, band, title: `${friendly}: ${text}` };
  }

  /** Header verdict: the worst reading names itself, otherwise 'Stable'. */
  private _verdict(readouts: Readout[]): { word: string; band: Band } {
    let worst: Readout | undefined;
    for (const readout of readouts) {
      if (SEVERITY[readout.band] > SEVERITY[worst?.band ?? 'neutral']) worst = readout;
    }
    if (worst) return { word: CHECK_LABELS[worst.key], band: worst.band };
    const anyData = readouts.some((r) => r.fill !== null);
    return anyData ? { word: 'Stable', band: 'good' } : { word: 'No readings', band: 'neutral' };
  }

  private _controls(): ControlChip[] {
    const config = this._config;
    if (!config) return [];
    const chips: ControlChip[] = [];
    if (config.light) chips.push({ key: 'light', entityId: config.light, label: 'Light' });
    if (config.pump) chips.push({ key: 'pump', entityId: config.pump, label: 'Pump' });
    if (config.feeder) chips.push({ key: 'feeder', entityId: config.feeder, label: 'Feed' });
    return chips.map((chip) => ({ ...chip, stateObj: this._stateObj(chip.entityId) }));
  }

  private _locale(): string {
    return this.hass?.locale?.language ?? this.hass?.language ?? 'en';
  }

  private _onCardClick(): void {
    if (this._config) moreInfo(this, this._config.temperature);
  }

  private _onToggle(ev: Event, entityId: string): void {
    ev.stopPropagation();
    const hass = this.hass;
    const stateObj = this._stateObj(entityId);
    if (!hass || !stateObj || isUnavailable(stateObj)) return;
    haptic(this);
    this._optimistic = { ...this._optimistic, [entityId]: !isActive(stateObj) };
    this._optimisticBase[entityId] = stateObj.last_updated;
    window.clearTimeout(this._optimisticTimers[entityId]);
    this._optimisticTimers[entityId] = window.setTimeout(
      () => this._release(entityId),
      OPTIMISTIC_TIMEOUT_MS
    );
    void toggleEntity(hass, entityId);
  }

  /** Feeding is a press, never a toggle — a running script must not be cancelled. */
  private _onFeed(ev: Event, entityId: string): void {
    ev.stopPropagation();
    const hass = this.hass;
    const stateObj = this._stateObj(entityId);
    if (!hass || !stateObj || isUnavailable(stateObj)) return;
    haptic(this, 'success');
    const domain = domainOf(entityId);
    const data = { entity_id: entityId };
    if (domain === 'button' || domain === 'input_button') void hass.callService(domain, 'press', data);
    else void hass.callService(domain, 'turn_on', data);
    this._fedAt = Date.now();
    window.clearTimeout(this._fedTimer);
    this._fedTimer = window.setTimeout(() => {
      this._fedTimer = undefined;
      this._fedAt = 0;
    }, FED_TIMEOUT_MS);
  }

  private _renderReadout(readout: Readout): TemplateResult {
    return html`
      <div class="cell" title=${readout.title}>
        <div class="clabel">${readout.label}</div>
        <div class="cvalue ${readout.band}">${readout.value}</div>
        <div class="cband">
          ${readout.fill === null
            ? nothing
            : html`<span
                class="cfill ${readout.band}"
                style="width:${(readout.fill * 100).toFixed(1)}%"
              ></span>`}
        </div>
      </div>
    `;
  }

  private _renderControl(chip: ControlChip): TemplateResult {
    const unavailable = !chip.stateObj || isUnavailable(chip.stateObj);
    if (chip.key === 'feeder') {
      const fed = this._fedAt > 0;
      return html`
        <button
          class="chip ctl ${fed ? 'active' : ''}"
          .disabled=${unavailable}
          aria-label=${`Feed using ${String(chip.stateObj?.attributes.friendly_name ?? chip.entityId)}`}
          @click=${(ev: Event) => this._onFeed(ev, chip.entityId)}
        >
          ${fed ? 'Fed' : chip.label}
        </button>
      `;
    }
    const on = this._optimistic[chip.entityId] ?? (!unavailable && isActive(chip.stateObj));
    return html`
      <button
        class="chip ctl ${on ? 'active' : ''}"
        role="switch"
        aria-checked=${on ? 'true' : 'false'}
        aria-label=${`Toggle ${chip.label.toLowerCase()}`}
        .disabled=${unavailable}
        @click=${(ev: Event) => this._onToggle(ev, chip.entityId)}
      >
        ${chip.label}
      </button>
    `;
  }

  protected render(): TemplateResult | typeof nothing {
    const config = this._config;
    const hass = this.hass;
    if (!config || !hass) return nothing;
    const tempObj = hass.states[config.temperature];
    if (!tempObj) {
      return html`
        <ha-card class="control">
          <div class="warning">Entity not found: ${config.temperature}</div>
        </ha-card>
      `;
    }

    const readouts = this._configured().map((m) => this._readout(m.key, m.entityId));
    const verdict = this._verdict(readouts);
    const accent = accentFor(tempObj, config.color);
    const name = config.name ?? tempObj.attributes.friendly_name ?? 'Aquarium';
    const controls = this._controls();
    const unavailable = readouts.every((r) => r.fill === null);
    const statusColor =
      verdict.band === 'crit'
        ? 'var(--error-color, #db4437)'
        : verdict.band === 'warn'
          ? 'var(--warning-color, #ffa600)'
          : 'var(--silk-accent)';

    return html`
      <ha-card
        class="control ${unavailable ? 'unavailable' : ''}"
        style="--silk-accent:${accent};--silk-status:${statusColor}"
        @click=${this._onCardClick}
      >
        <div class="top">
          <div class="icon on">
            <ha-icon .icon=${config.icon ?? DEFAULT_ICON}></ha-icon>
          </div>
          <div class="info">
            <div class="name">${name}</div>
            <div class="state status">
              <span class="dot"></span><span class="word">${verdict.word}</span>
            </div>
          </div>
        </div>
        ${readouts.length
          ? html`<div class="cells">${readouts.map((r) => this._renderReadout(r))}</div>`
          : nothing}
        ${controls.length
          ? html`<div class="ctls">${controls.map((c) => this._renderControl(c))}</div>`
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
        justify-content: center;
        gap: 10px;
        padding: 12px 14px;
      }
      .top {
        flex: none;
        display: flex;
        align-items: center;
        gap: 12px;
        min-width: 0;
      }
      /* The tank icon is not a control here: it presses with the card. */
      .icon {
        cursor: pointer;
      }
      .icon:active {
        transform: none;
      }
      .status {
        display: flex;
        align-items: center;
        gap: 6px;
        min-width: 0;
      }
      .dot {
        flex: none;
        width: 7px;
        height: 7px;
        border-radius: 50%;
        background: var(--silk-status);
        transition: background 200ms ease;
      }
      .word {
        min-width: 0;
        font-weight: 500;
        color: var(--silk-status);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        transition: color 200ms ease;
      }
      .cells {
        flex: none;
        display: flex;
        align-items: flex-end;
        gap: 10px;
        min-width: 0;
      }
      .cell {
        flex: 1 1 0;
        min-width: 0;
      }
      .clabel {
        font-size: 10px;
        line-height: 1.2;
        color: var(--secondary-text-color);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .cvalue {
        font-size: 15px;
        font-weight: 600;
        line-height: 1.3;
        letter-spacing: -0.01em;
        color: var(--primary-text-color);
        font-variant-numeric: tabular-nums;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        transition: color 200ms ease;
      }
      .cvalue.warn {
        color: var(--warning-color, #ffa600);
      }
      .cvalue.crit {
        color: var(--error-color, #db4437);
      }
      .cband {
        height: 4px;
        margin-top: 4px;
        border-radius: 2px;
        overflow: hidden;
        background: rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.08);
      }
      .cfill {
        display: block;
        height: 100%;
        border-radius: 2px;
        background: var(--silk-accent);
        transition:
          width 400ms var(--silk-ease-out),
          background 200ms ease;
      }
      .cfill.good {
        background: var(--success-color, #43a047);
      }
      .cfill.warn {
        background: var(--warning-color, #ffa600);
      }
      .cfill.crit {
        background: var(--error-color, #db4437);
      }
      .ctls {
        flex: none;
        display: flex;
        align-items: center;
        gap: 8px;
        min-width: 0;
      }
      .ctl {
        flex: 1 1 0;
        min-width: 0;
        min-height: 36px;
        padding: 8px 10px;
        font-size: 12px;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        transition:
          background 200ms ease,
          color 200ms ease,
          transform 250ms var(--silk-spring);
      }
      .ctl:active:not(:disabled) {
        transform: scale(0.97);
        transition-duration: 120ms;
        transition-timing-function: var(--silk-ease-out);
      }
      .ctl:focus-visible {
        outline: 2px solid color-mix(in srgb, var(--silk-accent) 70%, transparent);
        outline-offset: 2px;
      }
      .ctl:disabled {
        opacity: 0.45;
        cursor: default;
      }
      .ctl:disabled:hover {
        background: rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.06);
      }
      .unavailable .cells,
      .unavailable .ctls {
        opacity: 0.45;
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    'silk-aquarium-card': SilkAquariumCard;
  }
}
