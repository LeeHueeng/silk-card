import { LitElement, html, css, nothing, TemplateResult } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { HomeAssistant, LovelaceCardConfig } from '../types';
import { silkControlStyles } from '../shared/base';
import { domainOf, isUnavailable, moreInfo, haptic } from '../shared/service';
import { accentFor } from '../shared/color';
import { registerEditor } from '../shared/editor';

export const META = {
  type: 'silk-sleep-timer-card',
  name: 'Silk Sleep Timer',
  description: "Music off when you're out.",
};

export interface SilkSleepTimerCardConfig extends LovelaceCardConfig {
  /** The media_player the timer switches off. */
  entity: string;
  /** Preset chips, in minutes. Default 15/30/45/60/90. */
  presets?: (number | string)[];
  /** Service fired on expiry, `'domain.service'`. Default media_player.turn_off. */
  action?: string;
  name?: string;
  /** Accent override. */
  color?: string;
}

/** A running countdown, as persisted. */
interface Countdown {
  /** Epoch ms the timer fires at — the single source of truth. */
  endsAt: number;
  /** Full length in ms, so the progress bar has a denominator. */
  totalMs: number;
}

const DEFAULT_PRESETS = [15, 30, 45, 60, 90];
const MAX_PRESETS = 6;
const DEFAULT_ACTION = 'media_player.turn_off';
const TICK_MS = 1000;
const MINUTE_MS = 60_000;
const STORAGE_PREFIX = 'silk-sleep-timer:';

const EDITOR_TAG = 'silk-sleep-timer-card-editor';

/** Minute chips offered in the editor; any other value can still be typed. */
const PRESET_OPTIONS = [5, 10, 15, 20, 30, 45, 60, 90, 120].map((m) => ({
  value: String(m),
  label: `${m}분`,
}));

// `presets` is a list of bare minutes, which no repeater has to hold: the
// multi-select answers with a list, custom values cover anything not offered,
// and `_presets()` already coerces every entry with Number().
registerEditor(
  EDITOR_TAG,
  [
    { name: 'entity', required: true, selector: { entity: { domain: ['media_player'] } } },
    { name: 'name', selector: { text: {} } },
    {
      name: 'presets',
      selector: {
        select: { options: PRESET_OPTIONS, multiple: true, custom_value: true, mode: 'dropdown' },
      },
    },
    { name: 'action', selector: { text: {} } },
    { name: 'color', selector: { ui_color: {} } },
  ],
  {
    entity: '미디어 플레이어',
    name: '이름',
    presets: `프리셋 (분, 최대 ${MAX_PRESETS}개)`,
    action: '종료 시 서비스 (domain.service)',
    color: '강조 색상',
  },
  { action: DEFAULT_ACTION }
);

/** m:ss under an hour, h:mm:ss beyond. Ceils, so 0:00 means done. */
function formatRemaining(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const two = (n: number): string => String(n).padStart(2, '0');
  return h > 0 ? `${h}:${two(m)}:${two(total % 60)}` : `${m}:${two(total % 60)}`;
}

/** Stored countdown for a key, or null when absent, corrupt or unreadable. */
function readStore(key: string): Countdown | null {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { endsAt?: unknown; totalMs?: unknown };
    const endsAt = Number(parsed?.endsAt);
    const totalMs = Number(parsed?.totalMs);
    if (!Number.isFinite(endsAt) || !Number.isFinite(totalMs) || totalMs <= 0) return null;
    return { endsAt, totalMs };
  } catch {
    // Private-mode storage, a quota wall, or hand-edited junk — all non-fatal.
    return null;
  }
}

function writeStore(key: string, value: Countdown | null): void {
  try {
    if (value) window.localStorage.setItem(key, JSON.stringify(value));
    else window.localStorage.removeItem(key);
  } catch {
    // Storage is a convenience here; the in-memory countdown still runs.
  }
}

/**
 * A sleep timer the card owns outright.
 *
 * Home Assistant has no per-player sleep timer, so the countdown lives here:
 * a preset chip stores an absolute end timestamp (in memory and in
 * localStorage, keyed by entity id), every render derives the remaining time
 * from it, and expiry fires `action` — `media_player.turn_off` unless
 * configured otherwise. Because the timestamp is absolute, re-renders,
 * backgrounded tabs and full page reloads all resume exactly where they were.
 * A timer that expired while the dashboard was closed is discarded rather than
 * fired late: nothing should silence a room minutes after the fact.
 */
