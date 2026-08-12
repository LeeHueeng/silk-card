import { LitElement, html, css, nothing, PropertyValues, TemplateResult } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { HomeAssistant, HassEntity, LovelaceCardConfig } from '../types';
import { silkControlStyles } from '../shared/base';
import {
  domainOf,
  isActive,
  isUnavailable,
  moreInfo,
  haptic,
  stateText,
  supportsFeature,
  clamp,
} from '../shared/service';
import { accentFor } from '../shared/color';
import { registerEditor } from '../shared/editor';
import '../shared/slider';

export const META = {
  type: 'silk-media-card',
  name: 'Silk Media',
  description: 'Artwork-first now playing with honest controls.',
};

/** MediaPlayerEntityFeature bits (HA core). */
const FEAT_PAUSE = 1;
const FEAT_VOLUME_SET = 4;
const FEAT_PREVIOUS_TRACK = 16;
const FEAT_NEXT_TRACK = 32;
const FEAT_PLAY = 16384;

const OPTIMISTIC_TTL_MS = 2000;

interface SilkMediaCardConfig extends LovelaceCardConfig {
  entity: string;
  name?: string;
  icon?: string;
  color?: string;
  show_volume?: boolean;
}

const EDITOR_TAG = 'silk-media-card-editor';

registerEditor(
  EDITOR_TAG,
  [
    { name: 'entity', required: true, selector: { entity: { domain: ['media_player'] } } },
    { name: 'name', selector: { text: {} } },
    { name: 'icon', selector: { icon: {} } },
    { name: 'show_volume', selector: { boolean: {} } },
  ],
  {
    entity: 'Entity',
    name: 'Name',
    icon: 'Icon',
    show_volume: 'Show volume slider',
  },
  { show_volume: true }
);

/** Non-empty string attribute, else undefined. */
function stringAttr(stateObj: HassEntity, key: string): string | undefined {
  const value = stateObj.attributes[key];
  return typeof value === 'string' && value ? value : undefined;
}

@customElement('silk-media-card')
export class SilkMediaCard extends LitElement {
  @property({ attribute: false }) public hass?: HomeAssistant;

  @state() private _config?: SilkMediaCardConfig;

  /** Optimistic playing/paused flip while awaiting the real state. */
  @state() private _optimisticPlaying: boolean | null = null;

  /** Optimistic volume (%) briefly held after a slider release. */
  @state() private _optimisticVolume: number | null = null;

  private _expiryTimer?: number;
  private _lastUpdated?: string;

  public static getStubConfig(hass: HomeAssistant): Partial<SilkMediaCardConfig> {
    const entity = Object.keys(hass.states).find((id) => id.startsWith('media_player.'));
    return { type: 'custom:silk-media-card', entity };
  }

  public static async getConfigElement(): Promise<HTMLElement> {
    return document.createElement(EDITOR_TAG);
  }

  public setConfig(config: SilkMediaCardConfig): void {
    if (!config.entity || domainOf(config.entity) !== 'media_player') {
      throw new Error(
        'silk-media-card: define a media_player `entity` (e.g. media_player.living_room)'
      );
    }
    this._config = config;
    this._clearOptimistic();
    this._lastUpdated = undefined;
  }

  public getCardSize(): number {
    return this._showsVolume() ? 2 : 1;
  }

  public getGridOptions(): Record<string, number> {
    return { columns: 6, rows: this._showsVolume() ? 2 : 1, min_columns: 4, min_rows: 1 };
  }

  public disconnectedCallback(): void {
    super.disconnectedCallback();
    window.clearTimeout(this._expiryTimer);
    this._expiryTimer = undefined;
  }

  protected willUpdate(changed: PropertyValues): void {
    if (!changed.has('hass') || !this._config) return;
    const stamp = this.hass?.states[this._config.entity]?.last_updated;
    if (stamp === undefined || stamp === this._lastUpdated) return;
    const isFirst = this._lastUpdated === undefined;
    this._lastUpdated = stamp;
    // A real state update arrived: the optimistic overrides have done their job.
    if (!isFirst && this._expiryTimer !== undefined) this._clearOptimistic();
  }

  /** Volume row is shown unless disabled by config or unsupported by the entity. */
  private _showsVolume(): boolean {
    if (this._config?.show_volume === false) return false;
    const stateObj = this._config ? this.hass?.states[this._config.entity] : undefined;
    return stateObj ? supportsFeature(stateObj, FEAT_VOLUME_SET) : true;
  }

