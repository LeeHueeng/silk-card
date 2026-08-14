import { LitElement, html, css, nothing, PropertyValues, TemplateResult } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { HomeAssistant, LovelaceCardConfig } from '../types';
import { silkControlStyles } from '../shared/base';
import { domainOf, isUnavailable, moreInfo, haptic } from '../shared/service';
import { accentFor } from '../shared/color';
import { registerEditor } from '../shared/editor';

export const META = {
  type: 'silk-todo-card',
  name: 'Silk To-do',
  description: 'Check things off without leaving the dashboard.',
};

export interface SilkTodoCardConfig extends LovelaceCardConfig {
  entity: string;
  name?: string;
  icon?: string;
  /** Max rows to show (default 5). */
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

const DEFAULT_LIMIT = 5;
const EDITOR_TAG = 'silk-todo-card-editor';

registerEditor(
  EDITOR_TAG,
  [
    { name: 'entity', required: true, selector: { entity: { domain: ['todo'] } } },
    { name: 'name', selector: { text: {} } },
    {
      name: '',
      type: 'grid',
      schema: [
        { name: 'icon', selector: { icon: {} } },
        { name: 'limit', selector: { number: { min: 1, max: 15, mode: 'box' } } },
      ],
    },
  ],
  { entity: '엔티티', name: '이름', icon: '아이콘', limit: '표시 개수' },
  { limit: DEFAULT_LIMIT }
);

@customElement('silk-todo-card')
export class SilkTodoCard extends LitElement {
  @property({ attribute: false }) public hass?: HomeAssistant;

  @state() private _config?: SilkTodoCardConfig;

  /** Items sorted open-first at fetch time; undefined until the first load. */
  @state() private _items?: TodoItem[];

  /** last_updated of the entity the current items were fetched for. */
  private _fetchedFor = '';
  /** Monotonic token so a stale fetch can never clobber a newer one. */
  private _fetchEpoch = 0;

  public static getStubConfig(hass: HomeAssistant): Partial<SilkTodoCardConfig> {
    const entity = Object.keys(hass.states).find((id) => id.startsWith('todo.'));
    return { type: 'custom:silk-todo-card', entity };
  }

  public static async getConfigElement(): Promise<HTMLElement> {
    return document.createElement(EDITOR_TAG);
  }

  public setConfig(config: SilkTodoCardConfig): void {
    if (!config.entity || domainOf(config.entity) !== 'todo') {
      throw new Error('silk-todo-card: `entity` must be a todo entity');
    }
    this._config = config;
    this._items = undefined;
    this._fetchedFor = '';
  }

  public getCardSize(): number {
    const limit = this._config?.limit ?? DEFAULT_LIMIT;
    return Math.max(2, Math.ceil((limit + 2) / 2));
  }

  public getGridOptions(): Record<string, number> {
    return { columns: 6, rows: 2, min_columns: 3, min_rows: 2 };
  }

  public connectedCallback(): void {
    super.connectedCallback();
    // Re-sync whenever the card (re)attaches — the list may have changed while
    // we were off-screen without the entity state moving.
    this._fetchedFor = '';
    if (this.hass && this._config) void this._fetchItems();
  }

  protected willUpdate(changed: PropertyValues): void {
    if (!changed.has('hass') && !changed.has('_config')) return;
    const stateObj = this.hass?.states[this._config?.entity ?? ''];
    if (stateObj && !isUnavailable(stateObj) && stateObj.last_updated !== this._fetchedFor) {
      void this._fetchItems();
    }
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
      const items = resp.items ?? [];
      // Open items first, server order preserved within each group. Sorting at
      // fetch time (not render) keeps rows in place during optimistic toggles.
      this._items = [
        ...items.filter((i) => i.status !== 'completed'),
        ...items.filter((i) => i.status === 'completed'),
      ];
    } catch {
      // Keep whatever we had; a later state change or reconnect will retry.
      if (epoch === this._fetchEpoch) this._fetchedFor = '';
    }
  }

  private _onCardClick(): void {
    if (this._config) moreInfo(this, this._config.entity);
  }

