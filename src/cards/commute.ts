import { LitElement, html, css, nothing, TemplateResult } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { HomeAssistant, HassEntity, LovelaceCardConfig } from '../types';
import { silkControlStyles } from '../shared/base';
import { isUnavailable, moreInfo, haptic, clamp } from '../shared/service';
import { accentFor } from '../shared/color';
import { registerRowsEditor } from '../shared/rows';

export const META = {
  type: 'silk-commute-card',
  name: 'Silk Commute',
  description: 'How long the drive is right now.',
};

/**
 * One route. `duration` is the live travel-time sensor; minutes are assumed,
 * but a sensor reporting seconds or hours is converted from its
 * `unit_of_measurement`. `typical` is either a second sensor (a "typical
 * duration" entity, as Waze and Google Travel Time expose) or a plain number
 * of minutes.
 */
export interface SilkCommuteRouteConfig {
  /** Route label; defaults to the duration sensor's friendly name. */
  name?: string;
  /** Live travel-time entity. */
  duration: string;
  /** Typical travel time: an entity id or a number of minutes. */
  typical?: string | number;
  /** Optional distance sensor, shown under the route name. */
  distance?: string;
}

export interface SilkCommuteCardConfig extends LovelaceCardConfig {
  /** Routes to compare — one row each in the editor. */
  routes: SilkCommuteRouteConfig[];
  /** Arrival target as 'HH:MM'; adds a leave-by line off the fastest route. */
  depart_by?: string;
  /** Header label; `''` drops the header when the route names already say it. */
  name?: string;
}

/** A route resolved against the current states, ready to render. */
interface RouteRow {
  cfg: SilkCommuteRouteConfig;
  name: string;
  /** Live duration in minutes; null when unknown or unavailable. */
  minutes: number | null;
  /** Typical duration in minutes; null when not configured or unknown. */
  typical: number | null;
  distance: string | null;
  unavailable: boolean;
}

const DEFAULT_NAME = 'Commute';
const MINUTE_MS = 60_000;
const HOUR_MS = 3_600_000;
const DAY_MS = 86_400_000;
/** The leave-by countdown moves on its own clock. */
const TICK_MS = 30_000;
/** Inside this band the drive is simply normal — no chip drama. */
const ON_TIME_MINUTES = 3;
/** Countdown only shows once leaving is actually on the horizon. */
const SOON_MS = 90 * MINUTE_MS;

/** Travel time in minutes, honouring the sensor's own unit. */
function minutesOf(stateObj: HassEntity | undefined): number | null {
  if (!stateObj || isUnavailable(stateObj) || stateObj.state === '') return null;
  const value = Number(stateObj.state);
  if (!Number.isFinite(value)) return null;
  const unit = String(stateObj.attributes.unit_of_measurement ?? '').toLowerCase();
  if (unit === 's' || unit.startsWith('sec')) return value / 60;
  if (unit === 'h' || unit.startsWith('hour') || unit === 'hr') return value * 60;
  return value;
}

const EDITOR_TAG = 'silk-commute-card-editor';

// Routes are rows — one form each, so the whole card is clickable. `depart_by`
// stays a text field on purpose: setConfig only accepts 'HH:MM', which a time
// selector would break by writing seconds.
//
// `typical` takes an entity here because that is the shape the travel-time
// integrations expose; a plain number of minutes is still valid YAML and rides
// through untouched, since the row form only rewrites the field it edits.
registerRowsEditor(EDITOR_TAG, {
  field: 'routes',
  title: '경로',
  addLabel: '경로 추가',
  row: [
    { name: 'duration', label: '소요 시간 엔티티', selector: { entity: { domain: ['sensor'] } } },
    { name: 'name', label: '이름', selector: { text: {} } },
    { name: 'typical', label: '평소 소요 엔티티', selector: { entity: { domain: ['sensor'] } } },
    { name: 'distance', label: '거리 엔티티', selector: { entity: { domain: ['sensor'] } } },
  ],
  blank: { duration: '' },
  schema: [
    { name: 'name', selector: { text: {} } },
    { name: 'depart_by', selector: { text: {} } },
  ],
  labels: { name: '이름', depart_by: '도착 시각 (HH:MM)' },
});

/**
 * Travel times, side by side: how long each way home takes right now, how that
 * compares to a normal day, and — when an arrival time is set — the moment you
 * have to walk out of the door.
 */
@customElement('silk-commute-card')
export class SilkCommuteCard extends LitElement {
  @property({ attribute: false }) public hass?: HomeAssistant;

