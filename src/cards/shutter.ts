import { LitElement, html, css, nothing, PropertyValues, TemplateResult } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { HomeAssistant, HassEntity, LovelaceCardConfig } from '../types';
import { silkControlStyles } from '../shared/base';
import {
  domainOf,
  isUnavailable,
  toggleEntity,
  moreInfo,
  haptic,
  stateText,
  supportsFeature,
  clamp,
} from '../shared/service';
import { accentFor } from '../shared/color';
import { registerEditor } from '../shared/editor';

export const META = {
  type: 'silk-shutter-card',
  name: 'Silk Shutter',
  description: 'A window you can drag.',
};

export interface SilkShutterCardConfig extends LovelaceCardConfig {
  entity: string;
  name?: string;
  /** Some covers report inverted position (0 = open). Flips display and commands. */
  invert?: boolean;
}

/** CoverEntityFeature bits (HA core). */
const FEAT_OPEN = 1;
const FEAT_CLOSE = 2;
const FEAT_SET_POSITION = 4;
const FEAT_STOP = 8;

const OPTIMISTIC_TTL_MS = 2000;
const DRAG_THRESHOLD_PX = 4;
const KEY_STEP = 5;

const EDITOR_TAG = 'silk-shutter-card-editor';

registerEditor(
  EDITOR_TAG,
  [
    { name: 'entity', required: true, selector: { entity: { domain: ['cover'] } } },
    { name: 'name', selector: { text: {} } },
    { name: 'invert', selector: { boolean: {} } },
  ],
  {
    entity: 'Entity',
    name: 'Name',
    invert: 'Invert reported position',
  }
);

@customElement('silk-shutter-card')
export class SilkShutterCard extends LitElement {
  @property({ attribute: false }) public hass?: HomeAssistant;

  @state() private _config?: SilkShutterCardConfig;

  /** Optimistic position (%) while dragging and briefly after release. */
  @state() private _localPos: number | null = null;
  @state() private _dragging = false;

  private _dragMoved = false;
  private _dragStartY = 0;
  private _dragStartPos = 100;
  private _dragHeight = 1;
  private _expiryTimer?: number;
  private _lastUpdated?: string;

  public static getStubConfig(hass: HomeAssistant): Partial<SilkShutterCardConfig> {
    const entity = Object.keys(hass.states).find((id) => id.startsWith('cover.'));
    return { type: 'custom:silk-shutter-card', entity };
  }

  public static async getConfigElement(): Promise<HTMLElement> {
    return document.createElement(EDITOR_TAG);
  }

  public setConfig(config: SilkShutterCardConfig): void {
    if (!config.entity || domainOf(config.entity) !== 'cover') {
      throw new Error('silk-shutter-card: define a cover `entity` (e.g. cover.bedroom_shutter)');
    }
    this._config = config;
    this._clearOptimistic();
    this._lastUpdated = undefined;
  }

  public getCardSize(): number {
    return 3;
  }

  public getGridOptions(): Record<string, number> {
    return { columns: 3, rows: 3, min_columns: 2, min_rows: 3 };
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
    // A real state update arrived: drop the post-release optimistic override.
    // (While dragging, no expiry timer is armed and the override stays put.)
    if (!isFirst && this._expiryTimer !== undefined) this._clearOptimistic();
  }

  private _clearOptimistic(): void {
    window.clearTimeout(this._expiryTimer);
    this._expiryTimer = undefined;
    this._localPos = null;
  }

  private _armExpiry(): void {
    window.clearTimeout(this._expiryTimer);
    this._expiryTimer = window.setTimeout(() => {
      this._expiryTimer = undefined;
      this._localPos = null;
    }, OPTIMISTIC_TTL_MS);
  }

  /** Reported position (%), 100 = fully open, invert applied; undefined when not positional. */
  private _realPosition(stateObj: HassEntity): number | undefined {
    const raw = stateObj.attributes.current_position;
    if (typeof raw !== 'number' || !Number.isFinite(raw)) return undefined;
    const pos = clamp(raw, 0, 100);
    return this._config?.invert ? 100 - pos : pos;
  }

  /** Position to draw right now: optimistic first, then reported, then open/closed. */
  private _shownPosition(stateObj: HassEntity): number {
    return this._localPos ?? this._realPosition(stateObj) ?? (stateObj.state === 'closed' ? 0 : 100);
  }

  private _commit(position: number): void {
    const hass = this.hass;
    const config = this._config;
    if (!hass || !config) return;
    const target = clamp(Math.round(config.invert ? 100 - position : position), 0, 100);
    hass.callService('cover', 'set_cover_position', { entity_id: config.entity, position: target });
  }

  private _onCardClick(): void {
    if (this._config) moreInfo(this, this._config.entity);
  }

