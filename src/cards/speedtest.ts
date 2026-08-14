import { LitElement, html, css, nothing, PropertyValues, TemplateResult } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { HomeAssistant, HassEntity, LovelaceCardConfig, Point } from '../types';
import { silkControlStyles } from '../shared/base';
import { isUnavailable, moreInfo, haptic, toggleEntity } from '../shared/service';
import { accentFor } from '../shared/color';
import { registerEditor } from '../shared/editor';
import { fetchSeries } from '../data';
import { resampleHold, niceDomain, toPxYs, buildLinePath } from '../graph';
import { formatNumber } from '../format';

export const META = {
  type: 'silk-speedtest-card',
  name: 'Silk Speedtest',
  description: 'Down, up, ping — and a button to redo it.',
};

export interface SilkSpeedtestCardConfig extends LovelaceCardConfig {
  /** Download rate sensor (Mbit/s). */
  download: string;
  /** Upload rate sensor (Mbit/s). */
  upload: string;
  /** Latency sensor (ms). */
  ping?: string;
  /** button / script / switch that kicks off a fresh test. */
  run?: string;
  name?: string;
  hours_to_show?: number;
  /** Accent override for the download column and the sparkline. */
  color?: string;
  /** Upload column color; the suite's restrained amber by default. */
  upload_color?: string;
}

const DEFAULT_NAME = 'Internet';
const DEFAULT_UPLOAD_COLOR = '#e6a23c';
const DEFAULT_HOURS = 168;
const POINTS = 80;
/** Breathing room above and below the sparkline peak, px. */
const PAD = 2;
/** Past this age the readings describe yesterday's internet, not today's. */
const STALE_MS = 86_400_000;
const REFRESH_INTERVAL_MS = 300_000;
const REFRESH_THROTTLE_MS = 60_000;
const OPTIMISTIC_TIMEOUT_MS = 2000;

const EDITOR_TAG = 'silk-speedtest-card-editor';

registerEditor(
  EDITOR_TAG,
  [
    { name: 'download', required: true, selector: { entity: { domain: ['sensor'] } } },
    { name: 'upload', required: true, selector: { entity: { domain: ['sensor'] } } },
    { name: 'ping', selector: { entity: { domain: ['sensor'] } } },
    { name: 'run', selector: { entity: { domain: ['button', 'input_button', 'script', 'switch'] } } },
    { name: 'name', selector: { text: {} } },
    { name: 'hours_to_show', selector: { number: { min: 1, max: 8760, step: 1, mode: 'box' } } },
    {
      name: '',
      type: 'grid',
      schema: [
        { name: 'color', selector: { ui_color: {} } },
        { name: 'upload_color', selector: { ui_color: {} } },
      ],
    },
  ],
  {
    download: '다운로드 엔티티',
    upload: '업로드 엔티티',
    ping: '핑 엔티티',
    run: '테스트 실행 엔티티',
    name: '이름',
    hours_to_show: '표시 시간',
    color: '강조 색상',
    upload_color: '업로드 색상',
  },
  { name: DEFAULT_NAME, hours_to_show: DEFAULT_HOURS }
);

/** Numeric state, NaN when the entity is missing/unavailable/non-numeric. */
function numericState(stateObj?: HassEntity): number {
  if (!stateObj || isUnavailable(stateObj) || stateObj.state === '') return NaN;
  return Number(stateObj.state);
}

@customElement('silk-speedtest-card')
export class SilkSpeedtestCard extends LitElement {
  @property({ attribute: false }) public hass?: HomeAssistant;

  @state() private _config?: SilkSpeedtestCardConfig;
  @state() private _width = 0;
  @state() private _height = 0;
  @state() private _rev = 0;
  /** Optimistic "a test is running" between our service call and the real state. */
  @state() private _optimisticRun = false;

  private _vals: Float64Array | null = null;
  private _fetchStarted = false;
  private _fetchSeq = 0;
  private _lastFetch = 0;
  private _lastStamp = '';
  private _optimisticBase = '';
  private _optimisticTimer?: number;
  private _refreshTimer?: number;
  private _intervalTimer?: number;
  private _resizeObserver?: ResizeObserver;

