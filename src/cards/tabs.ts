import { LitElement, html, css, nothing, PropertyValues, TemplateResult } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { keyed } from 'lit/directives/keyed.js';
import { HomeAssistant, LovelaceCardConfig } from '../types';
import { silkControlStyles } from '../shared/base';
import { haptic } from '../shared/service';

export const META = {
  type: 'silk-tabs-card',
  name: 'Silk Tabs',
  description: 'Many cards, one slot.',
};

export interface SilkTabConfig {
  name?: string;
  icon?: string;
  cards: LovelaceCardConfig[];
}

export interface SilkTabsCardConfig extends LovelaceCardConfig {
  tabs: SilkTabConfig[];
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

const MAX_TABS = 6;
/** Fallback size before the active tab has been built (or when it is empty). */
const FALLBACK_SIZE = 3;

const EDITOR_TAG = 'silk-tabs-card-editor';

/** One tab's own options — the strip is drawn from these two. */
const TAB_FIELDS: { name: string; label: string; selector: Record<string, unknown> }[] = [
  { name: 'name', label: '탭 이름', selector: { text: {} } },
  { name: 'icon', label: '아이콘', selector: { icon: {} } },
];
const TAB_SCHEMA = TAB_FIELDS.map((f) => ({ name: f.name, selector: f.selector }));
const TAB_LABELS = Object.fromEntries(TAB_FIELDS.map((f) => [f.name, f.label]));

/**
 * One child card. `type` is a text field so a card can be swapped by typing,
 * and the rest of it lands in an object box: a child holds *another* card's
 * whole configuration, which no fixed schema can describe and which a custom
 * card cannot hand to HA's own card picker. Order and deletion stay clickable.
 */
const CARD_SCHEMA = [
  { name: 'type', selector: { text: {} } },
  { name: 'card_config', selector: { object: {} } },
];
const CARD_LABELS: Record<string, string> = { type: '카드 종류', card_config: '카드 설정' };

/** Values a freshly added tab / card starts with. */
const BLANK_TAB: Record<string, unknown> = { name: '새 탭', cards: [] };
const BLANK_CARD: Record<string, unknown> = { type: 'tile' };

/**
 * Editor: a repeater of tabs, each holding a repeater of its own cards.
 * `ha-form` has neither, so both are built here in the shape
 * `shared/rows.ts` uses — ▲▼ reorder, ✕ delete, add button — and every key the
 * schema does not mention rides through untouched.
 */
function registerTabsEditor(tag: string): void {
  if (customElements.get(tag)) return;

  class TabsEditor extends LitElement {
    @property({ attribute: false }) public hass?: HomeAssistant;
    @state() private _config?: LovelaceCardConfig;

    public setConfig(config: LovelaceCardConfig): void {
      this._config = config;
    }

    private get _tabs(): Record<string, unknown>[] {
      const value = (this._config as Record<string, unknown> | undefined)?.tabs;
      return Array.isArray(value) ? (value as Record<string, unknown>[]) : [];
    }

    private _cardsOf(tab: Record<string, unknown>): Record<string, unknown>[] {
      return Array.isArray(tab.cards) ? (tab.cards as Record<string, unknown>[]) : [];
    }

    private _emit(next: Record<string, unknown>): void {
      this.dispatchEvent(
        new CustomEvent('config-changed', {
          detail: { config: next },
          bubbles: true,
          composed: true,
        })
      );
    }

    private _setTabs(tabs: Record<string, unknown>[]): void {
      const next = { ...(this._config as Record<string, unknown>) };
      if (tabs.length) next.tabs = tabs;
      else delete next.tabs;
      this._emit(next);
    }

    private _tabChanged(ev: CustomEvent, index: number): void {
      ev.stopPropagation();
      const value = (ev.detail?.value ?? {}) as Record<string, unknown>;
      const tabs = this._tabs.map((t) => ({ ...t }));
      // `cards` and any hand-written extra key are never touched here.
      const tab = { ...tabs[index] };
      for (const field of TAB_FIELDS) {
        const raw = value[field.name];
        if (raw === undefined || raw === '') delete tab[field.name];
        else tab[field.name] = raw;
      }
      tabs[index] = tab;
      this._setTabs(tabs);
    }

    private _addTab(): void {
      this._setTabs([...this._tabs.map((t) => ({ ...t })), { ...BLANK_TAB, cards: [] }]);
    }

    private _removeTab(index: number): void {
      this._setTabs(this._tabs.filter((_, i) => i !== index));
    }

    private _moveTab(index: number, delta: number): void {
      const tabs = this._tabs.map((t) => ({ ...t }));
      const target = index + delta;
      if (target < 0 || target >= tabs.length) return;
      [tabs[index], tabs[target]] = [tabs[target], tabs[index]];
      this._setTabs(tabs);
    }

    private _setCards(tabIndex: number, cards: Record<string, unknown>[]): void {
      const tabs = this._tabs.map((t) => ({ ...t }));
      tabs[tabIndex] = { ...tabs[tabIndex], cards };
      this._setTabs(tabs);
    }

    /** Stored card → {type, everything else}. */
    private _cardData(card: Record<string, unknown>): Record<string, unknown> {
      const { type, ...rest } = card;
      return { type: typeof type === 'string' ? type : '', card_config: rest };
    }

    private _cardChanged(ev: CustomEvent, tabIndex: number, cardIndex: number): void {
      ev.stopPropagation();
      const value = (ev.detail?.value ?? {}) as Record<string, unknown>;
      const cards = this._cardsOf(this._tabs[tabIndex] ?? {}).map((c) => ({ ...c }));
      const previous = cards[cardIndex] ?? {};
      const body = value.card_config;
      const rest =
        body && typeof body === 'object' && !Array.isArray(body)
          ? (body as Record<string, unknown>)
          : {};
      const type = typeof value.type === 'string' && value.type !== '' ? value.type : previous.type;
      cards[cardIndex] = { ...rest, ...(type === undefined ? {} : { type }) };
      this._setCards(tabIndex, cards);
    }

    private _addCard(tabIndex: number): void {
      const cards = this._cardsOf(this._tabs[tabIndex] ?? {}).map((c) => ({ ...c }));
      this._setCards(tabIndex, [...cards, { ...BLANK_CARD }]);
    }

    private _removeCard(tabIndex: number, cardIndex: number): void {
      const cards = this._cardsOf(this._tabs[tabIndex] ?? {}).filter((_, i) => i !== cardIndex);
      this._setCards(tabIndex, cards);
    }

    private _moveCard(tabIndex: number, cardIndex: number, delta: number): void {
      const cards = this._cardsOf(this._tabs[tabIndex] ?? {}).map((c) => ({ ...c }));
      const target = cardIndex + delta;
      if (target < 0 || target >= cards.length) return;
      [cards[cardIndex], cards[target]] = [cards[target], cards[cardIndex]];
      this._setCards(tabIndex, cards);
    }

    private _renderCard(
      card: Record<string, unknown>,
      tabIndex: number,
      cardIndex: number,
      total: number
    ): TemplateResult {
      return html`
        <div class="row">
          <div class="grip">
            <button
              class="mini"
              ?disabled=${cardIndex === 0}
              title="위로"
              @click=${() => this._moveCard(tabIndex, cardIndex, -1)}
            >
              ▲
            </button>
            <button
              class="mini"
              ?disabled=${cardIndex === total - 1}
              title="아래로"
              @click=${() => this._moveCard(tabIndex, cardIndex, 1)}
            >
              ▼
            </button>
          </div>
          <ha-form
            class="fields"
            .hass=${this.hass}
            .data=${this._cardData(card)}
            .schema=${CARD_SCHEMA}
            .computeLabel=${(s: { name: string }) => CARD_LABELS[s.name] ?? s.name}
            @value-changed=${(ev: CustomEvent) => this._cardChanged(ev, tabIndex, cardIndex)}
          ></ha-form>
          <button
            class="mini remove"
            title="삭제"
            @click=${() => this._removeCard(tabIndex, cardIndex)}
          >
            ✕
          </button>
        </div>
      `;
    }

    private _renderTab(tab: Record<string, unknown>, index: number, total: number): TemplateResult {
      const cards = this._cardsOf(tab);
      return html`
        <div class="tab">
          <div class="row">
            <div class="grip">
              <button
                class="mini"
                ?disabled=${index === 0}
                title="위로"
                @click=${() => this._moveTab(index, -1)}
              >
                ▲
              </button>
              <button
                class="mini"
                ?disabled=${index === total - 1}
                title="아래로"
                @click=${() => this._moveTab(index, 1)}
              >
                ▼
              </button>
            </div>
            <ha-form
              class="fields"
              .hass=${this.hass}
              .data=${tab}
              .schema=${TAB_SCHEMA}
              .computeLabel=${(s: { name: string }) => TAB_LABELS[s.name] ?? s.name}
              @value-changed=${(ev: CustomEvent) => this._tabChanged(ev, index)}
            ></ha-form>
            <button class="mini remove" title="삭제" @click=${() => this._removeTab(index)}>
              ✕
            </button>
          </div>

          <div class="nest">
            <div class="head sub">
              <span class="title">이 탭의 카드</span>
              <span class="count">${cards.length}</span>
            </div>
            ${cards.map((card, cardIndex) =>
              this._renderCard(card, index, cardIndex, cards.length)
            )}
            <button class="add sub" @click=${() => this._addCard(index)}>+ 카드 추가</button>
          </div>
        </div>
      `;
    }

    protected render(): TemplateResult | typeof nothing {
      if (!this.hass || !this._config) return nothing;
      const tabs = this._tabs;
      return html`
        <div class="head">
          <span class="title">탭</span>
          <span class="count">${tabs.length}</span>
        </div>
        ${tabs.map((tab, index) => this._renderTab(tab, index, tabs.length))}
        <button class="add" @click=${this._addTab}>+ 탭 추가</button>
      `;
    }

    static styles = css`
      :host {
        display: block;
      }
      .head {
        display: flex;
        align-items: center;
        gap: 6px;
        margin: 14px 0 6px;
        font-size: 13px;
        font-weight: 600;
        color: var(--primary-text-color);
      }
      .head.sub {
        margin: 4px 0 6px;
        font-size: 12px;
        color: var(--secondary-text-color);
      }
      .count {
        font-size: 11px;
        font-weight: 600;
        color: var(--secondary-text-color);
        background: rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.08);
        border-radius: 999px;
        padding: 1px 7px;
      }
      .tab {
        padding: 8px;
        margin-bottom: 10px;
        border-radius: 14px;
        background: rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.04);
      }
      .row {
        display: flex;
        align-items: flex-start;
        gap: 6px;
        padding: 8px;
        margin-bottom: 6px;
        border-radius: 12px;
        background: rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.04);
      }
      .nest {
        padding-left: 10px;
        border-left: 2px solid rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.08);
      }
      .fields {
        flex: 1;
        min-width: 0;
      }
      .grip {
        display: flex;
        flex-direction: column;
        gap: 2px;
      }
      .mini {
        border: none;
        background: rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.08);
        color: var(--secondary-text-color);
        border-radius: 8px;
        width: 26px;
        height: 22px;
        font-size: 10px;
        cursor: pointer;
        padding: 0;
      }
      .mini:disabled {
        opacity: 0.3;
        cursor: default;
      }
      .mini.remove {
        height: 26px;
        color: var(--error-color, #db4437);
      }
      .add {
        border: none;
        width: 100%;
        padding: 10px;
        border-radius: 12px;
        font: inherit;
        font-size: 13px;
        font-weight: 600;
        cursor: pointer;
        color: var(--primary-color);
        background: rgba(var(--rgb-primary-color, 74, 168, 255), 0.12);
      }
      .add.sub {
        padding: 7px;
        font-size: 12px;
      }
    `;
  }

  customElements.define(tag, TabsEditor);
}

registerTabsEditor(EDITOR_TAG);

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

@customElement('silk-tabs-card')
export class SilkTabsCard extends LitElement {
  @property({ attribute: false }) public hass?: HomeAssistant;

