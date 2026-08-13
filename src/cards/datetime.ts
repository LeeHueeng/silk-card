import { LitElement, html, css, nothing, PropertyValues, TemplateResult } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { HomeAssistant, HassEntity, LovelaceCardConfig } from '../types';
import { silkControlStyles } from '../shared/base';
import { domainOf, isUnavailable, moreInfo, haptic, stateText } from '../shared/service';
import { accentFor } from '../shared/color';
import { registerEditor } from '../shared/editor';

export const META = {
  type: 'silk-datetime-card',
  name: 'Silk Date & Time',
  description: 'Pick a moment, store it.',
};

export interface SilkDatetimeCardConfig extends LovelaceCardConfig {
  entity: string;
  name?: string;
  icon?: string;
}

/** What the helper actually stores — decides the input type and the service data. */
type Mode = 'date' | 'time' | 'datetime';

const SUPPORTED_DOMAINS = ['input_datetime', 'date', 'time', 'datetime'];

const MINUTE_MS = 60_000;
const HOUR_MS = 3_600_000;
const DAY_MS = 86_400_000;
/** The success chip lingers just long enough to be read, then leaves. */
const SAVED_MS = 1200;
/** Optimistic value ceiling, matching the rest of the suite. */
const OPTIMISTIC_HOLD_MS = 2000;

const EDITOR_TAG = 'silk-datetime-card-editor';

registerEditor(
  EDITOR_TAG,
  [
    {
      name: 'entity',
      required: true,
      selector: { entity: { domain: SUPPORTED_DOMAINS } },
    },
    { name: 'name', selector: { text: {} } },
    { name: 'icon', selector: { icon: {} } },
  ],
  { entity: 'Entity', name: 'Name', icon: 'Icon' }
);

const pad2 = (n: number): string => String(n).padStart(2, '0');

