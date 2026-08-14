import { LitElement, html, css, nothing, TemplateResult } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { HomeAssistant, HassEntity, LovelaceCardConfig } from '../types';
import { silkControlStyles } from '../shared/base';
import { isUnavailable, moreInfo, haptic } from '../shared/service';
import { accentFor } from '../shared/color';
import { EntityItem, entityListSelector, normalizeEntityList } from '../shared/list';
import { registerListEditor } from '../shared/listeditor';
import { formatNumber } from '../format';

export const META = {
  type: 'silk-breakdown-card',
  name: 'Silk Breakdown',
  description: "Today's kilowatt-hours, ranked.",
};

/** One tracked device: an energy-today sensor plus optional presentation. */
export interface BreakdownDevice extends EntityItem {
  entity: string;
  name?: string;
  icon?: string;
}

export interface SilkBreakdownCardConfig extends LovelaceCardConfig {
  /** The devices to rank: bare ids from the picker, or {entity, name?, icon?}. */
  devices: (string | BreakdownDevice)[];
  /** Whole-house energy-today sensor; its remainder becomes the "Other" bar. */
  unaccounted?: string;
  /** Header label, defaults to "Energy today". */
  name?: string;
  /** Accent override. */
  color?: string;
}

const DEFAULT_NAME = 'Energy today';
const DEFAULT_UNIT = 'kWh';
/** Rank fade: first bar full accent, last bar this opacity. */
const MIN_RANK_OPACITY = 0.45;
/** Remainders below this are rounding noise, not an "Other" bar. */
const REMAINDER_EPSILON = 0.005;

const EDITOR_TAG = 'silk-breakdown-card-editor';

const EDITOR_LABELS: Record<string, string> = {
  devices: '기기 센서',
  unaccounted: '집 전체 센서',
  name: '이름',
  color: '강조 색상',
};

/**
 * One editor, picker always present. The picker answers with bare ids, which
 * are folded back into the stored list: a device that survives the edit keeps
 * the name and icon its YAML gave it, and keys the schema never mentions
 * (`type`, `grid_options`, `color`) ride through untouched.
 */
const EDITOR_SCHEMA: object[] = [
  entityListSelector('devices', ['sensor']),
  { name: 'unaccounted', selector: { entity: { domain: ['sensor'] } } },
  { name: 'name', selector: { text: {} } },
  { name: 'color', selector: { ui_color: {} } },
];

registerListEditor(EDITOR_TAG, {
  schema: EDITOR_SCHEMA,
  labels: EDITOR_LABELS,
  listFields: ['devices'],
});

/** A resolved bar: `value` is null when the sensor can't be read. */
interface BreakdownRow {
  entity: string;
  name: string;
  icon?: string;
  value: number | null;
  /** True for the muted remainder bar, which carries no accent. */
  other: boolean;
}

/** Numeric state, or null when missing/unavailable/non-numeric. */
function numericState(stateObj?: HassEntity): number | null {
  if (!stateObj || isUnavailable(stateObj) || stateObj.state === '') return null;
  const v = Number(stateObj.state);
  return Number.isFinite(v) ? v : null;
}

/**
 * Where today's kilowatt-hours actually went: one bar per device, longest
 * first, all normalized to the biggest consumer. Magnitude is length plus a
 * single accent hue fading by rank — never a color per device.
 */
@customElement('silk-breakdown-card')
export class SilkBreakdownCard extends LitElement {
  @property({ attribute: false }) public hass?: HomeAssistant;

  @state() private _config?: SilkBreakdownCardConfig;

  /** Both config shapes, normalized to objects. */
  private _devices: EntityItem[] = [];

  /** False for the first paint so the bars grow in from zero on mount. */
  @state() private _drawn = false;

  public static getStubConfig(hass: HomeAssistant): Partial<SilkBreakdownCardConfig> {
    const ids = Object.keys(hass.states).filter(
      (id) =>
        id.startsWith('sensor.') &&
        hass.states[id].attributes.device_class === 'energy' &&
        Number.isFinite(Number(hass.states[id].state))
    );
    // Bare ids: the shape the picker writes, so the editor opens on a list it
    // can edit rather than one it has to protect.
    return { type: 'custom:silk-breakdown-card', devices: ids.slice(0, 4) };
  }

  public static async getConfigElement(): Promise<HTMLElement> {
    return document.createElement(EDITOR_TAG);
  }

