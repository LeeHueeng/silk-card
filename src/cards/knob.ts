import { LitElement, html, svg, css, nothing, PropertyValues, TemplateResult } from 'lit';
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
  clamp,
} from '../shared/service';
import { accentFor } from '../shared/color';
import { registerEditor } from '../shared/editor';

export const META = {
  type: 'silk-knob-card',
  name: 'Silk Knob',
  description: 'A rotary dial you actually turn.',
};

export interface SilkKnobCardConfig extends LovelaceCardConfig {
  entity: string;
  name?: string;
  color?: string;
}

const EDITOR_TAG = 'silk-knob-card-editor';

registerEditor(
  EDITOR_TAG,
  [
    {
      name: 'entity',
      required: true,
      selector: { entity: { domain: ['light', 'fan', 'media_player', 'number', 'input_number'] } },
    },
    { name: 'name', selector: { text: {} } },
    { name: 'color', selector: { text: {} } },
  ],
  { entity: 'Entity', name: 'Name', color: 'Accent color' }
);

/** Domains the knob knows how to read and write. */
const SUPPORTED_DOMAINS = ['light', 'fan', 'media_player', 'number', 'input_number'] as const;
type KnobDomain = (typeof SUPPORTED_DOMAINS)[number];

/** What the knob controls for one entity: its range, step and semantics. */
interface LevelSpec {
  min: number;
  max: number;
  step: number;
  /** Readout renders as `NN%` instead of raw value + unit. */
  percent: boolean;
  /** A no-drag tap toggles the entity (numbers have nothing to toggle). */
  toggleable: boolean;
}

function levelSpec(domain: KnobDomain, stateObj: HassEntity): LevelSpec {
  if (domain === 'number' || domain === 'input_number') {
    const min = Number(stateObj.attributes.min);
    const max = Number(stateObj.attributes.max);
    const step = Number(stateObj.attributes.step);
    const lo = Number.isFinite(min) ? min : 0;
    const hi = Number.isFinite(max) && max > lo ? max : lo + 100;
    return {
      min: lo,
      max: hi,
      step: Number.isFinite(step) && step > 0 ? step : 1,
      percent: false,
      toggleable: false,
    };
  }
  if (domain === 'fan') {
    const step = Number(stateObj.attributes.percentage_step);
    return {
      min: 0,
      max: 100,
      step: Number.isFinite(step) && step > 0 ? step : 1,
      percent: true,
      toggleable: true,
    };
  }
  // light brightness / media volume
  return { min: 0, max: 100, step: 1, percent: true, toggleable: true };
}

/** Current level of the entity in spec units, or null when unknowable. */
function readLevel(domain: KnobDomain, stateObj: HassEntity): number | null {
  switch (domain) {
    case 'light': {
      if (stateObj.state !== 'on') return 0;
      const brightness = stateObj.attributes.brightness;
      if (typeof brightness !== 'number') return 100; // on/off light reporting on
      return clamp(Math.round((brightness / 255) * 100), 1, 100);
    }
    case 'fan': {
      if (stateObj.state === 'off') return 0;
      const pct = stateObj.attributes.percentage;
      if (typeof pct === 'number') return pct;
      return stateObj.state === 'on' ? 100 : null;
    }
    case 'media_player': {
      const vol = stateObj.attributes.volume_level;
      return typeof vol === 'number' ? vol * 100 : null;
    }
    case 'number':
    case 'input_number': {
      const n = Number(stateObj.state);
      return Number.isFinite(n) ? n : null;
    }
  }
}

function sendLevel(
  hass: HomeAssistant,
  entityId: string,
  domain: KnobDomain,
  value: number
): void {
  switch (domain) {
    case 'light':
      if (value <= 0) {
        hass.callService('light', 'turn_off', { entity_id: entityId });
      } else {
        hass.callService('light', 'turn_on', {
          entity_id: entityId,
          brightness_pct: Math.round(value),
        });
      }
      return;
    case 'fan':
      hass.callService('fan', 'set_percentage', {
        entity_id: entityId,
        percentage: Math.round(value),
      });
      return;
    case 'media_player':
      hass.callService('media_player', 'volume_set', {
        entity_id: entityId,
        volume_level: Math.round(value) / 100,
      });
      return;
    case 'number':
    case 'input_number':
      hass.callService(domain, 'set_value', { entity_id: entityId, value });
      return;
  }
}