  @state() private _config?: SilkTabsCardConfig;
  /** Children of the active tab; null while a build is in flight. */
  @state() private _children: LovelaceCard[] | null = null;
  @state() private _helpersMissing = false;
  /** Selected tab — a private field, never persisted anywhere. */
  @state() private _active = 0;

  private _tabs: SilkTabConfig[] = [];
  /** Built elements per tab index, so a second visit is instant. */
  private _cache = new Map<number, LovelaceCard[]>();
  private _building = false;
  private _buildSeq = 0;

  public static getStubConfig(): Partial<SilkTabsCardConfig> {
    return { type: 'custom:silk-tabs-card', tabs: [{ name: 'Tab 1', cards: [] }] };
  }

  public static async getConfigElement(): Promise<HTMLElement> {
    return document.createElement(EDITOR_TAG);
  }

  public setConfig(config: SilkTabsCardConfig): void {
    if (!Array.isArray(config.tabs) || config.tabs.length === 0) {
      throw new Error('silk-tabs-card: `tabs` is required — 1-6 of {name, icon, cards}');
    }
    if (config.tabs.length > MAX_TABS) {
      throw new Error(`silk-tabs-card: at most ${MAX_TABS} \`tabs\``);
    }
    // Normalize into a local first: a throw halfway through must not leave the
    // card holding tabs that disagree with its config.
    const tabs: SilkTabConfig[] = config.tabs.map((tab, i) => {
      if (!tab || typeof tab !== 'object') {
        throw new Error(`silk-tabs-card: tabs[${i}] must be a mapping`);
      }
      if (tab.cards !== undefined && !Array.isArray(tab.cards)) {
        throw new Error(`silk-tabs-card: tabs[${i}].cards must be a list of card configurations`);
      }
      return { name: tab.name, icon: tab.icon, cards: tab.cards ?? [] };
    });
    this._tabs = tabs;
    this._config = config;
    // Every config edit invalidates the built children; keep the reader on the
    // tab they were looking at when it still exists.
    this._buildSeq++;
    this._building = false;
    this._cache.clear();
    this._children = null;
    this._helpersMissing = false;
    this._active = Math.min(this._active, this._tabs.length - 1);
  }

