import { LitElement, html, css, nothing, TemplateResult } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { HomeAssistant, HassEntity, LovelaceCardConfig } from '../types';
import { silkControlStyles } from '../shared/base';
import { isUnavailable, moreInfo, haptic } from '../shared/service';
import { accentFor } from '../shared/color';
import { registerEditor } from '../shared/editor';
import { formatNumber } from '../format';

export const META = {
  type: 'silk-water-card',
  name: 'Silk Water',
  description: 'Flow now, usage today, leak alarm loud.',
};

export interface SilkWaterCardConfig extends LovelaceCardConfig {
  /** Live flow rate sensor (L/min, m³/h — whatever the entity itself reports). */
  flow?: string;
  /** Volume used today. */
  today?: string;
  /** Volume used this month; also drives the daily-average comparison. */
  month?: string;
  /** Leak binary_sensor — `on` flips the whole card into its alert state. */
  leak?: string;
  name?: string;
  icon?: string;
  /** Accent override (YAML only). A live leak always wins over it. */
  color?: string;
}

const DEFAULT_NAME = 'Water';
const DEFAULT_ICON = 'mdi:water';
const ALERT_ICON = 'mdi:water-alert';
/** Leak is a genuine status semantic, so it earns the error token as accent. */
const ALERT_ACCENT = 'var(--error-color, #db4437)';
/** Daily average divisor: a flat 30-day month, so the bar means one thing always. */
const MONTH_DAYS = 30;

const EDITOR_TAG = 'silk-water-card-editor';

registerEditor(
  EDITOR_TAG,
  [
    { name: 'flow', selector: { entity: { domain: ['sensor'] } } },
    { name: 'today', selector: { entity: { domain: ['sensor'] } } },
    { name: 'month', selector: { entity: { domain: ['sensor'] } } },
    { name: 'leak', selector: { entity: { domain: ['binary_sensor'] } } },
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
    flow: '유량 센서',
    today: '오늘 사용량',
    month: '이번 달 사용량',
    leak: '누수 센서',
    name: '이름',
    icon: '아이콘',
    color: '강조 색상',
  },
  { name: DEFAULT_NAME, icon: DEFAULT_ICON }
);

/** Numeric state, NaN when the entity is missing/unavailable/non-numeric. */
function numericState(stateObj?: HassEntity): number {
  if (!stateObj || isUnavailable(stateObj) || stateObj.state === '') return NaN;
  return Number(stateObj.state);
}

/** Join state-line segments with the shared `·` separator. */
function joinSegments(parts: string[]): (TemplateResult | string)[] {
  const out: (TemplateResult | string)[] = [];
  parts.forEach((part, i) => {
    if (i) out.push(html`<span class="sep">·</span>`);
    out.push(part);
  });
  return out;
}

@customElement('silk-water-card')
export class SilkWaterCard extends LitElement {
  @property({ attribute: false }) public hass?: HomeAssistant;

  @state() private _config?: SilkWaterCardConfig;
  /** False for the first paint so the comparison bars grow in from zero. */
  @state() private _drawn = false;

  public static getStubConfig(hass: HomeAssistant): Partial<SilkWaterCardConfig> {
    const ids = Object.keys(hass.states);
    const sensors = ids.filter((id) => id.startsWith('sensor.'));
    const isWater = (id: string): boolean =>
      hass.states[id].attributes.device_class === 'water' || /water/.test(id);
    const water = sensors.filter(isWater);
    const flow = water.find((id) => /flow|rate|lpm|l_min/.test(id));
    return {
      type: 'custom:silk-water-card',
      flow,
      today: water.find((id) => /today|daily/.test(id)) ?? water.find((id) => id !== flow),
      month: water.find((id) => /month/.test(id)),
      leak: ids.find(
        (id) =>
          id.startsWith('binary_sensor.') &&
          (hass.states[id].attributes.device_class === 'moisture' || /leak|water/.test(id))
      ),
    };
  }

  public static async getConfigElement(): Promise<HTMLElement> {
    return document.createElement(EDITOR_TAG);
  }

