import { LitElement, html, css, nothing, PropertyValues, TemplateResult } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { HomeAssistant, LovelaceCardConfig, Point } from '../types';
import { silkControlStyles } from '../shared/base';
import { isActive, isUnavailable, moreInfo, clamp } from '../shared/service';
import { accentFor } from '../shared/color';
import { registerEditor } from '../shared/editor';
import { fetchSeries } from '../data';
import { formatNumber } from '../format';

export const META = {
  type: 'silk-minmax-card',
  name: 'Silk Range',
  description: "Today's low, high, and where you are now.",
};

export interface SilkMinmaxCardConfig extends LovelaceCardConfig {
  entity: string;
  name?: string;
  icon?: string;
  color?: string;
}

/** Today's statistics, computed from the midnight→now history window. */
interface DayStats {
  min: number;
  max: number;
  avg: number;
}

const REFRESH_INTERVAL_MS = 300_000;
const REFRESH_THROTTLE_MS = 60_000;

const EDITOR_TAG = 'silk-minmax-card-editor';

registerEditor(
  EDITOR_TAG,
  [
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
  ],
  {
    entity: '엔티티',
    name: '이름',
    icon: '아이콘',
    color: '강조 색상',
  }
);

@customElement('silk-minmax-card')
export class SilkMinmaxCard extends LitElement {
  @property({ attribute: false }) public hass?: HomeAssistant;

  @state() private _config?: SilkMinmaxCardConfig;
  @state() private _stats: DayStats | null = null;

  private _fetchStarted = false;
  private _fetchSeq = 0;
  private _lastFetch = 0;
  private _lastUpdated?: string;
  private _refreshTimer?: number;
  private _intervalTimer?: number;

  public static getStubConfig(hass: HomeAssistant): Partial<SilkMinmaxCardConfig> {
    const ids = Object.keys(hass.states).filter(
      (id) =>
        id.startsWith('sensor.') &&
        Number.isFinite(Number(hass.states[id].state)) &&
        hass.states[id].attributes.unit_of_measurement
    );
    const temp = ids.find((id) => hass.states[id].attributes.device_class === 'temperature');
    return { type: 'custom:silk-minmax-card', entity: temp ?? ids[0] };
  }

  public static async getConfigElement(): Promise<HTMLElement> {
    return document.createElement(EDITOR_TAG);
  }

  public setConfig(config: SilkMinmaxCardConfig): void {
    if (!config.entity) {
      throw new Error('silk-minmax-card: `entity` is required');
    }
    this._config = config;
    this._fetchStarted = false;
    this._stats = null;
    this._lastUpdated = undefined;
  }

  public getCardSize(): number {
    return 2;
  }

  public getGridOptions(): Record<string, number> {
    return { columns: 6, rows: 2, min_columns: 3, min_rows: 1 };
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
    const seq = ++this._fetchSeq;
    const end = Date.now() / 1000;
    const midnight = new Date();
    midnight.setHours(0, 0, 0, 0);
    const start = midnight.getTime() / 1000;
    const hours = Math.max((end - start) / 3600, 0.25);
    let data: Record<string, Point[]>;
    try {
      data = await fetchSeries(this.hass, [entity], start, end, hours);
    } catch (err) {
      console.warn('silk-minmax-card: history fetch failed', err);
      return;
    }
    if (seq !== this._fetchSeq) return; // a newer fetch superseded this one
    this._lastFetch = Date.now();
    this._stats = this._compute(data[entity] ?? [], start, end);
  }

  /**
   * Min/max over today's finite samples; average is time-weighted (a state
   * persists until the next change), so short spikes don't skew it.
   */
  private _compute(points: Point[], start: number, end: number): DayStats | null {
    let min = Infinity;
    let max = -Infinity;
    let weighted = 0;
    let known = 0;
    for (let i = 0; i < points.length; i++) {
      const v = points[i].v;
      if (!Number.isFinite(v)) continue;
      if (v < min) min = v;
      if (v > max) max = v;
      const t0 = Math.max(points[i].t, start);
      const t1 = i + 1 < points.length ? Math.min(Math.max(points[i + 1].t, start), end) : end;
      const dt = Math.max(t1 - t0, 0);
      weighted += v * dt;
      known += dt;
    }
    if (!Number.isFinite(min)) return null;
    return { min, max, avg: known > 0 ? weighted / known : (min + max) / 2 };
  }

  private _onCardClick(): void {
    if (this._config) moreInfo(this, this._config.entity);
  }

