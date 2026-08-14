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
  stateText,
  clamp,
} from '../shared/service';
import { accentFor } from '../shared/color';
import { registerEditor } from '../shared/editor';

export const META = {
  type: 'silk-ev-card',
  name: 'Silk EV',
  description: 'Charging state, range, and the stop button.',
};

export interface SilkEvCardConfig extends LovelaceCardConfig {
  /** Charging state — a sensor (Charging/Complete/…) or a binary_sensor. */
  status?: string;
  /** Live charge power (W). */
  power?: string;
  /** Energy added this session (kWh). */
  energy?: string;
  /** Battery state of charge, 0–100 (%). */
  soc?: string;
  /** Estimated range, in the sensor's own unit. */
  range?: string;
  /** Charge goal in percent; drawn as a notch on the track. Default 80. */
  target?: number;
  /** A switch/button that starts and stops charging. */
  switch?: string;
  name?: string;
  icon?: string;
  /** Accent override (YAML). */
  color?: string;
}

const EDITOR_TAG = 'silk-ev-card-editor';

registerEditor(
  EDITOR_TAG,
  [
    { name: 'name', selector: { text: {} } },
    { name: 'status', selector: { entity: { domain: ['sensor', 'binary_sensor'] } } },
    {
      name: '',
      type: 'grid',
      schema: [
        { name: 'soc', selector: { entity: { domain: ['sensor', 'number', 'input_number'] } } },
        { name: 'range', selector: { entity: { domain: ['sensor'] } } },
        { name: 'power', selector: { entity: { domain: ['sensor'], device_class: 'power' } } },
        { name: 'energy', selector: { entity: { domain: ['sensor'], device_class: 'energy' } } },
      ],
    },
    {
      name: 'switch',
      selector: { entity: { domain: ['switch', 'button', 'input_boolean', 'script'] } },
    },
    {
      name: '',
      type: 'grid',
      schema: [
        { name: 'target', selector: { number: { min: 0, max: 100, step: 1, mode: 'box' } } },
        { name: 'icon', selector: { icon: {} } },
        { name: 'color', selector: { ui_color: {} } },
      ],
    },
  ],
  {
    name: '이름',
    status: '충전 상태',
    soc: '충전량 (%)',
    range: '주행 가능 거리',
    power: '충전 전력 (W)',
    energy: '이번 세션 전력량 (kWh)',
    switch: '시작/정지 스위치',
    target: '목표 충전량 (%)',
    icon: '아이콘',
    color: '강조 색상',
  },
  { target: 80, name: 'EV' }
);

const DEFAULT_TARGET = 80;
const DEFAULT_NAME = 'EV';
const DEFAULT_ICON = 'mdi:ev-station';
/** Below this a parked car is drawing housekeeping power, not charging. */
const ACTIVE_W = 50;
const OPTIMISTIC_TIMEOUT_MS = 2000;

/** Numeric state, NaN when the entity is missing/unavailable/non-numeric. */
function numericState(stateObj?: HassEntity): number {
  if (!stateObj || isUnavailable(stateObj) || stateObj.state === '') return NaN;
  return Number(stateObj.state);
}

/** Power in watts, honoring kW/MW units; NaN when the entity can't speak. */
function powerWatts(stateObj?: HassEntity): number {
  const value = numericState(stateObj);
  if (!Number.isFinite(value)) return NaN;
  const unit = String(stateObj?.attributes.unit_of_measurement ?? 'W')
    .trim()
    .toLowerCase();
  if (unit === 'kw') return value * 1000;
  if (unit === 'mw') return value * 1_000_000;
  return value;
}

/** Vendor charge states that explicitly are *not* charging. */
const IDLE_STATES = new Set([
  'off',
  'idle',
  'complete',
  'completed',
  'stopped',
  'disconnected',
  'unplugged',
  'not_charging',
  'no_power',
]);

/** Whether a charge-state entity reads as actively charging. */
function statusCharging(stateObj: HassEntity): boolean {
  const s = stateObj.state.toLowerCase().replace(/[\s-]+/g, '_');
  if (domainOf(stateObj.entity_id) === 'binary_sensor') return s === 'on';
  if (IDLE_STATES.has(s) || s.includes('not_charging')) return false;
  return s.includes('charging') || s === 'on';
}

const capitalize = (text: string): string =>
  text.length ? text.charAt(0).toUpperCase() + text.slice(1) : text;

