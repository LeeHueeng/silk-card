import { LitElement, html, css, nothing, PropertyValues, TemplateResult } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { HomeAssistant, HassEntity, LovelaceCardConfig } from '../types';
import { silkControlStyles } from '../shared/base';
import { domainOf, isUnavailable, moreInfo, haptic } from '../shared/service';
import { accentFor } from '../shared/color';
import { registerEditor } from '../shared/editor';

export const META = {
  type: 'silk-visitor-card',
  name: 'Silk Visitors',
  description: "The door's diary.",
};

export interface SilkVisitorCardConfig extends LovelaceCardConfig {
  /** Door / motion / doorbell entities to merge, first six win. */
  entities: string[];
  name?: string;
  /** Rows rendered. Default 8. */
  limit?: number;
  /** Window length ending at now. Default 48. */
  hours_to_show?: number;
  /** Accent override. */
  color?: string;
}

/**
 * `hass.callApi` exists on the real frontend hass object but is not part of
 * Silk's minimal HomeAssistant type — extend it locally for the logbook REST
 * endpoint (the logbook has no websocket one-shot equivalent worth the weight).
 */
interface HassWithApi extends HomeAssistant {
  callApi<T>(method: 'GET', path: string): Promise<T>;
}

/** A row from `GET /api/logbook/<start>?entity=...` — `when` is an ISO stamp. */
interface LogbookEntry {
  when: string | number;
  state?: string;
  message?: string;
  name?: string;
  entity_id?: string;
}

/** What kind of thing spoke — encoded in the dot's weight, never in its hue. */
type Kind = 'bell' | 'door' | 'motion' | 'other';

interface VisitorEvent {
  ms: number;
  entity: string;
  name: string;
  kind: Kind;
  what: string;
}

const DEFAULT_LIMIT = 8;
const DEFAULT_HOURS = 48;
const MAX_ENTITIES = 6;
const MAX_LIMIT = 20;
const MAX_HOURS = 168;
const DAY_MS = 86_400_000;
const REFRESH_INTERVAL_MS = 300_000;
const REFRESH_THROTTLE_MS = 30_000;
/** Re-render cadence so the relative times never go stale between fetches. */
const CLOCK_TICK_MS = 30_000;

/** Door/window device classes, wherever they show up. */
const DOOR_CLASSES = new Set(['door', 'garage_door', 'garage', 'opening', 'window', 'gate']);
const MOTION_CLASSES = new Set(['motion', 'occupancy', 'presence', 'moving']);
/** States that mean "something happened", the only ones a diary should list. */
const ACTIVE_STATES = new Set(['on', 'open', 'opened', 'unlocked', 'detected', 'home']);

const EDITOR_TAG = 'silk-visitor-card-editor';

registerEditor(
  EDITOR_TAG,
  [
    {
      name: 'entities',
      required: true,
      selector: {
        entity: { multiple: true, domain: ['binary_sensor', 'event', 'lock', 'cover'] },
      },
    },
    { name: 'name', selector: { text: {} } },
    {
      name: '',
      type: 'grid',
      schema: [
        { name: 'limit', selector: { number: { min: 1, max: MAX_LIMIT, mode: 'box' } } },
        { name: 'hours_to_show', selector: { number: { min: 1, max: MAX_HOURS, mode: 'box' } } },
      ],
    },
  ],
  {
    entities: 'Door, motion and doorbell entities',
    name: 'Name',
    limit: 'Rows',
    hours_to_show: 'Hours to show',
  },
  { limit: DEFAULT_LIMIT, hours_to_show: DEFAULT_HOURS }
);

/** Logbook `when` → epoch ms. REST sends ISO strings; be lenient about numbers. */
function whenToMs(when: string | number): number {
  if (typeof when === 'number') return when > 1e12 ? when : when * 1000;
  return Date.parse(when);
}

/** 'just now' → 'Nm ago' → 'Nh ago' → 'Nd ago'. */
function relativeTime(ms: number): string {
  const sec = Math.max(0, (Date.now() - ms) / 1000);
  if (sec < 60) return 'just now';
  if (sec < 3600) return `${Math.floor(sec / 60)}m ago`;
  if (sec < 86400) return `${Math.floor(sec / 3600)}h ago`;
  return `${Math.floor(sec / 86400)}d ago`;
}

