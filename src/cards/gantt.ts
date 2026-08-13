import { LitElement, html, css, nothing, PropertyValues, TemplateResult } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { HomeAssistant, HassEntity, LovelaceCardConfig } from '../types';
import { silkControlStyles } from '../shared/base';
import { isActive, isUnavailable, moreInfo, haptic, clamp } from '../shared/service';
import { accentFor } from '../shared/color';
import { registerEditor } from '../shared/editor';

export const META = {
  type: 'silk-gantt-card',
  name: 'Silk Gantt',
  description: 'Who was on, and when.',
};

/** A row: an entity plus an optional display name. */
export interface GanttEntityConfig {
  entity: string;
  name?: string;
}

export interface SilkGanttCardConfig extends LovelaceCardConfig {
  entities: (string | GanttEntityConfig)[];
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

/** An active stretch, in percent units of the window plus its real clock span. */
interface Segment {
  x: number;
  w: number;
  from: number;
  to: number;
}

interface GanttRow {
  entity: string;
  name: string;
  stateObj?: HassEntity;
  segments: Segment[];
  /** Seconds spent active inside the window. */
  activeSec: number;
  unavailable: boolean;
}

const DEFAULT_HOURS = 24;
const MAX_HOURS = 168;
/** Eight rows is where a glanceable timeline turns into a spreadsheet. */
const MAX_ROWS = 8;
const REFRESH_INTERVAL_MS = 300_000;
const REFRESH_THROTTLE_MS = 60_000;

const EDITOR_TAG = 'silk-gantt-card-editor';

registerEditor(
  EDITOR_TAG,
  [
    { name: 'entities', required: true, selector: { entity: { multiple: true } } },
    { name: 'name', selector: { text: {} } },
    { name: 'hours_to_show', selector: { number: { min: 1, max: MAX_HOURS, mode: 'box' } } },
  ],
  {
    entities: 'Entities',
    name: 'Name',
    hours_to_show: 'Hours to show',
  },
  { hours_to_show: DEFAULT_HOURS }
);

/** `37m`, `2h`, `2h 15m` — never a bare number of seconds. */
function durationText(seconds: number): string {
  const minutes = Math.max(1, Math.round(seconds / 60));
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
}

@customElement('silk-gantt-card')
export class SilkGanttCard extends LitElement {
  @property({ attribute: false }) public hass?: HomeAssistant;

  @state() private _config?: SilkGanttCardConfig;
  /** entity → segments; empty object while the first fetch is in flight. */
  @state() private _tracks: Record<string, Segment[]> = {};
  @state() private _active: Record<string, number> = {};
  @state() private _failed = false;
  /** Window end (unix seconds) the current tracks were built against. */
  @state() private _end = 0;

  private _entities: GanttEntityConfig[] = [];
  private _fetchStarted = false;
  private _fetchSeq = 0;
  private _lastFetch = 0;
  private _lastStamp = '';
  private _refreshTimer?: number;
  private _intervalTimer?: number;

  public static getStubConfig(hass: HomeAssistant): Partial<SilkGanttCardConfig> {
    const pick = (prefix: string) =>
      Object.keys(hass.states).filter((id) => id.startsWith(prefix));
    const ids = [...pick('light.'), ...pick('switch.'), ...pick('binary_sensor.')];
    return { type: 'custom:silk-gantt-card', entities: ids.slice(0, 4) };
  }

  public static async getConfigElement(): Promise<HTMLElement> {
    return document.createElement(EDITOR_TAG);
  }

  public setConfig(config: SilkGanttCardConfig): void {
    if (!Array.isArray(config.entities) || config.entities.length === 0) {
      throw new Error('silk-gantt-card: `entities` is required — a list of entity ids');
    }
    if (config.hours_to_show !== undefined && !(Number(config.hours_to_show) > 0)) {
      throw new Error('silk-gantt-card: `hours_to_show` must be a positive number');
    }
    // Past eight rows the timeline stops being readable, so extras are dropped.
    this._entities = config.entities.slice(0, MAX_ROWS).map((item) => {
      const obj: GanttEntityConfig | undefined =
        typeof item === 'string' ? { entity: item } : (item as GanttEntityConfig);
      if (!obj || typeof obj.entity !== 'string' || !obj.entity.includes('.')) {
        throw new Error('silk-gantt-card: every entry in `entities` needs an `entity`');
      }
      return obj;
    });
    this._config = config;
    this._tracks = {};
    this._active = {};
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
    if (this.hasUpdated && this._fetchStarted) this._refresh();
  }

  public disconnectedCallback(): void {
    super.disconnectedCallback();
    window.clearInterval(this._intervalTimer);
    window.clearTimeout(this._refreshTimer);
    this._refreshTimer = undefined;
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

  /** Any tracked entity switching redraws the timeline, throttled to 60s. */
  private _onStatesChanged(): void {
    const hass = this.hass!;
    const stamp = this._entities.map((e) => hass.states[e.entity]?.last_changed ?? '').join('|');
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
    if (!hass || !this._config || !this._entities.length) return;
    const ids = this._entities.map((e) => e.entity);
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
        entity_ids: ids,
        minimal_response: true,
        no_attributes: true,
        significant_changes_only: false,
      });
    } catch (err) {
      console.warn('silk-gantt-card: history fetch failed', err);
      if (seq === this._fetchSeq) this._failed = true;
      return;
    }
    if (seq !== this._fetchSeq) return; // a newer fetch superseded this one
    this._lastFetch = Date.now();

