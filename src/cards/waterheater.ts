import { LitElement, html, css, nothing, PropertyValues, TemplateResult } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { HomeAssistant, HassEntity, LovelaceCardConfig } from '../types';
import { silkControlStyles } from '../shared/base';
import {
  domainOf,
  isUnavailable,
  moreInfo,
  haptic,
  supportsFeature,
  clamp,
} from '../shared/service';
import { accentFor } from '../shared/color';
import { registerEditor } from '../shared/editor';

export const META = {
  type: 'silk-water-heater-card',
  name: 'Silk Water Heater',
  description: 'Hot water, on your terms.',
};

/** WaterHeaterEntityFeature bits (HA core). */
const FEAT_TARGET_TEMPERATURE = 1;
const FEAT_OPERATION_MODE = 2;
const FEAT_ON_OFF = 8;

const SEND_DEBOUNCE_MS = 800;
const OPTIMISTIC_HOLD_MS = 2000;

/**
 * `accentFor` has no water_heater mapping (it would fall back to the primary
 * color), so the domain accent lives here: warm, because this card is only ever
 * about hot water. A theme that defines the state var still wins.
 */
const WATER_HEATER_ACCENT = 'var(--state-water_heater-active-color, #e8734f)';

/** Humanized labels for the operation modes HA ships; anything else is title-cased. */
const MODE_LABELS: Record<string, string> = {
  eco: 'Eco',
  electric: 'Electric',
  performance: 'Performance',
  high_demand: 'High demand',
  heat_pump: 'Heat pump',
  gas: 'Gas',
  off: 'Off',
};

interface SilkWaterHeaterCardConfig extends LovelaceCardConfig {
  entity: string;
  name?: string;
  icon?: string;
  color?: string;
}

const EDITOR_TAG = 'silk-water-heater-card-editor';

registerEditor(
  EDITOR_TAG,
  [
    { name: 'entity', required: true, selector: { entity: { domain: ['water_heater'] } } },
    { name: 'name', selector: { text: {} } },
    {
      name: '',
      type: 'grid',
      schema: [
        { name: 'icon', selector: { icon: {} } },
        { name: 'color', selector: { text: {} } },
      ],
    },
  ],
  { entity: 'Entity', name: 'Name', icon: 'Icon', color: 'Accent color' }
);

function asNumber(value: unknown): number | undefined {
  if (value === null || value === undefined || value === '') return undefined;
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
}

/** Decimal places implied by a step (capped at 2 to defeat float noise). */
function stepDecimals(step: number): number {
  const text = String(step);
  const dot = text.indexOf('.');
  return dot < 0 ? 0 : Math.min(text.length - dot - 1, 2);
}

