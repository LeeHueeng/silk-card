import { LitElement, html, svg, css, nothing, TemplateResult } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { HomeAssistant, LovelaceCardConfig } from '../types';
import { silkControlStyles } from '../shared/base';
import { isUnavailable, moreInfo, clamp } from '../shared/service';
import { accentFor } from '../shared/color';
import { registerEditor } from '../shared/editor';

export const META = {
  type: 'silk-flight-card',
  name: 'Silk Flight',
  description: 'Gate, delay, and time to leave.',
};

/**
 * Attribute names on the flight sensor. Every field is optional: when it is
 * omitted the card walks a list of the names the common flight integrations
 * (FlightAware, AeroDataBox, FlightRadar24, Trip) already use.
 *
 * `departure`/`arrival` may hold either a time *or* an airport — whichever it
 * is, the card figures it out: anything that parses as a time becomes the
 * scheduled time, anything else is read as the airport code.
 */
export interface SilkFlightAttrMap {
  status?: string;
  departure?: string;
  arrival?: string;
  gate?: string;
  terminal?: string;
  airline?: string;
  flight_number?: string;
  /** Airport codes, when the feed keeps them apart from the times. */
  origin?: string;
  destination?: string;
}

export interface SilkFlightCardConfig extends LovelaceCardConfig {
  entity: string;
  /** Attribute name overrides. YAML-only — it is a nested map. */
  attrs?: SilkFlightAttrMap;
  name?: string;
}

type AttrField = keyof SilkFlightAttrMap;

/** Candidate attribute names, in the order they are tried. */
const DEFAULT_ATTRS: Record<AttrField, string[]> = {
  status: ['status', 'flight_status', 'state'],
  departure: [
    'departure',
    'departure_time',
    'scheduled_departure',
    'departure_scheduled',
    'std',
  ],
  arrival: ['arrival', 'arrival_time', 'scheduled_arrival', 'arrival_scheduled', 'sta'],
  gate: ['gate', 'departure_gate'],
  terminal: ['terminal', 'departure_terminal'],
  airline: ['airline', 'airline_name', 'carrier'],
  flight_number: ['flight_number', 'flight', 'number', 'callsign', 'ident'],
  origin: ['origin', 'origin_iata', 'departure_airport', 'departure_iata', 'from'],
  destination: [
    'destination',
    'destination_iata',
    'arrival_airport',
    'arrival_iata',
    'to',
  ],
};

/** Status tone. A flight being late or cancelled is genuine status semantics. */
type FlightTone = 'good' | 'warn' | 'bad' | 'muted' | 'accent';

interface FlightStatus {
  label: string;
  tone: FlightTone;
  landed: boolean;
  airborne: boolean;
}

const HOUR_MS = 3_600_000;
const DAY_MS = 86_400_000;
/** Progress creeps forward on its own; a minute is plenty for a flight leg. */
const TICK_MS = 60_000;
/** Room at each end of the leg for the plane's surface halo. */
const PATH_PAD = 10;
const PATH_HEIGHT = 24;
/** mdi:airplane, nose up in a 24×24 box — rotated to fly left-to-right. */
const PLANE_PATH =
  'M21,16V14L13,9V3.5A1.5,1.5 0 0,0 11.5,2A1.5,1.5 0 0,0 10,3.5V9L2,14V16L10,13.5V19L8,20.5V22L11.5,21L15,22V20.5L13,19V13.5L21,16Z';

