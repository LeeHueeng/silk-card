import { LitElement, html, css, nothing, PropertyValues, TemplateResult } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { HomeAssistant, HassEntity, LovelaceCardConfig } from '../types';
import { silkControlStyles } from '../shared/base';
import { isActive, isUnavailable, toggleEntity, moreInfo, haptic } from '../shared/service';
import { accentFor } from '../shared/color';
import { registerRowsEditor } from '../shared/rows';

export const META = {
  type: 'silk-vpn-card',
  name: 'Silk VPN',
  description: 'Which peers are actually connected.',
};

/** One tunnel peer: the state entity plus optional address and last-seen. */
export interface VpnPeerConfig {
  entity: string;
  name?: string;
  /** Entity holding the peer's address. */
  ip?: string;
  /** Entity holding a last-handshake timestamp. */
  last_seen?: string;
}

export interface SilkVpnCardConfig extends LovelaceCardConfig {
  /** The peers this card watches. */
  peers: VpnPeerConfig[];
  /** Optional tunnel switch, rendered as a header switch. */
  toggle?: string;
  name?: string;
  /** Accent override. */
  color?: string;
}

/** Re-render cadence so relative last-seen stamps never go stale. */
const CLOCK_TICK_MS = 30_000;
const OPTIMISTIC_TIMEOUT_MS = 2000;

/** States that mean "this peer is up", whatever the integration calls it. */
const CONNECTED_STATES = new Set(['connected', 'online', 'up', 'home', 'active', 'on', 'true']);
/** States that mean "this peer is not up". */
const IDLE_STATES = new Set([
  'disconnected',
  'offline',
  'down',
  'not_home',
  'away',
  'idle',
  'off',
  'false',
]);

const EDITOR_TAG = 'silk-vpn-card-editor';

// A peer is three entities and a name, so it gets a row of its own; the tunnel
// switch, title and accent stay above the roster.
registerRowsEditor(EDITOR_TAG, {
  field: 'peers',
  title: '피어',
  addLabel: '피어 추가',
  blank: { entity: '' },
  row: [
    {
      name: 'entity',
      label: '연결 상태 엔티티',
      selector: {
        entity: { domain: ['device_tracker', 'binary_sensor', 'sensor', 'switch', 'person'] },
      },
    },
    { name: 'name', label: '이름', selector: { text: {} } },
    { name: 'ip', label: '주소 엔티티', selector: { entity: { domain: ['sensor'] } } },
    {
      name: 'last_seen',
      label: '마지막 접속 엔티티',
      selector: { entity: { domain: ['sensor'] } },
    },
  ],
  schema: [
    { name: 'name', selector: { text: {} } },
    { name: 'toggle', selector: { entity: { domain: ['switch', 'input_boolean'] } } },
    { name: 'color', selector: { ui_color: {} } },
  ],
  labels: { name: '이름', toggle: '터널 스위치', color: '강조 색상' },
  defaults: { name: 'VPN' },
});

/** '<60s → just now, <1h → Nm ago, <24h → Hh ago, else Dd ago'; bad input → null. */
function relativeTime(ms: number): string | null {
  if (!Number.isFinite(ms)) return null;
  const sec = Math.max(0, (Date.now() - ms) / 1000);
  if (sec < 60) return 'just now';
  if (sec < 3600) return `${Math.floor(sec / 60)}m ago`;
  if (sec < 86400) return `${Math.floor(sec / 3600)}h ago`;
  return `${Math.floor(sec / 86400)}d ago`;
}

/** ISO stamps, epoch seconds and epoch millis all appear in the wild. */
function stampToMs(stateObj?: HassEntity): number | null {
  if (!stateObj || isUnavailable(stateObj) || stateObj.state === '') return null;
  const parsed = Date.parse(stateObj.state);
  if (Number.isFinite(parsed)) return parsed;
  const numeric = Number(stateObj.state);
  if (!Number.isFinite(numeric)) return null;
  return numeric > 1e12 ? numeric : numeric * 1000;
}

