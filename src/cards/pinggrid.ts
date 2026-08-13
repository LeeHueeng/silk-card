import { LitElement, html, css, nothing, TemplateResult } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { HomeAssistant, HassEntity, LovelaceCardConfig } from '../types';
import { silkControlStyles } from '../shared/base';
import { domainOf, moreInfo, haptic } from '../shared/service';
import { accentFor } from '../shared/color';
import { registerEditor } from '../shared/editor';

export const META = {
  type: 'silk-ping-card',
  name: 'Silk Ping',
  description: 'Every host, up or down, at a glance.',
};

export interface SilkPingHostConfig {
  /** binary_sensor (on = up) or a numeric latency sensor. */
  entity: string;
  name?: string;
  /** When set, tapping the tile opens this URL instead of more-info. */
  url?: string;
}

export interface SilkPingCardConfig extends LovelaceCardConfig {
  /** Hosts to watch. YAML-only — it is a list of objects. */
  hosts: SilkPingHostConfig[];
  name?: string;
  /** Accent override. */
  color?: string;
}

type HostStatus = 'up' | 'down' | 'unknown';

interface HostTile {
  entityId: string;
  name: string;
  url?: string;
  status: HostStatus;
  /** Round-trip time, already formatted, when the entity is numeric. */
  latency?: string;
  /** True when the configured entity is not in the state machine. */
  missing: boolean;
}

const DEFAULT_NAME = 'Hosts';
/** Past two dozen tiles the grid stops being a glance; the rest are dropped. */
const MAX_HOSTS = 24;

const UP_WORDS = new Set(['on', 'up', 'online', 'connected', 'reachable', 'home', 'ok']);
const DOWN_WORDS = new Set([
  'off',
  'down',
  'offline',
  'disconnected',
  'unreachable',
  'not_home',
  'problem',
]);

/** Sort weight — the hosts that need attention rise to the top-left. */
const RANK: Record<HostStatus, number> = { down: 0, unknown: 1, up: 2 };

const EDITOR_TAG = 'silk-ping-card-editor';

// `hosts` stays YAML-only (a list of objects); the header label is the one
// setting worth a picker.
registerEditor(EDITOR_TAG, [{ name: 'name', selector: { text: {} } }], { name: 'Name' });

/**
 * Up / down / unknown for a host entity.
 *
 * `unavailable` and `unknown` are deliberately *not* the same thing here: a
 * ping entity goes unavailable exactly when the host stops answering, which is
 * the definition of down, while `unknown` means the integration has not probed
 * yet and has nothing to say.
 */
function statusOf(stateObj: HassEntity | undefined): HostStatus {
  if (!stateObj) return 'unknown';
  const raw = stateObj.state;
  if (raw === '' || raw === 'unknown' || raw === 'none') return 'unknown';
  if (raw === 'unavailable') return 'down';
  if (domainOf(stateObj.entity_id) === 'binary_sensor') return raw === 'on' ? 'up' : 'down';
  if (Number.isFinite(Number(raw))) return 'up';
  const word = raw.toLowerCase();
  if (UP_WORDS.has(word)) return 'up';
  if (DOWN_WORDS.has(word)) return 'down';
  return 'unknown';
}

/** Latency reads as a whole number once it is past 10 — sub-ms precision is noise. */
function formatLatency(value: number, unit: string): string {
  const digits = Math.abs(value) >= 10 ? 0 : 1;
  return `${(Math.round(value * 10 ** digits) / 10 ** digits).toFixed(digits)} ${unit}`;
}

/**
 * The host grid: one compact tile per host, dot first, so a wall of green
 * answers "is anything down?" before you have read a single name.
 */
@customElement('silk-ping-card')
export class SilkPingCard extends LitElement {
  @property({ attribute: false }) public hass?: HomeAssistant;

  @state() private _config?: SilkPingCardConfig;

  public static getStubConfig(hass: HomeAssistant): Partial<SilkPingCardConfig> {
    const binary = Object.keys(hass.states).filter((id) => id.startsWith('binary_sensor.'));
    const likely = binary.filter(
      (id) =>
        hass.states[id].attributes.device_class === 'connectivity' ||
        /ping|host|online|reachab|server/i.test(id)
    );
    return {
      type: 'custom:silk-ping-card',
      hosts: (likely.length ? likely : binary).slice(0, 6).map((entity) => ({ entity })),
    };
  }

  public static async getConfigElement(): Promise<HTMLElement> {
    return document.createElement(EDITOR_TAG);
  }

  public setConfig(config: SilkPingCardConfig): void {
    if (!Array.isArray(config.hosts) || config.hosts.length === 0) {
      throw new Error('silk-ping-card: `hosts` is required — a list of {entity, name?, url?}');
    }
    for (const host of config.hosts) {
      if (
        !host ||
        typeof host !== 'object' ||
        typeof host.entity !== 'string' ||
        !host.entity.includes('.')
      ) {
        throw new Error('silk-ping-card: every host needs an `entity` id');
      }
      if (host.url !== undefined && typeof host.url !== 'string') {
        throw new Error(`silk-ping-card: \`url\` for ${host.entity} must be a string`);
      }
    }
    this._config = config;
  }

  public getCardSize(): number {
    const hosts = Math.min(this._config?.hosts.length ?? 0, MAX_HOSTS);
    return 1 + Math.ceil(hosts / 3);
  }

  public getGridOptions(): Record<string, number> {
    return { columns: 6, rows: 2, min_columns: 4, min_rows: 2 };
  }