/** A scheduled time from an ISO string, an epoch number, or a 'HH:MM' clock. */
function parseFlightTime(raw: unknown, now: number): number | null {
  if (typeof raw === 'number' && Number.isFinite(raw)) {
    if (raw >= 1e11) return raw; // epoch milliseconds
    if (raw >= 1e9) return raw * 1000; // epoch seconds
    return null;
  }
  if (typeof raw !== 'string') return null;
  const text = raw.trim();
  if (!text) return null;
  const clock = /^(\d{1,2}):(\d{2})(?::(\d{2}))?$/.exec(text);
  if (clock) {
    const at = new Date(now);
    at.setHours(Number(clock[1]), Number(clock[2]), Number(clock[3] ?? 0), 0);
    let ms = at.getTime();
    // A bare clock time long past belongs to tomorrow's schedule.
    if (ms < now - 6 * HOUR_MS) ms += DAY_MS;
    return ms;
  }
  const parsed = Date.parse(text);
  if (Number.isFinite(parsed)) return parsed;
  const numeric = Number(text);
  return Number.isFinite(numeric) && Math.abs(numeric) >= 1e9
    ? parseFlightTime(numeric, now)
    : null;
}

/** An IATA-ish code out of 'ICN', 'Seoul Incheon (ICN)' or `{ iata: 'ICN' }`. */
function airportCode(raw: unknown): string {
  let value = raw;
  if (value !== null && typeof value === 'object') {
    const obj = value as Record<string, unknown>;
    value = obj.iata ?? obj.iata_code ?? obj.code ?? obj.name ?? '';
  }
  const text = String(value ?? '').trim();
  if (!text) return '';
  const parens = /\(([A-Za-z]{3})\)/.exec(text);
  if (parens) return parens[1].toUpperCase();
  const bare = /\b([A-Z]{3,4})\b/.exec(text);
  if (bare) return bare[1];
  return text.slice(0, 3).toUpperCase();
}

const titleCase = (text: string): string =>
  text.replace(/[_-]+/g, ' ').replace(/\S+/g, (word) => word[0].toUpperCase() + word.slice(1));

/** Normalize whatever the integration calls it into one of five tones. */
function statusInfo(raw: string): FlightStatus {
  const text = raw.trim().toLowerCase();
  const base = { landed: false, airborne: false };
  if (!text || text === 'unknown') return { label: '—', tone: 'muted', ...base };
  if (text.includes('cancel')) return { label: 'Cancelled', tone: 'bad', ...base };
  if (text.includes('divert')) return { label: 'Diverted', tone: 'warn', ...base };
  if (text.includes('delay') || text.includes('late')) {
    return { label: 'Delayed', tone: 'warn', ...base };
  }
  if (text.includes('land') || text.includes('arrived')) {
    return { label: 'Landed', tone: 'muted', landed: true, airborne: false };
  }
  if (text.includes('board')) return { label: 'Boarding', tone: 'accent', ...base };
  if (
    text.includes('air') ||
    text.includes('route') ||
    text.includes('flight') ||
    text === 'active'
  ) {
    return { label: 'In flight', tone: 'accent', landed: false, airborne: true };
  }
  if (text.includes('on time') || text.includes('ontime') || text.includes('schedul')) {
    return { label: 'On time', tone: 'good', ...base };
  }
  return { label: titleCase(raw.trim()), tone: 'muted', ...base };
}

const EDITOR_TAG = 'silk-flight-card-editor';

/**
 * `attrs` is a nested map of field → attribute name, which is exactly what an
 * expandable section produces: ha-form nests its fields under the section's own
 * name. Left untouched, every field keeps falling back to DEFAULT_ATTRS.
 */
registerEditor(
  EDITOR_TAG,
  [
    { name: 'entity', required: true, selector: { entity: { domain: ['sensor'] } } },
    { name: 'name', selector: { text: {} } },
    {
      name: 'attrs',
      type: 'expandable',
      title: '속성 이름 지정',
      icon: 'mdi:tag-text-outline',
      schema: [
        {
          name: '',
          type: 'grid',
          schema: [
            { name: 'status', selector: { text: {} } },
            { name: 'flight_number', selector: { text: {} } },
            { name: 'departure', selector: { text: {} } },
            { name: 'arrival', selector: { text: {} } },
            { name: 'origin', selector: { text: {} } },
            { name: 'destination', selector: { text: {} } },
            { name: 'gate', selector: { text: {} } },
            { name: 'terminal', selector: { text: {} } },
            { name: 'airline', selector: { text: {} } },
          ],
        },
      ],
    },
  ],
  {
    entity: '항공편 센서',
    name: '이름',
    attrs: '속성 이름 지정',
    status: '상태 속성',
    flight_number: '편명 속성',
    departure: '출발 시각 속성',
    arrival: '도착 시각 속성',
    origin: '출발 공항 속성',
    destination: '도착 공항 속성',
    gate: '게이트 속성',
    terminal: '터미널 속성',
    airline: '항공사 속성',
  }
);

