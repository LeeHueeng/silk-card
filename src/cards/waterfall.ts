import { LitElement, html, svg, css, nothing, TemplateResult, SVGTemplateResult } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { HomeAssistant, LovelaceCardConfig } from '../types';
import { silkControlStyles } from '../shared/base';
import { isUnavailable, moreInfo, haptic } from '../shared/service';
import { accentFor } from '../shared/color';
import { registerRowsEditor } from '../shared/rows';
import { formatNumber } from '../format';

export const META = {
  type: 'silk-waterfall-card',
  name: 'Silk Waterfall',
  description: 'How the parts add up to the whole.',
};

/** One contribution: a live entity, or a fixed number written into the config. */
export interface WaterfallItem {
  entity?: string;
  value?: number;
  name?: string;
}

export interface SilkWaterfallCardConfig extends LovelaceCardConfig {
  /** The ordered contributions. Each needs `entity` or `value`. */
  items: WaterfallItem[];
  name?: string;
  /** Unit for the labels; the first entity's own unit by default. */
  unit?: string;
  /** Level the first step starts from. Default 0. */
  start?: number;
  /** Accent override. */
  color?: string;
}

/** A resolved column: where it starts, where it ends, and what to call it. */
interface Step {
  name: string;
  entity?: string;
  v: number;
  from: number;
  to: number;
  /** False when the entity is missing or unavailable — it contributes nothing. */
  known: boolean;
}

const GAP = 2;
/** Top band that keeps the value labels clear of the tallest step. */
const TOP_BAND = 15;
/** Bottom band for the item names. */
const LABEL_BAND = 14;
const MIN_BAR = 2;
const BAR_RADIUS = 2;
/** The total's grounding rule, in px. */
const BASELINE = 2;
/** Approximate advance width per character at the label sizes. */
const NAME_CHAR_PX = 5.6;
const VALUE_CHAR_PX = 6.2;
/** Falling steps: Silk's restrained amber, the suite's second series color. */
const FALL_COLOR = '#e6a23c';

const round1 = (n: number): number => Math.round(n * 10) / 10;

/** Ellipsis-truncate to the pixels available — SVG text can't do it in CSS. */
function fitText(text: string, width: number, charPx: number): string {
  const max = Math.floor(width / charPx);
  if (max <= 0) return '';
  if (text.length <= max) return text;
  if (max === 1) return '…';
  return `${text.slice(0, max - 1)}…`;
}

const EDITOR_TAG = 'silk-waterfall-card-editor';

// Each contribution is a row: a live entity or a fixed number, plus its label.
// The order is the story the chart tells, so the rows reorder in place.
registerRowsEditor(EDITOR_TAG, {
  field: 'items',
  title: '항목 (위에서 아래 순서로 누적)',
  addLabel: '항목 추가',
  blank: { value: 0 },
  row: [
    {
      name: 'entity',
      label: '엔티티',
      selector: { entity: { domain: ['sensor', 'number', 'input_number', 'counter'] } },
    },
    {
      name: 'value',
      label: '고정 값 (엔티티 없을 때)',
      selector: { number: { mode: 'box', step: 'any' } },
    },
    { name: 'name', label: '이름', selector: { text: {} } },
  ],
  schema: [
    { name: 'name', selector: { text: {} } },
    {
      name: '',
      type: 'grid',
      schema: [
        { name: 'unit', selector: { text: {} } },
        { name: 'start', selector: { number: { mode: 'box', step: 'any' } } },
      ],
    },
    { name: 'color', selector: { ui_color: {} } },
  ],
  labels: { name: '이름', unit: '단위', start: '시작 값', color: '강조 색상' },
  defaults: { start: 0 },
});

@customElement('silk-waterfall-card')
export class SilkWaterfallCard extends LitElement {
  @property({ attribute: false }) public hass?: HomeAssistant;

  @state() private _config?: SilkWaterfallCardConfig;
  /** Measured plot box; the columns are laid out in exact pixels from it. */
  @state() private _plot: { w: number; h: number } | null = null;

