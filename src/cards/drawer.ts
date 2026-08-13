import { LitElement, html, css, nothing, PropertyValues, TemplateResult } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { HomeAssistant, LovelaceCardConfig } from '../types';
import { silkControlStyles } from '../shared/base';
import { haptic } from '../shared/service';
import { accentFor } from '../shared/color';
import { registerEditor } from '../shared/editor';

export const META = {
  type: 'silk-drawer-card',
  name: 'Silk Drawer',
  description: 'Slide the extras in from the side.',
};

export interface SilkDrawerCardConfig extends LovelaceCardConfig {
  title?: string;
  icon?: string;
  /** YAML-only: the drawer's contents — any list of Lovelace card configs. */
  cards?: LovelaceCardConfig[];
  /** Which edge the panel comes from. Default 'right'. */
  side?: 'right' | 'left';
  /** Panel width in px. Default 360; always capped to the viewport. */
  width?: number;
}

/** A rendered Lovelace card element — the frontend contract, typed locally. */
interface LovelaceCard extends HTMLElement {
  hass?: HomeAssistant;
}

/** Subset of the helpers object resolved by window.loadCardHelpers(). */
interface CardHelpers {
  createCardElement(config: LovelaceCardConfig): LovelaceCard;
}

const DEFAULT_TITLE = 'More';
const DEFAULT_WIDTH = 360;
const MIN_WIDTH = 200;
const MAX_WIDTH = 720;
/** Exit animation length; the overlay unmounts after this. */
const EXIT_MS = 200;

const EDITOR_TAG = 'silk-drawer-card-editor';

// `cards` stays YAML-only (a nested list of card configs); the editor owns the
// four choices that change how the drawer behaves.
registerEditor(
  EDITOR_TAG,
  [
    { name: 'title', selector: { text: {} } },
    {
      name: '',
      type: 'grid',
      schema: [
        { name: 'icon', selector: { icon: {} } },
        {
          name: 'side',
          selector: {
            select: {
              mode: 'dropdown',
              options: [
                { value: 'right', label: 'Right' },
                { value: 'left', label: 'Left' },
              ],
            },
          },
        },
      ],
    },
    { name: 'width', selector: { number: { min: MIN_WIDTH, max: MAX_WIDTH, mode: 'box' } } },
  ],
  { title: 'Title', icon: 'Icon', side: 'Opens from', width: 'Panel width (px)' },
  { title: DEFAULT_TITLE, side: 'right', width: DEFAULT_WIDTH }
);

/**
 * A drawer, not a dialog: one quiet 44px row on the dashboard, and everything
 * else parked off-screen until asked for. The panel slides from the edge you
 * name, the scrim takes the tap that dismisses it, and focus goes with it both
 * ways so a keyboard never gets left behind.
 */
@customElement('silk-drawer-card')
export class SilkDrawerCard extends LitElement {
  @property({ attribute: false }) public hass?: HomeAssistant;

  @state() private _config?: SilkDrawerCardConfig;
  @state() private _open = false;
  @state() private _closing = false;
  /** Built lazily on the first open; null until then. */
  @state() private _children: LovelaceCard[] | null = null;
  @state() private _helpersMissing = false;

  private _buildSeq = 0;
  private _closeTimer?: number;
  /** Where focus was before the panel took it. */
  private _returnFocus: HTMLElement | null = null;
  /** body overflow before the scroll lock, restored on close. */
  private _prevOverflow: string | null = null;

  public static getStubConfig(): Partial<SilkDrawerCardConfig> {
    return { type: 'custom:silk-drawer-card', title: DEFAULT_TITLE, side: 'right', cards: [] };
  }

  public static async getConfigElement(): Promise<HTMLElement> {
    return document.createElement(EDITOR_TAG);
  }

  public setConfig(config: SilkDrawerCardConfig): void {
    if (config.title !== undefined && typeof config.title !== 'string') {
      throw new Error('silk-drawer-card: `title` must be text');
    }
    if (config.cards !== undefined && !Array.isArray(config.cards)) {
      throw new Error('silk-drawer-card: `cards` must be a list of card configurations');
    }
    if (config.side !== undefined && config.side !== 'left' && config.side !== 'right') {
      throw new Error("silk-drawer-card: `side` must be 'left' or 'right'");
    }
    if (config.width !== undefined && !(Number(config.width) > 0)) {
      throw new Error('silk-drawer-card: `width` must be a positive number of pixels');
    }
    this._config = config;
    this._buildSeq++; // cancels any in-flight build of the old config
    this._children = null; // rebuilt on the next open with the fresh config
    this._helpersMissing = false;
    this._close(true);
  }