  public setConfig(config: SilkBreakdownCardConfig): void {
    if (!Array.isArray(config.devices) || config.devices.length === 0) {
      throw new Error(
        'silk-breakdown-card: `devices` must be a non-empty list of entity ids or {entity, name?, icon?}'
      );
    }
    // Either shape is legal — 'sensor.a' from the picker, {entity, …} from
    // YAML — but an entry without a usable entity id is still an error.
    for (const device of config.devices) {
      const entity = typeof device === 'string' ? device : device?.entity;
      if (typeof entity !== 'string' || !entity.includes('.')) {
        throw new Error('silk-breakdown-card: every device needs an `entity`');
      }
    }
    if (config.unaccounted !== undefined && typeof config.unaccounted !== 'string') {
      throw new Error('silk-breakdown-card: `unaccounted` must be a single entity id');
    }
    this._devices = normalizeEntityList(config.devices);
    this._config = config;
  }

  public getCardSize(): number {
    const devices = this._devices.length || 1;
    return 2 + Math.ceil(Math.min(devices + 1, 12) / 2);
  }

  public getGridOptions(): Record<string, number> {
    return { columns: 6, rows: 3, min_columns: 4, min_rows: 2 };
  }

  protected firstUpdated(): void {
    // Commit one frame at zero width so the 400ms bar transition sweeps in.
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        this._drawn = true;
      });
    });
  }

  /** Device rows sorted by value (unreadable ones sink), plus "Other". */
  private _rows(hass: HomeAssistant): BreakdownRow[] {
    const config = this._config!;
    const rows: BreakdownRow[] = this._devices.map((device) => {
      const stateObj = hass.states[device.entity];
      return {
        entity: device.entity,
        name:
          device.name ??
          (stateObj?.attributes.friendly_name as string | undefined) ??
          device.entity,
        icon: device.icon,
        value: numericState(stateObj),
        other: false,
      };
    });
    rows.sort((a, b) => {
      if (a.value === null && b.value === null) return a.name.localeCompare(b.name);
      if (a.value === null) return 1;
      if (b.value === null) return -1;
      return b.value - a.value || a.name.localeCompare(b.name);
    });

    const houseTotal = config.unaccounted
      ? numericState(hass.states[config.unaccounted])
      : null;
    if (config.unaccounted && houseTotal !== null) {
      const measured = rows.reduce((sum, row) => sum + (row.value ?? 0), 0);
      const remainder = houseTotal - measured;
      // A negative remainder means the devices out-measure the house meter —
      // an honest card says nothing rather than inventing a bar.
      if (remainder > REMAINDER_EPSILON) {
        rows.push({
          entity: config.unaccounted,
          name: 'Other',
          value: remainder,
          other: true,
        });
      }
    }
    return rows;
  }

  private _unit(hass: HomeAssistant): string {
    const config = this._config!;
    for (const id of [...this._devices.map((d) => d.entity), config.unaccounted]) {
      const unit = id ? hass.states[id]?.attributes.unit_of_measurement : undefined;
      if (typeof unit === 'string' && unit) return unit;
    }
    return DEFAULT_UNIT;
  }

  private _onCardClick(): void {
    const config = this._config;
    if (!config) return;
    const target = config.unaccounted ?? this._devices[0]?.entity;
    if (target) moreInfo(this, target);
  }

  private _onRowClick(ev: Event, entityId: string): void {
    ev.stopPropagation();
    haptic(this);
    moreInfo(this, entityId);
  }

  private _renderRow(
    row: BreakdownRow,
    rank: number,
    ranked: number,
    max: number,
    total: number,
    unit: string,
    /** True when any device has an icon: the slot is kept on every row so the
        name column stays on one vertical line. */
    iconColumn: boolean
  ): TemplateResult {
    const value = row.value;
    const width = value !== null && max > 0 ? Math.max((value / max) * 100, value > 0 ? 1.5 : 0) : 0;
    // One hue, opacity by rank: position in the ranking is the only encoding.
    const opacity = row.other
      ? 1
      : 1 - (1 - MIN_RANK_OPACITY) * (ranked > 1 ? rank / (ranked - 1) : 0);
    const valueText = value !== null ? formatNumber(this.hass, row.entity, value) : '—';
    const share =
      value !== null && total > 0 ? ` · ${Math.round((value / total) * 100)}%` : '';
    const title = `${row.name} · ${valueText} ${unit}${share}`;

    return html`
      <button
        class="row ${value === null ? 'unreadable' : ''}"
        title=${title}
        aria-label=${title}
        @click=${(ev: Event) => this._onRowClick(ev, row.entity)}
      >
        ${iconColumn
          ? html`<span class="rowicon"
              >${row.icon ? html`<ha-icon .icon=${row.icon}></ha-icon>` : nothing}</span
            >`
          : nothing}
        <span class="rname">${row.name}</span>
        <span class="track">
          <span
            class="fill ${row.other ? 'other' : ''}"
            style="width:${this._drawn ? width : 0}%;opacity:${opacity}"
          ></span>
        </span>
        <span class="val">${valueText}</span>
      </button>
    `;
  }

  protected render(): TemplateResult | typeof nothing {
    const config = this._config;
    const hass = this.hass;
    if (!config || !hass) return nothing;

    const first = this._devices[0]?.entity ?? '';
    const known = this._devices.filter((d) => hass.states[d.entity]);
    if (!known.length && !(config.unaccounted && hass.states[config.unaccounted])) {
      return html`<ha-card>
        <div class="warning">Entity not found: ${first || '—'}</div>
      </ha-card>`;
    }

    const rows = this._rows(hass);
    const unit = this._unit(hass);
    const values = rows.map((row) => row.value).filter((v): v is number => v !== null);
    const max = values.length ? Math.max(...values) : 0;
    const total = values.reduce((sum, v) => sum + v, 0);
    const unavailable = values.length === 0;
    const deviceCount = this._devices.length;
    const accent = accentFor(hass.states[first], config.color);
    const ranked = rows.filter((row) => !row.other).length;
    const iconColumn = rows.some((row) => !!row.icon);

    return html`
      <ha-card
        class="control ${unavailable ? 'unavailable' : ''}"
        style="--silk-accent:${accent}"
        @click=${this._onCardClick}
      >
        <div class="header">
          <div class="info">
            <div class="name">${config.name ?? DEFAULT_NAME}</div>
            <div class="state">${deviceCount} ${deviceCount === 1 ? 'device' : 'devices'}</div>
          </div>
          <div class="trailing">
            <span class="value"
              >${values.length
                ? formatNumber(hass, config.unaccounted ?? first, total)
                : '—'}</span
            >
            <span class="unit">${unit}</span>
          </div>
        </div>
        <div class="rows">
          ${rows.map((row, i) =>
            this._renderRow(row, row.other ? ranked : i, ranked, max, total, unit, iconColumn)
          )}
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
        justify-content: flex-start;
        gap: 8px;
        padding: 12px 14px;
      }
      .header {
        flex: none;
        display: flex;
        align-items: center;
        gap: 12px;
        min-width: 0;
      }
      .trailing {
        align-items: baseline;
        gap: 3px;
      }
      /* 2px of card surface between adjacent fills, never a hairline border. */
      .rows {
        flex: 1;
        min-height: 0;
        display: flex;
        flex-direction: column;
        justify-content: flex-start;
        gap: 2px;
        margin: 0 -6px;
      }
      /* Rows share the height the card actually has: comfortable for four
         devices, tighter for eight, never clipped at the bottom. */
      .row {
        display: flex;
        align-items: center;
        gap: 8px;
        width: 100%;
        flex: 1 1 0;
        min-height: 18px;
        max-height: 30px;
        margin: 0;
        padding: 2px 6px;
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
      .row:hover {
        background: rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.05);
      }
      .row:focus-visible {
        box-shadow: inset 0 0 0 2px color-mix(in srgb, var(--silk-accent) 70%, transparent);
      }
      .row.unreadable {
        opacity: 0.45;
      }
      .rowicon {
        flex: none;
        display: grid;
        place-items: center;
        width: 16px;
        height: 16px;
        --mdc-icon-size: 16px;
        color: var(--secondary-text-color);
      }
      .rname {
        flex: 1 1 38%;
        min-width: 0;
        font-size: 13px;
        font-weight: 500;
        line-height: 1.3;
        color: var(--primary-text-color);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .track {
        flex: 1 1 34%;
        min-width: 40px;
        height: 8px;
        border-radius: 4px;
        background: rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.06);
        overflow: hidden;
      }
      .fill {
        display: block;
        height: 100%;
        width: 0;
        border-radius: 4px;
        background: var(--silk-accent);
        transition: width 400ms var(--silk-ease-out);
      }
      /* The remainder is not a device: it stays out of the accent entirely. */
      .fill.other {
        background: rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.18);
      }
      .val {
        flex: none;
        min-width: 44px;
        font-size: 12.5px;
        font-weight: 600;
        text-align: right;
        color: var(--primary-text-color);
        font-variant-numeric: tabular-nums;
      }
      .unavailable .rows {
        opacity: 0.45;
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    'silk-breakdown-card': SilkBreakdownCard;
  }
}
