import { LitElement, html, css, nothing, PropertyValues, TemplateResult } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { HomeAssistant, LovelaceCardConfig } from '../types';
import { silkControlStyles } from '../shared/base';
import { isActive, isUnavailable, toggleEntity, haptic } from '../shared/service';
import { accentFor } from '../shared/color';
import { registerEditor } from '../shared/editor';

export const META = {
  type: 'silk-rocker-card',
  name: 'Silk Rocker',
  description: 'A wall switch that looks and moves like the real thing.',
};

export interface RockerCardConfig extends LovelaceCardConfig {
  entity: string;
  name?: string;
  /** Accent override for the paddle LED. */
  color?: string;
  /** Set false to hide the name line below the plate. */
  show_name?: boolean;
}

const EDITOR_TAG = 'silk-rocker-card-editor';

registerEditor(
  EDITOR_TAG,
  [
    {
      name: 'entity',
      required: true,
      selector: { entity: { domain: ['switch', 'light', 'input_boolean', 'fan'] } },
    },
    { name: 'name', selector: { text: {} } },
  ],
  { entity: 'Entity', name: 'Name' }
);

const OPTIMISTIC_TIMEOUT_MS = 2000;

/**
 * A vertical EU/KR-style wall rocker. The whole card is the switch: click or
 * Enter/Space flips it. Skeuomorphic depth is strictly neutral — text-color
 * grays for the planes, black-alpha inset shadows for recesses — so it reads
 * correctly on light and dark themes. The only chromatic element is the LED
 * dot on the paddle, lit with the domain accent.
 */
@customElement('silk-rocker-card')
export class SilkRockerCard extends LitElement {
  @property({ attribute: false }) public hass?: HomeAssistant;

  @state() private _config?: RockerCardConfig;

  /** Optimistic target (null = trust the real state). */
  @state() private _optimistic: boolean | null = null;

  /** last_updated snapshot at toggle time; any newer stamp clears the override. */
  private _optimisticBase = '';
  private _optimisticTimer?: number;

  public static getStubConfig(hass: HomeAssistant): Partial<RockerCardConfig> {
    const entity = Object.keys(hass.states).find((id) => id.startsWith('switch.'));
    return { type: 'custom:silk-rocker-card', entity };
  }

  public static async getConfigElement(): Promise<HTMLElement> {
    return document.createElement(EDITOR_TAG);
  }

  public setConfig(config: RockerCardConfig): void {
    if (!config.entity) {
      throw new Error('silk-rocker-card: `entity` is required');
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

  private _toggle(): void {
    const config = this._config;
    const hass = this.hass;
    if (!config || !hass) return;
    const stateObj = hass.states[config.entity];
    if (!stateObj || isUnavailable(stateObj)) return;
    haptic(this);
    // Optimistic flip mirrors what toggleEntity decides from the *real* state,
    // so rapid taps stay honest about the service calls actually sent.
    this._optimistic = !isActive(stateObj);
    this._optimisticBase = stateObj.last_updated;
    window.clearTimeout(this._optimisticTimer);
    this._optimisticTimer = window.setTimeout(
      () => this._clearOptimistic(),
      OPTIMISTIC_TIMEOUT_MS
    );
    toggleEntity(hass, config.entity);
  }

  private _onClick(): void {
    this._toggle();
  }

  private _onKeydown(ev: KeyboardEvent): void {
    if (ev.key !== 'Enter' && ev.key !== ' ') return;
    ev.preventDefault();
    this._toggle();
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
    const active = this._optimistic ?? isActive(stateObj);
    const accent = accentFor(stateObj, config.color);
    const name = config.name ?? stateObj.attributes.friendly_name ?? config.entity;
    const showName = config.show_name !== false;

    return html`
      <ha-card
        class=${unavailable ? 'unavailable' : ''}
        style="--silk-accent:${accent}"
        role="switch"
        tabindex=${unavailable ? -1 : 0}
        aria-checked=${active ? 'true' : 'false'}
        aria-disabled=${unavailable ? 'true' : 'false'}
        aria-label=${`Toggle ${name}`}
        @click=${this._onClick}
        @keydown=${this._onKeydown}
      >
        <div class="plate">
          <div class="paddle ${unavailable ? '' : active ? 'on' : 'off'}">
            <span class="led ${!unavailable && active ? 'lit' : ''}"></span>
          </div>
        </div>
        ${showName ? html`<div class="name" title=${name}>${name}</div>` : nothing}
      </ha-card>
    `;
  }

  static styles = [
    silkControlStyles,
    css`
      ha-card {
        flex-direction: column;
        justify-content: center;
        gap: 6px;
        padding: 8px 12px;
      }
      ha-card:focus-visible {
        outline: 2px solid color-mix(in srgb, var(--silk-accent) 70%, transparent);
        outline-offset: -2px;
      }
      .unavailable {
        cursor: default;
      }
      /* Wall-plate well: a recessed pocket the paddle sits in. */
      .plate {
        flex: none;
        width: 60px;
        height: 92px;
        border-radius: 16px;
        display: grid;
        place-items: center;
        background: rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.04);
        box-shadow:
          inset 0 2px 5px rgba(0, 0, 0, 0.16),
          inset 0 -1px 1px rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.05);
        transition: transform 250ms var(--silk-spring);
      }
      ha-card:not(.unavailable):active .plate {
        transform: scale(0.97);
        transition-duration: 120ms;
        transition-timing-function: var(--silk-ease-out);
      }
      /* The rocker paddle: tilts on the X axis around its center, like a real
         seesaw switch. ON = top edge pressed in, OFF = bottom edge pressed. */
      .paddle {
        position: relative;
        width: 46px;
        height: 78px;
        border-radius: 10px;
        background: rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.08);
        transition:
          transform 160ms var(--silk-ease-out),
          box-shadow 160ms var(--silk-ease-out),
          background 200ms ease;
        will-change: transform;
      }
      .paddle.on {
        transform: perspective(240px) translateY(-1px) rotateX(10deg);
        box-shadow:
          inset 0 3px 5px rgba(0, 0, 0, 0.16),
          inset 0 -1px 1px rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.1);
      }
      .paddle.off {
        transform: perspective(240px) translateY(1px) rotateX(-10deg);
        box-shadow:
          inset 0 -3px 5px rgba(0, 0, 0, 0.16),
          inset 0 1px 1px rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.1);
      }
      /* Status LED: a solid accent dot, never a glow. */
      .led {
        position: absolute;
        left: 50%;
        bottom: 9px;
        transform: translateX(-50%);
        width: 5px;
        height: 5px;
        border-radius: 50%;
        background: rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.18);
        transition: background 200ms ease;
      }
      .led.lit {
        background: var(--silk-accent);
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
      /* Unavailable: paddle sits neutral and flat, everything dims. */
      .unavailable .plate,
      .unavailable .name {
        opacity: 0.45;
      }
      .unavailable .paddle {
        transform: none;
        box-shadow: inset 0 0 0 1px rgba(0, 0, 0, 0.06);
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    'silk-rocker-card': SilkRockerCard;
  }
}
