import { LitElement, html, svg, css, nothing, TemplateResult, SVGTemplateResult } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { HomeAssistant, LovelaceCardConfig, SeriesUserConfig } from '../types';
import { silkControlStyles } from '../shared/base';
import { isUnavailable, moreInfo, haptic } from '../shared/service';
import { accentFor } from '../shared/color';
import { registerEditor } from '../shared/editor';
import { formatNumber } from '../format';

export const META = {
  type: 'silk-treemap-card',
  name: 'Silk Treemap',
  description: 'Proportion you can see at a glance.',
};

export interface SilkTreemapCardConfig extends LovelaceCardConfig {
  entities: (string | SeriesUserConfig)[];
  name?: string;
  unit?: string;
}

/** Gap between tiles: each tile insets 1px, so neighbours sit 2px apart. */
const GAP = 2;
const TILE_RADIUS = 4;
/** Below this a tile cannot hold two lines of type — it keeps its title only. */
const LABEL_MIN_W = 56;
const LABEL_MIN_H = 28;
const LABEL_PAD = 8;
/** Rank ramp for the single accent hue: biggest tile darkest. */
const OPACITY_HI = 0.85;
const OPACITY_LO = 0.25;

interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

interface Item {
  entity: string;
  label: string;
  value: number;
}

interface Tile extends Rect {
  item: Item;
  opacity: number;
  pct: number;
}

/**
 * Worst aspect ratio produced by laying `row` across a side of length `side`
 * (Bruls, Huizing & van Wijk). Lower is squarer.
 */
function worstRatio(row: number[], side: number, sum: number): number {
  if (!row.length || side <= 0 || sum <= 0) return Infinity;
  let lo = Infinity;
  let hi = 0;
  for (const a of row) {
    if (a < lo) lo = a;
    if (a > hi) hi = a;
  }
  if (lo <= 0) return Infinity;
  const s2 = sum * sum;
  const side2 = side * side;
  return Math.max((side2 * hi) / s2, s2 / (side2 * lo));
}

/**
 * Squarified treemap: walk the areas largest-first, growing a row along the
 * shorter side of the remaining rectangle for as long as that keeps the row's
 * worst aspect ratio improving, then commit the row and shrink the rectangle.
 * `areas` must already be scaled so their sum equals the rectangle's area.
 */
function squarify(areas: number[], bounds: Rect): Rect[] {
  const out: Rect[] = [];
  let { x, y, w, h } = bounds;
  let row: number[] = [];
  let rowSum = 0;

  const commit = (): void => {
    if (!row.length) return;
    if (w <= h) {
      // Row runs left to right across the top of what remains.
      const rowH = w > 0 ? rowSum / w : 0;
      let cx = x;
      for (const a of row) {
        const tw = rowH > 0 ? a / rowH : 0;
        out.push({ x: cx, y, w: tw, h: rowH });
        cx += tw;
      }
      y += rowH;
      h -= rowH;
    } else {
      // Row runs top to bottom down the left edge.
      const rowW = h > 0 ? rowSum / h : 0;
      let cy = y;
      for (const a of row) {
        const th = rowW > 0 ? a / rowW : 0;
        out.push({ x, y: cy, w: rowW, h: th });
        cy += th;
      }
      x += rowW;
      w -= rowW;
    }
    row = [];
    rowSum = 0;
  };

  for (let i = 0; i < areas.length; i++) {
    const a = areas[i];
    const side = Math.min(w, h);
    if (side <= 0) break;
    if (!row.length) {
      row.push(a);
      rowSum = a;
      continue;
    }
    const current = worstRatio(row, side, rowSum);
    const widened = worstRatio([...row, a], side, rowSum + a);
    if (widened <= current) {
      row.push(a);
      rowSum += a;
    } else {
      commit();
      row = [a];
      rowSum = a;
    }
  }
  commit();
  return out;
}

/** SVG has no ellipsis: clip to what the box can hold and add one ourselves. */
function fitText(text: string, maxWidth: number, fontSize: number): string {
  const advance = fontSize * 0.56;
  const max = Math.floor(maxWidth / advance);
  if (max < 2) return '';
  if (text.length <= max) return text;
  return `${text.slice(0, Math.max(1, max - 1))}…`;
}

const EDITOR_TAG = 'silk-treemap-card-editor';