  private _items: WaterfallItem[] = [];
  private _resize?: ResizeObserver;

  public static getStubConfig(hass: HomeAssistant): Partial<SilkWaterfallCardConfig> {
    const ids = Object.keys(hass.states).filter(
      (id) => id.startsWith('sensor.') && Number.isFinite(Number(hass.states[id].state))
    );
    const power = ids.filter((id) => hass.states[id].attributes.device_class === 'power');
    const pool = power.length >= 2 ? power : ids;
    const items: WaterfallItem[] = pool.slice(0, 3).map((entity) => ({ entity }));
    return {
      type: 'custom:silk-waterfall-card',
      // The picker preview must always render, even on a bare install.
      items: items.length
        ? items
        : [
            { value: 40, name: 'Base' },
            { value: 15, name: 'Extra' },
            { value: -10, name: 'Savings' },
          ],
    };
  }

  public static async getConfigElement(): Promise<HTMLElement> {
    return document.createElement(EDITOR_TAG);
  }

  public setConfig(config: SilkWaterfallCardConfig): void {
    if (!Array.isArray(config.items) || !config.items.length) {
      throw new Error(
        'silk-waterfall-card: `items` must be a non-empty list of {entity} or {value} entries'
      );
    }
    config.items.forEach((item, i) => {
      const hasEntity = typeof item?.entity === 'string' && item.entity.length > 0;
      const hasValue = typeof item?.value === 'number' && Number.isFinite(item.value);
      if (!hasEntity && !hasValue) {
        throw new Error(`silk-waterfall-card: item ${i + 1} needs an \`entity\` or a \`value\``);
      }
    });
    if (config.start !== undefined && !Number.isFinite(Number(config.start))) {
      throw new Error('silk-waterfall-card: `start` must be a number');
    }
    this._items = config.items;
    this._config = config;
  }

  public getCardSize(): number {
    return 3;
  }

  public getGridOptions(): Record<string, number> {
    return { columns: 6, rows: 3, min_columns: 4, min_rows: 2 };
  }

  public disconnectedCallback(): void {
    super.disconnectedCallback();
    this._resize?.disconnect();
  }

  /**
   * Runs after every render, not just the first: if the first paint was the
   * config warning, `.plot` only exists once the config is valid.
   * Re-observing an already-observed element is a no-op.
   */
  protected updated(): void {
    const el = this.renderRoot.querySelector('.plot');
    if (!el) return;
    if (!this._resize) {
      this._resize = new ResizeObserver((entries) => {
        const rect = entries[entries.length - 1].contentRect;
        const w = Math.round(rect.width);
        const h = Math.round(rect.height);
        if (!this._plot || this._plot.w !== w || this._plot.h !== h) this._plot = { w, h };
      });
    }
    this._resize.observe(el);
  }

  /** Resolve every item against live state and stack them from `start`. */
  private _steps(): Step[] {
    const hass = this.hass;
    const start = Number(this._config?.start ?? 0) || 0;
    let running = start;
    return this._items.map((item, i) => {
      const stateObj = item.entity ? hass?.states[item.entity] : undefined;
      let v = 0;
      let known = false;
      if (item.entity) {
        const numeric = Number(stateObj?.state);
        known = !!stateObj && !isUnavailable(stateObj) && Number.isFinite(numeric);
        if (known) v = numeric;
      } else if (typeof item.value === 'number' && Number.isFinite(item.value)) {
        v = item.value;
        known = true;
      }
      const from = running;
      running += v;
      return {
        name: item.name ?? stateObj?.attributes.friendly_name ?? item.entity ?? `Item ${i + 1}`,
        entity: item.entity,
        v,
        from,
        to: running,
        known,
      };
    });
  }

  private _unit(): string {
    if (this._config?.unit !== undefined) return this._config.unit;
    const first = this._items.find((item) => item.entity);
    const stateObj = first?.entity ? this.hass?.states[first.entity] : undefined;
    return (stateObj?.attributes.unit_of_measurement as string | undefined) ?? '';
  }

