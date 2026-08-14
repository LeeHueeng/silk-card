import {
  LitElement,
  html,
  svg,
  css,
  unsafeCSS,
  nothing,
  PropertyValues,
  TemplateResult,
  SVGTemplateResult,
} from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { HomeAssistant, LovelaceCardConfig } from '../types';
import { silkControlStyles } from '../shared/base';
import { isUnavailable, moreInfo, haptic, clamp } from '../shared/service';
import { accentFor } from '../shared/color';
import { registerRowsEditor } from '../shared/rows';
import { formatNumber } from '../format';

export const META = {
  type: 'silk-radar-card',
  name: 'Silk Radar',
  description: 'Several metrics, one silhouette.',
};

export interface RadarMetric {
  entity: string;
  label?: string;
  min?: number;
  max?: number;
}

export interface SilkRadarCardConfig extends LovelaceCardConfig {
  metrics: RadarMetric[];
  name?: string;
  /** Overlay yesterday's daily means as a second silhouette. */
  compare?: boolean;
}

const MIN_METRICS = 3;
const MAX_METRICS = 8;
/** Yesterday's silhouette: one fixed warm hue, never the card accent. */
const COMPARE_COLOR = '#e6a23c';
/** Room outside the outer ring for the spoke labels: wider than tall. */
const LABEL_PAD_X = 40;
const LABEL_PAD_Y = 14;
const LABEL_GAP = 10;
/** 4px vertex dots. */
const DOT_R = 2;
/** Rough advance of the 10px label face; used to clip labels to their band. */
const LABEL_ADVANCE = 5.4;
/** Statistics land on the hour; refetch a little after each boundary. */
const HOURLY_SLACK_MS = 90_000;

/**
 * Row from `recorder/statistics_during_period` — Silk's minimal HomeAssistant
 * type doesn't model recorder responses, so it is typed locally.
 */
interface StatisticsRow {
  start: number | string;
  mean?: number | null;
}

interface Axis {
  entity: string;
  label: string;
  min: number;
  max: number;
  /** Current value, NaN when the entity has none. */
  value: number;
  /** Current value normalized to 0..1. */
  norm: number;
  unit: string;
}

/** SVG has no ellipsis: clip to what the label band can hold. */
function fitText(text: string, maxChars: number): string {
  if (text.length <= maxChars) return text;
  return `${text.slice(0, Math.max(1, maxChars - 1))}…`;
}

const EDITOR_TAG = 'silk-radar-card-editor';

registerRowsEditor(EDITOR_TAG, {
  field: 'metrics',
  title: '지표',
  addLabel: '지표 추가',
  row: [
    { name: 'entity', label: '엔티티', selector: { entity: { domain: ['sensor', 'number', 'input_number'] } } },
    { name: 'label', label: '이름', selector: { text: {} } },
    { name: 'min', label: '최솟값', selector: { number: { mode: 'box', step: 'any' } } },
    { name: 'max', label: '최댓값', selector: { number: { mode: 'box', step: 'any' } } },
  ],
  blank: { entity: '' },
  schema: [
    { name: 'name', selector: { text: {} } },
    { name: 'compare', selector: { boolean: {} } },
  ],
  labels: {
    name: '이름',
    compare: '어제와 비교',
  },
  defaults: { compare: false },
});

@customElement('silk-radar-card')
export class SilkRadarCard extends LitElement {
  @property({ attribute: false }) public hass?: HomeAssistant;

  @state() private _config?: SilkRadarCardConfig;
  @state() private _plot: { w: number; h: number } | null = null;
  /** Yesterday's daily mean per statistic id; empty until the fetch lands. */
  @state() private _compare: Record<string, number> = {};
  @state() private _compareMissing = false;

  private _metrics: RadarMetric[] = [];
  private _fetchStarted = false;
  private _fetchSeq = 0;
  private _resize?: ResizeObserver;
  private _hourlyTimer?: number;

  public static getStubConfig(hass: HomeAssistant): Partial<SilkRadarCardConfig> {
    const numeric = Object.keys(hass.states).filter(
      (id) =>
        id.startsWith('sensor.') &&
        hass.states[id].state !== '' &&
        Number.isFinite(Number(hass.states[id].state))
    );
    const byClass = (cls: string) =>
      numeric.find((id) => hass.states[id].attributes.device_class === cls);
    const picks = [byClass('humidity'), byClass('temperature'), byClass('pressure')].filter(
      (id): id is string => Boolean(id)
    );
    const fill = numeric.filter((id) => !picks.includes(id)).slice(0, MIN_METRICS - picks.length);
    return {
      type: 'custom:silk-radar-card',
      metrics: [...picks, ...fill].slice(0, MIN_METRICS).map((entity) => ({ entity })),
    };
  }

