import { LitElement, html, css, nothing, PropertyValues, TemplateResult } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { HomeAssistant, LovelaceCardConfig } from '../types';
import { silkControlStyles } from '../shared/base';
import { domainOf, isUnavailable, moreInfo, clamp } from '../shared/service';
import { accentFor } from '../shared/color';
import { registerEditor } from '../shared/editor';

export const META = {
  type: 'silk-meals-card',
  name: 'Silk Meals',
  description: "What's for dinner this week.",
};

export type MealsSource = 'calendar' | 'todo';

export interface SilkMealsCardConfig extends LovelaceCardConfig {
  entity: string;
  /** Where the plan lives; inferred from the entity domain when omitted. */
  source?: MealsSource;
  name?: string;
  /** Days listed, starting today (default 7). */
  days?: number;
  /** Calendar mode only: keep events whose summary contains one of these. */
  keywords?: string[];
}

/** hass.callApi exists at runtime; Silk's minimal HomeAssistant type omits it. */
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
  end?: ApiEventBoundary;
}

/** Shape returned by the `todo/item/list` WS command. */
interface TodoItem {
  uid: string;
  summary: string;
  status: 'needs_action' | 'completed';
}

interface TodoItemListResponse {
  items: TodoItem[];
}

/** What one day of the plan says. */
interface Meal {
  title: string;
  /** Start time for a timed calendar event; absent for all-day and to-do rows. */
  time?: string;
  /** Sort key within a day (ms), so the earliest event wins. */
  at: number;
}

const DAY_MS = 86_400_000;
const DEFAULT_DAYS = 7;
const MAX_DAYS = 14;
const REFRESH_INTERVAL_MS = 15 * 60_000;

const EDITOR_TAG = 'silk-meals-card-editor';

registerEditor(
  EDITOR_TAG,
  [
    { name: 'entity', required: true, selector: { entity: { domain: ['calendar', 'todo'] } } },
    { name: 'name', selector: { text: {} } },
    {
      name: '',
      type: 'grid',
      schema: [
        {
          name: 'source',
          selector: {
            select: {
              mode: 'dropdown',
              options: [
                { value: 'calendar', label: 'Calendar' },
                { value: 'todo', label: 'To-do list' },
              ],
            },
          },
        },
        { name: 'days', selector: { number: { min: 1, max: MAX_DAYS, mode: 'box' } } },
      ],
    },
  ],
  { entity: 'Entity', name: 'Name', source: 'Source', days: 'Days shown' },
  { days: DEFAULT_DAYS }
);

