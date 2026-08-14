import { LitElement, html, css, nothing, TemplateResult } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { HomeAssistant, LovelaceCardConfig } from '../types';
import { silkControlStyles } from '../shared/base';
import { isActive, isUnavailable, haptic } from '../shared/service';
import { accentFor } from '../shared/color';
import { registerRowsEditor } from '../shared/rows';

export const META = {
  type: 'silk-navbar-card',
  name: 'Silk Navbar',
  description: 'A floating dock for your dashboards.',
};

export interface NavbarItemConfig {
  icon: string;
  label?: string;
  path: string;
  /** Shows an accent dot when active, or a tiny count chip when numeric > 0. */
  badge_entity?: string;
}

export interface SilkNavbarCardConfig extends LovelaceCardConfig {
  items: NavbarItemConfig[];
  show_labels?: boolean;
  /** Accent override for the active tint and badges. */
  color?: string;
}

const MAX_ITEMS = 6;

const EDITOR_TAG = 'silk-navbar-card-editor';

// Every destination is a row: the glyph, its label, where it goes and the
// entity that badges it. Nothing here needs YAML — the dock is a list of
// four scalars, so the editor is a plain repeater plus the two card options.
registerRowsEditor(EDITOR_TAG, {
  field: 'items',
  title: '메뉴 항목',
  addLabel: '항목 추가',
  blank: { icon: 'mdi:home', path: '/lovelace/0' },
  row: [
    { name: 'icon', label: '아이콘', selector: { icon: {} } },
    { name: 'label', label: '이름', selector: { text: {} } },
    { name: 'path', label: '이동 경로', selector: { text: {} } },
    { name: 'badge_entity', label: '배지 엔티티', selector: { entity: {} } },
  ],
  schema: [
    { name: 'show_labels', selector: { boolean: {} } },
    { name: 'color', selector: { ui_color: {} } },
  ],
  labels: { show_labels: '이름 표시', color: '강조 색상' },
  defaults: { show_labels: false },
});

@customElement('silk-navbar-card')
export class SilkNavbarCard extends LitElement {
  @property({ attribute: false }) public hass?: HomeAssistant;

  @state() private _config?: SilkNavbarCardConfig;

  /** Re-render on navigation so the active pill follows the URL. */
  private _onLocationChanged = (): void => {
    this.requestUpdate();
  };

  public static getStubConfig(): Partial<SilkNavbarCardConfig> {
    return {
      type: 'custom:silk-navbar-card',
      items: [{ icon: 'mdi:home', path: '/lovelace/0' }],
    };
  }

  public static async getConfigElement(): Promise<HTMLElement> {
    return document.createElement(EDITOR_TAG);
  }

  public setConfig(config: SilkNavbarCardConfig): void {
    if (!Array.isArray(config.items) || config.items.length === 0) {
      throw new Error('silk-navbar-card: `items` is required — 2-6 of {icon, path}');
    }
    if (config.items.length > MAX_ITEMS) {
      throw new Error(`silk-navbar-card: at most ${MAX_ITEMS} \`items\``);
    }
    config.items.forEach((item, i) => {
      if (!item || typeof item.icon !== 'string' || !item.icon) {
        throw new Error(`silk-navbar-card: items[${i}] needs an \`icon\``);
      }
      if (typeof item.path !== 'string' || !item.path) {
        throw new Error(`silk-navbar-card: items[${i}] needs a \`path\``);
      }
    });
    this._config = config;
  }

  public getCardSize(): number {
    return 1;
  }

  public getGridOptions(): Record<string, number> {
    return { columns: 12, rows: 1, min_columns: 6, min_rows: 1 };
  }

  public connectedCallback(): void {
    super.connectedCallback();
    window.addEventListener('location-changed', this._onLocationChanged);
    window.addEventListener('popstate', this._onLocationChanged);
  }

  public disconnectedCallback(): void {
    super.disconnectedCallback();
    window.removeEventListener('location-changed', this._onLocationChanged);
    window.removeEventListener('popstate', this._onLocationChanged);
  }

  private _isItemActive(path: string): boolean {
    const current = window.location.pathname;
    return current === path || current.endsWith(path);
  }

