import { LitElement, html, css, nothing, TemplateResult } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { HomeAssistant, LovelaceCardConfig } from '../types';
import { silkControlStyles } from '../shared/base';
import { haptic, clamp } from '../shared/service';
import { accentFor } from '../shared/color';
import { registerEditor } from '../shared/editor';

export const META = {
  type: 'silk-pomodoro-card',
  name: 'Silk Pomodoro',
  description: 'Work, break, repeat.',
};

export interface SilkPomodoroCardConfig extends LovelaceCardConfig {
  /** Focus minutes. Default 25. */
  work?: number;
  /** Short break minutes. Default 5. */
  short_break?: number;
  /** Long break minutes, after a full set of rounds. Default 15. */
  long_break?: number;
  /** Work rounds before the long break. Default 4. */
  rounds?: number;
  /** `domain.service` called with {message} at every phase end. */
  notify_service?: string;
  name?: string;
  /** Accent override for the work phase. */
  color?: string;
}

type Phase = 'work' | 'short' | 'long';

/** The whole timer, exactly as it is persisted. */
interface PomodoroState {
  phase: Phase;
  /** 1-based work round inside the current set. */
  round: number;
  running: boolean;
  /** Epoch ms the phase ends at — the source of truth while running. */
  endsAt: number;
  /** Remaining ms while paused. */
  leftMs: number;
}

const DEFAULTS = { work: 25, short_break: 5, long_break: 15, rounds: 4 };
const MAX_ROUNDS = 8;
const MINUTE_MS = 60_000;
const TICK_MS = 1000;
const SERVICE_RE = /^[a-z_0-9]+\.[a-z_0-9]+$/;
const STORE_PREFIX = 'silk-pomodoro:';
/** Breaks read green — a genuine phase distinction, not decoration. */
const BREAK_COLOR = '#5ec78d';

/** Ring geometry: pathLength 100 normalizes the sweep, so offset = 100 − %. */
const SIZE = 48;
const CENTER = SIZE / 2;
const RADIUS = 21;
const ARC_UNITS = 100;

const PHASE_LABEL: Record<Phase, string> = {
  work: 'Work',
  short: 'Short break',
  long: 'Long break',
};

const EDITOR_TAG = 'silk-pomodoro-card-editor';

registerEditor(
  EDITOR_TAG,
  [
    { name: 'name', selector: { text: {} } },
    {
      name: '',
      type: 'grid',
      schema: [
        { name: 'work', selector: { number: { min: 1, max: 180, mode: 'box' } } },
        { name: 'short_break', selector: { number: { min: 1, max: 180, mode: 'box' } } },
        { name: 'long_break', selector: { number: { min: 1, max: 180, mode: 'box' } } },
        { name: 'rounds', selector: { number: { min: 1, max: MAX_ROUNDS, mode: 'box' } } },
      ],
    },
    { name: 'notify_service', selector: { text: {} } },
  ],
  {
    name: 'Name',
    work: 'Work minutes',
    short_break: 'Short break',
    long_break: 'Long break',
    rounds: 'Rounds',
    notify_service: 'Notify service (domain.service)',
  },
  { ...DEFAULTS }
);

/** m:ss, ceiled so 0:00 means the phase is actually over. */
function formatRemaining(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}

function readStore(key: string): PomodoroState | null {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    const p = JSON.parse(raw) as Partial<PomodoroState>;
    if (p.phase !== 'work' && p.phase !== 'short' && p.phase !== 'long') return null;
    const round = Number(p.round);
    const endsAt = Number(p.endsAt);
    const leftMs = Number(p.leftMs);
    if (!Number.isFinite(round) || !Number.isFinite(endsAt) || !Number.isFinite(leftMs)) return null;
    return {
      phase: p.phase,
      round: Math.max(1, Math.round(round)),
      running: !!p.running,
      endsAt,
      leftMs: Math.max(0, leftMs),
    };
  } catch {
    // Private-mode storage or hand-edited junk — the timer still runs in memory.
    return null;
  }
}

function writeStore(key: string, value: PomodoroState): void {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Persistence is a convenience, never a requirement.
  }
}

