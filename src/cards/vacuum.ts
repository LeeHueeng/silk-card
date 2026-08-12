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
} from '../shared/service';
import { accentFor } from '../shared/color';
import { registerEditor } from '../shared/editor';

export const META = {
  type: 'silk-vacuum-card',
  name: 'Silk Vacuum',
  description: 'Start, dock, locate — with battery in sight.',
};

/** VacuumEntityFeature bits (HA core). */
const FEAT_PAUSE = 4;
const FEAT_RETURN_HOME = 16;
const FEAT_FAN_SPEED = 32;
const FEAT_LOCATE = 512;
const FEAT_START = 8192;

const OPTIMISTIC_TTL_MS = 2000;
/** Chips stay glanceable; longer speed lists belong in more-info. */
const MAX_FAN_CHIPS = 3;

export interface SilkVacuumCardConfig extends LovelaceCardConfig {
  entity: string;
  name?: string;
  icon?: string;
  /** Accent override (YAML). */
  color?: string;
}

const EDITOR_TAG = 'silk-vacuum-card-editor';

registerEditor(
  EDITOR_TAG,
  [
    { name: 'entity', required: true, selector: { entity: { domain: ['vacuum'] } } },
    { name: 'name', selector: { text: {} } },
    { name: 'icon', selector: { icon: {} } },
  ],
  { entity: 'Entity', name: 'Name', icon: 'Icon' }
);

@customElement('silk-vacuum-card')
export class SilkVacuumCard extends LitElement {
  @property({ attribute: false }) public hass?: HomeAssistant;

  @state() private _config?: SilkVacuumCardConfig;

  /** Optimistic vacuum state (cleaning | paused | returning) while awaiting the real one. */
  @state() private _optimisticState: string | null = null;

  /** Optimistic fan speed briefly held after a chip tap. */
  @state() private _optimisticFan: string | null = null;

  private _expiryTimer?: number;
  private _lastUpdated?: string;

  public static getStubConfig(hass: HomeAssistant): Partial<SilkVacuumCardConfig> {
    const entity = Object.keys(hass.states).find((id) => id.startsWith('vacuum.'));
    return { type: 'custom:silk-vacuum-card', entity };
  }

  public static async getConfigElement(): Promise<HTMLElement> {
    return document.createElement(EDITOR_TAG);
  }

