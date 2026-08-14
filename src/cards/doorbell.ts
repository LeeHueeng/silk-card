import { LitElement, html, css, nothing, PropertyValues, TemplateResult } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { HomeAssistant, HassEntity, LovelaceCardConfig } from '../types';
import { silkControlStyles } from '../shared/base';
import {
  domainOf,
  isActive,
  isUnavailable,
  toggleEntity,
  moreInfo,
  haptic,
} from '../shared/service';
import { accentFor } from '../shared/color';
import { registerEditor } from '../shared/editor';

export const META = {
  type: 'silk-doorbell-card',
  name: 'Silk Doorbell',
  description: 'Who rang, and when.',
};

export interface SilkDoorbellCardConfig extends LovelaceCardConfig {
  /** Camera entity for the snapshot — the one required key. */
  camera: string;
  /** The bell itself: a binary_sensor or an event entity. */
  ring?: string;
  /** A `lock.*` entity; unlocking is hold-to-confirm. */
  unlock?: string;
  /** Porch light, toggled from the chip row. */
  light?: string;
  /** Chime/siren/script/button — the chip presses it. */
  chime?: string;
  /** How long a ring counts as recent, in minutes (default 5). */
  recent_minutes?: number;
  name?: string;
  /** Accent override. */
  color?: string;
}

const DEFAULT_RECENT_MIN = 5;
/** How long the card wears its accent outline after a ring. */
const FLASH_MS = 60_000;
const MINUTE_MS = 60_000;
const HOLD_MS = 1200;
const OPTIMISTIC_TTL_MS = 2000;

const EDITOR_TAG = 'silk-doorbell-card-editor';

registerEditor(
  EDITOR_TAG,
  [
    { name: 'camera', required: true, selector: { entity: { domain: ['camera'] } } },
    { name: 'name', selector: { text: {} } },
    {
      name: '',
      type: 'grid',
      schema: [
        { name: 'ring', selector: { entity: { domain: ['binary_sensor', 'event'] } } },
        { name: 'unlock', selector: { entity: { domain: ['lock'] } } },
        { name: 'light', selector: { entity: { domain: ['light', 'switch'] } } },
        {
          name: 'chime',
          selector: { entity: { domain: ['switch', 'script', 'button', 'siren', 'input_button'] } },
        },
      ],
    },
    {
      name: '',
      type: 'grid',
      schema: [
        {
          name: 'recent_minutes',
          selector: { number: { min: 1, max: 120, step: 1, mode: 'box' } },
        },
        { name: 'color', selector: { ui_color: {} } },
      ],
    },
  ],
  {
    camera: '카메라',
    name: '이름',
    ring: '초인종 센서',
    unlock: '잠금 장치',
    light: '현관 조명',
    chime: '차임/사이렌',
    recent_minutes: '최근으로 볼 시간 (분)',
    color: '강조 색상',
  },
  { recent_minutes: DEFAULT_RECENT_MIN }
);

/**
 * The doorbell answer card: a face, a time, and the three things you actually
 * do next. A fresh ring outlines the whole card for a minute so it is the
 * loudest thing on the dashboard exactly while that matters, then lets go.
 */
@customElement('silk-doorbell-card')
export class SilkDoorbellCard extends LitElement {
  @property({ attribute: false }) public hass?: HomeAssistant;

  @state() private _config?: SilkDoorbellCardConfig;

  /** Wall clock, advanced by the tick scheduler so "4 minutes ago" stays true. */
  @state() private _now = Date.now();

  /** Cache-buster for the snapshot; bumped on a new ring and on tab return. */
  @state() private _counter = 0;

  @state() private _broken = false;

  /** Optimistic lock state ('locking' | 'unlocking'); null = trust HA. */
  @state() private _lockOptimistic: string | null = null;

  /** 0..1 fill of the hold-to-unlock chip, driven by rAF. */
  @state() private _holdProgress = 0;

  @state() private _holding = false;

  private _tickTimer?: number;
  private _lockBase = '';
  private _lockTimer?: number;
  private _holdRaf?: number;
  private _holdStart = 0;
  /** Timestamp of a completed hold, so the trailing click doesn't re-fire. */
  private _completedAt = 0;
  /** Last seen ring stamp, to notice a new ring. */
  private _lastRing: number | null = null;

  private readonly _onVisibility = (): void => {
    if (!document.hidden) {
      this._counter++;
      this._broken = false;
      this._now = Date.now();
      this._scheduleTick();
    }
  };

