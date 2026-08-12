import { LitElement, html, css, nothing, TemplateResult } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { HomeAssistant, HassEntity, LovelaceCardConfig } from '../types';
import { silkControlStyles } from '../shared/base';
import { isUnavailable, moreInfo } from '../shared/service';
import { accentFor } from '../shared/color';
import { registerEditor } from '../shared/editor';

export const META = {
  type: 'silk-countdown-card',
  name: 'Silk Countdown',
  description: 'D-day, counted honestly.',
};

export interface SilkCountdownCardConfig extends LovelaceCardConfig {
  /** Fixed target: 'YYYY-MM-DD' or a full ISO datetime. */
  date?: string;
  /** Live target: input_datetime, date/datetime entity, or timestamp/date sensor. Wins over `date`. */
  entity?: string;
  name?: string;
  icon?: string;
}

/** A resolved countdown target; `hasTime` means it carries a time-of-day. */
interface Target {
  ms: number;
  hasTime: boolean;
}

const DAY_MS = 86_400_000;
const HOUR_MS = 3_600_000;
const MINUTE_MS = 60_000;
const SOON_WINDOW_MS = 48 * HOUR_MS;
const DEFAULT_ICON = 'mdi:calendar-clock';
const DEFAULT_NAME = 'D-day';

/**
 * Parse 'YYYY-MM-DD' as *local* midnight, date-only (Date.parse would read it
 * as UTC and shift the day); anything else is delegated to Date.parse and
 * treated as carrying a time-of-day.
 */
function parseDateString(value: string): Target | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (m) {
    const ms = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])).getTime();
    return Number.isFinite(ms) ? { ms, hasTime: false } : null;
  }
  const ms = Date.parse(value);
  return Number.isFinite(ms) ? { ms, hasTime: true } : null;
}

/** Target from a live entity: input_datetime attributes first, ISO state otherwise. */
function entityTarget(stateObj: HassEntity): Target | null {
  const a = stateObj.attributes;
  if (a.has_date) {
    // input_datetime — build from the numeric attributes, not the state string
    // (its 'YYYY-MM-DD HH:MM:SS' form parses inconsistently across engines).
    const hasTime = !!a.has_time;
    const ms = new Date(
      a.year,
      (a.month ?? 1) - 1,
      a.day ?? 1,
      hasTime ? (a.hour ?? 0) : 0,
      hasTime ? (a.minute ?? 0) : 0,
      hasTime ? (a.second ?? 0) : 0
    ).getTime();
    return Number.isFinite(ms) ? { ms, hasTime } : null;
  }
  if (a.has_date === false) return null; // time-only input_datetime: nothing to count to
  return parseDateString(stateObj.state); // timestamp/date sensors expose ISO state
}

/**
 * Day-granularity count, the spec's ceil((target − todayMidnight) / DAY)
 * evaluated on UTC stamps of the local calendar dates so DST-stretched days
 * cannot skew the result by one.
 */
function dayCount(targetMs: number, nowMs: number): number {
  const t = new Date(targetMs);
  const n = new Date(nowMs);
  return Math.ceil(
    (Date.UTC(t.getFullYear(), t.getMonth(), t.getDate()) -
      Date.UTC(n.getFullYear(), n.getMonth(), n.getDate())) /
      DAY_MS
  );
}

const EDITOR_TAG = 'silk-countdown-card-editor';

registerEditor(
  EDITOR_TAG,
  [
    { name: 'name', selector: { text: {} } },
    { name: 'date', selector: { text: {} } },
    {
      name: 'entity',
      selector: { entity: { domain: ['input_datetime', 'date', 'datetime', 'sensor'] } },
    },
    { name: 'icon', selector: { icon: {} } },
  ],
  {
    name: 'Name',
    date: 'Date (YYYY-MM-DD or ISO)',
    entity: 'Entity (overrides date)',
    icon: 'Icon',
  }
);

@customElement('silk-countdown-card')
export class SilkCountdownCard extends LitElement {
  @property({ attribute: false }) public hass?: HomeAssistant;

  @state() private _config?: SilkCountdownCardConfig;

  private _tickTimer?: number;

  public static getStubConfig(hass: HomeAssistant): Partial<SilkCountdownCardConfig> {
    const ids = Object.keys(hass.states);
    const entity =
      ids.find((id) => id.startsWith('input_datetime.') && hass.states[id].attributes.has_date) ??
      ids.find(
        (id) => id.startsWith('sensor.') && hass.states[id].attributes.device_class === 'timestamp'
      );
    if (entity) return { type: 'custom:silk-countdown-card', entity };
    return {
      type: 'custom:silk-countdown-card',
      date: `${new Date().getFullYear() + 1}-01-01`,
      name: 'New Year',
    };
  }

