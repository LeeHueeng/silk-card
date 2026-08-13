import { LitElement, html, css, nothing, TemplateResult } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { HomeAssistant, HassEntity, LovelaceCardConfig } from '../types';
import { silkControlStyles } from '../shared/base';
import { domainOf, isUnavailable, moreInfo, haptic } from '../shared/service';
import { accentFor } from '../shared/color';
import { registerEditor } from '../shared/editor';

export const META = {
  type: 'silk-queue-card',
  name: 'Silk Queue',
  description: "What's playing next.",
};

export interface SilkQueueCardConfig extends LovelaceCardConfig {
  /** The media_player whose queue is shown. */
  entity: string;
  /** Optional entity carrying the queue when the player does not (see below). */
  queue_entity?: string;
  name?: string;
  /** Rows shown at once. Default 6. */
  limit?: number;
  /**
   * Service fired when a row is tapped: `'domain.service'`, or
   * `{ service, data }` where string values may hold `{index}`, `{id}` and
   * `{title}` placeholders. Without it a row tap opens more-info instead.
   */
  play_action?: string | { service: string; data?: Record<string, unknown> };
  /** Accent override. */
  color?: string;
}

/** One normalized queue row. */
interface QueueItem {
  title: string;
  artist?: string;
  /** Track length in seconds. */
  duration?: number;
  /** Integration id, handed to `play_action` as `{id}`. */
  id?: string;
}

/** What the card managed to read, plus why it read nothing. */
interface QueueRead {
  items: QueueItem[];
  /** Inline note shown instead of rows when the queue could not be read. */
  note?: string;
}

const DEFAULT_LIMIT = 6;
const MAX_LIMIT = 20;

const EDITOR_TAG = 'silk-queue-card-editor';

registerEditor(
  EDITOR_TAG,
  [
    { name: 'entity', required: true, selector: { entity: { domain: ['media_player'] } } },
    { name: 'name', selector: { text: {} } },
    { name: 'queue_entity', selector: { entity: { domain: ['sensor', 'input_text'] } } },
    { name: 'limit', selector: { number: { min: 1, max: MAX_LIMIT, mode: 'box' } } },
  ],
  {
    entity: 'Media player',
    name: 'Name',
    queue_entity: 'Queue entity (optional)',
    limit: 'Rows to show',
  },
  { limit: DEFAULT_LIMIT }
);

/** Non-empty trimmed string from a loosely-typed field. */
function str(value: unknown): string | undefined {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed ? trimmed : undefined;
  }
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  return undefined;
}

/** Seconds from a number, an `'m:ss'`/`'h:mm:ss'` string, or a numeric string. */
function toSeconds(raw: unknown): number | undefined {
  if (typeof raw === 'number') return Number.isFinite(raw) && raw >= 0 ? raw : undefined;
  if (typeof raw !== 'string') return undefined;
  const text = raw.trim();
  if (!text) return undefined;
  const parts = text.split(':');
  if (parts.length > 1 && parts.every((p) => /^\d+$/.test(p))) {
    return parts.reduce((acc, p) => acc * 60 + Number(p), 0);
  }
  const n = Number(text);
  return Number.isFinite(n) && n >= 0 ? n : undefined;
}

/** m:ss under an hour, h:mm:ss beyond. */
function formatClock(seconds: number): string {
  const total = Math.max(0, Math.round(seconds));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const two = (n: number): string => String(n).padStart(2, '0');
  return h > 0 ? `${h}:${two(m)}:${two(total % 60)}` : `${m}:${two(total % 60)}`;
}

/**
 * Normalize one raw entry. Queues in the wild are either plain strings or
 * objects, and every integration names its fields differently — so every
 * common spelling is accepted and anything unrecognizable is dropped.
 */
