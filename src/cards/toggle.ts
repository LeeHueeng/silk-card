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
} from '../shared/service';
import { accentFor } from '../shared/color';
import { registerEditor } from '../shared/editor';

export const META = {
  type: 'silk-toggle-card',
  name: 'Silk Toggle',
  description: 'A crisp on/off row with a real switch and instant feedback.',
};

export interface ToggleCardConfig extends LovelaceCardConfig {
  entity: string;
  name?: string;
  icon?: string;
  color?: string;
  /** When true, window.confirm gates every toggle. */
  confirm?: boolean;
}

const EDITOR_TAG = 'silk-toggle-card-editor';

registerEditor(
  EDITOR_TAG,
  [
    {
      name: 'entity',
      required: true,
      selector: {
        entity: { domain: ['switch', 'light', 'input_boolean', 'fan', 'lock', 'cover'] },
      },
    },
    { name: 'name', selector: { text: {} } },
    { name: 'icon', selector: { icon: {} } },
    { name: 'confirm', selector: { boolean: {} } },
  ],
  {
    entity: 'Entity',
    name: 'Name',
    icon: 'Icon',
    confirm: 'Ask before switching',
  }
);

/** The state the service call will land on, per domain, for optimistic display. */
function predictedState(domain: string, active: boolean): string {
  switch (domain) {
    case 'lock':
      return active ? 'unlocked' : 'locked';
    case 'cover':
    case 'valve':
      return active ? 'open' : 'closed';
    default:
      return active ? 'on' : 'off';
  }
}

const OPTIMISTIC_TIMEOUT_MS = 2000;

@customElement('silk-toggle-card')
export class SilkToggleCard extends LitElement {
  @property({ attribute: false }) public hass?: HomeAssistant;

  @state() private _config?: ToggleCardConfig;

  /** Optimistic target (null = trust the real state). */
  @state() private _optimistic: boolean | null = null;

  /** last_updated snapshot at toggle time; any newer stamp clears the override. */
  private _optimisticBase = '';
  private _optimisticTimer?: number;

  public static getStubConfig(hass: HomeAssistant): Partial<ToggleCardConfig> {
    const ids = Object.keys(hass.states);
    const entity =
      ids.find((id) => id.startsWith('switch.')) ?? ids.find((id) => id.startsWith('light.'));
    return { type: 'custom:silk-toggle-card', entity };
  }

  public static async getConfigElement(): Promise<HTMLElement> {
    return document.createElement(EDITOR_TAG);
  }

  public setConfig(config: ToggleCardConfig): void {
    if (!config.entity) {
      throw new Error('silk-toggle-card: `entity` is required');
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

  private _onCardClick(): void {
    if (this._config) moreInfo(this, this._config.entity);
  }

  private _onToggleClick(ev: Event): void {
    ev.stopPropagation();
    const config = this._config;
    const hass = this.hass;
    if (!config || !hass) return;
    const stateObj = hass.states[config.entity];
    if (!stateObj || isUnavailable(stateObj)) return;
    if (config.confirm) {
      const name = config.name ?? stateObj.attributes.friendly_name ?? config.entity;
      if (!window.confirm(`Are you sure you want to toggle ${name}?`)) return;
    }
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
    // While an optimistic override is live, present a synthetic state object so
    // the accent, icon and state line all agree with the flipped switch.
    const displayObj: HassEntity =
      this._optimistic === null
        ? stateObj
        : { ...stateObj, state: predictedState(domainOf(config.entity), this._optimistic) };
    const accent = accentFor(displayObj, config.color);
    const name = config.name ?? stateObj.attributes.friendly_name ?? config.entity;

    return html`
      <ha-card
        class="control ${unavailable ? 'unavailable' : ''}"
        style="--silk-accent:${accent}"
        @click=${this._onCardClick}
      >
        <button
          class="icon ${active ? 'on' : ''}"
          .disabled=${unavailable}
          aria-label=${`Toggle ${name}`}
          @click=${this._onToggleClick}
        >
          ${config.icon
            ? html`<ha-icon .icon=${config.icon}></ha-icon>`
            : html`<ha-state-icon .hass=${hass} .stateObj=${displayObj}></ha-state-icon>`}
        </button>
        <div class="info">
          <div class="name">${name}</div>
          <div class="state">${stateText(hass, displayObj)}</div>
        </div>
        <div class="trailing">
          <button
            class="switch ${active ? 'checked' : ''}"
            role="switch"
            aria-checked=${active ? 'true' : 'false'}
            aria-label=${`Toggle ${name}`}
            .disabled=${unavailable}
            @click=${this._onToggleClick}
          >
            <span class="thumb"></span>
          </button>
        </div>
      </ha-card>
    `;
  }

  static styles = [
    silkControlStyles,
    css`
      .switch {
        flex: none;
        position: relative;
        width: 46px;
        height: 28px;
        border: none;
        border-radius: 999px;
        padding: 2px;
        cursor: pointer;
        display: block;
        background: rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.15);
        transition: background 200ms ease;
      }
      /* Invisible halo lifts the touch target past 40px without growing the track. */
      .switch::after {
        content: '';
        position: absolute;
        inset: -7px;
        border-radius: 999px;
      }
      .switch.checked {
        background: var(--silk-accent);
      }
      .switch:focus-visible {
        outline: 2px solid color-mix(in srgb, var(--silk-accent) 70%, transparent);
        outline-offset: 2px;
      }
      .switch:disabled {
        cursor: default;
      }
      .thumb {
        display: block;
        width: 24px;
        height: 24px;
        border-radius: 50%;
        background: var(--card-background-color, #fff);
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
        transform: translateX(0);
        transition: transform 200ms var(--silk-ease-out);
        will-change: transform;
      }
      .switch.checked .thumb {
        transform: translateX(18px);
      }
      .icon:disabled {
        cursor: default;
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    'silk-toggle-card': SilkToggleCard;
  }
}
