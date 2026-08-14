import { LitElement, html, css, nothing, TemplateResult } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { HomeAssistant, HassEntity, LovelaceCardConfig } from '../types';
import { silkControlStyles } from '../shared/base';
import { isUnavailable, moreInfo, clamp } from '../shared/service';
import { accentFor } from '../shared/color';
import { registerListEditor } from '../shared/listeditor';
import { EntityItem, entityListSelector } from '../shared/list';

export const META = {
  type: 'silk-device-card',
  name: 'Silk Device',
  description: 'Battery, signal, and last-seen for your fleet.',
};

/** One tracked device: a display name plus its health sensors. */
export interface DeviceEntry {
  name: string;
  battery?: string;
  signal?: string;
  last_seen?: string;
}

/**
 * A device, in any of the three shapes config accepts:
 *
 *   'sensor.door_battery'                      ← what the picker writes
 *   { entity: 'sensor.door_battery', name: … }  ← a picked sensor, renamed
 *   { name: '현관 센서', battery: …, signal: …, last_seen: … } ← the full row
 *
 * The first two are a battery sensor and nothing else: the row shows that
 * sensor's name and level, and the signal / last-seen columns stay away.
 */
export type DeviceConfigEntry = string | EntityItem | DeviceEntry;

export interface SilkDeviceCardConfig extends LovelaceCardConfig {
  /** Header label, defaults to "Devices". */
  name?: string;
  /** The fleet — battery sensor ids, or full {name, battery?, signal?, last_seen?} rows. */
  devices: DeviceConfigEntry[];
}

const LOW_THRESHOLD = 20;
const WARN_THRESHOLD = 50;
/** Re-render cadence so relative "last seen" stamps never go stale. */
const CLOCK_TICK_MS = 30_000;

/** Friendly name with the redundant "Battery"/"Battery level" suffix trimmed. */
function batteryName(stateObj: HassEntity | undefined, entityId: string): string {
  const raw = (stateObj?.attributes.friendly_name as string | undefined) ?? entityId;
  return raw.replace(/\s+battery(\s+level)?\s*$/i, '') || raw;
}

const EDITOR_TAG = 'silk-device-card-editor';

const EDITOR_LABELS: Record<string, string> = {
  devices: '배터리 센서',
  name: '이름',
};

/**
 * One editor, battery picker always present. The picker answers with bare ids
 * and they are folded back into the stored list, so a device that survives the
 * edit keeps the `name` its YAML gave it and `type` / `grid_options` ride
 * through untouched.
 *
 * Caveat, and it is a real one: the full `{name, battery, signal, last_seen}`
 * row has no `entity` key, so the picker cannot show it and the merge cannot
 * keep it — a fleet written that way reaches the form as an empty list, and
 * saving from the visual editor drops it. Those fleets must be edited in YAML
 * until `mergeEntityList` learns to carry entries that name no single entity.
 */
const EDITOR_SCHEMA: object[] = [
  { name: 'name', selector: { text: {} } },
  entityListSelector('devices', ['sensor'], ['battery']),
];

registerListEditor(EDITOR_TAG, {
  schema: EDITOR_SCHEMA,
  labels: EDITOR_LABELS,
  listFields: ['devices'],
});

/** '<60s → just now, <1h → Nm ago, <24h → Hh ago, else Dd ago'; bad input → null. */
function relativeTime(ms: number): string | null {
  if (!Number.isFinite(ms)) return null;
  const sec = Math.max(0, (Date.now() - ms) / 1000);
  if (sec < 60) return 'just now';
  if (sec < 3600) return `${Math.floor(sec / 60)}m ago`;
  if (sec < 86400) return `${Math.floor(sec / 3600)}h ago`;
  return `${Math.floor(sec / 86400)}d ago`;
}

/** Battery status tier — genuinely semantic, so it may use status colors. */
type Tier = 'crit' | 'warn' | 'good';

function levelTier(level: number): Tier {
  if (level < LOW_THRESHOLD) return 'crit';
  if (level < WARN_THRESHOLD) return 'warn';
  return 'good';
}

const TIER_ICONS: Record<Tier, string> = {
  crit: 'mdi:battery-alert-variant-outline',
  warn: 'mdi:battery-50',
  good: 'mdi:battery',
};

/** Everything a row needs, resolved once per render. */
interface DeviceRow {
  entry: DeviceEntry;
  /** Battery percent 0–100; undefined when missing or not numeric. */
  level?: number;
  signal: string | null;
  seen: string | null;
  /** more-info target: battery ?? first configured entity. */
  target?: string;
  /** True when the device has no live entity left to report. */
  dead: boolean;
}

/**
 * A fleet-health list built for Zigbee networks: one row per device with
 * battery, link quality, and a relative last-seen stamp. Dying batteries
 * float to the top so the next coin cell to swap is always the first row.
 */
