import {
  LitElement,
  html,
  svg,
  css,
  nothing,
  TemplateResult,
  SVGTemplateResult,
} from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { HomeAssistant, HassEntity, LovelaceCardConfig } from '../types';
import { silkControlStyles } from '../shared/base';
import { isUnavailable, moreInfo, haptic, clamp } from '../shared/service';
import { accentFor } from '../shared/color';
import { registerEditor } from '../shared/editor';
import { formatNumber } from '../format';

export const META = {
  type: 'silk-sankey-card',
  name: 'Silk Sankey',
  description: 'Where the energy actually goes.',
};

/** A column entry: an entity plus an optional display name. */
export interface SankeyNodeConfig {
  entity: string;
  name?: string;
}

export interface SilkSankeyCardConfig extends LovelaceCardConfig {
  /** Left column — what comes in. */
  sources: (string | SankeyNodeConfig)[];
  /** Right column — what it is spent on. */
  sinks: (string | SankeyNodeConfig)[];
  name?: string;
  /** Unit label; the first source's own unit by default. */
  unit?: string;
  /** Accent override. */
  color?: string;
}

/** Node bar width, and the breathing room between a bar and its label. */
const NODE_W = 8;
const LABEL_PAD = 8;
/** Vertical gap between stacked nodes, and between adjacent ribbon bands. */
const NODE_GAP = 2;
const BAND_GAP = 2;
/** Every node keeps a sliver of height so it never vanishes entirely. */
const MIN_NODE = 3;
/** Height of a two-line label — the minimum spacing between label centres. */
const LABEL_ROW = 27;
/** Below this the ribbon field is too narrow to read as a flow. */
const MIN_FIELD = 28;
/** Chart rules: six categories, then everything else is "Other". */
const MAX_NODES = 6;

const r1 = (n: number): number => Math.round(n * 10) / 10;

interface SankeyNode {
  /** Absent on the synthetic "Other" node. */
  entity?: string;
  name: string;
  /** Non-negative magnitude; 0 when the entity has no usable number. */
  value: number;
  na: boolean;
  /** The unattributed remainder — recessive, never accent. */
  muted: boolean;
}

interface SankeyModel {
  sources: SankeyNode[];
  sinks: SankeyNode[];
  totalSrc: number;
  totalSink: number;
  unit: string;
  unavailable: boolean;
  /** Entity opened by tapping the card body. */
  primary?: string;
}

interface Band {
  y: number;
  h: number;
}

/** Numeric magnitude of a state, NaN when it is missing or not a number. */
function magnitude(stateObj?: HassEntity): number {
  if (!stateObj || isUnavailable(stateObj) || stateObj.state === '') return NaN;
  const v = Number(stateObj.state);
  return Number.isFinite(v) ? Math.abs(v) : NaN;
}

function normalize(
  list: (string | SankeyNodeConfig)[],
  key: 'sources' | 'sinks'
): SankeyNodeConfig[] {
  return list.map((item) => {
    const obj: SankeyNodeConfig | undefined =
      typeof item === 'string' ? { entity: item } : (item as SankeyNodeConfig);
    if (!obj || typeof obj.entity !== 'string' || !obj.entity.includes('.')) {
      throw new Error(`silk-sankey-card: every entry in \`${key}\` needs an \`entity\``);
    }
    return obj;
  });
}

/**
 * Stack one column: heights proportional to value, a floor so nothing
 * disappears, squeezed to fit when the floors overflow, then centred.
 */
function stackColumn(values: number[], scale: number, boxH: number): Band[] {
  const gapTotal = (values.length - 1) * NODE_GAP;
  let heights = values.map((v) => Math.max(MIN_NODE, v * scale));
  let sum = heights.reduce((a, b) => a + b, 0);
  const room = Math.max(boxH - gapTotal, values.length * MIN_NODE);
  if (sum > room) {
    const k = room / sum;
    heights = heights.map((x) => x * k);
    sum = room;
  }
  let y = Math.max(0, (boxH - (sum + gapTotal)) / 2);
  return heights.map((h) => {
    const band = { y, h };
    y += h + NODE_GAP;
    return band;
  });
}

