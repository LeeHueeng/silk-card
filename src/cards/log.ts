import { LitElement, html, css, nothing, PropertyValues, TemplateResult } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { HomeAssistant, HassEntity, LovelaceCardConfig } from '../types';
import { silkControlStyles } from '../shared/base';
import { isActive, isUnavailable, moreInfo, stateText } from '../shared/service';
import { accentFor } from '../shared/color';
import { registerEditor } from '../shared/editor';

export const META = {
  type: 'silk-log-card',
  name: 'Silk Log',
  description: "An entity's recent life, in plain rows.",
};

export interface SilkLogCardConfig extends LovelaceCardConfig {
  entity: string;
  name?: string;
  icon?: string;
  color?: string;
  hours_to_show?: number;
  limit?: number;
}

/**
 * hass.callApi exists on the real frontend hass object but is not part of
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

const DEFAULT_HOURS = 24;
const DEFAULT_LIMIT = 6;
const REFRESH_INTERVAL_MS = 300_000;
const REFRESH_THROTTLE_MS = 30_000;
/** Re-render cadence so the relative times never go stale between fetches. */
const CLOCK_TICK_MS = 30_000;

const EDITOR_TAG = 'silk-log-card-editor';

registerEditor(
  EDITOR_TAG,
  [
    { name: 'entity', required: true, selector: { entity: {} } },
    { name: 'name', selector: { text: {} } },
    {
      name: '',
      type: 'grid',
      schema: [
        {
          name: 'hours_to_show',
          selector: { number: { min: 1, max: 168, step: 1, mode: 'box' } },
        },
        { name: 'limit', selector: { number: { min: 1, max: 20, step: 1, mode: 'box' } } },
        { name: 'icon', selector: { icon: {} } },
        { name: 'color', selector: { ui_color: {} } },
      ],
    },
  ],
  {
    entity: '엔티티',
    name: '이름',
    hours_to_show: '표시 시간',
    limit: '표시 개수',
    icon: '아이콘',
    color: '강조 색상',
  },
  { hours_to_show: DEFAULT_HOURS, limit: DEFAULT_LIMIT }
);

/** Logbook `when` → epoch ms. REST sends ISO strings; be lenient about numbers. */
function whenToMs(when: string | number): number {
  if (typeof when === 'number') return when > 1e12 ? when : when * 1000;
  return Date.parse(when);
}

/** <60s → 'just now', <1h → 'Nm ago', <24h → 'Hh ago', else 'Dd ago'. */
function relativeTime(ms: number): string {
  const sec = Math.max(0, (Date.now() - ms) / 1000);
  if (sec < 60) return 'just now';
  if (sec < 3600) return `${Math.floor(sec / 60)}m ago`;
  if (sec < 86400) return `${Math.floor(sec / 3600)}h ago`;
  return `${Math.floor(sec / 86400)}d ago`;
}

/**
 * A logbook feed for one entity: header with a count chip, then the newest
 * events as plain rows — state dot, what happened, how long ago.
 */
@customElement('silk-log-card')
export class SilkLogCard extends LitElement {
  @property({ attribute: false }) public hass?: HomeAssistant;

  @state() private _config?: SilkLogCardConfig;
  /** Newest first; null until the first fetch resolves. */
  @state() private _entries: LogbookEntry[] | null = null;

  private _fetchStarted = false;
  private _fetchSeq = 0;
  private _lastFetch = 0;
  private _lastUpdated?: string;
  private _refreshTimer?: number;
  private _intervalTimer?: number;
  private _clockTimer?: number;

  public static getStubConfig(hass: HomeAssistant): Partial<SilkLogCardConfig> {
    const ids = Object.keys(hass.states);
    const entity =
      ids.find((id) => id.startsWith('binary_sensor.')) ??
      ids.find((id) => id.startsWith('light.')) ??
      ids.find((id) => id.startsWith('switch.')) ??
      ids[0];
    return { type: 'custom:silk-log-card', entity };
  }

  public static async getConfigElement(): Promise<HTMLElement> {
    return document.createElement(EDITOR_TAG);
  }

  public setConfig(config: SilkLogCardConfig): void {
    if (!config.entity) {
      throw new Error('silk-log-card: `entity` is required');
    }
    if (config.hours_to_show !== undefined && !(Number(config.hours_to_show) > 0)) {
      throw new Error('silk-log-card: `hours_to_show` must be a positive number');
    }
    if (config.limit !== undefined && !(Number(config.limit) > 0)) {
      throw new Error('silk-log-card: `limit` must be a positive number');
    }
    this._config = config;
    this._fetchStarted = false;
    this._entries = null;
    this._lastUpdated = undefined;
  }

  public getCardSize(): number {
    return 3;
  }

  public getGridOptions(): Record<string, number> {
    return { columns: 6, rows: 3, min_columns: 3, min_rows: 2 };
  }

