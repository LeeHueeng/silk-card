import { LitElement, html, css, nothing, PropertyValues, TemplateResult } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { HomeAssistant, HassEntity, LovelaceCardConfig, Point } from '../types';
import { silkControlStyles } from '../shared/base';
import { isUnavailable, moreInfo, haptic, clamp } from '../shared/service';
import { registerEditor } from '../shared/editor';
import { fetchSeries } from '../data';
import { resampleHold } from '../graph';

export const META = {
  type: 'silk-mold-card',
  name: 'Silk Mold Risk',
  description: 'The wall is colder than you think.',
};

export interface SilkMoldCardConfig extends LovelaceCardConfig {
  indoor_temp: string;
  indoor_humidity: string;
  outdoor_temp: string;
  name?: string;
  icon?: string;
  /** 0 = uninsulated (wall sits at outdoor temp), 1 = perfect (wall at indoor). */
  insulation?: number;
}

const INSULATION_DEFAULT = 0.8;

/** Surface RH bands. Mold germinates around 80% RH sustained over days. */
const WATCH_RH = 70;
const RISK_RH = 80;

/** Ventilating only dries the room when outside air is this much colder. */
const VENT_DELTA_C = 5;

const HOURS = 24;
/** 15-minute buckets across the day. */
const SAMPLES = 96;

const REFRESH_INTERVAL_MS = 600_000;
const REFRESH_THROTTLE_MS = 120_000;

type Band = 'safe' | 'watch' | 'risk';

const BAND_WORD: Record<Band, string> = { safe: 'Safe', watch: 'Watch', risk: 'At risk' };

// A mold verdict is genuine status, which is the one sanctioned use of
// success/warning/error chroma in Silk.
const BAND_COLOR: Record<Band, string> = {
  safe: 'var(--success-color, #57ad60)',
  watch: 'var(--warning-color, #e6a23c)',
  risk: 'var(--error-color, #db4437)',
};

/**
 * Saturation vapour pressure over water, hPa (Magnus form, Sonntag 1990
 * coefficients b = 17.62, c = 243.12 °C). Only ratios of it are used here,
 * so the 6.112 hPa reference cancels out.
 */
function psat(tC: number): number {
  return 6.112 * Math.exp((17.62 * tC) / (243.12 + tC));
}

/**
 * Inside-surface temperature of an exterior wall. `f` is the share of the
 * indoor-to-outdoor drop the insulation holds back: f = 1 keeps the wall at
 * room temperature, f = 0 lets it sit at the outdoor temperature.
 */
function surfaceTempC(indoorC: number, outdoorC: number, f: number): number {
  return indoorC - (1 - f) * (indoorC - outdoorC);
}

/**
 * Relative humidity at that colder surface. The air's absolute moisture is
 * unchanged, so RH rises by the ratio of saturation pressures — this is why a
 * comfortable 55% room can still condense on the wall behind the wardrobe.
 */
function surfaceRh(indoorC: number, indoorRh: number, surfaceC: number): number {
  return clamp((indoorRh * psat(indoorC)) / psat(surfaceC), 0, 100);
}

function bandOf(rh: number): Band {
  if (rh < WATCH_RH) return 'safe';
  if (rh < RISK_RH) return 'watch';
  return 'risk';
}

const isFahrenheit = (unit: string | undefined): boolean => !!unit && unit.toUpperCase().includes('F');

const toCelsius = (v: number, unit: string | undefined): number =>
  isFahrenheit(unit) ? ((v - 32) * 5) / 9 : v;

const EDITOR_TAG = 'silk-mold-card-editor';

registerEditor(
  EDITOR_TAG,
  [
    {
      name: 'indoor_temp',
      required: true,
      selector: { entity: { domain: ['sensor'], device_class: ['temperature'] } },
    },
    {
      name: 'indoor_humidity',
      required: true,
      selector: { entity: { domain: ['sensor'], device_class: ['humidity'] } },
    },
    {
      name: 'outdoor_temp',
      required: true,
      selector: { entity: { domain: ['sensor'], device_class: ['temperature'] } },
    },
    { name: 'name', selector: { text: {} } },
    { name: 'icon', selector: { icon: {} } },
    { name: 'insulation', selector: { number: { min: 0, max: 1, step: 0.05, mode: 'slider' } } },
  ],
  {
    indoor_temp: '실내 온도',
    indoor_humidity: '실내 습도',
    outdoor_temp: '실외 온도',
    name: '이름',
    icon: '아이콘',
    insulation: '단열 계수 (1 = 단열 우수)',
  },
  { insulation: INSULATION_DEFAULT }
);

