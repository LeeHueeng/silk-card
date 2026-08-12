import { LitElement, html, svg, css, nothing, PropertyValues, TemplateResult } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { HomeAssistant, HassEntity, LovelaceCardConfig } from '../types';
import { silkControlStyles } from '../shared/base';
import {
  domainOf,
  isUnavailable,
  moreInfo,
  haptic,
  supportsFeature,
  clamp,
} from '../shared/service';
import { accentFor } from '../shared/color';
import { registerEditor } from '../shared/editor';

export const META = {
  type: 'silk-dial-card',
  name: 'Silk Dial',
  description: 'A thermostat dial worthy of your wall.',
};

export interface SilkDialCardConfig extends LovelaceCardConfig {
  entity: string;
  name?: string;
}

/** climate.ClimateEntityFeature.TARGET_TEMPERATURE_RANGE */
const FEATURE_TARGET_TEMPERATURE_RANGE = 2;

const SEND_DEBOUNCE_MS = 800;
const OPTIMISTIC_HOLD_MS = 2000;
const DRAG_THRESHOLD_PX = 4;

/** Same hvac icon language as silk-climate-card. */
const MODE_ICONS: Record<string, string> = {
  heat: 'mdi:fire',
  cool: 'mdi:snowflake',
  heat_cool: 'mdi:sun-snowflake-variant',
  auto: 'mdi:thermostat-auto',
  dry: 'mdi:water-percent',
  fan_only: 'mdi:fan',
  off: 'mdi:power',
};

const EDITOR_TAG = 'silk-dial-card-editor';

registerEditor(
  EDITOR_TAG,
  [
    { name: 'entity', required: true, selector: { entity: { domain: ['climate'] } } },
    { name: 'name', selector: { text: {} } },
  ],
  { entity: 'Entity', name: 'Name' }
);

/**
 * Dial geometry. A 200-unit square stage; the tick ring sweeps 270° clockwise
 * from −135° at 7:30 to +135° at 4:30 (angles measured from 12 o'clock), so
 * the 90° gap sits at the bottom where the −/+ steppers live. The face circle
 * fills the middle; the current-temperature notch rides just inside the ring.
 */
const STAGE = 200;
const C = STAGE / 2;
const SWEEP_DEG = 270;
const SWEEP_START_DEG = -135;
const TICK_COUNT = 49;
const TICK_R_IN = 87;
const TICK_R_OUT = 95;
const TARGET_R_IN = 83;
const TARGET_R_OUT = 97;
const CURRENT_R_IN = 77;
const CURRENT_R_OUT = 84;
const FACE_R = 70;

interface DialLine {
  x1: string;
  y1: string;
  x2: string;
  y2: string;
}

/** Radial segment at `frac` of the sweep (0..1), spanning rIn..rOut. */
function radialLine(frac: number, rIn: number, rOut: number): DialLine {
  const rad = ((SWEEP_START_DEG + SWEEP_DEG * frac) * Math.PI) / 180;
  const dx = Math.sin(rad);
  const dy = -Math.cos(rad);
  return {
    x1: (C + rIn * dx).toFixed(2),
    y1: (C + rIn * dy).toFixed(2),
    x2: (C + rOut * dx).toFixed(2),
    y2: (C + rOut * dy).toFixed(2),
  };
}

const TICKS: { frac: number; line: DialLine }[] = Array.from({ length: TICK_COUNT }, (_, i) => {
  const frac = i / (TICK_COUNT - 1);
  return { frac, line: radialLine(frac, TICK_R_IN, TICK_R_OUT) };
});

function asNumber(value: unknown): number | undefined {
  if (value === null || value === undefined || value === '') return undefined;
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
}

/** Decimal places implied by a step (capped at 2 to defeat float noise). */
function stepDecimals(step: number): number {
  const text = String(step);
  const dot = text.indexOf('.');
  return dot < 0 ? 0 : Math.min(text.length - dot - 1, 2);
}

function titleCase(value: string): string {
  const text = value.replace(/_/g, ' ');
  return text.charAt(0).toUpperCase() + text.slice(1);
}

type TargetKey = 'target' | 'low' | 'high';

@customElement('silk-dial-card')
export class SilkDialCard extends LitElement {
  @property({ attribute: false }) public hass?: HomeAssistant;