  public static async getConfigElement(): Promise<HTMLElement> {
    return document.createElement(EDITOR_TAG);
  }

  public setConfig(config: SilkRadarCardConfig): void {
    if (!Array.isArray(config.metrics)) {
      throw new Error('silk-radar-card: `metrics` must be a list of {entity, label, min, max}');
    }
    if (config.metrics.length < MIN_METRICS || config.metrics.length > MAX_METRICS) {
      throw new Error(
        `silk-radar-card: a radar needs between ${MIN_METRICS} and ${MAX_METRICS} metrics`
      );
    }
    for (const metric of config.metrics) {
      if (!metric?.entity || typeof metric.entity !== 'string') {
        throw new Error('silk-radar-card: every metric needs an `entity`');
      }
      if (
        metric.min !== undefined &&
        metric.max !== undefined &&
        Number(metric.max) <= Number(metric.min)
      ) {
        throw new Error(`silk-radar-card: ${metric.entity} needs \`max\` greater than \`min\``);
      }
    }
    this._metrics = config.metrics.map((m) => ({ ...m }));
    this._config = config;
    this._compare = {};
    this._compareMissing = false;
    this._fetchStarted = false;
  }

  public getCardSize(): number {
    return 4;
  }

  public getGridOptions(): Record<string, number> {
    return { columns: 4, rows: 4, min_columns: 3, min_rows: 3 };
  }

  public connectedCallback(): void {
    super.connectedCallback();
    this._scheduleHourly();
    if (this.hasUpdated) {
      this._observePlot();
      if (this._fetchStarted) this._refresh();
    }
  }

  public disconnectedCallback(): void {
    super.disconnectedCallback();
    window.clearTimeout(this._hourlyTimer);
    this._hourlyTimer = undefined;
    this._resize?.disconnect();
    this._resize = undefined;
  }

