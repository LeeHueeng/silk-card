import { LitElement, html, css, nothing, PropertyValues, TemplateResult } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { HomeAssistant, LovelaceCardConfig } from '../types';
import { silkControlStyles } from '../shared/base';
import { haptic } from '../shared/service';
import { registerEditor } from '../shared/editor';

export const META = {
  type: 'silk-popup-card',
  name: 'Silk Pop-up',
  description: 'Hash-based pop-ups with zero dependencies.',
};

export interface SilkPopupCardConfig extends LovelaceCardConfig {
  /** Location hash that opens the pop-up, e.g. '#garage'. */
  hash: string;
  title?: string;
  icon?: string;
  /** YAML-only: the pop-up body — any list of Lovelace card configs. */
  cards?: LovelaceCardConfig[];
}

/** A rendered Lovelace card element — the frontend contract, typed locally. */
interface LovelaceCard extends HTMLElement {
  hass?: HomeAssistant;
}

/** Subset of the helpers object resolved by window.loadCardHelpers(). */
interface CardHelpers {
  createCardElement(config: LovelaceCardConfig): LovelaceCard;
}

/** Exit animation length; the overlay unmounts after this. */
const EXIT_MS = 200;

const EDITOR_TAG = 'silk-popup-card-editor';

registerEditor(
  EDITOR_TAG,
  [
    { name: 'hash', required: true, selector: { text: {} } },
    { name: 'title', selector: { text: {} } },
    { name: 'icon', selector: { icon: {} } },
  ],
  {
    hash: 'Hash (e.g. #garage)',
    title: 'Title',
    icon: 'Icon',
  }
);

@customElement('silk-popup-card')
export class SilkPopupCard extends LitElement {
  @property({ attribute: false }) public hass?: HomeAssistant;

  /** Set by the frontend in editor preview panes; shows the ghost row. */
  @property({ type: Boolean }) public preview = false;

  /** Set by the frontend while the dashboard is in edit mode. */
  @property({ type: Boolean }) public editMode = false;

  @state() private _config?: SilkPopupCardConfig;
  @state() private _open = false;
  @state() private _closing = false;
  @state() private _children: LovelaceCard[] | null = null;
  @state() private _helpersMissing = false;

  /** True when an in-app hash navigation opened us (a history entry was pushed). */
  private _pushedHash = false;
  private _buildSeq = 0;
  private _closeTimer?: number;

  public static getStubConfig(): Partial<SilkPopupCardConfig> {
    return { type: 'custom:silk-popup-card', hash: '#popup' };
  }

  public static async getConfigElement(): Promise<HTMLElement> {
    return document.createElement(EDITOR_TAG);
  }

  public setConfig(config: SilkPopupCardConfig): void {
    if (typeof config.hash !== 'string' || !config.hash.startsWith('#') || config.hash.length < 2) {
      throw new Error("silk-popup-card: `hash` is required and must start with '#' (e.g. '#garage')");
    }
    if (config.cards !== undefined && !Array.isArray(config.cards)) {
      throw new Error('silk-popup-card: `cards` must be a list of card configurations');
    }
    this._config = config;
    this._buildSeq++; // cancels any in-flight build of the old config
    this._children = null; // rebuilt on next show with the fresh config
    this._helpersMissing = false;
    if (this.isConnected) this._sync(false);
  }

  public getCardSize(): number {
    return 1;
  }

  public getGridOptions(): Record<string, number> {
    return { columns: 1, rows: 1 };
  }

  public connectedCallback(): void {
    super.connectedCallback();
    window.addEventListener('hashchange', this._onHashChange);
    this._sync(false);
  }

  public disconnectedCallback(): void {
    super.disconnectedCallback();
    window.removeEventListener('hashchange', this._onHashChange);
    window.removeEventListener('keydown', this._onKeyDown);
    window.clearTimeout(this._closeTimer);
    this._open = false;
    this._closing = false;
  }

  protected willUpdate(changed: PropertyValues): void {
    if (changed.has('hass') && this._open) this._assignHass();
  }

  protected updated(changed: PropertyValues): void {
    // Move focus into the dialog so keyboard and screen-reader users land there.
    if (changed.has('_open') && this._open) {
      this.renderRoot.querySelector<HTMLButtonElement>('.close')?.focus({ preventScroll: true });
    }
  }

  /** Window listeners are class-field arrows so add/remove pairs match. */
  private readonly _onHashChange = (): void => {
    this._sync(true);
  };

  private readonly _onKeyDown = (ev: KeyboardEvent): void => {
    if (ev.key === 'Escape') {
      ev.stopPropagation();
      this._requestClose();
    }
  };

  /** Reconcile open state with location.hash (on connect, config, navigation). */
  private _sync(fromNavigation: boolean): void {
    const config = this._config;
    if (!config) return;
    if (window.location.hash === config.hash) {
      // Only a real hash *navigation* pushed a history entry we may pop later.
      if (!this._open) this._pushedHash = fromNavigation;
      this._show();
    } else {
      this._hide();
    }
  }

  private _show(): void {
    window.clearTimeout(this._closeTimer);
    this._closing = false;
    if (!this._open) {
      this._open = true;
      window.addEventListener('keydown', this._onKeyDown);
    }
    if (!this._children && !this._helpersMissing) void this._buildChildren();
    else this._assignHass();
  }

  /** Retire the overlay visually; never touches history (navigation already did). */
  private _hide(): void {
    if (!this._open || this._closing) return;
    window.removeEventListener('keydown', this._onKeyDown);
    this._closing = true;
    this._closeTimer = window.setTimeout(() => {
      this._closing = false;
      this._open = false;
    }, EXIT_MS);
  }

