import { LitElement, html, css, nothing, PropertyValues, TemplateResult } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { HomeAssistant, LovelaceCardConfig } from '../types';
import { silkControlStyles } from '../shared/base';
import { isActive, isUnavailable, haptic, stateText } from '../shared/service';
import { accentFor } from '../shared/color';
import { registerEditor } from '../shared/editor';

export const META = {
  type: 'silk-expander-card',
  name: 'Silk Expander',
  description: 'Tuck the details away until you want them.',
};

export interface SilkExpanderCardConfig extends LovelaceCardConfig {
  title: string;
  icon?: string;
  /** YAML-only: the body — any list of Lovelace card configs. */
  cards?: LovelaceCardConfig[];
  expanded?: boolean;
  /** Its state rides along in the header as a chip, collapsed or not. */
  summary_entity?: string;
}

/** A rendered Lovelace card element — the frontend contract, typed locally. */
interface LovelaceCard extends HTMLElement {
  hass?: HomeAssistant;
  getCardSize?: () => number | Promise<number>;
}

/** Subset of the helpers object resolved by window.loadCardHelpers(). */
interface CardHelpers {
  createCardElement(config: LovelaceCardConfig): LovelaceCard;
}

const EDITOR_TAG = 'silk-expander-card-editor';

registerEditor(
  EDITOR_TAG,
  [
    { name: 'title', required: true, selector: { text: {} } },
    {
      name: '',
      type: 'grid',
      schema: [
        { name: 'icon', selector: { icon: {} } },
        { name: 'summary_entity', selector: { entity: {} } },
      ],
    },
    { name: 'expanded', selector: { boolean: {} } },
  ],
  {
    title: 'Title',
    icon: 'Icon',
    summary_entity: 'Summary entity',
    expanded: 'Open by default',
  },
  { expanded: false }
);

/** Body reveal duration; the CSS transition and the release fallback share it. */
const OPEN_MS = 250;

/** A child's own size; plenty of cards resolve it lazily or omit it entirely. */
function cardSize(card: LovelaceCard): number {
  if (typeof card.getCardSize !== 'function') return 1;
  try {
    const size = card.getCardSize();
    return typeof size === 'number' && Number.isFinite(size) ? size : 1;
  } catch {
    return 1;
  }
}

@customElement('silk-expander-card')
export class SilkExpanderCard extends LitElement {
  @property({ attribute: false }) public hass?: HomeAssistant;

  @state() private _config?: SilkExpanderCardConfig;
  @state() private _expanded = false;
  /** Built lazily on the first expand; null until then. */
  @state() private _children: LovelaceCard[] | null = null;
  @state() private _helpersMissing = false;

  private _buildSeq = 0;
  /** Guards the max-height choreography until the body element exists. */
  private _ready = false;
  private _releaseTimer?: number;

  public static getStubConfig(): Partial<SilkExpanderCardConfig> {
    return { type: 'custom:silk-expander-card', title: 'More', cards: [] };
  }

  public static async getConfigElement(): Promise<HTMLElement> {
    return document.createElement(EDITOR_TAG);
  }

  public setConfig(config: SilkExpanderCardConfig): void {
    if (typeof config.title !== 'string' || !config.title.trim()) {
      throw new Error('silk-expander-card: `title` is required');
    }
    if (config.cards !== undefined && !Array.isArray(config.cards)) {
      throw new Error('silk-expander-card: `cards` must be a list of card configurations');
    }
    this._config = config;
    this._buildSeq++; // cancels any in-flight build of the old config
    this._children = null; // rebuilt on the next expand with the fresh config
    this._helpersMissing = false;
    this._expanded = config.expanded === true;
  }

  public getCardSize(): number {
    if (!this._expanded || !this._children?.length) return 1;
    return this._children.reduce((sum, child) => sum + cardSize(child), 1);
  }

  public getGridOptions(): Record<string, number> {
    return { columns: 12, rows: 2, min_columns: 4, min_rows: 1 };
  }

  public disconnectedCallback(): void {
    super.disconnectedCallback();
    window.clearTimeout(this._releaseTimer);
    this._releaseTimer = undefined;
  }

  protected willUpdate(changed: PropertyValues): void {
    if (changed.has('hass') && this._expanded) this._assignHass();
  }

  protected firstUpdated(): void {
    // Land in the configured state without animating on mount. The `_config`
    // branch of updated() — which also runs this cycle — starts the build.
    this._body()?.style.setProperty('max-height', this._expanded ? 'none' : '0px');
    this._ready = true;
  }

  protected updated(changed: PropertyValues): void {
    if (!this._ready) return;
    if (changed.has('_config')) {
      // A config edit reset the open state — resync without a transition.
      this._body()?.style.setProperty('max-height', this._expanded ? 'none' : '0px');
      if (this._expanded && !this._children && !this._helpersMissing) void this._buildChildren();
      return;
    }
    if (changed.has('_expanded') || (this._expanded && changed.has('_children'))) {
      this._syncBody();
    }
  }

  private _body(): HTMLElement | null {
    return this.renderRoot.querySelector<HTMLElement>('.body');
  }

