import { LitElement, html, css, nothing, PropertyValues, TemplateResult } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { HomeAssistant, HassEntity, LovelaceCardConfig } from '../types';
import { silkControlStyles } from '../shared/base';
import { domainOf, isUnavailable, moreInfo, haptic, stateText } from '../shared/service';
import { accentFor } from '../shared/color';
import { registerRowsEditor } from '../shared/rows';

export const META = {
  type: 'silk-addons-card',
  name: 'Silk Add-ons',
  description: "Supervisor's little zoo.",
};

export interface SilkAddonConfig {
  /** State sensor (`running`/`stopped`) or a binary_sensor. */
  entity: string;
  name?: string;
  /** Version sensor, shown after the name. */
  version?: string;
  /** `update.*` entity; `on` earns the update chip and the install button. */
  update?: string;
}

export interface SilkAddonsCardConfig extends LovelaceCardConfig {
  /** Add-ons to list. Omit to auto-discover entities whose id mentions an
   *  add-on. */
  addons?: SilkAddonConfig[];
  name?: string;
  /** Rows to show, defaults to 6. */
  limit?: number;
  /** Accent override. */
  color?: string;
}

type RunState = 'running' | 'stopped' | 'unknown';

interface AddonRow {
  entityId: string;
  name: string;
  run: RunState;
  version?: string;
  updateId?: string;
  /** The update entity is `on` — an install is genuinely available. */
  updatable: boolean;
  latest?: string;
  installing: boolean;
}

const DEFAULT_NAME = 'Add-ons';
const DEFAULT_LIMIT = 6;
const MAX_LIMIT = 20;
const OPTIMISTIC_TIMEOUT_MS = 2000;

const RUNNING_STATES = new Set(['running', 'on', 'started', 'active', 'up', 'healthy']);
/** Sort weight — a stopped add-on is the reason you opened this card. */
const RANK: Record<RunState, number> = { stopped: 0, unknown: 1, running: 2 };

/** Entity-id fragments that mark a *metric* of an add-on, not the add-on. */
const METRIC_SUFFIX =
  /_(version|newest_version|current_version|cpu|cpu_percent|memory|memory_percent|ram|disk|uptime|update_available|changelog)$/;

const EDITOR_TAG = 'silk-addons-card-editor';

// Each add-on is a row of its own entities (state, version, update), which no
// flat form can hold — so the scalars render first and the list below them gets
// one form per row. Deleting every row restores the auto-discovery default.
registerRowsEditor(EDITOR_TAG, {
  field: 'addons',
  title: '애드온',
  addLabel: '애드온 추가',
  schema: [
    { name: 'name', selector: { text: {} } },
    {
      name: '',
      type: 'grid',
      schema: [
        { name: 'limit', selector: { number: { min: 1, max: MAX_LIMIT, step: 1, mode: 'box' } } },
        { name: 'color', selector: { ui_color: {} } },
      ],
    },
  ],
  labels: { name: '이름', limit: '표시 개수', color: '강조 색상' },
  defaults: { limit: DEFAULT_LIMIT },
  row: [
    {
      name: 'entity',
      label: '상태 엔티티',
      selector: { entity: { domain: ['sensor', 'binary_sensor'] } },
    },
    { name: 'name', label: '이름', selector: { text: {} } },
    { name: 'version', label: '버전 센서', selector: { entity: { domain: ['sensor'] } } },
    { name: 'update', label: '업데이트 엔티티', selector: { entity: { domain: ['update'] } } },
  ],
  blank: { entity: '' },
});

function runStateOf(stateObj: HassEntity | undefined): RunState {
  if (!stateObj) return 'unknown';
  const raw = stateObj.state;
  if (raw === '' || raw === 'unknown' || raw === 'unavailable') return 'unknown';
  return RUNNING_STATES.has(raw.toLowerCase()) ? 'running' : 'stopped';
}

/**
 * Display name with the redundant status suffix trimmed — every row here is an
 * add-on, so "File editor Running" is just "File editor".
 */
