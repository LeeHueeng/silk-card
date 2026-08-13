import { LitElement, html, css, nothing, PropertyValues, TemplateResult } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { HomeAssistant, HassEntity, LovelaceCardConfig } from '../types';
import { silkControlStyles } from '../shared/base';
import {
  isActive,
  isUnavailable,
  toggleEntity,
  moreInfo,
  haptic,
  stateText,
  clamp,
} from '../shared/service';
import { accentFor } from '../shared/color';
import { registerEditor } from '../shared/editor';
import { formatNumber } from '../format';

export const META = {
  type: 'silk-car-card',
  name: 'Silk Car',
  description: "Fuel, range, and whether it's locked.",
};

export interface SilkCarCardConfig extends LovelaceCardConfig {
  /** Vehicle name — the one required key. */
  name: string;
  /** Leading glyph when no `image` is set. Defaults to mdi:car. */
  icon?: string;
  /** Photo URL or path; rendered as a 56px thumbnail instead of the icon. */
  image?: string;
  /** Fuel or traction-battery level. A `%` sensor also fills the bottom bar. */
  fuel?: string;
  /** Remaining range sensor. */
  range?: string;
  /** Total distance sensor, shown trailing. */
  odometer?: string;
  /** A `lock.*` entity — the chip toggles it, unlocking asks first. */
  lock?: string;
  /** A `device_tracker.*` (or `person.*`) entity — the chip shows its zone. */
  location?: string;
  /** EV charging flag (binary_sensor / switch); adds the Charging chip. */
  charging?: string;
  /** Accent override (YAML). */
  color?: string;
}

const DEFAULT_ICON = 'mdi:car';
/** Below this the fuel bar turns red — a genuine "find a pump" warning. */
const LOW_FUEL_PCT = 15;
const OPTIMISTIC_TTL_MS = 2000;
/** Fallback distance unit when the sensor declares none. */
const DEFAULT_DISTANCE_UNIT = 'km';

const EDITOR_TAG = 'silk-car-card-editor';

// `image`, `charging` and `color` stay YAML-only: a photo path and an EV
// charging flag are one-time setup, and the form stays short enough to scan.
registerEditor(
  EDITOR_TAG,
  [
    { name: 'name', required: true, selector: { text: {} } },
    {
      name: '',
      type: 'grid',
      schema: [
        { name: 'icon', selector: { icon: {} } },
        { name: 'fuel', selector: { entity: { domain: ['sensor'] } } },
        { name: 'range', selector: { entity: { domain: ['sensor'] } } },
        { name: 'odometer', selector: { entity: { domain: ['sensor'] } } },
      ],
    },
    { name: 'lock', selector: { entity: { domain: ['lock'] } } },
    { name: 'location', selector: { entity: { domain: ['device_tracker', 'person'] } } },
  ],
  {
    name: 'Name',
    icon: 'Icon',
    fuel: 'Fuel / battery sensor',
    range: 'Range sensor',
    odometer: 'Odometer sensor',
    lock: 'Lock',
    location: 'Location tracker',
  },
  { icon: DEFAULT_ICON }
);

/** Lock-chip tone. Security state is genuinely semantic, so status colors apply. */
type LockTone = 'good' | 'bad' | 'pending';

function lockTone(lockState: string): LockTone {
  if (lockState === 'locked') return 'good';
  if (lockState === 'locking' || lockState === 'unlocking') return 'pending';
  return 'bad'; // unlocked, open, jammed
}

/**
 * A vehicle summary: how full it is, how far it will go, and whether you left
 * it open. Everything is optional except the name, so the same card serves a
 * combustion car with a fuel percentage and an EV with a charging flag.
 */
@customElement('silk-car-card')
export class SilkCarCard extends LitElement {
  @property({ attribute: false }) public hass?: HomeAssistant;

  @state() private _config?: SilkCarCardConfig;