  private _onItemClick(ev: Event, item: TodoItem): void {
    ev.stopPropagation();
    const hass = this.hass;
    const config = this._config;
    if (!hass || !config || !this._items) return;
    if (isUnavailable(hass.states[config.entity])) return;
    const newStatus: TodoItem['status'] =
      item.status === 'completed' ? 'needs_action' : 'completed';
    haptic(this);
    // Optimistic: strike through in place immediately; the service call bumps
    // the entity's last_updated, and the refetch reconciles order and truth.
    this._items = this._items.map((i) => (i.uid === item.uid ? { ...i, status: newStatus } : i));
    hass
      .callService('todo', 'update_item', {
        entity_id: config.entity,
        item: item.uid,
        status: newStatus,
      })
      .catch(() => {
        this._items = this._items?.map((i) =>
          i.uid === item.uid ? { ...i, status: item.status } : i
        );
      });
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
    const accent = accentFor(stateObj);
    const name = config.name ?? stateObj.attributes.friendly_name ?? config.entity;
    const limit = Math.max(1, config.limit ?? DEFAULT_LIMIT);

    const items = this._items;
    const shown = items?.slice(0, limit) ?? [];
    const overflow = items ? items.length - shown.length : 0;
    const stateCount = Number(stateObj.state);
    const openCount = items
      ? items.filter((i) => i.status !== 'completed').length
      : Number.isFinite(stateCount)
        ? stateCount
        : 0;

    return html`
      <ha-card
        class="control ${unavailable ? 'unavailable' : ''}"
        style="--silk-accent:${accent}"
        @click=${this._onCardClick}
      >
        <div class="header">
          <div class="icon ${openCount > 0 ? 'on' : ''}">
            ${config.icon
              ? html`<ha-icon .icon=${config.icon}></ha-icon>`
              : html`<ha-state-icon .hass=${hass} .stateObj=${stateObj}></ha-state-icon>`}
          </div>
          <div class="info">
            <div class="name">${name}</div>
          </div>
          ${openCount > 0
            ? html`<div class="trailing"><span class="count">${openCount}</span></div>`
            : nothing}
        </div>
        <div class="list">
          ${shown.map((item) => {
            const done = item.status === 'completed';
            return html`
              <button
                class="row ${done ? 'done' : ''}"
                role="checkbox"
                aria-checked=${done ? 'true' : 'false'}
                title=${item.summary}
                .disabled=${unavailable}
                @click=${(ev: Event) => this._onItemClick(ev, item)}
              >
                <span class="check">
                  ${done ? html`<ha-icon icon="mdi:check"></ha-icon>` : nothing}
                </span>
                <span class="summary">${item.summary}</span>
              </button>
            `;
          })}
          ${items && items.length === 0
            ? html`
                <div class="empty">
                  <ha-icon icon="mdi:check-circle-outline"></ha-icon>
                  <span>Nothing to do</span>
                </div>
              `
            : nothing}
          ${overflow > 0 ? html`<div class="more">+${overflow} more</div>` : nothing}
        </div>
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
        gap: 4px;
      }
      .header {
        display: flex;
        align-items: center;
        gap: 12px;
        min-width: 0;
      }
      .count {
        font-size: 11px;
        font-weight: 600;
        letter-spacing: 0.02em;
        padding: 3px 8px;
        border-radius: 999px;
        color: var(--silk-accent);
        background: color-mix(in srgb, var(--silk-accent) 16%, transparent);
        font-variant-numeric: tabular-nums;
      }
      .list {
        display: flex;
        flex-direction: column;
        min-height: 0;
        overflow: hidden;
      }
      .row {
        display: flex;
        align-items: center;
        gap: 10px;
        width: 100%;
        min-height: 36px;
        padding: 2px 0;
        margin: 0;
        border: none;
        background: none;
        font: inherit;
        color: var(--primary-text-color);
        text-align: left;
        cursor: pointer;
      }
      .row:disabled {
        cursor: default;
      }
      .check {
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
      .row:active:not(:disabled) .check {
        transform: scale(0.85);
        transition-duration: 120ms;
        transition-timing-function: var(--silk-ease-out);
      }
      .row.done .check {
        background: var(--silk-accent);
        border-color: var(--silk-accent);
      }
      .check ha-icon {
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
      .row:focus-visible .check {
        outline: 2px solid color-mix(in srgb, var(--silk-accent) 70%, transparent);
        outline-offset: 2px;
      }
      .more {
        font-size: 12px;
        line-height: 1.3;
        color: var(--secondary-text-color);
        padding: 4px 0 0 30px;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
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
      .unavailable .list {
        opacity: 0.45;
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    'silk-todo-card': SilkTodoCard;
  }
}
