import { LitElement, html, css, nothing, TemplateResult } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { HomeAssistant, HassEntity, LovelaceCardConfig } from '../types';
import { silkControlStyles } from '../shared/base';
import { isUnavailable, moreInfo, haptic } from '../shared/service';
import { accentFor } from '../shared/color';
import { entityListSelector } from '../shared/list';
import { registerListEditor } from '../shared/listeditor';

export const META = {
  type: 'silk-transit-card',
  name: 'Silk Departures',
  description: 'The next ones out, counted down.',
};

/**
 * One configured line. The entity may expose its departures two ways:
 *
 * 1. **Timestamp state** — the state itself is the next departure: an ISO
 *    datetime (`device_class: timestamp`), an epoch number (seconds or ms), a
 *    minutes-from-now number, or a bare `HH:MM` clock string. `line`,
 *    `direction`/`destination` and `delay` are then read off the attributes.
 * 2. **Departures array** — `attributes.departures` or
 *    `attributes.next_departures`, a list of objects carrying:
 *      - `time` | `departure` | `departure_time` | `scheduled` — when it leaves
 *      - `line` — badge label (config `line` wins)
 *      - `direction` | `destination` | `headsign` — where it goes
 *      - `delay` — minutes late (`'+3'`-style strings are parsed too). The
 *        countdown follows the time the feed reports and the delay is shown
 *        beside it, exactly as a platform board does — never added twice.
 *      - `line_color` | `color` — badge color (config `color` wins)
 *    A bare list of times (strings or numbers) is accepted as well.
 */
export interface SilkTransitLineConfig {
  entity: string;
  /** Destination label; defaults to the feed's direction, then the entity name. */
  name?: string;
  /** Badge label; defaults to the feed's line, then a code from the name. */
  line?: string;
  /** Badge background — a transit line's own identity color. */
  color?: string;
}

/**
 * `lines` takes both shapes: a bare entity id — what the visual editor's
 * picker writes — becomes a line that reads its badge and destination off the
 * feed, while an object spells out name/line/color by hand.
 */
export type SilkTransitLineEntry = string | SilkTransitLineConfig;

export interface SilkTransitCardConfig extends LovelaceCardConfig {
  /** Lines to watch. */
  lines: SilkTransitLineEntry[];
  /** Header label; `''` drops the header and gives the row back to the board. */
  name?: string;
  /** Departure rows shown, soonest first. Default 5. */
  limit?: number;
}

/** The config after setConfig has folded every bare id into an object. */
type ResolvedTransitConfig = Omit<SilkTransitCardConfig, 'lines'> & {
  lines: SilkTransitLineConfig[];
};

/** One board row. `ms` is null when nothing is departing (or the entity is dark). */
interface Departure {
  entityId: string;
  line: string;
  color?: string;
  destination: string;
  ms: number | null;
  /** Minutes late; 0 when the feed says nothing. */
  delay: number;
  unavailable: boolean;
}

const DEFAULT_LIMIT = 5;
const DEFAULT_NAME = 'Departures';
const MINUTE_MS = 60_000;
const HOUR_MS = 3_600_000;
const DAY_MS = 86_400_000;
/** Countdowns are re-computed on this beat, independent of any state change. */
const TICK_MS = 30_000;
/** A departure stays on the board for a minute after it was due. */
const GRACE_MS = MINUTE_MS;
/** Under two minutes you will not make it — the row steps back. */
const MISS_MS = 2 * MINUTE_MS;
/** Past this the countdown stops being useful and the clock time reads better. */
const CLOCK_AFTER_MS = HOUR_MS;
/** Guard rail: one entity dumping hundreds of departures must not stall render. */
const MAX_PER_ENTITY = 20;

/**
 * Parse a departure time. Feeds are wildly inconsistent, so every shape that
 * appears in the wild is accepted: ISO datetimes, epoch seconds/ms, plain
 * minutes-from-now, and `HH:MM` clock strings.
 */