function coerceItem(raw: unknown): QueueItem | null {
  if (typeof raw === 'string') {
    const title = str(raw);
    return title ? { title } : null;
  }
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  const title =
    str(o.title) ?? str(o.media_title) ?? str(o.name) ?? str(o.track) ?? str(o.label);
  if (!title) return null;
  const artist =
    str(o.artist) ??
    str(o.media_artist) ??
    str(o.artist_name) ??
    str(o.album_artist) ??
    str(o.subtitle) ??
    str(o.album) ??
    str(o.media_album_name);
  // Millisecond fields are common in JS-flavored integrations; seconds elsewhere.
  const ms = toSeconds(o.duration_ms ?? o.length_ms);
  const duration =
    ms !== undefined
      ? ms / 1000
      : toSeconds(o.duration ?? o.media_duration ?? o.length ?? o.runtime);
  const id =
    str(o.id) ?? str(o.media_content_id) ?? str(o.uri) ?? str(o.key) ?? str(o.queue_item_id);
  return { title, artist, duration, id };
}

/** First array of entries hiding under any of `keys`. */
function firstArray(source: Record<string, unknown>, keys: string[]): unknown[] | undefined {
  for (const key of keys) {
    const value = source[key];
    if (Array.isArray(value) && value.length) return value;
  }
  return undefined;
}

/** Substitute `{index}` / `{id}` / `{title}` inside service data, at any depth. */
function substitute(value: unknown, ctx: Record<string, string | number>): unknown {
  if (typeof value === 'string') {
    const exact = /^\{(\w+)\}$/.exec(value);
    // A whole-string placeholder keeps its native type (index stays a number).
    if (exact && ctx[exact[1]] !== undefined) return ctx[exact[1]];
    return value.replace(/\{(\w+)\}/g, (m, key: string) =>
      ctx[key] !== undefined ? String(ctx[key]) : m
    );
  }
  if (Array.isArray(value)) return value.map((v) => substitute(v, ctx));
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = substitute(v, ctx);
    }
    return out;
  }
  return value;
}

/**
 * The play queue as a list, because that is the only shape a queue has.
 *
 * Home Assistant has no queue API, so the card reads whatever the integration
 * publishes, in this order:
 *   1. `queue_entity` — its state parsed as JSON (an array, or an object with
 *      `items`/`queue`), or its `attributes.items` / `.queue` / `.data` array.
 *      Note HA truncates states at 255 chars, so JSON-in-state suits short
 *      queues only; attributes have no such limit.
 *   2. the player's `attributes.queue`.
 *   3. the player's `attributes.media_playlist` *when it is an array* — a
 *      string there is a playlist NAME, not a queue, so it is ignored.
 * Anything else degrades to an inline note rather than an empty card.
 */
@customElement('silk-queue-card')
export class SilkQueueCard extends LitElement {
  @property({ attribute: false }) public hass?: HomeAssistant;

  @state() private _config?: SilkQueueCardConfig;

  public static getStubConfig(hass: HomeAssistant): Partial<SilkQueueCardConfig> {
    const ids = Object.keys(hass.states).filter((id) => id.startsWith('media_player.'));
    const withQueue = ids.find((id) => {
      const a = hass.states[id].attributes;
      return Array.isArray(a.queue) || Array.isArray(a.media_playlist);
    });
    return { type: 'custom:silk-queue-card', entity: withQueue ?? ids[0] };
  }

  public static async getConfigElement(): Promise<HTMLElement> {
    return document.createElement(EDITOR_TAG);
  }

  public setConfig(config: SilkQueueCardConfig): void {
    if (!config.entity) {
      throw new Error('silk-queue-card: `entity` is required');
    }
    if (domainOf(config.entity) !== 'media_player') {
      throw new Error(
        `silk-queue-card: \`entity\` must be a media_player (got "${config.entity}")`
      );
    }
    if (config.queue_entity !== undefined && typeof config.queue_entity !== 'string') {
      throw new Error('silk-queue-card: `queue_entity` must be an entity id');
    }
    if (config.limit !== undefined && !(Number(config.limit) >= 1)) {
      throw new Error('silk-queue-card: `limit` must be a number of at least 1');
    }
    const action = config.play_action;
    if (action !== undefined) {
      const service = typeof action === 'string' ? action : action?.service;
      if (typeof service !== 'string' || !/^[a-z_]+\.[a-z0-9_]+$/i.test(service)) {
        throw new Error(
          "silk-queue-card: `play_action` must be 'domain.service' or { service, data }"
        );
      }
    }
    this._config = config;
  }

