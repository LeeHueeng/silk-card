import { LitElement, html, svg, css, nothing, TemplateResult, SVGTemplateResult } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { HomeAssistant, LovelaceCardConfig, SeriesUserConfig } from '../types';
import { silkControlStyles } from '../shared/base';
import { isUnavailable, moreInfo, haptic } from '../shared/service';
import { accentFor } from '../shared/color';
import { registerEditor } from '../shared/editor';
import { formatNumber } from '../format';

export const META = {
  type: 'silk-donut-card',
  name: 'Silk Donut',
  description: 'The share each device takes.',
};

export interface SilkDonutCardConfig extends LovelaceCardConfig {
  entities: (string | SeriesUserConfig)[];
  name?: string;
  unit?: string;
  /** Fixed decimal places for every value; omit to follow display precision. */
  decimals?: number;
}

/** The shared Silk categorical palette, in order. Beyond six: "Other". */
const PALETTE = [
  'var(--primary-color, #4aa8ff)',
  '#ef6c6c',
  '#5ec78d',
  '#f0b357',
  '#a97ee8',
  '#e879b9',
];

const OTHER_COLOR = 'rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.38)';
const MAX_SLICES = 6;
/** Anything thinner than this is a sliver, not a share — it folds into Other. */
const FOLD_PCT = 3;

const SIZE = 104;
const STROKE = 12;
const R = (SIZE - STROKE) / 2;
const CIRC = 2 * Math.PI * R;
/** Surface gap between adjacent arcs, in path units (= px at this size). */
const GAP = 2;
const MIN_ARC = 1.5;

interface Entry {
  entity?: string;
  label: string;
  value: number;
  color: string;
  /** Present but not numeric right now. */
  out: boolean;
}

interface Slice extends Entry {
  key: string;
  pct: number;
  /** Arc start offset along the ring, in path units. */
  start: number;
  len: number;
}

const EDITOR_TAG = 'silk-donut-card-editor';

registerEditor(
  EDITOR_TAG,
  [
    {
      name: 'entities',
      required: true,
      selector: { entity: { multiple: true, domain: ['counter', 'input_number', 'number', 'sensor'] } },
    },
    { name: 'name', selector: { text: {} } },
    {
      name: '',
      type: 'grid',
      schema: [
        { name: 'unit', selector: { text: {} } },
        { name: 'decimals', selector: { number: { min: 0, max: 4, mode: 'box' } } },
      ],
    },
  ],
  {
    entities: 'Entities',
    name: 'Name',
    unit: 'Unit',
    decimals: 'Decimals',
  }
);

@customElement('silk-donut-card')
export class SilkDonutCard extends LitElement {
  @property({ attribute: false }) public hass?: HomeAssistant;

  @state() private _config?: SilkDonutCardConfig;
  /** Key of the hovered or focused slice; drives the center label. */
  @state() private _focus: string | null = null;

  private _entries: { entity: string; name?: string; color?: string }[] = [];

  public static getStubConfig(hass: HomeAssistant): Partial<SilkDonutCardConfig> {
    const numeric = Object.keys(hass.states).filter(
      (id) =>
        id.startsWith('sensor.') &&
        hass.states[id].state !== '' &&
        Number(hass.states[id].state) > 0
    );
    const power = numeric.filter((id) => hass.states[id].attributes.device_class === 'power');
    const pick = power.length >= 2 ? power : numeric;
    return { type: 'custom:silk-donut-card', entities: pick.slice(0, 4) };
  }

  public static async getConfigElement(): Promise<HTMLElement> {
    return document.createElement(EDITOR_TAG);
  }

