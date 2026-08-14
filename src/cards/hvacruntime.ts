import {
  LitElement,
  html,
  svg,
  css,
  nothing,
  PropertyValues,
  TemplateResult,
  SVGTemplateResult,
} from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { HomeAssistant, HassEntity, LovelaceCardConfig } from '../types';
import { silkControlStyles } from '../shared/base';
import { isActive, isUnavailable, moreInfo, stateText, clamp } from '../shared/service';
import { accentFor } from '../shared/color';
import { registerEditor } from '../shared/editor';

export const META = {
  type: 'silk-runtime-card',
  name: 'Silk Runtime',
  description: 'How long the heating actually ran.',
};

export interface SilkRuntimeCardConfig extends LovelaceCardConfig {
  entity: string;
  name?: string;
  icon?: string;
  color?: string;
  /** Accounting window, ending now. Default 24. */
  hours_to_show?: number;
  /** Adds a delta chip against the window immediately before this one. */
  compare_yesterday?: boolean;
}

/**
 * A history row from `history/history_during_period` with minimal_response:
 * the first row per entity is a full state object, the rest are `{s, lu}`.
 * Silk's minimal HomeAssistant type doesn't model the response, so it lives here.
 */
interface HistoryRow {
  s?: string;
  state?: string;
  lu?: number | string;
  last_updated?: number | string;
  lc?: number;
  last_changed?: string;
}

/** One continuous run, in seconds and in percent of the window. */
interface Run {
  t0: number;
  t1: number;
  x: number;
  w: number;
}

interface WindowStats {
  activeSec: number;
  /** Number of distinct runs; one that was already going at window open counts. */
  cycles: number;
  runs: Run[];
}

const DEFAULT_HOURS = 24;
const MAX_HOURS = 168;
const BAR_HEIGHT = 12;
const BAR_RADIUS = 5;
const REFRESH_INTERVAL_MS = 300_000;
const REFRESH_THROTTLE_MS = 60_000;
/** Runs shorter than this are still drawn, at this width, so they stay visible. */
const MIN_RUN_PCT = 0.5;

const DEAD_STATES = new Set(['unavailable', 'unknown', 'none', '']);

/** `4h 12m`, `28m`, `0m` — never `0h 05m`. */
function formatDuration(minutes: number): string {
  const total = Math.max(0, Math.round(minutes));
  const h = Math.floor(total / 60);
  const m = total % 60;
  return h > 0 ? `${h}h ${String(m).padStart(2, '0')}m` : `${m}m`;
}

/** Compact "how long ago", for the live run in the state line. */
function shortSince(iso: string): string {
  const ms = Date.parse(iso);
  if (!Number.isFinite(ms)) return '';
  const sec = Math.max(0, (Date.now() - ms) / 1000);
  if (sec < 60) return 'just now';
  if (sec < 3600) return `${Math.floor(sec / 60)}m`;
  return `${Math.floor(sec / 3600)}h ${String(Math.floor((sec % 3600) / 60)).padStart(2, '0')}m`;
}

const EDITOR_TAG = 'silk-runtime-card-editor';

registerEditor(
  EDITOR_TAG,
  [
    {
      name: 'entity',
      required: true,
      selector: {
        entity: {
          domain: ['climate', 'switch', 'binary_sensor', 'input_boolean', 'fan', 'water_heater'],
        },
      },
    },
    { name: 'name', selector: { text: {} } },
    {
      name: '',
      type: 'grid',
      schema: [
        { name: 'icon', selector: { icon: {} } },
        { name: 'hours_to_show', selector: { number: { min: 1, max: MAX_HOURS, mode: 'box' } } },
      ],
    },
    { name: 'compare_yesterday', selector: { boolean: {} } },
    { name: 'color', selector: { ui_color: {} } },
  ],
  {
    entity: '엔티티',
    name: '이름',
    icon: '아이콘',
    hours_to_show: '집계 시간',
    compare_yesterday: '직전 구간과 비교',
    color: '강조 색상',
  },
  { hours_to_show: DEFAULT_HOURS, compare_yesterday: false }
);

