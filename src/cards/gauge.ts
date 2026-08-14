import { LitElement, html, css, nothing, TemplateResult } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { HomeAssistant, LovelaceCardConfig } from '../types';
import { silkControlStyles } from '../shared/base';
import { isUnavailable, moreInfo, clamp } from '../shared/service';
import { accentFor } from '../shared/color';
import { registerEditor } from '../shared/editor';

export const META = {
  type: 'silk-gauge-card',
  name: 'Silk Gauge',
  description: 'A clean arc gauge that animates to its value.',
};

/** A color step: applies when `from <= value`. Highest matching `from` wins. */
export interface GaugeSegment {
  from: number;
  color: string;
}

export interface SilkGaugeCardConfig extends LovelaceCardConfig {
  entity: string;
  name?: string;
  min?: number;
  max?: number;
  unit?: string;
  /** Accent override; segments (when matched) take precedence. */
  color?: string;
  /** YAML-only threshold colors. */
  segments?: GaugeSegment[];
}

/**
 * Arc geometry — a 270° sweep with the gap centered at the bottom, drawn
 * clockwise from bottom-left. viewBox is 100 wide so x units double as
 * percentages for the HTML min/max labels; height is cropped to 96 because
 * the bottom sector holds only those labels.
 */
const RADIUS = 42;
const CX = 50;
const CY = 50;
const SWEEP_DEG = 270;
const START_DEG = 90 + (360 - SWEEP_DEG) / 2; // 135° — gap sits at the bottom
const VIEW_W = 100;
const VIEW_H = 96;

function polar(deg: number): [number, number] {
  const rad = (deg * Math.PI) / 180;
  return [CX + RADIUS * Math.cos(rad), CY + RADIUS * Math.sin(rad)];
}

const [ARC_X0, ARC_Y0] = polar(START_DEG);
const [ARC_X1, ARC_Y1] = polar(START_DEG + SWEEP_DEG);
const ARC_PATH = `M ${ARC_X0.toFixed(2)} ${ARC_Y0.toFixed(2)} A ${RADIUS} ${RADIUS} 0 1 1 ${ARC_X1.toFixed(2)} ${ARC_Y1.toFixed(2)}`;
/** `pathLength` normalizes the arc to 100, so dashoffset = 100 − percent. */
const ARC_UNITS = 100;

@customElement('silk-gauge-card')
export class SilkGaugeCard extends LitElement {
  @property({ attribute: false }) public hass?: HomeAssistant;

  @state() private _config?: SilkGaugeCardConfig;
  /** False for the first paint so the arc sweeps in from zero on mount. */
  @state() private _drawn = false;

  private _segments: GaugeSegment[] = [];

  public static getStubConfig(hass: HomeAssistant): Partial<SilkGaugeCardConfig> {
    const ids = Object.keys(hass.states).filter(
      (id) => id.startsWith('sensor.') && Number.isFinite(Number(hass.states[id].state))
    );
    const byClass = (cls: string) =>
      ids.find((id) => hass.states[id].attributes.device_class === cls);
    return { type: 'custom:silk-gauge-card', entity: byClass('battery') ?? byClass('power') ?? ids[0] };
  }

  public static async getConfigElement(): Promise<HTMLElement> {
    return document.createElement('silk-gauge-card-editor');
  }

  public setConfig(config: SilkGaugeCardConfig): void {
    if (!config.entity) {
      throw new Error('silk-gauge-card: `entity` is required');
    }
    if (config.segments !== undefined && !Array.isArray(config.segments)) {
      throw new Error('silk-gauge-card: `segments` must be a list of {from, color}');
    }
    this._segments = (config.segments ?? [])
      .filter(
        (seg): seg is GaugeSegment =>
          typeof seg?.from === 'number' && Number.isFinite(seg.from) && typeof seg?.color === 'string'
      )
      .sort((a, b) => a.from - b.from);
    this._config = config;
  }

  public getCardSize(): number {
    return 2;
  }

  public getGridOptions(): Record<string, number> {
    return { columns: 3, rows: 2, min_columns: 3, min_rows: 2 };
  }