  public static getStubConfig(hass: HomeAssistant): Partial<SilkSpeedtestCardConfig> {
    const ids = Object.keys(hass.states);
    const sensors = ids.filter(
      (id) => id.startsWith('sensor.') && Number.isFinite(Number(hass.states[id].state))
    );
    const speed = sensors.filter((id) => /speedtest|speed_test/.test(id));
    const pool = speed.length ? speed : sensors;
    const download = pool.find((id) => /down/.test(id)) ?? pool[0];
    const upload = pool.find((id) => id !== download && /up/.test(id));
    return {
      type: 'custom:silk-speedtest-card',
      download,
      upload,
      ping: pool.find((id) => /ping|latency/.test(id)),
      run: ids.find((id) => /^(button|switch|script)\..*(speedtest|speed_test)/.test(id)),
    };
  }

  public static async getConfigElement(): Promise<HTMLElement> {
    return document.createElement(EDITOR_TAG);
  }

  public setConfig(config: SilkSpeedtestCardConfig): void {
    if (!config.download || !config.upload) {
      throw new Error('silk-speedtest-card: `download` and `upload` are required');
    }
    if (config.hours_to_show !== undefined && !(Number(config.hours_to_show) > 0)) {
      throw new Error('silk-speedtest-card: `hours_to_show` must be a positive number');
    }
    this._config = config;
    this._fetchStarted = false;
    this._vals = null;
    this._lastStamp = '';
    this._clearOptimistic();
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
    window.clearTimeout(this._optimisticTimer);
    this._refreshTimer = undefined;
    this._optimisticTimer = undefined;
    this._resizeObserver?.disconnect();
    this._resizeObserver = undefined;
  }

  protected willUpdate(changed: PropertyValues): void {
    if (!this.hass || !this._config) return;
    if (changed.has('hass') && this._optimisticRun) {
      const stamp = this.hass.states[this._config.run ?? '']?.last_updated;
      if (stamp && stamp !== this._optimisticBase) this._clearOptimistic();
    }
    if (!this._fetchStarted) {
      this._fetchStarted = true;
      this._refresh();
      return;
    }
    if (changed.has('hass')) this._onStatesChanged();
  }

  protected updated(): void {
    if (this._resizeObserver) return;
    const plot = this.renderRoot.querySelector('.plot');
    if (!plot) return;
    this._resizeObserver = new ResizeObserver((entries) => {
      const rect = entries[entries.length - 1].contentRect;
      if (rect.width === this._width && rect.height === this._height) return;
      this._width = rect.width;
      this._height = rect.height;
    });
    this._resizeObserver.observe(plot);
  }

  /** Refetch when a fresh result lands, throttled to 60s. */
  private _onStatesChanged(): void {
    const stamp = this.hass?.states[this._config!.download]?.last_updated ?? '';
    if (!stamp || stamp === this._lastStamp) return;
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
    const entity = this._config.download;
    const hours = this._config.hours_to_show ?? DEFAULT_HOURS;
    const seq = ++this._fetchSeq;
    const end = Date.now() / 1000;
    const start = end - hours * 3600;
    let data: Record<string, Point[]>;
    try {
      data = await fetchSeries(this.hass, [entity], start, end, hours);
    } catch (err) {
      console.warn('silk-speedtest-card: history fetch failed', err);
      return;
    }
    if (seq !== this._fetchSeq) return; // a newer fetch superseded this one
    this._lastFetch = Date.now();
    this._vals = resampleHold(data[entity] ?? [], start, end, POINTS);
    this._rev++;
  }

  private _clearOptimistic(): void {
    window.clearTimeout(this._optimisticTimer);
    this._optimisticTimer = undefined;
    this._optimisticRun = false;
  }

  /**
   * Scene-like domains report a timestamp (or `unknown` before first use) and
   * stay perfectly pressable, so only a literal `unavailable` disables the button.
   */
  private _runDisabled(runObj?: HassEntity): boolean {
    return !runObj || runObj.state === 'unavailable';
  }

  private _onRun(ev: Event): void {
    ev.stopPropagation();
    const config = this._config;
    const hass = this.hass;
    if (!config?.run || !hass) return;
    const runObj = hass.states[config.run];
    if (this._runDisabled(runObj)) return;
    haptic(this);
    this._flash();
    // Optimistic: spin straight away; the real state (or a 2s timeout, for
    // buttons that never report `on`) takes the display back over.
    this._optimisticRun = true;
    this._optimisticBase = runObj!.last_updated;
    window.clearTimeout(this._optimisticTimer);
    this._optimisticTimer = window.setTimeout(() => {
      this._optimisticTimer = undefined;
      this._optimisticRun = false;
    }, OPTIMISTIC_TIMEOUT_MS);
    toggleEntity(hass, config.run);
  }

