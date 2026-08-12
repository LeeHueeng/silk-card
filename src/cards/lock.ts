import { LitElement, html, css, nothing, PropertyValues, TemplateResult } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { HomeAssistant, HassEntity, LovelaceCardConfig } from '../types';
import { silkControlStyles } from '../shared/base';
import { isActive, isUnavailable, moreInfo, haptic, stateText } from '../shared/service';
import { accentFor } from '../shared/color';
import { registerEditor } from '../shared/editor';

export const META = {
  type: 'silk-lock-card',
  name: 'Silk Lock',
  description: 'Hold to unlock — no accidental taps.',
};

export interface LockCardConfig extends LovelaceCardConfig {
  entity: string;
  name?: string;
  icon?: string;
  color?: string;
  /** Milliseconds of continuous hold required to unlock (default 1200). */
  hold_time?: number;
  /** When true, unlock is a plain tap — no hold gesture. */
  instant?: boolean;
}

const EDITOR_TAG = 'silk-lock-card-editor';

registerEditor(
  EDITOR_TAG,
  [
    { name: 'entity', required: true, selector: { entity: { domain: ['lock'] } } },
    { name: 'name', selector: { text: {} } },
    { name: 'icon', selector: { icon: {} } },
    { name: 'hold_time', selector: { number: { min: 300, max: 5000, step: 100, mode: 'box' } } },
    { name: 'instant', selector: { boolean: {} } },
  ],
  {
    entity: 'Entity',
    name: 'Name',
    icon: 'Icon',
    hold_time: 'Hold time (ms)',
    instant: 'Instant unlock (tap, no hold)',
  },
  { hold_time: 1200 }
);

const DEFAULT_HOLD_MS = 1200;
const MIN_HOLD_MS = 200;
const OPTIMISTIC_TIMEOUT_MS = 2000;

/**
 * Progress-ring geometry: the SVG overhangs the 42px round button by 5px on
 * every side (52×52), so the ring wraps the button without growing the target.
 * `pathLength` normalizes the circle to 100 → dashoffset = 100 − percent.
 */
const RING_VIEW = 52;
const RING_C = RING_VIEW / 2;
const RING_R = 24;
const RING_UNITS = 100;

@customElement('silk-lock-card')
export class SilkLockCard extends LitElement {
  @property({ attribute: false }) public hass?: HomeAssistant;

  @state() private _config?: LockCardConfig;

  /** Optimistic transitional state ('locking' | 'unlocking'); null = trust HA. */
  @state() private _optimistic: string | null = null;

  /** 0..1 fill of the hold ring, driven by rAF while the pointer is down. */
  @state() private _holdProgress = 0;

  @state() private _holding = false;

  /** last_updated snapshot at call time; any newer stamp clears the override. */
  private _optimisticBase = '';
  private _optimisticTimer?: number;
  private _holdRaf?: number;
  private _holdStart = 0;
  /** Timestamp of a completed hold, so the trailing click doesn't re-fire. */
  private _completedAt = 0;

  public static getStubConfig(hass: HomeAssistant): Partial<LockCardConfig> {
    const entity = Object.keys(hass.states).find((id) => id.startsWith('lock.'));
    return { type: 'custom:silk-lock-card', entity };
  }

  public static async getConfigElement(): Promise<HTMLElement> {
    return document.createElement(EDITOR_TAG);
  }