  protected firstUpdated(): void {
    // Commit one frame at zero so the 450ms dashoffset transition sweeps in.
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        this._drawn = true;
      });
    });
  }

  /** Color of the highest segment whose `from` is at or below the value. */
  private _segmentColor(value: number): string | undefined {
    for (let i = this._segments.length - 1; i >= 0; i--) {
      if (this._segments[i].from <= value) return this._segments[i].color;
    }
    return undefined;
  }

  private _locale(): string {
    return this.hass?.locale?.language ?? this.hass?.language ?? 'en';
  }

  private _formatValue(value: number): string {
    const precision = this.hass?.entities?.[this._config!.entity]?.display_precision;
    if (precision !== undefined) {
      return new Intl.NumberFormat(this._locale(), {
        minimumFractionDigits: precision,
        maximumFractionDigits: precision,
      }).format(value);
    }
    return new Intl.NumberFormat(this._locale(), {
      maximumFractionDigits: Math.abs(value) >= 100 ? 0 : 1,
    }).format(value);
  }

  private _formatBound(value: number): string {
    return new Intl.NumberFormat(this._locale(), { maximumFractionDigits: 1 }).format(value);
  }

  private _onCardClick(): void {
    if (this._config) moreInfo(this, this._config.entity);
  }

  protected render(): TemplateResult | typeof nothing {
    const config = this._config;
    if (!config) return nothing;
    const stateObj = this.hass?.states[config.entity];
    if (this.hass && !stateObj) {
      return html`<ha-card><div class="warning">Entity not found: ${config.entity}</div></ha-card>`;
    }

    const unavailable = isUnavailable(stateObj);
    const numeric = Number(stateObj?.state);
    const hasValue = !unavailable && stateObj !== undefined && stateObj.state !== '' && Number.isFinite(numeric);
    const min = config.min ?? 0;
    const max = config.max ?? 100;
    const span = max - min;
    const fraction = hasValue && span > 0 ? clamp((numeric - min) / span, 0, 1) : 0;
    const shown = this._drawn ? fraction : 0;
    const dashoffset = ARC_UNITS * (1 - shown);
    const accent =
      (hasValue ? this._segmentColor(numeric) : undefined) ?? accentFor(stateObj, config.color);
    const unit = config.unit ?? stateObj?.attributes.unit_of_measurement ?? '';
    const name = config.name ?? stateObj?.attributes.friendly_name ?? config.entity;

    return html`
      <ha-card
        class=${unavailable ? 'unavailable' : ''}
        style="--silk-accent:${accent}"
        @click=${this._onCardClick}
      >
        <div class="gauge">
          <svg viewBox="0 0 ${VIEW_W} ${VIEW_H}" aria-hidden="true">
            <path class="arc-bg" d=${ARC_PATH}></path>
            <path
              class="arc-value"
              d=${ARC_PATH}
              pathLength=${ARC_UNITS}
              stroke-dasharray=${ARC_UNITS}
              style="stroke-dashoffset:${dashoffset};opacity:${shown > 0 ? 1 : 0}"
            ></path>
          </svg>
          <div class="readout">
            <div class="value">${hasValue ? this._formatValue(numeric) : '—'}</div>
            ${unit ? html`<div class="unit">${unit}</div>` : nothing}
          </div>
          <span class="bound" style="left:${ARC_X0.toFixed(1)}%">${this._formatBound(min)}</span>
          <span class="bound" style="left:${ARC_X1.toFixed(1)}%">${this._formatBound(max)}</span>
        </div>
        <div class="name" title=${name}>${name}</div>
      </ha-card>
    `;
  }

  static styles = [
    silkControlStyles,
    css`
      ha-card {
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 2px;
        padding: 8px 12px;
      }
      .gauge {
        position: relative;
        flex: none;
        width: 100%;
        max-width: 88px;
        aspect-ratio: ${VIEW_W} / ${VIEW_H};
      }
      svg {
        display: block;
        width: 100%;
        height: 100%;
        overflow: visible;
      }
      .arc-bg,
      .arc-value {
        fill: none;
        stroke-width: 8;
        stroke-linecap: round;
      }
      .arc-bg {
        stroke: rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.08);
      }
      .arc-value {
        stroke: var(--silk-accent);
        transition:
          stroke-dashoffset 450ms var(--silk-ease-out),
          stroke 200ms ease,
          opacity 200ms ease;
      }
      .readout {
        position: absolute;
        left: 50%;
        top: 52%;
        transform: translate(-50%, -50%);
        text-align: center;
        pointer-events: none;
      }
      .value {
        font-size: 24px;
        font-weight: 600;
        letter-spacing: -0.02em;
        line-height: 1.1;
        color: var(--primary-text-color);
        font-variant-numeric: tabular-nums;
        white-space: nowrap;
      }
      .unit {
        font-size: 11px;
        font-weight: 500;
        line-height: 1.2;
        margin-top: 1px;
        color: var(--secondary-text-color);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .bound {
        position: absolute;
        bottom: 0;
        transform: translateX(-50%);
        font-size: 10px;
        line-height: 1;
        color: var(--primary-text-color);
        opacity: 0.45;
        font-variant-numeric: tabular-nums;
        pointer-events: none;
      }
      .name {
        font-size: 13px;
        font-weight: 400;
        line-height: 1.3;
        color: var(--secondary-text-color);
        max-width: 100%;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        text-align: center;
      }
      .unavailable .gauge,
      .unavailable .name {
        opacity: 0.45;
      }
    `,
  ];
}

registerEditor(
  'silk-gauge-card-editor',
  [
    {
      name: 'entity',
      required: true,
      selector: { entity: { domain: ['counter', 'input_number', 'number', 'sensor'] } },
    },
    { name: 'name', selector: { text: {} } },
    {
      name: '',
      type: 'grid',
      schema: [
        { name: 'min', selector: { number: { mode: 'box' } } },
        { name: 'max', selector: { number: { mode: 'box' } } },
        { name: 'unit', selector: { text: {} } },
        { name: 'color', selector: { ui_color: {} } },
      ],
    },
  ],
  {
    entity: '엔티티',
    name: '이름',
    min: '최솟값',
    max: '최댓값',
    unit: '단위',
    color: '강조 색상',
  },
  { min: 0, max: 100 }
);

declare global {
  interface HTMLElementTagNameMap {
    'silk-gauge-card': SilkGaugeCard;
  }
}
