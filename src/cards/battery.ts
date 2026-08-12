import { LitElement, html, css, nothing, TemplateResult } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { HomeAssistant, HassEntity, LovelaceCardConfig } from '../types';
import { silkControlStyles } from '../shared/base';
import { isUnavailable, moreInfo, clamp } from '../shared/service';
import { accentFor } from '../shared/color';
import { registerEditor } from '../shared/editor';

export const META = {
  type: 'silk-battery-card',
  name: 'Silk Batteries',
  description: 'The dying ones float to the top.',
};

export interface BatteryCardConfig extends LovelaceCardConfig {
  /** Battery sensors to track; omit to auto-discover device_class: battery. */
  entities?: string[];
  /** Header label, defaults to "Batteries". */
  name?: string;
  /** Maximum rows shown (lowest levels win), defaults to 6. */
  limit?: number;
}

const EDITOR_TAG = 'silk-battery-card-editor';

registerEditor(
  EDITOR_TAG,
  [
    { name: 'name', selector: { text: {} } },
    {
      name: 'entities',
      selector: { entity: { multiple: true, domain: ['sensor'], device_class: ['battery'] } },
    },
    { name: 'limit', selector: { number: { min: 1, max: 30, mode: 'box' } } },
  ],
  {
    name: 'Name',
    entities: 'Entities (empty = every battery sensor)',
    limit: 'Rows to show',
  },
  { limit: 6 }
);

const DEFAULT_LIMIT = 6;
const LOW_THRESHOLD = 20;
const WARN_THRESHOLD = 50;

interface BatteryRow {
  stateObj: HassEntity;
  /** Battery percent 0–100; undefined when the state is not numeric. */
  level?: number;
}

/**
 * Display name with the redundant "Battery"/"Battery level" suffix trimmed —
 * every row on this card is a battery, the suffix is pure noise.
 */
function batteryName(stateObj: HassEntity): string {
  const raw = (stateObj.attributes.friendly_name as string | undefined) ?? stateObj.entity_id;
  const trimmed = raw.replace(/\s+battery(\s+level)?\s*$/i, '');
  return trimmed || raw;
}

/** Semantic status tier — battery status colors are genuinely semantic here. */
function levelTier(level: number): 'crit' | 'warn' | 'good' {
  if (level < LOW_THRESHOLD) return 'crit';
  if (level < WARN_THRESHOLD) return 'warn';
  return 'good';
}

@customElement('silk-battery-card')
export class SilkBatteryCard extends LitElement {
  @property({ attribute: false }) public hass?: HomeAssistant;

  @state() private _config?: BatteryCardConfig;

  public static getStubConfig(): Partial<BatteryCardConfig> {
    // No entity required — the card auto-discovers battery sensors.
    return { type: 'custom:silk-battery-card' };
  }

  public static async getConfigElement(): Promise<HTMLElement> {
    return document.createElement(EDITOR_TAG);
  }

  public setConfig(config: BatteryCardConfig): void {
    if (config.entities !== undefined && !Array.isArray(config.entities)) {
      throw new Error('silk-battery-card: `entities` must be a list of sensor entity ids');
    }
    if (config.limit !== undefined && (!Number.isFinite(config.limit) || config.limit < 1)) {
      throw new Error('silk-battery-card: `limit` must be a number of at least 1');
    }
    this._config = config;
  }

  public getCardSize(): number {
    const limit = this._config?.limit ?? DEFAULT_LIMIT;
    return 2 + Math.ceil(Math.min(limit, 12) / 2);
  }

  public getGridOptions(): Record<string, number> {
    return { columns: 6, rows: 2, min_columns: 3, min_rows: 2 };
  }

  private _limit(): number {
    return Math.max(1, Math.floor(this._config?.limit ?? DEFAULT_LIMIT));
  }

