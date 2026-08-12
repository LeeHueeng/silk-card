import { LitElement, html, css, nothing, PropertyValues, TemplateResult } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { HomeAssistant, LovelaceCardConfig } from '../types';
import { silkControlStyles } from '../shared/base';
import { haptic } from '../shared/service';
import { accentFor } from '../shared/color';
import { registerEditor } from '../shared/editor';

export const META = {
  type: 'silk-notify-card',
  name: 'Silk Inbox',
  description: 'Persistent notifications you can actually clear.',
};

export interface SilkNotifyCardConfig extends LovelaceCardConfig {
  name?: string;
  /** Maximum rows shown (the count chip still reports the full total). */
  limit?: number;
}

/** One persistent notification as delivered by the WS API. */
interface PersistentNotification {
  notification_id: string;
  title?: string;
  message: string;
  created_at: string;
}

/**
 * `persistent_notification/get` returns a list; the subscription's events carry
 * a dict keyed by notification_id. Both funnel through `normalizeList`.
 */
type RawNotifications =
  | PersistentNotification[]
  | Record<string, PersistentNotification>
  | null
  | undefined;

interface NotificationEvent {
  type?: 'added' | 'removed' | 'current' | 'updated' | string;
  notifications?: RawNotifications;
}

/**
 * Local extension of the shared HomeAssistant type: `subscribeMessage` lives on
 * the raw websocket connection, which `src/types.ts` doesn't expose.
 */
type UnsubscribeFunc = () => Promise<void>;
interface HassWithConnection extends HomeAssistant {
  connection?: {
    subscribeMessage<T>(
      callback: (message: T) => void,
      message: { type: string; [key: string]: unknown }
    ): Promise<UnsubscribeFunc>;
  };
}

const DEFAULT_LIMIT = 5;
const POLL_INTERVAL_MS = 30_000;
/** Minimum spacing between hass-change triggered refetches (fallback mode). */
const HASS_REFRESH_THROTTLE_MS = 10_000;
/** How long an optimistic dismissal keeps hiding a row the server still reports. */
const DISMISS_GRACE_MS = 10_000;

function normalizeList(raw: RawNotifications): PersistentNotification[] {
  if (!raw) return [];
  const entries: [string, PersistentNotification][] = Array.isArray(raw)
    ? raw.map((n): [string, PersistentNotification] => [n?.notification_id ?? '', n])
    : Object.entries(raw);
  return entries
    .filter(([key, n]) => Boolean(n) && Boolean(n.notification_id ?? key))
    .map(([key, n]) => ({ ...n, notification_id: n.notification_id ?? key }));
}

const TIME_UNITS: [number, number, Intl.RelativeTimeFormatUnit][] = [
  [60, 1, 'second'],
  [3600, 60, 'minute'],
  [86400, 3600, 'hour'],
  [Number.POSITIVE_INFINITY, 86400, 'day'],
];

let rtf: Intl.RelativeTimeFormat | undefined;
let rtfLocale = '';

/** "now", "5 min. ago", "2 hr. ago" — locale-aware and cached per locale. */
function relativeTime(iso: string, locale: string): string {
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return '';
  if (!rtf || rtfLocale !== locale) {
    try {
      rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto', style: 'narrow' });
    } catch {
      rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto', style: 'narrow' });
    }
    rtfLocale = locale;
  }
  const diff = (t - Date.now()) / 1000;
  const abs = Math.abs(diff);
  const match = TIME_UNITS.find(([limit]) => abs < limit) ?? TIME_UNITS[TIME_UNITS.length - 1];
  return rtf.format(Math.trunc(diff / match[1]), match[2]);
}

const EDITOR_TAG = 'silk-notify-card-editor';

registerEditor(
  EDITOR_TAG,
  [
    { name: 'name', selector: { text: {} } },
    { name: 'limit', selector: { number: { min: 1, max: 20, mode: 'box' } } },
  ],
  { name: 'Name', limit: 'Rows to show' },
  { limit: DEFAULT_LIMIT }
);

@customElement('silk-notify-card')
export class SilkNotifyCard extends LitElement {
  @property({ attribute: false }) public hass?: HomeAssistant;