@customElement('silk-mold-card')
export class SilkMoldCard extends LitElement {
  @property({ attribute: false }) public hass?: HomeAssistant;

  @state() private _config?: SilkMoldCardConfig;
  /** Hours in the last 24 with the surface at or above the risk threshold. */
  @state() private _riskHours: number | null = null;
  @state() private _noHistory = false;

  private _fetchStarted = false;
  private _fetchSeq = 0;
  private _lastFetch = 0;
  private _stamps = '';
  private _refreshTimer?: number;
  private _intervalTimer?: number;

  public static getStubConfig(hass: HomeAssistant): Partial<SilkMoldCardConfig> {
    const ids = Object.keys(hass.states).filter((id) => id.startsWith('sensor.'));
    const ofClass = (cls: string): string[] =>
      ids.filter((id) => hass.states[id].attributes.device_class === cls);
    const temps = ofClass('temperature');
    const outdoorish = /out(door|side)|extern|balcon|garden/i;
    const outdoor = temps.find(
      (id) => outdoorish.test(id) || outdoorish.test(String(hass.states[id].attributes.friendly_name ?? ''))
    );
    const indoor = temps.find((id) => id !== outdoor);
    return {
      type: 'custom:silk-mold-card',
      indoor_temp: indoor,
      indoor_humidity: ofClass('humidity')[0],
      outdoor_temp: outdoor ?? temps.find((id) => id !== indoor),
    };
  }

  public static async getConfigElement(): Promise<HTMLElement> {
    return document.createElement(EDITOR_TAG);
  }