  public static getStubConfig(hass: HomeAssistant): Partial<SilkDoorbellCardConfig> {
    const ids = Object.keys(hass.states);
    const camera =
      ids.find((id) => id.startsWith('camera.') && /door|bell|porch|entry/i.test(id)) ??
      ids.find((id) => id.startsWith('camera.'));
    const ring =
      ids.find((id) => id.startsWith('event.') && /door|bell/i.test(id)) ??
      ids.find((id) => id.startsWith('binary_sensor.') && /door.?bell|ring/i.test(id));
    return {
      type: 'custom:silk-doorbell-card',
      camera,
      ring,
      unlock: ids.find((id) => id.startsWith('lock.')),
    };
  }

  public static async getConfigElement(): Promise<HTMLElement> {
    return document.createElement(EDITOR_TAG);
  }

  public setConfig(config: SilkDoorbellCardConfig): void {
    if (!config.camera || domainOf(config.camera) !== 'camera') {
      throw new Error('silk-doorbell-card: `camera` is required (e.g. camera.front_door)');
    }
    if (config.unlock !== undefined && domainOf(config.unlock) !== 'lock') {
      throw new Error('silk-doorbell-card: `unlock` must be a lock entity');
    }
    if (config.recent_minutes !== undefined && !(Number(config.recent_minutes) > 0)) {
      throw new Error('silk-doorbell-card: `recent_minutes` must be a positive number of minutes');
    }
    this._config = config;
    this._broken = false;
    this._lastRing = null;
    this._clearLockOptimistic();
  }

  public getCardSize(): number {
    return 4;
  }

  public getGridOptions(): Record<string, number> {
    return { columns: 6, rows: 4, min_columns: 4, min_rows: 3 };
  }

  public connectedCallback(): void {
    super.connectedCallback();
    document.addEventListener('visibilitychange', this._onVisibility);
    this._now = Date.now();
    this._scheduleTick();
  }

  public disconnectedCallback(): void {
    super.disconnectedCallback();
    document.removeEventListener('visibilitychange', this._onVisibility);
    window.clearTimeout(this._tickTimer);
    this._tickTimer = undefined;
    window.clearTimeout(this._lockTimer);
    this._lockTimer = undefined;
    if (this._holdRaf !== undefined) cancelAnimationFrame(this._holdRaf);
    this._holdRaf = undefined;
    this._holding = false;
    this._holdProgress = 0;
  }

  protected willUpdate(changed: PropertyValues): void {
    if (!changed.has('hass') || !this._config) return;
    // A new ring: freshen the snapshot and re-arm the outline timer.
    const ring = this._ringMs();
    if (ring !== this._lastRing) {
      const first = this._lastRing === null;
      this._lastRing = ring;
      this._now = Date.now();
      if (!first && ring !== null) {
        this._counter++;
        this._broken = false;
      }
      this._scheduleTick();
    }
    if (this._lockOptimistic !== null && this._config.unlock) {
      const stateObj = this.hass?.states[this._config.unlock];
      if (stateObj && stateObj.last_updated !== this._lockBase) this._clearLockOptimistic();
    }
  }

  /**
   * Wake exactly when the display would go stale: at the 60s mark while the
   * outline is up, on the minute boundary otherwise. One timeout, no polling.
   */
  private _scheduleTick(): void {
    window.clearTimeout(this._tickTimer);
    const now = Date.now();
    const ring = this._ringMs();
    const wait =
      ring !== null && now - ring < FLASH_MS
        ? FLASH_MS - (now - ring) + 250
        : MINUTE_MS - (now % MINUTE_MS) + 500;
    this._tickTimer = window.setTimeout(() => {
      this._now = Date.now();
      this._scheduleTick();
    }, wait);
  }

  /**
   * When the bell last rang. An `event` entity carries the timestamp in its
   * state; a binary_sensor only changed when it fired, so last_changed is it.
   */
  private _ringMs(): number | null {
    const id = this._config?.ring;
    if (!id) return null;
    const stateObj = this.hass?.states[id];
    if (!stateObj || isUnavailable(stateObj)) return null;
    if (domainOf(id) === 'event') {
      const ms = Date.parse(stateObj.state);
      return Number.isFinite(ms) ? ms : null;
    }
    const ms = Date.parse(stateObj.last_changed);
    return Number.isFinite(ms) ? ms : null;
  }

  private _locale(): string {
    return this.hass?.locale?.language ?? this.hass?.language ?? 'en';
  }

