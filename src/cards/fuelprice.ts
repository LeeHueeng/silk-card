import { LitElement, html, css, nothing, TemplateResult } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { HomeAssistant, HassEntity, LovelaceCardConfig } from '../types';
import { silkControlStyles } from '../shared/base';
import { isUnavailable, moreInfo } from '../shared/service';
import { accentFor } from '../shared/color';
import { registerEditor } from '../shared/editor';

export const META = {
  type: 'silk-fuel-card',
  name: 'Silk Fuel',
  description: 'Cheapest tank nearby.',
};

/** One station: a price sensor plus the labels that make it recognisable. */
export interface FuelStationConfig {
  /** Price sensor — the one required key. */
  entity: string;
  /** Station name; defaults to the sensor's friendly name. */
  name?: string;
  /** Brand, used for the badge letter (defaults to the station name). */
  brand?: string;
  /** Distance sensor id, or a literal string like `1.2 km`. */
  distance?: string;
}

export interface SilkFuelCardConfig extends LovelaceCardConfig {
  /** Stations, given as `{entity, …}` objects or bare price entity ids. */
  stations: (string | FuelStationConfig)[];
  /** Header label, defaults to "Fuel". */
  name?: string;
  /** Currency shown after each price; defaults to the sensor's own unit. */
  currency?: string;
  /** Volume unit appended to the currency (`L` → `€/L`). */
  unit?: string;
  /** Accent override (YAML only). */
  color?: string;
}

/**
 * Row from `recorder/statistics_during_period` — Silk's minimal HomeAssistant
 * type does not model recorder responses, so it is declared locally.
 */
interface StatisticsRow {
  start: number | string;
  mean?: number | null;
}

/** A resolved station, ready to rank and render. */
interface StationRow {
  entity: string;
  stateObj?: HassEntity;
  name: string;
  /** Badge letter — brand initial, else the station's. */
  initial: string;
  /** Price, or null when the sensor is missing/unavailable/non-numeric. */
  price: number | null;
  /** Formatted distance, or null when none was configured. */
  distance: string | null;
  /** Numeric distance for tie-breaking equal prices. */
  distanceValue: number;
}

const DEFAULT_NAME = 'Fuel';
const DEFAULT_DISTANCE_UNIT = 'km';
/** Daily means update hourly; refetch 90s after each hour boundary. */
const HOURLY_SLACK_MS = 90_000;
/** Looks like `sensor.foo` — anything else in `distance` is literal text. */
const ENTITY_ID_RE = /^[a-z_]+\.[a-z0-9_]+$/;

const EDITOR_TAG = 'silk-fuel-card-editor';

// `stations` stays YAML-only: it is a list of objects (entity + labels) that no
// ha-form selector expresses. ha-form passes untouched keys straight through,
// so editing the header here never disturbs the station list.
registerEditor(
  EDITOR_TAG,
  [
    { name: 'name', selector: { text: {} } },
    {
      name: '',
      type: 'grid',
      schema: [
        { name: 'currency', selector: { text: {} } },
        { name: 'unit', selector: { text: {} } },
      ],
    },
  ],
  {
    name: 'Name',
    currency: 'Currency (e.g. €)',
    unit: 'Volume unit (e.g. L)',
  }
);

/** First letter that can carry a badge; falls back to a bullet. */
function initialOf(label: string): string {
  const match = /[\p{L}\p{N}]/u.exec(label);
  return match ? match[0].toUpperCase() : '•';
}

/**
 * Fuel prices for the stations you actually drive past, cheapest first. The
 * winner takes the accent surface so the answer is readable at arm's length;
 * every other row says how far off the day's average it sits.
 */
@customElement('silk-fuel-card')
export class SilkFuelCard extends LitElement {
  @property({ attribute: false }) public hass?: HomeAssistant;

  @state() private _config?: SilkFuelCardConfig;

  /** Mean of today's per-station daily means; null until the recorder answers. */
  @state() private _dayAvg: number | null = null;

  private _stations: FuelStationConfig[] = [];
  private _fetchStarted = false;
  private _fetchSeq = 0;
  private _hourlyTimer?: number;

  public static getStubConfig(hass: HomeAssistant): Partial<SilkFuelCardConfig> {
    const ids = Object.keys(hass.states).filter(
      (id) =>
        id.startsWith('sensor.') &&
        /fuel|petrol|gasoline|diesel|e5|e10|benzin/i.test(id) &&
        Number.isFinite(Number(hass.states[id].state))
    );
    return { type: 'custom:silk-fuel-card', stations: ids.slice(0, 4) };
  }

