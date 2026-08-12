import { LitElement, html, css, nothing, PropertyValues, TemplateResult } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { HomeAssistant, HassEntity, LovelaceCardConfig } from '../types';
import { silkControlStyles } from '../shared/base';
import {
  domainOf,
  isUnavailable,
  toggleEntity,
  moreInfo,
  haptic,
  stateText,
  clamp,
} from '../shared/service';
import { accentFor } from '../shared/color';
import { registerEditor } from '../shared/editor';
import '../shared/slider';

export const META = {
  type: 'silk-light-card',
  name: 'Silk Light',
  description: 'Drag anywhere to dim — the whole card is the slider.',
};

export interface SilkLightCardConfig extends LovelaceCardConfig {
  entity: string;
  name?: string;
  icon?: string;
  color?: string;
}

const EDITOR_TAG = 'silk-light-card-editor';

registerEditor(
  EDITOR_TAG,
  [
    { name: 'entity', required: true, selector: { entity: { domain: ['light'] } } },
    { name: 'name', selector: { text: {} } },
    { name: 'icon', selector: { icon: {} } },
    { name: 'color', selector: { text: {} } },
  ],
  { entity: 'Entity', name: 'Name', icon: 'Icon', color: 'Accent color' }
);

/** How long an optimistic override survives without a confirming state update. */
const OPTIMISTIC_TTL_MS = 2000;

/** Brightness-capable = supported_color_modes lists anything beyond `onoff`. */
function isDimmable(stateObj: HassEntity): boolean {
  const modes = stateObj.attributes.supported_color_modes as string[] | undefined;
  return Array.isArray(modes) && modes.some((mode) => mode !== 'onoff');
}

@customElement('silk-light-card')
export class SilkLightCard extends LitElement {
  @property({ attribute: false }) public hass?: HomeAssistant;

  @state() private _config?: SilkLightCardConfig;
  /** Locally assumed brightness % while dragging / awaiting the real state. */
  @state() private _optimisticPct: number | null = null;
  /** Locally assumed on/off while awaiting the real state. */
  @state() private _optimisticOn: boolean | null = null;

  private _sliding = false;
  private _optimisticTimer?: number;
  private _lastUpdated?: string;

  public static getStubConfig(hass: HomeAssistant): Partial<SilkLightCardConfig> {
    const first = Object.keys(hass.states).find((id) => id.startsWith('light.'));
    return { type: 'custom:silk-light-card', entity: first };
  }

  public static async getConfigElement(): Promise<HTMLElement> {
    return document.createElement(EDITOR_TAG);
  }

  public setConfig(config: SilkLightCardConfig): void {
    if (!config.entity) {
      throw new Error('silk-light-card: `entity` is required');
    }
    if (domainOf(config.entity) !== 'light') {
      throw new Error(`silk-light-card: \`entity\` must be a light (got "${config.entity}")`);
    }
    this._config = config;
    this._clearOptimistic();
  }

  public getCardSize(): number {
    return 1;
  }

  public getGridOptions(): Record<string, number> {
    return { columns: 6, rows: 1, min_columns: 4, min_rows: 1 };
  }

  public disconnectedCallback(): void {
    super.disconnectedCallback();
    window.clearTimeout(this._optimisticTimer);
    this._optimisticTimer = undefined;
  }

  protected willUpdate(changed: PropertyValues): void {
    if (!changed.has('hass') || !this._config) return;
    // The real state arrived: drop the optimistic override (but never mid-drag).
    const stamp = this.hass?.states[this._config.entity]?.last_updated;
    if (stamp !== this._lastUpdated) {
      this._lastUpdated = stamp;
      if (!this._sliding) this._clearOptimistic();
    }
  }

  private _clearOptimistic(): void {
    window.clearTimeout(this._optimisticTimer);
    this._optimisticTimer = undefined;
    this._optimisticPct = null;
    this._optimisticOn = null;
  }

  private _holdOptimistic(): void {
    window.clearTimeout(this._optimisticTimer);
    this._optimisticTimer = window.setTimeout(() => this._clearOptimistic(), OPTIMISTIC_TTL_MS);
  }