  public setConfig(config: LockCardConfig): void {
    if (!config.entity) {
      throw new Error('silk-lock-card: `entity` is required');
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
    if (this._holdRaf !== undefined) cancelAnimationFrame(this._holdRaf);
    this._holding = false;
    this._holdProgress = 0;
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

  private _holdMs(): number {
    const t = Number(this._config?.hold_time);
    return Number.isFinite(t) && t > 0 ? Math.max(MIN_HOLD_MS, t) : DEFAULT_HOLD_MS;
  }

  private _displayState(): string | undefined {
    const stateObj = this.hass?.states[this._config?.entity ?? ''];
    if (!stateObj) return undefined;
    return this._optimistic ?? stateObj.state;
  }

  private _callLock(service: 'lock' | 'unlock'): void {
    const config = this._config;
    const hass = this.hass;
    if (!config || !hass) return;
    const stateObj = hass.states[config.entity];
    if (!stateObj) return;
    hass.callService('lock', service, { entity_id: config.entity });
    haptic(this, 'success');
    // Optimistically show the honest transitional state, not the final one —
    // real locks report locking/unlocking before they settle.
    this._optimistic = service === 'lock' ? 'locking' : 'unlocking';
    this._optimisticBase = stateObj.last_updated;
    window.clearTimeout(this._optimisticTimer);
    this._optimisticTimer = window.setTimeout(
      () => this._clearOptimistic(),
      OPTIMISTIC_TIMEOUT_MS
    );
  }

  /**
   * Tap on the action button or the leading icon. Only the safe direction
   * (locking) — or unlocking with `instant: true` — fires on a plain tap;
   * hold-to-unlock is owned by the pointer handlers below.
   */
  private _onTap(ev: Event): void {
    ev.stopPropagation();
    // A completed hold releases into a click on the same button; swallow it.
    if (Date.now() - this._completedAt < 400) return;
    const config = this._config;
    const hass = this.hass;
    if (!config || !hass) return;
    const stateObj = hass.states[config.entity];
    if (!stateObj || isUnavailable(stateObj)) return;
    const action = this._displayState() === 'locked' ? 'unlock' : 'lock';
    if (action === 'unlock' && !config.instant) return;
    this._callLock(action);
  }

  private _onHoldStart(ev: PointerEvent): void {
    ev.stopPropagation();
    const config = this._config;
    const hass = this.hass;
    if (!config || !hass) return;
    const stateObj = hass.states[config.entity];
    if (!stateObj || isUnavailable(stateObj)) return;
    if (this._displayState() !== 'locked' || config.instant) return;
    try {
      (ev.currentTarget as Element).setPointerCapture(ev.pointerId);
    } catch {
      /* pointer may already be gone; the rAF loop still self-cancels */
    }
    this._holding = true;
    this._holdStart = performance.now();
    if (this._holdRaf !== undefined) cancelAnimationFrame(this._holdRaf);
    this._holdRaf = requestAnimationFrame(this._holdTick);
  }

  private _holdTick = (): void => {
    if (!this._holding) return;
    const progress = (performance.now() - this._holdStart) / this._holdMs();
    if (progress >= 1) {
      this._holding = false;
      this._holdProgress = 0; // the optimistic flip unmounts the ring anyway
      this._completedAt = Date.now();
      this._callLock('unlock');
      return;
    }
    this._holdProgress = progress;
    this._holdRaf = requestAnimationFrame(this._holdTick);
  };

  private _onHoldEnd(ev: PointerEvent): void {
    ev.stopPropagation();
    if (!this._holding) return;
    this._holding = false;
    if (this._holdRaf !== undefined) cancelAnimationFrame(this._holdRaf);
    this._holdRaf = undefined;
    this._holdProgress = 0; // CSS drains the ring over 150ms
  }

  private _onCardClick(): void {
    if (this._config) moreInfo(this, this._config.entity);
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
    const displayObj: HassEntity =
      this._optimistic === null ? stateObj : { ...stateObj, state: this._optimistic };
    const active = isActive(displayObj); // anything but locked lights the icon
    // Jammed is a fault, not a lock state — force the error accent locally.
    const accent =
      stateObj.state === 'jammed'
        ? 'var(--error-color, #db4437)'
        : accentFor(displayObj, config.color);
    const name = config.name ?? stateObj.attributes.friendly_name ?? config.entity;
    const action = displayObj.state === 'locked' ? 'unlock' : 'lock';
    const holdRequired = action === 'unlock' && !config.instant && !unavailable;
    const buttonIcon = action === 'lock' ? 'mdi:lock' : 'mdi:lock-open-variant-outline';
    const buttonLabel =
      action === 'lock'
        ? `Lock ${name}`
        : holdRequired
          ? `Hold to unlock ${name}`
          : `Unlock ${name}`;
    const dashoffset = (RING_UNITS * (1 - this._holdProgress)).toFixed(2);

    return html`
      <ha-card
        class="control ${unavailable ? 'unavailable' : ''}"
        style="--silk-accent:${accent}"
        @click=${this._onCardClick}
      >
        <button
          class="icon ${active ? 'on' : ''}"
          .disabled=${unavailable}
          aria-label=${buttonLabel}
          @click=${this._onTap}
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
            class="action ${this._holding ? 'holding' : ''}"
            .disabled=${unavailable}
            aria-label=${buttonLabel}
            @click=${this._onTap}
            @pointerdown=${this._onHoldStart}
            @pointerup=${this._onHoldEnd}
            @pointercancel=${this._onHoldEnd}
            @contextmenu=${(ev: Event) => ev.preventDefault()}
          >
            ${holdRequired
              ? html`
                  <svg
                    class="ring"
                    viewBox="0 0 ${RING_VIEW} ${RING_VIEW}"
                    aria-hidden="true"
                  >
                    <circle class="ring-track" cx=${RING_C} cy=${RING_C} r=${RING_R}></circle>
                    <circle
                      class="ring-fill"
                      cx=${RING_C}
                      cy=${RING_C}
                      r=${RING_R}
                      pathLength=${RING_UNITS}
                      stroke-dasharray=${RING_UNITS}
                      style="stroke-dashoffset:${dashoffset};opacity:${this._holdProgress > 0
                        ? 1
                        : 0}"
                    ></circle>
                  </svg>
                `
              : nothing}
            <ha-icon .icon=${buttonIcon}></ha-icon>
          </button>
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
      .action {
        flex: none;
        position: relative;
        width: 42px;
        height: 42px;
        border: none;
        border-radius: 50%;
        padding: 0;
        display: grid;
        place-items: center;
        cursor: pointer;
        color: var(--silk-accent);
        background: color-mix(in srgb, var(--silk-accent) 16%, transparent);
        transition:
          transform 250ms var(--silk-spring),
          background 200ms ease,
          color 200ms ease;
        touch-action: none;
        user-select: none;
        -webkit-user-select: none;
        -webkit-touch-callout: none;
        -webkit-tap-highlight-color: transparent;
      }
      .action:active {
        transform: scale(0.92);
        transition-duration: 120ms;
        transition-timing-function: var(--silk-ease-out);
      }
      .action:disabled {
        cursor: default;
      }
      .action:focus-visible {
        outline: 2px solid color-mix(in srgb, var(--silk-accent) 70%, transparent);
        outline-offset: 4px;
      }
      .action ha-icon {
        --mdc-icon-size: 20px;
        pointer-events: none;
      }
      .ring {
        position: absolute;
        inset: -5px;
        width: ${RING_VIEW}px;
        height: ${RING_VIEW}px;
        pointer-events: none;
        overflow: visible;
      }
      .ring-track {
        fill: none;
        stroke: rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.12);
        stroke-width: 2.5;
      }
      .ring-fill {
        fill: none;
        stroke: var(--silk-accent);
        stroke-width: 2.5;
        stroke-linecap: round;
        transform: rotate(-90deg);
        transform-origin: 50% 50%;
        transition:
          stroke-dashoffset 150ms ease,
          opacity 150ms ease;
      }
      /* While the rAF loop drives the fill, CSS must not fight it. */
      .action.holding .ring-fill {
        transition: opacity 150ms ease;
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    'silk-lock-card': SilkLockCard;
  }
}