  @state() private _config?: SilkDialCardConfig;
  @state() private _optTarget?: number;
  @state() private _optLow?: number;
  @state() private _optHigh?: number;
  @state() private _optMode?: string;
  /** Pointer is down on the ring (press-in scale on the face). */
  @state() private _pressed = false;
  /** Pointer moved past the tap threshold (tick transitions off). */
  @state() private _dragging = false;

  /** Which target the active drag is moving (chosen at drag start). */
  private _dragKey: TargetKey = 'target';
  private _centerX = 0;
  private _centerY = 0;
  private _startX = 0;
  private _startY = 0;
  private _sendTimer?: number;
  private _holdTimer?: number;
  private _modeHoldTimer?: number;

  public static getStubConfig(hass: HomeAssistant): Partial<SilkDialCardConfig> {
    const entity = Object.keys(hass.states).find((id) => id.startsWith('climate.'));
    return { type: 'custom:silk-dial-card', entity };
  }

  public static async getConfigElement(): Promise<HTMLElement> {
    return document.createElement(EDITOR_TAG);
  }

  public setConfig(config: SilkDialCardConfig): void {
    if (!config.entity || domainOf(config.entity) !== 'climate') {
      throw new Error('silk-dial-card: `entity` is required and must be a climate entity');
    }
    this._config = config;
    this._optTarget = this._optLow = this._optHigh = this._optMode = undefined;
  }

  public getCardSize(): number {
    return 4;
  }

  public getGridOptions(): Record<string, number> {
    return { columns: 4, rows: 4, min_columns: 3, min_rows: 3 };
  }

  public disconnectedCallback(): void {
    super.disconnectedCallback();
    window.clearTimeout(this._holdTimer);
    window.clearTimeout(this._modeHoldTimer);
    if (this._sendTimer !== undefined) {
      // Don't lose a pending target edit just because the card left the DOM.
      window.clearTimeout(this._sendTimer);
      this._sendTimer = undefined;
      this._commit();
    }
  }

  protected willUpdate(changed: PropertyValues): void {
    if (!changed.has('hass') || !this._config || !this.hass) return;
    const oldHass = changed.get('hass') as HomeAssistant | undefined;
    const oldObj = oldHass?.states[this._config.entity];
    const newObj = this.hass.states[this._config.entity];
    if (!newObj || newObj === oldObj) return;
    // Real state updates clear optimistic overrides — but only once nothing is
    // still queued to send, and only when the confirmed field actually moved.
    if (this._sendTimer === undefined && !this._pressed) {
      const oldAttrs = oldObj?.attributes;
      const newAttrs = newObj.attributes;
      if (this._optTarget !== undefined && newAttrs.temperature !== oldAttrs?.temperature) {
        this._optTarget = undefined;
      }
      if (this._optLow !== undefined && newAttrs.target_temp_low !== oldAttrs?.target_temp_low) {
        this._optLow = undefined;
      }
      if (this._optHigh !== undefined && newAttrs.target_temp_high !== oldAttrs?.target_temp_high) {
        this._optHigh = undefined;
      }
    }
    if (this._optMode !== undefined && newObj.state !== oldObj?.state) {
      this._optMode = undefined;
    }
  }

  // ── Derived state ──────────────────────────────────────────────────────

  private _stateObj(): HassEntity | undefined {
    return this._config ? this.hass?.states[this._config.entity] : undefined;
  }

  private _bounds(stateObj: HassEntity): { min: number; max: number; step: number } {
    const attrs = stateObj.attributes;
    const min = asNumber(attrs.min_temp) ?? 7;
    const rawMax = asNumber(attrs.max_temp) ?? 35;
    const max = rawMax > min ? rawMax : min + 1;
    const rawStep = asNumber(attrs.target_temp_step);
    return { min, max, step: rawStep !== undefined && rawStep > 0 ? rawStep : 0.5 };
  }

  private _isRange(stateObj: HassEntity): boolean {
    return supportsFeature(stateObj, FEATURE_TARGET_TEMPERATURE_RANGE);
  }

  private _target(stateObj: HassEntity): number | undefined {
    return this._optTarget ?? asNumber(stateObj.attributes.temperature);
  }

  private _low(stateObj: HassEntity): number | undefined {
    return this._optLow ?? asNumber(stateObj.attributes.target_temp_low);
  }

