import { LitElement, html, css, nothing, TemplateResult } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { HomeAssistant, HassEntity, LovelaceCardConfig } from '../types';
import { silkControlStyles } from '../shared/base';
import { isUnavailable, moreInfo } from '../shared/service';
import { accentFor } from '../shared/color';
import { registerRowsEditor } from '../shared/rows';

export const META = {
  type: 'silk-bandwidth-card',
  name: 'Silk Talkers',
  description: 'Who is eating the bandwidth.',
};

export interface SilkTalkerConfig {
  /** A rate sensor — B/s, kB/s, Mbit/s, anything with a unit. */
  entity: string;
  name?: string;
}

export interface SilkBandwidthCardConfig extends LovelaceCardConfig {
  /** Clients to rank, one row each in the editor. Max 10. */
  clients: SilkTalkerConfig[];
  /** Total-throughput sensor; the unclaimed remainder draws as a muted bar. */
  total?: string;
  name?: string;
  /** Assumed unit for sensors that carry none, e.g. `kB/s`. */
  unit?: string;
  /** Accent override. */
  color?: string;
}

interface TalkerRow {
  entityId: string;
  name: string;
  /** Rate in bytes/s; undefined when the sensor has nothing to say. */
  rate?: number;
  /** The muted remainder row, not a client. */
  rest?: boolean;
}

const DEFAULT_NAME = 'Top talkers';
const MAX_CLIENTS = 10;
/** Throughput is decimal by convention — 1 MB/s is a million bytes. */
const STEP = 1000;
const BYTE_LABELS = ['B/s', 'KB/s', 'MB/s', 'GB/s', 'TB/s'];
const BIT_LABELS = ['bit/s', 'kbit/s', 'Mbit/s', 'Gbit/s', 'Tbit/s'];
/** Rank fades the one hue; never a second color. */
const MIN_OPACITY = 0.35;
const OPACITY_STEP = 0.07;
/** A non-zero rate never collapses to an invisible sliver. */
const MIN_FILL_PCT = 2;

const EDITOR_TAG = 'silk-bandwidth-card-editor';

// `clients` is a list of {entity, name} objects — the row editor authors it
// with a picker per row, so nothing about this card needs YAML.
registerRowsEditor(EDITOR_TAG, {
  field: 'clients',
  title: '클라이언트',
  addLabel: '클라이언트 추가',
  blank: { entity: '' },
  row: [
    { name: 'entity', label: '엔티티', selector: { entity: { domain: ['sensor'] } } },
    { name: 'name', label: '이름', selector: { text: {} } },
  ],
  schema: [
    { name: 'name', selector: { text: {} } },
    { name: 'total', selector: { entity: { domain: ['sensor'] } } },
    {
      name: '',
      type: 'grid',
      schema: [
        { name: 'unit', selector: { text: {} } },
        { name: 'color', selector: { ui_color: {} } },
      ],
    },
  ],
  labels: { name: '이름', total: '전체 처리량 센서', unit: '단위', color: '강조 색상' },
});

const PREFIX_POWER: Record<string, number> = { k: 1, m: 2, g: 3, t: 4 };

/**
 * A rate unit decoded into a multiplier and a family. `kB/s` and `kbit/s`
 * differ only in the case of one letter, so case is read before anything else;
 * an `i` (KiB/s) switches the prefix to binary steps.
 */
function unitScale(unit: string): { mult: number; bits: boolean } {
  const head = unit.trim().replace(/\s*(\/\s*s(ec)?|ps)$/i, '');
  const bits = /bit/i.test(head) || (/b$/.test(head) && !/B$/.test(head));
  const binary = /i/i.test(head.replace(/bit/i, ''));
  const power = PREFIX_POWER[head.charAt(0).toLowerCase()] ?? 0;
  return { mult: (binary ? 1024 : 1000) ** power, bits };
}

/** Bytes per second, plus whether the sensor spoke in bits. */
function readRate(
  stateObj: HassEntity | undefined,
  fallbackUnit?: string
): { bytes: number; bits: boolean } | undefined {
  if (!stateObj || isUnavailable(stateObj) || stateObj.state === '') return undefined;
  const value = Number(stateObj.state);
  if (!Number.isFinite(value)) return undefined;
  const unit =
    (stateObj.attributes.unit_of_measurement as string | undefined) ?? fallbackUnit ?? 'B/s';
  const { mult, bits } = unitScale(unit);
  const base = Math.max(0, value) * mult;
  return { bytes: bits ? base / 8 : base, bits };
}

