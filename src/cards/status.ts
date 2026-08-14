import { LitElement, html, svg, css, nothing, PropertyValues, TemplateResult } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { HomeAssistant, HassEntity, LovelaceCardConfig } from '../types';
import { silkControlStyles } from '../shared/base';
import { isActive, isUnavailable, moreInfo, stateText } from '../shared/service';
import { accentFor } from '../shared/color';
import { registerEditor } from '../shared/editor';

export const META = {
  type: 'silk-status-card',
  name: 'Silk Status',
  description: 'A status-page timeline for any entity.',
};

export interface SilkStatusCardConfig extends LovelaceCardConfig {
  entity: string;
  name?: string;
  icon?: string;
  color?: string;
  hours_to_show?: number;
  /** When true, the *inactive* state counts as good (problem/door sensors). */
  invert?: boolean;
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

type SegmentKind = 'good' | 'bad' | 'none';

/** A timeline segment in percent units (x/w of the full bar width). */
interface Segment {
  x: number;
  w: number;
  kind: SegmentKind;
}

const BAR_HEIGHT = 16;
const BAR_RADIUS = 6;
const DEFAULT_HOURS = 24;
const REFRESH_INTERVAL_MS = 300_000;
const REFRESH_THROTTLE_MS = 60_000;

const NONE_STATES = new Set(['unavailable', 'unknown', 'none', '']);

const EDITOR_TAG = 'silk-status-card-editor';

registerEditor(
  EDITOR_TAG,
  [
    { name: 'entity', required: true, selector: { entity: {} } },
    { name: 'name', selector: { text: {} } },
    {
      name: '',
      type: 'grid',
      schema: [
        { name: 'icon', selector: { icon: {} } },
        { name: 'color', selector: { text: {} } },
      ],
    },
    { name: 'hours_to_show', selector: { number: { min: 1, mode: 'box' } } },
    { name: 'invert', selector: { boolean: {} } },
  ],
  {
    entity: '엔티티',
    name: '이름',
    icon: '아이콘',
    color: '강조 색상',
    hours_to_show: '표시 시간',
    invert: '반대로 보기(꺼짐=정상)',
  },
  { hours_to_show: DEFAULT_HOURS }
);

@customElement('silk-status-card')
export class SilkStatusCard extends LitElement {
  @property({ attribute: false }) public hass?: HomeAssistant;

  @state() private _config?: SilkStatusCardConfig;
  @state() private _segments: Segment[] | null = null;
  /** Time-weighted good %, over the span where the state was known. */
  @state() private _uptime: number | null = null;

  private _fetchStarted = false;
  private _fetchSeq = 0;
  private _lastFetch = 0;
  private _lastUpdated?: string;
  private _refreshTimer?: number;
  private _intervalTimer?: number;

  public static getStubConfig(hass: HomeAssistant): Partial<SilkStatusCardConfig> {
    const entity = Object.keys(hass.states).find((id) => id.startsWith('binary_sensor.'));
    return { type: 'custom:silk-status-card', entity };
  }

  public static async getConfigElement(): Promise<HTMLElement> {
    return document.createElement(EDITOR_TAG);
  }

  public setConfig(config: SilkStatusCardConfig): void {
    if (!config.entity) {
      throw new Error('silk-status-card: `entity` is required');
    }
    if (config.hours_to_show !== undefined && !(Number(config.hours_to_show) > 0)) {
      throw new Error('silk-status-card: `hours_to_show` must be a positive number');
    }
    this._config = config;
    this._fetchStarted = false;
    this._segments = null;
    this._uptime = null;
    this._lastUpdated = undefined;
  }

  public getCardSize(): number {
    return 2;
  }

  public getGridOptions(): Record<string, number> {
    return { columns: 6, rows: 2, min_columns: 4, min_rows: 1 };
  }