  /** Optimistic lock state ('locking' | 'unlocking'); null = trust HA. */
  @state() private _lockOptimistic: string | null = null;

  /** Configured image that failed to load → fall back to the icon. */
  @state() private _brokenImage?: string;

  /** last_updated snapshot at call time; any newer stamp clears the override. */
  private _lockBase = '';
  private _lockTimer?: number;

  public static getStubConfig(hass: HomeAssistant): Partial<SilkCarCardConfig> {
    const ids = Object.keys(hass.states);
    const numeric = (id: string): boolean => Number.isFinite(Number(hass.states[id].state));
    const fuel = ids.find(
      (id) => id.startsWith('sensor.') && /fuel|battery/i.test(id) && numeric(id)
    );
    return {
      type: 'custom:silk-car-card',
      name: 'Car',
      icon: DEFAULT_ICON,
      fuel,
      lock: ids.find((id) => id.startsWith('lock.')),
      location: ids.find((id) => id.startsWith('device_tracker.')),
    };
  }

  public static async getConfigElement(): Promise<HTMLElement> {
    return document.createElement(EDITOR_TAG);
  }

  public setConfig(config: SilkCarCardConfig): void {
    if (!config.name) {
      throw new Error('silk-car-card: `name` is required (e.g. name: Kona)');
    }
    this._config = config;
    this._brokenImage = undefined;
    this._clearLockOptimistic();
  }

  public getCardSize(): number {
    return 2;
  }

  public getGridOptions(): Record<string, number> {
    return { columns: 6, rows: 2, min_columns: 4, min_rows: 2 };
  }

  public disconnectedCallback(): void {
    super.disconnectedCallback();
    window.clearTimeout(this._lockTimer);
    this._lockTimer = undefined;
  }

  protected willUpdate(changed: PropertyValues): void {
    if (!changed.has('hass') || this._lockOptimistic === null) return;
    const id = this._config?.lock;
    if (!id) return;
    const stateObj = this.hass?.states[id];
    if (stateObj && stateObj.last_updated !== this._lockBase) this._clearLockOptimistic();
  }

  private _clearLockOptimistic(): void {
    window.clearTimeout(this._lockTimer);
    this._lockTimer = undefined;
    this._lockOptimistic = null;
  }

  /** Every entity the card was pointed at, in more-info priority order. */
  private _tracked(): string[] {
    const config = this._config;
    if (!config) return [];
    return [
      config.fuel,
      config.location,
      config.range,
      config.odometer,
      config.charging,
      config.lock,
    ].filter((id): id is string => typeof id === 'string' && id !== '');
  }

  /**
   * Fuel as a 0–100 bar fraction. Only an explicit `%` unit can fill a bar
   * honestly — litres say nothing without a tank size, so they stay text.
   */
  private _fuelPct(fuelObj?: HassEntity): number | null {
    if (!fuelObj || isUnavailable(fuelObj)) return null;
    if (String(fuelObj.attributes.unit_of_measurement ?? '') !== '%') return null;
    const value = Number(fuelObj.state);
    return Number.isFinite(value) ? clamp(value, 0, 100) : null;
  }

  /** '62%' for percentages, '38 L' / '412 km' for anything else. */
  private _reading(id: string | undefined, fallbackUnit?: string): string | null {
    const hass = this.hass;
    if (!id || !hass) return null;
    const stateObj = hass.states[id];
    if (!stateObj || isUnavailable(stateObj) || stateObj.state === '') return null;
    const value = Number(stateObj.state);
    if (!Number.isFinite(value)) return null;
    const unit = String(stateObj.attributes.unit_of_measurement ?? fallbackUnit ?? '');
    // Percentages read as whole numbers across the suite — 62%, never 62.0%.
    if (unit === '%') return `${Math.round(value)}%`;
    const text = formatNumber(hass, id, value);
    return unit ? `${text} ${unit}` : text;
  }

