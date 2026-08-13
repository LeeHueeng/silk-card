import { LitElement, html, css, nothing, PropertyValues, TemplateResult } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { HomeAssistant, HassEntity, LovelaceCardConfig } from '../types';
import { silkControlStyles } from '../shared/base';
import {
  domainOf,
  isUnavailable,
  moreInfo,
  haptic,
  stateText,
  supportsFeature,
} from '../shared/service';
import { accentFor } from '../shared/color';
import { registerEditor } from '../shared/editor';

export const META = {
  type: 'silk-radio-card',
  name: 'Silk Radio',
  description: 'Your stations, one tap away.',
};

/** MediaPlayerEntityFeature bits (HA core). */
const FEAT_PAUSE = 1;
const FEAT_PLAY = 16384;

const OPTIMISTIC_TTL_MS = 2000;
const MIN_STATIONS = 2;
const MAX_STATIONS = 12;
/** Shorter texts match too loosely to trust for the "now on air" highlight. */
const MIN_MATCH_CHARS = 3;

/** States where the player is holding a station — anything else reads stopped. */
const LIVE_STATES = new Set(['playing', 'paused', 'buffering', 'on']);

/** One preset. Either `url` (play_media) or `source` (select_source) is required. */
export interface SilkRadioStation {
  name: string;
  /** Stream URL, played as `music` content. */
  url?: string;
  /** Source-list entry, selected instead of a stream. */
  source?: string;
  icon?: string;
  /** Station logo; falls back to the icon when it fails to load. */
  image?: string;
}

export interface SilkRadioCardConfig extends LovelaceCardConfig {
  entity: string;
  /** YAML-only: 2–12 presets. */
  stations: SilkRadioStation[];
  name?: string;
  color?: string;
}

const EDITOR_TAG = 'silk-radio-card-editor';

registerEditor(
  EDITOR_TAG,
  [
    { name: 'entity', required: true, selector: { entity: { domain: ['media_player'] } } },
    { name: 'name', selector: { text: {} } },
  ],
  { entity: 'Entity', name: 'Name' }
);

/** Non-empty string attribute, else undefined. */
function stringAttr(stateObj: HassEntity, key: string): string | undefined {
  const value = stateObj.attributes[key];
  return typeof value === 'string' && value ? value : undefined;
}

const norm = (text: string): string => text.toLowerCase().replace(/\s+/g, ' ').trim();

/** A non-empty string, or undefined. */
function optionalText(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() !== '' ? value : undefined;
}

/**
 * Station presets for one media player: a grid of tiles that each start a
 * stream (`url`) or flip an input (`source`). The station currently on air
 * reads as an accent-tinted surface with an accent label — Silk states are
 * surfaces, never edge strips or glows.
 */
@customElement('silk-radio-card')
export class SilkRadioCard extends LitElement {
  @property({ attribute: false }) public hass?: HomeAssistant;

  @state() private _config?: SilkRadioCardConfig;

  /** Optimistically selected station index (null = trust the real state). */
  @state() private _optimisticIndex: number | null = null;

  /** Optimistic play/pause flip (null = trust the real state). */
  @state() private _optimisticPlaying: boolean | null = null;

  /** Station indices whose logo failed to load; they fall back to the icon. */
  @state() private _brokenImages: Record<number, true> = {};

  /** last_updated snapshot at call time; any newer stamp clears the override. */
  private _optimisticBase = '';
  private _optimisticTimer?: number;

  public static getStubConfig(hass: HomeAssistant): Partial<SilkRadioCardConfig> {
    const entity = Object.keys(hass.states).find((id) => id.startsWith('media_player.'));
    const sources = entity ? hass.states[entity].attributes.source_list : undefined;
    // Real inputs make the best preview; otherwise seed two editable placeholders.
    const stations: SilkRadioStation[] =
      Array.isArray(sources) && sources.length >= MIN_STATIONS
        ? sources
            .slice(0, 4)
            .map((source: unknown) => ({ name: String(source), source: String(source) }))
        : [
            { name: 'Station one', url: 'http://stream.example.com/one', icon: 'mdi:radio' },
            { name: 'Station two', url: 'http://stream.example.com/two', icon: 'mdi:radio' },
          ];
    return { type: 'custom:silk-radio-card', entity, stations };
  }

  public static async getConfigElement(): Promise<HTMLElement> {
    return document.createElement(EDITOR_TAG);
  }