  public getCardSize(): number {
    const children = this._cache.get(this._active);
    if (!children || children.length === 0) return FALLBACK_SIZE;
    const total = children.reduce((sum, child) => sum + cardSize(child), 0);
    return total > 0 ? total : FALLBACK_SIZE;
  }

  public getGridOptions(): Record<string, number> {
    return { columns: 12, rows: 4, min_columns: 6, min_rows: 2 };
  }

  protected willUpdate(changed: PropertyValues): void {
    if (!this._config) return;
    if (this._children === null && !this._helpersMissing && !this._building) {
      void this._buildTab(this._active);
    }
    if (changed.has('hass')) this._assignHass();
  }

  private async _buildTab(index: number): Promise<void> {
    const tab = this._tabs[index];
    if (!tab) return;
    const seq = ++this._buildSeq;
    this._building = true;
    // loadCardHelpers is injected by the HA frontend at runtime; it is not part
    // of our typed hass surface, so reach for it through a local window cast.
    const loadCardHelpers = (window as unknown as { loadCardHelpers?: () => Promise<CardHelpers> })
      .loadCardHelpers;
    if (typeof loadCardHelpers !== 'function') {
      this._building = false;
      this._helpersMissing = true;
      return;
    }
    try {
      const helpers = await loadCardHelpers();
      if (seq !== this._buildSeq) return; // a newer config or tab superseded us
      const built: LovelaceCard[] = [];
      for (const cfg of tab.cards) {
        try {
          built.push(helpers.createCardElement(cfg));
        } catch (err) {
          console.warn('silk-tabs-card: card could not be created', err);
        }
      }
      this._cache.set(index, built);
      if (index === this._active) {
        this._children = built;
        this._assignHass();
      }
    } catch (err) {
      console.warn('silk-tabs-card: card helpers failed', err);
      if (seq === this._buildSeq) this._helpersMissing = true;
    } finally {
      if (seq === this._buildSeq) {
        this._building = false;
        // The reader may have switched tabs while we were awaiting helpers —
        // nothing re-renders on a plain field, so chain the catch-up build here.
        if (this._children === null && !this._helpersMissing) void this._buildTab(this._active);
      }
    }
  }

