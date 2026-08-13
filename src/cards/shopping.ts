import { LitElement, html, css, nothing, PropertyValues, TemplateResult } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { HomeAssistant, LovelaceCardConfig } from '../types';
import { silkControlStyles } from '../shared/base';
import { domainOf, isUnavailable, moreInfo, haptic } from '../shared/service';
import { accentFor } from '../shared/color';
import { registerEditor } from '../shared/editor';

export const META = {
  type: 'silk-shopping-card',
  name: 'Silk Shopping',
  description: 'Add it before you forget it.',
};

export interface SilkShoppingCardConfig extends LovelaceCardConfig {
  entity: string;
  name?: string;
  /** Open rows shown (default 8). */
  limit?: number;
}

/** Shape returned by the `todo/item/list` WS command (types.ts stays generic). */
interface TodoItem {
  uid: string;
  summary: string;
  status: 'needs_action' | 'completed';
}

interface TodoItemListResponse {
  items: TodoItem[];
}

/** A row typed here but not yet confirmed by the server. */
interface PendingItem {
  key: number;
  summary: string;
}

const DEFAULT_LIMIT = 8;
const MAX_LIMIT = 30;
/** How long a checked row stays struck through before it leaves the list. */
const STRIKE_MS = 400;
/** Press-and-hold that opens the delete confirm. */
const HOLD_MS = 500;
/** The confirm chip withdraws itself if it is ignored. */
const CONFIRM_TTL_MS = 5000;
const PLACEHOLDER = 'Add an item';

const EDITOR_TAG = 'silk-shopping-card-editor';

registerEditor(
  EDITOR_TAG,
  [
    { name: 'entity', required: true, selector: { entity: { domain: ['todo'] } } },
    { name: 'name', selector: { text: {} } },
    { name: 'limit', selector: { number: { min: 1, max: MAX_LIMIT, mode: 'box' } } },
  ],
  { entity: 'Entity', name: 'Name', limit: 'Rows shown' },
  { limit: DEFAULT_LIMIT }
);

/**
 * A shopping list you can actually shop with: type at the top, tick things off
 * as you drop them in the basket. A checked row strikes through, then leaves —
 * the optimistic edit lands before the round trip does. Press and hold a row to
 * uncover the delete confirm; nothing destructive happens on a plain tap.
 */
@customElement('silk-shopping-card')
export class SilkShoppingCard extends LitElement {
  @property({ attribute: false }) public hass?: HomeAssistant;

  @state() private _config?: SilkShoppingCardConfig;

  /** Open items from the server; undefined until the first load. */
  @state() private _items?: TodoItem[];

  /** Rows typed here, still waiting to appear in a fetch. */
  @state() private _pending: PendingItem[] = [];

  /** uids struck through while their completion is in flight. */
  @state() private _striking: Record<string, true> = {};

  /** uid whose delete confirm chip is showing. */
  @state() private _confirmUid?: string;

  /** Mirrors the input so the add button can go accent the moment you type. */
  @state() private _text = '';

  /** Inline note when the list could not be read or written. */
  @state() private _note?: string;

  /** last_updated the current items were fetched for. */
  private _fetchedFor = '';
  /** Monotonic token so a stale fetch can never clobber a newer one. */
  private _fetchEpoch = 0;
  private _pendingKey = 0;
  private _holdTimer?: number;
  private _confirmTimer?: number;
  private _noteTimer?: number;
  private _strikeTimers: Record<string, number> = {};
  /** Set by a completed hold so the click it releases is not also a toggle. */
  private _heldFired = false;

  public static getStubConfig(hass: HomeAssistant): Partial<SilkShoppingCardConfig> {
    const ids = Object.keys(hass.states).filter((id) => id.startsWith('todo.'));
    const shopping = ids.find((id) => /shopping|grocer|market/i.test(id));
    return { type: 'custom:silk-shopping-card', entity: shopping ?? ids[0] };
  }

