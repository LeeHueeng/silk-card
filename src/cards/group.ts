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
  stateText,
} from '../shared/service';
import { accentFor } from '../shared/color';
import { registerListEditor } from '../shared/listeditor';
import { entityListSelector } from '../shared/list';
import { formatNumber } from '../format';

export const META = {
  type: 'silk-group-card',
  name: 'Silk Group',
  description: 'A tidy box of entities.',
};

/** One row: an entity, optionally renamed, re-iconed, given a second line. */
export interface SilkGroupRowConfig {
  entity: string;
  name?: string;
  icon?: string;
  /** Second line under the name: the live state, or how long ago it changed. */
  secondary?: 'state' | 'last-changed';
}

export interface SilkGroupCardConfig extends LovelaceCardConfig {
  /** Rows — a bare entity id, or {entity, name, icon, secondary}. */
  entities: (string | SilkGroupRowConfig)[];
  /** Heading label; `name` is accepted as an alias. */
  title?: string;
  name?: string;
  /** Heading icon. */
  icon?: string;
  /** Switch instead of state text on toggleable rows. Default true. */
  toggles?: boolean;
  /** 1 (default) or 2. Two columns only materialize when the card is wide. */
  columns?: 1 | 2;
  /** Accent override. */
  color?: string;
}

/**
 * Domains whose whole story is on/off, so a switch is the honest control.
 * Covers and locks stay text: "Open"/"Locked" says more than a flipped track,
 * and a switch would imply a symmetry those domains do not have.
 */
const TOGGLE_DOMAINS = new Set([
  'light',
  'switch',
  'input_boolean',
  'fan',
  'siren',
  'humidifier',
  'automation',
  'remote',
]);

/** Re-render cadence so `last-changed` stamps never go stale. */
const CLOCK_TICK_MS = 30_000;
const OPTIMISTIC_TIMEOUT_MS = 2000;

const EDITOR_TAG = 'silk-group-card-editor';

// The picker speaks bare ids, and the list editor folds them back into the
// stored list — so rows carrying their own name/icon/secondary survive an edit.
registerListEditor(EDITOR_TAG, {
  schema: [
    {
      name: '',
      type: 'grid',
      schema: [
        { name: 'title', selector: { text: {} } },
        { name: 'name', selector: { text: {} } },
      ],
    },
    {
      name: '',
      type: 'grid',
      schema: [
        { name: 'icon', selector: { icon: {} } },
        { name: 'columns', selector: { number: { min: 1, max: 2, step: 1, mode: 'box' } } },
        { name: 'color', selector: { ui_color: {} } },
      ],
    },
    entityListSelector('entities'),
    { name: 'toggles', selector: { boolean: {} } },
  ],
  labels: {
    title: '제목',
    name: '이름 (제목 대신)',
    icon: '아이콘',
    columns: '열 수 (1–2)',
    color: '강조 색상',
    entities: '엔티티',
    toggles: '전환 가능한 행에 스위치 표시',
  },
  defaults: { columns: 1, toggles: true },
  listFields: ['entities'],
});

/** 'now', then 12m / 5h / 3d — a stamp that fits the right edge of a row. */
function shortSince(ms: number): string | null {
  if (!Number.isFinite(ms)) return null;
  const sec = Math.max(0, (Date.now() - ms) / 1000);
  if (sec < 60) return 'now';
  if (sec < 3600) return `${Math.floor(sec / 60)}m`;
  if (sec < 86400) return `${Math.floor(sec / 3600)}h`;
  return `${Math.floor(sec / 86400)}d`;
}

/**
 * A box of entities that reads as one thing: a quiet heading, then 40px rows
 * that all line up — icon, name, and a single right-aligned answer, whether
 * that answer is a number, a word, or a switch you can actually flip.
 */
@customElement('silk-group-card')
export class SilkGroupCard extends LitElement {
  @property({ attribute: false }) public hass?: HomeAssistant;

  @state() private _config?: SilkGroupCardConfig;

  /** Normalized rows — the config's two shapes collapse into one here. */
  private _rows: SilkGroupRowConfig[] = [];
  /** Optimistic toggle targets by entity id (absent = trust the real state). */
  private _optimistic = new Map<string, boolean>();
  /** last_updated at flip time; any newer stamp retires the override. */
  private _optimisticBase = new Map<string, string>();
  private _optimisticTimers = new Map<string, number>();
  private _clockTimer?: number;