  public getCardSize(): number {
    return 3;
  }

  public getGridOptions(): Record<string, number> {
    return { columns: 6, rows: 3, min_columns: 4, min_rows: 2 };
  }

  private _limit(): number {
    return Math.min(MAX_LIMIT, Math.max(1, Math.floor(this._config?.limit ?? DEFAULT_LIMIT)));
  }

  /** Read the queue from whichever of the supported shapes is present. */
  private _readQueue(player: HassEntity): QueueRead {
    const hass = this.hass!;
    const queueEntity = this._config?.queue_entity;
    let raw: unknown[] | undefined;
    let note: string | undefined;

    if (queueEntity) {
      const source = hass.states[queueEntity];
      if (!source) {
        note = `Queue entity not found: ${queueEntity}`;
      } else if (!isUnavailable(source)) {
        const text = source.state.trim();
        if (text.startsWith('[') || text.startsWith('{')) {
          try {
            const parsed: unknown = JSON.parse(text);
            if (Array.isArray(parsed)) raw = parsed;
            else if (parsed && typeof parsed === 'object') {
              raw = firstArray(parsed as Record<string, unknown>, ['items', 'queue', 'data']);
            }
          } catch {
            // A truncated 255-char state is the usual cause — fall through to
            // the attributes, and to the player after that.
          }
        }
        raw ??= firstArray(source.attributes, ['items', 'queue', 'data', 'tracks']);
      }
    }

    if (!raw) {
      // The player is the fallback even when a queue_entity is configured —
      // a silent source should not blank a card that could still say something.
      const a = player.attributes;
      raw = Array.isArray(a.queue) && a.queue.length ? (a.queue as unknown[]) : undefined;
      // `media_playlist` is a playlist NAME on most integrations; only an
      // array of entries can be read as a queue.
      if (!raw && Array.isArray(a.media_playlist) && a.media_playlist.length) {
        raw = a.media_playlist as unknown[];
      }
    }

    if (!raw) {
      return { items: [], note: note ?? 'This player reports no queue' };
    }
    const items = raw
      .map((entry) => coerceItem(entry))
      .filter((item): item is QueueItem => item !== null);
    // A list was found but held nothing the card could read: say so plainly
    // rather than claiming the player publishes no queue at all.
    return items.length ? { items } : { items: [], note: 'Queue is empty' };
  }

  /**
   * Index of the row playing right now. Title matching comes first because it
   * works on every integration; an explicit position attribute is the fallback
   * (accepted 0-based, retried 1-based when that lands out of range).
   */
  private _currentIndex(player: HassEntity, items: QueueItem[]): number {
    const playing = str(player.attributes.media_title)?.toLowerCase();
    if (playing) {
      const hit = items.findIndex((item) => item.title.toLowerCase() === playing);
      if (hit >= 0) return hit;
    }
    const a = player.attributes;
    const rawPos = a.queue_position ?? a.current_index ?? a.queue_index ?? a.media_position_index;
    const pos = typeof rawPos === 'number' && Number.isFinite(rawPos) ? Math.round(rawPos) : NaN;
    if (Number.isNaN(pos)) return -1;
    if (pos >= 0 && pos < items.length) return pos;
    if (pos - 1 >= 0 && pos - 1 < items.length) return pos - 1;
    return -1;
  }

  private _playAction(): { service: string; data?: Record<string, unknown> } | undefined {
    const raw = this._config?.play_action;
    if (typeof raw === 'string') return { service: raw };
    if (raw && typeof raw === 'object' && typeof raw.service === 'string') {
      return { service: raw.service, data: raw.data };
    }
    return undefined;
  }

