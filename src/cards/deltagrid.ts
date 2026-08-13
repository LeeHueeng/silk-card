import { LitElement, html, css, nothing, PropertyValues, TemplateResult } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { HomeAssistant, HassEntity, LovelaceCardConfig } from '../types';
import { silkControlStyles } from '../shared/base';
import { isUnavailable, moreInfo, haptic } from '../shared/service';
import { accentFor } from '../shared/color';
import { registerEditor } from '../shared/editor';
import { formatNumber } from '../format';

export const META = {
  type: 'silk-delta-card',
  name: 'Silk Deltas',
  description: 'Today versus yesterday, for everything.',
};

/** A cell: an entity plus an optional display name. */
export interface DeltaEntityConfig {
  entity: string;
  name?: string;
}

export interface SilkDeltaCardConfig extends LovelaceCardConfig {
  entities: (string | DeltaEntityConfig)[];
  name?: string;
  /**
   * False (default) reads the entities as consumption: less is better, so a
   * fall is tinted success and a rise warning. True flips that judgement.
   */
  invert?: boolean;
  /** `change` = daily total, `mean` = daily average. Auto-detected per entity. */
  metric?: 'mean' | 'change';
  /** Accent override. */
  color?: string;
}

/**
 * Row from `recorder/statistics_during_period` — Silk's minimal HomeAssistant
 * type does not model recorder responses, so it is typed locally.
 */
interface StatisticsRow {
  start: number | string;
  mean?: number | null;
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

interface DeltaRow {
  entity: string;
  name: string;
  stateObj?: HassEntity;
  unit: string;
  /** Today so far; NaN when the recorder has nothing. */
  today: number;
  yesterday: number;
  /** Percent change, null when yesterday offers no baseline. */
  pct: number | null;
  unavailable: boolean;
}

const MAX_CELLS = 12;
/** Statistics land on the hour; refetch 90s after each boundary. */
const HOURLY_SLACK_MS = 90_000;

const EDITOR_TAG = 'silk-delta-card-editor';

registerEditor(
  EDITOR_TAG,
  [
    {
      name: 'entities',
      required: true,
      selector: { entity: { multiple: true, domain: ['sensor'] } },
    },
    { name: 'name', selector: { text: {} } },
    {
      name: 'metric',
      selector: {
        select: {
          mode: 'dropdown',
          options: [
            { value: 'change', label: 'Daily total' },
            { value: 'mean', label: 'Daily average' },
          ],
        },
      },
    },
    { name: 'invert', selector: { boolean: {} } },
  ],
  {
    entities: 'Entities',
    name: 'Name',
    metric: 'Metric (auto when empty)',
    invert: 'More is better',
  }
);

@customElement('silk-delta-card')
export class SilkDeltaCard extends LitElement {
  @property({ attribute: false }) public hass?: HomeAssistant;

  @state() private _config?: SilkDeltaCardConfig;
  /** entity → [today, yesterday]; absent while loading or without statistics. */
  @state() private _stats: Record<string, [number, number]> = {};
  @state() private _noStats = false;
  @state() private _failed = false;

  private _entities: DeltaEntityConfig[] = [];
  private _fetchStarted = false;
  private _fetchSeq = 0;
  private _hourlyTimer?: number;
  private _connection?: HassWithConnection['connection'];
  private readonly _onWsReady = (): void => {
    this._refresh();
  };

  public static getStubConfig(hass: HomeAssistant): Partial<SilkDeltaCardConfig> {
    const ids = Object.keys(hass.states).filter(
      (id) =>
        id.startsWith('sensor.') &&
        !!hass.states[id].attributes.unit_of_measurement &&
        Number.isFinite(Number(hass.states[id].state))
    );
    const byClass = (cls: string) =>
      ids.filter((id) => hass.states[id].attributes.device_class === cls);
    const energy = [...byClass('energy'), ...byClass('water'), ...byClass('gas')];
    return {
      type: 'custom:silk-delta-card',
      entities: (energy.length ? energy : ids).slice(0, 6),
    };
  }

  public static async getConfigElement(): Promise<HTMLElement> {
    return document.createElement(EDITOR_TAG);
  }

  public setConfig(config: SilkDeltaCardConfig): void {
    if (!Array.isArray(config.entities) || config.entities.length === 0) {
      throw new Error('silk-delta-card: `entities` is required — a list of sensor ids');
    }
    if (config.metric !== undefined && config.metric !== 'mean' && config.metric !== 'change') {
      throw new Error("silk-delta-card: `metric` must be 'mean' or 'change'");
    }
    // Past twelve the grid stops being scannable, so the extras are dropped.
    this._entities = config.entities.slice(0, MAX_CELLS).map((item) => {
      const obj: DeltaEntityConfig | undefined =
        typeof item === 'string' ? { entity: item } : (item as DeltaEntityConfig);
      if (!obj || typeof obj.entity !== 'string' || !obj.entity.includes('.')) {
        throw new Error('silk-delta-card: every entry in `entities` needs an `entity`');
      }
      return obj;
    });
    this._config = config;
    this._stats = {};
    this._noStats = false;
    this._failed = false;
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
    this._connection?.removeEventListener?.('ready', this._onWsReady);
    this._connection = undefined;
  }