  private _high(stateObj: HassEntity): number | undefined {
    return this._optHigh ?? asNumber(stateObj.attributes.target_temp_high);
  }

  private _frac(value: number, min: number, max: number): number {
    return clamp((value - min) / (max - min), 0, 1);
  }

  private _tempUnit(): string {
    // hass.config isn't in Silk's minimal HomeAssistant type; read it via a cast.
    const config = (this.hass as HomeAssistant & {
      config?: { unit_system?: { temperature?: string } };
    }).config;
    return config?.unit_system?.temperature ?? '°';
  }

  // ── Drag interaction ───────────────────────────────────────────────────

  /** Pointer position → temperature. Pure atan2 around the stage center. */
  private _valueFromPointer(ev: PointerEvent, stateObj: HassEntity): number {
    const { min, max, step } = this._bounds(stateObj);
    const deg =
      (Math.atan2(ev.clientX - this._centerX, this._centerY - ev.clientY) * 180) / Math.PI;
    const clamped = clamp(deg, SWEEP_START_DEG, SWEEP_START_DEG + SWEEP_DEG);
    const frac = (clamped - SWEEP_START_DEG) / SWEEP_DEG;
    const raw = min + frac * (max - min);
    const snapped = Math.round((raw - min) / step) * step + min;
    return clamp(Number(snapped.toFixed(stepDecimals(step))), min, max);
  }

  private _onPointerDown(ev: PointerEvent): void {
    const stateObj = this._stateObj();
    if (!stateObj || isUnavailable(stateObj)) return;
    ev.stopPropagation();
    const ring = ev.currentTarget as HTMLElement;
    ring.setPointerCapture(ev.pointerId);
    const rect = ring.getBoundingClientRect();
    this._centerX = rect.left + rect.width / 2;
    this._centerY = rect.top + rect.height / 2;
    this._startX = ev.clientX;
    this._startY = ev.clientY;
    this._pressed = true;
    this._dragging = false;
  }

  private _onPointerMove(ev: PointerEvent): void {
    if (!this._pressed) return;
    const stateObj = this._stateObj();
    if (!stateObj) return;
    if (!this._dragging) {
      if (Math.hypot(ev.clientX - this._startX, ev.clientY - this._startY) < DRAG_THRESHOLD_PX) {
        return; // still a tap
      }
      this._dragging = true;
      this._dragKey = this._pickDragKey(ev, stateObj);
    }
    this._applyDrag(ev, stateObj);
  }

  private _onPointerUp(): void {
    if (!this._pressed) return;
    this._pressed = false;
    if (!this._dragging) {
      // A plain tap on the dial behaves like the rest of the card: more-info.
      if (this._config) moreInfo(this, this._config.entity);
      return;
    }
    this._dragging = false;
    haptic(this);
  }

  private _onPointerCancel(): void {
    this._pressed = false;
    this._dragging = false;
  }

  private _swallowClick(ev: Event): void {
    // The click that follows any ring pointerup must not re-trigger more-info.
    ev.stopPropagation();
  }

  /** Range mode grabs whichever of low/high sits nearer the touch angle. */
  private _pickDragKey(ev: PointerEvent, stateObj: HassEntity): TargetKey {
    if (!this._isRange(stateObj)) return 'target';
    const value = this._valueFromPointer(ev, stateObj);
    const { min, max } = this._bounds(stateObj);
    const low = this._low(stateObj) ?? min;
    const high = this._high(stateObj) ?? max;
    return Math.abs(value - low) <= Math.abs(value - high) ? 'low' : 'high';
  }

  private _applyDrag(ev: PointerEvent, stateObj: HassEntity): void {
    const value = this._valueFromPointer(ev, stateObj);
    const { min, max, step } = this._bounds(stateObj);
    const decimals = stepDecimals(step);
    const fix = (n: number): number => Number(n.toFixed(decimals));
    if (this._dragKey === 'low') {
      const high = this._high(stateObj) ?? max;
      this._optLow = fix(clamp(value, min, high));
    } else if (this._dragKey === 'high') {
      const low = this._low(stateObj) ?? min;
      this._optHigh = fix(clamp(value, low, max));
    } else {
      if (this._optTarget === value) return;
      this._optTarget = value;
    }
    this._queueCommit();
  }

