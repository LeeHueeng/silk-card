import { LitElement, html, css, nothing, TemplateResult } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { HomeAssistant, HassEntity, LovelaceCardConfig } from '../types';
import { silkControlStyles } from '../shared/base';
import { isUnavailable, moreInfo, clamp } from '../shared/service';
import { accentFor } from '../shared/color';
import { registerEditor } from '../shared/editor';

export const META = {
  type: 'silk-cost-card',
  name: 'Silk Cost',
  description: "Where this month's bill is heading.",
};

export interface SilkCostCardConfig extends LovelaceCardConfig {
  /** Month-to-date energy sensor (kWh). */
  month_energy: string;
  /** Flat price per kWh. Takes precedence over `price_entity`. */
  rate?: number;
  /** Live price-per-kWh sensor, used when `rate` is absent. */
  price_entity?: string;
  /** Monthly budget in currency units; enables the budget track. */
  budget?: number;
  /** ISO code (KRW, EUR…) or a bare symbol. Defaults to the HA instance currency. */
  currency?: string;
  name?: string;
  /** Accent override. */
  color?: string;
}

/**
 * `hass.config` is absent from Silk's minimal HomeAssistant type; this card
 * only needs the instance currency as a default for `currency`.
 */
interface HassWithConfig extends HomeAssistant {
  config?: { currency?: string };
}

const DEFAULT_NAME = 'Electricity';
const DAY_MS = 86_400_000;
/** The month is barely started at 00:05 on the 1st — floor the divisor. */
const MIN_ELAPSED_DAYS = 1 / 24;
const TICK_MS = 60_000;

const EDITOR_TAG = 'silk-cost-card-editor';

registerEditor(
  EDITOR_TAG,
  [
    {
      name: 'month_energy',
      required: true,
      selector: { entity: { domain: ['sensor'], device_class: ['energy'] } },
    },
    {
      name: '',
      type: 'grid',
      schema: [
        { name: 'rate', selector: { number: { min: 0, step: 0.0001, mode: 'box' } } },
        { name: 'budget', selector: { number: { min: 0, mode: 'box' } } },
      ],
    },
    { name: 'price_entity', selector: { entity: { domain: ['sensor'] } } },
    {
      name: '',
      type: 'grid',
      schema: [
        { name: 'currency', selector: { text: {} } },
        { name: 'name', selector: { text: {} } },
      ],
    },
  ],
  {
    month_energy: 'Month-to-date energy (kWh)',
    rate: 'Price per kWh',
    budget: 'Monthly budget',
    price_entity: 'Price sensor (per kWh)',
    currency: 'Currency',
    name: 'Name',
  }
);

/** Numeric state, or null when missing/unavailable/non-numeric. */
function numericState(stateObj?: HassEntity): number | null {
  if (!stateObj || isUnavailable(stateObj) || stateObj.state === '') return null;
  const v = Number(stateObj.state);
  return Number.isFinite(v) ? v : null;
}

/**
 * The bill, projected: month-to-date energy times the rate, extended linearly
 * to the end of the month. The track underneath is the budget — the fill is
 * what's spent, the notch is where the month is heading.
 */
@customElement('silk-cost-card')
export class SilkCostCard extends LitElement {
  @property({ attribute: false }) public hass?: HomeAssistant;

  @state() private _config?: SilkCostCardConfig;
  /** Render clock: elapsed days move the projection without a state change. */
  @state() private _now = Date.now();
  /** False for the first paint so the track fills in from zero on mount. */
  @state() private _drawn = false;

  private _tick?: number;

  public static getStubConfig(hass: HomeAssistant): Partial<SilkCostCardConfig> {
    const ids = Object.keys(hass.states).filter((id) => id.startsWith('sensor.'));
    const energy = ids.filter(
      (id) =>
        hass.states[id].attributes.device_class === 'energy' &&
        Number.isFinite(Number(hass.states[id].state))
    );
    const priceEntity = ids.find((id) =>
      String(hass.states[id].attributes.unit_of_measurement ?? '')
        .toLowerCase()
        .includes('/kwh')
    );
    const stub: Partial<SilkCostCardConfig> = {
      type: 'custom:silk-cost-card',
      month_energy: energy.find((id) => /month/i.test(id)) ?? energy[0],
    };
    if (priceEntity) stub.price_entity = priceEntity;
    else stub.rate = 0.3;
    return stub;
  }