  /**
   * Drives max-height between 0 and the measured content height. Once open the
   * cap is released to `none`, so nested cards are free to grow on their own.
   */
  private _syncBody(): void {
    const body = this._body();
    if (!body) return;
    window.clearTimeout(this._releaseTimer);
    this._releaseTimer = undefined;
    if (this._expanded) {
      if (body.style.maxHeight === 'none') return; // already uncapped
      body.style.maxHeight = `${body.scrollHeight}px`;
      // Children that render a frame late can land on a height equal to the one
      // we just set, and an equal value fires no transitionend — release anyway.
      this._releaseTimer = window.setTimeout(() => {
        this._releaseTimer = undefined;
        if (this._expanded) this._body()?.style.setProperty('max-height', 'none');
      }, OPEN_MS + 60);
      return;
    }
    if (body.style.maxHeight === 'none' || body.style.maxHeight === '') {
      body.style.maxHeight = `${body.scrollHeight}px`;
    }
    void body.offsetHeight; // commit the start value so the collapse animates
    body.style.maxHeight = '0px';
  }

  /** Guarded against transitions bubbling up from the nested cards. */
  private _onBodyTransitionEnd(ev: TransitionEvent): void {
    if (ev.propertyName !== 'max-height' || ev.target !== ev.currentTarget) return;
    window.clearTimeout(this._releaseTimer);
    this._releaseTimer = undefined;
    if (this._expanded) (ev.currentTarget as HTMLElement).style.maxHeight = 'none';
  }

  private _onToggle(ev: Event): void {
    ev.stopPropagation();
    haptic(this, 'selection');
    this._expanded = !this._expanded;
    if (!this._expanded) return;
    if (!this._children && !this._helpersMissing) void this._buildChildren();
    else this._assignHass();
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
          console.warn('silk-expander-card: card could not be created', err);
        }
      }
      this._children = built;
      this._assignHass();
    } catch (err) {
      console.warn('silk-expander-card: card helpers failed', err);
      if (seq === this._buildSeq) this._helpersMissing = true;
    }
  }

  /** Hidden children stay parked: hass only flows while the body is open. */
  private _assignHass(): void {
    if (!this.hass || !this._children) return;
    for (const child of this._children) child.hass = this.hass;
  }

  private _renderSummary(entityId: string): TemplateResult | typeof nothing {
    const stateObj = this.hass?.states[entityId];
    if (!stateObj) return nothing;
    const unavailable = isUnavailable(stateObj);
    const active = !unavailable && isActive(stateObj);
    const value = stateText(this.hass, stateObj);
    return html`
      <span
        class="chip summary ${active ? 'active' : ''} ${unavailable ? 'unavailable' : ''}"
        title=${`${stateObj.attributes.friendly_name ?? entityId}: ${value}`}
        >${value}</span
      >
    `;
  }

  private _renderBody(): TemplateResult | LovelaceCard[] | typeof nothing {
    if (this._helpersMissing) {
      return html`<div class="note">Expander requires Home Assistant</div>`;
    }
    if (!this._children) return nothing; // never opened, or build in flight
    if (this._children.length === 0) {
      return html`<div class="note">No cards yet — add a <code>cards:</code> list.</div>`;
    }
    return this._children;
  }

  protected render(): TemplateResult | typeof nothing {
    const config = this._config;
    if (!config) return nothing;
    const summaryObj = config.summary_entity
      ? this.hass?.states[config.summary_entity]
      : undefined;
    const accent = accentFor(summaryObj);
    const open = this._expanded;

    return html`
      <ha-card class=${open ? 'open' : ''} style="--silk-accent:${accent}">
        <button
          class="header"
          aria-expanded=${open ? 'true' : 'false'}
          aria-controls="silk-expander-body"
          @click=${this._onToggle}
        >
          ${config.icon ? html`<ha-icon class="lead" .icon=${config.icon}></ha-icon>` : nothing}
          <span class="name" title=${config.title}>${config.title}</span>
          <span class="trail">
            ${config.summary_entity ? this._renderSummary(config.summary_entity) : nothing}
            <span class="chev">
              <ha-icon .icon=${'mdi:chevron-down'}></ha-icon>
            </span>
          </span>
        </button>
        <div
          class="body ${open ? 'open' : ''}"
          id="silk-expander-body"
          ?inert=${!open}
          @transitionend=${this._onBodyTransitionEnd}
        >
          <div class="inner">${this._renderBody()}</div>
        </div>
      </ha-card>
    `;
  }

  static styles = [
    silkControlStyles,
    css`
      /* The card is exactly as tall as what it currently reveals. */
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
      .header {
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
      .header:hover {
        background: rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.04);
      }
      .header:focus-visible {
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
      .trail {
        flex: 0 1 auto;
        min-width: 0;
        display: flex;
        align-items: center;
        justify-content: flex-end;
        gap: 8px;
        overflow: hidden;
      }
      .summary {
        flex: 0 1 auto;
        min-width: 0;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        font-variant-numeric: tabular-nums;
        cursor: inherit;
      }
      /* A readout, not a button — hover must not imply a second tap target. */
      .summary:hover {
        background: rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.06);
      }
      .summary.active:hover {
        background: color-mix(in srgb, var(--silk-accent) 16%, transparent);
      }
      .summary.unavailable {
        opacity: 0.45;
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
      .header:active .chev {
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
        transition: transform 200ms var(--silk-ease-out);
      }
      .open .chev ha-icon {
        transform: rotate(180deg);
      }
      .body {
        max-height: 0;
        overflow: hidden;
        opacity: 0;
        transition:
          max-height ${OPEN_MS}ms var(--silk-ease-out),
          opacity 200ms ease;
      }
      .body.open {
        opacity: 1;
      }
      .inner {
        display: flex;
        flex-direction: column;
        gap: 12px;
        min-width: 0;
        padding: 8px 6px 6px;
      }
      .note {
        font-size: 13px;
        color: var(--secondary-text-color);
      }
      .note code {
        font-size: 12px;
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    'silk-expander-card': SilkExpanderCard;
  }
}