/**
 * Push label centres apart so a dominant flow cannot bury its small
 * neighbours' names. Order is preserved; when there is genuinely no room the
 * centres are left where they are rather than lying about the geometry.
 */
function spreadLabels(centres: number[], gap: number, boxH: number): number[] {
  const n = centres.length;
  const out = centres.slice();
  if (n < 2 || n * gap > boxH) return out;
  for (let i = 1; i < n; i++) out[i] = Math.max(out[i], out[i - 1] + gap);
  for (let i = n - 2; i >= 0; i--) out[i] = Math.min(out[i], out[i + 1] - gap);
  const lift = Math.max(0, gap / 2 - out[0]);
  const drop = Math.max(0, out[n - 1] - (boxH - gap / 2));
  return out.map((y) => y + lift - drop);
}

/** A cubic ribbon: source edge (y0a→y0b) tapering into sink edge (y1a→y1b). */
function ribbonPath(
  x0: number,
  y0a: number,
  y0b: number,
  x1: number,
  y1a: number,
  y1b: number
): string {
  const xm = (x0 + x1) / 2;
  return (
    `M${r1(x0)},${r1(y0a)} C${r1(xm)},${r1(y0a)} ${r1(xm)},${r1(y1a)} ${r1(x1)},${r1(y1a)} ` +
    `L${r1(x1)},${r1(y1b)} C${r1(xm)},${r1(y1b)} ${r1(xm)},${r1(y0b)} ${r1(x0)},${r1(y0b)} Z`
  );
}

const EDITOR_TAG = 'silk-sankey-card-editor';

registerEditor(
  EDITOR_TAG,
  [
    {
      name: 'sources',
      required: true,
      selector: { entity: { multiple: true, domain: ['sensor', 'number', 'input_number'] } },
    },
    {
      name: 'sinks',
      required: true,
      selector: { entity: { multiple: true, domain: ['sensor', 'number', 'input_number'] } },
    },
    { name: 'name', selector: { text: {} } },
    { name: 'unit', selector: { text: {} } },
  ],
  {
    sources: 'Sources (in)',
    sinks: 'Sinks (out)',
    name: 'Name',
    unit: 'Unit',
  }
);

@customElement('silk-sankey-card')
export class SilkSankeyCard extends LitElement {
  @property({ attribute: false }) public hass?: HomeAssistant;

  @state() private _config?: SilkSankeyCardConfig;
  /** Measured diagram box; the flow is laid out in exact pixels from it. */
  @state() private _plot: { w: number; h: number } | null = null;

  private _sources: SankeyNodeConfig[] = [];
  private _sinks: SankeyNodeConfig[] = [];
  private _resize?: ResizeObserver;

  public static getStubConfig(hass: HomeAssistant): Partial<SilkSankeyCardConfig> {
    const power = Object.keys(hass.states).filter(
      (id) =>
        id.startsWith('sensor.') &&
        hass.states[id].attributes.device_class === 'power' &&
        Number.isFinite(Number(hass.states[id].state))
    );
    const pool = power.length
      ? power
      : Object.keys(hass.states).filter(
          (id) => id.startsWith('sensor.') && Number.isFinite(Number(hass.states[id].state))
        );
    return {
      type: 'custom:silk-sankey-card',
      sources: pool.slice(0, 1),
      sinks: pool.slice(1, 4),
    };
  }

  public static async getConfigElement(): Promise<HTMLElement> {
    return document.createElement(EDITOR_TAG);
  }

  public setConfig(config: SilkSankeyCardConfig): void {
    if (!Array.isArray(config.sources) || config.sources.length === 0) {
      throw new Error('silk-sankey-card: `sources` is required — a list of entities coming in');
    }
    if (!Array.isArray(config.sinks) || config.sinks.length === 0) {
      throw new Error('silk-sankey-card: `sinks` is required — a list of entities going out');
    }
    this._sources = normalize(config.sources, 'sources');
    this._sinks = normalize(config.sinks, 'sinks');
    this._config = config;
  }

  public getCardSize(): number {
    return 4;
  }

