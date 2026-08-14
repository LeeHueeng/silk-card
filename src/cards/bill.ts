import { LitElement, html, css, nothing, PropertyValues, TemplateResult } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { HomeAssistant, LovelaceCardConfig } from '../types';
import { silkControlStyles } from '../shared/base';
import { moreInfo, haptic } from '../shared/service';
import { accentFor } from '../shared/color';
import { registerEditor } from '../shared/editor';
import {
  EntityItem,
  entityIds,
  entityListSelector,
  hasItemDetail,
  normalizeEntityList,
} from '../shared/list';

export const META = {
  type: 'silk-bill-card',
  name: 'Silk Bill',
  description: 'What each device costs you this month.',
};

/** Window the card sums over. */
export type BillPeriod = 'month' | 'week' | 'today' | 'year';

/** One tracked device: a cumulative kWh sensor plus optional presentation. */
export interface BillDevice extends EntityItem {
  entity: string;
  name?: string;
  icon?: string;
}

export interface SilkBillCardConfig extends LovelaceCardConfig {
  /**
   * Devices to rank, in either shape: `['sensor.a']` (what the picker writes)
   * or `[{entity, name?, icon?}]` when you want per-row naming in YAML.
   */
  devices: (string | BillDevice)[];
  /** Summing window; the chips switch it locally without touching config. */
  period?: BillPeriod;
  /** Flat price per kWh, used by the 'flat' tariff. */
  rate?: number;
  /** 'flat' multiplies; 'kr-residential' applies 주택용 저압 누진 to the total. */
  tariff?: 'flat' | 'kr-residential';
  /** 기본요금 added on top of the bill. */
  base_fee?: number;
  /** 부가세 10% + 전력산업기반기금 3.7%. Defaults on for 'kr-residential'. */
  vat?: boolean;
  /** Currency suffix (or prefix for symbols like $). */
  currency?: string;
  name?: string;
  /** Whole-home kWh sensor; its remainder becomes the muted "기타" row. */
  unaccounted?: string;
  /** Accent override. */
  color?: string;
}

/**
 * Row from `recorder/statistics_during_period` — Silk's minimal HomeAssistant
 * type doesn't model recorder responses, so it is typed locally. A
 * `total_increasing` sensor carries its per-period delta in `change`.
 */
interface StatisticsRow {
  start: number | string;
  change?: number | null;
}

/**
 * `hass.connection` is absent from Silk's minimal HomeAssistant type. The WS
 * connection emits `ready` after every reconnect — our refetch trigger.
 */
interface HassWithConnection extends HomeAssistant {
  connection?: {
    addEventListener(type: string, listener: () => void): void;
    removeEventListener(type: string, listener: () => void): void;
  };
}

/** A resolved bar: `kwh` is null when the recorder has nothing to report. */
interface BillRow {
  entity: string;
  name: string;
  icon?: string;
  kwh: number | null;
  /** True for the muted remainder row, which carries no accent. */
  other: boolean;
}

const DEFAULT_NAME = '전기 요금';
const DEFAULT_PERIOD: BillPeriod = 'month';
const DEFAULT_RATE = 200;
const DEFAULT_CURRENCY = '원';
const DEFAULT_ICON = 'mdi:flash';

const PERIODS: { key: BillPeriod; label: string }[] = [
  { key: 'month', label: '이번 달' },
  { key: 'week', label: '이번 주' },
  { key: 'today', label: '오늘' },
  { key: 'year', label: '올해' },
];

/**
 * Approximate 2026 주택용 저압 (low-voltage residential) values. Korea's
 * tariff is revised periodically and 절기(여름/기타) splits exist — treat these
 * as a starting point and adjust them against your own 한전 bill.
 * `upTo` is the cumulative monthly kWh where the tier ends.
 */
