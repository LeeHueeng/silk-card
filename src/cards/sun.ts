import { LitElement, html, css, nothing, TemplateResult } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { HomeAssistant, HassEntity, LovelaceCardConfig } from '../types';
import { silkControlStyles } from '../shared/base';
import { isUnavailable, moreInfo, clamp } from '../shared/service';
import { registerEditor } from '../shared/editor';

export const META = {
  type: 'silk-sun-card',
  name: 'Silk Sun',
  description: 'Where the sun is, and when it leaves.',
};

export interface SilkSunCardConfig extends LovelaceCardConfig {
  entity?: string;
  name?: string;
  /** Accent override (YAML only); default is Silk's sun amber. */
  color?: string;
}

const DEFAULT_ENTITY = 'sun.sun';
const DEFAULT_ACCENT = '#e6a23c';
const DAY_MS = 86_400_000;
const TICK_MS = 60_000;

/**
 * Sky geometry in viewBox units (0–100 both axes, preserveAspectRatio="none"
 * so the semicircle stretches into a wide sun path and percentage positions
 * map 1:1 onto the HTML dot overlay).
 */
const CX = 50;
const CY = 82; // horizon baseline
const R = 48;
const NIGHT_DEPTH = 13; // shallow under-horizon arc for the night dot
const ARC_PATH = `M ${CX - R} ${CY} A ${R} ${R} 0 0 1 ${CX + R} ${CY}`;

/** Where the sun is in its current span, plus the rise/set times to display. */
interface SunSpan {
  day: boolean;
  /** 0..1 — day: sunrise→sunset along the arc; night: sunset→next rise under it. */
  f: number;
  riseMs: number;
  setMs: number;
}

/**
 * sun.sun only exposes *next* rising/setting. When next_rising is later than
 * next_setting the sun is currently up, so today's rise = next_rising − 24h;
 * otherwise it is night and the previous set = next_setting − 24h. The ~1min/day
 * drift of real sun times is invisible at this scale.
 */
function deriveSpan(stateObj: HassEntity, now: number): SunSpan | null {
  const nextRising = Date.parse(String(stateObj.attributes.next_rising ?? ''));
  const nextSetting = Date.parse(String(stateObj.attributes.next_setting ?? ''));
  if (!Number.isFinite(nextRising) || !Number.isFinite(nextSetting)) return null;
  const day = nextRising > nextSetting;
  if (day) {
    const rise = nextRising - DAY_MS;
    return {
      day,
      f: clamp((now - rise) / (nextSetting - rise), 0, 1),
      riseMs: rise,
      setMs: nextSetting,
    };
  }
  const prevSet = nextSetting - DAY_MS;
  return {
    day,
    f: clamp((now - prevSet) / (nextRising - prevSet), 0, 1),
    riseMs: nextRising,
    setMs: nextSetting,
  };
}

const EDITOR_TAG = 'silk-sun-card-editor';

registerEditor(
  EDITOR_TAG,
  [
    { name: 'entity', selector: { entity: { domain: ['sun'] } } },
    { name: 'name', selector: { text: {} } },
    { name: 'color', selector: { ui_color: {} } },
  ],
  { entity: '엔티티', name: '이름', color: '강조 색상' },
  { entity: DEFAULT_ENTITY }
);

@customElement('silk-sun-card')
export class SilkSunCard extends LitElement {
  @property({ attribute: false }) public hass?: HomeAssistant;

  @state() private _config?: SilkSunCardConfig;
  /** Wall-clock tick so the dot creeps along without state changes. */
  @state() private _now = Date.now();

  private _tickTimer?: number;

  public static getStubConfig(): Partial<SilkSunCardConfig> {
    return { type: 'custom:silk-sun-card', entity: DEFAULT_ENTITY };
  }

  public static async getConfigElement(): Promise<HTMLElement> {
    return document.createElement(EDITOR_TAG);
  }

  public setConfig(config: SilkSunCardConfig): void {
    this._config = config;
  }

  public getCardSize(): number {
    return 2;
  }

  public getGridOptions(): Record<string, number> {
    return { columns: 4, rows: 2, min_columns: 3, min_rows: 2 };
  }

  public connectedCallback(): void {
    super.connectedCallback();
    this._now = Date.now();
    this._tickTimer = window.setInterval(() => {
      this._now = Date.now();
    }, TICK_MS);
  }

  public disconnectedCallback(): void {
    super.disconnectedCallback();
    window.clearInterval(this._tickTimer);
  }

  private _entityId(): string {
    return this._config?.entity ?? DEFAULT_ENTITY;
  }

