import { LitElement, html, css, nothing, TemplateResult } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { HomeAssistant, LovelaceCardConfig } from '../types';
import { silkControlStyles } from '../shared/base';
import { isUnavailable, moreInfo, clamp } from '../shared/service';
import { accentFor } from '../shared/color';
import { registerRowsEditor } from '../shared/rows';
import { formatNumber } from '../format';

export const META = {
  type: 'silk-bar-card',
  name: 'Silk Bar',
  description: 'A linear gauge with a target you can see.',
};

/** A color step: applies when `from <= value`. Highest matching `from` wins. */
export interface BarSegment {
  from: number;
  color: string;
}

export interface SilkBarCardConfig extends LovelaceCardConfig {
  entity: string;
  name?: string;
  icon?: string;
  /** Accent override; segments (when matched) take precedence. */
  color?: string;
  min?: number;
  max?: number;
  unit?: string;
  /** Draws a subtle notch line at this value on the track. */
  target?: number;
  /** Threshold colors, same shape as silk-gauge; edited row by row. */
  segments?: BarSegment[];
}

const EDITOR_TAG = 'silk-bar-card-editor';

// `segments` is a list of {from, color} steps — one ha-form per step, so the
// threshold colors are clicked in rather than written by hand.
registerRowsEditor(EDITOR_TAG, {
  field: 'segments',
  title: '색상 구간',
  addLabel: '구간 추가',
  blank: { from: 0, color: 'blue' },
  row: [
    { name: 'from', label: '시작 값', selector: { number: { step: 'any', mode: 'box' } } },
    { name: 'color', label: '색상', selector: { ui_color: {} } },
  ],
  schema: [
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
        { name: 'target', selector: { number: { mode: 'box' } } },
        { name: 'unit', selector: { text: {} } },
      ],
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
  labels: {
    entity: '엔티티',
    name: '이름',
    min: '최솟값',
    max: '최댓값',
    target: '목표값',
    unit: '단위',
    icon: '아이콘',
    color: '강조 색상',
  },
  defaults: { min: 0, max: 100 },
});

@customElement('silk-bar-card')
export class SilkBarCard extends LitElement {
  @property({ attribute: false }) public hass?: HomeAssistant;

  @state() private _config?: SilkBarCardConfig;
  /** False for the first paint so the fill sweeps in from zero on mount. */
  @state() private _drawn = false;

  private _segments: BarSegment[] = [];

  public static getStubConfig(hass: HomeAssistant): Partial<SilkBarCardConfig> {
    const ids = Object.keys(hass.states).filter(
      (id) => id.startsWith('sensor.') && Number.isFinite(Number(hass.states[id].state))
    );
    const byClass = (cls: string) =>
      ids.find((id) => hass.states[id].attributes.device_class === cls);
    return { type: 'custom:silk-bar-card', entity: byClass('battery') ?? byClass('power') ?? ids[0] };
  }

  public static async getConfigElement(): Promise<HTMLElement> {
    return document.createElement(EDITOR_TAG);
  }

  public setConfig(config: SilkBarCardConfig): void {
    if (!config.entity) {
      throw new Error('silk-bar-card: `entity` is required');
    }
    if (config.segments !== undefined && !Array.isArray(config.segments)) {
      throw new Error('silk-bar-card: `segments` must be a list of {from, color}');
    }
    this._segments = (config.segments ?? [])
      .filter(
        (seg): seg is BarSegment =>
          typeof seg?.from === 'number' && Number.isFinite(seg.from) && typeof seg?.color === 'string'
      )
      .sort((a, b) => a.from - b.from);
    this._config = config;
  }

  public getCardSize(): number {
    return 1;
  }

  public getGridOptions(): Record<string, number> {
    return { columns: 6, rows: 1, min_columns: 3, min_rows: 1 };
  }

  protected firstUpdated(): void {
    // Commit one frame at zero width so the 450ms transition sweeps the fill in.
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

  private _formatBound(value: number): string {
    const locale = this.hass?.locale?.language ?? this.hass?.language ?? 'en';
    return new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).format(value);
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
    const numeric = Number(stateObj.state);
    const hasValue = !unavailable && stateObj.state !== '' && Number.isFinite(numeric);
    const min = config.min ?? 0;
    const max = config.max ?? 100;
    const span = max - min;
    const fraction = hasValue && span > 0 ? clamp((numeric - min) / span, 0, 1) : 0;
    const pct = (this._drawn ? fraction : 0) * 100;
    const targetPct =
      typeof config.target === 'number' && Number.isFinite(config.target) && span > 0
        ? clamp((config.target - min) / span, 0, 1) * 100
        : undefined;
    const accent =
      (hasValue ? this._segmentColor(numeric) : undefined) ?? accentFor(stateObj, config.color);
    const unit = config.unit ?? stateObj.attributes.unit_of_measurement ?? '';
    const name = config.name ?? stateObj.attributes.friendly_name ?? config.entity;

    return html`
      <ha-card
        class="control ${unavailable ? 'unavailable' : ''}"
        style="--silk-accent:${accent}"
        @click=${this._onCardClick}
      >
        <div class="icon">
          ${config.icon
            ? html`<ha-icon .icon=${config.icon}></ha-icon>`
            : html`<ha-state-icon .hass=${hass} .stateObj=${stateObj}></ha-state-icon>`}
        </div>
        <div class="info">
          <div class="name" title=${name}>${name}</div>
          <div class="track">
            <div class="fill" style="width:${pct}%"></div>
            ${targetPct !== undefined
              ? html`<div class="notch" style="left:${targetPct}%"></div>`
              : nothing}
          </div>
          <div class="bounds">
            <span>${this._formatBound(min)}</span>
            <span>${this._formatBound(max)}</span>
          </div>
        </div>
        <div class="trailing">
          <span class="value">${hasValue ? formatNumber(hass, config.entity, numeric) : '—'}</span>
          ${unit ? html`<span class="unit">${unit}</span>` : nothing}
        </div>
      </ha-card>
    `;
  }

  static styles = [
    silkControlStyles,
    css`
      .info {
        display: flex;
        flex-direction: column;
        gap: 4px;
      }
      .track {
        position: relative;
        height: 10px;
        border-radius: 999px;
        background: rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.08);
        overflow: hidden;
      }
      .fill {
        position: absolute;
        inset: 0 auto 0 0;
        background: var(--silk-accent);
        transition:
          width 450ms var(--silk-ease-out),
          background 200ms ease;
      }
      .notch {
        position: absolute;
        top: 0;
        bottom: 0;
        width: 2px;
        transform: translateX(-50%);
        background: rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.4);
        pointer-events: none;
      }
      .bounds {
        display: flex;
        justify-content: space-between;
        font-size: 10px;
        line-height: 1;
        color: var(--primary-text-color);
        opacity: 0.45;
        font-variant-numeric: tabular-nums;
      }
      .trailing {
        align-items: baseline;
        gap: 3px;
      }
      .value {
        white-space: nowrap;
      }
      .unit {
        white-space: nowrap;
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    'silk-bar-card': SilkBarCard;
  }
}