@customElement('silk-device-card')
export class SilkDeviceCard extends LitElement {
  @property({ attribute: false }) public hass?: HomeAssistant;

  @state() private _config?: SilkDeviceCardConfig;

  private _clockTimer?: number;

  public static getStubConfig(hass: HomeAssistant): Partial<SilkDeviceCardConfig> {
    // Seed the preview from discovered battery sensors, in the simple shape
    // the picker also writes; signal and last-seen are a YAML refinement.
    const devices = Object.keys(hass.states)
      .filter(
        (id) =>
          id.startsWith('sensor.') && hass.states[id].attributes.device_class === 'battery'
      )
      .slice(0, 3);
    return { type: 'custom:silk-device-card', devices };
  }

  public static async getConfigElement(): Promise<HTMLElement> {
    return document.createElement(EDITOR_TAG);
  }

  public setConfig(config: SilkDeviceCardConfig): void {
    if (!Array.isArray(config.devices) || config.devices.length === 0) {
      throw new Error(
        'silk-device-card: `devices` is required — battery sensor ids, or a list of {name, battery?, signal?, last_seen?}'
      );
    }
    for (const entry of config.devices) {
      if (typeof entry === 'string') {
        if (!entry.includes('.')) {
          throw new Error(`silk-device-card: '${entry}' is not an entity id`);
        }
        continue;
      }
      const item = entry as Partial<EntityItem> & Partial<DeviceEntry>;
      if (typeof item?.entity === 'string' && item.entity) continue;
      if (typeof item?.name !== 'string' || !item.name) {
        throw new Error(
          'silk-device-card: every device needs an entity id, an `entity`, or a `name`'
        );
      }
    }
    this._config = config;
  }

  public getCardSize(): number {
    return Math.max(2, 1 + Math.ceil((this._config?.devices.length ?? 3) / 2));
  }

  public getGridOptions(): Record<string, number> {
    return { columns: 6, rows: 3, min_columns: 4, min_rows: 2 };
  }

  public connectedCallback(): void {
    super.connectedCallback();
    this._clockTimer = window.setInterval(() => this.requestUpdate(), CLOCK_TICK_MS);
  }

  public disconnectedCallback(): void {
    super.disconnectedCallback();
    window.clearInterval(this._clockTimer);
  }

  private _level(stateObj?: HassEntity): number | undefined {
    if (!stateObj || isUnavailable(stateObj) || stateObj.state === '') return undefined;
    const numeric = Number(stateObj.state);
    return Number.isFinite(numeric) ? clamp(numeric, 0, 100) : undefined;
  }

  /** 'LQI 132' for link-quality sensors, '-72 dBm' for RSSI ones. */
  private _signalText(stateObj?: HassEntity): string | null {
    if (!stateObj || isUnavailable(stateObj) || stateObj.state === '') return null;
    const value = Number(stateObj.state);
    if (!Number.isFinite(value)) return null;
    const unit = String(stateObj.attributes.unit_of_measurement ?? '');
    // RSSI is dBm (and always negative); link quality is a positive index.
    if (/dbm/i.test(unit) || value < 0) return `${Math.round(value)} dBm`;
    return `LQI ${Math.round(value)}`;
  }

  private _seenText(stateObj?: HassEntity): string | null {
    if (!stateObj || isUnavailable(stateObj) || stateObj.state === '') return null;
    let ms = Date.parse(stateObj.state);
    if (!Number.isFinite(ms)) {
      // Some integrations report epoch numbers instead of ISO timestamps.
      const numeric = Number(stateObj.state);
      if (!Number.isFinite(numeric)) return null;
      ms = numeric > 1e12 ? numeric : numeric * 1000;
    }
    return relativeTime(ms);
  }

  /**
   * Every config shape as a full entry. A bare id (or a picked {entity}) is a
   * battery sensor and nothing else, so it borrows that sensor's name.
   */
  private _entries(): DeviceEntry[] {
    const states = this.hass?.states;
    return (this._config?.devices ?? []).map((device): DeviceEntry => {
      if (typeof device === 'string') {
        return { name: batteryName(states?.[device], device), battery: device };
      }
      const item = device as EntityItem;
      if (typeof item.entity === 'string') {
        return {
          name: item.name ?? batteryName(states?.[item.entity], item.entity),
          battery: item.entity,
        };
      }
      return device as DeviceEntry;
    });
  }

  /** Resolved rows, sorted lowest battery first; batteryless devices sink. */
  private _rows(): DeviceRow[] {
    const hass = this.hass!;
    const rows = this._entries().map((entry): DeviceRow => {
      const ids = [entry.battery, entry.signal, entry.last_seen].filter(
        (id): id is string => typeof id === 'string' && id !== ''
      );
      return {
        entry,
        level: this._level(entry.battery ? hass.states[entry.battery] : undefined),
        signal: this._signalText(entry.signal ? hass.states[entry.signal] : undefined),
        seen: this._seenText(entry.last_seen ? hass.states[entry.last_seen] : undefined),
        target: entry.battery ?? ids[0],
        dead: ids.length === 0 || ids.every((id) => isUnavailable(hass.states[id])),
      };
    });
    rows.sort((a, b) => {
      if (a.level === undefined && b.level === undefined) {
        return a.entry.name.localeCompare(b.entry.name);
      }
      if (a.level === undefined) return 1;
      if (b.level === undefined) return -1;
      return a.level - b.level || a.entry.name.localeCompare(b.entry.name);
    });
    return rows;
  }

