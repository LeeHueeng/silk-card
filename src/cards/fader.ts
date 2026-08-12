import { LitElement, html, css, nothing, PropertyValues, TemplateResult } from 'lit';
import { customElement, property, query, state } from 'lit/decorators.js';
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
  type: 'silk-fader-card',
  name: 'Silk Fader',
  description: 'A studio fader for lights, covers, and anything with a level.',
};

export interface SilkFaderCardConfig extends LovelaceCardConfig {
  entity: string;
  name?: string;
  color?: string;
}

const EDITOR_TAG = 'silk-fader-card-editor';

registerEditor(
  EDITOR_TAG,
  [
    {
      name: 'entity',
      required: true,
      selector: {
        entity: { domain: ['light', 'cover', 'fan', 'media_player', 'number', 'input_number'] },
      },
    },
    { name: 'name', selector: { text: {} } },
    { name: 'color', selector: { text: {} } },
  ],
  { entity: 'Entity', name: 'Name', color: 'Accent color' }
);

/** Domains the fader knows how to read and write. */
const SUPPORTED_DOMAINS = [
  'light',
  'cover',
  'fan',
  'media_player',
  'number',
  'input_number',
] as const;
type FaderDomain = (typeof SUPPORTED_DOMAINS)[number];

/** What the fader controls for one entity: its range, step and semantics. */
interface LevelSpec {
  min: number;
  max: number;
  step: number;
  /** Readout renders as `NN%` instead of raw value + unit. */
  percent: boolean;
  /** The bottom icon button toggles the entity (numbers have nothing to toggle). */
  toggleable: boolean;
}

function levelSpec(domain: FaderDomain, stateObj: HassEntity): LevelSpec {
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
  // light brightness / cover position / media volume
  return { min: 0, max: 100, step: 1, percent: true, toggleable: true };
}