  // ── Steppers, keyboard, modes ──────────────────────────────────────────

  private _onStep(ev: Event, dir: 1 | -1): void {
    ev.stopPropagation();
    this._nudge(dir);
  }

  private _onKeydown(ev: KeyboardEvent): void {
    const dir =
      ev.key === 'ArrowUp' || ev.key === 'ArrowRight'
        ? 1
        : ev.key === 'ArrowDown' || ev.key === 'ArrowLeft'
          ? -1
          : 0;
    if (!dir) return;
    ev.preventDefault();
    ev.stopPropagation();
    this._nudge(dir);
  }

  /** One step up/down: moves the target, or slides the whole low–high range. */
  private _nudge(dir: 1 | -1): void {
    const stateObj = this._stateObj();
    if (!stateObj || isUnavailable(stateObj)) return;
    const { min, max, step } = this._bounds(stateObj);
    const decimals = stepDecimals(step);
    const fix = (n: number): number => Number(n.toFixed(decimals));
    const fallback = asNumber(stateObj.attributes.current_temperature) ?? (min + max) / 2;
    if (this._isRange(stateObj)) {
      const low = this._low(stateObj) ?? fallback;
      const high = this._high(stateObj) ?? fallback;
      let shift = dir * step;
      if (low + shift < min) shift = min - low;
      if (high + shift > max) shift = max - high;
      if (shift === 0) return;
      this._optLow = fix(low + shift);
      this._optHigh = fix(high + shift);
    } else {
      const base = this._target(stateObj) ?? fallback;
      this._optTarget = fix(clamp(base + dir * step, min, max));
    }
    haptic(this, 'selection');
    this._queueCommit();
  }

  private _queueCommit(): void {
    window.clearTimeout(this._holdTimer);
    window.clearTimeout(this._sendTimer);
    this._sendTimer = window.setTimeout(() => {
      this._sendTimer = undefined;
      this._commit();
    }, SEND_DEBOUNCE_MS);
  }

  private _commit(): void {
    const hass = this.hass;
    const entity = this._config?.entity;
    const stateObj = entity ? hass?.states[entity] : undefined;
    if (!hass || !entity || !stateObj) return;
    const data: Record<string, unknown> = { entity_id: entity };
    if (this._isRange(stateObj)) {
      const low = this._low(stateObj);
      const high = this._high(stateObj);
      if (low === undefined || high === undefined) return;
      data.target_temp_low = low;
      data.target_temp_high = high;
    } else {
      const target = this._target(stateObj);
      if (target === undefined) return;
      data.temperature = target;
    }
    hass.callService('climate', 'set_temperature', data);
    if (this.isConnected) {
      window.clearTimeout(this._holdTimer);
      this._holdTimer = window.setTimeout(() => {
        this._optTarget = this._optLow = this._optHigh = undefined;
      }, OPTIMISTIC_HOLD_MS);
    } else {
      this._optTarget = this._optLow = this._optHigh = undefined;
    }
  }

  private _onMode(ev: Event, mode: string): void {
    ev.stopPropagation();
    const hass = this.hass;
    const stateObj = this._stateObj();
    if (!hass || !this._config || !stateObj || isUnavailable(stateObj)) return;
    if ((this._optMode ?? stateObj.state) === mode) return;
    this._optMode = mode;
    haptic(this);
    hass.callService('climate', 'set_hvac_mode', {
      entity_id: this._config.entity,
      hvac_mode: mode,
    });
    window.clearTimeout(this._modeHoldTimer);
    this._modeHoldTimer = window.setTimeout(() => {
      this._optMode = undefined;
    }, OPTIMISTIC_HOLD_MS);
  }

  private _onCardClick(): void {
    if (this._config) moreInfo(this, this._config.entity);
  }

  // ── Render ─────────────────────────────────────────────────────────────