  public getCardSize(): number {
    return 1;
  }

  public getGridOptions(): Record<string, number> {
    return { columns: 12, rows: 1, min_columns: 4, min_rows: 1 };
  }

  public disconnectedCallback(): void {
    super.disconnectedCallback();
    // A drawer that leaves with the page must not take the page's scroll with it.
    this._close(true);
    window.removeEventListener('keydown', this._onKeyDown);
    window.clearTimeout(this._closeTimer);
    this._closeTimer = undefined;
  }

  protected willUpdate(changed: PropertyValues): void {
    if (changed.has('hass') && this._open) this._assignHass();
  }

  protected updated(changed: PropertyValues): void {
    // Focus follows the panel, so the next Tab lands inside it.
    if (changed.has('_open') && this._open) {
      this.renderRoot.querySelector<HTMLButtonElement>('.close')?.focus({ preventScroll: true });
    }
  }

  /** Window listener is a class-field arrow so add/remove pairs match. */
  private readonly _onKeyDown = (ev: KeyboardEvent): void => {
    if (ev.key !== 'Escape') return;
    ev.stopPropagation();
    this._close(false);
  };

  private _side(): 'left' | 'right' {
    return this._config?.side === 'left' ? 'left' : 'right';
  }

  private _width(): number {
    const raw = Number(this._config?.width ?? DEFAULT_WIDTH);
    if (!Number.isFinite(raw)) return DEFAULT_WIDTH;
    return Math.min(Math.max(raw, MIN_WIDTH), MAX_WIDTH);
  }

  private _lockScroll(): void {
    if (this._prevOverflow !== null) return;
    this._prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
  }

  private _unlockScroll(): void {
    if (this._prevOverflow === null) return;
    document.body.style.overflow = this._prevOverflow;
    this._prevOverflow = null;
  }

  private _openDrawer(ev: Event): void {
    ev.stopPropagation();
    if (this._open && !this._closing) return;
    haptic(this, 'selection');
    window.clearTimeout(this._closeTimer);
    this._closeTimer = undefined;
    // The shadow root reports the real focused node; document.activeElement
    // would only ever name this host.
    const root = this.renderRoot as unknown as { activeElement?: Element | null };
    this._returnFocus =
      (root.activeElement as HTMLElement | null) ??
      this.renderRoot.querySelector<HTMLElement>('.trigger');
    this._closing = false;
    this._open = true;
    this._lockScroll();
    window.addEventListener('keydown', this._onKeyDown);
    if (!this._children && !this._helpersMissing) void this._buildChildren();
    else this._assignHass();
  }

  /** `immediate` skips the exit animation (config change, disconnect). */
  private _close(immediate: boolean): void {
    if (!this._open) return;
    window.removeEventListener('keydown', this._onKeyDown);
    this._unlockScroll();
    const restore = this._returnFocus;
    this._returnFocus = null;
    if (immediate) {
      window.clearTimeout(this._closeTimer);
      this._closeTimer = undefined;
      this._closing = false;
      this._open = false;
      return;
    }
    if (this._closing) return;
    this._closing = true;
    this._closeTimer = window.setTimeout(() => {
      this._closeTimer = undefined;
      this._closing = false;
      this._open = false;
    }, EXIT_MS);
    // Hand focus back to whatever opened the drawer.
    if (restore?.isConnected) restore.focus({ preventScroll: true });
  }

  private _onScrimClick(): void {
    this._close(false);
  }

  private _onCloseClick(ev: Event): void {
    ev.stopPropagation();
    haptic(this);
    this._close(false);
  }