  private _clearOptimistic(): void {
    window.clearTimeout(this._expiryTimer);
    this._expiryTimer = undefined;
    this._optimisticPlaying = null;
    this._optimisticVolume = null;
  }

  private _armExpiry(): void {
    window.clearTimeout(this._expiryTimer);
    this._expiryTimer = window.setTimeout(() => {
      this._expiryTimer = undefined;
      this._optimisticPlaying = null;
      this._optimisticVolume = null;
    }, OPTIMISTIC_TTL_MS);
  }

  /** Artwork / icon = more-info; stop the card-level click from double-firing. */
  private _onLeadingClick(ev: Event): void {
    ev.stopPropagation();
    if (this._config) moreInfo(this, this._config.entity);
  }

  private _onCardClick(): void {
    if (this._config) moreInfo(this, this._config.entity);
  }

  /** The synthetic click after a slider drag must not open more-info. */
  private _stopClick(ev: Event): void {
    ev.stopPropagation();
  }

  private _onPlayPause(ev: Event): void {
    ev.stopPropagation();
    if (!this.hass || !this._config) return;
    const stateObj = this.hass.states[this._config.entity];
    if (!stateObj || isUnavailable(stateObj)) return;
    const playing = this._optimisticPlaying ?? stateObj.state === 'playing';
    this._optimisticPlaying = !playing;
    this._armExpiry();
    this.hass.callService('media_player', 'media_play_pause', {
      entity_id: this._config.entity,
    });
    haptic(this);
  }

  private _onSkip(ev: Event, service: 'media_previous_track' | 'media_next_track'): void {
    ev.stopPropagation();
    if (!this.hass || !this._config) return;
    if (isUnavailable(this.hass.states[this._config.entity])) return;
    this.hass.callService('media_player', service, { entity_id: this._config.entity });
    haptic(this);
  }

  private _onVolumeChange(ev: CustomEvent<{ value: number }>): void {
    if (!this.hass || !this._config) return;
    const pct = clamp(Math.round(ev.detail.value), 0, 100);
    this._optimisticVolume = pct;
    this._armExpiry();
    this.hass.callService('media_player', 'volume_set', {
      entity_id: this._config.entity,
      volume_level: pct / 100,
    });
    haptic(this);
  }

  /** Volume % to display: optimistic first, else derived from the entity. */
  private _volumePct(stateObj: HassEntity): number {
    if (this._optimisticVolume !== null) return this._optimisticVolume;
    const level = stateObj.attributes.volume_level;
    return typeof level === 'number' && Number.isFinite(level)
      ? Math.round(clamp(level, 0, 1) * 100)
      : 0;
  }

  protected render(): TemplateResult | typeof nothing {
    if (!this.hass || !this._config) return nothing;
    const stateObj = this.hass.states[this._config.entity];
    if (!stateObj) {
      return html`<ha-card><div class="warning">Entity not found: ${this._config.entity}</div></ha-card>`;
    }

    const unavailable = isUnavailable(stateObj);
    const active = isActive(stateObj);
    const accent = accentFor(stateObj, this._config.color);
    const picture = unavailable ? undefined : stringAttr(stateObj, 'entity_picture');
    const name =
      stringAttr(stateObj, 'media_title') ??
      this._config.name ??
      stateObj.attributes.friendly_name ??
      stateObj.entity_id;
    const actualPlaying = stateObj.state === 'playing';
    const playing = unavailable ? false : (this._optimisticPlaying ?? actualPlaying);
    // Artist when we have one; otherwise localized state text — swapped for a
    // plain Playing/Paused only during the brief optimistic window they differ.
    const line2 =
      stringAttr(stateObj, 'media_artist') ??
      (unavailable || playing === actualPlaying
        ? stateText(this.hass, stateObj)
        : playing
          ? 'Playing'
          : 'Paused');
    const showVolume = this._config.show_volume !== false && supportsFeature(stateObj, FEAT_VOLUME_SET);

    return html`
      <ha-card
        class="control ${unavailable ? 'unavailable' : ''}"
        style="--silk-accent:${accent}"
        @click=${this._onCardClick}
      >
        <div class="row">
          ${picture
            ? html`
                <button class="artwork" aria-label="Show details for ${name}" @click=${this._onLeadingClick}>
                  <img src=${picture} alt="" />
                </button>
              `
            : html`
                <button
                  class="icon ${active ? 'on' : ''}"
                  aria-label="Show details for ${name}"
                  @click=${this._onLeadingClick}
                >
                  ${this._config.icon
                    ? html`<ha-icon .icon=${this._config.icon}></ha-icon>`
                    : html`<ha-state-icon .hass=${this.hass} .stateObj=${stateObj}></ha-state-icon>`}
                </button>
              `}
          <div class="info">
            <div class="name">${name}</div>
            <div class="state">${line2}</div>
          </div>
          ${this._renderControls(stateObj, unavailable, playing)}
        </div>
        ${showVolume
          ? html`
              <silk-slider
                class="volume"
                .value=${this._volumePct(stateObj)}
                .min=${0}
                .max=${100}
                .step=${1}
                ?disabled=${unavailable}
                @change=${this._onVolumeChange}
                @click=${this._stopClick}
              ></silk-slider>
            `
          : nothing}
      </ha-card>
    `;
  }

