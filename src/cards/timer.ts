import { LitElement, html, css, nothing, PropertyValues, TemplateResult } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { HomeAssistant, HassEntity, LovelaceCardConfig } from '../types';
import { silkControlStyles } from '../shared/base';
import { domainOf, isUnavailable, moreInfo, haptic, stateText, clamp } from '../shared/service';
import { accentFor } from '../shared/color';
import { registerEditor } from '../shared/editor';

export const META = {
  type: 'silk-timer-card',
  name: 'Silk Timer',
  description: 'A countdown you can see moving.',
};

export interface SilkTimerCardConfig extends LovelaceCardConfig {
  entity: string;
  name?: string;
  icon?: string;
  color?: string;
}

type TimerState = 'idle' | 'active' | 'paused';

/** Optimistic override applied between our service call and the real state. */
interface OptimisticTimer {
  state: TimerState;
  /** Predicted finish (epoch ms) when the optimistic state is `active`. */
  finishesAt?: number;
  /** Frozen remaining seconds when the optimistic state is `paused`. */
  remainingS?: number;
}

const EDITOR_TAG = 'silk-timer-card-editor';
const OPTIMISTIC_TIMEOUT_MS = 2000;
const TICK_MS = 1000;

registerEditor(
  EDITOR_TAG,
  [
    { name: 'entity', required: true, selector: { entity: { domain: ['timer'] } } },
    { name: 'name', selector: { text: {} } },
    {
      name: '',
      type: 'grid',
      schema: [
        { name: 'icon', selector: { icon: {} } },
        { name: 'color', selector: { ui_color: {} } },
      ],
    },
  ],
  { entity: '엔티티', name: '이름', icon: '아이콘', color: '강조 색상' }
);

/** Parses HA timer duration strings — 'H:MM:SS', optionally 'N day(s), H:MM:SS'. */
function parseDuration(text: unknown): number {
  if (typeof text !== 'string') return 0;
  const m = text.match(/^(?:(\d+)\s+days?,\s*)?(\d+):(\d{1,2}):(\d{1,2})/);
  if (!m) return 0;
  return (
    Number(m[1] ?? 0) * 86400 + Number(m[2]) * 3600 + Number(m[3]) * 60 + Number(m[4])
  );
}

/** Countdown display: m:ss under an hour, h:mm:ss beyond. Ceils so 0:00 means done. */
function formatSeconds(total: number): string {
  const s = Math.max(0, Math.ceil(total));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const two = (n: number) => String(n).padStart(2, '0');
  return h > 0 ? `${h}:${two(m)}:${two(s % 60)}` : `${m}:${two(s % 60)}`;
}

/**
 * Countdown row for `timer.*` — the remaining time ticks every second and a
 * 4px accent bar along the card's bottom edge glides (1s linear) as time
 * elapses. Trailing controls follow the state machine: start / pause+cancel /
 * resume+cancel. The icon button doubles as the primary action.
 */
@customElement('silk-timer-card')
export class SilkTimerCard extends LitElement {
  @property({ attribute: false }) public hass?: HomeAssistant;

  @state() private _config?: SilkTimerCardConfig;

  /** Render clock — bumped by the 1s tick so the countdown re-renders. */
  @state() private _now = Date.now();

  /** Optimistic target (null = trust the real state). */
  @state() private _optimistic: OptimisticTimer | null = null;

  /** last_updated snapshot at call time; any newer stamp clears the override. */
  private _optimisticBase = '';
  private _optimisticTimer?: number;
  private _tick?: number;

  public static getStubConfig(hass: HomeAssistant): Partial<SilkTimerCardConfig> {
    const entity = Object.keys(hass.states).find((id) => id.startsWith('timer.'));
    return { type: 'custom:silk-timer-card', entity };
  }

  public static async getConfigElement(): Promise<HTMLElement> {
    return document.createElement(EDITOR_TAG);
  }

  public setConfig(config: SilkTimerCardConfig): void {
    if (!config.entity) {
      throw new Error('silk-timer-card: `entity` is required');
    }
    if (domainOf(config.entity) !== 'timer') {
      throw new Error(
        `silk-timer-card: entity must be a timer, got \`${domainOf(config.entity)}\``
      );
    }
    this._config = config;
    this._clearOptimistic();
  }