  public static async getConfigElement(): Promise<HTMLElement> {
    return document.createElement(EDITOR_TAG);
  }

  public setConfig(config: SilkCountdownCardConfig): void {
    if (!config.date && !config.entity) {
      throw new Error('silk-countdown-card: set `date` or `entity`');
    }
    if (config.date && parseDateString(config.date) === null) {
      throw new Error('silk-countdown-card: `date` must be YYYY-MM-DD or an ISO datetime');
    }
    this._config = config;
  }

  public getCardSize(): number {
    return 2;
  }

  public getGridOptions(): Record<string, number> {
    return { columns: 3, rows: 2, min_columns: 2, min_rows: 1 };
  }

  public connectedCallback(): void {
    super.connectedCallback();
    // Recompute every minute so the count flips at midnight (and the under-48h
    // hours/minutes line stays honest) without any state change from HA.
    this._tickTimer = window.setInterval(() => this.requestUpdate(), MINUTE_MS);
  }

  public disconnectedCallback(): void {
    super.disconnectedCallback();
    window.clearInterval(this._tickTimer);
  }

  private _locale(): string {
    return this.hass?.locale?.language ?? this.hass?.language ?? 'en';
  }

  private _onCardClick(): void {
    const entity = this._config?.entity;
    if (entity) moreInfo(this, entity);
  }

  protected render(): TemplateResult | typeof nothing {
    const config = this._config;
    const hass = this.hass;
    if (!config || !hass) return nothing;
    const entityBased = !!config.entity;
    const stateObj = entityBased ? hass.states[config.entity!] : undefined;
    if (entityBased && !stateObj) {
      return html`
        <ha-card class="control">
          <div class="warning">Entity not found: ${config.entity}</div>
        </ha-card>
      `;
    }

    const unavailable = entityBased && isUnavailable(stateObj);
    const target = unavailable
      ? null
      : entityBased
        ? entityTarget(stateObj!)
        : parseDateString(config.date!);

    const now = Date.now();
    const days = target === null ? null : dayCount(target.ms, now);
    const past = days !== null && days < 0;
    const label =
      days === null ? '—' : days === 0 ? 'D-DAY' : days > 0 ? `D-${days}` : `D+${-days}`;

    let dateLine = unavailable ? 'Unavailable' : 'No date';
    let soon = '';
    if (target !== null) {
      const targetDate = new Date(target.ms);
      const sameYear = targetDate.getFullYear() === new Date(now).getFullYear();
      dateLine = new Intl.DateTimeFormat(this._locale(), {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        ...(sameYear ? {} : { year: 'numeric' }),
      }).format(targetDate);
      const msLeft = target.ms - now;
      if (target.hasTime && msLeft > 0 && msLeft < SOON_WINDOW_MS) {
        const h = Math.floor(msLeft / HOUR_MS);
        const m = Math.floor((msLeft % HOUR_MS) / MINUTE_MS);
        soon = `${h}h ${m}m`;
      }
    }

    const accent = accentFor(stateObj);
    const name = config.name ?? stateObj?.attributes.friendly_name ?? DEFAULT_NAME;
    const iconOn = !unavailable && days !== null && days >= 0;

    return html`
      <ha-card
        class="control ${unavailable ? 'unavailable' : ''} ${entityBased ? '' : 'static'}"
        style="--silk-accent:${accent}"
        @click=${this._onCardClick}
      >
        <div class="icon ${iconOn ? 'on' : ''}">
          ${config.icon
            ? html`<ha-icon .icon=${config.icon}></ha-icon>`
            : stateObj
              ? html`<ha-state-icon .hass=${hass} .stateObj=${stateObj}></ha-state-icon>`
              : html`<ha-icon .icon=${DEFAULT_ICON}></ha-icon>`}
        </div>
        <div class="info">
          <div class="name">${name}</div>
          <div class="state">
            ${dateLine}${soon ? html`<span class="sep">·</span>${soon}` : nothing}
          </div>
        </div>
        <div class="trailing">
          <span class="dday ${past ? 'past' : ''}">${label}</span>
        </div>
      </ha-card>
    `;
  }

  static styles = [
    silkControlStyles,
    css`
      /* No control action: the icon presses with the card. */
      .icon {
        cursor: inherit;
      }
      .icon:active {
        transform: none;
      }
      /* A fixed-date card opens nothing, so it should not invite a tap. */
      ha-card.static {
        cursor: default;
      }
      .dday {
        font-size: 24px;
        font-weight: 700;
        letter-spacing: -0.02em;
        line-height: 1;
        color: var(--primary-text-color);
        font-variant-numeric: tabular-nums;
        white-space: nowrap;
        transition: color 200ms ease;
      }
      .dday.past {
        color: var(--secondary-text-color);
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    'silk-countdown-card': SilkCountdownCard;
  }
}
