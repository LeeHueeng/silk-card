import { LitElement, html, css, nothing, TemplateResult } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { HomeAssistant, HassEntity, LovelaceCardConfig } from '../types';
import { silkControlStyles } from '../shared/base';
import { domainOf, isUnavailable, moreInfo, haptic, stateText, clamp } from '../shared/service';
import { accentFor } from '../shared/color';
import { registerEditor } from '../shared/editor';

export const META = {
  type: 'silk-parking-card',
  name: 'Silk Parking',
  description: 'Where you left it, and for how long.',
};

export interface SilkParkingCardConfig extends LovelaceCardConfig {
  /** Where the car is: a device_tracker/person, or a text sensor with an address. */
  location: string;
  /** Timestamp entity for the moment you parked; defaults to the location's last change. */
  since?: string;
  /** Ticket length in minutes; draws the elapsed bar. */
  limit_minutes?: number;
  /** Hourly rate; draws the running cost estimate. */
  cost_per_hour?: number;
  /** Any URL — adds a Directions chip that opens it in a new tab. */
  map_url?: string;
  name?: string;
  icon?: string;
  /** Accent override (YAML only). */
  color?: string;
}

const DEFAULT_ICON = 'mdi:map-marker';
const MINUTE_MS = 60_000;
const HOUR_MS = 3_600_000;
const DAY_MS = 86_400_000;
/** Fraction of the limit where the bar starts warning. */
const WARN_AT = 0.8;

const EDITOR_TAG = 'silk-parking-card-editor';

registerEditor(
  EDITOR_TAG,
  [
    {
      name: 'location',
      required: true,
      selector: { entity: { domain: ['device_tracker', 'person', 'sensor', 'input_text'] } },
    },
    { name: 'name', selector: { text: {} } },
    {
      name: '',
      type: 'grid',
      schema: [
        { name: 'icon', selector: { icon: {} } },
        { name: 'since', selector: { entity: { domain: ['sensor', 'input_datetime'] } } },
        { name: 'limit_minutes', selector: { number: { min: 1, mode: 'box' } } },
        { name: 'cost_per_hour', selector: { number: { min: 0, step: 0.1, mode: 'box' } } },
      ],
    },
    { name: 'map_url', selector: { text: {} } },
  ],
  {
    location: 'Location entity',
    name: 'Name',
    icon: 'Icon',
    since: 'Parked since (timestamp)',
    limit_minutes: 'Ticket limit (minutes)',
    cost_per_hour: 'Cost per hour',
    map_url: 'Map / directions URL',
  },
  { icon: DEFAULT_ICON }
);

/**
 * The moment the car was parked, from a timestamp sensor or an input_datetime.
 * input_datetime is built from its numeric attributes — its
 * 'YYYY-MM-DD HH:MM:SS' state parses inconsistently across engines.
 */
function parkedAt(stateObj?: HassEntity): number | null {
  if (!stateObj || isUnavailable(stateObj)) return null;
  const attrs = stateObj.attributes;
  if (attrs.has_date) {
    const hasTime = !!attrs.has_time;
    const ms = new Date(
      attrs.year,
      (attrs.month ?? 1) - 1,
      attrs.day ?? 1,
      hasTime ? (attrs.hour ?? 0) : 0,
      hasTime ? (attrs.minute ?? 0) : 0,
      hasTime ? (attrs.second ?? 0) : 0
    ).getTime();
    return Number.isFinite(ms) ? ms : null;
  }
  const ms = Date.parse(stateObj.state);
  return Number.isFinite(ms) ? ms : null;
}

/** '42m' · '1h 42m' · '2d 3h' — always two units at most. */
function duration(ms: number): string {
  const total = Math.max(0, Math.floor(ms / MINUTE_MS));
  if (total < 1) return 'just now';
  if (total < 60) return `${total}m`;
  if (ms < DAY_MS) {
    const h = Math.floor(total / 60);
    const m = total % 60;
    return m ? `${h}h ${m}m` : `${h}h`;
  }
  const d = Math.floor(ms / DAY_MS);
  const h = Math.floor((ms % DAY_MS) / HOUR_MS);
  return h ? `${d}d ${h}h` : `${d}d`;
}

/**
 * Where you left the car and how long the meter has been running. One glance
 * answers both; the bar only appears once you have told it how long you paid for.
 */
@customElement('silk-parking-card')
export class SilkParkingCard extends LitElement {
  @property({ attribute: false }) public hass?: HomeAssistant;

  @state() private _config?: SilkParkingCardConfig;

  /** Wall clock, advanced on the minute so the elapsed line ticks by itself. */
  @state() private _now = Date.now();

  private _tickTimer?: number;

  public static getStubConfig(hass: HomeAssistant): Partial<SilkParkingCardConfig> {
    const ids = Object.keys(hass.states);
    const location =
      ids.find((id) => id.startsWith('device_tracker.')) ??
      ids.find((id) => id.startsWith('person.'));
    return { type: 'custom:silk-parking-card', location, icon: DEFAULT_ICON };
  }