  public setConfig(config: SilkRadioCardConfig): void {
    if (!config.entity) {
      throw new Error('silk-radio-card: `entity` is required');
    }
    if (domainOf(config.entity) !== 'media_player') {
      throw new Error(
        `silk-radio-card: \`entity\` must be a media_player (got "${config.entity}")`
      );
    }
    if (!Array.isArray(config.stations)) {
      throw new Error(
        'silk-radio-card: `stations` is required — a list of {name, url or source}'
      );
    }
    if (config.stations.length < MIN_STATIONS || config.stations.length > MAX_STATIONS) {
      throw new Error(
        `silk-radio-card: list between ${MIN_STATIONS} and ${MAX_STATIONS} \`stations\` (got ${config.stations.length})`
      );
    }
    config.stations.forEach((station, i) => {
      if (!station || typeof station !== 'object' || !optionalText(station.name)) {
        throw new Error(`silk-radio-card: station ${i + 1} needs a \`name\``);
      }
      if (!optionalText(station.url) && !optionalText(station.source)) {
        throw new Error(
          `silk-radio-card: station "${station.name}" needs a \`url\` or a \`source\``
        );
      }
    });
    this._config = config;
    this._brokenImages = {};
    this._clearOptimistic();
  }

  public getCardSize(): number {
    return 3;
  }

  public getGridOptions(): Record<string, number> {
    return { columns: 6, rows: 3, min_columns: 3, min_rows: 2 };
  }

  public disconnectedCallback(): void {
    super.disconnectedCallback();
    window.clearTimeout(this._optimisticTimer);
    this._optimisticTimer = undefined;
  }

  protected willUpdate(changed: PropertyValues): void {
    if (!changed.has('hass') || this._optimisticTimer === undefined || !this._config) return;
    // The real state arrived: the optimistic highlight has done its job.
    const stamp = this.hass?.states[this._config.entity]?.last_updated;
    if (stamp !== undefined && stamp !== this._optimisticBase) this._clearOptimistic();
  }

  private _clearOptimistic(): void {
    window.clearTimeout(this._optimisticTimer);
    this._optimisticTimer = undefined;
    this._optimisticIndex = null;
    this._optimisticPlaying = null;
  }

  private _armOptimistic(stateObj: HassEntity): void {
    this._optimisticBase = stateObj.last_updated;
    window.clearTimeout(this._optimisticTimer);
    this._optimisticTimer = window.setTimeout(() => this._clearOptimistic(), OPTIMISTIC_TTL_MS);
  }

  /** Does the player's current programme look like this station? */
  private _matches(station: SilkRadioStation, stateObj: HassEntity): boolean {
    const attrs = stateObj.attributes;
    if (station.source && attrs.source === station.source) return true;
    if (station.url && attrs.media_content_id === station.url) return true;
    const name = norm(station.name);
    if (name.length < MIN_MATCH_CHARS) return false;
    for (const key of ['media_channel', 'media_title', 'source', 'app_name']) {
      const text = stringAttr(stateObj, key);
      if (!text) continue;
      const current = norm(text);
      if (current.length < MIN_MATCH_CHARS) continue;
      if (current === name || current.includes(name) || name.includes(current)) return true;
    }
    return false;
  }

  /** Index of the station on air, or -1 — optimistic pick wins. */
  private _currentIndex(stateObj: HassEntity): number {
    if (this._optimisticIndex !== null) return this._optimisticIndex;
    if (!LIVE_STATES.has(stateObj.state)) return -1;
    return (this._config?.stations ?? []).findIndex((station) => this._matches(station, stateObj));
  }

  private _onCardClick(): void {
    if (this._config) moreInfo(this, this._config.entity);
  }

  private _onImageError(index: number): void {
    this._brokenImages = { ...this._brokenImages, [index]: true };
  }

  private _onStationClick(ev: Event, station: SilkRadioStation, index: number): void {
    ev.stopPropagation();
    const config = this._config;
    const hass = this.hass;
    if (!config || !hass) return;
    const stateObj = hass.states[config.entity];
    if (!stateObj || isUnavailable(stateObj)) return;
    haptic(this);
    this._optimisticIndex = index;
    this._optimisticPlaying = true;
    this._armOptimistic(stateObj);
    if (station.url) {
      hass.callService('media_player', 'play_media', {
        entity_id: config.entity,
        media_content_id: station.url,
        media_content_type: 'music',
      });
    } else if (station.source) {
      hass.callService('media_player', 'select_source', {
        entity_id: config.entity,
        source: station.source,
      });
    }
  }

  private _onPlayPause(ev: Event): void {
    ev.stopPropagation();
    const config = this._config;
    const hass = this.hass;
    if (!config || !hass) return;
    const stateObj = hass.states[config.entity];
    if (!stateObj || isUnavailable(stateObj)) return;
    haptic(this);
    const playing = this._optimisticPlaying ?? stateObj.state === 'playing';
    // Keep any live station highlight; only the transport flips.
    this._optimisticIndex = this._currentIndex(stateObj);
    this._optimisticPlaying = !playing;
    this._armOptimistic(stateObj);
    hass.callService('media_player', 'media_play_pause', { entity_id: config.entity });
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
    const current = unavailable ? -1 : this._currentIndex(stateObj);
    const playing = !unavailable && (this._optimisticPlaying ?? stateObj.state === 'playing');
    const nowLine =
      stringAttr(stateObj, 'media_title') ??
      (current >= 0 ? config.stations[current].name : undefined) ??
      stateText(hass, stateObj);
    const canPlayPause =
      supportsFeature(stateObj, FEAT_PAUSE) || supportsFeature(stateObj, FEAT_PLAY);

    return html`
      <ha-card
        class="control ${unavailable ? 'unavailable' : ''}"
        style="--silk-accent:${accent}"
        @click=${this._onCardClick}
      >
        <div class="head">
          <div class="info">
            <div class="name">${name}</div>
            <div class="state">${nowLine}</div>
          </div>
          ${canPlayPause
            ? html`
                <button
                  class="play"
                  ?disabled=${unavailable}
                  aria-label=${playing ? `Pause ${name}` : `Play ${name}`}
                  @click=${this._onPlayPause}
                >
                  <ha-icon icon=${playing ? 'mdi:pause' : 'mdi:play'}></ha-icon>
                </button>
              `
            : nothing}
        </div>
        <div class="grid">
          ${config.stations.map((station, index) =>
            this._renderStation(station, index, index === current, unavailable)
          )}
        </div>
      </ha-card>
    `;
  }

