import { LitElement, html, css, nothing, PropertyValues, TemplateResult } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { HomeAssistant, HassEntity, LovelaceCardConfig } from '../types';
import { silkControlStyles } from '../shared/base';
import { domainOf, isUnavailable, moreInfo, haptic } from '../shared/service';
import { accentFor } from '../shared/color';
import { registerEditor } from '../shared/editor';

export const META = {
  type: 'silk-automation-card',
  name: 'Silk Automation',
  description: 'See it, arm it, fire it.',
};

export interface SilkAutomationCardConfig extends LovelaceCardConfig {
  entity: string;
  name?: string;
  icon?: string;
  color?: string;
}

const OPTIMISTIC_TIMEOUT_MS = 2000;
/** Re-render cadence so the relative "Last run" line never goes stale. */
const CLOCK_TICK_MS = 30_000;

const EDITOR_TAG = 'silk-automation-card-editor';

registerEditor(
  EDITOR_TAG,
  [
    { name: 'entity', required: true, selector: { entity: { domain: ['automation'] } } },
    { name: 'name', selector: { text: {} } },
  ],
  { entity: 'Entity', name: 'Name' }
);

/** '<60s → just now, <1h → Nm ago, <24h → Hh ago, else Dd ago'; bad input → null. */
function relativeTime(ms: number): string | null {
  if (!Number.isFinite(ms)) return null;
  const sec = Math.max(0, (Date.now() - ms) / 1000);
  if (sec < 60) return 'just now';
  if (sec < 3600) return `${Math.floor(sec / 60)}m ago`;
  if (sec < 86400) return `${Math.floor(sec / 3600)}h ago`;
  return `${Math.floor(sec / 86400)}d ago`;
}

/**
 * A single-row automation card: arm/disarm with a compact switch, fire it now
 * with a play button (accent surface wash on fire, like silk-button-card), and
 * read when it last ran at a glance.
 */
@customElement('silk-automation-card')
export class SilkAutomationCard extends LitElement {
  @property({ attribute: false }) public hass?: HomeAssistant;

  @state() private _config?: SilkAutomationCardConfig;

  /** Optimistic enabled state (null = trust the real state). */
  @state() private _optimistic: boolean | null = null;
  /** Optimistic run stamp (ms) so "Last run" answers the trigger instantly. */
  @state() private _optimisticRunAt: number | null = null;

  /** last_updated snapshot at toggle time; any newer stamp clears the override. */
  private _optimisticBase = '';
  /** last_triggered snapshot at fire time; a newer stamp clears the run override. */
  private _runBase: string | null = null;
  private _optimisticTimer?: number;
  private _runTimer?: number;
  private _clockTimer?: number;

  public static getStubConfig(hass: HomeAssistant): Partial<SilkAutomationCardConfig> {
    const entity = Object.keys(hass.states).find((id) => id.startsWith('automation.'));
    return { type: 'custom:silk-automation-card', entity };
  }

  public static async getConfigElement(): Promise<HTMLElement> {
    return document.createElement(EDITOR_TAG);
  }

  public setConfig(config: SilkAutomationCardConfig): void {
    if (!config.entity) {
      throw new Error('silk-automation-card: `entity` is required');
    }
    if (domainOf(config.entity) !== 'automation') {
      throw new Error(
        `silk-automation-card: entity must be an automation, got \`${domainOf(config.entity)}\``
      );
    }
    this._config = config;
    this._clearOptimistic();
    this._clearOptimisticRun();
  }

  public getCardSize(): number {
    return 1;
  }

  public getGridOptions(): Record<string, number> {
    return { columns: 6, rows: 1, min_columns: 4, min_rows: 1 };
  }

  public connectedCallback(): void {
    super.connectedCallback();
    this._clockTimer = window.setInterval(() => this.requestUpdate(), CLOCK_TICK_MS);
  }

  public disconnectedCallback(): void {
    super.disconnectedCallback();
    window.clearInterval(this._clockTimer);
    window.clearTimeout(this._optimisticTimer);
    window.clearTimeout(this._runTimer);
  }

  protected willUpdate(changed: PropertyValues): void {
    if (!changed.has('hass') || !this._config) return;
    const stateObj = this.hass?.states[this._config.entity];
    if (!stateObj) return;
    if (this._optimistic !== null && stateObj.last_updated !== this._optimisticBase) {
      this._clearOptimistic();
    }
    if (
      this._optimisticRunAt !== null &&
      (stateObj.attributes.last_triggered ?? null) !== this._runBase
    ) {
      this._clearOptimisticRun();
    }
  }

  private _clearOptimistic(): void {
    window.clearTimeout(this._optimisticTimer);
    this._optimisticTimer = undefined;
    this._optimistic = null;
  }

  private _clearOptimisticRun(): void {
    window.clearTimeout(this._runTimer);
    this._runTimer = undefined;
    this._optimisticRunAt = null;
  }

  private _onCardClick(): void {
    if (this._config) moreInfo(this, this._config.entity);
  }

