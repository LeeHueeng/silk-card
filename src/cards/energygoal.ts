import { LitElement, html, css, nothing, TemplateResult } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { HomeAssistant, HassEntity, LovelaceCardConfig } from '../types';
import { silkControlStyles } from '../shared/base';
import { isUnavailable, moreInfo, clamp } from '../shared/service';
import { accentFor } from '../shared/color';
import { registerEditor } from '../shared/editor';

export const META = {
  type: 'silk-goal-card',
  name: 'Silk Goal',
  description: 'This month against your budget.',
};

export interface SilkGoalCardConfig extends LovelaceCardConfig {
  /** Month-to-date energy total (kWh). */
  entity: string;
  /** The budget for the whole month, in the entity's unit. */
  goal: number;
  name?: string;
  /** Accent override. */
  color?: string;
}

const EDITOR_TAG = 'silk-goal-card-editor';

registerEditor(
  EDITOR_TAG,
  [
    {
      name: 'entity',
      required: true,
      selector: { entity: { domain: ['sensor'], device_class: ['energy', 'gas', 'water'] } },
    },
    { name: 'goal', required: true, selector: { number: { min: 1, step: 1, mode: 'box' } } },
    { name: 'name', selector: { text: {} } },
    { name: 'color', selector: { ui_color: {} } },
  ],
  {
    entity: '이번 달 누적 사용량',
    goal: '월 목표량',
    name: '이름',
    color: '강조 색상',
  },
  { goal: 300 }
);

const DAY_MS = 86_400_000;
/** The pace marker only creeps; a quarter-hour tick is plenty. */
const TICK_MS = 900_000;

/** Numeric state, NaN when the entity is missing/unavailable/non-numeric. */
function numericState(stateObj?: HassEntity): number {
  if (!stateObj || isUnavailable(stateObj) || stateObj.state === '') return NaN;
  return Number(stateObj.state);
}

@customElement('silk-goal-card')
export class SilkGoalCard extends LitElement {
  @property({ attribute: false }) public hass?: HomeAssistant;

  @state() private _config?: SilkGoalCardConfig;
  @state() private _now = Date.now();
  /** False for the first paint so the fill sweeps in from zero on mount. */
  @state() private _drawn = false;

  private _tickTimer?: number;

  public static getStubConfig(hass: HomeAssistant): Partial<SilkGoalCardConfig> {
    const ids = Object.keys(hass.states).filter(
      (id) => id.startsWith('sensor.') && hass.states[id].attributes.device_class === 'energy'
    );
    return {
      type: 'custom:silk-goal-card',
      entity: ids.find((id) => /month/i.test(id)) ?? ids[0],
      goal: 300,
    };
  }

  public static async getConfigElement(): Promise<HTMLElement> {
    return document.createElement(EDITOR_TAG);
  }

  public setConfig(config: SilkGoalCardConfig): void {
    if (!config.entity) {
      throw new Error('silk-goal-card: `entity` is required (a month-to-date total)');
    }
    if (!(Number(config.goal) > 0)) {
      throw new Error('silk-goal-card: `goal` must be a positive number of kWh');
    }
    this._config = config;
    this._now = Date.now();
  }

  public getCardSize(): number {
    return 2;
  }

