import { LitElement, html, css, nothing, TemplateResult } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { HomeAssistant, HassEntity, LovelaceCardConfig } from '../types';
import { silkControlStyles } from '../shared/base';
import { isUnavailable, moreInfo, haptic } from '../shared/service';
import { accentFor } from '../shared/color';
import { registerEditor } from '../shared/editor';

export const META = {
  type: 'silk-package-card',
  name: 'Silk Packages',
  description: 'Everything in transit, in one list.',
};

/** One shipment tracked by its own entity: state = status, attributes fill the rest. */
export interface SilkPackageEntryConfig {
  entity: string;
  /** Package label; defaults to the entity's friendly name. */
  name?: string;
}

/**
 * Packages come from either side (or both):
 *
 * - `entity` — a sensor whose `attributes.packages` (or `attributes.data`)
 *   holds a list of objects with `name` | `title` | `description`,
 *   `status`, `carrier` | `service`, `eta` | `estimated_delivery` |
 *   `delivery_date`, and `tracking_number` | `tracking`.
 * - `packages` — one entity per shipment, whose *state* is the status and
 *   whose attributes carry `carrier`, `eta` and `tracking_number`.
 */
export interface SilkPackageCardConfig extends LovelaceCardConfig {
  entity?: string;
  /** Per-shipment entities. YAML-only — it is a list of objects. */
  packages?: SilkPackageEntryConfig[];
  /** Header label; `''` drops it and leaves the in-transit count alone. */
  name?: string;
  /** Rows shown before the overflow line. Default 6. */
  limit?: number;
  /** Days a delivered package stays bright before it dims. Default 2. */
  keep_days?: number;
}

/** Chip tone. Delivered / delayed is real shipment status, not decoration. */
type PackageTone = 'accent' | 'good' | 'warn' | 'muted';

interface PackageStatus {
  label: string;
  tone: PackageTone;
  delivered: boolean;
}

interface PackageRow {
  entityId: string;
  name: string;
  /** Carrier as written by the feed; used for the row's hover title. */
  carrier: string;
  /** 2–3 letter carrier badge. */
  badge: string;
  status: PackageStatus;
  etaMs: number | null;
  etaText: string | null;
  tracking: string | null;
  /** Delivered longer ago than `keep_days` — kept, but faded out. */
  stale: boolean;
  /** The shipment's own entity is dark; nothing to say about it right now. */
  unavailable: boolean;
}

const DEFAULT_LIMIT = 6;
const DEFAULT_KEEP_DAYS = 2;
const DEFAULT_NAME = 'Packages';
const DAY_MS = 86_400_000;
/** Guard rail: a feed with hundreds of shipments must not stall the render. */
const MAX_SOURCE_ITEMS = 60;

/** Carriers whose short form everyone already reads at a glance. */
const CARRIER_CODES: [RegExp, string][] = [
  [/fedex|federal express/, 'FDX'],
  [/usps|united states postal/, 'USP'],
  [/\bups\b|united parcel/, 'UPS'],
  [/dhl/, 'DHL'],
  [/amazon|amzl/, 'AMZ'],
  [/royal ?mail/, 'RM'],
  [/parcel ?force/, 'PF'],
  [/evri|hermes/, 'EVR'],
  [/yodel/, 'YDL'],
  [/canada ?post|postes/, 'CP'],
  [/purolator/, 'PUR'],
  [/post ?nord/, 'PN'],
  [/post ?nl/, 'PNL'],
  [/deutsche ?post/, 'DP'],
  [/an ?post/, 'AP'],
  [/aramex/, 'ARX'],
  [/gls/, 'GLS'],
  [/dpd/, 'DPD'],
  [/\btnt\b/, 'TNT'],
  [/sf ?express/, 'SF'],
  [/cainiao/, 'CN'],
  [/yamato|kuroneko/, 'YMT'],
  [/sagawa/, 'SGW'],
  [/japan ?post/, 'JP'],
  [/china ?post/, 'CHP'],
  [/korea ?post|우체국/, 'KP'],
  [/hanjin/, 'HJ'],
  [/lotte/, 'LT'],
  [/\bcj\b|대한통운/, 'CJ'],
];

/** A 2–3 letter badge for any carrier string, known or not. */
function carrierBadge(carrier: string): string {
  const text = carrier.trim();
  if (!text) return '?';
  const lower = text.toLowerCase();
  for (const [pattern, code] of CARRIER_CODES) {
    if (pattern.test(lower)) return code;
  }
  const words = text.replace(/[_\-.]+/g, ' ').split(/\s+/).filter(Boolean);
  if (words.length > 1) {
    return words
      .slice(0, 3)
      .map((word) => word[0])
      .join('')
      .toUpperCase();
  }
  return words[0].slice(0, 3).toUpperCase();
}