  protected render(): TemplateResult | typeof nothing {
    const config = this._config;
    const hass = this.hass;
    if (!config || !hass) return nothing;
    const stateObj = hass.states[config.entity];
    if (!stateObj) {
      return html`<ha-card><div class="warning">Entity not found: ${config.entity}</div></ha-card>`;
    }

    const unavailable = isUnavailable(stateObj);
    const displayObj: HassEntity =
      this._optMode !== undefined && this._optMode !== stateObj.state
        ? { ...stateObj, state: this._optMode }
        : stateObj;
    const accent = accentFor(displayObj);
    const name = config.name ?? stateObj.attributes.friendly_name ?? config.entity;
    const { min, max, step } = this._bounds(stateObj);
    const decimals = stepDecimals(step);
    const range = this._isRange(stateObj);
    const target = range ? undefined : this._target(stateObj);
    const low = range ? this._low(stateObj) : undefined;
    const high = range ? this._high(stateObj) : undefined;
    const current = asNumber(stateObj.attributes.current_temperature);

    // Lit sweep: up to the target, or the low–high band in range mode.
    const litFrom = range && low !== undefined ? this._frac(low, min, max) : 0;
    const litTo = range
      ? high !== undefined
        ? this._frac(high, min, max)
        : -1
      : target !== undefined
        ? this._frac(target, min, max)
        : -1;
    const dimmed = unavailable || litTo < 0;

    const targetLabel =
      range
        ? low !== undefined && high !== undefined
          ? `${low.toFixed(decimals)} – ${high.toFixed(decimals)}`
          : '–'
        : target !== undefined
          ? target.toFixed(decimals)
          : '–';
    const action = stateObj.attributes.hvac_action as string | undefined;
    const actionText = action && action !== 'off' ? titleCase(action) : undefined;

    return html`
      <ha-card
        class=${unavailable ? 'unavailable' : ''}
        style="--silk-accent:${accent}"
        @click=${this._onCardClick}
      >
        <div class="name">${name}</div>
        <div class="dial-area">
          <div
            class="stage ${this._pressed ? 'pressed' : ''} ${this._dragging ? 'dragging' : ''}"
            role="slider"
            tabindex=${unavailable ? -1 : 0}
            aria-label=${`${name} target temperature`}
            aria-valuemin=${min}
            aria-valuemax=${max}
            aria-valuenow=${range ? (high ?? min) : (target ?? min)}
            aria-valuetext=${`${targetLabel}${this._tempUnit()}`}
            @pointerdown=${this._onPointerDown}
            @pointermove=${this._onPointerMove}
            @pointerup=${this._onPointerUp}
            @pointercancel=${this._onPointerCancel}
            @keydown=${this._onKeydown}
            @click=${this._swallowClick}
          >
            ${this._renderDial(stateObj, {
              range,
              min,
              max,
              target,
              low,
              high,
              current,
              litFrom,
              litTo,
              dimmed,
            })}
            <div class="center">
              <div class="target-line ${range ? 'range' : ''}">
                <span class="target">${targetLabel}</span
                ><span class="deg">${this._tempUnit()}</span>
              </div>
              <div class="sub">
                ${current !== undefined
                  ? html`Currently ${Math.round(current * 10) / 10}°`
                  : nothing}${current !== undefined && actionText
                  ? html`<span class="sep">·</span>`
                  : nothing}${actionText ?? nothing}
              </div>
            </div>
            <button
              class="step minus"
              ?disabled=${unavailable}
              aria-label="Decrease target temperature"
              @pointerdown=${(ev: Event) => ev.stopPropagation()}
              @click=${(ev: Event) => this._onStep(ev, -1)}
            >
              <ha-icon icon="mdi:minus"></ha-icon>
            </button>
            <button
              class="step plus"
              ?disabled=${unavailable}
              aria-label="Increase target temperature"
              @pointerdown=${(ev: Event) => ev.stopPropagation()}
              @click=${(ev: Event) => this._onStep(ev, 1)}
            >
              <ha-icon icon="mdi:plus"></ha-icon>
            </button>
          </div>
        </div>
        ${this._renderModes(stateObj, unavailable)}
      </ha-card>
    `;
  }