function parseDepartureTime(raw: unknown, now: number): number | null {
  if (typeof raw === 'number' && Number.isFinite(raw)) {
    if (raw >= 1e11) return raw; // epoch milliseconds
    if (raw >= 1e9) return raw * 1000; // epoch seconds
    if (raw < 0) return null;
    return now + raw * MINUTE_MS; // minutes from now
  }
  if (typeof raw !== 'string') return null;
  const text = raw.trim();
  if (!text) return null;
  const clock = /^(\d{1,2}):(\d{2})(?::(\d{2}))?$/.exec(text);
  if (clock) {
    const at = new Date(now);
    at.setHours(Number(clock[1]), Number(clock[2]), Number(clock[3] ?? 0), 0);
    let ms = at.getTime();
    // A clock time already well past belongs to tomorrow's board, not today's.
    if (ms < now - 2 * HOUR_MS) ms += DAY_MS;
    return ms;
  }
  const parsed = Date.parse(text);
  if (Number.isFinite(parsed)) return parsed;
  const numeric = Number(text);
  return Number.isFinite(numeric) && text !== '' ? parseDepartureTime(numeric, now) : null;
}

/** Delay in minutes, from a number or a `'+3 min'` style string. */
function parseDelay(raw: unknown): number {
  if (typeof raw === 'number' && Number.isFinite(raw)) return raw;
  if (typeof raw === 'string') {
    const match = /-?\d+(\.\d+)?/.exec(raw);
    if (match) return Number(match[0]);
  }
  return 0;
}

const firstString = (...values: unknown[]): string | undefined => {
  for (const value of values) {
    if (typeof value === 'string' && value.trim() !== '') return value.trim();
    if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  }
  return undefined;
};

/** A short badge label distilled from a name: '143', 'M4' or 'NEX'. */
function shortCode(text: string): string {
  const words = text.replace(/[_\-/]+/g, ' ').split(/\s+/).filter(Boolean);
  if (!words.length) return '–';
  const numbered = words.find((word) => /\d/.test(word));
  if (numbered) return numbered.slice(0, 3).toUpperCase();
  if (words.length > 1) {
    return words
      .slice(0, 3)
      .map((word) => word[0])
      .join('')
      .toUpperCase();
  }
  return words[0].slice(0, 3).toUpperCase();
}

const EDITOR_TAG = 'silk-transit-card-editor';

// The picker writes bare ids into `lines`; per-line badge labels and colors
// survive it, because the merge folds the picked ids back into the entries
// that are already there.
registerListEditor(EDITOR_TAG, {
  schema: [
    entityListSelector('lines', ['sensor']),
    {
      name: '',
      type: 'grid',
      schema: [
        { name: 'name', selector: { text: {} } },
        { name: 'limit', selector: { number: { min: 1, max: 12, mode: 'box' } } },
      ],
    },
  ],
  labels: { lines: '노선 엔티티', name: '이름', limit: '표시 개수' },
  defaults: { limit: DEFAULT_LIMIT },
  listFields: ['lines'],
});

/**
 * The departure board: line badge, where it goes, how long you have. One
 * question answered at a glance — do I need to run?
 */
@customElement('silk-transit-card')
export class SilkTransitCard extends LitElement {
  @property({ attribute: false }) public hass?: HomeAssistant;

  @state() private _config?: ResolvedTransitConfig;

  private _tickTimer?: number;

  public static getStubConfig(hass: HomeAssistant): Partial<SilkTransitCardConfig> {
    const ids = Object.keys(hass.states).filter((id) => id.startsWith('sensor.'));
    const withArray = ids.filter((id) => {
      const attrs = hass.states[id].attributes;
      return Array.isArray(attrs.departures) || Array.isArray(attrs.next_departures);
    });
    const timestamps = ids.filter(
      (id) => hass.states[id].attributes.device_class === 'timestamp'
    );
    const picked = (withArray.length ? withArray : timestamps).slice(0, 3);
    return {
      type: 'custom:silk-transit-card',
      lines: picked.map((entity) => ({ entity })),
    };
  }

  public static async getConfigElement(): Promise<HTMLElement> {
    return document.createElement(EDITOR_TAG);
  }

  public setConfig(config: SilkTransitCardConfig): void {
    if (!Array.isArray(config.lines) || config.lines.length === 0) {
      throw new Error('silk-transit-card: `lines` requires at least one { entity } entry');
    }
    // A bare id is the shape the entity picker writes; everything downstream
    // reads a line as an object, so fold it here once.
    const lines = config.lines.map((line) =>
      typeof line === 'string' ? { entity: line } : line
    );
    const broken = lines.find(
      (line) => !line || typeof line.entity !== 'string' || line.entity === ''
    );
    if (broken !== undefined) {
      throw new Error('silk-transit-card: every entry in `lines` needs an `entity`');
    }
    if (config.limit !== undefined && !(Number(config.limit) >= 1)) {
      throw new Error('silk-transit-card: `limit` must be at least 1');
    }
    this._config = { ...config, lines };
  }