  public setConfig(config: SilkMoldCardConfig): void {
    for (const key of ['indoor_temp', 'indoor_humidity', 'outdoor_temp'] as const) {
      if (!config[key]) {
        throw new Error(`silk-mold-card: \`${key}\` is required`);
      }
    }
    if (
      config.insulation !== undefined &&
      (!Number.isFinite(config.insulation) || config.insulation < 0 || config.insulation > 1)
    ) {
      throw new Error('silk-mold-card: `insulation` must be a number between 0 and 1');
    }
    this._config = config;
    this._riskHours = null;
    this._noHistory = false;
    this._fetchStarted = false;
    this._stamps = '';
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
    if (this.hasUpdated && this._fetchStarted) this._refresh();
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

  /** Refetch when any input records a new state, throttled to two minutes. */
  private _onStatesChanged(): void {
    const config = this._config!;
    const stamps = [config.indoor_temp, config.indoor_humidity, config.outdoor_temp]
      .map((id) => this.hass?.states[id]?.last_updated ?? '')
      .join('|');
    if (stamps === '||' || stamps === this._stamps) return;
    this._stamps = stamps;
    if (this._refreshTimer) return;
    const wait = Math.max(0, REFRESH_THROTTLE_MS - (Date.now() - this._lastFetch));
    this._refreshTimer = window.setTimeout(() => {
      this._refreshTimer = undefined;
      this._refresh();
    }, wait);
  }

  private _insulation(): number {
    return clamp(this._config?.insulation ?? INSULATION_DEFAULT, 0, 1);
  }

  private _unitOf(entityId: string): string | undefined {
    return this.hass?.states[entityId]?.attributes.unit_of_measurement as string | undefined;
  }

  /** Replays the day through the same model to see how long the wall was wet. */
  private async _refresh(): Promise<void> {
    const hass = this.hass;
    const config = this._config;
    if (!hass || !config) return;
    const ids = [config.indoor_temp, config.indoor_humidity, config.outdoor_temp];
    const seq = ++this._fetchSeq;
    const end = Date.now() / 1000;
    const start = end - HOURS * 3600;
    let data: Record<string, Point[]>;
    try {
      data = await fetchSeries(hass, ids, start, end, HOURS);
    } catch (err) {
      console.warn('silk-mold-card: history fetch failed', err);
      if (seq === this._fetchSeq) {
        this._noHistory = true;
        this._riskHours = null;
      }
      return;
    }
    if (seq !== this._fetchSeq) return; // a newer fetch superseded this one
    this._lastFetch = Date.now();
    const tIn = resampleHold(data[config.indoor_temp] ?? [], start, end, SAMPLES);
    const rhIn = resampleHold(data[config.indoor_humidity] ?? [], start, end, SAMPLES);
    const tOut = resampleHold(data[config.outdoor_temp] ?? [], start, end, SAMPLES);
    const inUnit = this._unitOf(config.indoor_temp);
    const outUnit = this._unitOf(config.outdoor_temp);
    const f = this._insulation();
    let hot = 0;
    let known = 0;
    for (let i = 0; i < SAMPLES; i++) {
      if (!Number.isFinite(tIn[i]) || !Number.isFinite(rhIn[i]) || !Number.isFinite(tOut[i])) continue;
      known++;
      const indoorC = toCelsius(tIn[i], inUnit);
      const rh = surfaceRh(indoorC, rhIn[i], surfaceTempC(indoorC, toCelsius(tOut[i], outUnit), f));
      if (rh >= RISK_RH) hot++;
    }
    this._noHistory = false;
    this._riskHours = known ? (hot * HOURS) / SAMPLES : null;
  }

  private _locale(): string {
    return this.hass?.locale?.language ?? this.hass?.language ?? 'en';
  }

  private _num(value: number, digits = 1): string {
    return new Intl.NumberFormat(this._locale(), { maximumFractionDigits: digits }).format(value);
  }

  private _onCardClick(): void {
    if (!this._config) return;
    haptic(this);
    moreInfo(this, this._config.indoor_humidity);
  }

  private _onChipClick(ev: Event, entityId: string): void {
    ev.stopPropagation();
    haptic(this);
    moreInfo(this, entityId);
  }

  private _chip(label: string, reading: string, entityId: string): TemplateResult {
    return html`
      <button
        class="chip"
        aria-label=${`${label}: ${reading}`}
        title=${`${label} · ${reading}`}
        @click=${(ev: Event) => this._onChipClick(ev, entityId)}
      >
        <span class="k">${label}</span>
        <span class="v">${reading}</span>
      </button>
    `;
  }

  protected render(): TemplateResult | typeof nothing {
    const config = this._config;
    const hass = this.hass;
    if (!config) return nothing;
    const objs: Record<string, HassEntity | undefined> = {
      indoor_temp: hass?.states[config.indoor_temp],
      indoor_humidity: hass?.states[config.indoor_humidity],
      outdoor_temp: hass?.states[config.outdoor_temp],
    };
    const missing = (['indoor_temp', 'indoor_humidity', 'outdoor_temp'] as const).find(
      (key) => !objs[key]
    );
    if (hass && missing) {
      return html`<ha-card><div class="warning">Entity not found: ${config[missing]}</div></ha-card>`;
    }

    const read = (key: 'indoor_temp' | 'indoor_humidity' | 'outdoor_temp'): number => {
      const obj = objs[key];
      return obj && !isUnavailable(obj) ? Number(obj.state) : NaN;
    };
    const inRaw = read('indoor_temp');
    const rhRaw = read('indoor_humidity');
    const outRaw = read('outdoor_temp');
    const ready = Number.isFinite(inRaw) && Number.isFinite(rhRaw) && Number.isFinite(outRaw);

    const inUnit = this._unitOf(config.indoor_temp);
    const outUnit = this._unitOf(config.outdoor_temp);
    const indoorC = ready ? toCelsius(inRaw, inUnit) : NaN;
    const outdoorC = ready ? toCelsius(outRaw, outUnit) : NaN;
    const surfC = ready ? surfaceTempC(indoorC, outdoorC, this._insulation()) : NaN;
    const surfRh = ready ? surfaceRh(indoorC, rhRaw, surfC) : NaN;
    const band: Band | null = ready ? bandOf(surfRh) : null;

    // Cold outside air arrives dry: airing out then genuinely lowers the
    // moisture load. On a mild, damp day only a warmer wall helps.
    const advice = !ready
      ? 'Waiting for readings'
      : band === 'safe'
        ? 'No action needed'
        : outdoorC <= indoorC - VENT_DELTA_C
          ? 'Ventilate 10 minutes'
          : 'Raise heating';

    const hoursNote = this._noHistory
      ? 'history unavailable'
      : this._riskHours !== null && this._riskHours >= 1
        ? `${this._num(this._riskHours, 0)}h high today`
        : '';

    const accent = band ? BAND_COLOR[band] : 'var(--primary-color, #4aa8ff)';
    const name = config.name ?? objs.indoor_temp?.attributes.friendly_name ?? 'Mold risk';
    // Surface temperature is reported in the indoor sensor's own unit.
    const surfDisplay = isFahrenheit(inUnit) ? (surfC * 9) / 5 + 32 : surfC;

    return html`
      <ha-card
        class="control ${ready ? '' : 'unavailable'}"
        style="--silk-accent:${accent}"
        @click=${this._onCardClick}
      >
        <div class="top">
          <div class="icon ${ready ? 'on' : ''}">
            <ha-icon .icon=${config.icon ?? 'mdi:wall'}></ha-icon>
          </div>
          <div class="info">
            <div class="name" title=${name}>${name}</div>
            <div class="state">
              <span class="word"
                ><span class="vdot"></span>${band ? BAND_WORD[band] : '—'}</span
              >
              <span class="sep">·</span>${advice}${hoursNote
                ? html`<span class="sep">·</span>${hoursNote}`
                : nothing}
            </div>
          </div>
          <div class="trailing">
            <span class="hero">${ready ? Math.round(surfRh) : '—'}</span>
            <span class="pct">%</span>
          </div>
        </div>
        <div class="chips">
          ${this._chip(
            'Indoor RH',
            ready ? `${Math.round(rhRaw)}%` : '—',
            config.indoor_humidity
          )}
          ${this._chip(
            'Surface',
            ready ? `${this._num(surfDisplay)}${inUnit ?? '°'}` : '—',
            config.indoor_temp
          )}
          ${this._chip(
            'Outside',
            ready ? `${this._num(outRaw)}${outUnit ?? '°'}` : '—',
            config.outdoor_temp
          )}
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
        gap: 8px;
      }
      .top {
        flex: none;
        display: flex;
        align-items: center;
        gap: 12px;
        min-width: 0;
      }
      /* A verdict, not a control: the icon presses with the card. */
      .icon {
        cursor: pointer;
      }
      .icon:active {
        transform: none;
      }
      .word {
        font-size: 13px;
        font-weight: 600;
        color: var(--silk-accent);
        transition: color 200ms ease;
      }
      .vdot {
        display: inline-block;
        width: 7px;
        height: 7px;
        margin-right: 5px;
        border-radius: 50%;
        background: currentColor;
      }
      .trailing {
        align-items: baseline;
        gap: 1px;
      }
      .hero {
        font-size: 24px;
        font-weight: 600;
        letter-spacing: -0.02em;
        line-height: 1.1;
        color: var(--primary-text-color);
        font-variant-numeric: tabular-nums;
      }
      .pct {
        font-size: 13px;
        font-weight: 500;
        color: var(--secondary-text-color);
      }
      .chips {
        flex: none;
        display: flex;
        gap: 6px;
        min-width: 0;
      }
      .chip {
        display: inline-flex;
        align-items: baseline;
        gap: 5px;
        min-width: 0;
        min-height: 24px;
        white-space: nowrap;
        overflow: hidden;
        font-variant-numeric: tabular-nums;
      }
      .chip .k {
        min-width: 0;
        overflow: hidden;
        text-overflow: ellipsis;
        font-weight: 500;
        opacity: 0.75;
      }
      .chip .v {
        flex: none;
        font-weight: 600;
        color: var(--primary-text-color);
      }
      .unavailable .chips {
        opacity: 0.45;
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    'silk-mold-card': SilkMoldCard;
  }
}
