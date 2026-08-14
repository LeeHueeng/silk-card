import { LitElement, html, css, nothing, TemplateResult } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { HomeAssistant, HassEntity, LovelaceCardConfig } from '../types';
import { silkControlStyles } from '../shared/base';
import { isUnavailable, moreInfo } from '../shared/service';
import { accentFor } from '../shared/color';
import { registerRowsEditor } from '../shared/rows';

export const META = {
  type: 'silk-trash-card',
  name: 'Silk Bins',
  description: 'Which bin goes out tonight.',
};

export interface SilkBinConfig {
  name: string;
  /** A days-until sensor, or a date / timestamp sensor. */
  entity: string;
  /** The bin's own colour — waste bins are identified by it in real life. */
  color?: string;
  icon?: string;
}

export interface SilkTrashCardConfig extends LovelaceCardConfig {
  /** The collections this card watches. */
  bins: SilkBinConfig[];
  name?: string;
}

/** A bin resolved against the calendar. */
interface BinView {
  cfg: SilkBinConfig;
  /** Whole days from today; null when the sensor cannot say. */
  days: number | null;
  /** Collection day at local midnight; null when unknown. */
  dateMs: number | null;
  stateObj?: HassEntity;
}

const DAY_MS = 86_400_000;
const DEFAULT_ICON = 'mdi:trash-can-outline';
/** Day-granularity labels only need a lazy clock. */
const TICK_MS = 900_000;
const DAY_UNITS = new Set(['d', 'day', 'days']);

const EDITOR_TAG = 'silk-trash-card-editor';

// One row per bin — name, sensor, kerbside colour and icon — because a bin is
// identified by its colour and no flat form can hold four fields per entry.
registerRowsEditor(EDITOR_TAG, {
  field: 'bins',
  title: '수거함',
  addLabel: '수거함 추가',
  blank: { name: '새 수거함', entity: '' },
  row: [
    { name: 'name', label: '이름', selector: { text: {} } },
    {
      name: 'entity',
      label: '수거일 센서',
      selector: { entity: { domain: ['sensor', 'input_datetime'] } },
    },
    { name: 'color', label: '색상', selector: { ui_color: {} } },
    { name: 'icon', label: '아이콘', selector: { icon: {} } },
  ],
  schema: [{ name: 'name', selector: { text: {} } }],
  labels: { name: '이름' },
  defaults: { name: 'Bins' },
});