  private _onCardClick(): void {
    if (this._config) moreInfo(this, this._config.entity);
  }

  private _onRowClick(ev: Event, item: QueueItem, index: number): void {
    ev.stopPropagation();
    const config = this._config;
    const hass = this.hass;
    if (!config || !hass) return;
    const action = this._playAction();
    if (!action) {
      moreInfo(this, config.entity);
      return;
    }
    const player = hass.states[config.entity];
    if (!player || isUnavailable(player)) return;
    const [domain, service] = action.service.split('.');
    if (!domain || !service) return;
    haptic(this);
    const ctx: Record<string, string | number> = {
      index,
      id: item.id ?? String(index),
      title: item.title,
    };
    // Without authored data the index is the payload — the one thing every
    // queue service needs. Authored data wins over the defaults, verbatim.
    const data = action.data
      ? (substitute(action.data, ctx) as Record<string, unknown>)
      : { index };
    void hass.callService(domain, service, { entity_id: config.entity, ...data });
  }

  private _renderRow(
    item: QueueItem,
    index: number,
    current: boolean,
    playing: boolean,
    actionable: boolean
  ): TemplateResult {
    const duration = item.duration !== undefined ? formatClock(item.duration) : '';
    const hover = [
      `${index + 1}. ${item.title}`,
      item.artist,
      duration,
      current ? (playing ? 'playing now' : 'current track') : undefined,
    ]
      .filter(Boolean)
      .join(' · ');
    return html`
      <button
        class="row ${current ? 'now' : ''}"
        title=${hover}
        aria-current=${current ? 'true' : nothing}
        aria-label=${actionable ? `Play ${item.title}` : item.title}
        @click=${(ev: Event) => this._onRowClick(ev, item, index)}
      >
        ${current
          ? html`
              <span class="eq ${playing ? 'live' : ''}" aria-hidden="true">
                <i></i><i></i><i></i>
              </span>
            `
          : html`<span class="idx">${index + 1}</span>`}
        <span class="meta">
          <span class="ttl">${item.title}</span>
          ${item.artist ? html`<span class="artist">${item.artist}</span>` : nothing}
        </span>
        <span class="dur">${duration}</span>
      </button>
    `;
  }

