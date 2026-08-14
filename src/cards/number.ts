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
  clamp,
} from '../shared/service';
import { accentFor } from '../shared/color';
import { registerEditor } from '../shared/editor';
import '../shared/slider';

export const META = {
  type: 'silk-number-card',
  name: 'Silk Number',
  description: 'Steppers and sliders for every number helper.',
};

export interface SilkNumberCardConfig extends LovelaceCardConfig {
  entity: string;
  name?: string;
  icon?: string;
  color?: string;
}

const EDITOR_TAG = 'silk-number-card-editor';

registerEditor(
  EDITOR_TAG,
  [
    {
      name: 'entity',
      required: true,
      selector: { entity: { domain: ['number', 'input_number'] } },
    },
    { name: 'name', selector: { text: {} } },
    {
      name: '',
      type: 'grid',
      schema: [
        { name: 'icon', selector: { icon: {} } },
        { name: 'color', selector: { ui_color: {} } },
      ],
    },
  ],
  { entity: '엔티티', name: '이름', icon: '아이콘', color: '강조 색상' }
);

const SEND_DEBOUNCE_MS = 500;
const OPTIMISTIC_HOLD_MS = 2000;

function asNumber(value: unknown): number | undefined {
  if (value === null || value === undefined || value === '') return undefined;
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
}

/** Decimal places implied by a step (capped at 3 to defeat float noise). */
function stepDecimals(step: number): number {
  const text = String(step);
  const dot = text.indexOf('.');
  return dot < 0 ? 0 : Math.min(text.length - dot - 1, 3);
}

/** The entity's numeric range/step, with HA's own defaults. */
interface NumberSpec {
  min: number;
  max: number;
  step: number;
  decimals: number;
}

function numberSpec(stateObj: HassEntity): NumberSpec {
  const min = asNumber(stateObj.attributes.min) ?? 0;
  const rawMax = asNumber(stateObj.attributes.max);
  const max = rawMax !== undefined && rawMax > min ? rawMax : min + 100;
  const rawStep = asNumber(stateObj.attributes.step);
  const step = rawStep !== undefined && rawStep > 0 ? rawStep : 1;
  return { min, max, step, decimals: stepDecimals(step) };
}

@customElement('silk-number-card')
export class SilkNumberCard extends LitElement {
  @property({ attribute: false }) public hass?: HomeAssistant;

  @state() private _config?: SilkNumberCardConfig;

  /** Optimistic value while edits are in flight; undefined = trust HA. */
  @state() private _optValue?: number;

  private _sendTimer?: number;
  private _holdTimer?: number;

  public static getStubConfig(hass: HomeAssistant): Partial<SilkNumberCardConfig> {
    const ids = Object.keys(hass.states);
    const entity =
      ids.find((id) => id.startsWith('input_number.')) ??
      ids.find((id) => id.startsWith('number.'));
    return { type: 'custom:silk-number-card', entity };
  }

  public static async getConfigElement(): Promise<HTMLElement> {
    return document.createElement(EDITOR_TAG);
  }

  public setConfig(config: SilkNumberCardConfig): void {
    if (!config.entity || !['number', 'input_number'].includes(domainOf(config.entity))) {
      throw new Error(
        'silk-number-card: `entity` is required and must be a number or input_number entity'
      );
    }
    this._config = config;
    this._optValue = undefined;
  }

  public getCardSize(): number {
    return this._sliderMode() ? 2 : 1;
  }

  public getGridOptions(): Record<string, number> {
    return {
      columns: 6,
      rows: this._sliderMode() ? 2 : 1,
      min_columns: 4,
      min_rows: 1,
    };
  }

  public disconnectedCallback(): void {
    super.disconnectedCallback();
    window.clearTimeout(this._holdTimer);
    if (this._sendTimer !== undefined) {
      // Don't lose a pending edit just because the card left the DOM.
      window.clearTimeout(this._sendTimer);
      this._sendTimer = undefined;
      this._commit();
    }
  }

  protected willUpdate(changed: PropertyValues): void {
    if (!changed.has('hass') || !this._config || !this.hass) return;
    if (this._optValue === undefined || this._sendTimer !== undefined) return;
    const oldHass = changed.get('hass') as HomeAssistant | undefined;
    const oldObj = oldHass?.states[this._config.entity];
    const newObj = this.hass.states[this._config.entity];
    // The real value moved: the confirmation arrived, drop the override.
    if (newObj && oldObj && newObj.state !== oldObj.state) {
      window.clearTimeout(this._holdTimer);
      this._optValue = undefined;
    }
  }

  private _sliderMode(): boolean {
    const entity = this._config?.entity;
    const stateObj = entity ? this.hass?.states[entity] : undefined;
    return stateObj?.attributes.mode === 'slider';
  }

  private _locale(): string {
    return this.hass?.locale?.language ?? this.hass?.language ?? 'en';
  }

  private _formatValue(value: number, decimals: number): string {
    const precision = this.hass?.entities?.[this._config!.entity]?.display_precision;
    if (precision !== undefined) {
      return new Intl.NumberFormat(this._locale(), {
        minimumFractionDigits: precision,
        maximumFractionDigits: precision,
      }).format(value);
    }
    return new Intl.NumberFormat(this._locale(), {
      maximumFractionDigits: Math.max(decimals, 2),
    }).format(value);
  }

  private _formatBound(value: number): string {
    return new Intl.NumberFormat(this._locale(), { maximumFractionDigits: 2 }).format(value);
  }

  private _displayValue(stateObj: HassEntity): number | undefined {
    return this._optValue ?? asNumber(stateObj.state);
  }

  private _onCardClick(): void {
    if (this._config) moreInfo(this, this._config.entity);
  }