@customElement('silk-sleep-timer-card')
export class SilkSleepTimerCard extends LitElement {
  @property({ attribute: false }) public hass?: HomeAssistant;

  @state() private _config?: SilkSleepTimerCardConfig;
  /** The running countdown, or null when idle. */
  @state() private _timer: Countdown | null = null;
  /** Render clock — bumped by the 1s tick so the remaining time counts down. */
  @state() private _now = Date.now();

  private _tick?: number;

  public static getStubConfig(hass: HomeAssistant): Partial<SilkSleepTimerCardConfig> {
    const ids = Object.keys(hass.states).filter((id) => id.startsWith('media_player.'));
    const entity = ids.find((id) => hass.states[id].state === 'playing') ?? ids[0];
    return { type: 'custom:silk-sleep-timer-card', entity };
  }

  public static async getConfigElement(): Promise<HTMLElement> {
    return document.createElement(EDITOR_TAG);
  }

  public setConfig(config: SilkSleepTimerCardConfig): void {
    if (!config.entity) {
      throw new Error('silk-sleep-timer-card: `entity` is required');
    }
    if (domainOf(config.entity) !== 'media_player') {
      throw new Error(
        `silk-sleep-timer-card: \`entity\` must be a media_player (got "${config.entity}")`
      );
    }
    if (config.presets !== undefined) {
      if (
        !Array.isArray(config.presets) ||
        config.presets.length === 0 ||
        config.presets.some((m) => !(Number(m) > 0))
      ) {
        throw new Error('silk-sleep-timer-card: `presets` must be a list of positive minutes');
      }
    }
    if (config.action !== undefined && !/^[a-z_]+\.[a-z0-9_]+$/i.test(String(config.action))) {
      throw new Error("silk-sleep-timer-card: `action` must be 'domain.service'");
    }
    this._config = config;
    this._timer = null;
    this._restore();
  }

  public getCardSize(): number {
    return 2;
  }

  public getGridOptions(): Record<string, number> {
    return { columns: 6, rows: 2, min_columns: 4, min_rows: 2 };
  }

  public connectedCallback(): void {
    super.connectedCallback();
    document.addEventListener('visibilitychange', this._onVisibility);
    this._restore();
    this._syncTick();
  }

  public disconnectedCallback(): void {
    super.disconnectedCallback();
    document.removeEventListener('visibilitychange', this._onVisibility);
    window.clearInterval(this._tick);
    this._tick = undefined;
  }

  protected updated(): void {
    this._syncTick();
  }

  /** A backgrounded tab throttles timers; check the clock the moment we return. */
  private readonly _onVisibility = (): void => {
    if (document.hidden) return;
    this._now = Date.now();
    this._checkExpiry();
  };

  private _storageKey(): string {
    return `${STORAGE_PREFIX}${this._config?.entity ?? ''}`;
  }

  /** Adopt a stored countdown; an already-expired one is dropped, not fired. */
  private _restore(): void {
    if (!this._config || this._timer) return;
    const stored = readStore(this._storageKey());
    if (!stored) return;
    if (stored.endsAt <= Date.now()) {
      writeStore(this._storageKey(), null);
      return;
    }
    this._timer = stored;
    this._now = Date.now();
  }

  private _syncTick(): void {
    const running = this.isConnected && this._timer !== null;
    if (running && this._tick === undefined) {
      this._tick = window.setInterval(() => {
        this._now = Date.now();
        this._checkExpiry();
      }, TICK_MS);
    } else if (!running && this._tick !== undefined) {
      window.clearInterval(this._tick);
      this._tick = undefined;
    }
  }

  private _checkExpiry(): void {
    const timer = this._timer;
    if (!timer || timer.endsAt > Date.now()) return;
    this._fire();
  }

  private _stop(): void {
    this._timer = null;
    writeStore(this._storageKey(), null);
    this._syncTick();
  }

  private _fire(): void {
    const config = this._config;
    const hass = this.hass;
    // Clear first: the card must never fire twice off one countdown.
    this._stop();
    if (!config || !hass) return;
    const [domain, service] = (config.action ?? DEFAULT_ACTION).split('.');
    if (!domain || !service) return;
    haptic(this, 'success');
    void hass.callService(domain, service, { entity_id: config.entity });
  }

  private _presets(): number[] {
    const raw = this._config?.presets ?? DEFAULT_PRESETS;
    return raw
      .map((m) => Math.round(Number(m)))
      .filter((m) => Number.isFinite(m) && m > 0)
      .slice(0, MAX_PRESETS);
  }

  private _onCardClick(): void {
    if (this._config) moreInfo(this, this._config.entity);
  }

