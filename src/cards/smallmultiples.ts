import { LitElement, html, css, nothing, PropertyValues, TemplateResult } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { HomeAssistant, HassEntity, LovelaceCardConfig, Point } from '../types';
import { silkControlStyles } from '../shared/base';
import { isUnavailable, moreInfo, haptic, clamp } from '../shared/service';
import { accentFor } from '../shared/color';
import { registerListEditor } from '../shared/listeditor';
import { entityListSelector } from '../shared/list';
import { fetchSeries } from '../data';
import { resampleHold, niceDomain, toPxYs, buildLinePath } from '../graph';
import { formatNumber } from '../format';

export const META = {
  type: 'silk-multiples-card',
  name: 'Silk Multiples',
  description: 'A wall of tiny truths.',
};

/** A cell: an entity plus an optional display name. */
export interface MultiplesEntityConfig {
  entity: string;
  name?: string;
}

export interface SilkMultiplesCardConfig extends LovelaceCardConfig {
  entities: (string | MultiplesEntityConfig)[];
  name?: string;
  hours_to_show?: number;
  /** Fixed column count; the grid auto-fills when omitted. */
  columns?: number;
  /** Accent override — one hue for every cell, by design. */
  color?: string;
}

const DEFAULT_HOURS = 24;
/** A wall of twelve is already the limit of what reads at a glance. */
const MAX_CELLS = 12;
const POINTS = 48;
const SPARK_H = 28;
const SPARK_PAD = 3;
const REFRESH_INTERVAL_MS = 300_000;
const REFRESH_THROTTLE_MS = 60_000;

interface Cell {
  entity: string;
  name: string;
  stateObj?: HassEntity;
  value: number;
  unit: string;
  unavailable: boolean;
}

const EDITOR_TAG = 'silk-multiples-card-editor';

// Cells accept `{entity, name}` entries; the list editor folds the picker's
// answer back into them so hand-written cell names survive an edit.
registerListEditor(EDITOR_TAG, {
  schema: [
    {
      ...entityListSelector('entities', ['sensor', 'number', 'input_number']),
      required: true,
    },
    { name: 'name', selector: { text: {} } },
    {
      name: '',
      type: 'grid',
      schema: [
        { name: 'hours_to_show', selector: { number: { min: 1, max: 168, step: 1, mode: 'box' } } },
        { name: 'columns', selector: { number: { min: 1, max: 6, step: 1, mode: 'box' } } },
        { name: 'color', selector: { ui_color: {} } },
      ],
    },
  ],
  labels: {
    entities: `엔티티 (최대 ${MAX_CELLS}개)`,
    name: '이름',
    hours_to_show: '표시 시간',
    columns: '열 수 (비우면 자동)',
    color: '강조 색상',
  },
  defaults: { hours_to_show: DEFAULT_HOURS },
  listFields: ['entities'],
});

@customElement('silk-multiples-card')
export class SilkMultiplesCard extends LitElement {
  @property({ attribute: false }) public hass?: HomeAssistant;

  @state() private _config?: SilkMultiplesCardConfig;
  /** Measured cell width; every grid cell is the same width. */
  @state() private _width = 0;
  @state() private _rev = 0;
  /** True when the history call failed outright. */
  @state() private _failed = false;

  private _entities: MultiplesEntityConfig[] = [];
  private _series: Record<string, Float64Array> = {};
  private _fetchStarted = false;
  private _fetchSeq = 0;
  private _lastFetch = 0;
  private _lastStamp = '';
  private _refreshTimer?: number;
  private _intervalTimer?: number;
  private _resize?: ResizeObserver;
  private _observed?: Element;

  public static getStubConfig(hass: HomeAssistant): Partial<SilkMultiplesCardConfig> {
    const ids = Object.keys(hass.states).filter(
      (id) =>
        id.startsWith('sensor.') &&
        !!hass.states[id].attributes.unit_of_measurement &&
        Number.isFinite(Number(hass.states[id].state))
    );
    return { type: 'custom:silk-multiples-card', entities: ids.slice(0, 6) };
  }

  public static async getConfigElement(): Promise<HTMLElement> {
    return document.createElement(EDITOR_TAG);
  }