/**
 * A pomodoro that belongs to the browser, not to Home Assistant.
 *
 * There is no entity behind this card: the phase and its absolute end
 * timestamp live in localStorage, so a re-render, a backgrounded tab or a full
 * reload all resume on the same second. Home Assistant is touched only when
 * `notify_service` is set — one message at each phase end. A phase that ran out
 * while the dashboard was closed is advanced silently rather than announced
 * late.
 */
@customElement('silk-pomodoro-card')
export class SilkPomodoroCard extends LitElement {
  @property({ attribute: false }) public hass?: HomeAssistant;

  @state() private _config?: SilkPomodoroCardConfig;
  @state() private _state: PomodoroState = {
    phase: 'work',
    round: 1,
    running: false,
    endsAt: 0,
    leftMs: DEFAULTS.work * MINUTE_MS,
  };
  /** Render clock, bumped by the 1s tick. */
  @state() private _now = Date.now();

  private _tick?: number;

  public static getStubConfig(): Partial<SilkPomodoroCardConfig> {
    // Fully local: nothing to pick from the state machine.
    return { type: 'custom:silk-pomodoro-card' };
  }

  public static async getConfigElement(): Promise<HTMLElement> {
    return document.createElement(EDITOR_TAG);
  }

  public setConfig(config: SilkPomodoroCardConfig): void {
    const positive = (key: 'work' | 'short_break' | 'long_break' | 'rounds'): void => {
      const value = config[key];
      if (value !== undefined && !(Number(value) > 0)) {
        throw new Error(`silk-pomodoro-card: \`${key}\` must be a positive number`);
      }
    };
    positive('work');
    positive('short_break');
    positive('long_break');
    positive('rounds');
    if (
      config.notify_service !== undefined &&
      !SERVICE_RE.test(String(config.notify_service))
    ) {
      throw new Error("silk-pomodoro-card: `notify_service` must be 'domain.service'");
    }
    this._config = config;
    this._state = { phase: 'work', round: 1, running: false, endsAt: 0, leftMs: this._phaseMs('work') };
    this._restore();
  }

  public getCardSize(): number {
    return 3;
  }