const titleCase = (text: string): string =>
  text.replace(/[_-]+/g, ' ').replace(/\S+/g, (word) => word[0].toUpperCase() + word.slice(1));

/** Normalize a carrier's wording into the three states that matter. */
function statusInfo(raw: string): PackageStatus {
  const text = raw.trim().toLowerCase();
  if (!text || text === 'unknown' || text === 'unavailable') {
    return { label: '—', tone: 'muted', delivered: false };
  }
  if (text.includes('out for delivery') || text.includes('out_for_delivery')) {
    return { label: 'Out for delivery', tone: 'accent', delivered: false };
  }
  if (text.includes('delay') || text.includes('exception') || text.includes('held')) {
    return { label: 'Delayed', tone: 'warn', delivered: false };
  }
  if (text.includes('deliver')) {
    return { label: 'Delivered', tone: 'good', delivered: true };
  }
  if (text.includes('pickup') || text.includes('collect')) {
    return { label: 'Ready for pickup', tone: 'accent', delivered: false };
  }
  // Checked before the generic transit match: 'pre_transit' is not in transit.
  if (
    text.includes('pre_transit') ||
    text.includes('pre-transit') ||
    text.includes('label') ||
    text.includes('info received')
  ) {
    return { label: 'Label created', tone: 'muted', delivered: false };
  }
  if (text.includes('transit') || text.includes('shipped') || text.includes('on the way')) {
    return { label: 'In transit', tone: 'muted', delivered: false };
  }
  return { label: titleCase(raw.trim()), tone: 'muted', delivered: false };
}

/** An ETA from an ISO datetime, a bare 'YYYY-MM-DD' date, or an epoch number. */
function parseEta(raw: unknown): number | null {
  if (typeof raw === 'number' && Number.isFinite(raw)) {
    if (raw >= 1e11) return raw;
    if (raw >= 1e9) return raw * 1000;
    return null;
  }
  if (typeof raw !== 'string') return null;
  const text = raw.trim();
  if (!text) return null;
  const dateOnly = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text);
  // Date.parse would read a bare date as UTC and shift the day in most zones.
  if (dateOnly) {
    return new Date(Number(dateOnly[1]), Number(dateOnly[2]) - 1, Number(dateOnly[3])).getTime();
  }
  const parsed = Date.parse(text);
  return Number.isFinite(parsed) ? parsed : null;
}

/** Local calendar-day difference — DST-proof, unlike dividing by 86.4M. */
function dayDiff(ms: number, now: number): number {
  const a = new Date(ms);
  const b = new Date(now);
  return Math.round(
    (Date.UTC(a.getFullYear(), a.getMonth(), a.getDate()) -
      Date.UTC(b.getFullYear(), b.getMonth(), b.getDate())) /
      DAY_MS
  );
}

const firstString = (...values: unknown[]): string | undefined => {
  for (const value of values) {
    if (typeof value === 'string' && value.trim() !== '') return value.trim();
    if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  }
  return undefined;
};

const EDITOR_TAG = 'silk-package-card-editor';

// `packages` stays YAML-only (a list of objects); the aggregate sensor and the
// list's shape are what a form can usefully offer.
registerEditor(
  EDITOR_TAG,
  [
    { name: 'entity', selector: { entity: { domain: ['sensor'] } } },
    { name: 'name', selector: { text: {} } },
    {
      name: '',
      type: 'grid',
      schema: [
        { name: 'limit', selector: { number: { min: 1, max: 20, mode: 'box' } } },
        { name: 'keep_days', selector: { number: { min: 0, max: 30, mode: 'box' } } },
      ],
    },
  ],
  {
    entity: 'Packages sensor',
    name: 'Name',
    limit: 'Rows shown',
    keep_days: 'Keep delivered (days)',
  },
  { limit: DEFAULT_LIMIT, keep_days: DEFAULT_KEEP_DAYS }
);

/**
 * Every shipment in one list: who is carrying it, where it has got to, and
 * when it lands. Delivered parcels sink to the bottom and fade — the card is
 * about what is still on its way.
 */
@customElement('silk-package-card')
export class SilkPackageCard extends LitElement {
  @property({ attribute: false }) public hass?: HomeAssistant;

  @state() private _config?: SilkPackageCardConfig;