  protected willUpdate(_changed: PropertyValues): void {
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
    }
  }

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
   * Hourly statistics for the last two days, folded into two like-for-like
   * windows: today midnight→now, and yesterday midnight→the same hour. Comparing
   * a half-finished day against a whole one would only ever report a collapse.
   */
  private async _refresh(): Promise<void> {
    const hass = this.hass;
    const config = this._config;
    if (!hass || !config || !this._entities.length) return;
    const ids = this._entities.map((e) => e.entity);
    const seq = ++this._fetchSeq;

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const yesterdayStart = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() - 1
    ).getTime();
    // At least one hour, so the card is not blank in the minutes after midnight.
    const elapsedMs = Math.max(1, Math.floor((now.getTime() - todayStart) / 3_600_000)) * 3_600_000;

    let resp: Record<string, StatisticsRow[]>;
    try {
      resp = await hass.callWS<Record<string, StatisticsRow[]>>({
        type: 'recorder/statistics_during_period',
        start_time: new Date(yesterdayStart).toISOString(),
        end_time: now.toISOString(),
        statistic_ids: ids,
        period: 'hour',
        types: ['mean', 'change'],
      });
    } catch (err) {
      console.warn('silk-delta-card: statistics fetch failed', err);
      if (seq === this._fetchSeq) this._failed = true;
      return;
    }
    if (seq !== this._fetchSeq) return; // a newer fetch superseded this one

