import { LitElement, html, css, nothing, TemplateResult } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { HomeAssistant, HassEntity, LovelaceCardConfig } from '../types';
import { silkControlStyles } from '../shared/base';
import { domainOf, isUnavailable, moreInfo, haptic } from '../shared/service';
import { accentFor } from '../shared/color';
import { registerRowsEditor } from '../shared/rows';

export const META = {
  type: 'silk-standby-card',
  name: 'Silk Standby',
  description: 'The devices quietly costing you money.',
};

/** One watched device — a row in the visual editor. */
export interface SilkStandbyDevice {
  /** Power sensor (W, kW or mW — the unit is read from the entity). */
  entity: string;
  name?: string;
  /** Switchable entity for this device; adds a "turn off" button to the row. */
  switch?: string;
}

export interface SilkStandbyCardConfig extends LovelaceCardConfig {
  /** Devices to watch; omit to auto-discover power sensors (max 12). */
  devices?: SilkStandbyDevice[];
  /** Standby band, in watts. Below `min` the device is off, above `max` it works. */
  min?: number;
  max?: number;
  /** Energy price per kWh, in `currency`. */
  rate?: number;
  currency?: string;
  name?: string;
  /** Accent override. */
  color?: string;
}

const DEFAULT_MIN = 0.5;
const DEFAULT_MAX = 10;
const DEFAULT_CURRENCY = '$';
const MAX_AUTO = 12;
/** 365 × 24 ÷ 12 — the average month, so a monthly cost is not calendar-jumpy. */
const HOURS_PER_MONTH = 730;
/** How long a row's button stays disabled after a turn-off, awaiting the drop. */
const PENDING_MS = 2000;

const EDITOR_TAG = 'silk-standby-card-editor';

// Devices are rows, not YAML: each carries a power sensor plus an optional
// name and its own switch, which no flat form can hold.
registerRowsEditor(EDITOR_TAG, {
  field: 'devices',
  title: '기기 (비우면 자동 탐색)',
  addLabel: '기기 추가',
  blank: { entity: '' },
  row: [
    { name: 'entity', label: '전력 센서', selector: { entity: { domain: ['sensor'] } } },
    { name: 'name', label: '이름', selector: { text: {} } },
    {
      name: 'switch',
      label: '끄기 스위치',
      selector: {
        entity: { domain: ['switch', 'light', 'input_boolean', 'fan', 'media_player'] },
      },
    },
  ],
  schema: [
    { name: 'name', selector: { text: {} } },
    {
      name: '',
      type: 'grid',
      schema: [
        { name: 'min', selector: { number: { min: 0, step: 0.1, mode: 'box' } } },
        { name: 'max', selector: { number: { min: 0, step: 0.5, mode: 'box' } } },
      ],
    },
    {
      name: '',
      type: 'grid',
      schema: [
        { name: 'rate', selector: { number: { min: 0, step: 0.01, mode: 'box' } } },
        { name: 'currency', selector: { text: {} } },
      ],
    },
    { name: 'color', selector: { ui_color: {} } },
  ],
  labels: {
    name: '이름',
    min: '대기 시작(W)',
    max: '대기 상한(W)',
    rate: 'kWh당 요금',
    currency: '통화',
    color: '강조 색상',
  },
  defaults: { min: DEFAULT_MIN, max: DEFAULT_MAX, currency: DEFAULT_CURRENCY },
});

/** Factor that turns the entity's own unit into watts. */
function wattScale(stateObj: HassEntity): number {
  const unit = String(stateObj.attributes.unit_of_measurement ?? 'W').trim();
  if (unit === 'kW') return 1000;
  if (unit === 'MW') return 1_000_000;
  if (unit === 'mW') return 0.001;
  return 1;
}

/** Current draw in watts, NaN when the entity cannot speak. */
function watts(stateObj?: HassEntity): number {
  if (!stateObj || isUnavailable(stateObj) || stateObj.state === '') return NaN;
  const value = Number(stateObj.state);
  return Number.isFinite(value) ? value * wattScale(stateObj) : NaN;
}

interface StandbyRow {
  stateObj: HassEntity;
  name: string;
  w: number;
  switchId?: string;
}

@customElement('silk-standby-card')
export class SilkStandbyCard extends LitElement {
  @property({ attribute: false }) public hass?: HomeAssistant;

