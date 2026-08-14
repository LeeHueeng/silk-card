import { LitElement, html, css, nothing, PropertyValues, TemplateResult } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { HomeAssistant, HassEntity, LovelaceCardConfig } from '../types';
import { silkControlStyles } from '../shared/base';
import {
  domainOf,
  isActive,
  isUnavailable,
  toggleEntity,
  moreInfo,
  haptic,
  clamp,
} from '../shared/service';
import { accentFor } from '../shared/color';
import { registerEditor } from '../shared/editor';

export const META = {
  type: 'silk-irrigation-card',
  name: 'Silk Irrigation',
  description: 'Every zone, one row, one tap.',
};

/** One watering zone: a switch/valve/script plus its scheduled run length. */
export interface IrrigationZone {
  entity: string;
  name?: string;
  /** Run length in minutes; drives the per-row progress bar. */
  duration?: number;
}

export interface SilkIrrigationCardConfig extends LovelaceCardConfig {
  /** The zones. YAML-only: a list of {entity, name?, duration?}. */
  zones: IrrigationZone[];
  /** Header label, defaults to "Irrigation". */
  name?: string;
  /** Header icon, defaults to mdi:water. */
  icon?: string;
  /** Accent override; otherwise derived from the first zone. */
  color?: string;
}

const DEFAULT_ICON = 'mdi:water';
const DEFAULT_NAME = 'Irrigation';
const OPTIMISTIC_TIMEOUT_MS = 2000;
const TICK_MS = 1000;

const EDITOR_TAG = 'silk-irrigation-card-editor';

// Zones stay YAML-only — per-zone entity + duration pairs would dwarf the card.
registerEditor(
  EDITOR_TAG,
  [
    { name: 'name', selector: { text: {} } },
    {
      name: '',
      type: 'grid',
      schema: [
        { name: 'icon', selector: { icon: {} } },
        { name: 'color', selector: { ui_color: {} } },
      ],
    },
  ],
  { name: '이름', icon: '아이콘', color: '강조 색상' },
  { icon: DEFAULT_ICON, name: DEFAULT_NAME }
);

/** Countdown display: m:ss under an hour, h:mm:ss beyond. Ceils so 0:00 means done. */
function formatSeconds(total: number): string {
  const s = Math.max(0, Math.ceil(total));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const two = (n: number) => String(n).padStart(2, '0');
  return h > 0 ? `${h}:${two(m)}:${two(s % 60)}` : `${m}:${two(s % 60)}`;
}

/** The domain-correct "stop watering" call for a zone entity. */
function offCall(domain: string): { domain: string; service: string } {
  if (domain === 'valve') return { domain: 'valve', service: 'close_valve' };
  if (domain === 'cover') return { domain: 'cover', service: 'close_cover' };
  return { domain, service: 'turn_off' };
}

/** Optimistic override: the flipped state plus when we flipped it. */
interface ZoneOverride {
  on: boolean;
  /** Epoch ms of the flip — the progress bar's origin until HA confirms. */
  at: number;
}

/** Everything a zone row needs, resolved once per render. */
interface ZoneRow {
  zone: IrrigationZone;
  stateObj?: HassEntity;
  name: string;
  unavailable: boolean;
  running: boolean;
  /** 0–1 of the configured duration; null when the row shows no progress. */
  progress: number | null;
  remainingS: number | null;
  /** valve.* position, when the valve reports one. */
  position: number | null;
}

/**
 * The sprinkler controller: one row per zone, each with a compact switch and,
 * when a duration is configured, a hairline progress bar that drains over the
 * run. Nothing here is a chart — the bar is the zone's own clock, so it carries
 * the single card accent and one selective label ("4:12 left").
 */
@customElement('silk-irrigation-card')
export class SilkIrrigationCard extends LitElement {
  @property({ attribute: false }) public hass?: HomeAssistant;

  @state() private _config?: SilkIrrigationCardConfig;

