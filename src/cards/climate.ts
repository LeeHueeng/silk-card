import { LitElement, html, css, nothing, PropertyValues, TemplateResult } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { HomeAssistant, HassEntity, LovelaceCardConfig } from '../types';
import { silkControlStyles } from '../shared/base';
import {
  domainOf,
  isActive,
  isUnavailable,
  moreInfo,
  haptic,
  stateText,
  supportsFeature,
  clamp,
} from '../shared/service';
import { accentFor } from '../shared/color';
import { registerEditor } from '../shared/editor';

export const META = {
  type: 'silk-climate-card',
  name: 'Silk Climate',
  description: 'A compact thermostat: current, target, and modes in one block.',
};

/** climate.ClimateEntityFeature.TARGET_TEMPERATURE_RANGE */
const FEATURE_TARGET_TEMPERATURE_RANGE = 2;

const SEND_DEBOUNCE_MS = 800;
const OPTIMISTIC_HOLD_MS = 2000;

const MODE_ICONS: Record<string, string> = {
  heat: 'mdi:fire',
  cool: 'mdi:snowflake',
  heat_cool: 'mdi:sun-snowflake-variant',
  auto: 'mdi:thermostat-auto',
  dry: 'mdi:water-percent',
  fan_only: 'mdi:fan',
  off: 'mdi:power',
};

interface SilkClimateCardConfig extends LovelaceCardConfig {
  entity: string;
  name?: string;
  icon?: string;
  color?: string;
}

type TargetKey = 'target' | 'low' | 'high';

