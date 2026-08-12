import { LitElement, html, css, nothing, TemplateResult } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { HomeAssistant, LovelaceCardConfig } from '../types';
import { silkControlStyles } from '../shared/base';
import { isUnavailable, moreInfo, clamp } from '../shared/service';
import { accentFor } from '../shared/color';
import { registerEditor } from '../shared/editor';
import { formatNumber } from '../format';

export const META = {
  type: 'silk-ring-card',
  name: 'Silk Ring',
  description: 'A full-circle gauge built for grids.',
};

/** A color step: applies when `from <= value`. Highest matching `from` wins. */
export interface RingSegment {
  from: number;
  color: string;
}

export interface SilkRingCardConfig extends LovelaceCardConfig {
  entity: string;
  name?: string;
  min?: number;
  max?: number;
  unit?: string;
  /** Center content: the number (default) or the entity icon. */
  display?: 'value' | 'icon';
  /** YAML-only threshold colors, same shape as silk-gauge. */
  segments?: RingSegment[];
}

const EDITOR_TAG = 'silk-ring-card-editor';

registerEditor(
  EDITOR_TAG,
  [
    {
      name: 'entity',
      required: true,
      selector: { entity: { domain: ['counter', 'input_number', 'number', 'sensor'] } },
    },
    { name: 'name', selector: { text: {} } },
    { name: 'min', selector: { number: { mode: 'box' } } },
    { name: 'max', selector: { number: { mode: 'box' } } },
  ],
  { entity: 'Entity', name: 'Name', min: 'Minimum', max: 'Maximum' },
  { min: 0, max: 100 }
);

/**
 * Donut geometry. The circle stroke natively starts at 3 o'clock and sweeps
 * clockwise; a -90° rotation moves the start to 12 o'clock. `pathLength`
 * normalizes the circumference to 100, so dashoffset = 100 − percent.
 */
const SIZE = 48;
const CENTER = SIZE / 2;
const RADIUS = 21; // stroke 6 → outer edge at 24, flush with the viewBox
const ARC_UNITS = 100;

@customElement('silk-ring-card')
export class SilkRingCard extends LitElement {
  @property({ attribute: false }) public hass?: HomeAssistant;

  @state() private _config?: SilkRingCardConfig;
  /** False for the first paint so the arc sweeps in from zero on mount. */
  @state() private _drawn = false;

  private _segments: RingSegment[] = [];

  public static getStubConfig(hass: HomeAssistant): Partial<SilkRingCardConfig> {
    const ids = Object.keys(hass.states).filter(
      (id) => id.startsWith('sensor.') && Number.isFinite(Number(hass.states[id].state))
    );
    const battery = ids.find((id) => hass.states[id].attributes.device_class === 'battery');
    return { type: 'custom:silk-ring-card', entity: battery ?? ids[0] };
  }

  public static async getConfigElement(): Promise<HTMLElement> {
    return document.createElement(EDITOR_TAG);
  }

  public setConfig(config: SilkRingCardConfig): void {
    if (!config.entity) {
      throw new Error('silk-ring-card: `entity` is required');
    }
    if (config.segments !== undefined && !Array.isArray(config.segments)) {
      throw new Error('silk-ring-card: `segments` must be a list of {from, color}');
    }
    this._segments = (config.segments ?? [])
      .filter(
        (seg): seg is RingSegment =>
          typeof seg?.from === 'number' && Number.isFinite(seg.from) && typeof seg?.color === 'string'
      )
      .sort((a, b) => a.from - b.from);
    this._config = config;
  }

  public getCardSize(): number {
    return 2;
  }