  public static async getConfigElement(): Promise<HTMLElement> {
    return document.createElement(EDITOR_TAG);
  }

  public setConfig(config: SilkShoppingCardConfig): void {
    if (!config.entity || domainOf(config.entity) !== 'todo') {
      throw new Error('silk-shopping-card: `entity` must be a todo entity');
    }
    if (
      config.limit !== undefined &&
      (!Number.isFinite(Number(config.limit)) || Number(config.limit) < 1)
    ) {
      throw new Error('silk-shopping-card: `limit` must be a number of at least 1');
    }
    this._config = config;
    this._items = undefined;
    this._pending = [];
    this._fetchedFor = '';
  }

  public getCardSize(): number {
    return Math.max(3, Math.ceil((this._limit() + 3) / 2));
  }

  public getGridOptions(): Record<string, number> {
    return { columns: 6, rows: 3, min_columns: 4, min_rows: 2 };
  }

  public connectedCallback(): void {
    super.connectedCallback();
    // Re-sync on (re)attach — the list may have changed while we were away
    // without the entity state moving in a way we saw.
    this._fetchedFor = '';
    if (this.hass && this._config) void this._fetchItems();
  }

  public disconnectedCallback(): void {
    super.disconnectedCallback();
    window.clearTimeout(this._holdTimer);
    window.clearTimeout(this._confirmTimer);
    window.clearTimeout(this._noteTimer);
    for (const timer of Object.values(this._strikeTimers)) window.clearTimeout(timer);
    this._strikeTimers = {};
    this._holdTimer = undefined;
    this._confirmTimer = undefined;
    this._noteTimer = undefined;
  }

  protected willUpdate(changed: PropertyValues): void {
    if (!changed.has('hass') && !changed.has('_config')) return;
    const stateObj = this.hass?.states[this._config?.entity ?? ''];
    if (stateObj && !isUnavailable(stateObj) && stateObj.last_updated !== this._fetchedFor) {
      void this._fetchItems();
    }
  }

  private _limit(): number {
    return Math.max(1, Math.floor(Number(this._config?.limit ?? DEFAULT_LIMIT)));
  }

  private _inputEl(): HTMLInputElement | null {
    return this.renderRoot.querySelector<HTMLInputElement>('.q');
  }

  private _showNote(text: string): void {
    this._note = text;
    window.clearTimeout(this._noteTimer);
    this._noteTimer = window.setTimeout(() => {
      this._noteTimer = undefined;
      this._note = undefined;
    }, CONFIRM_TTL_MS);
  }

  private async _fetchItems(): Promise<void> {
    const hass = this.hass;
    const config = this._config;
    if (!hass || !config) return;
    const stateObj = hass.states[config.entity];
    if (!stateObj || isUnavailable(stateObj)) return;
    this._fetchedFor = stateObj.last_updated;
    const epoch = ++this._fetchEpoch;
    try {
      const resp = await hass.callWS<TodoItemListResponse>({
        type: 'todo/item/list',
        entity_id: config.entity,
      });
      if (epoch !== this._fetchEpoch) return;
      const open = (resp.items ?? []).filter((item) => item.status !== 'completed');
      this._items = this._withStrikes(open);
      this._note = undefined;
      // A typed row stops being "pending" the moment the server reports it.
      const seen = new Set(open.map((item) => item.summary.trim().toLowerCase()));
      if (this._pending.length) {
        this._pending = this._pending.filter((p) => !seen.has(p.summary.trim().toLowerCase()));
      }
    } catch (err) {
      console.warn('silk-shopping-card: list fetch failed', err);
      if (epoch !== this._fetchEpoch) return;
      // Keep whatever we had; a later state change or reattach retries.
      this._fetchedFor = '';
      if (this._items === undefined) this._showNote('Could not read the list');
    }
  }

