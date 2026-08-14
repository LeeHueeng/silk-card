import { LitElement, html, css, nothing, PropertyValues, TemplateResult } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { HomeAssistant, HassEntity, LovelaceCardConfig } from '../types';
import { silkControlStyles } from '../shared/base';
import { domainOf, isUnavailable, moreInfo, haptic, clamp } from '../shared/service';
import { registerEditor } from '../shared/editor';

export const META = {
  type: 'silk-floor-card',
  name: 'Silk Floor Heating',
  description: 'Every loop, one card.',
};

export interface SilkFloorZoneConfig {
  /** A climate entity — one heating loop. */
  entity: string;
  name?: string;
}

export interface SilkFloorCardConfig extends LovelaceCardConfig {
  /** 2–8 heating loops. YAML-only — it is a list of objects. */
  zones: (string | SilkFloorZoneConfig)[];
  name?: string;
  color?: string;
}

/**
 * `config` is absent from Silk's minimal HomeAssistant type; the unit system
 * supplies the degree label, since climate entities carry no unit attribute.
 */
interface HassWithConfig extends HomeAssistant {
  config?: { unit_system?: { temperature?: string } };
}

interface Zone {
  entityId: string;
  name: string;
  stateObj?: HassEntity;
  dead: boolean;
  current?: number;
  target?: number;
  /** 0–1: how hard this loop is asking for heat right now. */
  demand: number;
  heating: boolean;
}

const MIN_ZONES = 2;
const MAX_ZONES = 8;
const DEFAULT_NAME = 'Floor heating';
const SEND_DEBOUNCE_MS = 800;
const OPTIMISTIC_HOLD_MS = 2000;
/** A loop this far below target is drawing everything the manifold can give. */
const FULL_DEMAND_DEG = 3;

const EDITOR_TAG = 'silk-floor-card-editor';

// `zones` stays YAML-only (a list of objects); the header label is the only
// thing left worth a form field.
// `zones` stays YAML-only (a list of {entity, name} loops); the rest of the
// card's config is on the form.
registerEditor(
  EDITOR_TAG,
  [
    { name: 'name', selector: { text: {} } },
    { name: 'color', selector: { ui_color: {} } },
  ],
  { name: '이름', color: '강조 색상' },
  { name: DEFAULT_NAME }
);

function asNumber(value: unknown): number | undefined {
  if (value === null || value === undefined || value === '') return undefined;
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
}

/** Decimal places implied by a step (capped at 2 to defeat float noise). */
function stepDecimals(step: number): number {
  const text = String(step);
  const dot = text.indexOf('.');
  return dot < 0 ? 0 : Math.min(text.length - dot - 1, 2);
}

/** One decimal at most, and never a trailing `.0`. */
function trim1(value: number): string {
  return String(Math.round(value * 10) / 10);
}

/**
 * Floor heating never has a single answer — it has one per loop. This card
 * puts every loop on its own line, with the demand bar showing which ones are
 * actually pulling heat right now.
 */
@customElement('silk-floor-card')
export class SilkFloorCard extends LitElement {
  @property({ attribute: false }) public hass?: HomeAssistant;

  @state() private _config?: SilkFloorCardConfig;
  /** Pending target per zone, shown immediately while the send is debounced. */
  @state() private _opt: Record<string, number> = {};

  private _sendTimers: Record<string, number> = {};
  private _holdTimers: Record<string, number> = {};

  public static getStubConfig(hass: HomeAssistant): Partial<SilkFloorCardConfig> {
    const ids = Object.keys(hass.states)
      .filter((id) => id.startsWith('climate.'))
      .slice(0, MAX_ZONES);
    return { type: 'custom:silk-floor-card', zones: ids.map((entity) => ({ entity })) };
  }

  public static async getConfigElement(): Promise<HTMLElement> {
    return document.createElement(EDITOR_TAG);
  }