  public static async getConfigElement(): Promise<HTMLElement> {
    return document.createElement(EDITOR_TAG);
  }

  public setConfig(config: SilkFuelCardConfig): void {
    if (!Array.isArray(config.stations) || config.stations.length === 0) {
      throw new Error(
        'silk-fuel-card: `stations` must list at least one price sensor (entity id or {entity, name, brand, distance})'
      );
    }
    const stations = config.stations.map((raw, i) => {
      const station: FuelStationConfig =
        typeof raw === 'string' ? { entity: raw } : { ...(raw as FuelStationConfig) };
      if (typeof station.entity !== 'string' || station.entity === '') {
        throw new Error(`silk-fuel-card: station ${i + 1} needs an \`entity\` (its price sensor)`);
      }
      return station;
    });
    this._stations = stations;
    this._config = config;
    this._dayAvg = null;
    this._fetchStarted = false;
  }

  public getCardSize(): number {
    return 3;
  }

  public getGridOptions(): Record<string, number> {
    return { columns: 6, rows: 3, min_columns: 4, min_rows: 2 };
  }

  public connectedCallback(): void {
    super.connectedCallback();
    this._scheduleHourly();
    if (this.hasUpdated && this._fetchStarted) this._refresh();
  }

  public disconnectedCallback(): void {
    super.disconnectedCallback();
    window.clearTimeout(this._hourlyTimer);
    this._hourlyTimer = undefined;
  }

  protected willUpdate(): void {
    if (!this.hass || !this._config || this._fetchStarted) return;
    this._fetchStarted = true;
    this._refresh();
  }

  /** Daily means roll over on the hour; wake just after each boundary. */
  private _scheduleHourly(): void {
    window.clearTimeout(this._hourlyTimer);
    const now = Date.now();
    const next = (Math.floor(now / 3_600_000) + 1) * 3_600_000 + HOURLY_SLACK_MS;
    this._hourlyTimer = window.setTimeout(() => {
      this._refresh();
      this._scheduleHourly();
    }, next - now);
  }

  /**
   * Today's average price across the tracked stations, from long-term
   * statistics. A station without recorded stats simply does not vote; when
   * none of them do, `_dayAvg` stays null and the header falls back to the
   * live cross-station average.
   */
  private async _refresh(): Promise<void> {
    const hass = this.hass;
    if (!hass || !this._stations.length) return;
    const ids = this._stations.map((s) => s.entity);
    const seq = ++this._fetchSeq;
    const now = new Date();
    const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    let resp: Record<string, StatisticsRow[]>;
    try {
      resp = await hass.callWS<Record<string, StatisticsRow[]>>({
        type: 'recorder/statistics_during_period',
        start_time: midnight.toISOString(),
        end_time: now.toISOString(),
        statistic_ids: ids,
        period: 'day',
        types: ['mean'],
      });
    } catch (err) {
      console.warn('silk-fuel-card: statistics fetch failed', err);
      if (seq === this._fetchSeq) this._dayAvg = null;
      return;
    }
    if (seq !== this._fetchSeq) return; // a newer fetch superseded this one
    const means: number[] = [];
    for (const id of ids) {
      for (const row of resp?.[id] ?? []) {
        if (typeof row.mean === 'number' && Number.isFinite(row.mean)) means.push(row.mean);
      }
    }
    this._dayAvg = means.length
      ? means.reduce((sum, v) => sum + v, 0) / means.length
      : null;
  }

  private _locale(): string {
    return this.hass?.locale?.language ?? this.hass?.language ?? 'en';
  }

  /**
   * One precision for every number on the card, chosen from the largest price
   * on screen — fuel lives in the third decimal, but a ¥/₩ price does not.
   */
  private _digits(reference: number): number {
    const declared = this.hass?.entities?.[this._stations[0]?.entity ?? '']?.display_precision;
    if (declared !== undefined) return declared;
    const abs = Math.abs(reference);
    return abs >= 100 ? 0 : abs >= 10 ? 2 : 3;
  }

  private _price(value: number, digits: number): string {
    return new Intl.NumberFormat(this._locale(), {
      minimumFractionDigits: digits,
      maximumFractionDigits: digits,
    }).format(value);
  }

  /** `€/L` — the configured currency, or the sensor's own unit. */
  private _suffix(sample?: HassEntity): string {
    const config = this._config!;
    const currency =
      config.currency ?? (sample?.attributes.unit_of_measurement as string | undefined) ?? '';
    const unit = config.unit ?? '';
    if (!currency) return unit ? `/${unit}` : '';
    return unit && !currency.includes('/') ? `${currency}/${unit}` : currency;
  }

