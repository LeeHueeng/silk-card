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
  clamp,
} from '../shared/service';
import { accentFor } from '../shared/color';
import { registerEditor } from '../shared/editor';

export const META = {
  type: 'silk-now-playing-card',
  name: 'Silk Now Playing',
  description: 'Album art, front and center.',
};

/** MediaPlayerEntityFeature bits (HA core). */
const FEAT_PAUSE = 1;
const FEAT_SEEK = 2;
const FEAT_PREVIOUS_TRACK = 16;
const FEAT_NEXT_TRACK = 32;
const FEAT_PLAY = 16384;

const OPTIMISTIC_TTL_MS = 2000;
const TICK_MS = 1000;
/** Arrow-key seek step on the focused progress track. */
const KEY_STEP_S = 10;

/** Nothing on the deck — the card shows its idle face. */
const IDLE_STATES = new Set(['off', 'idle', 'standby', 'unknown', 'unavailable', '']);

export interface SilkNowPlayingCardConfig extends LovelaceCardConfig {
  entity: string;
  name?: string;
  /** Accent override (used by the no-artwork face). */
  color?: string;
}

const EDITOR_TAG = 'silk-now-playing-card-editor';

registerEditor(
  EDITOR_TAG,
  [
    { name: 'entity', required: true, selector: { entity: { domain: ['media_player'] } } },
    { name: 'name', selector: { text: {} } },
    { name: 'color', selector: { ui_color: {} } },
  ],
  { entity: '엔티티', name: '이름', color: '강조 색상' }
);

/** Non-empty string attribute, else undefined. */
function stringAttr(stateObj: HassEntity, key: string): string | undefined {
  const value = stateObj.attributes[key];
  return typeof value === 'string' && value ? value : undefined;
}