  public getCardSize(): number {
    const limit = Math.max(1, Number(this._config?.limit ?? DEFAULT_LIMIT));
    return 2 + Math.ceil(Math.min(limit, 12) / 2);
  }

  public getGridOptions(): Record<string, number> {
    return { columns: 6, rows: 3, min_columns: 4, min_rows: 2 };
  }

  public connectedCallback(): void {
    super.connectedCallback();
    // Countdowns move on their own clock: HA sends no state change between
    // '4 min' and '3 min', so the card re-renders itself every half minute.
    this._tickTimer = window.setInterval(() => this.requestUpdate(), TICK_MS);
  }

  public disconnectedCallback(): void {
    super.disconnectedCallback();
    window.clearInterval(this._tickTimer);
    this._tickTimer = undefined;
  }

  private _locale(): string {
    return this.hass?.locale?.language ?? this.hass?.language ?? 'en';
  }

  /** Departures contributed by one configured line. */
  private _departuresFor(
    cfg: SilkTransitLineConfig,
    stateObj: HassEntity | undefined,
    now: number
  ): Departure[] {
    const friendly =
      (stateObj?.attributes.friendly_name as string | undefined) ?? cfg.entity.split('.')[1] ?? cfg.entity;
    const base = {
      entityId: cfg.entity,
      color: cfg.color,
      destination: cfg.name ?? friendly,
      line: cfg.line ?? shortCode(cfg.name ?? friendly),
      delay: 0,
      unavailable: true,
      ms: null as number | null,
    };
    if (!stateObj || isUnavailable(stateObj)) return [base];

    const attrs = stateObj.attributes;
    const raw = Array.isArray(attrs.departures)
      ? attrs.departures
      : Array.isArray(attrs.next_departures)
        ? attrs.next_departures
        : null;

    if (raw) {
      const out: Departure[] = [];
      for (const entry of raw.slice(0, MAX_PER_ENTITY)) {
        // Entries are usually objects, but a bare list of times is common too.
        const item: Record<string, unknown> =
          entry !== null && typeof entry === 'object' ? (entry as Record<string, unknown>) : { time: entry };
        const ms = parseDepartureTime(
          item.time ?? item.departure ?? item.departure_time ?? item.scheduled ?? item.next,
          now
        );
        if (ms === null) continue;
        out.push({
          entityId: cfg.entity,
          line:
            cfg.line ??
            firstString(item.line, item.route, attrs.line) ??
            shortCode(cfg.name ?? friendly),
          color: cfg.color ?? firstString(item.line_color, item.color, attrs.line_color),
          destination:
            cfg.name ??
            firstString(item.direction, item.destination, item.headsign, attrs.direction) ??
            friendly,
          ms,
          delay: parseDelay(item.delay ?? item.delay_minutes ?? item.delay_min),
          unavailable: false,
        });
      }
      return out.length ? out : [{ ...base, unavailable: false }];
    }

    const ms = parseDepartureTime(stateObj.state, now);
    if (ms === null) return [{ ...base, unavailable: false }];
    return [
      {
        entityId: cfg.entity,
        line: cfg.line ?? firstString(attrs.line, attrs.route) ?? shortCode(cfg.name ?? friendly),
        color: cfg.color ?? firstString(attrs.line_color, attrs.color),
        destination:
          cfg.name ?? firstString(attrs.direction, attrs.destination, attrs.headsign) ?? friendly,
        ms,
        delay: parseDelay(attrs.delay ?? attrs.delay_minutes),
        unavailable: false,
      },
    ];
  }

  /** Every departure, soonest first, already trimmed to `limit`. */
  private _board(now: number): Departure[] {
    const hass = this.hass;
    const config = this._config;
    if (!hass || !config) return [];
    const all: Departure[] = [];
    for (const cfg of config.lines) {
      all.push(...this._departuresFor(cfg, hass.states[cfg.entity], now));
    }
    const limit = Math.max(1, Math.floor(Number(config.limit ?? DEFAULT_LIMIT)));
    return all
      // Anything more than a minute gone has left without you.
      .filter((dep) => dep.ms === null || dep.ms > now - GRACE_MS)
      .sort((a, b) => {
        if (a.ms === null && b.ms === null) return 0;
        if (a.ms === null) return 1;
        if (b.ms === null) return -1;
        return a.ms - b.ms;
      })
      .slice(0, limit);
  }