/** `3.4 MB/s` — value and unit split so the unit can recede. */
function formatRate(bytes: number, bits: boolean): { value: string; unit: string } {
  const labels = bits ? BIT_LABELS : BYTE_LABELS;
  let scaled = bits ? bytes * 8 : bytes;
  let step = 0;
  while (scaled >= STEP && step < labels.length - 1) {
    scaled /= STEP;
    step += 1;
  }
  const digits = scaled >= 100 || step === 0 ? 0 : 1;
  return {
    value: new Intl.NumberFormat('en', {
      minimumFractionDigits: digits,
      maximumFractionDigits: digits,
    }).format(scaled),
    unit: labels[step],
  };
}

/**
 * Top talkers: one hue, ranked, longest bar on top. The bars carry the ranking
 * and the numbers carry the amount — opacity does the rest, so ten clients
 * never turn into ten colors.
 */
@customElement('silk-bandwidth-card')
export class SilkBandwidthCard extends LitElement {
  @property({ attribute: false }) public hass?: HomeAssistant;

  @state() private _config?: SilkBandwidthCardConfig;

  public static getStubConfig(hass: HomeAssistant): Partial<SilkBandwidthCardConfig> {
    const rates = Object.keys(hass.states).filter((id) => {
      if (!id.startsWith('sensor.')) return false;
      const unit = hass.states[id].attributes.unit_of_measurement as string | undefined;
      return !!unit && /\/s$|ps$/i.test(unit) && Number.isFinite(Number(hass.states[id].state));
    });
    return {
      type: 'custom:silk-bandwidth-card',
      clients: rates.slice(0, 5).map((entity) => ({ entity })),
    };
  }

  public static async getConfigElement(): Promise<HTMLElement> {
    return document.createElement(EDITOR_TAG);
  }

  public setConfig(config: SilkBandwidthCardConfig): void {
    if (!Array.isArray(config.clients) || config.clients.length === 0) {
      throw new Error('silk-bandwidth-card: `clients` is required — a list of {entity, name?}');
    }
    for (const client of config.clients) {
      if (
        !client ||
        typeof client !== 'object' ||
        typeof client.entity !== 'string' ||
        !client.entity.includes('.')
      ) {
        throw new Error('silk-bandwidth-card: every client needs an `entity` id');
      }
    }
    if (config.total !== undefined && typeof config.total !== 'string') {
      throw new Error('silk-bandwidth-card: `total` must be an entity id');
    }
    this._config = config;
  }

  public getCardSize(): number {
    return 2 + Math.ceil(Math.min(this._config?.clients.length ?? 0, MAX_CLIENTS) / 2);
  }

  public getGridOptions(): Record<string, number> {
    return { columns: 6, rows: 3, min_columns: 4, min_rows: 2 };
  }

  /** Ranked rows plus the optional remainder, and the family they read in. */
  private _model(): { rows: TalkerRow[]; bits: boolean; total?: number } {
    const hass = this.hass!;
    const config = this._config!;
    let sawBytes = false;
    let sawBits = false;

    const rows: TalkerRow[] = config.clients.slice(0, MAX_CLIENTS).map((client) => {
      const stateObj = hass.states[client.entity];
      const parsed = readRate(stateObj, config.unit);
      if (parsed) {
        if (parsed.bits) sawBits = true;
        else sawBytes = true;
      }
      return {
        entityId: client.entity,
        name: client.name ?? stateObj?.attributes.friendly_name ?? client.entity,
        rate: parsed?.bytes,
      };
    });
    // Loudest first; the silent and the unavailable sink to the bottom.
    rows.sort((a, b) => {
      if (a.rate === undefined && b.rate === undefined) return 0;
      if (a.rate === undefined) return 1;
      if (b.rate === undefined) return -1;
      return b.rate - a.rate;
    });

    const totalObj = config.total ? hass.states[config.total] : undefined;
    const totalParsed = readRate(totalObj, config.unit);
    if (totalParsed) {
      if (totalParsed.bits) sawBits = true;
      else sawBytes = true;
    }
    const claimed = rows.reduce((sum, row) => sum + (row.rate ?? 0), 0);
    const total = totalParsed ? totalParsed.bytes : claimed;
    // Only a real remainder earns a row — a rounding crumb does not.
    if (config.total && totalParsed && total - claimed > total * 0.01) {
      rows.push({
        entityId: config.total,
        name: 'Rest',
        rate: total - claimed,
        rest: true,
      });
    }
    // Bits only when nothing spoke in bytes, so the card never mixes families.
    return { rows, bits: sawBits && !sawBytes, total: totalParsed || claimed ? total : undefined };
  }