  private _onPreset(ev: Event, minutes: number): void {
    ev.stopPropagation();
    if (!this._config) return;
    haptic(this);
    const totalMs = minutes * MINUTE_MS;
    const timer: Countdown = { endsAt: Date.now() + totalMs, totalMs };
    this._timer = timer;
    this._now = Date.now();
    writeStore(this._storageKey(), timer);
    this._syncTick();
  }

  private _onCancel(ev: Event): void {
    ev.stopPropagation();
    if (!this._timer) return;
    haptic(this, 'selection');
    this._stop();
  }

  private _locale(): string {
    return this.hass?.locale?.language ?? this.hass?.language ?? 'en';
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
    const timer = this._timer;
    const remaining = timer ? Math.max(0, timer.endsAt - this._now) : 0;
    const elapsed = timer ? Math.min(1, Math.max(0, 1 - remaining / timer.totalMs)) : 0;
    const stopsAt = timer
      ? new Intl.DateTimeFormat(this._locale(), { hour: 'numeric', minute: '2-digit' }).format(
          new Date(timer.endsAt)
        )
      : '';

    return html`
      <ha-card
        class="control ${unavailable ? 'unavailable' : ''}"
        style="--silk-accent:${accent}"
        @click=${this._onCardClick}
      >
        <div class="top">
          <div class="icon ${timer ? 'on' : ''}">
            <ha-icon .icon=${timer ? 'mdi:timer-sand' : 'mdi:sleep'}></ha-icon>
          </div>
          <div class="info">
            <div class="name">${name}</div>
            <div class="state">
              ${timer ? html`Stops at ${stopsAt}` : unavailable ? 'Unavailable' : 'No sleep timer'}
            </div>
          </div>
          ${timer
            ? html`
                <div class="trailing">
                  <span class="remain" role="timer" aria-label=${`${formatRemaining(remaining)} remaining`}>
                    ${formatRemaining(remaining)}
                  </span>
                </div>
              `
            : nothing}
        </div>
        <div class="chips">
          ${timer
            ? html`<button class="chip cancel" @click=${this._onCancel}>Cancel</button>`
            : this._presets().map(
                (minutes) => html`
                  <button
                    class="chip"
                    .disabled=${unavailable}
                    aria-label=${`Sleep in ${minutes} minutes`}
                    @click=${(ev: Event) => this._onPreset(ev, minutes)}
                  >
                    ${minutes}m
                  </button>
                `
              )}
        </div>
        <div class="track ${timer ? '' : 'hidden'}" aria-hidden="true">
          <div class="bar ${timer ? 'glide' : ''}" style="width:${(elapsed * 100).toFixed(2)}%"></div>
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
        align-items: center;
        gap: 12px;
        min-width: 0;
      }
      /* The icon is a status light here, not a control: it presses with the card. */
      .icon {
        cursor: inherit;
      }
      .icon:active {
        transform: none;
      }
      .remain {
        font-size: 22px;
        font-weight: 700;
        letter-spacing: -0.02em;
        line-height: 1;
        color: var(--primary-text-color);
        font-variant-numeric: tabular-nums;
        white-space: nowrap;
      }
      .chips {
        flex: none;
        display: flex;
        align-items: center;
        gap: 6px;
        min-width: 0;
        position: relative;
        z-index: 1;
      }
      .chip {
        flex: 1 1 auto;
        min-width: 0;
        min-height: 30px;
        font-variant-numeric: tabular-nums;
        transition:
          transform 250ms var(--silk-spring),
          background 150ms ease-out,
          color 150ms ease-out;
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
      .chip:focus-visible {
        outline: 2px solid color-mix(in srgb, var(--silk-accent) 70%, transparent);
        outline-offset: 2px;
      }
      .chip.cancel {
        flex: none;
        padding: 4px 14px;
      }
      /* Elapsed-time bar riding the card's bottom edge. */
      .track {
        position: absolute;
        left: 0;
        right: 0;
        bottom: 0;
        height: 4px;
        background: rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.07);
        pointer-events: none;
        z-index: 0;
        opacity: 1;
        transition: opacity 200ms ease;
      }
      .track.hidden {
        opacity: 0;
      }
      .bar {
        position: absolute;
        inset: 0 auto 0 0;
        background: var(--silk-accent);
      }
      /* 1s linear matches the tick cadence, so the fill glides continuously. */
      .bar.glide {
        transition: width 1000ms linear;
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    'silk-sleep-timer-card': SilkSleepTimerCard;
  }
}
