import { LitElement, html, css, nothing, PropertyValues, TemplateResult } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { HomeAssistant, HassEntity, LovelaceCardConfig } from '../types';
import { silkControlStyles } from '../shared/base';
import { isActive, isUnavailable, moreInfo, haptic, clamp } from '../shared/service';
import { accentFor } from '../shared/color';
import { registerEditor } from '../shared/editor';

export const META = {
  type: 'silk-motion-card',
  name: 'Silk Motion',
  description: 'Where the house was busy today.',
};

export interface SilkMotionCardConfig extends LovelaceCardConfig {
  /** Motion / occupancy binary_sensors — one row each, first eight win. */
  sensors: string[];
  name?: string;
  /** Window length ending at now. Default 24. */
  hours_to_show?: number;
  /** Accent override. */
  color?: string;
}

/**
 * A history row from `history/history_during_period` with minimal_response:
 * the first row per entity is a full state object, the rest are `{s, lu}`.
 */
interface HistoryRow {
  s?: string;
  state?: string;
  lu?: number | string;
  last_updated?: number | string;
  lc?: number;
  last_changed?: string;
}

/** One 'on' stretch: percent geometry for the track plus its real clock span. */
interface Tick {
  x: number;
  w: number;
  from: number;
  to: number;
}

interface MotionRow {
  entity: string;
  name: string;
  stateObj?: HassEntity;
  ticks: Tick[];
  /** Unix seconds of the most recent trigger inside the window; null if none. */
  last: number | null;
  live: boolean;
  unavailable: boolean;
}

const DEFAULT_HOURS = 24;
const MAX_HOURS = 168;
/** Past eight rows the timeline stops being a glance and becomes a table. */
const MAX_ROWS = 8;
const REFRESH_INTERVAL_MS = 300_000;
const REFRESH_THROTTLE_MS = 60_000;
/** Re-render cadence so the header's 'ago' never goes stale between fetches. */
const CLOCK_TICK_MS = 30_000;

const EDITOR_TAG = 'silk-motion-card-editor';

registerEditor(
  EDITOR_TAG,
  [
    {
      name: 'sensors',
      required: true,
      selector: {
        entity: {
          multiple: true,
          domain: ['binary_sensor'],
          device_class: ['motion', 'occupancy', 'presence'],
        },
      },
    },
    { name: 'name', selector: { text: {} } },
    {
      name: '',
      type: 'grid',
      schema: [
        { name: 'hours_to_show', selector: { number: { min: 1, max: MAX_HOURS, mode: 'box' } } },
        { name: 'color', selector: { ui_color: {} } },
      ],
    },
  ],
  {
    sensors: '동작 센서',
    name: '이름',
    hours_to_show: '표시 시간',
    color: '강조 색상',
  },
  { hours_to_show: DEFAULT_HOURS }
);

/**
 * Row labels answer "which room?", so the redundant sensor vocabulary is
 * trimmed: "Hall Motion Sensor" reads as "Hall".
 */
function roomName(raw: string): string {
  const trimmed = raw.replace(/\s+(motion|occupancy|presence)(\s+sensor)?\s*$/i, '');
  return trimmed || raw;
}

/** `20s`, `4m`, `2h 15m` — a trigger's duration, never bare seconds. */
function durationText(seconds: number): string {
  if (seconds < 60) return `${Math.max(1, Math.round(seconds))}s`;
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
}

/** 'just now' → 'Nm ago' → 'Nh ago' → 'Nd ago'. */
function agoText(unixSec: number): string {
  const sec = Math.max(0, Date.now() / 1000 - unixSec);
  if (sec < 60) return 'just now';
  if (sec < 3600) return `${Math.floor(sec / 60)}m ago`;
  if (sec < 86400) return `${Math.floor(sec / 3600)}h ago`;
  return `${Math.floor(sec / 86400)}d ago`;
}

/**
 * The house's day of movement: one track per room, an accent tick for every
 * time that room woke up. Ticks never fall below 2px, so the 3-second trigger
 * at 4am is as visible as the hour someone spent in the kitchen.
 */
@customElement('silk-motion-card')
export class SilkMotionCard extends LitElement {
  @property({ attribute: false }) public hass?: HomeAssistant;

  @state() private _config?: SilkMotionCardConfig;
  /** entity → ticks; empty while the first fetch is in flight. */
  @state() private _tracks: Record<string, Tick[]> = {};
  @state() private _failed = false;
  /** Window end (unix seconds) the current tracks were built against. */
  @state() private _end = 0;

  private _sensors: string[] = [];
  private _fetchStarted = false;
  private _fetchSeq = 0;
  private _lastFetch = 0;
  private _lastStamp = '';
  private _refreshTimer?: number;
  private _intervalTimer?: number;
  private _clockTimer?: number;