/** Local midnight of the day containing `ms`. */
function midnightOf(ms: number): number {
  const d = new Date(ms);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

/** Local calendar-day key — DST-proof, unlike epoch-day arithmetic. */
function dayKey(ms: number): string {
  const d = new Date(ms);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

/**
 * Parse an event boundary. All-day `date` strings are parsed as *local*
 * midnight by hand — `Date.parse('2026-08-12')` would read them as UTC and
 * shift the day in most timezones.
 */
function parseBoundary(b?: ApiEventBoundary): { ms: number; allDay: boolean } | null {
  if (!b) return null;
  if (b.dateTime) {
    const ms = Date.parse(b.dateTime);
    return Number.isFinite(ms) ? { ms, allDay: false } : null;
  }
  if (b.date) {
    const [y, m, d] = b.date.split('-').map(Number);
    if (!y || !m || !d) return null;
    return { ms: new Date(y, m - 1, d).getTime(), allDay: true };
  }
  return null;
}

/**
 * Weekday words → day index (0 = Sunday), in the user's language and in
 * English, long and short. A plan written "Mon – Tacos" or "월요일: 김치찌개"
 * both land on the right row.
 */
function weekdayWords(locale: string): Map<string, number> {
  const map = new Map<string, number>();
  // 2024-01-07 was a Sunday, so +i walks the week from index 0.
  const sunday = new Date(2024, 0, 7);
  for (const loc of [locale, 'en']) {
    for (const weekday of ['long', 'short'] as const) {
      let fmt: Intl.DateTimeFormat;
      try {
        fmt = new Intl.DateTimeFormat(loc, { weekday });
      } catch {
        continue; // an unknown locale tag must not take the card down
      }
      for (let i = 0; i < 7; i++) {
        const d = new Date(sunday.getFullYear(), sunday.getMonth(), sunday.getDate() + i);
        const word = fmt.format(d).toLowerCase().replace(/\.$/, '').trim();
        if (word && !map.has(word)) map.set(word, i);
      }
    }
  }
  return map;
}

const SEPARATOR = /[\s:,.\-–—|]/;

/** Split "Tuesday: Ramen" into its weekday and its meal. */
function parseWeekdayPrefix(
  summary: string,
  words: Map<string, number>
): { day: number; title: string } | null {
  const trimmed = summary.trim();
  const lower = trimmed.toLowerCase();
  let best: { day: number; len: number } | undefined;
  for (const [word, day] of words) {
    if (!lower.startsWith(word)) continue;
    const next = lower.charAt(word.length);
    // A prefix only counts when the weekday ends there — "Sunday roast" yes,
    // "Sundaes" no.
    if (next !== '' && !SEPARATOR.test(next)) continue;
    if (!best || word.length > best.len) best = { day, len: word.length };
  }
  if (!best) return null;
  const title = trimmed
    .slice(best.len)
    .replace(/^[\s:,.\-–—|]+/, '')
    .trim();
  return title ? { day: best.day, title } : null;
}

/**
 * The week's dinners in one column: a weekday rail on the left, the meal on the
 * right, today carrying the accent. Reads a calendar (events for the next few
 * days) or a to-do list whose items are written "Monday – Lasagne".
 */
@customElement('silk-meals-card')
export class SilkMealsCard extends LitElement {
  @property({ attribute: false }) public hass?: HomeAssistant;

  @state() private _config?: SilkMealsCardConfig;

  /** Calendar mode: local day key → meal. Undefined until the first load. */
  @state() private _byDay?: Record<string, Meal>;

  /** To-do mode: weekday index → meal. Undefined until the first load. */
  @state() private _byWeekday?: Record<number, Meal>;

  /** Inline note when the plan could not be read. */
  @state() private _note?: string;

  private _source: MealsSource = 'calendar';
  private _fetchStarted = false;
  /** Monotonic token so a stale fetch can never clobber a newer one. */
  private _fetchEpoch = 0;
  private _fetchedFor = '';
  private _intervalTimer?: number;

  public static getStubConfig(hass: HomeAssistant): Partial<SilkMealsCardConfig> {
    const ids = Object.keys(hass.states);
    const named = /meal|dinner|food|menu/i;
    const calendars = ids.filter((id) => id.startsWith('calendar.'));
    const todos = ids.filter((id) => id.startsWith('todo.'));
    const entity =
      calendars.find((id) => named.test(id)) ??
      todos.find((id) => named.test(id)) ??
      calendars[0] ??
      todos[0];
    return {
      type: 'custom:silk-meals-card',
      entity,
      source: entity && domainOf(entity) === 'todo' ? 'todo' : 'calendar',
    };
  }

  public static async getConfigElement(): Promise<HTMLElement> {
    return document.createElement(EDITOR_TAG);
  }

  public setConfig(config: SilkMealsCardConfig): void {
    if (!config.entity) {
      throw new Error('silk-meals-card: `entity` is required');
    }
    const domain = domainOf(config.entity);
    if (domain !== 'calendar' && domain !== 'todo') {
      throw new Error(
        `silk-meals-card: \`entity\` must be a calendar or todo entity (got "${config.entity}")`
      );
    }
    if (config.source !== undefined) {
      if (config.source !== 'calendar' && config.source !== 'todo') {
        throw new Error("silk-meals-card: `source` must be 'calendar' or 'todo'");
      }
      if (config.source !== domain) {
        throw new Error(
          `silk-meals-card: \`source: ${config.source}\` does not match the ${domain} entity \`${config.entity}\``
        );
      }
    }
    if (config.days !== undefined && !(Number(config.days) > 0)) {
      throw new Error('silk-meals-card: `days` must be a positive number');
    }
    if (config.keywords !== undefined && !Array.isArray(config.keywords)) {
      throw new Error('silk-meals-card: `keywords` must be a list of words to match');
    }
    this._config = config;
    this._source = (config.source ?? domain) as MealsSource;
    this._byDay = undefined;
    this._byWeekday = undefined;
    this._note = undefined;
    this._fetchStarted = false;
    this._fetchedFor = '';
  }

  public getCardSize(): number {
    return 3;
  }

  public getGridOptions(): Record<string, number> {
    return { columns: 6, rows: 3, min_columns: 4, min_rows: 2 };
  }

  public connectedCallback(): void {
    super.connectedCallback();
    this._intervalTimer = window.setInterval(() => void this._fetch(), REFRESH_INTERVAL_MS);
    // Re-sync on (re)attach — the plan may have moved on while we were away.
    if (this.hass && this._config) {
      this._fetchStarted = true;
      void this._fetch();
    }
  }

  public disconnectedCallback(): void {
    super.disconnectedCallback();
    window.clearInterval(this._intervalTimer);
    this._intervalTimer = undefined;
  }

  protected willUpdate(changed: PropertyValues): void {
    if (!this.hass || !this._config) return;
    if (!this._fetchStarted) {
      this._fetchStarted = true;
      void this._fetch();
      return;
    }
    // A to-do list (and a calendar rolling to its next event) tells us it
    // changed only through its own state stamp.
    if (!changed.has('hass')) return;
    const stateObj = this.hass.states[this._config.entity];
    if (stateObj && !isUnavailable(stateObj) && stateObj.last_updated !== this._fetchedFor) {
      void this._fetch();
    }
  }

  private _days(): number {
    return clamp(Math.round(Number(this._config?.days ?? DEFAULT_DAYS)), 1, MAX_DAYS);
  }

  private _locale(): string {
    return this.hass?.locale?.language ?? this.hass?.language ?? 'en';
  }

  private async _fetch(): Promise<void> {
    const config = this._config;
    const hass = this.hass;
    if (!hass || !config) return;
    const epoch = ++this._fetchEpoch;
    // Claim the stamp up front so the state change our own fetch observes does
    // not immediately queue a second one.
    this._fetchedFor = hass.states[config.entity]?.last_updated ?? '';
    try {
      if (this._source === 'calendar') {
        // callApi is a runtime member of hass absent from Silk's minimal type.
        const byDay = await this._fetchCalendar(hass as HassWithApi, config);
        if (epoch !== this._fetchEpoch) return;
        this._byDay = byDay;
      } else {
        const byWeekday = await this._fetchTodo(hass, config);
        if (epoch !== this._fetchEpoch) return;
        this._byWeekday = byWeekday;
      }
      this._note = undefined;
    } catch (err) {
      console.warn('silk-meals-card: plan fetch failed', err);
      if (epoch !== this._fetchEpoch) return;
      // Keep whatever we had; the 15-minute timer retries.
      this._fetchedFor = '';
      if (this._byDay === undefined && this._byWeekday === undefined) {
        this._note = 'Could not read the plan';
      }
    }
  }

  private async _fetchCalendar(
    hass: HassWithApi,
    config: SilkMealsCardConfig
  ): Promise<Record<string, Meal>> {
    const start = new Date(midnightOf(Date.now()));
    const end = new Date(start.getTime() + this._days() * DAY_MS);
    const path = `calendars/${config.entity}?start=${encodeURIComponent(
      start.toISOString()
    )}&end=${encodeURIComponent(end.toISOString())}`;
    const events = await hass.callApi<ApiEvent[]>('GET', path);
    const keywords = (config.keywords ?? [])
      .filter((word): word is string => typeof word === 'string' && word.trim() !== '')
      .map((word) => word.toLowerCase().trim());
    const timeFmt = new Intl.DateTimeFormat(this._locale(), {
      hour: 'numeric',
      minute: '2-digit',
    });

    const byDay: Record<string, Meal> = {};
    for (const raw of Array.isArray(events) ? events : []) {
      const summary = (raw.summary ?? '').trim();
      if (!summary) continue;
      // No keywords configured = every event on the calendar is a meal.
      if (keywords.length && !keywords.some((word) => summary.toLowerCase().includes(word))) {
        continue;
      }
      const evStart = parseBoundary(raw.start);
      if (!evStart) continue;
      const key = dayKey(evStart.ms);
      const meal: Meal = {
        title: summary,
        time: evStart.allDay ? undefined : timeFmt.format(evStart.ms),
        at: evStart.ms,
      };
      // Earliest event of the day wins the row; all-day events sort first.
      const held = byDay[key];
      if (!held || meal.at < held.at) byDay[key] = meal;
    }
    return byDay;
  }

  private async _fetchTodo(
    hass: HomeAssistant,
    config: SilkMealsCardConfig
  ): Promise<Record<number, Meal>> {
    const resp = await hass.callWS<TodoItemListResponse>({
      type: 'todo/item/list',
      entity_id: config.entity,
    });
    const words = weekdayWords(this._locale());
    const byWeekday: Record<number, Meal> = {};
    let order = 0;
    for (const item of resp.items ?? []) {
      if (item.status === 'completed') continue;
      const parsed = parseWeekdayPrefix(item.summary ?? '', words);
      if (!parsed) continue;
      // First item for a weekday wins — list order is the author's priority.
      if (byWeekday[parsed.day] === undefined) {
        byWeekday[parsed.day] = { title: parsed.title, at: order++ };
      }
    }
    return byWeekday;
  }

  private _onCardClick(): void {
    if (this._config) moreInfo(this, this._config.entity);
  }

  protected render(): TemplateResult | typeof nothing {
    const config = this._config;
    const hass = this.hass;
    if (!config || !hass) return nothing;
    const stateObj = hass.states[config.entity];
    if (!stateObj) {
      return html`<ha-card><div class="warning">Entity not found: ${config.entity}</div></ha-card>`;
    }

    const unavailable = isUnavailable(stateObj);
    const accent = accentFor(stateObj);
    const name = config.name ?? stateObj.attributes.friendly_name ?? config.entity;
    const locale = this._locale();
    const shortFmt = new Intl.DateTimeFormat(locale, { weekday: 'short' });
    const fullFmt = new Intl.DateTimeFormat(locale, {
      weekday: 'long',
      month: 'short',
      day: 'numeric',
    });
    // Rows are built against the clock at render time, so "Today" stays honest
    // across a midnight rollover without a re-fetch.
    const todayMid = midnightOf(Date.now());
    const days = this._days();
    const loaded = this._byDay !== undefined || this._byWeekday !== undefined;

    const rows: TemplateResult[] = [];
    for (let i = 0; i < days; i++) {
      // Step by calendar date, not by 24h: a DST day is 23 or 25 hours long.
      const date = new Date(todayMid);
      date.setDate(date.getDate() + i);
      const dayMs = date.getTime();
      const meal =
        this._source === 'calendar'
          ? this._byDay?.[dayKey(dayMs)]
          : this._byWeekday?.[date.getDay()];
      const today = i === 0;
      const label = today ? 'Today' : shortFmt.format(dayMs);
      const title = meal
        ? `${fullFmt.format(dayMs)} · ${meal.title}`
        : `${fullFmt.format(dayMs)} · nothing planned`;
      rows.push(html`
        <div class="row ${today ? 'today' : ''}" title=${title} aria-label=${title}>
          <span class="day">${label}</span>
          ${meal
            ? html`<span class="meal">${meal.title}</span>`
            : html`<span class="meal none">${loaded ? '—' : ''}</span>`}
          ${meal?.time ? html`<span class="time">${meal.time}</span>` : nothing}
        </div>
      `);
    }

    return html`
      <ha-card
        class="control ${unavailable ? 'unavailable' : ''}"
        style="--silk-accent:${accent}"
        @click=${this._onCardClick}
      >
        <div class="head">
          <div class="hname">${name}</div>
        </div>
        <div class="list">${rows}</div>
        ${this._note ? html`<div class="note">${this._note}</div>` : nothing}
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
      }
      .head {
        flex: none;
        display: flex;
        align-items: center;
        gap: 8px;
        min-width: 0;
      }
      .hname {
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
      .list {
        flex: 1 1 auto;
        min-height: 0;
        overflow-y: auto;
        display: flex;
        flex-direction: column;
      }
      .row {
        display: flex;
        align-items: center;
        gap: 10px;
        min-height: 28px;
        min-width: 0;
      }
      .day {
        flex: none;
        width: 36px;
        font-size: 11.5px;
        font-weight: 600;
        line-height: 1.3;
        color: var(--secondary-text-color);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      /* Today is the only highlighted row: accent text, no surface, no strip. */
      .row.today .day {
        color: var(--silk-accent);
      }
      .row.today .meal {
        font-weight: 500;
      }
      .meal {
        flex: 1;
        min-width: 0;
        font-size: 13.5px;
        line-height: 1.3;
        color: var(--primary-text-color);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .meal.none {
        color: var(--secondary-text-color);
        opacity: 0.55;
      }
      .time {
        flex: none;
        font-size: 11px;
        font-weight: 600;
        line-height: 1;
        padding: 4px 8px;
        border-radius: 999px;
        color: var(--secondary-text-color);
        background: rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.06);
        font-variant-numeric: tabular-nums;
        white-space: nowrap;
      }
      .note {
        flex: none;
        font-size: 12px;
        line-height: 1.3;
        color: var(--secondary-text-color);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .unavailable .list {
        opacity: 0.45;
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    'silk-meals-card': SilkMealsCard;
  }
}