registerEditor(
  EDITOR_TAG,
  [
    {
      name: 'entities',
      required: true,
      selector: { entity: { multiple: true, domain: ['counter', 'input_number', 'number', 'sensor'] } },
    },
    { name: 'name', selector: { text: {} } },
    { name: 'unit', selector: { text: {} } },
  ],
  { entities: 'Entities', name: 'Name', unit: 'Unit' }
);

@customElement('silk-treemap-card')
export class SilkTreemapCard extends LitElement {
  @property({ attribute: false }) public hass?: HomeAssistant;

  @state() private _config?: SilkTreemapCardConfig;
  @state() private _plot: { w: number; h: number } | null = null;

  private _entries: { entity: string; name?: string }[] = [];
  private _resize?: ResizeObserver;

  public static getStubConfig(hass: HomeAssistant): Partial<SilkTreemapCardConfig> {
    const numeric = Object.keys(hass.states).filter(
      (id) => id.startsWith('sensor.') && Number(hass.states[id].state) > 0
    );
    const power = numeric.filter((id) => hass.states[id].attributes.device_class === 'power');
    const pick = power.length >= 2 ? power : numeric;
    return { type: 'custom:silk-treemap-card', entities: pick.slice(0, 5) };
  }

  public static async getConfigElement(): Promise<HTMLElement> {
    return document.createElement(EDITOR_TAG);
  }

  public setConfig(config: SilkTreemapCardConfig): void {
    if (!Array.isArray(config.entities) || !config.entities.length) {
      throw new Error('silk-treemap-card: `entities` must be a non-empty list');
    }
    this._entries = config.entities.map((item) => {
      const obj: SeriesUserConfig = typeof item === 'string' ? { entity: item } : item;
      if (!obj?.entity || typeof obj.entity !== 'string') {
        throw new Error('silk-treemap-card: every entry needs an `entity`');
      }
      return { entity: obj.entity, name: obj.name };
    });
    this._config = config;
  }

  public getCardSize(): number {
    return 3;
  }

  public getGridOptions(): Record<string, number> {
    return { columns: 6, rows: 3, min_columns: 4, min_rows: 2 };
  }

  public connectedCallback(): void {
    super.connectedCallback();
    if (this.hasUpdated) this._observePlot();
  }

  public disconnectedCallback(): void {
    super.disconnectedCallback();
    this._resize?.disconnect();
    this._resize = undefined;
  }

  protected updated(): void {
    this._observePlot();
  }