function snapTo(raw: number, spec: LevelSpec): number {
  const stepped = Math.round((raw - spec.min) / spec.step) * spec.step + spec.min;
  return clamp(Number(stepped.toFixed(3)), spec.min, spec.max);
}

/** Decimal places implied by a step (0.5 → 1), capped for float noise. */
function stepDecimals(step: number): number {
  const text = String(step);
  const dot = text.indexOf('.');
  return dot === -1 ? 0 : Math.min(text.length - dot - 1, 3);
}

/**
 * Dial geometry. The knob face is 92px at design size inside a 118px stage
 * that also holds the tick ring. Everything is one SVG (preserveAspectRatio
 * keeps it round at any card size). Angles are measured clockwise from
 * 12 o'clock across a 270° sweep, −135°..+135°, gap at the bottom — the same
 * sweep the Silk gauge uses.
 */
const STAGE = 118;
const C = STAGE / 2;
const KNOB_R = 46; // 92px knob
const TICK_R_IN = 50.5;
const TICK_R_OUT = 56.5;
const TICK_COUNT = 25;
const SWEEP_DEG = 270;
const SWEEP_START_DEG = -135;
const IND_R_IN = 19; // accent indicator runs from mid-face…
const IND_R_OUT = 40; // …out toward the knob edge
const DRAG_THRESHOLD_PX = 4;
const OPTIMISTIC_TTL_MS = 2000;

interface TickSeg {
  x1: string;
  y1: string;
  x2: string;
  y2: string;
}

const TICK_SEGS: TickSeg[] = Array.from({ length: TICK_COUNT }, (_, i) => {
  const rad = ((SWEEP_START_DEG + (SWEEP_DEG * i) / (TICK_COUNT - 1)) * Math.PI) / 180;
  const dx = Math.sin(rad);
  const dy = -Math.cos(rad);
  return {
    x1: (C + TICK_R_IN * dx).toFixed(2),
    y1: (C + TICK_R_IN * dy).toFixed(2),
    x2: (C + TICK_R_OUT * dx).toFixed(2),
    y2: (C + TICK_R_OUT * dy).toFixed(2),
  };
});

@customElement('silk-knob-card')
export class SilkKnobCard extends LitElement {
  @property({ attribute: false }) public hass?: HomeAssistant;

  @state() private _config?: SilkKnobCardConfig;
  /** Live value while the pointer is turning the knob (never sent yet). */
  @state() private _dragValue: number | null = null;
  /** Value we told HA to go to; shown until the real state confirms. */
  @state() private _optimistic: number | null = null;
  /** Pointer is down on the dial (press-in scale). */
  @state() private _pressed = false;
  /** Pointer moved past the tap threshold (transitions off). */
  @state() private _dragging = false;

  private _centerX = 0;
  private _centerY = 0;
  private _startX = 0;
  private _startY = 0;
  private _optimisticTimer?: number;
  private _lastUpdated?: string;

  public static getStubConfig(hass: HomeAssistant): Partial<SilkKnobCardConfig> {
    const entity = Object.keys(hass.states).find((id) => id.startsWith('light.'));
    return { type: 'custom:silk-knob-card', entity };
  }

  public static async getConfigElement(): Promise<HTMLElement> {
    return document.createElement(EDITOR_TAG);
  }

  public setConfig(config: SilkKnobCardConfig): void {
    if (!config.entity) {
      throw new Error('silk-knob-card: `entity` is required');
    }
    const domain = domainOf(config.entity);
    if (!(SUPPORTED_DOMAINS as readonly string[]).includes(domain)) {
      throw new Error(
        `silk-knob-card: unsupported domain "${domain}" — use light, fan, media_player, number or input_number`
      );
    }
    this._config = config;
    this._clearOptimistic();
  }

  public getCardSize(): number {
    return 2;
  }

