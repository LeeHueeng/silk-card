import { LitElement, html, css, nothing, TemplateResult } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { HomeAssistant, LovelaceCardConfig } from '../types';
import { silkControlStyles } from '../shared/base';
import { domainOf, isUnavailable, moreInfo } from '../shared/service';
import { accentFor } from '../shared/color';
import { registerListEditor } from '../shared/listeditor';
import { entityListSelector } from '../shared/list';

export const META = {
  type: 'silk-calendar-card',
  name: 'Silk Agenda',
  description: "What's next, without the month grid.",
};

export interface SilkCalendarCardConfig extends LovelaceCardConfig {
  /** One or more calendar.* entities. */
  entities: string | string[];
  name?: string;
  /** Days ahead to fetch (default 7). */
  days?: number;
  /** Max event rows shown (default 6). */
  limit?: number;
  /** Per-calendar bar colors, matching `entities` order. */
  colors?: string[];
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

/** A merged, parsed event ready for grouping at render time. */
interface AgendaEvent {
  calIndex: number;
  summary: string;
  allDay: boolean;
  startMs: number;
  endMs: number;
}

const DAY_MS = 86_400_000;
const DEFAULT_DAYS = 7;
const DEFAULT_LIMIT = 6;
const REFRESH_INTERVAL_MS = 15 * 60_000;

/** First bar takes the card accent; the rest cycle Silk's muted palette. */
const PALETTE = ['var(--silk-accent)', '#e6a23c', '#57ad60', '#9d7ee8', '#35b5b1', '#e8734f'];

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

const EDITOR_TAG = 'silk-calendar-card-editor';

/**
 * `colors` is a parallel array to `entities` — the nth color paints the nth
 * calendar's bar — so it is authored as a list of text values in the same
 * order rather than as rows: pairing them into objects would change the config
 * shape the card reads.
 */
registerListEditor(EDITOR_TAG, {
  schema: [
    entityListSelector('entities', ['calendar']),
    { name: 'name', selector: { text: {} } },
    {
      name: '',
      type: 'grid',
      schema: [
        { name: 'days', selector: { number: { min: 1, max: 31, mode: 'box' } } },
        { name: 'limit', selector: { number: { min: 1, max: 20, mode: 'box' } } },
      ],
    },
    { name: 'colors', selector: { text: { multiple: true } } },
  ],
  labels: {
    entities: '달력 엔티티',
    name: '이름',
    days: '조회 일수',
    limit: '표시 줄 수',
    colors: '달력 색상 (순서대로, 예: #e6a23c)',
  },
  defaults: { days: DEFAULT_DAYS, limit: DEFAULT_LIMIT },
  listFields: ['entities'],
});

@customElement('silk-calendar-card')
export class SilkCalendarCard extends LitElement {
  @property({ attribute: false }) public hass?: HomeAssistant;

  @state() private _config?: SilkCalendarCardConfig;

  /** Merged upcoming events across calendars; undefined until the first load. */
  @state() private _events?: AgendaEvent[];

  private _entityIds: string[] = [];
  private _fetchStarted = false;
  /** Monotonic token so a stale fetch can never clobber a newer one. */
  private _fetchEpoch = 0;
  private _intervalTimer?: number;

  public static getStubConfig(hass: HomeAssistant): Partial<SilkCalendarCardConfig> {
    const entity = Object.keys(hass.states).find((id) => id.startsWith('calendar.'));
    // The list shape, which is what the picker in the editor also writes — a
    // bare string still works in YAML, it just cannot come back from a picker.
    return { type: 'custom:silk-calendar-card', entities: entity ? [entity] : [] };
  }

  public static async getConfigElement(): Promise<HTMLElement> {
    return document.createElement(EDITOR_TAG);
  }