  /** Render clock — bumped by the 1s tick so countdowns stay honest. */
  @state() private _now = Date.now();

  /** Per-zone optimistic targets (absent key = trust the real state). */
  @state() private _optimistic: Record<string, ZoneOverride> = {};

  /** last_updated snapshots at toggle time; a newer stamp clears the override. */
  private _optimisticBase: Record<string, string> = {};
  private _optimisticTimers: Record<string, number> = {};
  private _tick?: number;

  public static getStubConfig(hass: HomeAssistant): Partial<SilkIrrigationCardConfig> {
    const looksLikeIrrigation = (id: string): boolean =>
      /sprinkler|irrigation|valve|water/i.test(
        `${id} ${String(hass.states[id].attributes.friendly_name ?? '')}`
      );
    const ids = Object.keys(hass.states);
    const zones = (
      ids.filter((id) => id.startsWith('valve.')).length
        ? ids.filter((id) => id.startsWith('valve.'))
        : ids.filter((id) => id.startsWith('switch.') && looksLikeIrrigation(id))
    )
      .slice(0, 4)
      .map((entity): IrrigationZone => ({ entity, duration: 10 }));
    return { type: 'custom:silk-irrigation-card', zones };
  }

  public static async getConfigElement(): Promise<HTMLElement> {
    return document.createElement(EDITOR_TAG);
  }

  public setConfig(config: SilkIrrigationCardConfig): void {
    if (!Array.isArray(config.zones) || config.zones.length === 0) {
      throw new Error(
        'silk-irrigation-card: `zones` is required — a list of {entity, name?, duration?}'
      );
    }
    for (const zone of config.zones) {
      if (typeof zone?.entity !== 'string' || !zone.entity.includes('.')) {
        throw new Error('silk-irrigation-card: every zone needs an `entity`');
      }
      if (zone.duration !== undefined && !(Number(zone.duration) > 0)) {
        throw new Error(
          `silk-irrigation-card: \`duration\` for ${zone.entity} must be a positive number of minutes`
        );
      }
    }
    this._config = config;
    this._clearAllOptimistic();
  }

  public getCardSize(): number {
    return Math.max(3, 1 + Math.ceil((this._config?.zones.length ?? 3) * 0.8));
  }

  public getGridOptions(): Record<string, number> {
    return { columns: 6, rows: 3, min_columns: 3, min_rows: 2 };
  }

  public connectedCallback(): void {
    super.connectedCallback();
    // Nudge an update so `updated()` restarts the tick after a re-attach.
    this._now = Date.now();
  }

  public disconnectedCallback(): void {
    super.disconnectedCallback();
    window.clearInterval(this._tick);
    this._tick = undefined;
    for (const id of Object.keys(this._optimisticTimers)) {
      window.clearTimeout(this._optimisticTimers[id]);
    }
    this._optimisticTimers = {};
  }

  protected willUpdate(changed: PropertyValues): void {
    if (!changed.has('hass') || !this.hass) return;
    // Fresh clock for renders triggered by state pushes (Lit batches state set
    // in willUpdate into the same update, so this costs no extra cycle).
    this._now = Date.now();
    for (const id of Object.keys(this._optimistic)) {
      const stateObj = this.hass.states[id];
      if (stateObj && stateObj.last_updated !== this._optimisticBase[id]) {
        this._clearOptimistic(id);
      }
    }
  }

  protected updated(): void {
    // The tick only exists while a bar is actually moving — a zone left running
    // past its scheduled duration parks at 0:00 and costs nothing.
    const live =
      this.isConnected &&
      this._config !== undefined &&
      this._rows().some((row) => row.remainingS !== null && row.remainingS > 0);
    if (live && this._tick === undefined) {
      this._tick = window.setInterval(() => {
        this._now = Date.now();
      }, TICK_MS);
    } else if (!live && this._tick !== undefined) {
      window.clearInterval(this._tick);
      this._tick = undefined;
    }
  }