  public static getStubConfig(hass: HomeAssistant): Partial<SilkGroupCardConfig> {
    const ids = Object.keys(hass.states);
    const pick = (prefix: string, count: number) =>
      ids.filter((id) => id.startsWith(prefix)).slice(0, count);
    const entities = [...pick('light.', 2), ...pick('switch.', 2), ...pick('sensor.', 1)];
    return {
      type: 'custom:silk-group-card',
      title: 'Group',
      entities: entities.length ? entities : ids.slice(0, 3),
    };
  }

  public static async getConfigElement(): Promise<HTMLElement> {
    return document.createElement(EDITOR_TAG);
  }

  public setConfig(config: SilkGroupCardConfig): void {
    if (!Array.isArray(config.entities) || config.entities.length === 0) {
      throw new Error(
        'silk-group-card: `entities` is required — a list of entity ids or {entity, name, icon, secondary}'
      );
    }
    // Normalize into a local first: a throw halfway through must not leave the
    // card holding rows that disagree with its config.
    const rows: SilkGroupRowConfig[] = config.entities.map((item, i) => {
      const row: SilkGroupRowConfig | undefined =
        typeof item === 'string' ? { entity: item } : (item as SilkGroupRowConfig);
      if (!row || typeof row !== 'object' || typeof row.entity !== 'string') {
        throw new Error(`silk-group-card: entities[${i}] must be an entity id or {entity: …}`);
      }
      if (!row.entity.includes('.')) {
        throw new Error(`silk-group-card: \`${row.entity}\` is not an entity id`);
      }
      if (row.secondary !== undefined && row.secondary !== 'state' && row.secondary !== 'last-changed') {
        throw new Error(
          `silk-group-card: entities[${i}].secondary must be 'state' or 'last-changed'`
        );
      }
      return { entity: row.entity, name: row.name, icon: row.icon, secondary: row.secondary };
    });
    const columns = Number(config.columns ?? 1);
    if (columns !== 1 && columns !== 2) {
      throw new Error('silk-group-card: `columns` must be 1 or 2');
    }
    this._rows = rows;
    this._config = config;
    this._clearOptimistic();
    this._ensureClock();
  }

  public getCardSize(): number {
    const cols = this._columns();
    // A 40px row against Lovelace's ~50px size unit, plus the heading.
    return Math.max(1, Math.ceil((this._rows.length / cols) * 0.8) + (this._hasHeader() ? 1 : 0));
  }

  public getGridOptions(): Record<string, number> {
    return { columns: 6, rows: 3, min_columns: 3, min_rows: 2 };
  }

  public connectedCallback(): void {
    super.connectedCallback();
    this._ensureClock();
  }

  public disconnectedCallback(): void {
    super.disconnectedCallback();
    window.clearInterval(this._clockTimer);
    this._clockTimer = undefined;
    this._clearOptimistic();
  }

  protected willUpdate(changed: PropertyValues): void {
    if (!changed.has('hass') || this._optimistic.size === 0) return;
    for (const entityId of [...this._optimistic.keys()]) {
      const stamp = this.hass?.states[entityId]?.last_updated;
      if (stamp && stamp !== this._optimisticBase.get(entityId)) this._retire(entityId);
    }
  }

  /** The ticker only runs when a row actually shows a relative stamp. */
  private _ensureClock(): void {
    const needed =
      this.isConnected && this._rows.some((row) => row.secondary === 'last-changed');
    if (needed && this._clockTimer === undefined) {
      this._clockTimer = window.setInterval(() => this.requestUpdate(), CLOCK_TICK_MS);
    } else if (!needed && this._clockTimer !== undefined) {
      window.clearInterval(this._clockTimer);
      this._clockTimer = undefined;
    }
  }

  private _columns(): number {
    return Number(this._config?.columns ?? 1) === 2 ? 2 : 1;
  }

  private _hasHeader(): boolean {
    const config = this._config;
    return Boolean(config && (config.title || config.name || config.icon));
  }

  private _retire(entityId: string): void {
    const timer = this._optimisticTimers.get(entityId);
    if (timer !== undefined) window.clearTimeout(timer);
    this._optimisticTimers.delete(entityId);
    this._optimistic.delete(entityId);
    this._optimisticBase.delete(entityId);
    this.requestUpdate();
  }

  private _clearOptimistic(): void {
    for (const timer of this._optimisticTimers.values()) window.clearTimeout(timer);
    this._optimisticTimers.clear();
    this._optimistic.clear();
    this._optimisticBase.clear();
  }