  /** `+3.1` / `−2.4` — a true minus sign, never a hyphen. */
  private _signed(v: number, entity?: string): string {
    const num = formatNumber(this.hass, entity ?? '', Math.abs(v));
    if (v > 0) return `+${num}`;
    if (v < 0) return `−${num}`;
    return num;
  }

  private _onColumnClick(ev: Event, entity?: string): void {
    ev.stopPropagation();
    if (!entity) return;
    haptic(this);
    moreInfo(this, entity);
  }

  private _renderChart(steps: Step[], total: number, unit: string): TemplateResult | typeof nothing {
    const size = this._plot;
    if (!size) return nothing;
    const cols = steps.length + 1; // the steps, then the total
    const plotH = size.h - TOP_BAND - LABEL_BAND;
    const pitch = (size.w + GAP) / cols; // column + gap; no gap trails the last one
    const colW = pitch - GAP;
    if (colW <= 2 || plotH <= 12) return nothing;

    const start = Number(this._config?.start ?? 0) || 0;
    const levels = [0, start, ...steps.map((s) => s.from), ...steps.map((s) => s.to)];
    let lo = Math.min(...levels);
    let hi = Math.max(...levels);
    if (hi === lo) hi = lo + 1;
    const y = (v: number): number => TOP_BAND + (1 - (v - lo) / (hi - lo)) * plotH;
    const unitText = unit ? (unit.startsWith('°') ? unit : ` ${unit}`) : '';
    const rx = Math.min(BAR_RADIUS, colW / 2);

    const marks: SVGTemplateResult[] = [];
    const labels: SVGTemplateResult[] = [];
    const hits: SVGTemplateResult[] = [];

    const column = (
      index: number,
      from: number,
      to: number,
      cls: string,
      valueLabel: string,
      name: string,
      title: string,
      entity?: string,
      dim = false
    ): void => {
      const x = index * pitch;
      const top = Math.min(y(from), y(to));
      const barH = Math.max(MIN_BAR, Math.abs(y(from) - y(to)));
      marks.push(
        svg`<rect class="bar ${cls} ${dim ? 'dim' : ''}" x=${round1(x)} y=${round1(top)} width=${round1(colW)} height=${round1(barH)} rx=${round1(rx)}></rect>`
      );
      // Below three characters' worth of room a value label is just noise.
      if (colW + GAP >= VALUE_CHAR_PX * 3) {
        labels.push(
          svg`<text class="val" x=${round1(x + colW / 2)} y=${round1(Math.max(10, top - 4))} text-anchor="middle">${fitText(valueLabel, colW + GAP, VALUE_CHAR_PX)}</text>`
        );
      }
      labels.push(
        svg`<text class="axis" x=${round1(x + colW / 2)} y=${size.h - 3} text-anchor="middle">${fitText(name, colW + GAP, NAME_CHAR_PX)}</text>`
      );
      hits.push(
        svg`<rect class="hit ${entity ? 'tappable' : ''}" x=${round1(x)} y="0" width=${round1(colW)} height=${size.h} @click=${(ev: Event) => this._onColumnClick(ev, entity)}>
          <title>${title}</title>
        </rect>`
      );
    };

    steps.forEach((step, i) => {
      const valueText = step.known
        ? `${this._signed(step.v, step.entity)}${unitText}`
        : '—';
      column(
        i,
        step.from,
        step.to,
        step.v < 0 ? 'fall' : 'rise',
        valueText,
        step.name,
        `${step.name} · ${valueText}`,
        step.entity,
        !step.known
      );
      // Hairline from this step's landing level across the gap to the next.
      const yTo = round1(y(step.to)) + 0.5;
      marks.push(
        svg`<line class="link" x1=${round1(i * pitch + colW)} y1=${yTo} x2=${round1((i + 1) * pitch)} y2=${yTo}></line>`
      );
    });

    const totalText = `${formatNumber(this.hass, '', total)}${unitText}`;
    column(
      steps.length,
      0,
      total,
      'total',
      totalText,
      'Total',
      `Total · ${totalText}`
    );
    // The total is grounded: a 2px rule at zero, reaching a little past the
    // column on each side so it reads as a foot rather than the bar's edge.
    const zeroY = round1(y(0));
    const footX = Math.max(0, steps.length * pitch - 3);
    marks.push(
      svg`<rect class="baseline" x=${round1(footX)} y=${zeroY - BASELINE / 2} width=${round1(Math.min(colW + 6, size.w - footX))} height=${BASELINE}></rect>`
    );

    return html`
      <svg width=${size.w} height=${size.h}>
        <g class="chart">${marks}${labels}</g>
        ${hits}
      </svg>
    `;
  }

