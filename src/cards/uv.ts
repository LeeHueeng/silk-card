import { LitElement, html, css, nothing, TemplateResult } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { HomeAssistant, LovelaceCardConfig } from '../types';
import { silkControlStyles } from '../shared/base';
import { isUnavailable, moreInfo, clamp } from '../shared/service';
import { registerEditor } from '../shared/editor';

export const META = {
  type: 'silk-uv-card',
  name: 'Silk UV',
  description: 'Sun strength, with actual advice.',
};

export interface SilkUvCardConfig extends LovelaceCardConfig {
  entity: string;
  name?: string;
  /** Show the protection advice line under the scale. Default true. */
  protection?: boolean;
}

interface UvBand {
  label: string;
  advice: string;
  /** Segment tint — see the standard-scale note below. */
  color: string;
  /** Exclusive upper bound on the continuous scale. */
  to: number;
}

/**
 * The WHO/WMO global UV index scale. Its five colors are a *recognized
 * standard* — people read them the way they read a traffic light — so this is
 * the one sanctioned exception to Silk's single-accent rule. The card still
 * carries exactly one live accent (`--silk-accent` = the current band's color),
 * which is what the marker dot and the band word use; the other four segments
 * are recessive at 35% and never compete.
 *
 * Boundaries are the half-unit ones behind the published integer bands
 * (Low 0–2, Moderate 3–5, High 6–7, Very high 8–10, Extreme 11+), so a value
 * and its word can never disagree with where the marker sits.
 */
const BANDS: readonly UvBand[] = [
  { label: 'Low', advice: 'No protection needed', color: '#5ec78d', to: 2.5 },
  { label: 'Moderate', advice: 'Wear sunglasses', color: '#e6a23c', to: 5.5 },
  { label: 'High', advice: 'Sunscreen + hat', color: '#e8734f', to: 7.5 },
  { label: 'Very high', advice: 'Avoid midday sun', color: '#ef6c6c', to: 10.5 },
  { label: 'Extreme', advice: 'Stay indoors', color: '#a97ee8', to: 13 },
];

/** Right edge of the drawn scale; anything higher parks the marker at the end. */
const SCALE_MAX = BANDS[BANDS.length - 1].to;
/** Segment widths, proportional so the marker travels linearly in UV units. */
const SPANS = BANDS.map((band, i) => band.to - (i === 0 ? 0 : BANDS[i - 1].to));
const GAP = 2;
const GAP_TOTAL = GAP * (BANDS.length - 1);

/** Index of the band a value falls in; the last band is open-ended. */
function bandIndexFor(uv: number): number {
  for (let i = 0; i < BANDS.length - 1; i++) {
    if (uv < BANDS[i].to) return i;
  }
  return BANDS.length - 1;
}

const EDITOR_TAG = 'silk-uv-card-editor';

registerEditor(
  EDITOR_TAG,
  [
    { name: 'entity', required: true, selector: { entity: { domain: ['sensor'] } } },
    { name: 'name', selector: { text: {} } },
    { name: 'protection', selector: { boolean: {} } },
  ],
  { entity: 'Entity', name: 'Name', protection: 'Show protection advice' },
  { protection: true }
);

/**
 * The UV index as a strength reading, not a number to interpret: the value and
 * its band word up top, the standard scale underneath with a dot riding it, and
 * the one line that says what to actually do about it.
 */
@customElement('silk-uv-card')
export class SilkUvCard extends LitElement {
  @property({ attribute: false }) public hass?: HomeAssistant;

  @state() private _config?: SilkUvCardConfig;
  /** False for the first paint so the marker slides in from zero on mount. */
  @state() private _drawn = false;

  public static getStubConfig(hass: HomeAssistant): Partial<SilkUvCardConfig> {
    const ids = Object.keys(hass.states).filter((id) => id.startsWith('sensor.'));
    const entity =
      ids.find((id) => /uv[_-]?index/i.test(id)) ??
      ids.find((id) => /(^|[._])uv([._]|$)/i.test(id)) ??
      ids.find((id) =>
        String(hass.states[id].attributes.unit_of_measurement ?? '')
          .toLowerCase()
          .includes('uv')
      );
    return { type: 'custom:silk-uv-card', entity };
  }

  public static async getConfigElement(): Promise<HTMLElement> {
    return document.createElement(EDITOR_TAG);
  }

  public setConfig(config: SilkUvCardConfig): void {
    if (!config.entity) {
      throw new Error('silk-uv-card: `entity` is required');
    }
    this._config = config;
  }

  public getCardSize(): number {
    return 2;
  }

  public getGridOptions(): Record<string, number> {
    return { columns: 6, rows: 2, min_columns: 3, min_rows: 1 };
  }

