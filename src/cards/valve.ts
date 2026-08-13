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
  supportsFeature,
  clamp,
} from '../shared/service';
import { accentFor } from '../shared/color';
import { registerEditor } from '../shared/editor';
import '../shared/slider';

export const META = {
  type: 'silk-valve-card',
  name: 'Silk Valve',
  description: 'Open, close, or halfway.',
};

/** ValveEntityFeature bits (HA core). */
const FEAT_OPEN = 1;
const FEAT_CLOSE = 2;
const FEAT_SET_POSITION = 4;
const FEAT_STOP = 8;

const OPTIMISTIC_TTL_MS = 2000;

/**
 * `accentFor` has no valve mapping; a valve is plumbing's cover, so it borrows
 * the cover accent unless the theme or the config says otherwise.
 */
const VALVE_ACCENT = 'var(--state-valve-active-color, #9d7ee8)';

interface SilkValveCardConfig extends LovelaceCardConfig {
  entity: string;
  name?: string;
  icon?: string;
  color?: string;
  show_buttons?: boolean;
}

const EDITOR_TAG = 'silk-valve-card-editor';

registerEditor(
  EDITOR_TAG,
  [
    { name: 'entity', required: true, selector: { entity: { domain: ['valve'] } } },
    { name: 'name', selector: { text: {} } },
    {
      name: '',
      type: 'grid',
      schema: [
        { name: 'icon', selector: { icon: {} } },
        { name: 'color', selector: { text: {} } },
      ],
    },
    { name: 'show_buttons', selector: { boolean: {} } },
  ],
  {
    entity: 'Entity',
    name: 'Name',
    icon: 'Icon',
    color: 'Accent color',
    show_buttons: 'Show open / stop / close buttons',
  },
  { show_buttons: true }
);

@customElement('silk-valve-card')
export class SilkValveCard extends LitElement {
  @property({ attribute: false }) public hass?: HomeAssistant;

  @state() private _config?: SilkValveCardConfig;

  /** Optimistic position (%) while dragging and briefly after release. */
  @state() private _localPos: number | null = null;

  private _expiryTimer?: number;
  private _lastUpdated?: string;

  public static getStubConfig(hass: HomeAssistant): Partial<SilkValveCardConfig> {
    const entity = Object.keys(hass.states).find((id) => id.startsWith('valve.'));
    return { type: 'custom:silk-valve-card', entity };
  }

  public static async getConfigElement(): Promise<HTMLElement> {
    return document.createElement(EDITOR_TAG);
  }

  public setConfig(config: SilkValveCardConfig): void {
    if (!config.entity || domainOf(config.entity) !== 'valve') {
      throw new Error('silk-valve-card: define a valve `entity` (e.g. valve.main_water)');
    }
    this._config = config;
    this._clearOptimistic();
    this._lastUpdated = undefined;
  }

  public getCardSize(): number {
    return 1;
  }

  public getGridOptions(): Record<string, number> {
    return { columns: 6, rows: 1, min_columns: 4, min_rows: 1 };
  }

  public disconnectedCallback(): void {
    super.disconnectedCallback();
    window.clearTimeout(this._expiryTimer);
    this._expiryTimer = undefined;
  }

  protected willUpdate(changed: PropertyValues): void {
    if (!changed.has('hass') || !this._config) return;
    const stamp = this.hass?.states[this._config.entity]?.last_updated;
    if (stamp === undefined || stamp === this._lastUpdated) return;
    const isFirst = this._lastUpdated === undefined;
    this._lastUpdated = stamp;
    // A real state update arrived: drop the post-release optimistic override.
    // (While dragging, no expiry timer is armed and the override stays put.)
    if (!isFirst && this._expiryTimer !== undefined) this._clearOptimistic();
  }

  private _clearOptimistic(): void {
    window.clearTimeout(this._expiryTimer);
    this._expiryTimer = undefined;
    this._localPos = null;
  }

  private _armExpiry(): void {
    window.clearTimeout(this._expiryTimer);
    this._expiryTimer = window.setTimeout(() => {
      this._expiryTimer = undefined;
      this._localPos = null;
    }, OPTIMISTIC_TTL_MS);
  }

  /** Reported position (%), 100 = fully open; undefined when not positional. */
  private _realPosition(stateObj: HassEntity): number | undefined {
    const pos = stateObj.attributes.current_position;
    return typeof pos === 'number' && Number.isFinite(pos) ? clamp(pos, 0, 100) : undefined;
  }

  private _onIconClick(ev: Event): void {
    ev.stopPropagation();
    if (!this.hass || !this._config) return;
    if (isUnavailable(this.hass.states[this._config.entity])) return;
    toggleEntity(this.hass, this._config.entity);
    haptic(this);
  }

  private _onCardClick(): void {
    if (this._config) moreInfo(this, this._config.entity);
  }

  private _onSlide(ev: CustomEvent<{ value: number }>): void {
    this._localPos = Math.round(ev.detail.value);
  }

  private _onSlideChange(ev: CustomEvent<{ value: number }>): void {
    if (!this.hass || !this._config) return;
    const position = clamp(Math.round(ev.detail.value), 0, 100);
    this._localPos = position;
    this._armExpiry();
    this.hass.callService('valve', 'set_valve_position', {
      entity_id: this._config.entity,
      position,
    });
    haptic(this);
  }

