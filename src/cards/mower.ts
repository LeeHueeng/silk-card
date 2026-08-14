import { LitElement, html, css, nothing, PropertyValues, TemplateResult } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { HomeAssistant, HassEntity, LovelaceCardConfig } from '../types';
import { silkControlStyles } from '../shared/base';
import {
  domainOf,
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
  type: 'silk-mower-card',
  name: 'Silk Mower',
  description: 'Mow, pause, dock — with battery in sight.',
};

/** LawnMowerEntityFeature bits (HA core). */
const FEAT_START_MOWING = 1;
const FEAT_PAUSE = 2;
const FEAT_DOCK = 4;

/** LawnMowerActivity states (HA core). */
const STATE_MOWING = 'mowing';
const STATE_RETURNING = 'returning';
const STATE_PAUSED = 'paused';
const STATE_ERROR = 'error';

const OPTIMISTIC_TTL_MS = 2000;
const BATTERY_LOW_PCT = 20;

/**
 * `accentFor` has no lawn_mower entry — the domain post-dates its table. HA
 * themes ship the mower state colors; the vacuum family color is the honest
 * fallback, since a robot mower is a robot vacuum that eats grass.
 */
const MOWER_ACCENT =
  'var(--state-lawn_mower-mowing-color, var(--state-vacuum-active-color, #35b5b1))';

export interface SilkMowerCardConfig extends LovelaceCardConfig {
  entity: string;
  /** Battery sensor appended to the state line as `· 62%`. */
  battery?: string;
  name?: string;
  icon?: string;
  /** Accent override (YAML). */
  color?: string;
}

const EDITOR_TAG = 'silk-mower-card-editor';

