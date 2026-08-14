import { LitElement, html, css, nothing, PropertyValues, TemplateResult } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { HomeAssistant, LovelaceCardConfig } from '../types';
import { silkControlStyles } from '../shared/base';
import { isActive, isUnavailable, moreInfo, haptic, stateText } from '../shared/service';
import { accentFor } from '../shared/color';
import {
  EntityItem,
  EntityListConfig,
  normalizeEntityList,
  entityIds,
  entityListSelector,
} from '../shared/list';
import { registerListEditor } from '../shared/listeditor';

export const META = {
  type: 'silk-counter-card',
  name: 'Silk Count',
  description: 'How many are on — tap to see which.',
};

export interface SilkCounterCardConfig extends LovelaceCardConfig {
  /** The entities to count across: bare ids, or {entity, name, icon} items. */
  entities: EntityListConfig;
  /** What the count means, e.g. 'Lights on'. */
  name: string;
  icon?: string;
  /** 'active' counts isActive() entities; 'state' matches `state` literally. */
  condition?: 'active' | 'state';
  /** Literal state to match when condition is 'state'. */
  state?: string;
  /** Accent override. */
  color?: string;
}

const DEFAULT_ICON = 'mdi:counter';
const ROW_HEIGHT = 40;
const DRAWER_PAD = 8;

const EDITOR_TAG = 'silk-counter-card-editor';

const LABELS: Record<string, string> = {
  entities: '셀 엔티티',
  name: '이름',
  icon: '아이콘',
  color: '강조 색상',
  condition: '조건',
  state: '상태 값',
};

/**
 * One schema, the picker always on screen. Lists reach the form as bare ids
 * and the picked ids are folded back into the stored list on change, so a
 * hand-written `{entity, name, icon}` entry keeps its detail as long as it
 * survives the edit — and `type`, `grid_options` and friends pass through
 * because the merge starts from the stored config.
 */
const EDITOR_SCHEMA = [
  entityListSelector('entities'),
  { name: 'name', required: true, selector: { text: {} } },
  {
    name: '',
    type: 'grid',
    schema: [
      { name: 'icon', selector: { icon: {} } },
      { name: 'color', selector: { ui_color: {} } },
    ],
  },
  {
    name: 'condition',
    selector: {
      select: {
        mode: 'dropdown',
        options: [
          { value: 'active', label: '켜짐/활성' },
          { value: 'state', label: '상태 값 일치' },
        ],
      },
    },
  },
  { name: 'state', selector: { text: {} } },
];

registerListEditor(EDITOR_TAG, {
  schema: EDITOR_SCHEMA,
  labels: LABELS,
  listFields: ['entities'],
});

@customElement('silk-counter-card')
export class SilkCounterCard extends LitElement {
  @property({ attribute: false }) public hass?: HomeAssistant;

  @state() private _config?: SilkCounterCardConfig;
  @state() private _expanded = false;

  public static getStubConfig(hass: HomeAssistant): Partial<SilkCounterCardConfig> {
    const lights = Object.keys(hass.states)
      .filter((id) => id.startsWith('light.'))
      .slice(0, 8);
    return {
      type: 'custom:silk-counter-card',
      entities: lights,
      name: 'Lights on',
      icon: 'mdi:lightbulb-group',
    };
  }

  public static async getConfigElement(): Promise<HTMLElement> {
    return document.createElement(EDITOR_TAG);
  }

  public setConfig(config: SilkCounterCardConfig): void {
    // Both shapes are accepted; anything the normalizer drops was never a valid
    // entity, and that still fails loudly rather than silently counting less.
    const items = normalizeEntityList(config.entities);
    if (
      !Array.isArray(config.entities) ||
      config.entities.length === 0 ||
      items.length !== config.entities.length
    ) {
      throw new Error(
        'silk-counter-card: `entities` must be a non-empty list of entity ids or {entity, name} items'
      );
    }
    if (!config.name) {
      throw new Error('silk-counter-card: `name` is required');
    }
    if (
      config.condition !== undefined &&
      config.condition !== 'active' &&
      config.condition !== 'state'
    ) {
      throw new Error("silk-counter-card: `condition` must be 'active' or 'state'");
    }
    if (config.condition === 'state' && typeof config.state !== 'string') {
      throw new Error("silk-counter-card: `state` is required when `condition: state`");
    }
    this._config = config;
    this._expanded = false;
  }

  public getCardSize(): number {
    const count = this._expanded ? this._matches().length : 0;
    return 1 + Math.ceil((count * ROW_HEIGHT) / 50);
  }

  public getGridOptions(): Record<string, number> {
    return { columns: 3, rows: 2, min_columns: 2, min_rows: 1 };
  }

  protected willUpdate(changed: PropertyValues): void {
    // Nothing left to list — fold the drawer instead of animating to nowhere.
    if (changed.has('hass') && this._expanded && this._matches().length === 0) {
      this._expanded = false;
    }
  }

  /** Configured entities that currently satisfy the condition. */
  private _matches(): EntityItem[] {
    const config = this._config;
    const hass = this.hass;
    if (!config || !hass) return [];
    return normalizeEntityList(config.entities).filter((item) => {
      const stateObj = hass.states[item.entity];
      if (!stateObj) return false;
      if (config.condition === 'state') return stateObj.state === config.state;
      return isActive(stateObj);
    });
  }

