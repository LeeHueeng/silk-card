import { LitElement, html, css, nothing, PropertyValues, TemplateResult } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { HomeAssistant, HassEntity, LovelaceCardConfig, Point } from '../types';
import { silkControlStyles } from '../shared/base';
import { isUnavailable, moreInfo, haptic } from '../shared/service';
import { accentFor } from '../shared/color';
import { registerEditor } from '../shared/editor';
import { fetchSeries } from '../data';
import { resampleHold, niceDomain, toPxYs, buildLinePath } from '../graph';
import { formatNumber } from '../format';

export const META = {
  type: 'silk-compare-card',
  name: 'Silk Compare',
  description: 'Two numbers that belong side by side.',
};

export interface SilkCompareCardConfig extends LovelaceCardConfig {
  entity: string;
  entity2: string;
  name?: string;
  /** Column labels; friendly names by default. */
  label?: string;
  label2?: string;
  /** Accent override for the first series. */
  color?: string;
  /** Second series color; the restrained amber by default. */
  color2?: string;
  hours_to_show?: number;
}

const DEFAULT_COLOR2 = '#e6a23c';
const DEFAULT_HOURS = 24;
const POINTS = 60;
const SPARK_H = 36;
const SPARK_PAD = 3;
const REFRESH_INTERVAL_MS = 300_000;
const REFRESH_THROTTLE_MS = 60_000;

const EDITOR_TAG = 'silk-compare-card-editor';

registerEditor(
  EDITOR_TAG,
  [
    {
      name: 'entity',
      required: true,
      selector: { entity: { domain: ['sensor', 'number', 'input_number'] } },
    },
    {
      name: 'entity2',
      required: true,
      selector: { entity: { domain: ['sensor', 'number', 'input_number'] } },
    },
    { name: 'name', selector: { text: {} } },
    {
      name: '',
      type: 'grid',
      schema: [
        { name: 'label', selector: { text: {} } },
        { name: 'label2', selector: { text: {} } },
        { name: 'color', selector: { ui_color: {} } },
        { name: 'color2', selector: { ui_color: {} } },
      ],
    },
    { name: 'hours_to_show', selector: { number: { min: 1, max: 168, step: 1, mode: 'box' } } },
  ],
  {
    entity: '첫 번째 엔티티',
    entity2: '두 번째 엔티티',
    name: '이름',
    label: '첫 번째 이름표',
    label2: '두 번째 이름표',
    color: '강조 색상',
    color2: '두 번째 색상',
    hours_to_show: '표시 시간',
  },
  { hours_to_show: DEFAULT_HOURS }
);

@customElement('silk-compare-card')
export class SilkCompareCard extends LitElement {
  @property({ attribute: false }) public hass?: HomeAssistant;

  @state() private _config?: SilkCompareCardConfig;
  @state() private _width = 0;
  @state() private _rev = 0;

  private _vals1: Float64Array | null = null;
  private _vals2: Float64Array | null = null;
  private _fetchStarted = false;
  private _fetchSeq = 0;
  private _lastFetch = 0;
  private _lastStamp = '';
  private _refreshTimer?: number;
  private _intervalTimer?: number;
  private _resizeObserver?: ResizeObserver;

  public static getStubConfig(hass: HomeAssistant): Partial<SilkCompareCardConfig> {
    const ids = Object.keys(hass.states).filter(
      (id) => id.startsWith('sensor.') && Number.isFinite(Number(hass.states[id].state))
    );
    const temps = ids.filter((id) => hass.states[id].attributes.device_class === 'temperature');
    const pool = temps.length >= 2 ? temps : ids;
    return { type: 'custom:silk-compare-card', entity: pool[0], entity2: pool[1] };
  }

  public static async getConfigElement(): Promise<HTMLElement> {
    return document.createElement(EDITOR_TAG);
  }

