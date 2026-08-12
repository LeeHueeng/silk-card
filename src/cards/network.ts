import { LitElement, html, css, nothing, PropertyValues, TemplateResult } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { HomeAssistant, HassEntity, LovelaceCardConfig, Point } from '../types';
import { silkControlStyles } from '../shared/base';
import { isUnavailable, moreInfo, haptic } from '../shared/service';
import { accentFor } from '../shared/color';
import { registerEditor } from '../shared/editor';
import { fetchSeries } from '../data';
import { resampleHold, buildLinePath, buildAreaPath } from '../graph';
import { formatNumber } from '../format';

export const META = {
  type: 'silk-network-card',
  name: 'Silk Network',
  description: 'Down and up, mirrored like a router should.',
};

export interface SilkNetworkCardConfig extends LovelaceCardConfig {
  /** Download-rate sensor. */
  download: string;
  /** Upload-rate sensor. */
  upload: string;
  name?: string;
  icon?: string;
  /** Accent override for the download side. */
  color?: string;
  /** Upload series color; the restrained amber by default. */
  upload_color?: string;
  hours_to_show?: number;
}

const DEFAULT_NAME = 'Network';
const DEFAULT_ICON = 'mdi:swap-vertical';
const DEFAULT_UPLOAD_COLOR = '#e6a23c';
const DEFAULT_HOURS = 3;
const POINTS = 60;
/** Breathing room between each series' peak and the card edge, px. */
const PAD = 3;
const REFRESH_INTERVAL_MS = 300_000;
const REFRESH_THROTTLE_MS = 60_000;

const EDITOR_TAG = 'silk-network-card-editor';

registerEditor(
  EDITOR_TAG,
  [
    { name: 'download', required: true, selector: { entity: { domain: ['sensor'] } } },
    { name: 'upload', required: true, selector: { entity: { domain: ['sensor'] } } },
    { name: 'name', selector: { text: {} } },
    { name: 'hours_to_show', selector: { number: { min: 1, mode: 'box' } } },
  ],
  {
    download: 'Download entity',
    upload: 'Upload entity',
    name: 'Name',
    hours_to_show: 'Hours to show',
  },
  { hours_to_show: DEFAULT_HOURS }
);

/**
 * Map raw rate values onto one side of the mirror: `mid` is the shared
 * baseline, `span` the pixel room toward the card edge, `dir` -1 up / +1 down.
 * Each side normalizes to its own max so both halves use their full height.
 */
function mirrorYs(vals: Float64Array, mid: number, span: number, dir: -1 | 1): Float64Array {
  let max = 0;
  for (let i = 0; i < vals.length; i++) {
    const v = vals[i];
    if (Number.isFinite(v) && v > max) max = v;
  }
  const scale = max > 0 ? span / max : 0;
  const out = new Float64Array(vals.length);
  for (let i = 0; i < vals.length; i++) {
    const v = vals[i];
    out[i] = Number.isFinite(v) ? mid + dir * Math.max(v, 0) * scale : NaN;
  }
  return out;
}

@customElement('silk-network-card')
export class SilkNetworkCard extends LitElement {
  @property({ attribute: false }) public hass?: HomeAssistant;

  @state() private _config?: SilkNetworkCardConfig;
  @state() private _width = 0;
  @state() private _height = 0;
  @state() private _rev = 0;

  private _downVals: Float64Array | null = null;
  private _upVals: Float64Array | null = null;
  private _fetchStarted = false;
  private _fetchSeq = 0;
  private _lastFetch = 0;
  private _lastStamp = '';
  private _refreshTimer?: number;
  private _intervalTimer?: number;
  private _resizeObserver?: ResizeObserver;

  public static getStubConfig(hass: HomeAssistant): Partial<SilkNetworkCardConfig> {
    const ids = Object.keys(hass.states).filter(
      (id) => id.startsWith('sensor.') && Number.isFinite(Number(hass.states[id].state))
    );
    const rates = ids.filter((id) => hass.states[id].attributes.device_class === 'data_rate');
    const pool = rates.length >= 2 ? rates : ids;
    const download = pool.find((id) => /down|rx/.test(id)) ?? pool[0];
    const upload = pool.find((id) => id !== download && /up|tx/.test(id)) ?? pool.find((id) => id !== download);
    return { type: 'custom:silk-network-card', download, upload };
  }

  public static async getConfigElement(): Promise<HTMLElement> {
    return document.createElement(EDITOR_TAG);
  }

  public setConfig(config: SilkNetworkCardConfig): void {
    if (!config.download || !config.upload) {
      throw new Error('silk-network-card: `download` and `upload` are required');
    }
    if (config.hours_to_show !== undefined && !(Number(config.hours_to_show) > 0)) {
      throw new Error('silk-network-card: `hours_to_show` must be a positive number');
    }
    this._config = config;
    this._fetchStarted = false;
    this._downVals = null;
    this._upVals = null;
    this._lastStamp = '';
  }

  public getCardSize(): number {
    return 2;
  }

