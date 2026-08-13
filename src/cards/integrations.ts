import { LitElement, html, css, nothing, PropertyValues, TemplateResult } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { HomeAssistant, LovelaceCardConfig } from '../types';
import { silkControlStyles } from '../shared/base';
import { moreInfo } from '../shared/service';
import { accentFor } from '../shared/color';
import { registerEditor } from '../shared/editor';

export const META = {
  type: 'silk-integrations-card',
  name: 'Silk Integrations',
  description: 'Which ones are unhappy.',
};

export interface SilkIntegrationsCardConfig extends LovelaceCardConfig {
  name?: string;
  /** List every integration, not just the degraded ones. */
  show_all?: boolean;
  /** Maximum rows shown, defaults to 8. */
  limit?: number;
}

/** One row of `config/entity_registry/list` — only the fields Silk groups by. */
interface RegistryEntry {
  entity_id: string;
  platform?: string;
}

/**
 * `hass.connection` is absent from Silk's minimal HomeAssistant type. The
 * registry is a one-shot read, so the card listens for registry mutations to
 * know when that snapshot went stale (an integration added or removed).
 */
interface HassWithConnection extends HomeAssistant {
  connection?: {
    subscribeMessage<T>(
      callback: (message: T) => void,
      subscription: Record<string, unknown>
    ): Promise<() => Promise<void> | void>;
  };
}

/** A single integration platform, scored by how much of it stopped answering. */
interface PlatformRow {
  platform: string;
  label: string;
  /** Entities of this platform that currently exist in the state machine. */
  total: number;
  /** How many of those are unavailable or unknown right now. */
  bad: number;
  /** First unhealthy entity (or first entity at all) — the more-info target. */
  target?: string;
}

const DEFAULT_LIMIT = 8;
/** hass changes on every state update; recompute at most this often. */
const RECOMPUTE_MS = 2000;
/** Registry edits arrive in bursts (an integration setting itself up). */
const REGISTRY_DEBOUNCE_MS = 3000;
/** At or above this share of dead entities the integration reads as broken. */
const CRITICAL_FRACTION = 0.5;

/** Domain slugs whose natural casing the title-caser would butcher. */
const KNOWN_LABELS: Record<string, string> = {
  mqtt: 'MQTT',
  zha: 'ZHA',
  zwave_js: 'Z-Wave JS',
  hacs: 'HACS',
  esphome: 'ESPHome',
  upnp: 'UPnP',
  dlna_dmr: 'DLNA',
  hassio: 'Supervisor',
  ios: 'iOS',
  nut: 'NUT',
  api: 'API',
  ping: 'Ping',
  tts: 'Text-to-speech',
  stt: 'Speech-to-text',
};

function platformLabel(platform: string): string {
  const known = KNOWN_LABELS[platform];
  if (known) return known;
  return platform
    .split('_')
    .map((word) => (word ? word[0].toUpperCase() + word.slice(1) : word))
    .join(' ');
}

const EDITOR_TAG = 'silk-integrations-card-editor';

registerEditor(
  EDITOR_TAG,
  [
    { name: 'name', selector: { text: {} } },
    {
      name: '',
      type: 'grid',
      schema: [
        { name: 'limit', selector: { number: { min: 1, max: 40, mode: 'box' } } },
        { name: 'show_all', selector: { boolean: {} } },
      ],
    },
  ],
  {
    name: 'Name',
    limit: 'Rows to show',
    show_all: 'Show healthy integrations too',
  },
  { limit: DEFAULT_LIMIT }
);

/**
 * Integration health: every entity in the registry, grouped by the platform
 * that supplied it, scored by how much of that platform has gone quiet.
 */
@customElement('silk-integrations-card')
export class SilkIntegrationsCard extends LitElement {
  @property({ attribute: false }) public hass?: HomeAssistant;