  private _callValve(ev: Event, service: 'open_valve' | 'stop_valve' | 'close_valve'): void {
    ev.stopPropagation();
    if (!this.hass || !this._config) return;
    this._clearOptimistic();
    this.hass.callService('valve', service, { entity_id: this._config.entity });
    haptic(this);
  }

  protected render(): TemplateResult | typeof nothing {
    if (!this.hass || !this._config) return nothing;
    const stateObj = this.hass.states[this._config.entity];
    if (!stateObj) {
      return html`<ha-card>
        <div class="warning">Entity not found: ${this._config.entity}</div>
      </ha-card>`;
    }

    const unavailable = isUnavailable(stateObj);
    const active = isActive(stateObj);
    const accent = accentFor(stateObj, this._config.color ?? VALVE_ACCENT);
    const name = this._config.name ?? stateObj.attributes.friendly_name ?? stateObj.entity_id;
    const pos = this._localPos ?? this._realPosition(stateObj);
    // The slider owns the whole card surface when it exists; when unavailable it
    // is dropped entirely so the card-level click can still open more-info.
    const hasSlider = supportsFeature(stateObj, FEAT_SET_POSITION) && !unavailable;

    return html`
      <ha-card
        class="control ${unavailable ? 'unavailable' : ''}"
        style="--silk-accent:${accent}"
        @click=${hasSlider ? nothing : this._onCardClick}
      >
        ${hasSlider
          ? html`
              <silk-slider
                fill
                aria-label=${`Position of ${name}`}
                .value=${pos ?? (stateObj.state === 'closed' ? 0 : 100)}
                .min=${0}
                .max=${100}
                .step=${1}
                @slide=${this._onSlide}
                @change=${this._onSlideChange}
              ></silk-slider>
            `
          : nothing}
        <button
          class="icon ${active ? 'on' : ''}"
          ?disabled=${unavailable}
          aria-label="Toggle ${name}"
          @click=${this._onIconClick}
        >
          ${this._config.icon
            ? html`<ha-icon .icon=${this._config.icon}></ha-icon>`
            : html`<ha-state-icon .hass=${this.hass} .stateObj=${stateObj}></ha-state-icon>`}
        </button>
        <div class="info">
          <div class="name" title=${name}>${name}</div>
          <div class="state">
            ${stateText(this.hass, stateObj)}${!unavailable && pos !== undefined
              ? html`<span class="sep">·</span>${pos}%`
              : nothing}
          </div>
        </div>
        ${this._config.show_buttons !== false
          ? this._renderButtons(stateObj, unavailable, pos)
          : nothing}
      </ha-card>
    `;
  }

  private _renderButtons(
    stateObj: HassEntity,
    unavailable: boolean,
    pos: number | undefined
  ): TemplateResult | typeof nothing {
    const canOpen = supportsFeature(stateObj, FEAT_OPEN);
    const canStop = supportsFeature(stateObj, FEAT_STOP);
    const canClose = supportsFeature(stateObj, FEAT_CLOSE);
    if (!canOpen && !canStop && !canClose) return nothing;
    // Position wins when the valve reports one; otherwise the state is all we have.
    const fullyOpen = pos !== undefined ? pos >= 100 : stateObj.state === 'open';
    const fullyClosed = pos !== undefined ? pos <= 0 : stateObj.state === 'closed';
    return html`
      <div class="trailing">
        ${canOpen
          ? html`
              <button
                class="ctl"
                ?disabled=${unavailable || fullyOpen}
                aria-label="Open valve"
                title="Open"
                @click=${(ev: Event) => this._callValve(ev, 'open_valve')}
              >
                <ha-icon icon="mdi:valve-open"></ha-icon>
              </button>
            `
          : nothing}
        ${canStop
          ? html`
              <button
                class="ctl"
                ?disabled=${unavailable}
                aria-label="Stop valve"
                title="Stop"
                @click=${(ev: Event) => this._callValve(ev, 'stop_valve')}
              >
                <ha-icon icon="mdi:stop"></ha-icon>
              </button>
            `
          : nothing}
        ${canClose
          ? html`
              <button
                class="ctl"
                ?disabled=${unavailable || fullyClosed}
                aria-label="Close valve"
                title="Close"
                @click=${(ev: Event) => this._callValve(ev, 'close_valve')}
              >
                <ha-icon icon="mdi:valve-closed"></ha-icon>
              </button>
            `
          : nothing}
      </div>
    `;
  }

  static styles = [
    silkControlStyles,
    css`
      .ctl {
        width: 36px;
        height: 36px;
        border: none;
        border-radius: 12px;
        display: grid;
        place-items: center;
        padding: 0;
        cursor: pointer;
        color: var(--secondary-text-color);
        background: rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.06);
        transition:
          transform 250ms var(--silk-spring),
          background 200ms ease,
          color 200ms ease,
          opacity 200ms ease;
      }
      .ctl:hover:not(:disabled) {
        background: rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.12);
      }
      .ctl:active:not(:disabled) {
        transform: scale(0.92);
        transition-duration: 120ms;
        transition-timing-function: var(--silk-ease-out);
      }
      .ctl:focus-visible {
        outline: 2px solid color-mix(in srgb, var(--silk-accent) 70%, transparent);
        outline-offset: 2px;
      }
      .ctl:disabled {
        opacity: 0.35;
        cursor: default;
      }
      .ctl ha-icon {
        --mdc-icon-size: 20px;
        pointer-events: none;
      }
      .icon:disabled {
        cursor: default;
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    'silk-valve-card': SilkValveCard;
  }
}