/** Everything a peer row needs, resolved once per render. */
interface PeerRow {
  cfg: VpnPeerConfig;
  name: string;
  connected: boolean;
  /** No entity behind it at all — the row recedes and reports nothing. */
  dead: boolean;
  ip: string | null;
  seen: string | null;
}

/**
 * A tunnel roster: one row per peer, state dot first, so "who is actually on
 * the VPN right now" is the shape of the top of the list. Peers that dropped
 * dim and sink rather than disappearing — an absent peer is information too.
 */
@customElement('silk-vpn-card')
export class SilkVpnCard extends LitElement {
  @property({ attribute: false }) public hass?: HomeAssistant;

  @state() private _config?: SilkVpnCardConfig;
  /** Optimistic tunnel-switch target (null = trust the real state). */
  @state() private _optimistic: boolean | null = null;

  private _optimisticBase = '';
  private _optimisticTimer?: number;
  private _clockTimer?: number;

  public static getStubConfig(hass: HomeAssistant): Partial<SilkVpnCardConfig> {
    // Seed from device trackers; users refine the roster in YAML.
    const peers = Object.keys(hass.states)
      .filter((id) => id.startsWith('device_tracker.'))
      .slice(0, 3)
      .map((id): VpnPeerConfig => ({
        entity: id,
        name: String(hass.states[id].attributes.friendly_name ?? id),
      }));
    return { type: 'custom:silk-vpn-card', peers };
  }

  public static async getConfigElement(): Promise<HTMLElement> {
    return document.createElement(EDITOR_TAG);
  }

  public setConfig(config: SilkVpnCardConfig): void {
    if (!Array.isArray(config.peers) || config.peers.length === 0) {
      throw new Error(
        'silk-vpn-card: `peers` is required — a list of {entity, name?, ip?, last_seen?}'
      );
    }
    config.peers.forEach((peer, i) => {
      if (!peer || typeof peer.entity !== 'string' || peer.entity === '') {
        throw new Error(`silk-vpn-card: peers[${i}] needs an \`entity\``);
      }
      if (peer.ip !== undefined && typeof peer.ip !== 'string') {
        throw new Error(`silk-vpn-card: peers[${i}].ip must be an entity id`);
      }
      if (peer.last_seen !== undefined && typeof peer.last_seen !== 'string') {
        throw new Error(`silk-vpn-card: peers[${i}].last_seen must be an entity id`);
      }
    });
    if (config.toggle !== undefined && typeof config.toggle !== 'string') {
      throw new Error('silk-vpn-card: `toggle` must be an entity id');
    }
    this._config = config;
    this._clearOptimistic();
  }

  public getCardSize(): number {
    return Math.max(3, 1 + Math.ceil((this._config?.peers.length ?? 3) / 2));
  }

  public getGridOptions(): Record<string, number> {
    return { columns: 6, rows: 3, min_columns: 4, min_rows: 2 };
  }

  public connectedCallback(): void {
    super.connectedCallback();
    this._clockTimer = window.setInterval(() => this.requestUpdate(), CLOCK_TICK_MS);
  }

  public disconnectedCallback(): void {
    super.disconnectedCallback();
    window.clearInterval(this._clockTimer);
    window.clearTimeout(this._optimisticTimer);
    this._optimisticTimer = undefined;
  }

  protected willUpdate(changed: PropertyValues): void {
    if (!changed.has('hass') || this._optimistic === null || !this._config?.toggle) return;
    const stateObj = this.hass?.states[this._config.toggle];
    if (stateObj && stateObj.last_updated !== this._optimisticBase) this._clearOptimistic();
  }

  private _clearOptimistic(): void {
    window.clearTimeout(this._optimisticTimer);
    this._optimisticTimer = undefined;
    this._optimistic = null;
  }

  /**
   * Connected-ness across integrations: explicit vocabularies first, then HA's
   * own active semantics — a bare `sensor.peer` reading "disconnected" would
   * otherwise read as active.
   */
  private _connected(stateObj?: HassEntity): boolean {
    if (!stateObj || isUnavailable(stateObj)) return false;
    const state = stateObj.state.trim().toLowerCase();
    if (CONNECTED_STATES.has(state)) return true;
    if (IDLE_STATES.has(state)) return false;
    return isActive(stateObj);
  }

