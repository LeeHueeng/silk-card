import { LitElement, html, css, nothing, TemplateResult } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { HomeAssistant, HassEntity, LovelaceCardConfig } from '../types';
import { silkControlStyles } from '../shared/base';
import { isUnavailable, moreInfo, clamp } from '../shared/service';
import { accentFor } from '../shared/color';
import { registerRowsEditor } from '../shared/rows';

export const META = {
  type: 'silk-room-rank-card',
  name: 'Silk Rooms',
  description: 'Every room, ranked by comfort.',
};

export interface SilkRoomConfig {
  name?: string;
  /** Temperature sensor (or climate entity) for the room. */
  temperature: string;
  /** Optional humidity sensor, shown as a quiet second number. */
  humidity?: string;
}

export interface SilkRoomRankCardConfig extends LovelaceCardConfig {
  /** Rooms to rank. */
  rooms: SilkRoomConfig[];
  /** The comfortable temperature every room is measured against. Default 22. */
  target?: number;
  name?: string;
}

/**
 * `config` is absent from Silk's minimal HomeAssistant type; the unit system
 * supplies the degree label when the sensors carry no unit of their own.
 */
interface HassWithConfig extends HomeAssistant {
  config?: { unit_system?: { temperature?: string } };
}

interface RoomRow {
  name: string;
  entityId: string;
  temperature?: number;
  humidity?: number;
  /** Signed distance from target; undefined when the room has no reading. */
  deviation?: number;
}

const DEFAULT_TARGET = 22;
const DEFAULT_NAME = 'Rooms';
/** Half-width of the diverging bar always covers at least this many degrees. */
const MIN_SCALE_DEG = 2;
/** A non-zero deviation never collapses to nothing. */
const MIN_FILL_PCT = 3;

const EDITOR_TAG = 'silk-room-rank-card-editor';

// A room is two entity ids plus a label, which no single picker can express —
// so each one gets a row of its own. A fresh row starts with an empty
// temperature picker: fill it in and the ranking picks the room up.
registerRowsEditor(EDITOR_TAG, {
  field: 'rooms',
  title: '방',
  addLabel: '방 추가',
  schema: [
    {
      name: '',
      type: 'grid',
      schema: [
        { name: 'name', selector: { text: {} } },
        { name: 'target', selector: { number: { min: 5, max: 35, step: 0.5, mode: 'box' } } },
      ],
    },
  ],
  labels: { name: '이름', target: '쾌적 기준 온도' },
  defaults: { name: DEFAULT_NAME, target: DEFAULT_TARGET },
  row: [
    { name: 'name', label: '이름', selector: { text: {} } },
    {
      name: 'temperature',
      label: '온도 엔티티',
      selector: { entity: { domain: ['sensor', 'climate', 'number', 'input_number'] } },
    },
    {
      name: 'humidity',
      label: '습도 엔티티 (선택)',
      selector: { entity: { domain: ['sensor', 'number', 'input_number'] } },
    },
  ],
  blank: { temperature: '' },
});

function readNumber(stateObj?: HassEntity): number | undefined {
  if (!stateObj || isUnavailable(stateObj) || stateObj.state === '') return undefined;
  const n = Number(stateObj.state);
  return Number.isFinite(n) ? n : undefined;
}

/** One decimal at most, and never a trailing `.0`. */
function trim1(value: number): string {
  return String(Math.round(value * 10) / 10);
}

/**
 * A diverging ranking: every room against one comfort target, the worst
 * offenders on top. Warm leans right, cool leans left, and the middle is the
 * temperature you actually asked for.
 */
@customElement('silk-room-rank-card')
export class SilkRoomRankCard extends LitElement {
  @property({ attribute: false }) public hass?: HomeAssistant;

  @state() private _config?: SilkRoomRankCardConfig;

  public static getStubConfig(hass: HomeAssistant): Partial<SilkRoomRankCardConfig> {
    const temps = Object.keys(hass.states)
      .filter(
        (id) =>
          id.startsWith('sensor.') &&
          hass.states[id].attributes.device_class === 'temperature' &&
          Number.isFinite(Number(hass.states[id].state))
      )
      .slice(0, 4);
    return {
      type: 'custom:silk-room-rank-card',
      target: DEFAULT_TARGET,
      rooms: temps.map((id) => ({ temperature: id })),
    };
  }