    const finite = (x: number | null | undefined): x is number =>
      typeof x === 'number' && Number.isFinite(x);
    const stats: Record<string, [number, number]> = {};
    for (const id of ids) {
      const rows = resp?.[id] ?? [];
      if (!rows.length) continue;
      const metric =
        config.metric ?? (rows.some((row) => finite(row.change)) ? 'change' : 'mean');
      const sums = [0, 0];
      const counts = [0, 0];
      for (const row of rows) {
        const t = typeof row.start === 'number' ? row.start : Date.parse(row.start);
        if (!Number.isFinite(t)) continue;
        const slot =
          t >= todayStart && t < todayStart + elapsedMs
            ? 0
            : t >= yesterdayStart && t < yesterdayStart + elapsedMs
              ? 1
              : -1;
        if (slot < 0) continue;
        const v = metric === 'change' ? row.change : row.mean;
        if (!finite(v)) continue;
        sums[slot] += v;
        counts[slot]++;
      }
      if (!counts[0] && !counts[1]) continue;
      const fold = (i: number): number =>
        counts[i] === 0 ? NaN : metric === 'change' ? sums[i] : sums[i] / counts[i];
      stats[id] = [fold(0), fold(1)];
    }
    this._stats = stats;
    this._noStats = Object.keys(stats).length === 0;
    this._failed = false;
  }

  /** Rows, biggest movers first; entities without a baseline sink to the end. */
  private _rows(): DeltaRow[] {
    const hass = this.hass!;
    const rows = this._entities.map((item): DeltaRow => {
      const stateObj = hass.states[item.entity];
      const pair = this._stats[item.entity];
      const today = pair ? pair[0] : NaN;
      const yesterday = pair ? pair[1] : NaN;
      const base = Math.abs(yesterday);
      const pct =
        Number.isFinite(today) && Number.isFinite(yesterday) && base > 1e-9
          ? ((today - yesterday) / base) * 100
          : null;
      return {
        entity: item.entity,
        name: item.name ?? stateObj?.attributes.friendly_name ?? item.entity,
        stateObj,
        unit: (stateObj?.attributes.unit_of_measurement as string | undefined) ?? '',
        today,
        yesterday,
        pct,
        unavailable: !stateObj || isUnavailable(stateObj),
      };
    });
    return rows.sort((a, b) => {
      if (a.pct === null && b.pct === null) return a.name.localeCompare(b.name);
      if (a.pct === null) return 1;
      if (b.pct === null) return -1;
      return Math.abs(b.pct) - Math.abs(a.pct);
    });
  }

  private _onCellClick(ev: Event, entityId: string): void {
    ev.stopPropagation();
    haptic(this, 'selection');
    moreInfo(this, entityId);
  }

  private _title(row: DeltaRow): string {
    const today = Number.isFinite(row.today)
      ? `${formatNumber(this.hass, row.entity, row.today)}${row.unit ? ` ${row.unit}` : ''}`
      : '—';
    const yesterday = Number.isFinite(row.yesterday)
      ? `${formatNumber(this.hass, row.entity, row.yesterday)}${row.unit ? ` ${row.unit}` : ''}`
      : '—';
    return `${row.name} · today ${today} · same time yesterday ${yesterday}`;
  }

  private _renderChip(row: DeltaRow): TemplateResult {
    if (row.pct === null) {
      return html`<span class="chip flat">—</span>`;
    }
    const rounded = Math.round(row.pct);
    if (rounded === 0) {
      return html`<span class="chip flat">0%</span>`;
    }
    const up = rounded > 0;
    // Default reading is consumption: a rise is the unwelcome direction.
    const good = this._config?.invert ? up : !up;
    return html`
      <span class="chip ${good ? 'good' : 'bad'}">
        <span class="arrow" aria-hidden="true">${up ? '↑' : '↓'}</span
        >${up ? '+' : '−'}${Math.abs(rounded)}%
      </span>
    `;
  }

  protected render(): TemplateResult | typeof nothing {
    const config = this._config;
    const hass = this.hass;
    if (!config || !hass) return nothing;

    const rows = this._rows();
    const accent = accentFor(rows.find((r) => r.stateObj)?.stateObj, config.color);
    const allUnavailable = rows.every((r) => r.unavailable);
    const title = config.name ?? 'Today vs yesterday';

    return html`
      <ha-card
        class="control ${allUnavailable ? 'unavailable' : ''}"
        style="--silk-accent:${accent}"
      >
        <div class="hname" title=${title}>${title}</div>
        <div class="grid">
          ${rows.map(
            (row) => html`
              <button
                class="cell ${row.unavailable ? 'na' : ''}"
                title=${this._title(row)}
                aria-label=${this._title(row)}
                @click=${(ev: Event) => this._onCellClick(ev, row.entity)}
              >
                <span class="cname">${row.name}</span>
                <span class="reading">
                  <span class="cval"
                    >${Number.isFinite(row.today)
                      ? formatNumber(hass, row.entity, row.today)
                      : '—'}</span
                  >${row.unit ? html`<span class="unit">${row.unit}</span>` : nothing}
                </span>
                ${this._renderChip(row)}
              </button>
            `
          )}
        </div>
        ${this._failed
          ? html`<div class="note">Statistics unavailable right now</div>`
          : this._noStats
            ? html`<div class="note">No long-term statistics for these entities</div>`
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
        gap: 8px;
        padding: 12px 14px;
        cursor: default;
      }
      .hname {
        flex: none;
        font-size: 13px;
        font-weight: 600;
        color: var(--secondary-text-color);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(136px, 1fr));
        gap: 8px 12px;
        min-width: 0;
      }
      .cell {
        display: flex;
        flex-direction: column;
        align-items: flex-start;
        gap: 2px;
        min-width: 0;
        margin: 0;
        padding: 5px 6px;
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
      .cell:hover {
        background: rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.05);
      }
      .cell:focus-visible {
        box-shadow: inset 0 0 0 2px color-mix(in srgb, var(--silk-accent) 70%, transparent);
      }
      .cell.na {
        opacity: 0.45;
      }
      .cname {
        max-width: 100%;
        font-size: 11px;
        line-height: 1.3;
        color: var(--secondary-text-color);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .reading {
        display: flex;
        align-items: baseline;
        gap: 3px;
        max-width: 100%;
        white-space: nowrap;
        overflow: hidden;
      }
      .cval {
        font-size: 15px;
        font-weight: 600;
        line-height: 1.25;
        letter-spacing: -0.01em;
        color: var(--primary-text-color);
        font-variant-numeric: tabular-nums;
      }
      .reading .unit {
        font-size: 10.5px;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .chip {
        display: inline-flex;
        align-items: center;
        gap: 2px;
        margin-top: 1px;
        padding: 2px 7px;
        border-radius: 999px;
        font-size: 11px;
        font-weight: 600;
        line-height: 1.4;
        letter-spacing: 0;
        cursor: inherit;
        font-variant-numeric: tabular-nums;
        white-space: nowrap;
      }
      .arrow {
        font-size: 12px;
        line-height: 1;
      }
      /* Direction here is a verdict, not a category: status colors earn it. */
      .chip.good {
        color: var(--success-color, #43a047);
        background: color-mix(in srgb, var(--success-color, #43a047) 14%, transparent);
      }
      .chip.bad {
        color: var(--warning-color, #ffa600);
        background: color-mix(in srgb, var(--warning-color, #ffa600) 16%, transparent);
      }
      .chip.flat {
        color: var(--secondary-text-color);
        background: rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.06);
      }
      .note {
        flex: none;
        font-size: 12px;
        color: var(--secondary-text-color);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    'silk-delta-card': SilkDeltaCard;
  }
}
