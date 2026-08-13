import { LitElement, html, css, nothing, TemplateResult } from 'lit';
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
import { registerEditor } from '../shared/editor';

export const META = {
  type: 'silk-siren-card',
  name: 'Silk Siren',
  description: 'Loud, but not by accident.',
};

/** SirenEntityFeature bits (HA core). */
const FEAT_TONES = 4;
const FEAT_DURATION = 16;

const HOLD_MS = 1200;
const HINT_MS = 2200;
const FAILED_MS = 3000;
const DEFAULT_DURATIONS = [10, 30, 60];
const MAX_TONES = 6;

/**
 * Ring geometry: the SVG overhangs the 56px trigger by 4px on every side
 * (64×64), so the 3px stroke sits just outside the button. `pathLength`
 * normalizes the circle to 100 → dashoffset = 100 − percent.
 */
const RING_VIEW = 64;
const RING_R = 30;
const RING_UNITS = 100;

/**
 * A siren exists to raise an alarm, so the error color is its honest accent —
 * the same call `silk-panic-card` makes. Nothing else on the card borrows it.
 */
const SIREN_ACCENT = 'var(--error-color, #db4437)';

interface SilkSirenCardConfig extends LovelaceCardConfig {
  entity: string;
  name?: string;
  /** Selectable durations in seconds; the stepper walks this list. */
  durations?: number[];
}

interface Note {
  text: string;
  kind: 'hint' | 'failed';
}

const EDITOR_TAG = 'silk-siren-card-editor';

// `durations` stays YAML-only: no ha-form selector models a list of numbers
// without turning it into free-text the card would then have to re-parse.
registerEditor(
  EDITOR_TAG,
  [
    { name: 'entity', required: true, selector: { entity: { domain: ['siren'] } } },
    { name: 'name', selector: { text: {} } },
  ],
  { entity: 'Entity', name: 'Name' }
);

/** 10 → "10s", 60 → "1m", 90 → "1m 30s". */
function durationLabel(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const min = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return rest ? `${min}m ${rest}s` : `${min}m`;
}

function toneLabel(tone: string): string {
  const text = tone.replace(/[_-]/g, ' ');
  return text.charAt(0).toUpperCase() + text.slice(1);
}

@customElement('silk-siren-card')
export class SilkSirenCard extends LitElement {
  @property({ attribute: false }) public hass?: HomeAssistant;

  @state() private _config?: SilkSirenCardConfig;
  /** 0..1 fill of the hold ring, driven by rAF while the trigger is held. */
  @state() private _progress = 0;
  @state() private _holding = false;
  @state() private _note: Note | null = null;
  @state() private _tone: string | null = null;
  @state() private _durationIndex = 0;

  private _durations: number[] = DEFAULT_DURATIONS;
  private _raf?: number;
  private _holdStart = 0;
  private _noteTimer?: number;

  public static getStubConfig(hass: HomeAssistant): Partial<SilkSirenCardConfig> {
    const entity = Object.keys(hass.states).find((id) => id.startsWith('siren.'));
    return { type: 'custom:silk-siren-card', entity };
  }

  public static async getConfigElement(): Promise<HTMLElement> {
    return document.createElement(EDITOR_TAG);
  }

  public setConfig(config: SilkSirenCardConfig): void {
    if (!config.entity || domainOf(config.entity) !== 'siren') {
      throw new Error('silk-siren-card: define a siren `entity` (e.g. siren.hallway)');
    }
    if (config.durations !== undefined) {
      if (!Array.isArray(config.durations) || config.durations.length === 0) {
        throw new Error('silk-siren-card: `durations` must be a non-empty list of seconds');
      }
      if (!config.durations.every((d) => Number.isFinite(Number(d)) && Number(d) > 0)) {
        throw new Error('silk-siren-card: every entry in `durations` must be a positive number');
      }
    }
    this._config = config;
    this._durations = (config.durations ?? DEFAULT_DURATIONS).map(Number);
    this._durationIndex = 0;
    this._tone = null;
    this._cancelHold();
    this._clearNote();
  }

