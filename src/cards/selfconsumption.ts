import { LitElement, html, svg, css, nothing, TemplateResult } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { HomeAssistant, HassEntity, LovelaceCardConfig } from '../types';
import { silkControlStyles } from '../shared/base';
import { isUnavailable, moreInfo, clamp } from '../shared/service';
import { accentFor } from '../shared/color';
import { registerEditor } from '../shared/editor';

export const META = {
  type: 'silk-self-card',
  name: 'Silk Self-Use',
  description: 'How much of your sun you actually keep.',
};

export interface SilkSelfCardConfig extends LovelaceCardConfig {
  /** Total solar production for the period (kWh). */
  solar_total: string;
  /** Solar sent to the grid (kWh). Given this, self-use = solar − exported. */
  exported?: string;
  /** Grid import (kWh) — pair it with `consumed` when `exported` is missing. */
  imported?: string;
  /** House consumption (kWh); with `imported`, self-use = consumed − imported. */
  consumed?: string;
  name?: string;
  /** Free-text period tag shown beside the name, e.g. "Today" or "This month". */
  period_label?: string;
  /** Accent override. */
  color?: string;
}

const EDITOR_TAG = 'silk-self-card-editor';

registerEditor(
  EDITOR_TAG,
  [
    {
      name: 'solar_total',
      required: true,
      selector: { entity: { domain: ['sensor'], device_class: 'energy' } },
    },
    { name: 'exported', selector: { entity: { domain: ['sensor'], device_class: 'energy' } } },
    { name: 'imported', selector: { entity: { domain: ['sensor'], device_class: 'energy' } } },
    { name: 'consumed', selector: { entity: { domain: ['sensor'], device_class: 'energy' } } },
    { name: 'name', selector: { text: {} } },
    {
      name: '',
      type: 'grid',
      schema: [
        { name: 'period_label', selector: { text: {} } },
        { name: 'color', selector: { ui_color: {} } },
      ],
    },
  ],
  {
    solar_total: '태양광 생산량 (kWh)',
    exported: '계통 송전량 (kWh)',
    imported: '계통 수전량 (kWh)',
    consumed: '집 소비량 (kWh)',
    name: '이름',
    period_label: '기간 라벨',
    color: '강조 색상',
  }
);

/**
 * Donut geometry. The circle stroke starts at 3 o'clock and sweeps clockwise;
 * a -90° rotation moves the start to 12 o'clock. Coordinates are literal
 * pixels at the donut's natural size, so the 12px ring and the 2px gaps are
 * exactly that — the gaps show the card surface, they are not a drawn track.
 */
const SIZE = 96;
const CENTER = SIZE / 2;
const STROKE = 12;
const RADIUS = (SIZE - STROKE) / 2;
const CIRC = 2 * Math.PI * RADIUS;
const GAP = 2;

/** Numeric state, NaN when the entity is missing/unavailable/non-numeric. */
function numericState(stateObj?: HassEntity): number {
  if (!stateObj || isUnavailable(stateObj) || stateObj.state === '') return NaN;
  return Number(stateObj.state);
}

/** One honest sentence about where the sun went. */
function verdictFor(pct: number | null, solar: number): string {
  if (solar <= 0 || pct === null) return 'No solar production yet';
  if (pct >= 90) return 'Nearly all of your solar stayed home';
  if (pct >= 65) return 'Most of your solar stayed home';
  if (pct >= 45) return 'You kept about half of it';
  if (pct >= 20) return 'Most of your solar went to the grid';
  return 'Nearly all of it went to the grid';
}

@customElement('silk-self-card')
export class SilkSelfCard extends LitElement {
  @property({ attribute: false }) public hass?: HomeAssistant;

  @state() private _config?: SilkSelfCardConfig;
  /** False for the first paint so the ring sweeps in from zero on mount. */
  @state() private _drawn = false;

  public static getStubConfig(hass: HomeAssistant): Partial<SilkSelfCardConfig> {
    const energy = Object.keys(hass.states).filter(
      (id) => id.startsWith('sensor.') && hass.states[id].attributes.device_class === 'energy'
    );
    const find = (re: RegExp) => energy.find((id) => re.test(id));
    return {
      type: 'custom:silk-self-card',
      solar_total: find(/solar|pv|produc/i) ?? energy[0],
      exported: find(/export|return|grid_out|feed/i),
    };
  }

  public static async getConfigElement(): Promise<HTMLElement> {
    return document.createElement(EDITOR_TAG);
  }

  public setConfig(config: SilkSelfCardConfig): void {
    if (!config.solar_total) {
      throw new Error('silk-self-card: `solar_total` is required (total solar production, kWh)');
    }
    if (!config.exported && !(config.imported && config.consumed)) {
      throw new Error(
        'silk-self-card: give `exported`, or `imported` + `consumed` so export can be derived'
      );
    }
    this._config = config;
  }