  public getCardSize(): number {
    return 1;
  }

  public getGridOptions(): Record<string, number> {
    return { columns: 6, rows: 1, min_columns: 4, min_rows: 1 };
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
    // Fresh clock for renders triggered by state pushes (no extra cycle: Lit
    // batches state set in willUpdate into the same update).
    this._now = Date.now();
    if (this._optimistic !== null && this._config) {
      const stateObj = this.hass?.states[this._config.entity];
      if (stateObj && stateObj.last_updated !== this._optimisticBase) {
        this._clearOptimistic();
      }
    }
  }

  protected updated(): void {
    const stateObj = this._config ? this.hass?.states[this._config.entity] : undefined;
    const running =
      this.isConnected &&
      !!stateObj &&
      !isUnavailable(stateObj) &&
      this._displayState(stateObj) === 'active';
    if (running && this._tick === undefined) {
      this._tick = window.setInterval(() => {
        this._now = Date.now();
      }, TICK_MS);
    } else if (!running && this._tick !== undefined) {
      window.clearInterval(this._tick);
      this._tick = undefined;
    }
  }

  private _displayState(stateObj: HassEntity): TimerState {
    if (this._optimistic) return this._optimistic.state;
    const s = stateObj.state;
    return s === 'active' || s === 'paused' ? s : 'idle';
  }

  private _remainingSeconds(stateObj: HassEntity, display: TimerState, durationS: number): number {
    if (display === 'active') {
      const finish =
        this._optimistic?.finishesAt ?? Date.parse(stateObj.attributes.finishes_at ?? '');
      return Number.isFinite(finish) ? Math.max(0, (finish - this._now) / 1000) : 0;
    }
    if (display === 'paused') {
      return this._optimistic?.remainingS ?? parseDuration(stateObj.attributes.remaining);
    }
    return durationS;
  }

  private _clearOptimistic(): void {
    window.clearTimeout(this._optimisticTimer);
    this._optimisticTimer = undefined;
    this._optimistic = null;
  }

  private _setOptimistic(stateObj: HassEntity, next: OptimisticTimer): void {
    this._optimistic = next;
    this._optimisticBase = stateObj.last_updated;
    window.clearTimeout(this._optimisticTimer);
    this._optimisticTimer = window.setTimeout(
      () => this._clearOptimistic(),
      OPTIMISTIC_TIMEOUT_MS
    );
  }

  private _service(service: 'start' | 'pause' | 'cancel'): void {
    const config = this._config;
    const hass = this.hass;
    if (!config || !hass) return;
    const stateObj = hass.states[config.entity];
    if (!stateObj || isUnavailable(stateObj)) return;
    haptic(this);
    const display = this._displayState(stateObj);
    const durationS = parseDuration(stateObj.attributes.duration);
    if (service === 'start') {
      // Starting from idle runs the full duration; from paused it resumes.
      const remainingS =
        display === 'paused' ? this._remainingSeconds(stateObj, display, durationS) : durationS;
      this._setOptimistic(stateObj, {
        state: 'active',
        finishesAt: Date.now() + remainingS * 1000,
      });
    } else if (service === 'pause') {
      this._setOptimistic(stateObj, {
        state: 'paused',
        remainingS: this._remainingSeconds(stateObj, display, durationS),
      });
    } else {
      this._setOptimistic(stateObj, { state: 'idle' });
    }
    hass.callService('timer', service, { entity_id: config.entity });
  }

  private _onStart(ev: Event): void {
    ev.stopPropagation();
    this._service('start');
  }

  private _onPause(ev: Event): void {
    ev.stopPropagation();
    this._service('pause');
  }

  private _onCancel(ev: Event): void {
    ev.stopPropagation();
    this._service('cancel');
  }

  /** Icon button mirrors the primary trailing action: pause when running, else start. */
  private _onPrimary(ev: Event): void {
    ev.stopPropagation();
    const stateObj = this._config ? this.hass?.states[this._config.entity] : undefined;
    if (!stateObj || isUnavailable(stateObj)) return;
    this._service(this._displayState(stateObj) === 'active' ? 'pause' : 'start');
  }

  private _onCardClick(): void {
    if (this._config) moreInfo(this, this._config.entity);
  }