  public setConfig(config: SilkVacuumCardConfig): void {
    if (!config.entity || domainOf(config.entity) !== 'vacuum') {
      throw new Error('silk-vacuum-card: define a vacuum `entity` (e.g. vacuum.roborock)');
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
    // A real state update arrived: the optimistic overrides have done their job.
    if (!isFirst && this._expiryTimer !== undefined) this._clearOptimistic();
  }

  private _clearOptimistic(): void {
    window.clearTimeout(this._expiryTimer);
    this._expiryTimer = undefined;
    this._optimisticState = null;
    this._optimisticFan = null;
  }

  private _armExpiry(): void {
    window.clearTimeout(this._expiryTimer);
    this._expiryTimer = window.setTimeout(() => {
      this._expiryTimer = undefined;
      this._optimisticState = null;
      this._optimisticFan = null;
    }, OPTIMISTIC_TTL_MS);
  }

  private _onCardClick(): void {
    if (this._config) moreInfo(this, this._config.entity);
  }

  /** Icon button = the primary control (start/pause); falls back to more-info. */
  private _onIconClick(ev: Event): void {
    ev.stopPropagation();
    if (!this.hass || !this._config) return;
    const stateObj = this.hass.states[this._config.entity];
    const canStartPause =
      stateObj !== undefined &&
      !isUnavailable(stateObj) &&
      (supportsFeature(stateObj, FEAT_START) || supportsFeature(stateObj, FEAT_PAUSE));
    if (canStartPause) this._startPause();
    else moreInfo(this, this._config.entity);
  }

  private _onStartPauseClick(ev: Event): void {
    ev.stopPropagation();
    this._startPause();
  }

  private _startPause(): void {
    if (!this.hass || !this._config) return;
    const stateObj = this.hass.states[this._config.entity];
    if (!stateObj || isUnavailable(stateObj)) return;
    const cleaning = (this._optimisticState ?? stateObj.state) === 'cleaning';
    if (!supportsFeature(stateObj, cleaning ? FEAT_PAUSE : FEAT_START)) return;
    haptic(this);
    this._optimisticState = cleaning ? 'paused' : 'cleaning';
    this._armExpiry();
    this.hass.callService('vacuum', cleaning ? 'pause' : 'start', {
      entity_id: this._config.entity,
    });
  }

  private _onReturnHome(ev: Event): void {
    ev.stopPropagation();
    if (!this.hass || !this._config) return;
    const stateObj = this.hass.states[this._config.entity];
    if (!stateObj || isUnavailable(stateObj)) return;
    haptic(this);
    this._optimisticState = 'returning';
    this._armExpiry();
    this.hass.callService('vacuum', 'return_to_base', { entity_id: this._config.entity });
  }

  private _onLocate(ev: Event): void {
    ev.stopPropagation();
    if (!this.hass || !this._config) return;
    if (isUnavailable(this.hass.states[this._config.entity])) return;
    haptic(this);
    this.hass.callService('vacuum', 'locate', { entity_id: this._config.entity });
  }

  private _onFanSpeed(ev: Event, speed: string): void {
    ev.stopPropagation();
    if (!this.hass || !this._config) return;
    if (isUnavailable(this.hass.states[this._config.entity])) return;
    haptic(this);
    this._optimisticFan = speed;
    this._armExpiry();
    this.hass.callService('vacuum', 'set_fan_speed', {
      entity_id: this._config.entity,
      fan_speed: speed,
    });
  }

  protected render(): TemplateResult | typeof nothing {
    if (!this.hass || !this._config) return nothing;
    const stateObj = this.hass.states[this._config.entity];
    if (!stateObj) {
      return html`<ha-card><div class="warning">Entity not found: ${this._config.entity}</div></ha-card>`;
    }

    const unavailable = isUnavailable(stateObj);
    // While an optimistic override is live, present a synthetic state object so
    // the accent, icon and state line all agree with the tapped button.
    const displayObj: HassEntity =
      this._optimisticState === null || unavailable
        ? stateObj
        : { ...stateObj, state: this._optimisticState };
    const active = isActive(displayObj);
    const accent = accentFor(displayObj, this._config.color);
    const name = this._config.name ?? stateObj.attributes.friendly_name ?? stateObj.entity_id;
    const battery = stateObj.attributes.battery_level;
    const hasBattery = typeof battery === 'number' && Number.isFinite(battery);
    const cleaning = displayObj.state === 'cleaning';
    const canStartPause =
      supportsFeature(stateObj, FEAT_START) || supportsFeature(stateObj, FEAT_PAUSE);
    // Honest gating: pausing needs PAUSE, starting needs START — one may be missing.
    const startPauseBlocked = !supportsFeature(stateObj, cleaning ? FEAT_PAUSE : FEAT_START);

    return html`
      <ha-card
        class="control ${unavailable ? 'unavailable' : ''}"
        style="--silk-accent:${accent}"
        @click=${this._onCardClick}
      >
        <button
          class="icon ${active ? 'on' : ''}"
          .disabled=${unavailable}
          aria-label=${canStartPause ? (cleaning ? `Pause ${name}` : `Start ${name}`) : `Show details for ${name}`}
          @click=${this._onIconClick}
        >
          ${this._config.icon
            ? html`<ha-icon .icon=${this._config.icon}></ha-icon>`
            : html`<ha-state-icon .hass=${this.hass} .stateObj=${displayObj}></ha-state-icon>`}
        </button>
        <div class="info">
          <div class="name">${name}</div>
          <div class="state">
            ${stateText(this.hass, displayObj)}${hasBattery
              ? html`<span class="sep">·</span>${Math.round(battery)}%`
              : nothing}
          </div>
        </div>
        <div class="trailing">
          ${this._renderChips(stateObj, unavailable)}
          ${canStartPause
            ? html`
                <button
                  class="ctl"
                  ?disabled=${unavailable || startPauseBlocked}
                  aria-label=${cleaning ? `Pause ${name}` : `Start ${name}`}
                  @click=${this._onStartPauseClick}
                >
                  <ha-icon icon=${cleaning ? 'mdi:pause' : 'mdi:play'}></ha-icon>
                </button>
              `
            : nothing}
          ${supportsFeature(stateObj, FEAT_RETURN_HOME)
            ? html`
                <button
                  class="ctl"
                  ?disabled=${unavailable}
                  aria-label=${`Return ${name} to dock`}
                  @click=${this._onReturnHome}
                >
                  <ha-icon icon="mdi:home-import-outline"></ha-icon>
                </button>
              `
            : nothing}
          ${supportsFeature(stateObj, FEAT_LOCATE)
            ? html`
                <button
                  class="ctl"
                  ?disabled=${unavailable}
                  aria-label=${`Locate ${name}`}
                  @click=${this._onLocate}
                >
                  <ha-icon icon="mdi:map-marker"></ha-icon>
                </button>
              `
            : nothing}
        </div>
      </ha-card>
    `;
  }

  private _renderChips(stateObj: HassEntity, unavailable: boolean): TemplateResult | typeof nothing {
    if (!supportsFeature(stateObj, FEAT_FAN_SPEED)) return nothing;
    const list = stateObj.attributes.fan_speed_list;
    if (!Array.isArray(list)) return nothing;
    const speeds = list
      .filter((speed): speed is string => typeof speed === 'string' && speed !== '')
      .slice(0, MAX_FAN_CHIPS);
    if (speeds.length === 0) return nothing;
    const current =
      this._optimisticFan ??
      (typeof stateObj.attributes.fan_speed === 'string' ? stateObj.attributes.fan_speed : undefined);
    return html`
      <div class="chips">
        ${speeds.map(
          (speed) => html`
            <button
              class="chip ${speed === current ? 'active' : ''}"
              ?disabled=${unavailable}
              aria-label=${`Set fan speed to ${speed}`}
              aria-pressed=${speed === current ? 'true' : 'false'}
              @click=${(ev: Event) => this._onFanSpeed(ev, speed)}
            >
              ${speed.replace(/_/g, ' ')}
            </button>
          `
        )}
      </div>
    `;
  }

  static styles = [
    silkControlStyles,
    css`
      /* The chips are progressive disclosure: they yield to the name on narrow cards. */
      :host {
        container-type: inline-size;
      }
      @container (max-width: 439px) {
        .chips {
          display: none;
        }
      }
      /* Fallback when container queries are unavailable: the name keeps a
         readable minimum, the trailing block may shrink, and inside it the
         chips collapse long before any button clips. */
      .info {
        flex: 1 1 auto;
        min-width: 88px;
      }
      .trailing {
        flex: 0 1 auto;
        min-width: 0;
      }
      .chips {
        display: flex;
        align-items: center;
        gap: 6px;
        margin-right: 2px;
        min-width: 0;
        overflow: hidden;
        flex: 0 100000 auto;
      }
      .chip {
        text-transform: capitalize;
        white-space: nowrap;
      }
      .chip:disabled {
        cursor: default;
      }
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
      .ctl:active:not(:disabled) {
        transform: scale(0.92);
        transition-duration: 120ms;
        transition-timing-function: var(--silk-ease-out);
      }
      .ctl:hover:not(:disabled) {
        background: rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.12);
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
    'silk-vacuum-card': SilkVacuumCard;
  }
}