  @state() private _config?: SilkCommuteCardConfig;

  private _tickTimer?: number;

  public static getStubConfig(hass: HomeAssistant): Partial<SilkCommuteCardConfig> {
    const ids = Object.keys(hass.states).filter(
      (id) =>
        id.startsWith('sensor.') &&
        Number.isFinite(Number(hass.states[id].state)) &&
        /duration|travel|commute|traffic|route/i.test(id)
    );
    return {
      type: 'custom:silk-commute-card',
      routes: ids.slice(0, 2).map((duration) => ({ duration })),
    };
  }

  public static async getConfigElement(): Promise<HTMLElement> {
    return document.createElement(EDITOR_TAG);
  }

  public setConfig(config: SilkCommuteCardConfig): void {
    if (!Array.isArray(config.routes) || config.routes.length === 0) {
      throw new Error('silk-commute-card: `routes` requires at least one { duration } entry');
    }
    const broken = config.routes.find(
      (route) => !route || typeof route.duration !== 'string' || route.duration === ''
    );
    if (broken !== undefined) {
      throw new Error(
        'silk-commute-card: every entry in `routes` needs a `duration` entity (minutes)'
      );
    }
    const typicalBroken = config.routes.find(
      (route) =>
        route.typical !== undefined &&
        typeof route.typical !== 'string' &&
        !Number.isFinite(Number(route.typical))
    );
    if (typicalBroken !== undefined) {
      throw new Error('silk-commute-card: `typical` must be an entity id or a number of minutes');
    }
    if (config.depart_by !== undefined && !/^\d{1,2}:\d{2}$/.test(String(config.depart_by))) {
      throw new Error("silk-commute-card: `depart_by` must be a 'HH:MM' arrival time");
    }
    this._config = config;
  }

  public getCardSize(): number {
    return 1 + (this._config?.routes.length ?? 1);
  }

  public getGridOptions(): Record<string, number> {
    return { columns: 6, rows: 2, min_columns: 4, min_rows: 2 };
  }

  public connectedCallback(): void {
    super.connectedCallback();
    // The leave-by line counts down without any state change from HA.
    this._tickTimer = window.setInterval(() => this.requestUpdate(), TICK_MS);
  }

  public disconnectedCallback(): void {
    super.disconnectedCallback();
    window.clearInterval(this._tickTimer);
    this._tickTimer = undefined;
  }

  private _locale(): string {
    return this.hass?.locale?.language ?? this.hass?.language ?? 'en';
  }

  private _typicalOf(route: SilkCommuteRouteConfig): number | null {
    const hass = this.hass;
    if (!hass || route.typical === undefined) return null;
    if (typeof route.typical === 'string') return minutesOf(hass.states[route.typical]);
    const value = Number(route.typical);
    return Number.isFinite(value) ? value : null;
  }

  private _distanceOf(route: SilkCommuteRouteConfig): string | null {
    const hass = this.hass;
    if (!hass || !route.distance) return null;
    const stateObj = hass.states[route.distance];
    if (!stateObj || isUnavailable(stateObj) || stateObj.state === '') return null;
    const unit = stateObj.attributes.unit_of_measurement as string | undefined;
    const value = Number(stateObj.state);
    const text = Number.isFinite(value)
      ? new Intl.NumberFormat(this._locale(), { maximumFractionDigits: 1 }).format(value)
      : stateObj.state;
    return unit ? `${text} ${unit}` : text;
  }

  private _rows(): RouteRow[] {
    const hass = this.hass;
    const config = this._config;
    if (!hass || !config) return [];
    return config.routes.map((cfg) => {
      const stateObj = hass.states[cfg.duration];
      return {
        cfg,
        name:
          cfg.name ??
          (stateObj?.attributes.friendly_name as string | undefined) ??
          cfg.duration,
        minutes: minutesOf(stateObj),
        typical: this._typicalOf(cfg),
        distance: this._distanceOf(cfg),
        unavailable: isUnavailable(stateObj),
      };
    });
  }

  /**
   * The moment to walk out, derived from the fastest route. The target rolls
   * to tomorrow only once it is an hour stale, so a just-missed departure still
   * reads honestly as 'now' instead of jumping 24 hours ahead.
   */
  private _leaveBy(rows: RouteRow[], now: number): { at: number; label: string } | null {
    const raw = this._config?.depart_by;
    if (!raw) return null;
    const match = /^(\d{1,2}):(\d{2})$/.exec(String(raw));
    if (!match) return null;
    const fastest = rows
      .map((row) => row.minutes)
      .filter((value): value is number => value !== null)
      .sort((a, b) => a - b)[0];
    if (fastest === undefined) return null;
    const arrive = new Date(now);
    arrive.setHours(Number(match[1]), Number(match[2]), 0, 0);
    let at = arrive.getTime() - fastest * MINUTE_MS;
    if (now - at > HOUR_MS) at += DAY_MS;
    const timeFmt = new Intl.DateTimeFormat(this._locale(), {
      hour: 'numeric',
      minute: '2-digit',
    });
    return { at, label: timeFmt.format(at) };
  }