/**
 * One flight, read the way you read a boarding pass: who is flying it, where it
 * is on the leg right now, and the two facts that decide when you leave — gate
 * and delay.
 */
@customElement('silk-flight-card')
export class SilkFlightCard extends LitElement {
  @property({ attribute: false }) public hass?: HomeAssistant;

  @state() private _config?: SilkFlightCardConfig;
  /** Measured leg box; the plane is placed in exact pixels from it. */
  @state() private _path: { w: number; h: number } | null = null;

  private _tickTimer?: number;
  private _resize?: ResizeObserver;

  public static getStubConfig(hass: HomeAssistant): Partial<SilkFlightCardConfig> {
    const ids = Object.keys(hass.states).filter((id) => id.startsWith('sensor.'));
    const entity =
      ids.find((id) => {
        const attrs = hass.states[id].attributes;
        return attrs.flight_number !== undefined || attrs.callsign !== undefined;
      }) ?? ids.find((id) => /flight|airport|airline/i.test(id));
    return { type: 'custom:silk-flight-card', entity };
  }

  public static async getConfigElement(): Promise<HTMLElement> {
    return document.createElement(EDITOR_TAG);
  }

  public setConfig(config: SilkFlightCardConfig): void {
    if (!config.entity) {
      throw new Error('silk-flight-card: `entity` is required');
    }
    if (config.attrs !== undefined && (typeof config.attrs !== 'object' || Array.isArray(config.attrs))) {
      throw new Error('silk-flight-card: `attrs` must be a map of field → attribute name');
    }
    this._config = config;
  }

  public getCardSize(): number {
    return 3;
  }

  public getGridOptions(): Record<string, number> {
    return { columns: 6, rows: 3, min_columns: 4, min_rows: 2 };
  }

  public connectedCallback(): void {
    super.connectedCallback();
    // The plane advances between state updates, so the card keeps its own beat.
    this._tickTimer = window.setInterval(() => this.requestUpdate(), TICK_MS);
    if (this.hasUpdated) this._observePath();
  }

  public disconnectedCallback(): void {
    super.disconnectedCallback();
    window.clearInterval(this._tickTimer);
    this._tickTimer = undefined;
    this._resize?.disconnect();
  }

  /**
   * Runs after every render, not only the first: when the first paint was the
   * "entity not found" warning, `.path` only exists once the entity appears.
   * Re-observing an already-observed element is a no-op.
   */
  protected updated(): void {
    this._observePath();
  }

  private _observePath(): void {
    const el = this.renderRoot.querySelector('.path');
    if (!el) return;
    if (!this._resize) {
      this._resize = new ResizeObserver((entries) => {
        const rect = entries[entries.length - 1].contentRect;
        const w = Math.round(rect.width);
        const h = Math.round(rect.height) || PATH_HEIGHT;
        if (!this._path || this._path.w !== w || this._path.h !== h) this._path = { w, h };
      });
    }
    this._resize.observe(el);
  }

  private _locale(): string {
    return this.hass?.locale?.language ?? this.hass?.language ?? 'en';
  }

  /** Read one mapped field: the configured attribute, else the usual suspects. */
  private _attr(attrs: Record<string, unknown>, field: AttrField): unknown {
    const mapped = this._config?.attrs?.[field];
    if (mapped) return attrs[mapped];
    for (const key of DEFAULT_ATTRS[field]) {
      const value = attrs[key];
      if (value !== undefined && value !== null && value !== '') return value;
    }
    return undefined;
  }