  public connectedCallback(): void {
    super.connectedCallback();
    this._intervalTimer = window.setInterval(() => this._refresh(), REFRESH_INTERVAL_MS);
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

  private async _refresh(): Promise<void> {
    if (!this.hass || !this._config) return;
    const entity = this._config.entity;
    const hours = this._config.hours_to_show ?? DEFAULT_HOURS;
    const seq = ++this._fetchSeq;
    const end = Date.now() / 1000;
    const start = end - hours * 3600;
    let resp: Record<string, HistoryRow[]>;
    try {
      resp = await this.hass.callWS<Record<string, HistoryRow[]>>({
        type: 'history/history_during_period',
        start_time: new Date(start * 1000).toISOString(),
        end_time: new Date(end * 1000).toISOString(),
        entity_ids: [entity],
        minimal_response: true,
        no_attributes: true,
        significant_changes_only: false,
      });
    } catch (err) {
      console.warn('silk-status-card: history fetch failed', err);
      return;
    }
    if (seq !== this._fetchSeq) return; // a newer fetch superseded this one
    this._lastFetch = Date.now();
    const samples: [number, string][] = (resp?.[entity] ?? [])
      .map((row): [number, string] => {
        const raw = row.lu ?? row.last_updated ?? row.lc ?? row.last_changed ?? NaN;
        const t = typeof raw === 'number' ? raw : Date.parse(raw) / 1000;
        return [t, String(row.s ?? row.state ?? '')];
      })
      .filter((p) => Number.isFinite(p[0]) && p[0] <= end)
      .sort((a, b) => a[0] - b[0]);
    this._buildSegments(samples, start, end);
  }

  /** Good/bad classification of a raw history state string. */
  private _classify(stateStr: string): SegmentKind {
    if (NONE_STATES.has(stateStr.toLowerCase())) return 'none';
    // isActive() only reads entity_id + state, so a synthetic snapshot suffices.
    const snapshot: HassEntity = {
      entity_id: this._config!.entity,
      state: stateStr,
      attributes: {},
      last_changed: '',
      last_updated: '',
    };
    const active = isActive(snapshot);
    const good = this._config?.invert ? !active : active;
    return good ? 'good' : 'bad';
  }

  private _buildSegments(samples: [number, string][], start: number, end: number): void {
    const total = end - start;
    const segments: Segment[] = [];
    let goodSec = 0;
    let badSec = 0;
    for (let i = 0; i < samples.length; i++) {
      const t0 = Math.max(samples[i][0], start);
      const t1 = i + 1 < samples.length ? Math.min(Math.max(samples[i + 1][0], start), end) : end;
      if (t1 <= t0) continue;
      const kind = this._classify(samples[i][1]);
      const duration = t1 - t0;
      if (kind === 'good') goodSec += duration;
      else if (kind === 'bad') badSec += duration;
      const prev = segments[segments.length - 1];
      if (prev && prev.kind === kind) {
        prev.w += (duration / total) * 100;
      } else {
        segments.push({ x: ((t0 - start) / total) * 100, w: (duration / total) * 100, kind });
      }
    }
    this._segments = segments;
    const known = goodSec + badSec;
    this._uptime = known > 0 ? (goodSec / known) * 100 : null;
  }

  private _locale(): string {
    return this.hass?.locale?.language ?? this.hass?.language ?? 'en';
  }

  private _agoLabel(): string {
    const hours = this._config?.hours_to_show ?? DEFAULT_HOURS;
    if (hours >= 48 && hours % 24 === 0) return `${hours / 24}d ago`;
    return `${hours}h ago`;
  }

  private _onCardClick(): void {
    if (this._config) moreInfo(this, this._config.entity);
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
    const accent = accentFor(stateObj, config.color);
    const name = config.name ?? stateObj?.attributes.friendly_name ?? config.entity;
    const uptime =
      this._uptime === null
        ? '—'
        : `${new Intl.NumberFormat(this._locale(), { maximumFractionDigits: 1 }).format(this._uptime)}%`;

    return html`
      <ha-card
        class="control ${unavailable ? 'unavailable' : ''}"
        style="--silk-accent:${accent}"
        @click=${this._onCardClick}
      >
        <div class="top">
          <div class="icon ${!unavailable && isActive(stateObj) ? 'on' : ''}">
            ${config.icon
              ? html`<ha-icon .icon=${config.icon}></ha-icon>`
              : html`<ha-state-icon .hass=${hass} .stateObj=${stateObj}></ha-state-icon>`}
          </div>
          <div class="info">
            <div class="name">${name}</div>
            <div class="state">${stateObj ? stateText(hass, stateObj) : ''}</div>
          </div>
          <div class="trailing">
            <span class="pct">${uptime}</span>
          </div>
        </div>
        <div class="bar">
          <svg class="timeline" height=${BAR_HEIGHT} aria-hidden="true">
            ${this._segments
              ? svg`<g class="segs">
                  ${this._segments
                    .filter((s) => s.kind !== 'none' && s.w > 0)
                    .map(
                      (s) =>
                        svg`<rect class=${s.kind} x="${s.x}%" y="0" width="${s.w}%" height=${BAR_HEIGHT}></rect>`
                    )}
                </g>`
              : nothing}
          </svg>
          <div class="ends">
            <span>${this._agoLabel()}</span>
            <span>now</span>
          </div>
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
        gap: 8px;
        justify-content: center;
      }
      .top {
        flex: none;
        display: flex;
        align-items: center;
        gap: 12px;
        min-width: 0;
      }
      /* The status card has no control action: the icon presses with the card. */
      .icon {
        cursor: pointer;
      }
      .icon:active {
        transform: none;
      }
      .pct {
        font-size: 13px;
        font-weight: 600;
        letter-spacing: -0.01em;
        color: var(--primary-text-color);
        font-variant-numeric: tabular-nums;
        white-space: nowrap;
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
        background: rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.05);
      }
      .segs {
        animation: silk-status-in 250ms var(--silk-ease-out);
      }
      .timeline rect {
        transition: fill 200ms ease;
      }
      .timeline rect.good {
        fill: var(--silk-accent);
      }
      .timeline rect.bad {
        fill: rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.12);
      }
      .ends {
        display: flex;
        justify-content: space-between;
        margin-top: 3px;
        font-size: 10px;
        line-height: 1;
        color: var(--primary-text-color);
        opacity: 0.4;
        font-variant-numeric: tabular-nums;
        pointer-events: none;
      }
      .unavailable .bar {
        opacity: 0.45;
      }
      @keyframes silk-status-in {
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
    'silk-status-card': SilkStatusCard;
  }
}