  public setConfig(config: SilkMultiplesCardConfig): void {
    if (!Array.isArray(config.entities) || config.entities.length === 0) {
      throw new Error('silk-multiples-card: `entities` is required — a list of entity ids');
    }
    if (config.hours_to_show !== undefined && !(Number(config.hours_to_show) > 0)) {
      throw new Error('silk-multiples-card: `hours_to_show` must be a positive number');
    }
    if (config.columns !== undefined && !(Number(config.columns) >= 1)) {
      throw new Error('silk-multiples-card: `columns` must be at least 1');
    }
    // Beyond twelve the wall stops being readable, so the extras are dropped.
    this._entities = config.entities.slice(0, MAX_CELLS).map((item) => {
      const obj: MultiplesEntityConfig | undefined =
        typeof item === 'string' ? { entity: item } : (item as MultiplesEntityConfig);
      if (!obj || typeof obj.entity !== 'string' || !obj.entity.includes('.')) {
        throw new Error('silk-multiples-card: every entry in `entities` needs an `entity`');
      }
      return obj;
    });
    this._config = config;
    this._series = {};
    this._failed = false;
    this._fetchStarted = false;
    this._lastStamp = '';
  }

  public getCardSize(): number {
    return 3;
  }

  public getGridOptions(): Record<string, number> {
    return { columns: 6, rows: 3, min_columns: 4, min_rows: 2 };
  }

  public connectedCallback(): void {
    super.connectedCallback();
    this._intervalTimer = window.setInterval(() => this._refresh(), REFRESH_INTERVAL_MS);
    if (this.hasUpdated) {
      this._observeCell();
      if (this._fetchStarted) this._refresh();
    }
  }

  public disconnectedCallback(): void {
    super.disconnectedCallback();
    window.clearInterval(this._intervalTimer);
    window.clearTimeout(this._refreshTimer);
    this._refreshTimer = undefined;
    this._resize?.disconnect();
    this._resize = undefined;
    this._observed = undefined;
  }

  protected willUpdate(changed: PropertyValues): void {
    if (!this.hass || !this._config) return;
    if (!this._fetchStarted) {
      this._fetchStarted = true;
      this._refresh();
      return;
    }
    if (changed.has('hass')) this._onStatesChanged();
  }

  protected updated(): void {
    this._observeCell();
  }

  /** All cells share a width, so measuring the first sparkline is enough. */
  private _observeCell(): void {
    const el = this.renderRoot.querySelector('.spark');
    if (!el || el === this._observed) return;
    if (!this._resize) {
      this._resize = new ResizeObserver((entries) => {
        const w = Math.round(entries[entries.length - 1].contentRect.width);
        if (w !== this._width) this._width = w;
      });
    } else if (this._observed) {
      this._resize.unobserve(this._observed);
    }
    this._observed = el;
    this._resize.observe(el);
  }

  /** Refetch when any tracked entity records a new state, throttled to 60s. */
  private _onStatesChanged(): void {
    const hass = this.hass!;
    const stamp = this._entities.map((e) => hass.states[e.entity]?.last_updated ?? '').join('|');
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
    if (!hass || !this._config || !this._entities.length) return;
    const hours = Number(this._config.hours_to_show ?? DEFAULT_HOURS);
    const ids = this._entities.map((e) => e.entity);
    const seq = ++this._fetchSeq;
    const end = Date.now() / 1000;
    const start = end - hours * 3600;
    let data: Record<string, Point[]>;
    try {
      // One batched call for the whole wall — twelve requests would be rude.
      data = await fetchSeries(hass, ids, start, end, hours);
    } catch (err) {
      console.warn('silk-multiples-card: history fetch failed', err);
      if (seq === this._fetchSeq) this._failed = true;
      return;
    }
    if (seq !== this._fetchSeq) return; // a newer fetch superseded this one
    this._lastFetch = Date.now();
    const series: Record<string, Float64Array> = {};
    for (const id of ids) series[id] = resampleHold(data[id] ?? [], start, end, POINTS);
    this._series = series;
    this._failed = false;
    this._rev++;
  }

  private _cells(): Cell[] {
    const hass = this.hass!;
    return this._entities.map((item) => {
      const stateObj = hass.states[item.entity];
      const unavailable = isUnavailable(stateObj) || !stateObj;
      const numeric = Number(stateObj?.state);
      return {
        entity: item.entity,
        name: item.name ?? stateObj?.attributes.friendly_name ?? item.entity,
        stateObj,
        value: !unavailable && Number.isFinite(numeric) ? numeric : NaN,
        unit: (stateObj?.attributes.unit_of_measurement as string | undefined) ?? '',
        unavailable,
      };
    });
  }

  private _onCellClick(ev: Event, entityId: string): void {
    ev.stopPropagation();
    haptic(this, 'selection');
    moreInfo(this, entityId);
  }