  public getGridOptions(): Record<string, number> {
    return { columns: 4, rows: 3, min_columns: 3, min_rows: 3 };
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

  /** A hidden tab throttles intervals; re-read the clock the moment we return. */
  private readonly _onVisibility = (): void => {
    if (document.hidden) return;
    this._now = Date.now();
    this._checkExpiry(false);
  };

  private _storageKey(): string {
    // Keyed by card name so two pomodoros on one dashboard keep separate timers.
    return `${STORE_PREFIX}${this._config?.name ?? 'default'}`;
  }

  private _rounds(): number {
    return Math.round(clamp(Number(this._config?.rounds ?? DEFAULTS.rounds), 1, MAX_ROUNDS));
  }

  private _phaseMs(phase: Phase): number {
    const config = this._config;
    const minutes =
      phase === 'work'
        ? (config?.work ?? DEFAULTS.work)
        : phase === 'short'
          ? (config?.short_break ?? DEFAULTS.short_break)
          : (config?.long_break ?? DEFAULTS.long_break);
    return Math.round(clamp(Number(minutes), 1, 600)) * MINUTE_MS;
  }

  private _commit(next: PomodoroState): void {
    this._state = next;
    writeStore(this._storageKey(), next);
    this._now = Date.now();
    this._syncTick();
  }

  private _restore(): void {
    if (!this._config) return;
    const stored = readStore(this._storageKey());
    if (!stored) return;
    if (stored.round > this._rounds()) stored.round = this._rounds();
    this._state = stored;
    this._now = Date.now();
    // Ran out while nobody was looking: move on quietly, never notify late.
    this._checkExpiry(true);
    // A restore that lands on a still-running phase has to start its own tick;
    // _checkExpiry only commits (and so re-syncs) when the phase is over.
    this._syncTick();
  }

  private _syncTick(): void {
    const running = this.isConnected && this._state.running;
    if (running && this._tick === undefined) {
      this._tick = window.setInterval(() => {
        this._now = Date.now();
        this._checkExpiry(false);
      }, TICK_MS);
    } else if (!running && this._tick !== undefined) {
      window.clearInterval(this._tick);
      this._tick = undefined;
    }
  }

  private _checkExpiry(silent: boolean): void {
    const s = this._state;
    if (!s.running || s.endsAt > Date.now()) return;
    this._advance(silent);
  }

  /** Roll to the next phase, paused at its full length. */
  private _advance(silent: boolean): void {
    const s = this._state;
    const rounds = this._rounds();
    const nextPhase: Phase = s.phase === 'work' ? (s.round >= rounds ? 'long' : 'short') : 'work';
    const nextRound =
      s.phase === 'work' ? s.round : s.phase === 'long' ? 1 : Math.min(s.round + 1, rounds);
    if (!silent) {
      haptic(this, 'success');
      this._notify(s.phase, nextPhase);
    }
    this._commit({
      phase: nextPhase,
      round: nextRound,
      running: false,
      endsAt: 0,
      leftMs: this._phaseMs(nextPhase),
    });
  }

  private _notify(ended: Phase, next: Phase): void {
    const hass = this.hass;
    const service = this._config?.notify_service;
    if (!hass || !service) return;
    const [domain, name] = service.split('.');
    if (!domain || !name) return;
    const minutes = Math.round(this._phaseMs(next) / MINUTE_MS);
    const message =
      ended === 'work'
        ? `Work done — ${minutes} min ${next === 'long' ? 'long ' : ''}break`
        : `Break over — ${minutes} min of work`;
    try {
      void hass.callService(domain, name, { message });
    } catch (err) {
      console.warn('silk-pomodoro-card: notify failed', err);
    }
  }

  private _remaining(): number {
    const s = this._state;
    return s.running ? Math.max(0, s.endsAt - this._now) : s.leftMs;
  }

  private _onStartPause(ev: Event): void {
    ev.stopPropagation();
    const s = this._state;
    haptic(this);
    if (s.running) {
      this._commit({ ...s, running: false, endsAt: 0, leftMs: Math.max(0, s.endsAt - Date.now()) });
      return;
    }
    const left = s.leftMs > 0 ? s.leftMs : this._phaseMs(s.phase);
    this._commit({ ...s, running: true, endsAt: Date.now() + left, leftMs: left });
  }

  private _onReset(ev: Event): void {
    ev.stopPropagation();
    haptic(this, 'selection');
    this._commit({
      phase: 'work',
      round: 1,
      running: false,
      endsAt: 0,
      leftMs: this._phaseMs('work'),
    });
  }

  protected render(): TemplateResult | typeof nothing {
    const config = this._config;
    if (!config) return nothing;

    const s = this._state;
    const rounds = this._rounds();
    const total = this._phaseMs(s.phase);
    const remaining = this._remaining();
    const fraction = total > 0 ? clamp(remaining / total, 0, 1) : 0;
    const dashoffset = ARC_UNITS * (1 - fraction);
    // One accent at a time: the whole card follows the phase.
    const accent = s.phase === 'work' ? accentFor(undefined, config.color) : BREAK_COLOR;
    const name = config.name ?? 'Pomodoro';
    // A work round is complete once its break has begun.
    const filled = s.phase === 'work' ? s.round - 1 : s.phase === 'long' ? rounds : s.round;
    const pristine = !s.running && s.phase === 'work' && s.round === 1 && remaining === total;

    return html`
      <ha-card style="--silk-accent:${accent}">
        <div class="head" title=${name}>${name}</div>
        <div class="ring">
          <svg viewBox="0 0 ${SIZE} ${SIZE}" aria-hidden="true">
            <circle class="ring-bg" cx=${CENTER} cy=${CENTER} r=${RADIUS}></circle>
            <circle
              class="ring-value ${s.running ? 'ticking' : ''}"
              cx=${CENTER}
              cy=${CENTER}
              r=${RADIUS}
              pathLength=${ARC_UNITS}
              stroke-dasharray=${ARC_UNITS}
              transform="rotate(-90 ${CENTER} ${CENTER})"
              style="stroke-dashoffset:${dashoffset.toFixed(2)}"
            >
              <title>
                ${PHASE_LABEL[s.phase]} · ${formatRemaining(remaining)} of
                ${Math.round(total / MINUTE_MS)} min left
              </title>
            </circle>
          </svg>
          <div class="center">
            <div
              class="remain"
              role="timer"
              aria-label=${`${formatRemaining(remaining)} left of ${PHASE_LABEL[s.phase]}`}
            >
              ${formatRemaining(remaining)}
            </div>
          </div>
        </div>
        <div class="meta">
          <div class="phase">${PHASE_LABEL[s.phase]}</div>
          <div class="dots" aria-label=${`Round ${Math.min(s.round, rounds)} of ${rounds}`}>
            ${Array.from(
              { length: rounds },
              (_, i) => html`<span class="dot ${i < filled ? 'full' : ''}"></span>`
            )}
          </div>
        </div>
        <div class="chips">
          <button
            class="chip ${s.running ? 'active' : ''}"
            aria-label=${s.running ? 'Pause timer' : 'Start timer'}
            @click=${this._onStartPause}
          >
            ${s.running ? 'Pause' : remaining < total ? 'Resume' : 'Start'}
          </button>
          <button class="chip" ?disabled=${pristine} aria-label="Reset timer" @click=${this._onReset}>
            Reset
          </button>
        </div>
      </ha-card>
    `;
  }

  static styles = [
    silkControlStyles,
    css`
      ha-card {
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 8px;
        padding: 12px;
        cursor: default;
      }
      .head {
        flex: none;
        max-width: 100%;
        font-size: 13px;
        font-weight: 600;
        line-height: 1.3;
        color: var(--secondary-text-color);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      /* 120px at rest; a short card may squeeze the box — the SVG keeps the
         circle round and centered inside whatever height it lands on. */
      .ring {
        position: relative;
        flex: 0 1 auto;
        width: 100%;
        max-width: 120px;
        min-height: 0;
        aspect-ratio: 1;
      }
      svg {
        display: block;
        width: 100%;
        height: 100%;
      }
      .ring-bg,
      .ring-value {
        fill: none;
        stroke-width: 6;
      }
      .ring-bg {
        stroke: rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.08);
      }
      .ring-value {
        stroke: var(--silk-accent);
        stroke-linecap: round;
        transition:
          stroke-dashoffset 250ms var(--silk-ease-out),
          stroke 200ms ease;
      }
      /* Linear at the tick cadence: the countdown glides instead of stepping. */
      .ring-value.ticking {
        transition:
          stroke-dashoffset 1000ms linear,
          stroke 200ms ease;
      }
      .center {
        position: absolute;
        inset: 0;
        display: grid;
        place-items: center;
        pointer-events: none;
      }
      .remain {
        font-size: 24px;
        font-weight: 700;
        letter-spacing: -0.02em;
        line-height: 1;
        color: var(--primary-text-color);
        font-variant-numeric: tabular-nums;
        white-space: nowrap;
      }
      .meta {
        flex: none;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 5px;
        max-width: 100%;
      }
      .phase {
        font-size: 12.5px;
        line-height: 1.2;
        color: var(--secondary-text-color);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .dots {
        display: flex;
        align-items: center;
        gap: 5px;
      }
      .dot {
        width: 5px;
        height: 5px;
        border-radius: 50%;
        background: rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.22);
        transition: background 200ms ease;
      }
      .dot.full {
        background: var(--silk-accent);
      }
      .chips {
        flex: none;
        display: flex;
        align-items: center;
        gap: 6px;
      }
      .chip {
        min-height: 30px;
        padding: 4px 14px;
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
      .chip:focus-visible {
        outline: 2px solid color-mix(in srgb, var(--silk-accent) 70%, transparent);
        outline-offset: 2px;
      }
      .chip:disabled {
        cursor: default;
        opacity: 0.5;
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    'silk-pomodoro-card': SilkPomodoroCard;
  }
}
