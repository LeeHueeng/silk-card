import { LitElement, html, css, nothing, PropertyValues, TemplateResult } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { HomeAssistant, LovelaceCardConfig } from '../types';
import { silkControlStyles } from '../shared/base';
import { domainOf, moreInfo } from '../shared/service';
import { accentFor } from '../shared/color';
import { registerEditor } from '../shared/editor';

export const META = {
  type: 'silk-doctor-card',
  name: 'Silk Doctor',
  description: 'Every entity that stopped answering.',
};

export interface SilkDoctorCardConfig extends LovelaceCardConfig {
  name?: string;
  /** Maximum rows listed, defaults to 10. */
  limit?: number;
  /** Count `unknown` alongside `unavailable`. Defaults to true. */
  include_unknown?: boolean;
  /** Entity ids, `domain.prefix*` globs, or bare domains to skip. */
  ignore?: string[];
}

/** One entity that has gone quiet. */
interface DownRow {
  entityId: string;
  name: string;
  /** True for `unknown` (never answered) vs `unavailable` (stopped answering). */
  unknown: boolean;
  /** ms the entity has held this state; 0 when last_changed is unparseable. */
  downMs: number;
}

/** Down entities of one domain, longest-down first. */
interface DomainGroup {
  domain: string;
  label: string;
  rows: DownRow[];
}

const DEFAULT_LIMIT = 10;
/** hass changes on every state update; rescanning is throttled to this. */
const RECOMPUTE_MS = 2000;
/** Keeps the 'down 4h' column honest without a per-second tick. */
const TICK_MS = 30_000;

const EDITOR_TAG = 'silk-doctor-card-editor';

registerEditor(
  EDITOR_TAG,
  [
    { name: 'name', selector: { text: {} } },
    {
      name: '',
      type: 'grid',
      schema: [
        { name: 'limit', selector: { number: { min: 1, max: 50, mode: 'box' } } },
        { name: 'include_unknown', selector: { boolean: {} } },
      ],
    },
    { name: 'ignore', selector: { text: { multiple: true } } },
  ],
  {
    name: 'Name',
    limit: 'Rows to show',
    include_unknown: 'Count unknown too',
    ignore: 'Ignore (entity id, domain, or prefix*)',
  },
  { limit: DEFAULT_LIMIT, include_unknown: true }
);

/** 'sensor' → 'Sensor', 'binary_sensor' → 'Binary sensor'. */
function domainLabel(domain: string): string {
  const words = domain.split('_').join(' ');
  return words ? words[0].toUpperCase() + words.slice(1) : domain;
}

/** '<1m' · '42m' · '4h' · '13d' — always short enough for a tabular column. */
function shortDuration(ms: number): string {
  const seconds = Math.max(0, ms / 1000);
  if (seconds < 60) return '<1m';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  if (seconds < 172_800) return `${Math.floor(seconds / 3600)}h`;
  return `${Math.floor(seconds / 86_400)}d`;
}

/**
 * A skip rule matches an exact entity id, a bare domain (`sensor`), or a
 * trailing-star prefix (`sensor.shelly_*`).
 */
function matchesIgnore(entityId: string, patterns: string[]): boolean {
  for (const raw of patterns) {
    const pattern = String(raw ?? '').trim();
    if (!pattern) continue;
    if (pattern.endsWith('*')) {
      if (entityId.startsWith(pattern.slice(0, -1))) return true;
      continue;
    }
    if (!pattern.includes('.')) {
      if (domainOf(entityId) === pattern) return true;
      continue;
    }
    if (entityId === pattern) return true;
  }
  return false;
}

/**
 * The unavailable list, grouped by domain and sorted by how long each entity
 * has been silent — the ones that died first are the ones worth chasing.
 */
@customElement('silk-doctor-card')
export class SilkDoctorCard extends LitElement {
  @property({ attribute: false }) public hass?: HomeAssistant;

  @state() private _config?: SilkDoctorCardConfig;
  /** Every down entity, longest-down first; null before the first scan. */
  @state() private _down: DownRow[] | null = null;