  private _onRowClick(ev: Event, target?: string): void {
    ev.stopPropagation();
    if (target) moreInfo(this, target);
  }

  private _renderRow(row: DeviceRow, columns: { battery: boolean; signal: boolean; seen: boolean }): TemplateResult {
    const tier = row.level === undefined ? undefined : levelTier(row.level);
    const batteryLabel = row.level === undefined ? '' : `, battery ${Math.round(row.level)}%`;
    return html`
      <button
        class="row ${row.dead ? 'unavailable' : ''}"
        aria-label=${`${row.entry.name}${batteryLabel}`}
        @click=${(ev: Event) => this._onRowClick(ev, row.target)}
      >
        <span class="dname">${row.entry.name}</span>
        ${columns.battery
          ? html`<span class="batt">
              ${tier === undefined
                ? html`<span class="dash">—</span>`
                : html`
                    <ha-icon class="bicon ${tier}" .icon=${TIER_ICONS[tier]}></ha-icon>
                    <span class="pct">${Math.round(row.level!)}%</span>
                  `}
            </span>`
          : nothing}
        ${columns.signal
          ? html`<span class="meta sig">${row.signal ?? '—'}</span>`
          : nothing}
        ${columns.seen ? html`<span class="meta seen">${row.seen ?? '—'}</span>` : nothing}
      </button>
    `;
  }

  protected render(): TemplateResult | typeof nothing {
    const config = this._config;
    const hass = this.hass;
    if (!config || !hass) return nothing;

    const rows = this._rows();
    // A column renders only when at least one device declares that sensor,
    // and then for every row, so the readouts line up as a quiet table.
    const columns = {
      battery: rows.some((row) => row.entry.battery),
      signal: rows.some((row) => row.entry.signal),
      seen: rows.some((row) => row.entry.last_seen),
    };
    const lowCount = rows.filter(
      (row) => row.level !== undefined && row.level < LOW_THRESHOLD
    ).length;
    const name = config.name ?? 'Devices';

    return html`
      <ha-card class="control" style="--silk-accent:${accentFor(undefined)}">
        <div class="header">
          <ha-icon class="hicon" icon="mdi:devices"></ha-icon>
          <div class="hname">${name}</div>
          ${lowCount > 0
            ? html`<span class="badge">${lowCount} low</span>`
            : nothing}
        </div>
        <div class="rows">${rows.map((row) => this._renderRow(row, columns))}</div>
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
      .badge {
        flex: none;
        font-size: 11px;
        font-weight: 600;
        line-height: 1;
        padding: 4px 8px;
        border-radius: 999px;
        color: var(--error-color, #db4437);
        background: color-mix(in srgb, var(--error-color, #db4437) 14%, transparent);
        font-variant-numeric: tabular-nums;
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
        gap: 10px;
        width: 100%;
        min-height: 30px;
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
      .row:hover {
        background: rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.05);
      }
      .row:focus-visible {
        box-shadow: inset 0 0 0 2px color-mix(in srgb, var(--silk-accent) 70%, transparent);
      }
      .row.unavailable {
        opacity: 0.45;
      }
      .dname {
        flex: 1;
        min-width: 0;
        font-size: 13px;
        font-weight: 500;
        line-height: 1.3;
        color: var(--primary-text-color);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .batt {
        flex: none;
        min-width: 52px;
        display: inline-flex;
        align-items: center;
        justify-content: flex-end;
        gap: 3px;
      }
      .bicon {
        flex: none;
        --mdc-icon-size: 14px;
        color: var(--secondary-text-color);
      }
      .bicon.crit {
        color: var(--error-color, #db4437);
      }
      .bicon.warn {
        color: var(--warning-color, #ffa600);
      }
      .pct {
        font-size: 12px;
        font-weight: 600;
        color: var(--primary-text-color);
        font-variant-numeric: tabular-nums;
        white-space: nowrap;
      }
      .meta {
        flex: none;
        font-size: 11px;
        line-height: 1.3;
        color: var(--secondary-text-color);
        font-variant-numeric: tabular-nums;
        text-align: right;
        white-space: nowrap;
      }
      .sig {
        min-width: 54px;
      }
      .seen {
        min-width: 52px;
      }
      .dash {
        font-size: 11px;
        color: var(--secondary-text-color);
        opacity: 0.6;
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    'silk-device-card': SilkDeviceCard;
  }
}