  public getCardSize(): number {
    return 2;
  }

  public getGridOptions(): Record<string, number> {
    return { columns: 6, rows: 2, min_columns: 4, min_rows: 2 };
  }

  public disconnectedCallback(): void {
    super.disconnectedCallback();
    this._cancelHold();
    window.clearTimeout(this._noteTimer);
    this._noteTimer = undefined;
  }

  private _stateObj(): HassEntity | undefined {
    return this._config ? this.hass?.states[this._config.entity] : undefined;
  }

  private _clearNote(): void {
    window.clearTimeout(this._noteTimer);
    this._noteTimer = undefined;
    this._note = null;
  }

  private _setNote(note: Note, ms: number): void {
    window.clearTimeout(this._noteTimer);
    this._note = note;
    this._noteTimer = window.setTimeout(() => {
      this._noteTimer = undefined;
      this._note = null;
    }, ms);
  }

  private _cancelHold(): void {
    if (this._raf !== undefined) cancelAnimationFrame(this._raf);
    this._raf = undefined;
    this._holding = false;
    this._progress = 0;
  }

  private _startHold(): void {
    const stateObj = this._stateObj();
    if (!stateObj || isUnavailable(stateObj) || this._holding) return;
    this._clearNote();
    this._holding = true;
    this._progress = 0;
    this._holdStart = performance.now();
    // A warning buzz at the *start* of the hold: the house is about to shout.
    haptic(this, 'warning');
    this._raf = requestAnimationFrame(this._tick);
  }

  private readonly _tick = (): void => {
    if (!this._holding) return;
    const progress = (performance.now() - this._holdStart) / HOLD_MS;
    if (progress >= 1) {
      this._cancelHold();
      this._fire();
      return;
    }
    this._progress = progress;
    this._raf = requestAnimationFrame(this._tick);
  };

  private _endHold(): void {
    if (!this._holding) return;
    this._cancelHold();
    // Let go too early — say what the button wanted instead of sounding it.
    this._setNote({ text: 'Hold to sound', kind: 'hint' }, HINT_MS);
  }

  private _fire(): void {
    const hass = this.hass;
    const stateObj = this._stateObj();
    if (!hass || !stateObj) return;
    const data: Record<string, unknown> = { entity_id: stateObj.entity_id };
    // Only send what the entity actually accepts; `volume_level` is left alone
    // so the siren keeps whatever level the integration was configured with.
    if (this._tone && supportsFeature(stateObj, FEAT_TONES)) data.tone = this._tone;
    if (supportsFeature(stateObj, FEAT_DURATION)) data.duration = this._duration();
    haptic(this, 'success');
    Promise.resolve(hass.callService('siren', 'turn_on', data)).catch((err) => {
      console.warn('silk-siren-card: turn_on failed', err);
      this._setNote({ text: 'Could not sound the siren', kind: 'failed' }, FAILED_MS);
    });
  }

  private _duration(): number {
    return this._durations[clamp(this._durationIndex, 0, this._durations.length - 1)];
  }

  private _onStop(ev: Event): void {
    ev.stopPropagation();
    const hass = this.hass;
    const stateObj = this._stateObj();
    if (!hass || !stateObj) return;
    this._cancelHold();
    this._clearNote();
    haptic(this, 'medium');
    Promise.resolve(hass.callService('siren', 'turn_off', { entity_id: stateObj.entity_id })).catch(
      (err) => {
        console.warn('silk-siren-card: turn_off failed', err);
        this._setNote({ text: 'Could not stop the siren', kind: 'failed' }, FAILED_MS);
      }
    );
  }

  private _onTone(ev: Event, tone: string): void {
    ev.stopPropagation();
    haptic(this, 'selection');
    // Tapping the chosen tone again hands the choice back to the device.
    this._tone = this._tone === tone ? null : tone;
  }