  private _lastCompute = 0;
  private _computeTimer?: number;
  private _tickTimer?: number;

  public static getStubConfig(): Partial<SilkDoctorCardConfig> {
    // No entity required — the card scans the whole state machine.
    return { type: 'custom:silk-doctor-card' };
  }

  public static async getConfigElement(): Promise<HTMLElement> {
    return document.createElement(EDITOR_TAG);
  }

  public setConfig(config: SilkDoctorCardConfig): void {
    if (config.limit !== undefined && !(Number(config.limit) >= 1)) {
      throw new Error('silk-doctor-card: `limit` must be a number of at least 1');
    }
    if (config.include_unknown !== undefined && typeof config.include_unknown !== 'boolean') {
      throw new Error('silk-doctor-card: `include_unknown` must be true or false');
    }
    if (config.ignore !== undefined && !Array.isArray(config.ignore)) {
      throw new Error(
        'silk-doctor-card: `ignore` must be a list of entity ids, domains, or `prefix*` globs'
      );
    }
    this._config = config;
    this._down = null;
    this._lastCompute = 0;
  }

  public getCardSize(): number {
    return 2 + Math.ceil(Math.min(this._limit(), 20) / 2);
  }

  public getGridOptions(): Record<string, number> {
    return { columns: 6, rows: 3, min_columns: 4, min_rows: 2 };
  }

  public connectedCallback(): void {
    super.connectedCallback();
    this._tickTimer = window.setInterval(() => this._compute(), TICK_MS);
  }

  public disconnectedCallback(): void {
    super.disconnectedCallback();
    window.clearInterval(this._tickTimer);
    window.clearTimeout(this._computeTimer);
    this._tickTimer = undefined;
    this._computeTimer = undefined;
  }

  protected willUpdate(changed: PropertyValues): void {
    if (!this.hass || !this._config) return;
    if (this._down === null) {
      this._compute();
      return;
    }
    if (changed.has('hass')) this._scheduleCompute();
  }

  private _limit(): number {
    return Math.max(1, Math.floor(this._config?.limit ?? DEFAULT_LIMIT));
  }

  /** Scanning every state on every state tick is wasteful; coalesce them. */
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
    const config = this._config;
    if (!hass || !config) return;
    this._lastCompute = Date.now();
    const includeUnknown = config.include_unknown ?? true;
    const ignore = Array.isArray(config.ignore) ? config.ignore : [];
    const now = Date.now();

