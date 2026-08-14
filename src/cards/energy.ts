import { LitElement, html, css, nothing, TemplateResult } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { HomeAssistant, HassEntity, LovelaceCardConfig } from '../types';
import { silkControlStyles } from '../shared/base';
import { isUnavailable, moreInfo } from '../shared/service';
import { accentFor } from '../shared/color';
import { registerEditor } from '../shared/editor';
import { formatNumber } from '../format';

export const META = {
  type: 'silk-energy-card',
  name: 'Silk Energy',
  description: 'Today versus yesterday, honestly compared.',
};

export interface SilkEnergyCardConfig extends LovelaceCardConfig {
  /** Display name for the device (required — this card is device-, not entity-, named). */
  name: string;
  icon?: string;
  /** Accent override. */
  color?: string;
  /** Live power sensor (W), shown as the trailing hero value. */
  power?: string;
  /** Today's energy total (kWh). Required; card click opens its more-info. */
  today: string;
  /** Yesterday's energy total (kWh); enables the comparison bar and delta. */
  yesterday?: string;
  /** Month-to-date energy total (kWh); shown on the state line. */
  month?: string;
}

const EDITOR_TAG = 'silk-energy-card-editor';

registerEditor(
  EDITOR_TAG,
  [
    { name: 'name', required: true, selector: { text: {} } },
    {
      name: 'power',
      selector: { entity: { domain: ['sensor'], device_class: 'power' } },
    },
    {
      name: 'today',
      required: true,
      selector: { entity: { domain: ['sensor'], device_class: 'energy' } },
    },
    {
      name: 'yesterday',
      selector: { entity: { domain: ['sensor'], device_class: 'energy' } },
    },
    {
      name: 'month',
      selector: { entity: { domain: ['sensor'], device_class: 'energy' } },
    },
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
    name: '이름',
    power: '실시간 전력 (W)',
    today: '오늘 사용량 (kWh)',
    yesterday: '어제 사용량 (kWh)',
    month: '이번 달 사용량 (kWh)',
    icon: '아이콘',
    color: '강조 색상',
  }
);

/** Numeric state, NaN when the entity is missing/unavailable/non-numeric. */
function numericState(stateObj?: HassEntity): number {
  if (!stateObj || isUnavailable(stateObj) || stateObj.state === '') return NaN;
  return Number(stateObj.state);
}

@customElement('silk-energy-card')
export class SilkEnergyCard extends LitElement {
  @property({ attribute: false }) public hass?: HomeAssistant;

  @state() private _config?: SilkEnergyCardConfig;

  /** False for the first paint so the bars grow in from zero on mount. */
  @state() private _drawn = false;

  public static getStubConfig(hass: HomeAssistant): Partial<SilkEnergyCardConfig> {
    const energyIds = Object.keys(hass.states).filter(
      (id) => id.startsWith('sensor.') && hass.states[id].attributes.device_class === 'energy'
    );
    const today = energyIds[0];
    const name = today
      ? (hass.states[today].attributes.friendly_name as string | undefined) ?? 'Energy'
      : 'Energy';
    return {
      type: 'custom:silk-energy-card',
      name,
      today,
      yesterday: energyIds[1],
    };
  }

  public static async getConfigElement(): Promise<HTMLElement> {
    return document.createElement(EDITOR_TAG);
  }

  public setConfig(config: SilkEnergyCardConfig): void {
    if (!config.name) {
      throw new Error('silk-energy-card: `name` is required');
    }
    if (!config.today) {
      throw new Error('silk-energy-card: `today` (an energy sensor) is required');
    }
    this._config = config;
  }

  public getCardSize(): number {
    return 2;
  }

  public getGridOptions(): Record<string, number> {
    return { columns: 6, rows: 2, min_columns: 4, min_rows: 2 };
  }