  private _ago(ms: number): string {
    const seconds = Math.round(ms / 1000);
    if (seconds < 45) return 'just now';
    const rtf = new Intl.RelativeTimeFormat(this._locale(), { numeric: 'auto' });
    const minutes = Math.round(seconds / 60);
    if (minutes < 60) return rtf.format(-minutes, 'minute');
    const hours = Math.round(minutes / 60);
    if (hours < 24) return rtf.format(-hours, 'hour');
    return rtf.format(-Math.round(hours / 24), 'day');
  }

  private _clearLockOptimistic(): void {
    window.clearTimeout(this._lockTimer);
    this._lockTimer = undefined;
    this._lockOptimistic = null;
  }

  private _onCardClick(): void {
    if (this._config) moreInfo(this, this._config.camera);
  }

  private _onImgError(): void {
    this._broken = true;
  }

  private _lockState(): string | undefined {
    const id = this._config?.unlock;
    if (!id) return undefined;
    const stateObj = this.hass?.states[id];
    if (!stateObj) return undefined;
    return this._lockOptimistic ?? stateObj.state;
  }

  private _callLock(service: 'lock' | 'unlock'): void {
    const hass = this.hass;
    const id = this._config?.unlock;
    if (!hass || !id) return;
    const stateObj = hass.states[id];
    if (!stateObj) return;
    hass.callService('lock', service, { entity_id: id });
    haptic(this, 'success');
    // Show the honest transitional state — real locks report locking/unlocking
    // before they settle.
    this._lockOptimistic = service === 'lock' ? 'locking' : 'unlocking';
    this._lockBase = stateObj.last_updated;
    window.clearTimeout(this._lockTimer);
    this._lockTimer = window.setTimeout(() => this._clearLockOptimistic(), OPTIMISTIC_TTL_MS);
  }

  /** Tap only ever locks; unlocking is owned by the hold handlers below. */
  private _onLockTap(ev: Event): void {
    ev.stopPropagation();
    if (Date.now() - this._completedAt < 400) return; // swallow the post-hold click
    const id = this._config?.unlock;
    const stateObj = id ? this.hass?.states[id] : undefined;
    if (!stateObj || isUnavailable(stateObj)) return;
    if (this._lockState() === 'locked') return;
    this._callLock('lock');
  }

  private _onHoldStart(ev: PointerEvent): void {
    ev.stopPropagation();
    const id = this._config?.unlock;
    const stateObj = id ? this.hass?.states[id] : undefined;
    if (!stateObj || isUnavailable(stateObj)) return;
    if (this._lockState() !== 'locked') return;
    try {
      (ev.currentTarget as Element).setPointerCapture(ev.pointerId);
    } catch {
      /* pointer may already be gone; the rAF loop still self-cancels */
    }
    this._holding = true;
    this._holdStart = performance.now();
    if (this._holdRaf !== undefined) cancelAnimationFrame(this._holdRaf);
    this._holdRaf = requestAnimationFrame(this._holdTick);
  }

  private _holdTick = (): void => {
    if (!this._holding) return;
    const progress = (performance.now() - this._holdStart) / HOLD_MS;
    if (progress >= 1) {
      this._holding = false;
      this._holdProgress = 0;
      this._completedAt = Date.now();
      this._callLock('unlock');
      return;
    }
    this._holdProgress = progress;
    this._holdRaf = requestAnimationFrame(this._holdTick);
  };

  private _onHoldEnd(ev: PointerEvent): void {
    ev.stopPropagation();
    if (!this._holding) return;
    this._holding = false;
    if (this._holdRaf !== undefined) cancelAnimationFrame(this._holdRaf);
    this._holdRaf = undefined;
    this._holdProgress = 0; // CSS drains the fill over 150ms
  }

  private _onToggle(ev: Event, entityId: string): void {
    ev.stopPropagation();
    const hass = this.hass;
    const stateObj = hass?.states[entityId];
    if (!hass || !stateObj || isUnavailable(stateObj)) return;
    haptic(this);
    toggleEntity(hass, entityId);
  }