  /**
   * One accent for the whole card: the domain's own hue when every row shares
   * a domain, Silk's neutral primary when the box is a mixed bag.
   */
  private _accent(): string {
    const config = this._config;
    if (config?.color) return config.color;
    const domains = new Set(this._rows.map((row) => domainOf(row.entity)));
    if (domains.size === 1) {
      const first = this.hass?.states[this._rows[0].entity];
      if (first) return accentFor(first);
    }
    return accentFor(undefined);
  }

  /** The right-hand answer: a formatted number with its unit, or the state. */
  private _valueText(stateObj: HassEntity): string {
    const numeric = Number(stateObj.state);
    if (stateObj.state !== '' && Number.isFinite(numeric)) {
      const value = formatNumber(this.hass, stateObj.entity_id, numeric);
      const unit = stateObj.attributes.unit_of_measurement;
      return unit ? `${value} ${unit}` : value;
    }
    return stateText(this.hass, stateObj);
  }

  private _onRowClick(entityId: string): void {
    moreInfo(this, entityId);
  }

  private _onRowKeyDown(ev: KeyboardEvent, entityId: string): void {
    if (ev.key !== 'Enter' && ev.key !== ' ') return;
    ev.preventDefault();
    moreInfo(this, entityId);
  }

  private _onToggle(ev: Event, entityId: string): void {
    ev.stopPropagation();
    const hass = this.hass;
    const stateObj = hass?.states[entityId];
    if (!hass || !stateObj || isUnavailable(stateObj)) return;
    haptic(this);
    // Flip against the *real* state, exactly like toggleEntity decides, so a
    // burst of taps stays honest about the service calls actually sent.
    this._optimistic.set(entityId, !isActive(stateObj));
    this._optimisticBase.set(entityId, stateObj.last_updated);
    const previous = this._optimisticTimers.get(entityId);
    if (previous !== undefined) window.clearTimeout(previous);
    this._optimisticTimers.set(
      entityId,
      window.setTimeout(() => this._retire(entityId), OPTIMISTIC_TIMEOUT_MS)
    );
    this.requestUpdate();
    toggleEntity(hass, entityId);
  }

  private _renderSwitch(
    entityId: string,
    name: string,
    active: boolean,
    dead: boolean
  ): TemplateResult {
    return html`
      <button
        class="sw ${active ? 'checked' : ''}"
        role="switch"
        aria-checked=${active ? 'true' : 'false'}
        aria-label=${`Toggle ${name}`}
        .disabled=${dead}
        @click=${(ev: Event) => this._onToggle(ev, entityId)}
      >
        <span class="thumb"></span>
      </button>
    `;
  }

  private _renderRow(row: SilkGroupRowConfig): TemplateResult {
    const hass = this.hass!;
    const stateObj = hass.states[row.entity];
    const dead = isUnavailable(stateObj);
    const name = row.name ?? stateObj?.attributes.friendly_name ?? row.entity;
    const pending = this._optimistic.get(row.entity);
    const active = !dead && (pending ?? isActive(stateObj));
    // While an optimistic override is live, present a synthetic state object so
    // icon, secondary line and switch all tell the same story. Every domain in
    // TOGGLE_DOMAINS speaks plain on/off, so no per-domain prediction is needed.
    const displayObj: HassEntity | undefined =
      stateObj && pending !== undefined ? { ...stateObj, state: pending ? 'on' : 'off' } : stateObj;
    const switchable =
      this._config?.toggles !== false && stateObj !== undefined && TOGGLE_DOMAINS.has(domainOf(row.entity));

    let secondary: string | null = null;
    if (row.secondary === 'state') {
      secondary = displayObj ? stateText(hass, displayObj) : 'Unavailable';
    } else if (row.secondary === 'last-changed') {
      secondary = (stateObj ? shortSince(Date.parse(stateObj.last_changed)) : null) ?? '—';
    }
    const value = displayObj && !dead ? this._valueText(displayObj) : '—';

    return html`
      <div
        class="row ${dead ? 'dead' : ''}"
        role="button"
        tabindex="0"
        aria-label=${`${name}: ${dead ? 'unavailable' : value}`}
        @click=${() => this._onRowClick(row.entity)}
        @keydown=${(ev: KeyboardEvent) => this._onRowKeyDown(ev, row.entity)}
      >
        <span class="ricon ${active ? 'on' : ''}">
          ${row.icon
            ? html`<ha-icon .icon=${row.icon}></ha-icon>`
            : displayObj
              ? html`<ha-state-icon .hass=${hass} .stateObj=${displayObj}></ha-state-icon>`
              : html`<ha-icon .icon=${'mdi:help-circle-outline'}></ha-icon>`}
        </span>
        <span class="text">
          <span class="rname" title=${name}>${name}</span>
          ${secondary !== null ? html`<span class="rsub">${secondary}</span>` : nothing}
        </span>
        ${switchable
          ? this._renderSwitch(row.entity, name, active, dead)
          : html`<span class="rstate" title=${value}>${value}</span>`}
      </div>
    `;
  }

