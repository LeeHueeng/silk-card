import { LitElement, html, css, nothing, TemplateResult } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { HomeAssistant, HassEntity, LovelaceCardConfig } from '../types';
import { silkControlStyles } from '../shared/base';
import { domainOf, isUnavailable, moreInfo, haptic, stateText } from '../shared/service';
import { accentFor } from '../shared/color';
import { registerEditor } from '../shared/editor';

export const META = {
  type: 'silk-docker-card',
  name: 'Silk Containers',
  description: "What's running, what died.",
};

export interface SilkContainerConfig {
  /** State sensor (`running`/`exited`) or a binary_sensor / switch. */
  entity: string;
  name?: string;
  /** CPU usage sensor, shown as `cpu 4%`. */
  cpu?: string;
  /** Memory sensor (bytes, MB or %), shown as `210 MB`. */
  memory?: string;
  /** button / script / switch that restarts the container. */
  restart?: string;
}

export interface SilkDockerCardConfig extends LovelaceCardConfig {
  /** Containers to list. YAML-only — it is a list of objects. Omit to
   *  auto-discover entities whose id mentions docker or container. */
  containers?: SilkContainerConfig[];
  name?: string;
  /** Rows to show, defaults to 6. */
  limit?: number;
  /** Accent override. */
  color?: string;
}

type RunState = 'running' | 'down' | 'unknown';

interface ContainerRow {
  entityId: string;
  name: string;
  run: RunState;
  /** Secondary line segments — `cpu 4%`, `210 MB`, or the raw state. */
  detail: string[];
  restart?: string;
}

const DEFAULT_NAME = 'Containers';
const DEFAULT_LIMIT = 6;
const MAX_LIMIT = 20;

const RUNNING_STATES = new Set(['running', 'on', 'up', 'active', 'started', 'healthy']);
/** Sort weight — dead containers are the reason you opened this card. */
const RANK: Record<RunState, number> = { down: 0, unknown: 1, running: 2 };

/** Entity-id fragments that mark a *metric* of a container, not the container. */
const METRIC_SUFFIX =
  /_(cpu|cpu_percentage|memory|memory_percentage|mem|ram|network|network_speed_up|network_speed_down|net|rx|tx|uptime|image|version|created)$/;

/** Memory is RAM: binary steps, container-tooling labels. */
const BYTE_UNITS: Record<string, number> = {
  b: 1,
  byte: 1,
  bytes: 1,
  kb: 1024,
  kib: 1024,
  mb: 1024 ** 2,
  mib: 1024 ** 2,
  gb: 1024 ** 3,
  gib: 1024 ** 3,
  tb: 1024 ** 4,
  tib: 1024 ** 4,
};
const SIZE_LABELS = ['B', 'KB', 'MB', 'GB', 'TB'];

const EDITOR_TAG = 'silk-docker-card-editor';

