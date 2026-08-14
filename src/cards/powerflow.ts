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
import { registerEditor } from '../shared/editor';
import { formatNumber } from '../format';

export const META = {
  type: 'silk-power-flow-card',
  name: 'Silk Power Flow',
  description: 'Watch energy move through your home.',
};

export interface SilkPowerFlowCardConfig extends LovelaceCardConfig {
  /** Solar production (W, always positive). */
  solar?: string;
  /** Grid power (W). Positive = importing, negative = exporting. */
  grid?: string;
  /**
   * Separate export sensor (W, positive) for integrations that split import
   * and export into two entities. Leave empty when a single signed grid
   * sensor already carries both directions.
   */
  grid_export?: string;
  /** House consumption (W). Derived from the others when omitted. */
  home?: string;
  /** Battery power (W). Positive = charging, negative = discharging. */
  battery?: string;
  /** Battery state of charge (%). */
  battery_soc?: string;
  /** Accent override; default is Silk's energy teal. */
  color?: string;
}

/** Home reads as the card's accent; the other three carry their own identity. */
const DEFAULT_ACCENT = '#35b5b1';

const NODE_R = 23; // 46px circles
/** Connector endpoints stop clear of the disc (and the battery SOC ring). */
const TRIM = 30;
/** Space under a disc for its value line. */
const LABEL_BAND = 18;
const LABEL_W_MAX = 96;
/** Perpendicular bow on the four diamond edges; the solar→home diagonal is straight. */
const BOW = 13;
/** Below this the link is noise, not flow. */
const ACTIVE_W = 5;
const DOT_COUNT = 3;
const DOT_R = 2.3;
const MIN_DUR = 1.2;
const MAX_DUR = 6;

type NodeId = 'solar' | 'grid' | 'home' | 'battery';

interface Pt {
  x: number;
  y: number;
}

interface FlowNode {
  id: NodeId;
  /** Entity opened by tapping the node; absent for a derived home. */
  entity?: string;
  color: string;
  icon: string;
  label: string;
  unit: string;
  /** Second line — battery state of charge only. */
  sub?: string;
  title: string;
  /** Power is actually moving through this node. */
  active: boolean;
  /** Value unknown (missing or unavailable entity). */
  na: boolean;
}

interface FlowLink {
  from: NodeId;
  to: NodeId;
  /** Magnitude in W. */
  watts: number;
  /** Dots travel `to` → `from` (grid export, battery discharge). */
  reverse: boolean;
  bow: number;
}

interface FlowModel {
  nodes: FlowNode[];
  links: FlowLink[];
  /** Self-sufficiency percent, or null when it cannot be computed. */
  selfPct: number | null;
  unavailable: boolean;
  /** Every configured entity is absent from the state machine. */
  allMissing: boolean;
}

const NODE_ICONS: Record<Exclude<NodeId, 'battery'>, string> = {
  solar: 'mdi:solar-power-variant',
  grid: 'mdi:transmission-tower',
  home: 'mdi:home',
};

const NODE_COLORS: Record<NodeId, string> = {
  solar: 'var(--silk-solar)',
  grid: 'var(--silk-grid)',
  home: 'var(--silk-accent)',
  battery: 'var(--silk-battery)',
};

const NODE_TITLES: Record<NodeId, string> = {
  solar: 'Solar',
  grid: 'Grid',
  home: 'Home',
  battery: 'Battery',
};

const r1 = (n: number): number => Math.round(n * 10) / 10;

/** Numeric state, NaN when the entity is missing/unavailable/non-numeric. */
function numericState(stateObj?: HassEntity): number {
  if (!stateObj || isUnavailable(stateObj) || stateObj.state === '') return NaN;
  const v = Number(stateObj.state);
  return Number.isFinite(v) ? v : NaN;
}

/** A point `dist` along the straight line from `p` toward `q`. */
function towards(p: Pt, q: Pt, dist: number): Pt {
  const dx = q.x - p.x;
  const dy = q.y - p.y;
  const len = Math.hypot(dx, dy) || 1;
  return { x: p.x + (dx / len) * dist, y: p.y + (dy / len) * dist };
}