  @state() private _config?: SilkIntegrationsCardConfig;
  /** Every platform, worst first; null until the registry lands. */
  @state() private _rows: PlatformRow[] | null = null;
  /** True when the registry call failed — the card says so instead of guessing. */
  @state() private _regFailed = false;

  private _registry: RegistryEntry[] | null = null;
  private _fetchStarted = false;
  private _fetchSeq = 0;
  private _lastCompute = 0;
  private _computeTimer?: number;
  private _reloadTimer?: number;
  private _subscribing = false;
  private _unsub?: () => Promise<void> | void;

  public static getStubConfig(): Partial<SilkIntegrationsCardConfig> {
    // No entity required — the card reads the whole registry.
    return { type: 'custom:silk-integrations-card' };
  }

  public static async getConfigElement(): Promise<HTMLElement> {
    return document.createElement(EDITOR_TAG);
  }

  public setConfig(config: SilkIntegrationsCardConfig): void {
    if (config.limit !== undefined && !(Number(config.limit) >= 1)) {
      throw new Error('silk-integrations-card: `limit` must be a number of at least 1');
    }
    if (config.show_all !== undefined && typeof config.show_all !== 'boolean') {
      throw new Error('silk-integrations-card: `show_all` must be true or false');
    }
    this._config = config;
  }

  public getCardSize(): number {
    return 2 + Math.ceil(Math.min(this._limit(), 12) * 0.7);
  }

  public getGridOptions(): Record<string, number> {
    return { columns: 6, rows: 3, min_columns: 4, min_rows: 2 };
  }

  public connectedCallback(): void {
    super.connectedCallback();
    // A DOM re-attach skips firstUpdated: the registry may have moved on.
    if (this.hasUpdated && this._fetchStarted) {
      this._loadRegistry();
      this._subscribeRegistry();
    }
  }

  public disconnectedCallback(): void {
    super.disconnectedCallback();
    window.clearTimeout(this._computeTimer);
    window.clearTimeout(this._reloadTimer);
    this._computeTimer = undefined;
    this._reloadTimer = undefined;
    this._fetchSeq++; // orphan any in-flight fetch
    this._unsubscribeRegistry();
  }

  protected willUpdate(changed: PropertyValues): void {
    if (!this.hass || !this._config) return;
    if (!this._fetchStarted) {
      this._fetchStarted = true;
      this._loadRegistry();
      this._subscribeRegistry();
      return;
    }
    if (changed.has('hass')) this._scheduleCompute();
  }

  /** Registry mutations mean the snapshot is stale — reload it, debounced. */
  private async _subscribeRegistry(): Promise<void> {
    const connection = (this.hass as HassWithConnection | undefined)?.connection;
    if (!connection?.subscribeMessage || this._unsub || this._subscribing) return;
    this._subscribing = true;
    try {
      const unsub = await connection.subscribeMessage<unknown>(
        () => {
          window.clearTimeout(this._reloadTimer);
          this._reloadTimer = window.setTimeout(
            () => this._loadRegistry(),
            REGISTRY_DEBOUNCE_MS
          );
        },
        { type: 'subscribe_events', event_type: 'entity_registry_updated' }
      );
      if (!this.isConnected) {
        // Unmounted while the subscription was in flight — drop it now.
        void Promise.resolve(unsub()).catch(() => undefined);
        return;
      }
      this._unsub = unsub;
    } catch (err) {
      console.warn('silk-integrations-card: registry subscription failed', err);
    } finally {
      this._subscribing = false;
    }
  }

  private _unsubscribeRegistry(): void {
    const stop = this._unsub;
    this._unsub = undefined;
    if (stop) void Promise.resolve(stop()).catch(() => undefined);
  }

  private _limit(): number {
    return Math.max(1, Math.floor(this._config?.limit ?? DEFAULT_LIMIT));
  }