  private async _buildChildren(): Promise<void> {
    const cfgs = this._config?.cards ?? [];
    const seq = ++this._buildSeq;
    // loadCardHelpers is injected by the HA frontend at runtime; it is not part
    // of our typed hass surface, so reach for it through a local window cast.
    const loadCardHelpers = (window as unknown as { loadCardHelpers?: () => Promise<CardHelpers> })
      .loadCardHelpers;
    if (typeof loadCardHelpers !== 'function') {
      this._helpersMissing = true;
      return;
    }
    try {
      const helpers = await loadCardHelpers();
      if (seq !== this._buildSeq) return; // superseded by a newer config
      const built: LovelaceCard[] = [];
      for (const cfg of cfgs) {
        try {
          built.push(helpers.createCardElement(cfg));
        } catch (err) {
          console.warn('silk-drawer-card: card could not be created', err);
        }
      }
      this._children = built;
      this._assignHass();
    } catch (err) {
      console.warn('silk-drawer-card: card helpers failed', err);
      if (seq === this._buildSeq) this._helpersMissing = true;
    }
  }

  /** Parked children stay parked: hass only flows while the drawer is open. */
  private _assignHass(): void {
    if (!this.hass || !this._children) return;
    for (const child of this._children) child.hass = this.hass;
  }

  private _renderBody(): TemplateResult | LovelaceCard[] | typeof nothing {
    if (this._helpersMissing) {
      return html`<div class="note">Drawers require Home Assistant</div>`;
    }
    if (!this._children) return nothing; // build in flight
    if (this._children.length === 0) {
      return html`<div class="note">Nothing in here yet — add a <code>cards:</code> list.</div>`;
    }
    return this._children;
  }

  private _renderOverlay(title: string): TemplateResult {
    const side = this._side();
    return html`
      <div class="overlay ${side} ${this._closing ? 'closing' : ''}">
        <div class="scrim" @click=${this._onScrimClick}></div>
        <div
          class="panel"
          role="dialog"
          aria-modal="true"
          aria-label=${title}
          style="width:min(${this._width()}px, calc(100vw - 32px))"
        >
          <div class="phead">
            ${this._config?.icon
              ? html`<ha-icon class="lead" .icon=${this._config.icon}></ha-icon>`
              : nothing}
            <div class="ptitle" title=${title}>${title}</div>
            <button class="close" aria-label="Close" @click=${this._onCloseClick}>
              <ha-icon .icon=${'mdi:close'}></ha-icon>
            </button>
          </div>
          <div class="pbody">${this._renderBody()}</div>
        </div>
      </div>
    `;
  }

  protected render(): TemplateResult | typeof nothing {
    const config = this._config;
    if (!config) return nothing;
    const title = config.title ?? DEFAULT_TITLE;
    const side = this._side();
    return html`
      <ha-card class=${this._open && !this._closing ? 'open' : ''} style="--silk-accent:${accentFor(undefined)}">
        <button
          class="trigger"
          aria-haspopup="dialog"
          aria-expanded=${this._open && !this._closing ? 'true' : 'false'}
          @click=${this._openDrawer}
        >
          ${config.icon ? html`<ha-icon class="lead" .icon=${config.icon}></ha-icon>` : nothing}
          <span class="name" title=${title}>${title}</span>
          <span class="chev">
            <ha-icon .icon=${side === 'left' ? 'mdi:chevron-left' : 'mdi:chevron-right'}></ha-icon>
          </span>
        </button>
      </ha-card>
      ${this._open ? this._renderOverlay(title) : nothing}
    `;
  }