  /** Arm/disarm — the icon and the switch both drive this, optimistically. */
  private _onToggleClick(ev: Event): void {
    ev.stopPropagation();
    const config = this._config;
    const hass = this.hass;
    if (!config || !hass) return;
    const stateObj = hass.states[config.entity];
    if (!stateObj || isUnavailable(stateObj)) return;
    haptic(this);
    const enable = !(this._optimistic ?? stateObj.state === 'on');
    this._optimistic = enable;
    this._optimisticBase = stateObj.last_updated;
    window.clearTimeout(this._optimisticTimer);
    this._optimisticTimer = window.setTimeout(
      () => this._clearOptimistic(),
      OPTIMISTIC_TIMEOUT_MS
    );
    hass.callService('automation', enable ? 'turn_on' : 'turn_off', {
      entity_id: config.entity,
    });
  }

  /** Fire now: automation.trigger + haptic + a brief accent surface wash. */
  private _onRunClick(ev: Event): void {
    ev.stopPropagation();
    const config = this._config;
    const hass = this.hass;
    if (!config || !hass) return;
    const stateObj = hass.states[config.entity];
    if (!stateObj || isUnavailable(stateObj)) return;
    haptic(this);
    this._flash();
    // Optimistic: the run lands as "just now" until the real stamp arrives.
    this._optimisticRunAt = Date.now();
    this._runBase = stateObj.attributes.last_triggered ?? null;
    window.clearTimeout(this._runTimer);
    this._runTimer = window.setTimeout(() => this._clearOptimisticRun(), OPTIMISTIC_TIMEOUT_MS);
    hass.callService('automation', 'trigger', { entity_id: config.entity });
  }

  /** Restart the accent surface wash: remove the class, reflow, re-add. */
  private _flash(): void {
    const el = this.renderRoot.querySelector<HTMLElement>('.flash');
    if (!el) return;
    el.classList.remove('go');
    void el.offsetWidth; // force reflow so the animation restarts
    el.classList.add('go');
  }

  private _lastRunText(stateObj: HassEntity): string {
    if (this._optimisticRunAt !== null) return 'Last run just now';
    const raw = stateObj.attributes.last_triggered;
    const rel = typeof raw === 'string' && raw ? relativeTime(Date.parse(raw)) : null;
    return rel === null ? 'Never run' : `Last run ${rel}`;
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
    const enabled = !unavailable && (this._optimistic ?? stateObj.state === 'on');
    // While an optimistic override is live, present a synthetic state object so
    // the icon glyph agrees with the flipped switch.
    const displayObj: HassEntity =
      this._optimistic === null ? stateObj : { ...stateObj, state: this._optimistic ? 'on' : 'off' };
    const accent = accentFor(displayObj, config.color);
    const name = config.name ?? stateObj.attributes.friendly_name ?? config.entity;

    return html`
      <ha-card
        class="control ${unavailable ? 'unavailable' : ''}"
        style="--silk-accent:${accent}"
        @click=${this._onCardClick}
      >
        <div class="flash"></div>
        <button
          class="icon ${enabled ? 'on' : ''}"
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
          <div class="state">${this._lastRunText(stateObj)}</div>
        </div>
        <div class="trailing">
          <button
            class="run"
            .disabled=${unavailable}
            aria-label=${`Run ${name} now`}
            title="Run now"
            @click=${this._onRunClick}
          >
            <ha-icon icon="mdi:play"></ha-icon>
          </button>
          <button
            class="switch ${enabled ? 'checked' : ''}"
            role="switch"
            aria-checked=${enabled ? 'true' : 'false'}
            aria-label=${`Enable ${name}`}
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
      /* Fire feedback = a brief accent surface wash, never a glow shadow. */
      .flash {
        position: absolute;
        inset: 0;
        background: var(--silk-accent);
        opacity: 0;
        pointer-events: none;
        z-index: 0;
      }
      .flash.go {
        animation: silk-automation-flash 400ms var(--silk-ease-out);
      }
      @keyframes silk-automation-flash {
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
      .run {
        flex: none;
        width: 36px;
        height: 36px;
        border: none;
        border-radius: 12px;
        padding: 0;
        display: grid;
        place-items: center;
        cursor: pointer;
        color: var(--secondary-text-color);
        background: rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.06);
        transition:
          transform 250ms var(--silk-spring),
          background 200ms ease,
          color 200ms ease;
      }
      .run:hover {
        background: rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.12);
      }
      .run:active {
        transform: scale(0.9);
        transition-duration: 120ms;
        transition-timing-function: var(--silk-ease-out);
      }
      .run:focus-visible {
        outline: 2px solid color-mix(in srgb, var(--silk-accent) 70%, transparent);
        outline-offset: 2px;
      }
      .run ha-icon {
        --mdc-icon-size: 20px;
        pointer-events: none;
      }
      /* Compact 40×24 switch — same anatomy as silk-toggle-card's, scaled. */
      .switch {
        flex: none;
        position: relative;
        width: 40px;
        height: 24px;
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
        inset: -8px;
        border-radius: 999px;
      }
      .switch.checked {
        background: var(--silk-accent);
      }
      .switch:focus-visible {
        outline: 2px solid color-mix(in srgb, var(--silk-accent) 70%, transparent);
        outline-offset: 2px;
      }
      .thumb {
        display: block;
        width: 20px;
        height: 20px;
        border-radius: 50%;
        background: var(--card-background-color, #fff);
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
        transform: translateX(0);
        transition: transform 200ms var(--silk-ease-out);
        will-change: transform;
      }
      .switch.checked .thumb {
        transform: translateX(16px);
      }
      .icon:disabled,
      .run:disabled,
      .switch:disabled {
        cursor: default;
      }
      .run:disabled {
        transform: none;
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    'silk-automation-card': SilkAutomationCard;
  }
}