  public getGridOptions(): Record<string, number> {
    return { columns: 6, rows: 2, min_columns: 4, min_rows: 2 };
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
    });
    this._resizeObserver.observe(spark);
  }

  /** Refetch when either sensor records a new state, throttled to 60s. */
  private _onStatesChanged(): void {
    const config = this._config!;
    const a = this.hass?.states[config.download]?.last_updated ?? '';
    const b = this.hass?.states[config.upload]?.last_updated ?? '';
    if (!a && !b) return;
    const stamp = `${a}|${b}`;
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
    if (!this.hass || !this._config) return;
    const { download, upload } = this._config;
    const hours = this._config.hours_to_show ?? DEFAULT_HOURS;
    const seq = ++this._fetchSeq;
    const end = Date.now() / 1000;
    const start = end - hours * 3600;
    let data: Record<string, Point[]>;
    try {
      data = await fetchSeries(this.hass, [download, upload], start, end, hours);
    } catch (err) {
      console.warn('silk-network-card: history fetch failed', err);
      return;
    }
    if (seq !== this._fetchSeq) return; // a newer fetch superseded this one
    this._lastFetch = Date.now();
    this._downVals = resampleHold(data[download] ?? [], start, end, POINTS);
    this._upVals = resampleHold(data[upload] ?? [], start, end, POINTS);
    this._rev++;
  }

  /** `↓ 39.2 KiB/s` — the unit rides along only when it adds information. */
  private _rateText(arrow: string, entityId: string, stateObj: HassEntity | undefined, unit: string): string {
    const value = Number(stateObj?.state);
    if (!stateObj || isUnavailable(stateObj) || !Number.isFinite(value)) return `${arrow} —`;
    const num = formatNumber(this.hass, entityId, value);
    return unit ? `${arrow} ${num} ${unit}` : `${arrow} ${num}`;
  }

  private _onTap(): void {
    if (!this._config) return;
    haptic(this);
    moreInfo(this, this._config.download);
  }

  protected render(): TemplateResult | typeof nothing {
    const config = this._config;
    if (!config) return nothing;
    void this._rev; // reactive dependency for fetched sparkline data
    const hass = this.hass;
    const down = hass?.states[config.download];
    const up = hass?.states[config.upload];
    if (hass && (!down || !up)) {
      return html`<ha-card
        ><div class="warning">Entity not found: ${!down ? config.download : config.upload}</div></ha-card
      >`;
    }

    const unavailable = isUnavailable(down) && isUnavailable(up);
    const accent = accentFor(down, config.color);
    const uploadColor = config.upload_color ?? DEFAULT_UPLOAD_COLOR;
    const name = config.name ?? DEFAULT_NAME;
    const downUnit = down?.attributes.unit_of_measurement ?? '';
    const upUnit = up?.attributes.unit_of_measurement ?? '';

    return html`
      <ha-card
        class="control ${unavailable ? 'unavailable' : ''}"
        style="--silk-accent:${accent};--silk-upload:${uploadColor}"
        @click=${this._onTap}
      >
        <div class="top">
          <div class="icon ${unavailable ? '' : 'on'}">
            <ha-icon .icon=${config.icon ?? DEFAULT_ICON}></ha-icon>
          </div>
          <div class="info"><div class="name" title=${name}>${name}</div></div>
          <div class="trailing rates">
            <span class="rate down">${this._rateText('↓', config.download, down, downUnit)}</span>
            <span class="rate up">
              ${this._rateText('↑', config.upload, up, upUnit === downUnit ? '' : upUnit)}
            </span>
          </div>
        </div>
        <div class="spark">${this._renderSpark()}</div>
      </ha-card>
    `;
  }

  private _renderSpark(): TemplateResult | typeof nothing {
    const w = this._width;
    const h = this._height;
    const downVals = this._downVals;
    const upVals = this._upVals;
    if (!w || !h || !downVals || !upVals) return nothing;
    const mid = h / 2;
    const downYs = mirrorYs(downVals, mid, Math.max(mid - PAD, 1), -1);
    const upYs = mirrorYs(upVals, mid, Math.max(h - PAD - mid, 1), 1);
    return html`
      <svg viewBox="0 0 ${w} ${h}" width=${w} height=${h} aria-hidden="true">
        <line class="mid" x1="0" y1=${mid} x2=${w} y2=${mid}></line>
        <g class="series down">
          <path class="fill" d=${buildAreaPath(downYs, w, mid)}></path>
          <path class="line" d=${buildLinePath(downYs, w)}></path>
        </g>
        <g class="series up">
          <path class="fill" d=${buildAreaPath(upYs, w, mid)}></path>
          <path class="line" d=${buildLinePath(upYs, w)}></path>
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
      /* No control action here: the icon presses with the card, not alone. */
      .icon {
        cursor: pointer;
      }
      .icon:active {
        transform: none;
      }
      .rates {
        flex-direction: column;
        align-items: flex-end;
        gap: 0;
      }
      .rate {
        font-size: 13px;
        font-weight: 600;
        letter-spacing: -0.01em;
        line-height: 1.35;
        white-space: nowrap;
        font-variant-numeric: tabular-nums;
      }
      .rate.down {
        color: var(--silk-accent);
      }
      .rate.up {
        color: var(--silk-upload, #e6a23c);
      }
      .spark {
        flex: 1;
        position: relative;
        min-height: 40px;
        margin: 6px -12px -12px;
      }
      .spark svg {
        position: absolute;
        inset: 0;
        display: block;
        animation: silk-network-in 300ms var(--silk-ease-out);
      }
      .mid {
        stroke: rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.15);
        stroke-width: 1;
        shape-rendering: crispedges;
      }
      .series.down {
        color: var(--silk-accent);
      }
      .series.up {
        color: var(--silk-upload, #e6a23c);
      }
      .series .line {
        fill: none;
        stroke: currentColor;
        stroke-width: 1.5;
        stroke-linecap: round;
        stroke-linejoin: round;
      }
      .series .fill {
        fill: currentColor;
        opacity: 0.1;
      }
      .unavailable .spark {
        opacity: 0.45;
      }
      @keyframes silk-network-in {
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
    'silk-network-card': SilkNetworkCard;
  }
}
