import { LitElement, html, css, nothing, PropertyValues, TemplateResult } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { HomeAssistant, HassEntity, LovelaceCardConfig } from '../types';
import { silkControlStyles } from '../shared/base';
import {
  domainOf,
  isUnavailable,
  toggleEntity,
  moreInfo,
  haptic,
  stateText,
  supportsFeature,
} from '../shared/service';
import { accentFor } from '../shared/color';
import { registerEditor } from '../shared/editor';

export const META = {
  type: 'silk-channels-card',
  name: 'Silk Channels',
  description: 'Your channels, as buttons.',
};

/** MediaPlayerEntityFeature bits (HA core). */
const FEAT_TURN_ON = 128;
const FEAT_TURN_OFF = 256;

const MIN_CHANNELS = 1;
const MAX_CHANNELS = 24;
const OPTIMISTIC_TTL_MS = 2000;
/** Shorter texts match too loosely to trust for the "on now" highlight. */
const MIN_MATCH_CHARS = 3;

/** States where the player is actually showing something. */
const LIVE_STATES = new Set(['playing', 'paused', 'buffering', 'on', 'idle']);

/** One channel preset. Either `source` (select_source) or `media_id` is used. */
export interface SilkChannel {
  name: string;
  /** Printed on the tile, e.g. `11` or `11-1`. */
  number?: string | number;
  icon?: string;
  /** Channel logo; falls back to the icon, then to the name's initial. */
  image?: string;
  /** Source-list entry — selected with `select_source`. */
  source?: string;
  /** Played with `play_media` as `channel` content when there is no `source`. */
  media_id?: string;
}

export interface SilkChannelsCardConfig extends LovelaceCardConfig {
  entity: string;
  /** YAML-only: 1–24 presets. */
  channels: SilkChannel[];
  name?: string;
  /** Accent override. */
  color?: string;
}

const EDITOR_TAG = 'silk-channels-card-editor';

// `channels` is a list of objects, which ha-form cannot author — the editor
// covers the scalar options and the presets stay YAML, as on silk-radio.
registerEditor(
  EDITOR_TAG,
  [
    { name: 'entity', required: true, selector: { entity: { domain: ['media_player'] } } },
    { name: 'name', selector: { text: {} } },
    { name: 'color', selector: { ui_color: {} } },
  ],
  { entity: '엔티티', name: '이름', color: '강조 색상' }
);

const norm = (text: string): string => text.toLowerCase().replace(/\s+/g, ' ').trim();

/** A non-empty trimmed string, or undefined. */
function optionalText(value: unknown): string | undefined {
  if (typeof value === 'string' && value.trim() !== '') return value.trim();
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  return undefined;
}

/** Non-empty string attribute, else undefined. */
function stringAttr(stateObj: HassEntity, key: string): string | undefined {
  const value = stateObj.attributes[key];
  return typeof value === 'string' && value.trim() !== '' ? value : undefined;
}

/**
 * Channel presets for one media player: a grid of 72px tiles that each flip an
 * input (`source`) or start a channel (`media_id`). The channel on screen right
 * now reads as an accent-tinted surface — Silk state is surface, never a glow.
 */
@customElement('silk-channels-card')
export class SilkChannelsCard extends LitElement {
  @property({ attribute: false }) public hass?: HomeAssistant;

  @state() private _config?: SilkChannelsCardConfig;

  /** Optimistically selected channel index (null = trust the real state). */
  @state() private _optimisticIndex: number | null = null;

  /** Optimistic power flip (null = trust the real state). */
  @state() private _optimisticPower: boolean | null = null;

  /** Channel indices whose logo failed to load; they fall back to the glyph. */
  @state() private _brokenImages: Record<number, true> = {};

  /** last_updated snapshot at call time; any newer stamp clears the override. */
  private _optimisticBase = '';
  private _optimisticTimer?: number;

  public static getStubConfig(hass: HomeAssistant): Partial<SilkChannelsCardConfig> {
    const entity = Object.keys(hass.states).find((id) => id.startsWith('media_player.'));
    const sources = entity ? hass.states[entity].attributes.source_list : undefined;
    // Real inputs make the best preview; otherwise seed editable placeholders.
    const channels: SilkChannel[] =
      Array.isArray(sources) && sources.length
        ? sources
            .slice(0, 6)
            .map((source: unknown) => ({ name: String(source), source: String(source) }))
        : [
            { name: 'News', number: 11, media_id: '11' },
            { name: 'Sports', number: 24, media_id: '24' },
          ];
    return { type: 'custom:silk-channels-card', entity, channels };
  }