function addonName(stateObj: HassEntity | undefined, fallback: string): string {
  const raw = (stateObj?.attributes.friendly_name as string | undefined) ?? fallback;
  const trimmed = raw.replace(/\s+(running|state|status)\s*$/i, '');
  return trimmed || raw;
}

/**
 * The add-on list: what is up, what fell over, and what wants a new version.
 * Stopped add-ons sort first; everything else keeps its configured order.
 */
@customElement('silk-addons-card')
export class SilkAddonsCard extends LitElement {
  @property({ attribute: false }) public hass?: HomeAssistant;

  @state() private _config?: SilkAddonsCardConfig;
  /** Optimistic "installing": update entity id → last_updated at call time. */
  @state() private _installing: Record<string, string> = {};

  private _installTimers: Record<string, number> = {};

  public static getStubConfig(): Partial<SilkAddonsCardConfig> {
    // No entities required — the card auto-discovers add-on entities.
    return { type: 'custom:silk-addons-card' };
  }

  public static async getConfigElement(): Promise<HTMLElement> {
    return document.createElement(EDITOR_TAG);
  }

  public setConfig(config: SilkAddonsCardConfig): void {
    if (config.addons !== undefined) {
      if (!Array.isArray(config.addons) || config.addons.length === 0) {
        throw new Error(
          'silk-addons-card: `addons` must be a list of {entity, name?, version?, update?}'
        );
      }
      for (const addon of config.addons) {
        if (
          !addon ||
          typeof addon !== 'object' ||
          typeof addon.entity !== 'string' ||
          !addon.entity.includes('.')
        ) {
          throw new Error('silk-addons-card: every add-on needs an `entity` id');
        }
      }
    }
    if (config.limit !== undefined && (!Number.isFinite(config.limit) || config.limit < 1)) {
      throw new Error('silk-addons-card: `limit` must be a number of at least 1');
    }
    this._config = config;
  }

  public getCardSize(): number {
    return 2 + Math.ceil(this._limit() / 2);
  }

  public getGridOptions(): Record<string, number> {
    return { columns: 6, rows: 3, min_columns: 4, min_rows: 2 };
  }

  public disconnectedCallback(): void {
    super.disconnectedCallback();
    for (const id of Object.keys(this._installTimers)) {
      window.clearTimeout(this._installTimers[id]);
    }
    this._installTimers = {};
  }

  protected willUpdate(changed: PropertyValues): void {
    if (!changed.has('hass')) return;
    // Clear each optimistic override as soon as the real state moves.
    for (const id of Object.keys(this._installing)) {
      const stateObj = this.hass?.states[id];
      if (stateObj && stateObj.last_updated !== this._installing[id]) this._clearInstalling(id);
    }
  }

  private _clearInstalling(entityId: string): void {
    window.clearTimeout(this._installTimers[entityId]);
    delete this._installTimers[entityId];
    if (entityId in this._installing) {
      const next = { ...this._installing };
      delete next[entityId];
      this._installing = next;
    }
  }

  private _limit(): number {
    return Math.min(MAX_LIMIT, Math.max(1, Math.floor(this._config?.limit ?? DEFAULT_LIMIT)));
  }

  /**
   * Auto-discovery: add-on *state* entities only — the version and update
   * entities are paired onto the row instead of taking rows of their own,
   * following the `<base>` / `<base>_version` / `update.<base>` naming the
   * Supervisor integration uses.
   */
  private _discover(): SilkAddonConfig[] {
    const hass = this.hass!;
    const found: SilkAddonConfig[] = [];
    for (const id of Object.keys(hass.states)) {
      const domain = domainOf(id);
      if (domain !== 'sensor' && domain !== 'binary_sensor') continue;
      const lower = id.toLowerCase();
      if (!lower.includes('addon') && !lower.includes('add_on')) continue;
      if (METRIC_SUFFIX.test(lower)) continue;
      const base = lower.replace(/^[a-z_]+\./, '').replace(/_(state|status|running)$/, '');
      const pick = (...candidates: string[]): string | undefined =>
        candidates.find((candidate) => hass.states[candidate]);
      found.push({
        entity: id,
        version: pick(`sensor.${base}_version`, `sensor.${base}_current_version`),
        update: pick(`update.${base}`, `update.${base}_update`),
      });
    }
    return found;
  }