  @state() private _config?: SilkStandbyCardConfig;
  /** Entities whose turn-off was just sent; their buttons rest for a moment. */
  @state() private _pending: string[] = [];

  private _pendingTimers = new Map<string, number>();

  public static getStubConfig(): Partial<SilkStandbyCardConfig> {
    // No entities required — the card auto-discovers idling power sensors.
    return { type: 'custom:silk-standby-card', rate: 0.3, currency: DEFAULT_CURRENCY };
  }

  public static async getConfigElement(): Promise<HTMLElement> {
    return document.createElement(EDITOR_TAG);
  }

  public setConfig(config: SilkStandbyCardConfig): void {
    if (config.devices !== undefined) {
      if (!Array.isArray(config.devices)) {
        throw new Error(
          'silk-standby-card: `devices` must be a list of {entity, name?, switch?} items'
        );
      }
      config.devices.forEach((device, i) => {
        if (!device || typeof device.entity !== 'string' || device.entity === '') {
          throw new Error(`silk-standby-card: devices[${i}] needs an \`entity\` (a power sensor)`);
        }
        if (device.switch !== undefined && typeof device.switch !== 'string') {
          throw new Error(`silk-standby-card: devices[${i}].switch must be an entity id`);
        }
      });
    }
    for (const key of ['min', 'max', 'rate'] as const) {
      const value = config[key];
      if (value !== undefined && !(Number.isFinite(Number(value)) && Number(value) >= 0)) {
        throw new Error(`silk-standby-card: \`${key}\` must be a number of at least 0`);
      }
    }
    if (this._band(config).min >= this._band(config).max) {
      throw new Error('silk-standby-card: `min` must be lower than `max`');
    }
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
    for (const timer of this._pendingTimers.values()) window.clearTimeout(timer);
    this._pendingTimers.clear();
    this._pending = [];
  }

  private _band(config: SilkStandbyCardConfig): { min: number; max: number } {
    return {
      min: config.min !== undefined ? Number(config.min) : DEFAULT_MIN,
      max: config.max !== undefined ? Number(config.max) : DEFAULT_MAX,
    };
  }

  private _locale(): string {
    return this.hass?.locale?.language ?? this.hass?.language ?? 'en';
  }

  private _watts(w: number): string {
    return new Intl.NumberFormat(this._locale(), {
      maximumFractionDigits: w >= 10 ? 0 : 1,
      minimumFractionDigits: w >= 10 ? 0 : 1,
    }).format(w);
  }

  /** Monthly cost of a constant draw, formatted with the configured currency. */
  private _cost(w: number): string | null {
    const rate = Number(this._config?.rate);
    if (!Number.isFinite(rate) || rate <= 0) return null;
    const value = (w / 1000) * HOURS_PER_MONTH * rate;
    const num = new Intl.NumberFormat(this._locale(), {
      maximumFractionDigits: value >= 100 ? 0 : value >= 10 ? 1 : 2,
      minimumFractionDigits: value >= 100 ? 0 : value >= 10 ? 1 : 2,
    }).format(value);
    const currency = this._config?.currency ?? DEFAULT_CURRENCY;
    if (!currency) return num;
    // Word-ish currencies (EUR, kr) read better after the number; symbols lead.
    return /\p{L}/u.test(currency) ? `${num} ${currency}` : `${currency}${num}`;
  }

  /** Candidate devices: the configured list, or every power sensor. */
  private _candidates(): { stateObj: HassEntity; name?: string; switchId?: string }[] {
    const hass = this.hass!;
    const config = this._config!;
    if (config.devices?.length) {
      const out: { stateObj: HassEntity; name?: string; switchId?: string }[] = [];
      for (const device of config.devices) {
        const stateObj = hass.states[device.entity];
        if (stateObj) out.push({ stateObj, name: device.name, switchId: device.switch });
      }
      return out;
    }
    return Object.keys(hass.states)
      .filter((id) => {
        if (!id.startsWith('sensor.')) return false;
        const stateObj = hass.states[id];
        return (
          stateObj.attributes.device_class === 'power' && Number.isFinite(Number(stateObj.state))
        );
      })
      .map((id) => ({ stateObj: hass.states[id] }));
  }