  /**
   * The server drops a ticked item the instant it is completed, which can beat
   * the 400ms strike-through. Rows still being struck are put back where they
   * were so the line is actually read before the row leaves.
   */
  private _withStrikes(open: TodoItem[]): TodoItem[] {
    const previous = this._items;
    if (!previous) return open;
    const live = new Set(open.map((item) => item.uid));
    const merged = [...open];
    previous.forEach((item, index) => {
      if (!this._striking[item.uid] || live.has(item.uid)) return;
      merged.splice(Math.min(index, merged.length), 0, item);
    });
    return merged;
  }

  private _onCardClick(): void {
    if (this._config) moreInfo(this, this._config.entity);
  }

  private _onInput(ev: Event): void {
    this._text = (ev.target as HTMLInputElement).value;
  }

  private _onKeydown(ev: KeyboardEvent): void {
    if (ev.key === 'Enter') {
      ev.preventDefault();
      void this._add();
    } else if (ev.key === 'Escape') {
      ev.preventDefault();
      ev.stopPropagation();
      const input = this._inputEl();
      if (input) input.value = '';
      this._text = '';
    }
  }

  private _onAddClick(ev: Event): void {
    ev.stopPropagation();
    void this._add();
  }

  private async _add(): Promise<void> {
    const hass = this.hass;
    const config = this._config;
    if (!hass || !config) return;
    if (isUnavailable(hass.states[config.entity])) return;
    const input = this._inputEl();
    const summary = (input?.value ?? '').trim();
    if (!summary) return;

    haptic(this);
    // Optimistic: the row appears and the field empties before the round trip,
    // so the next item can be typed straight away.
    const key = ++this._pendingKey;
    this._pending = [...this._pending, { key, summary }];
    this._text = '';
    if (input) input.value = '';

    try {
      await hass.callService('todo', 'add_item', { entity_id: config.entity, item: summary });
    } catch (err) {
      console.warn('silk-shopping-card: add failed', err);
      this._pending = this._pending.filter((p) => p.key !== key);
      this._showNote(`Could not add "${summary}"`);
    }
  }

  private _onRowClick(ev: Event, item: TodoItem): void {
    ev.stopPropagation();
    if (this._heldFired) {
      // This click is the tail of a press-and-hold; the confirm is already up.
      this._heldFired = false;
      return;
    }
    if (this._confirmUid !== undefined) {
      // Any tap while a confirm is showing puts the safety back on.
      this._closeConfirm();
      return;
    }
    void this._complete(item);
  }

  private async _complete(item: TodoItem): Promise<void> {
    const hass = this.hass;
    const config = this._config;
    if (!hass || !config) return;
    if (isUnavailable(hass.states[config.entity])) return;
    if (this._striking[item.uid]) return;
    haptic(this);
    // Optimistic: strike it through now, drop the row once the line has been
    // read. The refetch that follows the service call is the source of truth.
    this._striking = { ...this._striking, [item.uid]: true };
    window.clearTimeout(this._strikeTimers[item.uid]);
    this._strikeTimers[item.uid] = window.setTimeout(() => {
      delete this._strikeTimers[item.uid];
      this._items = this._items?.filter((i) => i.uid !== item.uid);
      this._forget(item.uid);
    }, STRIKE_MS);

    try {
      await hass.callService('todo', 'update_item', {
        entity_id: config.entity,
        item: item.uid,
        status: 'completed',
      });
    } catch (err) {
      console.warn('silk-shopping-card: complete failed', err);
      window.clearTimeout(this._strikeTimers[item.uid]);
      delete this._strikeTimers[item.uid];
      this._forget(item.uid);
      this._showNote(`Could not tick off "${item.summary}"`);
    }
  }

  /** Drop the strike-through flag for one uid. */
  private _forget(uid: string): void {
    if (!this._striking[uid]) return;
    const next = { ...this._striking };
    delete next[uid];
    this._striking = next;
  }