  @state() private _config?: SilkNotifyCardConfig;
  /** Visible notifications, newest first. null = not loaded yet. */
  @state() private _rows: PersistentNotification[] | null = null;

  /** Source of truth between commits, keyed by notification_id. */
  private _byId = new Map<string, PersistentNotification>();
  /** Optimistically dismissed ids → dismissal timestamp (see DISMISS_GRACE_MS). */
  private _dismissed = new Map<string, number>();

  private _started = false;
  private _subscribed = false;
  /** True once the live subscription has delivered anything — polls stand down. */
  private _gotEvent = false;
  private _unsubPromise?: Promise<UnsubscribeFunc>;
  private _fetchSeq = 0;
  private _lastFetch = 0;
  private _intervalTimer?: number;

  public static getStubConfig(): Partial<SilkNotifyCardConfig> {
    return { type: 'custom:silk-notify-card' };
  }

  public static async getConfigElement(): Promise<HTMLElement> {
    return document.createElement(EDITOR_TAG);
  }

  public setConfig(config: SilkNotifyCardConfig): void {
    if (config.limit !== undefined && !(Number(config.limit) > 0)) {
      throw new Error('silk-notify-card: `limit` must be a positive number');
    }
    this._config = config;
  }

  public getCardSize(): number {
    const count = this._rows?.length ?? 2;
    return 1 + Math.max(1, Math.min(count, this._limit()));
  }

  public getGridOptions(): Record<string, number> {
    return { columns: 6, rows: 3, min_columns: 4, min_rows: 2 };
  }

  public connectedCallback(): void {
    super.connectedCallback();
    this._intervalTimer = window.setInterval(() => this._onTick(), POLL_INTERVAL_MS);
    if (this._started) this._start(); // remount: the subscription was torn down
  }

  public disconnectedCallback(): void {
    super.disconnectedCallback();
    window.clearInterval(this._intervalTimer);
    this._teardown();
  }

  protected willUpdate(changed: PropertyValues): void {
    if (!this.hass || !this._config) return;
    if (!this._started) {
      this._started = true;
      this._start();
      return;
    }
    // Polling fallback: piggyback on hass churn, throttled hard.
    if (
      changed.has('hass') &&
      !this._subscribed &&
      !this._gotEvent &&
      Date.now() - this._lastFetch > HASS_REFRESH_THROTTLE_MS
    ) {
      this._fetch();
    }
  }

  private _limit(): number {
    const raw = Number(this._config?.limit ?? DEFAULT_LIMIT);
    return Number.isFinite(raw) && raw >= 1 ? Math.floor(raw) : DEFAULT_LIMIT;
  }

  private _locale(): string {
    return this.hass?.locale?.language ?? this.hass?.language ?? 'en';
  }

  /** Every 30s: poll in fallback mode; otherwise just refresh relative times. */
  private _onTick(): void {
    if (this._subscribed || this._gotEvent) this.requestUpdate();
    else this._fetch();
  }

  private async _start(): Promise<void> {
    if (this._unsubPromise) return; // already live or in flight
    this._fetch();
    const connection = (this.hass as HassWithConnection | undefined)?.connection;
    if (!connection || typeof connection.subscribeMessage !== 'function') return;
    try {
      const promise = connection.subscribeMessage<NotificationEvent>(
        (event) => this._onSubscriptionEvent(event),
        { type: 'persistent_notification/subscribe' }
      );
      this._unsubPromise = promise;
      await promise;
      this._subscribed = true;
      if (!this.isConnected) this._teardown(); // unmounted while subscribing
    } catch {
      this._unsubPromise = undefined;
      this._subscribed = false; // polling carries on
    }
  }

  /** Drop the live subscription; safe even while the subscribe is in flight. */
  private _teardown(): void {
    const pending = this._unsubPromise;
    this._unsubPromise = undefined;
    this._subscribed = false;
    this._gotEvent = false;
    if (pending) {
      pending.then((unsub) => unsub()).catch(() => undefined);
    }
  }