  public static async getConfigElement(): Promise<HTMLElement> {
    return document.createElement(EDITOR_TAG);
  }

  public setConfig(config: SilkChannelsCardConfig): void {
    if (!config.entity) {
      throw new Error('silk-channels-card: `entity` is required');
    }
    if (domainOf(config.entity) !== 'media_player') {
      throw new Error(
        `silk-channels-card: \`entity\` must be a media_player (got "${config.entity}")`
      );
    }
    if (!Array.isArray(config.channels)) {
      throw new Error(
        'silk-channels-card: `channels` is required — a list of {name, source or media_id}'
      );
    }
    if (config.channels.length < MIN_CHANNELS || config.channels.length > MAX_CHANNELS) {
      throw new Error(
        `silk-channels-card: list between ${MIN_CHANNELS} and ${MAX_CHANNELS} \`channels\` (got ${config.channels.length})`
      );
    }
    config.channels.forEach((channel, i) => {
      if (!channel || typeof channel !== 'object' || !optionalText(channel.name)) {
        throw new Error(`silk-channels-card: channel ${i + 1} needs a \`name\``);
      }
      if (!optionalText(channel.source) && !optionalText(channel.media_id)) {
        throw new Error(
          `silk-channels-card: channel "${channel.name}" needs a \`source\` or a \`media_id\``
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
    this._optimisticPower = null;
  }

  private _armOptimistic(stateObj: HassEntity): void {
    this._optimisticBase = stateObj.last_updated;
    window.clearTimeout(this._optimisticTimer);
    this._optimisticTimer = window.setTimeout(() => this._clearOptimistic(), OPTIMISTIC_TTL_MS);
  }

  /** Does the player's current programme look like this channel? */
  private _matches(channel: SilkChannel, stateObj: HassEntity): boolean {
    const attrs = stateObj.attributes;
    if (channel.source && attrs.source === channel.source) return true;
    if (channel.media_id && attrs.media_content_id === channel.media_id) return true;
    const number = optionalText(channel.number);
    const shown = stringAttr(stateObj, 'media_channel');
    if (number && shown && shown.trim() === number) return true;
    const name = norm(channel.name);
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

  /** Index of the channel on screen, or -1 — an optimistic pick wins. */
  private _currentIndex(stateObj: HassEntity): number {
    if (this._optimisticIndex !== null) return this._optimisticIndex;
    if (!LIVE_STATES.has(stateObj.state)) return -1;
    return (this._config?.channels ?? []).findIndex((channel) => this._matches(channel, stateObj));
  }

  private _onCardClick(): void {
    if (this._config) moreInfo(this, this._config.entity);
  }

  private _onImageError(index: number): void {
    this._brokenImages = { ...this._brokenImages, [index]: true };
  }

  private _onChannelClick(ev: Event, channel: SilkChannel, index: number): void {
    ev.stopPropagation();
    const config = this._config;
    const hass = this.hass;
    if (!config || !hass) return;
    const stateObj = hass.states[config.entity];
    if (!stateObj || isUnavailable(stateObj)) return;
    haptic(this);
    this._optimisticIndex = index;
    this._armOptimistic(stateObj);
    if (channel.source) {
      hass.callService('media_player', 'select_source', {
        entity_id: config.entity,
        source: channel.source,
      });
    } else if (channel.media_id) {
      hass.callService('media_player', 'play_media', {
        entity_id: config.entity,
        media_content_id: channel.media_id,
        media_content_type: 'channel',
      });
    }
  }

  private _onPowerClick(ev: Event): void {
    ev.stopPropagation();
    const config = this._config;
    const hass = this.hass;
    if (!config || !hass) return;
    const stateObj = hass.states[config.entity];
    if (!stateObj || isUnavailable(stateObj)) return;
    haptic(this);
    // Keep any live highlight; only the power state flips.
    this._optimisticIndex = this._currentIndex(stateObj);
    this._optimisticPower = stateObj.state === 'off';
    this._armOptimistic(stateObj);
    void toggleEntity(hass, config.entity);
  }

  private _renderChannel(
    channel: SilkChannel,
    index: number,
    active: boolean,
    disabled: boolean
  ): TemplateResult {
    const number = optionalText(channel.number);
    const image = channel.image && !this._brokenImages[index] ? channel.image : undefined;
    const initial = (Array.from(channel.name.trim())[0] ?? '?').toUpperCase();
    const label = number ? `${channel.name} · ${number}` : channel.name;
    return html`
      <button
        class="tile ${active ? 'active' : ''}"
        aria-pressed=${active ? 'true' : 'false'}
        aria-label=${label}
        title=${label}
        ?disabled=${disabled}
        @click=${(ev: Event) => this._onChannelClick(ev, channel, index)}
      >
        <span class="logo">
          ${image
            ? html`<img src=${image} alt="" @error=${() => this._onImageError(index)} />`
            : channel.icon
              ? html`<ha-icon .icon=${channel.icon}></ha-icon>`
              : html`<span class="initial">${initial}</span>`}
        </span>
        <span class="cname">${channel.name}</span>
        <span class="cnum">${number ?? ''}</span>
      </button>
    `;
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
    const powered = !unavailable && (this._optimisticPower ?? stateObj.state !== 'off');
    const nowLine = !powered
      ? stateText(hass, stateObj)
      : (current >= 0 ? config.channels[current].name : undefined) ??
        stringAttr(stateObj, 'media_channel') ??
        stringAttr(stateObj, 'media_title') ??
        stringAttr(stateObj, 'source') ??
        stateText(hass, stateObj);
    const canPower =
      supportsFeature(stateObj, FEAT_TURN_ON) || supportsFeature(stateObj, FEAT_TURN_OFF);

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
          ${canPower
            ? html`
                <button
                  class="power ${powered ? 'on' : ''}"
                  aria-label=${powered ? `Turn off ${name}` : `Turn on ${name}`}
                  ?disabled=${unavailable}
                  @click=${this._onPowerClick}
                >
                  <ha-icon icon="mdi:power"></ha-icon>
                </button>
              `
            : nothing}
        </div>
        <div class="grid">
          ${config.channels.map((channel, index) =>
            this._renderChannel(channel, index, index === current, unavailable)
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
      .power {
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
        color: var(--secondary-text-color);
        background: rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.06);
        transition:
          transform 250ms var(--silk-spring),
          background 200ms ease,
          color 200ms ease;
      }
      .power.on {
        color: var(--silk-accent);
        background: color-mix(in srgb, var(--silk-accent) 16%, transparent);
      }
      .power:active:not(:disabled) {
        transform: scale(0.92);
        transition-duration: 120ms;
        transition-timing-function: var(--silk-ease-out);
      }
      .power:focus-visible {
        outline: 2px solid color-mix(in srgb, var(--silk-accent) 70%, transparent);
        outline-offset: 2px;
      }
      .power:disabled {
        opacity: 0.4;
        cursor: default;
      }
      .power ha-icon {
        --mdc-icon-size: 20px;
        pointer-events: none;
      }
      .grid {
        flex: 1 1 auto;
        min-height: 0;
        overflow-y: auto;
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(72px, 1fr));
        align-content: start;
        gap: 8px;
        position: relative;
        z-index: 1;
      }
      .tile {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 3px;
        height: 72px;
        box-sizing: border-box;
        padding: 6px 5px;
        border: none;
        border-radius: 14px;
        cursor: pointer;
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
        transform: scale(0.94);
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
      /* On now = tinted surface + accent text. No edge strips, no glow. */
      .tile.active {
        color: var(--silk-accent);
        background: color-mix(in srgb, var(--silk-accent) 16%, transparent);
      }
      .tile.active .cname,
      .tile.active .cnum {
        color: var(--silk-accent);
      }
      .logo {
        flex: none;
        width: 28px;
        height: 28px;
        display: grid;
        place-items: center;
        pointer-events: none;
      }
      .logo img {
        width: 28px;
        height: 28px;
        border-radius: 8px;
        object-fit: cover;
        display: block;
      }
      .logo ha-icon {
        --mdc-icon-size: 22px;
        display: flex;
      }
      .initial {
        font-size: 16px;
        font-weight: 600;
        line-height: 1;
        letter-spacing: -0.01em;
        color: var(--primary-text-color);
        opacity: 0.75;
      }
      .cname {
        max-width: 100%;
        font-size: 10px;
        font-weight: 500;
        line-height: 1.2;
        color: var(--primary-text-color);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        transition: color 200ms ease;
      }
      .cnum {
        max-width: 100%;
        min-height: 11px;
        font-size: 9px;
        font-weight: 500;
        line-height: 1.2;
        color: var(--secondary-text-color);
        font-variant-numeric: tabular-nums;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
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
    'silk-channels-card': SilkChannelsCard;
  }
}