  public static getStubConfig(hass: HomeAssistant): Partial<SilkPackageCardConfig> {
    const ids = Object.keys(hass.states).filter((id) => id.startsWith('sensor.'));
    const entity =
      ids.find((id) => {
        const attrs = hass.states[id].attributes;
        return Array.isArray(attrs.packages) || Array.isArray(attrs.data);
      }) ?? ids.find((id) => /package|parcel|delivery|shipment|track/i.test(id));
    return { type: 'custom:silk-package-card', entity };
  }

  public static async getConfigElement(): Promise<HTMLElement> {
    return document.createElement(EDITOR_TAG);
  }

  public setConfig(config: SilkPackageCardConfig): void {
    const hasList = Array.isArray(config.packages) && config.packages.length > 0;
    if (!config.entity && !hasList) {
      throw new Error('silk-package-card: set `entity` (a packages sensor) or `packages`');
    }
    if (config.packages !== undefined && !Array.isArray(config.packages)) {
      throw new Error('silk-package-card: `packages` must be a list of { entity } entries');
    }
    const broken = (config.packages ?? []).find(
      (entry) => !entry || typeof entry.entity !== 'string' || entry.entity === ''
    );
    if (broken !== undefined) {
      throw new Error('silk-package-card: every entry in `packages` needs an `entity`');
    }
    if (config.limit !== undefined && !(Number(config.limit) >= 1)) {
      throw new Error('silk-package-card: `limit` must be at least 1');
    }
    if (config.keep_days !== undefined && !(Number(config.keep_days) >= 0)) {
      throw new Error('silk-package-card: `keep_days` must be zero or more');
    }
    this._config = config;
  }

  public getCardSize(): number {
    const limit = Math.max(1, Number(this._config?.limit ?? DEFAULT_LIMIT));
    return 2 + Math.ceil(Math.min(limit, 12) / 2);
  }

  public getGridOptions(): Record<string, number> {
    return { columns: 6, rows: 3, min_columns: 4, min_rows: 2 };
  }

  private _locale(): string {
    return this.hass?.locale?.language ?? this.hass?.language ?? 'en';
  }

  /** 'Today' / 'Tomorrow' / 'Fri' / 'Aug 19' — or the feed's own words. */
  private _etaText(raw: unknown, ms: number | null, now: number): string | null {
    if (ms === null) {
      const text = firstString(raw);
      return text ?? null;
    }
    const diff = dayDiff(ms, now);
    if (diff === 0) return 'Today';
    if (diff === 1) return 'Tomorrow';
    if (diff === -1) return 'Yesterday';
    const locale = this._locale();
    if (diff > 1 && diff < 7) {
      return new Intl.DateTimeFormat(locale, { weekday: 'short' }).format(ms);
    }
    return new Intl.DateTimeFormat(locale, { month: 'short', day: 'numeric' }).format(ms);
  }

  private _keepMs(): number {
    return Math.max(0, Number(this._config?.keep_days ?? DEFAULT_KEEP_DAYS)) * DAY_MS;
  }

  /** Rows from the aggregate sensor's `packages` / `data` attribute. */
  private _rowsFromSensor(stateObj: HassEntity, now: number): PackageRow[] {
    const attrs = stateObj.attributes;
    const list = Array.isArray(attrs.packages)
      ? attrs.packages
      : Array.isArray(attrs.data)
        ? attrs.data
        : [];
    const keepMs = this._keepMs();
    const rows: PackageRow[] = [];
    for (const entry of list.slice(0, MAX_SOURCE_ITEMS)) {
      if (entry === null || typeof entry !== 'object') continue;
      const item = entry as Record<string, unknown>;
      const carrier = firstString(item.carrier, item.service, item.provider, item.shipper) ?? '';
      const statusRaw = firstString(item.status, item.state, item.status_description) ?? '';
      const status = statusInfo(statusRaw);
      const etaRaw = item.eta ?? item.estimated_delivery ?? item.delivery_date ?? item.expected;
      const etaMs = parseEta(etaRaw);
      const tracking = firstString(item.tracking_number, item.tracking, item.tracking_id) ?? null;
      rows.push({
        entityId: stateObj.entity_id,
        name:
          firstString(item.name, item.title, item.description, tracking ?? undefined) ?? 'Package',
        carrier,
        badge: carrierBadge(carrier),
        status,
        etaMs,
        etaText: this._etaText(etaRaw, etaMs, now),
        tracking,
        // Without a delivery time there is nothing to age, so it stays bright.
        stale: status.delivered && etaMs !== null && now - etaMs > keepMs,
        unavailable: false,
      });
    }
    return rows;
  }