  public getGridOptions(): Record<string, number> {
    return { columns: 2, rows: 2, min_columns: 2, min_rows: 2 };
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

  private _onCardClick(): void {
    if (this._config) moreInfo(this, this._config.entity);
  }

  protected render(): TemplateResult | typeof nothing {
    const config = this._config;
    const hass = this.hass;
    if (!config || !hass) return nothing;
    const stateObj = hass.states[config.entity];
    if (!stateObj) {
      return html`<ha-card><div class="warning">Entity not found: ${config.entity}</div></ha-card>`;
    }

    const unavailable = isUnavailable(stateObj);
    const numeric = Number(stateObj.state);
    const hasValue = !unavailable && stateObj.state !== '' && Number.isFinite(numeric);
    const min = config.min ?? 0;
    const max = config.max ?? 100;
    const span = max - min;
    const fraction = hasValue && span > 0 ? clamp((numeric - min) / span, 0, 1) : 0;
    const shown = this._drawn ? fraction : 0;
    const dashoffset = ARC_UNITS * (1 - shown);
    const accent = (hasValue ? this._segmentColor(numeric) : undefined) ?? accentFor(stateObj);
    const unit = config.unit ?? stateObj.attributes.unit_of_measurement ?? '';
    const name = config.name ?? stateObj.attributes.friendly_name ?? config.entity;
    const asIcon = config.display === 'icon';

    return html`
      <ha-card
        class=${unavailable ? 'unavailable' : ''}
        style="--silk-accent:${accent}"
        @click=${this._onCardClick}
      >
        <div class="ring">
          <svg viewBox="0 0 ${SIZE} ${SIZE}" aria-hidden="true">
            <circle class="ring-bg" cx=${CENTER} cy=${CENTER} r=${RADIUS}></circle>
            <circle
              class="ring-value"
              cx=${CENTER}
              cy=${CENTER}
              r=${RADIUS}
              pathLength=${ARC_UNITS}
              stroke-dasharray=${ARC_UNITS}
              transform="rotate(-90 ${CENTER} ${CENTER})"
              style="stroke-dashoffset:${dashoffset};opacity:${shown > 0 ? 1 : 0}"
            ></circle>
          </svg>
          <div class="center">
            ${asIcon
              ? html`
                  <ha-state-icon
                    class="cicon ${hasValue && numeric > 0 ? 'lit' : ''}"
                    .hass=${hass}
                    .stateObj=${stateObj}
                  ></ha-state-icon>
                `
              : html`
                  <div>
                    <div class="value">
                      ${hasValue ? formatNumber(hass, config.entity, numeric) : '—'}
                    </div>
                    ${unit ? html`<div class="unit">${unit}</div>` : nothing}
                  </div>
                `}
          </div>
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
        gap: 4px;
        padding: 8px;
      }
      .ring {
        position: relative;
        flex: none;
        width: 100%;
        max-width: 74px;
        aspect-ratio: 1;
      }
      svg {
        display: block;
        width: 100%;
        height: 100%;
      }
      .ring-bg,
      .ring-value {
        fill: none;
        stroke-width: 6;
      }
      .ring-bg {
        stroke: rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.08);
      }
      .ring-value {
        stroke: var(--silk-accent);
        stroke-linecap: round;
        transition:
          stroke-dashoffset 450ms var(--silk-ease-out),
          stroke 200ms ease,
          opacity 200ms ease;
      }
      .center {
        position: absolute;
        inset: 0;
        display: grid;
        place-items: center;
        text-align: center;
        pointer-events: none;
      }
      .value {
        font-size: 15px;
        font-weight: 600;
        letter-spacing: -0.01em;
        line-height: 1.15;
        color: var(--primary-text-color);
        font-variant-numeric: tabular-nums;
        white-space: nowrap;
      }
      .unit {
        font-size: 9px;
        font-weight: 500;
        line-height: 1.2;
        margin-top: 1px;
        color: var(--secondary-text-color);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        max-width: 44px;
      }
      .cicon {
        --mdc-icon-size: 20px;
        color: var(--secondary-text-color);
        transition: color 200ms ease;
      }
      .cicon.lit {
        color: var(--silk-accent);
      }
      .name {
        font-size: 12px;
        font-weight: 400;
        line-height: 1.3;
        color: var(--secondary-text-color);
        max-width: 100%;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        text-align: center;
      }
      .unavailable .ring,
      .unavailable .name {
        opacity: 0.45;
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    'silk-ring-card': SilkRingCard;
  }
}