  private _onCardClick(): void {
    const first = this._config?.routes[0]?.duration;
    if (first) moreInfo(this, first);
  }

  private _onRowClick(ev: Event, entityId: string): void {
    ev.stopPropagation();
    haptic(this);
    moreInfo(this, entityId);
  }

  private _renderRow(row: RouteRow): TemplateResult {
    const { minutes, typical } = row;
    const delta = minutes !== null && typical !== null ? minutes - typical : null;
    const late = delta !== null && delta >= ON_TIME_MINUTES;
    const quick = delta !== null && delta <= -ON_TIME_MINUTES;
    const deltaLabel =
      delta === null
        ? null
        : late
          ? `+${Math.round(delta)} min`
          : quick
            ? `−${Math.round(Math.abs(delta))} min`
            : 'on time';

    // One accent hue carries the magnitude; the typical marker is recessive and
    // rides on top of the fill with a surface gap so the two never merge.
    const scale = Math.max(minutes ?? 0, typical ?? 0);
    const fillPct = minutes !== null && scale > 0 ? clamp((minutes / scale) * 100, 0, 100) : 0;
    const tickPct = typical !== null && scale > 0 ? clamp((typical / scale) * 100, 1, 99) : null;
    const barTitle =
      minutes === null
        ? `${row.name} · unavailable`
        : typical === null
          ? `${row.name} · ${Math.round(minutes)} min now`
          : `${row.name} · ${Math.round(minutes)} min now, ${Math.round(typical)} min typical`;

    return html`
      <button
        class="row ${row.unavailable ? 'gone' : ''}"
        aria-label=${barTitle}
        @click=${(ev: Event) => this._onRowClick(ev, row.cfg.duration)}
      >
        <div class="head">
          <div class="labels">
            <span class="rname">${row.name}</span>
            ${row.distance ? html`<span class="dist">${row.distance}</span>` : nothing}
          </div>
          ${deltaLabel
            ? html`<span class="chip static ${late ? 'warn' : 'good'}">${deltaLabel}</span>`
            : nothing}
          <span class="value"
            >${minutes === null ? '—' : Math.round(minutes)}<span class="unit">min</span></span
          >
        </div>
        <div class="track" title=${barTitle}>
          <span class="fill" style="width:${fillPct.toFixed(1)}%"></span>
          ${tickPct !== null
            ? html`<span class="tick" style="left:${tickPct.toFixed(1)}%"></span>`
            : nothing}
        </div>
      </button>
    `;
  }

  protected render(): TemplateResult | typeof nothing {
    const config = this._config;
    const hass = this.hass;
    if (!config || !hass) return nothing;

    const objs = config.routes.map((route) => hass.states[route.duration]);
    if (objs.every((obj) => !obj)) {
      return html`
        <ha-card class="control">
          <div class="warning">
            Entity not found: ${config.routes.map((route) => route.duration).join(', ')}
          </div>
        </ha-card>
      `;
    }

    const rows = this._rows();
    const now = Date.now();
    const leave = this._leaveBy(rows, now);
    const unavailable = objs.every((obj) => isUnavailable(obj));
    const accent = accentFor(objs.find((obj) => obj));
    const name = config.name ?? DEFAULT_NAME;

    let leaveSuffix: string | null = null;
    if (leave) {
      const left = leave.at - now;
      leaveSuffix =
        left <= 0 ? 'now' : left <= SOON_MS ? `in ${Math.round(left / MINUTE_MS)} min` : null;
    }

    return html`
      <ha-card
        class="control ${unavailable ? 'unavailable' : ''}"
        style="--silk-accent:${accent}"
        @click=${this._onCardClick}
      >
        ${name === '' ? nothing : html`<div class="header"><div class="hname">${name}</div></div>`}
        <div class="rows">${rows.map((row) => this._renderRow(row))}</div>
        ${leave
          ? html`<div class="leave">
              leave by <span class="at">${leave.label}</span>
              ${leaveSuffix ? html`<span class="sep">·</span>${leaveSuffix}` : nothing}
            </div>`
          : nothing}
      </ha-card>
    `;
  }