registerEditor(
  'silk-climate-card-editor',
  [
    { name: 'entity', required: true, selector: { entity: { domain: ['climate'] } } },
    { name: 'name', selector: { text: {} } },
    { name: 'icon', selector: { icon: {} } },
  ],
  { entity: 'Entity', name: 'Name', icon: 'Icon' }
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

function titleCase(value: string): string {
  const text = value.replace(/_/g, ' ');
  return text.charAt(0).toUpperCase() + text.slice(1);
}

@customElement('silk-climate-card')
export class SilkClimateCard extends LitElement {
  @property({ attribute: false }) public hass?: HomeAssistant;

  @state() private _config?: SilkClimateCardConfig;
  @state() private _optTarget?: number;
  @state() private _optLow?: number;
  @state() private _optHigh?: number;
  @state() private _optMode?: string;

  private _sendTimer?: number;
  private _holdTimer?: number;
  private _modeHoldTimer?: number;

  public static getStubConfig(hass: HomeAssistant): Partial<SilkClimateCardConfig> {
    const entity = Object.keys(hass.states).find((id) => id.startsWith('climate.'));
    return { type: 'custom:silk-climate-card', entity };
  }

  public static async getConfigElement(): Promise<HTMLElement> {
    return document.createElement('silk-climate-card-editor');
  }

  public setConfig(config: SilkClimateCardConfig): void {
    if (!config.entity || domainOf(config.entity) !== 'climate') {
      throw new Error('silk-climate-card: `entity` is required and must be a climate entity');
    }
    this._config = config;
    this._optTarget = this._optLow = this._optHigh = this._optMode = undefined;
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
    if (this._sendTimer !== undefined) {
      // Don't lose a pending target edit just because the card left the DOM.
      window.clearTimeout(this._sendTimer);
      this._sendTimer = undefined;
      this._commit();
    }
  }

  protected willUpdate(changed: PropertyValues): void {
    if (!changed.has('hass') || !this._config || !this.hass) return;
    const oldHass = changed.get('hass') as HomeAssistant | undefined;
    const oldObj = oldHass?.states[this._config.entity];
    const newObj = this.hass.states[this._config.entity];
    if (!newObj || newObj === oldObj) return;
    // Real state updates clear optimistic overrides — but only once nothing is
    // still queued to send, and only when the confirmed field actually moved.
    if (this._sendTimer === undefined) {
      const oldAttrs = oldObj?.attributes;
      const newAttrs = newObj.attributes;
      if (this._optTarget !== undefined && newAttrs.temperature !== oldAttrs?.temperature) {
        this._optTarget = undefined;
      }
      if (this._optLow !== undefined && newAttrs.target_temp_low !== oldAttrs?.target_temp_low) {
        this._optLow = undefined;
      }
      if (this._optHigh !== undefined && newAttrs.target_temp_high !== oldAttrs?.target_temp_high) {
        this._optHigh = undefined;
      }
    }
    if (this._optMode !== undefined && newObj.state !== oldObj?.state) {
      this._optMode = undefined;
    }
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
    const displayObj: HassEntity =
      this._optMode !== undefined && this._optMode !== stateObj.state
        ? { ...stateObj, state: this._optMode }
        : stateObj;
    const accent = accentFor(displayObj, config.color);
    const name = config.name ?? stateObj.attributes.friendly_name ?? config.entity;
    const modeText = stateText(hass, displayObj);
    const action = stateObj.attributes.hvac_action as string | undefined;
    const actionText = action ? titleCase(action) : undefined;
    const showAction =
      actionText !== undefined && actionText.toLowerCase() !== modeText.toLowerCase();
    const current = asNumber(stateObj.attributes.current_temperature);
    const tempUnit =
      (hass as HomeAssistant & { config?: { unit_system?: { temperature?: string } } }).config
        ?.unit_system?.temperature ?? '°';

    return html`
      <ha-card
        class="control ${unavailable ? 'unavailable' : ''}"
        style="--silk-accent:${accent}"
        @click=${this._onCardClick}
      >
        <div class="row">
          <button
            class="icon ${!unavailable && isActive(displayObj) ? 'on' : ''}"
            aria-label="Show details"
            @click=${this._onIconClick}
          >
            ${config.icon
              ? html`<ha-icon .icon=${config.icon}></ha-icon>`
              : html`<ha-state-icon .hass=${hass} .stateObj=${displayObj}></ha-state-icon>`}
          </button>
          <div class="info">
            <div class="name">${name}</div>
            <div class="state">
              ${modeText}${showAction
                ? html`<span class="sep">·</span>${actionText}`
                : nothing}
            </div>
          </div>
          <div class="trailing hero">
            ${current !== undefined
              ? html`<span class="current">${this._formatCurrent(current)}</span
                  ><span class="degree">${tempUnit}</span>`
              : nothing}
          </div>
        </div>
        <div class="row controls">
          ${this._renderSteppers(stateObj, unavailable)} ${this._renderModes(stateObj, unavailable)}
        </div>
      </ha-card>
    `;
  }

  private _renderSteppers(stateObj: HassEntity, disabled: boolean): TemplateResult {
    const attrs = stateObj.attributes;
    const decimals = stepDecimals(asNumber(attrs.target_temp_step) ?? 0.5);
    if (supportsFeature(stateObj, FEATURE_TARGET_TEMPERATURE_RANGE)) {
      const low = this._optLow ?? asNumber(attrs.target_temp_low);
      const high = this._optHigh ?? asNumber(attrs.target_temp_high);
      return html`
        ${this._renderStepper('low', low, decimals, disabled)}
        ${this._renderStepper('high', high, decimals, disabled)}
      `;
    }
    const target = this._optTarget ?? asNumber(attrs.temperature);
    return this._renderStepper('target', target, decimals, disabled);
  }

  private _renderStepper(
    key: TargetKey,
    value: number | undefined,
    decimals: number,
    disabled: boolean
  ): TemplateResult {
    const label = key === 'low' ? 'lower target' : key === 'high' ? 'upper target' : 'target';
    return html`
      <div class="stepper">
        <button
          class="step"
          ?disabled=${disabled}
          aria-label="Decrease ${label} temperature"
          @click=${(ev: Event) => this._onStep(ev, key, -1)}
        >
          <ha-icon icon="mdi:minus"></ha-icon>
        </button>
        <span class="value target">${value !== undefined ? value.toFixed(decimals) : '–'}</span>
        <button
          class="step"
          ?disabled=${disabled}
          aria-label="Increase ${label} temperature"
          @click=${(ev: Event) => this._onStep(ev, key, 1)}
        >
          <ha-icon icon="mdi:plus"></ha-icon>
        </button>
      </div>
    `;
  }

  private _renderModes(stateObj: HassEntity, disabled: boolean): TemplateResult | typeof nothing {
    const modes = stateObj.attributes.hvac_modes as string[] | undefined;
    if (!modes?.length) return nothing;
    const effectiveMode = this._optMode ?? stateObj.state;
    return html`
      <div class="modes">
        ${modes.map(
          (mode) => html`
            <button
              class="chip mode ${mode === effectiveMode ? 'active' : ''}"
              ?disabled=${disabled}
              aria-label=${titleCase(mode)}
              title=${titleCase(mode)}
              @click=${(ev: Event) => this._onMode(ev, mode)}
            >
              <ha-icon .icon=${MODE_ICONS[mode] ?? 'mdi:thermostat'}></ha-icon>
            </button>
          `
        )}
      </div>
    `;
  }

  /** Hero value: at most one decimal, trailing `.0` trimmed. */
  private _formatCurrent(value: number): string {
    return String(Math.round(value * 10) / 10);
  }

  private _onCardClick(): void {
    if (this._config) moreInfo(this, this._config.entity);
  }

  private _onIconClick(ev: Event): void {
    ev.stopPropagation();
    if (this._config) moreInfo(this, this._config.entity);
  }

  private _onStep(ev: Event, key: TargetKey, dir: 1 | -1): void {
    ev.stopPropagation();
    const hass = this.hass;
    const stateObj = this._config ? hass?.states[this._config.entity] : undefined;
    if (!hass || !stateObj || isUnavailable(stateObj)) return;
    const attrs = stateObj.attributes;
    const step = asNumber(attrs.target_temp_step) ?? 0.5;
    const decimals = stepDecimals(step);
    const min = asNumber(attrs.min_temp) ?? 7;
    const max = asNumber(attrs.max_temp) ?? 35;
    const fallback = asNumber(attrs.current_temperature) ?? (min + max) / 2;
    const move = (base: number, lo: number, hi: number): number =>
      Number(clamp(base + dir * step, lo, hi).toFixed(decimals));

    if (key === 'low') {
      const high = this._optHigh ?? asNumber(attrs.target_temp_high) ?? max;
      const base = this._optLow ?? asNumber(attrs.target_temp_low) ?? fallback;
      this._optLow = move(base, min, high);
    } else if (key === 'high') {
      const low = this._optLow ?? asNumber(attrs.target_temp_low) ?? min;
      const base = this._optHigh ?? asNumber(attrs.target_temp_high) ?? fallback;
      this._optHigh = move(base, low, max);
    } else {
      const base = this._optTarget ?? asNumber(attrs.temperature) ?? fallback;
      this._optTarget = move(base, min, max);
    }

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
    const attrs = stateObj.attributes;
    const data: Record<string, unknown> = { entity_id: entity };
    if (supportsFeature(stateObj, FEATURE_TARGET_TEMPERATURE_RANGE)) {
      const low = this._optLow ?? asNumber(attrs.target_temp_low);
      const high = this._optHigh ?? asNumber(attrs.target_temp_high);
      if (low === undefined || high === undefined) return;
      data.target_temp_low = low;
      data.target_temp_high = high;
    } else {
      const target = this._optTarget ?? asNumber(attrs.temperature);
      if (target === undefined) return;
      data.temperature = target;
    }
    hass.callService('climate', 'set_temperature', data);
    if (this.isConnected) {
      window.clearTimeout(this._holdTimer);
      this._holdTimer = window.setTimeout(() => {
        this._optTarget = this._optLow = this._optHigh = undefined;
      }, OPTIMISTIC_HOLD_MS);
    } else {
      this._optTarget = this._optLow = this._optHigh = undefined;
    }
  }

  private _onMode(ev: Event, mode: string): void {
    ev.stopPropagation();
    const hass = this.hass;
    const entity = this._config?.entity;
    const stateObj = entity ? hass?.states[entity] : undefined;
    if (!hass || !entity || !stateObj || isUnavailable(stateObj)) return;
    if ((this._optMode ?? stateObj.state) === mode) return;
    this._optMode = mode;
    haptic(this);
    hass.callService('climate', 'set_hvac_mode', { entity_id: entity, hvac_mode: mode });
    window.clearTimeout(this._modeHoldTimer);
    this._modeHoldTimer = window.setTimeout(() => {
      this._optMode = undefined;
    }, OPTIMISTIC_HOLD_MS);
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
      .hero {
        align-items: baseline;
        gap: 2px;
      }
      .current {
        font-size: 24px;
        font-weight: 600;
        letter-spacing: -0.02em;
        line-height: 1.1;
        color: var(--primary-text-color);
        font-variant-numeric: tabular-nums;
      }
      .degree {
        font-size: 13px;
        font-weight: 500;
        color: var(--secondary-text-color);
      }
      .row.controls {
        gap: 10px;
        row-gap: 8px;
        flex-wrap: wrap;
      }
      .stepper {
        flex: none;
        display: flex;
        align-items: center;
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
          background 200ms ease;
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
        cursor: default;
      }
      .step ha-icon {
        --mdc-icon-size: 18px;
        pointer-events: none;
      }
      .target {
        min-width: 46px;
        text-align: center;
      }
      .modes {
        display: flex;
        flex-wrap: wrap;
        justify-content: flex-end;
        gap: 6px;
        margin-left: auto;
      }
      .chip.mode {
        min-width: 40px;
        height: 30px;
        padding: 0;
        display: grid;
        place-items: center;
        transition:
          transform 250ms var(--silk-spring),
          background 200ms ease,
          color 200ms ease;
      }
      .chip.mode:active:not(:disabled) {
        transform: scale(0.94);
        transition-duration: 120ms;
        transition-timing-function: var(--silk-ease-out);
      }
      .chip.mode:disabled {
        cursor: default;
      }
      .chip.mode ha-icon {
        --mdc-icon-size: 16px;
        pointer-events: none;
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
    'silk-climate-card': SilkClimateCard;
  }
}