  private _onDurationStep(ev: Event, dir: 1 | -1): void {
    ev.stopPropagation();
    const next = clamp(this._durationIndex + dir, 0, this._durations.length - 1);
    if (next === this._durationIndex) return;
    haptic(this, 'selection');
    this._durationIndex = next;
  }

  private _onPointerDown(ev: PointerEvent): void {
    ev.stopPropagation();
    try {
      (ev.currentTarget as Element).setPointerCapture(ev.pointerId);
    } catch {
      /* the pointer may already be gone; the rAF loop still self-cancels */
    }
    this._startHold();
  }

  private _onPointerUp(ev: PointerEvent): void {
    ev.stopPropagation();
    this._endHold();
  }

  private _onKeyDown(ev: KeyboardEvent): void {
    if (ev.repeat || (ev.key !== 'Enter' && ev.key !== ' ')) return;
    ev.stopPropagation();
    ev.preventDefault(); // Space must not scroll the dashboard mid-hold
    this._startHold();
  }

  private _onKeyUp(ev: KeyboardEvent): void {
    if (ev.key !== 'Enter' && ev.key !== ' ') return;
    ev.stopPropagation();
    this._endHold();
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
      return html`<ha-card><div class="warning">Entity not found: ${config.entity}</div></ha-card>`;
    }

    const unavailable = isUnavailable(stateObj);
    const sounding = !unavailable && stateObj.state === 'on';
    const name = config.name ?? stateObj.attributes.friendly_name ?? config.entity;
    const dashoffset = (RING_UNITS * (1 - this._progress)).toFixed(2);