// `containers` stays YAML-only (a list of objects with per-container metric
// entities); everything else the card reads is on the form.
registerEditor(
  EDITOR_TAG,
  [
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
  { name: '이름', limit: '표시 개수', color: '강조 색상' },
  { limit: DEFAULT_LIMIT }
);

function readNumber(stateObj?: HassEntity): number | undefined {
  if (!stateObj || isUnavailable(stateObj) || stateObj.state === '') return undefined;
  const value = Number(stateObj.state);
  return Number.isFinite(value) ? value : undefined;
}

/** Small numbers keep a decimal, big ones do not — `4.2%` but `37%`. */
function compact(value: number): string {
  if (Math.abs(value) >= 10) return String(Math.round(value));
  return String(Math.round(value * 10) / 10);
}

function formatSize(value: number, unit?: string): string {
  if (unit === '%') return `${compact(value)}%`;
  const bytes = value * (BYTE_UNITS[(unit ?? 'MB').trim().toLowerCase()] ?? BYTE_UNITS.mb);
  let scaled = bytes;
  let step = 0;
  while (scaled >= 1024 && step < SIZE_LABELS.length - 1) {
    scaled /= 1024;
    step += 1;
  }
  return `${compact(scaled)} ${SIZE_LABELS[step]}`;
}

function runStateOf(stateObj: HassEntity | undefined): RunState {
  if (!stateObj) return 'unknown';
  const raw = stateObj.state;
  if (raw === '' || raw === 'unknown' || raw === 'unavailable') return 'unknown';
  return RUNNING_STATES.has(raw.toLowerCase()) ? 'running' : 'down';
}

/**
 * The container list: what is running, and — first, always — what died. Rows
 * carry the two numbers you would have run `docker stats` for, and the restart
 * you would have run next.
 */
@customElement('silk-docker-card')
export class SilkDockerCard extends LitElement {
  @property({ attribute: false }) public hass?: HomeAssistant;

  @state() private _config?: SilkDockerCardConfig;

  public static getStubConfig(): Partial<SilkDockerCardConfig> {
    // No entities required — the card auto-discovers container entities.
    return { type: 'custom:silk-docker-card' };
  }

  public static async getConfigElement(): Promise<HTMLElement> {
    return document.createElement(EDITOR_TAG);
  }

  public setConfig(config: SilkDockerCardConfig): void {
    if (config.containers !== undefined) {
      if (!Array.isArray(config.containers) || config.containers.length === 0) {
        throw new Error(
          'silk-docker-card: `containers` must be a list of {entity, name?, cpu?, memory?, restart?}'
        );
      }
      for (const container of config.containers) {
        if (
          !container ||
          typeof container !== 'object' ||
          typeof container.entity !== 'string' ||
          !container.entity.includes('.')
        ) {
          throw new Error('silk-docker-card: every container needs an `entity` id');
        }
      }
    }
    if (config.limit !== undefined && (!Number.isFinite(config.limit) || config.limit < 1)) {
      throw new Error('silk-docker-card: `limit` must be a number of at least 1');
    }
    this._config = config;
  }

  public getCardSize(): number {
    return 2 + Math.ceil(this._limit() / 2);
  }

  public getGridOptions(): Record<string, number> {
    return { columns: 6, rows: 3, min_columns: 4, min_rows: 2 };
  }

  private _limit(): number {
    return Math.min(MAX_LIMIT, Math.max(1, Math.floor(this._config?.limit ?? DEFAULT_LIMIT)));
  }

  /**
   * Auto-discovery: container *state* entities only — the per-container cpu and
   * memory sensors are paired onto the row instead of taking rows of their own,
   * following the `<base>_state` / `<base>_cpu` / `<base>_memory` naming the
   * common Docker integrations use.
   */
  private _discover(): SilkContainerConfig[] {
    const hass = this.hass!;
    const found: SilkContainerConfig[] = [];
    for (const id of Object.keys(hass.states)) {
      const domain = domainOf(id);
      if (domain !== 'sensor' && domain !== 'binary_sensor' && domain !== 'switch') continue;
      const lower = id.toLowerCase();
      if (!lower.includes('docker') && !lower.includes('container')) continue;
      if (METRIC_SUFFIX.test(lower)) continue;
      const base = lower.replace(/^[a-z_]+\./, '').replace(/_(status|state|running)$/, '');
      const sibling = (suffix: string): string | undefined =>
        [`sensor.${base}_${suffix}`].find((candidate) => hass.states[candidate]);
      found.push({
        entity: id,
        cpu: sibling('cpu'),
        memory: sibling('memory') ?? sibling('memory_percentage'),
      });
    }
    return found;
  }

  /** Rows in display order: down first, then unknown, then running. */
  private _rows(): ContainerRow[] {
    const hass = this.hass!;
    const configured = this._config?.containers ?? this._discover();
    const rows = configured.map((container): ContainerRow => {
      const stateObj = hass.states[container.entity];
      const run = runStateOf(stateObj);
      const detail: string[] = [];
      if (run !== 'running' && stateObj) detail.push(stateText(hass, stateObj));
      const cpu = readNumber(hass.states[container.cpu ?? '']);
      if (cpu !== undefined) detail.push(`cpu ${compact(cpu)}%`);
      const memObj = container.memory ? hass.states[container.memory] : undefined;
      const memory = readNumber(memObj);
      if (memory !== undefined) {
        detail.push(formatSize(memory, memObj?.attributes.unit_of_measurement as string | undefined));
      }
      if (!detail.length) detail.push(stateObj ? stateText(hass, stateObj) : 'not found');
      return {
        entityId: container.entity,
        name: container.name ?? stateObj?.attributes.friendly_name ?? container.entity,
        run,
        detail,
        restart: container.restart,
      };
    });
    // Stable sort keeps the configured order inside each band.
    return rows.sort((a, b) => RANK[a.run] - RANK[b.run]).slice(0, this._limit());
  }

  private _onRowClick(entityId: string): void {
    moreInfo(this, entityId);
  }

  /**
   * Restart is a one-way action, so it only ever *starts* something: a button is
   * pressed, everything else is turned on. A blind toggle would stop a running
   * container instead of restarting it.
   */
  private _onRestart(ev: Event, row: ContainerRow): void {
    ev.stopPropagation();
    const hass = this.hass;
    if (!hass || !row.restart) return;
    const stateObj = hass.states[row.restart];
    if (!stateObj || isUnavailable(stateObj)) return;
    if (!window.confirm(`Restart ${row.name}?`)) return;
    haptic(this, 'medium');
    const domain = domainOf(row.restart);
    const data = { entity_id: row.restart };
    if (domain === 'button' || domain === 'input_button') {
      hass.callService(domain, 'press', data);
    } else if (domain === 'scene') {
      hass.callService('scene', 'turn_on', data);
    } else {
      hass.callService(domain, 'turn_on', data);
    }
  }

  private _renderRow(row: ContainerRow): TemplateResult {
    const detail = row.detail.join(' · ');
    return html`
      <div class="row ${row.run}" title=${`${row.name} · ${detail}`}>
        <button
          class="body"
          aria-label=${`${row.name}: ${detail}`}
          @click=${() => this._onRowClick(row.entityId)}
        >
          <span class="dot"></span>
          <span class="info">
            <span class="cname">${row.name}</span>
            <span class="detail">${detail}</span>
          </span>
        </button>
        ${row.restart
          ? html`
              <button
                class="restart"
                aria-label=${`Restart ${row.name}`}
                title=${`Restart ${row.name}`}
                @click=${(ev: Event) => this._onRestart(ev, row)}
              >
                <ha-icon .icon=${'mdi:restart'}></ha-icon>
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
    const down = rows.filter((row) => row.run === 'down').length;

    return html`
      <ha-card class="control" style="--silk-accent:${accentFor(undefined, config.color)}">
        <div class="header">
          <div class="hname">${config.name ?? DEFAULT_NAME}</div>
          <span class="count">${running} running</span>
          ${down ? html`<span class="chip active">${down} down</span>` : nothing}
        </div>
        ${rows.length
          ? html`<div class="rows">${rows.map((row) => this._renderRow(row))}</div>`
          : html`<div class="note">No container entities found</div>`}
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
      /* A dead container carries a hairline of its own — a border, never a glow. */
      .row.down {
        border-color: color-mix(in srgb, var(--error-color, #db4437) 35%, transparent);
        background: color-mix(in srgb, var(--error-color, #db4437) 6%, transparent);
      }
      .row.unknown .info {
        opacity: 0.45;
      }
      .body {
        flex: 1;
        min-width: 0;
        display: flex;
        align-items: center;
        gap: 10px;
        margin: 0;
        padding: 4px 4px;
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
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background: rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.3);
        transition: background 200ms ease;
      }
      .row.running .dot {
        background: var(--success-color, #43a047);
      }
      .row.down .dot {
        background: var(--error-color, #db4437);
      }
      .info {
        flex: 1;
        min-width: 0;
        display: block;
      }
      .cname {
        display: block;
        font-size: 13px;
        font-weight: 500;
        line-height: 1.3;
        color: var(--primary-text-color);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .detail {
        display: block;
        font-size: 11px;
        line-height: 1.3;
        color: var(--secondary-text-color);
        font-variant-numeric: tabular-nums;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .restart {
        flex: none;
        position: relative;
        display: grid;
        place-items: center;
        width: 32px;
        height: 32px;
        margin: 0;
        padding: 0;
        border: none;
        border-radius: 10px;
        cursor: pointer;
        color: var(--secondary-text-color);
        background: rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.06);
        transition:
          transform 250ms var(--silk-spring),
          background 150ms ease-out,
          color 150ms ease-out;
      }
      /* Invisible halo lifts the touch target past 40px without growing the key. */
      .restart::after {
        content: '';
        position: absolute;
        inset: -5px;
        border-radius: 12px;
      }
      .restart:hover {
        color: var(--silk-accent);
        background: color-mix(in srgb, var(--silk-accent) 16%, transparent);
      }
      .restart:active {
        transform: scale(0.9);
        transition-duration: 120ms;
        transition-timing-function: var(--silk-ease-out);
      }
      .restart:focus-visible {
        outline: 2px solid color-mix(in srgb, var(--silk-accent) 70%, transparent);
        outline-offset: 2px;
      }
      .restart ha-icon {
        --mdc-icon-size: 18px;
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
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    'silk-docker-card': SilkDockerCard;
  }
}