  private _fmtTime(ms: number): string {
    const locale = this.hass?.locale?.language ?? this.hass?.language ?? 'en';
    return new Intl.DateTimeFormat(locale, { hour: 'numeric', minute: '2-digit' }).format(
      new Date(ms)
    );
  }

  private _onCardClick(): void {
    moreInfo(this, this._entityId());
  }

  protected render(): TemplateResult | typeof nothing {
    const config = this._config;
    if (!config) return nothing;
    const hass = this.hass;
    const entityId = this._entityId();
    const stateObj = hass?.states[entityId];
    if (hass && !stateObj) {
      return html`<ha-card><div class="warning">Entity not found: ${entityId}</div></ha-card>`;
    }

    const unavailable = isUnavailable(stateObj);
    const accent = config.color ?? DEFAULT_ACCENT;
    const name = config.name ?? stateObj?.attributes.friendly_name ?? 'Sun';
    const span = stateObj && !unavailable ? deriveSpan(stateObj, this._now) : null;

    let dotX = 0;
    let dotY = 0;
    if (span) {
      const a = Math.PI * span.f;
      if (span.day) {
        // Left (sunrise) → over the top → right (sunset).
        dotX = CX - R * Math.cos(a);
        dotY = CY - R * Math.sin(a);
      } else {
        // Continues under the horizon: right (set) → shallow dip → left (rise).
        dotX = CX + R * Math.cos(a);
        dotY = CY + NIGHT_DEPTH * Math.sin(a);
      }
    }

    const elevation = Number(stateObj?.attributes.elevation);
    const showElevation = span?.day === true && Number.isFinite(elevation);

    return html`
      <ha-card
        class=${unavailable ? 'unavailable' : ''}
        style="--silk-accent:${accent}"
        @click=${this._onCardClick}
      >
        <div class="head">
          <div class="name">${name}</div>
          ${showElevation ? html`<div class="elev">${Math.round(elevation)}° up</div>` : nothing}
        </div>
        <div class="sky">
          <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
            <path class="arc" d=${ARC_PATH}></path>
            <line class="horizon" x1="2" y1=${CY} x2="98" y2=${CY}></line>
          </svg>
          ${span
            ? html`<div
                class="dot ${span.day ? '' : 'night'}"
                style="left:${dotX.toFixed(2)}%;top:${dotY.toFixed(2)}%"
              ></div>`
            : nothing}
        </div>
        <div class="times">
          <div class="col">
            <ha-icon icon="mdi:weather-sunset-up"></ha-icon>
            <span>Sunrise ${span ? this._fmtTime(span.riseMs) : '—'}</span>
          </div>
          <div class="col">
            <ha-icon icon="mdi:weather-sunset-down"></ha-icon>
            <span>Sunset ${span ? this._fmtTime(span.setMs) : '—'}</span>
          </div>
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
        justify-content: space-between;
        gap: 6px;
        padding: 12px 14px;
      }
      .head {
        flex: none;
        display: flex;
        align-items: baseline;
        justify-content: space-between;
        gap: 8px;
        min-height: 18px;
      }
      .elev {
        flex: none;
        font-size: 13px;
        font-weight: 600;
        letter-spacing: -0.01em;
        color: var(--primary-text-color);
        font-variant-numeric: tabular-nums;
        white-space: nowrap;
      }
      .sky {
        position: relative;
        flex: 1;
        min-height: 40px;
      }
      svg {
        display: block;
        width: 100%;
        height: 100%;
      }
      .arc {
        fill: none;
        stroke: rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.2);
        stroke-width: 1;
        stroke-dasharray: 3 4;
        vector-effect: non-scaling-stroke;
      }
      .horizon {
        stroke: rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.15);
        stroke-width: 1;
        vector-effect: non-scaling-stroke;
      }
      .dot {
        position: absolute;
        width: 8px;
        height: 8px;
        border-radius: 50%;
        transform: translate(-50%, -50%);
        background: var(--silk-accent);
        transition: opacity 200ms ease;
        pointer-events: none;
      }
      .dot.night {
        opacity: 0.45;
      }
      .times {
        flex: none;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
        min-width: 0;
      }
      .col {
        display: flex;
        align-items: center;
        gap: 5px;
        min-width: 0;
        font-size: 12px;
        color: var(--secondary-text-color);
        font-variant-numeric: tabular-nums;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .col ha-icon {
        flex: none;
        --mdc-icon-size: 16px;
        color: var(--secondary-text-color);
      }
      .unavailable .head,
      .unavailable .sky,
      .unavailable .times {
        opacity: 0.45;
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    'silk-sun-card': SilkSunCard;
  }
}
