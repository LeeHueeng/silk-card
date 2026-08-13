import { LitElement, html, css, nothing, TemplateResult } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { HomeAssistant, LovelaceCardConfig } from '../types';
import { silkControlStyles } from '../shared/base';
import { domainOf, isUnavailable, moreInfo } from '../shared/service';
import { accentFor } from '../shared/color';
import { registerEditor } from '../shared/editor';

export const META = {
  type: 'silk-birthday-card',
  name: 'Silk Birthdays',
  description: 'Nobody gets forgotten.',
};

/** One hand-listed person. `date` is `MM-DD` or `YYYY-MM-DD`. */
export interface BirthdayPerson {
  name: string;
  date: string;
  /** Portrait URL — `/local/...`, `/api/image/...` or absolute. */
  photo?: string;
}

export interface SilkBirthdayCardConfig extends LovelaceCardConfig {
  /** YAML-only list of people (ha-form has no editor for object lists). */
  people?: BirthdayPerson[];
  /** Calendar entity whose matching events are read as birthdays. */
  calendar?: string;
  /** Substring an event summary must contain to count (default 'birthday'). */
  keyword?: string;
  /** Header label, defaults to 'Birthdays'. */
  name?: string;
  /** Rows shown, nearest first. Default 5. */
  limit?: number;
}

/** `hass.callApi` exists at runtime; Silk's minimal HomeAssistant type omits it. */
interface HassWithApi extends HomeAssistant {
  callApi<T>(method: string, path: string): Promise<T>;
}

/** One boundary of a REST calendar event; all-day events carry `date` only. */
interface ApiEventBoundary {
  dateTime?: string;
  date?: string;
}

interface ApiEvent {
  summary?: string | null;
  start?: ApiEventBoundary;
}

/** A birthday resolved against today: what the row actually renders. */
interface Upcoming {
  key: string;
  name: string;
  photo?: string;
  /** Whole days from today's local midnight; 0 = today. */
  days: number;
  /** Age they turn on that occurrence; undefined when no birth year is known. */
  age?: number;
  /** Occurrence timestamp (local midnight, ms). */
  when: number;
}

const DAY_MS = 86_400_000;
const DEFAULT_LIMIT = 5;
const DEFAULT_KEYWORD = 'birthday';
/** A full year plus a day, so every yearly event lands in the window once. */
const CALENDAR_DAYS = 366;
const REFRESH_INTERVAL_MS = 6 * 3_600_000;
/** Slack after midnight before recomputing "in N days". */
const MIDNIGHT_SLACK_MS = 30_000;

const DATE_RE = /^(?:(\d{4})-)?(\d{1,2})-(\d{1,2})$/;

interface ParsedDate {
  year?: number;
  month: number;
  day: number;
}

/** Parse `MM-DD` / `YYYY-MM-DD`, rejecting impossible days (2-30, 4-31, …). */
function parseDate(raw: unknown): ParsedDate | null {
  if (typeof raw !== 'string') return null;
  const m = DATE_RE.exec(raw.trim());
  if (!m) return null;
  const year = m[1] ? Number(m[1]) : undefined;
  const month = Number(m[2]);
  const day = Number(m[3]);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  // Validate against a leap year so Feb 29 is accepted as a real birthday.
  const probe = new Date(2024, month - 1, day);
  if (probe.getMonth() !== month - 1 || probe.getDate() !== day) return null;
  return { year, month, day };
}

