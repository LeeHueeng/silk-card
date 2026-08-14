import { LitElement, html, css, nothing, TemplateResult } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { HomeAssistant, HassEntity, LovelaceCardConfig } from '../types';
import { silkControlStyles } from '../shared/base';
import { domainOf, isActive, isUnavailable, moreInfo } from '../shared/service';
import { accentFor } from '../shared/color';
import {
  EntityItem,
  EntityListConfig,
  entityListSelector,
  normalizeEntityList,
} from '../shared/list';
import { registerListEditor } from '../shared/listeditor';

export const META = {
  type: 'silk-openings-card',
  name: 'Silk Openings',
  description: 'Which doors and windows are open, right now.',
};

export interface SilkOpeningsCardConfig extends LovelaceCardConfig {
  /**
   * binary_sensor / cover ids, either as plain ids (what the picker writes) or
   * as `{ entity, name?, icon?, color? }` for per-row detail. Omit or leave
   * empty to auto-discover the house's openings.
   */
  entities?: EntityListConfig;
  name?: string;
  /** Also list the closed ones, after the open ones. Default false. */
  show_closed?: boolean;
  /** Maximum rows rendered. Default 8. */
  limit?: number;
}

type Kind = 'door' | 'window' | 'garage';

/** Icon pair per kind — the open one is the whole point of the card. */
const ICONS: Record<Kind, { open: string; closed: string }> = {
  door: { open: 'mdi:door-open', closed: 'mdi:door' },
  window: { open: 'mdi:window-open', closed: 'mdi:window-closed' },
  garage: { open: 'mdi:garage-open', closed: 'mdi:garage' },
};

/**
 * device_class → icon family. Covers bring their own classes (shutter, blind,
 * gate…), which fold into the nearest of the three families; anything unknown
 * falls back to the door pair.
 */
const KIND_BY_CLASS: Record<string, Kind> = {
  door: 'door',
  opening: 'door',
  gate: 'door',
  garage_door: 'garage',
  garage: 'garage',
  window: 'window',
  shutter: 'window',
  blind: 'window',
  curtain: 'window',
  shade: 'window',
  awning: 'window',
};

/** Auto-discovery only claims binary_sensors that clearly *are* openings. */
const DISCOVER_CLASSES = new Set(['door', 'window', 'garage_door', 'opening']);

const DEFAULT_NAME = 'Openings';
const DEFAULT_LIMIT = 8;
const MAX_LIMIT = 30;
/** Re-render cadence so the 'since' stamps never go stale. */
const CLOCK_TICK_MS = 30_000;

interface OpeningRow {
  entityId: string;
  name: string;
  /** Resolved mdi icon — the per-item override, else the kind's open/closed pair. */
  icon: string;
  open: boolean;
  /** No state object, or unavailable/unknown. */
  dead: boolean;
  /** last_changed in epoch ms; null when unparseable. */
  since: number | null;
  /** Per-item accent override from YAML detail. */
  color?: string;
}

/** Compact stamp for a dense row: 'now', then 12m / 5h / 3d. */
function shortSince(ms: number): string {
  const sec = Math.max(0, (Date.now() - ms) / 1000);
  if (sec < 60) return 'now';
  if (sec < 3600) return `${Math.floor(sec / 60)}m`;
  if (sec < 86400) return `${Math.floor(sec / 3600)}h`;
  return `${Math.floor(sec / 86400)}d`;
}

const EDITOR_TAG = 'silk-openings-card-editor';

/**
 * Empty list = auto-discovery, so the picker doubles as "narrow it down". It
 * stays on screen for a hand-written list too: the ids it returns are folded
 * back into the stored entries, so every row that survives keeps its name,
 * icon and color.
 */
registerListEditor(EDITOR_TAG, {
  schema: [
    entityListSelector('entities', ['binary_sensor', 'cover']),
    { name: 'name', selector: { text: {} } },
    { name: 'show_closed', selector: { boolean: {} } },
    { name: 'limit', selector: { number: { min: 1, max: MAX_LIMIT, mode: 'box' } } },
  ],
  labels: {
    entities: '문·창문 센서',
    name: '이름',
    show_closed: '닫힌 것도 표시',
    limit: '표시 개수',
  },
  defaults: { name: DEFAULT_NAME, show_closed: false, limit: DEFAULT_LIMIT },
  listFields: ['entities'],
});

/**
 * The "did I leave something open?" card: a one-glance verdict in the header,
 * then the open doors and windows themselves, newest first, each with how long
 * it has been that way.
 */
@customElement('silk-openings-card')
export class SilkOpeningsCard extends LitElement {
  @property({ attribute: false }) public hass?: HomeAssistant;

  @state() private _config?: SilkOpeningsCardConfig;

  /** Cached auto-discovery result (see _entityIds). */
  private _autoIds: string[] | null = null;
  private _autoCount = -1;
  private _clockTimer?: number;

