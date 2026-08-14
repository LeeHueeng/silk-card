import { LitElement, html, css, nothing, TemplateResult } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { HomeAssistant, HassEntity, LovelaceCardConfig } from '../types';
import { silkControlStyles } from '../shared/base';
import { isUnavailable, moreInfo, clamp } from '../shared/service';
import { accentFor } from '../shared/color';
import { registerRowsEditor } from '../shared/rows';

export const META = {
  type: 'silk-maintenance-card',
  name: 'Silk Upkeep',
  description: "Filters, refills, and what's due next.",
};

export interface SilkMaintenanceItemConfig {
  name: string;
  /** A '%'-remaining sensor, or an hours/days-remaining sensor. */
  entity?: string;
  /** ISO date, or an input_datetime / timestamp-sensor entity id. */
  last?: string;
  /** Service interval in days — the denominator for the `last` math. */
  interval_days?: number;
  icon?: string;
}

export interface SilkMaintenanceCardConfig extends LovelaceCardConfig {
  /** The consumables this card tracks. */
  items: SilkMaintenanceItemConfig[];
  name?: string;
}

/** One item resolved against the clock, ready to sort and draw. */
interface ItemView {
  cfg: SilkMaintenanceItemConfig;
  /** Remaining life, 0–1; null when nothing in the config can say. */
  fraction: number | null;
  /** Unclamped remaining, so 12 days overdue still sorts ahead of 3. */
  rank: number;
  /** '62%' · 'in 12d' · 'due today' · 'overdue 3d' · '—'. */
  label: string;
  overdue: boolean;
  /** Entity to open on tap, when the row is entity-backed. */
  entityId?: string;
}

const DAY_MS = 86_400_000;
const HOUR_UNITS = new Set(['h', 'hr', 'hrs', 'hour', 'hours']);
const DAY_UNITS = new Set(['d', 'day', 'days']);
/**
 * Attention horizon for a countdown sensor with no declared interval: the bar
 * reads full at a month out and drains from there. Anything with
 * `interval_days` uses its own honest denominator instead.
 */
const HORIZON_DAYS = 30;
/** Warning below a quarter left, error below a tenth. */
const LOW = 0.25;
const CRITICAL = 0.1;
const ROW_HEIGHT = 36;
/** Day-granularity labels only need a lazy clock. */
const TICK_MS = 900_000;

const DEFAULT_ICON = 'mdi:progress-wrench';
const EDITOR_TAG = 'silk-maintenance-card-editor';

