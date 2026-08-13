import { LitElement, html, css, nothing, TemplateResult } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { HomeAssistant, HassEntity, LovelaceCardConfig } from '../types';
import { silkControlStyles } from '../shared/base';
import { isUnavailable, moreInfo, haptic } from '../shared/service';
import { accentFor } from '../shared/color';
import { registerEditor } from '../shared/editor';

export const META = {
  type: 'silk-library-card',
  name: 'Silk Library',
  description: 'Recently added, ready to play.',
};

export interface SilkLibraryCardConfig extends LovelaceCardConfig {
  /** Sensor whose attributes carry the list (see the class comment). */
  entity: string;
  name?: string;
  /** Posters shown. Default 10. */
  limit?: number;
  /**
   * Service fired on a poster tap: `'domain.service'`, or `{ service, data }`.
   * String values in the data may hold `{id}`, `{title}` and `{year}`
   * placeholders. Without it a poster is not a control at all.
   */
  tap_service?: string | { service: string; data?: Record<string, unknown> };
  /** Data for `tap_service` when it is given as a bare service string. */
  tap_data?: Record<string, unknown>;
  /** Accent override. */
  color?: string;
}

/** One normalized library entry. */
interface LibraryItem {
  title: string;
  /** Artwork URL — relative HA paths are used as-is. */
  image?: string;
  /** Release year, when the payload carries one. */
  year?: string;
  /** Integration id, handed to `tap_service` as `{id}`. */
  id?: string;
}

const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 40;
/** Attribute keys that commonly hold the list, in the order they are tried. */
const LIST_KEYS = ['data', 'items', 'movies', 'shows', 'episodes', 'albums', 'entries'];

const EDITOR_TAG = 'silk-library-card-editor';