const isLeapYear = (y: number): boolean => (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;

/**
 * The occurrence inside one year. A Feb 29 birthday keeps its day in leap
 * years and is observed on Feb 28 otherwise — letting Date roll it over to
 * Mar 1 would quietly move the celebration into the next month.
 */
function occurrenceIn(year: number, month: number, day: number): number {
  const d = month === 2 && day === 29 && !isLeapYear(year) ? 28 : day;
  return new Date(year, month - 1, d).getTime();
}

/** Next occurrence at or after today's local midnight. */
function nextOccurrence(month: number, day: number, todayMid: number): number {
  const year = new Date(todayMid).getFullYear();
  const thisYear = occurrenceIn(year, month, day);
  return thisYear >= todayMid ? thisYear : occurrenceIn(year + 1, month, day);
}

/** Local midnight of the day containing `ms`. */
function midnightOf(ms: number): number {
  const d = new Date(ms);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

/**
 * Parse an event boundary. All-day `date` strings are parsed as *local*
 * midnight by hand — `Date.parse('2026-08-12')` would read them as UTC and
 * shift the day in most timezones.
 */
function parseBoundary(b?: ApiEventBoundary): number | null {
  if (!b) return null;
  if (b.dateTime) {
    const ms = Date.parse(b.dateTime);
    return Number.isFinite(ms) ? ms : null;
  }
  if (b.date) {
    const [y, m, d] = b.date.split('-').map(Number);
    if (!y || !m || !d) return null;
    return new Date(y, m - 1, d).getTime();
  }
  return null;
}

const escapeRe = (s: string): string => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Turn "Anna's birthday (1990)" into { name: 'Anna', birthYear: 1990 }.
 * Calendar birthdays are written a dozen ways; strip the keyword, any
 * possessive left behind, and a bare four-digit year used as the birth year.
 */
function readSummary(summary: string, keyword: string): { name: string; birthYear?: number } {
  const yearMatch = /\b(19\d{2}|20\d{2})\b/.exec(summary);
  const birthYear = yearMatch ? Number(yearMatch[0]) : undefined;
  let s = summary
    .replace(/\(\s*(?:19|20)\d{2}\s*\)/, ' ')
    .replace(/\b(?:19|20)\d{2}\b/, ' ')
    .replace(new RegExp(`\\s*[·:\\-]?\\s*\\b${escapeRe(keyword)}\\b\\s*[:\\-]?\\s*`, 'i'), ' ')
    .replace(/['’]s\s*$/i, '')
    .replace(/\s+/g, ' ')
    .trim();
  if (!s) s = summary.trim();
  return { name: s, birthYear };
}

const EDITOR_TAG = 'silk-birthday-card-editor';

registerEditor(
  EDITOR_TAG,
  [
    { name: 'name', selector: { text: {} } },
    { name: 'calendar', selector: { entity: { domain: ['calendar'] } } },
    {
      name: '',
      type: 'grid',
      schema: [
        { name: 'keyword', selector: { text: {} } },
        { name: 'limit', selector: { number: { min: 1, max: 20, mode: 'box' } } },
      ],
    },
  ],
  {
    name: 'Name',
    calendar: 'Birthday calendar',
    keyword: 'Event keyword',
    limit: 'Rows shown',
  },
  { keyword: DEFAULT_KEYWORD, limit: DEFAULT_LIMIT }
);

@customElement('silk-birthday-card')
export class SilkBirthdayCard extends LitElement {
  @property({ attribute: false }) public hass?: HomeAssistant;

  @state() private _config?: SilkBirthdayCardConfig;
  /** Calendar birthdays; undefined until the first load resolves. */
  @state() private _fromCalendar?: Upcoming[];
  /** True when the last calendar fetch failed and we have nothing to show. */
  @state() private _calendarFailed = false;
  /** Bumped at midnight so "in 12 days" never goes stale on a wall display. */
  @state() private _tick = 0;
  /** Photo URLs that failed to load → fall back to the initial. */
  @state() private _broken: string[] = [];

  private _people: BirthdayPerson[] = [];
  private _fetchStarted = false;
  private _fetchEpoch = 0;
  private _intervalTimer?: number;
  private _midnightTimer?: number;

  public static getStubConfig(hass: HomeAssistant): Partial<SilkBirthdayCardConfig> {
    const calendar = Object.keys(hass.states).find((id) => id.startsWith('calendar.'));
    if (calendar) return { type: 'custom:silk-birthday-card', calendar };
    return {
      type: 'custom:silk-birthday-card',
      people: [{ name: 'Anna', date: '1990-03-14' }],
    };
  }

  public static async getConfigElement(): Promise<HTMLElement> {
    return document.createElement(EDITOR_TAG);
  }

  public setConfig(config: SilkBirthdayCardConfig): void {
    if (config.people !== undefined && !Array.isArray(config.people)) {
      throw new Error('silk-birthday-card: `people` must be a list of {name, date}');
    }
    const people = (config.people ?? []) as BirthdayPerson[];
    people.forEach((person, i) => {
      if (!person || typeof person.name !== 'string' || person.name.trim() === '') {
        throw new Error(`silk-birthday-card: people[${i}] needs a \`name\``);
      }
      if (!parseDate(person.date)) {
        throw new Error(
          `silk-birthday-card: people[${i}].date must be MM-DD or YYYY-MM-DD (got ${String(person.date)})`
        );
      }
    });
    if (config.calendar !== undefined) {
      if (typeof config.calendar !== 'string' || domainOf(config.calendar) !== 'calendar') {
        throw new Error('silk-birthday-card: `calendar` must be a calendar entity');
      }
    }
    if (people.length === 0 && !config.calendar) {
      throw new Error('silk-birthday-card: set `people` or a `calendar` entity');
    }
    if (config.limit !== undefined && !(Number(config.limit) >= 1)) {
      throw new Error('silk-birthday-card: `limit` must be at least 1');
    }
    this._people = people;
    this._config = config;
    this._fromCalendar = undefined;
    this._calendarFailed = false;
    this._fetchStarted = false;
    this._broken = [];
  }

  public getCardSize(): number {
    return 1 + Math.ceil(Math.min(this._limit(), 12) / 2);
  }

  public getGridOptions(): Record<string, number> {
    return { columns: 6, rows: 3, min_columns: 4, min_rows: 2 };
  }

  public connectedCallback(): void {
    super.connectedCallback();
    this._intervalTimer = window.setInterval(() => void this._fetch(), REFRESH_INTERVAL_MS);
    this._scheduleMidnight();
    // Re-sync on (re)attach — the calendar may have moved while we were away.
    if (this.hass && this._config) {
      this._fetchStarted = true;
      void this._fetch();
    }
  }

  public disconnectedCallback(): void {
    super.disconnectedCallback();
    window.clearInterval(this._intervalTimer);
    window.clearTimeout(this._midnightTimer);
    this._midnightTimer = undefined;
  }

  protected willUpdate(): void {
    if (!this.hass || !this._config || this._fetchStarted) return;
    this._fetchStarted = true;
    void this._fetch();
  }

  private _limit(): number {
    return Math.max(1, Math.floor(this._config?.limit ?? DEFAULT_LIMIT));
  }

  /** Recompute day counts just after midnight, then re-arm for the next one. */
  private _scheduleMidnight(): void {
    window.clearTimeout(this._midnightTimer);
    const now = Date.now();
    const next = midnightOf(now) + DAY_MS + MIDNIGHT_SLACK_MS;
    this._midnightTimer = window.setTimeout(() => {
      this._tick++;
      void this._fetch();
      this._scheduleMidnight();
    }, Math.max(1000, next - now));
  }

  private async _fetch(): Promise<void> {
    // callApi is a runtime member of hass not present in Silk's minimal type.
    const hass = this.hass as HassWithApi | undefined;
    const config = this._config;
    if (!hass || !config?.calendar) return;
    const epoch = ++this._fetchEpoch;
    const todayMid = midnightOf(Date.now());
    const startISO = encodeURIComponent(new Date(todayMid).toISOString());
    const endISO = encodeURIComponent(new Date(todayMid + CALENDAR_DAYS * DAY_MS).toISOString());
    let events: ApiEvent[];
    try {
      events = await hass.callApi<ApiEvent[]>(
        'GET',
        `calendars/${config.calendar}?start=${startISO}&end=${endISO}`
      );
    } catch (err) {
      console.warn('silk-birthday-card: calendar fetch failed', err);
      if (epoch === this._fetchEpoch && this._fromCalendar === undefined) {
        this._calendarFailed = true;
      }
      return;
    }
    if (epoch !== this._fetchEpoch) return;
    const keyword = (config.keyword ?? DEFAULT_KEYWORD).trim() || DEFAULT_KEYWORD;
    const needle = keyword.toLowerCase();
    const byName = new Map<string, Upcoming>();
    for (const raw of Array.isArray(events) ? events : []) {
      const summary = (raw.summary ?? '').trim();
      if (!summary || !summary.toLowerCase().includes(needle)) continue;
      const startMs = parseBoundary(raw.start);
      if (startMs === null) continue;
      const when = midnightOf(startMs);
      const days = Math.round((when - todayMid) / DAY_MS);
      if (days < 0) continue;
      const { name, birthYear } = readSummary(summary, keyword);
      const key = name.toLowerCase();
      const age =
        birthYear !== undefined ? new Date(when).getFullYear() - birthYear : undefined;
      const prev = byName.get(key);
      // A yearly event can appear twice at the window edge — keep the nearest.
      if (!prev || days < prev.days) {
        byName.set(key, { key: `c:${key}`, name, days, age, when });
      }
    }
    this._calendarFailed = false;
    this._fromCalendar = [...byName.values()];
  }

  /** Hand-listed people resolved against today. */
  private _fromPeople(todayMid: number): Upcoming[] {
    return this._people.map((person, i) => {
      const parsed = parseDate(person.date)!; // setConfig already validated it
      const when = nextOccurrence(parsed.month, parsed.day, todayMid);
      return {
        key: `p:${i}`,
        name: person.name,
        photo: person.photo,
        days: Math.round((when - todayMid) / DAY_MS),
        age: parsed.year !== undefined ? new Date(when).getFullYear() - parsed.year : undefined,
        when,
      };
    });
  }

  private _locale(): string {
    return this.hass?.locale?.language ?? this.hass?.language ?? 'en';
  }

  private _onImgError(url: string): void {
    if (!this._broken.includes(url)) this._broken = [...this._broken, url];
  }

  private _onCardClick(): void {
    const calendar = this._config?.calendar;
    if (calendar) moreInfo(this, calendar);
  }

  private _renderRow(row: Upcoming, dateFmt: Intl.DateTimeFormat): TemplateResult {
    const today = row.days === 0;
    const when = dateFmt.format(row.when);
    const relative = row.days === 1 ? 'tomorrow' : `in ${row.days} days`;
    const parts: string[] = [];
    if (row.age !== undefined) parts.push(`turns ${row.age}`);
    // With no age to lead with, the date carries the line instead.
    else if (!today) parts.push(when);
    if (!today) parts.push(relative);
    else if (row.age === undefined) parts.push(when);
    const photo = row.photo && !this._broken.includes(row.photo) ? row.photo : undefined;
    const initial = (Array.from(row.name.trim())[0] ?? '?').toUpperCase();
    const title = `${row.name} · ${when}${row.age !== undefined ? ` · turns ${row.age}` : ''} · ${
      today ? 'today' : relative
    }`;

    return html`
      <div class="row ${today ? 'today' : ''}" title=${title}>
        <span class="avatar ${today ? 'on' : ''}">
          ${photo
            ? html`<img
                src=${photo}
                alt=${row.name}
                loading="lazy"
                @error=${() => this._onImgError(photo)}
              />`
            : html`<span class="initial">${initial}</span>`}
        </span>
        <span class="who">
          <span class="pname">${row.name}</span>
          <span class="when">${parts.join(' · ')}</span>
        </span>
        ${today ? html`<span class="chip active">Today!</span>` : nothing}
      </div>
    `;
  }

  protected render(): TemplateResult | typeof nothing {
    const config = this._config;
    const hass = this.hass;
    if (!config || !hass) return nothing;
    void this._tick; // re-read the clock whenever the midnight timer fires

    const calendarObj = config.calendar ? hass.states[config.calendar] : undefined;
    if (config.calendar && !calendarObj) {
      return html`
        <ha-card class="control">
          <div class="warning">Entity not found: ${config.calendar}</div>
        </ha-card>
      `;
    }

    const todayMid = midnightOf(Date.now());
    const rows = [...this._fromPeople(todayMid), ...(this._fromCalendar ?? [])].sort(
      (a, b) => a.days - b.days || a.name.localeCompare(b.name)
    );
    const shown = rows.slice(0, this._limit());
    const accent = accentFor(calendarObj);
    // Hand-listed people keep working even when the calendar drops out.
    const unavailable =
      config.calendar !== undefined && isUnavailable(calendarObj) && this._people.length === 0;
    const name = config.name ?? 'Birthdays';
    const dateFmt = new Intl.DateTimeFormat(this._locale(), { month: 'short', day: 'numeric' });
    const waiting = config.calendar !== undefined && this._fromCalendar === undefined;

    return html`
      <ha-card
        class="control ${unavailable ? 'unavailable' : ''} ${config.calendar ? 'tappable' : ''}"
        style="--silk-accent:${accent}"
        @click=${this._onCardClick}
      >
        ${name ? html`<div class="title">${name}</div>` : nothing}
        <div class="list">
          ${shown.map((row) => this._renderRow(row, dateFmt))}
          ${shown.length === 0 && this._calendarFailed
            ? html`<div class="note">Calendar unavailable</div>`
            : nothing}
          ${shown.length === 0 && !this._calendarFailed && !waiting
            ? html`<div class="note">No birthdays coming up</div>`
            : nothing}
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
      ha-card.tappable {
        cursor: pointer;
      }
      .title {
        flex: none;
        font-size: 13px;
        font-weight: 600;
        line-height: 1.3;
        color: var(--secondary-text-color);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .list {
        display: flex;
        flex-direction: column;
        gap: 2px;
        min-height: 0;
        overflow: hidden;
        animation: silk-birthday-in 250ms var(--silk-ease-out);
      }
      .row {
        display: flex;
        align-items: center;
        gap: 10px;
        min-width: 0;
        padding: 2px 6px;
        margin: 0 -6px;
        border-radius: 12px;
        transition: background 200ms ease;
      }
      /* Today is the one row that earns the accent surface. */
      .row.today {
        background: color-mix(in srgb, var(--silk-accent) 12%, transparent);
      }
      .avatar {
        flex: none;
        width: 32px;
        height: 32px;
        border-radius: 50%;
        overflow: hidden;
        display: grid;
        place-items: center;
        user-select: none;
        color: var(--secondary-text-color);
        background: rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.06);
        transition:
          background 200ms ease,
          color 200ms ease;
      }
      .avatar.on {
        color: var(--silk-accent);
        background: color-mix(in srgb, var(--silk-accent) 22%, transparent);
      }
      .avatar img {
        width: 100%;
        height: 100%;
        object-fit: cover;
        display: block;
      }
      .initial {
        font-size: 14px;
        font-weight: 600;
        line-height: 1;
      }
      .who {
        flex: 1;
        min-width: 0;
        display: block;
      }
      .pname {
        display: block;
        font-size: 13.5px;
        font-weight: 500;
        line-height: 1.3;
        color: var(--primary-text-color);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .when {
        display: block;
        font-size: 11px;
        line-height: 1.3;
        color: var(--secondary-text-color);
        font-variant-numeric: tabular-nums;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .chip {
        flex: none;
        cursor: default;
      }
      .chip:hover {
        background: color-mix(in srgb, var(--silk-accent) 16%, transparent);
      }
      .note {
        padding: 8px 0 4px;
        font-size: 12.5px;
        color: var(--secondary-text-color);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .unavailable .list,
      .unavailable .title {
        opacity: 0.45;
      }
      @keyframes silk-birthday-in {
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
    'silk-birthday-card': SilkBirthdayCard;
  }
}