  public connectedCallback(): void {
    super.connectedCallback();
    this._intervalTimer = window.setInterval(() => this._refresh(), REFRESH_INTERVAL_MS);
    this._clockTimer = window.setInterval(() => this.requestUpdate(), CLOCK_TICK_MS);
  }

  public disconnectedCallback(): void {
    super.disconnectedCallback();
    window.clearInterval(this._intervalTimer);
    window.clearInterval(this._clockTimer);
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

  /** Refetch when the entity actually records a new state, throttled to 30s. */
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
    const entityId = this._config.entity;
    const hours = this._config.hours_to_show ?? DEFAULT_HOURS;
    const seq = ++this._fetchSeq;
    const end = new Date();
    const start = new Date(end.getTime() - hours * 3_600_000);
    let rows: LogbookEntry[];
    try {
      rows = await (this.hass as HassWithApi).callApi<LogbookEntry[]>(
        'GET',
        'logbook/' +
          start.toISOString() +
          '?entity=' +
          entityId +
          '&end_time=' +
          encodeURIComponent(end.toISOString())
      );
    } catch (err) {
      console.warn('silk-log-card: logbook fetch failed', err);
      return;
    }
    if (seq !== this._fetchSeq) return; // a newer fetch superseded this one
    this._lastFetch = Date.now();
    this._entries = (Array.isArray(rows) ? rows : [])
      .filter((row) => Number.isFinite(whenToMs(row.when)))
      .sort((a, b) => whenToMs(b.when) - whenToMs(a.when));
  }

  /** Accent dot when that state reads as active — mirrors silk-status-card. */
  private _dotActive(entry: LogbookEntry): boolean {
    if (!entry.state) return false;
    // isActive() only reads entity_id + state, so a synthetic snapshot suffices.
    const snapshot: HassEntity = {
      entity_id: this._config!.entity,
      state: entry.state,
      attributes: {},
      last_changed: '',
      last_updated: '',
    };
    return isActive(snapshot);
  }

  /** Localized state text when possible, else the raw message, capitalized. */
  private _rowText(entry: LogbookEntry, stateObj?: HassEntity): string {
    let text: string;
    if (entry.state) {
      text = stateObj
        ? stateText(this.hass, { ...stateObj, state: entry.state })
        : entry.state.replace(/_/g, ' ');
    } else {
      text = entry.message ?? '';
    }
    return text ? text.charAt(0).toUpperCase() + text.slice(1) : '—';
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
    const limit = config.limit ?? DEFAULT_LIMIT;
    const shown = this._entries?.slice(0, limit) ?? [];

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
          </div>
          <div class="trailing">
            ${this._entries !== null
              ? html`<span class="count">${this._entries.length}</span>`
              : nothing}
          </div>
        </div>
        <div class="rows">
          ${this._entries !== null && shown.length === 0
            ? html`<div class="empty">No recent activity</div>`
            : shown.map(
                (entry) => html`
                  <div class="row">
                    <span class="dot ${this._dotActive(entry) ? 'on' : ''}"></span>
                    <span class="what">${this._rowText(entry, stateObj)}</span>
                    <span class="when">${relativeTime(whenToMs(entry.when))}</span>
                  </div>
                `
              )}
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
        gap: 10px;
      }
      .top {
        flex: none;
        display: flex;
        align-items: center;
        gap: 12px;
        min-width: 0;
      }
      /* The log card has no control action: the icon presses with the card. */
      .icon {
        cursor: pointer;
      }
      .icon:active {
        transform: none;
      }
      .count {
        font-size: 11px;
        font-weight: 600;
        letter-spacing: 0.02em;
        padding: 4px 9px;
        border-radius: 999px;
        color: var(--secondary-text-color);
        background: rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.06);
        font-variant-numeric: tabular-nums;
        white-space: nowrap;
      }
      .rows {
        flex: 1;
        min-height: 0;
        display: flex;
        flex-direction: column;
        justify-content: flex-start;
        gap: 7px;
        overflow: hidden;
      }
      .row {
        flex: none;
        display: flex;
        align-items: center;
        gap: 8px;
        min-width: 0;
        animation: silk-log-in 250ms var(--silk-ease-out);
      }
      .dot {
        flex: none;
        width: 6px;
        height: 6px;
        border-radius: 50%;
        background: rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.2);
        transition: background 200ms ease;
      }
      .dot.on {
        background: var(--silk-accent);
      }
      .what {
        flex: 1;
        min-width: 0;
        font-size: 12.5px;
        line-height: 1.3;
        color: var(--primary-text-color);
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
      .empty {
        font-size: 12.5px;
        color: var(--secondary-text-color);
      }
      .unavailable .rows {
        opacity: 0.45;
      }
      @keyframes silk-log-in {
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
    'silk-log-card': SilkLogCard;
  }
}