  static styles = [
    silkControlStyles,
    css`
      :host {
        height: auto;
      }
      ha-card {
        height: auto;
        flex-direction: column;
        align-items: stretch;
        gap: 0;
        padding: 6px;
        overflow: visible;
        cursor: default;
      }
      .trigger {
        display: flex;
        align-items: center;
        gap: 10px;
        width: 100%;
        height: 44px;
        box-sizing: border-box;
        padding: 0 6px;
        margin: 0;
        border: none;
        border-radius: 12px;
        background: none;
        font: inherit;
        color: inherit;
        text-align: left;
        cursor: pointer;
        transition: background 200ms ease;
      }
      .trigger:hover {
        background: rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.04);
      }
      .trigger:focus-visible {
        outline: 2px solid color-mix(in srgb, var(--silk-accent) 70%, transparent);
        outline-offset: -2px;
      }
      .lead {
        flex: none;
        color: var(--secondary-text-color);
        --mdc-icon-size: 20px;
        pointer-events: none;
      }
      .name {
        flex: 1;
        min-width: 0;
      }
      .chev {
        flex: none;
        width: 28px;
        height: 28px;
        border-radius: 10px;
        display: grid;
        place-items: center;
        color: var(--secondary-text-color);
        background: rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.06);
        transition:
          transform 250ms var(--silk-spring),
          background 200ms ease,
          color 200ms ease;
      }
      .trigger:active .chev {
        transform: scale(0.9);
        transition-duration: 120ms;
        transition-timing-function: var(--silk-ease-out);
      }
      .open .chev {
        color: var(--silk-accent);
        background: color-mix(in srgb, var(--silk-accent) 16%, transparent);
      }
      .chev ha-icon {
        --mdc-icon-size: 20px;
        pointer-events: none;
      }
      .overlay {
        position: fixed;
        inset: 0;
        z-index: 8;
        display: flex;
      }
      .overlay.right {
        justify-content: flex-end;
      }
      .overlay.left {
        justify-content: flex-start;
      }
      .scrim {
        position: absolute;
        inset: 0;
        background: rgba(0, 0, 0, 0.4);
        cursor: pointer;
        animation: silk-drawer-fade-in 200ms ease both;
      }
      .panel {
        position: relative;
        display: flex;
        flex-direction: column;
        max-width: 100%;
        height: 100%;
        box-sizing: border-box;
        background: var(--ha-card-background, var(--card-background-color, #fff));
        box-shadow: 0 0 40px rgba(0, 0, 0, 0.22);
        will-change: transform;
      }
      .right .panel {
        animation: silk-drawer-in-right 300ms var(--silk-ease-out) both;
      }
      .left .panel {
        animation: silk-drawer-in-left 300ms var(--silk-ease-out) both;
      }
      .closing .scrim {
        animation: silk-drawer-fade-out ${EXIT_MS}ms ease both;
      }
      .closing.right .panel {
        animation: silk-drawer-out-right ${EXIT_MS}ms ease both;
      }
      .closing.left .panel {
        animation: silk-drawer-out-left ${EXIT_MS}ms ease both;
      }
      .phead {
        flex: none;
        display: flex;
        align-items: center;
        gap: 10px;
        min-width: 0;
        padding: calc(12px + env(safe-area-inset-top, 0px)) 12px 8px 16px;
      }
      .ptitle {
        flex: 1;
        min-width: 0;
        font-size: 16px;
        font-weight: 600;
        letter-spacing: -0.01em;
        line-height: 1.3;
        color: var(--primary-text-color);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .close {
        flex: none;
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
          background 200ms ease;
      }
      .close:hover {
        background: rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.12);
      }
      .close:active {
        transform: scale(0.9);
        transition-duration: 120ms;
        transition-timing-function: var(--silk-ease-out);
      }
      .close:focus-visible {
        outline: 2px solid color-mix(in srgb, var(--silk-accent) 70%, transparent);
        outline-offset: 2px;
      }
      .close ha-icon {
        --mdc-icon-size: 20px;
        pointer-events: none;
      }
      .pbody {
        flex: 1;
        min-height: 0;
        overflow-y: auto;
        overscroll-behavior: contain;
        display: flex;
        flex-direction: column;
        gap: 12px;
        padding: 6px 14px calc(14px + env(safe-area-inset-bottom, 0px));
      }
      .note {
        padding: 6px 2px;
        font-size: 13px;
        color: var(--secondary-text-color);
      }
      .note code {
        font-size: 12px;
      }
      @keyframes silk-drawer-fade-in {
        from {
          opacity: 0;
        }
        to {
          opacity: 1;
        }
      }
      @keyframes silk-drawer-fade-out {
        from {
          opacity: 1;
        }
        to {
          opacity: 0;
        }
      }
      @keyframes silk-drawer-in-right {
        from {
          transform: translateX(100%);
        }
        to {
          transform: translateX(0);
        }
      }
      @keyframes silk-drawer-out-right {
        from {
          transform: translateX(0);
        }
        to {
          transform: translateX(100%);
        }
      }
      @keyframes silk-drawer-in-left {
        from {
          transform: translateX(-100%);
        }
        to {
          transform: translateX(0);
        }
      }
      @keyframes silk-drawer-out-left {
        from {
          transform: translateX(0);
        }
        to {
          transform: translateX(-100%);
        }
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    'silk-drawer-card': SilkDrawerCard;
  }
}