  protected firstUpdated(): void {
    // Commit one frame at zero width so the 400ms bar transition sweeps in.
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        this._drawn = true;
      });
    });
  }

  private _onCardClick(): void {
    if (this._config) moreInfo(this, this._config.today);
  }

  /** One labeled bar row; lives inside the `.bars` grid for column alignment. */
  private _barRow(label: string, cls: string, pct: number, valueText: string): TemplateResult {
    return html`
      <span class="bar-label">${label}</span>
      <div class="bar-track">
        <div class="bar-fill ${cls}" style="width:${this._drawn ? pct : 0}%"></div>
      </div>
      <span class="bar-value">${valueText}</span>
    `;
  }

  private _energyText(entityId: string, value: number, stateObj?: HassEntity): string {
    if (!Number.isFinite(value)) return '—';
    const unit = (stateObj?.attributes.unit_of_measurement as string | undefined) ?? 'kWh';
    return `${formatNumber(this.hass, entityId, value)} ${unit}`;
  }

  protected render(): TemplateResult | typeof nothing {
    const config = this._config;
    const hass = this.hass;
    if (!config || !hass) return nothing;

    const todayObj = hass.states[config.today];
    if (!todayObj) {
      return html`
        <ha-card class="control">
          <div class="warning">Entity not found: ${config.today}</div>
        </ha-card>
      `;
    }

    const unavailable = isUnavailable(todayObj);
    const accent = accentFor(todayObj, config.color);
    const icon = config.icon ?? 'mdi:power-plug';

    const yesterdayObj = config.yesterday ? hass.states[config.yesterday] : undefined;
    const monthObj = config.month ? hass.states[config.month] : undefined;
    const powerObj = config.power ? hass.states[config.power] : undefined;

    const todayV = numericState(todayObj);
    const yesterdayV = numericState(yesterdayObj);
    const monthV = numericState(monthObj);
    const powerV = numericState(powerObj);

    // Both bars share one scale so their lengths compare honestly.
    const maxV = Math.max(
      Number.isFinite(todayV) ? todayV : 0,
      Number.isFinite(yesterdayV) ? yesterdayV : 0
    );
    const pctOf = (v: number): number =>
      Number.isFinite(v) && maxV > 0 ? Math.min((v / maxV) * 100, 100) : 0;

    // Delta needs both days; a zero-usage yesterday has no meaningful percent.
    const hasDelta =
      Number.isFinite(todayV) && Number.isFinite(yesterdayV) && yesterdayV > 0;
    const deltaPct = hasDelta ? Math.round(((todayV - yesterdayV) / yesterdayV) * 100) : 0;
    const deltaClass = deltaPct < 0 ? 'down' : deltaPct > 0 ? 'up' : '';
    const deltaText =
      deltaPct < 0 ? `−${Math.abs(deltaPct)}%` : deltaPct > 0 ? `+${deltaPct}%` : '0%';

    // Icon reads "drawing power right now" — surface state, only when live power exists.
    const active = Number.isFinite(powerV) && powerV > 0;

    return html`
      <ha-card
        class="control ${unavailable ? 'unavailable' : ''}"
        style="--silk-accent:${accent}"
        @click=${this._onCardClick}
      >
        <div class="top">
          <div class="icon ${active ? 'on' : ''}">
            <ha-icon .icon=${icon}></ha-icon>
          </div>
          <div class="info">
            <div class="name">${config.name}</div>
            ${monthObj
              ? html`<div class="state">This month ${this._energyText(config.month!, monthV, monthObj)}</div>`
              : nothing}
          </div>
          ${powerObj
            ? html`
                <div class="trailing">
                  <span class="value">${formatNumber(hass, config.power!, powerV)}</span>
                  <span class="unit"
                    >${(powerObj.attributes.unit_of_measurement as string | undefined) ?? 'W'}</span
                  >
                </div>
              `
            : nothing}
        </div>
        <div class="bars">
          ${this._barRow('Today', 'today', pctOf(todayV), this._energyText(config.today, todayV, todayObj))}
          ${yesterdayObj
            ? this._barRow(
                'Yesterday',
                'yesterday',
                pctOf(yesterdayV),
                this._energyText(config.yesterday!, yesterdayV, yesterdayObj)
              )
            : nothing}
        </div>
        ${hasDelta
          ? html`
              <div class="delta">
                vs yesterday <span class="pct ${deltaClass}">${deltaText}</span>
              </div>
            `
          : nothing}
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
        display: flex;
        align-items: center;
        gap: 12px;
        min-width: 0;
      }
      .bars {
        display: grid;
        grid-template-columns: max-content 1fr max-content;
        align-items: center;
        gap: 6px 10px;
      }
      .bar-label {
        font-size: 12px;
        line-height: 1;
        color: var(--secondary-text-color);
        white-space: nowrap;
      }
      .bar-track {
        height: 8px;
        border-radius: 6px;
        background: rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.06);
        overflow: hidden;
      }
      .bar-fill {
        height: 100%;
        border-radius: 6px;
        width: 0;
        transition: width 400ms var(--silk-ease-out);
      }
      .bar-fill.today {
        background: var(--silk-accent);
      }
      .bar-fill.yesterday {
        background: rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.15);
      }
      .bar-value {
        font-size: 12px;
        line-height: 1;
        color: var(--primary-text-color);
        font-variant-numeric: tabular-nums;
        text-align: right;
        white-space: nowrap;
      }
      .delta {
        font-size: 12px;
        line-height: 1.2;
        color: var(--secondary-text-color);
        text-align: right;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .delta .pct {
        font-weight: 600;
        font-variant-numeric: tabular-nums;
      }
      .delta .pct.down {
        color: var(--success-color, #43a047);
      }
      .delta .pct.up {
        color: var(--warning-color, #ffa600);
      }
      .unavailable .bars,
      .unavailable .delta {
        opacity: 0.45;
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    'silk-energy-card': SilkEnergyCard;
  }
}