  /** Only the visible tab tracks hass — hidden children stay parked. */
  private _assignHass(): void {
    if (!this.hass || !this._children) return;
    for (const child of this._children) child.hass = this.hass;
  }

  private _onTabClick(ev: Event, index: number): void {
    ev.stopPropagation();
    if (index === this._active || !this._tabs[index]) return;
    haptic(this, 'selection');
    this._active = index;
    const cached = this._cache.get(index);
    this._children = cached ?? null;
    if (cached) this._assignHass();
  }

  private _tabLabel(tab: SilkTabConfig, index: number): string {
    return tab.name ?? (tab.icon ? '' : `Tab ${index + 1}`);
  }

  private _renderTab(tab: SilkTabConfig, index: number): TemplateResult {
    const active = index === this._active;
    const label = this._tabLabel(tab, index);
    return html`
      <button
        class="chip tab ${active ? 'active' : ''}"
        role="tab"
        aria-selected=${active ? 'true' : 'false'}
        aria-controls="silk-tabs-panel"
        aria-label=${label || `Tab ${index + 1}`}
        title=${label || nothing}
        @click=${(ev: Event) => this._onTabClick(ev, index)}
      >
        ${tab.icon ? html`<ha-icon .icon=${tab.icon}></ha-icon>` : nothing}
        ${label ? html`<span class="label">${label}</span>` : nothing}
      </button>
    `;
  }