  public setConfig(config: SilkDonutCardConfig): void {
    if (!Array.isArray(config.entities) || !config.entities.length) {
      throw new Error('silk-donut-card: `entities` must be a non-empty list');
    }
    if (
      config.decimals !== undefined &&
      (!Number.isInteger(config.decimals) || config.decimals < 0 || config.decimals > 6)
    ) {
      throw new Error('silk-donut-card: `decimals` must be a whole number between 0 and 6');
    }
    this._entries = config.entities.map((item) => {
      const obj: SeriesUserConfig = typeof item === 'string' ? { entity: item } : item;
      if (!obj?.entity || typeof obj.entity !== 'string') {
        throw new Error('silk-donut-card: every entry needs an `entity`');
      }
      return { entity: obj.entity, name: obj.name, color: obj.color };
    });
    this._config = config;
    this._focus = null;
  }

  public getCardSize(): number {
    return 3;
  }

  public getGridOptions(): Record<string, number> {
    return { columns: 6, rows: 3, min_columns: 4, min_rows: 2 };
  }

  private _fmt(entity: string | undefined, value: number): string {
    const decimals = this._config?.decimals;
    if (decimals === undefined) return formatNumber(this.hass, entity ?? '', value);
    const locale = this.hass?.locale?.language ?? this.hass?.language ?? 'en';
    return new Intl.NumberFormat(locale, {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(value);
  }

  private _unit(): string {
    return (
      this._config?.unit ??
      (this.hass?.states[this._entries[0]?.entity]?.attributes.unit_of_measurement as
        | string
        | undefined) ??
      ''
    );
  }

  /**
   * Current values, largest first, folded down to six named shares plus Other.
   * Colors follow rank so the biggest share always carries the primary accent;
   * an explicit `color` in config always wins.
   */
  private _slices(): { slices: Slice[]; total: number; out: Entry[] } {
    const hass = this.hass!;
    const named: Entry[] = [];
    const out: Entry[] = [];
    for (const item of this._entries) {
      const stateObj = hass.states[item.entity];
      const label = item.name ?? stateObj?.attributes.friendly_name ?? item.entity;
      const raw = Number(stateObj?.state);
      const usable = stateObj && !isUnavailable(stateObj) && Number.isFinite(raw) && raw > 0;
      const entry: Entry = {
        entity: item.entity,
        label,
        value: usable ? raw : 0,
        color: item.color ?? PALETTE[0],
        out: !usable,
      };
      if (usable) named.push(entry);
      else out.push(entry);
    }
    named.sort((a, b) => b.value - a.value);
    const total = named.reduce((sum, e) => sum + e.value, 0);
    if (total <= 0) return { slices: [], total: 0, out };

    const keep: Entry[] = [];
    let otherValue = 0;
    named.forEach((entry, rank) => {
      const pct = (entry.value / total) * 100;
      if (rank < MAX_SLICES && pct >= FOLD_PCT) {
        const source = this._entries.find((e) => e.entity === entry.entity);
        keep.push({ ...entry, color: source?.color ?? PALETTE[keep.length % PALETTE.length] });
      } else {
        otherValue += entry.value;
      }
    });
    if (otherValue > 0) {
      keep.push({ label: 'Other', value: otherValue, color: OTHER_COLOR, out: false });
    }

    let acc = 0;
    const slices: Slice[] = keep.map((entry, i) => {
      const len = (entry.value / total) * CIRC;
      const slice: Slice = {
        ...entry,
        key: entry.entity ?? `other-${i}`,
        pct: (entry.value / total) * 100,
        start: acc,
        len,
      };
      acc += len;
      return slice;
    });
    return { slices, total, out };
  }

  private _onSliceEnter(key: string): void {
    this._focus = key;
  }

  private _onSliceLeave(): void {
    this._focus = null;
  }

  private _onSliceClick(ev: Event, slice: Slice): void {
    ev.stopPropagation();
    this._focus = slice.key;
    if (!slice.entity) return;
    haptic(this, 'selection');
    moreInfo(this, slice.entity);
  }

  private _renderRing(slices: Slice[]): TemplateResult {
    const unit = this._unit();
    const single = slices.length === 1;
    const arcs: SVGTemplateResult[] = slices.map((slice) => {
      const gap = single ? 0 : GAP;
      const draw = Math.max(slice.len - gap, MIN_ARC);
      const offset = slice.start + gap / 2;
      const dim = this._focus !== null && this._focus !== slice.key;
      return svg`
        <circle
          class="arc ${dim ? 'dim' : ''} ${slice.entity ? 'tappable' : ''}"
          cx=${SIZE / 2}
          cy=${SIZE / 2}
          r=${R}
          stroke=${slice.color}
          stroke-dasharray="${draw.toFixed(2)} ${(CIRC - draw).toFixed(2)}"
          stroke-dashoffset=${(-offset).toFixed(2)}
          @pointerenter=${() => this._onSliceEnter(slice.key)}
          @pointerleave=${this._onSliceLeave}
          @click=${(ev: Event) => this._onSliceClick(ev, slice)}
        >
          <title>
            ${slice.label} · ${this._fmt(slice.entity, slice.value)}${unit} ·
            ${slice.pct.toFixed(slice.pct < 10 ? 1 : 0)}%
          </title>
        </circle>
      `;
    });
    return html`
      <svg
        class="ring"
        width=${SIZE}
        height=${SIZE}
        viewBox="0 0 ${SIZE} ${SIZE}"
        role="img"
        aria-label="Share by entity"
      >
        <circle class="track" cx=${SIZE / 2} cy=${SIZE / 2} r=${R}></circle>
        <g class="arcs" transform="rotate(-90 ${SIZE / 2} ${SIZE / 2})">${arcs}</g>
      </svg>
    `;
  }

  private _renderLegend(slices: Slice[], out: Entry[]): TemplateResult {
    const unit = this._unit();
    return html`
      <div class="legend">
        ${slices.map(
          (slice) => html`
            <button
              class="row ${this._focus !== null && this._focus !== slice.key ? 'dim' : ''}"
              title=${slice.label}
              @pointerenter=${() => this._onSliceEnter(slice.key)}
              @pointerleave=${this._onSliceLeave}
              @focus=${() => this._onSliceEnter(slice.key)}
              @blur=${this._onSliceLeave}
              @click=${(ev: Event) => this._onSliceClick(ev, slice)}
            >
              <span class="dot" style="background:${slice.color}"></span>
              <span class="rname">${slice.label}</span>
              <span class="rval">${this._fmt(slice.entity, slice.value)}${unit}</span>
              <span class="rpct">${slice.pct.toFixed(slice.pct < 10 ? 1 : 0)}%</span>
            </button>
          `
        )}
        ${out.map(
          (entry) => html`
            <button
              class="row gone"
              title=${entry.label}
              @click=${(ev: Event) => {
                ev.stopPropagation();
                if (entry.entity) moreInfo(this, entry.entity);
              }}
            >
              <span class="dot muted"></span>
              <span class="rname">${entry.label}</span>
              <span class="rval">—</span>
              <span class="rpct"></span>
            </button>
          `
        )}
      </div>
    `;
  }

  protected render(): TemplateResult | typeof nothing {
    const config = this._config;
    const hass = this.hass;
    if (!config || !hass) return nothing;

    const known = this._entries.filter((e) => hass.states[e.entity]);
    if (!known.length) {
      return html`<ha-card
        ><div class="warning">Entity not found: ${this._entries[0].entity}</div></ha-card
      >`;
    }

    const { slices, total, out } = this._slices();
    const accent = accentFor(hass.states[this._entries[0].entity], config.color);
    const unit = this._unit();
    const name = config.name ?? 'Share';
    const focused = slices.find((s) => s.key === this._focus);

    return html`
      <ha-card
        class="control ${total <= 0 ? 'unavailable' : ''}"
        style="--silk-accent:${accent}"
      >
        <div class="hname" title=${name}>${name}</div>
        ${total <= 0
          ? html`<div class="empty">No values to compare</div>`
          : html`
              <div class="body">
                <div class="donut">
                  ${this._renderRing(slices)}
                  <div class="center">
                    <div class="total">
                      ${this._fmt(this._entries[0].entity, total)}${unit
                        ? html`<span class="tunit">${unit}</span>`
                        : nothing}
                    </div>
                    <div class="clabel">${focused ? focused.label : 'Total'}</div>
                  </div>
                </div>
                ${this._renderLegend(slices, out)}
              </div>
            `}
      </ha-card>
    `;
  }

  static styles = [
    silkControlStyles,
    css`
      ha-card {
        flex-direction: column;
        align-items: stretch;
        gap: 8px;
        padding: 12px 14px;
        cursor: default;
      }
      .hname {
        flex: none;
        font-size: 13px;
        font-weight: 600;
        color: var(--secondary-text-color);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .body {
        flex: 1;
        display: flex;
        align-items: center;
        gap: 14px;
        min-height: 0;
        min-width: 0;
      }
      .donut {
        flex: none;
        position: relative;
        width: ${SIZE}px;
        height: ${SIZE}px;
      }
      .ring {
        display: block;
        animation: silk-donut-in 260ms var(--silk-ease-out);
      }
      .track {
        fill: none;
        stroke: rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.06);
        stroke-width: ${STROKE};
      }
      .arc {
        fill: none;
        stroke-width: ${STROKE};
        stroke-linecap: butt;
        transition: opacity 200ms ease;
      }
      .arc.tappable {
        cursor: pointer;
      }
      .arc.dim {
        opacity: 0.32;
      }
      .center {
        position: absolute;
        inset: 0;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 1px;
        padding: 0 ${STROKE + 4}px;
        pointer-events: none;
        text-align: center;
      }
      .total {
        font-size: 18px;
        font-weight: 600;
        line-height: 1.15;
        letter-spacing: -0.01em;
        color: var(--primary-text-color);
        font-variant-numeric: tabular-nums;
        white-space: nowrap;
      }
      .tunit {
        font-size: 11px;
        font-weight: 500;
        margin-left: 2px;
        color: var(--secondary-text-color);
      }
      .clabel {
        max-width: 100%;
        font-size: 10.5px;
        line-height: 1.2;
        color: var(--secondary-text-color);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .legend {
        flex: 1;
        min-width: 0;
        display: flex;
        flex-direction: column;
        justify-content: center;
        gap: 1px;
        margin: 0 -6px;
        overflow: hidden;
      }
      .row {
        display: flex;
        align-items: center;
        gap: 7px;
        width: 100%;
        min-height: 22px;
        margin: 0;
        padding: 2px 6px;
        border: none;
        border-radius: 8px;
        background: none;
        font: inherit;
        font-size: 12px;
        color: var(--secondary-text-color);
        text-align: left;
        cursor: pointer;
        outline: none;
        transition: opacity 200ms ease, background 150ms ease-out;
      }
      .row:hover {
        background: rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.05);
      }
      .row:focus-visible {
        box-shadow: inset 0 0 0 2px color-mix(in srgb, var(--silk-accent) 70%, transparent);
      }
      .row.dim {
        opacity: 0.42;
      }
      .row.gone {
        opacity: 0.45;
      }
      .dot {
        flex: none;
        width: 8px;
        height: 8px;
        border-radius: 50%;
      }
      .dot.muted {
        background: rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.3);
      }
      .rname {
        flex: 1 1 auto;
        min-width: 0;
        color: var(--primary-text-color);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .rval {
        flex: none;
        font-weight: 600;
        color: var(--primary-text-color);
        font-variant-numeric: tabular-nums;
        white-space: nowrap;
      }
      .rpct {
        flex: none;
        min-width: 34px;
        text-align: right;
        font-variant-numeric: tabular-nums;
      }
      .empty {
        flex: 1;
        display: grid;
        place-items: center;
        min-height: 48px;
        font-size: 13px;
        color: var(--secondary-text-color);
      }
      @keyframes silk-donut-in {
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
    'silk-donut-card': SilkDonutCard;
  }
}
