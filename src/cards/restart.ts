import { LitElement, html, css, nothing, TemplateResult } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { HomeAssistant, LovelaceCardConfig } from '../types';
import { silkControlStyles } from '../shared/base';
import { haptic } from '../shared/service';
import { accentFor } from '../shared/color';
import { registerEditor } from '../shared/editor';

export const META = {
  type: 'silk-restart-card',
  name: 'Silk Restart',
  description: 'The maintenance buttons, safely.',
};

export interface SilkRestartAction {
  name: string;
  /** `domain.service`, e.g. `homeassistant.restart`. */
  service: string;
  /** Requires a deliberate hold plus a confirm before it fires. */
  danger?: boolean;
  icon?: string;
  /** Extra service data. */
  data?: Record<string, unknown>;
}

export interface SilkRestartCardConfig extends LovelaceCardConfig {
  /** Tiles to show. YAML-only — it is a list of objects. */
  actions?: SilkRestartAction[];
  name?: string;
  /** Accent override. */
  color?: string;
}

const DEFAULT_NAME = 'Maintenance';

const DEFAULT_ACTIONS: SilkRestartAction[] = [
  { name: 'Reload YAML', service: 'homeassistant.reload_all' },
  { name: 'Restart HA', service: 'homeassistant.restart', danger: true },
  { name: 'Check config', service: 'homeassistant.check_config' },
];

/** Milliseconds of continuous hold a danger tile demands. */
const HOLD_MS = 1200;
/** How long a fired tile reads 'Sent' — and the whole card stays locked. */
const SENT_MS = 3000;

/**
 * Hold-ring geometry: the SVG overhangs the 38px icon circle by 5px on every
 * side (48×48), so the ring wraps the icon without growing the target.
 * `pathLength` normalizes the circle to 100 → dashoffset = 100 − percent.
 */
const RING_VIEW = 48;
const RING_C = RING_VIEW / 2;
const RING_R = 22;
const RING_UNITS = 100;

/** Icon guessed from what the service actually does. */
function iconFor(service: string): string {
  const name = service.split('.')[1] ?? '';
  if (name.startsWith('reload')) return 'mdi:refresh';
  if (name.startsWith('restart')) return 'mdi:restart';
  if (name.startsWith('check')) return 'mdi:clipboard-check-outline';
  if (name.startsWith('stop') || name.startsWith('shutdown')) return 'mdi:power';
  if (name.startsWith('update')) return 'mdi:download';
  return 'mdi:cog-outline';
}

const EDITOR_TAG = 'silk-restart-card-editor';

// `actions` stays YAML-only (a list of objects, one of them destructive);
// the editor covers the header text.
registerEditor(EDITOR_TAG, [{ name: 'name', selector: { text: {} } }], { name: 'Name' });

/**
 * The maintenance buttons you would otherwise hunt for in Developer Tools —
 * with the destructive one behind a hold and a confirm, and the whole card
 * locked for three seconds after anything fires.
 */
@customElement('silk-restart-card')
export class SilkRestartCard extends LitElement {
  @property({ attribute: false }) public hass?: HomeAssistant;

  @state() private _config?: SilkRestartCardConfig;
  /** Index of the tile that just fired, or null. */
  @state() private _sent: number | null = null;
  /** Every tile is inert while a call is settling. */
  @state() private _locked = false;
  /** Index of the tile being held, or null. */
  @state() private _holdIndex: number | null = null;
  /** 0..1 fill of the hold ring, driven by rAF while the pointer is down. */
  @state() private _holdProgress = 0;

  private _sentTimer?: number;
  private _holdRaf?: number;
  private _holdStart = 0;
  /** Timestamp of a completed hold, so the trailing click doesn't re-fire. */
  private _completedAt = 0;

  public static getStubConfig(): Partial<SilkRestartCardConfig> {
    // No entity required — the tiles call services directly.
    return { type: 'custom:silk-restart-card' };
  }

  public static async getConfigElement(): Promise<HTMLElement> {
    return document.createElement(EDITOR_TAG);
  }

  public setConfig(config: SilkRestartCardConfig): void {
    if (config.actions !== undefined) {
      if (!Array.isArray(config.actions) || config.actions.length === 0) {
        throw new Error(
          'silk-restart-card: `actions` must be a list of {name, service, danger?, icon?}'
        );
      }
      for (const action of config.actions) {
        if (!action || typeof action !== 'object' || typeof action.service !== 'string') {
          throw new Error('silk-restart-card: every action needs a `service`');
        }
        const [domain, service] = action.service.split('.');
        if (!domain || !service) {
          throw new Error(
            `silk-restart-card: \`service\` must look like \`domain.service\`, got \`${action.service}\``
          );
        }
        if (typeof action.name !== 'string' || !action.name.trim()) {
          throw new Error(`silk-restart-card: action \`${action.service}\` needs a \`name\``);
        }
      }
    }
    this._config = config;
    this._reset();
  }

  public getCardSize(): number {
    return 2;
  }

  public getGridOptions(): Record<string, number> {
    return { columns: 6, rows: 2, min_columns: 4, min_rows: 2 };
  }