  private _renderBody(): TemplateResult | LovelaceCard[] | typeof nothing {
    if (this._helpersMissing) {
      return html`<div class="note">Tabs require Home Assistant</div>`;
    }
    if (!this._children) return nothing; // build in flight
    if (this._children.length === 0) {
      return html`<div class="note">This tab is empty — add a <code>cards:</code> list.</div>`;
    }
    return this._children;
  }

  protected render(): TemplateResult | typeof nothing {
    if (!this._config) return nothing;
    const current = this._tabs[this._active];
    const panelLabel =
      (current ? this._tabLabel(current, this._active) : '') || `Tab ${this._active + 1}`;
    return html`
      <ha-card>
        <div class="bar" role="tablist">
          ${this._tabs.map((tab, i) => this._renderTab(tab, i))}
        </div>
        ${keyed(
          // Keyed on build state too, so the fade plays with the cards in place
          // rather than on the empty frame before a first-visit tab is built.
          `${this._active}:${this._children ? 'ready' : 'pending'}`,
          html`<div class="content" id="silk-tabs-panel" role="tabpanel" aria-label=${panelLabel}>
            ${this._renderBody()}
          </div>`
        )}
      </ha-card>
    `;
  }

  static styles = [
    silkControlStyles,
    css`
      /* A container, not a card: it holds real cards, so it wears no chrome and
         grows with whatever the active tab renders. */
      :host {
        height: auto;
      }
      ha-card {
        height: auto;
        flex-direction: column;
        align-items: stretch;
        gap: 12px;
        padding: 0;
        overflow: visible;
        background: none;
        border: none;
        box-shadow: none;
        border-radius: 0;
        cursor: default;
      }
      .bar {
        flex: none;
        display: flex;
        align-items: center;
        gap: 8px;
        min-width: 0;
        overflow-x: auto;
        overscroll-behavior-x: contain;
        scrollbar-width: none;
        /* Negative margin buys room for focus rings without shifting the row. */
        padding: 3px;
        margin: -3px;
      }
      .bar::-webkit-scrollbar {
        display: none;
      }
      .tab {
        flex: 0 1 auto;
        min-width: 0;
        position: relative;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 6px;
        height: 36px;
        padding: 0 14px;
        font-size: 12.5px;
        transition:
          transform 250ms var(--silk-spring),
          background 150ms ease-out,
          color 150ms ease-out;
      }
      /* Invisible halo lifts the touch target past 40px without fattening the chip. */
      .tab::after {
        content: '';
        position: absolute;
        inset: -3px -2px;
        border-radius: 999px;
      }
      .tab:active {
        transform: scale(0.94);
        transition-duration: 120ms;
        transition-timing-function: var(--silk-ease-out);
      }
      .tab:focus-visible {
        outline: 2px solid color-mix(in srgb, var(--silk-accent) 70%, transparent);
        outline-offset: 2px;
      }
      .tab ha-icon {
        flex: none;
        --mdc-icon-size: 18px;
        pointer-events: none;
      }
      .tab .label {
        min-width: 0;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .content {
        display: flex;
        flex-direction: column;
        gap: 12px;
        min-width: 0;
        /* Opacity only — the incoming tab never animates its layout. */
        animation: silk-tabs-in 150ms var(--silk-ease-out) both;
      }
      .note {
        padding: 4px 2px;
        font-size: 13px;
        color: var(--secondary-text-color);
      }
      .note code {
        font-size: 12px;
      }
      @keyframes silk-tabs-in {
        from {
          opacity: 0;
        }
        to {
          opacity: 1;
        }
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    'silk-tabs-card': SilkTabsCard;
  }
}
