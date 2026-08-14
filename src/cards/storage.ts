import { LitElement, html, svg, css, nothing, TemplateResult, SVGTemplateResult } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { HomeAssistant, HassEntity, LovelaceCardConfig } from '../types';
import { silkControlStyles } from '../shared/base';
import { isUnavailable, moreInfo, stateText, clamp } from '../shared/service';
import { accentFor } from '../shared/color';
import { registerEditor } from '../shared/editor';

export const META = {
  type: 'silk-storage-card',
  name: 'Silk Storage',
  description: 'Home battery, charge and reserve at a glance.',
};

export interface SilkStorageCardConfig extends LovelaceCardConfig {
  /** Battery state of charge, 0–100 (%). */
  soc: string;
  /** Battery power (W); positive = charging, negative = discharging. */
  power?: string;
  /** Usable pack size in kWh; enables the "x.x kWh stored" line. */
  capacity?: number;
  /** Reserve floor in percent; drawn as a dashed marker on the pack. */
  reserve?: number;
  name?: string;
  icon?: string;
  /** Accent override (YAML); charging and low-charge states still win. */
  color?: string;
}

const EDITOR_TAG = 'silk-storage-card-editor';

registerEditor(
  EDITOR_TAG,
  [
    {
      name: 'soc',
      required: true,
      selector: { entity: { domain: ['sensor', 'number', 'input_number'] } },
    },
    { name: 'power', selector: { entity: { domain: ['sensor'], device_class: 'power' } } },
    {
      name: '',
      type: 'grid',
      schema: [
        { name: 'capacity', selector: { number: { min: 0, step: 0.1, mode: 'box' } } },
        { name: 'reserve', selector: { number: { min: 0, max: 100, mode: 'box' } } },
      ],
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
    soc: '충전량(%)',
    power: '배터리 전력(W)',
    capacity: '용량(kWh)',
    reserve: '예비 하한(%)',
    name: '이름',
    icon: '아이콘',
    color: '강조 색상',
  }
);

/**
 * Battery pictogram geometry, in a 120×48 viewBox: a rounded body with a
 * terminal nub on the right, and an inset fill area padded off the body's
 * inner stroke edge so the charge never touches the casing.
 */
const VIEW_W = 120;
const VIEW_H = 48;
const STROKE = 3;
const BODY_X = 2.5;
const BODY_Y = 4;
const BODY_W = 104;
const BODY_H = 40;
const BODY_R = 11;
const FILL_PAD = 2;
const FILL_X = BODY_X + STROKE / 2 + FILL_PAD; // 6
const FILL_Y = BODY_Y + STROKE / 2 + FILL_PAD; // 7.5
const FILL_W = BODY_W - STROKE - FILL_PAD * 2; // 97
const FILL_H = BODY_H - STROKE - FILL_PAD * 2; // 33
const FILL_R = 7;
const NUB_W = 8;
const NUB_H = 14;
const NUB_R = 3;
const NUB_X = BODY_X + BODY_W + STROKE / 2 + 2; // 110
const NUB_Y = (VIEW_H - NUB_H) / 2;
/** The charge readout sits centered over the pack body, not the viewBox. */
const SOC_LEFT = Number((((BODY_X + BODY_W / 2) / VIEW_W) * 100).toFixed(2));
/** Only the leading edge of the fill pulses while charging. */
const LEAD_W = 8;

/** Below this the pack reads as a genuine problem, not a color choice. */
const LOW_SOC = 20;
/** Inverter idle draw is not "discharging" — deadband it. */
const IDLE_W = 5;
/**
 * Charging green is a deliberate fixed hue rather than the theme's success
 * color: it must stay legible as a large fill on every theme.
 */
const CHARGING_COLOR = '#5ec78d';

/** Numeric state, NaN when the entity is missing/unavailable/non-numeric. */
function numericState(stateObj?: HassEntity): number {
  if (!stateObj || isUnavailable(stateObj) || stateObj.state === '') return NaN;
  return Number(stateObj.state);
}

/** Power in watts, honoring kW/MW units; NaN when the entity can't speak. */
function powerWatts(stateObj?: HassEntity): number {
  const value = numericState(stateObj);
  if (!Number.isFinite(value)) return NaN;
  const unit = String(stateObj?.attributes.unit_of_measurement ?? 'W')
    .trim()
    .toLowerCase();
  if (unit === 'kw') return value * 1000;
  if (unit === 'mw') return value * 1_000_000;
  return value;
}

/**
 * Home battery at a glance: how full the pack is, which way the energy is
 * flowing, and how far it may fall before the reserve floor stops it.
 */
@customElement('silk-storage-card')
export class SilkStorageCard extends LitElement {
  @property({ attribute: false }) public hass?: HomeAssistant;

  @state() private _config?: SilkStorageCardConfig;

  /** False for the first paint so the charge fills in from empty on mount. */
  @state() private _drawn = false;

  public static getStubConfig(hass: HomeAssistant): Partial<SilkStorageCardConfig> {
    const ids = Object.keys(hass.states).filter((id) => id.startsWith('sensor.'));
    const byClass = (cls: string) =>
      ids.find((id) => hass.states[id].attributes.device_class === cls);
    return {
      type: 'custom:silk-storage-card',
      soc: byClass('battery'),
      power: byClass('power'),
    };
  }

  public static async getConfigElement(): Promise<HTMLElement> {
    return document.createElement(EDITOR_TAG);
  }

  public setConfig(config: SilkStorageCardConfig): void {
    if (!config.soc) {
      throw new Error('silk-storage-card: `soc` (a battery percentage entity) is required');
    }
    if (config.capacity !== undefined && !(Number(config.capacity) > 0)) {
      throw new Error('silk-storage-card: `capacity` must be a positive number of kWh');
    }
    if (
      config.reserve !== undefined &&
      (!Number.isFinite(Number(config.reserve)) || Number(config.reserve) < 0 || Number(config.reserve) > 100)
    ) {
      throw new Error('silk-storage-card: `reserve` must be a percentage between 0 and 100');
    }
    this._config = config;
  }

  public getCardSize(): number {
    return 2;
  }

  public getGridOptions(): Record<string, number> {
    return { columns: 6, rows: 2, min_columns: 3, min_rows: 2 };
  }

  protected firstUpdated(): void {
    // Commit one frame at zero width so the fill transition sweeps in.
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        this._drawn = true;
      });
    });
  }

  private _locale(): string {
    return this.hass?.locale?.language ?? this.hass?.language ?? 'en';
  }

  private _num(value: number, digits: number): string {
    return new Intl.NumberFormat(this._locale(), {
      minimumFractionDigits: digits,
      maximumFractionDigits: digits,
    }).format(value);
  }

  private _onCardClick(): void {
    if (this._config) moreInfo(this, this._config.soc);
  }

  /** The pack itself: casing, terminal, charge, and the reserve marker. */
  private _renderPack(soc: number, hasSoc: boolean, charging: boolean): TemplateResult {
    const reserve =
      this._config?.reserve !== undefined ? clamp(Number(this._config.reserve), 0, 100) : undefined;
    const shown = this._drawn && hasSoc ? soc : 0;
    const fillW = (FILL_W * shown) / 100;
    // While charging the leading 8px is drawn separately so it — and only it —
    // can pulse. DESIGN forbids idle breathing loops; this marks real energy flow.
    const leadW = charging ? Math.min(LEAD_W, fillW) : 0;
    const baseW = fillW - leadW;
    const marks: SVGTemplateResult[] = [];
    if (baseW > 0) {
      marks.push(
        svg`<rect class="fill" x=${FILL_X} y=${FILL_Y} width=${baseW} height=${FILL_H}></rect>`
      );
    }
    if (leadW > 0) {
      marks.push(
        svg`<rect class="fill lead" x=${FILL_X + baseW} y=${FILL_Y} width=${leadW} height=${FILL_H}></rect>`
      );
    }
    const reserveX = reserve === undefined ? 0 : FILL_X + (FILL_W * reserve) / 100;
    return html`
      <div class="pack">
        <svg viewBox="0 0 ${VIEW_W} ${VIEW_H}" aria-hidden="true">
          <defs>
            <clipPath id="packclip">
              <rect x=${FILL_X} y=${FILL_Y} width=${FILL_W} height=${FILL_H} rx=${FILL_R}></rect>
            </clipPath>
          </defs>
          <rect
            class="body"
            x=${BODY_X}
            y=${BODY_Y}
            width=${BODY_W}
            height=${BODY_H}
            rx=${BODY_R}
          ></rect>
          <rect class="nub" x=${NUB_X} y=${NUB_Y} width=${NUB_W} height=${NUB_H} rx=${NUB_R}></rect>
          <g clip-path="url(#packclip)">${marks}</g>
          ${reserve === undefined
            ? nothing
            : svg`<line
                class="reserve"
                x1=${reserveX}
                y1=${FILL_Y - 1}
                x2=${reserveX}
                y2=${FILL_Y + FILL_H + 1}
              ><title>Reserve ${this._num(reserve, 0)}%</title></line>`}
        </svg>
        <span class="soc">${hasSoc ? `${Math.round(soc)}%` : '—'}</span>
      </div>
    `;
  }

  protected render(): TemplateResult | typeof nothing {
    const config = this._config;
    const hass = this.hass;
    if (!config || !hass) return nothing;
    const socObj = hass.states[config.soc];
    if (!socObj) {
      return html`
        <ha-card class="control">
          <div class="warning">Entity not found: ${config.soc}</div>
        </ha-card>
      `;
    }

    const unavailable = isUnavailable(socObj);
    const socRaw = numericState(socObj);
    const hasSoc = Number.isFinite(socRaw);
    const soc = hasSoc ? clamp(socRaw, 0, 100) : 0;

    const powerObj = config.power ? hass.states[config.power] : undefined;
    const watts = powerWatts(powerObj);
    const hasPower = Number.isFinite(watts);
    const charging = hasPower && watts > IDLE_W;
    const discharging = hasPower && watts < -IDLE_W;
    const low = hasSoc && soc <= LOW_SOC;
    // Charging and a nearly-empty pack are real status, so they override the
    // domain accent — everything else on the card stays on one hue.
    const accent = charging
      ? CHARGING_COLOR
      : low
        ? 'var(--error-color, #db4437)'
        : accentFor(socObj, config.color);

    const name = config.name ?? socObj.attributes.friendly_name ?? config.soc;
    const flow = !hasPower ? undefined : charging ? 'Charging' : discharging ? 'Discharging' : 'Idle';
    const kw =
      hasPower && (charging || discharging)
        ? `${this._num(Math.abs(watts) / 1000, 1)} kW`
        : undefined;
    const stored =
      config.capacity !== undefined && hasSoc
        ? `${this._num((soc / 100) * Number(config.capacity), 1)} kWh stored`
        : undefined;

    // Fallback ladder: power flow leads, then the stored total, then the raw
    // state — the state line never goes silent.
    const primaryLine = flow ?? stored ?? stateText(hass, socObj);
    const subLine = flow ? stored : undefined;

    return html`
      <ha-card
        class="control ${unavailable ? 'unavailable' : ''}"
        style="--silk-accent:${accent}"
        @click=${this._onCardClick}
      >
        ${this._renderPack(soc, hasSoc && !unavailable, charging && !unavailable)}
        <div class="info">
          <div class="name">
            ${config.icon ? html`<ha-icon class="tag" .icon=${config.icon}></ha-icon>` : nothing}${name}
          </div>
          <div class="state">
            ${primaryLine}${flow && kw ? html`<span class="sep">·</span>${kw}` : nothing}
          </div>
          ${subLine ? html`<div class="sub">${subLine}</div>` : nothing}
        </div>
      </ha-card>
    `;
  }

  static styles = [
    silkControlStyles,
    css`
      /* Display card: the whole card presses as one and opens more-info. */
      ha-card {
        transition: transform 250ms var(--silk-spring);
      }
      ha-card:active {
        transform: scale(0.97);
        transition-duration: 120ms;
        transition-timing-function: var(--silk-ease-out);
      }
      .pack {
        position: relative;
        flex: 0 1 ${VIEW_W}px;
        min-width: 84px;
        aspect-ratio: ${VIEW_W} / ${VIEW_H};
      }
      .pack svg {
        display: block;
        width: 100%;
        height: 100%;
      }
      .body {
        fill: none;
        stroke: rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.25);
        stroke-width: ${STROKE};
      }
      .nub {
        fill: rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.25);
      }
      .fill {
        fill: var(--silk-accent);
        transition:
          width 450ms var(--silk-ease-out),
          x 450ms var(--silk-ease-out),
          fill 200ms ease;
      }
      /* Real activity, not decoration: only the charge front breathes. */
      .fill.lead {
        animation: silk-storage-charge 1400ms ease-in-out infinite;
      }
      .reserve {
        stroke: rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.5);
        stroke-width: 2;
        stroke-dasharray: 3 3;
        stroke-linecap: round;
      }
      .soc {
        position: absolute;
        left: ${SOC_LEFT}%;
        top: 50%;
        transform: translate(-50%, -50%);
        font-size: 18px;
        font-weight: 600;
        letter-spacing: -0.02em;
        line-height: 1;
        color: var(--primary-text-color);
        font-variant-numeric: tabular-nums;
        pointer-events: none;
      }
      /* Inline so the name keeps its single-line ellipsis. */
      .tag {
        --mdc-icon-size: 16px;
        vertical-align: -3px;
        margin-right: 4px;
        color: var(--secondary-text-color);
      }
      .sub {
        font-size: 12px;
        line-height: 1.3;
        color: var(--secondary-text-color);
        opacity: 0.85;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        font-variant-numeric: tabular-nums;
      }
      .unavailable .pack {
        opacity: 0.45;
      }
      @keyframes silk-storage-charge {
        0%,
        100% {
          opacity: 1;
        }
        50% {
          opacity: 0.4;
        }
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    'silk-storage-card': SilkStorageCard;
  }
}