registerEditor(
  EDITOR_TAG,
  [
    { name: 'entity', required: true, selector: { entity: { domain: ['lawn_mower'] } } },
    { name: 'battery', selector: { entity: { domain: ['sensor'], device_class: 'battery' } } },
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
  {
    entity: '엔티티',
    battery: '배터리 센서',
    name: '이름',
    icon: '아이콘',
    color: '강조 색상',
  }
);

/**
 * A robot-mower row: one glance says whether it is cutting, how much charge is
 * left, and whether it got stuck — plus the two buttons you actually press.
 */
@customElement('silk-mower-card')
export class SilkMowerCard extends LitElement {
  @property({ attribute: false }) public hass?: HomeAssistant;

  @state() private _config?: SilkMowerCardConfig;

  /** Optimistic activity (mowing | paused | returning); null = trust HA. */
  @state() private _optimisticState: string | null = null;

  private _expiryTimer?: number;
  private _lastUpdated?: string;

  public static getStubConfig(hass: HomeAssistant): Partial<SilkMowerCardConfig> {
    const entity = Object.keys(hass.states).find((id) => id.startsWith('lawn_mower.'));
    return { type: 'custom:silk-mower-card', entity };
  }

  public static async getConfigElement(): Promise<HTMLElement> {
    return document.createElement(EDITOR_TAG);
  }

  public setConfig(config: SilkMowerCardConfig): void {
    if (!config.entity || domainOf(config.entity) !== 'lawn_mower') {
      throw new Error('silk-mower-card: define a lawn_mower `entity` (e.g. lawn_mower.automower)');
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
    // A real state update arrived: the optimistic override has done its job.
    if (!isFirst && this._expiryTimer !== undefined) this._clearOptimistic();
  }

  private _clearOptimistic(): void {
    window.clearTimeout(this._expiryTimer);
    this._expiryTimer = undefined;
    this._optimisticState = null;
  }

  private _armExpiry(): void {
    window.clearTimeout(this._expiryTimer);
    this._expiryTimer = window.setTimeout(() => {
      this._expiryTimer = undefined;
      this._optimisticState = null;
    }, OPTIMISTIC_TTL_MS);
  }

  /**
   * Battery lives on a companion sensor: `lawn_mower` entities carry no
   * battery attribute of their own, unlike the vacuum domain.
   */
  private _battery(): { text: string; low: boolean } | null {
    const id = this._config?.battery;
    const hass = this.hass;
    if (!id || !hass) return null;
    const batteryObj = hass.states[id];
    if (!batteryObj || isUnavailable(batteryObj) || batteryObj.state === '') return null;
    const value = Number(batteryObj.state);
    if (!Number.isFinite(value)) return null;
    const level = clamp(value, 0, 100);
    return { text: `${Math.round(level)}%`, low: level < BATTERY_LOW_PCT };
  }

  private _onCardClick(): void {
    if (this._config) moreInfo(this, this._config.entity);
  }

  /** Icon button = the primary control (mow/pause); falls back to more-info. */
  private _onIconClick(ev: Event): void {
    ev.stopPropagation();
    if (!this.hass || !this._config) return;
    const stateObj = this.hass.states[this._config.entity];
    const canStartPause =
      stateObj !== undefined &&
      !isUnavailable(stateObj) &&
      (supportsFeature(stateObj, FEAT_START_MOWING) || supportsFeature(stateObj, FEAT_PAUSE));
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
    const mowing = (this._optimisticState ?? stateObj.state) === STATE_MOWING;
    if (!supportsFeature(stateObj, mowing ? FEAT_PAUSE : FEAT_START_MOWING)) return;
    haptic(this);
    this._optimisticState = mowing ? STATE_PAUSED : STATE_MOWING;
    this._armExpiry();
    this.hass.callService('lawn_mower', mowing ? 'pause' : 'start_mowing', {
      entity_id: this._config.entity,
    });
  }

  private _onDock(ev: Event): void {
    ev.stopPropagation();
    if (!this.hass || !this._config) return;
    const stateObj = this.hass.states[this._config.entity];
    if (!stateObj || isUnavailable(stateObj)) return;
    haptic(this);
    this._optimisticState = STATE_RETURNING;
    this._armExpiry();
    this.hass.callService('lawn_mower', 'dock', { entity_id: this._config.entity });
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
    // While an optimistic override is live, present a synthetic state object so
    // the icon, state line and buttons all agree with the tapped control.
    const displayObj: HassEntity =
      this._optimisticState === null || unavailable
        ? stateObj
        : { ...stateObj, state: this._optimisticState };
    // Only real cutting work lights the icon — `isActive()` counts `error` as
    // active for this domain, and a stuck mower must never read as running.
    const mowing = displayObj.state === STATE_MOWING;
    const active = mowing || displayObj.state === STATE_RETURNING;
    const fault = !unavailable && displayObj.state === STATE_ERROR;
    const accent = accentFor(stateObj, this._config.color ?? MOWER_ACCENT);
    const name = this._config.name ?? stateObj.attributes.friendly_name ?? stateObj.entity_id;
    const battery = this._battery();

    const canStartPause =
      supportsFeature(stateObj, FEAT_START_MOWING) || supportsFeature(stateObj, FEAT_PAUSE);
    // Honest gating: pausing needs PAUSE, mowing needs START_MOWING — either
    // may be missing, so the button greys out for the direction it can't go.
    const startPauseBlocked = !supportsFeature(
      stateObj,
      mowing ? FEAT_PAUSE : FEAT_START_MOWING
    );
    const startPauseLabel = mowing ? `Pause ${name}` : `Start mowing ${name}`;

    return html`
      <ha-card
        class="control ${unavailable ? 'unavailable' : ''}"
        style="--silk-accent:${accent}"
        @click=${this._onCardClick}
      >
        <button
          class="icon ${active ? 'on' : ''} ${fault ? 'fault' : ''}"
          .disabled=${unavailable}
          aria-label=${canStartPause ? startPauseLabel : `Show details for ${name}`}
          @click=${this._onIconClick}
        >
          ${this._config.icon
            ? html`<ha-icon .icon=${this._config.icon}></ha-icon>`
            : html`<ha-state-icon .hass=${this.hass} .stateObj=${displayObj}></ha-state-icon>`}
        </button>
        <div class="info">
          <div class="name">${name}</div>
          <div class="state">
            <span class=${fault ? 'fault' : ''}>${stateText(this.hass, displayObj)}</span
            >${battery
              ? html`<span class="sep">·</span
                  ><span class="batt ${battery.low ? 'low' : ''}">${battery.text}</span>`
              : nothing}
          </div>
        </div>
        <div class="trailing">
          ${canStartPause
            ? html`
                <button
                  class="ctl"
                  ?disabled=${unavailable || startPauseBlocked}
                  aria-label=${startPauseLabel}
                  @click=${this._onStartPauseClick}
                >
                  <ha-icon icon=${mowing ? 'mdi:pause' : 'mdi:play'}></ha-icon>
                </button>
              `
            : nothing}
          ${supportsFeature(stateObj, FEAT_DOCK)
            ? html`
                <button
                  class="ctl"
                  ?disabled=${unavailable}
                  aria-label=${`Send ${name} to the dock`}
                  @click=${this._onDock}
                >
                  <ha-icon icon="mdi:home-import-outline"></ha-icon>
                </button>
              `
            : nothing}
        </div>
      </ha-card>
    `;
  }

  static styles = [
    silkControlStyles,
    css`
      /* A faulted mower is the one case where status color beats the accent —
         it is the answer to the only question that matters at that moment. */
      .icon.fault {
        color: var(--error-color, #db4437);
        background: color-mix(in srgb, var(--error-color, #db4437) 16%, transparent);
      }
      .fault {
        color: var(--error-color, #db4437);
      }
      .batt.low {
        color: var(--error-color, #db4437);
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
      .ctl:focus-visible {
        outline: 2px solid color-mix(in srgb, var(--silk-accent) 70%, transparent);
        outline-offset: 2px;
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
    'silk-mower-card': SilkMowerCard;
  }
}