  public getGridOptions(): Record<string, number> {
    return { columns: 6, rows: 2, min_columns: 4, min_rows: 2 };
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

  protected firstUpdated(): void {
    // Commit one frame at zero width so the 400ms fill transition sweeps in.
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        this._drawn = true;
      });
    });
  }

  private _locale(): string {
    return this.hass?.locale?.language ?? this.hass?.language ?? 'en';
  }

  private _num(value: number, digits = 0): string {
    if (!Number.isFinite(value)) return '—';
    return new Intl.NumberFormat(this._locale(), {
      maximumFractionDigits: digits,
      minimumFractionDigits: digits,
    }).format(value);
  }

  /** Where the month is: fractional days elapsed over its real length. */
  private _month(): { elapsed: number; days: number; fraction: number } {
    const now = new Date(this._now);
    const start = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
    const days = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const elapsed = clamp((this._now - start) / DAY_MS, 0, days);
    return { elapsed, days, fraction: clamp(elapsed / days, 0, 1) };
  }

  private _onCardClick(): void {
    if (this._config) moreInfo(this, this._config.entity);
  }

  protected render(): TemplateResult | typeof nothing {
    const config = this._config;
    const hass = this.hass;
    if (!config || !hass) return nothing;
    const stateObj = hass.states[config.entity];
    if (!stateObj) {
      return html`
        <ha-card class="control">
          <div class="warning">Entity not found: ${config.entity}</div>
        </ha-card>
      `;
    }

    const unavailable = isUnavailable(stateObj);
    const goal = Number(config.goal);
    const used = numericState(stateObj);
    const hasValue = Number.isFinite(used);
    const unit = String(stateObj.attributes.unit_of_measurement ?? 'kWh');
    const name = config.name ?? stateObj.attributes.friendly_name ?? config.entity;

    const { elapsed, days, fraction } = this._month();
    const pace = goal * fraction;
    const pct = hasValue ? (used / goal) * 100 : NaN;
    const over = hasValue && used > goal;
    // Behind means burning faster than the month is passing — a real status,
    // which is the only thing that earns a status color here.
    const behind = hasValue && !over && used > pace;
    const tone = over ? 'over' : behind ? 'warn' : '';
    const width = hasValue && this._drawn ? clamp(pct, 0, 100) : 0;

    const projected = hasValue && fraction > 0 ? used / fraction : NaN;
    const projection = !hasValue
      ? 'Waiting for a reading'
      : over
        ? `Over budget by ${this._num(used - goal, 1)} ${unit}`
        : !Number.isFinite(projected)
          ? `Pace ${this._num(pace, 0)} ${unit} by today`
          : projected > goal
            ? `Heading for ${this._num(projected, 0)} ${unit}`
            : `On track for ${this._num(projected, 0)} ${unit}`;

    const accent = accentFor(stateObj, config.color);

    return html`
      <ha-card
        class="control ${unavailable ? 'unavailable' : ''}"
        style="--silk-accent:${accent}"
        @click=${this._onCardClick}
      >
        <div class="head">
          <span class="title" title=${name}>${name}</span>
          <span class="period">Day ${Math.min(Math.floor(elapsed) + 1, days)} of ${days}</span>
        </div>
        <div
          class="track"
          title=${`Used ${this._num(used, 1)} of ${this._num(goal, 0)} ${unit}`}
        >
          <div class="fill ${tone}" style="width:${width.toFixed(2)}%"></div>
          <div
            class="pace"
            style="left:${(fraction * 100).toFixed(2)}%"
            title=${`Pace · ${this._num(pace, 0)} ${unit} by today`}
          ></div>
        </div>
        <div class="hero">
          <span class="pct ${tone}">${hasValue ? `${this._num(pct, 0)}%` : '—'}</span>
          <span class="of">of ${this._num(goal, 0)} ${unit}</span>
        </div>
        <div class="foot ${tone}">${projection}</div>
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
        gap: 7px;
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
        font-variant-numeric: tabular-nums;
        white-space: nowrap;
      }
      .track {
        position: relative;
        flex: none;
        height: 14px;
        border-radius: 7px;
        background: rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.08);
        overflow: hidden;
      }
      .fill {
        position: absolute;
        inset: 0 auto 0 0;
        border-radius: 7px;
        background: var(--silk-accent);
        transition:
          width 400ms var(--silk-ease-out),
          background 200ms ease;
      }
      .fill.warn {
        background: var(--warning-color, #ffa600);
      }
      .fill.over {
        background: var(--error-color, #db4437);
      }
      /* The pace marker is a hairline notch, readable over fill and track alike. */
      .pace {
        position: absolute;
        top: 0;
        bottom: 0;
        width: 2px;
        margin-left: -1px;
        border-radius: 1px;
        background: var(--primary-text-color);
        opacity: 0.45;
      }
      .hero {
        flex: none;
        display: flex;
        align-items: baseline;
        gap: 6px;
        min-width: 0;
      }
      .pct {
        font-size: 26px;
        font-weight: 600;
        letter-spacing: -0.02em;
        line-height: 1.05;
        color: var(--primary-text-color);
        font-variant-numeric: tabular-nums;
      }
      .pct.warn {
        color: var(--warning-color, #ffa600);
      }
      .pct.over {
        color: var(--error-color, #db4437);
      }
      .of {
        flex: 1;
        min-width: 0;
        font-size: 12.5px;
        color: var(--secondary-text-color);
        font-variant-numeric: tabular-nums;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .foot {
        flex: none;
        font-size: 12px;
        line-height: 1.3;
        color: var(--secondary-text-color);
        font-variant-numeric: tabular-nums;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .foot.warn {
        color: var(--warning-color, #ffa600);
      }
      .foot.over {
        color: var(--error-color, #db4437);
      }
      .unavailable .track,
      .unavailable .hero,
      .unavailable .foot {
        opacity: 0.45;
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    'silk-goal-card': SilkGoalCard;
  }
}