  public setConfig(config: SilkFloorCardConfig): void {
    if (!Array.isArray(config.zones)) {
      throw new Error('silk-floor-card: `zones` is required — a list of {entity, name?}');
    }
    if (config.zones.length < MIN_ZONES || config.zones.length > MAX_ZONES) {
      throw new Error(
        `silk-floor-card: \`zones\` must list between ${MIN_ZONES} and ${MAX_ZONES} climate entities`
      );
    }
    for (const zone of config.zones) {
      const entity = typeof zone === 'string' ? zone : zone?.entity;
      if (typeof entity !== 'string' || domainOf(entity) !== 'climate') {
        throw new Error(`silk-floor-card: \`${String(entity)}\` is not a climate entity`);
      }
    }
    this._config = config;
    this._clearAllTimers();
    this._opt = {};
  }

  public getCardSize(): number {
    return 1 + Math.ceil((this._config?.zones.length ?? 3) / 2);
  }

  public getGridOptions(): Record<string, number> {
    return { columns: 6, rows: 3, min_columns: 4, min_rows: 2 };
  }

  public disconnectedCallback(): void {
    super.disconnectedCallback();
    for (const entityId of Object.keys(this._holdTimers)) {
      window.clearTimeout(this._holdTimers[entityId]);
    }
    this._holdTimers = {};
    // Don't lose a pending target edit just because the card left the DOM.
    for (const entityId of Object.keys(this._sendTimers)) {
      window.clearTimeout(this._sendTimers[entityId]);
      delete this._sendTimers[entityId];
      this._commit(entityId);
    }
    this._opt = {};
  }

  private _clearAllTimers(): void {
    for (const map of [this._sendTimers, this._holdTimers]) {
      for (const key of Object.keys(map)) window.clearTimeout(map[key]);
    }
    this._sendTimers = {};
    this._holdTimers = {};
  }

  protected willUpdate(changed: PropertyValues): void {
    if (!changed.has('hass') || !this.hass || !this._config) return;
    const oldHass = changed.get('hass') as HomeAssistant | undefined;
    if (!oldHass) return;
    let next: Record<string, number> | undefined;
    for (const entityId of Object.keys(this._opt)) {
      // A confirmed target that actually moved retires the optimistic value —
      // but never while an edit is still queued to send.
      if (this._sendTimers[entityId] !== undefined) continue;
      const before = oldHass.states[entityId]?.attributes.temperature;
      const after = this.hass.states[entityId]?.attributes.temperature;
      if (after !== before) {
        next = next ?? { ...this._opt };
        delete next[entityId];
      }
    }
    if (next) this._opt = next;
  }

  private _unit(): string {
    return (this.hass as HassWithConfig | undefined)?.config?.unit_system?.temperature ?? '°';
  }

  private _zones(): Zone[] {
    const hass = this.hass!;
    return (this._config?.zones ?? []).map((raw): Zone => {
      const entityId = typeof raw === 'string' ? raw : raw.entity;
      const configured = typeof raw === 'string' ? undefined : raw.name;
      const stateObj = hass.states[entityId];
      const dead = isUnavailable(stateObj);
      const current = asNumber(stateObj?.attributes.current_temperature);
      const target = this._opt[entityId] ?? asNumber(stateObj?.attributes.temperature);
      const action = stateObj?.attributes.hvac_action as string | undefined;
      const gap = current !== undefined && target !== undefined ? target - current : 0;
      return {
        entityId,
        name:
          configured ??
          (stateObj?.attributes.friendly_name as string | undefined) ??
          entityId.split('.')[1] ??
          entityId,
        stateObj,
        dead,
        current,
        target,
        demand: dead ? 0 : clamp(gap / FULL_DEMAND_DEG, 0, 1),
        // hvac_action is the truth when the integration reports it; otherwise
        // "below target" is the best available proxy.
        heating: !dead && (action ? action === 'heating' : gap > 0.1),
      };
    });
  }

  private _onZoneClick(ev: Event, entityId: string): void {
    ev.stopPropagation();
    moreInfo(this, entityId);
  }