  protected render(): TemplateResult | typeof nothing {
    const config = this._config;
    const hass = this.hass;
    if (!config || !hass) return nothing;

    const title = config.title ?? config.name;
    const allDead =
      this._rows.length > 0 && this._rows.every((row) => isUnavailable(hass.states[row.entity]));

    return html`
      <ha-card
        class="control ${allDead ? 'unavailable' : ''}"
        style="--silk-accent:${this._accent()}"
      >
        ${this._hasHeader()
          ? html`
              <div class="header">
                ${config.icon ? html`<ha-icon class="hicon" .icon=${config.icon}></ha-icon>` : nothing}
                ${title ? html`<div class="hname" title=${title}>${title}</div>` : nothing}
              </div>
            `
          : nothing}
        <div class="rows ${this._columns() === 2 ? 'two' : ''}">
          ${this._rows.map((row) => this._renderRow(row))}
        </div>
      </ha-card>
    `;
  }

  static styles = [
    silkControlStyles,
    css`
      :host {
        height: auto;
      }
      ha-card {
        height: auto;
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
      .rows {
        display: grid;
        grid-template-columns: 1fr;
        column-gap: 12px;
        row-gap: 2px;
        align-content: start;
        margin: 0 -6px;
        min-width: 0;
      }
      /* Two columns, never three: the 50% floor caps the track count, and the
         190px floor collapses back to one column on a narrow card. */
      .rows.two {
        grid-template-columns: repeat(auto-fit, minmax(max(190px, calc(50% - 6px)), 1fr));
      }
      /* A row is a button that contains a button, so it carries the role by
         hand rather than nesting two <button>s. */
      .row {
        display: flex;
        align-items: center;
        gap: 10px;
        min-width: 0;
        min-height: 40px;
        padding: 2px 6px;
        box-sizing: border-box;
        border-radius: 10px;
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
      .ricon {
        flex: none;
        display: grid;
        place-items: center;
        width: 22px;
        color: var(--secondary-text-color);
        opacity: 0.7;
        transition: color 200ms ease, opacity 200ms ease;
      }
      .ricon.on {
        color: var(--silk-accent);
        opacity: 1;
      }
      .ricon ha-icon,
      .ricon ha-state-icon {
        --mdc-icon-size: 22px;
        pointer-events: none;
      }
      .text {
        flex: 1;
        min-width: 0;
        display: flex;
        flex-direction: column;
        justify-content: center;
      }
      .rname {
        font-size: 13px;
        font-weight: 500;
        line-height: 1.3;
        color: var(--primary-text-color);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .rsub {
        font-size: 11px;
        line-height: 1.3;
        color: var(--secondary-text-color);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        font-variant-numeric: tabular-nums;
      }
      .rstate {
        flex: 0 1 auto;
        max-width: 45%;
        text-align: right;
        font-size: 12.5px;
        font-weight: 500;
        line-height: 1.3;
        color: var(--secondary-text-color);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        font-variant-numeric: tabular-nums;
      }
      /* Compact 36×20 track — the row is only 40px tall. */
      .sw {
        flex: none;
        position: relative;
        width: 36px;
        height: 20px;
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
        inset: -10px -6px;
        border-radius: 999px;
      }
      .sw.checked {
        background: var(--silk-accent);
      }
      .sw:focus-visible {
        outline: 2px solid color-mix(in srgb, var(--silk-accent) 70%, transparent);
        outline-offset: 2px;
      }
      .sw:disabled {
        cursor: default;
      }
      .thumb {
        display: block;
        width: 16px;
        height: 16px;
        border-radius: 50%;
        background: var(--card-background-color, #fff);
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
        transform: translateX(0);
        transition: transform 200ms var(--silk-ease-out);
        will-change: transform;
      }
      .sw.checked .thumb {
        transform: translateX(16px);
      }
      .unavailable .header {
        opacity: 0.45;
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    'silk-group-card': SilkGroupCard;
  }
}