/** Local midnight (ms) of the day containing `ms` — DST-proof. */
function midnightOf(ms: number): number {
  const d = new Date(ms);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

/**
 * Everything that happened at the edges of the house, in one column: the door
 * opening, the hall waking up, the bell ringing — newest first, grouped by day.
 */
@customElement('silk-visitor-card')
export class SilkVisitorCard extends LitElement {
  @property({ attribute: false }) public hass?: HomeAssistant;

  @state() private _config?: SilkVisitorCardConfig;
  /** Newest first; null until the first fetch resolves. */
  @state() private _events: VisitorEvent[] | null = null;
  @state() private _failed = false;

  private _entities: string[] = [];
  private _fetchStarted = false;
  private _fetchSeq = 0;
  private _lastFetch = 0;
  private _lastStamp = '';
  private _refreshTimer?: number;
  private _intervalTimer?: number;
  private _clockTimer?: number;

  public static getStubConfig(hass: HomeAssistant): Partial<SilkVisitorCardConfig> {
    const ids = Object.keys(hass.states);
    const byClass = (classes: Set<string>) =>
      ids.filter((id) => {
        if (!id.startsWith('binary_sensor.')) return false;
        const deviceClass = hass.states[id].attributes.device_class;
        return typeof deviceClass === 'string' && classes.has(deviceClass);
      });
    const bells = ids.filter((id) => id.startsWith('event.') && /doorbell|chime/i.test(id));
    const entities = [...bells, ...byClass(DOOR_CLASSES), ...byClass(MOTION_CLASSES)].slice(
      0,
      MAX_ENTITIES
    );
    return { type: 'custom:silk-visitor-card', entities };
  }

  public static async getConfigElement(): Promise<HTMLElement> {
    return document.createElement(EDITOR_TAG);
  }

  public setConfig(config: SilkVisitorCardConfig): void {
    if (!Array.isArray(config.entities) || config.entities.length === 0) {
      throw new Error(
        'silk-visitor-card: `entities` is required — a list of door/motion/doorbell entity ids'
      );
    }
    for (const id of config.entities) {
      if (typeof id !== 'string' || !id.includes('.')) {
        throw new Error(`silk-visitor-card: \`${String(id)}\` is not an entity id`);
      }
    }
    if (config.limit !== undefined && !(Number(config.limit) > 0)) {
      throw new Error('silk-visitor-card: `limit` must be a positive number');
    }
    if (config.hours_to_show !== undefined && !(Number(config.hours_to_show) > 0)) {
      throw new Error('silk-visitor-card: `hours_to_show` must be a positive number');
    }
    // One logbook request per entity, so the entity list is capped rather than
    // letting a big config fan out into a dozen REST calls.
    this._entities = config.entities.slice(0, MAX_ENTITIES);
    this._config = config;
    this._events = null;
    this._failed = false;
    this._fetchStarted = false;
    this._lastStamp = '';
  }

  public getCardSize(): number {
    return 3;
  }

  public getGridOptions(): Record<string, number> {
    return { columns: 6, rows: 3, min_columns: 4, min_rows: 2 };
  }

  public connectedCallback(): void {
    super.connectedCallback();
    this._intervalTimer = window.setInterval(() => this._refresh(), REFRESH_INTERVAL_MS);
    this._clockTimer = window.setInterval(() => this.requestUpdate(), CLOCK_TICK_MS);
    if (this.hasUpdated && this._fetchStarted) this._refresh();
  }

  public disconnectedCallback(): void {
    super.disconnectedCallback();
    window.clearInterval(this._intervalTimer);
    window.clearInterval(this._clockTimer);
    window.clearTimeout(this._refreshTimer);
    this._refreshTimer = undefined;
    this._intervalTimer = undefined;
    this._clockTimer = undefined;
  }

  protected willUpdate(changed: PropertyValues): void {
    if (!this.hass || !this._config) return;
    if (!this._fetchStarted) {
      this._fetchStarted = true;
      this._refresh();
      return;
    }
    if (changed.has('hass')) this._onStatesChanged();
  }

  /** Any tracked entity moving pulls a fresh logbook, throttled to 30s. */
  private _onStatesChanged(): void {
    const hass = this.hass!;
    const stamp = this._entities.map((id) => hass.states[id]?.last_changed ?? '').join('|');
    if (stamp === this._lastStamp) return;
    this._lastStamp = stamp;
    if (this._refreshTimer) return;
    const wait = Math.max(0, REFRESH_THROTTLE_MS - (Date.now() - this._lastFetch));
    this._refreshTimer = window.setTimeout(() => {
      this._refreshTimer = undefined;
      this._refresh();
    }, wait);
  }

  private _hours(): number {
    const hours = Number(this._config?.hours_to_show ?? DEFAULT_HOURS);
    return Number.isFinite(hours) && hours > 0 ? Math.min(hours, MAX_HOURS) : DEFAULT_HOURS;
  }

  private async _refresh(): Promise<void> {
    const hass = this.hass as HassWithApi | undefined;
    if (!hass || !this._config || !this._entities.length) return;
    const seq = ++this._fetchSeq;
    const end = new Date();
    const start = new Date(end.getTime() - this._hours() * 3_600_000);
    const path = (id: string) =>
      `logbook/${start.toISOString()}?entity=${encodeURIComponent(id)}&end_time=${encodeURIComponent(
        end.toISOString()
      )}`;

    // One request per entity; a single dead entity must not blank the card.
    let results: PromiseSettledResult<LogbookEntry[]>[];
    try {
      results = await Promise.allSettled(
        this._entities.map((id) => hass.callApi<LogbookEntry[]>('GET', path(id)))
      );
    } catch (err) {
      // Only reachable when callApi itself is missing from this frontend.
      console.warn('silk-visitor-card: logbook unavailable', err);
      if (seq === this._fetchSeq) {
        this._failed = true;
        this._events = this._events ?? [];
      }
      return;
    }
    if (seq !== this._fetchSeq) return; // a newer fetch superseded this one
    this._lastFetch = Date.now();

    const merged: VisitorEvent[] = [];
    let ok = false;
    results.forEach((result, index) => {
      const entityId = this._entities[index];
      if (result.status !== 'fulfilled') {
        console.warn('silk-visitor-card: logbook fetch failed', entityId, result.reason);
        return;
      }
      ok = true;
      const rows = Array.isArray(result.value) ? result.value : [];
      for (const row of rows) {
        const ms = whenToMs(row.when);
        if (!Number.isFinite(ms)) continue;
        const id = row.entity_id ?? entityId;
        const event = this._toEvent(id, row, ms);
        if (event) merged.push(event);
      }
    });
    merged.sort((a, b) => b.ms - a.ms);
    this._events = merged;
    this._failed = !ok;
  }

  /** What kind of thing this entity is — drives the dot and the verb. */
  private _kindOf(entityId: string, stateObj?: HassEntity): Kind {
    const domain = domainOf(entityId);
    const deviceClass = stateObj?.attributes.device_class;
    if (domain === 'event') return deviceClass === 'doorbell' ? 'bell' : 'other';
    if (/doorbell|chime/i.test(entityId)) return 'bell';
    if (domain === 'lock') return 'door';
    if (typeof deviceClass === 'string') {
      if (DOOR_CLASSES.has(deviceClass)) return 'door';
      if (MOTION_CLASSES.has(deviceClass)) return 'motion';
      if (deviceClass === 'sound') return 'bell';
    }
    if (domain === 'cover') return 'door';
    return 'other';
  }

  /**
   * A logbook row becomes a diary line only when it *is* an arrival: doors
   * opening, rooms waking, bells ringing. The matching "closed" and "cleared"
   * rows are dropped — a visitor log answers "who came by", not "what settled".
   */
  private _toEvent(entityId: string, row: LogbookEntry, ms: number): VisitorEvent | null {
    const hass = this.hass!;
    const stateObj = hass.states[entityId];
    const kind = this._kindOf(entityId, stateObj);
    const raw = (row.state ?? '').toLowerCase();
    const name = stateObj?.attributes.friendly_name ?? row.name ?? entityId.split('.')[1] ?? entityId;

    if (kind === 'bell') return { ms, entity: entityId, name, kind, what: 'rang' };
    if (domainOf(entityId) === 'event') {
      // Event entities carry a timestamp as their "state"; the message is the
      // only human-readable part.
      const message = (row.message ?? '').trim();
      return { ms, entity: entityId, name, kind, what: message || 'triggered' };
    }
    if (!ACTIVE_STATES.has(raw)) return null;
    const what = kind === 'motion' ? 'motion' : raw === 'unlocked' ? 'unlocked' : 'opened';
    return { ms, entity: entityId, name, kind, what };
  }

  private _locale(): string {
    return this.hass?.locale?.language ?? this.hass?.language ?? 'en';
  }

  private _dayLabel(dayMs: number, todayMs: number, fmt: Intl.DateTimeFormat): string {
    // Round, not truncate: DST-stretched days are not exactly 24h long.
    const diff = Math.round((todayMs - dayMs) / DAY_MS);
    if (diff === 0) return 'Today';
    if (diff === 1) return 'Yesterday';
    return fmt.format(dayMs);
  }

  private _onRowClick(ev: Event, entityId: string): void {
    ev.stopPropagation();
    haptic(this, 'selection');
    moreInfo(this, entityId);
  }

  private _renderRow(event: VisitorEvent, timeFmt: Intl.DateTimeFormat): TemplateResult {
    const exact = timeFmt.format(new Date(event.ms));
    const title = `${event.name} ${event.what} · ${exact}`;
    return html`
      <button
        class="row"
        title=${title}
        aria-label=${title}
        @click=${(ev: Event) => this._onRowClick(ev, event.entity)}
      >
        <span class="dot ${event.kind}"></span>
        <span class="rname">${event.name}</span>
        <span class="what">${event.what}</span>
        <span class="when">${relativeTime(event.ms)}</span>
      </button>
    `;
  }

  protected render(): TemplateResult | typeof nothing {
    const config = this._config;
    const hass = this.hass;
    if (!config || !hass) return nothing;

    const objs = this._entities.map((id) => hass.states[id]);
    if (objs.every((obj) => !obj)) {
      return html`
        <ha-card class="control">
          <div class="warning">Entity not found: ${this._entities.join(', ')}</div>
        </ha-card>
      `;
    }

    const accent = accentFor(
      objs.find((obj) => obj),
      config.color
    );
    const unavailable = objs.every((obj) => !obj || isUnavailable(obj));
    const limit = Math.min(Math.round(Number(config.limit ?? DEFAULT_LIMIT)), MAX_LIMIT);
    const shown = (this._events ?? []).slice(0, limit);
    const name = config.name ?? 'Visitors';

    const locale = this._locale();
    const timeFmt = new Intl.DateTimeFormat(locale, { hour: 'numeric', minute: '2-digit' });
    const dayFmt = new Intl.DateTimeFormat(locale, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
    // Grouped against the clock at render time, so 'Today' stays honest even if
    // the card sat open across midnight.
    const todayMid = midnightOf(Date.now());

    const rows: TemplateResult[] = [];
    let lastDay: number | null = null;
    for (const event of shown) {
      const dayMs = midnightOf(event.ms);
      if (dayMs !== lastDay) {
        lastDay = dayMs;
        rows.push(html`<div class="day">${this._dayLabel(dayMs, todayMid, dayFmt)}</div>`);
      }
      rows.push(this._renderRow(event, timeFmt));
    }

    return html`
      <ha-card
        class="control ${unavailable ? 'unavailable' : ''}"
        style="--silk-accent:${accent}"
      >
        <div class="header">
          <div class="hname" title=${name}>${name}</div>
          ${this._events !== null && this._events.length > 0
            ? html`<span class="count">${this._events.length}</span>`
            : nothing}
        </div>
        <div class="rows">
          ${rows.length
            ? rows
            : html`<div class="note">
                ${this._failed
                  ? 'Logbook unavailable right now'
                  : this._events === null
                    ? 'Reading the logbook…'
                    : 'Nothing at the door yet'}
              </div>`}
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
        font-size: 11px;
        font-weight: 600;
        letter-spacing: 0.02em;
        line-height: 1;
        padding: 4px 9px;
        border-radius: 999px;
        color: var(--secondary-text-color);
        background: rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.06);
        font-variant-numeric: tabular-nums;
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
      .day {
        flex: none;
        padding: 6px 6px 2px;
        font-size: 11px;
        font-weight: 600;
        line-height: 1.2;
        color: var(--secondary-text-color);
        opacity: 0.7;
        white-space: nowrap;
      }
      .day:first-child {
        padding-top: 0;
      }
      .row {
        flex: none;
        display: flex;
        align-items: center;
        gap: 9px;
        width: 100%;
        min-height: 28px;
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
        animation: silk-visitor-in 250ms var(--silk-ease-out);
      }
      .row:hover {
        background: rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.06);
      }
      .row:focus-visible {
        background: rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.06);
        box-shadow: inset 0 0 0 2px color-mix(in srgb, var(--silk-accent) 70%, transparent);
      }
      /* One hue for the whole diary: the kind of event changes the dot's
         weight (solid → tinted → hollow), never its color. */
      .dot {
        flex: none;
        width: 8px;
        height: 8px;
        border-radius: 50%;
        box-sizing: border-box;
        background: var(--silk-accent);
      }
      .dot.door {
        background: color-mix(in srgb, var(--silk-accent) 55%, transparent);
      }
      .dot.motion {
        background: transparent;
        border: 2px solid color-mix(in srgb, var(--silk-accent) 45%, transparent);
      }
      .dot.other {
        background: rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.2);
      }
      .rname {
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
      .what {
        flex: none;
        max-width: 40%;
        font-size: 12px;
        line-height: 1.3;
        color: var(--secondary-text-color);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .when {
        flex: none;
        font-size: 11px;
        line-height: 1.3;
        color: var(--secondary-text-color);
        font-variant-numeric: tabular-nums;
        white-space: nowrap;
      }
      .note {
        padding: 2px 6px;
        font-size: 12.5px;
        line-height: 1.3;
        color: var(--secondary-text-color);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .unavailable .rows {
        opacity: 0.45;
      }
      @keyframes silk-visitor-in {
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
    'silk-visitor-card': SilkVisitorCard;
  }
}