  protected firstUpdated(): void {
    // Commit one frame at zero so the marker's 450ms transition actually runs.
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        this._drawn = true;
      });
    });
  }

  private _locale(): string {
    return this.hass?.locale?.language ?? this.hass?.language ?? 'en';
  }

  /** UV indices are read as 7 or 5.6 — never 7.00, whatever the sensor sends. */
  private _formatIndex(value: number): string {
    const precision = this.hass?.entities?.[this._config!.entity]?.display_precision;
    return new Intl.NumberFormat(
      this._locale(),
      precision !== undefined
        ? { minimumFractionDigits: precision, maximumFractionDigits: precision }
        : { maximumFractionDigits: 1 }
    ).format(value);
  }

  private _onCardClick(): void {
    if (this._config) moreInfo(this, this._config.entity);
  }

  protected render(): TemplateResult | typeof nothing {
    const config = this._config;
    if (!config) return nothing;
    const hass = this.hass;
    const stateObj = hass?.states[config.entity];
    if (hass && !stateObj) {
      return html`<ha-card><div class="warning">Entity not found: ${config.entity}</div></ha-card>`;
    }

    const unavailable = isUnavailable(stateObj);
    const numeric = Number(stateObj?.state);
    const hasValue = !unavailable && stateObj?.state !== '' && Number.isFinite(numeric);
    const uv = hasValue ? Math.max(0, numeric) : 0;
    const index = bandIndexFor(uv);
    const band = BANDS[index];
    const accent = hasValue ? band.color : 'var(--secondary-text-color)';
    const name = config.name ?? stateObj?.attributes.friendly_name ?? config.entity;
    const showAdvice = config.protection !== false;
    // Fills share (100% − gaps); each gap to the left of the marker pushes it
    // one gap further along, so the dot lands exactly on its segment.
    const fraction = this._drawn ? clamp(uv, 0, SCALE_MAX) / SCALE_MAX : 0;
    const offset = this._drawn ? index * GAP : 0;
    const rideTo = `translateX(calc((100% - ${GAP_TOTAL}px) * ${fraction.toFixed(4)} + ${offset}px))`;

    return html`
      <ha-card
        class="control ${unavailable ? 'unavailable' : ''}"
        style="--silk-accent:${accent}"
        @click=${this._onCardClick}
      >
        <div class="head" title=${name}>${name}</div>
        <div class="hero">
          <span class="index">${hasValue ? this._formatIndex(numeric) : '—'}</span>
          <span class="band">${hasValue ? band.label : '—'}</span>
        </div>
        <div class="scale">
          <div class="track" aria-hidden="true">
            ${BANDS.map(
              (b, i) => html`
                <span
                  class="seg ${hasValue && i === index ? 'now' : ''}"
                  style="flex-grow:${SPANS[i]};background:${b.color}"
                ></span>
              `
            )}
          </div>
          ${hasValue
            ? html`<div class="rider" aria-hidden="true">
                <div class="carrier" style="transform:${rideTo}"><span class="dot"></span></div>
              </div>`
            : nothing}
        </div>
        ${showAdvice
          ? html`<div class="advice">${hasValue ? band.advice : 'No reading'}</div>`
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
        padding: 10px 14px;
      }
      .head {
        flex: none;
        font-size: 14px;
        font-weight: 500;
        line-height: 1.3;
        color: var(--primary-text-color);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .hero {
        flex: none;
        display: flex;
        align-items: baseline;
        gap: 8px;
        min-width: 0;
      }
      .index {
        flex: none;
        font-size: 24px;
        font-weight: 700;
        letter-spacing: -0.02em;
        line-height: 1.15;
        color: var(--primary-text-color);
        font-variant-numeric: tabular-nums;
      }
      .band {
        flex: 1;
        min-width: 0;
        font-size: 14px;
        font-weight: 600;
        line-height: 1.2;
        color: var(--silk-accent);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        transition: color 200ms ease;
      }
      .scale {
        position: relative;
        flex: none;
        height: 12px;
        margin: 2px 0;
      }
      .track {
        position: absolute;
        left: 0;
        right: 0;
        top: 50%;
        transform: translateY(-50%);
        display: flex;
        gap: ${GAP}px;
        height: 10px;
      }
      /* Only the live band carries full chroma; the rest stay recessive. */
      .seg {
        flex-basis: 0;
        flex-shrink: 1;
        min-width: 0;
        height: 100%;
        border-radius: 5px;
        opacity: 0.35;
        transition: opacity 200ms ease;
      }
      .seg.now {
        opacity: 1;
      }
      .rider {
        position: absolute;
        inset: 0;
        pointer-events: none;
      }
      /* Full-width carrier: a percentage translate resolves against its own box,
         so this converts the value fraction into travel across the track. */
      .carrier {
        position: absolute;
        inset: 0;
        will-change: transform;
        transition: transform 450ms var(--silk-ease-out);
      }
      .dot {
        position: absolute;
        left: 0;
        top: 50%;
        width: 12px;
        height: 12px;
        border-radius: 50%;
        background: var(--silk-accent);
        /* Hard ring in the card surface, zero blur — a cutout, not a glow. */
        box-shadow: 0 0 0 2px var(--card-background-color, #fff);
        transform: translate(-50%, -50%);
        transition: background 200ms ease;
      }
      .advice {
        flex: none;
        font-size: 12px;
        line-height: 1.3;
        color: var(--secondary-text-color);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .unavailable .head,
      .unavailable .hero,
      .unavailable .scale,
      .unavailable .advice {
        opacity: 0.45;
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    'silk-uv-card': SilkUvCard;
  }
}