  /** Rows from one entity per shipment. */
  private _rowsFromEntities(now: number): PackageRow[] {
    const hass = this.hass;
    const entries = this._config?.packages;
    if (!hass || !entries) return [];
    const keepMs = this._keepMs();
    const rows: PackageRow[] = [];
    for (const entry of entries) {
      const stateObj = hass.states[entry.entity];
      if (!stateObj) continue;
      const attrs = stateObj.attributes;
      const unavailable = isUnavailable(stateObj);
      const carrier = firstString(attrs.carrier, attrs.service, attrs.provider) ?? '';
      const status = statusInfo(unavailable ? '' : stateObj.state);
      const etaRaw = attrs.eta ?? attrs.estimated_delivery ?? attrs.delivery_date;
      const etaMs = parseEta(etaRaw);
      // A delivered shipment ages from its ETA, or from when it last changed.
      const doneMs = etaMs ?? Date.parse(stateObj.last_changed);
      rows.push({
        entityId: entry.entity,
        name:
          entry.name ?? firstString(attrs.friendly_name, attrs.name) ?? entry.entity,
        carrier,
        badge: carrierBadge(carrier),
        status,
        etaMs,
        etaText: unavailable ? null : this._etaText(etaRaw, etaMs, now),
        tracking: firstString(attrs.tracking_number, attrs.tracking) ?? null,
        stale: status.delivered && Number.isFinite(doneMs) && now - doneMs > keepMs,
        unavailable,
      });
    }
    return rows;
  }

  /** Everything tracked, in-transit first, soonest ETA first. */
  private _rows(now: number): PackageRow[] {
    const hass = this.hass;
    const config = this._config;
    if (!hass || !config) return [];
    const sensorObj = config.entity ? hass.states[config.entity] : undefined;
    const rows = [
      ...(sensorObj && !isUnavailable(sensorObj) ? this._rowsFromSensor(sensorObj, now) : []),
      ...this._rowsFromEntities(now),
    ];
    return rows.sort(
      (a, b) =>
        Number(a.status.delivered) - Number(b.status.delivered) ||
        (a.etaMs ?? Number.POSITIVE_INFINITY) - (b.etaMs ?? Number.POSITIVE_INFINITY) ||
        a.name.localeCompare(b.name)
    );
  }

  private _onCardClick(): void {
    const target = this._config?.entity ?? this._config?.packages?.[0]?.entity;
    if (target) moreInfo(this, target);
  }

  private _onRowClick(ev: Event, entityId: string): void {
    ev.stopPropagation();
    haptic(this);
    moreInfo(this, entityId);
  }

  private _renderRow(row: PackageRow): TemplateResult {
    const title = [row.name, row.carrier, row.status.label, row.etaText, row.tracking]
      .filter((part): part is string => !!part)
      .join(' · ');
    return html`
      <button
        class="row ${row.stale || row.unavailable ? 'faded' : ''}"
        title=${title}
        aria-label=${title}
        @click=${(ev: Event) => this._onRowClick(ev, row.entityId)}
      >
        <span class="carrier">${row.badge}</span>
        <span class="pname">${row.name}</span>
        <span class="chip static ${row.status.tone}">${row.status.label}</span>
        <span class="eta">${row.etaText ?? ''}</span>
      </button>
    `;
  }