  private _renderDial(
    stateObj: HassEntity,
    d: {
      range: boolean;
      min: number;
      max: number;
      target?: number;
      low?: number;
      high?: number;
      current?: number;
      litFrom: number;
      litTo: number;
      dimmed: boolean;
    }
  ): TemplateResult {
    const eps = 1e-6;
    const targetTicks: number[] = [];
    if (d.range) {
      if (d.low !== undefined) targetTicks.push(this._frac(d.low, d.min, d.max));
      if (d.high !== undefined) targetTicks.push(this._frac(d.high, d.min, d.max));
    } else if (d.target !== undefined) {
      targetTicks.push(this._frac(d.target, d.min, d.max));
    }
    const currentLine =
      d.current !== undefined
        ? radialLine(this._frac(d.current, d.min, d.max), CURRENT_R_IN, CURRENT_R_OUT)
        : undefined;

    return html`
      <svg viewBox="0 0 ${STAGE} ${STAGE}" aria-hidden="true">
        <defs>
          <!-- Neutral inset shading only: black-alpha, no chroma. -->
          <radialGradient id="silk-dial-inset">
            <stop offset="70%" stop-color="rgba(0, 0, 0, 0)"></stop>
            <stop offset="94%" stop-color="rgba(0, 0, 0, 0.05)"></stop>
            <stop offset="100%" stop-color="rgba(0, 0, 0, 0.12)"></stop>
          </radialGradient>
        </defs>
        ${TICKS.map(
          (t) => svg`<line
            class="tick ${!d.dimmed && t.frac >= d.litFrom - eps && t.frac <= d.litTo + eps ? 'on' : ''}"
            x1=${t.line.x1} y1=${t.line.y1} x2=${t.line.x2} y2=${t.line.y2}
          ></line>`
        )}
        ${
          currentLine
            ? svg`<line class="tick-current"
                x1=${currentLine.x1} y1=${currentLine.y1}
                x2=${currentLine.x2} y2=${currentLine.y2}
              ></line>`
            : nothing
        }
        ${targetTicks.map((frac) => {
          const line = radialLine(frac, TARGET_R_IN, TARGET_R_OUT);
          return svg`<line class="tick-target ${d.dimmed ? '' : 'on'}"
            x1=${line.x1} y1=${line.y1} x2=${line.x2} y2=${line.y2}
          ></line>`;
        })}
        <g class="face-g">
          <circle class="face" cx=${C} cy=${C} r=${FACE_R}></circle>
          <!-- Paint-server ref stays an attribute: CSS url(#id) is unreliable in shadow DOM. -->
          <circle class="face-inset" cx=${C} cy=${C} r=${FACE_R} fill="url(#silk-dial-inset)"></circle>
          <circle class="face-rim" cx=${C} cy=${C} r=${FACE_R - 2.5}></circle>
        </g>
      </svg>
    `;
  }

  private _renderModes(stateObj: HassEntity, disabled: boolean): TemplateResult | typeof nothing {
    const modes = stateObj.attributes.hvac_modes as string[] | undefined;
    if (!modes?.length) return nothing;
    const effectiveMode = this._optMode ?? stateObj.state;
    return html`
      <div class="modes">
        ${modes.map(
          (mode) => html`
            <button
              class="chip mode ${mode === effectiveMode ? 'active' : ''}"
              ?disabled=${disabled}
              aria-label=${titleCase(mode)}
              title=${titleCase(mode)}
              @click=${(ev: Event) => this._onMode(ev, mode)}
            >
              <ha-icon .icon=${MODE_ICONS[mode] ?? 'mdi:thermostat'}></ha-icon>
            </button>
          `
        )}
      </div>
    `;
  }