  /** Restart the accent surface wash: remove the class, reflow, re-add. */
  private _flash(): void {
    const el = this.renderRoot.querySelector<HTMLElement>('.flash');
    if (!el) return;
    el.classList.remove('go');
    void el.offsetWidth; // force reflow so the animation restarts
    el.classList.add('go');
  }

  private _onCardClick(): void {
    if (this._config) moreInfo(this, this._config.download);
  }

  /** `7d` for the default window, `36h` for short ones. */
  private _windowLabel(): string {
    const hours = Math.round(this._config?.hours_to_show ?? DEFAULT_HOURS);
    if (hours >= 48 && hours % 24 === 0) return `${hours / 24}d`;
    return `${hours}h`;
  }

  private _column(
    label: string,
    cls: string,
    entityId: string | undefined,
    stateObj: HassEntity | undefined,
    fallbackUnit: string
  ): TemplateResult {
    const value = numericState(stateObj);
    // The entity's own unit stays authoritative; the fallback only fills a gap.
    const unit = (stateObj?.attributes.unit_of_measurement as string | undefined) ?? fallbackUnit;
    return html`
      <div class="col ${cls}">
        <span class="col-label">${label}</span>
        <span class="col-value"
          >${Number.isFinite(value) && entityId ? formatNumber(this.hass, entityId, value) : '—'}</span
        >
        <span class="col-unit">${unit}</span>
      </div>
    `;
  }

  private _renderSpark(): TemplateResult | typeof nothing {
    const w = this._width;
    const h = this._height;
    const vals = this._vals;
    if (!w || !h || !vals) return nothing;
    const ys = toPxYs(vals, niceDomain([vals]), h, PAD, PAD);
    const d = buildLinePath(ys, w);
    if (!d) return nothing;
    return html`
      <svg viewBox="0 0 ${w} ${h}" width=${w} height=${h} aria-hidden="true">
        <path class="line" d=${d}></path>
      </svg>
    `;
  }