  private async _fetch(): Promise<void> {
    const hass = this.hass;
    if (!hass) return;
    const seq = ++this._fetchSeq;
    this._lastFetch = Date.now();
    let resp: RawNotifications;
    try {
      resp = await hass.callWS<RawNotifications>({ type: 'persistent_notification/get' });
    } catch (err) {
      console.warn('silk-notify-card: notification fetch failed', err);
      return;
    }
    // A newer fetch superseded this one, or the live subscription took over.
    if (seq !== this._fetchSeq || this._gotEvent) return;
    this._byId = new Map(normalizeList(resp).map((n) => [n.notification_id, n]));
    this._commit(true);
  }

  private _onSubscriptionEvent(event: NotificationEvent): void {
    this._gotEvent = true;
    const incoming = normalizeList(event.notifications);
    switch (event.type) {
      case 'current':
        this._byId = new Map(incoming.map((n) => [n.notification_id, n]));
        this._commit(true);
        return;
      case 'added':
      case 'updated':
        for (const n of incoming) this._byId.set(n.notification_id, n);
        break;
      case 'removed':
        for (const n of incoming) {
          this._byId.delete(n.notification_id);
          this._dismissed.delete(n.notification_id); // dismissal confirmed
        }
        break;
      default:
        this._fetch(); // unknown event shape — resync
        return;
    }
    this._commit(false);
  }

  /**
   * Derive the visible list from `_byId` minus optimistic dismissals. On full
   * snapshots, dismissed ids the server no longer reports are confirmed gone;
   * ids it *still* reports past the grace window get un-hidden (dismiss failed).
   */
  private _commit(fullSnapshot: boolean): void {
    const now = Date.now();
    for (const [id, stamp] of this._dismissed) {
      if (fullSnapshot && !this._byId.has(id)) this._dismissed.delete(id);
      else if (now - stamp > DISMISS_GRACE_MS) this._dismissed.delete(id);
    }
    this._rows = [...this._byId.values()]
      .filter((n) => !this._dismissed.has(n.notification_id))
      .sort((a, b) => (Date.parse(b.created_at) || 0) - (Date.parse(a.created_at) || 0));
  }

  private _dismiss(ev: Event, id: string): void {
    ev.stopPropagation();
    const hass = this.hass;
    if (!hass) return;
    haptic(this);
    this._dismissed.set(id, Date.now());
    this._byId.delete(id);
    this._commit(false);
    hass.callService('persistent_notification', 'dismiss', { notification_id: id });
  }

  private _clearAll(ev: Event): void {
    ev.stopPropagation();
    const hass = this.hass;
    const rows = this._rows;
    if (!hass || !rows || rows.length === 0) return;
    haptic(this);
    const now = Date.now();
    for (const n of rows) {
      this._dismissed.set(n.notification_id, now);
      this._byId.delete(n.notification_id);
      hass.callService('persistent_notification', 'dismiss', {
        notification_id: n.notification_id,
      });
    }
    this._commit(false);
  }

  private _renderRow(n: PersistentNotification, locale: string): TemplateResult {
    return html`
      <div class="row">
        <div class="body">
          <div class="row-top">
            ${n.title ? html`<span class="title">${n.title}</span>` : nothing}
            <span class="time">${relativeTime(n.created_at, locale)}</span>
          </div>
          <div class="msg">${n.message}</div>
        </div>
        <button
          class="dismiss"
          aria-label=${`Dismiss ${n.title ?? 'notification'}`}
          @click=${(ev: Event) => this._dismiss(ev, n.notification_id)}
        >
          <ha-icon icon="mdi:close"></ha-icon>
        </button>
      </div>
    `;
  }