/** Today as 'YYYY-MM-DD' — what a freshly added item dates itself from. */
function isoToday(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

// One form per consumable: a life sensor, or a service date plus its interval.
registerRowsEditor(EDITOR_TAG, {
  field: 'items',
  title: '항목',
  addLabel: '항목 추가',
  row: [
    { name: 'name', label: '이름', selector: { text: {} } },
    {
      name: 'entity',
      label: '엔티티 (잔량/남은 시간)',
      selector: { entity: { domain: ['sensor', 'number', 'input_number'] } },
    },
    { name: 'last', label: '마지막 교체일 (YYYY-MM-DD 또는 엔티티)', selector: { text: {} } },
    {
      name: 'interval_days',
      label: '교체 주기(일)',
      selector: { number: { min: 1, max: 3650, step: 1, mode: 'box' } },
    },
    { name: 'icon', label: '아이콘', selector: { icon: {} } },
  ],
  blank: { name: '새 항목', last: isoToday(), interval_days: 90 },
  schema: [{ name: 'name', selector: { text: {} } }],
  labels: { name: '이름' },
  defaults: { name: 'Upkeep' },
});

/** 'YYYY-MM-DD', 'YYYY-MM-DD HH:MM(:SS)' and ISO stamps — local-time honest. */
function parseDateish(raw: string): number | null {
  const s = raw.trim();
  if (!s || s === 'unknown' || s === 'unavailable') return null;
  // Bare dates parse as UTC via Date.parse and would shift a day in most
  // timezones, so build them as local midnight by hand.
  const date = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (date) return new Date(+date[1], +date[2] - 1, +date[3]).getTime();
  const local = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?$/.exec(s);
  if (local) {
    const [, y, mo, d, h, mi, sec] = local;
    return new Date(+y, +mo - 1, +d, +h, +mi, +(sec ?? 0)).getTime();
  }
  const ms = Date.parse(s);
  return Number.isFinite(ms) ? ms : null;
}

/** `last` is either a date literal or an entity holding one. */
function parseWhen(hass: HomeAssistant, raw: string): number | null {
  const s = raw.trim();
  const stateObj: HassEntity | undefined = /^[a-z_0-9]+\.[a-zA-Z_0-9]+$/.test(s)
    ? hass.states[s]
    : undefined;
  if (stateObj) {
    // input_datetime exposes an epoch-seconds `timestamp` attribute.
    const ts = stateObj.attributes.timestamp;
    if (typeof ts === 'number' && Number.isFinite(ts)) return ts * 1000;
    return parseDateish(stateObj.state);
  }
  return parseDateish(s);
}

function numericState(stateObj: HassEntity | undefined): number | null {
  if (!stateObj || isUnavailable(stateObj) || stateObj.state === '') return null;
  const value = Number(stateObj.state);
  return Number.isFinite(value) ? value : null;
}

/**
 * Consumables, in one glance: every row is the same 6px bar, so "what runs out
 * first" is a shape you read down the card rather than four numbers you
 * compare. One accent carries magnitude; warning and error appear only when a
 * filter is genuinely near or past its service.
 */
@customElement('silk-maintenance-card')
export class SilkMaintenanceCard extends LitElement {
  @property({ attribute: false }) public hass?: HomeAssistant;

  @state() private _config?: SilkMaintenanceCardConfig;
  /** Clock the day math is resolved against; ticked so labels don't go stale. */
  @state() private _now = Date.now();

  private _tickTimer?: number;

  public static getStubConfig(hass: HomeAssistant): Partial<SilkMaintenanceCardConfig> {
    const percent = Object.keys(hass.states).find(
      (id) =>
        id.startsWith('sensor.') &&
        hass.states[id].attributes.unit_of_measurement === '%' &&
        hass.states[id].attributes.device_class !== 'battery' &&
        /filter|consumable|cartridge|brush/i.test(id)
    );
    const today = new Date();
    const iso = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(
      today.getDate()
    ).padStart(2, '0')}`;
    return {
      type: 'custom:silk-maintenance-card',
      items: percent
        ? [{ name: 'Filter', entity: percent, icon: 'mdi:air-filter' }]
        : [{ name: 'Air filter', last: iso, interval_days: 90, icon: 'mdi:air-filter' }],
    };
  }

  public static async getConfigElement(): Promise<HTMLElement> {
    return document.createElement(EDITOR_TAG);
  }

  public setConfig(config: SilkMaintenanceCardConfig): void {
    if (!Array.isArray(config.items) || config.items.length === 0) {
      throw new Error(
        'silk-maintenance-card: `items` is required — a list of {name, entity?, last?, interval_days?}'
      );
    }
    config.items.forEach((item, i) => {
      if (!item || typeof item.name !== 'string' || item.name === '') {
        throw new Error(`silk-maintenance-card: items[${i}] needs a \`name\``);
      }
      if (item.entity !== undefined && typeof item.entity !== 'string') {
        throw new Error(`silk-maintenance-card: items[${i}].entity must be an entity id`);
      }
      if (item.last !== undefined && typeof item.last !== 'string') {
        throw new Error(
          `silk-maintenance-card: items[${i}].last must be an ISO date or an entity id`
        );
      }
      if (item.interval_days !== undefined && !(Number(item.interval_days) > 0)) {
        throw new Error(`silk-maintenance-card: items[${i}].interval_days must be positive`);
      }
      if (!item.entity && !(item.last && item.interval_days)) {
        throw new Error(
          `silk-maintenance-card: items[${i}] needs an \`entity\`, or \`last\` + \`interval_days\``
        );
      }
    });
    this._config = config;
    this._now = Date.now();
  }

  public getCardSize(): number {
    return 3;
  }

  public getGridOptions(): Record<string, number> {
    return { columns: 6, rows: 3, min_columns: 3, min_rows: 2 };
  }

  public connectedCallback(): void {
    super.connectedCallback();
    this._now = Date.now();
    this._tickTimer = window.setInterval(() => {
      this._now = Date.now();
    }, TICK_MS);
  }

  public disconnectedCallback(): void {
    super.disconnectedCallback();
    window.clearInterval(this._tickTimer);
  }

  private _locale(): string {
    return this.hass?.locale?.language ?? this.hass?.language ?? 'en';
  }

  private _num(value: number): string {
    return new Intl.NumberFormat(this._locale(), { maximumFractionDigits: 0 }).format(value);
  }

  /** 'in 12d' / 'due today' / 'overdue 3d' — never a bare 'in 0d'. */
  private _dayLabel(daysLeft: number): string {
    if (daysLeft >= 0.5) return `in ${this._num(Math.round(daysLeft))}d`;
    if (daysLeft > -0.5) return 'due today';
    return `overdue ${this._num(Math.round(-daysLeft))}d`;
  }

  private _view(item: SilkMaintenanceItemConfig): ItemView {
    const hass = this.hass;
    const stateObj = item.entity && hass ? hass.states[item.entity] : undefined;
    const value = numericState(stateObj);
    const unit = String(stateObj?.attributes.unit_of_measurement ?? '').trim();
    const interval = Number(item.interval_days) > 0 ? Number(item.interval_days) : null;
    const hasTimeBasis = Boolean(item.last && interval);
    const base: ItemView = {
      cfg: item,
      fraction: null,
      rank: Infinity,
      label: '—',
      overdue: false,
      entityId: item.entity,
    };

    if (value !== null) {
      const lower = unit.toLowerCase();
      // A percent sensor already *is* the remaining fraction. A unitless
      // sensor is read as one only when it could be (0–100) and nothing else
      // in the item can date the service.
      if (unit === '%' || (unit === '' && !hasTimeBasis && value >= 0 && value <= 100)) {
        const pct = clamp(value, 0, 100);
        return { ...base, fraction: pct / 100, rank: value / 100, label: `${this._num(pct)}%` };
      }
      // A countdown sensor: hours or days of life left.
      if (HOUR_UNITS.has(lower) || DAY_UNITS.has(lower)) {
        const daysLeft = HOUR_UNITS.has(lower) ? value / 24 : value;
        const span = interval ?? HORIZON_DAYS;
        return {
          ...base,
          fraction: clamp(daysLeft / span, 0, 1),
          rank: daysLeft / span,
          label: this._dayLabel(daysLeft),
          overdue: daysLeft <= -0.5,
        };
      }
    }

    if (item.last && interval && hass) {
      const lastMs = parseWhen(hass, item.last);
      if (lastMs !== null) {
        const daysLeft = interval - (this._now - lastMs) / DAY_MS;
        return {
          ...base,
          fraction: clamp(daysLeft / interval, 0, 1),
          rank: daysLeft / interval,
          label: this._dayLabel(daysLeft),
          overdue: daysLeft <= -0.5,
        };
      }
    }
    return base;
  }

  private _onRowClick(ev: Event, entityId: string): void {
    ev.stopPropagation();
    moreInfo(this, entityId);
  }

  private _renderRow(view: ItemView): TemplateResult {
    const hass = this.hass;
    const { cfg, fraction, label, overdue } = view;
    const stateObj = view.entityId && hass ? hass.states[view.entityId] : undefined;
    const tone = fraction === null ? '' : fraction < CRITICAL ? 'crit' : fraction < LOW ? 'low' : '';
    const width = fraction === null ? 0 : Math.max(fraction > 0 ? 3 : 0, fraction * 100);
    const clickable = Boolean(view.entityId && stateObj);
    return html`
      <button
        class="row ${clickable ? '' : 'static'} ${fraction === null ? 'unknown' : ''}"
        title=${cfg.name}
        aria-label=${`${cfg.name}: ${label}`}
        .disabled=${!clickable}
        @click=${clickable
          ? (ev: Event) => this._onRowClick(ev, view.entityId as string)
          : undefined}
      >
        ${cfg.icon
          ? html`<ha-icon class="ricon" .icon=${cfg.icon}></ha-icon>`
          : stateObj
            ? html`<ha-state-icon class="ricon" .hass=${hass} .stateObj=${stateObj}></ha-state-icon>`
            : html`<ha-icon class="ricon" .icon=${DEFAULT_ICON}></ha-icon>`}
        <span class="rname">${cfg.name}</span>
        <span class="track" aria-hidden="true">
          <span class="fill ${tone}" style="width:${width.toFixed(1)}%"></span>
        </span>
        <span class="left ${overdue ? 'over' : ''}">${label}</span>
      </button>
    `;
  }

  protected render(): TemplateResult | typeof nothing {
    const config = this._config;
    const hass = this.hass;
    if (!config || !hass) return nothing;

    const views = config.items
      .map((item) => this._view(item))
      // Whatever runs out first reads first; items that can't speak sink last.
      .sort((a, b) => a.rank - b.rank);
    const due = views.filter((v) => v.fraction !== null && v.fraction < LOW).length;
    const firstObj = config.items
      .map((item) => (item.entity ? hass.states[item.entity] : undefined))
      .find((obj) => obj !== undefined);
    const accent = accentFor(firstObj);
    const name = config.name ?? 'Upkeep';

    return html`
      <ha-card class="control" style="--silk-accent:${accent}">
        <div class="head">
          <div class="title" title=${name}>${name}</div>
          ${due > 0 ? html`<span class="chip due">${this._num(due)} due</span>` : nothing}
        </div>
        <div class="rows">${views.map((view) => this._renderRow(view))}</div>
      </ha-card>
    `;
  }

  static styles = [
    silkControlStyles,
    css`
      /* A list card: it grows with its rows and presses nowhere as a whole. */
      ha-card {
        flex-direction: column;
        align-items: stretch;
        justify-content: flex-start;
        gap: 6px;
        height: auto;
        min-height: 100%;
        cursor: default;
      }
      .head {
        flex: none;
        display: flex;
        align-items: center;
        gap: 8px;
        min-width: 0;
      }
      .title {
        flex: 1;
        min-width: 0;
        font-size: 14px;
        font-weight: 500;
        line-height: 1.3;
        color: var(--primary-text-color);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .chip.due {
        flex: none;
        cursor: default;
        font-variant-numeric: tabular-nums;
        color: var(--warning-color, #ffa600);
        background: color-mix(in srgb, var(--warning-color, #ffa600) 14%, transparent);
      }
      .rows {
        display: flex;
        flex-direction: column;
        min-width: 0;
      }
      .row {
        display: flex;
        align-items: center;
        gap: 10px;
        width: 100%;
        height: ${ROW_HEIGHT}px;
        margin: 0;
        padding: 0 4px;
        border: none;
        border-radius: 10px;
        background: none;
        font: inherit;
        color: inherit;
        text-align: left;
        cursor: pointer;
        transition: background 150ms ease-out;
      }
      .row:hover {
        background: rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.05);
      }
      .row.static {
        cursor: default;
      }
      /* An item nothing can date recedes rather than pretending to a number. */
      .row.unknown .ricon,
      .row.unknown .rname,
      .row.unknown .track,
      .row.unknown .left {
        opacity: 0.45;
      }
      .row.static:hover {
        background: none;
      }
      .row:focus-visible {
        outline: 2px solid color-mix(in srgb, var(--silk-accent) 70%, transparent);
        outline-offset: -2px;
      }
      /* Icons stay neutral — the bar and the label carry the state. */
      .ricon {
        flex: none;
        --mdc-icon-size: 20px;
        color: var(--secondary-text-color);
        pointer-events: none;
      }
      .rname {
        flex: 2 1 40px;
        min-width: 0;
        font-size: 13.5px;
        font-weight: 500;
        color: var(--primary-text-color);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .track {
        position: relative;
        flex: 1 1 64px;
        min-width: 28px;
        max-width: 96px;
        height: 6px;
        border-radius: 3px;
        overflow: hidden;
        background: rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.08);
      }
      .fill {
        position: absolute;
        inset: 0 auto 0 0;
        border-radius: 3px;
        background: var(--silk-accent);
        transition:
          width 400ms var(--silk-ease-out),
          background 200ms ease;
      }
      .fill.low {
        background: var(--warning-color, #ffa600);
      }
      .fill.crit {
        background: var(--error-color, #db4437);
      }
      .left {
        flex: none;
        min-width: 56px;
        text-align: right;
        font-size: 12px;
        font-weight: 500;
        line-height: 1.3;
        color: var(--secondary-text-color);
        font-variant-numeric: tabular-nums;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .left.over {
        font-weight: 600;
        color: var(--error-color, #db4437);
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    'silk-maintenance-card': SilkMaintenanceCard;
  }
}