  public static async getConfigElement(): Promise<HTMLElement> {
    return document.createElement(EDITOR_TAG);
  }

  public setConfig(config: SilkCostCardConfig): void {
    if (!config.month_energy) {
      throw new Error('silk-cost-card: `month_energy` (a month-to-date kWh sensor) is required');
    }
    if (config.rate === undefined && !config.price_entity) {
      throw new Error('silk-cost-card: set `rate` (price per kWh) or `price_entity`');
    }
    if (config.rate !== undefined && !Number.isFinite(Number(config.rate))) {
      throw new Error('silk-cost-card: `rate` must be a number');
    }
    if (config.budget !== undefined && !(Number(config.budget) > 0)) {
      throw new Error('silk-cost-card: `budget` must be a positive number');
    }
    this._config = config;
  }

  public getCardSize(): number {
    return 2;
  }

  public getGridOptions(): Record<string, number> {
    return { columns: 6, rows: 2, min_columns: 4, min_rows: 2 };
  }

  public connectedCallback(): void {
    super.connectedCallback();
    this._tick = window.setInterval(() => {
      this._now = Date.now();
    }, TICK_MS);
  }

  public disconnectedCallback(): void {
    super.disconnectedCallback();
    window.clearInterval(this._tick);
    this._tick = undefined;
  }