  public static async getConfigElement(): Promise<HTMLElement> {
    return document.createElement(EDITOR_TAG);
  }

  public setConfig(config: SilkParkingCardConfig): void {
    if (!config.location) {
      throw new Error(
        'silk-parking-card: `location` is required (a device_tracker, person, or text sensor)'
      );
    }
    if (config.limit_minutes !== undefined && !(Number(config.limit_minutes) > 0)) {
      throw new Error('silk-parking-card: `limit_minutes` must be a positive number of minutes');
    }
    if (
      config.cost_per_hour !== undefined &&
      (!Number.isFinite(Number(config.cost_per_hour)) || Number(config.cost_per_hour) < 0)
    ) {
      throw new Error('silk-parking-card: `cost_per_hour` must be a number of at least 0');
    }
    if (config.map_url !== undefined && typeof config.map_url !== 'string') {
      throw new Error('silk-parking-card: `map_url` must be a URL string');
    }
    this._config = config;
    this._now = Date.now();
  }

  public getCardSize(): number {
    return 2;
  }

  public getGridOptions(): Record<string, number> {
    return { columns: 6, rows: 2, min_columns: 4, min_rows: 2 };
  }

  public connectedCallback(): void {
    super.connectedCallback();
    this._now = Date.now();
    this._scheduleTick();
  }

  public disconnectedCallback(): void {
    super.disconnectedCallback();
    window.clearTimeout(this._tickTimer);
    this._tickTimer = undefined;
  }

  /** Wake on the minute boundary, not every 60s of drift. */
  private _scheduleTick(): void {
    window.clearTimeout(this._tickTimer);
    const now = Date.now();
    const next = (Math.floor(now / MINUTE_MS) + 1) * MINUTE_MS + 500;
    this._tickTimer = window.setTimeout(() => {
      this._now = Date.now();
      this._scheduleTick();
    }, next - now);
  }

  private _locale(): string {
    return this.hass?.locale?.language ?? this.hass?.language ?? 'en';
  }

  /** 'Home' / 'Away' / a zone name / whatever a text sensor reports. */
  private _placeText(stateObj: HassEntity): string {
    const domain = domainOf(stateObj.entity_id);
    if (domain === 'device_tracker' || domain === 'person') {
      if (this.hass?.formatEntityState) return stateText(this.hass, stateObj);
      if (stateObj.state === 'home') return 'Home';
      if (stateObj.state === 'not_home') return 'Away';
      return stateObj.state.replace(/_/g, ' ');
    }
    return stateObj.state;
  }

  private _money(value: number): string {
    // Minor units are noise on currencies like KRW, where the running estimate
    // would otherwise read "6,700.01" straight from the elapsed seconds.
    const digits = Math.abs(value) >= 100 ? 0 : 2;
    return new Intl.NumberFormat(this._locale(), {
      minimumFractionDigits: digits,
      maximumFractionDigits: digits,
    }).format(value);
  }

  private _onCardClick(): void {
    if (this._config) moreInfo(this, this._config.location);
  }

  private _onDirections(ev: Event): void {
    ev.stopPropagation();
    const url = this._config?.map_url;
    if (!url) return;
    haptic(this);
    window.open(url, '_blank', 'noopener,noreferrer');
  }