  /** Tracked batteries, sorted ascending by level, capped at `limit`. */
  private _rows(): BatteryRow[] {
    const hass = this.hass!;
    const ids =
      this._config?.entities ??
      Object.keys(hass.states).filter((id) => {
        if (!id.startsWith('sensor.')) return false;
        const stateObj = hass.states[id];
        return (
          stateObj.attributes.device_class === 'battery' &&
          stateObj.state !== '' &&
          Number.isFinite(Number(stateObj.state))
        );
      });
    const rows: BatteryRow[] = [];
    for (const id of ids) {
      const stateObj = hass.states[id];
      if (!stateObj) continue;
      const numeric = Number(stateObj.state);
      const level =
        !isUnavailable(stateObj) && stateObj.state !== '' && Number.isFinite(numeric)
          ? clamp(numeric, 0, 100)
          : undefined;
      rows.push({ stateObj, level });
    }
    // Dying batteries float to the top; unknowns sink to the bottom.
    rows.sort((a, b) => {
      if (a.level === undefined && b.level === undefined) return 0;
      if (a.level === undefined) return 1;
      if (b.level === undefined) return -1;
      return (
        a.level - b.level || batteryName(a.stateObj).localeCompare(batteryName(b.stateObj))
      );
    });
    return rows.slice(0, this._limit());
  }

  private _onRowClick(entityId: string): void {
    moreInfo(this, entityId);
  }

  private _renderRow(row: BatteryRow): TemplateResult {
    const name = batteryName(row.stateObj);
    const level = row.level;
    const tier = level === undefined ? undefined : levelTier(level);
    return html`
      <button
        class="row ${level === undefined ? 'unavailable' : ''}"
        aria-label=${level === undefined ? name : `${name}: ${Math.round(level)}%`}
        @click=${() => this._onRowClick(row.stateObj.entity_id)}
      >
        <span class="bname">${name}</span>
        <span class="bar">
          ${level === undefined
            ? nothing
            : html`<span class="fill ${tier}" style="width:${level}%"></span>`}
        </span>
        <span class="pct ${tier === 'crit' ? 'low' : ''}">
          ${level === undefined ? '—' : `${Math.round(level)}%`}
        </span>
      </button>
    `;
  }

  protected render(): TemplateResult | typeof nothing {
    const config = this._config;
    const hass = this.hass;
    if (!config || !hass) return nothing;

    const rows = this._rows();
    const lowest = rows.length ? rows[0].level : undefined;
    const name = config.name ?? 'Batteries';

    return html`
      <ha-card class="control" style="--silk-accent:${accentFor(undefined)}">
        <div class="header">
          <div class="hname">${name}</div>
          ${lowest !== undefined && lowest < LOW_THRESHOLD
            ? html`<span class="badge">${Math.round(lowest)}%</span>`
            : nothing}
        </div>
        ${rows.length
          ? html`<div class="rows">${rows.map((row) => this._renderRow(row))}</div>`
          : html`<div class="empty">No battery sensors found</div>`}
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
      .hname {
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
      .bname {
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
      .bar {
        flex: 1 1 34%;
        min-width: 48px;
        height: 6px;
        border-radius: 3px;
        background: rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.08);
        overflow: hidden;
      }
      .fill {
        display: block;
        height: 100%;
        border-radius: 3px;
        transition: width 400ms var(--silk-ease-out);
      }
      .fill.crit {
        background: var(--error-color, #db4437);
      }
      .fill.warn {
        background: var(--warning-color, #ffa600);
      }
      .fill.good {
        background: var(--success-color, #43a047);
      }
      .pct {
        flex: none;
        min-width: 42px;
        font-size: 13px;
        font-weight: 600;
        text-align: right;
        color: var(--primary-text-color);
        font-variant-numeric: tabular-nums;
      }
      .pct.low {
        color: var(--error-color, #db4437);
      }
      .empty {
        flex: 1;
        display: flex;
        align-items: center;
        justify-content: center;
        min-height: 48px;
        padding: 6px 0;
        font-size: 13px;
        color: var(--secondary-text-color);
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    'silk-battery-card': SilkBatteryCard;
  }
}