  private async _loadRegistry(): Promise<void> {
    const hass = this.hass;
    if (!hass) return;
    const seq = ++this._fetchSeq;
    let entries: RegistryEntry[];
    try {
      entries = await hass.callWS<RegistryEntry[]>({ type: 'config/entity_registry/list' });
    } catch (err) {
      console.warn('silk-integrations-card: entity registry fetch failed', err);
      if (seq !== this._fetchSeq) return;
      this._registry = null;
      this._rows = null;
      this._regFailed = true;
      return;
    }
    if (seq !== this._fetchSeq) return; // a newer fetch superseded this one
    this._registry = entries ?? [];
    this._regFailed = false;
    this._compute();
  }

  /** Scanning thousands of registry rows on every state tick is wasteful. */
  private _scheduleCompute(): void {
    if (this._computeTimer) return;
    const wait = Math.max(0, RECOMPUTE_MS - (Date.now() - this._lastCompute));
    this._computeTimer = window.setTimeout(() => {
      this._computeTimer = undefined;
      this._compute();
    }, wait);
  }

  private _compute(): void {
    const hass = this.hass;
    const registry = this._registry;
    if (!hass || !registry) return;
    this._lastCompute = Date.now();

    const byPlatform = new Map<string, PlatformRow>();
    for (const entry of registry) {
      const platform = entry.platform;
      if (!platform) continue;
      // Registry rows without a state object are disabled or not loaded —
      // absent, not broken, so they never count against an integration.
      const stateObj = hass.states[entry.entity_id];
      if (!stateObj) continue;
      let row = byPlatform.get(platform);
      if (!row) {
        row = { platform, label: platformLabel(platform), total: 0, bad: 0 };
        byPlatform.set(platform, row);
      }
      row.total++;
      const dead = stateObj.state === 'unavailable' || stateObj.state === 'unknown';
      if (dead) {
        row.bad++;
        // The first casualty is what a tap should open.
        if (row.bad === 1) row.target = entry.entity_id;
      } else if (!row.target) {
        row.target = entry.entity_id;
      }
    }

    const rows = [...byPlatform.values()];
    rows.sort((a, b) => {
      const fa = a.total ? a.bad / a.total : 0;
      const fb = b.total ? b.bad / b.total : 0;
      return fb - fa || b.bad - a.bad || a.label.localeCompare(b.label);
    });
    this._rows = rows;
  }

  private _locale(): string {
    return this.hass?.locale?.language ?? this.hass?.language ?? 'en';
  }

  private _num(value: number): string {
    return new Intl.NumberFormat(this._locale(), { maximumFractionDigits: 0 }).format(value);
  }

  private _onRowClick(ev: Event, row: PlatformRow): void {
    ev.stopPropagation();
    if (row.target && this.hass?.states[row.target]) moreInfo(this, row.target);
  }

  private _renderRow(row: PlatformRow): TemplateResult {
    const fraction = row.total ? row.bad / row.total : 0;
    const tone = row.bad === 0 ? '' : fraction >= CRITICAL_FRACTION ? 'crit' : 'warn';
    const count = `${this._num(row.bad)} of ${this._num(row.total)} unavailable`;
    return html`
      <button
        class="row"
        title=${`${row.label} — ${count}`}
        aria-label=${`${row.label}: ${count}`}
        @click=${(ev: Event) => this._onRowClick(ev, row)}
      >
        <span class="line">
          <span class="pname">${row.label}</span>
          <span class="cnt ${tone}">${count}</span>
        </span>
        <span class="track" title=${`${row.label} — ${count}`}>
          <span
            class="fill ${tone}"
            style="transform:scaleX(${fraction.toFixed(3)})"
          ></span>
        </span>
      </button>
    `;
  }