  /** User intent to close (scrim, X, Escape) — history-aware. */
  private _requestClose(): void {
    const config = this._config;
    if (!config || !this._open || this._closing) return;
    if (window.location.hash === config.hash) {
      if (this._pushedHash) {
        // The opening navigation pushed an entry — pop it so back stays sane.
        history.back();
      } else {
        // Opened from a direct load: strip the hash without adding history noise.
        history.replaceState(null, '', window.location.pathname + window.location.search);
      }
    }
    this._hide();
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
      this._children = cfgs.map((cfg) => helpers.createCardElement(cfg));
      this._assignHass();
    } catch (err) {
      console.warn('silk-popup-card: card helpers failed', err);
      if (seq === this._buildSeq) this._helpersMissing = true;
    }
  }

  private _assignHass(): void {
    if (!this.hass || !this._children) return;
    for (const child of this._children) child.hass = this.hass;
  }

  private _onScrimClick(): void {
    this._requestClose();
  }

  private _onCloseClick(ev: Event): void {
    ev.stopPropagation();
    haptic(this);
    this._requestClose();
  }

  private _renderBody(): TemplateResult | LovelaceCard[] | typeof nothing {
    if (this._helpersMissing) {
      return html`<div class="note">Pop-up requires Home Assistant</div>`;
    }
    if (!this._children) return nothing; // build in flight
    if (this._children.length === 0) {
      return html`<div class="note">No cards configured — add a <code>cards:</code> list.</div>`;
    }
    return this._children;
  }

  private _renderOverlay(config: SilkPopupCardConfig): TemplateResult {
    const title = config.title ?? '';
    return html`
      <div class="overlay ${this._closing ? 'closing' : ''}">
        <div class="scrim" @click=${this._onScrimClick}></div>
        <div class="sheet" role="dialog" aria-modal="true" aria-label=${title || 'Pop-up'}>
          <div class="header">
            ${config.icon ? html`<ha-icon class="lead" .icon=${config.icon}></ha-icon>` : nothing}
            <div class="title" title=${title || nothing}>${title}</div>
            <button class="close" aria-label="Close" @click=${this._onCloseClick}>
              <ha-icon .icon=${'mdi:close'}></ha-icon>
            </button>
          </div>
          <div class="body">${this._renderBody()}</div>
        </div>
      </div>
    `;
  }

  protected render(): TemplateResult | typeof nothing {
    const config = this._config;
    if (!config) return nothing;
    const editing = this.preview || this.editMode;
    return html`
      ${editing
        ? html`
            <ha-card class="ghost">
              <ha-icon class="ghost-icon" .icon=${config.icon ?? 'mdi:dock-window'}></ha-icon>
              <div class="info">
                <div class="name">${config.title ?? 'Pop-up'}</div>
                <div class="state">Opens on ${config.hash}</div>
              </div>
            </ha-card>
          `
        : html`<div class="placeholder" aria-hidden="true"></div>`}
      ${this._open && !this.preview ? this._renderOverlay(config) : nothing}
    `;
  }

  static styles = [
    silkControlStyles,
    css`
      .placeholder {
        display: none;
      }
      /* Edit-mode stand-in so the card can be found and configured. */
      .ghost {
        cursor: default;
        box-shadow: none;
        border: 1px dashed rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.25);
        background: rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.03);
      }
      .ghost-icon {
        flex: none;
        color: var(--secondary-text-color);
        --mdc-icon-size: 20px;
      }
      .overlay {
        position: fixed;
        inset: 0;
        z-index: 8;
        display: flex;
        align-items: flex-end;
        justify-content: center;
      }
      .scrim {
        position: absolute;
        inset: 0;
        background: rgba(0, 0, 0, 0.4);
        cursor: pointer;
        animation: silk-popup-fade-in 200ms ease both;
      }
      .sheet {
        position: relative;
        width: 100%;
        max-width: 480px;
        max-height: 85vh;
        display: flex;
        flex-direction: column;
        background: var(--ha-card-background, var(--card-background-color, #fff));
        border-radius: 20px 20px 0 0;
        box-shadow: 0 -8px 40px rgba(0, 0, 0, 0.18);
        overflow: hidden;
        animation: silk-popup-rise 300ms var(--silk-ease-out) both;
      }
      .closing .scrim {
        animation: silk-popup-fade-out 200ms ease both;
      }
      .closing .sheet {
        animation: silk-popup-drop 200ms ease both;
      }
      .header {
        flex: none;
        display: flex;
        align-items: center;
        gap: 10px;
        min-width: 0;
        padding: 14px 14px 6px 18px;
      }
      .lead {
        flex: none;
        color: var(--secondary-text-color);
        --mdc-icon-size: 20px;
      }
      .title {
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
      .body {
        flex: 1;
        min-height: 0;
        overflow-y: auto;
        overscroll-behavior: contain;
        display: flex;
        flex-direction: column;
        gap: 12px;
        padding: 8px 14px calc(14px + env(safe-area-inset-bottom, 0px));
      }
      .note {
        padding: 8px 4px 4px;
        font-size: 13px;
        color: var(--secondary-text-color);
      }
      .note code {
        font-size: 12px;
      }
      @keyframes silk-popup-fade-in {
        from {
          opacity: 0;
        }
        to {
          opacity: 1;
        }
      }
      @keyframes silk-popup-fade-out {
        from {
          opacity: 1;
        }
        to {
          opacity: 0;
        }
      }
      @keyframes silk-popup-rise {
        from {
          transform: translateY(24px);
          opacity: 0;
        }
        to {
          transform: translateY(0);
          opacity: 1;
        }
      }
      @keyframes silk-popup-drop {
        from {
          transform: translateY(0);
          opacity: 1;
        }
        to {
          transform: translateY(24px);
          opacity: 0;
        }
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    'silk-popup-card': SilkPopupCard;
  }
}