  static styles = [
    silkControlStyles,
    css`
      ha-card {
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 6px;
        padding: 10px 12px 12px;
      }
      .name {
        flex: none;
        max-width: 100%;
        font-size: 13px;
        font-weight: 500;
        color: var(--secondary-text-color);
        text-align: center;
      }
      .dial-area {
        flex: 1;
        align-self: stretch;
        min-height: 160px;
        min-width: 0;
        display: grid;
        place-items: center;
        container-type: size;
      }
      .stage {
        position: relative;
        width: 100%;
        aspect-ratio: 1;
        max-width: 100%;
        max-height: 100%;
        /* Square that fits the area; falls back to width:100% without cq units. */
        width: min(100cqw, 100cqh);
        border-radius: 50%;
        outline: none;
        cursor: grab;
        touch-action: none;
      }
      .stage.pressed {
        cursor: grabbing;
      }
      .stage:focus-visible {
        outline: 2px solid color-mix(in srgb, var(--silk-accent) 70%, transparent);
        outline-offset: 2px;
      }
      svg {
        display: block;
        width: 100%;
        height: 100%;
        overflow: visible;
      }
      .tick {
        stroke: rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.15);
        stroke-width: 2;
        stroke-linecap: round;
        transition: stroke 200ms ease;
      }
      .tick.on {
        stroke: var(--silk-accent);
      }
      .tick-target {
        stroke: rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.35);
        stroke-width: 3.5;
        stroke-linecap: round;
        transition: stroke 200ms ease;
      }
      .tick-target.on {
        stroke: var(--silk-accent);
      }
      .tick-current {
        stroke: var(--secondary-text-color);
        stroke-width: 2.5;
        stroke-linecap: round;
        opacity: 0.7;
      }
      .stage.dragging .tick,
      .stage.dragging .tick-target {
        transition: none;
      }
      /*
       * Skeuomorphic face: neutral monochrome depth only — a gray disc from
       * the text color (darker-on-light, lighter-on-dark), a hairline bezel,
       * a black-alpha machined rim, and black-alpha inset shading. The accent
       * stays confined to the tick ring.
       */
      .face {
        fill: rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.06);
        stroke: rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.14);
        stroke-width: 1;
      }
      .face-inset {
        stroke: none;
        pointer-events: none;
      }
      .face-rim {
        fill: none;
        stroke: rgba(0, 0, 0, 0.08);
        stroke-width: 2;
      }
      .face-g {
        transform-origin: ${C}px ${C}px;
        transition: transform 250ms var(--silk-spring);
      }
      .stage.pressed .face-g {
        transform: scale(0.97);
        transition: transform 120ms var(--silk-ease-out);
      }
      .center {
        position: absolute;
        left: 50%;
        top: 50%;
        transform: translate(-50%, -50%);
        text-align: center;
        max-width: 62%;
        pointer-events: none;
      }
      .target-line {
        display: flex;
        align-items: flex-start;
        justify-content: center;
      }
      .target {
        font-size: 30px;
        font-weight: 700;
        letter-spacing: -0.02em;
        line-height: 1.05;
        color: var(--primary-text-color);
        font-variant-numeric: tabular-nums;
        white-space: nowrap;
      }
      .deg {
        font-size: 15px;
        font-weight: 500;
        line-height: 1;
        margin-top: 2px;
        color: var(--secondary-text-color);
      }
      .target-line.range .target {
        font-size: 21px;
        line-height: 1.2;
      }
      .target-line.range .deg {
        font-size: 12px;
        margin-top: 1px;
      }
      .sub {
        margin-top: 2px;
        font-size: 12px;
        line-height: 1.3;
        color: var(--secondary-text-color);
        font-variant-numeric: tabular-nums;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .sub .sep {
        opacity: 0.5;
        margin: 0 3px;
      }
      .step {
        position: absolute;
        bottom: 1%;
        width: 36px;
        height: 36px;
        border: none;
        border-radius: 50%;
        display: grid;
        place-items: center;
        padding: 0;
        cursor: pointer;
        z-index: 1;
        color: var(--primary-text-color);
        background: rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.06);
        transition:
          transform 250ms var(--silk-spring),
          background 200ms ease;
      }
      .step.minus {
        left: 6%;
      }
      .step.plus {
        right: 6%;
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
        cursor: default;
      }
      .step ha-icon {
        --mdc-icon-size: 18px;
        pointer-events: none;
      }
      .modes {
        flex: none;
        display: flex;
        flex-wrap: wrap;
        justify-content: center;
        gap: 6px;
        max-width: 100%;
      }
      .chip.mode {
        min-width: 40px;
        height: 30px;
        padding: 0;
        display: grid;
        place-items: center;
        transition:
          transform 250ms var(--silk-spring),
          background 200ms ease,
          color 200ms ease;
      }
      .chip.mode:active:not(:disabled) {
        transform: scale(0.94);
        transition-duration: 120ms;
        transition-timing-function: var(--silk-ease-out);
      }
      .chip.mode:disabled {
        cursor: default;
      }
      .chip.mode ha-icon {
        --mdc-icon-size: 16px;
        pointer-events: none;
      }
      .unavailable .name,
      .unavailable .dial-area,
      .unavailable .modes {
        opacity: 0.45;
      }
      .unavailable .stage {
        cursor: default;
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    'silk-dial-card': SilkDialCard;
  }
}