/**
 * Quadratic connector between two nodes, bowed away from the diagram centre
 * so the diamond reads as rounded rather than as a wireframe. Endpoints are
 * trimmed back to the disc edge, so the stroke never runs under an icon.
 */
function connector(a: Pt, b: Pt, centre: Pt, bow: number): string {
  const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
  let q = mid;
  if (bow > 0) {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const len = Math.hypot(dx, dy) || 1;
    let nx = -dy / len;
    let ny = dx / len;
    if (nx * (mid.x - centre.x) + ny * (mid.y - centre.y) < 0) {
      nx = -nx;
      ny = -ny;
    }
    q = { x: mid.x + nx * bow, y: mid.y + ny * bow };
  }
  const a2 = towards(a, q, TRIM);
  const b2 = towards(b, q, TRIM);
  return `M ${r1(a2.x)} ${r1(a2.y)} Q ${r1(q.x)} ${r1(q.y)} ${r1(b2.x)} ${r1(b2.y)}`;
}

/** Battery glyph that follows charge level and direction. */
function batteryIcon(soc: number, charging: boolean): string {
  if (!Number.isFinite(soc)) return charging ? 'mdi:battery-charging' : 'mdi:battery';
  const step = clamp(Math.round(soc / 10) * 10, 0, 100);
  if (charging) return `mdi:battery-charging-${step <= 10 ? 10 : step}`;
  if (step >= 100) return 'mdi:battery';
  if (step <= 0) return 'mdi:battery-outline';
  return `mdi:battery-${step}`;
}

const EDITOR_TAG = 'silk-power-flow-card-editor';

registerEditor(
  EDITOR_TAG,
  [
    { name: 'solar', selector: { entity: { domain: ['sensor'], device_class: 'power' } } },
    { name: 'grid', selector: { entity: { domain: ['sensor'], device_class: 'power' } } },
    { name: 'grid_export', selector: { entity: { domain: ['sensor'], device_class: 'power' } } },
    { name: 'home', selector: { entity: { domain: ['sensor'], device_class: 'power' } } },
    { name: 'battery', selector: { entity: { domain: ['sensor'], device_class: 'power' } } },
    {
      name: 'battery_soc',
      selector: { entity: { domain: ['sensor'], device_class: 'battery' } },
    },
    { name: 'color', selector: { ui_color: {} } },
  ],
  {
    solar: '태양광 발전 (W)',
    grid: '계통 전력 (W, − = 송전)',
    grid_export: '계통 송전 센서 (W, 별도 분리형)',
    home: '집 소비 전력 (W)',
    battery: '배터리 전력 (W, + = 충전)',
    battery_soc: '배터리 잔량 (%)',
    color: '강조 색상',
  }
);

@customElement('silk-power-flow-card')
export class SilkPowerFlowCard extends LitElement {
  @property({ attribute: false }) public hass?: HomeAssistant;

  @state() private _config?: SilkPowerFlowCardConfig;
  /** Measured diagram box; nodes are laid out in exact pixels from it. */
  @state() private _plot: { w: number; h: number } | null = null;

  private _resize?: ResizeObserver;

  public static getStubConfig(hass: HomeAssistant): Partial<SilkPowerFlowCardConfig> {
    const power = Object.keys(hass.states).filter(
      (id) => id.startsWith('sensor.') && hass.states[id].attributes.device_class === 'power'
    );
    const used = new Set<string>();
    const pick = (...words: string[]): string | undefined => {
      const hit = power.find((id) => {
        if (used.has(id)) return false;
        const hay = `${id} ${hass.states[id].attributes.friendly_name ?? ''}`.toLowerCase();
        return words.some((w) => hay.includes(w));
      });
      if (hit) used.add(hit);
      return hit;
    };
    const solar = pick('solar', 'pv', 'inverter');
    const grid = pick('grid', 'meter', 'import');
    const battery = pick('battery', 'storage');
    let home = pick('home', 'house', 'load', 'consumption');
    // setConfig rejects an empty card, so the stub always leaves one node.
    if (!home && !solar && !grid && !battery) {
      home =
        power[0] ??
        Object.keys(hass.states).find(
          (id) => id.startsWith('sensor.') && Number.isFinite(Number(hass.states[id].state))
        );
    }
    return { type: 'custom:silk-power-flow-card', solar, grid, home, battery };
  }