  public disconnectedCallback(): void {
    super.disconnectedCallback();
    window.clearTimeout(this._sentTimer);
    this._sentTimer = undefined;
    if (this._holdRaf !== undefined) cancelAnimationFrame(this._holdRaf);
    this._holdRaf = undefined;
    this._holdIndex = null;
    this._holdProgress = 0;
  }

  private _reset(): void {
    window.clearTimeout(this._sentTimer);
    this._sentTimer = undefined;
    this._sent = null;
    this._locked = false;
    this._holdIndex = null;
    this._holdProgress = 0;
  }

  private _actions(): SilkRestartAction[] {
    return this._config?.actions ?? DEFAULT_ACTIONS;
  }

  /** Fire the call, then lock the card and mark the tile for three seconds. */
  private _fire(index: number): void {
    const hass = this.hass;
    const action = this._actions()[index];
    if (!hass || !action || this._locked) return;
    const [domain, service] = action.service.split('.');
    if (!domain || !service) return;
    haptic(this, action.danger ? 'warning' : 'success');
    hass.callService(domain, service, { ...(action.data ?? {}) });
    this._sent = index;
    this._locked = true;
    window.clearTimeout(this._sentTimer);
    this._sentTimer = window.setTimeout(() => {
      this._sentTimer = undefined;
      this._sent = null;
      this._locked = false;
    }, SENT_MS);
  }

  private _confirmAndFire(index: number): void {
    const action = this._actions()[index];
    if (!action) return;
    if (!window.confirm(`Run "${action.name}" now? This affects the whole system.`)) return;
    this._fire(index);
  }

  /**
   * Tap. Plain tiles fire straight away; danger tiles belong to the pointer
   * handlers below, so a tap on one deliberately does nothing.
   */
  private _onTap(ev: Event, index: number): void {
    ev.stopPropagation();
    // A completed hold releases into a click on the same tile; swallow it.
    if (Date.now() - this._completedAt < 400) return;
    if (this._locked) return;
    const action = this._actions()[index];
    if (!action || action.danger) return;
    this._fire(index);
  }

  /** Keyboard has no hold gesture, so a danger tile falls back to the confirm. */
  private _onKeydown(ev: KeyboardEvent, index: number): void {
    if (ev.repeat || (ev.key !== 'Enter' && ev.key !== ' ')) return;
    ev.preventDefault();
    ev.stopPropagation();
    if (this._locked) return;
    const action = this._actions()[index];
    if (!action) return;
    if (action.danger) this._confirmAndFire(index);
    else this._fire(index);
  }

  private _onHoldStart(ev: PointerEvent, index: number): void {
    ev.stopPropagation();
    if (this._locked) return;
    const action = this._actions()[index];
    if (!action?.danger) return;
    try {
      (ev.currentTarget as Element).setPointerCapture(ev.pointerId);
    } catch {
      /* pointer may already be gone; the rAF loop still self-cancels */
    }
    this._holdIndex = index;
    this._holdStart = performance.now();
    if (this._holdRaf !== undefined) cancelAnimationFrame(this._holdRaf);
    this._holdRaf = requestAnimationFrame(this._holdTick);
  }

  private _holdTick = (): void => {
    const index = this._holdIndex;
    if (index === null) return;
    const progress = (performance.now() - this._holdStart) / HOLD_MS;
    if (progress >= 1) {
      this._holdIndex = null;
      this._holdProgress = 0;
      this._holdRaf = undefined;
      this._completedAt = Date.now();
      this._confirmAndFire(index);
      return;
    }
    this._holdProgress = progress;
    this._holdRaf = requestAnimationFrame(this._holdTick);
  };

  private _onHoldEnd(ev: PointerEvent): void {
    ev.stopPropagation();
    if (this._holdIndex === null) return;
    this._holdIndex = null;
    if (this._holdRaf !== undefined) cancelAnimationFrame(this._holdRaf);
    this._holdRaf = undefined;
    this._holdProgress = 0; // CSS drains the ring over 150ms
  }

  private _renderTile(action: SilkRestartAction, index: number): TemplateResult {
    const sent = this._sent === index;
    const danger = action.danger === true;
    const holding = this._holdIndex === index;
    const progress = holding ? this._holdProgress : 0;
    const dashoffset = (RING_UNITS * (1 - progress)).toFixed(2);
    const label = danger ? `${action.name} — hold to run` : action.name;
    return html`
      <button
        class="tile ${danger ? 'danger' : ''} ${sent ? 'sent' : ''} ${holding ? 'holding' : ''}"
        aria-label=${label}
        title=${sent ? `${action.name} sent` : label}
        .disabled=${this._locked}
        @click=${(ev: Event) => this._onTap(ev, index)}
        @keydown=${(ev: KeyboardEvent) => this._onKeydown(ev, index)}
        @pointerdown=${(ev: PointerEvent) => this._onHoldStart(ev, index)}
        @pointerup=${this._onHoldEnd}
        @pointercancel=${this._onHoldEnd}
        @contextmenu=${(ev: Event) => ev.preventDefault()}
      >
        <span class="ico">
          ${danger && !sent
            ? html`
                <svg class="ring" viewBox="0 0 ${RING_VIEW} ${RING_VIEW}" aria-hidden="true">
                  <circle class="ring-track" cx=${RING_C} cy=${RING_C} r=${RING_R}></circle>
                  <circle
                    class="ring-fill"
                    cx=${RING_C}
                    cy=${RING_C}
                    r=${RING_R}
                    pathLength=${RING_UNITS}
                    stroke-dasharray=${RING_UNITS}
                    style="stroke-dashoffset:${dashoffset};opacity:${progress > 0 ? 1 : 0}"
                  ></circle>
                </svg>
              `
            : nothing}
          <ha-icon .icon=${sent ? 'mdi:check' : (action.icon ?? iconFor(action.service))}></ha-icon>
        </span>
        <span class="label">${sent ? 'Sent' : action.name}</span>
      </button>
    `;
  }