  static styles = [
    silkControlStyles,
    css`
      ha-card {
        flex-direction: column;
        align-items: stretch;
        justify-content: flex-start;
        gap: 6px;
        padding: 12px 14px;
      }
      .header {
        flex: none;
        display: flex;
        align-items: center;
        min-height: 20px;
      }
      .hname {
        min-width: 0;
        font-size: 13px;
        font-weight: 600;
        color: var(--secondary-text-color);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      /* min-height:0 lets the route list give way first: on a short card the
         leave-by line — the one thing you act on — is never the part that
         falls off the bottom. */
      .rows {
        display: flex;
        flex-direction: column;
        gap: 2px;
        min-width: 0;
        min-height: 0;
        margin: 0 -6px;
        overflow: hidden;
      }
      .row {
        display: flex;
        flex-direction: column;
        gap: 5px;
        width: 100%;
        margin: 0;
        padding: 5px 6px 7px;
        border: none;
        border-radius: 10px;
        background: none;
        font: inherit;
        color: inherit;
        text-align: left;
        cursor: pointer;
        outline: none;
        transition:
          background 150ms ease-out,
          transform 250ms var(--silk-spring);
      }
      .row:hover {
        background: rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.05);
      }
      .row:active {
        transform: scale(0.985);
        transition-duration: 120ms;
        transition-timing-function: var(--silk-ease-out);
      }
      .row:focus-visible {
        box-shadow: inset 0 0 0 2px color-mix(in srgb, var(--silk-accent) 70%, transparent);
      }
      .row.gone {
        opacity: 0.45;
      }
      .head {
        display: flex;
        align-items: center;
        gap: 8px;
        min-width: 0;
      }
      .labels {
        flex: 1;
        min-width: 0;
        display: flex;
        align-items: baseline;
        gap: 6px;
      }
      .rname {
        min-width: 0;
        font-size: 13.5px;
        font-weight: 500;
        line-height: 1.3;
        color: var(--primary-text-color);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .dist {
        flex: none;
        font-size: 11.5px;
        line-height: 1.3;
        color: var(--secondary-text-color);
        font-variant-numeric: tabular-nums;
        white-space: nowrap;
      }
      .value {
        flex: none;
        font-size: 17px;
        font-weight: 600;
        letter-spacing: -0.01em;
        line-height: 1;
        color: var(--primary-text-color);
        font-variant-numeric: tabular-nums;
        white-space: nowrap;
      }
      .value .unit {
        margin-left: 3px;
        font-size: 11px;
        font-weight: 500;
        color: var(--secondary-text-color);
      }
      /* Late vs on time is a real status, so the status tokens earn their place. */
      .chip.static {
        flex: none;
        cursor: inherit;
        font-variant-numeric: tabular-nums;
        white-space: nowrap;
      }
      .chip.static.good {
        color: var(--success-color, #43a047);
        background: color-mix(in srgb, var(--success-color, #43a047) 14%, transparent);
      }
      .chip.static.warn {
        color: var(--warning-color, #ffa600);
        background: color-mix(in srgb, var(--warning-color, #ffa600) 16%, transparent);
      }
      .chip.static.good:hover {
        background: color-mix(in srgb, var(--success-color, #43a047) 14%, transparent);
      }
      .chip.static.warn:hover {
        background: color-mix(in srgb, var(--warning-color, #ffa600) 16%, transparent);
      }
      .track {
        position: relative;
        height: 4px;
        border-radius: 2px;
        background: rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.08);
        overflow: hidden;
      }
      .fill {
        display: block;
        height: 100%;
        border-radius: 2px;
        background: var(--silk-accent);
        transition: width 400ms var(--silk-ease-out);
      }
      /* Typical time: recessive, and ringed in the card surface so it reads as
         a separate mark even when it sits inside the fill. */
      .tick {
        position: absolute;
        top: 0;
        width: 2px;
        height: 100%;
        margin-left: -1px;
        border-radius: 1px;
        background: rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.55);
        box-shadow: 0 0 0 2px var(--card-background-color, #fff);
      }
      .leave {
        flex: none;
        margin-top: 1px;
        font-size: 12px;
        line-height: 1.3;
        color: var(--secondary-text-color);
        font-variant-numeric: tabular-nums;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .leave .at {
        font-weight: 600;
        color: var(--primary-text-color);
      }
      .leave .sep {
        opacity: 0.5;
        margin: 0 3px;
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    'silk-commute-card': SilkCommuteCard;
  }
}