    const rows: DownRow[] = [];
    for (const entityId of Object.keys(hass.states)) {
      const stateObj = hass.states[entityId];
      const unknown = stateObj.state === 'unknown';
      if (stateObj.state !== 'unavailable' && !(unknown && includeUnknown)) continue;
      if (ignore.length && matchesIgnore(entityId, ignore)) continue;
      const changedAt = Date.parse(stateObj.last_changed);
      rows.push({
        entityId,
        name: (stateObj.attributes.friendly_name as string | undefined) ?? entityId,
        unknown,
        downMs: Number.isFinite(changedAt) ? Math.max(0, now - changedAt) : 0,
      });
    }
    // Longest-down first: whatever broke earliest is the oldest wound.
    rows.sort((a, b) => b.downMs - a.downMs || a.name.localeCompare(b.name));
    this._down = rows;
  }

  /** The listed slice, regrouped by domain (groups ordered by their worst row). */
  private _groups(rows: DownRow[]): DomainGroup[] {
    const byDomain = new Map<string, DomainGroup>();
    for (const row of rows) {
      const domain = domainOf(row.entityId);
      let group = byDomain.get(domain);
      if (!group) {
        group = { domain, label: domainLabel(domain), rows: [] };
        byDomain.set(domain, group);
      }
      group.rows.push(row);
    }
    // `rows` is already longest-down first, so insertion order is group order.
    return [...byDomain.values()];
  }

  private _locale(): string {
    return this.hass?.locale?.language ?? this.hass?.language ?? 'en';
  }

  private _num(value: number): string {
    return new Intl.NumberFormat(this._locale(), { maximumFractionDigits: 0 }).format(value);
  }

  private _onRowClick(ev: Event, entityId: string): void {
    ev.stopPropagation();
    moreInfo(this, entityId);
  }

  private _renderRow(row: DownRow): TemplateResult {
    const label = `${row.unknown ? 'unknown' : 'down'} ${shortDuration(row.downMs)}`;
    return html`
      <button
        class="row"
        title=${`${row.entityId} — ${label}`}
        aria-label=${`${row.name}: ${label}`}
        @click=${(ev: Event) => this._onRowClick(ev, row.entityId)}
      >
        <span class="rname">${row.name}</span>
        <span class="dur ${row.unknown ? 'muted' : ''}">${label}</span>
      </button>
    `;
  }

  protected render(): TemplateResult | typeof nothing {
    const config = this._config;
    const hass = this.hass;
    if (!config || !hass) return nothing;

    const name = config.name ?? 'Doctor';
    const down = this._down ?? [];
    const listed = down.slice(0, this._limit());
    const hidden = down.length - listed.length;
    const groups = this._groups(listed);

    return html`
      <ha-card class="control" style="--silk-accent:${accentFor(undefined)}">
        <div class="head">
          <div class="title" title=${name}>${name}</div>
          ${down.length
            ? html`<span class="chip bad">${this._num(down.length)} down</span>`
            : html`<span class="chip ok">All healthy</span>`}
        </div>
        ${groups.length
          ? html`<div class="groups">
              ${groups.map(
                (group) => html`
                  <div class="group">
                    <div class="glabel">
                      <span class="gname">${group.label}</span>
                      <span class="gcount">${this._num(group.rows.length)}</span>
                    </div>
                    ${group.rows.map((row) => this._renderRow(row))}
                  </div>
                `
              )}
            </div>`
          : html`<div class="empty">Every entity is answering</div>`}
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
        align-items: center;
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
      /* Status colors, used for actual status: down is bad, healthy is good. */
      .chip {
        flex: none;
        cursor: default;
        font-variant-numeric: tabular-nums;
      }
      .chip.bad {
        color: var(--error-color, #db4437);
        background: color-mix(in srgb, var(--error-color, #db4437) 14%, transparent);
      }
      .chip.ok {
        color: var(--success-color, #43a047);
        background: color-mix(in srgb, var(--success-color, #43a047) 14%, transparent);
      }
      .groups {
        display: flex;
        flex-direction: column;
        gap: 6px;
        min-width: 0;
        /* A tall list must scroll rather than have its last row sliced off by
           whatever height the dashboard grid hands us. */
        overflow-y: auto;
        min-height: 0;
      }
      .group {
        display: flex;
        flex-direction: column;
        min-width: 0;
      }
      .glabel {
        display: flex;
        align-items: baseline;
        gap: 6px;
        padding: 2px 6px 3px;
        min-width: 0;
      }
      .gname {
        min-width: 0;
        font-size: 11px;
        font-weight: 600;
        line-height: 1.2;
        color: var(--secondary-text-color);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .gcount {
        flex: none;
        font-size: 11px;
        line-height: 1.2;
        color: var(--secondary-text-color);
        opacity: 0.65;
        font-variant-numeric: tabular-nums;
      }
      .row {
        display: flex;
        align-items: center;
        gap: 10px;
        width: 100%;
        min-height: 28px;
        margin: 0;
        padding: 2px 6px;
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
      .rname {
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
      .dur {
        flex: none;
        min-width: 64px;
        text-align: right;
        font-size: 12px;
        font-weight: 500;
        line-height: 1.3;
        color: var(--secondary-text-color);
        font-variant-numeric: tabular-nums;
        white-space: nowrap;
      }
      .dur.muted {
        opacity: 0.7;
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
    'silk-doctor-card': SilkDoctorCard;
  }
}