  protected render(): TemplateResult | typeof nothing {
    const config = this._config;
    const hass = this.hass;
    if (!config || !hass) return nothing;
    const player = hass.states[config.entity];
    if (!player) {
      return html`<ha-card><div class="warning">Entity not found: ${config.entity}</div></ha-card>`;
    }

    const unavailable = isUnavailable(player);
    const accent = accentFor(player, config.color);
    const name = config.name ?? player.attributes.friendly_name ?? config.entity;
    const read = unavailable ? { items: [], note: 'Unavailable' } : this._readQueue(player);
    const items = read.items;
    const current = unavailable ? -1 : this._currentIndex(player, items);
    const playing = player.state === 'playing';
    const actionable = this._playAction() !== undefined && !unavailable;

    // The card promises what plays NEXT, so the window opens on the current
    // track and runs forward — never a stale head the player left behind.
    const limit = this._limit();
    const start = current > 0 ? current : 0;
    const shown = items.slice(start, start + limit);
    const remaining = items.length - (start + shown.length);

    return html`
      <ha-card
        class="control ${unavailable ? 'unavailable' : ''}"
        style="--silk-accent:${accent}"
        @click=${this._onCardClick}
      >
        <div class="header">
          <div class="hname" title=${name}>${name}</div>
          ${items.length
            ? html`
                <span class="count">
                  ${current >= 0 ? `${current + 1}/${items.length}` : items.length}
                </span>
              `
            : nothing}
        </div>
        ${shown.length
          ? html`
              <div class="rows">
                ${shown.map((item, i) =>
                  this._renderRow(item, start + i, start + i === current, playing, actionable)
                )}
              </div>
              ${remaining > 0
                ? html`<div class="more">+${remaining} more</div>`
                : nothing}
            `
          : html`<div class="note">${read.note ?? 'No queue reported'}</div>`}
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
        padding: 12px 14px;
      }
      .header {
        flex: none;
        display: flex;
        align-items: baseline;
        gap: 8px;
        min-height: 20px;
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
      .count {
        flex: none;
        font-size: 11px;
        line-height: 1;
        color: var(--secondary-text-color);
        opacity: 0.75;
        font-variant-numeric: tabular-nums;
      }
      /* In a sections grid the card's height is fixed, so a long queue scrolls
         inside the card instead of being silently clipped. */
      .rows {
        flex: 1;
        min-height: 0;
        display: flex;
        flex-direction: column;
        gap: 1px;
        margin: 0 -6px;
        overflow-y: auto;
        overscroll-behavior-y: contain;
        scrollbar-width: thin;
      }
      .row {
        flex: none;
        display: flex;
        align-items: center;
        gap: 10px;
        width: 100%;
        min-height: 32px;
        margin: 0;
        padding: 3px 6px;
        border: none;
        border-radius: 10px;
        background: none;
        font: inherit;
        color: inherit;
        text-align: left;
        cursor: pointer;
        outline: none;
        transition: background 150ms ease-out;
      }
      .row:hover {
        background: rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.05);
      }
      /* Playing = surface, never glow: the row itself carries the accent tint. */
      .row.now {
        background: color-mix(in srgb, var(--silk-accent) 14%, transparent);
      }
      .row.now:hover {
        background: color-mix(in srgb, var(--silk-accent) 20%, transparent);
      }
      .row:focus-visible {
        box-shadow: inset 0 0 0 2px color-mix(in srgb, var(--silk-accent) 70%, transparent);
      }
      .idx {
        flex: none;
        width: 14px;
        text-align: right;
        font-size: 10px;
        line-height: 1;
        color: var(--primary-text-color);
        opacity: 0.45;
        font-variant-numeric: tabular-nums;
      }
      /* Three bars where the track number would be — the only looping motion
         on this card, and only while audio is genuinely moving. */
      .eq {
        flex: none;
        width: 14px;
        height: 12px;
        display: flex;
        align-items: flex-end;
        justify-content: flex-end;
        gap: 2px;
      }
      .eq i {
        display: block;
        width: 2px;
        height: 12px;
        border-radius: 1px;
        background: var(--silk-accent);
        transform-origin: bottom center;
        transform: scaleY(0.35);
      }
      .eq.live i {
        animation: silk-queue-eq 900ms ease-in-out infinite;
      }
      .eq.live i:nth-child(2) {
        animation-duration: 700ms;
        animation-delay: 120ms;
      }
      .eq.live i:nth-child(3) {
        animation-duration: 1100ms;
        animation-delay: 240ms;
      }
      .meta {
        flex: 1;
        min-width: 0;
        display: flex;
        flex-direction: column;
        justify-content: center;
      }
      .ttl {
        font-size: 13px;
        font-weight: 500;
        line-height: 1.3;
        color: var(--primary-text-color);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .artist {
        font-size: 11px;
        line-height: 1.3;
        color: var(--secondary-text-color);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .dur {
        flex: none;
        font-size: 11px;
        line-height: 1;
        color: var(--secondary-text-color);
        font-variant-numeric: tabular-nums;
      }
      .more {
        flex: none;
        padding: 0 6px;
        font-size: 11px;
        line-height: 1.3;
        color: var(--secondary-text-color);
        opacity: 0.75;
        font-variant-numeric: tabular-nums;
      }
      .note {
        flex: 1;
        display: flex;
        align-items: center;
        justify-content: center;
        min-height: 44px;
        padding: 6px 0;
        font-size: 13px;
        color: var(--secondary-text-color);
        text-align: center;
      }
      @keyframes silk-queue-eq {
        0%,
        100% {
          transform: scaleY(0.3);
        }
        50% {
          transform: scaleY(1);
        }
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    'silk-queue-card': SilkQueueCard;
  }
}