  public getGridOptions(): Record<string, number> {
    return { columns: 3, rows: 2, min_columns: 2, min_rows: 2 };
  }

  public disconnectedCallback(): void {
    super.disconnectedCallback();
    window.clearTimeout(this._optimisticTimer);
    this._optimisticTimer = undefined;
  }

  protected willUpdate(changed: PropertyValues): void {
    if (!changed.has('hass') || !this._config) return;
    // The real state arrived: drop the optimistic override (never mid-turn).
    const stamp = this.hass?.states[this._config.entity]?.last_updated;
    if (stamp !== this._lastUpdated) {
      this._lastUpdated = stamp;
      if (!this._pressed) this._clearOptimistic();
    }
  }

  private _clearOptimistic(): void {
    window.clearTimeout(this._optimisticTimer);
    this._optimisticTimer = undefined;
    this._optimistic = null;
  }

  private _holdOptimistic(): void {
    window.clearTimeout(this._optimisticTimer);
    this._optimisticTimer = window.setTimeout(() => this._clearOptimistic(), OPTIMISTIC_TTL_MS);
  }

  private _displayLevel(stateObj: HassEntity, domain: KnobDomain): number | null {
    return this._dragValue ?? this._optimistic ?? readLevel(domain, stateObj);
  }

  private _locale(): string {
    return this.hass?.locale?.language ?? this.hass?.language ?? 'en';
  }

  private _formatNumber(value: number, decimals: number): string {
    return new Intl.NumberFormat(this._locale(), {
      maximumFractionDigits: decimals,
    }).format(value);
  }

  /**
   * Pointer position → knob value. Pure atan2 around the knob center, clamped
   * to the 270° sweep — so once the finger leaves the knob radius (or the
   * card) the angle still tracks, which is what makes big vertical swipes
   * keep working mid-turn.
   */
  private _valueFromPointer(ev: PointerEvent, spec: LevelSpec): number {
    const deg =
      (Math.atan2(ev.clientX - this._centerX, this._centerY - ev.clientY) * 180) / Math.PI;
    const clamped = clamp(deg, SWEEP_START_DEG, SWEEP_START_DEG + SWEEP_DEG);
    const frac = (clamped - SWEEP_START_DEG) / SWEEP_DEG;
    return snapTo(spec.min + frac * (spec.max - spec.min), spec);
  }

  private _spec(): LevelSpec | null {
    const config = this._config;
    const stateObj = config ? this.hass?.states[config.entity] : undefined;
    if (!config || !stateObj) return null;
    return levelSpec(domainOf(config.entity) as KnobDomain, stateObj);
  }

  private _onPointerDown(ev: PointerEvent): void {
    const stateObj = this._config ? this.hass?.states[this._config.entity] : undefined;
    if (!stateObj || isUnavailable(stateObj)) return;
    ev.stopPropagation();
    const dial = ev.currentTarget as HTMLElement;
    dial.setPointerCapture(ev.pointerId);
    const rect = dial.getBoundingClientRect();
    this._centerX = rect.left + rect.width / 2;
    this._centerY = rect.top + rect.height / 2;
    this._startX = ev.clientX;
    this._startY = ev.clientY;
    this._pressed = true;
    this._dragging = false;
  }

  private _onPointerMove(ev: PointerEvent): void {
    if (!this._pressed) return;
    if (!this._dragging) {
      if (
        Math.hypot(ev.clientX - this._startX, ev.clientY - this._startY) < DRAG_THRESHOLD_PX
      ) {
        return; // still a tap
      }
      this._dragging = true;
    }
    const spec = this._spec();
    if (spec) this._dragValue = this._valueFromPointer(ev, spec);
  }

  private _onPointerUp(ev: PointerEvent): void {
    if (!this._pressed) return;
    this._pressed = false;
    if (this._dragging) {
      this._dragging = false;
      const spec = this._spec();
      if (spec) this._commit(this._valueFromPointer(ev, spec));
      this._dragValue = null;
    } else {
      this._onTap();
    }
  }

  private _onPointerCancel(): void {
    this._pressed = false;
    this._dragging = false;
    this._dragValue = null;
  }