  private _onCardClick(): void {
    if (this._config) moreInfo(this, this._config.entity);
  }

  /** The leg itself: a recessive track, the flown part in accent, the plane. */
  private _renderPath(progress: number | null, title: string): TemplateResult | typeof nothing {
    const size = this._path;
    if (!size || size.w < 3 * PATH_PAD) return nothing;
    const y = size.h / 2;
    const x0 = PATH_PAD;
    const x1 = size.w - PATH_PAD;
    const px = progress === null ? null : x0 + (x1 - x0) * progress;
    return html`
      <svg width=${size.w} height=${size.h} role="img" aria-label=${title}>
        <title>${title}</title>
        <line class="track" x1=${x0} y1=${y} x2=${x1} y2=${y}></line>
        ${px === null
          ? nothing
          : svg`<line class="done" x1=${x0} y1=${y} x2=${px.toFixed(1)} y2=${y}></line>`}
        ${px === null
          ? nothing
          : svg`<g class="plane" transform="translate(${px.toFixed(1)},${y})">
              <circle class="halo" r="9"></circle>
              <path
                class="glyph"
                transform="rotate(90) scale(0.62) translate(-12,-12)"
                d=${PLANE_PATH}
              ></path>
            </g>`}
      </svg>
    `;
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

    const attrs = stateObj.attributes as Record<string, unknown>;
    const unavailable = isUnavailable(stateObj);
    const now = Date.now();

    const depRaw = this._attr(attrs, 'departure');
    const arrRaw = this._attr(attrs, 'arrival');
    const depMs = parseFlightTime(depRaw, now);
    const arrMs = parseFlightTime(arrRaw, now);
    // `departure`/`arrival` double as airport fields in several integrations:
    // whatever did not parse as a time is read as the airport instead.
    const origin = airportCode(this._attr(attrs, 'origin') ?? (depMs === null ? depRaw : undefined));
    const destination = airportCode(
      this._attr(attrs, 'destination') ?? (arrMs === null ? arrRaw : undefined)
    );

    const statusRaw = String(this._attr(attrs, 'status') ?? (unavailable ? '' : stateObj.state));
    const status = statusInfo(unavailable ? '' : statusRaw);

    const progress =
      depMs !== null && arrMs !== null && arrMs > depMs
        ? clamp((now - depMs) / (arrMs - depMs), 0, 1)
        : status.landed
          ? 1
          : null;

    const locale = this._locale();
    const timeFmt = new Intl.DateTimeFormat(locale, { hour: 'numeric', minute: '2-digit' });
    const dateFmt = new Intl.DateTimeFormat(locale, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
    const depText = depMs === null ? '—' : timeFmt.format(depMs);
    const arrText = arrMs === null ? '—' : timeFmt.format(arrMs);

    const airline =
      config.name ??
      (this._attr(attrs, 'airline') as string | undefined) ??
      (attrs.friendly_name as string | undefined) ??
      config.entity;
    const flightNo = String(this._attr(attrs, 'flight_number') ?? '').trim();
    const gate = String(this._attr(attrs, 'gate') ?? '').trim();
    const terminal = String(this._attr(attrs, 'terminal') ?? '').trim();

    const legTitle = `${origin || '—'} ${depText} → ${destination || '—'} ${arrText}${
      progress === null ? '' : ` · ${Math.round(progress * 100)}% flown`
    }`;
    const accent = accentFor(stateObj);
    const airborne = status.airborne || (progress !== null && progress > 0 && progress < 1);

    return html`
      <ha-card
        class="control ${unavailable ? 'unavailable' : ''}"
        style="--silk-accent:${accent}"
        @click=${this._onCardClick}
      >
        <div class="top">
          <div class="icon ${!unavailable && airborne ? 'on' : ''}">
            <ha-state-icon .hass=${hass} .stateObj=${stateObj}></ha-state-icon>
          </div>
          <div class="info">
            <div class="name">${airline}</div>
            <div class="state">${depMs === null ? '' : dateFmt.format(depMs)}</div>
          </div>
          ${flightNo
            ? html`<div class="trailing"><span class="fno">${flightNo}</span></div>`
            : nothing}
        </div>
        <div class="route">
          <div class="port">
            <div class="code">${origin || '—'}</div>
            <div class="time">${depText}</div>
          </div>
          <div class="path">${this._renderPath(unavailable ? null : progress, legTitle)}</div>
          <div class="port end">
            <div class="code">${destination || '—'}</div>
            <div class="time">${arrText}</div>
          </div>
        </div>
        <div class="chips">
          <span class="chip static ${status.tone}">${unavailable ? 'Unavailable' : status.label}</span>
          ${gate ? html`<span class="chip static">Gate ${gate}</span>` : nothing}
          ${terminal ? html`<span class="chip static">Terminal ${terminal}</span>` : nothing}
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
      /* No lone control here: the icon presses with the card, not alone. */
      .icon {
        cursor: pointer;
      }
      .icon:active {
        transform: none;
      }
      .fno {
        font-size: 15px;
        font-weight: 600;
        letter-spacing: -0.01em;
        color: var(--primary-text-color);
        font-variant-numeric: tabular-nums;
        white-space: nowrap;
      }
      .route {
        flex: none;
        display: flex;
        align-items: center;
        gap: 8px;
        min-width: 0;
      }
      .port {
        flex: none;
        min-width: 40px;
        text-align: left;
      }
      .port.end {
        text-align: right;
      }
      .code {
        font-size: 15px;
        font-weight: 600;
        letter-spacing: -0.01em;
        line-height: 1.2;
        color: var(--primary-text-color);
        white-space: nowrap;
      }
      .time {
        font-size: 13px;
        line-height: 1.2;
        color: var(--secondary-text-color);
        font-variant-numeric: tabular-nums;
        white-space: nowrap;
      }
      .path {
        flex: 1;
        min-width: 0;
        height: ${PATH_HEIGHT}px;
      }
      .path svg {
        display: block;
        overflow: visible;
      }
      .track,
      .done {
        stroke-width: 2;
        stroke-linecap: round;
      }
      .track {
        stroke: rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.16);
      }
      .done {
        stroke: var(--silk-accent);
      }
      /* Real motion: the plane slides as the leg progresses — transform only. */
      .plane {
        transition: transform 450ms var(--silk-ease-out);
      }
      /* Card-surface halo keeps a clean gap between the flown line and the glyph. */
      .halo {
        fill: var(--card-background-color, #fff);
      }
      .glyph {
        fill: var(--silk-accent);
      }
      .chips {
        flex: none;
        display: flex;
        align-items: center;
        gap: 6px;
        min-width: 0;
        overflow: hidden;
      }
      /* Informational chips are not controls: no pointer, no hover lift. */
      .chip.static {
        cursor: inherit;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .chip.static:hover {
        background: rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.06);
      }
      /* On time / delayed / cancelled is real status — the tokens earn it. */
      .chip.static.good,
      .chip.static.good:hover {
        color: var(--success-color, #43a047);
        background: color-mix(in srgb, var(--success-color, #43a047) 14%, transparent);
      }
      .chip.static.warn,
      .chip.static.warn:hover {
        color: var(--warning-color, #ffa600);
        background: color-mix(in srgb, var(--warning-color, #ffa600) 16%, transparent);
      }
      .chip.static.bad,
      .chip.static.bad:hover {
        color: var(--error-color, #db4437);
        background: color-mix(in srgb, var(--error-color, #db4437) 14%, transparent);
      }
      .chip.static.accent,
      .chip.static.accent:hover {
        color: var(--silk-accent);
        background: color-mix(in srgb, var(--silk-accent) 16%, transparent);
      }
      .unavailable .route,
      .unavailable .chips {
        opacity: 0.45;
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    'silk-flight-card': SilkFlightCard;
  }
}