  private _onHoldStart(ev: PointerEvent, item: TodoItem): void {
    ev.stopPropagation();
    if (ev.button !== undefined && ev.button > 0) return;
    if (this._striking[item.uid]) return;
    // A hold that ends off the row never releases a click, so the flag is
    // cleared here rather than trusting the click that may never come.
    this._heldFired = false;
    window.clearTimeout(this._holdTimer);
    this._holdTimer = window.setTimeout(() => {
      this._holdTimer = undefined;
      this._heldFired = true;
      haptic(this, 'medium');
      this._openConfirm(item.uid);
    }, HOLD_MS);
  }

  private _onHoldEnd(): void {
    window.clearTimeout(this._holdTimer);
    this._holdTimer = undefined;
  }

  private _openConfirm(uid: string): void {
    this._confirmUid = uid;
    window.clearTimeout(this._confirmTimer);
    this._confirmTimer = window.setTimeout(() => {
      this._confirmTimer = undefined;
      this._confirmUid = undefined;
    }, CONFIRM_TTL_MS);
  }

  private _closeConfirm(): void {
    window.clearTimeout(this._confirmTimer);
    this._confirmTimer = undefined;
    this._confirmUid = undefined;
  }

  private async _onDeleteClick(ev: Event, item: TodoItem): Promise<void> {
    ev.stopPropagation();
    const hass = this.hass;
    const config = this._config;
    if (!hass || !config) return;
    this._closeConfirm();
    haptic(this, 'heavy');
    // Optimistic removal: a delete the user just confirmed should not linger.
    const before = this._items;
    this._items = this._items?.filter((i) => i.uid !== item.uid);
    try {
      await hass.callService('todo', 'remove_item', {
        entity_id: config.entity,
        item: item.uid,
      });
    } catch (err) {
      console.warn('silk-shopping-card: remove failed', err);
      this._items = before;
      this._showNote(`Could not remove "${item.summary}"`);
    }
  }

  private _renderRow(item: TodoItem, disabled: boolean): TemplateResult {
    const striking = Boolean(this._striking[item.uid]);
    const confirming = this._confirmUid === item.uid;
    return html`
      <div class="row ${striking ? 'done' : ''}">
        <button
          class="tick"
          role="checkbox"
          aria-checked=${striking ? 'true' : 'false'}
          aria-label=${item.summary}
          title=${item.summary}
          ?disabled=${disabled}
          @click=${(ev: Event) => this._onRowClick(ev, item)}
          @pointerdown=${(ev: PointerEvent) => this._onHoldStart(ev, item)}
          @pointerup=${this._onHoldEnd}
          @pointerleave=${this._onHoldEnd}
          @pointercancel=${this._onHoldEnd}
        >
          <span class="box">${striking ? html`<ha-icon icon="mdi:check"></ha-icon>` : nothing}</span>
          <span class="summary">${item.summary}</span>
        </button>
        ${confirming
          ? html`
              <button
                class="del"
                aria-label=${`Delete ${item.summary}`}
                @click=${(ev: Event) => void this._onDeleteClick(ev, item)}
              >
                Delete
              </button>
            `
          : nothing}
      </div>
    `;
  }

