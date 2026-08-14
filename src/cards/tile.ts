import { LitElement, html, svg, css, nothing, PropertyValues, TemplateResult } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { HomeAssistant, LovelaceCardConfig, Point } from '../types';
import { silkControlStyles } from '../shared/base';
import { isActive, isUnavailable, moreInfo, haptic } from '../shared/service';
import { accentFor } from '../shared/color';
import { registerRowsEditor } from '../shared/rows';
import { fetchSeries } from '../data';
import { resampleHold, niceDomain, toPxYs, buildLinePath, buildAreaPath, lastFiniteIndex } from '../graph';
import { formatNumber } from '../format';

export const META = {
  type: 'silk-tile-card',
  name: 'Silk Tile',
  description: 'A sensor tile with a living sparkline and threshold colors.',
};

export interface TileThreshold {
  value: number;
  color: string;
}

export interface SilkTileConfig extends LovelaceCardConfig {
  entity: string;
  name?: string;
  icon?: string;
  color?: string;
  unit?: string;
  hours_to_show?: number;
  /** Ascending stops; accent = color of the highest stop <= value. */
  thresholds?: TileThreshold[];
}

const POINTS = 60;
const PAD_TOP = 6;
const PAD_BOTTOM = 4;
const REFRESH_INTERVAL_MS = 300_000;
const REFRESH_THROTTLE_MS = 60_000;

let uidCounter = 0;

// Thresholds are {value, color} rows: the accent follows the highest stop the
// reading has passed, which is a list no flat form can hold.
registerRowsEditor('silk-tile-card-editor', {
  field: 'thresholds',
  title: '임계값 (낮은 값부터)',
  addLabel: '임계값 추가',
  blank: { value: 0, color: 'green' },
  row: [
    { name: 'value', label: '값 이상', selector: { number: { mode: 'box', step: 'any' } } },
    { name: 'color', label: '색상', selector: { ui_color: {} } },
  ],
  schema: [
    {
      name: 'entity',
      required: true,
      selector: { entity: { domain: ['sensor', 'number', 'input_number'] } },
    },
    { name: 'name', selector: { text: {} } },
    {
      name: '',
      type: 'grid',
      schema: [
        { name: 'icon', selector: { icon: {} } },
        { name: 'color', selector: { ui_color: {} } },
      ],
    },
    {
      name: '',
      type: 'grid',
      schema: [
        { name: 'unit', selector: { text: {} } },
        { name: 'hours_to_show', selector: { number: { min: 1, mode: 'box' } } },
      ],
    },
  ],
  labels: {
    entity: '엔티티',
    name: '이름',
    icon: '아이콘',
    color: '강조 색상',
    unit: '단위',
    hours_to_show: '표시 시간(시간)',
  },
  defaults: { hours_to_show: 24 },
});

@customElement('silk-tile-card')
export class SilkTileCard extends LitElement {
  @property({ attribute: false }) public hass?: HomeAssistant;

  @state() private _config?: SilkTileConfig;
  @state() private _width = 0;
  @state() private _height = 0;
  @state() private _rev = 0;

  private _uid = `silk-tile${++uidCounter}`;
  private _thresholds: TileThreshold[] = [];
  private _vals: Float64Array | null = null;
  private _pxYs: Float64Array | null = null;
  private _domain: [number, number] = [0, 1];
  private _fetchStarted = false;
  private _fetchSeq = 0;
  private _lastFetch = 0;
  private _lastUpdated?: string;
  private _refreshTimer?: number;
  private _intervalTimer?: number;
  private _resizeObserver?: ResizeObserver;

  public static getStubConfig(hass: HomeAssistant): Partial<SilkTileConfig> {
    const ids = Object.keys(hass.states).filter(
      (id) =>
        id.startsWith('sensor.') &&
        Number.isFinite(Number(hass.states[id].state)) &&
        hass.states[id].attributes.unit_of_measurement
    );
    const temp = ids.find((id) => hass.states[id].attributes.device_class === 'temperature');
    return { type: 'custom:silk-tile-card', entity: temp ?? ids[0] };
  }