function modeLabel(mode: string): string {
  if (MODE_LABELS[mode]) return MODE_LABELS[mode];
  const text = mode.replace(/_/g, ' ');
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** `away_mode` is reported as 'on'/'off' by core, but booleans exist in the wild. */
function awayOn(raw: unknown): boolean {
  return raw === true || raw === 'on';
}

@customElement('silk-water-heater-card')
export class SilkWaterHeaterCard extends LitElement {
  @property({ attribute: false }) public hass?: HomeAssistant;

  @state() private _config?: SilkWaterHeaterCardConfig;
  @state() private _optTarget?: number;
  @state() private _optMode?: string;
  @state() private _optAway?: boolean;

  private _sendTimer?: number;
  private _holdTimer?: number;
  private _modeHoldTimer?: number;
  private _awayHoldTimer?: number;

  public static getStubConfig(hass: HomeAssistant): Partial<SilkWaterHeaterCardConfig> {
    const entity = Object.keys(hass.states).find((id) => id.startsWith('water_heater.'));
    return { type: 'custom:silk-water-heater-card', entity };
  }

  public static async getConfigElement(): Promise<HTMLElement> {
    return document.createElement(EDITOR_TAG);
  }

  public setConfig(config: SilkWaterHeaterCardConfig): void {
    if (!config.entity || domainOf(config.entity) !== 'water_heater') {
      throw new Error(
        'silk-water-heater-card: define a water_heater `entity` (e.g. water_heater.boiler)'
      );
    }
    this._config = config;
    this._optTarget = this._optMode = undefined;
    this._optAway = undefined;
  }

  public getCardSize(): number {
    return 2;
  }

  public getGridOptions(): Record<string, number> {
    return { columns: 6, rows: 2, min_columns: 4, min_rows: 2 };
  }

  public disconnectedCallback(): void {
    super.disconnectedCallback();
    window.clearTimeout(this._holdTimer);
    window.clearTimeout(this._modeHoldTimer);
    window.clearTimeout(this._awayHoldTimer);
    if (this._sendTimer !== undefined) {
      // Don't lose a pending target edit just because the card left the DOM.
      window.clearTimeout(this._sendTimer);
      this._sendTimer = undefined;
      this._commit();
    }
  }

  protected willUpdate(changed: PropertyValues): void {
    if (!changed.has('hass') || !this._config || !this.hass) return;
    const oldObj = (changed.get('hass') as HomeAssistant | undefined)?.states[this._config.entity];
    const newObj = this.hass.states[this._config.entity];
    if (!newObj || newObj === oldObj) return;
    // A confirmed change drops the matching optimistic override — but never
    // while an edit is still queued to send.
    if (
      this._sendTimer === undefined &&
      this._optTarget !== undefined &&
      newObj.attributes.temperature !== oldObj?.attributes.temperature
    ) {
      this._optTarget = undefined;
    }
    if (this._optMode !== undefined && newObj.state !== oldObj?.state) {
      this._optMode = undefined;
    }
    if (
      this._optAway !== undefined &&
      newObj.attributes.away_mode !== oldObj?.attributes.away_mode
    ) {
      this._optAway = undefined;
    }
  }

  /** House temperature unit; `hass.config` is outside Silk's minimal type. */
  private _tempUnit(): string {
    const hass = this.hass as
      | (HomeAssistant & { config?: { unit_system?: { temperature?: string } } })
      | undefined;
    return hass?.config?.unit_system?.temperature ?? '°';
  }

  private _step(stateObj: HassEntity): number {
    return asNumber(stateObj.attributes.target_temp_step) ?? 1;
  }

  private _target(stateObj: HassEntity): number | undefined {
    return this._optTarget ?? asNumber(stateObj.attributes.temperature);
  }

  private _onCardClick(): void {
    if (this._config) moreInfo(this, this._config.entity);
  }

  /** The icon is the power control when the entity supports it, else more-info. */
  private _onIconClick(ev: Event): void {
    ev.stopPropagation();
    const hass = this.hass;
    const entity = this._config?.entity;
    const stateObj = entity ? hass?.states[entity] : undefined;
    if (!hass || !entity || !stateObj) return;
    if (!supportsFeature(stateObj, FEAT_ON_OFF) || isUnavailable(stateObj)) {
      moreInfo(this, entity);
      return;
    }
    const on = (this._optMode ?? stateObj.state) !== 'off';
    haptic(this);
    // Only 'off' is a knowable outcome: turn_on restores whichever operation
    // mode the entity remembers, so that direction waits for the real state.
    if (on) this._setOptimisticMode('off');
    hass.callService('water_heater', on ? 'turn_off' : 'turn_on', { entity_id: entity });
  }

  private _onStep(ev: Event, dir: 1 | -1): void {
    ev.stopPropagation();
    const hass = this.hass;
    const stateObj = this._config ? hass?.states[this._config.entity] : undefined;
    if (!hass || !stateObj || isUnavailable(stateObj)) return;
    const attrs = stateObj.attributes;
    const step = this._step(stateObj);
    const min = asNumber(attrs.min_temp) ?? Number.NEGATIVE_INFINITY;
    const max = asNumber(attrs.max_temp) ?? Number.POSITIVE_INFINITY;
    const base = this._target(stateObj) ?? asNumber(attrs.current_temperature) ?? 0;
    const next = clamp(base + dir * step, min, max);
    const rounded = Number(next.toFixed(stepDecimals(step)));
    if (rounded === base) return; // already at the end of the range

    this._optTarget = rounded;
    haptic(this, 'selection');
    window.clearTimeout(this._holdTimer);
    window.clearTimeout(this._sendTimer);
    this._sendTimer = window.setTimeout(() => {
      this._sendTimer = undefined;
      this._commit();
    }, SEND_DEBOUNCE_MS);
  }

  private _commit(): void {
    const hass = this.hass;
    const entity = this._config?.entity;
    const stateObj = entity ? hass?.states[entity] : undefined;
    if (!hass || !entity || !stateObj) return;
    const temperature = this._target(stateObj);
    if (temperature === undefined) return;
    hass.callService('water_heater', 'set_temperature', { entity_id: entity, temperature });
    if (this.isConnected) {
      window.clearTimeout(this._holdTimer);
      this._holdTimer = window.setTimeout(() => {
        this._optTarget = undefined;
      }, OPTIMISTIC_HOLD_MS);
    } else {
      this._optTarget = undefined;
    }
  }

  private _setOptimisticMode(mode: string): void {
    this._optMode = mode;
    window.clearTimeout(this._modeHoldTimer);
    this._modeHoldTimer = window.setTimeout(() => {
      this._optMode = undefined;
    }, OPTIMISTIC_HOLD_MS);
  }

  private _onMode(ev: Event, mode: string): void {
    ev.stopPropagation();
    const hass = this.hass;
    const entity = this._config?.entity;
    const stateObj = entity ? hass?.states[entity] : undefined;
    if (!hass || !entity || !stateObj || isUnavailable(stateObj)) return;
    if ((this._optMode ?? stateObj.state) === mode) return;
    haptic(this);
    this._setOptimisticMode(mode);
    hass.callService('water_heater', 'set_operation_mode', {
      entity_id: entity,
      operation_mode: mode,
    });
  }

  private _onAway(ev: Event): void {
    ev.stopPropagation();
    const hass = this.hass;
    const entity = this._config?.entity;
    const stateObj = entity ? hass?.states[entity] : undefined;
    if (!hass || !entity || !stateObj || isUnavailable(stateObj)) return;
    const next = !(this._optAway ?? awayOn(stateObj.attributes.away_mode));
    haptic(this);
    this._optAway = next;
    window.clearTimeout(this._awayHoldTimer);
    this._awayHoldTimer = window.setTimeout(() => {
      this._optAway = undefined;
    }, OPTIMISTIC_HOLD_MS);
    hass.callService('water_heater', 'set_away_mode', { entity_id: entity, away_mode: next });
  }

  protected render(): TemplateResult | typeof nothing {
    const config = this._config;
    const hass = this.hass;
    if (!config || !hass) return nothing;
    const stateObj = hass.states[config.entity];
    if (!stateObj) {
      return html`<ha-card><div class="warning">Entity not found: ${config.entity}</div></ha-card>`;
    }

    const unavailable = isUnavailable(stateObj);
    const attrs = stateObj.attributes;
    const mode = this._optMode ?? (attrs.operation_mode as string | undefined) ?? stateObj.state;
    // While an optimistic mode is live, the icon must agree with the tapped chip.
    const displayObj: HassEntity =
      this._optMode !== undefined && this._optMode !== stateObj.state
        ? { ...stateObj, state: this._optMode }
        : stateObj;
    const accent = accentFor(displayObj, config.color ?? WATER_HEATER_ACCENT);
    const name = config.name ?? attrs.friendly_name ?? config.entity;
    const unit = this._tempUnit();
    const current = asNumber(attrs.current_temperature);
    const on = !unavailable && displayObj.state !== 'off';

    return html`
      <ha-card
        class="control ${unavailable ? 'unavailable' : ''}"
        style="--silk-accent:${accent}"
        @click=${this._onCardClick}
      >
        <div class="row">
          <button
            class="icon ${on ? 'on' : ''}"
            aria-label=${supportsFeature(stateObj, FEAT_ON_OFF) ? `Toggle ${name}` : 'Show details'}
            @click=${this._onIconClick}
          >
            ${config.icon
              ? html`<ha-icon .icon=${config.icon}></ha-icon>`
              : html`<ha-state-icon .hass=${hass} .stateObj=${displayObj}></ha-state-icon>`}
          </button>
          <div class="info">
            <div class="name" title=${name}>${name}</div>
            <div class="state">
              ${modeLabel(mode)}${current !== undefined
                ? html`<span class="sep">·</span>${this._formatTemp(current, 0)}°`
                : nothing}
            </div>
          </div>
          ${this._renderTarget(stateObj, unavailable, unit)}
        </div>
        <div class="row controls">${this._renderModes(stateObj, unavailable)}</div>
      </ha-card>
    `;
  }

  private _renderTarget(
    stateObj: HassEntity,
    unavailable: boolean,
    unit: string
  ): TemplateResult | typeof nothing {
    if (!supportsFeature(stateObj, FEAT_TARGET_TEMPERATURE)) return nothing;
    const attrs = stateObj.attributes;
    const decimals = stepDecimals(this._step(stateObj));
    const target = this._target(stateObj);
    const min = asNumber(attrs.min_temp);
    const max = asNumber(attrs.max_temp);
    const atMin = target !== undefined && min !== undefined && target <= min;
    const atMax = target !== undefined && max !== undefined && target >= max;
    return html`
      <div class="trailing stepper">
        <button
          class="step"
          ?disabled=${unavailable || atMin}
          aria-label="Decrease target temperature"
          @click=${(ev: Event) => this._onStep(ev, -1)}
        >
          <ha-icon icon="mdi:minus"></ha-icon>
        </button>
        <span class="value target" title=${`Target temperature (${unit})`}>
          ${target !== undefined ? this._formatTemp(target, decimals) : '–'}°
        </span>
        <button
          class="step"
          ?disabled=${unavailable || atMax}
          aria-label="Increase target temperature"
          @click=${(ev: Event) => this._onStep(ev, 1)}
        >
          <ha-icon icon="mdi:plus"></ha-icon>
        </button>
      </div>
    `;
  }

  private _renderModes(stateObj: HassEntity, unavailable: boolean): TemplateResult | typeof nothing {
    const attrs = stateObj.attributes;
    const list = Array.isArray(attrs.operation_list) ? attrs.operation_list.map(String) : [];
    const modes = supportsFeature(stateObj, FEAT_OPERATION_MODE) ? list : [];
    const hasAway = attrs.away_mode !== undefined && attrs.away_mode !== null;
    if (!modes.length && !hasAway) return nothing;
    const current = this._optMode ?? (attrs.operation_mode as string | undefined) ?? stateObj.state;
    const away = this._optAway ?? awayOn(attrs.away_mode);
    return html`
      <div class="modes">
        ${modes.map((mode) => {
          const active = mode === current;
          return html`
            <button
              class="chip ${active ? 'active' : ''}"
              aria-pressed=${active ? 'true' : 'false'}
              title=${modeLabel(mode)}
              ?disabled=${unavailable}
              @click=${(ev: Event) => this._onMode(ev, mode)}
            >
              ${modeLabel(mode)}
            </button>
          `;
        })}
      </div>
      ${hasAway
        ? html`
            <button
              class="chip away ${away ? 'active' : ''}"
              aria-pressed=${away ? 'true' : 'false'}
              title="Away mode"
              ?disabled=${unavailable}
              @click=${this._onAway}
            >
              Away
            </button>
          `
        : nothing}
    `;
  }

  /** Trailing `.0` is noise on a thermostat readout. */
  private _formatTemp(value: number, decimals: number): string {
    return decimals > 0 ? String(Number(value.toFixed(decimals))) : String(Math.round(value));
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
      .row {
        display: flex;
        align-items: center;
        gap: 12px;
        min-width: 0;
      }
      .row.controls {
        gap: 8px;
      }
      .stepper {
        gap: 6px;
      }
      .step {
        flex: none;
        width: 36px;
        height: 36px;
        border: none;
        border-radius: 50%;
        display: grid;
        place-items: center;
        padding: 0;
        cursor: pointer;
        color: var(--primary-text-color);
        background: rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.06);
        transition:
          transform 250ms var(--silk-spring),
          background 200ms ease,
          opacity 200ms ease;
      }
      .step:hover:not(:disabled) {
        background: rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.12);
      }
      .step:active:not(:disabled) {
        transform: scale(0.9);
        transition-duration: 120ms;
        transition-timing-function: var(--silk-ease-out);
      }
      .step:disabled {
        opacity: 0.35;
        cursor: default;
      }
      .step ha-icon {
        --mdc-icon-size: 18px;
        pointer-events: none;
      }
      .target {
        min-width: 44px;
        text-align: center;
        white-space: nowrap;
      }
      /* Modes take the room they need; Away keeps its own slot on the right. */
      .modes {
        flex: 1 1 auto;
        display: flex;
        align-items: center;
        gap: 6px;
        min-width: 0;
        overflow-x: auto;
        scrollbar-width: none;
        -ms-overflow-style: none;
      }
      .modes::-webkit-scrollbar {
        display: none;
      }
      .chip {
        position: relative;
        flex: none;
        max-width: 108px;
        height: 30px;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        transition:
          transform 250ms var(--silk-spring),
          background 200ms ease,
          color 200ms ease;
      }
      /* Invisible halo lifts the 30px chip past the touch-target floor. */
      .chip::after {
        content: '';
        position: absolute;
        inset: -6px;
        border-radius: 999px;
      }
      .chip:active:not(:disabled) {
        transform: scale(0.94);
        transition-duration: 120ms;
        transition-timing-function: var(--silk-ease-out);
      }
      .chip:focus-visible {
        outline: 2px solid color-mix(in srgb, var(--silk-accent) 70%, transparent);
        outline-offset: 2px;
      }
      .chip:disabled {
        cursor: default;
      }
      .chip.away {
        flex: none;
        margin-left: auto;
      }
      .icon:disabled {
        cursor: default;
      }
      .unavailable .controls {
        opacity: 0.45;
        pointer-events: none;
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    'silk-water-heater-card': SilkWaterHeaterCard;
  }
}