  private _observePlot(): void {
    const el = this.renderRoot.querySelector('.plot');
    if (!el) return;
    if (!this._resize) {
      this._resize = new ResizeObserver((entries) => {
        const rect = entries[entries.length - 1].contentRect;
        const w = Math.round(rect.width);
        const h = Math.round(rect.height);
        if (this._plot && this._plot.w === w && this._plot.h === h) return;
        this._plot = { w, h };
      });
    }
    this._resize.observe(el);
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

  /** Positive current values, largest first. Zero and unavailable drop out. */
  private _items(): Item[] {
    const hass = this.hass!;
    const items: Item[] = [];
    for (const entry of this._entries) {
      const stateObj = hass.states[entry.entity];
      if (!stateObj || isUnavailable(stateObj)) continue;
      const v = Number(stateObj.state);
      if (!Number.isFinite(v) || v <= 0) continue;
      items.push({
        entity: entry.entity,
        label: entry.name ?? stateObj.attributes.friendly_name ?? entry.entity,
        value: v,
      });
    }
    items.sort((a, b) => b.value - a.value || a.label.localeCompare(b.label));
    return items;
  }

  private _tiles(items: Item[], total: number): Tile[] {
    const size = this._plot;
    if (!size || size.w < 24 || size.h < 24 || !items.length || total <= 0) return [];
    const area = size.w * size.h;
    const areas = items.map((item) => (item.value / total) * area);
    const rects = squarify(areas, { x: 0, y: 0, w: size.w, h: size.h });
    const last = Math.max(items.length - 1, 1);
    return rects.map((rect, i) => ({
      ...rect,
      item: items[i],
      // One hue, rank-graded — magnitude never becomes a second color scale.
      opacity: OPACITY_HI - ((OPACITY_HI - OPACITY_LO) * i) / last,
      pct: (items[i].value / total) * 100,
    }));
  }

  private _onTileClick(ev: Event, entity: string): void {
    ev.stopPropagation();
    haptic(this, 'selection');
    moreInfo(this, entity);
  }

  private _renderTile(tile: Tile, unit: string): SVGTemplateResult {
    const x = tile.x + GAP / 2;
    const y = tile.y + GAP / 2;
    const w = Math.max(tile.w - GAP, 0);
    const h = Math.max(tile.h - GAP, 0);
    if (w <= 0.5 || h <= 0.5) return svg``;
    const r = Math.min(TILE_RADIUS, w / 2, h / 2);
    const value = `${formatNumber(this.hass, tile.item.entity, tile.item.value)}${unit ? ` ${unit}` : ''}`;
    const pct = tile.pct < 10 ? tile.pct.toFixed(1) : tile.pct.toFixed(0);
    const roomy = w >= LABEL_MIN_W && h >= LABEL_MIN_H;
    const textW = w - LABEL_PAD * 2;
    const cy = y + h / 2;

    return svg`
      <g
        class="tile"
        role="button"
        tabindex="0"
        aria-label=${`${tile.item.label}: ${value}, ${pct}%`}
        @click=${(ev: Event) => this._onTileClick(ev, tile.item.entity)}
        @keydown=${(ev: KeyboardEvent) => {
          if (ev.key === 'Enter' || ev.key === ' ') this._onTileClick(ev, tile.item.entity);
        }}
      >
        <rect
          class="box"
          x=${x.toFixed(1)}
          y=${y.toFixed(1)}
          width=${w.toFixed(1)}
          height=${h.toFixed(1)}
          rx=${r.toFixed(1)}
          style="fill-opacity:${tile.opacity.toFixed(2)}"
        ><title>${tile.item.label} · ${value} · ${pct}%</title></rect>
        ${
          roomy
            ? svg`
              <text class="tname" x=${(x + LABEL_PAD).toFixed(1)} y=${(cy - 4).toFixed(1)}>
                ${fitText(tile.item.label, textW, 11)}
              </text>
              <text class="tval" x=${(x + LABEL_PAD).toFixed(1)} y=${(cy + 10).toFixed(1)}>
                ${fitText(value, textW, 12)}
              </text>
            `
            : nothing
        }
      </g>
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

    const items = this._items();
    const total = items.reduce((sum, item) => sum + item.value, 0);
    const tiles = this._tiles(items, total);
    const size = this._plot;
    const accent = accentFor(hass.states[this._entries[0].entity], config.color);
    const unit = this._unit();
    const name = config.name ?? 'Proportion';

    return html`
      <ha-card
        class="control ${items.length ? '' : 'unavailable'}"
        style="--silk-accent:${accent}"
      >
        <div class="top">
          <div class="hname" title=${name}>${name}</div>
          <div class="trailing">
            <span class="value"
              >${items.length ? formatNumber(hass, this._entries[0].entity, total) : '—'}</span
            >
            ${unit && items.length ? html`<span class="unit">${unit}</span>` : nothing}
          </div>
        </div>
        <div class="plot">
          ${items.length
            ? size && tiles.length
              ? html`
                  <svg width=${size.w} height=${size.h} aria-hidden="false">
                    <g class="map">
                      ${tiles.map((tile) => this._renderTile(tile, unit))}
                    </g>
                  </svg>
                `
              : nothing
            : html`<div class="note">No positive values to compare</div>`}
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
        gap: 8px;
        padding: 12px 14px;
        cursor: default;
      }
      .top {
        flex: none;
        display: flex;
        align-items: center;
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
      .plot {
        position: relative;
        flex: 1;
        min-height: 60px;
      }
      .plot svg {
        position: absolute;
        inset: 0;
        display: block;
      }
      .map {
        animation: silk-treemap-in 260ms var(--silk-ease-out);
      }
      .tile {
        cursor: pointer;
        outline: none;
      }
      .box {
        fill: var(--silk-accent);
        transition: fill-opacity 200ms ease;
      }
      .tile:focus-visible .box {
        stroke: var(--primary-text-color);
        stroke-width: 2;
        stroke-opacity: 0.5;
      }
      .tname {
        font-size: 11px;
        fill: var(--primary-text-color);
        opacity: 0.72;
        pointer-events: none;
      }
      .tval {
        font-size: 12px;
        font-weight: 600;
        fill: var(--primary-text-color);
        font-variant-numeric: tabular-nums;
        pointer-events: none;
      }
      .note {
        position: absolute;
        inset: 0;
        display: grid;
        place-items: center;
        padding: 0 8px;
        font-size: 13px;
        color: var(--secondary-text-color);
        text-align: center;
      }
      @keyframes silk-treemap-in {
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
    'silk-treemap-card': SilkTreemapCard;
  }
}