  public static async getConfigElement(): Promise<HTMLElement> {
    return document.createElement(EDITOR_TAG);
  }

  public setConfig(config: SilkPowerFlowCardConfig): void {
    if (!config.solar && !config.grid && !config.grid_export && !config.home && !config.battery) {
      throw new Error(
        'silk-power-flow-card: at least one of `solar`, `grid`, `home` or `battery` is required'
      );
    }
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

  /**
   * Runs after every render, not just the first: if the first paint was the
   * "entity not found" warning, `.flow` only exists once entities register.
   * Re-observing an already-observed element is a no-op.
   */
  protected updated(): void {
    this._observePlot();
  }

  private _observePlot(): void {
    const el = this.renderRoot.querySelector('.flow');
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

  private _locale(): string {
    return this.hass?.locale?.language ?? this.hass?.language ?? 'en';
  }

  /** Value text + unit for a node, switching to kW above 1000 W. */
  private _power(entityId: string | undefined, watts: number): { text: string; unit: string } {
    if (!Number.isFinite(watts)) return { text: '—', unit: '' };
    if (Math.abs(watts) >= 1000) {
      const kw = watts / 1000;
      const digits = Math.abs(kw) >= 10 ? 0 : 1;
      return {
        text: new Intl.NumberFormat(this._locale(), {
          minimumFractionDigits: digits,
          maximumFractionDigits: digits,
        }).format(kw),
        unit: 'kW',
      };
    }
    // Honour the sensor's display precision when it has one; whole watts read
    // better than the generic fallback ("45.0 W") when it does not.
    if (entityId && this.hass?.entities?.[entityId]?.display_precision !== undefined) {
      return { text: formatNumber(this.hass, entityId, watts), unit: 'W' };
    }
    return {
      text: new Intl.NumberFormat(this._locale(), { maximumFractionDigits: 0 }).format(watts),
      unit: 'W',
    };
  }

  /** Hover/screen-reader text: "Grid · exporting 1.2 kW". */
  private _nodeTitle(
    id: NodeId,
    entityId: string | undefined,
    watts: number,
    flow?: string,
    suffix?: string
  ): string {
    const name = NODE_TITLES[id];
    if (!Number.isFinite(watts)) return `${name} · unavailable`;
    const { text, unit } = this._power(entityId, watts);
    return `${name} · ${flow ? `${flow} ` : ''}${text}${unit ? ` ${unit}` : ''}${suffix ?? ''}`;
  }

  /**
   * Reads every configured sensor and solves the flow between the four nodes.
   * Priority mirrors a real inverter: solar serves the house first, then the
   * battery, and only the surplus is exported. Charging that solar cannot cover
   * rides the house bus (grid → home → battery), which is how an AC-coupled
   * battery is actually wired.
   */
  private _model(): FlowModel | null {
    const config = this._config;
    const hass = this.hass;
    if (!config || !hass) return null;

    const objOf = (id?: string): HassEntity | undefined => (id ? hass.states[id] : undefined);
    const solarObj = objOf(config.solar);
    const gridObj = objOf(config.grid);
    const exportObj = objOf(config.grid_export);
    const homeObj = objOf(config.home);
    const batteryObj = objOf(config.battery);
    const socObj = objOf(config.battery_soc);

    const solarRaw = numericState(solarObj);
    const gridRaw = numericState(gridObj);
    const exportRaw = numericState(exportObj);
    const batteryRaw = numericState(batteryObj);
    const homeRaw = numericState(homeObj);
    const soc = numericState(socObj);

    const solar = Number.isFinite(solarRaw) ? Math.max(0, solarRaw) : 0;
    const gridImport = Number.isFinite(gridRaw) ? Math.max(0, gridRaw) : 0;
    let gridExport = Number.isFinite(gridRaw) && !config.grid_export ? Math.max(0, -gridRaw) : 0;
    if (Number.isFinite(exportRaw)) gridExport = Math.abs(exportRaw);
    const charge = Number.isFinite(batteryRaw) ? Math.max(0, batteryRaw) : 0;
    const discharge = Number.isFinite(batteryRaw) ? Math.max(0, -batteryRaw) : 0;

    const hasSolar = !!config.solar;
    const hasGrid = !!(config.grid || config.grid_export);
    const hasBattery = !!(config.battery || config.battery_soc);
    // The grid is the balancing term, so home is only safe to derive with it.
    const derivedHome = !config.home && hasGrid;
    const hasHome = !!config.home || derivedHome;
    const homeValue = config.home
      ? Number.isFinite(homeRaw)
        ? Math.max(0, homeRaw)
        : NaN
      : derivedHome
        ? Math.max(0, solar + gridImport - gridExport + discharge - charge)
        : NaN;
    const h = Number.isFinite(homeValue) ? homeValue : 0;

    const solarToHome = Math.min(solar, h);
    let surplus = solar - solarToHome;
    const solarToBattery = Math.min(surplus, charge);
    surplus -= solarToBattery;
    const solarToGrid = Math.min(surplus, gridExport);
    const batteryToHome = Math.min(discharge, Math.max(0, h - solarToHome));
    const gridToBattery = Math.max(0, charge - solarToBattery);
    const homeToGrid = Math.max(0, gridExport - solarToGrid);
    const gridToHome = Math.max(0, h - solarToHome - batteryToHome) + gridToBattery;

    const gridValue = Number.isFinite(gridRaw) || Number.isFinite(exportRaw)
      ? Math.max(gridImport, gridExport)
      : NaN;
    const batteryValue = Number.isFinite(batteryRaw) ? Math.max(charge, discharge) : NaN;
    const solarValue = Number.isFinite(solarRaw) ? solar : NaN;

    const nodes: FlowNode[] = [];
    if (hasSolar) {
      const p = this._power(config.solar, solarValue);
      nodes.push({
        id: 'solar',
        entity: config.solar,
        color: NODE_COLORS.solar,
        icon: NODE_ICONS.solar,
        label: p.text,
        unit: p.unit,
        title: this._nodeTitle('solar', config.solar, solarValue),
        active: solar > ACTIVE_W,
        na: !Number.isFinite(solarValue),
      });
    }
    if (hasGrid) {
      const id = config.grid ?? config.grid_export;
      const p = this._power(id, gridValue);
      const flow =
        gridExport > ACTIVE_W ? 'exporting' : gridImport > ACTIVE_W ? 'importing' : 'idle';
      nodes.push({
        id: 'grid',
        entity: id,
        color: NODE_COLORS.grid,
        icon: NODE_ICONS.grid,
        label: p.text,
        unit: p.unit,
        title: this._nodeTitle('grid', id, gridValue, flow),
        active: gridImport > ACTIVE_W || gridExport > ACTIVE_W,
        na: !Number.isFinite(gridValue),
      });
    }
    if (hasHome) {
      const p = this._power(config.home, homeValue);
      nodes.push({
        id: 'home',
        entity: config.home,
        color: NODE_COLORS.home,
        icon: NODE_ICONS.home,
        label: p.text,
        unit: p.unit,
        title: this._nodeTitle('home', config.home, homeValue, undefined, derivedHome ? ' (estimated)' : ''),
        active: h > ACTIVE_W,
        na: !Number.isFinite(homeValue),
      });
    }
    if (hasBattery) {
      const p = this._power(config.battery, batteryValue);
      const flow =
        charge > ACTIVE_W ? 'charging' : discharge > ACTIVE_W ? 'discharging' : 'idle';
      const socText = Number.isFinite(soc)
        ? `${new Intl.NumberFormat(this._locale(), { maximumFractionDigits: 0 }).format(soc)}%`
        : undefined;
      nodes.push({
        id: 'battery',
        entity: config.battery ?? config.battery_soc,
        color: NODE_COLORS.battery,
        icon: batteryIcon(soc, charge > ACTIVE_W),
        label: p.text,
        unit: p.unit,
        sub: socText,
        title: this._nodeTitle('battery', config.battery, batteryValue, flow, socText ? ` · ${socText}` : ''),
        active: charge > ACTIVE_W || discharge > ACTIVE_W,
        na: !Number.isFinite(batteryValue),
      });
    }

    const link = (from: NodeId, to: NodeId, signed: number, bow: number): FlowLink => ({
      from,
      to,
      watts: Math.abs(signed),
      reverse: signed < 0,
      bow,
    });
    const present = new Set(nodes.map((n) => n.id));
    const links = [
      link('solar', 'grid', solarToGrid, BOW),
      link('solar', 'home', solarToHome, 0),
      link('solar', 'battery', solarToBattery, BOW),
      link('grid', 'home', gridToHome - homeToGrid, BOW),
      link('home', 'battery', gridToBattery - batteryToHome, BOW),
    ].filter((l) => present.has(l.from) && present.has(l.to));

    // Spec formula; capped because exported solar cannot make a house more
    // than fully self-sufficient.
    const selfPct =
      Number.isFinite(homeValue) && homeValue > 0 && (hasSolar || hasBattery)
        ? clamp(Math.round(((solar + discharge) / homeValue) * 100), 0, 100)
        : null;

    const configured = [
      config.solar,
      config.grid,
      config.grid_export,
      config.home,
      config.battery,
      config.battery_soc,
    ].filter((id): id is string => !!id);

    return {
      nodes,
      links,
      selfPct,
      unavailable: configured.every((id) => isUnavailable(hass.states[id])),
      allMissing: configured.every((id) => !hass.states[id]),
    };
  }

  /** Half the horizontal spread between the grid and battery nodes. */
  private _half(w: number): number {
    return clamp(w / 2 - 52, 46, 116);
  }

  /** Diamond geometry, re-centred on whichever nodes actually exist. */
  private _layout(model: FlowModel, w: number, h: number): Record<NodeId, Pt> {
    const half = this._half(w);
    const yTop = NODE_R + 1;
    const yBottom = Math.max(yTop, h - LABEL_BAND - NODE_R - 1);
    const yMid = (yTop + yBottom) / 2;
    const pos: Record<NodeId, Pt> = {
      solar: { x: w / 2, y: yTop },
      grid: { x: w / 2 - half, y: yMid },
      home: { x: w / 2, y: yBottom },
      battery: { x: w / 2 + half, y: yMid },
    };
    const used = model.nodes.map((n) => pos[n.id]);
    if (!used.length) return pos;
    const minX = Math.min(...used.map((p) => p.x)) - NODE_R;
    const maxX = Math.max(...used.map((p) => p.x)) + NODE_R;
    const minY = Math.min(...used.map((p) => p.y)) - NODE_R;
    const maxY = Math.max(...used.map((p) => p.y)) + NODE_R + LABEL_BAND;
    const dx = (w - (maxX - minX)) / 2 - minX;
    const dy = (h - (maxY - minY)) / 2 - minY;
    (Object.keys(pos) as NodeId[]).forEach((id) => {
      pos[id] = { x: pos[id].x + dx, y: pos[id].y + dy };
    });
    return pos;
  }

  /**
   * Three dots riding the connector. Travel time is inversely scaled to power
   * and quantised to quarter seconds, so ordinary sensor jitter never rewrites
   * the attribute (which would restart the animation mid-flight).
   */
  private _dots(d: string, watts: number, reverse: boolean, on: boolean): SVGTemplateResult {
    const raw = clamp(MAX_DUR - watts / 1000, MIN_DUR, MAX_DUR);
    const dur = Math.round(raw * 4) / 4;
    const circles: SVGTemplateResult[] = [];
    for (let i = 0; i < DOT_COUNT; i++) {
      const offset = (i * dur) / DOT_COUNT;
      circles.push(svg`<circle class="dot" r=${DOT_R}>
        <animateMotion
          dur=${`${dur}s`}
          begin=${offset ? `-${offset.toFixed(2)}s` : '0s'}
          repeatCount="indefinite"
          calcMode="linear"
          keyPoints=${reverse ? '1;0' : '0;1'}
          keyTimes="0;1"
          path=${d}
        ></animateMotion>
      </circle>`);
    }
    return svg`<g class="dots ${on ? 'on' : ''}">${circles}</g>`;
  }

  private _onNodeClick(ev: Event, entityId?: string): void {
    // A derived home node owns no entity: let the tap fall through to the card
    // rather than swallowing it into nothing.
    if (!entityId) return;
    ev.stopPropagation();
    haptic(this, 'selection');
    moreInfo(this, entityId);
  }

  private _onCardClick(): void {
    const config = this._config;
    if (!config) return;
    const primary =
      config.home ?? config.solar ?? config.grid ?? config.battery ?? config.grid_export ?? config.battery_soc;
    if (primary) moreInfo(this, primary);
  }

  private _renderFlow(model: FlowModel): TemplateResult | typeof nothing {
    const size = this._plot;
    if (!size || size.w < 40 || size.h < 40) return nothing;
    const pos = this._layout(model, size.w, size.h);
    const centre = { x: size.w / 2, y: size.h / 2 };

    const paths: SVGTemplateResult[] = [];
    const dots: SVGTemplateResult[] = [];
    for (const l of model.links) {
      const d = connector(pos[l.from], pos[l.to], centre, l.bow);
      const on = l.watts > ACTIVE_W;
      paths.push(svg`<path class="link ${on ? 'on' : ''}" d=${d}></path>`);
      dots.push(this._dots(d, l.watts, l.reverse, on));
    }

    // Battery state of charge, as a ring hugging its disc.
    const battery = model.nodes.find((n) => n.id === 'battery');
    const socRaw = this._config?.battery_soc
      ? numericState(this.hass?.states[this._config.battery_soc])
      : NaN;
    const ring =
      battery && Number.isFinite(socRaw)
        ? svg`<g class="soc">
            <circle class="soc-track" cx=${r1(pos.battery.x)} cy=${r1(pos.battery.y)} r=${NODE_R + 3.5}></circle>
            <circle
              class="soc-val"
              cx=${r1(pos.battery.x)}
              cy=${r1(pos.battery.y)}
              r=${NODE_R + 3.5}
              pathLength="100"
              stroke-dasharray="100"
              stroke-dashoffset=${100 - clamp(socRaw, 0, 100)}
              transform=${`rotate(-90 ${r1(pos.battery.x)} ${r1(pos.battery.y)})`}
            ></circle>
          </g>`
        : nothing;

    // Never wider than the gap between the two mid nodes, so labels never touch.
    const labelW = clamp(Math.min(LABEL_W_MAX, 2 * this._half(size.w) - 8), 46, LABEL_W_MAX);

    return html`
      <svg width=${size.w} height=${size.h} aria-hidden="true">
        <g class="wires">${paths}</g>
        ${ring}${dots}
      </svg>
      ${model.nodes.map((node) => {
        const p = pos[node.id];
        return html`
          <button
            class="node ${node.active ? 'on' : ''} ${node.na ? 'na' : ''}"
            style="left:${r1(p.x)}px;top:${r1(p.y - NODE_R)}px;width:${labelW}px;--node:${node.color}"
            title=${node.title}
            aria-label=${node.title}
            @click=${(ev: Event) => this._onNodeClick(ev, node.entity)}
          >
            <span class="disc"><ha-icon .icon=${node.icon}></ha-icon></span>
            <span class="val"
              >${node.label}${node.unit ? html`<span class="u">${node.unit}</span>` : nothing}</span
            >
            ${node.sub ? html`<span class="sub">${node.sub}</span>` : nothing}
          </button>
        `;
      })}
      ${model.selfPct !== null
        ? html`<div class="badge" title="Self-sufficiency">${model.selfPct}% self</div>`
        : nothing}
    `;
  }

  protected render(): TemplateResult | typeof nothing {
    const config = this._config;
    const hass = this.hass;
    if (!config || !hass) return nothing;
    const model = this._model();
    if (!model || !model.nodes.length) return nothing;
    if (model.allMissing) {
      return html`
        <ha-card class="control">
          <div class="warning">Entity not found: ${config.home ?? config.grid ?? config.solar}</div>
        </ha-card>
      `;
    }

    return html`
      <ha-card
        class="control ${model.unavailable ? 'unavailable' : ''}"
        style="--silk-accent:${config.color ?? DEFAULT_ACCENT}"
        @click=${this._onCardClick}
      >
        <div class="flow">${this._renderFlow(model)}</div>
      </ha-card>
    `;
  }

  static styles = [
    silkControlStyles,
    css`
      :host {
        --silk-solar: #e6a23c;
        --silk-grid: var(--primary-color, #4aa8ff);
        --silk-battery: #5ec78d;
      }
      ha-card {
        flex-direction: column;
        align-items: stretch;
        padding: 10px 12px;
      }
      .flow {
        position: relative;
        flex: 1;
        min-height: 132px;
        min-width: 0;
      }
      .flow svg {
        position: absolute;
        inset: 0;
        display: block;
        pointer-events: none;
      }
      .link {
        fill: none;
        stroke: rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.12);
        stroke-width: 2;
        stroke-linecap: round;
        transition: stroke 200ms ease;
      }
      .link.on {
        stroke: color-mix(in srgb, var(--silk-accent) 55%, transparent);
      }
      .dot {
        fill: var(--silk-accent);
      }
      /* Flow appears and fades, but the dots themselves never restart. */
      .dots {
        opacity: 0;
        transition: opacity 200ms ease;
      }
      .dots.on {
        opacity: 1;
      }
      .soc-track,
      .soc-val {
        fill: none;
        stroke-width: 2.5;
      }
      .soc-track {
        stroke: rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.1);
      }
      .soc-val {
        stroke: var(--silk-battery);
        stroke-linecap: round;
        transition: stroke-dashoffset 450ms var(--silk-ease-out);
      }
      .node {
        position: absolute;
        transform: translateX(-50%);
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 3px;
        padding: 0;
        border: none;
        background: none;
        font: inherit;
        cursor: pointer;
        z-index: 1;
      }
      .disc {
        width: 46px;
        height: 46px;
        border-radius: 50%;
        display: grid;
        place-items: center;
        color: var(--secondary-text-color);
        background: rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.06);
        transition:
          transform 250ms var(--silk-spring),
          background 200ms ease,
          color 200ms ease;
      }
      .node:active .disc {
        transform: scale(0.92);
        transition-duration: 120ms;
        transition-timing-function: var(--silk-ease-out);
      }
      .node.on .disc {
        color: var(--node);
        background: color-mix(in srgb, var(--node) 18%, transparent);
      }
      .node:focus-visible {
        outline: none;
      }
      .node:focus-visible .disc {
        box-shadow: 0 0 0 2px color-mix(in srgb, var(--node) 70%, transparent);
      }
      .disc ha-icon {
        --mdc-icon-size: 22px;
        pointer-events: none;
      }
      .val {
        max-width: 100%;
        font-size: 13px;
        font-weight: 600;
        line-height: 1.15;
        letter-spacing: -0.01em;
        color: var(--primary-text-color);
        font-variant-numeric: tabular-nums;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .val .u {
        margin-left: 2px;
        font-size: 10.5px;
        font-weight: 500;
        color: var(--secondary-text-color);
      }
      .sub {
        max-width: 100%;
        font-size: 10.5px;
        line-height: 1.2;
        color: var(--secondary-text-color);
        font-variant-numeric: tabular-nums;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .node.na .val {
        color: var(--secondary-text-color);
      }
      .badge {
        position: absolute;
        top: 0;
        right: 0;
        padding: 3px 8px;
        border-radius: 999px;
        font-size: 11px;
        font-weight: 600;
        line-height: 1.2;
        color: var(--silk-accent);
        background: color-mix(in srgb, var(--silk-accent) 16%, transparent);
        font-variant-numeric: tabular-nums;
        white-space: nowrap;
        pointer-events: none;
      }
      .unavailable .flow {
        opacity: 0.45;
      }
      @media (prefers-reduced-motion: reduce) {
        .dots {
          display: none;
        }
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    'silk-power-flow-card': SilkPowerFlowCard;
  }
}