  /** Distance from a sensor, or the literal string the user typed. */
  private _distance(raw?: string): { text: string | null; value: number } {
    if (!raw) return { text: null, value: Number.POSITIVE_INFINITY };
    const hass = this.hass;
    if (!ENTITY_ID_RE.test(raw)) return { text: raw, value: Number.POSITIVE_INFINITY };
    const stateObj = hass?.states[raw];
    if (!stateObj || isUnavailable(stateObj) || stateObj.state === '') {
      return { text: null, value: Number.POSITIVE_INFINITY };
    }
    const value = Number(stateObj.state);
    if (!Number.isFinite(value)) {
      return { text: stateObj.state, value: Number.POSITIVE_INFINITY };
    }
    const unit =
      (stateObj.attributes.unit_of_measurement as string | undefined) ?? DEFAULT_DISTANCE_UNIT;
    const text = new Intl.NumberFormat(this._locale(), {
      maximumFractionDigits: value >= 100 ? 0 : 1,
    }).format(value);
    return { text: `${text} ${unit}`, value };
  }

  /** Stations ranked ascending by price; the unpriced sink to the bottom. */
  private _rows(): StationRow[] {
    const hass = this.hass;
    const rows: StationRow[] = this._stations.map((station) => {
      const stateObj = hass?.states[station.entity];
      const numeric = Number(stateObj?.state);
      const price =
        stateObj && !isUnavailable(stateObj) && stateObj.state !== '' && Number.isFinite(numeric)
          ? numeric
          : null;
      const name =
        station.name ??
        (stateObj?.attributes.friendly_name as string | undefined) ??
        station.entity;
      const distance = this._distance(station.distance);
      return {
        entity: station.entity,
        stateObj,
        name,
        initial: initialOf(station.brand ?? name),
        price,
        distance: distance.text,
        distanceValue: distance.value,
      };
    });
    rows.sort((a, b) => {
      if (a.price === null && b.price === null) return a.name.localeCompare(b.name);
      if (a.price === null) return 1;
      if (b.price === null) return -1;
      return (
        a.price - b.price || a.distanceValue - b.distanceValue || a.name.localeCompare(b.name)
      );
    });
    return rows;
  }

  private _onRowClick(entityId: string): void {
    moreInfo(this, entityId);
  }

  private _renderRow(
    row: StationRow,
    best: boolean,
    avg: number | null,
    digits: number,
    suffix: string
  ): TemplateResult {
    const priceText = row.price === null ? '—' : this._price(row.price, digits);
    const delta = row.price !== null && avg !== null ? row.price - avg : null;
    // Only a delta that survives rounding is worth a chip — otherwise the row
    // would claim a difference the printed numbers do not show.
    const step = Math.pow(10, -digits) / 2;
    const showDelta = delta !== null && Math.abs(delta) >= step;
    const deltaText = showDelta
      ? `${(delta as number) < 0 ? '↓' : '↑'} ${this._price(Math.abs(delta as number), digits)}`
      : '';
    const title = showDelta
      ? `${row.name} · ${priceText}${suffix} · ${this._price(Math.abs(delta as number), digits)} ${
          (delta as number) < 0 ? 'below' : 'above'
        } the day's average`
      : `${row.name} · ${priceText}${suffix}`;

    return html`
      <button
        class="row ${best ? 'best' : ''} ${row.price === null ? 'stale' : ''}"
        title=${title}
        aria-label=${title}
        @click=${() => this._onRowClick(row.entity)}
      >
        <span class="badge">${row.initial}</span>
        <span class="rinfo">
          <span class="rname">${row.name}</span>
          <span class="rsub">
            ${row.distance ? html`<span class="dist">${row.distance}</span>` : nothing}
            ${best && row.price !== null ? html`<span class="tag">Cheapest</span>` : nothing}
          </span>
        </span>
        <span class="rtrail">
          <span class="price">${priceText}${suffix
            ? html`<span class="cur">${suffix}</span>`
            : nothing}</span>
          ${showDelta ? html`<span class="delta">${deltaText}</span>` : nothing}
        </span>
      </button>
    `;
  }