  public static getStubConfig(): Partial<SilkOpeningsCardConfig> {
    // No entities: the card discovers the house's openings by itself.
    return { type: 'custom:silk-openings-card' };
  }

  public static async getConfigElement(): Promise<HTMLElement> {
    return document.createElement(EDITOR_TAG);
  }

  public setConfig(config: SilkOpeningsCardConfig): void {
    if (config.entities !== undefined) {
      if (!Array.isArray(config.entities)) {
        throw new Error('silk-openings-card: `entities` must be a list of entity ids');
      }
      // Both shapes are legal: 'binary_sensor.x' or { entity: 'binary_sensor.x', … }.
      for (const item of config.entities) {
        const id = typeof item === 'string' ? item : (item as EntityItem | null)?.entity;
        if (typeof id !== 'string' || !id.includes('.')) {
          const shown = typeof item === 'string' ? item : JSON.stringify(item);
          throw new Error(`silk-openings-card: \`${String(shown)}\` is not an entity id`);
        }
      }
    }
    if (config.limit !== undefined && !(Number(config.limit) > 0)) {
      throw new Error('silk-openings-card: `limit` must be a positive number');
    }
    this._config = config;
    this._autoIds = null;
    this._autoCount = -1;
  }

  public getCardSize(): number {
    return 3;
  }

  public getGridOptions(): Record<string, number> {
    return { columns: 6, rows: 3, min_columns: 3, min_rows: 1 };
  }

  public connectedCallback(): void {
    super.connectedCallback();
    this._clockTimer = window.setInterval(() => this.requestUpdate(), CLOCK_TICK_MS);
  }

  public disconnectedCallback(): void {
    super.disconnectedCallback();
    window.clearInterval(this._clockTimer);
    this._clockTimer = undefined;
  }

  /**
   * Configured items, or every door/window/garage binary_sensor. Discovery
   * walks the whole state machine, so it is cached and only re-run when the
   * entity count changes — device classes don't change between restarts.
   */
  private _items(hass: HomeAssistant): EntityItem[] {
    const configured = normalizeEntityList(this._config?.entities);
    if (configured.length > 0) return configured;
    const ids = Object.keys(hass.states);
    if (this._autoIds === null || ids.length !== this._autoCount) {
      this._autoCount = ids.length;
      this._autoIds = ids
        .filter((id) => {
          if (!id.startsWith('binary_sensor.')) return false;
          const deviceClass = hass.states[id].attributes.device_class;
          return typeof deviceClass === 'string' && DISCOVER_CLASSES.has(deviceClass);
        })
        .sort();
    }
    return this._autoIds.map((id) => ({ entity: id }));
  }

  private _kindOf(entityId: string, stateObj?: HassEntity): Kind {
    const deviceClass = stateObj?.attributes.device_class;
    if (typeof deviceClass === 'string' && KIND_BY_CLASS[deviceClass]) {
      return KIND_BY_CLASS[deviceClass];
    }
    // A cover with no class is a window covering more often than a door.
    return domainOf(entityId) === 'cover' ? 'window' : 'door';
  }

  /** Open rows first, newest change first inside each group. */
  private _rows(hass: HomeAssistant): OpeningRow[] {
    const rows = this._items(hass)
      .filter((item) => hass.states[item.entity] !== undefined)
      .map((item): OpeningRow => {
        const id = item.entity;
        const stateObj = hass.states[id];
        const dead = isUnavailable(stateObj);
        const parsed = Date.parse(stateObj.last_changed);
        const open = !dead && isActive(stateObj);
        return {
          entityId: id,
          name: item.name ?? stateObj.attributes.friendly_name ?? id.split('.')[1] ?? id,
          icon: item.icon ?? ICONS[this._kindOf(id, stateObj)][open ? 'open' : 'closed'],
          open,
          dead,
          since: Number.isFinite(parsed) ? parsed : null,
          color: item.color,
        };
      });
    rows.sort((a, b) => {
      if (a.open !== b.open) return a.open ? -1 : 1;
      return (b.since ?? 0) - (a.since ?? 0) || a.name.localeCompare(b.name);
    });
    return rows;
  }

  private _onRowClick(ev: Event, entityId: string): void {
    ev.stopPropagation();
    moreInfo(this, entityId);
  }

  private _renderRow(row: OpeningRow): TemplateResult {
    const when = row.since !== null ? shortSince(row.since) : '—';
    // A per-item color replaces the accent on that row's icon only; the
    // closed-row dimming still applies, so quiet rows stay quiet.
    const iconStyle = row.color ? `color:${row.color}` : nothing;
    return html`
      <button
        class="row ${row.open ? 'open' : ''} ${row.dead ? 'dead' : ''}"
        aria-label=${`${row.name}: ${row.dead ? 'unavailable' : row.open ? 'open' : 'closed'}`}
        @click=${(ev: Event) => this._onRowClick(ev, row.entityId)}
      >
        <ha-icon class="ricon" style=${iconStyle} .icon=${row.icon}></ha-icon>
        <span class="rname">${row.name}</span>
        <span class="when">${when}</span>
      </button>
    `;
  }