  private _onIconClick(ev: Event): void {
    ev.stopPropagation();
    if (this._config) moreInfo(this, this._config.entity);
  }

  private _stopClick(ev: Event): void {
    // The synthetic click after a drag/tap on the slider must not open more-info.
    ev.stopPropagation();
  }

  private _onStep(ev: Event, dir: 1 | -1): void {
    ev.stopPropagation();
    const hass = this.hass;
    const stateObj = this._config ? hass?.states[this._config.entity] : undefined;
    if (!hass || !stateObj || isUnavailable(stateObj)) return;
    const spec = numberSpec(stateObj);
    const base = this._displayValue(stateObj) ?? spec.min;
    const next = Number(clamp(base + dir * spec.step, spec.min, spec.max).toFixed(spec.decimals));
    if (next === base) return; // already at the bound — nothing to send
    this._optValue = next;
    haptic(this, 'selection');
    window.clearTimeout(this._holdTimer);
    window.clearTimeout(this._sendTimer);
    this._sendTimer = window.setTimeout(() => {
      this._sendTimer = undefined;
      this._commit();
    }, SEND_DEBOUNCE_MS);
  }

  private _onSlide(ev: CustomEvent<{ value: number }>): void {
    // Track the drag in the readout; the service call waits for release.
    this._optValue = ev.detail.value;
  }

  private _onSliderChange(ev: CustomEvent<{ value: number }>): void {
    this._optValue = ev.detail.value;
    haptic(this, 'selection');
    // Release commits immediately; cancel any stepper debounce still queued.
    window.clearTimeout(this._sendTimer);
    this._sendTimer = undefined;
    this._commit();
  }

  private _commit(): void {
    const hass = this.hass;
    const entity = this._config?.entity;
    const value = this._optValue;
    if (!hass || !entity || value === undefined) return;
    const domain = domainOf(entity) === 'input_number' ? 'input_number' : 'number';
    hass.callService(domain, 'set_value', { entity_id: entity, value });
    if (this.isConnected) {
      window.clearTimeout(this._holdTimer);
      this._holdTimer = window.setTimeout(() => {
        this._optValue = undefined;
      }, OPTIMISTIC_HOLD_MS);
    } else {
      this._optValue = undefined;
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
    const accent = accentFor(stateObj, config.color);
    const name = config.name ?? stateObj.attributes.friendly_name ?? config.entity;
    const spec = numberSpec(stateObj);
    const value = unavailable ? undefined : this._displayValue(stateObj);
    const unit = (stateObj.attributes.unit_of_measurement as string | undefined) ?? '';
    const rangeText = `${this._formatBound(spec.min)}–${this._formatBound(spec.max)}${
      unit ? ` ${unit}` : ''
    }`;
    // Rendered even while unavailable (disabled) so the card height is stable.
    const slider = stateObj.attributes.mode === 'slider';

    return html`
      <ha-card
        class="control ${unavailable ? 'unavailable' : ''}"
        style="--silk-accent:${accent}"
        @click=${this._onCardClick}
      >
        <div class="row">
          <button
            class="icon ${!unavailable && isActive(stateObj) ? 'on' : ''}"
            ?disabled=${unavailable}
            aria-label="Show details"
            @click=${this._onIconClick}
          >
            ${config.icon
              ? html`<ha-icon .icon=${config.icon}></ha-icon>`
              : html`<ha-state-icon .hass=${hass} .stateObj=${stateObj}></ha-state-icon>`}
          </button>
          <div class="info">
            <div class="name">${name}</div>
            <div class="state">${unavailable ? stateText(hass, stateObj) : rangeText}</div>
          </div>
          <div class="trailing">
            <button
              class="step"
              ?disabled=${unavailable || value === undefined || value <= spec.min}
              aria-label="Decrease ${name}"
              @click=${(ev: Event) => this._onStep(ev, -1)}
            >
              <ha-icon icon="mdi:minus"></ha-icon>
            </button>
            <span class="readout">
              <span class="value">
                ${value !== undefined ? this._formatValue(value, spec.decimals) : '—'}
              </span>
              ${unit ? html`<span class="unit">${unit}</span>` : nothing}
            </span>
            <button
              class="step"
              ?disabled=${unavailable || value === undefined || value >= spec.max}
              aria-label="Increase ${name}"
              @click=${(ev: Event) => this._onStep(ev, 1)}
            >
              <ha-icon icon="mdi:plus"></ha-icon>
            </button>
          </div>
        </div>
        ${slider
          ? html`
              <div class="slider-row" @click=${this._stopClick}>
                <silk-slider
                  .value=${value ?? spec.min}
                  .min=${spec.min}
                  .max=${spec.max}
                  .step=${spec.step}
                  ?disabled=${unavailable}
                  @slide=${this._onSlide}
                  @change=${this._onSliderChange}
                ></silk-slider>
              </div>
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
      .row {
        display: flex;
        align-items: center;
        gap: 12px;
        min-width: 0;
      }
      .trailing {
        gap: 6px;
      }
      .readout {
        display: inline-flex;
        align-items: baseline;
        justify-content: center;
        gap: 3px;
        min-width: 52px;
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
        cursor: default;
        opacity: 0.4;
      }
      .step ha-icon {
        --mdc-icon-size: 18px;
        pointer-events: none;
      }
      .slider-row {
        min-width: 0;
      }
      .unavailable .slider-row {
        opacity: 0.45;
        pointer-events: none;
      }
      .slider-row silk-slider {
        --silk-slider-height: 30px;
      }
      .icon:disabled {
        cursor: default;
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    'silk-number-card': SilkNumberCard;
  }
}