  private _renderPending(pending: PendingItem): TemplateResult {
    return html`
      <div class="row pending">
        <span class="tick static">
          <span class="box"></span>
          <span class="summary">${pending.summary}</span>
        </span>
      </div>
    `;
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
    const limit = this._limit();
    const items = this._items ?? [];
    // Struck-through rows are on their way out but still count as open until
    // they actually leave, so the chip never jumps ahead of the list.
    const shown = items.slice(0, limit);
    const pendingRoom = Math.max(0, limit - shown.length);
    const pendingShown = this._pending.slice(0, pendingRoom);
    const openCount = items.length + this._pending.length;
    const overflow = openCount - shown.length - pendingShown.length;

    return html`
      <ha-card
        class="control ${unavailable ? 'unavailable' : ''}"
        style="--silk-accent:${accent}"
        @click=${this._onCardClick}
      >
        <div class="head">
          <div class="hname">${name}</div>
          ${openCount > 0 ? html`<span class="count">${openCount}</span>` : nothing}
        </div>
        <div class="compose">
          <div class="field">
            <input
              class="q"
              type="text"
              autocomplete="off"
              autocapitalize="sentences"
              spellcheck="false"
              enterkeyhint="done"
              .placeholder=${PLACEHOLDER}
              .disabled=${unavailable}
              aria-label=${`Add to ${name}`}
              @input=${this._onInput}
              @keydown=${this._onKeydown}
              @click=${(ev: Event) => ev.stopPropagation()}
            />
          </div>
          <button
            class="add ${this._text.trim() ? 'on' : ''}"
            aria-label="Add item"
            .disabled=${unavailable || this._text.trim() === ''}
            @click=${this._onAddClick}
          >
            <ha-icon icon="mdi:plus"></ha-icon>
          </button>
        </div>
        <div class="list">
          ${shown.map((item) => this._renderRow(item, unavailable))}
          ${pendingShown.map((pending) => this._renderPending(pending))}
          ${this._items !== undefined && openCount === 0
            ? html`
                <div class="empty">
                  <ha-icon icon="mdi:cart-outline"></ha-icon>
                  <span>Nothing on the list</span>
                </div>
              `
            : nothing}
          ${overflow > 0 ? html`<div class="more">+${overflow} more</div>` : nothing}
        </div>
        ${this._note ? html`<div class="note">${this._note}</div>` : nothing}
      </ha-card>
    `;
  }