registerEditor(
  EDITOR_TAG,
  [
    { name: 'entity', required: true, selector: { entity: { domain: ['sensor'] } } },
    { name: 'name', selector: { text: {} } },
    { name: 'limit', selector: { number: { min: 1, max: MAX_LIMIT, mode: 'box' } } },
  ],
  { entity: 'Entity', name: 'Name', limit: 'Posters to show' },
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

/** A 4-digit year out of a year field, a date string, or a timestamp. */
function toYear(value: unknown): string | undefined {
  const text = str(value);
  if (!text) return undefined;
  const m = /(\d{4})/.exec(text);
  return m ? m[1] : undefined;
}

/** Substitute `{id}` / `{title}` / `{year}` inside service data, at any depth. */
function substitute(value: unknown, ctx: Record<string, string>): unknown {
  if (typeof value === 'string') {
    return value.replace(/\{(\w+)\}/g, (m, key: string) => (ctx[key] !== undefined ? ctx[key] : m));
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

/** Normalize one raw entry; anything without a title is dropped. */
function coerceItem(raw: unknown): LibraryItem | null {
  if (typeof raw === 'string') {
    const title = str(raw);
    return title ? { title } : null;
  }
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  const title =
    str(o.title) ?? str(o.name) ?? str(o.movie) ?? str(o.series) ?? str(o.label) ?? str(o.album);
  if (!title) return null;
  const image =
    str(o.thumbnail) ??
    str(o.poster) ??
    str(o.image) ??
    str(o.entity_picture) ??
    str(o.thumb) ??
    str(o.fanart) ??
    str(o.cover) ??
    str(o.poster_url);
  const year = toYear(o.year ?? o.release_year ?? o.releaseyear ?? o.airdate ?? o.released);
  const id =
    str(o.id) ?? str(o.media_content_id) ?? str(o.key) ?? str(o.ratingKey) ?? str(o.imdb_id);
  return { title, image, year, id };
}

/**
 * A shelf of recently added media — the artwork does the talking, so the card
 * is one horizontally scrollable, snapping row of posters.
 *
 * The source is any sensor that publishes a list in its attributes:
 * `attributes.data` / `.items` / `.movies` (plus a few sibling spellings the
 * popular "upcoming media" sensors use). Each entry may be a bare string or an
 * object with `title`/`name`, `thumbnail`/`poster`/`image` and `year`. Missing
 * artwork degrades to an accent-tinted plate with the title's initial rather
 * than a hole in the row, and a payload the card cannot read degrades to an
 * inline note.
 */
@customElement('silk-library-card')
export class SilkLibraryCard extends LitElement {
  @property({ attribute: false }) public hass?: HomeAssistant;

  @state() private _config?: SilkLibraryCardConfig;
  /** Artwork URLs that failed to load; a new URL is retried. */
  @state() private _broken: ReadonlySet<string> = new Set();

  public static getStubConfig(hass: HomeAssistant): Partial<SilkLibraryCardConfig> {
    const entity = Object.keys(hass.states).find((id) => {
      if (!id.startsWith('sensor.')) return false;
      const attrs = hass.states[id].attributes;
      return LIST_KEYS.some((key) => Array.isArray(attrs[key]) && attrs[key].length);
    });
    return { type: 'custom:silk-library-card', entity };
  }

  public static async getConfigElement(): Promise<HTMLElement> {
    return document.createElement(EDITOR_TAG);
  }

  public setConfig(config: SilkLibraryCardConfig): void {
    if (!config.entity) {
      throw new Error('silk-library-card: `entity` is required');
    }
    if (config.limit !== undefined && !(Number(config.limit) >= 1)) {
      throw new Error('silk-library-card: `limit` must be a number of at least 1');
    }
    const action = config.tap_service;
    if (action !== undefined) {
      const service = typeof action === 'string' ? action : action?.service;
      if (typeof service !== 'string' || !/^[a-z_]+\.[a-z0-9_]+$/i.test(service)) {
        throw new Error(
          "silk-library-card: `tap_service` must be 'domain.service' or { service, data }"
        );
      }
    }
    this._config = config;
    this._broken = new Set();
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

  /** The list, from the first attribute key that holds a non-empty array. */
  private _items(stateObj: HassEntity): LibraryItem[] | null {
    let raw: unknown[] | undefined;
    for (const key of LIST_KEYS) {
      const value = stateObj.attributes[key];
      if (Array.isArray(value) && value.length) {
        raw = value;
        break;
      }
    }
    if (!raw) return null;
    const items = raw
      .map((entry) => coerceItem(entry))
      .filter((item): item is LibraryItem => item !== null);
    return items.length ? items.slice(0, this._limit()) : null;
  }

  private _tapAction(): { service: string; data?: Record<string, unknown> } | undefined {
    const raw = this._config?.tap_service;
    if (typeof raw === 'string') return { service: raw, data: this._config?.tap_data };
    if (raw && typeof raw === 'object' && typeof raw.service === 'string') {
      return { service: raw.service, data: raw.data ?? this._config?.tap_data };
    }
    return undefined;
  }

  private _onCardClick(): void {
    if (this._config) moreInfo(this, this._config.entity);
  }

  private _onTileClick(ev: Event, item: LibraryItem): void {
    ev.stopPropagation();
    const hass = this.hass;
    const action = this._tapAction();
    if (!hass || !action) return;
    const [domain, service] = action.service.split('.');
    if (!domain || !service) return;
    haptic(this);
    const ctx: Record<string, string> = {
      id: item.id ?? item.title,
      title: item.title,
      year: item.year ?? '',
    };
    // Authored data is passed through as written — the target stays the user's
    // call; only the placeholders are filled in.
    const data = action.data ? (substitute(action.data, ctx) as Record<string, unknown>) : {};
    void hass.callService(domain, service, data);
  }

  private _onArtError(ev: Event): void {
    const src = (ev.currentTarget as HTMLImageElement | null)?.getAttribute('src');
    if (!src || this._broken.has(src)) return;
    const next = new Set(this._broken);
    next.add(src);
    this._broken = next;
  }

  private _renderArt(item: LibraryItem): TemplateResult {
    const src = item.image && !this._broken.has(item.image) ? item.image : undefined;
    if (!src) {
      const initial = item.title.trim().charAt(0).toUpperCase() || '?';
      return html`<span class="art plate" aria-hidden="true">${initial}</span>`;
    }
    return html`
      <img
        class="art"
        src=${src}
        alt=""
        loading="lazy"
        decoding="async"
        @error=${this._onArtError}
      />
    `;
  }

  private _renderTile(item: LibraryItem, actionable: boolean): TemplateResult {
    const hover = item.year ? `${item.title} (${item.year})` : item.title;
    const body = html`
      ${this._renderArt(item)}
      <span class="ttl">${item.title}</span>
    `;
    // Without a tap_service a poster is not a control, so it is not a button:
    // the tap falls through to the card and opens more-info on the source.
    return actionable
      ? html`
          <button class="tile" title=${hover} aria-label=${hover} @click=${(ev: Event) =>
            this._onTileClick(ev, item)}>
            ${body}
          </button>
        `
      : html`<div class="tile static" title=${hover}>${body}</div>`;
  }

  protected render(): TemplateResult | typeof nothing {
    const config = this._config;
    const hass = this.hass;
    if (!config || !hass) return nothing;
    const stateObj = hass.states[config.entity];
    if (!stateObj) {
      return html`<ha-card><div class="warning">Entity not found: ${config.entity}</div></ha-card>`;
    }

    const unavailable = isUnavailable(stateObj);
    const accent = accentFor(stateObj, config.color);
    const name = config.name ?? stateObj.attributes.friendly_name ?? config.entity;
    const items = unavailable ? null : this._items(stateObj);
    const actionable = !unavailable && this._tapAction() !== undefined;

    return html`
      <ha-card
        class="control ${unavailable ? 'unavailable' : ''}"
        style="--silk-accent:${accent}"
        @click=${this._onCardClick}
      >
        <div class="header">
          <div class="hname" title=${name}>${name}</div>
          ${items ? html`<span class="count">${items.length}</span>` : nothing}
        </div>
        ${items
          ? html`
              <div class="strip" role="list">
                ${items.map((item) => this._renderTile(item, actionable))}
              </div>
            `
          : html`
              <div class="note">
                ${unavailable ? 'Unavailable' : 'No media list in this entity'}
              </div>
            `}
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
        gap: 8px;
        padding: 12px 0 12px 14px;
      }
      .header {
        flex: none;
        display: flex;
        align-items: baseline;
        gap: 8px;
        min-height: 20px;
        padding-right: 14px;
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
      /* One snapping row. Vertical scrolling still belongs to the page. */
      .strip {
        flex: 1;
        min-height: 0;
        display: flex;
        align-items: stretch;
        gap: 10px;
        padding-right: 14px;
        overflow-x: auto;
        overflow-y: hidden;
        scroll-snap-type: x mandatory;
        scroll-padding-left: 0;
        overscroll-behavior-x: contain;
        touch-action: pan-x;
        /* The bar would eat poster height on desktop; the row scrolls by drag,
           wheel and keyboard focus regardless. */
        scrollbar-width: none;
      }
      .strip::-webkit-scrollbar {
        display: none;
      }
      .tile {
        flex: none;
        width: 96px;
        min-width: 0;
        display: flex;
        flex-direction: column;
        gap: 6px;
        margin: 0;
        padding: 0;
        border: none;
        background: none;
        font: inherit;
        color: inherit;
        text-align: left;
        scroll-snap-align: start;
        outline: none;
      }
      button.tile {
        cursor: pointer;
        transition: transform 250ms var(--silk-spring);
      }
      button.tile:active {
        transform: scale(0.96);
        transition-duration: 120ms;
        transition-timing-function: var(--silk-ease-out);
      }
      button.tile:focus-visible .art {
        outline: 2px solid color-mix(in srgb, var(--silk-accent) 70%, transparent);
        outline-offset: 2px;
      }
      .art {
        flex: 1 1 auto;
        width: 96px;
        min-height: 56px;
        border-radius: 10px;
        object-fit: cover;
        display: block;
        background: rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.06);
      }
      /* No artwork: an accent-tinted plate carrying the title's initial. */
      .plate {
        display: grid;
        place-items: center;
        box-sizing: border-box;
        font-size: 26px;
        font-weight: 600;
        letter-spacing: -0.02em;
        color: var(--silk-accent);
        background: color-mix(in srgb, var(--silk-accent) 16%, transparent);
      }
      .ttl {
        flex: none;
        font-size: 11px;
        line-height: 1.25;
        color: var(--primary-text-color);
        display: -webkit-box;
        -webkit-line-clamp: 2;
        line-clamp: 2;
        -webkit-box-orient: vertical;
        overflow: hidden;
        /* Two lines reserved so the posters keep a common baseline. */
        min-height: calc(2 * 1.25 * 11px);
      }
      .note {
        flex: 1;
        display: flex;
        align-items: center;
        justify-content: center;
        min-height: 44px;
        padding-right: 14px;
        font-size: 13px;
        color: var(--secondary-text-color);
        text-align: center;
      }
      .unavailable .strip,
      .unavailable .note {
        opacity: 0.45;
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    'silk-library-card': SilkLibraryCard;
  }
}