  /** Send the level, remember it optimistically, buzz. */
  private _commit(value: number): void {
    const config = this._config;
    const hass = this.hass;
    if (!config || !hass) return;
    this._optimistic = value;
    this._holdOptimistic();
    haptic(this);
    sendLevel(hass, config.entity, domainOf(config.entity) as KnobDomain, value);
  }

  /** Movement under 4px = a tap: toggle for light/fan/media, no-op for numbers. */
  private _onTap(): void {
    const config = this._config;
    const hass = this.hass;
    if (!config || !hass) return;
    const stateObj = hass.states[config.entity];
    if (!stateObj || isUnavailable(stateObj)) return;
    const domain = domainOf(config.entity) as KnobDomain;
    if (!levelSpec(domain, stateObj).toggleable) return;
    haptic(this);
    const wasActive = isActive(stateObj);
    toggleEntity(hass, config.entity);
    if (domain === 'light' || domain === 'fan') {
      // Off collapses the level to 0; on restore the device picks its level.
      this._optimistic = wasActive ? 0 : null;
      if (wasActive) this._holdOptimistic();
      else this._clearOptimistic();
    }
  }

  private _onKeydown(ev: KeyboardEvent): void {
    const config = this._config;
    const hass = this.hass;
    if (!config || !hass) return;
    const stateObj = hass.states[config.entity];
    if (!stateObj || isUnavailable(stateObj)) return;
    const key = ev.key;
    let dir = 0;
    if (key === 'ArrowUp' || key === 'ArrowRight') dir = 1;
    else if (key === 'ArrowDown' || key === 'ArrowLeft') dir = -1;
    else if (key !== 'Home' && key !== 'End') return;
    ev.preventDefault();
    ev.stopPropagation();
    const domain = domainOf(config.entity) as KnobDomain;
    const spec = levelSpec(domain, stateObj);
    const current = this._displayLevel(stateObj, domain) ?? spec.min;
    const target =
      key === 'Home' ? spec.min : key === 'End' ? spec.max : snapTo(current + dir * spec.step, spec);
    if (target !== current) this._commit(target);
  }

  private _onCardClick(): void {
    if (this._config) moreInfo(this, this._config.entity);
  }

  private _swallowClick(ev: Event): void {
    // The click that follows a turn or tap on the dial must not open more-info.
    ev.stopPropagation();
  }