  protected render(): TemplateResult | typeof nothing {
    const config = this._config;
    const hass = this.hass;
    if (!config || !hass) return nothing;

    const rows = this._rows();
    const priced = rows.filter((row) => row.price !== null);
    const unavailable = priced.length === 0;
    const best = priced[0];
    const accent = accentFor(best?.stateObj, config.color);
    const name = config.name ?? DEFAULT_NAME;
    const suffix = this._suffix(best?.stateObj ?? rows[0]?.stateObj);
    const digits = this._digits(
      priced.length ? Math.max(...priced.map((row) => row.price as number)) : 1
    );
    // The recorder's day mean is the honest baseline; without it the live
    // spread across the listed stations still answers "cheap or dear?".
    const liveAvg = priced.length
      ? priced.reduce((sum, row) => sum + (row.price as number), 0) / priced.length
      : null;
    const avg = this._dayAvg ?? liveAvg;

    return html`
      <ha-card
        class="control ${unavailable ? 'unavailable' : ''}"
        style="--silk-accent:${accent}"
      >
        <div class="header">
          <div class="hname">${name}</div>
          ${avg !== null
            ? html`<span
                class="avg"
                title=${this._dayAvg !== null
                  ? "Today's average across the tracked stations"
                  : 'Average of the prices shown'}
                >avg ${this._price(avg, digits)}</span
              >`
            : nothing}
        </div>
        <div class="rows">
          ${rows.map((row) => this._renderRow(row, row === best, avg, digits, suffix))}
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
        justify-content: flex-start;
        gap: 6px;
        padding: 12px 14px;
        cursor: default;
      }
      .header {
        flex: none;
        display: flex;
        align-items: center;
        gap: 8px;
        min-height: 20px;
      }
      .hname {
        flex: 1;
        min-width: 0;
        font-size: 13px;
        font-weight: 600;
        color: var(--secondary-text-color);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .avg {
        flex: none;
        font-size: 11px;
        font-weight: 500;
        line-height: 1;
        color: var(--secondary-text-color);
        font-variant-numeric: tabular-nums;
        white-space: nowrap;
      }
      .rows {
        display: flex;
        flex-direction: column;
        gap: 2px;
        margin: 0 -6px;
        min-height: 0;
        overflow: hidden;
      }
      .row {
        display: flex;
        align-items: center;
        gap: 10px;
        width: 100%;
        min-height: 40px;
        margin: 0;
        padding: 4px 6px;
        border: none;
        border-radius: 10px;
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
      /* The winner reads as surface, never as a glow. */
      .row.best {
        background: color-mix(in srgb, var(--silk-accent) 12%, transparent);
      }
      .row.best:hover {
        background: color-mix(in srgb, var(--silk-accent) 18%, transparent);
      }
      .row:focus-visible {
        box-shadow: inset 0 0 0 2px color-mix(in srgb, var(--silk-accent) 70%, transparent);
      }
      .row.stale {
        opacity: 0.45;
      }
      .badge {
        flex: none;
        display: grid;
        place-items: center;
        width: 28px;
        height: 28px;
        border-radius: 9px;
        font-size: 13px;
        font-weight: 600;
        line-height: 1;
        color: var(--secondary-text-color);
        background: rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.07);
        transition:
          background 200ms ease,
          color 200ms ease;
      }
      .row.best .badge {
        color: var(--silk-accent);
        background: color-mix(in srgb, var(--silk-accent) 20%, transparent);
      }
      .rinfo {
        flex: 1;
        min-width: 0;
        display: block;
      }
      .rname {
        display: block;
        font-size: 14px;
        font-weight: 500;
        line-height: 1.3;
        color: var(--primary-text-color);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .rsub {
        display: flex;
        align-items: center;
        gap: 6px;
        min-width: 0;
      }
      .dist {
        font-size: 11px;
        line-height: 1.4;
        color: var(--secondary-text-color);
        font-variant-numeric: tabular-nums;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .tag {
        flex: none;
        font-size: 10px;
        font-weight: 600;
        line-height: 1;
        padding: 3px 6px;
        border-radius: 999px;
        color: var(--silk-accent);
        background: color-mix(in srgb, var(--silk-accent) 16%, transparent);
      }
      .rtrail {
        flex: none;
        display: flex;
        flex-direction: column;
        align-items: flex-end;
        gap: 1px;
      }
      .price {
        font-size: 17px;
        font-weight: 600;
        line-height: 1.15;
        letter-spacing: -0.01em;
        color: var(--primary-text-color);
        font-variant-numeric: tabular-nums;
        white-space: nowrap;
      }
      .cur {
        margin-left: 2px;
        font-size: 12px;
        font-weight: 500;
        letter-spacing: 0;
        color: var(--secondary-text-color);
      }
      /* Deltas stay monochrome: cheap or dear is not a fault condition. */
      .delta {
        font-size: 11px;
        line-height: 1;
        color: var(--secondary-text-color);
        font-variant-numeric: tabular-nums;
        white-space: nowrap;
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    'silk-fuel-card': SilkFuelCard;
  }
}