  protected willUpdate(_changed: PropertyValues): void {
    if (!this.hass || !this._config) return;
    if (!this._fetchStarted) {
      this._fetchStarted = true;
      this._refresh();
      // connectedCallback may have run before setConfig, when `compare` was
      // still unknown and the hourly refetch declined to schedule itself.
      this._scheduleHourly();
    }
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

  private _scheduleHourly(): void {
    window.clearTimeout(this._hourlyTimer);
    if (!this._config?.compare) return;
    const now = Date.now();
    const next = (Math.floor(now / 3_600_000) + 1) * 3_600_000 + HOURLY_SLACK_MS;
    this._hourlyTimer = window.setTimeout(() => {
      this._refresh();
      this._scheduleHourly();
    }, next - now);
  }

  /** Yesterday's daily mean for every metric, for the comparison silhouette. */
  private async _refresh(): Promise<void> {
    const hass = this.hass;
    if (!hass || !this._config?.compare || !this._metrics.length) return;
    const seq = ++this._fetchSeq;
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
    let resp: Record<string, StatisticsRow[]>;
    try {
      resp = await hass.callWS<Record<string, StatisticsRow[]>>({
        type: 'recorder/statistics_during_period',
        start_time: yesterday.toISOString(),
        end_time: todayStart.toISOString(),
        statistic_ids: this._metrics.map((m) => m.entity),
        period: 'day',
        types: ['mean'],
      });
    } catch (err) {
      console.warn('silk-radar-card: statistics fetch failed', err);
      if (seq === this._fetchSeq) this._compareMissing = true;
      return;
    }
    if (seq !== this._fetchSeq) return; // a newer fetch superseded this one
    const means: Record<string, number> = {};
    for (const metric of this._metrics) {
      const row = (resp?.[metric.entity] ?? []).find(
        (r) => typeof r.mean === 'number' && Number.isFinite(r.mean)
      );
      if (row) means[metric.entity] = row.mean as number;
    }
    this._compare = means;
    // The overlay is all-or-nothing: a polygon missing a vertex would lie
    // about the shape, so a partial answer reads as unavailable.
    this._compareMissing = Object.keys(means).length < this._metrics.length;
  }

  private _axes(): Axis[] {
    const hass = this.hass!;
    return this._metrics.map((metric) => {
      const stateObj = hass.states[metric.entity];
      const attrMin = Number(stateObj?.attributes.min);
      const attrMax = Number(stateObj?.attributes.max);
      const min = metric.min ?? (Number.isFinite(attrMin) ? attrMin : 0);
      const maxRaw = metric.max ?? (Number.isFinite(attrMax) ? attrMax : 100);
      const max = maxRaw > min ? maxRaw : min + 1;
      const raw = Number(stateObj?.state);
      const value = stateObj && !isUnavailable(stateObj) && Number.isFinite(raw) ? raw : NaN;
      return {
        entity: metric.entity,
        label: metric.label ?? stateObj?.attributes.friendly_name ?? metric.entity,
        min,
        max,
        value,
        norm: Number.isFinite(value) ? clamp((value - min) / (max - min), 0, 1) : 0,
        unit: (stateObj?.attributes.unit_of_measurement as string | undefined) ?? '',
      };
    });
  }

  private _compareNorm(axis: Axis): number | null {
    const v = this._compare[axis.entity];
    if (v === undefined || !Number.isFinite(v)) return null;
    return clamp((v - axis.min) / (axis.max - axis.min), 0, 1);
  }

  private _onVertexClick(ev: Event, entity: string): void {
    ev.stopPropagation();
    haptic(this, 'selection');
    moreInfo(this, entity);
  }

  private _renderRadar(axes: Axis[]): TemplateResult | typeof nothing {
    const size = this._plot;
    if (!size) return nothing;
    const cx = size.w / 2;
    const cy = size.h / 2;
    const radius = Math.min(size.w / 2 - LABEL_PAD_X, size.h / 2 - LABEL_PAD_Y);
    if (radius < 14) return nothing;

    const n = axes.length;
    const angle = (i: number): number => -Math.PI / 2 + (i * 2 * Math.PI) / n;
    const point = (i: number, r: number): [number, number] => [
      cx + r * Math.cos(angle(i)),
      cy + r * Math.sin(angle(i)),
    ];
    const polygon = (rs: number[]): string =>
      rs
        .map((r, i) => {
          const [x, y] = point(i, r);
          return `${x.toFixed(1)},${y.toFixed(1)}`;
        })
        .join(' ');

    // Guides: two concentric rings, half radius and full, plus the spokes.
    const rings: SVGTemplateResult[] = [0.5, 1].map(
      (f) => svg`<polygon class="ring" points=${polygon(axes.map(() => radius * f))}></polygon>`
    );
    const spokes: SVGTemplateResult[] = axes.map((_, i) => {
      const [x, y] = point(i, radius);
      return svg`<line class="spoke" x1=${cx.toFixed(1)} y1=${cy.toFixed(1)} x2=${x.toFixed(1)} y2=${y.toFixed(1)}></line>`;
    });

    const compareRs: (number | null)[] = this._config?.compare
      ? axes.map((axis) => {
          const norm = this._compareNorm(axis);
          return norm === null ? null : radius * norm;
        })
      : [];
    const hasCompare = compareRs.length > 0 && compareRs.every((r) => r !== null);

    const labels: SVGTemplateResult[] = axes.map((axis, i) => {
      const [x, y] = point(i, radius + LABEL_GAP);
      const cos = Math.cos(angle(i));
      const sin = Math.sin(angle(i));
      const anchor = Math.abs(cos) < 0.25 ? 'middle' : cos > 0 ? 'start' : 'end';
      const dy = sin > 0.5 ? 8 : sin < -0.5 ? -2 : 3.5;
      // Side labels get the band between the ring and the card edge; the
      // top/bottom ones may spend a slice of the plot width.
      const avail =
        anchor === 'middle'
          ? Math.min(size.w * 0.42, 84)
          : size.w / 2 - radius - LABEL_GAP + LABEL_PAD_X * 0.3;
      const room = Math.max(3, Math.floor(avail / LABEL_ADVANCE));
      return svg`
        <text
          class="alabel ${Number.isFinite(axis.value) ? '' : 'out'}"
          x=${x.toFixed(1)}
          y=${(y + dy).toFixed(1)}
          text-anchor=${anchor}
        >${fitText(axis.label, room)}<title>${axis.label}</title></text>
      `;
    });

    const dots: SVGTemplateResult[] = axes.map((axis, i) => {
      const [x, y] = point(i, radius * axis.norm);
      const [hx, hy] = point(i, radius * Math.max(axis.norm, 0.12));
      const value = Number.isFinite(axis.value)
        ? `${formatNumber(this.hass, axis.entity, axis.value)}${axis.unit}`
        : '—';
      const past = this._compare[axis.entity];
      const pastText =
        this._config?.compare && past !== undefined
          ? ` · yesterday ${formatNumber(this.hass, axis.entity, past)}${axis.unit}`
          : '';
      return svg`
        <circle class="vertex" cx=${x.toFixed(1)} cy=${y.toFixed(1)} r=${DOT_R}></circle>
        <circle
          class="hit"
          cx=${hx.toFixed(1)}
          cy=${hy.toFixed(1)}
          r="10"
          @click=${(ev: Event) => this._onVertexClick(ev, axis.entity)}
        ><title>${axis.label} · ${value} (${axis.min}–${axis.max})${pastText}</title></circle>
      `;
    });

    return html`
      <svg width=${size.w} height=${size.h} role="img" aria-label="Metric radar">
        <g class="chart">
          ${rings}${spokes}
          ${hasCompare
            ? svg`<polygon class="past" points=${polygon(compareRs as number[])}><title>Yesterday</title></polygon>`
            : nothing}
          <polygon class="now" points=${polygon(axes.map((a) => radius * a.norm))}>
            <title>Now</title>
          </polygon>
          ${dots}${labels}
        </g>
      </svg>
    `;
  }

  protected render(): TemplateResult | typeof nothing {
    const config = this._config;
    const hass = this.hass;
    if (!config || !hass) return nothing;

    const missing = this._metrics.filter((m) => !hass.states[m.entity]);
    if (missing.length === this._metrics.length) {
      return html`<ha-card
        ><div class="warning">Entity not found: ${missing[0].entity}</div></ha-card
      >`;
    }

    const axes = this._axes();
    const allOut = axes.every((a) => !Number.isFinite(a.value));
    const accent = accentFor(hass.states[this._metrics[0].entity], config.color);
    const name = config.name ?? 'Radar';

    return html`
      <ha-card class="control ${allOut ? 'unavailable' : ''}" style="--silk-accent:${accent}">
        <div class="hname" title=${name}>${name}</div>
        <div class="plot">
          ${allOut ? html`<div class="note">No readings right now</div>` : this._renderRadar(axes)}
        </div>
        ${config.compare
          ? html`
              <div class="legend">
                <span class="key"><span class="dot now"></span>Now</span>
                <span class="key ${this._compareMissing ? 'off' : ''}">
                  <span class="dot past"></span>
                  ${this._compareMissing ? 'Yesterday unavailable' : 'Yesterday'}
                </span>
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
        gap: 6px;
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
      .plot {
        position: relative;
        flex: 1;
        min-height: 90px;
      }
      .plot svg {
        position: absolute;
        inset: 0;
        display: block;
        /* Spoke labels may lean into the card padding rather than shrink. */
        overflow: visible;
      }
      .chart {
        animation: silk-radar-in 280ms var(--silk-ease-out);
      }
      .ring,
      .spoke {
        fill: none;
        stroke: rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.12);
        stroke-width: 1;
      }
      .now {
        fill: var(--silk-accent);
        fill-opacity: 0.18;
        stroke: var(--silk-accent);
        stroke-width: 2;
        stroke-linejoin: round;
      }
      .past {
        fill: ${unsafeCSS(COMPARE_COLOR)};
        fill-opacity: 0.12;
        stroke: ${unsafeCSS(COMPARE_COLOR)};
        stroke-width: 1.5;
        stroke-opacity: 0.55;
        stroke-linejoin: round;
      }
      .vertex {
        fill: var(--silk-accent);
        pointer-events: none;
      }
      .hit {
        fill: transparent;
        cursor: pointer;
      }
      .alabel {
        font-size: 10px;
        fill: var(--primary-text-color);
        opacity: 0.55;
        pointer-events: none;
      }
      .alabel.out {
        opacity: 0.3;
      }
      .legend {
        flex: none;
        display: flex;
        flex-wrap: wrap;
        gap: 4px 12px;
        font-size: 11px;
        color: var(--secondary-text-color);
      }
      .key {
        display: inline-flex;
        align-items: center;
        gap: 5px;
        min-width: 0;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .key.off {
        opacity: 0.5;
      }
      .dot {
        flex: none;
        width: 8px;
        height: 8px;
        border-radius: 50%;
      }
      .dot.now {
        background: var(--silk-accent);
      }
      .dot.past {
        background: ${unsafeCSS(COMPARE_COLOR)};
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
      @keyframes silk-radar-in {
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
    'silk-radar-card': SilkRadarCard;
  }
}