  protected render(): TemplateResult | typeof nothing {
    const config = this._config;
    const hass = this.hass;
    if (!config || !hass) return nothing;
    if (!this._items.length) {
      return html`<ha-card><div class="warning">No items configured</div></ha-card>`;
    }

    const steps = this._steps();
    const entityItems = steps.filter((s) => s.entity);
    const unavailable = entityItems.length > 0 && entityItems.every((s) => !s.known);
    const firstEntity = this._items.find((item) => item.entity)?.entity;
    const accent = accentFor(firstEntity ? hass.states[firstEntity] : undefined, config.color);
    const total = steps.length ? steps[steps.length - 1].to : Number(config.start ?? 0) || 0;
    const unit = this._unit();
    const name = config.name ?? 'Breakdown';

    return html`
      <ha-card
        class="control ${unavailable ? 'unavailable' : ''}"
        style="--silk-accent:${accent};--silk-fall:${FALL_COLOR}"
      >
        <div class="header">
          <div class="hname" title=${name}>${name}</div>
          <div class="trailing">
            <span class="value">${formatNumber(hass, '', total)}</span>
            ${unit ? html`<span class="unit">${unit}</span>` : nothing}
          </div>
        </div>
        <div class="plot">${this._renderChart(steps, total, unit)}</div>
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
        cursor: default;
      }
      .header {
        flex: none;
        display: flex;
        align-items: baseline;
        gap: 10px;
        min-width: 0;
      }
      .hname {
        flex: 1;
        min-width: 0;
        font-size: 13px;
        font-weight: 600;
        color: var(--secondary-text-color);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .trailing {
        align-items: baseline;
        gap: 3px;
      }
      .plot {
        position: relative;
        flex: 1;
        min-height: 74px;
      }
      .plot svg {
        position: absolute;
        inset: 0;
        display: block;
      }
      .chart {
        animation: silk-waterfall-in 250ms var(--silk-ease-out);
      }
      .bar {
        transition: opacity 200ms ease;
      }
      .bar.rise {
        fill: var(--silk-accent);
        fill-opacity: 0.8;
      }
      .bar.fall {
        fill: var(--silk-fall, #e6a23c);
        fill-opacity: 0.8;
      }
      .bar.total,
      .baseline {
        fill: var(--silk-accent);
      }
      .bar.dim {
        opacity: 0.35;
      }
      .link {
        stroke: rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.2);
        stroke-width: 1;
      }
      .axis {
        font-size: 10px;
        fill: var(--primary-text-color);
        opacity: 0.45;
        pointer-events: none;
      }
      .val {
        font-size: 11px;
        font-weight: 500;
        fill: var(--primary-text-color);
        opacity: 0.75;
        font-variant-numeric: tabular-nums;
        pointer-events: none;
      }
      .hit {
        fill: transparent;
      }
      .hit.tappable {
        cursor: pointer;
      }
      .unavailable .plot {
        opacity: 0.45;
      }
      @keyframes silk-waterfall-in {
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
    'silk-waterfall-card': SilkWaterfallCard;
  }
}