  protected render(): TemplateResult | typeof nothing {
    const config = this._config;
    if (!config) return nothing;
    const hass = this.hass;
    const stateObj = hass?.states[config.entity];
    if (hass && !stateObj) {
      return html`<ha-card><div class="warning">Entity not found: ${config.entity}</div></ha-card>`;
    }

    const unavailable = isUnavailable(stateObj);
    const current = Number(stateObj?.state);
    const hasCurrent = !unavailable && stateObj !== undefined && Number.isFinite(current);
    const accent = accentFor(stateObj, config.color);
    const unit = stateObj?.attributes.unit_of_measurement ?? '';
    const name = config.name ?? stateObj?.attributes.friendly_name ?? config.entity;

    return html`
      <ha-card
        class="control ${unavailable ? 'unavailable' : ''}"
        style="--silk-accent:${accent}"
        @click=${this._onCardClick}
      >
        <div class="top">
          <div class="icon ${!unavailable && isActive(stateObj) ? 'on' : ''}">
            ${config.icon
              ? html`<ha-icon .icon=${config.icon}></ha-icon>`
              : html`<ha-state-icon .hass=${hass} .stateObj=${stateObj}></ha-state-icon>`}
          </div>
          <div class="info"><div class="name">${name}</div></div>
          <div class="trailing">
            <span class="value">${hasCurrent ? formatNumber(hass, config.entity, current) : '—'}</span>
            ${unit ? html`<span class="unit">${unit}</span>` : nothing}
          </div>
        </div>
        ${this._renderRange(hasCurrent ? current : undefined)}
      </ha-card>
    `;
  }

  private _renderRange(current: number | undefined): TemplateResult {
    const stats = this._stats;
    const hass = this.hass;
    const entity = this._config!.entity;
    if (!stats) {
      // No history yet (still fetching, or nothing recorded today).
      return html`
        <div class="rangebar">
          <div class="rail"><div class="track"></div></div>
        </div>
      `;
    }
    // The rail spans today's range; the live reading may momentarily sit
    // outside the fetched history, so widen the rail to keep the dot honest.
    const lo = current !== undefined ? Math.min(stats.min, current) : stats.min;
    const hi = current !== undefined ? Math.max(stats.max, current) : stats.max;
    const span = hi - lo;
    const pct = (v: number): number => (span > 0 ? clamp(((v - lo) / span) * 100, 0, 100) : 50);
    const avgPct = pct(stats.avg);
    const labelPct = clamp(avgPct, 10, 90);
    const lowStr = formatNumber(hass, entity, lo);
    const highStr = formatNumber(hass, entity, hi);
    const avgStr = formatNumber(hass, entity, stats.avg);
    return html`
      <div class="rangebar">
        <span class="bound">${lowStr}</span>
        <div class="rail">
          <div class="track"></div>
          <div class="avg-tick" style="left:${avgPct}%"></div>
          <div class="avg-label" style="left:${labelPct}%">avg ${avgStr}</div>
          ${current !== undefined
            ? html`
                <div class="mover" style="transform:translateX(${pct(current)}%)">
                  <div class="dot"></div>
                </div>
              `
            : nothing}
        </div>
        <span class="bound">${highStr}</span>
      </div>
      <div class="sub">
        Low ${lowStr}<span class="sep">·</span>High ${highStr}<span class="sep">·</span>Avg
        ${avgStr}
      </div>
    `;
  }

  static styles = [
    silkControlStyles,
    css`
      ha-card {
        flex-direction: column;
        align-items: stretch;
        gap: 6px;
        justify-content: center;
      }
      .top {
        flex: none;
        display: flex;
        align-items: center;
        gap: 12px;
        min-width: 0;
      }
      /* This card has no control action: the icon presses with the card. */
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
      .rangebar {
        flex: none;
        display: flex;
        align-items: flex-end;
        gap: 8px;
        min-width: 0;
      }
      .bound {
        flex: none;
        font-size: 11px;
        line-height: 1;
        margin-bottom: 4px;
        color: var(--secondary-text-color);
        font-variant-numeric: tabular-nums;
        white-space: nowrap;
      }
      .rail {
        position: relative;
        flex: 1;
        min-width: 0;
        height: 32px;
      }
      .track {
        position: absolute;
        left: 0;
        right: 0;
        bottom: 6px;
        height: 6px;
        border-radius: 3px;
        background: rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.08);
      }
      .avg-tick {
        position: absolute;
        bottom: 3px;
        width: 2px;
        height: 12px;
        border-radius: 1px;
        transform: translateX(-50%);
        background: var(--secondary-text-color);
        opacity: 0.6;
      }
      .avg-label {
        position: absolute;
        top: 0;
        transform: translateX(-50%);
        font-size: 10px;
        line-height: 1;
        color: var(--secondary-text-color);
        font-variant-numeric: tabular-nums;
        white-space: nowrap;
        pointer-events: none;
      }
      /* Full-width carrier: translateX(p%) moves by p% of the rail, so only
         transform ever animates. */
      .mover {
        position: absolute;
        left: 0;
        right: 0;
        bottom: 0;
        height: 0;
        transition: transform 300ms var(--silk-ease-out);
        will-change: transform;
        pointer-events: none;
      }
      .dot {
        position: absolute;
        left: -5px;
        bottom: 4px;
        width: 10px;
        height: 10px;
        border-radius: 50%;
        background: var(--silk-accent);
        box-shadow: 0 0 0 2px var(--card-background-color, #fff);
        transition: background 200ms ease;
      }
      .sub {
        flex: none;
        font-size: 12px;
        line-height: 1.3;
        color: var(--secondary-text-color);
        font-variant-numeric: tabular-nums;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .sub .sep {
        opacity: 0.5;
        margin: 0 3px;
      }
      .unavailable .rangebar,
      .unavailable .sub {
        opacity: 0.45;
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    'silk-minmax-card': SilkMinmaxCard;
  }
}