  private _row(cfg: VpnPeerConfig): PeerRow {
    const hass = this.hass!;
    const stateObj = hass.states[cfg.entity];
    const ipObj = cfg.ip ? hass.states[cfg.ip] : undefined;
    const ip =
      ipObj && !isUnavailable(ipObj) && ipObj.state.trim() !== '' ? ipObj.state.trim() : null;
    const seenObj = cfg.last_seen ? hass.states[cfg.last_seen] : undefined;
    const seenMs = seenObj
      ? stampToMs(seenObj)
      : stateObj
        ? Date.parse(stateObj.last_changed)
        : null;
    return {
      cfg,
      name: cfg.name ?? stateObj?.attributes.friendly_name ?? cfg.entity,
      connected: this._connected(stateObj),
      dead: !stateObj || isUnavailable(stateObj),
      ip,
      seen: seenMs === null ? null : relativeTime(seenMs),
    };
  }

  /** Connected peers first; whoever dropped sinks to the bottom. */
  private _rows(): PeerRow[] {
    return this._config!.peers.map((cfg) => this._row(cfg)).sort((a, b) => {
      if (a.connected !== b.connected) return a.connected ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
  }

  private _onRowClick(ev: Event, entityId: string): void {
    ev.stopPropagation();
    moreInfo(this, entityId);
  }

  private _onToggleClick(ev: Event): void {
    ev.stopPropagation();
    const config = this._config;
    const hass = this.hass;
    if (!config?.toggle || !hass) return;
    const stateObj = hass.states[config.toggle];
    if (!stateObj || isUnavailable(stateObj)) return;
    const on = isActive(stateObj);
    const name = config.name ?? stateObj.attributes.friendly_name ?? config.toggle;
    // Cutting a tunnel can strand whoever is on it — always ask first.
    if (!window.confirm(`${on ? 'Disable' : 'Enable'} ${name}?`)) return;
    haptic(this);
    this._optimistic = !on;
    this._optimisticBase = stateObj.last_updated;
    window.clearTimeout(this._optimisticTimer);
    this._optimisticTimer = window.setTimeout(() => this._clearOptimistic(), OPTIMISTIC_TIMEOUT_MS);
    toggleEntity(hass, config.toggle);
  }

  private _renderRow(row: PeerRow, columns: { ip: boolean; seen: boolean }): TemplateResult {
    const status = row.dead ? 'unknown' : row.connected ? 'connected' : 'idle';
    return html`
      <button
        class="row ${row.connected ? '' : 'off'} ${row.dead ? 'unavailable' : ''}"
        title=${row.name}
        aria-label=${`${row.name}: ${status}`}
        @click=${(ev: Event) => this._onRowClick(ev, row.cfg.entity)}
      >
        <span class="dot ${row.connected ? 'on' : ''}"></span>
        <span class="pname">${row.name}</span>
        ${columns.ip ? html`<span class="ip">${row.ip ?? '—'}</span>` : nothing}
        ${columns.seen ? html`<span class="seen">${row.seen ?? '—'}</span>` : nothing}
      </button>
    `;
  }

  protected render(): TemplateResult | typeof nothing {
    const config = this._config;
    const hass = this.hass;
    if (!config || !hass) return nothing;

    const rows = this._rows();
    const online = rows.filter((row) => row.connected).length;
    // A column renders only when at least one peer declares it, and then for
    // every row, so the readouts line up as a quiet table.
    const columns = {
      ip: config.peers.some((peer) => peer.ip),
      seen: rows.some((row) => row.seen !== null),
    };
    const toggleObj = config.toggle ? hass.states[config.toggle] : undefined;
    const toggleOn = this._optimistic ?? (toggleObj ? isActive(toggleObj) : false);
    const toggleUnavailable = Boolean(config.toggle) && isUnavailable(toggleObj);
    const accent = accentFor(toggleObj ?? hass.states[config.peers[0].entity], config.color);
    const title = config.name ?? 'VPN';

    return html`
      <ha-card class="control" style="--silk-accent:${accent}">
        <div class="header">
          <div class="hname" title=${title}>${title}</div>
          <span class="count ${online > 0 ? 'live' : ''}">
            ${online} ${online === 1 ? 'peer' : 'peers'} online
          </span>
          ${config.toggle
            ? html`<button
                class="switch ${toggleOn ? 'checked' : ''}"
                role="switch"
                aria-checked=${toggleOn ? 'true' : 'false'}
                aria-label=${`Toggle ${title}`}
                title=${`Toggle ${title}`}
                .disabled=${toggleUnavailable}
                @click=${this._onToggleClick}
              >
                <span class="thumb"></span>
              </button>`
            : nothing}
        </div>
        <div class="rows">${rows.map((row) => this._renderRow(row, columns))}</div>
      </ha-card>
    `;
  }

  static styles = [
    silkControlStyles,
    css`
      /* A list card: it grows with its rows and presses nowhere as a whole. */
      ha-card {
        flex-direction: column;
        align-items: stretch;
        justify-content: flex-start;
        gap: 6px;
        padding: 12px 14px;
        height: auto;
        min-height: 100%;
        cursor: default;
      }
      .header {
        flex: none;
        display: flex;
        align-items: center;
        gap: 8px;
        min-height: 28px;
      }
      .hname {
        min-width: 0;
        font-size: 13px;
        font-weight: 600;
        color: var(--secondary-text-color);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .count {
        flex: 1;
        min-width: 0;
        font-size: 11px;
        font-weight: 600;
        line-height: 1.3;
        color: var(--secondary-text-color);
        font-variant-numeric: tabular-nums;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        transition: color 200ms ease;
      }
      .count.live {
        color: var(--silk-accent);
      }
      .rows {
        display: flex;
        flex-direction: column;
        gap: 2px;
        margin: 0 -6px;
      }
      .row {
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
      }
      .row:hover {
        background: rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.05);
      }
      .row:focus-visible {
        box-shadow: inset 0 0 0 2px color-mix(in srgb, var(--silk-accent) 70%, transparent);
      }
      /* Dropped peers recede; the roster keeps them so the gap is legible. */
      .row.off {
        opacity: 0.55;
      }
      .row.unavailable {
        opacity: 0.45;
      }
      .dot {
        flex: none;
        width: 6px;
        height: 6px;
        border-radius: 50%;
        background: rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.25);
        transition: background 200ms ease;
      }
      .dot.on {
        background: var(--silk-accent);
      }
      .pname {
        flex: 1;
        min-width: 0;
        font-size: 13px;
        font-weight: 500;
        line-height: 1.3;
        color: var(--primary-text-color);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .ip {
        flex: none;
        max-width: 40%;
        font-size: 11px;
        line-height: 1.3;
        color: var(--secondary-text-color);
        font-variant-numeric: tabular-nums;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .seen {
        flex: none;
        min-width: 54px;
        text-align: right;
        font-size: 11px;
        line-height: 1.3;
        color: var(--secondary-text-color);
        font-variant-numeric: tabular-nums;
        white-space: nowrap;
      }
      .switch {
        flex: none;
        position: relative;
        width: 46px;
        height: 28px;
        border: none;
        border-radius: 999px;
        padding: 2px;
        cursor: pointer;
        display: block;
        background: rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.15);
        transition: background 200ms ease;
      }
      /* Invisible halo lifts the touch target past 40px without growing the track. */
      .switch::after {
        content: '';
        position: absolute;
        inset: -7px;
        border-radius: 999px;
      }
      .switch.checked {
        background: var(--silk-accent);
      }
      .switch:focus-visible {
        outline: 2px solid color-mix(in srgb, var(--silk-accent) 70%, transparent);
        outline-offset: 2px;
      }
      .switch:disabled {
        cursor: default;
        opacity: 0.45;
      }
      .thumb {
        display: block;
        width: 24px;
        height: 24px;
        border-radius: 50%;
        background: var(--card-background-color, #fff);
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
        transform: translateX(0);
        transition: transform 200ms var(--silk-ease-out);
        will-change: transform;
      }
      .switch.checked .thumb {
        transform: translateX(18px);
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    'silk-vpn-card': SilkVpnCard;
  }
}