  /** Devices currently idling inside the standby band, worst first. */
  private _rows(): { rows: StandbyRow[]; watched: number } {
    const config = this._config!;
    const { min, max } = this._band(config);
    const candidates = this._candidates();
    const rows: StandbyRow[] = [];
    for (const candidate of candidates) {
      const w = watts(candidate.stateObj);
      if (!Number.isFinite(w) || w < min || w > max) continue;
      rows.push({
        stateObj: candidate.stateObj,
        name:
          candidate.name ??
          (candidate.stateObj.attributes.friendly_name as string | undefined) ??
          candidate.stateObj.entity_id,
        w,
        switchId: candidate.switchId,
      });
    }
    rows.sort((a, b) => b.w - a.w || a.name.localeCompare(b.name));
    return {
      rows: config.devices?.length ? rows : rows.slice(0, MAX_AUTO),
      watched: candidates.length,
    };
  }

  private _onRowClick(ev: Event, entityId: string): void {
    ev.stopPropagation();
    moreInfo(this, entityId);
  }

  private _onTurnOff(ev: Event, row: StandbyRow): void {
    ev.stopPropagation();
    const hass = this.hass;
    const target = row.switchId;
    if (!hass || !target) return;
    const targetObj = hass.states[target];
    if (!targetObj || isUnavailable(targetObj)) return;
    haptic(this);
    hass.callService(domainOf(target), 'turn_off', { entity_id: target });
    // The sensor takes a moment to fall; rest the button so it is not re-tapped.
    this._pending = [...this._pending, target];
    window.clearTimeout(this._pendingTimers.get(target));
    this._pendingTimers.set(
      target,
      window.setTimeout(() => {
        this._pendingTimers.delete(target);
        this._pending = this._pending.filter((id) => id !== target);
      }, PENDING_MS)
    );
  }

  private _renderRow(row: StandbyRow, maxW: number): TemplateResult {
    const hass = this.hass!;
    const cost = this._cost(row.w);
    const switchObj = row.switchId ? hass.states[row.switchId] : undefined;
    const resting = row.switchId ? this._pending.includes(row.switchId) : false;
    const share = maxW > 0 ? Math.max(6, (row.w / maxW) * 100) : 0;
    const title = `${row.name} · ${this._watts(row.w)} W${cost ? ` · ${cost} per month` : ''}`;
    return html`
      <div class="row">
        <button class="main" title=${title} @click=${(ev: Event) => this._onRowClick(ev, row.stateObj.entity_id)}>
          <span class="rname">${row.name}</span>
          <span class="track" aria-hidden="true">
            <span class="fill" style="width:${share.toFixed(1)}%"></span>
          </span>
          <span class="rw">${this._watts(row.w)}<span class="wu">W</span></span>
          ${cost ? html`<span class="rcost">${cost}</span>` : nothing}
        </button>
        ${switchObj
          ? html`
              <button
                class="off"
                aria-label=${`Turn off ${row.name}`}
                title=${`Turn off ${row.name}`}
                .disabled=${resting || isUnavailable(switchObj)}
                @click=${(ev: Event) => this._onTurnOff(ev, row)}
              >
                <ha-icon icon="mdi:power"></ha-icon>
              </button>
            `
          : nothing}
      </div>
    `;
  }

  protected render(): TemplateResult | typeof nothing {
    const config = this._config;
    const hass = this.hass;
    if (!config || !hass) return nothing;

    const { rows, watched } = this._rows();
    const totalW = rows.reduce((sum, row) => sum + row.w, 0);
    const maxW = rows.length ? rows[0].w : 0;
    const totalCost = this._cost(totalW);
    const accent = accentFor(rows[0]?.stateObj, config.color);
    const name = config.name ?? 'Standby';
    const { min, max } = this._band(config);

    return html`
      <ha-card class="control" style="--silk-accent:${accent}">
        <div class="head">
          <div class="htext">
            <div class="hname" title=${name}>${name}</div>
            <div class="hsub">
              ${rows.length
                ? html`${config.devices?.length ? `${rows.length} of ${watched}` : `${rows.length}`}
                  idling<span class="sep">·</span>${this._watts(totalW)} W`
                : html`${this._watts(min)}–${this._watts(max)} W counts as standby`}
            </div>
          </div>
          <div class="total">
            <span class="value">${totalCost ?? this._watts(totalW)}</span>
            <span class="unit">${totalCost ? '/mo' : 'W'}</span>
          </div>
        </div>
        ${rows.length
          ? html`<div class="rows">${rows.map((row) => this._renderRow(row, maxW))}</div>`
          : html`<div class="empty">
              ${watched ? 'Nothing idling right now' : 'No power sensors found'}
            </div>`}
      </ha-card>
    `;
  }

