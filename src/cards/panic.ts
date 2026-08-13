import { LitElement, html, css, nothing, TemplateResult } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { HomeAssistant, LovelaceCardConfig } from '../types';
import { silkControlStyles } from '../shared/base';
import { haptic } from '../shared/service';
import { registerEditor } from '../shared/editor';

export const META = {
  type: 'silk-panic-card',
  name: 'Silk Panic',
  description: 'The one button you hope to never press.',
};

/** One emergency action. `service` is a plain `domain.service` pair. */
export interface SilkPanicAction {
  name: string;
  icon?: string;
  service: string;
  data?: Record<string, unknown>;
  /** Emergency severity — the only place Silk uses status color as accent. */
  color?: 'error' | 'warning';
}

export interface SilkPanicCardConfig extends LovelaceCardConfig {
  actions: SilkPanicAction[];
  /** Milliseconds of continuous hold required to fire. Default 1500. */
  hold_time?: number;
  name?: string;
}

/** The transient line under a tile: why it is saying something right now. */
interface TileNote {
  index: number;
  text: string;
  kind: 'hint' | 'sent' | 'failed';
}

const DEFAULT_HOLD_MS = 1500;
const MIN_HOLD_MS = 400;
const MAX_HOLD_MS = 6000;
const MAX_ACTIONS = 4;
const SENT_MS = 3000;
const HINT_MS = 2200;
const DEFAULT_ICON = 'mdi:alert-octagon';
const SERVICE_RE = /^[a-z0-9_]+\.[a-z0-9_]+$/;

/**
 * Ring geometry: the SVG overhangs the 64px tile by 5px on every side (74×74),
 * and the rounded rect is inset 1.5 units so its 3px stroke sits just outside
 * the tile. `pathLength` normalizes the outline to 100 → dashoffset = 100 − %.
 */
const RING_VIEW = 74;
const RING_INSET = 1.5;
const RING_SIDE = RING_VIEW - RING_INSET * 2;
const RING_RADIUS = 19.5;
const RING_UNITS = 100;

const EDITOR_TAG = 'silk-panic-card-editor';

// Actions stay YAML-only: each is a service call with free-form data, which no
// generic ha-form schema models honestly.
registerEditor(
  EDITOR_TAG,
  [
    { name: 'name', selector: { text: {} } },
    {
      name: 'hold_time',
      selector: { number: { min: MIN_HOLD_MS, max: MAX_HOLD_MS, step: 100, mode: 'box' } },
    },
  ],
  { name: 'Name', hold_time: 'Hold time (ms)' },
  { hold_time: DEFAULT_HOLD_MS }
);

/**
 * Four tiles, at most, that each need a deliberate hold. Nothing here opens a
 * dialog, nothing here toggles: the card exists so that a panicked hand can
 * find one target, and a careless hand cannot fire it.
 */
@customElement('silk-panic-card')
export class SilkPanicCard extends LitElement {
  @property({ attribute: false }) public hass?: HomeAssistant;

  @state() private _config?: SilkPanicCardConfig;
  /** Index of the tile being held; null when nothing is under a finger. */
  @state() private _holdIndex: number | null = null;
  /** 0..1 fill of the hold ring, driven by rAF while the pointer is down. */
  @state() private _holdProgress = 0;
  @state() private _note: TileNote | null = null;

  private _actions: SilkPanicAction[] = [];
  private _holdRaf?: number;
  private _holdStart = 0;
  private _noteTimer?: number;

  public static getStubConfig(hass: HomeAssistant): Partial<SilkPanicCardConfig> {
    const ids = Object.keys(hass.states);
    const alarm = ids.find((id) => id.startsWith('alarm_control_panel.'));
    if (alarm) {
      return {
        type: 'custom:silk-panic-card',
        actions: [
          {
            name: 'Sound alarm',
            icon: 'mdi:bell-ring',
            service: 'alarm_control_panel.alarm_trigger',
            data: { entity_id: alarm },
            color: 'error',
          },
        ],
      };
    }
    // Always-available fallback: a notification nobody can miss.
    return {
      type: 'custom:silk-panic-card',
      actions: [
        {
          name: 'Alert everyone',
          icon: 'mdi:bell-ring',
          service: 'persistent_notification.create',
          data: { title: 'Panic', message: 'The panic button was pressed.' },
          color: 'error',
        },
      ],
    };
  }

  public static async getConfigElement(): Promise<HTMLElement> {
    return document.createElement(EDITOR_TAG);
  }