  private _onStep(ev: Event, zone: Zone, dir: 1 | -1): void {
    ev.stopPropagation();
    const hass = this.hass;
    const stateObj = zone.stateObj;
    if (!hass || !stateObj || zone.dead) return;
    const attrs = stateObj.attributes;
    const step = asNumber(attrs.target_temp_step) ?? 0.5;
    const decimals = stepDecimals(step);
    const min = asNumber(attrs.min_temp) ?? 7;
    const max = asNumber(attrs.max_temp) ?? 35;
    const base = zone.target ?? zone.current ?? (min + max) / 2;
    const next = Number(clamp(base + dir * step, min, max).toFixed(decimals));
    if (next === zone.target) return;

    this._opt = { ...this._opt, [zone.entityId]: next };
    haptic(this, 'selection');
    window.clearTimeout(this._holdTimers[zone.entityId]);
    delete this._holdTimers[zone.entityId];
    window.clearTimeout(this._sendTimers[zone.entityId]);
    this._sendTimers[zone.entityId] = window.setTimeout(() => {
      delete this._sendTimers[zone.entityId];
      this._commit(zone.entityId);
    }, SEND_DEBOUNCE_MS);
  }

  private _commit(entityId: string): void {
    const hass = this.hass;
    const target = this._opt[entityId];
    if (!hass || target === undefined || !hass.states[entityId]) return;
    hass.callService('climate', 'set_temperature', { entity_id: entityId, temperature: target });
    if (!this.isConnected) return;
    window.clearTimeout(this._holdTimers[entityId]);
    this._holdTimers[entityId] = window.setTimeout(() => {
      delete this._holdTimers[entityId];
      const next = { ...this._opt };
      delete next[entityId];
      this._opt = next;
    }, OPTIMISTIC_HOLD_MS);
  }

  private _renderZone(zone: Zone): TemplateResult {
    const stateObj = zone.stateObj;
    const decimals = stepDecimals(asNumber(stateObj?.attributes.target_temp_step) ?? 0.5);
    const unit = this._unit();
    const title = `${zone.name} · ${
      zone.current === undefined ? 'no reading' : `${trim1(zone.current)}${unit} now`
    }, ${zone.target === undefined ? 'no target' : `${zone.target.toFixed(decimals)}${unit} target`} · ${
      zone.heating ? 'calling for heat' : 'satisfied'
    }`;
    return html`
      <div class="zone ${zone.dead ? 'dead' : ''}">
        <div class="zrow">
          <button
            class="ztitle"
            aria-label=${`Show ${zone.name}`}
            @click=${(ev: Event) => this._onZoneClick(ev, zone.entityId)}
          >
            ${zone.heating
              ? html`<ha-icon class="flame" icon="mdi:fire"></ha-icon>`
              : nothing}
            <span class="zname" title=${zone.name}>${zone.name}</span>
          </button>
          <span class="cur">${zone.current === undefined ? '—' : `${trim1(zone.current)}°`}</span>
          <div class="stepper">
            <button
              class="step"
              ?disabled=${zone.dead}
              aria-label=${`Lower ${zone.name} target`}
              @click=${(ev: Event) => this._onStep(ev, zone, -1)}
            >
              <ha-icon icon="mdi:minus"></ha-icon>
            </button>
            <span class="tgt">${zone.target === undefined ? '–' : zone.target.toFixed(decimals)}</span>
            <button
              class="step"
              ?disabled=${zone.dead}
              aria-label=${`Raise ${zone.name} target`}
              @click=${(ev: Event) => this._onStep(ev, zone, 1)}
            >
              <ha-icon icon="mdi:plus"></ha-icon>
            </button>
          </div>
        </div>
        <div class="demand" title=${title}>
          <span class="dfill" style="transform:scaleX(${zone.demand.toFixed(3)})"></span>
        </div>
      </div>
    `;
  }