  protected render(): TemplateResult | typeof nothing {
    const config = this._config;
    const hass = this.hass;
    if (!config || !hass) return nothing;
    const stateObj = hass.states[config.entity];
    if (!stateObj) {
      return html`<ha-card><div class="warning">Entity not found: ${config.entity}</div></ha-card>`;
    }

    const domain = domainOf(config.entity) as KnobDomain;
    const spec = levelSpec(domain, stateObj);
    const unavailable = isUnavailable(stateObj);
    const level = unavailable ? null : this._displayLevel(stateObj, domain);
    const span = spec.max - spec.min || 1;
    const frac = level === null ? 0 : clamp((level - spec.min) / span, 0, 1);
    const litFrac = level === null ? -1 : frac; // -1 lights no ticks
    const angle = SWEEP_START_DEG + SWEEP_DEG * frac;
    const accent = accentFor(stateObj, config.color);
    const name = config.name ?? stateObj.attributes.friendly_name ?? config.entity;
    const unit: string = spec.percent ? '' : (stateObj.attributes.unit_of_measurement ?? '');
    const valueText =
      level === null
        ? '—'
        : spec.percent
          ? `${Math.round(level)}%`
          : this._formatNumber(level, stepDecimals(spec.step));

    return html`
      <ha-card
        class=${unavailable ? 'unavailable' : ''}
        style="--silk-accent:${accent}"
        @click=${this._onCardClick}
      >
        <div
          class="dial ${this._dragging ? 'dragging' : ''} ${this._pressed ? 'pressed' : ''}"
          role="slider"
          tabindex=${unavailable ? -1 : 0}
          aria-label=${name}
          aria-valuemin=${spec.min}
          aria-valuemax=${spec.max}
          aria-valuenow=${level === null ? spec.min : spec.percent ? Math.round(level) : level}
          aria-valuetext=${unit ? `${valueText} ${unit}` : valueText}
          @pointerdown=${this._onPointerDown}
          @pointermove=${this._onPointerMove}
          @pointerup=${this._onPointerUp}
          @pointercancel=${this._onPointerCancel}
          @keydown=${this._onKeydown}
          @click=${this._swallowClick}
        >
          <svg viewBox="0 0 ${STAGE} ${STAGE}" aria-hidden="true">
            <defs>
              <filter id="silk-knob-shadow" x="-20%" y="-20%" width="140%" height="140%">
                <feDropShadow
                  dx="0"
                  dy="1.2"
                  stdDeviation="1.4"
                  flood-color="#000"
                  flood-opacity="0.18"
                ></feDropShadow>
              </filter>
            </defs>
            ${TICK_SEGS.map(
              (t, i) =>
                svg`<line
                  class="tick ${i / (TICK_COUNT - 1) <= litFrac + 1e-6 ? 'on' : ''}"
                  x1=${t.x1} y1=${t.y1} x2=${t.x2} y2=${t.y2}
                ></line>`
            )}
            <g class="knob-g">
              <circle
                class="face"
                cx=${C}
                cy=${C}
                r=${KNOB_R}
                filter="url(#silk-knob-shadow)"
              ></circle>
              <circle class="rim" cx=${C} cy=${C} r=${KNOB_R - 3} ></circle>
              <g class="ind" style="transform: rotate(${angle}deg)">
                <line class="mark" x1=${C} y1=${C - IND_R_OUT} x2=${C} y2=${C - IND_R_IN}></line>
              </g>
            </g>
          </svg>
        </div>
        <div class="readout">
          <span class="value">${valueText}</span>
          ${unit ? html`<span class="unit">${unit}</span>` : nothing}
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
        gap: 2px;
        padding: 8px 12px;
      }
      .dial {
        /* Basis is the full 118px stage; shrinks proportionally in tight grids. */
        flex: 1 1 ${STAGE}px;
        min-height: 44px;
        min-width: 0;
        width: 100%;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 14px;
        outline: none;
        cursor: grab;
        touch-action: none;
      }
      .dial.pressed {
        cursor: grabbing;
      }
      .dial:focus-visible {
        outline: 2px solid color-mix(in srgb, var(--silk-accent) 70%, transparent);
        outline-offset: -2px;
      }
      svg {
        display: block;
        width: 100%;
        height: 100%;
        max-width: ${STAGE}px;
        max-height: ${STAGE}px;
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
      /*
       * Neutral monochrome depth only: a gray face from the text color (reads
       * darker-on-light and lighter-on-dark), a 1px bezel ring, a black-alpha
       * machined rim, and a small neutral cast shadow. No chromatic shading.
       */
      .face {
        fill: rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.07);
        stroke: rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.16);
        stroke-width: 1;
      }
      .rim {
        fill: none;
        stroke: rgba(0, 0, 0, 0.1);
        stroke-width: 2.5;
      }
      .mark {
        stroke: var(--silk-accent);
        stroke-width: 3;
        stroke-linecap: round;
      }
      .ind {
        transform-origin: ${C}px ${C}px;
        transition: transform 250ms var(--silk-spring);
      }
      .knob-g {
        transform-origin: ${C}px ${C}px;
        transition: transform 250ms var(--silk-spring);
      }
      .dial.dragging .ind {
        transition: none;
      }
      .dial.pressed .knob-g {
        transform: scale(0.97);
        transition: transform 120ms var(--silk-ease-out);
      }
      .readout {
        flex: none;
        display: flex;
        align-items: baseline;
        justify-content: center;
        gap: 3px;
        max-width: 100%;
        min-width: 0;
      }
      .readout .value {
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .unavailable .dial,
      .unavailable .readout {
        opacity: 0.45;
      }
      .unavailable .dial {
        cursor: default;
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    'silk-knob-card': SilkKnobCard;
  }
}