  private _onPointerDown(ev: PointerEvent): void {
    this._dragMoved = false;
    const stateObj = this.hass?.states[this._config?.entity ?? ''];
    if (!stateObj || isUnavailable(stateObj) || !supportsFeature(stateObj, FEAT_SET_POSITION)) {
      return; // tap covers without SET_POSITION in the click handler
    }
    const el = ev.currentTarget as HTMLElement;
    el.setPointerCapture(ev.pointerId);
    this._dragging = true;
    this._dragStartY = ev.clientY;
    this._dragHeight = el.getBoundingClientRect().height || 1;
    this._dragStartPos = this._shownPosition(stateObj);
    // Keep any live override stable for the duration of the drag.
    window.clearTimeout(this._expiryTimer);
    this._expiryTimer = undefined;
  }

  private _onPointerMove(ev: PointerEvent): void {
    if (!this._dragging) return;
    const dy = ev.clientY - this._dragStartY;
    if (!this._dragMoved && Math.abs(dy) < DRAG_THRESHOLD_PX) return;
    this._dragMoved = true;
    // Dragging down closes (slats fill down), dragging up opens.
    this._localPos = Math.round(clamp(this._dragStartPos - (dy / this._dragHeight) * 100, 0, 100));
  }

  private _onPointerUp(): void {
    if (!this._dragging) return;
    this._dragging = false;
    if (this._dragMoved && this._localPos !== null) {
      this._armExpiry();
      this._commit(this._localPos);
      haptic(this);
    }
  }

  private _onPointerCancel(): void {
    if (!this._dragging) return;
    this._dragging = false;
    this._clearOptimistic();
  }

  private _onWindowClick(ev: MouseEvent): void {
    if (this._dragMoved) {
      // The drag already committed; swallow the trailing click.
      ev.stopPropagation();
      this._dragMoved = false;
      return;
    }
    const hass = this.hass;
    const config = this._config;
    if (!hass || !config) return;
    const stateObj = hass.states[config.entity];
    if (!stateObj || isUnavailable(stateObj)) return; // bubbles to the card → more-info
    if (!supportsFeature(stateObj, FEAT_SET_POSITION)) {
      ev.stopPropagation();
      toggleEntity(hass, config.entity);
      haptic(this);
    }
    // With SET_POSITION a plain tap falls through to the card → more-info.
  }

  private _onWindowKeydown(ev: KeyboardEvent): void {
    const stateObj = this.hass?.states[this._config?.entity ?? ''];
    if (!stateObj || isUnavailable(stateObj) || !supportsFeature(stateObj, FEAT_SET_POSITION)) return;
    const dir =
      ev.key === 'ArrowUp' || ev.key === 'ArrowRight'
        ? 1
        : ev.key === 'ArrowDown' || ev.key === 'ArrowLeft'
          ? -1
          : 0;
    if (!dir) return;
    ev.preventDefault();
    ev.stopPropagation();
    const next = clamp(this._shownPosition(stateObj) + dir * KEY_STEP, 0, 100);
    this._localPos = next;
    this._armExpiry();
    this._commit(next);
    haptic(this);
  }

  private _callCover(ev: Event, service: 'open_cover' | 'stop_cover' | 'close_cover'): void {
    ev.stopPropagation();
    if (!this.hass || !this._config) return;
    this._clearOptimistic();
    this.hass.callService('cover', service, { entity_id: this._config.entity });
    haptic(this);
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
    const accent = accentFor(stateObj);
    const name = config.name ?? stateObj.attributes.friendly_name ?? config.entity;
    const hasSetPosition = supportsFeature(stateObj, FEAT_SET_POSITION);
    const shown = this._shownPosition(stateObj);
    const hasPosition = this._localPos !== null || this._realPosition(stateObj) !== undefined;

    return html`
      <ha-card
        class="control ${unavailable ? 'unavailable' : ''}"
        style="--silk-accent:${accent}"
        @click=${this._onCardClick}
      >
        <div class="body">
          <div
            class="window ${this._dragging ? 'dragging' : ''} ${!hasSetPosition && !unavailable
              ? 'tappable'
              : ''}"
            role=${hasSetPosition ? 'slider' : 'button'}
            tabindex=${unavailable ? -1 : 0}
            aria-label="${name} position"
            aria-valuemin=${hasSetPosition ? '0' : nothing}
            aria-valuemax=${hasSetPosition ? '100' : nothing}
            aria-valuenow=${hasSetPosition ? String(shown) : nothing}
            @pointerdown=${this._onPointerDown}
            @pointermove=${this._onPointerMove}
            @pointerup=${this._onPointerUp}
            @pointercancel=${this._onPointerCancel}
            @click=${this._onWindowClick}
            @keydown=${this._onWindowKeydown}
          >
            <div class="shutter" style="transform:translateY(-${shown}%)"></div>
          </div>
          <div class="sill"></div>
          <div class="name">${name}</div>
          <div class="state">
            ${stateText(hass, stateObj)}${hasPosition
              ? html`<span class="sep">·</span>${shown}%`
              : nothing}
          </div>
        </div>
        ${this._renderButtons(stateObj, unavailable, hasPosition ? shown : undefined)}
      </ha-card>
    `;
  }