  public setConfig(config: SilkPanicCardConfig): void {
    if (!Array.isArray(config.actions) || config.actions.length === 0) {
      throw new Error(
        'silk-panic-card: `actions` is required — 1 to 4 entries of {name, icon, service}'
      );
    }
    if (config.actions.length > MAX_ACTIONS) {
      throw new Error(`silk-panic-card: at most ${MAX_ACTIONS} actions fit on one card`);
    }
    for (const action of config.actions) {
      if (!action || typeof action.name !== 'string' || !action.name) {
        throw new Error('silk-panic-card: every action needs a `name`');
      }
      if (typeof action.service !== 'string' || !SERVICE_RE.test(action.service)) {
        throw new Error(
          `silk-panic-card: \`${String(action?.service)}\` is not a \`domain.service\` pair`
        );
      }
      if (action.data !== undefined && (typeof action.data !== 'object' || Array.isArray(action.data))) {
        throw new Error(`silk-panic-card: \`data\` for "${action.name}" must be a mapping`);
      }
      if (action.color !== undefined && action.color !== 'error' && action.color !== 'warning') {
        throw new Error(`silk-panic-card: \`color\` for "${action.name}" must be error or warning`);
      }
    }
    if (config.hold_time !== undefined && !(Number(config.hold_time) > 0)) {
      throw new Error('silk-panic-card: `hold_time` must be a positive number of milliseconds');
    }
    this._actions = config.actions;
    this._config = config;
    this._cancelHold();
    this._clearNote();
  }

  public getCardSize(): number {
    return 3;
  }

  public getGridOptions(): Record<string, number> {
    return { columns: 6, rows: 3, min_columns: 4, min_rows: 2 };
  }

  public disconnectedCallback(): void {
    super.disconnectedCallback();
    this._cancelHold();
    window.clearTimeout(this._noteTimer);
    this._noteTimer = undefined;
  }

  private _holdMs(): number {
    const raw = Number(this._config?.hold_time);
    if (!Number.isFinite(raw) || raw <= 0) return DEFAULT_HOLD_MS;
    return Math.min(Math.max(raw, MIN_HOLD_MS), MAX_HOLD_MS);
  }

  /** Entities the action targets, so an unavailable target can disable it. */
  private _targets(action: SilkPanicAction): string[] {
    const raw = action.data?.entity_id;
    if (typeof raw === 'string') {
      return raw
        .split(',')
        .map((id) => id.trim())
        .filter((id) => id.includes('.'));
    }
    if (Array.isArray(raw)) {
      return raw.filter((id): id is string => typeof id === 'string' && id.includes('.'));
    }
    return [];
  }

  /** Dead = every named target is missing or unavailable. */
  private _isDead(action: SilkPanicAction): boolean {
    const hass = this.hass;
    if (!hass) return true;
    const targets = this._targets(action);
    if (!targets.length) return false; // no entity named — nothing to verify
    return targets.every((id) => {
      const stateObj = hass.states[id];
      return !stateObj || stateObj.state === 'unavailable';
    });
  }

  private _clearNote(): void {
    window.clearTimeout(this._noteTimer);
    this._noteTimer = undefined;
    this._note = null;
  }

  private _setNote(note: TileNote, ms: number): void {
    window.clearTimeout(this._noteTimer);
    this._note = note;
    this._noteTimer = window.setTimeout(() => {
      this._noteTimer = undefined;
      this._note = null;
    }, ms);
  }

  private _cancelHold(): void {
    if (this._holdRaf !== undefined) cancelAnimationFrame(this._holdRaf);
    this._holdRaf = undefined;
    this._holdIndex = null;
    this._holdProgress = 0;
  }

  private _startHold(index: number): void {
    const action = this._actions[index];
    if (!action || !this.hass || this._isDead(action)) return;
    if (this._holdIndex !== null) return; // one finger, one tile
    this._clearNote();
    this._holdIndex = index;
    this._holdProgress = 0;
    this._holdStart = performance.now();
    // A warning buzz at the *start* of the hold: the house is about to shout.
    haptic(this, 'warning');
    if (this._holdRaf !== undefined) cancelAnimationFrame(this._holdRaf);
    this._holdRaf = requestAnimationFrame(this._holdTick);
  }

