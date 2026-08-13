import { LitElement, html, css, nothing, PropertyValues, TemplateResult } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { HomeAssistant, HassEntity, LovelaceCardConfig } from '../types';
import { silkControlStyles } from '../shared/base';
import { domainOf, isUnavailable, moreInfo } from '../shared/service';
import { accentFor } from '../shared/color';
import { registerEditor } from '../shared/editor';

export const META = {
  type: 'silk-holiday-card',
  name: 'Silk Today',
  description: 'What day it is, really.',
};

export interface SilkHolidayCardConfig extends LovelaceCardConfig {
  /**
   * Where today's occasion comes from: a `calendar.*` entity (all-day events
   * covering today) or a plain sensor whose state *is* the holiday name.
   */
  entity?: string;
  /** Optional `binary_sensor` (the Workday integration) for the second chip. */
  workday?: string;
  /** Adds the ISO week number and day-of-year readouts. */
  show_details?: boolean;
  /** Small label above the date. */
  name?: string;
  /** Accent override. */
  color?: string;
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

const DAY_MS = 86_400_000;
/** Chips beyond this are dropped — the card answers one question. */
const MAX_OCCASIONS = 2;
/** Calendars change rarely; a slow poll is plenty on top of the midnight roll. */
const REFRESH_INTERVAL_MS = 30 * 60_000;

/** Sensor states that mean "no holiday today", whatever the integration calls it. */
const EMPTY_STATES = new Set([
  '',
  'none',
  'no',
  'off',
  'false',
  'unknown',
  'unavailable',
  '-',
  'nothing',
]);

/** 1-based day of the local year; Math.round keeps it DST-proof. */
function dayOfYear(d: Date): number {
  const startOfYear = new Date(d.getFullYear(), 0, 1).getTime();
  const today = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  return Math.round((today - startOfYear) / DAY_MS) + 1;
}

function daysInYear(year: number): number {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0 ? 366 : 365;
}

/** ISO-8601 week number: weeks start Monday, week 1 holds January 4th. */
function isoWeek(d: Date): number {
  const target = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  // Step to the Thursday of this week — that Thursday names the ISO year.
  target.setDate(target.getDate() - ((target.getDay() + 6) % 7) + 3);
  const firstThursday = new Date(target.getFullYear(), 0, 4);
  firstThursday.setDate(firstThursday.getDate() - ((firstThursday.getDay() + 6) % 7) + 3);
  return 1 + Math.round((target.getTime() - firstThursday.getTime()) / (7 * DAY_MS));
}

/** Local midnight of the day containing `ms`. */
function midnightOf(ms: number): number {
  const d = new Date(ms);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

/**
 * Parse an event boundary. All-day `date` strings are parsed as *local*
 * midnight by hand — `Date.parse('2026-08-13')` reads them as UTC and shifts
 * the day in most timezones.
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

const EDITOR_TAG = 'silk-holiday-card-editor';

registerEditor(
  EDITOR_TAG,
  [
    { name: 'entity', selector: { entity: { domain: ['calendar', 'sensor'] } } },
    { name: 'workday', selector: { entity: { domain: ['binary_sensor'] } } },
    { name: 'name', selector: { text: {} } },
    { name: 'show_details', selector: { boolean: {} } },
  ],
  {
    entity: 'Holiday calendar or sensor',
    workday: 'Workday sensor',
    name: 'Name',
    show_details: 'Show week & day number',
  },
  { show_details: false }
);

/**
 * The day, stated plainly. The big line is the date; anything the house knows
 * about the day — a holiday, a nameday, whether it is a working day — arrives
 * as a chip underneath rather than as a second competing headline.
 */
@customElement('silk-holiday-card')
export class SilkHolidayCard extends LitElement {
  @property({ attribute: false }) public hass?: HomeAssistant;

  @state() private _config?: SilkHolidayCardConfig;

  /** Render clock; bumped at midnight so the date never goes stale. */
  @state() private _today = midnightOf(Date.now());

  /** All-day calendar summaries covering today; undefined until first load. */
  @state() private _events?: string[];

  /** True when the calendar REST call failed — degrades to an inline note. */
  @state() private _calendarFailed = false;

  private _fetchStarted = false;
  /** Monotonic token so a stale fetch can never clobber a newer one. */
  private _fetchEpoch = 0;
  private _midnightTimer?: number;
  private _intervalTimer?: number;

  public static getStubConfig(hass: HomeAssistant): Partial<SilkHolidayCardConfig> {
    const ids = Object.keys(hass.states);
    const looksFestive = (id: string): boolean =>
      /holiday|nameday|name_day|feriado|feiertag/i.test(
        `${id} ${String(hass.states[id].attributes.friendly_name ?? '')}`
      );
    const entity =
      ids.find((id) => id.startsWith('calendar.') && looksFestive(id)) ??
      ids.find((id) => id.startsWith('sensor.') && looksFestive(id)) ??
      ids.find((id) => id.startsWith('calendar.'));
    return {
      type: 'custom:silk-holiday-card',
      entity,
      workday: ids.find((id) => id.startsWith('binary_sensor.workday')),
    };
  }

  public static async getConfigElement(): Promise<HTMLElement> {
    return document.createElement(EDITOR_TAG);
  }

  public setConfig(config: SilkHolidayCardConfig): void {
    if (config.entity !== undefined && typeof config.entity !== 'string') {
      throw new Error('silk-holiday-card: `entity` must be a calendar or sensor entity id');
    }
    if (config.workday !== undefined && domainOf(String(config.workday)) !== 'binary_sensor') {
      throw new Error('silk-holiday-card: `workday` must be a binary_sensor entity');
    }
    this._config = config;
    this._events = undefined;
    this._calendarFailed = false;
    this._fetchStarted = false;
  }

  public getCardSize(): number {
    return 2;
  }

  public getGridOptions(): Record<string, number> {
    return { columns: 6, rows: 2, min_columns: 4, min_rows: 2 };
  }

  public connectedCallback(): void {
    super.connectedCallback();
    this._today = midnightOf(Date.now());
    this._scheduleMidnight();
    this._intervalTimer = window.setInterval(() => void this._fetch(), REFRESH_INTERVAL_MS);
    // Re-sync on re-attach: the day may have rolled over off-screen.
    if (this.hass && this._config) {
      this._fetchStarted = true;
      void this._fetch();
    }
  }

  public disconnectedCallback(): void {
    super.disconnectedCallback();
    window.clearTimeout(this._midnightTimer);
    window.clearInterval(this._intervalTimer);
    this._midnightTimer = undefined;
    this._intervalTimer = undefined;
  }

  protected willUpdate(_changed: PropertyValues): void {
    if (!this.hass || !this._config || this._fetchStarted) return;
    this._fetchStarted = true;
    void this._fetch();
  }

  /** Roll the date over exactly at local midnight and refetch the day. */
  private _scheduleMidnight(): void {
    window.clearTimeout(this._midnightTimer);
    const now = Date.now();
    const next = new Date(now);
    next.setHours(24, 0, 0, 1);
    this._midnightTimer = window.setTimeout(() => {
      this._today = midnightOf(Date.now());
      void this._fetch();
      this._scheduleMidnight();
    }, next.getTime() - now);
  }

  private _isCalendar(): boolean {
    const entity = this._config?.entity;
    return !!entity && domainOf(entity) === 'calendar';
  }

  /** Today's all-day events, via the REST calendar endpoint. */
  private async _fetch(): Promise<void> {
    // callApi is a runtime member of hass not present in Silk's minimal type.
    const hass = this.hass as HassWithApi | undefined;
    const entity = this._config?.entity;
    if (!hass || !entity || !this._isCalendar()) return;
    const epoch = ++this._fetchEpoch;
    const dayStart = midnightOf(Date.now());
    const dayEnd = dayStart + DAY_MS;
    const start = encodeURIComponent(new Date(dayStart).toISOString());
    const end = encodeURIComponent(new Date(dayEnd).toISOString());
    let events: ApiEvent[];
    try {
      events = await hass.callApi<ApiEvent[]>(
        'GET',
        `calendars/${entity}?start=${start}&end=${end}`
      );
    } catch (err) {
      console.warn('silk-holiday-card: calendar fetch failed', err);
      if (epoch === this._fetchEpoch && this._events === undefined) this._calendarFailed = true;
      return;
    }
    if (epoch !== this._fetchEpoch) return;
    this._calendarFailed = false;
    const summaries: string[] = [];
    for (const raw of Array.isArray(events) ? events : []) {
      const evStart = parseBoundary(raw.start);
      // Namedays and public holidays are all-day entries; a 3pm dentist
      // appointment is not what this card is about.
      if (!evStart || !evStart.allDay) continue;
      const evEnd = parseBoundary(raw.end);
      const endMs = Math.max(evEnd?.ms ?? evStart.ms + DAY_MS, evStart.ms + DAY_MS);
      if (evStart.ms >= dayEnd || endMs <= dayStart) continue;
      const summary = (raw.summary ?? '').trim();
      if (summary) summaries.push(summary);
    }
    this._events = summaries;
  }

  /** Occasion chips: calendar summaries, or the sensor state as one name. */
  private _occasions(stateObj?: HassEntity): string[] {
    if (this._isCalendar()) return (this._events ?? []).slice(0, MAX_OCCASIONS);
    if (!stateObj || isUnavailable(stateObj)) return [];
    const raw = String(stateObj.state ?? '').trim();
    if (EMPTY_STATES.has(raw.toLowerCase())) return [];
    return [raw];
  }

  private _locale(): string {
    return this.hass?.locale?.language ?? this.hass?.language ?? 'en';
  }

  private _onCardClick(): void {
    const target = this._config?.entity ?? this._config?.workday;
    if (target) moreInfo(this, target);
  }

  /** Workday chip: 'Workday' when on, 'Day off' when off, nothing when unknown. */
  private _renderWorkday(): TemplateResult | typeof nothing {
    const id = this._config?.workday;
    if (!id) return nothing;
    const stateObj = this.hass?.states[id];
    if (!stateObj || isUnavailable(stateObj)) return nothing;
    const working = stateObj.state === 'on';
    return html`
      <span class="chip plain" title=${String(stateObj.attributes.friendly_name ?? id)}>
        ${working ? 'Workday' : 'Day off'}
      </span>
    `;
  }

  protected render(): TemplateResult | typeof nothing {
    const config = this._config;
    const hass = this.hass;
    if (!config || !hass) return nothing;
    const stateObj = config.entity ? hass.states[config.entity] : undefined;
    if (config.entity && !stateObj) {
      return html`<ha-card><div class="warning">Entity not found: ${config.entity}</div></ha-card>`;
    }

    const now = new Date(Math.max(this._today, Date.now()));
    const accent = accentFor(stateObj, config.color);
    const dateText = new Intl.DateTimeFormat(this._locale(), {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    }).format(now);
    const occasions = this._occasions(stateObj);
    const workday = this._renderWorkday();
    const showNote = this._calendarFailed && this._isCalendar();

    return html`
      <ha-card
        class="control ${config.entity || config.workday ? '' : 'plain'}"
        style="--silk-accent:${accent}"
        @click=${this._onCardClick}
      >
        ${config.name ? html`<div class="label" title=${config.name}>${config.name}</div>` : nothing}
        <div class="date" title=${dateText}>${dateText}</div>
        ${occasions.length || workday !== nothing || showNote
          ? html`
              <div class="chips">
                ${occasions.map(
                  (occasion) => html`
                    <span class="chip active" title=${occasion}>${occasion}</span>
                  `
                )}
                ${workday}
                ${showNote ? html`<span class="note">Calendar unavailable</span>` : nothing}
              </div>
            `
          : nothing}
        ${config.show_details
          ? html`
              <div class="details">
                <span>Week ${isoWeek(now)}</span>
                <span class="sep">·</span>
                <span>Day ${dayOfYear(now)} of ${daysInYear(now.getFullYear())}</span>
              </div>
            `
          : nothing}
      </ha-card>
    `;
  }

  static styles = [
    silkControlStyles,
    css`
      ha-card {
        flex-direction: column;
        align-items: stretch;
        justify-content: center;
        gap: 5px;
        padding: 12px 14px;
      }
      /* Nothing to open: the card stops pretending to be clickable. */
      ha-card.plain {
        cursor: default;
      }
      .label {
        flex: none;
        font-size: 12px;
        font-weight: 500;
        line-height: 1.3;
        color: var(--secondary-text-color);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .date {
        flex: none;
        font-size: 20px;
        font-weight: 600;
        letter-spacing: -0.02em;
        line-height: 1.2;
        color: var(--primary-text-color);
        font-variant-numeric: tabular-nums;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .chips {
        flex: none;
        display: flex;
        align-items: center;
        gap: 6px;
        min-width: 0;
        overflow: hidden;
      }
      /* Chips here are labels, not buttons — no hover lift, no pointer. */
      .chip {
        flex: 0 1 auto;
        min-width: 0;
        cursor: inherit;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .chip:hover {
        background: rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.06);
      }
      .chip.active:hover {
        background: color-mix(in srgb, var(--silk-accent) 16%, transparent);
      }
      .chip.plain {
        flex: none;
      }
      .details {
        flex: none;
        font-size: 11px;
        line-height: 1.3;
        color: var(--primary-text-color);
        opacity: 0.5;
        font-variant-numeric: tabular-nums;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .details .sep {
        opacity: 0.6;
        margin: 0 4px;
      }
      .note {
        flex: none;
        font-size: 11px;
        line-height: 1.3;
        color: var(--secondary-text-color);
        white-space: nowrap;
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    'silk-holiday-card': SilkHolidayCard;
  }
}