/**
 * The EV row: what the charger is doing, how full the car is, how far it can
 * go, and the one button that starts or stops it.
 */
@customElement('silk-ev-card')
export class SilkEvCard extends LitElement {
  @property({ attribute: false }) public hass?: HomeAssistant;

  @state() private _config?: SilkEvCardConfig;

  /** Optimistic charging target after a button tap (null = trust the entities). */
  @state() private _optimistic: boolean | null = null;

  /** last_updated snapshot at tap time; any newer stamp clears the override. */
  private _optimisticBase = '';
  private _optimisticTimer?: number;

  public static getStubConfig(hass: HomeAssistant): Partial<SilkEvCardConfig> {
    const ids = Object.keys(hass.states);
    const soc = ids.find(
      (id) => id.startsWith('sensor.') && hass.states[id].attributes.device_class === 'battery'
    );
    const status = ids.find(
      (id) =>
        (id.startsWith('sensor.') || id.startsWith('binary_sensor.')) && /charg/i.test(id)
    );
    return { type: 'custom:silk-ev-card', soc, status, target: DEFAULT_TARGET };
  }

  public static async getConfigElement(): Promise<HTMLElement> {
    return document.createElement(EDITOR_TAG);
  }

  public setConfig(config: SilkEvCardConfig): void {
    if (!config.soc && !config.status && !config.power && !config.energy && !config.range && !config.switch) {
      throw new Error(
        'silk-ev-card: configure at least one of `soc`, `status`, `power`, `energy`, `range` or `switch`'
      );
    }
    if (
      config.target !== undefined &&
      (!Number.isFinite(Number(config.target)) || Number(config.target) < 0 || Number(config.target) > 100)
    ) {
      throw new Error('silk-ev-card: `target` must be a percentage between 0 and 100');
    }
    this._config = config;
    this._clearOptimistic();
  }

  public getCardSize(): number {
    return this._config?.switch ? 3 : 2;
  }

  public getGridOptions(): Record<string, number> {
    return { columns: 6, rows: 2, min_columns: 4, min_rows: 2 };
  }

  public disconnectedCallback(): void {
    super.disconnectedCallback();
    window.clearTimeout(this._optimisticTimer);
  }

  protected willUpdate(changed: PropertyValues): void {
    if (!changed.has('hass') || this._optimistic === null || !this._config?.switch) return;
    const stateObj = this.hass?.states[this._config.switch];
    if (stateObj && stateObj.last_updated !== this._optimisticBase) {
      this._clearOptimistic();
    }
  }

  private _clearOptimistic(): void {
    window.clearTimeout(this._optimisticTimer);
    this._optimisticTimer = undefined;
    this._optimistic = null;
  }

  /** Card taps land on the charge sensor, then the charge state, then whatever exists. */
  private _primaryEntity(): string | undefined {
    const config = this._config;
    if (!config) return undefined;
    return config.soc ?? config.status ?? config.switch ?? config.power ?? config.energy ?? config.range;
  }

  private _locale(): string {
    return this.hass?.locale?.language ?? this.hass?.language ?? 'en';
  }

  private _num(value: number, digits: number): string {
    return new Intl.NumberFormat(this._locale(), {
      minimumFractionDigits: digits,
      maximumFractionDigits: digits,
    }).format(value);
  }

  /**
   * Charging, from the strongest signal available: live power is ground truth,
   * then the charge-state entity, then the switch.
   */
  private _charging(statusObj: HassEntity | undefined, watts: number, switchObj?: HassEntity): boolean {
    if (Number.isFinite(watts) && watts > ACTIVE_W) return true;
    if (statusObj && !isUnavailable(statusObj)) return statusCharging(statusObj);
    if (Number.isFinite(watts)) return false;
    if (switchObj && !isUnavailable(switchObj)) return isActive(switchObj);
    return false;
  }

  private _onCardClick(): void {
    const entity = this._primaryEntity();
    if (entity) moreInfo(this, entity);
  }

  private _onActionClick(ev: Event): void {
    ev.stopPropagation();
    const config = this._config;
    const hass = this.hass;
    if (!config?.switch || !hass) return;
    const stateObj = hass.states[config.switch];
    if (!stateObj || isUnavailable(stateObj)) return;
    haptic(this);
    // Mirror what toggleEntity decides from the *real* state, so rapid taps
    // stay honest about the service calls actually sent.
    this._optimistic = !isActive(stateObj);
    this._optimisticBase = stateObj.last_updated;
    window.clearTimeout(this._optimisticTimer);
    this._optimisticTimer = window.setTimeout(() => this._clearOptimistic(), OPTIMISTIC_TIMEOUT_MS);
    toggleEntity(hass, config.switch);
  }

