import { LitElement, html, css, nothing, PropertyValues, TemplateResult } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { HomeAssistant, HassEntity, LovelaceCardConfig } from '../types';
import { silkControlStyles } from '../shared/base';
import { domainOf, isActive, haptic } from '../shared/service';
import { accentFor } from '../shared/color';
import { registerEditor } from '../shared/editor';

export const META = {
  type: 'silk-button-card',
  name: 'Silk Button',
  description: 'Scenes and scripts that feel like real buttons.',
};

const ACTION_DOMAINS = ['scene', 'script', 'button', 'input_button'] as const;
type ActionDomain = (typeof ACTION_DOMAINS)[number];

const DOMAIN_FALLBACK_ICONS: Record<ActionDomain, string> = {
  scene: 'mdi:palette',
  script: 'mdi:script-text',
  button: 'mdi:gesture-tap-button',
  input_button: 'mdi:gesture-tap-button',
};

export interface SilkButtonConfig extends LovelaceCardConfig {
  entity: string;
  name?: string;
  icon?: string;
  color?: string;
  confirm?: boolean;
}

registerEditor(
  'silk-button-card-editor',
  [
    {
      name: 'entity',
      required: true,
      selector: { entity: { domain: [...ACTION_DOMAINS] } },
    },
    { name: 'name', selector: { text: {} } },
    { name: 'icon', selector: { icon: {} } },
    { name: 'confirm', selector: { boolean: {} } },
  ],
  {
    entity: 'Entity',
    name: 'Name',
    icon: 'Icon',
    confirm: 'Confirm before running',
  }
);

/**
 * Compact action card — the WHOLE card is the press target. Pressing calls the
 * domain's activation service (scene/script.turn_on, button/input_button.press)
 * and answers with a spring release plus a 400ms accent surface wash (never a
 * glow). Scripts show a spinning mdi:loading in place of the icon while their
 * state is `on` — it represents real activity, so the loop is allowed.
 */
@customElement('silk-button-card')
export class SilkButtonCard extends LitElement {
  @property({ attribute: false }) public hass?: HomeAssistant;

  @state() private _config?: SilkButtonConfig;
  /** Optimistic "script is running" between our service call and the real state. */
  @state() private _optimisticRunning = false;

  private _optimisticTimer?: number;

  public static getStubConfig(hass: HomeAssistant): Partial<SilkButtonConfig> {
    const ids = Object.keys(hass.states);
    const entity =
      ids.find((id) => id.startsWith('scene.')) ?? ids.find((id) => id.startsWith('script.'));
    return { type: 'custom:silk-button-card', entity };
  }

  public static async getConfigElement(): Promise<HTMLElement> {
    return document.createElement('silk-button-card-editor');
  }

  public setConfig(config: SilkButtonConfig): void {
    if (!config.entity) {
      throw new Error('silk-button-card: `entity` is required');
    }
    const domain = domainOf(config.entity);
    if (!(ACTION_DOMAINS as readonly string[]).includes(domain)) {
      throw new Error(
        `silk-button-card: entity must be one of ${ACTION_DOMAINS.join('/')}, got \`${domain}\``
      );
    }
    this._config = config;
    this._optimisticRunning = false;
  }

  public getCardSize(): number {
    return 1;
  }

  public getGridOptions(): Record<string, number> {
    return { columns: 3, rows: 1, min_columns: 2, min_rows: 1 };
  }

  public disconnectedCallback(): void {
    super.disconnectedCallback();
    window.clearTimeout(this._optimisticTimer);
  }

  protected willUpdate(changed: PropertyValues): void {
    // Clear the optimistic override as soon as the real running state arrives.
    if (changed.has('hass') && this._optimisticRunning && this._stateObj?.state === 'on') {
      this._clearOptimistic();
    }
  }

  private get _stateObj(): HassEntity | undefined {
    const entity = this._config?.entity;
    return entity ? this.hass?.states[entity] : undefined;
  }

  /**
   * Scene/button/input_button state is a last-activated timestamp that reads
   * `unknown` until first use — still perfectly pressable. Only a literal
   * `unavailable` (or a missing entity) disables the card, so the shared
   * isUnavailable() (which also treats `unknown` as dead) is not used here.
   */
  private _isUnavailable(stateObj: HassEntity | undefined): boolean {
    return !stateObj || stateObj.state === 'unavailable';
  }

  private _isRunning(stateObj: HassEntity | undefined): boolean {
    if (!this._config || domainOf(this._config.entity) !== 'script') return false;
    return stateObj?.state === 'on' || this._optimisticRunning;
  }

  private _clearOptimistic(): void {
    window.clearTimeout(this._optimisticTimer);
    this._optimisticTimer = undefined;
    this._optimisticRunning = false;
  }

