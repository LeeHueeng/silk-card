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
import { isActive, isUnavailable, moreInfo, haptic } from '../shared/service';
import { accentFor } from '../shared/color';
import { registerEditor } from '../shared/editor';

export const META = {
  type: 'silk-wan-card',
  name: 'Silk WAN',
  description: 'Is the internet up, and for how long.',
};

export interface SilkWanCardConfig extends LovelaceCardConfig {
  /** Connectivity entity — a binary_sensor whose active state means online. */
  entity: string;
  /** Entity holding the public IP; its chip copies on tap. */
  ip?: string;
  /** Entity holding the ISP / connection name. */
  isp?: string;
  name?: string;
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

type SegmentKind = 'up' | 'down' | 'none';

/** A strip segment in percent units (x/w of the bar) plus its real span. */
interface Segment {
  x: number;
  w: number;
  kind: SegmentKind;
  /** Epoch seconds, for the hover title. */
  t0: number;
  t1: number;
}

/** The strip always covers a day — that is the question this card answers. */
const HOURS = 24;
const BAR_HEIGHT = 12;
const BAR_RADIUS = 6;
const REFRESH_INTERVAL_MS = 300_000;
const REFRESH_THROTTLE_MS = 60_000;
/** Re-render cadence so the uptime line never goes stale between events. */
const CLOCK_TICK_MS = 30_000;
/** How long the IP chip reads "Copied" before falling back to the address. */
const COPIED_MS = 1200;

const NONE_STATES = new Set(['unavailable', 'unknown', 'none', '']);

const EDITOR_TAG = 'silk-wan-card-editor';

registerEditor(
  EDITOR_TAG,
  [
    {
      name: 'entity',
      required: true,
      selector: { entity: { domain: ['binary_sensor', 'switch', 'sensor'] } },
    },
    { name: 'name', selector: { text: {} } },
    { name: 'ip', selector: { entity: { domain: ['sensor', 'input_text'] } } },
    { name: 'isp', selector: { entity: { domain: ['sensor', 'input_text'] } } },
  ],
  {
    entity: 'Connectivity entity',
    name: 'Name',
    ip: 'Public IP entity',
    isp: 'ISP entity',
  }
);

/** '15d 4h' / '4h 12m' / '9m' / '42s' — two units always read a link honestly. */
function durationLabel(ms: number): string {
  const sec = Math.max(0, Math.floor(ms / 1000));
  if (sec < 60) return `${sec}s`;
  const days = Math.floor(sec / 86400);
  const hours = Math.floor((sec % 86400) / 3600);
  const minutes = Math.floor((sec % 3600) / 60);
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

/** The plain text of an entity's state, or null when it has nothing to say. */
function textState(stateObj?: HassEntity): string | null {
  if (!stateObj || isUnavailable(stateObj)) return null;
  const value = stateObj.state.trim();
  return value === '' ? null : value;
}

/**
 * The one question a router card should answer: is the line up, and since
 * when. The word carries the answer, the strip carries the last day of it.
 */
@customElement('silk-wan-card')
export class SilkWanCard extends LitElement {
  @property({ attribute: false }) public hass?: HomeAssistant;

  @state() private _config?: SilkWanCardConfig;
  @state() private _segments: Segment[] | null = null;
  /** Set when the recorder could not answer — the strip says so inline. */
  @state() private _histError = false;
  /** Transient IP-chip feedback. */
  @state() private _copied: 'ok' | 'fail' | null = null;
  /** Ticking clock the uptime label is resolved against. */
  @state() private _now = Date.now();

  private _fetchStarted = false;
  private _fetchSeq = 0;
  private _lastFetch = 0;
  private _lastUpdated?: string;
  private _refreshTimer?: number;
  private _intervalTimer?: number;
  private _clockTimer?: number;
  private _copiedTimer?: number;

  public static getStubConfig(hass: HomeAssistant): Partial<SilkWanCardConfig> {
    const ids = Object.keys(hass.states);
    const entity =
      ids.find(
        (id) =>
          id.startsWith('binary_sensor.') &&
          hass.states[id].attributes.device_class === 'connectivity'
      ) ?? ids.find((id) => id.startsWith('binary_sensor.'));
    const ip = ids.find(
      (id) => id.startsWith('sensor.') && /(^|_)(external_|public_|wan_)?ip(_address)?$/.test(id)
    );
    return { type: 'custom:silk-wan-card', entity, ip };
  }

  public static async getConfigElement(): Promise<HTMLElement> {
    return document.createElement(EDITOR_TAG);
  }

  public setConfig(config: SilkWanCardConfig): void {
    if (!config.entity) {
      throw new Error('silk-wan-card: `entity` is required — the connectivity binary_sensor');
    }
    if (config.ip !== undefined && typeof config.ip !== 'string') {
      throw new Error('silk-wan-card: `ip` must be an entity id');
    }
    if (config.isp !== undefined && typeof config.isp !== 'string') {
      throw new Error('silk-wan-card: `isp` must be an entity id');
    }
    this._config = config;
    this._fetchStarted = false;
    this._segments = null;
    this._histError = false;
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
    this._now = Date.now();
    this._intervalTimer = window.setInterval(() => this._refresh(), REFRESH_INTERVAL_MS);
    this._clockTimer = window.setInterval(() => {
      this._now = Date.now();
    }, CLOCK_TICK_MS);
  }

  public disconnectedCallback(): void {
    super.disconnectedCallback();
    window.clearInterval(this._intervalTimer);
    window.clearInterval(this._clockTimer);
    window.clearTimeout(this._refreshTimer);
    window.clearTimeout(this._copiedTimer);
    this._refreshTimer = undefined;
    this._copiedTimer = undefined;
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

  /** Refetch when the link actually records a new state, throttled to 60s. */
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
    const seq = ++this._fetchSeq;
    const end = Date.now() / 1000;
    const start = end - HOURS * 3600;
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
      console.warn('silk-wan-card: history fetch failed', err);
      if (seq === this._fetchSeq) this._histError = true;
      return;
    }
    if (seq !== this._fetchSeq) return; // a newer fetch superseded this one
    this._lastFetch = Date.now();
    this._histError = false;
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

  /** Up/down classification of a raw history state string. */
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
    return isActive(snapshot) ? 'up' : 'down';
  }

  private _buildSegments(samples: [number, string][], start: number, end: number): void {
    const total = end - start;
    const segments: Segment[] = [];
    for (let i = 0; i < samples.length; i++) {
      const t0 = Math.max(samples[i][0], start);
      const t1 = i + 1 < samples.length ? Math.min(Math.max(samples[i + 1][0], start), end) : end;
      if (t1 <= t0) continue;
      const kind = this._classify(samples[i][1]);
      const prev = segments[segments.length - 1];
      if (prev && prev.kind === kind) {
        prev.w += ((t1 - t0) / total) * 100;
        prev.t1 = t1;
      } else {
        segments.push({
          x: ((t0 - start) / total) * 100,
          w: ((t1 - t0) / total) * 100,
          kind,
          t0,
          t1,
        });
      }
    }
    this._segments = segments;
  }

  private _locale(): string {
    return this.hass?.locale?.language ?? this.hass?.language ?? 'en';
  }

  private _onCardClick(): void {
    if (this._config) moreInfo(this, this._config.entity);
  }

  private _onIspClick(ev: Event): void {
    ev.stopPropagation();
    if (this._config?.isp) moreInfo(this, this._config.isp);
  }

  /** Tap the address, get it on the clipboard — the chip says so for 1.2s. */
  private async _onIpClick(ev: Event, ip: string): Promise<void> {
    ev.stopPropagation();
    let ok = false;
    try {
      await navigator.clipboard.writeText(ip);
      ok = true;
    } catch (err) {
      // Insecure contexts and locked-down webviews deny the clipboard.
      console.warn('silk-wan-card: clipboard write failed', err);
    }
    if (ok) haptic(this, 'success');
    this._copied = ok ? 'ok' : 'fail';
    window.clearTimeout(this._copiedTimer);
    this._copiedTimer = window.setTimeout(() => {
      this._copiedTimer = undefined;
      this._copied = null;
    }, COPIED_MS);
  }

  private _renderStrip(): SVGTemplateResult | typeof nothing {
    const segments = this._segments;
    if (!segments || this._histError) return nothing;
    const timeFmt = new Intl.DateTimeFormat(this._locale(), {
      hour: 'numeric',
      minute: '2-digit',
    });
    // Every mark carries its own hover title: which state, when, how long.
    const marks = segments
      .filter((s) => s.kind !== 'none' && s.w > 0)
      .map(
        (s) => svg`<rect class=${s.kind} x="${s.x}%" y="0" width="${s.w}%" height=${BAR_HEIGHT}>
          <title>${s.kind === 'up' ? 'Online' : 'Offline'} · ${timeFmt.format(new Date(s.t0 * 1000))}–${timeFmt.format(new Date(s.t1 * 1000))} · ${durationLabel((s.t1 - s.t0) * 1000)}</title>
        </rect>`
      );
    return svg`<g class="segs">${marks}</g>`;
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
    const online = !unavailable && isActive(stateObj);
    const accent = accentFor(stateObj, config.color);
    const name = config.name ?? stateObj?.attributes.friendly_name ?? config.entity;
    const word = unavailable ? '—' : online ? 'Online' : 'Offline';

    const changedMs = stateObj ? Date.parse(stateObj.last_changed) : NaN;
    const since = unavailable
      ? 'no data'
      : Number.isFinite(changedMs)
        ? `${online ? 'up' : 'down'} ${durationLabel(this._now - changedMs)}`
        : online
          ? 'up'
          : 'down';

    const ipObj = config.ip ? hass?.states[config.ip] : undefined;
    const ip = textState(ipObj);
    const ispObj = config.isp ? hass?.states[config.isp] : undefined;
    const isp = textState(ispObj);
    const ipLabel = this._copied === 'ok' ? 'Copied' : this._copied === 'fail' ? 'Copy failed' : ip;

    return html`
      <ha-card
        class="control ${unavailable ? 'unavailable' : ''}"
        style="--silk-accent:${accent}"
        @click=${this._onCardClick}
      >
        <div class="top">
          <div class="head">
            <div class="word ${unavailable ? 'idle' : online ? 'up' : 'down'}">${word}</div>
            <!-- Uptime leads: it is the fact that survives a narrow card. -->
            <div class="since" title=${`${name} · ${since}`}>
              ${since}<span class="sep">·</span>${name}
            </div>
          </div>
          <div class="chips">
            ${ip
              ? html`<button
                  class="chip ip ${this._copied === 'ok' ? 'flash' : ''} ${this._copied === 'fail'
                    ? 'said'
                    : ''}"
                  title=${`Copy ${ip}`}
                  aria-label=${`Copy public IP ${ip}`}
                  @click=${(ev: Event) => this._onIpClick(ev, ip)}
                >
                  ${ipLabel}
                </button>`
              : nothing}
            ${isp
              ? html`<button
                  class="chip isp"
                  title=${isp}
                  aria-label=${`ISP ${isp}`}
                  @click=${this._onIspClick}
                >
                  ${isp}
                </button>`
              : nothing}
          </div>
        </div>
        <div class="bar">
          <svg class="timeline" height=${BAR_HEIGHT} aria-hidden="true">${this._renderStrip()}</svg>
          ${this._histError
            ? html`<div class="note">Last 24h unavailable</div>`
            : html`<div class="ends">
                <span>24h ago</span>
                <span>now</span>
              </div>`}
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
        justify-content: center;
        gap: 10px;
      }
      .top {
        flex: none;
        display: flex;
        align-items: flex-start;
        gap: 10px;
        min-width: 0;
      }
      .head {
        flex: 1;
        min-width: 0;
      }
      /* The answer, in one word. Status colors here are literally the status. */
      .word {
        font-size: 26px;
        font-weight: 600;
        letter-spacing: -0.02em;
        line-height: 1.1;
        color: var(--secondary-text-color);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        transition: color 200ms ease;
      }
      .word.up {
        color: var(--success-color, #43a047);
      }
      .word.down {
        color: var(--error-color, #db4437);
      }
      .since {
        margin-top: 2px;
        font-size: 12.5px;
        line-height: 1.3;
        color: var(--secondary-text-color);
        font-variant-numeric: tabular-nums;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .since .sep {
        opacity: 0.5;
        margin: 0 3px;
      }
      .chips {
        flex: none;
        max-width: 52%;
        display: flex;
        flex-direction: column;
        align-items: flex-end;
        gap: 4px;
      }
      .chip {
        max-width: 100%;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .chip.ip {
        font-variant-numeric: tabular-nums;
      }
      /* The copy confirmation swaps in rather than blinking in place. */
      .chip.flash {
        color: var(--silk-accent);
        background: color-mix(in srgb, var(--silk-accent) 16%, transparent);
        animation: silk-wan-swap 200ms var(--silk-ease-out);
      }
      /* A refused clipboard says so plainly — it is not an accent moment. */
      .chip.said {
        animation: silk-wan-swap 200ms var(--silk-ease-out);
      }
      .bar {
        flex: none;
        position: relative;
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
        animation: silk-wan-in 250ms var(--silk-ease-out);
      }
      .timeline rect {
        transition: fill 200ms ease;
      }
      .timeline rect.up {
        fill: var(--silk-accent);
      }
      .timeline rect.down {
        fill: rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.14);
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
      /* Degrade in place: the track stays, the label says why it is empty. */
      .note {
        margin-top: 3px;
        font-size: 10px;
        line-height: 1;
        color: var(--secondary-text-color);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .unavailable .bar {
        opacity: 0.45;
      }
      @keyframes silk-wan-in {
        from {
          opacity: 0;
        }
        to {
          opacity: 1;
        }
      }
      @keyframes silk-wan-swap {
        from {
          opacity: 0;
          transform: translateY(-2px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    'silk-wan-card': SilkWanCard;
  }
}