  private _onRowClick(entityId: string): void {
    moreInfo(this, entityId);
  }

  private _renderRow(row: TalkerRow, rank: number, max: number, bits: boolean): TemplateResult {
    const rate = row.rate;
    const formatted = rate === undefined ? undefined : formatRate(rate, bits);
    const pct =
      rate === undefined || max <= 0 ? 0 : Math.max(rate > 0 ? MIN_FILL_PCT : 0, (rate / max) * 100);
    const opacity = row.rest ? 1 : Math.max(MIN_OPACITY, 1 - rank * OPACITY_STEP);
    const title = formatted
      ? `${row.name} · ${formatted.value} ${formatted.unit}`
      : `${row.name} · unavailable`;
    return html`
      <button
        class="row ${rate === undefined ? 'unknown' : ''}"
        title=${title}
        aria-label=${title}
        @click=${() => this._onRowClick(row.entityId)}
      >
        <span class="cname">${row.name}</span>
        <span class="track">
          <span
            class="fill ${row.rest ? 'rest' : ''}"
            style="width:${pct.toFixed(2)}%;opacity:${opacity.toFixed(2)}"
          ></span>
        </span>
        <span class="val">
          ${formatted
            ? html`${formatted.value}<span class="u">${formatted.unit}</span>`
            : html`—`}
        </span>
      </button>
    `;
  }

  protected render(): TemplateResult | typeof nothing {
    const config = this._config;
    const hass = this.hass;
    if (!config || !hass) return nothing;

    const { rows, bits, total } = this._model();
    const max = rows.reduce((peak, row) => Math.max(peak, row.rate ?? 0), 0);
    const headline = total === undefined ? undefined : formatRate(total, bits);
    const live = rows.some((row) => row.rate !== undefined);

    return html`
      <ha-card class="control" style="--silk-accent:${accentFor(undefined, config.color)}">
        <div class="header">
          <div class="hname">${config.name ?? DEFAULT_NAME}</div>
          ${headline
            ? html`<span class="total"
                >${headline.value}<span class="unit">${headline.unit}</span></span
              >`
            : nothing}
        </div>
        ${live
          ? html`<div class="rows">
              ${rows.map((row, i) => this._renderRow(row, i, max, bits))}
            </div>`
          : html`<div class="note">No traffic data</div>`}
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
        min-height: 22px;
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
        font-size: 15px;
        font-weight: 600;
        letter-spacing: -0.01em;
        color: var(--primary-text-color);
        font-variant-numeric: tabular-nums;
        white-space: nowrap;
      }
      .total .unit {
        margin-left: 3px;
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
      .row.unknown {
        opacity: 0.45;
      }
      .cname {
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
        background: rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.07);
        overflow: hidden;
      }
      .fill {
        display: block;
        height: 100%;
        border-radius: 4px;
        background: var(--silk-accent);
        transition:
          width 400ms var(--silk-ease-out),
          opacity 200ms ease;
      }
      .fill.rest {
        background: rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.22);
      }
      .val {
        flex: none;
        min-width: 76px;
        text-align: right;
        font-size: 13px;
        font-weight: 600;
        color: var(--primary-text-color);
        font-variant-numeric: tabular-nums;
        white-space: nowrap;
      }
      .val .u {
        margin-left: 3px;
        font-size: 11px;
        font-weight: 500;
        color: var(--secondary-text-color);
      }
      .note {
        flex: 1;
        display: flex;
        align-items: center;
        justify-content: center;
        min-height: 44px;
        font-size: 13px;
        color: var(--secondary-text-color);
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    'silk-bandwidth-card': SilkBandwidthCard;
  }
}