  /** Rows in display order: stopped first, then unknown, then running. */
  private _rows(): AddonRow[] {
    const hass = this.hass!;
    const configured = this._config?.addons ?? this._discover();
    const rows = configured.map((addon): AddonRow => {
      const stateObj = hass.states[addon.entity];
      const versionObj = addon.version ? hass.states[addon.version] : undefined;
      const version =
        versionObj && !isUnavailable(versionObj) && versionObj.state !== ''
          ? versionObj.state
          : undefined;
      const updateObj = addon.update ? hass.states[addon.update] : undefined;
      const installing =
        !!updateObj &&
        (Boolean(updateObj.attributes.in_progress) || updateObj.entity_id in this._installing);
      return {
        entityId: addon.entity,
        name: addon.name ?? addonName(stateObj, addon.entity),
        run: runStateOf(stateObj),
        version,
        updateId: updateObj?.entity_id,
        updatable: !!updateObj && updateObj.state === 'on' && !isUnavailable(updateObj),
        latest: updateObj?.attributes.latest_version as string | undefined,
        installing,
      };
    });
    // Stable sort keeps the configured (or discovered) order inside each band.
    return rows.sort((a, b) => RANK[a.run] - RANK[b.run]).slice(0, this._limit());
  }

  private _onRowClick(entityId: string): void {
    moreInfo(this, entityId);
  }

  private _onInstall(ev: Event, row: AddonRow): void {
    ev.stopPropagation();
    const hass = this.hass;
    const updateId = row.updateId;
    if (!hass || !updateId || row.installing) return;
    const updateObj = hass.states[updateId];
    if (!updateObj || isUnavailable(updateObj)) return;
    const target = row.latest ? ` to ${row.latest}` : '';
    if (!window.confirm(`Update ${row.name}${target}?`)) return;
    haptic(this, 'medium');
    // Optimistic: show the spinner immediately; cleared when the real state
    // update (in_progress flipping true) arrives or after 2s.
    this._installing = { ...this._installing, [updateId]: updateObj.last_updated };
    window.clearTimeout(this._installTimers[updateId]);
    this._installTimers[updateId] = window.setTimeout(
      () => this._clearInstalling(updateId),
      OPTIMISTIC_TIMEOUT_MS
    );
    hass.callService('update', 'install', { entity_id: updateId });
  }