  public static async getConfigElement(): Promise<HTMLElement> {
    return document.createElement(EDITOR_TAG);
  }

  public setConfig(config: SilkRoomRankCardConfig): void {
    if (!Array.isArray(config.rooms) || config.rooms.length === 0) {
      throw new Error(
        'silk-room-rank-card: `rooms` is required — a list of {name, temperature, humidity?}'
      );
    }
    for (const room of config.rooms) {
      if (!room || typeof room !== 'object' || typeof room.temperature !== 'string') {
        throw new Error('silk-room-rank-card: every room needs a `temperature` entity id');
      }
      if (room.humidity !== undefined && typeof room.humidity !== 'string') {
        throw new Error('silk-room-rank-card: `humidity` must be an entity id');
      }
    }
    if (config.target !== undefined && !Number.isFinite(Number(config.target))) {
      throw new Error('silk-room-rank-card: `target` must be a number');
    }
    this._config = config;
  }

  public getCardSize(): number {
    return 1 + Math.ceil((this._config?.rooms.length ?? 3) / 2);
  }

  public getGridOptions(): Record<string, number> {
    return { columns: 6, rows: 3, min_columns: 4, min_rows: 2 };
  }

  private _target(): number {
    const raw = Number(this._config?.target);
    return Number.isFinite(raw) ? raw : DEFAULT_TARGET;
  }

  private _unit(): string {
    return (this.hass as HassWithConfig | undefined)?.config?.unit_system?.temperature ?? '°';
  }

  /** A climate entity reports its room temperature as an attribute, not a state. */
  private _temperature(entityId: string): number | undefined {
    const stateObj = this.hass?.states[entityId];
    if (!stateObj || isUnavailable(stateObj)) return undefined;
    const attr = Number(stateObj.attributes.current_temperature);
    if (Number.isFinite(attr)) return attr;
    return readNumber(stateObj);
  }

  /** Rooms ordered by how far off target they are; unreadable rooms sink. */
  private _rows(): RoomRow[] {
    const hass = this.hass!;
    const target = this._target();
    const rows: RoomRow[] = (this._config?.rooms ?? []).map((room) => {
      const stateObj = hass.states[room.temperature];
      const temperature = this._temperature(room.temperature);
      return {
        name:
          room.name ??
          (stateObj?.attributes.friendly_name as string | undefined) ??
          room.temperature.split('.')[1] ??
          room.temperature,
        entityId: room.temperature,
        temperature,
        humidity: room.humidity ? readNumber(hass.states[room.humidity]) : undefined,
        deviation: temperature === undefined ? undefined : temperature - target,
      };
    });
    rows.sort((a, b) => {
      if (a.deviation === undefined && b.deviation === undefined) return 0;
      if (a.deviation === undefined) return 1;
      if (b.deviation === undefined) return -1;
      return Math.abs(b.deviation) - Math.abs(a.deviation) || a.name.localeCompare(b.name);
    });
    return rows;
  }

  private _onRowClick(ev: Event, entityId: string): void {
    ev.stopPropagation();
    moreInfo(this, entityId);
  }

  private _renderRow(row: RoomRow, scale: number): TemplateResult {
    const unit = this._unit();
    const dev = row.deviation;
    const warm = dev !== undefined && dev > 0;
    // Half the rail is one full `scale`, so the fill is a fraction of that half.
    const fill =
      dev === undefined || Math.abs(dev) < 0.05
        ? 0
        : Math.max(MIN_FILL_PCT, clamp(Math.abs(dev) / scale, 0, 1) * 50);
    const offLabel =
      dev === undefined
        ? 'no reading'
        : Math.abs(dev) < 0.05
          ? 'on target'
          : `${trim1(Math.abs(dev))}° ${warm ? 'above' : 'below'} ${trim1(this._target())}${unit}`;
    return html`
      <button
        class="row ${dev === undefined ? 'dead' : ''}"
        aria-label=${`${row.name}: ${offLabel}`}
        @click=${(ev: Event) => this._onRowClick(ev, row.entityId)}
      >
        <span class="rname" title=${row.name}>${row.name}</span>
        <span class="temp">${row.temperature === undefined ? '—' : `${trim1(row.temperature)}°`}</span>
        <span class="hum">${row.humidity === undefined ? '' : `${Math.round(row.humidity)}%`}</span>
        <span class="rail" title=${`${row.name} · ${offLabel}`}>
          <span class="zero"></span>
          ${fill > 0
            ? html`<span class="fill ${warm ? 'warm' : 'cool'}" style="width:${fill}%"></span>`
            : nothing}
        </span>
      </button>
    `;
  }