  public static async getConfigElement(): Promise<HTMLElement> {
    return document.createElement('silk-tile-card-editor');
  }

  public setConfig(config: SilkTileConfig): void {
    if (!config.entity) {
      throw new Error('silk-tile-card: `entity` is required');
    }
    this._thresholds = (config.thresholds ?? [])
      .filter(
        (t): t is TileThreshold =>
          !!t && typeof t.value === 'number' && Number.isFinite(t.value) && typeof t.color === 'string'
      )
      .sort((a, b) => a.value - b.value);
    this._config = config;
    this._fetchStarted = false;
    this._vals = null;
    this._pxYs = null;
    this._lastUpdated = undefined;
  }

  public getCardSize(): number {
    return 2;
  }

  public getGridOptions(): Record<string, number> {
    return { columns: 6, rows: 2, min_columns: 3, min_rows: 2 };
  }

  public connectedCallback(): void {
    super.connectedCallback();
    this._intervalTimer = window.setInterval(() => this._refresh(), REFRESH_INTERVAL_MS);
  }

  public disconnectedCallback(): void {
    super.disconnectedCallback();
    window.clearInterval(this._intervalTimer);
    window.clearTimeout(this._refreshTimer);
    this._refreshTimer = undefined;
    this._resizeObserver?.disconnect();
    this._resizeObserver = undefined;
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
    if (this._resizeObserver) return;
    const spark = this.renderRoot.querySelector('.spark');
    if (!spark) return;
    this._resizeObserver = new ResizeObserver((entries) => {
      const rect = entries[0].contentRect;
      if (rect.width === this._width && rect.height === this._height) return;
      this._width = rect.width;
      this._height = rect.height;
      this._recompute();
    });
    this._resizeObserver.observe(spark);
  }

  /** Refetch when the entity actually records a new state, throttled to 60s. */
  private _onStatesChanged(): void {
    const stamp = this.hass?.states[this._config!.entity]?.last_updated;
    if (!stamp || stamp === this._lastUpdated) return;
    this._lastUpdated = stamp;
    if (this._refreshTimer) return;
    const wait = Math.max(0, REFRESH_THROTTLE_MS - (Date.now() - this._lastFetch));
    this._refreshTimer = window.setTimeout(() => {
      this._refreshTimer = undefined;
      this._refresh();
    }, wait);
  }

  private async _refresh(): Promise<void> {
    if (!this.hass || !this._config) return;
    const entity = this._config.entity;
    const hours = this._config.hours_to_show ?? 24;
    const seq = ++this._fetchSeq;
    const end = Date.now() / 1000;
    const start = end - hours * 3600;
    let data: Record<string, Point[]>;
    try {
      data = await fetchSeries(this.hass, [entity], start, end, hours);
    } catch (err) {
      console.warn('silk-tile-card: history fetch failed', err);
      return;
    }
    if (seq !== this._fetchSeq) return; // a newer fetch superseded this one
    this._lastFetch = Date.now();
    this._vals = resampleHold(data[entity] ?? [], start, end, POINTS);
    this._domain = niceDomain([this._vals]);
    this._recompute();
  }

  private _recompute(): void {
    if (!this._vals || !this._width || !this._height) return;
    this._pxYs = toPxYs(this._vals, this._domain, this._height, PAD_TOP, PAD_BOTTOM);
    this._rev++;
  }

  /** Highest threshold at or below the value wins; else config.color, else domain accent. */
  private _accent(value: number): string {
    if (Number.isFinite(value)) {
      let color: string | undefined;
      for (const t of this._thresholds) {
        if (t.value <= value) color = t.color;
        else break;
      }
      if (color) return color;
    }
    return accentFor(this.hass?.states[this._config!.entity], this._config?.color);
  }

  private _onTap(): void {
    if (!this._config) return;
    haptic(this);
    moreInfo(this, this._config.entity);
  }