    return html`
      <ha-card
        class="control ${unavailable ? 'unavailable' : ''} ${sounding ? 'sounding' : ''}"
        style="--silk-accent:${SIREN_ACCENT}"
        @click=${this._onCardClick}
      >
        <div class="row">
          <!-- Not a control: one careless tap must never sound a siren. -->
          <div class="icon ${sounding ? 'on ringing' : ''}">
            <ha-state-icon .hass=${hass} .stateObj=${stateObj}></ha-state-icon>
          </div>
          <div class="info">
            <div class="name" title=${name}>${name}</div>
            <div class="state ${this._note?.kind === 'failed' ? 'bad' : ''}">
              ${this._note?.text ?? stateText(hass, stateObj)}
            </div>
          </div>
          <div class="trailing">
            ${sounding
              ? html`
                  <button class="stop" aria-label="Stop ${name}" @click=${this._onStop}>
                    Stop
                  </button>
                `
              : nothing}
            <button
              class="trigger ${this._holding ? 'holding' : ''}"
              ?disabled=${unavailable}
              aria-label="Sound ${name} — hold to activate"
              title="Hold to sound"
              @click=${(ev: Event) => ev.stopPropagation()}
              @pointerdown=${this._onPointerDown}
              @pointerup=${this._onPointerUp}
              @pointercancel=${this._onPointerUp}
              @keydown=${this._onKeyDown}
              @keyup=${this._onKeyUp}
              @contextmenu=${(ev: Event) => ev.preventDefault()}
            >
              <svg class="ring" viewBox="0 0 ${RING_VIEW} ${RING_VIEW}" aria-hidden="true">
                <circle class="ring-track" cx=${RING_VIEW / 2} cy=${RING_VIEW / 2} r=${RING_R} />
                <circle
                  class="ring-fill"
                  cx=${RING_VIEW / 2}
                  cy=${RING_VIEW / 2}
                  r=${RING_R}
                  pathLength=${RING_UNITS}
                  stroke-dasharray=${RING_UNITS}
                  style="stroke-dashoffset:${dashoffset};opacity:${this._progress > 0 ? 1 : 0}"
                />
              </svg>
              <ha-icon icon="mdi:bell-ring"></ha-icon>
            </button>
          </div>
        </div>
        <div class="row controls">${this._renderControls(stateObj, unavailable)}</div>
      </ha-card>
    `;
  }

  private _renderControls(stateObj: HassEntity, unavailable: boolean): TemplateResult {
    const raw = stateObj.attributes.available_tones;
    // Tones are only offered as a list; the dict form names tones by id, which
    // is a mapping this card would only be guessing at.
    const tones =
      supportsFeature(stateObj, FEAT_TONES) && Array.isArray(raw)
        ? raw.map(String).slice(0, MAX_TONES)
        : [];
    const hasDuration = supportsFeature(stateObj, FEAT_DURATION) && this._durations.length > 0;
    if (!tones.length && !hasDuration) {
      return html`<div class="hint">Hold the button to sound the siren</div>`;
    }
    return html`
      <div class="tones">
        ${tones.map((tone) => {
          const active = tone === this._tone;
          return html`
            <button
              class="chip ${active ? 'active' : ''}"
              aria-pressed=${active ? 'true' : 'false'}
              title=${toneLabel(tone)}
              ?disabled=${unavailable}
              @click=${(ev: Event) => this._onTone(ev, tone)}
            >
              ${toneLabel(tone)}
            </button>
          `;
        })}
      </div>
      ${hasDuration
        ? html`
            <div class="stepper" title="How long the siren sounds">
              <button
                class="step"
                ?disabled=${unavailable || this._durationIndex <= 0}
                aria-label="Shorter duration"
                @click=${(ev: Event) => this._onDurationStep(ev, -1)}
              >
                <ha-icon icon="mdi:minus"></ha-icon>
              </button>
              <span class="dur">${durationLabel(this._duration())}</span>
              <button
                class="step"
                ?disabled=${unavailable || this._durationIndex >= this._durations.length - 1}
                aria-label="Longer duration"
                @click=${(ev: Event) => this._onDurationStep(ev, 1)}
              >
                <ha-icon icon="mdi:plus"></ha-icon>
              </button>
            </div>
          `
        : nothing}
    `;
  }

  static styles = [
    silkControlStyles,
    css`
      ha-card {
        flex-direction: column;
        align-items: stretch;
        justify-content: center;
        gap: 8px;
      }
      /* An inset hairline, not a glow: while it is actually sounding, the card
         itself carries the alarm color. */
      ha-card.sounding {
        box-shadow: inset 0 0 0 2px color-mix(in srgb, var(--silk-accent) 45%, transparent);
      }
      .row {
        display: flex;
        align-items: center;
        gap: 12px;
        min-width: 0;
      }
      .row.controls {
        flex: none;
        gap: 8px;
        min-height: 32px;
      }
      .icon {
        cursor: pointer;
      }
      .icon:active {
        transform: none;
      }
      /* One pulse per second, only while the siren is genuinely sounding. */
      .icon.ringing {
        animation: silk-siren-pulse 1000ms var(--silk-ease-out) infinite;
      }
      .state.bad {
        color: var(--error-color, #db4437);
      }
      .stop {
        flex: none;
        height: 34px;
        border: none;
        border-radius: 999px;
        padding: 0 14px;
        font: inherit;
        font-size: 12.5px;
        font-weight: 600;
        cursor: pointer;
        color: var(--silk-accent);
        background: color-mix(in srgb, var(--silk-accent) 16%, transparent);
        transition:
          transform 250ms var(--silk-spring),
          background 200ms ease;
      }
      .stop:hover {
        background: color-mix(in srgb, var(--silk-accent) 24%, transparent);
      }
      .stop:active {
        transform: scale(0.94);
        transition-duration: 120ms;
        transition-timing-function: var(--silk-ease-out);
      }
      .stop:focus-visible {
        outline: 2px solid color-mix(in srgb, var(--silk-accent) 70%, transparent);
        outline-offset: 2px;
      }
      .trigger {
        position: relative;
        flex: none;
        width: 56px;
        height: 56px;
        border: none;
        border-radius: 50%;
        padding: 0;
        display: grid;
        place-items: center;
        cursor: pointer;
        color: var(--silk-accent);
        background: color-mix(in srgb, var(--silk-accent) 14%, transparent);
        overflow: visible;
        touch-action: none;
        user-select: none;
        -webkit-user-select: none;
        -webkit-tap-highlight-color: transparent;
        transition:
          transform 250ms var(--silk-spring),
          background 200ms ease;
      }
      .trigger:hover:not(:disabled) {
        background: color-mix(in srgb, var(--silk-accent) 20%, transparent);
      }
      /* A held trigger sinks and stays there until it fires or is released. */
      .trigger.holding {
        transform: scale(0.94);
        background: color-mix(in srgb, var(--silk-accent) 24%, transparent);
        transition-duration: 120ms;
        transition-timing-function: var(--silk-ease-out);
      }
      .trigger:focus-visible {
        outline: 2px solid color-mix(in srgb, var(--silk-accent) 70%, transparent);
        outline-offset: 4px;
      }
      .trigger:disabled {
        cursor: default;
        opacity: 0.45;
      }
      .trigger ha-icon {
        --mdc-icon-size: 26px;
        position: relative;
        z-index: 1;
        pointer-events: none;
      }
      .ring {
        position: absolute;
        inset: -4px;
        width: ${RING_VIEW}px;
        height: ${RING_VIEW}px;
        /* Start the sweep at 12 o'clock. */
        transform: rotate(-90deg);
        pointer-events: none;
        overflow: visible;
      }
      .ring-track {
        fill: none;
        stroke: rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.1);
        stroke-width: 3;
      }
      .ring-fill {
        fill: none;
        stroke: var(--silk-accent);
        stroke-width: 3;
        stroke-linecap: round;
        transition: opacity 150ms ease;
      }
      .tones {
        flex: 1 1 auto;
        display: flex;
        align-items: center;
        gap: 6px;
        min-width: 0;
        overflow-x: auto;
        scrollbar-width: none;
        -ms-overflow-style: none;
      }
      .tones::-webkit-scrollbar {
        display: none;
      }
      .chip {
        position: relative;
        flex: none;
        max-width: 104px;
        height: 30px;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        transition:
          transform 250ms var(--silk-spring),
          background 200ms ease,
          color 200ms ease;
      }
      /* Invisible halo lifts the 30px chip past the touch-target floor. */
      .chip::after {
        content: '';
        position: absolute;
        inset: -6px;
        border-radius: 999px;
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
      }
      .stepper {
        flex: none;
        display: flex;
        align-items: center;
        gap: 6px;
        margin-left: auto;
      }
      .step {
        position: relative;
        flex: none;
        width: 32px;
        height: 32px;
        border: none;
        border-radius: 50%;
        display: grid;
        place-items: center;
        padding: 0;
        cursor: pointer;
        color: var(--primary-text-color);
        background: rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.06);
        transition:
          transform 250ms var(--silk-spring),
          background 200ms ease,
          opacity 200ms ease;
      }
      /* Invisible halo lifts the 32px button to a 40px touch target. */
      .step::after {
        content: '';
        position: absolute;
        inset: -4px;
        border-radius: 50%;
      }
      .step:hover:not(:disabled) {
        background: rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.12);
      }
      .step:active:not(:disabled) {
        transform: scale(0.9);
        transition-duration: 120ms;
        transition-timing-function: var(--silk-ease-out);
      }
      .step:disabled {
        opacity: 0.35;
        cursor: default;
      }
      .step ha-icon {
        --mdc-icon-size: 16px;
        pointer-events: none;
      }
      .dur {
        min-width: 44px;
        text-align: center;
        font-size: 13px;
        font-weight: 600;
        color: var(--primary-text-color);
        font-variant-numeric: tabular-nums;
        white-space: nowrap;
      }
      .hint {
        flex: 1;
        min-width: 0;
        font-size: 12px;
        line-height: 32px;
        color: var(--secondary-text-color);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .unavailable .controls {
        opacity: 0.45;
        pointer-events: none;
      }
      @keyframes silk-siren-pulse {
        0% {
          transform: scale(1);
        }
        18% {
          transform: scale(1.08);
        }
        45% {
          transform: scale(1);
        }
        100% {
          transform: scale(1);
        }
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    'silk-siren-card': SilkSirenCard;
  }
}