  protected render(): TemplateResult | typeof nothing {
    const config = this._config;
    const hass = this.hass;
    if (!config || !hass) return nothing;
    const stateObj = hass.states[config.location];
    if (!stateObj) {
      return html`
        <ha-card class="control">
          <div class="warning">Entity not found: ${config.location}</div>
        </ha-card>
      `;
    }

    const unavailable = isUnavailable(stateObj);
    const sinceObj = config.since ? hass.states[config.since] : undefined;
    // An explicit timestamp wins; when it is missing or unreadable the
    // location's own last change is still an honest answer to "since when".
    const since =
      (config.since ? parkedAt(sinceObj) : null) ?? (Date.parse(stateObj.last_changed) || null);
    const elapsed = since === null ? null : Math.max(0, this._now - since);
    const accent = accentFor(stateObj, config.color);
    const name = config.name ?? stateObj.attributes.friendly_name ?? config.location;
    const place = unavailable ? 'Unavailable' : this._placeText(stateObj);

    const limitMs =
      config.limit_minutes !== undefined ? Number(config.limit_minutes) * MINUTE_MS : null;
    const over = limitMs !== null && elapsed !== null && elapsed > limitMs;
    const fraction =
      limitMs !== null && elapsed !== null && limitMs > 0 ? clamp(elapsed / limitMs, 0, 1) : 0;
    const tone = limitMs === null ? '' : over ? 'over' : fraction >= WARN_AT ? 'near' : '';

    const segments: TemplateResult[] = [];
    if (elapsed !== null) {
      const text = duration(elapsed);
      segments.push(
        html`<span class="elapsed">parked ${text === 'just now' ? 'just now' : text}</span>`
      );
    }
    if (config.cost_per_hour !== undefined && elapsed !== null) {
      const cost = (elapsed / HOUR_MS) * Number(config.cost_per_hour);
      segments.push(html`<span class="cost">≈ ${this._money(cost)}</span>`);
    }
    if (limitMs !== null && elapsed !== null) {
      segments.push(
        over
          ? html`<span class="limit over">expired ${duration(elapsed - limitMs)} ago</span>`
          : html`<span class="limit ${tone}">${duration(limitMs - elapsed)} left</span>`
      );
    }

    const barTitle =
      limitMs !== null && elapsed !== null
        ? over
          ? `Expired ${duration(elapsed - limitMs)} ago`
          : `${duration(elapsed)} of ${duration(limitMs)} used`
        : '';

    return html`
      <ha-card
        class="control ${unavailable ? 'unavailable' : ''} ${limitMs !== null ? 'metered' : ''}"
        style="--silk-accent:${accent}"
        aria-label=${`${name}: ${place}`}
        @click=${this._onCardClick}
      >
        <div class="pin ${unavailable ? '' : 'on'}">
          <ha-icon .icon=${config.icon ?? DEFAULT_ICON}></ha-icon>
        </div>
        <div class="info">
          <div class="name" title=${place}>${place}</div>
          <div class="state">
            ${segments.map((segment, i) =>
              i === 0 ? segment : html`<span class="sep">·</span>${segment}`
            )}
          </div>
        </div>
        ${config.map_url
          ? html`
              <div class="trailing">
                <button class="chip tap" aria-label="Directions" @click=${this._onDirections}>
                  <ha-icon icon="mdi:directions"></ha-icon>
                  <span class="ctext">Directions</span>
                </button>
              </div>
            `
          : nothing}
        ${limitMs !== null
          ? html`
              <div class="track" title=${barTitle}>
                <div
                  class="fill ${tone}"
                  style="transform:scaleX(${(over ? 1 : fraction).toFixed(4)})"
                ></div>
              </div>
            `
          : nothing}
      </ha-card>
    `;
  }

  static styles = [
    silkControlStyles,
    css`
      ha-card {
        align-items: center;
      }
      /* Extra bottom padding keeps the row clear of the ticket bar. */
      ha-card.metered {
        padding-bottom: 14px;
      }
      /* A destination pin, not a control: it presses with the card. */
      .pin {
        flex: none;
        width: 44px;
        height: 44px;
        border-radius: 14px;
        display: grid;
        place-items: center;
        position: relative;
        z-index: 1;
        color: var(--secondary-text-color);
        background: rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.06);
        transition:
          background 200ms ease,
          color 200ms ease;
      }
      .pin.on {
        color: var(--silk-accent);
        background: color-mix(in srgb, var(--silk-accent) 20%, transparent);
      }
      .pin ha-icon {
        --mdc-icon-size: 22px;
        pointer-events: none;
      }
      .unavailable .pin {
        opacity: 0.45;
      }
      .elapsed,
      .cost,
      .limit {
        font-variant-numeric: tabular-nums;
      }
      /* A run-out ticket is a genuine fault state, so it earns a status color. */
      .limit.near {
        color: var(--warning-color, #ffa600);
      }
      .limit.over {
        color: var(--error-color, #db4437);
        font-weight: 600;
      }
      .chip {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        position: relative;
        transition:
          transform 250ms var(--silk-spring),
          background 150ms ease-out,
          color 150ms ease-out;
      }
      /* Invisible halo lifts the tap target without widening the chip. */
      .chip.tap::after {
        content: '';
        position: absolute;
        inset: -9px -3px;
      }
      .chip.tap:active {
        transform: scale(0.94);
        transition-duration: 120ms;
        transition-timing-function: var(--silk-ease-out);
      }
      .chip ha-icon {
        flex: none;
        --mdc-icon-size: 14px;
        pointer-events: none;
      }
      .chip:focus-visible {
        outline: 2px solid color-mix(in srgb, var(--silk-accent) 70%, transparent);
        outline-offset: 2px;
      }
      .ctext {
        min-width: 0;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      /* Ticket bar riding the card's bottom edge. */
      .track {
        position: absolute;
        left: 0;
        right: 0;
        bottom: 0;
        height: 4px;
        background: rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.07);
        z-index: 0;
      }
      .fill {
        position: absolute;
        inset: 0;
        transform-origin: left center;
        background: var(--silk-accent);
        transition:
          transform 400ms var(--silk-ease-out),
          background 200ms ease;
      }
      .fill.near {
        background: var(--warning-color, #ffa600);
      }
      .fill.over {
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
    'silk-parking-card': SilkParkingCard;
  }
}