  /** Odometer split into value + unit so the unit can recede typographically. */
  private _odometer(hass: HomeAssistant, id?: string): { text: string; unit: string } | null {
    if (!id) return null;
    const stateObj = hass.states[id];
    if (!stateObj || isUnavailable(stateObj) || stateObj.state === '') return null;
    const value = Number(stateObj.state);
    if (!Number.isFinite(value)) return null;
    return {
      text: formatNumber(hass, id, value),
      unit: String(stateObj.attributes.unit_of_measurement ?? DEFAULT_DISTANCE_UNIT),
    };
  }

  /** 'Home' / 'Away' / zone name — localized when hass provides a formatter. */
  private _placeLabel(hass: HomeAssistant, stateObj: HassEntity): string {
    if (hass.formatEntityState) return stateText(hass, stateObj);
    switch (stateObj.state) {
      case 'home':
        return 'Home';
      case 'not_home':
        return 'Away';
      default:
        return stateObj.state.replace(/_/g, ' ');
    }
  }

  private _lockLabel(hass: HomeAssistant, stateObj: HassEntity): string {
    if (hass.formatEntityState) return stateText(hass, stateObj);
    switch (stateObj.state) {
      case 'locked':
        return 'Locked';
      case 'unlocked':
        return 'Unlocked';
      default:
        return stateObj.state.replace(/_/g, ' ');
    }
  }

  private _onCardClick(): void {
    // Fuel is the headline reading, location the next most useful detail.
    const target = this._tracked()[0];
    if (target) moreInfo(this, target);
  }

  private _onImageError(): void {
    if (this._config?.image) this._brokenImage = this._config.image;
  }

  private _onLockClick(ev: Event): void {
    ev.stopPropagation();
    const config = this._config;
    const hass = this.hass;
    if (!config?.lock || !hass) return;
    const stateObj = hass.states[config.lock];
    if (!stateObj || isUnavailable(stateObj)) return;
    // Decide from the *real* state, exactly as toggleEntity will, so a second
    // tap inside the optimistic window still describes the call actually sent.
    const locked = stateObj.state === 'locked';
    if (locked && !window.confirm(`Unlock ${config.name}?`)) return;
    haptic(this, locked ? 'warning' : 'success');
    this._lockOptimistic = locked ? 'unlocking' : 'locking';
    this._lockBase = stateObj.last_updated;
    window.clearTimeout(this._lockTimer);
    this._lockTimer = window.setTimeout(() => this._clearLockOptimistic(), OPTIMISTIC_TTL_MS);
    toggleEntity(hass, config.lock);
  }

  private _onChipMoreInfo(ev: Event, entityId: string): void {
    ev.stopPropagation();
    moreInfo(this, entityId);
  }

  private _renderLockChip(hass: HomeAssistant, stateObj?: HassEntity): TemplateResult {
    if (!stateObj) {
      // Configured but missing: hold the slot rather than reflow the chip row.
      return html`<span class="chip static">
        <ha-icon icon="mdi:lock"></ha-icon>
        <span class="ctext">—</span>
      </span>`;
    }
    const unavailable = isUnavailable(stateObj);
    const displayObj: HassEntity =
      this._lockOptimistic === null || unavailable
        ? stateObj
        : { ...stateObj, state: this._lockOptimistic };
    const tone = lockTone(displayObj.state);
    const label = unavailable ? '—' : this._lockLabel(hass, displayObj);
    return html`
      <button
        class="chip tap ${unavailable ? '' : tone}"
        ?disabled=${unavailable}
        aria-label=${displayObj.state === 'locked'
          ? `Unlock ${this._config?.name ?? 'car'}`
          : `Lock ${this._config?.name ?? 'car'}`}
        @click=${this._onLockClick}
      >
        <ha-icon
          icon=${displayObj.state === 'locked' ? 'mdi:lock' : 'mdi:lock-open-variant-outline'}
        ></ha-icon>
        <span class="ctext">${label}</span>
      </button>
    `;
  }