  protected render(): TemplateResult | typeof nothing {
    const config = this._config;
    if (!config || !this.hass) return nothing;
    const actions = this._actions();

    return html`
      <ha-card class="control" style="--silk-accent:${accentFor(undefined, config.color)}">
        <div class="header">
          <div class="hname">${config.name ?? DEFAULT_NAME}</div>
        </div>
        <div class="tiles">${actions.map((action, i) => this._renderTile(action, i))}</div>
      </ha-card>
    `;
  }

  static styles = [
    silkControlStyles,
    css`
      ha-card {
        flex-direction: column;
        align-items: stretch;
        justify-content: center;
        gap: 8px;
        padding: 12px 14px;
        cursor: default;
      }
      .header {
        flex: none;
        display: flex;
        align-items: center;
        min-height: 18px;
      }
      .hname {
        flex: 1;
        min-width: 0;
        font-size: 13px;
        font-weight: 600;
        color: var(--secondary-text-color);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .tiles {
        flex: none;
        display: flex;
        align-items: stretch;
        gap: 8px;
        min-width: 0;
      }
      .tile {
        flex: 1 1 0;
        min-width: 0;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 6px;
        margin: 0;
        padding: 6px 4px;
        border: none;
        border-radius: 14px;
        background: none;
        font: inherit;
        color: inherit;
        cursor: pointer;
        outline: none;
        transition:
          transform 250ms var(--silk-spring),
          opacity 200ms ease;
        /* Only the hold tiles claim the gesture; plain ones still scroll. */
        touch-action: manipulation;
        user-select: none;
        -webkit-user-select: none;
        -webkit-touch-callout: none;
        -webkit-tap-highlight-color: transparent;
      }
      .tile.danger {
        touch-action: none;
      }
      .tile:active {
        transform: scale(0.95);
        transition-duration: 120ms;
        transition-timing-function: var(--silk-ease-out);
      }
      .tile:disabled {
        cursor: default;
      }
      /* Locked after a call: everything dims except the tile that just fired. */
      .tile:disabled:not(.sent) {
        opacity: 0.4;
      }
      .tile:disabled:active {
        transform: none;
      }
      .tile:focus-visible .ico {
        box-shadow: 0 0 0 2px color-mix(in srgb, var(--silk-accent) 70%, transparent);
      }
      .ico {
        position: relative;
        flex: none;
        display: grid;
        place-items: center;
        width: 38px;
        height: 38px;
        border-radius: 50%;
        color: var(--secondary-text-color);
        background: rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.06);
        transition:
          background 200ms ease,
          color 200ms ease,
          box-shadow 150ms ease;
      }
      .tile:hover:not(:disabled) .ico {
        color: var(--silk-accent);
        background: color-mix(in srgb, var(--silk-accent) 16%, transparent);
      }
      /* Danger reads as surface, and it is real status: this one can hurt. */
      .tile.danger .ico {
        color: var(--error-color, #db4437);
        background: color-mix(in srgb, var(--error-color, #db4437) 14%, transparent);
      }
      .tile.danger:hover:not(:disabled) .ico {
        color: var(--error-color, #db4437);
        background: color-mix(in srgb, var(--error-color, #db4437) 22%, transparent);
      }
      .tile.sent .ico,
      .tile.sent:hover .ico {
        color: var(--silk-accent);
        background: color-mix(in srgb, var(--silk-accent) 20%, transparent);
      }
      .ico ha-icon {
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
        stroke: var(--error-color, #db4437);
        stroke-width: 2.5;
        stroke-linecap: round;
        transform: rotate(-90deg);
        transform-origin: 50% 50%;
        transition:
          stroke-dashoffset 150ms ease,
          opacity 150ms ease;
      }
      /* While the rAF loop drives the fill, CSS must not fight it. */
      .tile.holding .ring-fill {
        transition: opacity 150ms ease;
      }
      .label {
        max-width: 100%;
        font-size: 11.5px;
        font-weight: 500;
        line-height: 1.2;
        color: var(--primary-text-color);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .tile.sent .label {
        color: var(--silk-accent);
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    'silk-restart-card': SilkRestartCard;
  }
}
