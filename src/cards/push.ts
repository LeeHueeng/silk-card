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
} from '../shared/service';
import { accentFor } from '../shared/color';
import { registerEditor } from '../shared/editor';

export const META = {
  type: 'silk-push-card',
  name: 'Silk Push',
  description: 'A physical push button with a satisfying press.',
};

export interface PushCardConfig extends LovelaceCardConfig {
  entity: string;
  name?: string;
  icon?: string;
  /** Accent override for the LED ring and active icon. */
  color?: string;
  /** When true, window.confirm gates every press. */
  confirm?: boolean;
}

const EDITOR_TAG = 'silk-push-card-editor';

registerEditor(
  EDITOR_TAG,
  [
    {
      name: 'entity',
      required: true,
      selector: {
        entity: { domain: ['switch', 'light', 'scene', 'script', 'button', 'input_button'] },
      },
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
    { name: 'confirm', selector: { boolean: {} } },
  ],
  {
    entity: '엔티티',
    name: '이름',
    icon: '아이콘',
    color: '강조 색상',
    confirm: '누르기 전에 확인',
  }
);

/**
 * Domains whose press is a momentary action rather than a state flip. Their
 * feedback is the LED ring sweep, never a solid ring (isActive() reports
 * scene/button as permanently active, which would be a lie on a button face).
 */
const STATELESS = new Set(['scene', 'script', 'button', 'input_button']);

/** LED ring geometry: pathLength normalizes the circle to 100 dash units. */
const RING_R = 38;
const RING_UNITS = 100;

const OPTIMISTIC_TIMEOUT_MS = 2000;

/**
 * A round physical push button. Depth shading is strictly neutral (text-color
 * grays + black-alpha inset shadows, no outer shadows) so the button reads as
 * a pressed-metal dome on light and dark themes alike. The LED ring around it
 * is the only chromatic element: solid accent while a stateful entity is on,
 * a 360° sweep as press feedback for momentary entities.
 */
@customElement('silk-push-card')
export class SilkPushCard extends LitElement {
  @property({ attribute: false }) public hass?: HomeAssistant;

  @state() private _config?: PushCardConfig;

  /** Optimistic target for stateful domains (null = trust the real state). */
  @state() private _optimistic: boolean | null = null;

  /** last_updated snapshot at press time; any newer stamp clears the override. */
  private _optimisticBase = '';
  private _optimisticTimer?: number;

  public static getStubConfig(hass: HomeAssistant): Partial<PushCardConfig> {
    const ids = Object.keys(hass.states);
    const entity =
      ids.find((id) => id.startsWith('switch.')) ?? ids.find((id) => id.startsWith('scene.'));
    return { type: 'custom:silk-push-card', entity };
  }

  public static async getConfigElement(): Promise<HTMLElement> {
    return document.createElement(EDITOR_TAG);
  }

  public setConfig(config: PushCardConfig): void {
    if (!config.entity) {
      throw new Error('silk-push-card: `entity` is required');
    }
    this._config = config;
    this._clearOptimistic();
  }

  public getCardSize(): number {
    return 2;
  }

  public getGridOptions(): Record<string, number> {
    return { columns: 3, rows: 2, min_columns: 2, min_rows: 2 };
  }

  public disconnectedCallback(): void {
    super.disconnectedCallback();
    window.clearTimeout(this._optimisticTimer);
  }

  protected willUpdate(changed: PropertyValues): void {
    if (!changed.has('hass') || this._optimistic === null || !this._config) return;
    const stateObj = this.hass?.states[this._config.entity];
    if (stateObj && stateObj.last_updated !== this._optimisticBase) {
      this._clearOptimistic();
    }
  }

  private _clearOptimistic(): void {
    window.clearTimeout(this._optimisticTimer);
    this._optimisticTimer = undefined;
    this._optimistic = null;
  }

  /** One full clockwise LED sweep from the top — press feedback for momentary domains. */
  private _sweep(): void {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const led = this.renderRoot.querySelector<SVGCircleElement>('.ring-led');
    // Web Animations API restarts cleanly on rapid presses, no state juggling.
    led?.animate(
      [
        { strokeDashoffset: `${RING_UNITS}`, opacity: 1 },
        { strokeDashoffset: '0', opacity: 1, offset: 0.8 },
        { strokeDashoffset: '0', opacity: 0 },
      ],
      // 480ms sweep + 120ms fade; easing mirrors --silk-ease-out.
      { duration: 600, easing: 'cubic-bezier(0.23, 1, 0.32, 1)' }
    );
  }

  private _onCardClick(): void {
    if (this._config) moreInfo(this, this._config.entity);
  }

  private _onPress(ev: Event): void {
    ev.stopPropagation();
    const config = this._config;
    const hass = this.hass;
    if (!config || !hass) return;
    const stateObj = hass.states[config.entity];
    if (!stateObj || isUnavailable(stateObj)) return;
    if (config.confirm) {
      const name = config.name ?? stateObj.attributes.friendly_name ?? config.entity;
      if (!window.confirm(`Are you sure you want to press ${name}?`)) return;
    }
    haptic(this);
    if (STATELESS.has(domainOf(config.entity))) {
      this._sweep();
    } else {
      // Optimistic flip mirrors what toggleEntity decides from the *real* state.
      this._optimistic = !isActive(stateObj);
      this._optimisticBase = stateObj.last_updated;
      window.clearTimeout(this._optimisticTimer);
      this._optimisticTimer = window.setTimeout(
        () => this._clearOptimistic(),
        OPTIMISTIC_TIMEOUT_MS
      );
    }
    toggleEntity(hass, config.entity);
  }

  protected render(): TemplateResult | typeof nothing {
    const config = this._config;
    const hass = this.hass;
    if (!config || !hass) return nothing;
    const stateObj = hass.states[config.entity];
    if (!stateObj) {
      return html`
        <ha-card class="control">
          <div class="warning">Entity not found: ${config.entity}</div>
        </ha-card>
      `;
    }

    const unavailable = isUnavailable(stateObj);
    const stateful = !STATELESS.has(domainOf(config.entity));
    const active = stateful && !unavailable && (this._optimistic ?? isActive(stateObj));
    // Stateful push domains are plain on/off; a synthetic state keeps the icon
    // glyph in step with the optimistic flip.
    const displayObj: HassEntity =
      this._optimistic === null || !stateful
        ? stateObj
        : { ...stateObj, state: this._optimistic ? 'on' : 'off' };
    const accent = accentFor(stateObj, config.color);
    const name = config.name ?? stateObj.attributes.friendly_name ?? config.entity;

    return html`
      <ha-card
        class=${unavailable ? 'unavailable' : ''}
        style="--silk-accent:${accent}"
        @click=${this._onCardClick}
      >
        <div class="well">
          <svg class="ring" viewBox="0 0 80 80" aria-hidden="true">
            <circle class="ring-track" cx="40" cy="40" r=${RING_R}></circle>
            <circle
              class="ring-led ${active ? 'on' : ''}"
              cx="40"
              cy="40"
              r=${RING_R}
              pathLength=${RING_UNITS}
            ></circle>
          </svg>
          <button
            class="btn ${active ? 'on' : ''}"
            .disabled=${unavailable}
            aria-label=${`${stateful ? 'Toggle' : 'Activate'} ${name}`}
            @click=${this._onPress}
          >
            ${config.icon
              ? html`<ha-icon .icon=${config.icon}></ha-icon>`
              : html`<ha-state-icon .hass=${hass} .stateObj=${displayObj}></ha-state-icon>`}
          </button>
        </div>
        <div class="name" title=${name}>${name}</div>
      </ha-card>
    `;
  }

  static styles = [
    silkControlStyles,
    css`
      ha-card {
        flex-direction: column;
        justify-content: center;
        gap: 5px;
        padding: 8px 12px;
      }
      .well {
        position: relative;
        flex: none;
        width: 80px;
        height: 80px;
        display: grid;
        place-items: center;
      }
      .ring {
        position: absolute;
        inset: 0;
        display: block;
        /* Dash sweep starts at 12 o'clock instead of SVG's default 3 o'clock. */
        transform: rotate(-90deg);
        pointer-events: none;
        overflow: visible;
      }
      .ring-track,
      .ring-led {
        fill: none;
        stroke-width: 3;
      }
      .ring-track {
        stroke: rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.07);
      }
      /* LED ring: solid accent surface when on, no glow shadows ever. */
      .ring-led {
        stroke: var(--silk-accent);
        stroke-linecap: round;
        stroke-dasharray: ${RING_UNITS};
        stroke-dashoffset: 0;
        opacity: 0;
        transition: opacity 200ms ease;
      }
      .ring-led.on {
        opacity: 1;
      }
      /* The button face: bezel ring + monochrome dome via inset shadows only. */
      .btn {
        position: relative;
        z-index: 1;
        width: 68px;
        height: 68px;
        border-radius: 50%;
        border: 2px solid rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.1);
        background: rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.07);
        box-shadow:
          inset 0 1px 1px rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.06),
          inset 0 -3px 6px rgba(0, 0, 0, 0.12);
        display: grid;
        place-items: center;
        padding: 0;
        cursor: pointer;
        color: var(--secondary-text-color);
        transition:
          transform 250ms var(--silk-spring),
          box-shadow 250ms var(--silk-spring),
          color 200ms ease;
      }
      .btn:active:not(:disabled) {
        transform: scale(0.93);
        box-shadow: inset 0 3px 8px rgba(0, 0, 0, 0.22);
        transition-duration: 100ms;
        transition-timing-function: var(--silk-ease-out);
      }
      .btn.on {
        color: var(--silk-accent);
      }
      .btn:focus-visible {
        outline: 2px solid color-mix(in srgb, var(--silk-accent) 70%, transparent);
        outline-offset: 3px;
      }
      .btn:disabled {
        cursor: default;
      }
      .btn ha-state-icon,
      .btn ha-icon {
        --mdc-icon-size: 26px;
        pointer-events: none;
      }
      .name {
        font-size: 13px;
        font-weight: 400;
        line-height: 1.3;
        color: var(--secondary-text-color);
        max-width: 100%;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        text-align: center;
      }
      .unavailable .well,
      .unavailable .name {
        opacity: 0.45;
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    'silk-push-card': SilkPushCard;
  }
}