  /** State-line segments joined with the Silk separator. */
  private _line(segments: (string | undefined)[]): TemplateResult {
    const parts = segments.filter((segment): segment is string => !!segment);
    return html`${parts.map(
      (segment, i) => html`${i ? html`<span class="sep">·</span>` : nothing}${segment}`
    )}`;
  }

  protected render(): TemplateResult | typeof nothing {
    const config = this._config;
    const hass = this.hass;
    if (!config || !hass) return nothing;

    const primary = this._primaryEntity();
    const primaryObj = primary ? hass.states[primary] : undefined;
    if (primary && !primaryObj) {
      return html`
        <ha-card class="control">
          <div class="warning">Entity not found: ${primary}</div>
        </ha-card>
      `;
    }

    const statusObj = config.status ? hass.states[config.status] : undefined;
    const powerObj = config.power ? hass.states[config.power] : undefined;
    const energyObj = config.energy ? hass.states[config.energy] : undefined;
    const socObj = config.soc ? hass.states[config.soc] : undefined;
    const rangeObj = config.range ? hass.states[config.range] : undefined;
    const switchObj = config.switch ? hass.states[config.switch] : undefined;

    const unavailable = isUnavailable(primaryObj);
    const watts = powerWatts(powerObj);
    // While an optimistic override is live the whole card presents the tapped
    // intent, so accent, tint and the travelling highlight all agree.
    const charging = this._optimistic ?? this._charging(statusObj, watts, switchObj);

    const socRaw = numericState(socObj);
    const hasSoc = Number.isFinite(socRaw);
    const soc = hasSoc ? clamp(socRaw, 0, 100) : 0;
    const target = clamp(Number(config.target ?? DEFAULT_TARGET), 0, 100);
    const energy = numericState(energyObj);
    const range = numericState(rangeObj);

    const accent = accentFor(socObj ?? statusObj ?? switchObj, config.color);
    const name = config.name ?? DEFAULT_NAME;

    const statusLabel =
      statusObj && !isUnavailable(statusObj)
        ? domainOf(statusObj.entity_id) === 'binary_sensor'
          ? charging
            ? 'Charging'
            : 'Not charging'
          : capitalize(stateText(hass, statusObj))
        : charging
          ? 'Charging'
          : 'Idle';
    const powerText =
      Number.isFinite(watts) && watts > ACTIVE_W ? `${this._num(watts / 1000, 1)} kW` : undefined;
    const energyUnit = (energyObj?.attributes.unit_of_measurement as string | undefined) ?? 'kWh';
    const energyText = Number.isFinite(energy) ? `${this._num(energy, 1)} ${energyUnit}` : undefined;
    const rangeUnit = (rangeObj?.attributes.unit_of_measurement as string | undefined) ?? 'km';
    const rangeText = Number.isFinite(range) ? `${this._num(range, 0)} ${rangeUnit}` : undefined;

    // The row earns its space only when it can actually say something.
    const showBar = hasSoc || rangeText !== undefined;
    // The button follows its own entity: a dead range sensor must not disable
    // the one control that stops the charge.
    const switchUnavailable = !switchObj || isUnavailable(switchObj);

    return html`
      <ha-card
        class="control ${unavailable ? 'unavailable' : ''}"
        style="--silk-accent:${accent}"
        @click=${this._onCardClick}
      >
        <div class="top">
          <div class="icon ${charging && !unavailable ? 'on' : ''}">
            <ha-icon .icon=${config.icon ?? DEFAULT_ICON}></ha-icon>
          </div>
          <div class="info">
            <div class="name">${name}</div>
            <div class="state">
              ${this._line([statusLabel, powerText, hasSoc ? energyText : undefined])}
            </div>
          </div>
          ${hasSoc
            ? html`<div class="trailing"><span class="value">${Math.round(soc)}%</span></div>`
            : energyText
              ? html`
                  <div class="trailing">
                    <span class="value">${this._num(energy, 1)}</span>
                    <span class="unit">${energyUnit}</span>
                  </div>
                `
              : nothing}
        </div>
        ${showBar
          ? html`
              <div class="bar">
                ${hasSoc
                  ? html`
                      <div
                        class="track"
                        role="progressbar"
                        aria-valuemin="0"
                        aria-valuemax="100"
                        aria-valuenow=${Math.round(soc)}
                      >
                        <div class="fill" style="width:${soc.toFixed(2)}%">
                          ${charging && !unavailable ? html`<span class="shine"></span>` : nothing}
                        </div>
                        <span class="notch" style="left:${target.toFixed(2)}%">
                          <span class="sr">Target ${Math.round(target)}%</span>
                        </span>
                      </div>
                    `
                  : nothing}
                ${rangeText ? html`<span class="range">${rangeText}</span>` : nothing}
              </div>
            `
          : nothing}
        ${config.switch
          ? html`
              <button
                class="action ${charging && !switchUnavailable ? 'on' : ''}"
                ?disabled=${switchUnavailable}
                aria-label=${charging ? `Stop charging ${name}` : `Start charging ${name}`}
                @click=${this._onActionClick}
              >
                ${charging ? 'Stop charging' : 'Start charging'}
              </button>
            `
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
      }
      .top {
        flex: none;
        display: flex;
        align-items: center;
        gap: 12px;
        min-width: 0;
      }
      /* The action button owns the control, so the icon presses with the card. */
      .icon {
        cursor: pointer;
      }
      .icon:active {
        transform: none;
      }
      .value {
        font-size: 20px;
        letter-spacing: -0.02em;
      }
      .bar {
        flex: none;
        display: flex;
        align-items: center;
        gap: 10px;
        min-width: 0;
      }
      .track {
        position: relative;
        flex: 1;
        min-width: 0;
        height: 8px;
        border-radius: 999px;
        background: rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.08);
        overflow: hidden;
      }
      .fill {
        position: absolute;
        inset: 0 auto 0 0;
        border-radius: 999px;
        background: var(--silk-accent);
        overflow: hidden;
        transition:
          width 400ms var(--silk-ease-out),
          background 200ms ease;
      }
      /* Real activity: a monochrome highlight travelling with the current. */
      .shine {
        position: absolute;
        top: 0;
        bottom: 0;
        width: 34%;
        min-width: 24px;
        background: linear-gradient(
          90deg,
          rgba(255, 255, 255, 0) 0%,
          rgba(255, 255, 255, 0.4) 50%,
          rgba(255, 255, 255, 0) 100%
        );
        transform: translateX(-120%);
        animation: silk-ev-travel 1600ms linear infinite;
        will-change: transform;
      }
      /* Recessive goal marker: it reads as a scale mark, never as a second value. */
      .notch {
        position: absolute;
        top: 0;
        bottom: 0;
        width: 2px;
        margin-left: -1px;
        border-radius: 1px;
        background: rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.45);
      }
      .sr {
        position: absolute;
        width: 1px;
        height: 1px;
        overflow: hidden;
        clip-path: inset(50%);
        white-space: nowrap;
      }
      .range {
        flex: none;
        font-size: 12.5px;
        line-height: 1.3;
        color: var(--secondary-text-color);
        font-variant-numeric: tabular-nums;
        white-space: nowrap;
      }
      .action {
        flex: none;
        width: 100%;
        height: 36px;
        border: none;
        border-radius: 12px;
        padding: 0 12px;
        font: inherit;
        font-size: 13px;
        font-weight: 600;
        cursor: pointer;
        color: var(--secondary-text-color);
        background: rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.06);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        transition:
          transform 250ms var(--silk-spring),
          background 200ms ease,
          color 200ms ease;
      }
      .action:hover:not(:disabled) {
        background: rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.12);
      }
      .action:active:not(:disabled) {
        transform: scale(0.97);
        transition-duration: 120ms;
        transition-timing-function: var(--silk-ease-out);
      }
      .action.on {
        color: var(--silk-accent);
        background: color-mix(in srgb, var(--silk-accent) 16%, transparent);
      }
      .action:focus-visible {
        outline: 2px solid color-mix(in srgb, var(--silk-accent) 70%, transparent);
        outline-offset: 2px;
      }
      .action:disabled {
        opacity: 0.35;
        cursor: default;
      }
      .unavailable .bar {
        opacity: 0.45;
      }
      @keyframes silk-ev-travel {
        from {
          transform: translateX(-120%);
        }
        to {
          transform: translateX(320%);
        }
      }
      @media (prefers-reduced-motion: reduce) {
        .shine {
          display: none;
        }
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    'silk-ev-card': SilkEvCard;
  }
}