  protected render(): TemplateResult | typeof nothing {
    const config = this._config;
    if (!config) return nothing;
    void this._rev; // reactive dependency for the fetched sparkline data
    const hass = this.hass;
    const down = hass?.states[config.download];
    const up = hass?.states[config.upload];
    if (hass && (!down || !up)) {
      return html`<ha-card
        ><div class="warning">Entity not found: ${!down ? config.download : config.upload}</div></ha-card
      >`;
    }

    const ping = config.ping ? hass?.states[config.ping] : undefined;
    const runObj = config.run ? hass?.states[config.run] : undefined;
    const unavailable = isUnavailable(down) && isUnavailable(up);
    const accent = accentFor(down, config.color);
    const name = config.name ?? DEFAULT_NAME;

    const stamp = down ? Date.parse(down.last_updated) : NaN;
    const stale = Number.isFinite(stamp) && Date.now() - stamp > STALE_MS;
    const caption = stale ? `${this._windowLabel()} · stale` : this._windowLabel();
    const running = this._optimisticRun || runObj?.state === 'on';

    return html`
      <ha-card
        class="control ${unavailable ? 'unavailable' : ''}"
        style="--silk-accent:${accent};--silk-upload:${config.upload_color ?? DEFAULT_UPLOAD_COLOR}"
        @click=${this._onCardClick}
      >
        <div class="flash"></div>
        <div class="head">
          <div class="name" title=${name}>${name}</div>
          ${config.run
            ? html`
                <button
                  class="run"
                  aria-label="Run speed test"
                  .disabled=${this._runDisabled(runObj)}
                  @click=${this._onRun}
                >
                  <ha-icon class=${running ? 'spin' : ''} icon="mdi:reload"></ha-icon>
                </button>
              `
            : nothing}
        </div>
        <div class="cols ${stale ? 'stale' : ''}">
          ${this._column('Download', 'down', config.download, down, 'Mbps')}
          ${this._column('Upload', 'up', config.upload, up, 'Mbps')}
          ${config.ping ? this._column('Ping', 'ping', config.ping, ping, 'ms') : nothing}
        </div>
        <div class="spark">
          <span class="caption">${caption}</span>
          <div class="plot">${this._renderSpark()}</div>
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
        justify-content: center;
        gap: 3px;
      }
      .head,
      .cols,
      .spark {
        position: relative;
        z-index: 1;
      }
      .head {
        flex: none;
        display: flex;
        align-items: center;
        gap: 8px;
        min-width: 0;
      }
      .head .name {
        flex: 1;
        min-width: 0;
      }
      .run {
        flex: none;
        width: 36px;
        height: 36px;
        /* Full 36px target, but it only claims 28px of row so the chart keeps its height. */
        margin: -4px -4px -4px 0;
        border: none;
        border-radius: 12px;
        display: grid;
        place-items: center;
        padding: 0;
        cursor: pointer;
        color: var(--secondary-text-color);
        background: rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.06);
        transition:
          transform 250ms var(--silk-spring),
          background 200ms ease,
          color 200ms ease;
      }
      .run:hover {
        color: var(--silk-accent);
      }
      .run:active {
        transform: scale(0.9);
        transition-duration: 120ms;
        transition-timing-function: var(--silk-ease-out);
      }
      .run:focus-visible {
        outline: 2px solid color-mix(in srgb, var(--silk-accent) 70%, transparent);
        outline-offset: 2px;
      }
      .run:disabled {
        cursor: default;
        opacity: 0.45;
      }
      .run ha-icon {
        --mdc-icon-size: 18px;
        pointer-events: none;
      }
      /* Spins only while a test is genuinely running — real activity, not decor. */
      .run ha-icon.spin {
        animation: silk-speedtest-spin 900ms linear infinite;
      }
      .cols {
        flex: none;
        display: flex;
        align-items: stretch;
        min-width: 0;
        transition: opacity 200ms ease;
      }
      .cols.stale {
        opacity: 0.6;
      }
      .col {
        flex: 1;
        min-width: 0;
        display: flex;
        flex-direction: column;
        padding-right: 8px;
      }
      /* Recessive 1px rules, the only division these three numbers need. */
      .col + .col {
        padding-left: 8px;
        border-left: 1px solid rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.12);
      }
      .col-label {
        font-size: 10px;
        line-height: 11px;
        color: var(--secondary-text-color);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .col-value {
        font-size: 22px;
        font-weight: 600;
        line-height: 24px;
        letter-spacing: -0.02em;
        font-variant-numeric: tabular-nums;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .col-unit {
        font-size: 10px;
        line-height: 11px;
        color: var(--secondary-text-color);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .col.down .col-value {
        color: var(--silk-accent);
      }
      .col.up .col-value {
        color: var(--silk-upload, #e6a23c);
      }
      .col.ping .col-value {
        color: var(--secondary-text-color);
      }
      /* Nominal 30px of chart; it yields first when the card is squeezed. */
      .spark {
        flex: 1 1 30px;
        min-height: 20px;
        display: flex;
        align-items: flex-end;
        gap: 6px;
        margin-bottom: -6px;
      }
      .caption {
        flex: none;
        font-size: 9px;
        line-height: 1;
        padding-bottom: 1px;
        color: var(--primary-text-color);
        opacity: 0.45;
        font-variant-numeric: tabular-nums;
        white-space: nowrap;
      }
      .plot {
        position: relative;
        flex: 1;
        min-width: 0;
        align-self: stretch;
      }
      .plot svg {
        position: absolute;
        inset: 0;
        display: block;
        animation: silk-speedtest-in 300ms var(--silk-ease-out);
      }
      .line {
        fill: none;
        stroke: var(--silk-accent);
        stroke-width: 1.5;
        stroke-linecap: round;
        stroke-linejoin: round;
      }
      /* Success feedback = a brief accent surface wash, never a glow shadow. */
      .flash {
        position: absolute;
        inset: 0;
        background: var(--silk-accent);
        opacity: 0;
        pointer-events: none;
        z-index: 0;
      }
      .flash.go {
        animation: silk-speedtest-flash 400ms var(--silk-ease-out);
      }
      .unavailable .spark {
        opacity: 0.45;
      }
      @keyframes silk-speedtest-flash {
        0% {
          opacity: 0;
        }
        35% {
          opacity: 0.15;
        }
        100% {
          opacity: 0;
        }
      }
      @keyframes silk-speedtest-spin {
        to {
          transform: rotate(360deg);
        }
      }
      @keyframes silk-speedtest-in {
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
    'silk-speedtest-card': SilkSpeedtestCard;
  }
}