/** Finite number attribute, else undefined. */
function numberAttr(stateObj: HassEntity, key: string): number | undefined {
  const value = stateObj.attributes[key];
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

/** m:ss under an hour, h:mm:ss beyond. */
function formatClock(seconds: number): string {
  const total = Math.max(0, Math.floor(seconds));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const two = (n: number): string => String(n).padStart(2, '0');
  return h > 0 ? `${h}:${two(m)}:${two(total % 60)}` : `${m}:${two(total % 60)}`;
}

/**
 * Hero media card: the artwork IS the card. Everything else — title, artist,
 * a locally-ticking progress line and the transport row — sits in white over a
 * bottom scrim, which exists to keep text legible on a photograph (the one
 * gradient Silk allows). Without artwork the same layout runs on a neutral
 * surface with the domain icon as a 12% watermark, and the text falls back to
 * theme tokens so it stays readable in a light theme.
 */
@customElement('silk-now-playing-card')
export class SilkNowPlayingCard extends LitElement {
  @property({ attribute: false }) public hass?: HomeAssistant;

  @state() private _config?: SilkNowPlayingCardConfig;

  /** Render clock — bumped by the 1s tick so the progress line advances. */
  @state() private _now = Date.now();

  /** Optimistic play/pause flip (null = trust the real state). */
  @state() private _optimisticPlaying: boolean | null = null;

  /** Optimistic seek target in seconds (null = derive from attributes). */
  @state() private _optimisticSeek: number | null = null;

  /** Suppresses the 1s width glide for the frame a seek lands on. */
  @state() private _snap = false;

  /** Artwork URL that failed to load; a new URL retries. */
  @state() private _brokenArt?: string;

  /** Wall clock when the optimistic override was taken. */
  private _optimisticAt = 0;
  /** last_updated snapshot at call time; any newer stamp clears the override. */
  private _optimisticBase = '';
  private _optimisticTimer?: number;
  private _tick?: number;

  public static getStubConfig(hass: HomeAssistant): Partial<SilkNowPlayingCardConfig> {
    const ids = Object.keys(hass.states).filter((id) => id.startsWith('media_player.'));
    const entity = ids.find((id) => hass.states[id].attributes.entity_picture) ?? ids[0];
    return { type: 'custom:silk-now-playing-card', entity };
  }

  public static async getConfigElement(): Promise<HTMLElement> {
    return document.createElement(EDITOR_TAG);
  }

  public setConfig(config: SilkNowPlayingCardConfig): void {
    if (!config.entity) {
      throw new Error('silk-now-playing-card: `entity` is required');
    }
    if (domainOf(config.entity) !== 'media_player') {
      throw new Error(
        `silk-now-playing-card: \`entity\` must be a media_player (got "${config.entity}")`
      );
    }
    this._config = config;
    this._brokenArt = undefined;
    this._clearOptimistic();
  }

  public getCardSize(): number {
    return 4;
  }

  public getGridOptions(): Record<string, number> {
    return { columns: 6, rows: 4, min_columns: 4, min_rows: 3 };
  }

  public connectedCallback(): void {
    super.connectedCallback();
    // Nudge an update so `updated()` restarts the tick after a reconnect.
    this._now = Date.now();
  }

  public disconnectedCallback(): void {
    super.disconnectedCallback();
    window.clearInterval(this._tick);
    this._tick = undefined;
    window.clearTimeout(this._optimisticTimer);
    this._optimisticTimer = undefined;
  }

  protected willUpdate(changed: PropertyValues): void {
    if (!changed.has('hass')) return;
    // Fresh clock for renders triggered by state pushes (Lit folds state set in
    // willUpdate into the same update, so this costs no extra cycle).
    this._now = Date.now();
    if (this._optimisticTimer === undefined || !this._config) return;
    const stamp = this.hass?.states[this._config.entity]?.last_updated;
    if (stamp !== undefined && stamp !== this._optimisticBase) this._clearOptimistic();
  }

  protected updated(): void {
    const stateObj = this._config ? this.hass?.states[this._config.entity] : undefined;
    const running =
      this.isConnected &&
      !!stateObj &&
      !isUnavailable(stateObj) &&
      this._isPlaying(stateObj) &&
      this._duration(stateObj) > 0;
    if (running && this._tick === undefined) {
      this._tick = window.setInterval(() => {
        this._now = Date.now();
      }, TICK_MS);
    } else if (!running && this._tick !== undefined) {
      window.clearInterval(this._tick);
      this._tick = undefined;
    }
  }

  private _clearOptimistic(): void {
    window.clearTimeout(this._optimisticTimer);
    this._optimisticTimer = undefined;
    this._optimisticPlaying = null;
    this._optimisticSeek = null;
  }

  private _armOptimistic(stateObj: HassEntity): void {
    this._optimisticAt = Date.now();
    this._optimisticBase = stateObj.last_updated;
    window.clearTimeout(this._optimisticTimer);
    this._optimisticTimer = window.setTimeout(() => this._clearOptimistic(), OPTIMISTIC_TTL_MS);
  }

  private _isPlaying(stateObj: HassEntity): boolean {
    return this._optimisticPlaying ?? stateObj.state === 'playing';
  }

  private _duration(stateObj: HassEntity): number {
    return numberAttr(stateObj, 'media_duration') ?? 0;
  }

  /**
   * Elapsed seconds right now. HA reports `media_position` as of
   * `media_position_updated_at`, so playback is extrapolated locally; an
   * optimistic pause freezes at the moment of the tap and an optimistic resume
   * counts from it.
   */
  private _position(stateObj: HassEntity, duration: number): number {
    if (this._optimisticSeek !== null) {
      const drift = this._isPlaying(stateObj) ? (this._now - this._optimisticAt) / 1000 : 0;
      return clamp(this._optimisticSeek + drift, 0, duration);
    }
    const base = numberAttr(stateObj, 'media_position') ?? 0;
    const stamp = Date.parse(stateObj.attributes.media_position_updated_at ?? '');
    const frozenAt = this._optimisticPlaying === null ? this._now : this._optimisticAt;
    let position = base;
    if (stateObj.state === 'playing' && Number.isFinite(stamp)) {
      position += (frozenAt - stamp) / 1000;
    }
    if (this._optimisticPlaying === true) position += (this._now - this._optimisticAt) / 1000;
    return clamp(position, 0, duration);
  }

  private _onCardClick(): void {
    if (this._config) moreInfo(this, this._config.entity);
  }

  private _onArtError(ev: Event): void {
    const img = ev.currentTarget as HTMLImageElement | null;
    this._brokenArt = img?.getAttribute('src') ?? undefined;
  }

  private _onPlayPause(ev: Event): void {
    ev.stopPropagation();
    const config = this._config;
    const hass = this.hass;
    if (!config || !hass) return;
    const stateObj = hass.states[config.entity];
    if (!stateObj || isUnavailable(stateObj)) return;
    haptic(this);
    this._now = Date.now(); // the tick may be up to a second stale
    const playing = this._isPlaying(stateObj);
    // Freeze the elapsed reading at the tap so the label cannot drift while the
    // real state is in flight.
    this._optimisticSeek = this._position(stateObj, this._duration(stateObj));
    this._optimisticPlaying = !playing;
    this._armOptimistic(stateObj);
    hass.callService('media_player', 'media_play_pause', { entity_id: config.entity });
  }

  private _onSkip(ev: Event, service: 'media_previous_track' | 'media_next_track'): void {
    ev.stopPropagation();
    const config = this._config;
    const hass = this.hass;
    if (!config || !hass) return;
    const stateObj = hass.states[config.entity];
    if (!stateObj || isUnavailable(stateObj)) return;
    haptic(this);
    hass.callService('media_player', service, { entity_id: config.entity });
  }

  private _seekTo(stateObj: HassEntity, seconds: number, duration: number): void {
    const config = this._config;
    const hass = this.hass;
    if (!config || !hass) return;
    const target = clamp(Math.round(seconds), 0, Math.floor(duration));
    haptic(this);
    this._optimisticSeek = target;
    this._armOptimistic(stateObj);
    // The fill must jump to the tapped spot, not glide there over a second.
    this._snap = true;
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        this._snap = false;
      });
    });
    hass.callService('media_player', 'media_seek', {
      entity_id: config.entity,
      seek_position: target,
    });
  }

  private _onTrackClick(ev: MouseEvent, stateObj: HassEntity, duration: number): void {
    ev.stopPropagation();
    const rect = (ev.currentTarget as HTMLElement).getBoundingClientRect();
    if (!rect.width) return;
    const fraction = clamp((ev.clientX - rect.left) / rect.width, 0, 1);
    this._seekTo(stateObj, fraction * duration, duration);
  }

  private _onTrackKeydown(ev: KeyboardEvent, stateObj: HassEntity, duration: number): void {
    const step = ev.key === 'ArrowRight' ? KEY_STEP_S : ev.key === 'ArrowLeft' ? -KEY_STEP_S : 0;
    if (step === 0) return;
    ev.stopPropagation();
    ev.preventDefault();
    this._now = Date.now(); // the tick may be up to a second stale
    this._seekTo(stateObj, this._position(stateObj, duration) + step, duration);
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
    const idle = IDLE_STATES.has(stateObj.state);
    const accent = accentFor(stateObj, config.color);
    const playerName = config.name ?? stateObj.attributes.friendly_name ?? config.entity;
    const picture = idle ? undefined : stringAttr(stateObj, 'entity_picture');
    const art = picture && picture !== this._brokenArt ? picture : undefined;

    const mediaTitle = idle ? undefined : stringAttr(stateObj, 'media_title');
    const title = idle ? 'Nothing playing' : (mediaTitle ?? playerName);
    // Second line never echoes the first: when the title already fell back to
    // the player name, the state text carries the line instead.
    const subtitle = idle
      ? playerName
      : (stringAttr(stateObj, 'media_artist') ??
        stringAttr(stateObj, 'media_series_title') ??
        stringAttr(stateObj, 'media_album_name') ??
        stringAttr(stateObj, 'app_name') ??
        (mediaTitle ? playerName : stateText(hass, stateObj)));

    const duration = idle ? 0 : this._duration(stateObj);

    return html`
      <ha-card
        class="np ${art ? 'photo' : ''} ${unavailable ? 'unavailable' : ''}"
        style="--silk-accent:${accent}"
        @click=${this._onCardClick}
      >
        ${art
          ? html`
              <img class="art" src=${art} alt="" @error=${this._onArtError} />
              <div class="scrim" aria-hidden="true"></div>
            `
          : html`
              <div class="ground" aria-hidden="true">
                <ha-state-icon .hass=${hass} .stateObj=${stateObj}></ha-state-icon>
              </div>
            `}
        <div class="content">
          <div class="title" title=${title}>${title}</div>
          <div class="sub" title=${subtitle}>${subtitle}</div>
          ${duration > 0 ? this._renderProgress(stateObj, duration, unavailable) : nothing}
          ${this._renderControls(stateObj, unavailable)}
        </div>
      </ha-card>
    `;
  }

  private _renderProgress(
    stateObj: HassEntity,
    duration: number,
    unavailable: boolean
  ): TemplateResult {
    const position = this._position(stateObj, duration);
    const pct = clamp((position / duration) * 100, 0, 100);
    const seekable = !unavailable && supportsFeature(stateObj, FEAT_SEEK);
    // A 1s linear glide matches the tick cadence; anything else must snap.
    const glide = this._isPlaying(stateObj) && !this._snap;
    return html`
      <div class="prog">
        <span class="time">${formatClock(position)}</span>
        <div
          class="track ${seekable ? 'seekable' : ''}"
          role=${seekable ? 'slider' : 'progressbar'}
          aria-label="Playback position"
          aria-valuemin="0"
          aria-valuemax=${Math.floor(duration)}
          aria-valuenow=${Math.floor(position)}
          aria-valuetext=${`${formatClock(position)} of ${formatClock(duration)}`}
          tabindex=${seekable ? 0 : -1}
          @click=${seekable
            ? (ev: MouseEvent) => this._onTrackClick(ev, stateObj, duration)
            : nothing}
          @keydown=${seekable
            ? (ev: KeyboardEvent) => this._onTrackKeydown(ev, stateObj, duration)
            : nothing}
        >
          <div class="fill ${glide ? 'glide' : ''}" style="width:${pct.toFixed(2)}%"></div>
        </div>
        <span class="time">${formatClock(duration)}</span>
      </div>
    `;
  }

  private _renderControls(stateObj: HassEntity, unavailable: boolean): TemplateResult | typeof nothing {
    const canPrev = supportsFeature(stateObj, FEAT_PREVIOUS_TRACK);
    const canNext = supportsFeature(stateObj, FEAT_NEXT_TRACK);
    const canPlayPause =
      supportsFeature(stateObj, FEAT_PAUSE) || supportsFeature(stateObj, FEAT_PLAY);
    if (!canPrev && !canNext && !canPlayPause) return nothing;
    const playing = !unavailable && this._isPlaying(stateObj);
    return html`
      <div class="controls">
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
                class="hero"
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
      /* Full-bleed artwork card: drop the base row layout and padding. The
         aspect-ratio only applies where the layout gives no definite height
         (masonry); in grid sections the assigned rows win. */
      ha-card {
        display: block;
        padding: 0;
        aspect-ratio: 4 / 3;
        min-height: 168px;
        /* Ink tokens: theme text on the neutral face, white over a photograph. */
        --np-fg: var(--primary-text-color);
        --np-dim: var(--secondary-text-color);
        --np-track: rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.16);
        --np-fill: var(--silk-accent);
        --np-ctl: var(--secondary-text-color);
        --np-hero-bg: var(--silk-accent);
        --np-hero-fg: var(--card-background-color, #fff);
      }
      /* Dark ground under the artwork so white text is legible from the first
         frame, before the image has decoded. */
      ha-card.photo {
        background-color: #14161a;
        --np-fg: #fff;
        --np-dim: rgba(255, 255, 255, 0.8);
        --np-track: rgba(255, 255, 255, 0.25);
        --np-fill: rgba(255, 255, 255, 0.7);
        --np-ctl: rgba(255, 255, 255, 0.92);
        --np-hero-bg: #fff;
        --np-hero-fg: #101114;
      }
      .art {
        position: absolute;
        inset: 0;
        width: 100%;
        height: 100%;
        object-fit: cover;
        display: block;
      }
      /* Photo-legibility scrim (allowed: it serves the image, not chrome). */
      .scrim {
        position: absolute;
        inset: 0;
        background: linear-gradient(transparent, rgba(0, 0, 0, 0.75));
        pointer-events: none;
      }
      .ground {
        position: absolute;
        inset: 0;
        display: grid;
        place-items: center;
        background: rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.05);
      }
      .ground ha-state-icon {
        --mdc-icon-size: 96px;
        color: var(--primary-text-color);
        opacity: 0.12;
      }
      .content {
        position: absolute;
        left: 0;
        right: 0;
        bottom: 0;
        padding: 14px;
        box-sizing: border-box;
        display: flex;
        flex-direction: column;
        gap: 2px;
        min-width: 0;
      }
      .title {
        font-size: 17px;
        font-weight: 600;
        line-height: 1.3;
        letter-spacing: -0.01em;
        color: var(--np-fg);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .sub {
        font-size: 13px;
        line-height: 1.3;
        color: var(--np-dim);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .prog {
        display: flex;
        align-items: center;
        gap: 8px;
        margin-top: 10px;
        min-width: 0;
      }
      .time {
        flex: none;
        font-size: 10px;
        line-height: 1;
        color: var(--np-dim);
        font-variant-numeric: tabular-nums;
      }
      .track {
        position: relative;
        flex: 1;
        min-width: 0;
        height: 2px;
        border-radius: 999px;
        background: var(--np-track);
        overflow: visible;
      }
      /* Invisible halo turns the 2px line into a real touch target. */
      .track.seekable {
        cursor: pointer;
      }
      .track.seekable::after {
        content: '';
        position: absolute;
        inset: -12px 0;
      }
      .track:focus-visible {
        outline: 2px solid var(--np-fg);
        outline-offset: 4px;
        border-radius: 999px;
      }
      .fill {
        position: absolute;
        inset: 0 auto 0 0;
        border-radius: 999px;
        background: var(--np-fill);
        pointer-events: none;
      }
      .fill.glide {
        transition: width 1000ms linear;
      }
      .controls {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 14px;
        margin-top: 12px;
      }
      .ctl {
        flex: none;
        width: 42px;
        height: 42px;
        border: none;
        border-radius: 50%;
        display: grid;
        place-items: center;
        padding: 0;
        cursor: pointer;
        background: transparent;
        color: var(--np-ctl);
        transition:
          transform 250ms var(--silk-spring),
          opacity 200ms ease;
      }
      .ctl:active:not(:disabled) {
        transform: scale(0.9);
        transition-duration: 120ms;
        transition-timing-function: var(--silk-ease-out);
      }
      .ctl ha-icon {
        --mdc-icon-size: 26px;
        pointer-events: none;
      }
      .hero {
        flex: none;
        width: 48px;
        height: 48px;
        border: none;
        border-radius: 50%;
        display: grid;
        place-items: center;
        padding: 0;
        cursor: pointer;
        background: var(--np-hero-bg);
        color: var(--np-hero-fg);
        transition:
          transform 250ms var(--silk-spring),
          background 200ms ease,
          opacity 200ms ease;
      }
      .hero:active:not(:disabled) {
        transform: scale(0.92);
        transition-duration: 120ms;
        transition-timing-function: var(--silk-ease-out);
      }
      .hero ha-icon {
        --mdc-icon-size: 26px;
        pointer-events: none;
      }
      .ctl:focus-visible,
      .hero:focus-visible {
        outline: 2px solid var(--np-fg);
        outline-offset: 2px;
      }
      .ctl:disabled,
      .hero:disabled {
        opacity: 0.4;
        cursor: default;
      }
      .unavailable .content,
      .unavailable .ground {
        opacity: 0.45;
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    'silk-now-playing-card': SilkNowPlayingCard;
  }
}