  protected render(): TemplateResult | typeof nothing {
    const config = this._config;
    const hass = this.hass;
    if (!config || !hass) return nothing;
    const stateObj = hass.states[config.entity];
    if (!stateObj) {
      return html`
        <ha-card class="control">
          <div class="warning">Entity not found: ${config.entity}</div>
        </ha-card>
      `;
    }

    const unavailable = isUnavailable(stateObj);
    const display = this._displayState(stateObj);
    const active = display === 'active';
    const durationS = parseDuration(stateObj.attributes.duration);
    const remainingS = this._remainingSeconds(stateObj, display, durationS);
    const elapsed =
      display === 'idle' || durationS <= 0 ? 0 : clamp(1 - remainingS / durationS, 0, 1);
    const accent = accentFor(stateObj, config.color);
    const name = config.name ?? stateObj.attributes.friendly_name ?? config.entity;

    const stateLine = unavailable
      ? html`${stateText(hass, stateObj)}`
      : active
        ? html`${formatSeconds(remainingS)} left`
        : display === 'paused'
          ? html`Paused<span class="sep">·</span>${formatSeconds(remainingS)}`
          : durationS > 0
            ? html`Idle<span class="sep">·</span>${formatSeconds(durationS)}`
            : html`Idle`;

    const buttons =
      unavailable || display === 'idle'
        ? html`
            <button
              class="btn primary"
              .disabled=${unavailable}
              aria-label=${`Start ${name}`}
              @click=${this._onStart}
            >
              <ha-icon .icon=${'mdi:play'}></ha-icon>
            </button>
          `
        : html`
            <button
              class="btn primary"
              aria-label=${active ? `Pause ${name}` : `Resume ${name}`}
              @click=${active ? this._onPause : this._onStart}
            >
              <ha-icon .icon=${active ? 'mdi:pause' : 'mdi:play'}></ha-icon>
            </button>
            <button class="btn" aria-label=${`Cancel ${name}`} @click=${this._onCancel}>
              <ha-icon .icon=${'mdi:close'}></ha-icon>
            </button>
          `;

    return html`
      <ha-card
        class="control ${unavailable ? 'unavailable' : ''}"
        style="--silk-accent:${accent}"
        @click=${this._onCardClick}
      >
        <button
          class="icon ${active ? 'on' : ''}"
          .disabled=${unavailable}
          aria-label=${active ? `Pause ${name}` : `Start ${name}`}
          @click=${this._onPrimary}
        >
          ${config.icon
            ? html`<ha-icon .icon=${config.icon}></ha-icon>`
            : html`<ha-state-icon .hass=${hass} .stateObj=${stateObj}></ha-state-icon>`}
        </button>
        <div class="info">
          <div class="name">${name}</div>
          <div class="state">${stateLine}</div>
        </div>
        <div class="trailing">${buttons}</div>
        <div class="track ${unavailable || display === 'idle' ? 'hidden' : ''}" aria-hidden="true">
          <div
            class="bar ${display === 'idle' ? 'snap' : ''}"
            style="width:${(elapsed * 100).toFixed(2)}%"
          ></div>
        </div>
      </ha-card>
    `;
  }

  static styles = [
    silkControlStyles,
    css`
      .btn {
        flex: none;
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
          color 200ms ease;
      }
      .btn:hover {
        background: rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.1);
      }
      .btn:active {
        transform: scale(0.9);
        transition-duration: 120ms;
        transition-timing-function: var(--silk-ease-out);
      }
      .btn.primary {
        color: var(--silk-accent);
        background: color-mix(in srgb, var(--silk-accent) 16%, transparent);
      }
      .btn ha-icon {
        --mdc-icon-size: 20px;
        pointer-events: none;
      }
      .btn:disabled,
      .icon:disabled {
        cursor: default;
      }
      .btn:focus-visible {
        outline: 2px solid color-mix(in srgb, var(--silk-accent) 70%, transparent);
        outline-offset: 2px;
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
      /* 1s linear matches the tick cadence, so the fill glides continuously. */
      .bar {
        position: absolute;
        inset: 0 auto 0 0;
        background: var(--silk-accent);
        transition:
          width 1000ms linear,
          background 200ms ease;
      }
      .bar.snap {
        transition: background 200ms ease;
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    'silk-timer-card': SilkTimerCard;
  }
}