  protected render(): TemplateResult | typeof nothing {
    const config = this._config;
    const hass = this.hass;
    if (!config || !hass) return nothing;

    const name = config.name ?? 'Integrations';
    const all = this._rows;
    const degraded = all ? all.filter((row) => row.bad > 0) : [];
    const listed = (config.show_all ? (all ?? []) : degraded).slice(0, this._limit());
    const hidden = (config.show_all ? (all?.length ?? 0) : degraded.length) - listed.length;

    return html`
      <ha-card class="control" style="--silk-accent:${accentFor(undefined)}">
        <div class="head">
          <div class="title" title=${name}>${name}</div>
          ${all
            ? html`<div class="sum">
                <span>${this._num(all.length)} integrations</span>
                ${degraded.length
                  ? html`<span class="sep">·</span
                      ><span class="bad">${this._num(degraded.length)} degraded</span>`
                  : nothing}
              </div>`
            : nothing}
        </div>
        ${this._regFailed
          ? html`<div class="empty">Registry unreachable — try again in a moment</div>`
          : all === null
            ? html`<div class="empty">Reading the registry…</div>`
            : listed.length
              ? html`<div class="rows">${listed.map((row) => this._renderRow(row))}</div>`
              : html`<div class="empty">All integrations healthy</div>`}
        ${hidden > 0 ? html`<div class="more">+${this._num(hidden)} more</div>` : nothing}
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
        height: auto;
        min-height: 100%;
        cursor: default;
      }
      .head {
        flex: none;
        display: flex;
        align-items: baseline;
        gap: 8px;
        min-width: 0;
      }
      .title {
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
      .sum {
        flex: none;
        font-size: 12px;
        line-height: 1.3;
        color: var(--secondary-text-color);
        font-variant-numeric: tabular-nums;
        white-space: nowrap;
      }
      .sum .bad {
        color: var(--warning-color, #ffa600);
      }
      .rows {
        display: flex;
        flex-direction: column;
        gap: 4px;
        min-width: 0;
      }
      .row {
        display: flex;
        flex-direction: column;
        gap: 5px;
        width: 100%;
        margin: 0;
        padding: 5px 6px 7px;
        border: none;
        border-radius: 10px;
        background: none;
        font: inherit;
        color: inherit;
        text-align: left;
        cursor: pointer;
        transition: background 150ms ease-out;
      }
      .row:hover {
        background: rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.05);
      }
      .row:focus-visible {
        outline: 2px solid color-mix(in srgb, var(--silk-accent) 70%, transparent);
        outline-offset: -2px;
      }
      .line {
        display: flex;
        align-items: baseline;
        gap: 10px;
        min-width: 0;
      }
      .pname {
        flex: 1;
        min-width: 0;
        font-size: 13.5px;
        font-weight: 500;
        line-height: 1.3;
        color: var(--primary-text-color);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .cnt {
        flex: none;
        font-size: 11px;
        line-height: 1.3;
        color: var(--secondary-text-color);
        font-variant-numeric: tabular-nums;
        white-space: nowrap;
      }
      .cnt.warn {
        color: var(--warning-color, #ffa600);
      }
      .cnt.crit {
        color: var(--error-color, #db4437);
      }
      .track {
        position: relative;
        display: block;
        height: 4px;
        border-radius: 2px;
        overflow: hidden;
        background: rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.08);
      }
      .fill {
        position: absolute;
        inset: 0;
        border-radius: 2px;
        background: var(--silk-accent);
        transform-origin: left center;
        transition:
          transform 400ms var(--silk-ease-out),
          background 200ms ease;
      }
      .fill.warn {
        background: var(--warning-color, #ffa600);
      }
      .fill.crit {
        background: var(--error-color, #db4437);
      }
      .empty {
        flex: 1;
        display: flex;
        align-items: center;
        min-height: 40px;
        padding: 4px 6px;
        font-size: 13px;
        color: var(--secondary-text-color);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .more {
        flex: none;
        padding: 0 6px;
        font-size: 11px;
        line-height: 1.4;
        color: var(--secondary-text-color);
        font-variant-numeric: tabular-nums;
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    'silk-integrations-card': SilkIntegrationsCard;
  }
}