/**
 * Runtime accounting: not "is the heating on" but "how much did it actually
 * run, in how many cycles, and how long was each one".
 */
@customElement('silk-runtime-card')
export class SilkRuntimeCard extends LitElement {
  @property({ attribute: false }) public hass?: HomeAssistant;

  @state() private _config?: SilkRuntimeCardConfig;
  @state() private _cur: WindowStats | null = null;
  /** Previous window of equal length; null unless compare_yesterday is on. */
  @state() private _prev: WindowStats | null = null;
  @state() private _error = false;

  private _fetchStarted = false;
  private _fetchSeq = 0;
  private _lastFetch = 0;
  private _lastUpdated?: string;
  private _refreshTimer?: number;
  private _intervalTimer?: number;

  public static getStubConfig(hass: HomeAssistant): Partial<SilkRuntimeCardConfig> {
    const ids = Object.keys(hass.states);
    const entity =
      ids.find((id) => id.startsWith('climate.')) ?? ids.find((id) => id.startsWith('switch.'));
    return { type: 'custom:silk-runtime-card', entity };
  }

  public static async getConfigElement(): Promise<HTMLElement> {
    return document.createElement(EDITOR_TAG);
  }

  public setConfig(config: SilkRuntimeCardConfig): void {
    if (!config.entity || typeof config.entity !== 'string' || !config.entity.includes('.')) {
      throw new Error('silk-runtime-card: `entity` is required and must be an entity id');
    }
    if (config.hours_to_show !== undefined && !(Number(config.hours_to_show) > 0)) {
      throw new Error('silk-runtime-card: `hours_to_show` must be a positive number');
    }
    this._config = config;
    this._fetchStarted = false;
    this._cur = null;
    this._prev = null;
    this._error = false;
    this._lastUpdated = undefined;
  }

  public getCardSize(): number {
    return 2;
  }

  public getGridOptions(): Record<string, number> {
    return { columns: 6, rows: 2, min_columns: 4, min_rows: 2 };
  }

  public connectedCallback(): void {
    super.connectedCallback();
    this._intervalTimer = window.setInterval(() => this._refresh(), REFRESH_INTERVAL_MS);
  }