  private _hoverTitle(cell: Cell, vals?: Float64Array): string {
    const now = Number.isFinite(cell.value)
      ? `${formatNumber(this.hass, cell.entity, cell.value)}${cell.unit ? ` ${cell.unit}` : ''}`
      : 'unavailable';
    if (!vals) return `${cell.name} · ${now}`;
    let lo = Infinity;
    let hi = -Infinity;
    for (let i = 0; i < vals.length; i++) {
      const v = vals[i];
      if (!Number.isFinite(v)) continue;
      if (v < lo) lo = v;
      if (v > hi) hi = v;
    }
    if (!Number.isFinite(lo)) return `${cell.name} · ${now}`;
    const hours = Math.round(Number(this._config?.hours_to_show ?? DEFAULT_HOURS));
    return (
      `${cell.name} · ${now} · ${hours}h ${formatNumber(this.hass, cell.entity, lo)}–` +
      `${formatNumber(this.hass, cell.entity, hi)}`
    );
  }

  private _renderSpark(cell: Cell): TemplateResult | typeof nothing {
    const w = this._width;
    const vals = this._series[cell.entity];
    if (!w || !vals) return nothing;
    // Per-cell domain: each tiny chart answers its own question.
    const ys = toPxYs(vals, niceDomain([vals]), SPARK_H, SPARK_PAD, SPARK_PAD);
    const d = buildLinePath(ys, w);
    if (!d) return nothing;
    return html`
      <svg viewBox="0 0 ${w} ${SPARK_H}" width=${w} height=${SPARK_H} aria-hidden="true">
        <path class="line" d=${d}><title>${this._hoverTitle(cell, vals)}</title></path>
      </svg>
    `;
  }

  protected render(): TemplateResult | typeof nothing {
    const config = this._config;
    const hass = this.hass;
    if (!config || !hass) return nothing;
    void this._rev; // reactive dependency for the fetched series

    const cells = this._cells();
    const accent = accentFor(cells[0]?.stateObj, config.color);
    const allUnavailable = cells.every((c) => c.unavailable);
    const columns = config.columns ? clamp(Math.round(config.columns), 1, MAX_CELLS) : 0;
    const gridStyle = columns
      ? `grid-template-columns:repeat(${columns}, minmax(0, 1fr))`
      : undefined;

    return html`
      <ha-card
        class="control ${allUnavailable ? 'unavailable' : ''}"
        style="--silk-accent:${accent}"
      >
        ${config.name ? html`<div class="hname" title=${config.name}>${config.name}</div>` : nothing}
        <div class="grid" style=${gridStyle ?? nothing}>
          ${cells.map(
            (cell) => html`
              <button
                class="cell ${cell.unavailable ? 'na' : ''}"
                title=${this._hoverTitle(cell, this._series[cell.entity])}
                aria-label=${this._hoverTitle(cell, this._series[cell.entity])}
                @click=${(ev: Event) => this._onCellClick(ev, cell.entity)}
              >
                <span class="cname">${cell.name}</span>
                <span class="reading">
                  <span class="cval"
                    >${Number.isFinite(cell.value)
                      ? formatNumber(hass, cell.entity, cell.value)
                      : '—'}</span
                  >${cell.unit ? html`<span class="unit">${cell.unit}</span>` : nothing}
                </span>
                <span class="spark">${this._renderSpark(cell)}</span>
              </button>
            `
          )}
        </div>
        ${this._failed ? html`<div class="note">History unavailable right now</div>` : nothing}
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
        grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
        gap: 10px 12px;
        min-width: 0;
      }
      .cell {
        display: flex;
        flex-direction: column;
        align-items: stretch;
        gap: 1px;
        min-width: 0;
        margin: 0;
        padding: 4px 6px 2px;
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
        min-width: 0;
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
        min-width: 0;
        white-space: nowrap;
        overflow: hidden;
      }
      .cval {
        font-size: 13px;
        font-weight: 600;
        line-height: 1.3;
        letter-spacing: -0.01em;
        color: var(--primary-text-color);
        font-variant-numeric: tabular-nums;
      }
      .reading .unit {
        font-size: 10.5px;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .spark {
        display: block;
        height: ${SPARK_H}px;
        margin-top: 2px;
      }
      .spark svg {
        display: block;
        animation: silk-multiples-in 250ms var(--silk-ease-out);
      }
      .line {
        fill: none;
        stroke: var(--silk-accent);
        stroke-width: 1.5;
        stroke-linecap: round;
        stroke-linejoin: round;
      }
      .note {
        flex: none;
        font-size: 12px;
        color: var(--secondary-text-color);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      @keyframes silk-multiples-in {
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
    'silk-multiples-card': SilkMultiplesCard;
  }
}