  protected firstUpdated(): void {
    // Commit one frame at zero width so the 450ms track transition sweeps in.
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        this._drawn = true;
      });
    });
  }

  private _locale(): string {
    return this.hass?.locale?.language ?? this.hass?.language ?? 'en';
  }

  private _currency(): string {
    return this._config?.currency ?? (this.hass as HassWithConfig | undefined)?.config?.currency ?? '';
  }

  /** Bare amount for the state line — the hero already carries the currency. */
  private _amount(value: number): string {
    return new Intl.NumberFormat(this._locale(), {
      maximumFractionDigits: Math.abs(value) >= 100 ? 0 : 2,
    }).format(value);
  }

  /** Amount with currency; falls back to a symbol prefix for non-ISO codes. */
  private _money(value: number): string {
    const currency = this._currency();
    const digits = Math.abs(value) >= 100 ? 0 : 2;
    if (/^[A-Za-z]{3}$/.test(currency)) {
      try {
        return new Intl.NumberFormat(this._locale(), {
          style: 'currency',
          currency: currency.toUpperCase(),
          maximumFractionDigits: digits,
          minimumFractionDigits: 0,
        }).format(value);
      } catch {
        /* not a real ISO 4217 code — fall through to the prefix form */
      }
    }
    const num = new Intl.NumberFormat(this._locale(), {
      maximumFractionDigits: digits,
    }).format(value);
    return currency ? `${currency}${num}` : num;
  }

  private _onCardClick(): void {
    if (this._config) moreInfo(this, this._config.month_energy);
  }

  protected render(): TemplateResult | typeof nothing {
    const config = this._config;
    const hass = this.hass;
    if (!config || !hass) return nothing;

    const energyObj = hass.states[config.month_energy];
    if (!energyObj) {
      return html`<ha-card>
        <div class="warning">Entity not found: ${config.month_energy}</div>
      </ha-card>`;
    }
    const priceObj = config.price_entity ? hass.states[config.price_entity] : undefined;

    const energy = numericState(energyObj);
    const rate =
      config.rate !== undefined && Number.isFinite(Number(config.rate))
        ? Number(config.rate)
        : numericState(priceObj);
    const spent = energy !== null && rate !== null ? energy * rate : null;

    // Fractional day arithmetic off local month boundaries — DST-proof, and it
    // keeps the daily average honest halfway through a day.
    const now = new Date(this._now);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1).getTime();
    const monthDays = (monthEnd - monthStart) / DAY_MS;
    const elapsedDays = Math.max((this._now - monthStart) / DAY_MS, MIN_ELAPSED_DAYS);
    const perDay = spent !== null ? spent / elapsedDays : null;
    const projected = perDay !== null ? perDay * monthDays : null;

    const budget = config.budget !== undefined ? Number(config.budget) : undefined;
    const over = budget !== undefined && projected !== null && projected > budget;
    const scale = budget ?? (projected !== null && projected > 0 ? projected : 0);
    const spentPct = spent !== null && scale > 0 ? clamp((spent / scale) * 100, 0, 100) : 0;
    // Held a hair inside the track so the notch never rounds off at an end.
    const projectedPct =
      projected !== null && scale > 0 ? clamp((projected / scale) * 100, 1, 99) : 0;

    const unavailable = spent === null;
    const accent = accentFor(energyObj, config.color);
    const name = config.name ?? energyObj.attributes.friendly_name ?? DEFAULT_NAME;
    const dayOfMonth = now.getDate();
    const totalDays = Math.round(monthDays);
    const overPct =
      over && budget ? Math.round(((projected as number) - budget) / budget * 100) : 0;
    const trackTitle =
      spent !== null && projected !== null
        ? `Spent ${this._money(spent)} · projected ${this._money(projected)}${
            budget !== undefined ? ` · budget ${this._money(budget)}` : ''
          }`
        : 'No reading';

    return html`
      <ha-card
        class="control ${unavailable ? 'unavailable' : ''}"
        style="--silk-accent:${accent}"
        @click=${this._onCardClick}
      >
        <div class="head" title=${name}>${name}</div>
        <div class="hero">${projected !== null ? this._money(projected) : '—'}</div>
        <div class="state">
          ${spent !== null && perDay !== null
            ? html`so far ${this._amount(spent)}<span class="sep">·</span>avg
                ${this._amount(perDay)}/day`
            : 'Waiting for a reading'}
        </div>
        <div class="track ${over ? 'over' : ''}" title=${trackTitle}>
          <div class="fill" style="width:${this._drawn ? spentPct : 0}%"></div>
          ${projected !== null && scale > 0
            ? html`<div class="rider" aria-hidden="true">
                <div class="carrier" style="transform:translateX(${this._drawn ? projectedPct : 0}%)">
                  <span class="notch"></span>
                </div>
              </div>`
            : nothing}
        </div>
        <div class="ends">
          <span>Day ${dayOfMonth} of ${totalDays}</span>
          <span class="${over ? 'warn' : ''}"
            >${budget !== undefined
              ? over
                ? `${overPct}% over budget`
                : `budget ${this._amount(budget)}`
              : 'projected'}</span
          >
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
        gap: 5px;
        padding: 10px 14px;
      }
      .head {
        flex: none;
        font-size: 13px;
        font-weight: 500;
        line-height: 1.3;
        color: var(--secondary-text-color);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .hero {
        flex: none;
        font-size: 26px;
        font-weight: 700;
        letter-spacing: -0.02em;
        line-height: 1.15;
        color: var(--primary-text-color);
        font-variant-numeric: tabular-nums;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .state {
        flex: none;
      }
      .track {
        position: relative;
        flex: none;
        height: 8px;
        border-radius: 4px;
        background: rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.06);
        overflow: hidden;
      }
      .fill {
        height: 100%;
        width: 0;
        border-radius: 4px;
        background: var(--silk-accent);
        transition:
          width 450ms var(--silk-ease-out),
          background 200ms ease;
      }
      /* Breaching the budget is real status, so the track earns warning chroma. */
      .track.over .fill {
        background: var(--warning-color, #ffa600);
      }
      .rider {
        position: absolute;
        inset: 0;
        pointer-events: none;
      }
      /* Full-width carrier: a percentage translate resolves against its own
         box, turning the projection fraction into travel across the track. */
      .carrier {
        position: absolute;
        inset: 0;
        will-change: transform;
        transition: transform 450ms var(--silk-ease-out);
      }
      /* Where the month is heading, drawn as a cut through the track. */
      .notch {
        position: absolute;
        left: 0;
        top: 0;
        bottom: 0;
        width: 2px;
        margin-left: -1px;
        border-radius: 1px;
        background: var(--primary-text-color);
        opacity: 0.65;
      }
      .ends {
        display: flex;
        justify-content: space-between;
        gap: 8px;
        font-size: 10px;
        line-height: 1.1;
        color: var(--primary-text-color);
        font-variant-numeric: tabular-nums;
      }
      /* Opacity lives on the spans so the over-budget one can sit at full. */
      .ends span {
        opacity: 0.45;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .ends span.warn {
        color: var(--warning-color, #ffa600);
        opacity: 1;
      }
      .unavailable .hero,
      .unavailable .state,
      .unavailable .track,
      .unavailable .ends {
        opacity: 0.45;
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    'silk-cost-card': SilkCostCard;
  }
}