  private _renderRow(row: AddonRow): TemplateResult {
    const hass = this.hass!;
    const stateObj = hass.states[row.entityId];
    const stateLabel = stateObj ? stateText(hass, stateObj) : 'not found';
    const title = `${row.name} · ${stateLabel}${row.version ? ` · ${row.version}` : ''}`;
    return html`
      <div class="row ${row.run}" title=${title}>
        <button
          class="body"
          aria-label=${`${row.name}: ${stateLabel}`}
          @click=${() => this._onRowClick(row.entityId)}
        >
          <span class="dot"></span>
          <span class="aname">${row.name}</span>
          ${row.version ? html`<span class="version">${row.version}</span>` : nothing}
        </button>
        ${row.installing
          ? html`
              <span class="chip active pending" title=${`Updating ${row.name}`}>
                <ha-icon class="spin" icon="mdi:loading"></ha-icon>
              </span>
            `
          : row.updatable
            ? html`
                <span
                  class="chip active"
                  title=${row.latest ? `Update available: ${row.latest}` : 'Update available'}
                  >update</span
                >
                <button
                  class="install"
                  aria-label=${`Update ${row.name}`}
                  title=${`Update ${row.name}`}
                  @click=${(ev: Event) => this._onInstall(ev, row)}
                >
                  <ha-icon .icon=${'mdi:download'}></ha-icon>
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

    const rows = this._rows();
    const running = rows.filter((row) => row.run === 'running').length;
    const updates = rows.filter((row) => row.updatable).length;

    return html`
      <ha-card class="control" style="--silk-accent:${accentFor(undefined, config.color)}">
        <div class="header">
          <div class="hname">${config.name ?? DEFAULT_NAME}</div>
          <span class="count">${running} running</span>
          ${updates ? html`<span class="chip active">${updates} updates</span>` : nothing}
        </div>
        ${rows.length
          ? html`<div class="rows">${rows.map((row) => this._renderRow(row))}</div>`
          : html`<div class="note">No add-on entities found</div>`}
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
        align-items: center;
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
      .count {
        flex: none;
        font-size: 11px;
        font-weight: 600;
        color: var(--secondary-text-color);
        font-variant-numeric: tabular-nums;
        white-space: nowrap;
      }
      .chip {
        flex: none;
        cursor: default;
        font-variant-numeric: tabular-nums;
      }
      .chip:hover {
        background: color-mix(in srgb, var(--silk-accent) 16%, transparent);
      }
      .chip.pending {
        display: inline-grid;
        place-items: center;
        padding: 4px 7px;
      }
      .chip ha-icon {
        --mdc-icon-size: 14px;
        display: block;
      }
      /* Real activity, not decoration: the spinner marks a running install. */
      .spin {
        animation: silk-addons-spin 900ms linear infinite;
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
        min-height: 38px;
        padding: 0 6px;
        border-radius: 10px;
        border: 1px solid transparent;
        transition: border-color 200ms ease;
      }
      /* A stopped add-on carries a hairline of its own — a border, never a glow. */
      .row.stopped {
        border-color: color-mix(in srgb, var(--error-color, #db4437) 35%, transparent);
        background: color-mix(in srgb, var(--error-color, #db4437) 6%, transparent);
      }
      .row.unknown .aname,
      .row.unknown .version {
        opacity: 0.45;
      }
      .body {
        flex: 1;
        min-width: 0;
        display: flex;
        align-items: baseline;
        gap: 8px;
        margin: 0;
        padding: 4px;
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
      .body:hover {
        background: rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.05);
      }
      .body:focus-visible {
        box-shadow: inset 0 0 0 2px color-mix(in srgb, var(--silk-accent) 70%, transparent);
      }
      .dot {
        flex: none;
        align-self: center;
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background: rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.3);
        transition: background 200ms ease;
      }
      .row.running .dot {
        background: var(--success-color, #43a047);
      }
      .row.stopped .dot {
        background: var(--error-color, #db4437);
      }
      .aname {
        flex: 0 1 auto;
        min-width: 0;
        font-size: 13px;
        font-weight: 500;
        line-height: 1.3;
        color: var(--primary-text-color);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .version {
        flex: none;
        max-width: 40%;
        font-size: 11px;
        line-height: 1.3;
        color: var(--secondary-text-color);
        font-variant-numeric: tabular-nums;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .install {
        flex: none;
        position: relative;
        display: grid;
        place-items: center;
        width: 28px;
        height: 28px;
        margin: 0;
        padding: 0;
        border: none;
        border-radius: 9px;
        cursor: pointer;
        color: var(--silk-accent);
        background: color-mix(in srgb, var(--silk-accent) 16%, transparent);
        transition:
          transform 250ms var(--silk-spring),
          background 150ms ease-out;
      }
      /* Invisible halo lifts the touch target past 40px without growing the key. */
      .install::after {
        content: '';
        position: absolute;
        inset: -7px;
        border-radius: 12px;
      }
      .install:hover {
        background: color-mix(in srgb, var(--silk-accent) 26%, transparent);
      }
      .install:active {
        transform: scale(0.9);
        transition-duration: 120ms;
        transition-timing-function: var(--silk-ease-out);
      }
      .install:focus-visible {
        outline: 2px solid color-mix(in srgb, var(--silk-accent) 70%, transparent);
        outline-offset: 2px;
      }
      .install ha-icon {
        --mdc-icon-size: 16px;
        pointer-events: none;
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
      @keyframes silk-addons-spin {
        to {
          transform: rotate(360deg);
        }
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    'silk-addons-card': SilkAddonsCard;
  }
}