  private _clearOptimistic(entityId: string): void {
    window.clearTimeout(this._optimisticTimers[entityId]);
    delete this._optimisticTimers[entityId];
    delete this._optimisticBase[entityId];
    if (entityId in this._optimistic) {
      const next = { ...this._optimistic };
      delete next[entityId];
      this._optimistic = next;
    }
  }

  private _clearAllOptimistic(): void {
    for (const id of Object.keys(this._optimisticTimers)) {
      window.clearTimeout(this._optimisticTimers[id]);
    }
    this._optimisticTimers = {};
    this._optimisticBase = {};
    this._optimistic = {};
  }

  private _setOptimistic(stateObj: HassEntity, on: boolean): void {
    const id = stateObj.entity_id;
    this._optimistic = { ...this._optimistic, [id]: { on, at: Date.now() } };
    this._optimisticBase[id] = stateObj.last_updated;
    window.clearTimeout(this._optimisticTimers[id]);
    this._optimisticTimers[id] = window.setTimeout(
      () => this._clearOptimistic(id),
      OPTIMISTIC_TIMEOUT_MS
    );
  }

  /** Resolved rows in configured order — the list is a plan, never re-sorted. */
  private _rows(): ZoneRow[] {
    const hass = this.hass;
    const zones = this._config?.zones ?? [];
    return zones.map((zone): ZoneRow => {
      const stateObj = hass?.states[zone.entity];
      const override: ZoneOverride | undefined = this._optimistic[zone.entity];
      const running = override ? override.on : isActive(stateObj);
      const durationS = Number(zone.duration ?? 0) * 60;
      // While optimistic, the flip time is the only honest origin: last_changed
      // still points at the *previous* transition until HA echoes back.
      const startMs = override?.on ? override.at : Date.parse(stateObj?.last_changed ?? '');
      let progress: number | null = null;
      let remainingS: number | null = null;
      if (running && durationS > 0 && Number.isFinite(startMs)) {
        const elapsed = clamp((this._now - startMs) / 1000, 0, durationS);
        progress = elapsed / durationS;
        remainingS = durationS - elapsed;
      }
      const rawPosition = stateObj?.attributes.current_position;
      const position =
        domainOf(zone.entity) === 'valve' && typeof rawPosition === 'number' && Number.isFinite(rawPosition)
          ? clamp(Math.round(rawPosition), 0, 100)
          : null;
      return {
        zone,
        stateObj,
        name: zone.name ?? stateObj?.attributes.friendly_name ?? zone.entity,
        unavailable: isUnavailable(stateObj),
        running,
        progress,
        remainingS,
        position,
      };
    });
  }

  private _onZoneClick(ev: Event, entityId: string): void {
    ev.stopPropagation();
    moreInfo(this, entityId);
  }

  private _onToggle(ev: Event, entityId: string): void {
    ev.stopPropagation();
    const hass = this.hass;
    if (!hass) return;
    const stateObj = hass.states[entityId];
    if (!stateObj || isUnavailable(stateObj)) return;
    haptic(this);
    // Mirror what toggleEntity decides from the *real* state so rapid taps stay
    // honest about the service calls actually sent.
    this._setOptimistic(stateObj, !isActive(stateObj));
    toggleEntity(hass, entityId);
  }

  /** Stop every configured zone — one service call per domain, not per zone. */
  private _onAllOff(ev: Event): void {
    ev.stopPropagation();
    const hass = this.hass;
    const config = this._config;
    if (!hass || !config) return;
    haptic(this, 'medium');
    const byDomain = new Map<string, { domain: string; service: string; ids: string[] }>();
    for (const zone of config.zones) {
      const stateObj = hass.states[zone.entity];
      if (!stateObj || isUnavailable(stateObj)) continue;
      this._setOptimistic(stateObj, false);
      const call = offCall(domainOf(zone.entity));
      const key = `${call.domain}.${call.service}`;
      const bucket = byDomain.get(key);
      if (bucket) bucket.ids.push(zone.entity);
      else byDomain.set(key, { ...call, ids: [zone.entity] });
    }
    for (const call of byDomain.values()) {
      hass.callService(call.domain, call.service, { entity_id: call.ids });
    }
  }