  protected render(): TemplateResult | typeof nothing {
    const config = this._config;
    const hass = this.hass;
    if (!config || !hass) return nothing;

    const zones = this._zones();
    const calling = zones.filter((zone) => zone.heating).length;
    const allDead = zones.length > 0 && zones.every((zone) => zone.dead);
    const name = config.name ?? DEFAULT_NAME;
    // Floor heating is one thing doing one job, so the card takes the heat
    // accent outright rather than borrowing a mode colour from zone one.
    const accent = config.color ?? 'var(--state-climate-heat-color, #e8734f)';

    return html`
      <ha-card class="control ${allDead ? 'unavailable' : ''}" style="--silk-accent:${accent}">
        <div class="header">
          <div class="hname" title=${name}>${name}</div>
          <span class="calling ${calling > 0 ? 'on' : ''}">
            ${calling > 0 ? `${calling} calling for heat` : 'All satisfied'}
          </span>
        </div>
        <div class="zones">${zones.map((zone) => this._renderZone(zone))}</div>
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
        padding: 10px 14px;
        cursor: default;
      }
      .header {
        flex: none;
        display: flex;
        align-items: baseline;
        gap: 8px;
        min-height: 18px;
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
      .calling {
        flex: none;
        font-size: 11px;
        line-height: 1.3;
        color: var(--secondary-text-color);
        font-variant-numeric: tabular-nums;
        white-space: nowrap;
        transition: color 200ms ease;
      }
      .calling.on {
        color: var(--silk-accent);
        font-weight: 600;
      }
      .zones {
        flex: 1;
        min-height: 0;
        display: flex;
        flex-direction: column;
        gap: 4px;
        overflow: hidden;
      }
      .zone {
        flex: none;
        display: flex;
        flex-direction: column;
        gap: 3px;
        animation: silk-floor-in 250ms var(--silk-ease-out);
      }
      .zone.dead {
        opacity: 0.45;
      }
      .zrow {
        display: flex;
        align-items: center;
        gap: 8px;
        min-width: 0;
      }
      .ztitle {
        flex: 1;
        min-width: 0;
        display: flex;
        align-items: center;
        gap: 5px;
        margin: 0 -4px;
        padding: 2px 4px;
        border: none;
        border-radius: 8px;
        background: none;
        font: inherit;
        color: inherit;
        text-align: left;
        cursor: pointer;
        outline: none;
        transition: background 150ms ease-out;
      }
      .ztitle:hover {
        background: rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.05);
      }
      .ztitle:focus-visible {
        box-shadow: inset 0 0 0 2px color-mix(in srgb, var(--silk-accent) 70%, transparent);
      }
      .flame {
        flex: none;
        --mdc-icon-size: 15px;
        color: var(--silk-accent);
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
      .cur {
        flex: none;
        font-size: 13px;
        color: var(--secondary-text-color);
        font-variant-numeric: tabular-nums;
        white-space: nowrap;
      }
      .stepper {
        flex: none;
        display: flex;
        align-items: center;
        gap: 2px;
      }
      .step {
        flex: none;
        position: relative;
        width: 28px;
        height: 28px;
        border: none;
        border-radius: 50%;
        display: grid;
        place-items: center;
        padding: 0;
        cursor: pointer;
        color: var(--primary-text-color);
        background: rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.06);
        transition:
          transform 250ms var(--silk-spring),
          background 200ms ease;
      }
      /* Invisible halo lifts the touch target past 40px without growing the pill. */
      .step::after {
        content: '';
        position: absolute;
        inset: -6px;
        border-radius: 50%;
      }
      .step:hover:not(:disabled) {
        background: rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.12);
      }
      .step:active:not(:disabled) {
        transform: scale(0.9);
        transition-duration: 120ms;
        transition-timing-function: var(--silk-ease-out);
      }
      .step:disabled {
        cursor: default;
      }
      .step:focus-visible {
        outline: 2px solid color-mix(in srgb, var(--silk-accent) 70%, transparent);
        outline-offset: 1px;
      }
      .step ha-icon {
        --mdc-icon-size: 15px;
        pointer-events: none;
      }
      .tgt {
        min-width: 36px;
        text-align: center;
        font-size: 13px;
        font-weight: 600;
        letter-spacing: -0.01em;
        color: var(--primary-text-color);
        font-variant-numeric: tabular-nums;
      }
      /* Demand: one accent hue, length carries the magnitude. */
      .demand {
        position: relative;
        height: 4px;
        border-radius: 2px;
        background: rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.07);
        overflow: hidden;
      }
      .dfill {
        position: absolute;
        inset: 0;
        border-radius: 2px;
        background: var(--silk-accent);
        transform-origin: left center;
        transition: transform 350ms var(--silk-ease-out);
        will-change: transform;
      }
      @keyframes silk-floor-in {
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
    'silk-floor-card': SilkFloorCard;
  }
}