  private _holdTick = (): void => {
    const index = this._holdIndex;
    if (index === null) return;
    const progress = (performance.now() - this._holdStart) / this._holdMs();
    if (progress >= 1) {
      this._cancelHold();
      this._fire(index);
      return;
    }
    this._holdProgress = progress;
    this._holdRaf = requestAnimationFrame(this._holdTick);
  };

  private _endHold(index: number): void {
    if (this._holdIndex !== index) return;
    this._cancelHold();
    // Let go too early — say what the tile wanted instead of firing it.
    this._setNote({ index, text: 'Hold to activate', kind: 'hint' }, HINT_MS);
  }

  private _fire(index: number): void {
    const action = this._actions[index];
    const hass = this.hass;
    if (!action || !hass) return;
    const [domain, service] = action.service.split('.');
    haptic(this, 'success');
    this._setNote({ index, text: 'Sent', kind: 'sent' }, SENT_MS);
    this._flash(index);
    Promise.resolve(hass.callService(domain, service, { ...(action.data ?? {}) })).catch((err) => {
      console.warn('silk-panic-card: service call failed', action.service, err);
      this._setNote({ index, text: 'Failed', kind: 'failed' }, SENT_MS);
    });
  }

  /** Restart the accent surface wash: remove the class, reflow, re-add. */
  private _flash(index: number): void {
    const el = this.renderRoot.querySelector<HTMLElement>(`.tile[data-index="${index}"] .flash`);
    if (!el) return;
    el.classList.remove('go');
    void el.offsetWidth; // force reflow so the animation restarts
    el.classList.add('go');
  }

  private _onPointerDown(ev: PointerEvent, index: number): void {
    ev.stopPropagation();
    try {
      (ev.currentTarget as Element).setPointerCapture(ev.pointerId);
    } catch {
      /* pointer may already be gone; the rAF loop still self-cancels */
    }
    this._startHold(index);
  }

  private _onPointerUp(ev: PointerEvent, index: number): void {
    ev.stopPropagation();
    this._endHold(index);
  }

  private _onKeyDown(ev: KeyboardEvent, index: number): void {
    if (ev.repeat || (ev.key !== 'Enter' && ev.key !== ' ')) return;
    ev.stopPropagation();
    ev.preventDefault(); // Space must not scroll the dashboard mid-hold
    this._startHold(index);
  }

  private _onKeyUp(ev: KeyboardEvent, index: number): void {
    if (ev.key !== 'Enter' && ev.key !== ' ') return;
    ev.stopPropagation();
    this._endHold(index);
  }

  private _renderTile(action: SilkPanicAction, index: number): TemplateResult {
    const dead = this._isDead(action);
    const holding = this._holdIndex === index;
    const note = this._note?.index === index ? this._note : null;
    const label = dead ? 'Unavailable' : (note?.text ?? 'Hold to activate');
    const visible = dead || note !== null;
    const dashoffset = (RING_UNITS * (1 - (holding ? this._holdProgress : 0))).toFixed(2);
    const aria = `${action.name} — hold to activate`;

    return html`
      <div class="cell ${dead ? 'na' : ''}">
        <button
          class="tile ${holding ? 'holding' : ''}"
          data-index=${index}
          style=${action.color === 'warning'
            ? '--silk-accent: var(--warning-color, #e6a23c)'
            : ''}
          .disabled=${dead}
          aria-label=${aria}
          title=${aria}
          @pointerdown=${(ev: PointerEvent) => this._onPointerDown(ev, index)}
          @pointerup=${(ev: PointerEvent) => this._onPointerUp(ev, index)}
          @pointercancel=${(ev: PointerEvent) => this._onPointerUp(ev, index)}
          @keydown=${(ev: KeyboardEvent) => this._onKeyDown(ev, index)}
          @keyup=${(ev: KeyboardEvent) => this._onKeyUp(ev, index)}
          @contextmenu=${(ev: Event) => ev.preventDefault()}
        >
          <span class="flash"></span>
          <svg class="ring" viewBox="0 0 ${RING_VIEW} ${RING_VIEW}" aria-hidden="true">
            <rect
              class="ring-track"
              x=${RING_INSET}
              y=${RING_INSET}
              width=${RING_SIDE}
              height=${RING_SIDE}
              rx=${RING_RADIUS}
            ></rect>
            <rect
              class="ring-fill"
              x=${RING_INSET}
              y=${RING_INSET}
              width=${RING_SIDE}
              height=${RING_SIDE}
              rx=${RING_RADIUS}
              pathLength=${RING_UNITS}
              stroke-dasharray=${RING_UNITS}
              style="stroke-dashoffset:${dashoffset};opacity:${holding && this._holdProgress > 0
                ? 1
                : 0}"
            ></rect>
          </svg>
          <ha-icon .icon=${action.icon ?? DEFAULT_ICON}></ha-icon>
        </button>
        <span class="tname" title=${action.name}>${action.name}</span>
        <span class="hint ${visible ? 'show' : ''} ${note?.kind === 'sent' ? 'chip active' : 'chip'}"
          >${label}</span
        >
      </div>
    `;
  }