  protected render(): TemplateResult | typeof nothing {
    const config = this._config;
    const hass = this.hass;
    if (!config || !hass) return nothing;

    const sensorObj = config.entity ? hass.states[config.entity] : undefined;
    const entityIds = (config.packages ?? []).map((entry) => entry.entity);
    const entityObjs = entityIds.map((id) => hass.states[id]);
    if (config.entity && !sensorObj && entityObjs.every((obj) => !obj)) {
      return html`
        <ha-card class="control">
          <div class="warning">Entity not found: ${config.entity}</div>
        </ha-card>
      `;
    }

    const now = Date.now();
    const rows = this._rows(now);
    const limit = Math.max(1, Math.floor(Number(config.limit ?? DEFAULT_LIMIT)));
    const shown = rows.slice(0, limit);
    const overflow = rows.length - shown.length;
    // A shipment with no status to report is not evidence of anything moving.
    const inTransit = rows.filter(
      (row) => !row.status.delivered && !row.unavailable && row.status.label !== '—'
    ).length;

    const sources = [sensorObj, ...entityObjs].filter((obj): obj is HassEntity => !!obj);
    const unavailable = sources.length > 0 && sources.every((obj) => isUnavailable(obj));
    const accent = accentFor(sources[0]);
    const name = config.name ?? DEFAULT_NAME;

    return html`
      <ha-card
        class="control ${unavailable ? 'unavailable' : ''}"
        style="--silk-accent:${accent}"
        @click=${this._onCardClick}
      >
        <div class="header">
          ${name === '' ? nothing : html`<div class="hname">${name}</div>`}
          <span class="count">
            ${unavailable
              ? 'Unavailable'
              : inTransit > 0
                ? `${inTransit} in transit`
                : rows.length
                  ? 'All delivered'
                  : ''}
          </span>
        </div>
        ${shown.length
          ? html`<div class="rows">${shown.map((row) => this._renderRow(row))}</div>`
          : html`<div class="empty">${unavailable ? 'Unavailable' : 'No packages'}</div>`}
        ${overflow > 0 ? html`<div class="more">+${overflow} more</div>` : nothing}
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
      }
      .header {
        flex: none;
        display: flex;
        align-items: baseline;
        gap: 8px;
        min-height: 20px;
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
      .count {
        flex: none;
        font-size: 12px;
        font-weight: 500;
        color: var(--secondary-text-color);
        font-variant-numeric: tabular-nums;
        white-space: nowrap;
      }
      .rows {
        display: flex;
        flex-direction: column;
        gap: 2px;
        min-height: 0;
        margin: 0 -6px;
        overflow: hidden;
      }
      .row {
        display: flex;
        align-items: center;
        gap: 8px;
        width: 100%;
        min-height: 32px;
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
        transition:
          background 150ms ease-out,
          opacity 200ms ease,
          transform 250ms var(--silk-spring);
      }
      .row:hover {
        background: rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.05);
      }
      .row:active {
        transform: scale(0.985);
        transition-duration: 120ms;
        transition-timing-function: var(--silk-ease-out);
      }
      .row:focus-visible {
        box-shadow: inset 0 0 0 2px color-mix(in srgb, var(--silk-accent) 70%, transparent);
      }
      /* Delivered and old — or simply dark: kept, faded, out of the way. */
      .row.faded {
        opacity: 0.45;
      }
      .carrier {
        flex: none;
        box-sizing: border-box;
        min-width: 32px;
        height: 22px;
        padding: 0 5px;
        display: grid;
        place-items: center;
        border-radius: 7px;
        background: rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.08);
        color: var(--secondary-text-color);
        font-size: 10px;
        font-weight: 700;
        letter-spacing: 0.02em;
        line-height: 1;
        white-space: nowrap;
      }
      .pname {
        flex: 1 1 auto;
        min-width: 0;
        font-size: 13.5px;
        font-weight: 500;
        line-height: 1.3;
        color: var(--primary-text-color);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      /* Informational chips are not controls: no pointer, no hover lift.
         The chip never shrinks — the package name is the part that ellipses,
         because 'Out for d…' would throw away the row's whole point. */
      .chip.static {
        flex: none;
        cursor: inherit;
        white-space: nowrap;
      }
      .chip.static:hover {
        background: rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.06);
      }
      /* Delivered / delayed is real shipment status — the tokens earn it. */
      .chip.static.good,
      .chip.static.good:hover {
        color: var(--success-color, #43a047);
        background: color-mix(in srgb, var(--success-color, #43a047) 14%, transparent);
      }
      .chip.static.warn,
      .chip.static.warn:hover {
        color: var(--warning-color, #ffa600);
        background: color-mix(in srgb, var(--warning-color, #ffa600) 16%, transparent);
      }
      .chip.static.accent,
      .chip.static.accent:hover {
        color: var(--silk-accent);
        background: color-mix(in srgb, var(--silk-accent) 16%, transparent);
      }
      .eta {
        flex: none;
        min-width: 42px;
        text-align: right;
        font-size: 11px;
        line-height: 1.3;
        color: var(--secondary-text-color);
        font-variant-numeric: tabular-nums;
        white-space: nowrap;
      }
      .more {
        flex: none;
        padding-left: 2px;
        font-size: 12px;
        line-height: 1.3;
        color: var(--secondary-text-color);
        font-variant-numeric: tabular-nums;
        white-space: nowrap;
      }
      .empty {
        flex: 1;
        display: flex;
        align-items: center;
        justify-content: center;
        min-height: 48px;
        font-size: 13px;
        color: var(--secondary-text-color);
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    'silk-package-card': SilkPackageCard;
  }
}