  static styles = [
    silkControlStyles,
    css`
      /* A list card: it grows with its rows and presses nowhere as a whole. */
      ha-card {
        flex-direction: column;
        align-items: stretch;
        justify-content: flex-start;
        gap: 6px;
        padding: 12px 14px;
        height: auto;
        min-height: 100%;
        cursor: default;
      }
      .head {
        flex: none;
        display: flex;
        align-items: center;
        gap: 10px;
        min-width: 0;
      }
      .htext {
        flex: 1;
        min-width: 0;
      }
      .hname {
        font-size: 13px;
        font-weight: 600;
        line-height: 1.3;
        color: var(--secondary-text-color);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .hsub {
        font-size: 11.5px;
        line-height: 1.3;
        color: var(--secondary-text-color);
        opacity: 0.8;
        font-variant-numeric: tabular-nums;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .hsub .sep {
        opacity: 0.5;
        margin: 0 3px;
      }
      .total {
        flex: none;
        display: flex;
        align-items: baseline;
        gap: 3px;
      }
      .rows {
        display: flex;
        flex-direction: column;
        gap: 2px;
        margin: 0 -6px;
      }
      .row {
        display: flex;
        align-items: center;
        gap: 6px;
        min-width: 0;
      }
      .main {
        flex: 1;
        display: flex;
        align-items: center;
        gap: 10px;
        min-width: 0;
        min-height: 32px;
        margin: 0;
        padding: 3px 6px;
        border: none;
        border-radius: 10px;
        background: none;
        font: inherit;
        color: inherit;
        text-align: left;
        cursor: pointer;
        outline: none;
        transition: background 150ms ease-out;
      }
      .main:hover {
        background: rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.05);
      }
      .main:focus-visible {
        box-shadow: inset 0 0 0 2px color-mix(in srgb, var(--silk-accent) 70%, transparent);
      }
      .rname {
        flex: 1 1 40%;
        min-width: 0;
        font-size: 13px;
        font-weight: 500;
        line-height: 1.3;
        color: var(--primary-text-color);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      /* Magnitude in the card's one accent hue — only the length varies. */
      .track {
        flex: 0 1 26%;
        min-width: 22px;
        height: 4px;
        border-radius: 2px;
        background: rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.08);
        overflow: hidden;
      }
      .fill {
        display: block;
        height: 100%;
        border-radius: 2px;
        background: var(--silk-accent);
        opacity: 0.75;
        transition: width 400ms var(--silk-ease-out);
      }
      .rw {
        flex: none;
        min-width: 44px;
        text-align: right;
        font-size: 13px;
        font-weight: 600;
        color: var(--primary-text-color);
        font-variant-numeric: tabular-nums;
        white-space: nowrap;
      }
      .wu {
        margin-left: 2px;
        font-size: 10px;
        font-weight: 500;
        color: var(--secondary-text-color);
      }
      .rcost {
        flex: none;
        min-width: 44px;
        text-align: right;
        font-size: 11.5px;
        color: var(--secondary-text-color);
        font-variant-numeric: tabular-nums;
        white-space: nowrap;
      }
      .off {
        flex: none;
        width: 36px;
        height: 36px;
        border: none;
        border-radius: 12px;
        padding: 0;
        display: grid;
        place-items: center;
        cursor: pointer;
        color: var(--secondary-text-color);
        background: rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.06);
        transition:
          transform 250ms var(--silk-spring),
          background 200ms ease,
          color 200ms ease,
          opacity 200ms ease;
      }
      .off:hover {
        background: rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.12);
      }
      .off:active {
        transform: scale(0.9);
        transition-duration: 120ms;
        transition-timing-function: var(--silk-ease-out);
      }
      .off:focus-visible {
        outline: 2px solid color-mix(in srgb, var(--silk-accent) 70%, transparent);
        outline-offset: 2px;
      }
      .off:disabled {
        cursor: default;
        opacity: 0.4;
      }
      .off ha-icon {
        --mdc-icon-size: 18px;
        pointer-events: none;
      }
      .empty {
        flex: 1;
        display: flex;
        align-items: center;
        justify-content: center;
        min-height: 44px;
        padding: 6px 0;
        font-size: 13px;
        color: var(--secondary-text-color);
        text-align: center;
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    'silk-standby-card': SilkStandbyCard;
  }
}