  private _onCardClick(): void {
    if (this._matches().length === 0) {
      this._expanded = false;
      return;
    }
    this._expanded = !this._expanded;
    haptic(this);
  }

  private _onRowClick(ev: Event, entityId: string): void {
    ev.stopPropagation();
    moreInfo(this, entityId);
  }

  protected render(): TemplateResult | typeof nothing {
    const config = this._config;
    const hass = this.hass;
    if (!config || !hass) return nothing;
    const ids = entityIds(config.entities);
    if (ids.every((id) => !hass.states[id])) {
      return html`
        <ha-card>
          <div class="warning">Entities not found: ${ids.join(', ')}</div>
        </ha-card>
      `;
    }

    const matches = this._matches();
    const count = matches.length;
    const total = ids.length;
    const allUnavailable = ids.every((id) => isUnavailable(hass.states[id]));
    const accent = accentFor(hass.states[ids[0]], config.color);
    const expandable = count > 0;
    const expanded = this._expanded && expandable;
    const drawerMax = expanded ? count * ROW_HEIGHT + DRAWER_PAD : 0;

    return html`
      <ha-card
        class="control ${allUnavailable ? 'unavailable' : ''} ${expanded ? 'expanded' : ''}"
        style="--silk-accent:${accent}"
        role="button"
        aria-expanded=${expanded ? 'true' : 'false'}
        @click=${this._onCardClick}
      >
        <div class="head">
          <div class="icon ${count > 0 ? 'on' : ''}">
            <ha-icon .icon=${config.icon ?? DEFAULT_ICON}></ha-icon>
          </div>
          <div class="info">
            <div class="name">${config.name}</div>
            <div class="state">${count}/${total} total</div>
          </div>
          <div class="trailing">
            <span class="count ${count > 0 ? 'nonzero' : ''}">${count}</span>
            <ha-icon
              class="chev ${expandable ? '' : 'hidden'}"
              icon="mdi:chevron-down"
            ></ha-icon>
          </div>
        </div>
        <div class="drawer" style="max-height:${drawerMax}px">
          <div class="rows">
            ${matches.map((item) => {
              const stateObj = hass.states[item.entity];
              // Per-item detail wins over the entity's own name and icon.
              const rowName = item.name ?? stateObj.attributes.friendly_name ?? item.entity;
              return html`
                <button
                  class="row"
                  style=${item.color ? `--silk-accent:${item.color}` : nothing}
                  @click=${(ev: Event) => this._onRowClick(ev, item.entity)}
                >
                  ${item.icon
                    ? html`<ha-icon .icon=${item.icon}></ha-icon>`
                    : html`<ha-state-icon .hass=${hass} .stateObj=${stateObj}></ha-state-icon>`}
                  <span class="row-name">${rowName}</span>
                  <span class="row-state">${stateText(hass, stateObj)}</span>
                </button>
              `;
            })}
          </div>
        </div>
      </ha-card>
    `;
  }

  static styles = [
    silkControlStyles,
    css`
      /* The card may outgrow its grid cell while the drawer is open. */
      ha-card {
        height: auto;
        min-height: 100%;
        flex-direction: column;
        align-items: stretch;
        justify-content: center;
        gap: 0;
      }
      .head {
        display: flex;
        align-items: center;
        gap: 12px;
        min-width: 0;
      }
      /* The whole card is the expand control; the icon presses with it. */
      .icon {
        cursor: pointer;
      }
      .icon:active {
        transform: none;
      }
      .count {
        font-size: 26px;
        font-weight: 700;
        letter-spacing: -0.02em;
        line-height: 1;
        color: var(--secondary-text-color);
        font-variant-numeric: tabular-nums;
        transition: color 200ms ease;
      }
      .count.nonzero {
        color: var(--silk-accent);
      }
      .chev {
        --mdc-icon-size: 20px;
        color: var(--secondary-text-color);
        opacity: 0.7;
        transition:
          transform 200ms var(--silk-ease-out),
          opacity 200ms ease;
      }
      .chev.hidden {
        opacity: 0;
      }
      .expanded .chev {
        transform: rotate(180deg);
      }
      .drawer {
        overflow: hidden;
        visibility: hidden;
        transition:
          max-height 250ms ease-out,
          visibility 0s linear 250ms;
      }
      .expanded .drawer {
        visibility: visible;
        transition: max-height 250ms ease-out;
      }
      .rows {
        display: flex;
        flex-direction: column;
        padding-top: ${DRAWER_PAD}px;
      }
      .row {
        display: flex;
        align-items: center;
        gap: 10px;
        width: 100%;
        height: ${ROW_HEIGHT}px;
        border: none;
        background: none;
        margin: 0;
        padding: 0 4px;
        border-radius: 10px;
        cursor: pointer;
        font: inherit;
        text-align: left;
        color: inherit;
        transition: background 150ms ease-out;
      }
      .row:hover {
        background: rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.05);
      }
      .row ha-state-icon,
      .row ha-icon {
        flex: none;
        --mdc-icon-size: 18px;
        color: var(--silk-accent);
        pointer-events: none;
      }
      .row-name {
        flex: 1;
        min-width: 0;
        font-size: 13px;
        font-weight: 500;
        color: var(--primary-text-color);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .row-state {
        flex: none;
        max-width: 40%;
        font-size: 12px;
        color: var(--secondary-text-color);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        font-variant-numeric: tabular-nums;
      }
      .unavailable .head {
        opacity: 0.45;
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    'silk-counter-card': SilkCounterCard;
  }
}