  /** Tiles in display order: down first, then unknown, then up. */
  private _tiles(): HostTile[] {
    const hass = this.hass!;
    const tiles = this._config!.hosts.slice(0, MAX_HOSTS).map((host): HostTile => {
      const stateObj = hass.states[host.entity];
      const status = statusOf(stateObj);
      const numeric = stateObj ? Number(stateObj.state) : NaN;
      const unit = (stateObj?.attributes.unit_of_measurement as string | undefined) ?? 'ms';
      return {
        entityId: host.entity,
        name: host.name ?? stateObj?.attributes.friendly_name ?? host.entity,
        url: host.url,
        status,
        latency:
          stateObj && status === 'up' && stateObj.state !== '' && Number.isFinite(numeric)
            ? formatLatency(numeric, unit)
            : undefined,
        missing: !stateObj,
      };
    });
    // Stable sort: within a status band the configured order is preserved, so
    // tiles never shuffle under the cursor for no reason.
    return tiles.sort((a, b) => RANK[a.status] - RANK[b.status]);
  }

  private _onTileClick(ev: Event, tile: HostTile): void {
    ev.stopPropagation();
    haptic(this);
    if (tile.url) {
      window.open(tile.url, '_blank', 'noopener');
      return;
    }
    moreInfo(this, tile.entityId);
  }

  private _renderTile(tile: HostTile): TemplateResult {
    const label = tile.missing ? 'not found' : tile.status;
    const title = tile.latency
      ? `${tile.name} · ${label} · ${tile.latency}`
      : `${tile.name} · ${label}`;
    return html`
      <button
        class="tile ${tile.status}"
        title=${title}
        aria-label=${title}
        @click=${(ev: Event) => this._onTileClick(ev, tile)}
      >
        <span class="dot"></span>
        <span class="hname">${tile.name}</span>
        <span class="ms">${tile.latency ?? (tile.status === 'down' ? 'down' : '—')}</span>
      </button>
    `;
  }

  protected render(): TemplateResult | typeof nothing {
    const config = this._config;
    const hass = this.hass;
    if (!config || !hass) return nothing;

    const tiles = this._tiles();
    const up = tiles.filter((tile) => tile.status === 'up').length;
    const down = tiles.filter((tile) => tile.status === 'down').length;
    const name = config.name ?? DEFAULT_NAME;

    return html`
      <ha-card class="control" style="--silk-accent:${accentFor(undefined, config.color)}">
        <div class="header">
          <div class="hname">${name}</div>
          <span class="count ${down ? 'bad' : ''}">${up}/${tiles.length} up</span>
        </div>
        ${tiles.length
          ? html`<div class="grid">${tiles.map((tile) => this._renderTile(tile))}</div>`
          : html`<div class="note">No hosts configured</div>`}
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
        padding: 12px 14px;
        cursor: default;
      }
      .header {
        flex: none;
        display: flex;
        align-items: center;
        gap: 8px;
        min-height: 20px;
      }
      .header .hname {
        flex: 1;
        min-width: 0;
        font-size: 13px;
        font-weight: 600;
        color: var(--secondary-text-color);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .count {
        flex: none;
        font-size: 11px;
        font-weight: 600;
        line-height: 1;
        color: var(--secondary-text-color);
        font-variant-numeric: tabular-nums;
        white-space: nowrap;
      }
      .count.bad {
        color: var(--error-color, #db4437);
      }
      .grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(92px, 1fr));
        gap: 6px;
      }
      .tile {
        display: grid;
        grid-template-columns: 8px minmax(0, 1fr);
        grid-template-rows: auto auto;
        align-items: center;
        column-gap: 7px;
        row-gap: 1px;
        min-height: 40px;
        margin: 0;
        padding: 7px 9px;
        border: 1px solid transparent;
        border-radius: 12px;
        background: rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.05);
        font: inherit;
        color: inherit;
        text-align: left;
        cursor: pointer;
        outline: none;
        transition:
          transform 250ms var(--silk-spring),
          background 150ms ease-out,
          border-color 200ms ease;
      }
      .tile:hover {
        background: rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.09);
      }
      .tile:active {
        transform: scale(0.97);
        transition-duration: 120ms;
        transition-timing-function: var(--silk-ease-out);
      }
      .tile:focus-visible {
        border-color: color-mix(in srgb, var(--silk-accent) 70%, transparent);
      }
      /* Down hosts carry a hairline of their own — a border, never a glow. */
      .tile.down {
        border-color: color-mix(in srgb, var(--error-color, #db4437) 40%, transparent);
      }
      .tile.unknown .hname,
      .tile.unknown .ms {
        opacity: 0.45;
      }
      .dot {
        grid-row: 1;
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background: rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.3);
        transition: background 200ms ease;
      }
      .tile.up .dot {
        background: var(--success-color, #43a047);
      }
      .tile.down .dot {
        background: var(--error-color, #db4437);
      }
      .tile .hname {
        grid-column: 2;
        min-width: 0;
        font-size: 12px;
        font-weight: 500;
        line-height: 1.3;
        color: var(--primary-text-color);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .ms {
        grid-column: 2;
        min-width: 0;
        font-size: 11px;
        line-height: 1.2;
        color: var(--secondary-text-color);
        font-variant-numeric: tabular-nums;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .note {
        flex: 1;
        display: flex;
        align-items: center;
        justify-content: center;
        min-height: 44px;
        font-size: 13px;
        color: var(--secondary-text-color);
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    'silk-ping-card': SilkPingCard;
  }
}