  public setConfig(config: SilkWaterCardConfig): void {
    if (!config.flow && !config.today && !config.month && !config.leak) {
      throw new Error('silk-water-card: at least one of `flow`, `today`, `month` or `leak` is required');
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
    // Commit one frame at zero width so the 400ms bar transition sweeps in.
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        this._drawn = true;
      });
    });
  }

  /** The entity a card tap belongs to — a live leak outranks everything. */
  private _primary(alert: boolean): string | undefined {
    const config = this._config;
    if (!config) return undefined;
    if (alert && config.leak) return config.leak;
    return config.flow ?? config.today ?? config.month ?? config.leak;
  }

  private _onTap(): void {
    const entity = this._primary(this._isAlert());
    if (!entity) return;
    haptic(this);
    moreInfo(this, entity);
  }

  private _isAlert(): boolean {
    const leak = this._config?.leak;
    return !!leak && this.hass?.states[leak]?.state === 'on';
  }

  /** `128 L` — value plus the entity's own unit, never a converted one. */
  private _volumeText(entityId: string, value: number, stateObj?: HassEntity): string {
    if (!Number.isFinite(value)) return '—';
    const unit = (stateObj?.attributes.unit_of_measurement as string | undefined) ?? '';
    const num = formatNumber(this.hass, entityId, value);
    return unit ? `${num} ${unit}` : num;
  }

  /** One labeled comparison row inside the `.bars` grid. */
  private _barRow(label: string, cls: string, pct: number, valueText: string): TemplateResult {
    return html`
      <span class="bar-label">${label}</span>
      <div class="bar-track" title="${label} · ${valueText}">
        <div class="bar-fill ${cls}" style="width:${this._drawn ? pct : 0}%"></div>
      </div>
      <span class="bar-value">${valueText}</span>
    `;
  }

  protected render(): TemplateResult | typeof nothing {
    const config = this._config;
    const hass = this.hass;
    if (!config || !hass) return nothing;

    const alert = this._isAlert();
    const primary = this._primary(alert);
    if (primary && !hass.states[primary]) {
      return html`
        <ha-card class="control">
          <div class="warning">Entity not found: ${primary}</div>
        </ha-card>
      `;
    }

    const flowObj = config.flow ? hass.states[config.flow] : undefined;
    const todayObj = config.today ? hass.states[config.today] : undefined;
    const monthObj = config.month ? hass.states[config.month] : undefined;
    const leakObj = config.leak ? hass.states[config.leak] : undefined;

    const configured = [config.flow, config.today, config.month, config.leak].filter(
      (id): id is string => !!id
    );
    const unavailable = configured.every((id) => isUnavailable(hass.states[id]));

    const flowV = numericState(flowObj);
    const flowing = Number.isFinite(flowV) && flowV > 0;
    const flowUnit = (flowObj?.attributes.unit_of_measurement as string | undefined) ?? '';

    const todayV = numericState(todayObj);
    const monthV = numericState(monthObj);
    const todayUnit = (todayObj?.attributes.unit_of_measurement as string | undefined) ?? '';
    const monthUnit = (monthObj?.attributes.unit_of_measurement as string | undefined) ?? '';
    const avgV = Number.isFinite(monthV) ? monthV / MONTH_DAYS : NaN;

    // Two bars only compare honestly when both numbers are in the same unit.
    const comparable = Number.isFinite(todayV) && Number.isFinite(avgV) && todayUnit === monthUnit;
    const maxV = comparable ? Math.max(todayV, avgV) : 0;
    const pctOf = (v: number): number => (maxV > 0 ? Math.min((v / maxV) * 100, 100) : 0);

    const accent = alert ? ALERT_ACCENT : accentFor(flowObj ?? todayObj ?? monthObj, config.color);
    const name = config.name ?? DEFAULT_NAME;
    const icon = alert ? ALERT_ICON : config.icon ?? DEFAULT_ICON;

    const segments: string[] = [];
    if (todayObj) segments.push(`Today ${this._volumeText(config.today!, todayV, todayObj)}`);
    if (monthObj) segments.push(`Month ${this._volumeText(config.month!, monthV, monthObj)}`);
    const stateLine: (TemplateResult | string)[] = alert
      ? ['Leak detected']
      : segments.length
        ? joinSegments(segments)
        : leakObj && !isUnavailable(leakObj)
          ? ['No leak']
          : [];

    return html`
      <ha-card
        class="control ${unavailable ? 'unavailable' : ''} ${flowObj ? 'piped' : ''}"
        style="--silk-accent:${accent}"
        @click=${this._onTap}
      >
        <div class="top">
          <div class="icon ${alert || flowing ? 'on' : ''}">
            <ha-icon .icon=${icon}></ha-icon>
          </div>
          <div class="info">
            <div class="name" title=${name}>${name}</div>
            ${stateLine.length
              ? html`<div class="state ${alert ? 'alarm' : ''}">${stateLine}</div>`
              : nothing}
          </div>
          ${flowObj
            ? html`
                <div class="trailing">
                  <span class="value flow"
                    >${Number.isFinite(flowV) ? formatNumber(hass, config.flow!, flowV) : '—'}</span
                  >
                  ${flowUnit ? html`<span class="unit">${flowUnit}</span>` : nothing}
                </div>
              `
            : nothing}
        </div>
        ${comparable
          ? html`
              <div class="bars">
                ${this._barRow(
                  'Today',
                  'today',
                  pctOf(todayV),
                  this._volumeText(config.today!, todayV, todayObj)
                )}
                ${this._barRow(
                  'Daily avg',
                  'avg',
                  pctOf(avgV),
                  this._volumeText(config.month!, avgV, monthObj)
                )}
              </div>
            `
          : nothing}
        ${flowObj
          ? html`
              <div class="flowbar" aria-hidden="true">
                ${flowing ? html`<div class="seg"></div>` : nothing}
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
        gap: 6px;
      }
      /* The flow channel lives in reserved padding, so it never shifts layout. */
      ha-card.piped {
        padding-bottom: 30px;
      }
      .top {
        flex: none;
        display: flex;
        align-items: center;
        gap: 12px;
        min-width: 0;
      }
      /* Data card: the icon presses with the card, it is not a control. */
      .icon {
        cursor: pointer;
      }
      .icon:active {
        transform: none;
      }
      .state.alarm {
        color: var(--error-color, #db4437);
        font-weight: 600;
      }
      .trailing {
        align-items: baseline;
        gap: 4px;
      }
      .value.flow {
        font-size: 20px;
        letter-spacing: -0.02em;
        line-height: 1.1;
      }
      .bars {
        flex: none;
        display: grid;
        grid-template-columns: max-content 1fr max-content;
        align-items: center;
        gap: 4px 10px;
      }
      .bar-label {
        font-size: 11px;
        line-height: 12px;
        color: var(--secondary-text-color);
        white-space: nowrap;
      }
      .bar-track {
        height: 6px;
        border-radius: 3px;
        background: rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.06);
        overflow: hidden;
      }
      .bar-fill {
        height: 100%;
        border-radius: 3px;
        width: 0;
        transition: width 400ms var(--silk-ease-out);
      }
      /* One hue for magnitude: today in accent, the reference bar recessive. */
      .bar-fill.today {
        background: var(--silk-accent);
      }
      .bar-fill.avg {
        background: rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.18);
      }
      .bar-value {
        font-size: 11px;
        line-height: 12px;
        color: var(--primary-text-color);
        font-variant-numeric: tabular-nums;
        text-align: right;
        white-space: nowrap;
      }
      .flowbar {
        position: absolute;
        left: 0;
        right: 0;
        bottom: 0;
        height: 24px;
        overflow: hidden;
        z-index: 0;
        pointer-events: none;
        background: color-mix(in srgb, var(--silk-accent) 8%, transparent);
      }
      /*
       * A segment travelling down the pipe. Like the fan card's rotation this
       * loop depicts real movement — it only exists while water actually flows.
       * Width is 30% of the channel, so a full pass is -100% → 333% of itself.
       */
      .flowbar .seg {
        position: absolute;
        top: 0;
        bottom: 0;
        left: 0;
        width: 30%;
        background: var(--silk-accent);
        opacity: 0.4;
        will-change: transform;
        animation: silk-water-flow 2000ms linear infinite;
      }
      @keyframes silk-water-flow {
        from {
          transform: translateX(-100%);
        }
        to {
          transform: translateX(333.34%);
        }
      }
      .unavailable .bars,
      .unavailable .flowbar {
        opacity: 0.45;
      }
      @media (prefers-reduced-motion: reduce) {
        /* Shared styles crush every duration to 0.01ms; park the segment instead. */
        .flowbar .seg {
          animation: none;
          transform: translateX(116%);
        }
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    'silk-water-card': SilkWaterCard;
  }
}