  public getCardSize(): number {
    return 3;
  }

  public getGridOptions(): Record<string, number> {
    return { columns: 4, rows: 3, min_columns: 3, min_rows: 3 };
  }

  protected firstUpdated(): void {
    // Commit one frame at zero so the 450ms dash transition sweeps the ring in.
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        this._drawn = true;
      });
    });
  }

  private _locale(): string {
    return this.hass?.locale?.language ?? this.hass?.language ?? 'en';
  }

  private _num(value: number): string {
    if (!Number.isFinite(value)) return '—';
    return new Intl.NumberFormat(this._locale(), {
      maximumFractionDigits: Math.abs(value) >= 100 ? 0 : 1,
      minimumFractionDigits: Math.abs(value) >= 100 ? 0 : 1,
    }).format(value);
  }

  /**
   * Split solar into the part that stayed home and the part that left.
   * `exported` wins when configured; otherwise self-use comes from
   * consumption minus grid import, which is the same quantity measured from
   * the other side of the house.
   */
  private _split(): { solar: number; self: number; exported: number; pct: number | null } {
    const hass = this.hass!;
    const config = this._config!;
    const solarRaw = numericState(hass.states[config.solar_total]);
    const solar = Number.isFinite(solarRaw) ? Math.max(solarRaw, 0) : NaN;
    let self = NaN;
    if (config.exported) {
      const exp = numericState(hass.states[config.exported]);
      if (Number.isFinite(solar) && Number.isFinite(exp)) self = solar - Math.max(exp, 0);
    } else if (config.imported && config.consumed) {
      const imp = numericState(hass.states[config.imported]);
      const used = numericState(hass.states[config.consumed]);
      if (Number.isFinite(imp) && Number.isFinite(used)) self = used - imp;
    }
    if (!Number.isFinite(solar) || !Number.isFinite(self)) {
      return { solar: NaN, self: NaN, exported: NaN, pct: null };
    }
    // Sensors reset at different moments; clamping keeps the ring honest
    // instead of drawing an impossible split.
    const kept = clamp(self, 0, solar);
    return {
      solar,
      self: kept,
      exported: solar - kept,
      pct: solar > 0 ? (kept / solar) * 100 : null,
    };
  }

  private _onCardClick(): void {
    if (this._config) moreInfo(this, this._config.solar_total);
  }

  private _renderRing(
    split: { solar: number; self: number; exported: number; pct: number | null },
    unit: string
  ): TemplateResult {
    const has = split.pct !== null && split.solar > 0;
    const fraction = has ? clamp(split.pct! / 100, 0, 1) : 0;
    const shown = this._drawn ? fraction : 0;
    const selfLen = CIRC * shown;
    const expLen = CIRC - selfLen;
    // A gap only exists where two arcs meet; a full ring keeps its whole length.
    const twoArcs = selfLen > GAP * 2 && expLen > GAP * 2;
    const selfDash = twoArcs ? Math.max(selfLen - GAP, 0) : selfLen;
    const expDash = twoArcs ? Math.max(expLen - GAP, 0) : expLen;
    const pctText = split.pct === null ? '—' : `${Math.round(split.pct)}%`;

    return html`
      <div class="donut">
        <svg viewBox="0 0 ${SIZE} ${SIZE}" aria-hidden="true">
          ${has
            ? svg`<g class="ring" transform="rotate(-90 ${CENTER} ${CENTER})">
                <!-- Both arcs always exist so their dash lengths can animate;
                     a zero-length dash simply draws nothing. -->
                <circle
                  class="arc exported"
                  cx=${CENTER}
                  cy=${CENTER}
                  r=${RADIUS}
                  stroke-dasharray="${expDash.toFixed(2)} ${(CIRC + GAP).toFixed(2)}"
                  stroke-dashoffset=${(expDash + CIRC + GAP - selfLen).toFixed(2)}
                ><title>Exported · ${this._num(split.exported)} ${unit}</title></circle>
                <circle
                  class="arc self"
                  cx=${CENTER}
                  cy=${CENTER}
                  r=${RADIUS}
                  stroke-dasharray="${selfDash.toFixed(2)} ${(CIRC + GAP).toFixed(2)}"
                  stroke-dashoffset="0"
                ><title>Kept at home · ${this._num(split.self)} ${unit} (${pctText})</title></circle>
              </g>`
            : svg`<circle class="empty" cx=${CENTER} cy=${CENTER} r=${RADIUS}></circle>`}
        </svg>
        <div class="center">
          <span class="pct">${pctText}</span>
        </div>
      </div>
    `;
  }

  protected render(): TemplateResult | typeof nothing {
    const config = this._config;
    const hass = this.hass;
    if (!config || !hass) return nothing;
    const solarObj = hass.states[config.solar_total];
    if (!solarObj) {
      return html`
        <ha-card class="control">
          <div class="warning">Entity not found: ${config.solar_total}</div>
        </ha-card>
      `;
    }

    const partner = config.exported
      ? hass.states[config.exported]
      : config.consumed
        ? hass.states[config.consumed]
        : undefined;
    const unavailable = isUnavailable(solarObj) || (partner !== undefined && isUnavailable(partner));
    const accent = accentFor(solarObj, config.color);
    const unit = String(solarObj.attributes.unit_of_measurement ?? 'kWh');
    const split = this._split();
    const name = config.name ?? 'Self-use';

    return html`
      <ha-card
        class="control ${unavailable ? 'unavailable' : ''}"
        style="--silk-accent:${accent}"
        @click=${this._onCardClick}
      >
        <div class="head">
          <span class="title" title=${name}>${name}</span>
          ${config.period_label
            ? html`<span class="period">${config.period_label}</span>`
            : nothing}
        </div>
        ${this._renderRing(split, unit)}
        <div class="rows">
          <div class="row">
            <span class="dot self"></span>
            <span class="label">Kept at home</span>
            <span class="val">${this._num(split.self)} ${unit}</span>
          </div>
          <div class="row">
            <span class="dot exported"></span>
            <span class="label">Exported</span>
            <span class="val">${this._num(split.exported)} ${unit}</span>
          </div>
        </div>
        <div class="verdict">
          ${verdictFor(split.pct, Number.isFinite(split.solar) ? split.solar : 0)}
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
        justify-content: flex-start;
        gap: 6px;
        padding: 12px 14px;
      }
      .head {
        flex: none;
        display: flex;
        align-items: baseline;
        gap: 8px;
        min-width: 0;
      }
      .title {
        flex: 1;
        min-width: 0;
        font-size: 13px;
        font-weight: 600;
        color: var(--secondary-text-color);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .period {
        flex: none;
        font-size: 11px;
        color: var(--secondary-text-color);
        opacity: 0.8;
        white-space: nowrap;
      }
      .donut {
        position: relative;
        flex: 0 1 auto;
        align-self: center;
        width: 100%;
        max-width: ${SIZE}px;
        min-height: 0;
        aspect-ratio: 1;
      }
      .donut svg {
        display: block;
        width: 100%;
        height: 100%;
      }
      .arc,
      .empty {
        fill: none;
        stroke-width: ${STROKE};
        stroke-linecap: butt;
      }
      /* Magnitude in one hue: the kept share owns the accent, the exported
         share recedes to a neutral secondary. */
      .arc.self {
        stroke: var(--silk-accent);
      }
      .arc.exported {
        stroke: rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.16);
      }
      .empty {
        stroke: rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.08);
      }
      .ring {
        animation: silk-self-in 250ms var(--silk-ease-out);
      }
      .ring circle {
        transition:
          stroke-dasharray 450ms var(--silk-ease-out),
          stroke-dashoffset 450ms var(--silk-ease-out);
      }
      .center {
        position: absolute;
        inset: 0;
        display: grid;
        place-items: center;
        pointer-events: none;
      }
      .pct {
        font-size: 20px;
        font-weight: 700;
        letter-spacing: -0.02em;
        line-height: 1;
        color: var(--primary-text-color);
        font-variant-numeric: tabular-nums;
      }
      .rows {
        flex: none;
        display: flex;
        flex-direction: column;
        gap: 3px;
      }
      .row {
        display: flex;
        align-items: center;
        gap: 8px;
        min-width: 0;
      }
      .dot {
        flex: none;
        width: 8px;
        height: 8px;
        border-radius: 3px;
      }
      .dot.self {
        background: var(--silk-accent);
      }
      .dot.exported {
        background: rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.28);
      }
      .label {
        flex: 1;
        min-width: 0;
        font-size: 12.5px;
        color: var(--secondary-text-color);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .val {
        flex: none;
        font-size: 12.5px;
        font-weight: 600;
        color: var(--primary-text-color);
        font-variant-numeric: tabular-nums;
        white-space: nowrap;
      }
      .verdict {
        flex: none;
        font-size: 11.5px;
        line-height: 1.3;
        color: var(--secondary-text-color);
        opacity: 0.85;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .unavailable .donut,
      .unavailable .rows,
      .unavailable .verdict {
        opacity: 0.45;
      }
      @keyframes silk-self-in {
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
    'silk-self-card': SilkSelfCard;
  }
}