  protected render(): TemplateResult | typeof nothing {
    const config = this._config;
    const hass = this.hass;
    if (!config || !hass) return nothing;

    const rows = this._rows();
    const target = this._target();
    const unit = this._unit();
    // One shared scale for every row — otherwise the bars would not compare.
    const maxAbs = rows.reduce(
      (acc, row) => (row.deviation === undefined ? acc : Math.max(acc, Math.abs(row.deviation))),
      0
    );
    const scale = Math.max(MIN_SCALE_DEG, Math.ceil(maxAbs * 2) / 2);
    const name = config.name ?? DEFAULT_NAME;
    const allDead = rows.length > 0 && rows.every((row) => row.deviation === undefined);

    return html`
      <ha-card class="control ${allDead ? 'unavailable' : ''}" style="--silk-accent:${accentFor(undefined)}">
        <div class="header">
          <div class="hname" title=${name}>${name}</div>
          <span class="target" title=${`Every room is measured against ${trim1(target)}${unit}`}
            >target ${trim1(target)}${unit}</span
          >
        </div>
        ${rows.length
          ? html`<div class="rows">${rows.map((row) => this._renderRow(row, scale))}</div>`
          : html`<div class="empty">No rooms configured</div>`}
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
        flex: none;
        display: flex;
        align-items: baseline;
        gap: 8px;
        min-height: 20px;
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
      .target {
        flex: none;
        font-size: 11px;
        line-height: 1.3;
        color: var(--secondary-text-color);
        opacity: 0.8;
        font-variant-numeric: tabular-nums;
        white-space: nowrap;
      }
      .rows {
        flex: 1;
        min-height: 0;
        display: flex;
        flex-direction: column;
        gap: 1px;
        margin: 0 -6px;
        overflow: hidden;
        animation: silk-rooms-in 250ms var(--silk-ease-out);
      }
      .row {
        flex: none;
        display: flex;
        align-items: center;
        gap: 8px;
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
        background: rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.05);
        box-shadow: inset 0 0 0 2px color-mix(in srgb, var(--silk-accent) 70%, transparent);
      }
      .row.dead {
        opacity: 0.45;
      }
      .rname {
        flex: 1 1 34%;
        min-width: 0;
        font-size: 13px;
        line-height: 1.3;
        color: var(--primary-text-color);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .temp {
        flex: none;
        font-size: 15px;
        font-weight: 600;
        letter-spacing: -0.01em;
        color: var(--primary-text-color);
        font-variant-numeric: tabular-nums;
        white-space: nowrap;
      }
      .hum {
        flex: none;
        min-width: 30px;
        font-size: 12px;
        text-align: right;
        color: var(--secondary-text-color);
        font-variant-numeric: tabular-nums;
        white-space: nowrap;
      }
      /* Diverging rail: the midpoint is the target, not zero, so both sides
         need their own hue. Everything else on this card stays neutral. */
      .rail {
        position: relative;
        flex: 1 1 32%;
        min-width: 44px;
        height: 6px;
        border-radius: 3px;
        background: rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.07);
        overflow: hidden;
      }
      .zero {
        position: absolute;
        left: 50%;
        top: 0;
        bottom: 0;
        width: 1px;
        transform: translateX(-0.5px);
        background: rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.28);
      }
      .fill {
        position: absolute;
        top: 0;
        bottom: 0;
        border-radius: 3px;
      }
      .fill.warm {
        left: 50%;
        background: var(--state-climate-heat-color, #e8734f);
      }
      .fill.cool {
        right: 50%;
        background: var(--state-climate-cool-color, #4aa8ff);
      }
      .empty {
        flex: 1;
        display: flex;
        align-items: center;
        justify-content: center;
        min-height: 44px;
        font-size: 13px;
        color: var(--secondary-text-color);
      }
      @keyframes silk-rooms-in {
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
    'silk-room-rank-card': SilkRoomRankCard;
  }
}