  /** Brightness % to display: optimistic first, else derived from the entity. */
  private _displayPct(stateObj: HassEntity, on: boolean): number | null {
    if (this._optimisticPct !== null) return this._optimisticPct;
    if (!on) return 0;
    const brightness = stateObj.attributes.brightness;
    if (typeof brightness !== 'number') return null;
    return clamp(Math.round((brightness / 255) * 100), 1, 100);
  }

  private _onSlide(ev: CustomEvent<{ value: number }>): void {
    this._sliding = true;
    this._optimisticPct = ev.detail.value;
    this._optimisticOn = ev.detail.value > 0;
  }

  private _onSliderChange(ev: CustomEvent<{ value: number }>): void {
    this._sliding = false;
    if (!this.hass || !this._config) return;
    const value = ev.detail.value;
    this._optimisticPct = value;
    this._optimisticOn = value > 0;
    this._holdOptimistic();
    haptic(this);
    if (value <= 0) {
      this.hass.callService('light', 'turn_off', { entity_id: this._config.entity });
    } else {
      this.hass.callService('light', 'turn_on', {
        entity_id: this._config.entity,
        brightness_pct: value,
      });
    }
  }

  private _onIconClick(ev: Event): void {
    ev.stopPropagation();
    if (!this.hass || !this._config) return;
    const stateObj = this.hass.states[this._config.entity];
    if (isUnavailable(stateObj)) return;
    const wasOn = this._optimisticOn ?? stateObj.state === 'on';
    toggleEntity(this.hass, this._config.entity);
    haptic(this);
    this._optimisticOn = !wasOn;
    this._optimisticPct = null;
    this._holdOptimistic();
  }

  private _onCardClick(): void {
    if (!this._config) return;
    moreInfo(this, this._config.entity);
  }

  private _stopClick(ev: Event): void {
    // The synthetic click after a drag/tap on the slider must not open more-info.
    ev.stopPropagation();
  }

  protected render(): TemplateResult | typeof nothing {
    if (!this._config) return nothing;
    const hass = this.hass;
    if (!hass) return nothing;
    const entityId = this._config.entity;
    const stateObj = hass.states[entityId];
    if (!stateObj) {
      return html`<ha-card><div class="warning">Entity not found: ${entityId}</div></ha-card>`;
    }

    const unavailable = isUnavailable(stateObj);
    const dimmable = isDimmable(stateObj);
    const actualOn = !unavailable && stateObj.state === 'on';
    const on = unavailable ? false : (this._optimisticOn ?? actualOn);
    const pct = unavailable ? 0 : this._displayPct(stateObj, on);
    const accent = accentFor(stateObj, this._config.color);
    const name = this._config.name ?? stateObj.attributes.friendly_name ?? entityId;
    // Localized state text whenever it agrees with what we show; a plain
    // On/Off only during the brief optimistic window where they differ.
    const label =
      unavailable || on === actualOn ? stateText(hass, stateObj) : on ? 'On' : 'Off';
    const showPct = dimmable && on && pct !== null && !unavailable;

    return html`
      <ha-card
        class="control ${unavailable ? 'unavailable' : ''}"
        style="--silk-accent:${accent}"
        @click=${this._onCardClick}
      >
        ${dimmable
          ? html`
              <silk-slider
                fill
                .value=${on ? (pct ?? 100) : 0}
                min="1"
                max="100"
                step="1"
                ?disabled=${unavailable}
                @slide=${this._onSlide}
                @change=${this._onSliderChange}
                @click=${this._stopClick}
              ></silk-slider>
            `
          : nothing}
        <button
          class="icon ${on ? 'on' : ''}"
          ?disabled=${unavailable}
          aria-label=${`Toggle ${name}`}
          @click=${this._onIconClick}
        >
          ${this._config.icon
            ? html`<ha-icon .icon=${this._config.icon}></ha-icon>`
            : html`<ha-state-icon .hass=${hass} .stateObj=${stateObj}></ha-state-icon>`}
        </button>
        <div class="info">
          <div class="name">${name}</div>
          <div class="state">
            ${label}${showPct
              ? html`<span class="sep">·</span>${pct}%`
              : nothing}
          </div>
        </div>
        <div class="trailing">
          ${showPct ? html`<span class="value">${pct}%</span>` : nothing}
        </div>
      </ha-card>
    `;
  }

  static styles = [
    silkControlStyles,
    css`
      .icon:disabled {
        cursor: default;
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    'silk-light-card': SilkLightCard;
  }
}