  public setConfig(config: SilkCalendarCardConfig): void {
    const raw = config.entities;
    const ids = (Array.isArray(raw) ? raw : typeof raw === 'string' ? [raw] : []).filter(
      (id): id is string => typeof id === 'string' && id !== ''
    );
    if (ids.length === 0) {
      throw new Error('silk-calendar-card: `entities` requires at least one calendar entity');
    }
    const bad = ids.find((id) => domainOf(id) !== 'calendar');
    if (bad) {
      throw new Error(`silk-calendar-card: ${bad} is not a calendar entity`);
    }
    if (config.days !== undefined && !(Number(config.days) > 0)) {
      throw new Error('silk-calendar-card: `days` must be a positive number');
    }
    if (config.limit !== undefined && !(Number(config.limit) >= 1)) {
      throw new Error('silk-calendar-card: `limit` must be at least 1');
    }
    this._entityIds = ids;
    this._config = config;
    this._events = undefined;
    this._fetchStarted = false;
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
    // Re-sync on (re)attach — events may have changed while we were off-screen.
    if (this.hass && this._config) {
      this._fetchStarted = true;
      void this._fetch();
    }
  }

  public disconnectedCallback(): void {
    super.disconnectedCallback();
    window.clearInterval(this._intervalTimer);
  }

  protected willUpdate(): void {
    if (!this.hass || !this._config || this._fetchStarted) return;
    this._fetchStarted = true;
    void this._fetch();
  }

  private async _fetch(): Promise<void> {
    // callApi is a runtime member of hass not present in Silk's minimal type.
    const hass = this.hass as HassWithApi | undefined;
    const config = this._config;
    if (!hass || !config) return;
    const epoch = ++this._fetchEpoch;
    const days = config.days ?? DEFAULT_DAYS;
    const start = new Date();
    const end = new Date(start.getTime() + days * DAY_MS);
    const startISO = encodeURIComponent(start.toISOString());
    const endISO = encodeURIComponent(end.toISOString());
    const results = await Promise.allSettled(
      this._entityIds.map((id) =>
        hass.callApi<ApiEvent[]>('GET', `calendars/${id}?start=${startISO}&end=${endISO}`)
      )
    );
    if (epoch !== this._fetchEpoch) return;
    if (!results.some((r) => r.status === 'fulfilled')) {
      // Keep whatever we had; the 15-minute timer retries.
      console.warn('silk-calendar-card: calendar fetch failed', results);
      return;
    }
    const merged: AgendaEvent[] = [];
    results.forEach((res, calIndex) => {
      if (res.status !== 'fulfilled' || !Array.isArray(res.value)) return;
      for (const raw of res.value) {
        const evStart = parseBoundary(raw.start);
        if (!evStart) continue;
        const evEnd = parseBoundary(raw.end);
        // All-day ends are exclusive next-day midnights; default one when absent.
        const endMs = Math.max(evEnd?.ms ?? (evStart.allDay ? evStart.ms + DAY_MS : evStart.ms), evStart.ms);
        merged.push({
          calIndex,
          summary: (raw.summary ?? '').trim() || 'Busy',
          allDay: evStart.allDay,
          startMs: evStart.ms,
          endMs,
        });
      }
    });
    this._events = merged;
  }

  private _locale(): string {
    return this.hass?.locale?.language ?? this.hass?.language ?? 'en';
  }

  private _colorFor(calIndex: number): string {
    return this._config?.colors?.[calIndex] ?? PALETTE[calIndex % PALETTE.length];
  }

  private _dayLabel(dayMs: number, todayMs: number, dayFmt: Intl.DateTimeFormat): string {
    // Round, not divide-and-truncate: DST-stretched days are not exactly 24h.
    const diff = Math.round((dayMs - todayMs) / DAY_MS);
    if (diff === 0) return 'Today';
    if (diff === 1) return 'Tomorrow';
    return dayFmt.format(dayMs);
  }

  private _onCardClick(): void {
    if (this._entityIds.length > 0) moreInfo(this, this._entityIds[0]);
  }

  protected render(): TemplateResult | typeof nothing {
    const config = this._config;
    const hass = this.hass;
    if (!config || !hass) return nothing;
    const objs = this._entityIds.map((id) => hass.states[id]);
    if (objs.every((o) => !o)) {
      return html`
        <ha-card class="control">
          <div class="warning">Entity not found: ${this._entityIds.join(', ')}</div>
        </ha-card>
      `;
    }

    const unavailable = objs.every((o) => isUnavailable(o));
    const accent = accentFor(objs.find((o) => o));
    const name =
      config.name ??
      (this._entityIds.length === 1
        ? (objs[0]?.attributes.friendly_name ?? this._entityIds[0])
        : 'Agenda');
    const limit = Math.max(1, config.limit ?? DEFAULT_LIMIT);

    const locale = this._locale();
    const timeFmt = new Intl.DateTimeFormat(locale, { hour: 'numeric', minute: '2-digit' });
    const dayFmt = new Intl.DateTimeFormat(locale, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });

    // Group at render time against the current clock so 'Today' never staples
    // itself to yesterday: ongoing events are clamped up to the current day.
    const now = Date.now();
    const todayMid = midnightOf(now);
    const upcoming = (this._events ?? [])
      .filter((ev) => ev.endMs > now)
      .map((ev) => ({ ev, dayMs: midnightOf(Math.max(ev.startMs, now)) }))
      .sort(
        (a, b) =>
          a.dayMs - b.dayMs ||
          Number(b.ev.allDay) - Number(a.ev.allDay) ||
          a.ev.startMs - b.ev.startMs ||
          a.ev.summary.localeCompare(b.ev.summary)
      );
    const shown = upcoming.slice(0, limit);
    const overflow = upcoming.length - shown.length;

    const rows: TemplateResult[] = [];
    let lastDay: number | null = null;
    for (const { ev, dayMs } of shown) {
      if (dayMs !== lastDay) {
        lastDay = dayMs;
        rows.push(html`<div class="day">${this._dayLabel(dayMs, todayMid, dayFmt)}</div>`);
      }
      rows.push(html`
        <div class="row" title=${ev.summary}>
          <span class="bar" style="background:${this._colorFor(ev.calIndex)}"></span>
          <span class="summary">${ev.summary}</span>
          <span class="time">
            ${ev.allDay
              ? 'All day'
              : `${timeFmt.format(ev.startMs)}–${timeFmt.format(ev.endMs)}`}
          </span>
        </div>
      `);
    }

    return html`
      <ha-card
        class="control ${unavailable ? 'unavailable' : ''}"
        style="--silk-accent:${accent}"
        @click=${this._onCardClick}
      >
        ${name !== '' ? html`<div class="title">${name}</div>` : nothing}
        <div class="list">
          ${rows}
          ${this._events !== undefined && upcoming.length === 0
            ? html`
                <div class="empty">
                  <ha-icon icon="mdi:calendar-check-outline"></ha-icon>
                  <span>No events</span>
                </div>
              `
            : nothing}
          ${overflow > 0 ? html`<div class="more">+${overflow} more</div>` : nothing}
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
      }
      .title {
        flex: none;
        font-size: 14px;
        font-weight: 500;
        line-height: 1.3;
        color: var(--primary-text-color);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .list {
        display: flex;
        flex-direction: column;
        min-height: 0;
        overflow: hidden;
      }
      .day {
        font-size: 11px;
        font-weight: 600;
        line-height: 1.3;
        color: var(--secondary-text-color);
        margin: 6px 0 3px;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .list > .day:first-child {
        margin-top: 0;
      }
      .row {
        display: flex;
        align-items: center;
        gap: 8px;
        min-height: 26px;
        min-width: 0;
      }
      .bar {
        flex: none;
        width: 3px;
        height: 15px;
        border-radius: 2px;
        background: var(--silk-accent);
      }
      .summary {
        flex: 1;
        min-width: 0;
        font-size: 13.5px;
        line-height: 1.3;
        color: var(--primary-text-color);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .time {
        flex: none;
        font-size: 12px;
        line-height: 1.3;
        color: var(--secondary-text-color);
        font-variant-numeric: tabular-nums;
        white-space: nowrap;
      }
      .more {
        font-size: 12px;
        line-height: 1.3;
        color: var(--secondary-text-color);
        font-variant-numeric: tabular-nums;
        padding: 4px 0 0 11px;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .empty {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 8px 0 4px;
        font-size: 13px;
        color: var(--secondary-text-color);
      }
      .empty ha-icon {
        --mdc-icon-size: 18px;
        opacity: 0.7;
      }
      .unavailable .title,
      .unavailable .list {
        opacity: 0.45;
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    'silk-calendar-card': SilkCalendarCard;
  }
}