  public static getStubConfig(hass: HomeAssistant): Partial<SilkMotionCardConfig> {
    const motion = Object.keys(hass.states).filter((id) => {
      if (!id.startsWith('binary_sensor.')) return false;
      const deviceClass = hass.states[id].attributes.device_class;
      return deviceClass === 'motion' || deviceClass === 'occupancy' || deviceClass === 'presence';
    });
    return { type: 'custom:silk-motion-card', sensors: motion.slice(0, MAX_ROWS) };
  }

  public static async getConfigElement(): Promise<HTMLElement> {
    return document.createElement(EDITOR_TAG);
  }

  public setConfig(config: SilkMotionCardConfig): void {
    if (!Array.isArray(config.sensors) || config.sensors.length === 0) {
      throw new Error(
        'silk-motion-card: `sensors` is required — a list of motion/occupancy binary_sensor ids'
      );
    }
    for (const id of config.sensors) {
      if (typeof id !== 'string' || !id.includes('.')) {
        throw new Error(`silk-motion-card: \`${String(id)}\` is not an entity id`);
      }
    }
    if (config.hours_to_show !== undefined && !(Number(config.hours_to_show) > 0)) {
      throw new Error('silk-motion-card: `hours_to_show` must be a positive number');
    }
    // Extra rows are dropped rather than squeezed — eight tracks is the limit
    // of a readable glance.
    this._sensors = config.sensors.slice(0, MAX_ROWS);
    this._config = config;
    this._tracks = {};
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

  /** Any tracked sensor switching redraws the timeline, throttled to 60s. */
  private _onStatesChanged(): void {
    const hass = this.hass!;
    const stamp = this._sensors.map((id) => hass.states[id]?.last_changed ?? '').join('|');
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
    return clamp(Number(this._config?.hours_to_show ?? DEFAULT_HOURS), 0.5, MAX_HOURS);
  }

  private async _refresh(): Promise<void> {
    const hass = this.hass;
    if (!hass || !this._config || !this._sensors.length) return;
    const seq = ++this._fetchSeq;
    const end = Date.now() / 1000;
    const start = end - this._hours() * 3600;

    let resp: Record<string, HistoryRow[]>;
    try {
      // One batched call covers every row.
      resp = await hass.callWS<Record<string, HistoryRow[]>>({
        type: 'history/history_during_period',
        start_time: new Date(start * 1000).toISOString(),
        end_time: new Date(end * 1000).toISOString(),
        entity_ids: this._sensors,
        minimal_response: true,
        no_attributes: true,
        significant_changes_only: false,
      });
    } catch (err) {
      console.warn('silk-motion-card: history fetch failed', err);
      if (seq === this._fetchSeq) this._failed = true;
      return;
    }
    if (seq !== this._fetchSeq) return; // a newer fetch superseded this one
    this._lastFetch = Date.now();

    const tracks: Record<string, Tick[]> = {};
    for (const id of this._sensors) {
      const samples: [number, string][] = (resp?.[id] ?? [])
        .map((row): [number, string] => {
          const raw = row.lu ?? row.last_updated ?? row.lc ?? row.last_changed ?? NaN;
          const t = typeof raw === 'number' ? raw : Date.parse(raw) / 1000;
          return [t, String(row.s ?? row.state ?? '')];
        })
        .filter((p) => Number.isFinite(p[0]) && p[0] <= end)
        .sort((a, b) => a[0] - b[0]);
      tracks[id] = this._buildTicks(id, samples, start, end);
    }
    this._tracks = tracks;
    this._end = end;
    this._failed = false;
  }

  /** Every 'on' stretch from raw history, merged and clipped to the window. */
  private _buildTicks(
    entityId: string,
    samples: [number, string][],
    start: number,
    end: number
  ): Tick[] {
    const total = end - start || 1;
    const ticks: Tick[] = [];
    for (let i = 0; i < samples.length; i++) {
      const t0 = Math.max(samples[i][0], start);
      const t1 = i + 1 < samples.length ? Math.min(Math.max(samples[i + 1][0], start), end) : end;
      if (t1 <= t0) continue;
      // isActive() reads entity_id + state only, so a synthetic snapshot suffices.
      const snapshot: HassEntity = {
        entity_id: entityId,
        state: samples[i][1],
        attributes: {},
        last_changed: '',
        last_updated: '',
      };
      if (!isActive(snapshot)) continue;
      const prev = ticks[ticks.length - 1];
      if (prev && prev.to >= t0 - 1) {
        // Contiguous rows are the same trigger split by an attribute update.
        prev.to = t1;
        prev.w = ((t1 - prev.from) / total) * 100;
      } else {
        ticks.push({
          x: ((t0 - start) / total) * 100,
          w: ((t1 - t0) / total) * 100,
          from: t0,
          to: t1,
        });
      }
    }
    return ticks;
  }

  private _locale(): string {
    return this.hass?.locale?.language ?? this.hass?.language ?? 'en';
  }

  private _rows(): MotionRow[] {
    const hass = this.hass!;
    return this._sensors.map((id) => {
      const stateObj = hass.states[id];
      const ticks = this._tracks[id] ?? [];
      const unavailable = !stateObj || isUnavailable(stateObj);
      return {
        entity: id,
        name: roomName(stateObj?.attributes.friendly_name ?? id.split('.')[1] ?? id),
        stateObj,
        ticks,
        last: ticks.length ? ticks[ticks.length - 1].from : null,
        live: !unavailable && isActive(stateObj),
        unavailable,
      };
    });
  }

  /** Ruler ticks on whole clock hours — 0/6/12/18 across a day-long window. */
  private _rulerTicks(start: number, end: number): { x: number; label: string }[] {
    const hours = (end - start) / 3600;
    const step = hours <= 6 ? 1 : hours <= 14 ? 3 : hours <= 40 ? 6 : hours <= 96 ? 12 : 24;
    const fmt = new Intl.DateTimeFormat(this._locale(), { hour: 'numeric' });
    const cursor = new Date(start * 1000);
    cursor.setMinutes(0, 0, 0);
    if (cursor.getTime() / 1000 < start) cursor.setTime(cursor.getTime() + 3_600_000);
    const out: { x: number; label: string }[] = [];
    for (let guard = 0; guard < 400; guard++) {
      const t = cursor.getTime() / 1000;
      if (t > end) break;
      if (cursor.getHours() % step === 0) {
        const x = ((t - start) / (end - start)) * 100;
        // Keep clear of the edges, where 'now' already speaks.
        if (x >= 3 && x <= 88) out.push({ x, label: fmt.format(cursor) });
      }
      cursor.setTime(cursor.getTime() + 3_600_000);
    }
    return out;
  }

  private _tickTitle(row: MotionRow, tick: Tick): string {
    const fmt = new Intl.DateTimeFormat(this._locale(), { hour: '2-digit', minute: '2-digit' });
    const from = fmt.format(new Date(tick.from * 1000));
    const span = tick.to - tick.from;
    if (span < 60) return `${row.name} · ${from} · ${durationText(span)}`;
    const to = fmt.format(new Date(tick.to * 1000));
    return `${row.name} · ${from} → ${to} · ${durationText(span)}`;
  }

  private _rowTitle(row: MotionRow): string {
    const hours = this._hours();
    const window = hours % 1 === 0 ? `${hours}h` : `${Math.round(hours * 60)}m`;
    if (row.unavailable) return `${row.name} · unavailable`;
    if (!row.ticks.length) return `${row.name} · no motion in the last ${window}`;
    const count = row.ticks.length;
    const last = row.live ? 'active now' : agoText(row.ticks[row.ticks.length - 1].from);
    return `${row.name} · ${count} ${count === 1 ? 'trigger' : 'triggers'} · last ${last}`;
  }

  private _onRowClick(ev: Event, entityId: string): void {
    ev.stopPropagation();
    haptic(this, 'selection');
    moreInfo(this, entityId);
  }

  /** The room that moved most recently — the card's one-line answer. */
  private _latest(rows: MotionRow[]): { name: string; when: string } | null {
    const live = rows.filter((row) => row.live);
    const pool = live.length ? live : rows.filter((row) => row.last !== null);
    if (!pool.length) return null;
    const best = pool.reduce((a, b) => ((b.last ?? -Infinity) > (a.last ?? -Infinity) ? b : a));
    if (best.live) return { name: best.name, when: 'now' };
    return { name: best.name, when: agoText(best.last!) };
  }

  protected render(): TemplateResult | typeof nothing {
    const config = this._config;
    const hass = this.hass;
    if (!config || !hass) return nothing;

    const rows = this._rows();
    if (rows.every((row) => !row.stateObj)) {
      return html`
        <ha-card class="control">
          <div class="warning">Entity not found: ${this._sensors.join(', ')}</div>
        </ha-card>
      `;
    }

    const accent = accentFor(rows.find((row) => row.stateObj)?.stateObj, config.color);
    const allUnavailable = rows.every((row) => row.unavailable);
    const end = this._end || Date.now() / 1000;
    const ruler = this._rulerTicks(end - this._hours() * 3600, end);
    const latest = this._latest(rows);
    const loaded = Object.keys(this._tracks).length > 0;
    const quiet = loaded && rows.every((row) => row.ticks.length === 0);

    return html`
      <ha-card
        class="control ${allUnavailable ? 'unavailable' : ''}"
        style="--silk-accent:${accent}"
      >
        <div class="header">
          <div class="hname" title=${config.name ?? 'Motion'}>${config.name ?? 'Motion'}</div>
          ${latest
            ? html`<div class="latest" title=${`Last motion: ${latest.name}`}>
                <span class="lname">${latest.name}</span>
                <span class="sep">·</span>
                <span class="lago">${latest.when}</span>
              </div>`
            : nothing}
        </div>
        <div class="rows">
          ${rows.map(
            (row) => html`
              <button
                class="row ${row.unavailable ? 'na' : ''} ${row.live ? 'live' : ''}"
                title=${this._rowTitle(row)}
                aria-label=${this._rowTitle(row)}
                @click=${(ev: Event) => this._onRowClick(ev, row.entity)}
              >
                <span class="label">${row.name}</span>
                <span class="track">
                  ${row.ticks.map(
                    (tick) => html`
                      <span
                        class="tick"
                        style="left:${tick.x.toFixed(3)}%;width:${tick.w.toFixed(3)}%"
                        title=${this._tickTitle(row, tick)}
                      ></span>
                    `
                  )}
                </span>
              </button>
            `
          )}
          <span class="nowline" aria-hidden="true"></span>
        </div>
        <div class="ruler" aria-hidden="true">
          ${ruler.map((tick) => html`<span style="left:${tick.x.toFixed(3)}%">${tick.label}</span>`)}
          <span class="now">now</span>
        </div>
        ${this._failed
          ? html`<div class="note">History unavailable right now</div>`
          : quiet
            ? html`<div class="note">No motion in this window</div>`
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
        gap: 6px;
        padding: 12px 14px;
        cursor: default;
      }
      .header {
        flex: none;
        display: flex;
        align-items: baseline;
        gap: 8px;
        min-width: 0;
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
      .latest {
        flex: 0 1 auto;
        min-width: 0;
        display: flex;
        align-items: baseline;
        gap: 3px;
        font-size: 12px;
        line-height: 1.3;
        color: var(--secondary-text-color);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        font-variant-numeric: tabular-nums;
      }
      .lname {
        min-width: 0;
        font-weight: 600;
        color: var(--primary-text-color);
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .latest .sep {
        opacity: 0.5;
      }
      .rows {
        position: relative;
        flex: none;
        display: flex;
        flex-direction: column;
        gap: 4px;
        min-width: 0;
      }
      .row {
        display: flex;
        align-items: center;
        gap: 10px;
        width: 100%;
        margin: 0;
        padding: 3px 0;
        border: none;
        border-radius: 8px;
        background: none;
        font: inherit;
        color: inherit;
        text-align: left;
        cursor: pointer;
        outline: none;
        transition: background 150ms ease-out;
      }
      .row:hover {
        background: rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.04);
      }
      .row:focus-visible {
        box-shadow: inset 0 0 0 2px color-mix(in srgb, var(--silk-accent) 70%, transparent);
      }
      .row.na {
        opacity: 0.45;
      }
      .label {
        flex: none;
        width: 68px;
        font-size: 12px;
        line-height: 1.3;
        color: var(--secondary-text-color);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        transition: color 200ms ease;
      }
      /* A room that is moving right now earns the accent on its label. */
      .row.live .label {
        color: var(--silk-accent);
        font-weight: 500;
      }
      .track {
        position: relative;
        flex: 1;
        min-width: 0;
        height: 10px;
        border-radius: 5px;
        background: rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.06);
        overflow: hidden;
      }
      /* One accent hue for every tick: length carries the magnitude, not color.
         The 2px floor keeps a three-second trigger from vanishing. */
      .tick {
        position: absolute;
        top: 0;
        bottom: 0;
        min-width: 2px;
        border-radius: 5px;
        background: var(--silk-accent);
        animation: silk-motion-in 250ms var(--silk-ease-out);
      }
      .nowline {
        position: absolute;
        top: 0;
        bottom: 0;
        right: 0;
        width: 1px;
        background: color-mix(in srgb, var(--silk-accent) 55%, transparent);
        pointer-events: none;
      }
      .ruler {
        position: relative;
        flex: none;
        height: 11px;
        margin-left: 78px;
        font-size: 9px;
        line-height: 11px;
        color: var(--primary-text-color);
        font-variant-numeric: tabular-nums;
        pointer-events: none;
      }
      .ruler span {
        position: absolute;
        top: 0;
        opacity: 0.45;
        transform: translateX(-50%);
        white-space: nowrap;
      }
      .ruler .now {
        left: auto;
        right: 0;
        transform: none;
      }
      .note {
        flex: none;
        font-size: 12px;
        color: var(--secondary-text-color);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      @keyframes silk-motion-in {
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
    'silk-motion-card': SilkMotionCard;
  }
}