  static styles = [
    silkControlStyles,
    css`
      ha-card {
        flex-direction: column;
        align-items: stretch;
        justify-content: flex-start;
        gap: 8px;
      }
      .head {
        flex: none;
        display: flex;
        align-items: center;
        gap: 8px;
        min-width: 0;
      }
      .hname {
        flex: 1;
        min-width: 0;
        font-size: 14px;
        font-weight: 500;
        line-height: 1.3;
        color: var(--primary-text-color);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .count {
        flex: none;
        font-size: 11px;
        font-weight: 600;
        letter-spacing: 0.02em;
        line-height: 1;
        padding: 4px 8px;
        border-radius: 999px;
        color: var(--silk-accent);
        background: color-mix(in srgb, var(--silk-accent) 16%, transparent);
        font-variant-numeric: tabular-nums;
      }
      .compose {
        flex: none;
        display: flex;
        align-items: center;
        gap: 6px;
      }
      .field {
        flex: 1;
        min-width: 0;
        display: flex;
        align-items: center;
        height: 36px;
        padding: 0 12px;
        box-sizing: border-box;
        border-radius: 12px;
        background: rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.06);
        transition: box-shadow 150ms var(--silk-ease-out);
      }
      .field:focus-within {
        box-shadow: inset 0 0 0 2px var(--silk-accent);
      }
      .q {
        flex: 1;
        min-width: 0;
        border: none;
        outline: none;
        background: none;
        padding: 0;
        font: inherit;
        font-size: 13.5px;
        line-height: 1.3;
        color: var(--primary-text-color);
      }
      .q::placeholder {
        color: var(--secondary-text-color);
        opacity: 0.8;
      }
      .q:disabled {
        opacity: 0.45;
      }
      .add {
        flex: none;
        width: 36px;
        height: 36px;
        display: grid;
        place-items: center;
        padding: 0;
        border: none;
        border-radius: 12px;
        cursor: pointer;
        color: var(--secondary-text-color);
        background: rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.06);
        transition:
          transform 250ms var(--silk-spring),
          background 200ms ease,
          color 200ms ease;
      }
      .add:active:not(:disabled) {
        transform: scale(0.92);
        transition-duration: 120ms;
        transition-timing-function: var(--silk-ease-out);
      }
      .add.on {
        color: var(--silk-accent);
        background: color-mix(in srgb, var(--silk-accent) 16%, transparent);
      }
      .add:disabled {
        cursor: default;
      }
      .add:focus-visible {
        outline: 2px solid color-mix(in srgb, var(--silk-accent) 70%, transparent);
        outline-offset: 2px;
      }
      .add ha-icon {
        --mdc-icon-size: 20px;
        pointer-events: none;
        display: flex;
      }
      .list {
        flex: 1 1 auto;
        min-height: 0;
        overflow-y: auto;
        display: flex;
        flex-direction: column;
      }
      .row {
        display: flex;
        align-items: center;
        gap: 6px;
        min-width: 0;
      }
      .tick {
        flex: 1;
        display: flex;
        align-items: center;
        gap: 10px;
        min-width: 0;
        min-height: 36px;
        margin: 0;
        padding: 2px 0;
        border: none;
        background: none;
        font: inherit;
        color: var(--primary-text-color);
        text-align: left;
        cursor: pointer;
        -webkit-tap-highlight-color: transparent;
        touch-action: manipulation;
      }
      .tick.static,
      .tick:disabled {
        cursor: default;
      }
      .box {
        flex: none;
        width: 20px;
        height: 20px;
        box-sizing: border-box;
        border-radius: 50%;
        border: 2px solid rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.3);
        display: grid;
        place-items: center;
        transition:
          transform 250ms var(--silk-spring),
          background 200ms ease,
          border-color 200ms ease;
      }
      .tick:active:not(:disabled) .box {
        transform: scale(0.85);
        transition-duration: 120ms;
        transition-timing-function: var(--silk-ease-out);
      }
      .row.done .box {
        background: var(--silk-accent);
        border-color: var(--silk-accent);
      }
      .box ha-icon {
        --mdc-icon-size: 14px;
        color: #fff;
        display: flex;
        pointer-events: none;
      }
      .summary {
        flex: 1;
        min-width: 0;
        font-size: 13.5px;
        line-height: 1.3;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        transition: opacity 200ms ease;
      }
      .row.done .summary {
        text-decoration: line-through;
        opacity: 0.45;
      }
      .row.pending .summary {
        opacity: 0.55;
      }
      .tick:focus-visible {
        outline: none;
      }
      .tick:focus-visible .box {
        outline: 2px solid color-mix(in srgb, var(--silk-accent) 70%, transparent);
        outline-offset: 2px;
      }
      /* Destructive confirm: error color here is real status, not decoration. */
      .del {
        flex: none;
        border: none;
        font: inherit;
        font-size: 11px;
        font-weight: 600;
        line-height: 1;
        padding: 7px 10px;
        border-radius: 999px;
        cursor: pointer;
        color: var(--error-color, #db4437);
        background: color-mix(in srgb, var(--error-color, #db4437) 14%, transparent);
        animation: silk-shopping-in 200ms var(--silk-ease-out);
        transition: transform 250ms var(--silk-spring);
      }
      .del:active {
        transform: scale(0.92);
        transition-duration: 120ms;
        transition-timing-function: var(--silk-ease-out);
      }
      .del:focus-visible {
        outline: 2px solid color-mix(in srgb, var(--error-color, #db4437) 70%, transparent);
        outline-offset: 2px;
      }
      .empty {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 8px 0 4px;
        font-size: 13px;
        color: var(--secondary-text-color);
      }
      .empty ha-icon {
        --mdc-icon-size: 18px;
        opacity: 0.7;
      }
      .more {
        font-size: 12px;
        line-height: 1.3;
        color: var(--secondary-text-color);
        font-variant-numeric: tabular-nums;
        padding: 4px 0 0 30px;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .note {
        flex: none;
        font-size: 12px;
        line-height: 1.3;
        color: var(--secondary-text-color);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .unavailable .list,
      .unavailable .compose {
        opacity: 0.45;
      }
      @keyframes silk-shopping-in {
        from {
          opacity: 0;
          transform: scale(0.9);
        }
        to {
          opacity: 1;
          transform: scale(1);
        }
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    'silk-shopping-card': SilkShoppingCard;
  }
}