const KR_TIERS: { upTo: number; rate: number; base: number }[] = [
  { upTo: 200, rate: 120, base: 910 },
  { upTo: 400, rate: 214.6, base: 1600 },
  { upTo: Infinity, rate: 307.3, base: 7300 },
];
/** 기후환경요금, charged on every kWh. */
const KR_CLIMATE_RATE = 9;
/** 부가가치세. */
const VAT_RATE = 0.1;
/** 전력산업기반기금. */
const FUND_RATE = 0.037;

/** Refetch cadence: statistics roll up hourly, ten minutes is plenty. */
const REFRESH_MS = 600_000;
/** A device reporting a new reading may refetch at most once a minute. */
const REFRESH_THROTTLE_MS = 60_000;
/** Rank fade: first bar full accent, last bar this opacity. */
const MIN_RANK_OPACITY = 0.45;
/** Remainders below this are rounding noise, not a "기타" row. */
const REMAINDER_EPSILON = 0.005;
/** Currencies that read as a prefix; everything else (원, kr, zł) suffixes. */
const SYMBOL_FIRST = /^[$€£¥₩]/;

const EDITOR_TAG = 'silk-bill-card-editor';
/** With the device picker — used when `devices` is a plain list of ids. */
const EDITOR_PICKER_TAG = 'silk-bill-card-editor-picker';
/** Scalars only — used when `devices` carries per-row name/icon detail. */
const EDITOR_PLAIN_TAG = 'silk-bill-card-editor-plain';

/** Everything except the device list; shared by both editor variants. */
const SCALAR_SCHEMA: object[] = [
  { name: 'name', selector: { text: {} } },
  {
    name: '',
    type: 'grid',
    schema: [
      {
        name: 'period',
        selector: {
          select: {
            mode: 'dropdown',
            options: PERIODS.map((p) => ({ value: p.key, label: p.label })),
          },
        },
      },
      {
        name: 'tariff',
        selector: {
          select: {
            mode: 'dropdown',
            options: [
              { value: 'flat', label: '단일 단가' },
              { value: 'kr-residential', label: '주택용 저압 (누진)' },
            ],
          },
        },
      },
    ],
  },
  {
    name: '',
    type: 'grid',
    schema: [
      { name: 'rate', selector: { number: { min: 0, step: 0.1, mode: 'box' } } },
      { name: 'base_fee', selector: { number: { min: 0, mode: 'box' } } },
    ],
  },
  { name: 'currency', selector: { text: {} } },
];

const EDITOR_LABELS: Record<string, string> = {
  devices: '전력량 센서',
  name: '이름',
  period: '기간',
  tariff: '요금제',
  rate: '단가(원/kWh)',
  base_fee: '기본요금',
  currency: '통화',
};

const EDITOR_DEFAULTS: Record<string, unknown> = {
  period: DEFAULT_PERIOD,
  tariff: 'flat',
  rate: DEFAULT_RATE,
  base_fee: 0,
  currency: DEFAULT_CURRENCY,
};

registerEditor(
  EDITOR_PICKER_TAG,
  [entityListSelector('devices', ['sensor'], ['energy']), ...SCALAR_SCHEMA],
  EDITOR_LABELS,
  EDITOR_DEFAULTS
);
// No `devices` field at all: a multi-entity picker cannot carry per-row name
// and icon, and ha-form only ever writes back the fields it was given — so
// leaving it out is what keeps a hand-written list intact.
registerEditor(EDITOR_PLAIN_TAG, SCALAR_SCHEMA, EDITOR_LABELS, EDITOR_DEFAULTS);

/** The inner editors registered above, as far as the wrapper cares. */
interface InnerEditor extends HTMLElement {
  hass?: HomeAssistant;
  setConfig(config: LovelaceCardConfig): void;
}

/**
 * Hands the config to whichever editor can express it: the picker form for a
 * plain list of sensor ids, the scalars-only form when the list carries
 * per-row detail. `config-changed` bubbles up through the light DOM untouched.
 */
class SilkBillCardEditor extends HTMLElement {
  private _hass?: HomeAssistant;
  private _inner?: InnerEditor;