  protected render(): TemplateResult | typeof nothing {
    const config = this._config;
    const hass = this.hass;
    if (!config || !hass) return nothing;
    const rows = this._rows;
    const count = rows?.length ?? 0;
    const shown = rows ? rows.slice(0, this._limit()) : [];
    const name = config.name ?? 'Notifications';
    const locale = this._locale();

    return html`
      <ha-card class="control" style="--silk-accent:${accentFor(undefined)}">
        <div class="head">
          <div class="icon ${count > 0 ? 'on' : ''}">
            <ha-icon icon="mdi:bell-outline"></ha-icon>
          </div>
          <div class="info">
            <div class="name">${name}</div>
          </div>
          <div class="trailing">
            ${count > 1
              ? html`<button class="clear" @click=${this._clearAll}>Clear all</button>`
              : nothing}
            ${count > 0 ? html`<span class="chip active count">${count}</span>` : nothing}
          </div>
        </div>
        ${rows === null
          ? nothing
          : count === 0
            ? html`
                <div class="empty">
                  <ha-icon icon="mdi:bell-check-outline"></ha-icon>
                  <span>All clear</span>
                </div>
              `
            : html`<div class="list">${shown.map((n) => this._renderRow(n, locale))}</div>`}
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
        gap: 10px;
        cursor: default;
      }
      .head {
        flex: none;
        display: flex;
        align-items: center;
        gap: 12px;
        min-width: 0;
      }
      /* The inbox header icon is a status lamp, not a control. */
      .icon {
        cursor: default;
      }
      .icon:active {
        transform: none;
      }
      .count {
        cursor: default;
        font-variant-numeric: tabular-nums;
      }
      .clear {
        position: relative;
        border: none;
        background: none;
        font: inherit;
        font-size: 11px;
        font-weight: 600;
        padding: 6px 8px;
        margin: -6px -4px;
        border-radius: 8px;
        color: var(--secondary-text-color);
        cursor: pointer;
        white-space: nowrap;
        transition:
          color 150ms ease-out,
          background 150ms ease-out;
      }
      .clear:hover {
        color: var(--primary-text-color);
        background: rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.06);
      }
      /* Invisible halo lifts the touch target toward the 36px floor. */
      .clear::after {
        content: '';
        position: absolute;
        inset: -6px;
      }
      .list {
        flex: 1;
        min-height: 0;
        overflow-y: auto;
        display: flex;
        flex-direction: column;
        gap: 4px;
      }
      .row {
        flex: none;
        display: flex;
        align-items: flex-start;
        gap: 8px;
        padding: 7px 8px;
        border-radius: 10px;
        background: rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.04);
        animation: silk-notify-in 200ms var(--silk-ease-out);
      }
      .body {
        flex: 1;
        min-width: 0;
      }
      .row-top {
        display: flex;
        align-items: baseline;
        gap: 8px;
      }
      .title {
        flex: 1;
        min-width: 0;
        font-size: 13px;
        font-weight: 500;
        line-height: 1.3;
        color: var(--primary-text-color);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .time {
        flex: none;
        margin-left: auto;
        font-size: 10.5px;
        line-height: 1.3;
        color: var(--secondary-text-color);
        opacity: 0.85;
        white-space: nowrap;
        font-variant-numeric: tabular-nums;
      }
      .msg {
        font-size: 12px;
        line-height: 1.35;
        color: var(--secondary-text-color);
        overflow-wrap: anywhere;
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
        overflow: hidden;
      }
      .dismiss {
        flex: none;
        position: relative;
        width: 28px;
        height: 28px;
        border: none;
        border-radius: 9px;
        display: grid;
        place-items: center;
        padding: 0;
        cursor: pointer;
        color: var(--secondary-text-color);
        background: rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.06);
        transition:
          transform 250ms var(--silk-spring),
          background 150ms ease-out,
          color 150ms ease-out;
      }
      .dismiss:active {
        transform: scale(0.9);
        transition-duration: 120ms;
        transition-timing-function: var(--silk-ease-out);
      }
      .dismiss:hover {
        color: var(--primary-text-color);
        background: rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.12);
      }
      /* Invisible halo lifts the 28px button to a 42px touch target. */
      .dismiss::after {
        content: '';
        position: absolute;
        inset: -7px;
      }
      .dismiss ha-icon {
        --mdc-icon-size: 16px;
        pointer-events: none;
      }
      .empty {
        flex: 1;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 6px;
        padding: 8px 0 12px;
        color: var(--secondary-text-color);
        animation: silk-notify-in 200ms var(--silk-ease-out);
      }
      .empty ha-icon {
        --mdc-icon-size: 26px;
        opacity: 0.7;
      }
      .empty span {
        font-size: 12.5px;
      }
      @keyframes silk-notify-in {
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
    'silk-notify-card': SilkNotifyCard;
  }
}