  private _renderLocationChip(hass: HomeAssistant, stateObj?: HassEntity): TemplateResult {
    const id = this._config!.location!;
    const unavailable = isUnavailable(stateObj);
    const label = !stateObj || unavailable ? '—' : this._placeLabel(hass, stateObj);
    return html`
      <button
        class="chip tap"
        aria-label=${`Location: ${label}`}
        @click=${(ev: Event) => this._onChipMoreInfo(ev, id)}
      >
        <ha-icon icon="mdi:map-marker"></ha-icon>
        <span class="ctext">${label}</span>
      </button>
    `;
  }

  protected render(): TemplateResult | typeof nothing {
    const config = this._config;
    const hass = this.hass;
    if (!config || !hass) return nothing;

    const fuelObj = config.fuel ? hass.states[config.fuel] : undefined;
    const lockObj = config.lock ? hass.states[config.lock] : undefined;
    const locationObj = config.location ? hass.states[config.location] : undefined;
    const chargeObj = config.charging ? hass.states[config.charging] : undefined;

    const tracked = this._tracked();
    // The card only dims when every entity it was given has gone dark.
    const unavailable =
      tracked.length > 0 && tracked.every((id) => isUnavailable(hass.states[id]));
    const accent = accentFor(fuelObj, config.color);
    const charging = !!chargeObj && !isUnavailable(chargeObj) && isActive(chargeObj);

    const fuelPct = this._fuelPct(fuelObj);
    const fuelText = this._reading(config.fuel);
    const rangeText = this._reading(config.range, DEFAULT_DISTANCE_UNIT);
    const odo = this._odometer(hass, config.odometer);

    const segments: TemplateResult[] = [];
    for (const text of [fuelText, rangeText]) {
      if (text === null) continue;
      if (segments.length) segments.push(html`<span class="sep">·</span>`);
      segments.push(html`<span>${text}</span>`);
    }

    const image =
      config.image && config.image !== this._brokenImage ? config.image : undefined;

    return html`
      <ha-card
        class="control ${unavailable ? 'unavailable' : ''}"
        style="--silk-accent:${accent}"
        @click=${this._onCardClick}
      >
        <div class="top">
          ${image
            ? html`<div class="thumb">
                <img src=${image} alt=${config.name} loading="lazy" @error=${this._onImageError} />
              </div>`
            : html`<div class="icon ${charging ? 'on' : ''}">
                <ha-icon .icon=${config.icon ?? DEFAULT_ICON}></ha-icon>
              </div>`}
          <div class="info">
            <div class="name">${config.name}</div>
            ${segments.length ? html`<div class="state">${segments}</div>` : nothing}
          </div>
          ${odo
            ? html`<div class="trailing">
                <span class="odo"
                  >${odo.text}${odo.unit
                    ? html`<span class="ounit">${odo.unit}</span>`
                    : nothing}</span
                >
              </div>`
            : nothing}
        </div>
        ${config.lock || config.location || charging
          ? html`
              <div class="chips">
                ${config.lock ? this._renderLockChip(hass, lockObj) : nothing}
                ${config.location ? this._renderLocationChip(hass, locationObj) : nothing}
                ${charging
                  ? html`<span class="chip static active">
                      <ha-icon icon="mdi:flash"></ha-icon>
                      <span class="ctext">Charging</span>
                    </span>`
                  : nothing}
              </div>
            `
          : nothing}
        ${fuelPct === null
          ? nothing
          : html`
              <div class="track" aria-hidden="true">
                <div
                  class="fill ${fuelPct < LOW_FUEL_PCT ? 'low' : ''}"
                  style="width:${fuelPct.toFixed(1)}%"
                ></div>
              </div>
            `}
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
        gap: 8px;
        /* Extra bottom padding keeps the chips clear of the fuel bar. */
        padding: 12px 12px 16px;
      }
      .top {
        flex: none;
        display: flex;
        align-items: center;
        gap: 12px;
        min-width: 0;
      }
      /* No lone icon action here, so the icon presses with the card, not alone. */
      .icon {
        cursor: pointer;
      }
      .icon:active {
        transform: none;
      }
      .thumb {
        flex: none;
        width: 56px;
        height: 56px;
        border-radius: 14px;
        overflow: hidden;
        display: grid;
        place-items: center;
        position: relative;
        z-index: 1;
        background: rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.06);
      }
      .thumb img {
        width: 100%;
        height: 100%;
        object-fit: cover;
        display: block;
      }
      .unavailable .thumb {
        opacity: 0.45;
      }
      .odo {
        font-size: 13px;
        font-weight: 600;
        letter-spacing: -0.01em;
        color: var(--primary-text-color);
        font-variant-numeric: tabular-nums;
        white-space: nowrap;
      }
      .ounit {
        margin-left: 3px;
        font-size: 11px;
        font-weight: 500;
        color: var(--secondary-text-color);
      }
      .chips {
        flex: none;
        display: flex;
        align-items: center;
        gap: 6px;
        min-width: 0;
        overflow: hidden;
        position: relative;
        z-index: 1;
      }
      .chip {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        min-width: 0;
        text-transform: capitalize;
      }
      .chip ha-icon {
        flex: none;
        --mdc-icon-size: 13px;
        pointer-events: none;
      }
      .ctext {
        min-width: 0;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      /* Informational chips are not controls: no pointer, no hover lift. */
      .chip.static {
        cursor: default;
      }
      .chip.static:hover {
        background: rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.06);
      }
      .chip.static.active:hover {
        background: color-mix(in srgb, var(--silk-accent) 16%, transparent);
      }
      /* Invisible halo lifts the tap target without widening the chip row. */
      .chip.tap {
        position: relative;
        transition:
          transform 250ms var(--silk-spring),
          background 150ms ease-out,
          color 150ms ease-out;
      }
      .chip.tap::after {
        content: '';
        position: absolute;
        inset: -8px -2px;
      }
      .chip.tap:active:not(:disabled) {
        transform: scale(0.94);
        transition-duration: 120ms;
        transition-timing-function: var(--silk-ease-out);
      }
      .chip:disabled {
        cursor: default;
        opacity: 0.6;
      }
      .chip:disabled:hover {
        background: rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.06);
      }
      .chip:disabled::after {
        display: none;
      }
      .chip:focus-visible {
        outline: 2px solid color-mix(in srgb, var(--silk-accent) 70%, transparent);
        outline-offset: 2px;
      }
      /* Locked vs unlocked is a real security state — status colors earn it. */
      .chip.good {
        color: var(--success-color, #43a047);
        background: color-mix(in srgb, var(--success-color, #43a047) 14%, transparent);
      }
      .chip.good:hover {
        background: color-mix(in srgb, var(--success-color, #43a047) 22%, transparent);
      }
      .chip.bad {
        color: var(--error-color, #db4437);
        background: color-mix(in srgb, var(--error-color, #db4437) 14%, transparent);
      }
      .chip.bad:hover {
        background: color-mix(in srgb, var(--error-color, #db4437) 22%, transparent);
      }
      .chip.pending {
        color: var(--secondary-text-color);
      }
      /* Fuel bar riding the card's bottom edge. */
      .track {
        position: absolute;
        left: 0;
        right: 0;
        bottom: 0;
        height: 6px;
        background: rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.07);
        pointer-events: none;
        z-index: 0;
      }
      .fill {
        position: absolute;
        inset: 0 auto 0 0;
        background: var(--silk-accent);
        transition:
          width 400ms var(--silk-ease-out),
          background 200ms ease;
      }
      .fill.low {
        background: var(--error-color, #db4437);
      }
      .unavailable .track {
        opacity: 0.45;
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    'silk-car-card': SilkCarCard;
  }
}