  protected render(): TemplateResult | typeof nothing {
    const config = this._config;
    if (!config) return nothing;

    return html`
      <ha-card class="control" style="--silk-accent:var(--error-color, #db4437)">
        ${config.name ? html`<div class="hname" title=${config.name}>${config.name}</div>` : nothing}
        <div class="tiles">${this._actions.map((action, i) => this._renderTile(action, i))}</div>
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
        gap: 10px;
        padding: 12px 14px;
        cursor: default;
      }
      .hname {
        flex: none;
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
        flex-wrap: wrap;
        align-items: flex-start;
        justify-content: center;
        gap: 14px 16px;
      }
      .cell {
        flex: none;
        width: 88px;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 6px;
        min-width: 0;
      }
      .tile {
        position: relative;
        width: 64px;
        height: 64px;
        border: none;
        border-radius: 16px;
        padding: 0;
        display: grid;
        place-items: center;
        cursor: pointer;
        color: var(--silk-accent);
        background: color-mix(in srgb, var(--silk-accent) 14%, transparent);
        overflow: visible;
        touch-action: none;
        user-select: none;
        -webkit-user-select: none;
        -webkit-touch-callout: none;
        -webkit-tap-highlight-color: transparent;
        transition:
          transform 250ms var(--silk-spring),
          background 200ms ease;
      }
      .tile:active {
        transform: scale(0.94);
        transition-duration: 120ms;
        transition-timing-function: var(--silk-ease-out);
      }
      /* A held tile sinks and stays there until it fires or is released. */
      .tile.holding {
        transform: scale(0.94);
        background: color-mix(in srgb, var(--silk-accent) 22%, transparent);
      }
      .tile:focus-visible {
        outline: 2px solid color-mix(in srgb, var(--silk-accent) 70%, transparent);
        outline-offset: 4px;
      }
      .tile:disabled {
        cursor: default;
        opacity: 0.45;
      }
      .tile:disabled:active {
        transform: none;
      }
      .tile ha-icon {
        --mdc-icon-size: 30px;
        position: relative;
        z-index: 1;
        pointer-events: none;
      }
      /* Success feedback = a brief accent surface wash, never a glow shadow. */
      .flash {
        position: absolute;
        inset: 0;
        border-radius: 16px;
        background: var(--silk-accent);
        opacity: 0;
        pointer-events: none;
      }
      .flash.go {
        animation: silk-panic-flash 400ms var(--silk-ease-out);
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
        stroke: rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.1);
        stroke-width: 3;
      }
      .ring-fill {
        fill: none;
        stroke: var(--silk-accent);
        stroke-width: 3;
        stroke-linecap: round;
        transition:
          stroke-dashoffset 150ms ease,
          opacity 150ms ease;
      }
      /* While the rAF loop drives the fill, CSS must not fight it. */
      .tile.holding .ring-fill {
        transition: opacity 150ms ease;
      }
      .tname {
        max-width: 100%;
        font-size: 12.5px;
        font-weight: 500;
        line-height: 1.3;
        color: var(--primary-text-color);
        text-align: center;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      /* The hint keeps its slot at all times, so nothing shifts when it speaks. */
      .hint {
        max-width: 100%;
        cursor: default;
        pointer-events: none;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        opacity: 0;
        transform: translateY(-2px);
        transition:
          opacity 200ms var(--silk-ease-out),
          transform 200ms var(--silk-ease-out);
      }
      .hint.show {
        opacity: 1;
        transform: translateY(0);
      }
      /* A dead target dims its whole cell, chip included. */
      .cell.na .tname {
        opacity: 0.45;
      }
      .cell.na .hint.show {
        opacity: 0.6;
      }
      @keyframes silk-panic-flash {
        0% {
          opacity: 0;
        }
        35% {
          opacity: 0.22;
        }
        100% {
          opacity: 0;
        }
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    'silk-panic-card': SilkPanicCard;
  }
}