const localDate = (d: Date): string =>
  `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;

const localTime = (d: Date, seconds = false): string =>
  `${pad2(d.getHours())}:${pad2(d.getMinutes())}${seconds ? `:${pad2(d.getSeconds())}` : ''}`;

/** input_datetime exposes both flags; date./time./datetime. entities imply theirs. */
function modeOf(stateObj: HassEntity): Mode {
  const domain = domainOf(stateObj.entity_id);
  if (domain === 'date' || domain === 'time' || domain === 'datetime') return domain;
  const attrs = stateObj.attributes;
  const hasDate = attrs.has_date !== false;
  const hasTime = attrs.has_time === true;
  if (hasDate && hasTime) return 'datetime';
  return hasDate ? 'date' : 'time';
}

/**
 * Parse the shapes HA hands us: 'YYYY-MM-DD', 'YYYY-MM-DD HH:MM:SS',
 * 'YYYY-MM-DDTHH:MM' (the native input) and 'HH:MM[:SS]'. Naive strings are
 * read as *local* — Date.parse would take a bare date as UTC and shift the day.
 * Anything carrying a zone (datetime.* states are UTC ISO) goes to Date.parse.
 */
function parseValue(raw: string): Date | null {
  const text = raw.trim();
  if (!text) return null;
  const dm = /^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{1,2}):(\d{2})(?::(\d{2}))?)?/.exec(text);
  if (dm) {
    if (/([zZ]|[+-]\d{2}:?\d{2})$/.test(text)) {
      const ms = Date.parse(text);
      return Number.isFinite(ms) ? new Date(ms) : null;
    }
    const d = new Date(
      Number(dm[1]),
      Number(dm[2]) - 1,
      Number(dm[3]),
      Number(dm[4] ?? 0),
      Number(dm[5] ?? 0),
      Number(dm[6] ?? 0)
    );
    return Number.isFinite(d.getTime()) ? d : null;
  }
  const tm = /^(\d{1,2}):(\d{2})(?::(\d{2}))?$/.exec(text);
  if (tm) {
    const now = new Date();
    const d = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      Number(tm[1]),
      Number(tm[2]),
      Number(tm[3] ?? 0)
    );
    return Number.isFinite(d.getTime()) ? d : null;
  }
  return null;
}

/** The stored moment, preferring input_datetime's numeric attributes. */
function currentValue(stateObj: HassEntity, mode: Mode): Date | null {
  const attrs = stateObj.attributes;
  if (domainOf(stateObj.entity_id) === 'input_datetime' && typeof attrs.hour === 'number') {
    const now = new Date();
    const dated = mode !== 'time';
    const d = new Date(
      dated ? (attrs.year ?? now.getFullYear()) : now.getFullYear(),
      dated ? (attrs.month ?? 1) - 1 : now.getMonth(),
      dated ? (attrs.day ?? 1) : now.getDate(),
      mode === 'date' ? 0 : (attrs.hour ?? 0),
      mode === 'date' ? 0 : (attrs.minute ?? 0),
      mode === 'date' ? 0 : (attrs.second ?? 0)
    );
    return Number.isFinite(d.getTime()) ? d : null;
  }
  return parseValue(stateObj.state);
}

/** Value string the native input understands (minute resolution). */
function inputValue(d: Date | null, mode: Mode): string {
  if (!d) return '';
  if (mode === 'date') return localDate(d);
  if (mode === 'time') return localTime(d);
  return `${localDate(d)}T${localTime(d)}`;
}

/**
 * Whole-day distance between two moments, computed on the UTC stamps of the
 * local calendar dates so a DST-stretched day cannot skew it by one.
 */
function dayDelta(target: Date, now: Date): number {
  return Math.round(
    (Date.UTC(target.getFullYear(), target.getMonth(), target.getDate()) -
      Date.UTC(now.getFullYear(), now.getMonth(), now.getDate())) /
      DAY_MS
  );
}

function durationText(ms: number): string {
  const total = Math.max(0, Math.round(ms / MINUTE_MS));
  if (total < 1) return 'less than a minute';
  const h = Math.floor(total / 60);
  const m = total % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

@customElement('silk-datetime-card')
export class SilkDatetimeCard extends LitElement {
  @property({ attribute: false }) public hass?: HomeAssistant;

  @state() private _config?: SilkDatetimeCardConfig;

  /** Value shown while the service call is in flight; undefined = trust HA. */
  @state() private _pending?: Date;

  /** Drives the success chip for SAVED_MS after a commit. */
  @state() private _saved = false;

  private _pendingBase = '';
  private _holdTimer?: number;
  private _savedTimer?: number;
  private _tickTimer?: number;

  public static getStubConfig(hass: HomeAssistant): Partial<SilkDatetimeCardConfig> {
    const ids = Object.keys(hass.states);
    const entity =
      ids.find((id) => id.startsWith('input_datetime.')) ??
      ids.find((id) => id.startsWith('datetime.')) ??
      ids.find((id) => id.startsWith('date.')) ??
      ids.find((id) => id.startsWith('time.'));
    return { type: 'custom:silk-datetime-card', entity };
  }

  public static async getConfigElement(): Promise<HTMLElement> {
    return document.createElement(EDITOR_TAG);
  }

  public setConfig(config: SilkDatetimeCardConfig): void {
    if (!config.entity) {
      throw new Error('silk-datetime-card: `entity` is required');
    }
    if (!SUPPORTED_DOMAINS.includes(domainOf(config.entity))) {
      throw new Error(
        'silk-datetime-card: `entity` must be an input_datetime, date, time or datetime entity'
      );
    }
    this._config = config;
    this._clearPending();
  }

  public getCardSize(): number {
    return 1;
  }

  public getGridOptions(): Record<string, number> {
    return { columns: 6, rows: 1, min_columns: 4, min_rows: 1 };
  }

  public connectedCallback(): void {
    super.connectedCallback();
    // The humanized line is clock-relative: re-render it every minute.
    this._tickTimer = window.setInterval(() => this.requestUpdate(), MINUTE_MS);
  }

  public disconnectedCallback(): void {
    super.disconnectedCallback();
    window.clearInterval(this._tickTimer);
    window.clearTimeout(this._holdTimer);
    window.clearTimeout(this._savedTimer);
    this._holdTimer = undefined;
    this._savedTimer = undefined;
  }

  protected willUpdate(changed: PropertyValues): void {
    if (!changed.has('hass') || !this._config || this._pending === undefined) return;
    const stateObj = this.hass?.states[this._config.entity];
    // The real value moved: the confirmation landed, drop the override.
    if (stateObj && stateObj.last_updated !== this._pendingBase) this._clearPending();
  }

  private _clearPending(): void {
    window.clearTimeout(this._holdTimer);
    this._holdTimer = undefined;
    this._pending = undefined;
  }

  private _locale(): string {
    return this.hass?.locale?.language ?? this.hass?.language ?? 'en';
  }

  private _onCardClick(): void {
    if (this._config) moreInfo(this, this._config.entity);
  }

  private _stopClick(ev: Event): void {
    // Touching the field must not open more-info behind the native picker.
    ev.stopPropagation();
  }

  private _onChange(ev: Event): void {
    ev.stopPropagation();
    const config = this._config;
    const hass = this.hass;
    if (!config || !hass) return;
    const stateObj = hass.states[config.entity];
    if (!stateObj || isUnavailable(stateObj)) return;
    const mode = modeOf(stateObj);
    const raw = (ev.target as HTMLInputElement).value;
    const picked = parseValue(raw);
    if (!picked) {
      // Cleared or unparseable — snap the field back. Lit dirty-checks property
      // bindings against the string it last committed, so re-rendering the
      // unchanged value would leave the emptied field empty: write it directly.
      (ev.target as HTMLInputElement).value = inputValue(
        this._pending ?? currentValue(stateObj, mode),
        mode
      );
      return;
    }
    picked.setSeconds(0, 0); // the native inputs are minute-resolution
    this._pending = picked;
    this._pendingBase = stateObj.last_updated;
    window.clearTimeout(this._holdTimer);
    this._holdTimer = window.setTimeout(() => this._clearPending(), OPTIMISTIC_HOLD_MS);
    this._commit(picked, mode);
    haptic(this, 'success');
    this._flashSaved();
  }

  private _commit(value: Date, mode: Mode): void {
    const hass = this.hass!;
    const entityId = this._config!.entity;
    const domain = domainOf(entityId);
    const date = localDate(value);
    const time = localTime(value, true);
    if (domain === 'input_datetime') {
      const data =
        mode === 'date' ? { date } : mode === 'time' ? { time } : { datetime: `${date} ${time}` };
      hass.callService('input_datetime', 'set_datetime', { entity_id: entityId, ...data });
      return;
    }
    if (domain === 'date') {
      hass.callService('date', 'set_value', { entity_id: entityId, date });
      return;
    }
    if (domain === 'time') {
      hass.callService('time', 'set_value', { entity_id: entityId, time });
      return;
    }
    // datetime.* stores a real instant — serialize the local pick with its zone.
    hass.callService('datetime', 'set_value', {
      entity_id: entityId,
      datetime: value.toISOString(),
    });
  }

  private _flashSaved(): void {
    this._saved = true;
    window.clearTimeout(this._savedTimer);
    this._savedTimer = window.setTimeout(() => {
      this._savedTimer = undefined;
      this._saved = false;
    }, SAVED_MS);
  }

  /** 'in 3 days · Fri 16 Aug' / 'in 2h 10m' — relative first, absolute only when it adds. */
  private _humanized(value: Date, mode: Mode): TemplateResult {
    const now = new Date();
    const diff = value.getTime() - now.getTime();
    const locale = this._locale();

    if (mode === 'time') {
      const rel =
        Math.abs(diff) < MINUTE_MS
          ? 'now'
          : diff > 0
            ? `in ${durationText(diff)}`
            : `${durationText(-diff)} ago`;
      return html`${rel}`;
    }

    const days = dayDelta(value, now);
    const dated =
      Math.abs(diff) >= DAY_MS || mode === 'date'
        ? new Intl.DateTimeFormat(locale, {
            weekday: 'short',
            day: 'numeric',
            month: 'short',
            ...(value.getFullYear() === now.getFullYear() ? {} : { year: 'numeric' }),
          }).format(value)
        : '';

    let rel: string;
    if (mode === 'datetime' && Math.abs(diff) < DAY_MS) {
      rel =
        Math.abs(diff) < MINUTE_MS
          ? 'now'
          : diff > 0
            ? `in ${durationText(diff)}`
            : `${durationText(-diff)} ago`;
    } else if (days === 0) {
      rel = Math.abs(diff) < HOUR_MS ? 'now' : 'today';
    } else if (days === 1) {
      rel = 'tomorrow';
    } else if (days === -1) {
      rel = 'yesterday';
    } else {
      rel = days > 0 ? `in ${days} days` : `${-days} days ago`;
    }

    return dated ? html`${rel}<span class="sep">·</span>${dated}` : html`${rel}`;
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
    const mode = modeOf(stateObj);
    const accent = accentFor(stateObj);
    const name = config.name ?? stateObj.attributes.friendly_name ?? config.entity;
    const value = unavailable ? null : (this._pending ?? currentValue(stateObj, mode));
    const inputType = mode === 'datetime' ? 'datetime-local' : mode;

    return html`
      <ha-card
        class="control ${unavailable ? 'unavailable' : ''}"
        style="--silk-accent:${accent}"
        @click=${this._onCardClick}
      >
        <div class="icon ${value && !unavailable ? 'on' : ''}">
          ${config.icon
            ? html`<ha-icon .icon=${config.icon}></ha-icon>`
            : html`<ha-state-icon .hass=${hass} .stateObj=${stateObj}></ha-state-icon>`}
        </div>
        <div class="info">
          <div class="name" title=${name}>${name}</div>
          <div class="state">
            ${unavailable
              ? stateText(hass, stateObj)
              : value
                ? this._humanized(value, mode)
                : 'Not set'}
          </div>
        </div>
        <div class="trailing">
          <span class="saved ${this._saved ? 'show' : ''}" role="status" aria-live="polite">
            ${this._saved
              ? html`<ha-icon icon="mdi:check"></ha-icon><span class="sr">Saved</span>`
              : nothing}
          </span>
          <input
            class="field"
            type=${inputType}
            .value=${inputValue(value, mode)}
            ?disabled=${unavailable}
            aria-label=${name}
            @click=${this._stopClick}
            @change=${this._onChange}
          />
        </div>
      </ha-card>
    `;
  }

  static styles = [
    silkControlStyles,
    css`
      /* No control action on the icon: it presses with the card. */
      .icon {
        cursor: inherit;
      }
      .icon:active {
        transform: none;
      }
      .trailing {
        flex: 0 1 auto;
        min-width: 0;
        gap: 6px;
      }
      .field {
        flex: 0 1 auto;
        min-width: 0;
        max-width: 100%;
        box-sizing: border-box;
        appearance: none;
        -webkit-appearance: none;
        border: none;
        outline: none;
        height: 34px;
        padding: 0 10px;
        border-radius: 10px;
        font: inherit;
        font-size: 13px;
        font-weight: 500;
        font-variant-numeric: tabular-nums;
        color: var(--primary-text-color);
        background: rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.06);
        cursor: pointer;
        transition: box-shadow 150ms var(--silk-ease-out), background 200ms ease;
      }
      .field:hover:not(:disabled) {
        background: rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.12);
      }
      .field:focus-visible {
        box-shadow: inset 0 0 0 2px color-mix(in srgb, var(--silk-accent) 70%, transparent);
      }
      .field:disabled {
        cursor: default;
      }
      /* Tame the native affordances so the field reads as one Silk surface. */
      .field::-webkit-calendar-picker-indicator {
        opacity: 0.45;
        cursor: pointer;
        transition: opacity 150ms ease-out;
      }
      .field:hover::-webkit-calendar-picker-indicator {
        opacity: 0.8;
      }
      .field::-webkit-datetime-edit {
        padding: 0;
      }
      .field::-webkit-inner-spin-button {
        display: none;
      }
      /*
       * The chip keeps its 22px slot at all times — showing it must never
       * reflow the row, so only opacity and transform ever move. Its content
       * mounts with the class so the live region actually announces the save.
       */
      .saved {
        flex: none;
        width: 22px;
        height: 22px;
        display: grid;
        place-items: center;
        border-radius: 50%;
        color: var(--silk-accent);
        background: color-mix(in srgb, var(--silk-accent) 18%, transparent);
        opacity: 0;
        transform: scale(0.8);
        transition:
          opacity 200ms var(--silk-ease-out),
          transform 250ms var(--silk-spring);
        pointer-events: none;
      }
      .saved.show {
        opacity: 1;
        transform: scale(1);
      }
      .saved ha-icon {
        --mdc-icon-size: 14px;
      }
      .sr {
        position: absolute;
        width: 1px;
        height: 1px;
        overflow: hidden;
        clip-path: inset(50%);
        white-space: nowrap;
      }
      .unavailable .field {
        pointer-events: none;
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    'silk-datetime-card': SilkDatetimeCard;
  }
}