  private _renderZone(row: ZoneRow): TemplateResult {
    const entityId = row.zone.entity;
    const pct = row.progress === null ? 0 : row.progress * 100;
    const label = row.running ? `Turn off ${row.name}` : `Turn on ${row.name}`;
    return html`
      <div class="zone">
        <div class="line ${row.unavailable ? 'unavailable' : ''}">
          <button class="row" title=${row.name} @click=${(ev: Event) => this._onZoneClick(ev, entityId)}>
            <span class="zname">${row.name}</span>
            ${row.position !== null
              ? html`<span class="sep">·</span><span class="pos">${row.position}%</span>`
              : nothing}
          </button>
          ${row.remainingS !== null
            ? html`<span class="left">${formatSeconds(row.remainingS)} left</span>`
            : nothing}
          <button
            class="sw ${row.running ? 'on' : ''}"
            role="switch"
            aria-checked=${row.running ? 'true' : 'false'}
            aria-label=${label}
            .disabled=${row.unavailable}
            @click=${(ev: Event) => this._onToggle(ev, entityId)}
          >
            <span class="thumb"></span>
          </button>
        </div>
        <div class="track ${row.progress === null ? 'hidden' : ''}" aria-hidden="true">
          <div
            class="bar ${row.progress === null ? 'snap' : ''}"
            style="width:${pct.toFixed(2)}%"
          ></div>
        </div>
      </div>
    `;
  }

  protected render(): TemplateResult | typeof nothing {
    const config = this._config;
    const hass = this.hass;
    if (!config || !hass) return nothing;

    const rows = this._rows();
    const running = rows.filter((row) => row.running).length;
    const accent = accentFor(rows.find((row) => row.stateObj)?.stateObj, config.color);
    const name = config.name ?? DEFAULT_NAME;

    return html`
      <ha-card class="control" style="--silk-accent:${accent}">
        <div class="header">
          <ha-icon class="hicon" .icon=${config.icon ?? DEFAULT_ICON}></ha-icon>
          <div class="hname">${name}</div>
          ${running > 0
            ? html`<button class="alloff" @click=${this._onAllOff}>All off</button>`
            : nothing}
          <span class="count ${running > 0 ? 'on' : ''}"
            >${running > 0 ? `${running} running` : 'Idle'}</span
          >
        </div>
        <div class="zones">${rows.map((row) => this._renderZone(row))}</div>
      </ha-card>
    `;
  }