/** Current level of the entity in spec units, or null when unknowable. */
function readLevel(domain: FaderDomain, stateObj: HassEntity): number | null {
  switch (domain) {
    case 'light': {
      if (stateObj.state !== 'on') return 0;
      const brightness = stateObj.attributes.brightness;
      if (typeof brightness !== 'number') return 100; // on/off light reporting on
      return clamp(Math.round((brightness / 255) * 100), 1, 100);
    }
    case 'cover': {
      const pos = stateObj.attributes.current_position;
      if (typeof pos === 'number') return pos;
      if (stateObj.state === 'open') return 100;
      if (stateObj.state === 'closed') return 0;
      return null;
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
  domain: FaderDomain,
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
    case 'cover':
      hass.callService('cover', 'set_cover_position', {
        entity_id: entityId,
        position: Math.round(value),
      });
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

const CAP_H = 18; // fader cap height; its center travels 9px in from each track end
const DRAG_THRESHOLD_PX = 4;
const OPTIMISTIC_TTL_MS = 2000;

@customElement('silk-fader-card')
export class SilkFaderCard extends LitElement {
  @property({ attribute: false }) public hass?: HomeAssistant;

  @state() private _config?: SilkFaderCardConfig;
  /** Live value while the pointer rides the fader (never sent yet). */
  @state() private _dragValue: number | null = null;
  /** Value we told HA to go to; shown until the real state confirms. */
  @state() private _optimistic: number | null = null;
  /** On/off we told HA to go to via the icon button. */
  @state() private _optimisticOn: boolean | null = null;
  /** Pointer moved past the tap threshold (transitions off, 1:1 tracking). */
  @state() private _dragging = false;

  private _pressed = false;
  private _startX = 0;
  private _startY = 0;
  private _optimisticTimer?: number;
  private _lastUpdated?: string;

  @query('.track') private _trackEl?: HTMLElement;

  public static getStubConfig(hass: HomeAssistant): Partial<SilkFaderCardConfig> {
    const ids = Object.keys(hass.states);
    const entity =
      ids.find((id) => id.startsWith('light.')) ?? ids.find((id) => id.startsWith('cover.'));
    return { type: 'custom:silk-fader-card', entity };
  }

  public static async getConfigElement(): Promise<HTMLElement> {
    return document.createElement(EDITOR_TAG);
  }

  public setConfig(config: SilkFaderCardConfig): void {
    if (!config.entity) {
      throw new Error('silk-fader-card: `entity` is required');
    }
    const domain = domainOf(config.entity);
    if (!(SUPPORTED_DOMAINS as readonly string[]).includes(domain)) {
      throw new Error(
        `silk-fader-card: unsupported domain "${domain}" — use light, cover, fan, media_player, number or input_number`
      );
    }
    this._config = config;
    this._clearOptimistic();
  }

  public getCardSize(): number {
    return 3;
  }

  public getGridOptions(): Record<string, number> {
    return { columns: 2, rows: 3, min_columns: 2, min_rows: 2 };
  }

  public disconnectedCallback(): void {
    super.disconnectedCallback();
    window.clearTimeout(this._optimisticTimer);
    this._optimisticTimer = undefined;
  }

  protected willUpdate(changed: PropertyValues): void {
    if (!changed.has('hass') || !this._config) return;
    // The real state arrived: drop the optimistic override (never mid-drag).
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
    this._optimisticOn = null;
  }

  private _holdOptimistic(): void {
    window.clearTimeout(this._optimisticTimer);
    this._optimisticTimer = window.setTimeout(() => this._clearOptimistic(), OPTIMISTIC_TTL_MS);
  }

  private _displayLevel(stateObj: HassEntity, domain: FaderDomain): number | null {
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

  private _spec(): LevelSpec | null {
    const config = this._config;
    const stateObj = config ? this.hass?.states[config.entity] : undefined;
    if (!config || !stateObj) return null;
    return levelSpec(domainOf(config.entity) as FaderDomain, stateObj);
  }

  /** Pointer y → value, 1:1 against the cap's travel range on the track. */
  private _valueFromPointer(ev: PointerEvent, spec: LevelSpec): number | null {
    const track = this._trackEl;
    if (!track) return null;
    const rect = track.getBoundingClientRect();
    const travel = rect.height - CAP_H;
    if (travel <= 0) return null;
    const frac = clamp((rect.bottom - ev.clientY - CAP_H / 2) / travel, 0, 1);
    return snapTo(spec.min + frac * (spec.max - spec.min), spec);
  }

  private _onPointerDown(ev: PointerEvent): void {
    const stateObj = this._config ? this.hass?.states[this._config.entity] : undefined;
    if (!stateObj || isUnavailable(stateObj)) return;
    (ev.currentTarget as HTMLElement).setPointerCapture(ev.pointerId);
    this._pressed = true;
    this._dragging = false;
    this._startX = ev.clientX;
    this._startY = ev.clientY;
  }

  private _onPointerMove(ev: PointerEvent): void {
    if (!this._pressed) return;
    if (!this._dragging) {
      if (
        Math.hypot(ev.clientX - this._startX, ev.clientY - this._startY) < DRAG_THRESHOLD_PX
      ) {
        return; // still a tap — don't jump the fader yet
      }
      this._dragging = true;
    }
    const spec = this._spec();
    const value = spec ? this._valueFromPointer(ev, spec) : null;
    if (value !== null) this._dragValue = value;
  }

  private _onPointerUp(ev: PointerEvent): void {
    if (!this._pressed) return;
    this._pressed = false;
    if (this._dragging) {
      this._dragging = false;
      const spec = this._spec();
      const value = spec ? this._valueFromPointer(ev, spec) : null;
      if (value !== null) this._commit(value);
      this._dragValue = null;
    } else if (this._config) {
      // A clean tap keeps the interaction contract: card = more-info.
      moreInfo(this, this._config.entity);
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
    const domain = domainOf(config.entity) as FaderDomain;
    this._optimistic = value;
    // Setting a level implies power for everything but media (volume ≠ power).
    if (domain !== 'media_player') this._optimisticOn = value > 0;
    this._holdOptimistic();
    haptic(this);
    sendLevel(hass, config.entity, domain, value);
  }

  private _onIconClick(ev: Event): void {
    ev.stopPropagation();
    const config = this._config;
    const hass = this.hass;
    if (!config || !hass) return;
    const stateObj = hass.states[config.entity];
    if (!stateObj || isUnavailable(stateObj)) return;
    const domain = domainOf(config.entity) as FaderDomain;
    if (!levelSpec(domain, stateObj).toggleable) {
      // Numbers have no on/off — fall back to more-info.
      moreInfo(this, config.entity);
      return;
    }
    haptic(this);
    const wasActive = this._optimisticOn ?? isActive(stateObj);
    toggleEntity(hass, config.entity);
    this._optimisticOn = !wasActive;
    if (wasActive) {
      // Volume survives a media off; levels collapse for the rest.
      this._optimistic = domain === 'media_player' ? null : 0;
    } else {
      // Covers open to 100; other devices restore their own level.
      this._optimistic = domain === 'cover' ? 100 : null;
    }
    this._holdOptimistic();
  }

  private _stopPointer(ev: Event): void {
    // Presses on the icon button must not start a fader drag.
    ev.stopPropagation();
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
    const domain = domainOf(config.entity) as FaderDomain;
    const spec = levelSpec(domain, stateObj);
    const current = this._displayLevel(stateObj, domain) ?? spec.min;
    const target =
      key === 'Home' ? spec.min : key === 'End' ? spec.max : snapTo(current + dir * spec.step, spec);
    if (target !== current) this._commit(target);
  }

  protected render(): TemplateResult | typeof nothing {
    const config = this._config;
    const hass = this.hass;
    if (!config || !hass) return nothing;
    const stateObj = hass.states[config.entity];
    if (!stateObj) {
      return html`<ha-card><div class="warning">Entity not found: ${config.entity}</div></ha-card>`;
    }

    const domain = domainOf(config.entity) as FaderDomain;
    const spec = levelSpec(domain, stateObj);
    const unavailable = isUnavailable(stateObj);
    const level = unavailable ? null : this._displayLevel(stateObj, domain);
    const span = spec.max - spec.min || 1;
    const frac = level === null ? 0 : clamp((level - spec.min) / span, 0, 1);
    const active = spec.toggleable && !unavailable && (this._optimisticOn ?? isActive(stateObj));
    const accent = accentFor(stateObj, config.color);
    const name = config.name ?? stateObj.attributes.friendly_name ?? config.entity;
    const unit: string = spec.percent ? '' : (stateObj.attributes.unit_of_measurement ?? '');
    const valueText =
      level === null
        ? '—'
        : spec.percent
          ? `${Math.round(level)}%`
          : this._formatNumber(level, stepDecimals(spec.step));
    const f = frac.toFixed(4);

    return html`
      <ha-card
        class=${unavailable ? 'unavailable' : ''}
        style="--silk-accent:${accent}"
        @pointerdown=${this._onPointerDown}
        @pointermove=${this._onPointerMove}
        @pointerup=${this._onPointerUp}
        @pointercancel=${this._onPointerCancel}
      >
        <div class="readout">
          <span class="value">${valueText}</span>
          ${unit ? html`<span class="unit">${unit}</span>` : nothing}
        </div>
        <div
          class="fader ${this._dragging ? 'dragging' : ''}"
          role="slider"
          aria-orientation="vertical"
          tabindex=${unavailable ? -1 : 0}
          aria-label=${name}
          aria-valuemin=${spec.min}
          aria-valuemax=${spec.max}
          aria-valuenow=${level === null ? spec.min : spec.percent ? Math.round(level) : level}
          aria-valuetext=${unit ? `${valueText} ${unit}` : valueText}
          @keydown=${this._onKeydown}
        >
          <div class="rail">
            <div class="track">
              <div class="fill" style="height: calc((100% - ${CAP_H}px) * ${f} + ${CAP_H / 2}px)"></div>
            </div>
            <div class="cap" style="bottom: calc((100% - ${CAP_H}px) * ${f})"></div>
          </div>
        </div>
        <button
          class="icon ${active ? 'on' : ''}"
          ?disabled=${unavailable}
          aria-label=${`Toggle ${name}`}
          @pointerdown=${this._stopPointer}
          @click=${this._onIconClick}
        >
          <ha-state-icon .hass=${hass} .stateObj=${stateObj}></ha-state-icon>
        </button>
      </ha-card>
    `;
  }

  static styles = [
    silkControlStyles,
    css`
      ha-card {
        flex-direction: column;
        align-items: center;
        gap: 8px;
        padding: 12px;
        /* Vertical drags ARE the control — never hand them to the scroller. */
        touch-action: none;
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
      .fader {
        /* Basis gives the track real length in masonry; flexes in the grid. */
        flex: 1 1 140px;
        min-height: 56px;
        width: 100%;
        display: flex;
        justify-content: center;
        border-radius: 10px;
        outline: none;
        cursor: grab;
      }
      .fader.dragging {
        cursor: grabbing;
      }
      .fader:focus-visible {
        outline: 2px solid color-mix(in srgb, var(--silk-accent) 70%, transparent);
        outline-offset: -2px;
      }
      .rail {
        position: relative;
        width: 10px;
        height: 100%;
      }
      .track {
        position: absolute;
        inset: 0;
        border-radius: 5px;
        overflow: hidden;
        background: rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.08);
      }
      .fill {
        position: absolute;
        left: 0;
        right: 0;
        bottom: 0;
        background: var(--silk-accent);
        transition:
          height 250ms var(--silk-spring),
          background 200ms ease;
      }
      /*
       * The cap: neutral monochrome only — card-surface body, gray bezel
       * border, black-alpha depth (drop + bottom inset) and a text-gray top
       * bevel line, so it reads raised on light and dark themes alike.
       */
      .cap {
        position: absolute;
        left: 50%;
        margin-left: -18px;
        width: 36px;
        height: ${CAP_H}px;
        border-radius: 5px;
        box-sizing: border-box;
        background: var(--card-background-color, #fff);
        border: 1px solid rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.18);
        box-shadow:
          0 2px 4px rgba(0, 0, 0, 0.22),
          inset 0 -2px 3px rgba(0, 0, 0, 0.1),
          inset 0 1px 0 rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.08);
        transition: bottom 250ms var(--silk-spring);
      }
      /* Center hairline groove across the cap. */
      .cap::after {
        content: '';
        position: absolute;
        left: 5px;
        right: 5px;
        top: 50%;
        height: 2px;
        margin-top: -1px;
        border-radius: 1px;
        background: rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.4);
      }
      .fader.dragging .fill,
      .fader.dragging .cap {
        transition: none;
      }
      .icon {
        flex: none;
      }
      .icon:disabled {
        cursor: default;
      }
      .unavailable .readout,
      .unavailable .fader {
        opacity: 0.45;
      }
      .unavailable .fader {
        cursor: default;
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    'silk-fader-card': SilkFaderCard;
  }
}