  public set hass(hass: HomeAssistant | undefined) {
    this._hass = hass;
    if (this._inner) this._inner.hass = hass;
  }

  public get hass(): HomeAssistant | undefined {
    return this._hass;
  }

  public setConfig(config: SilkBillCardConfig): void {
    const tag = hasItemDetail(config?.devices) ? EDITOR_PLAIN_TAG : EDITOR_PICKER_TAG;
    if (this._inner?.localName !== tag) {
      this._inner = document.createElement(tag) as InnerEditor;
      this.replaceChildren(this._inner);
    }
    if (this._hass) this._inner.hass = this._hass;
    this._inner.setConfig(config);
  }
}

if (!customElements.get(EDITOR_TAG)) customElements.define(EDITOR_TAG, SilkBillCardEditor);

/** Local midnight the window opens at — DST-proof calendar arithmetic. */
function windowStart(period: BillPeriod, now: Date): Date {
  const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  switch (period) {
    case 'today':
      return midnight;
    case 'week': {
      // Monday-first: Sunday (0) is six days into the week, not zero.
      const back = (midnight.getDay() + 6) % 7;
      midnight.setDate(midnight.getDate() - back);
      return midnight;
    }
    case 'year':
      return new Date(now.getFullYear(), 0, 1);
    case 'month':
    default:
      return new Date(now.getFullYear(), now.getMonth(), 1);
  }
}

/**
 * What each plug actually cost: consumption over the window from long-term
 * statistics, ranked, with the household total priced through a tariff. The
 * bill is an estimate and the card says so, out loud, under the total.
 */
@customElement('silk-bill-card')
export class SilkBillCard extends LitElement {
  @property({ attribute: false }) public hass?: HomeAssistant;

  @state() private _config?: SilkBillCardConfig;
  /** Live period — chips move it without writing config. */
  @state() private _period: BillPeriod = DEFAULT_PERIOD;
  /** kWh per statistic id; null means the recorder had nothing for it. */
  @state() private _kwh: Record<string, number | null> | null = null;
  /** False for the first paint so the bars grow in from zero on mount. */
  @state() private _drawn = false;

  private _fetchStarted = false;
  private _fetchSeq = 0;
  private _timer?: number;
  private _refreshTimer?: number;
  private _lastFetch = 0;
  private _lastStamp = '';
  private _connection?: HassWithConnection['connection'];
  private readonly _onWsReady = (): void => {
    this._refresh();
  };

  public static getStubConfig(hass: HomeAssistant): Partial<SilkBillCardConfig> {
    const ids = Object.keys(hass.states).filter((id) => {
      const attrs = hass.states[id].attributes;
      return (
        id.startsWith('sensor.') &&
        attrs.device_class === 'energy' &&
        String(attrs.unit_of_measurement ?? '').toLowerCase() === 'kwh' &&
        Number.isFinite(Number(hass.states[id].state))
      );
    });
    const totals = ids.filter(
      (id) => hass.states[id].attributes.state_class === 'total_increasing'
    );
    return {
      type: 'custom:silk-bill-card',
      // The simple shape, the one the picker also writes.
      devices: (totals.length ? totals : ids).slice(0, 4),
    };
  }

  public static async getConfigElement(): Promise<HTMLElement> {
    return document.createElement(EDITOR_TAG);
  }