  private _renderControls(
    stateObj: HassEntity,
    unavailable: boolean,
    playing: boolean
  ): TemplateResult | typeof nothing {
    const canPrev = supportsFeature(stateObj, FEAT_PREVIOUS_TRACK);
    const canPlayPause =
      supportsFeature(stateObj, FEAT_PAUSE) || supportsFeature(stateObj, FEAT_PLAY);
    const canNext = supportsFeature(stateObj, FEAT_NEXT_TRACK);
    if (!canPrev && !canPlayPause && !canNext) return nothing;
    return html`
      <div class="trailing">
        ${canPrev
          ? html`
              <button
                class="ctl"
                ?disabled=${unavailable}
                aria-label="Previous track"
                @click=${(ev: Event) => this._onSkip(ev, 'media_previous_track')}
              >
                <ha-icon icon="mdi:skip-previous"></ha-icon>
              </button>
            `
          : nothing}
        ${canPlayPause
          ? html`
              <button
                class="ctl"
                ?disabled=${unavailable}
                aria-label=${playing ? 'Pause' : 'Play'}
                @click=${this._onPlayPause}
              >
                <ha-icon icon=${playing ? 'mdi:pause' : 'mdi:play'}></ha-icon>
              </button>
            `
          : nothing}
        ${canNext
          ? html`
              <button
                class="ctl"
                ?disabled=${unavailable}
                aria-label="Next track"
                @click=${(ev: Event) => this._onSkip(ev, 'media_next_track')}
              >
                <ha-icon icon="mdi:skip-next"></ha-icon>
              </button>
            `
          : nothing}
      </div>
    `;
  }

  static styles = [
    silkControlStyles,
    css`
      /* Two stacked rows instead of the base single-row layout. */
      ha-card {
        flex-direction: column;
        align-items: stretch;
        justify-content: center;
        gap: 10px;
      }
      .row {
        display: flex;
        align-items: center;
        gap: 12px;
        min-width: 0;
      }
      .artwork {
        flex: none;
        width: 42px;
        height: 42px;
        border: none;
        border-radius: 14px;
        padding: 0;
        overflow: hidden;
        cursor: pointer;
        position: relative;
        z-index: 1;
        background: rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.06);
        transition: transform 250ms var(--silk-spring);
      }
      .artwork:active {
        transform: scale(0.94);
        transition-duration: 120ms;
        transition-timing-function: var(--silk-ease-out);
      }
      .artwork img {
        width: 100%;
        height: 100%;
        object-fit: cover;
        display: block;
        pointer-events: none;
      }
      .ctl {
        width: 36px;
        height: 36px;
        border: none;
        border-radius: 12px;
        display: grid;
        place-items: center;
        padding: 0;
        cursor: pointer;
        color: var(--secondary-text-color);
        background: rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.06);
        transition:
          transform 250ms var(--silk-spring),
          background 200ms ease,
          color 200ms ease,
          opacity 200ms ease;
      }
      .ctl:active:not(:disabled) {
        transform: scale(0.92);
        transition-duration: 120ms;
        transition-timing-function: var(--silk-ease-out);
      }
      .ctl:hover:not(:disabled) {
        background: rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.12);
      }
      .ctl:disabled {
        opacity: 0.35;
        cursor: default;
      }
      .ctl ha-icon {
        --mdc-icon-size: 20px;
        pointer-events: none;
      }
      silk-slider.volume {
        --silk-slider-height: 30px;
        position: relative;
        z-index: 1;
      }
      .unavailable .artwork,
      .unavailable .volume {
        opacity: 0.45;
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    'silk-media-card': SilkMediaCard;
  }
}