  private _onItemClick(ev: Event, path: string): void {
    ev.stopPropagation();
    haptic(this, 'selection');
    history.pushState(null, '', path);
    this.dispatchEvent(
      new CustomEvent('location-changed', {
        detail: { replace: false },
        bubbles: true,
        composed: true,
      })
    );
  }

  /** Badge for an item: accent dot when active, count chip when numeric > 0. */
  private _renderBadge(entityId?: string): TemplateResult | typeof nothing {
    if (!entityId) return nothing;
    const stateObj = this.hass?.states[entityId];
    if (!stateObj || isUnavailable(stateObj)) return nothing;
    const numeric = Number(stateObj.state);
    if (stateObj.state !== '' && Number.isFinite(numeric)) {
      if (numeric <= 0) return nothing;
      const count = Math.round(numeric);
      return html`<span class="count" aria-hidden="true">${count > 99 ? '99+' : count}</span>`;
    }
    return isActive(stateObj) ? html`<span class="dot" aria-hidden="true"></span>` : nothing;
  }

  private _renderItem(item: NavbarItemConfig): TemplateResult {
    const active = this._isItemActive(item.path);
    const showLabel = Boolean(this._config?.show_labels && item.label);
    return html`
      <button
        class="item ${active ? 'active' : ''}"
        aria-label=${item.label ?? item.path}
        aria-current=${active ? 'page' : nothing}
        @click=${(ev: Event) => this._onItemClick(ev, item.path)}
      >
        <span class="glyph">
          <ha-icon .icon=${item.icon}></ha-icon>
          ${this._renderBadge(item.badge_entity)}
        </span>
        ${showLabel ? html`<span class="label">${item.label}</span>` : nothing}
      </button>
    `;
  }

  protected render(): TemplateResult | typeof nothing {
    const config = this._config;
    if (!config) return nothing;
    const accent = accentFor(undefined, config.color);
    return html`
      <ha-card style="--silk-accent:${accent}">
        ${config.items.map((item) => this._renderItem(item))}
      </ha-card>
    `;
  }

  static styles = [
    silkControlStyles,
    css`
      ha-card {
        border-radius: 999px;
        padding: 6px;
        gap: 4px;
        cursor: default;
        justify-content: space-between;
      }
      .item {
        flex: 1 1 0;
        min-width: 0;
        height: 44px;
        border: none;
        border-radius: 999px;
        margin: 0;
        padding: 0;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 3px;
        cursor: pointer;
        font: inherit;
        color: var(--secondary-text-color);
        background: none;
        transition:
          transform 250ms var(--silk-spring),
          background 200ms ease,
          color 200ms ease;
      }
      .item:active {
        transform: scale(0.94);
        transition-duration: 120ms;
        transition-timing-function: var(--silk-ease-out);
      }
      .item:focus-visible {
        outline: 2px solid color-mix(in srgb, var(--silk-accent) 70%, transparent);
        outline-offset: -2px;
      }
      .item.active {
        color: var(--silk-accent);
        background: color-mix(in srgb, var(--silk-accent) 16%, transparent);
      }
      .glyph {
        position: relative;
        flex: none;
        display: grid;
        place-items: center;
        line-height: 0;
      }
      .glyph ha-icon {
        --mdc-icon-size: 22px;
        pointer-events: none;
      }
      .label {
        font-size: 10px;
        font-weight: 500;
        line-height: 1;
        max-width: calc(100% - 12px);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .dot {
        position: absolute;
        top: -1px;
        right: -4px;
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background: var(--silk-accent);
      }
      .count {
        position: absolute;
        top: -6px;
        left: 14px;
        min-width: 15px;
        height: 15px;
        padding: 0 4px;
        border-radius: 999px;
        box-sizing: border-box;
        background: var(--silk-accent);
        color: var(--text-primary-color, #fff);
        font-size: 9.5px;
        font-weight: 600;
        line-height: 15px;
        text-align: center;
        font-variant-numeric: tabular-nums;
        white-space: nowrap;
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    'silk-navbar-card': SilkNavbarCard;
  }
}