  public setConfig(config: SilkBillCardConfig): void {
    if (!Array.isArray(config.devices) || config.devices.length === 0) {
      throw new Error(
        'silk-bill-card: `devices` must be a non-empty list of sensor ids or {entity, name?, icon?}'
      );
    }
    for (const device of config.devices) {
      const entity = typeof device === 'string' ? device : device?.entity;
      if (typeof entity !== 'string' || !entity.includes('.')) {
        throw new Error('silk-bill-card: every device needs an `entity` (a kWh sensor)');
      }
    }
    if (config.period !== undefined && !PERIODS.some((p) => p.key === config.period)) {
      throw new Error("silk-bill-card: `period` must be 'month', 'week', 'today' or 'year'");
    }
    if (config.tariff !== undefined && config.tariff !== 'flat' && config.tariff !== 'kr-residential') {
      throw new Error("silk-bill-card: `tariff` must be 'flat' or 'kr-residential'");
    }
    if (config.rate !== undefined && !Number.isFinite(Number(config.rate))) {
      throw new Error('silk-bill-card: `rate` must be a number');
    }
    if (config.base_fee !== undefined && !Number.isFinite(Number(config.base_fee))) {
      throw new Error('silk-bill-card: `base_fee` must be a number');
    }
    if (config.unaccounted !== undefined && typeof config.unaccounted !== 'string') {
      throw new Error('silk-bill-card: `unaccounted` must be a single entity id');
    }
    this._config = config;
    this._period = config.period ?? DEFAULT_PERIOD;
    this._kwh = null;
    this._fetchStarted = false;
  }

  public getCardSize(): number {
    const devices = this._config?.devices.length ?? 1;
    return 2 + Math.ceil(Math.min(devices + 1, 12) / 2);
  }

  public getGridOptions(): Record<string, number> {
    return { columns: 6, rows: 3, min_columns: 4, min_rows: 2 };
  }

  public connectedCallback(): void {
    super.connectedCallback();
    this._timer = window.setInterval(() => this._refresh(), REFRESH_MS);
    // On a DOM re-attach willUpdate won't re-run the first fetch: do it here.
    if (this.hasUpdated && this._fetchStarted) this._refresh();
  }

  public disconnectedCallback(): void {
    super.disconnectedCallback();
    window.clearInterval(this._timer);
    window.clearTimeout(this._refreshTimer);
    this._timer = undefined;
    this._refreshTimer = undefined;
    this._connection?.removeEventListener?.('ready', this._onWsReady);
    this._connection = undefined;
  }

  protected willUpdate(changed: PropertyValues): void {
    if (!this.hass || !this._config) return;
    if (!this._connection) {
      const conn = (this.hass as HassWithConnection).connection;
      if (typeof conn?.addEventListener === 'function') {
        conn.addEventListener('ready', this._onWsReady);
        this._connection = conn;
      }
    }
    if (!this._fetchStarted) {
      this._fetchStarted = true;
      this._refresh();
      return;
    }
    if (changed.has('hass')) this._onStatesChanged();
  }