  public setConfig(config: SilkCompareCardConfig): void {
    if (!config.entity || !config.entity2) {
      throw new Error('silk-compare-card: `entity` and `entity2` are required');
    }
    if (config.hours_to_show !== undefined && !(Number(config.hours_to_show) > 0)) {
      throw new Error('silk-compare-card: `hours_to_show` must be a positive number');
    }
    this._config = config;
    this._fetchStarted = false;
    this._vals1 = null;
    this._vals2 = null;
    this._lastStamp = '';
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
      const width = entries[0].contentRect.width;
      if (width !== this._width) this._width = width;
    });
    this._resizeObserver.observe(spark);
  }

  /** Refetch when either entity records a new state, throttled to 60s. */
  private _onStatesChanged(): void {
    const config = this._config!;
    const a = this.hass?.states[config.entity]?.last_updated ?? '';
    const b = this.hass?.states[config.entity2]?.last_updated ?? '';
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
    const { entity, entity2 } = this._config;
    const hours = this._config.hours_to_show ?? DEFAULT_HOURS;
    const seq = ++this._fetchSeq;
    const end = Date.now() / 1000;
    const start = end - hours * 3600;
    let data: Record<string, Point[]>;
    try {
      data = await fetchSeries(this.hass, [entity, entity2], start, end, hours);
    } catch (err) {
      console.warn('silk-compare-card: history fetch failed', err);
      return;
    }
    if (seq !== this._fetchSeq) return; // a newer fetch superseded this one
    this._lastFetch = Date.now();
    this._vals1 = resampleHold(data[entity] ?? [], start, end, POINTS);
    this._vals2 = resampleHold(data[entity2] ?? [], start, end, POINTS);
    this._rev++;
  }

  private _valueOf(stateObj: HassEntity | undefined): number {
    if (!stateObj || isUnavailable(stateObj)) return NaN;
    return Number(stateObj.state);
  }

  /** `Δ 3.1°` — signed with a true minus, unit only when both sides share it. */
  private _deltaText(v1: number, v2: number, unit1: string, unit2: string): string {
    if (!Number.isFinite(v1) || !Number.isFinite(v2)) return 'Δ —';
    const delta = v1 - v2;
    const unit = unit1 && unit1 === unit2 ? (unit1.startsWith('°') ? '°' : ` ${unit1}`) : '';
    const num = formatNumber(this.hass, this._config!.entity, Math.abs(delta));
    return `Δ ${delta < 0 ? '−' : ''}${num}${unit}`;
  }

  private _onTap(): void {
    if (!this._config) return;
    haptic(this);
    moreInfo(this, this._config.entity);
  }

  protected render(): TemplateResult | typeof nothing {
    const config = this._config;
    if (!config) return nothing;
    void this._rev; // reactive dependency for fetched sparkline data
    const hass = this.hass;
    const a = hass?.states[config.entity];
    const b = hass?.states[config.entity2];
    if (hass && (!a || !b)) {
      return html`<ha-card
        ><div class="warning">Entity not found: ${!a ? config.entity : config.entity2}</div></ha-card
      >`;
    }

    const unavailable = isUnavailable(a) && isUnavailable(b);
    const accent = accentFor(a, config.color);
    const color2 = config.color2 ?? DEFAULT_COLOR2;
    const label1 = config.label ?? a?.attributes.friendly_name ?? config.entity;
    const label2 = config.label2 ?? b?.attributes.friendly_name ?? config.entity2;
    const unit1 = a?.attributes.unit_of_measurement ?? '';
    const unit2 = b?.attributes.unit_of_measurement ?? '';
    const v1 = this._valueOf(a);
    const v2 = this._valueOf(b);

    return html`
      <ha-card
        class="control ${unavailable ? 'unavailable' : ''}"
        style="--silk-accent:${accent};--silk-c2:${color2}"
        @click=${this._onTap}
      >
        ${config.name ? html`<div class="title" title=${config.name}>${config.name}</div>` : nothing}
        <div class="cols">
          <div class="col">
            <div class="label">
              <span class="dot a"></span><span class="text">${label1}</span>
            </div>
            <div class="reading">
              <span class="big">${Number.isFinite(v1) ? formatNumber(hass, config.entity, v1) : '—'}</span>
              ${unit1 ? html`<span class="unit">${unit1}</span>` : nothing}
            </div>
          </div>
          <div class="rule"></div>
          <div class="col">
            <div class="label">
              <span class="dot b"></span><span class="text">${label2}</span>
            </div>
            <div class="reading">
              <span class="big">${Number.isFinite(v2) ? formatNumber(hass, config.entity2, v2) : '—'}</span>
              ${unit2 ? html`<span class="unit">${unit2}</span>` : nothing}
            </div>
          </div>
        </div>
        <div class="delta">${this._deltaText(v1, v2, unit1, unit2)}</div>
        <div class="spark">${this._renderSpark()}</div>
      </ha-card>
    `;
  }

  private _renderSpark(): TemplateResult | typeof nothing {
    const w = this._width;
    const vals1 = this._vals1;
    const vals2 = this._vals2;
    if (!w || !vals1 || !vals2) return nothing;
    // One shared domain so the two lines are honestly comparable.
    const domain = niceDomain([vals1, vals2]);
    const ys1 = toPxYs(vals1, domain, SPARK_H, SPARK_PAD, SPARK_PAD);
    const ys2 = toPxYs(vals2, domain, SPARK_H, SPARK_PAD, SPARK_PAD);
    return html`
      <svg viewBox="0 0 ${w} ${SPARK_H}" width=${w} height=${SPARK_H} aria-hidden="true">
        <path class="line b" d=${buildLinePath(ys2, w)}></path>
        <path class="line a" d=${buildLinePath(ys1, w)}></path>
      </svg>
    `;
  }

  static styles = [
    silkControlStyles,
    css`
      ha-card {
        flex-direction: column;
        align-items: stretch;
        justify-content: center;
        gap: 0;
        transition: transform 250ms var(--silk-spring);
      }
      ha-card:active {
        transform: scale(0.97);
        transition-duration: 120ms;
        transition-timing-function: var(--silk-ease-out);
      }
      .title {
        flex: none;
        font-size: 12.5px;
        font-weight: 500;
        line-height: 1.3;
        color: var(--secondary-text-color);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        margin-bottom: 4px;
      }
      .cols {
        flex: 1;
        display: flex;
        align-items: center;
        min-height: 0;
        min-width: 0;
      }
      .col {
        flex: 1 1 0;
        min-width: 0;
        text-align: center;
      }
      .rule {
        flex: none;
        align-self: stretch;
        width: 1px;
        margin: 2px 0;
        background: rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.12);
      }
      .label {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 5px;
        min-width: 0;
        font-size: 11px;
        line-height: 1.3;
        color: var(--secondary-text-color);
      }
      .label .text {
        min-width: 0;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .dot {
        flex: none;
        width: 6px;
        height: 6px;
        border-radius: 50%;
      }
      .dot.a {
        background: var(--silk-accent);
      }
      .dot.b {
        background: var(--silk-c2, #e6a23c);
      }
      .reading {
        margin-top: 1px;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .big {
        font-size: 22px;
        font-weight: 600;
        letter-spacing: -0.02em;
        line-height: 1.2;
        color: var(--primary-text-color);
        font-variant-numeric: tabular-nums;
      }
      .reading .unit {
        margin-left: 3px;
      }
      .delta {
        flex: none;
        align-self: center;
        margin: 4px 0 2px;
        padding: 1px 8px;
        border-radius: 999px;
        font-size: 12px;
        line-height: 1.4;
        color: var(--secondary-text-color);
        background: rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.05);
        font-variant-numeric: tabular-nums;
        white-space: nowrap;
      }
      .spark {
        flex: none;
        height: ${SPARK_H}px;
        margin: 2px -12px -12px;
      }
      .spark svg {
        display: block;
        animation: silk-compare-in 300ms var(--silk-ease-out);
      }
      .line {
        fill: none;
        stroke-width: 1.5;
        stroke-linecap: round;
        stroke-linejoin: round;
      }
      .line.a {
        stroke: var(--silk-accent);
      }
      .line.b {
        stroke: var(--silk-c2, #e6a23c);
      }
      .unavailable .cols,
      .unavailable .delta,
      .unavailable .spark {
        opacity: 0.45;
      }
      @keyframes silk-compare-in {
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
    'silk-compare-card': SilkCompareCard;
  }
}