  static styles = [
    silkControlStyles,
    css`
      ha-card {
        flex-direction: column;
        align-items: stretch;
        justify-content: flex-start;
        gap: 6px;
        padding: 12px 14px;
        cursor: default;
      }
      .header {
        display: flex;
        align-items: center;
        gap: 8px;
        min-height: 22px;
      }
      .hicon {
        flex: none;
        --mdc-icon-size: 16px;
        color: var(--secondary-text-color);
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
      .alloff {
        position: relative;
        flex: none;
        margin: 0;
        padding: 4px 6px;
        border: none;
        border-radius: 8px;
        background: none;
        font: inherit;
        font-size: 11px;
        font-weight: 600;
        line-height: 1;
        color: var(--secondary-text-color);
        cursor: pointer;
        outline: none;
        transition:
          background 150ms ease-out,
          color 150ms ease-out;
      }
      /* Invisible halo lifts the hit area past 36px without growing the label. */
      .alloff::after {
        content: '';
        position: absolute;
        inset: -9px -6px;
      }
      .alloff:hover {
        color: var(--primary-text-color);
        background: rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.08);
      }
      .alloff:focus-visible {
        outline: 2px solid color-mix(in srgb, var(--silk-accent) 70%, transparent);
        outline-offset: 1px;
      }
      .count {
        flex: none;
        font-size: 11px;
        font-weight: 600;
        line-height: 1;
        padding: 4px 8px;
        border-radius: 999px;
        white-space: nowrap;
        color: var(--secondary-text-color);
        background: rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.06);
        font-variant-numeric: tabular-nums;
        transition:
          background 200ms ease,
          color 200ms ease;
      }
      .count.on {
        color: var(--silk-accent);
        background: color-mix(in srgb, var(--silk-accent) 16%, transparent);
      }
      .zones {
        display: flex;
        flex-direction: column;
        gap: 4px;
        margin: 0 -6px;
      }
      .zone {
        display: flex;
        flex-direction: column;
        gap: 3px;
      }
      .line {
        display: flex;
        align-items: center;
        gap: 8px;
        min-width: 0;
        padding: 0 6px;
        border-radius: 10px;
        transition: background 150ms ease-out;
      }
      .line:hover {
        background: rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.05);
      }
      .line.unavailable {
        opacity: 0.45;
      }
      .row {
        flex: 1;
        min-width: 0;
        display: flex;
        align-items: center;
        min-height: 34px;
        margin: 0;
        padding: 0;
        border: none;
        background: none;
        font: inherit;
        color: inherit;
        text-align: left;
        cursor: pointer;
        outline: none;
      }
      .row:focus-visible {
        box-shadow: inset 0 0 0 2px color-mix(in srgb, var(--silk-accent) 70%, transparent);
        border-radius: 8px;
      }
      .zname {
        min-width: 0;
        font-size: 13px;
        font-weight: 500;
        line-height: 1.3;
        color: var(--primary-text-color);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .sep {
        flex: none;
        opacity: 0.5;
        margin: 0 3px;
        font-size: 12px;
        color: var(--secondary-text-color);
      }
      .pos {
        flex: none;
        font-size: 12px;
        color: var(--secondary-text-color);
        font-variant-numeric: tabular-nums;
        white-space: nowrap;
      }
      .left {
        flex: none;
        font-size: 11px;
        line-height: 1;
        color: var(--secondary-text-color);
        font-variant-numeric: tabular-nums;
        white-space: nowrap;
      }
      /* Compact 40x22 switch — the row's only control. */
      .sw {
        flex: none;
        position: relative;
        width: 40px;
        height: 22px;
        border: none;
        border-radius: 999px;
        padding: 2px;
        margin: 0;
        display: block;
        cursor: pointer;
        background: rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.15);
        transition: background 200ms ease;
      }
      /* Invisible halo lifts the touch target to 40px without growing the track. */
      .sw::after {
        content: '';
        position: absolute;
        inset: -9px;
        border-radius: 999px;
      }
      .sw.on {
        background: var(--silk-accent);
      }
      .sw:disabled {
        cursor: default;
      }
      .sw:focus-visible {
        outline: 2px solid color-mix(in srgb, var(--silk-accent) 70%, transparent);
        outline-offset: 2px;
      }
      .thumb {
        display: block;
        width: 18px;
        height: 18px;
        border-radius: 50%;
        background: var(--card-background-color, #fff);
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
        transform: translateX(0);
        transition: transform 200ms var(--silk-ease-out);
        will-change: transform;
      }
      .sw.on .thumb {
        transform: translateX(18px);
      }
      /* 3px run bar under the row it belongs to. */
      .track {
        height: 3px;
        margin: 0 6px;
        border-radius: 2px;
        overflow: hidden;
        background: rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.07);
        opacity: 1;
        transition: opacity 200ms ease;
      }
      .track.hidden {
        opacity: 0;
      }
      .bar {
        height: 100%;
        border-radius: 2px;
        background: var(--silk-accent);
        /* 1s linear matches the tick cadence, so the fill glides continuously. */
        transition: width 1000ms linear;
      }
      .bar.snap {
        transition: none;
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    'silk-irrigation-card': SilkIrrigationCard;
  }
}