  public getGridOptions(): Record<string, number> {
    return { columns: 6, rows: 4, min_columns: 4, min_rows: 3 };
  }

  public connectedCallback(): void {
    super.connectedCallback();
    // firstUpdated does not run again on a DOM re-attach: re-observe the box.
    if (this.hasUpdated) this._observePlot();
  }

  public disconnectedCallback(): void {
    super.disconnectedCallback();
    this._resize?.disconnect();
  }

  /** Runs after every render so the box is picked up whenever `.plot` appears. */
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
        if (!this._plot || this._plot.w !== w || this._plot.h !== h) this._plot = { w, h };
      });
    }
    this._resize.observe(el);
  }

  /**
   * Reads both columns. Overflow past six entries collapses into that column's
   * muted "Other", and any source total the sinks do not account for becomes
   * the "Other" sink — the remainder is named, never silently dropped.
   */
  private _model(): SankeyModel | null {
    const hass = this.hass;
    const config = this._config;
    if (!hass || !config) return null;

    const read = (list: SankeyNodeConfig[]): SankeyNode[] => {
      const kept: SankeyNode[] = list.slice(0, MAX_NODES).map((item): SankeyNode => {
        const stateObj = hass.states[item.entity];
        const raw = magnitude(stateObj);
        return {
          entity: item.entity,
          name: item.name ?? stateObj?.attributes.friendly_name ?? item.entity,
          value: Number.isFinite(raw) ? raw : 0,
          na: !Number.isFinite(raw),
          muted: false,
        };
      });
      const rest = list.slice(MAX_NODES);
      if (rest.length) {
        const sum = rest.reduce((acc, item) => {
          const raw = magnitude(hass.states[item.entity]);
          return acc + (Number.isFinite(raw) ? raw : 0);
        }, 0);
        kept.push({ entity: undefined, name: 'Other', value: sum, na: false, muted: true });
      }
      return kept;
    };

    const sources = read(this._sources);
    const sinks = read(this._sinks);
    const totalSrc = sources.reduce((a, n) => a + n.value, 0);
    let totalSink = sinks.reduce((a, n) => a + n.value, 0);

    // Whatever the sinks cannot explain is unattributed, not invisible.
    const remainder = totalSrc - totalSink;
    if (remainder > Math.max(totalSrc * 0.005, 1e-6)) {
      const other = sinks.find((n) => n.muted);
      if (other) other.value += remainder;
      else sinks.push({ entity: undefined, name: 'Other', value: remainder, na: false, muted: true });
      totalSink = totalSrc;
    }

    const ids = [...this._sources, ...this._sinks].map((n) => n.entity);
    const firstSource = this._sources[0]?.entity;
    const unit =
      config.unit ??
      (firstSource ? (hass.states[firstSource]?.attributes.unit_of_measurement as string) : '') ??
      '';

    return {
      sources,
      sinks,
      totalSrc,
      totalSink,
      unit,
      unavailable: ids.every((id) => isUnavailable(hass.states[id])),
      primary: firstSource,
    };
  }

  private _fmt(node: SankeyNode, model: SankeyModel): string {
    if (node.na) return '—';
    const id = node.entity ?? model.primary ?? '';
    return formatNumber(this.hass, id, node.value);
  }

  private _onNodeClick(ev: Event, entityId?: string): void {
    ev.stopPropagation();
    if (!entityId) return;
    haptic(this, 'selection');
    moreInfo(this, entityId);
  }

  private _onCardClick(): void {
    const primary = this._model()?.primary;
    if (primary) moreInfo(this, primary);
  }

  private _renderFlow(model: SankeyModel): TemplateResult | typeof nothing {
    const size = this._plot;
    if (!size || size.w < 80 || size.h < 40) return nothing;
    if (model.totalSrc <= 0 && model.totalSink <= 0) {
      return html`<div class="note">No values to flow</div>`;
    }

    const labelW = clamp(Math.round(size.w * 0.26), 52, 108);
    const xSrc = labelW + LABEL_PAD;
    const xSink = size.w - labelW - LABEL_PAD - NODE_W;
    if (xSink - (xSrc + NODE_W) < MIN_FIELD) {
      return html`<div class="note">Not enough room to draw the flow</div>`;
    }

    const maxTotal = Math.max(model.totalSrc, model.totalSink, 1e-9);
    // One scale for both columns, so an unbalanced diagram reads as unbalanced.
    const gapsRoom = Math.max(
      (model.sources.length - 1) * NODE_GAP,
      (model.sinks.length - 1) * NODE_GAP
    );
    const scale = Math.max(size.h - gapsRoom, MIN_NODE) / maxTotal;
    const srcBands = stackColumn(
      model.sources.map((n) => n.value),
      scale,
      size.h
    );
    const sinkBands = stackColumn(
      model.sinks.map((n) => n.value),
      scale,
      size.h
    );

    const liveSrc = model.sources.filter((n) => n.value > 0).length;
    const liveSink = model.sinks.filter((n) => n.value > 0).length;
    const marks: SVGTemplateResult[] = [];

    if (model.totalSrc > 0 && model.totalSink > 0 && liveSrc && liveSink) {
      // Silk cannot know real attribution, so each source is split across the
      // sinks by their share (and vice versa) — the ribbon tapers between them.
      const srcCursor = srcBands.map((b) => b.y);
      const sinkCursor = sinkBands.map((b) => b.y);
      const srcRoom = srcBands.map((b) => Math.max(b.h - (liveSink - 1) * BAND_GAP, 0.5));
      const sinkRoom = sinkBands.map((b) => Math.max(b.h - (liveSrc - 1) * BAND_GAP, 0.5));

      model.sources.forEach((source, i) => {
        if (source.value <= 0) return;
        model.sinks.forEach((sink, j) => {
          if (sink.value <= 0) return;
          const hL = srcRoom[i] * (sink.value / model.totalSink);
          const hR = sinkRoom[j] * (source.value / model.totalSrc);
          const y0 = srcCursor[i];
          const y1 = sinkCursor[j];
          srcCursor[i] += hL + BAND_GAP;
          sinkCursor[j] += hR + BAND_GAP;
          const flow = source.value * (sink.value / model.totalSink);
          const title = `${source.name} → ${sink.name} · ${formatNumber(
            this.hass,
            source.entity ?? '',
            flow
          )}${model.unit ? ` ${model.unit}` : ''}`;
          marks.push(
            svg`<path
              class="ribbon ${sink.muted || source.muted ? 'muted' : ''}"
              d=${ribbonPath(xSrc + NODE_W, y0, y0 + hL, xSink, y1, y1 + hR)}
            ><title>${title}</title></path>`
          );
        });
      });
    }

    const column = (nodes: SankeyNode[], bands: Band[], x: number): SVGTemplateResult[] =>
      nodes.map((node, i) => {
        const band = bands[i];
        const rx = Math.min(2, band.h / 2);
        return svg`<rect
          class="node ${node.muted ? 'muted' : ''} ${node.na ? 'na' : ''}"
          x=${r1(x)}
          y=${r1(band.y)}
          width=${NODE_W}
          height=${r1(Math.max(band.h, 1))}
          rx=${r1(rx)}
        ><title>${node.name} · ${this._fmt(node, model)}${
          model.unit ? ` ${model.unit}` : ''
        }</title></rect>`;
      });

    const labels = (nodes: SankeyNode[], bands: Band[], side: 'left' | 'right'): TemplateResult[] => {
      const ys = spreadLabels(
        bands.map((b) => b.y + b.h / 2),
        LABEL_ROW,
        size.h
      );
      return nodes.map((node, i) => {
        const pos =
          side === 'left'
            ? `left:0;width:${labelW}px;`
            : `left:${r1(xSink + NODE_W + LABEL_PAD)}px;width:${labelW}px;`;
        return html`
          <button
            class="lab ${side} ${node.muted ? 'muted' : ''}"
            style="${pos}top:${r1(ys[i])}px"
            title=${`${node.name} · ${this._fmt(node, model)}${model.unit ? ` ${model.unit}` : ''}`}
            @click=${(ev: Event) => this._onNodeClick(ev, node.entity)}
          >
            <span class="lname">${node.name}</span>
            <span class="lval">${this._fmt(node, model)}</span>
          </button>
        `;
      });
    };

    return html`
      <svg width=${size.w} height=${size.h} aria-hidden="true">
        <g class="chart">
          ${marks}${column(model.sources, srcBands, xSrc)}${column(model.sinks, sinkBands, xSink)}
        </g>
      </svg>
      ${labels(model.sources, srcBands, 'left')}${labels(model.sinks, sinkBands, 'right')}
    `;
  }

  protected render(): TemplateResult | typeof nothing {
    const config = this._config;
    const hass = this.hass;
    if (!config || !hass) return nothing;
    const model = this._model();
    if (!model) return nothing;

    const first = model.primary ? hass.states[model.primary] : undefined;
    if (model.primary && !first) {
      return html`<ha-card><div class="warning">Entity not found: ${model.primary}</div></ha-card>`;
    }
    const accent = accentFor(first, config.color);
    const title = config.name ?? 'Energy flow';

    return html`
      <ha-card
        class="control ${model.unavailable ? 'unavailable' : ''}"
        style="--silk-accent:${accent}"
        @click=${this._onCardClick}
      >
        <div class="head">
          <div class="hname">${title}</div>
          <div class="total">
            <span class="tval">${formatNumber(hass, model.primary ?? '', model.totalSrc)}</span>
            ${model.unit ? html`<span class="unit">${model.unit}</span>` : nothing}
          </div>
        </div>
        <div class="plot">${this._renderFlow(model)}</div>
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
      }
      .head {
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
      .total {
        flex: none;
        display: flex;
        align-items: baseline;
        gap: 3px;
      }
      .tval {
        font-size: 15px;
        font-weight: 600;
        letter-spacing: -0.01em;
        color: var(--primary-text-color);
        font-variant-numeric: tabular-nums;
      }
      .plot {
        position: relative;
        flex: 1;
        min-height: 96px;
        min-width: 0;
      }
      .plot svg {
        position: absolute;
        inset: 0;
        display: block;
      }
      .chart {
        animation: silk-sankey-in 250ms var(--silk-ease-out);
      }
      .ribbon {
        fill: var(--silk-accent);
        fill-opacity: 0.35;
        transition: fill-opacity 200ms ease;
      }
      .ribbon:hover {
        fill-opacity: 0.55;
      }
      .ribbon.muted {
        fill: rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.5);
        fill-opacity: 0.22;
      }
      .node {
        fill: var(--silk-accent);
        fill-opacity: 0.9;
      }
      .node.muted,
      .node.na {
        fill: rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.55);
        fill-opacity: 0.5;
      }
      .lab {
        position: absolute;
        transform: translateY(-50%);
        display: flex;
        flex-direction: column;
        gap: 1px;
        margin: 0;
        padding: 0;
        border: none;
        background: none;
        font: inherit;
        color: inherit;
        cursor: pointer;
        overflow: hidden;
      }
      .lab.left {
        align-items: flex-end;
        text-align: right;
      }
      .lab.right {
        align-items: flex-start;
        text-align: left;
      }
      .lab:focus-visible {
        outline: 2px solid color-mix(in srgb, var(--silk-accent) 70%, transparent);
        outline-offset: 2px;
        border-radius: 6px;
      }
      .lname {
        max-width: 100%;
        font-size: 11px;
        line-height: 1.25;
        color: var(--primary-text-color);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .lval {
        max-width: 100%;
        font-size: 11px;
        font-weight: 600;
        line-height: 1.2;
        color: var(--secondary-text-color);
        font-variant-numeric: tabular-nums;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .lab.muted .lname {
        color: var(--secondary-text-color);
      }
      .note {
        position: absolute;
        inset: 0;
        display: grid;
        place-items: center;
        padding: 0 8px;
        font-size: 12px;
        color: var(--secondary-text-color);
        text-align: center;
      }
      .unavailable .plot {
        opacity: 0.45;
      }
      @keyframes silk-sankey-in {
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
    'silk-sankey-card': SilkSankeyCard;
  }
}