  private _onPress(): void {
    const config = this._config;
    const hass = this.hass;
    if (!config || !hass || this._isUnavailable(this._stateObj)) return;

    const name =
      config.name ?? this._stateObj?.attributes.friendly_name ?? config.entity;
    if (config.confirm && !window.confirm(`Run "${name}"?`)) return;

    const domain = domainOf(config.entity) as ActionDomain;
    const service = domain === 'button' || domain === 'input_button' ? 'press' : 'turn_on';
    hass.callService(domain, service, { entity_id: config.entity });
    haptic(this);
    this._flash();

    if (domain === 'script') {
      // Optimistic: show the spinner immediately; the real state (or a 2s
      // timeout, for scripts that finish instantly) takes over from there.
      this._optimisticRunning = true;
      window.clearTimeout(this._optimisticTimer);
      this._optimisticTimer = window.setTimeout(() => {
        this._optimisticTimer = undefined;
        this._optimisticRunning = false;
      }, 2000);
    }
  }

  private _onKeydown(ev: KeyboardEvent): void {
    if (ev.repeat || (ev.key !== 'Enter' && ev.key !== ' ')) return;
    ev.preventDefault();
    this._onPress();
  }

  /** Restart the accent surface wash: remove the class, reflow, re-add. */
  private _flash(): void {
    const el = this.renderRoot.querySelector<HTMLElement>('.flash');
    if (!el) return;
    el.classList.remove('go');
    void el.offsetWidth; // force reflow so the animation restarts
    el.classList.add('go');
  }

  private _renderIcon(stateObj: HassEntity | undefined, running: boolean): TemplateResult {
    if (running) {
      return html`<ha-icon class="spin" icon="mdi:loading"></ha-icon>`;
    }
    if (this._config?.icon) {
      return html`<ha-icon .icon=${this._config.icon}></ha-icon>`;
    }
    if (stateObj) {
      return html`<ha-state-icon .hass=${this.hass} .stateObj=${stateObj}></ha-state-icon>`;
    }
    const domain = domainOf(this._config?.entity ?? '') as ActionDomain;
    return html`<ha-icon .icon=${DOMAIN_FALLBACK_ICONS[domain] ?? 'mdi:gesture-tap'}></ha-icon>`;
  }

  protected render(): TemplateResult | typeof nothing {
    const config = this._config;
    if (!config) return nothing;
    const stateObj = this._stateObj;
    if (this.hass && !stateObj) {
      return html`<ha-card><div class="warning">Entity not found: ${config.entity}</div></ha-card>`;
    }

    const unavailable = this._isUnavailable(stateObj);
    const running = this._isRunning(stateObj);
    const name = config.name ?? stateObj?.attributes.friendly_name ?? config.entity;

    return html`
      <ha-card
        class="control ${unavailable ? 'unavailable' : ''}"
        style="--silk-accent:${accentFor(stateObj, config.color)}"
        role="button"
        tabindex=${unavailable ? -1 : 0}
        aria-label=${name}
        @click=${this._onPress}
        @keydown=${this._onKeydown}
      >
        <div class="flash"></div>
        <div class="icon ${isActive(stateObj) || running ? 'on' : ''}">
          ${this._renderIcon(stateObj, running)}
        </div>
        <div class="info"><div class="name">${name}</div></div>
      </ha-card>
    `;
  }

  static styles = [
    silkControlStyles,
    css`
      /* The whole card is the button: press-in fast, release with spring. */
      ha-card {
        transition: transform 250ms var(--silk-spring);
      }
      ha-card:active {
        transform: scale(0.97);
        transition-duration: 120ms;
        transition-timing-function: var(--silk-ease-out);
      }
      ha-card:focus-visible {
        outline: none;
        box-shadow: inset 0 0 0 2px var(--silk-accent);
      }
      ha-card.unavailable {
        cursor: default;
      }
      ha-card.unavailable:active {
        transform: none;
      }
      /* The card handles the click; the icon is purely visual. */
      .icon {
        pointer-events: none;
      }
      /* Success feedback = a brief accent surface wash, never a glow shadow. */
      .flash {
        position: absolute;
        inset: 0;
        background: var(--silk-accent);
        opacity: 0;
        pointer-events: none;
        z-index: 0;
      }
      .flash.go {
        animation: silk-action-flash 400ms var(--silk-ease-out);
      }
      @keyframes silk-action-flash {
        0% {
          opacity: 0;
        }
        35% {
          opacity: 0.15;
        }
        100% {
          opacity: 0;
        }
      }
      /* Spinner while a script is actually running — represents real activity. */
      .icon ha-icon.spin {
        animation: silk-action-spin 900ms linear infinite;
      }
      @keyframes silk-action-spin {
        to {
          transform: rotate(360deg);
        }
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    'silk-button-card': SilkButtonCard;
  }
}