  protected render(): TemplateResult | typeof nothing {
    if (!this._config) return nothing;
    void this._rev; // reactive dependency for imperative sparkline updates
    const hass = this.hass;
    const stateObj = hass?.states[this._config.entity];
    if (hass && !stateObj) {
      return html`<ha-card
        ><div class="warning">Entity not found: ${this._config.entity}</div></ha-card
      >`;
    }

    const unavailable = isUnavailable(stateObj);
    const value = Number(stateObj?.state);
    const accent = this._accent(value);
    const unit = this._config.unit ?? stateObj?.attributes.unit_of_measurement ?? '';
    const name = this._config.name ?? stateObj?.attributes.friendly_name ?? this._config.entity;

    return html`
      <ha-card
        class="control ${unavailable ? 'unavailable' : ''}"
        style="--silk-accent:${accent}"
        @click=${this._onTap}
      >
        <div class="top">
          <div class="icon ${!unavailable && isActive(stateObj) ? 'on' : ''}">
            ${this._config.icon
              ? html`<ha-icon .icon=${this._config.icon}></ha-icon>`
              : html`<ha-state-icon .hass=${hass} .stateObj=${stateObj}></ha-state-icon>`}
          </div>
          <div class="info"><div class="name">${name}</div></div>
          <div class="trailing">
            <span class="value">${formatNumber(hass, this._config.entity, value)}</span>
            ${unit ? html`<span class="unit">${unit}</span>` : nothing}
          </div>
        </div>
        <div class="spark">${this._renderSpark()}</div>
      </ha-card>
    `;
  }

  private _renderSpark(): TemplateResult | typeof nothing {
    const w = this._width;
    const h = this._height;
    const ys = this._pxYs;
    if (!w || !h || !ys) return nothing;
    const line = buildLinePath(ys, w);
    const area = buildAreaPath(ys, w, h);
    const last = lastFiniteIndex(ys);
    const lastX = last >= 0 ? (last / (ys.length - 1)) * w : 0;
    const gradId = `${this._uid}-fill`;
    return html`
      <svg viewBox="0 0 ${w} ${h}" width=${w} height=${h}>
        <defs>
          <linearGradient id=${gradId} x1="0" y1="0" x2="0" y2="1">
            <stop
              offset="0%"
              stop-color="currentColor"
              stop-opacity="0.25"
              style="color:var(--silk-accent)"
            ></stop>
            <stop
              offset="100%"
              stop-color="currentColor"
              stop-opacity="0.02"
              style="color:var(--silk-accent)"
            ></stop>
          </linearGradient>
        </defs>
        <g style="color:var(--silk-accent)">
          <path d=${area} fill="url(#${gradId})"></path>
          <path
            d=${line}
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          ></path>
          ${last >= 0
            ? svg`<circle cx=${lastX} cy=${ys[last]} r="2.5" fill="currentColor"></circle>`
            : nothing}
        </g>
      </svg>
    `;
  }

  static styles = [
    silkControlStyles,
    css`
      ha-card {
        flex-direction: column;
        align-items: stretch;
        gap: 0;
        transition: transform 250ms var(--silk-spring);
      }
      ha-card:active {
        transform: scale(0.97);
        transition-duration: 120ms;
        transition-timing-function: var(--silk-ease-out);
      }
      .top {
        flex: none;
        display: flex;
        align-items: center;
        gap: 12px;
        min-width: 0;
      }
      /* The tile has no control action: the icon presses with the card, not alone. */
      .icon {
        cursor: pointer;
      }
      .icon:active {
        transform: none;
      }
      .trailing {
        align-items: baseline;
        gap: 3px;
      }
      .spark {
        flex: 1;
        position: relative;
        min-height: 44px;
        margin: 6px -12px -12px;
      }
      .spark svg {
        position: absolute;
        inset: 0;
        display: block;
        animation: silk-tile-in 300ms var(--silk-ease-out);
      }
      .unavailable .spark {
        opacity: 0.45;
      }
      @keyframes silk-tile-in {
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
    'silk-tile-card': SilkTileCard;
  }
}