  private _renderStation(
    station: SilkRadioStation,
    index: number,
    active: boolean,
    unavailable: boolean
  ): TemplateResult {
    const image = station.image && !this._brokenImages[index] ? station.image : undefined;
    return html`
      <button
        class="tile ${active ? 'active' : ''}"
        aria-pressed=${active ? 'true' : 'false'}
        title=${station.name}
        ?disabled=${unavailable}
        @click=${(ev: Event) => this._onStationClick(ev, station, index)}
      >
        ${image
          ? html`<img class="logo" src=${image} alt="" @error=${() => this._onImageError(index)} />`
          : html`<ha-icon class="glyph" .icon=${station.icon ?? 'mdi:radio'}></ha-icon>`}
        <span class="sname">${station.name}</span>
      </button>
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
      }
      .head {
        flex: none;
        display: flex;
        align-items: center;
        gap: 12px;
        min-width: 0;
      }
      .play {
        flex: none;
        width: 36px;
        height: 36px;
        border: none;
        border-radius: 12px;
        display: grid;
        place-items: center;
        padding: 0;
        cursor: pointer;
        position: relative;
        z-index: 1;
        color: var(--silk-accent);
        background: color-mix(in srgb, var(--silk-accent) 16%, transparent);
        transition:
          transform 250ms var(--silk-spring),
          background 200ms ease,
          opacity 200ms ease;
      }
      .play:hover:not(:disabled) {
        background: color-mix(in srgb, var(--silk-accent) 24%, transparent);
      }
      .play:active:not(:disabled) {
        transform: scale(0.92);
        transition-duration: 120ms;
        transition-timing-function: var(--silk-ease-out);
      }
      .play:disabled {
        opacity: 0.4;
        cursor: default;
      }
      .play ha-icon {
        --mdc-icon-size: 20px;
        pointer-events: none;
      }
      .grid {
        flex: 1 1 auto;
        min-height: 0;
        overflow-y: auto;
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(84px, 1fr));
        align-content: start;
        gap: 8px;
        position: relative;
        z-index: 1;
      }
      .tile {
        display: flex;
        align-items: center;
        gap: 8px;
        height: 56px;
        box-sizing: border-box;
        padding: 0 9px;
        border: none;
        border-radius: 14px;
        cursor: pointer;
        text-align: left;
        min-width: 0;
        font: inherit;
        color: var(--secondary-text-color);
        background: rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.06);
        transition:
          transform 250ms var(--silk-spring),
          background 200ms ease,
          color 200ms ease;
      }
      .tile:hover:not(:disabled) {
        background: rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.1);
      }
      .tile:active:not(:disabled) {
        transform: scale(0.96);
        transition-duration: 120ms;
        transition-timing-function: var(--silk-ease-out);
      }
      .tile:focus-visible {
        outline: 2px solid color-mix(in srgb, var(--silk-accent) 70%, transparent);
        outline-offset: 2px;
      }
      .tile:disabled {
        cursor: default;
      }
      /* On air = tinted surface + accent label. No edge strips, no glow. */
      .tile.active {
        color: var(--silk-accent);
        background: color-mix(in srgb, var(--silk-accent) 16%, transparent);
      }
      .tile.active .sname {
        color: var(--silk-accent);
      }
      .logo {
        flex: none;
        width: 28px;
        height: 28px;
        border-radius: 8px;
        object-fit: cover;
        display: block;
        pointer-events: none;
      }
      .glyph {
        flex: none;
        --mdc-icon-size: 22px;
        width: 28px;
        height: 28px;
        display: grid;
        place-items: center;
        pointer-events: none;
      }
      .sname {
        flex: 1;
        min-width: 0;
        font-size: 11px;
        font-weight: 500;
        line-height: 1.25;
        color: var(--primary-text-color);
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
        overflow: hidden;
        overflow-wrap: anywhere;
        transition: color 200ms ease;
      }
      .unavailable .grid {
        opacity: 0.45;
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    'silk-radio-card': SilkRadioCard;
  }
}