  protected render(): TemplateResult | typeof nothing {
    const config = this._config;
    const hass = this.hass;
    if (!config || !hass) return nothing;

    const rows = this._rows(hass);
    const openCount = rows.filter((row) => row.open).length;
    const limit = Math.min(Math.round(Number(config.limit ?? DEFAULT_LIMIT)), MAX_LIMIT);
    const shown = (config.show_closed ? rows : rows.filter((row) => row.open)).slice(0, limit);
    const name = config.name ?? DEFAULT_NAME;
    // No per-domain hue to inherit here — openings are a mixed bag — so the
    // card keeps Silk's neutral primary as its single accent.
    const accent = accentFor(undefined);
    const allDead = rows.length > 0 && rows.every((row) => row.dead);

    return html`
      <ha-card class="control ${allDead ? 'unavailable' : ''}" style="--silk-accent:${accent}">
        <div class="header">
          <ha-icon class="hicon" icon="mdi:door"></ha-icon>
          <div class="hname" title=${name}>${name}</div>
          <div class="summary ${openCount > 0 ? 'some' : 'clear'}">
            <span class="sdot"></span>
            ${openCount > 0
              ? html`<span><span class="count">${openCount}</span> open</span>`
              : html`<span>All closed</span>`}
          </div>
        </div>
        <div class="rows">
          ${shown.length === 0
            ? html`<div class="empty">
                ${rows.length === 0 ? 'No openings found' : 'Nothing open'}
              </div>`
            : shown.map((row) => this._renderRow(row))}
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
        gap: 6px;
        padding: 12px 14px;
        cursor: default;
      }
      .header {
        flex: none;
        display: flex;
        align-items: center;
        gap: 8px;
        min-height: 22px;
      }
      .hicon {
        flex: none;
        --mdc-icon-size: 16px;
        color: var(--secondary-text-color);
      }
      .hname {
        flex: 1;
        min-width: 0;
        font-size: 13px;
        font-weight: 600;
        color: var(--secondary-text-color);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .summary {
        flex: none;
        display: flex;
        align-items: center;
        gap: 6px;
        font-size: 12px;
        line-height: 1;
        color: var(--secondary-text-color);
        white-space: nowrap;
        font-variant-numeric: tabular-nums;
      }
      .sdot {
        flex: none;
        width: 7px;
        height: 7px;
        border-radius: 50%;
        transition: background 200ms ease;
      }
      /* Status colors, used for a real status: shut vs. left open. */
      .summary.clear .sdot {
        background: var(--success-color, #57ad60);
      }
      .summary.some .sdot {
        background: var(--warning-color, #e6a23c);
      }
      .count {
        font-weight: 600;
        color: var(--silk-accent);
      }
      .rows {
        flex: 1;
        min-height: 0;
        display: flex;
        flex-direction: column;
        gap: 1px;
        margin: 0 -6px;
        overflow: hidden;
      }
      .row {
        flex: none;
        display: flex;
        align-items: center;
        gap: 10px;
        width: 100%;
        min-height: 30px;
        margin: 0;
        padding: 3px 6px;
        border: none;
        border-radius: 10px;
        background: none;
        font: inherit;
        color: inherit;
        text-align: left;
        cursor: pointer;
        outline: none;
        transition: background 150ms ease-out;
        animation: silk-openings-in 250ms var(--silk-ease-out);
      }
      .row:hover {
        background: rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.06);
      }
      .row:focus-visible {
        background: rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.06);
        box-shadow: inset 0 0 0 2px color-mix(in srgb, var(--silk-accent) 70%, transparent);
      }
      .row.dead {
        opacity: 0.45;
      }
      .ricon {
        flex: none;
        --mdc-icon-size: 20px;
        color: var(--secondary-text-color);
        opacity: 0.7;
        transition: color 200ms ease, opacity 200ms ease;
      }
      /* Open reads as the exception: accent icon, full-strength label. */
      .row.open .ricon {
        color: var(--silk-accent);
        opacity: 1;
      }
      .rname {
        flex: 1;
        min-width: 0;
        font-size: 13px;
        line-height: 1.3;
        color: var(--secondary-text-color);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        transition: color 200ms ease;
      }
      .row.open .rname {
        color: var(--primary-text-color);
        font-weight: 500;
      }
      .when {
        flex: none;
        font-size: 11px;
        line-height: 1.3;
        color: var(--secondary-text-color);
        font-variant-numeric: tabular-nums;
        white-space: nowrap;
      }
      .empty {
        font-size: 12.5px;
        line-height: 1.3;
        color: var(--secondary-text-color);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .unavailable .header {
        opacity: 0.45;
      }
      @keyframes silk-openings-in {
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
    'silk-openings-card': SilkOpeningsCard;
  }
}