/** 'YYYY-MM-DD' and ISO stamps, read as local time (Date.parse would shift a bare date). */
function parseDateish(raw: string): number | null {
  const s = raw.trim();
  if (!s || s === 'unknown' || s === 'unavailable') return null;
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

/** Whole calendar days from `now` to `target` — DST-proof, unlike ms division. */
function dayDiff(targetMs: number, nowMs: number): number {
  const t = new Date(targetMs);
  const n = new Date(nowMs);
  return Math.round(
    (Date.UTC(t.getFullYear(), t.getMonth(), t.getDate()) -
      Date.UTC(n.getFullYear(), n.getMonth(), n.getDate())) /
      DAY_MS
  );
}

function midnightPlus(days: number, nowMs: number): number {
  const n = new Date(nowMs);
  return new Date(n.getFullYear(), n.getMonth(), n.getDate() + days).getTime();
}

/**
 * One question, asked the way you actually ask it: which bin goes out tonight.
 * The soonest collection is the hero and carries the card's accent — the bin's
 * own colour when the config gives one, because that is how bins are told apart
 * at the kerb. Warning appears only when something must leave the house today
 * or tomorrow, never as decoration.
 */
@customElement('silk-trash-card')
export class SilkTrashCard extends LitElement {
  @property({ attribute: false }) public hass?: HomeAssistant;

  @state() private _config?: SilkTrashCardConfig;
  /** Clock the day math is resolved against; ticked so labels don't go stale. */
  @state() private _now = Date.now();

  private _tickTimer?: number;

  public static getStubConfig(hass: HomeAssistant): Partial<SilkTrashCardConfig> {
    const waste = /waste|trash|garbage|bin|refuse|recycl|collection|abfall|afval/i;
    const ids = Object.keys(hass.states).filter((id) => id.startsWith('sensor.') && waste.test(id));
    return {
      type: 'custom:silk-trash-card',
      name: 'Bins',
      bins: ids.length
        ? ids.slice(0, 3).map((id, i) => ({
            name: String(hass.states[id].attributes.friendly_name ?? id.split('.')[1]),
            entity: id,
            icon: i === 0 ? DEFAULT_ICON : 'mdi:recycle',
          }))
        : [{ name: 'General waste', entity: 'sensor.waste_collection', icon: DEFAULT_ICON }],
    };
  }

  public static async getConfigElement(): Promise<HTMLElement> {
    return document.createElement(EDITOR_TAG);
  }

  public setConfig(config: SilkTrashCardConfig): void {
    if (!Array.isArray(config.bins) || config.bins.length === 0) {
      throw new Error('silk-trash-card: `bins` is required — a list of {name, entity}');
    }
    config.bins.forEach((bin, i) => {
      if (!bin || typeof bin.name !== 'string' || bin.name.trim() === '') {
        throw new Error(`silk-trash-card: bins[${i}] needs a \`name\``);
      }
      if (typeof bin.entity !== 'string' || bin.entity === '') {
        throw new Error(`silk-trash-card: bins[${i}] needs an \`entity\` (days-until or date sensor)`);
      }
      if (bin.color !== undefined && typeof bin.color !== 'string') {
        throw new Error(`silk-trash-card: bins[${i}].color must be a CSS colour`);
      }
    });
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
    this._tickTimer = window.setInterval(() => {
      this._now = Date.now();
    }, TICK_MS);
  }

  public disconnectedCallback(): void {
    super.disconnectedCallback();
    window.clearInterval(this._tickTimer);
    this._tickTimer = undefined;
  }

  private _view(bin: SilkBinConfig): BinView {
    const stateObj = this.hass?.states[bin.entity];
    const base: BinView = { cfg: bin, days: null, dateMs: null, stateObj };
    if (!stateObj || isUnavailable(stateObj) || stateObj.state === '') return base;

    // input_datetime and friends carry epoch seconds outright.
    const ts = stateObj.attributes.timestamp;
    if (typeof ts === 'number' && Number.isFinite(ts)) {
      return { ...base, days: dayDiff(ts * 1000, this._now), dateMs: ts * 1000 };
    }
    const unit = String(stateObj.attributes.unit_of_measurement ?? '')
      .trim()
      .toLowerCase();
    const numeric = Number(stateObj.state);
    // A bare number is a countdown in days — the common shape of these sensors.
    if (Number.isFinite(numeric) && (unit === '' || DAY_UNITS.has(unit))) {
      const days = Math.round(numeric);
      // No date was published, so the collection day is derived from the count.
      return { ...base, days, dateMs: midnightPlus(days, this._now) };
    }
    const parsed = parseDateish(stateObj.state);
    if (parsed !== null) return { ...base, days: dayDiff(parsed, this._now), dateMs: parsed };
    return base;
  }

  private _locale(): string {
    return this.hass?.locale?.language ?? this.hass?.language ?? 'en';
  }

  /** 'Today' · 'Tomorrow' · 'in 3 days' · 'Yesterday' · '4 days ago'. */
  private _whenLabel(days: number): string {
    if (days === 0) return 'Today';
    if (days === 1) return 'Tomorrow';
    if (days > 1) return `in ${days} days`;
    if (days === -1) return 'Yesterday';
    return `${-days} days ago`;
  }

  /** 'Tue 18 Aug', with the year only when it is not this one. */
  private _dateText(ms: number): string {
    const target = new Date(ms);
    const sameYear = target.getFullYear() === new Date(this._now).getFullYear();
    return new Intl.DateTimeFormat(this._locale(), {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      ...(sameYear ? {} : { year: 'numeric' }),
    }).format(target);
  }

  private _onOpen(ev: Event, entityId: string): void {
    ev.stopPropagation();
    moreInfo(this, entityId);
  }

  private _renderRow(view: BinView): TemplateResult {
    const { cfg, days, dateMs, stateObj } = view;
    const when = days === null ? '—' : this._whenLabel(days);
    const date = dateMs === null ? '' : this._dateText(dateMs);
    return html`
      <button
        class="row ${days === null ? 'unknown' : ''}"
        title=${`${cfg.name} · ${when}`}
        aria-label=${`${cfg.name}: ${when}`}
        .disabled=${!stateObj}
        @click=${(ev: Event) => this._onOpen(ev, cfg.entity)}
      >
        <span
          class="dot"
          style=${cfg.color ? `background:${cfg.color}` : ''}
          aria-hidden="true"
        ></span>
        <span class="rname">${cfg.name}</span>
        <span class="rdate">${date || when}</span>
      </button>
    `;
  }

  protected render(): TemplateResult | typeof nothing {
    const config = this._config;
    const hass = this.hass;
    if (!config || !hass) return nothing;

    // Upcoming collections first (soonest wins the hero), then anything already
    // past with the most recent first, then bins that cannot say at all.
    const rank = (v: BinView): number => (v.days === null ? 2 : v.days >= 0 ? 0 : 1);
    const views = config.bins
      .map((bin) => this._view(bin))
      .sort((a, b) => {
        const ra = rank(a);
        const rb = rank(b);
        if (ra !== rb) return ra - rb;
        if (ra === 2) return 0;
        const da = a.days as number;
        const db = b.days as number;
        return ra === 0 ? da - db : db - da;
      });
    const hero = views.find((v) => v.days !== null);
    const rest = views.filter((v) => v !== hero);
    const heroDays = hero?.days ?? null;
    const accent = hero?.cfg.color ?? accentFor(hero?.stateObj);
    const soon = heroDays !== null && heroDays >= 0 && heroDays <= 1;

    return html`
      <ha-card
        class="control ${hero ? '' : 'static'}"
        style="--silk-accent:${accent}"
        @click=${hero ? (ev: Event) => this._onOpen(ev, hero.cfg.entity) : undefined}
      >
        ${config.name ? html`<div class="title" title=${config.name}>${config.name}</div>` : nothing}
        ${hero
          ? html`
              <div class="hero" title=${`${hero.cfg.name} · ${this._whenLabel(hero.days as number)}`}>
                <div class="hicon">
                  <ha-icon .icon=${hero.cfg.icon ?? DEFAULT_ICON}></ha-icon>
                </div>
                <div class="hinfo">
                  <div class="when">${this._whenLabel(hero.days as number)}</div>
                  <div class="sub">
                    <span class="bin">${hero.cfg.name}</span>
                    ${hero.dateMs !== null
                      ? html`<span class="sep">·</span
                          ><span class="hdate">${this._dateText(hero.dateMs)}</span>`
                      : nothing}
                  </div>
                </div>
              </div>
            `
          : html`<div class="note">No collection dates yet — check the bin sensors</div>`}
        ${soon
          ? html`
              <div class="banner">
                <ha-icon icon="mdi:alert-circle-outline"></ha-icon>
                <span>${heroDays === 0 ? 'Put it out now' : 'Put it out tonight'}</span>
              </div>
            `
          : nothing}
        ${rest.length
          ? html`<div class="rows">${rest.map((v) => this._renderRow(v))}</div>`
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
        justify-content: center;
        gap: 8px;
        height: auto;
        min-height: 100%;
      }
      /* Nothing to open: the card should not invite a tap. */
      ha-card.static {
        cursor: default;
      }
      .hero {
        flex: none;
        display: flex;
        align-items: center;
        gap: 12px;
        min-width: 0;
      }
      .hicon {
        flex: none;
        width: 44px;
        height: 44px;
        border-radius: 14px;
        display: grid;
        place-items: center;
        color: var(--silk-accent);
        background: color-mix(in srgb, var(--silk-accent) 20%, transparent);
        transition: background 200ms ease, color 200ms ease;
      }
      .hicon ha-icon {
        --mdc-icon-size: 24px;
        pointer-events: none;
      }
      .hinfo {
        flex: 1;
        min-width: 0;
      }
      .when {
        font-size: 20px;
        font-weight: 700;
        letter-spacing: -0.02em;
        line-height: 1.2;
        color: var(--primary-text-color);
        font-variant-numeric: tabular-nums;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .sub {
        display: flex;
        align-items: baseline;
        min-width: 0;
        font-size: 12.5px;
        line-height: 1.3;
        color: var(--secondary-text-color);
        white-space: nowrap;
        overflow: hidden;
      }
      .bin {
        min-width: 0;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .sub .sep {
        flex: none;
        opacity: 0.5;
        margin: 0 3px;
      }
      .hdate {
        flex: none;
        font-variant-numeric: tabular-nums;
      }
      .banner {
        flex: none;
        display: flex;
        align-items: center;
        gap: 7px;
        padding: 6px 10px;
        border-radius: 10px;
        font-size: 12.5px;
        font-weight: 600;
        color: var(--warning-color, #ffa600);
        background: color-mix(in srgb, var(--warning-color, #ffa600) 14%, transparent);
        animation: silk-trash-in 250ms var(--silk-ease-out);
      }
      .banner ha-icon {
        --mdc-icon-size: 17px;
        flex: none;
      }
      .banner span {
        min-width: 0;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .rows {
        display: flex;
        flex-direction: column;
        min-width: 0;
        margin: 0 -4px;
      }
      .row {
        display: flex;
        align-items: center;
        gap: 9px;
        width: 100%;
        min-height: 26px;
        margin: 0;
        padding: 2px 4px;
        border: none;
        border-radius: 8px;
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
      .row:disabled {
        cursor: default;
      }
      .row:disabled:hover {
        background: none;
      }
      .row:focus-visible {
        outline: 2px solid color-mix(in srgb, var(--silk-accent) 70%, transparent);
        outline-offset: -2px;
      }
      /* A bin that cannot say when recedes rather than inventing a day. */
      .row.unknown {
        opacity: 0.45;
      }
      .dot {
        flex: none;
        width: 7px;
        height: 7px;
        border-radius: 50%;
        background: rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.28);
      }
      .rname {
        flex: 1;
        min-width: 0;
        font-size: 12.5px;
        line-height: 1.3;
        color: var(--primary-text-color);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .rdate {
        flex: none;
        font-size: 11px;
        line-height: 1.3;
        color: var(--secondary-text-color);
        font-variant-numeric: tabular-nums;
        white-space: nowrap;
      }
      .title {
        font-size: 13px;
        font-weight: 500;
        color: var(--secondary-text-color);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .note {
        display: flex;
        align-items: center;
        min-height: 44px;
        font-size: 13px;
        line-height: 1.35;
        color: var(--secondary-text-color);
      }
      @keyframes silk-trash-in {
        from {
          opacity: 0;
        }
        to {
          opacity: 1;
        }
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    'silk-trash-card': SilkTrashCard;
  }
}