  private _renderLockChip(): TemplateResult {
    const id = this._config!.unlock!;
    const stateObj = this.hass?.states[id];
    const unavailable = !stateObj || isUnavailable(stateObj);
    const state = this._lockState();
    const locked = state === 'locked';
    const pending = state === 'locking' || state === 'unlocking';
    const label = pending ? (state === 'locking' ? 'Locking' : 'Unlocking') : locked ? 'Unlock' : 'Lock';
    const aria = locked ? 'Hold to unlock' : 'Lock';
    return html`
      <button
        class="chip act holdable ${this._holding ? 'holding' : ''} ${locked ? '' : 'active'}"
        ?disabled=${unavailable}
        aria-label=${aria}
        title=${locked ? 'Hold to unlock' : 'Tap to lock'}
        @click=${this._onLockTap}
        @pointerdown=${this._onHoldStart}
        @pointerup=${this._onHoldEnd}
        @pointercancel=${this._onHoldEnd}
        @contextmenu=${(ev: Event) => ev.preventDefault()}
      >
        <span
          class="hold"
          style="transform:scaleX(${this._holdProgress.toFixed(3)});opacity:${this._holdProgress > 0
            ? 1
            : 0}"
        ></span>
        <ha-icon
          icon=${locked ? 'mdi:lock-open-variant-outline' : 'mdi:lock'}
        ></ha-icon>
        <span class="ctext">${label}</span>
      </button>
    `;
  }

  private _renderToggleChip(
    entityId: string,
    icon: string,
    label: string,
    momentary: boolean
  ): TemplateResult {
    const stateObj = this.hass?.states[entityId];
    const unavailable = !stateObj || isUnavailable(stateObj);
    const on = !momentary && !!stateObj && !unavailable && isActive(stateObj);
    return html`
      <button
        class="chip act ${on ? 'active' : ''}"
        ?disabled=${unavailable}
        aria-label=${label}
        title=${label}
        @click=${(ev: Event) => this._onToggle(ev, entityId)}
      >
        <ha-icon .icon=${icon}></ha-icon>
        <span class="ctext">${label}</span>
      </button>
    `;
  }