  protected firstUpdated(): void {
    // Commit one frame at zero width so the 400ms bar transition sweeps in.
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        this._drawn = true;
      });
    });
  }

  /** Both config shapes as objects — ids alone, or ids with name/icon. */
  private _devices(): BillDevice[] {
    return normalizeEntityList(this._config?.devices) as BillDevice[];
  }

  /** Every statistic the card needs, deduped — one WS call covers them all. */
  private _ids(): string[] {
    const config = this._config!;
    const ids = entityIds(config.devices);
    if (config.unaccounted) ids.push(config.unaccounted);
    return [...new Set(ids)];
  }

  /** A tracked entity recording a new reading refetches, throttled to 60s. */
  private _onStatesChanged(): void {
    const hass = this.hass!;
    const stamp = this._ids()
      .map((id) => hass.states[id]?.last_updated ?? '')
      .join('|');
    if (stamp === this._lastStamp) return;
    this._lastStamp = stamp;
    if (this._refreshTimer) return;
    const wait = Math.max(0, REFRESH_THROTTLE_MS - (Date.now() - this._lastFetch));
    this._refreshTimer = window.setTimeout(() => {
      this._refreshTimer = undefined;
      this._refresh();
    }, wait);
  }

  private async _refresh(): Promise<void> {
    const hass = this.hass;
    const config = this._config;
    if (!hass || !config) return;
    const ids = this._ids();
    const seq = ++this._fetchSeq;
    const now = new Date();
    const start = windowStart(this._period, now);
    let resp: Record<string, StatisticsRow[]>;
    try {
      resp = await hass.callWS<Record<string, StatisticsRow[]>>({
        type: 'recorder/statistics_during_period',
        start_time: start.toISOString(),
        end_time: now.toISOString(),
        statistic_ids: ids,
        period: 'day',
        types: ['change'],
      });
    } catch (err) {
      console.warn('silk-bill-card: statistics fetch failed', err);
      return;
    }
    if (seq !== this._fetchSeq) return; // a newer fetch superseded this one
    this._lastFetch = Date.now();
    const from = start.getTime();
    const to = now.getTime();
    const kwh: Record<string, number | null> = {};
    for (const id of ids) {
      const rows = resp?.[id] ?? [];
      let sum = 0;
      let seen = false;
      for (const row of rows) {
        const t = typeof row.start === 'number' ? row.start : Date.parse(row.start);
        if (!Number.isFinite(t) || t < from || t >= to) continue;
        if (typeof row.change !== 'number' || !Number.isFinite(row.change)) continue;
        // A meter reset can hand back a negative delta; it is not consumption.
        sum += Math.max(row.change, 0);
        seen = true;
      }
      // No statistics at all means "—", never a confident zero.
      kwh[id] = seen ? sum : null;
    }
    this._kwh = kwh;
  }

  private _tariff(): 'flat' | 'kr-residential' {
    return this._config?.tariff === 'kr-residential' ? 'kr-residential' : 'flat';
  }

  private _rate(): number {
    const rate = Number(this._config?.rate);
    return Number.isFinite(rate) ? rate : DEFAULT_RATE;
  }

  private _vat(): boolean {
    const config = this._config;
    if (typeof config?.vat === 'boolean') return config.vat;
    return this._tariff() === 'kr-residential';
  }

  private _currency(): string {
    return this._config?.currency ?? DEFAULT_CURRENCY;
  }

  /**
   * The household bill for `kwh`. 누진제 is charged on the whole house, so this
   * is the only place tiers are ever applied — per-device numbers are shares
   * of this figure, never a tier lookup of their own.
   */
  private _bill(kwh: number): number {
    const extraBase = Number(this._config?.base_fee) || 0;
    if (this._tariff() === 'kr-residential') {
      let energy = 0;
      let lower = 0;
      let base = KR_TIERS[0].base;
      for (const tier of KR_TIERS) {
        const span = Math.min(kwh, tier.upTo) - lower;
        if (span > 0) {
          energy += span * tier.rate;
          base = tier.base; // 기본요금 follows the highest tier reached
        }
        lower = tier.upTo;
      }
      const subtotal = energy + kwh * KR_CLIMATE_RATE + base + extraBase;
      const withLevies = this._vat() ? subtotal * (1 + VAT_RATE + FUND_RATE) : subtotal;
      // 한전 bills in whole 원 — round once, at the very end.
      return Math.round(withLevies);
    }
    const subtotal = kwh * this._rate() + extraBase;
    // A flat rate may be priced in a currency that has cents; let the
    // formatter decide the digits instead of rounding money away here.
    return this._vat() ? subtotal * (1 + VAT_RATE + FUND_RATE) : subtotal;
  }

  /**
   * What one row costs. Under a flat rate a device's cost really is its own
   * kWh times the rate — the 기본요금 and levies are household charges and stay
   * in the total. Under 누진 the marginal rate depends on the whole house, so
   * the only defensible per-device number is a share of the household bill.
   */
  private _rowCost(kwh: number, total: number, bill: number): number {
    if (this._tariff() === 'flat') return kwh * this._rate();
    return total > 0 ? (bill * kwh) / total : 0;
  }

  private _locale(): string {
    return this.hass?.locale?.language ?? this.hass?.language ?? 'ko';
  }

  private _kwhText(kwh: number): string {
    const digits = kwh >= 1000 ? 0 : 1;
    return new Intl.NumberFormat(this._locale(), {
      minimumFractionDigits: digits,
      maximumFractionDigits: digits,
    }).format(kwh);
  }

  /** Money with its currency; won never wants decimals, small units might. */
  private _money(value: number): string {
    const currency = this._currency();
    const num = new Intl.NumberFormat(this._locale(), {
      maximumFractionDigits: Math.abs(value) >= 100 ? 0 : 2,
    }).format(value);
    return SYMBOL_FIRST.test(currency) ? `${currency}${num}` : `${num}${currency}`;
  }

  /** Rows sorted by consumption (unreadable ones sink), plus "기타". */
  private _rows(): BillRow[] {
    const config = this._config!;
    const kwh = this._kwh;
    const rows: BillRow[] = this._devices().map((device) => ({
      entity: device.entity,
      name:
        device.name ??
        (this.hass?.states[device.entity]?.attributes.friendly_name as string | undefined) ??
        device.entity,
      icon: device.icon,
      kwh: kwh ? kwh[device.entity] ?? null : null,
      other: false,
    }));
    rows.sort((a, b) => {
      if (a.kwh === null && b.kwh === null) return a.name.localeCompare(b.name);
      if (a.kwh === null) return 1;
      if (b.kwh === null) return -1;
      return b.kwh - a.kwh || a.name.localeCompare(b.name);
    });

    const house = config.unaccounted && kwh ? kwh[config.unaccounted] ?? null : null;
    if (config.unaccounted && house !== null) {
      const measured = rows.reduce((sum, row) => sum + (row.kwh ?? 0), 0);
      const remainder = house - measured;
      // A negative remainder means the plugs out-measure the house meter — an
      // honest card says nothing rather than inventing a row.
      if (remainder > REMAINDER_EPSILON) {
        rows.push({
          entity: config.unaccounted,
          name: '기타',
          kwh: remainder,
          other: true,
        });
      }
    }
    return rows;
  }

  private _onCardClick(): void {
    const config = this._config;
    if (!config) return;
    const target = config.unaccounted ?? this._devices()[0]?.entity;
    if (target) moreInfo(this, target);
  }

  private _onRowClick(ev: Event, entityId: string): void {
    ev.stopPropagation();
    haptic(this);
    moreInfo(this, entityId);
  }

  private _onPeriodClick(ev: Event, period: BillPeriod): void {
    ev.stopPropagation();
    if (period === this._period) return;
    haptic(this, 'selection');
    this._period = period;
    this._kwh = null; // never show last window's numbers under a new label
    this._refresh();
  }

  private _renderRow(
    row: BillRow,
    rank: number,
    ranked: number,
    max: number,
    total: number,
    bill: number
  ): TemplateResult {
    const kwh = row.kwh;
    const width =
      kwh !== null && max > 0 ? Math.max((kwh / max) * 100, kwh > 0 ? 1.5 : 0) : 0;
    // One hue, opacity by rank: position in the ranking is the only encoding.
    const opacity = row.other
      ? 1
      : 1 - (1 - MIN_RANK_OPACITY) * (ranked > 1 ? rank / (ranked - 1) : 0);
    const kwhText = kwh !== null ? this._kwhText(kwh) : '—';
    const costText = kwh !== null ? this._money(this._rowCost(kwh, total, bill)) : '—';
    const share = kwh !== null && total > 0 ? ` · ${Math.round((kwh / total) * 100)}%` : '';
    const title = `${row.name} · ${kwhText} kWh${share} · ${costText}`;

    // Before the first response every row is "—"; that is waiting, not broken,
    // so the dimmed treatment is held back until a fetch has actually landed.
    const unreadable = kwh === null && this._kwh !== null;

    return html`
      <button
        class="row ${unreadable ? 'unreadable' : ''}"
        title=${title}
        aria-label=${title}
        @click=${(ev: Event) => this._onRowClick(ev, row.entity)}
      >
        <span class="rowicon"
          >${row.icon ? html`<ha-icon .icon=${row.icon}></ha-icon>` : nothing}</span
        >
        <span class="rname">${row.name}</span>
        <span class="track">
          <span
            class="fill ${row.other ? 'other' : ''}"
            style="width:${this._drawn ? width : 0}%;opacity:${opacity}"
          ></span>
        </span>
        <span class="amt">
          <span class="kwh">${kwhText}<span class="u">kWh</span></span>
          <span class="won">${costText}</span>
        </span>
      </button>
    `;
  }

  protected render(): TemplateResult | typeof nothing {
    const config = this._config;
    const hass = this.hass;
    if (!config || !hass) return nothing;

    const devices = this._devices();
    const missing = devices.every((d) => !hass.states[d.entity]);
    if (missing && !(config.unaccounted && hass.states[config.unaccounted])) {
      return html`<ha-card>
        <div class="warning">Entity not found: ${devices[0]?.entity ?? '—'}</div>
      </ha-card>`;
    }

    const rows = this._rows();
    const values = rows.map((r) => r.kwh).filter((v): v is number => v !== null);
    const max = values.length ? Math.max(...values) : 0;
    const total = values.reduce((sum, v) => sum + v, 0);
    const bill = this._bill(total);
    const unavailable = this._kwh !== null && values.length === 0;
    const ranked = rows.filter((r) => !r.other).length;
    const first = devices[0]?.entity;
    const accent = accentFor(first ? hass.states[first] : undefined, config.color);
    const caption =
      this._tariff() === 'kr-residential'
        ? '추정 · 주택용 저압 누진'
        : `추정 · ${this._money(this._rate())}/kWh`;

    return html`
      <ha-card
        class="control ${unavailable ? 'unavailable' : ''}"
        style="--silk-accent:${accent}"
        @click=${this._onCardClick}
      >
        <div class="header">
          <div class="icon">
            <ha-icon .icon=${config.icon ?? DEFAULT_ICON}></ha-icon>
          </div>
          <div class="info">
            <div class="name">${config.name ?? DEFAULT_NAME}</div>
          </div>
          <div class="chips">
            ${PERIODS.map(
              (p) => html`<button
                class="chip ${p.key === this._period ? 'active' : ''}"
                aria-pressed=${p.key === this._period}
                @click=${(ev: Event) => this._onPeriodClick(ev, p.key)}
              >
                ${p.label}
              </button>`
            )}
          </div>
        </div>
        <div class="rows">
          ${rows.map((row, i) =>
            this._renderRow(row, row.other ? ranked : i, ranked, max, total, bill)
          )}
        </div>
        <div class="total">
          <span class="tlabel">합계</span>
          <span class="tkwh"
            >${values.length ? this._kwhText(total) : '—'}<span class="u">kWh</span></span
          >
          <div class="tright">
            <div class="tbill">${values.length ? this._money(bill) : '—'}</div>
            <div class="caption">${caption}</div>
          </div>
        </div>
      </ha-card>
    `;
  }

  static styles = [
    silkControlStyles,
    css`
      /* The header icon is decoration; on a narrow card the name and the
         period chips are the content, so the icon yields to them. */
      :host {
        container-type: inline-size;
      }
      @container (max-width: 359px) {
        .header .icon {
          display: none;
        }
      }
      ha-card {
        flex-direction: column;
        align-items: stretch;
        justify-content: flex-start;
        gap: 8px;
        padding: 12px 14px;
      }
      .header {
        flex: none;
        display: flex;
        align-items: center;
        gap: 10px;
        min-width: 0;
      }
      /* Fallback where container queries are unavailable: the name keeps a
         readable minimum and the chip row gives ground first. */
      .info {
        flex: 1 1 auto;
        min-width: 56px;
      }
      /* Data card: the icon presses with the card, it is not a control. */
      .icon {
        cursor: pointer;
      }
      .icon:active {
        transform: none;
      }
      .chips {
        flex: 0 1 auto;
        min-width: 0;
        display: flex;
        gap: 4px;
        overflow: hidden;
      }
      .chip {
        flex: none;
      }
      /* 2px of card surface between adjacent fills, never a hairline border. */
      .rows {
        flex: 1 1 auto;
        min-height: 0;
        display: flex;
        flex-direction: column;
        justify-content: flex-start;
        gap: 2px;
        margin: 0 -6px;
        /* Four plugs fit; a long list scrolls rather than shoving the total
           row — the total is the answer and stays pinned. */
        overflow-y: auto;
        scrollbar-width: thin;
      }
      /* Rows share the height the card actually has: comfortable for four
         devices, tighter for eight, never clipped at the bottom. */
      .row {
        display: flex;
        align-items: center;
        gap: 8px;
        width: 100%;
        flex: 1 1 auto;
        min-height: 26px;
        max-height: 38px;
        margin: 0;
        padding: 2px 6px;
        border: none;
        border-radius: 8px;
        background: none;
        font: inherit;
        color: inherit;
        text-align: left;
        cursor: pointer;
        outline: none;
        transition: background 150ms ease-out;
      }
      .row:hover {
        background: rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.05);
      }
      .row:focus-visible {
        box-shadow: inset 0 0 0 2px color-mix(in srgb, var(--silk-accent) 70%, transparent);
      }
      .row.unreadable {
        opacity: 0.45;
      }
      .rowicon {
        flex: none;
        display: grid;
        place-items: center;
        width: 20px;
        height: 20px;
        --mdc-icon-size: 20px;
        color: var(--secondary-text-color);
      }
      .rname {
        flex: 1 1 34%;
        min-width: 0;
        font-size: 13px;
        font-weight: 500;
        line-height: 1.3;
        color: var(--primary-text-color);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .track {
        flex: 1 1 28%;
        min-width: 28px;
        height: 8px;
        border-radius: 4px;
        background: rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.06);
        overflow: hidden;
      }
      .fill {
        display: block;
        height: 100%;
        width: 0;
        border-radius: 4px;
        background: var(--silk-accent);
        transition: width 400ms var(--silk-ease-out);
      }
      /* The remainder is not a device: it stays out of the accent entirely. */
      .fill.other {
        background: rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.18);
      }
      .amt {
        flex: none;
        display: flex;
        flex-direction: column;
        align-items: flex-end;
        min-width: 72px;
        line-height: 1.25;
        font-variant-numeric: tabular-nums;
      }
      .kwh {
        font-size: 12.5px;
        font-weight: 600;
        color: var(--primary-text-color);
      }
      .won {
        font-size: 12px;
        color: var(--secondary-text-color);
      }
      .u {
        margin-left: 3px;
        font-size: 10px;
        font-weight: 500;
        color: var(--secondary-text-color);
      }
      /* The one rule on the card: everything above is devices, this is the house. */
      .total {
        flex: none;
        display: flex;
        align-items: flex-end;
        gap: 6px;
        padding-top: 8px;
        border-top: 1px solid
          var(--divider-color, rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.14));
      }
      .tlabel {
        font-size: 13px;
        font-weight: 500;
        color: var(--secondary-text-color);
        line-height: 1.3;
      }
      .tkwh {
        flex: 1;
        min-width: 0;
        font-size: 13px;
        font-weight: 600;
        color: var(--primary-text-color);
        font-variant-numeric: tabular-nums;
        line-height: 1.3;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .tright {
        flex: none;
        text-align: right;
        min-width: 0;
      }
      .tbill {
        font-size: 17px;
        font-weight: 600;
        letter-spacing: -0.01em;
        line-height: 1.15;
        color: var(--primary-text-color);
        font-variant-numeric: tabular-nums;
        white-space: nowrap;
      }
      .caption {
        font-size: 10px;
        line-height: 1.3;
        color: var(--primary-text-color);
        opacity: 0.45;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .unavailable .rows,
      .unavailable .total {
        opacity: 0.45;
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    'silk-bill-card': SilkBillCard;
  }
}