  private _renderButtons(
    stateObj: HassEntity,
    unavailable: boolean,
    pos: number | undefined
  ): TemplateResult | typeof nothing {
    const canOpen = supportsFeature(stateObj, FEAT_OPEN);
    const canStop = supportsFeature(stateObj, FEAT_STOP);
    const canClose = supportsFeature(stateObj, FEAT_CLOSE);
    if (!canOpen && !canStop && !canClose) return nothing;
    const fullyOpen = pos !== undefined ? pos >= 100 : stateObj.state === 'open';
    const fullyClosed = pos !== undefined ? pos <= 0 : stateObj.state === 'closed';
    return html`
      <div class="side">
        ${canOpen
          ? html`
              <button
                class="ctl"
                ?disabled=${unavailable || fullyOpen}
                aria-label="Open cover"
                @click=${(ev: Event) => this._callCover(ev, 'open_cover')}
              >
                <ha-icon icon="mdi:chevron-up"></ha-icon>
              </button>
            `
          : nothing}
        ${canStop
          ? html`
              <button
                class="ctl"
                ?disabled=${unavailable}
                aria-label="Stop cover"
                @click=${(ev: Event) => this._callCover(ev, 'stop_cover')}
              >
                <ha-icon icon="mdi:stop"></ha-icon>
              </button>
            `
          : nothing}
        ${canClose
          ? html`
              <button
                class="ctl"
                ?disabled=${unavailable || fullyClosed}
                aria-label="Close cover"
                @click=${(ev: Event) => this._callCover(ev, 'close_cover')}
              >
                <ha-icon icon="mdi:chevron-down"></ha-icon>
              </button>
            `
          : nothing}
      </div>
    `;
  }

  static styles = [
    silkControlStyles,
    css`
      ha-card {
        justify-content: center;
        gap: 10px;
      }
      .body {
        flex: 1;
        min-width: 0;
        display: flex;
        flex-direction: column;
        align-items: center;
        position: relative;
        z-index: 1;
      }
      /* Skeuomorphic window: neutral monochrome depth only — text-color grays
         for the frame/slats, black-alpha inset shadows for the glass. Chroma
         appears solely on the moving edge via the accent. */
      .window {
        flex: none;
        position: relative;
        width: 100px;
        height: 120px;
        box-sizing: border-box;
        border: 2px solid rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.2);
        border-radius: 8px;
        overflow: hidden;
        background: rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.03);
        box-shadow: inset 0 2px 8px rgba(0, 0, 0, 0.1);
        touch-action: none;
        cursor: ns-resize;
        outline: none;
      }
      .window.tappable {
        cursor: pointer;
      }
      .window:focus-visible {
        box-shadow:
          inset 0 0 0 2px var(--silk-accent),
          inset 0 2px 8px rgba(0, 0, 0, 0.1);
      }
      /* Full-height slat block moved with translateY so only transform animates:
         translateY(-position%) leaves the top (100 - position)% covered. */
      .shutter {
        position: absolute;
        inset: 0;
        background: repeating-linear-gradient(
          to bottom,
          rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.26) 0px,
          rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.13) 6px,
          transparent 6px,
          transparent 8px
        );
        box-shadow: inset 0 -1px 2px rgba(0, 0, 0, 0.15);
        transform: translateY(-100%);
        transition: transform 250ms var(--silk-ease-out);
        will-change: transform;
      }
      /* The moving edge — the one accent in the graphic. */
      .shutter::after {
        content: '';
        position: absolute;
        left: 0;
        right: 0;
        bottom: 0;
        height: 3px;
        background: var(--silk-accent);
      }
      .window.dragging .shutter {
        transition: none;
      }
      .sill {
        flex: none;
        width: 110px;
        height: 4px;
        margin-top: 3px;
        border-radius: 2px;
        background: rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.16);
        box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.12);
      }
      .body .name {
        margin-top: 8px;
        max-width: 100%;
        text-align: center;
      }
      .body .state {
        max-width: 100%;
        text-align: center;
      }
      .side {
        flex: none;
        display: flex;
        flex-direction: column;
        gap: 6px;
        position: relative;
        z-index: 1;
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
      .unavailable .body,
      .unavailable .side {
        opacity: 0.45;
      }
      .unavailable .window {
        cursor: default;
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    'silk-shutter-card': SilkShutterCard;
  }
}