  protected render(): TemplateResult | typeof nothing {
    const config = this._config;
    const hass = this.hass;
    if (!config || !hass) return nothing;
    const camObj = hass.states[config.camera];
    if (!camObj) {
      return html`
        <ha-card class="control">
          <div class="warning">Entity not found: ${config.camera}</div>
        </ha-card>
      `;
    }

    const unavailable = isUnavailable(camObj);
    const accent = accentFor(camObj, config.color);
    const name = config.name ?? camObj.attributes.friendly_name ?? config.camera;
    const picture = camObj.attributes.entity_picture;
    // entity_picture already carries its auth token query string, so the
    // cache-buster normally joins with `&` (`?` covers a bare URL just in case).
    const src =
      !unavailable && typeof picture === 'string' && picture !== ''
        ? `${picture}${picture.includes('?') ? '&' : '?'}counter=${this._counter}`
        : undefined;
    const showShot = src !== undefined && !this._broken;

    const ring = this._ringMs();
    const age = ring === null ? null : Math.max(0, this._now - ring);
    const recentMs = (Number(config.recent_minutes) || DEFAULT_RECENT_MIN) * MINUTE_MS;
    const recent = age !== null && age <= recentMs;
    const fresh = age !== null && age < FLASH_MS;
    const ringText = recent ? `Someone rang ${this._ago(age as number)}` : 'No recent rings';
    const ringTitle =
      ring === null
        ? config.ring
          ? 'No ring recorded'
          : ''
        : `Last ring: ${new Intl.DateTimeFormat(this._locale(), {
            dateStyle: 'medium',
            timeStyle: 'short',
          }).format(new Date(ring))}`;

    const hasChips = !!(config.unlock || config.light || config.chime);

    return html`
      <ha-card
        class=${unavailable ? 'unavailable' : ''}
        style="--silk-accent:${accent}"
        aria-label=${`Show ${name} live view`}
        @click=${this._onCardClick}
      >
        <div class="media">
          ${showShot
            ? html`<img class="shot" src=${src} alt=${name} @error=${this._onImgError} />`
            : html`
                <div class="fallback">
                  <ha-icon icon="mdi:video-off"></ha-icon>
                  <div class="fname">${name}</div>
                </div>
              `}
          ${showShot ? html`<div class="scrim"></div>` : nothing}
          <div class="overlay ${showShot ? '' : 'plain'}">
            <div class="dname">${name}</div>
            <div class="ring ${recent ? 'recent' : ''}" title=${ringTitle}>
              ${recent
                ? html`<span class="dot" aria-hidden="true"></span>`
                : nothing}${ringText}
            </div>
          </div>
        </div>
        ${hasChips
          ? html`
              <div class="chips">
                ${config.unlock ? this._renderLockChip() : nothing}
                ${config.light
                  ? this._renderToggleChip(config.light, 'mdi:lightbulb', 'Light', false)
                  : nothing}
                ${config.chime
                  ? this._renderToggleChip(config.chime, 'mdi:bell-ring-outline', 'Chime', true)
                  : nothing}
              </div>
            `
          : nothing}
        <div class="flash ${fresh ? 'on' : ''}" aria-hidden="true"></div>
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
        gap: 0;
        padding: 0;
      }
      .media {
        position: relative;
        flex: 1 1 auto;
        min-height: 0;
        aspect-ratio: 16 / 9;
        overflow: hidden;
        background: rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.06);
      }
      .shot {
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
        left: 0;
        right: 0;
        bottom: 0;
        height: 55%;
        background: linear-gradient(transparent, rgba(0, 0, 0, 0.62));
        pointer-events: none;
      }
      .overlay {
        position: absolute;
        left: 12px;
        right: 12px;
        bottom: 9px;
        pointer-events: none;
      }
      .dname {
        color: #fff;
        font-size: 13px;
        font-weight: 500;
        line-height: 1.3;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .ring {
        display: flex;
        align-items: center;
        gap: 5px;
        color: rgba(255, 255, 255, 0.75);
        font-size: 11.5px;
        line-height: 1.35;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        font-variant-numeric: tabular-nums;
        pointer-events: auto;
        transition: color 200ms ease;
      }
      .ring.recent {
        color: var(--silk-accent);
        font-weight: 500;
      }
      .dot {
        flex: none;
        width: 6px;
        height: 6px;
        border-radius: 50%;
        background: var(--silk-accent);
        box-shadow: 0 0 0 1.5px rgba(0, 0, 0, 0.35);
      }
      /* Without a photo the overlay sits on card surface, so it uses card tokens. */
      .overlay.plain .dname {
        color: var(--primary-text-color);
      }
      .overlay.plain .ring {
        color: var(--secondary-text-color);
      }
      .overlay.plain .ring.recent {
        color: var(--silk-accent);
      }
      .fallback {
        position: absolute;
        inset: 0;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 4px;
        padding: 12px;
        box-sizing: border-box;
        color: var(--secondary-text-color);
      }
      .fallback ha-icon {
        --mdc-icon-size: 28px;
      }
      .fname {
        font-size: 13px;
        font-weight: 500;
        color: var(--primary-text-color);
        max-width: 100%;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .unavailable .fallback {
        opacity: 0.45;
      }
      .chips {
        flex: none;
        display: flex;
        align-items: center;
        gap: 6px;
        padding: 10px 12px;
        min-width: 0;
        overflow: hidden;
      }
      .chip {
        position: relative;
        display: inline-flex;
        align-items: center;
        gap: 5px;
        min-width: 0;
        min-height: 36px;
        padding: 6px 11px;
        box-sizing: border-box;
        overflow: hidden;
        transition:
          transform 250ms var(--silk-spring),
          background 150ms ease-out,
          color 150ms ease-out;
        -webkit-tap-highlight-color: transparent;
      }
      /* Only the hold chip claims the gesture; the others must not eat scrolls. */
      .chip.holdable {
        touch-action: none;
        user-select: none;
        -webkit-user-select: none;
        -webkit-touch-callout: none;
      }
      .chip:active:not(:disabled) {
        transform: scale(0.94);
        transition-duration: 120ms;
        transition-timing-function: var(--silk-ease-out);
      }
      .chip:disabled {
        cursor: default;
        opacity: 0.5;
      }
      .chip:disabled:hover {
        background: rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.06);
      }
      .chip:focus-visible {
        outline: 2px solid color-mix(in srgb, var(--silk-accent) 70%, transparent);
        outline-offset: 2px;
      }
      .chip ha-icon {
        flex: none;
        --mdc-icon-size: 15px;
        pointer-events: none;
        position: relative;
        z-index: 1;
      }
      .ctext {
        position: relative;
        z-index: 1;
        min-width: 0;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      /* Hold-to-unlock fill: transform only, so it never triggers layout. */
      .hold {
        position: absolute;
        inset: 0;
        z-index: 0;
        transform-origin: left center;
        background: color-mix(in srgb, var(--silk-accent) 30%, transparent);
        transition:
          transform 150ms ease,
          opacity 150ms ease;
      }
      /* While the rAF loop drives the fill, CSS must not fight it. */
      .chip.holding .hold {
        transition: opacity 150ms ease;
      }
      /* A live ring outlines the card for one minute, then lets go. */
      .flash {
        position: absolute;
        inset: 0;
        border: 2px solid var(--silk-accent);
        border-radius: var(--ha-card-border-radius, 12px);
        opacity: 0;
        pointer-events: none;
        transition: opacity 250ms var(--silk-ease-out);
      }
      .flash.on {
        opacity: 1;
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    'silk-doorbell-card': SilkDoorbellCard;
  }
}