  public disconnectedCallback(): void {
    super.disconnectedCallback();
    window.clearInterval(this._intervalTimer);
    this._intervalTimer = undefined;
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

  /** Refetch when the entity actually records a new state, throttled to 60s. */
  private _onStatesChanged(): void {
    const stamp = this.hass?.states[this._config!.entity]?.last_updated;
    if (!stamp || stamp === this._lastUpdated) return;
    this._lastUpdated = stamp;
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
    const config = this._config;
    if (!hass || !config) return;
    const hours = this._hours();
    const compare = config.compare_yesterday === true;
    const seq = ++this._fetchSeq;
    const end = Date.now() / 1000;
    const start = end - hours * 3600;
    // One request covers both windows; the API includes the state in force at
    // start_time, so the run already under way at the opening edge is counted.
    const fetchStart = compare ? end - 2 * hours * 3600 : start;
    let resp: Record<string, HistoryRow[]>;
    try {
      resp = await hass.callWS<Record<string, HistoryRow[]>>({
        type: 'history/history_during_period',
        start_time: new Date(fetchStart * 1000).toISOString(),
        end_time: new Date(end * 1000).toISOString(),
        entity_ids: [config.entity],
        minimal_response: true,
        no_attributes: true,
        significant_changes_only: false,
      });
    } catch (err) {
      console.warn('silk-runtime-card: history fetch failed', err);
      if (seq === this._fetchSeq) this._error = true;
      return;
    }
    if (seq !== this._fetchSeq) return; // a newer fetch superseded this one
    this._lastFetch = Date.now();
    const samples: [number, string][] = (resp?.[config.entity] ?? [])
      .map((row): [number, string] => {
        const raw = row.lu ?? row.last_updated ?? row.lc ?? row.last_changed ?? NaN;
        const t = typeof raw === 'number' ? raw : Date.parse(raw) / 1000;
        return [t, String(row.s ?? row.state ?? '')];
      })
      .filter((p) => Number.isFinite(p[0]) && p[0] <= end)
      .sort((a, b) => a[0] - b[0]);
    this._error = false;
    this._cur = this._accumulate(samples, start, end);
    this._prev = compare ? this._accumulate(samples, fetchStart, start) : null;
  }

  /** isActive() reads only entity_id + state, so a synthetic snapshot suffices. */
  private _isRunning(stateStr: string): boolean {
    if (DEAD_STATES.has(stateStr.toLowerCase())) return false;
    const snapshot: HassEntity = {
      entity_id: this._config!.entity,
      state: stateStr,
      attributes: {},
      last_changed: '',
      last_updated: '',
    };
    return isActive(snapshot);
  }

  /** Time-weighted runtime over [start, end], with runs merged across samples. */
  private _accumulate(samples: [number, string][], start: number, end: number): WindowStats {
    const total = Math.max(end - start, 1);
    const runs: Run[] = [];
    let activeSec = 0;
    for (let i = 0; i < samples.length; i++) {
      const t0 = Math.max(samples[i][0], start);
      const t1 = i + 1 < samples.length ? Math.min(Math.max(samples[i + 1][0], start), end) : end;
      if (t1 <= t0) continue;
      if (!this._isRunning(samples[i][1])) continue;
      activeSec += t1 - t0;
      const prev = runs[runs.length - 1];
      // Consecutive active samples (e.g. heat → heat_cool) are one cycle.
      if (prev && t0 - prev.t1 < 1) {
        prev.t1 = t1;
        prev.w = ((t1 - prev.t0) / total) * 100;
      } else {
        runs.push({ t0, t1, x: ((t0 - start) / total) * 100, w: ((t1 - t0) / total) * 100 });
      }
    }
    return { activeSec, cycles: runs.length, runs };
  }

  private _locale(): string {
    return this.hass?.locale?.language ?? this.hass?.language ?? 'en';
  }

  private _spanLabel(): string {
    const hours = this._hours();
    if (hours === 24) return 'today';
    if (hours >= 48 && hours % 24 === 0) return `in ${hours / 24}d`;
    return `in ${Math.round(hours)}h`;
  }

  private _onCardClick(): void {
    if (this._config) moreInfo(this, this._config.entity);
  }

  private _renderTimeline(): TemplateResult {
    const runs = this._cur?.runs ?? [];
    const fmt = new Intl.DateTimeFormat(this._locale(), { hour: 'numeric', minute: '2-digit' });
    const marks: SVGTemplateResult[] = runs
      .filter((run) => run.w > 0)
      .map((run) => {
        const title = `${fmt.format(new Date(run.t0 * 1000))} – ${fmt.format(
          new Date(run.t1 * 1000)
        )}  ·  ${formatDuration((run.t1 - run.t0) / 60)}`;
        return svg`<rect
          class="run"
          x="${run.x}%"
          y="0"
          width="${Math.max(run.w, MIN_RUN_PCT)}%"
          height=${BAR_HEIGHT}
        ><title>${title}</title></rect>`;
      });
    return html`
      <div class="bar">
        <svg class="timeline" height=${BAR_HEIGHT}>
          ${marks.length ? svg`<g class="runs">${marks}</g>` : nothing}
        </svg>
      </div>
    `;
  }

  private _renderReadouts(): TemplateResult {
    if (this._error) return html`<div class="sub note">History unavailable</div>`;
    const cur = this._cur;
    if (!cur) return html`<div class="sub">&nbsp;</div>`;
    const minutes = cur.activeSec / 60;
    const avg = cur.cycles > 0 ? minutes / cur.cycles : 0;
    return html`
      <div class="sub">
        <span class="num">${formatDuration(minutes)}</span> ${this._spanLabel()}
        <span class="sep">·</span>
        <span class="num">${cur.cycles}</span> ${cur.cycles === 1 ? 'cycle' : 'cycles'}
        <span class="sep">·</span>
        avg <span class="num">${cur.cycles > 0 ? formatDuration(avg) : '—'}</span>
      </div>
    `;
  }

  private _renderDelta(): TemplateResult | typeof nothing {
    if (!this._config?.compare_yesterday || !this._cur || !this._prev) return nothing;
    const deltaMin = (this._cur.activeSec - this._prev.activeSec) / 60;
    const rounded = Math.round(deltaMin);
    const dir = rounded > 0 ? 'up' : rounded < 0 ? 'down' : 'flat';
    const sign = rounded > 0 ? '+' : rounded < 0 ? '−' : '±';
    const label = `${sign}${formatDuration(Math.abs(rounded))}`;
    return html`
      <span
        class="delta ${dir}"
        title=${`Previous period: ${formatDuration(this._prev.activeSec / 60)}`}
      >
        ${label}
      </span>
    `;
  }

  protected render(): TemplateResult | typeof nothing {
    const config = this._config;
    if (!config) return nothing;
    const hass = this.hass;
    const stateObj = hass?.states[config.entity];
    if (hass && !stateObj) {
      return html`<ha-card><div class="warning">Entity not found: ${config.entity}</div></ha-card>`;
    }

    const unavailable = isUnavailable(stateObj);
    const running = !unavailable && isActive(stateObj);
    const accent = accentFor(stateObj, config.color);
    const name = config.name ?? stateObj?.attributes.friendly_name ?? config.entity;
    const since = running && stateObj ? shortSince(stateObj.last_changed) : '';

    return html`
      <ha-card
        class="control ${unavailable ? 'unavailable' : ''}"
        style="--silk-accent:${accent}"
        @click=${this._onCardClick}
      >
        <div class="top">
          <div class="icon ${running ? 'on' : ''}">
            ${config.icon
              ? html`<ha-icon .icon=${config.icon}></ha-icon>`
              : html`<ha-state-icon .hass=${hass} .stateObj=${stateObj}></ha-state-icon>`}
          </div>
          <div class="info">
            <div class="name" title=${name}>${name}</div>
            <div class="state">
              ${stateObj ? stateText(hass, stateObj) : '—'}${running && since
                ? html`<span class="sep">·</span>running ${since}`
                : nothing}
            </div>
          </div>
          <div class="trailing">${this._renderDelta()}</div>
        </div>
        ${this._renderTimeline()} ${this._renderReadouts()}
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
        gap: 8px;
      }
      .top {
        flex: none;
        display: flex;
        align-items: center;
        gap: 12px;
        min-width: 0;
      }
      /* Accounting card: the icon presses with the card, it is not a control. */
      .icon {
        cursor: pointer;
      }
      .icon:active {
        transform: none;
      }
      .delta {
        flex: none;
        font-size: 11px;
        font-weight: 600;
        line-height: 1;
        padding: 5px 9px;
        border-radius: 999px;
        white-space: nowrap;
        color: var(--secondary-text-color);
        background: rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.06);
        font-variant-numeric: tabular-nums;
      }
      /* More runtime than last period isn't good or bad — it's just more, so
         the chip leans on the card accent, never on status colors. */
      .delta.up {
        color: var(--silk-accent);
        background: color-mix(in srgb, var(--silk-accent) 14%, transparent);
      }
      .bar {
        flex: none;
        min-width: 0;
      }
      .timeline {
        display: block;
        width: 100%;
        height: ${BAR_HEIGHT}px;
        border-radius: ${BAR_RADIUS}px;
        background: rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.06);
      }
      .runs {
        animation: silk-runtime-in 250ms var(--silk-ease-out);
      }
      .timeline rect.run {
        fill: var(--silk-accent);
        transition: fill 200ms ease;
      }
      .sub {
        flex: none;
        font-size: 12.5px;
        line-height: 1.3;
        color: var(--secondary-text-color);
        font-variant-numeric: tabular-nums;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .sub .num {
        font-weight: 600;
        color: var(--primary-text-color);
      }
      .sub .sep {
        opacity: 0.5;
        margin: 0 4px;
      }
      .sub.note {
        font-style: normal;
        opacity: 0.8;
      }
      .unavailable .bar,
      .unavailable .sub {
        opacity: 0.45;
      }
      @keyframes silk-runtime-in {
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
    'silk-runtime-card': SilkRuntimeCard;
  }
}