  private _onCardClick(): void {
    const first = this._config?.lines[0]?.entity;
    if (first) moreInfo(this, first);
  }

  private _onRowClick(ev: Event, entityId: string): void {
    ev.stopPropagation();
    haptic(this);
    moreInfo(this, entityId);
  }

  private _renderRow(dep: Departure, now: number, timeFmt: Intl.DateTimeFormat): TemplateResult {
    const left = dep.ms === null ? null : dep.ms - now;
    const minutes = left === null ? null : Math.max(0, Math.floor(left / MINUTE_MS));
    const countdown =
      left === null
        ? '—'
        : left >= CLOCK_AFTER_MS
          ? timeFmt.format(dep.ms as number)
          : minutes === 0
            ? 'now'
            : `${minutes} min`;
    // Under two minutes the row recedes: it is information, not an option.
    const missed = left !== null && left < MISS_MS;
    const title =
      dep.ms === null
        ? `${dep.destination} · ${dep.unavailable ? 'unavailable' : 'no departure'}`
        : `${dep.line} · ${dep.destination} · ${timeFmt.format(dep.ms)}${
            dep.delay > 0 ? ` · ${dep.delay} min late` : ''
          }`;
    return html`
      <button
        class="row ${missed ? 'soon' : ''} ${dep.ms === null ? 'gone' : ''}"
        title=${title}
        aria-label=${title}
        @click=${(ev: Event) => this._onRowClick(ev, dep.entityId)}
      >
        <span class="badge" style=${dep.color ? `background:${dep.color}` : ''}>${dep.line}</span>
        <span class="dest">${dep.destination}</span>
        ${dep.delay > 0
          ? html`<span class="delay">+${Math.round(dep.delay)}</span>`
          : nothing}
        <span class="eta">${countdown}</span>
      </button>
    `;
  }

  protected render(): TemplateResult | typeof nothing {
    const config = this._config;
    const hass = this.hass;
    if (!config || !hass) return nothing;

    const objs = config.lines.map((line) => hass.states[line.entity]);
    if (objs.every((obj) => !obj)) {
      return html`
        <ha-card class="control">
          <div class="warning">
            Entity not found: ${config.lines.map((line) => line.entity).join(', ')}
          </div>
        </ha-card>
      `;
    }

    const now = Date.now();
    const board = this._board(now);
    const unavailable = objs.every((obj) => isUnavailable(obj));
    const accent = accentFor(objs.find((obj) => obj));
    const name = config.name ?? DEFAULT_NAME;
    const timeFmt = new Intl.DateTimeFormat(this._locale(), {
      hour: 'numeric',
      minute: '2-digit',
    });

    return html`
      <ha-card
        class="control ${unavailable ? 'unavailable' : ''}"
        style="--silk-accent:${accent}"
        @click=${this._onCardClick}
      >
        ${name === '' ? nothing : html`<div class="header"><div class="hname">${name}</div></div>`}
        ${board.length
          ? html`<div class="rows">
              ${board.map((dep) => this._renderRow(dep, now, timeFmt))}
            </div>`
          : html`<div class="empty">No departures</div>`}
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
        align-items: center;
        gap: 8px;
        min-height: 20px;
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
        gap: 10px;
        width: 100%;
        min-height: 34px;
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
      /* Two minutes out is not a choice any more, so the row steps back. */
      .row.soon,
      .row.gone {
        opacity: 0.45;
      }
      /* The badge is a line's own identity — the one chromatic mark on the card. */
      .badge {
        flex: none;
        box-sizing: border-box;
        min-width: 28px;
        height: 28px;
        padding: 0 5px;
        display: grid;
        place-items: center;
        border-radius: 8px;
        background: var(--silk-accent);
        color: #fff;
        font-size: 12px;
        font-weight: 700;
        letter-spacing: -0.01em;
        line-height: 1;
        white-space: nowrap;
        overflow: hidden;
      }
      .dest {
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
      /* Running late is a genuine status, so it earns the warning token. */
      .delay {
        flex: none;
        font-size: 12px;
        font-weight: 600;
        line-height: 1;
        color: var(--warning-color, #ffa600);
        font-variant-numeric: tabular-nums;
      }
      .eta {
        flex: none;
        min-width: 52px;
        text-align: right;
        font-size: 14px;
        font-weight: 600;
        letter-spacing: -0.01em;
        color: var(--primary-text-color);
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
    'silk-transit-card': SilkTransitCard;
  }
}