    const tracks: Record<string, Segment[]> = {};
    const active: Record<string, number> = {};
    for (const id of ids) {
      const samples: [number, string][] = (resp?.[id] ?? [])
        .map((row): [number, string] => {
          const raw = row.lu ?? row.last_updated ?? row.lc ?? row.last_changed ?? NaN;
          const t = typeof raw === 'number' ? raw : Date.parse(raw) / 1000;
          return [t, String(row.s ?? row.state ?? '')];
        })
        .filter((p) => Number.isFinite(p[0]) && p[0] <= end)
        .sort((a, b) => a[0] - b[0]);
      const built = this._buildSegments(id, samples, start, end);
      tracks[id] = built.segments;
      active[id] = built.activeSec;
    }
    this._tracks = tracks;
    this._active = active;
    this._end = end;
    this._failed = false;
  }

  /** Active stretches from raw history, merged and clipped to the window. */
  private _buildSegments(
    entityId: string,
    samples: [number, string][],
    start: number,
    end: number
  ): { segments: Segment[]; activeSec: number } {
    const total = end - start || 1;
    const segments: Segment[] = [];
    let activeSec = 0;
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
      activeSec += t1 - t0;
      const prev = segments[segments.length - 1];
      if (prev && prev.to >= t0 - 1) {
        prev.to = t1;
        prev.w = ((t1 - prev.from) / total) * 100;
      } else {
        segments.push({
          x: ((t0 - start) / total) * 100,
          w: ((t1 - t0) / total) * 100,
          from: t0,
          to: t1,
        });
      }
    }
    return { segments, activeSec };
  }

  private _locale(): string {
    return this.hass?.locale?.language ?? this.hass?.language ?? 'en';
  }

  private _rows(): GanttRow[] {
    const hass = this.hass!;
    return this._entities.map((item) => {
      const stateObj = hass.states[item.entity];
      return {
        entity: item.entity,
        name: item.name ?? stateObj?.attributes.friendly_name ?? item.entity,
        stateObj,
        segments: this._tracks[item.entity] ?? [],
        activeSec: this._active[item.entity] ?? 0,
        unavailable: !stateObj || isUnavailable(stateObj),
      };
    });
  }

  /** Ruler ticks on whole clock hours — 0/6/12/18 across a day-long window. */
  private _ticks(start: number, end: number): { x: number; label: string }[] {
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
        // Keep clear of the edges, where "now" already speaks.
        if (x >= 3 && x <= 88) out.push({ x, label: fmt.format(cursor) });
      }
      cursor.setTime(cursor.getTime() + 3_600_000);
    }
    return out;
  }

  private _segTitle(seg: Segment): string {
    const fmt = new Intl.DateTimeFormat(this._locale(), { hour: '2-digit', minute: '2-digit' });
    const from = fmt.format(new Date(seg.from * 1000));
    const to = fmt.format(new Date(seg.to * 1000));
    return `${from} → ${to} · ${durationText(seg.to - seg.from)}`;
  }

  private _rowTitle(row: GanttRow): string {
    const hours = this._hours();
    const window = hours % 1 === 0 ? `${hours}h` : `${Math.round(hours * 60)}m`;
    if (!row.segments.length) return `${row.name} · never on in the last ${window}`;
    return `${row.name} · on ${durationText(row.activeSec)} of ${window}`;
  }

  private _onRowClick(ev: Event, entityId: string): void {
    ev.stopPropagation();
    haptic(this, 'selection');
    moreInfo(this, entityId);
  }

  protected render(): TemplateResult | typeof nothing {
    const config = this._config;
    const hass = this.hass;
    if (!config || !hass) return nothing;

    const rows = this._rows();
    const accent = accentFor(rows.find((r) => r.stateObj)?.stateObj, config.color);
    const allUnavailable = rows.every((r) => r.unavailable);
    const end = this._end || Date.now() / 1000;
    const ticks = this._ticks(end - this._hours() * 3600, end);

    return html`
      <ha-card
        class="control ${allUnavailable ? 'unavailable' : ''}"
        style="--silk-accent:${accent}"
      >
        ${config.name ? html`<div class="hname" title=${config.name}>${config.name}</div>` : nothing}
        <div class="rows">
          ${rows.map(
            (row) => html`
              <button
                class="row ${row.unavailable ? 'na' : ''}"
                title=${this._rowTitle(row)}
                aria-label=${this._rowTitle(row)}
                @click=${(ev: Event) => this._onRowClick(ev, row.entity)}
              >
                <span class="label">${row.name}</span>
                <span class="track">
                  ${row.segments.map(
                    (seg) => html`
                      <span
                        class="seg"
                        style="left:${seg.x.toFixed(3)}%;width:${seg.w.toFixed(3)}%"
                        title=${this._segTitle(seg)}
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
          ${ticks.map((tick) => html`<span style="left:${tick.x.toFixed(3)}%">${tick.label}</span>`)}
          <span class="now">now</span>
        </div>
        ${this._failed ? html`<div class="note">History unavailable right now</div>` : nothing}
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
      .hname {
        flex: none;
        font-size: 13px;
        font-weight: 600;
        color: var(--secondary-text-color);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
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
        padding: 4px 0;
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
        width: 72px;
        font-size: 12px;
        line-height: 1.3;
        color: var(--primary-text-color);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .track {
        position: relative;
        flex: 1;
        min-width: 0;
        height: 12px;
        border-radius: 6px;
        background: rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.06);
        overflow: hidden;
      }
      .seg {
        position: absolute;
        top: 0;
        bottom: 0;
        min-width: 2px;
        border-radius: 6px;
        background: var(--silk-accent);
        animation: silk-gantt-in 250ms var(--silk-ease-out);
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
        margin-left: 82px;
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
      @keyframes silk-gantt-in {
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
    'silk-gantt-card': SilkGanttCard;
  }
}
