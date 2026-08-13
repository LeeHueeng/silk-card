import { LitElement, html, css, nothing, TemplateResult } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { HomeAssistant, HassEntity, LovelaceCardConfig } from '../types';
import { silkControlStyles } from '../shared/base';
import { isUnavailable, toggleEntity, moreInfo, haptic } from '../shared/service';
import { accentFor } from '../shared/color';
import { registerEditor } from '../shared/editor';
import { formatNumber } from '../format';

export const META = {
  type: 'silk-backup-card',
  name: 'Silk Backups',
  description: 'When each job last succeeded.',
};

/** One backup job: a name plus whichever sensors the integration exposes. */
export interface BackupJobConfig {
  name: string;
  /** Job state entity — ok / failed / running. */
  state?: string;
  /** Timestamp entity for the last successful run. */
  last?: string;
  /** Size of the last archive. */
  size?: string;
  /** How long the last run took. */
  duration?: string;
  /** Script or button that starts the job on demand. */
  run?: string;
}

export interface SilkBackupCardConfig extends LovelaceCardConfig {
  /** YAML-only: the jobs this card watches. */
  jobs: BackupJobConfig[];
  /** Hours since the last success after which a job reads stale. Default 36. */
  stale_hours?: number;
  name?: string;
  /** Accent override. */
  color?: string;
}

type JobStatus = 'ok' | 'failed' | 'running' | 'unknown';

const DEFAULT_STALE_HOURS = 36;
const HOUR_MS = 3_600_000;
/** Re-render cadence so the relative stamps never go stale. */
const CLOCK_TICK_MS = 30_000;
const ROW_HEIGHT = 38;

const RUNNING_STATES = new Set([
  'running',
  'in_progress',
  'backing_up',
  'creating',
  'busy',
  'active',
  'started',
]);
const FAILED_STATES = new Set(['failed', 'fail', 'error', 'problem', 'unhealthy', 'aborted']);
const OK_STATES = new Set([
  'ok',
  'success',
  'succeeded',
  'successful',
  'completed',
  'complete',
  'done',
  'idle',
  'healthy',
  'clear',
  'off',
]);

const EDITOR_TAG = 'silk-backup-card-editor';

// Jobs stay YAML-only — five nested entity pickers per row would dwarf the
// card; the editor owns the title and the staleness threshold.
registerEditor(
  EDITOR_TAG,
  [
    { name: 'name', selector: { text: {} } },
    { name: 'stale_hours', selector: { number: { min: 1, mode: 'box' } } },
  ],
  { name: 'Name', stale_hours: 'Stale after (hours)' },
  { name: 'Backups', stale_hours: DEFAULT_STALE_HOURS }
);

/** '45m' · '6h' · '2d' — the compact age used in rows and in the header. */
function ageLabel(ms: number): string {
  const sec = Math.max(0, ms / 1000);
  if (sec < 3600) return `${Math.max(1, Math.floor(sec / 60))}m`;
  if (sec < 86400) return `${Math.floor(sec / 3600)}h`;
  return `${Math.floor(sec / 86400)}d`;
}

/** ISO stamps, epoch seconds and epoch millis all appear in the wild. */
function stampToMs(stateObj?: HassEntity): number | null {
  if (!stateObj || isUnavailable(stateObj) || stateObj.state.trim() === '') return null;
  const raw = stateObj.state.trim();
  const parsed = Date.parse(raw);
  if (Number.isFinite(parsed)) return parsed;
  const numeric = Number(raw);
  if (!Number.isFinite(numeric)) return null;
  return numeric > 1e12 ? numeric : numeric * 1000;
}

/** Everything a job row needs, resolved once per render. */
interface JobRow {
  cfg: BackupJobConfig;
  status: JobStatus;
  /** Last success, epoch ms; null when nothing in the config can say. */
  lastMs: number | null;
  /** True when the last success is older than `stale_hours`. */
  stale: boolean;
  /** 'last 6h ago · 4.2 GB · 12m'. */
  meta: string;
  /** more-info target, when the job is entity-backed. */
  target?: string;
  dead: boolean;
}

/**
 * The backup board: one row per job, status dot first, then the only two facts
 * that matter afterwards — when it last succeeded and how big it was. Jobs
 * that have gone quiet longer than the threshold turn warning and float up,
 * because a backup that silently stopped running is the failure mode.
 */
@customElement('silk-backup-card')
export class SilkBackupCard extends LitElement {
  @property({ attribute: false }) public hass?: HomeAssistant;

  @state() private _config?: SilkBackupCardConfig;
  /** Clock the age math is resolved against. */
  @state() private _now = Date.now();

  private _clockTimer?: number;

  public static getStubConfig(hass: HomeAssistant): Partial<SilkBackupCardConfig> {
    const last = Object.keys(hass.states).find(
      (id) =>
        id.startsWith('sensor.') &&
        /backup/i.test(id) &&
        (hass.states[id].attributes.device_class === 'timestamp' ||
          Number.isFinite(Date.parse(hass.states[id].state)))
    );
    return {
      type: 'custom:silk-backup-card',
      jobs: [{ name: 'Home Assistant', last }],
    };
  }

  public static async getConfigElement(): Promise<HTMLElement> {
    return document.createElement(EDITOR_TAG);
  }

  public setConfig(config: SilkBackupCardConfig): void {
    if (!Array.isArray(config.jobs) || config.jobs.length === 0) {
      throw new Error(
        'silk-backup-card: `jobs` is required — a list of {name, state?, last?, size?, duration?, run?}'
      );
    }
    config.jobs.forEach((job, i) => {
      if (!job || typeof job.name !== 'string' || job.name === '') {
        throw new Error(`silk-backup-card: jobs[${i}] needs a \`name\``);
      }
      for (const key of ['state', 'last', 'size', 'duration', 'run'] as const) {
        const value = job[key];
        if (value !== undefined && typeof value !== 'string') {
          throw new Error(`silk-backup-card: jobs[${i}].${key} must be an entity id`);
        }
      }
    });
    if (config.stale_hours !== undefined && !(Number(config.stale_hours) > 0)) {
      throw new Error('silk-backup-card: `stale_hours` must be a positive number');
    }
    this._config = config;
    this._now = Date.now();
  }

  public getCardSize(): number {
    return Math.max(3, 1 + Math.ceil((this._config?.jobs.length ?? 3) / 2));
  }

  public getGridOptions(): Record<string, number> {
    return { columns: 6, rows: 3, min_columns: 4, min_rows: 2 };
  }

  public connectedCallback(): void {
    super.connectedCallback();
    this._now = Date.now();
    this._clockTimer = window.setInterval(() => {
      this._now = Date.now();
    }, CLOCK_TICK_MS);
  }

  public disconnectedCallback(): void {
    super.disconnectedCallback();
    window.clearInterval(this._clockTimer);
  }

  private _staleHours(): number {
    return Number(this._config?.stale_hours) > 0
      ? Number(this._config!.stale_hours)
      : DEFAULT_STALE_HOURS;
  }

  /**
   * Job status across integrations: binary_sensor device classes first (their
   * on/off meaning is declared), then the state vocabularies everyone else
   * uses. Anything unrecognized stays 'unknown' rather than guessing.
   */
  private _status(stateObj?: HassEntity): JobStatus {
    if (!stateObj || isUnavailable(stateObj)) return 'unknown';
    const state = stateObj.state.trim().toLowerCase();
    const deviceClass = String(stateObj.attributes.device_class ?? '');
    if (deviceClass === 'problem' || deviceClass === 'safety') {
      return state === 'on' ? 'failed' : 'ok';
    }
    if (deviceClass === 'running') {
      return state === 'on' ? 'running' : 'ok';
    }
    if (RUNNING_STATES.has(state)) return 'running';
    if (FAILED_STATES.has(state)) return 'failed';
    if (OK_STATES.has(state)) return 'ok';
    return 'unknown';
  }

  /** '4.2 GB' — the size sensor's own number and unit, formatted for a row. */
  private _sizeText(entityId?: string): string | null {
    const stateObj = entityId ? this.hass?.states[entityId] : undefined;
    if (!stateObj || isUnavailable(stateObj) || stateObj.state.trim() === '') return null;
    const value = Number(stateObj.state);
    const unit = String(stateObj.attributes.unit_of_measurement ?? '').trim();
    if (!Number.isFinite(value)) return stateObj.state.trim();
    const num = formatNumber(this.hass, stateObj.entity_id, value);
    return unit ? `${num} ${unit}` : num;
  }

  /** '12m' from a numeric duration sensor, or whatever text it reports. */
  private _durationText(entityId?: string): string | null {
    const stateObj = entityId ? this.hass?.states[entityId] : undefined;
    if (!stateObj || isUnavailable(stateObj) || stateObj.state.trim() === '') return null;
    const value = Number(stateObj.state);
    if (!Number.isFinite(value)) return stateObj.state.trim();
    const unit = String(stateObj.attributes.unit_of_measurement ?? '')
      .trim()
      .toLowerCase();
    // Bare numbers are seconds; hours and minutes announce themselves.
    const seconds = unit.startsWith('h')
      ? value * 3600
      : unit.startsWith('min') || unit === 'm'
        ? value * 60
        : value;
    if (seconds < 60) return `${Math.round(seconds)}s`;
    if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
    const hours = Math.floor(seconds / 3600);
    return `${hours}h ${Math.round((seconds % 3600) / 60)}m`;
  }

  private _row(cfg: BackupJobConfig): JobRow {
    const hass = this.hass!;
    const stateObj = cfg.state ? hass.states[cfg.state] : undefined;
    const status = this._status(stateObj);
    const lastMs = stampToMs(cfg.last ? hass.states[cfg.last] : undefined);
    const stale = lastMs !== null && this._now - lastMs > this._staleHours() * HOUR_MS;
    const parts: string[] = [];
    if (status === 'running') parts.push('running now');
    else if (lastMs !== null) parts.push(`last ${ageLabel(this._now - lastMs)} ago`);
    else if (status === 'failed') parts.push('last run failed');
    const size = this._sizeText(cfg.size);
    if (size) parts.push(size);
    const duration = this._durationText(cfg.duration);
    if (duration) parts.push(duration);
    const ids = [cfg.state, cfg.last, cfg.size, cfg.duration].filter(
      (id): id is string => typeof id === 'string' && id !== ''
    );
    return {
      cfg,
      status,
      lastMs,
      stale,
      meta: parts.join(' · ') || 'no data',
      target: cfg.state ?? ids[0],
      dead: ids.length > 0 && ids.every((id) => isUnavailable(hass.states[id])),
    };
  }

  /** Gone-quiet jobs first, then failures, then oldest success first. */
  private _rows(): JobRow[] {
    const rank = (row: JobRow): number =>
      row.stale ? 0 : row.status === 'failed' ? 1 : row.status === 'running' ? 2 : 3;
    return this._config!.jobs.map((cfg) => this._row(cfg)).sort((a, b) => {
      const diff = rank(a) - rank(b);
      if (diff !== 0) return diff;
      if (a.lastMs === null && b.lastMs === null) return a.cfg.name.localeCompare(b.cfg.name);
      if (a.lastMs === null) return 1;
      if (b.lastMs === null) return -1;
      return a.lastMs - b.lastMs || a.cfg.name.localeCompare(b.cfg.name);
    });
  }

  private _onRowClick(ev: Event, target?: string): void {
    ev.stopPropagation();
    if (target) moreInfo(this, target);
  }

  private _onRunClick(ev: Event, row: JobRow): void {
    ev.stopPropagation();
    const hass = this.hass;
    const runId = row.cfg.run;
    if (!hass || !runId) return;
    const stateObj = hass.states[runId];
    if (!stateObj || isUnavailable(stateObj)) return;
    // A backup run is expensive and non-idempotent — always ask first.
    if (!window.confirm(`Run backup "${row.cfg.name}" now?`)) return;
    haptic(this);
    toggleEntity(hass, runId);
  }

  private _renderRow(row: JobRow): TemplateResult {
    const tone = row.status === 'failed' ? 'failed' : row.stale ? 'stale' : row.status;
    const runObj = row.cfg.run ? this.hass?.states[row.cfg.run] : undefined;
    return html`
      <div class="row ${row.dead ? 'unavailable' : ''}">
        <button
          class="main"
          title=${row.cfg.name}
          aria-label=${`${row.cfg.name}: ${row.status}, ${row.meta}`}
          @click=${(ev: Event) => this._onRowClick(ev, row.target)}
        >
          ${row.status === 'running'
            ? html`<span class="spin" aria-hidden="true"></span>`
            : html`<span class="dot ${tone}"></span>`}
          <span class="info">
            <span class="jname">${row.cfg.name}</span>
            <span
              class="meta ${row.stale && row.status !== 'failed' ? 'warn' : ''} ${row.status ===
              'failed'
                ? 'bad'
                : ''}"
            >
              ${row.meta}
            </span>
          </span>
        </button>
        ${row.cfg.run
          ? html`<button
              class="run"
              aria-label=${`Run ${row.cfg.name} now`}
              title="Run now"
              .disabled=${isUnavailable(runObj)}
              @click=${(ev: Event) => this._onRunClick(ev, row)}
            >
              <ha-icon icon="mdi:play"></ha-icon>
            </button>`
          : nothing}
      </div>
    `;
  }

  protected render(): TemplateResult | typeof nothing {
    const config = this._config;
    const hass = this.hass;
    if (!config || !hass) return nothing;

    const rows = this._rows();
    const oldest = rows.reduce<number | null>(
      (acc, row) => (row.lastMs === null ? acc : acc === null ? row.lastMs : Math.min(acc, row.lastMs)),
      null
    );
    const staleCount = rows.filter((row) => row.stale).length;
    const count = rows.length;
    const summary =
      oldest === null
        ? `${count} ${count === 1 ? 'job' : 'jobs'}`
        : `${count} ${count === 1 ? 'job' : 'jobs'} · oldest ${ageLabel(this._now - oldest)}`;
    const firstObj = config.jobs
      .map((job) => (job.state ? hass.states[job.state] : undefined))
      .find((obj) => obj !== undefined);
    const accent = accentFor(firstObj, config.color);
    const title = config.name ?? 'Backups';

    return html`
      <ha-card class="control" style="--silk-accent:${accent}">
        <div class="header">
          <div class="hname" title=${title}>${title}</div>
          <span class="summary ${staleCount > 0 ? 'warn' : ''}">${summary}</span>
        </div>
        <div class="rows">${rows.map((row) => this._renderRow(row))}</div>
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
      .header {
        flex: none;
        display: flex;
        align-items: baseline;
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
      .summary {
        flex: 1;
        min-width: 0;
        font-size: 11px;
        font-weight: 500;
        line-height: 1.3;
        color: var(--secondary-text-color);
        font-variant-numeric: tabular-nums;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        transition: color 200ms ease;
      }
      .summary.warn {
        color: var(--warning-color, #ffa600);
      }
      .rows {
        display: flex;
        flex-direction: column;
        margin: 0 -6px;
      }
      /* The row is a container so the run button is a sibling, not nested. */
      .row {
        display: flex;
        align-items: center;
        gap: 6px;
        min-width: 0;
        min-height: ${ROW_HEIGHT}px;
      }
      .row.unavailable {
        opacity: 0.45;
      }
      .main {
        flex: 1;
        display: flex;
        align-items: center;
        gap: 10px;
        min-width: 0;
        min-height: 34px;
        margin: 0;
        padding: 2px 6px;
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
      /* Status colors here are literally the status of the job. */
      .dot {
        flex: none;
        width: 7px;
        height: 7px;
        /* Same 10px footprint as the running ring, so rows never jitter. */
        margin: 0 1.5px;
        border-radius: 50%;
        background: rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.25);
        transition: background 200ms ease;
      }
      .dot.ok {
        background: var(--success-color, #43a047);
      }
      .dot.stale {
        background: var(--warning-color, #ffa600);
      }
      .dot.failed {
        background: var(--error-color, #db4437);
      }
      /* A job that is genuinely running is the one thing allowed to move. */
      .spin {
        flex: none;
        box-sizing: border-box;
        width: 10px;
        height: 10px;
        border-radius: 50%;
        border: 1.5px solid color-mix(in srgb, var(--silk-accent) 25%, transparent);
        border-top-color: var(--silk-accent);
        animation: silk-backup-spin 1200ms linear infinite;
      }
      .info {
        flex: 1;
        min-width: 0;
        display: flex;
        flex-direction: column;
      }
      .jname {
        min-width: 0;
        font-size: 13px;
        font-weight: 500;
        line-height: 1.3;
        color: var(--primary-text-color);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .meta {
        min-width: 0;
        font-size: 11px;
        line-height: 1.3;
        color: var(--secondary-text-color);
        font-variant-numeric: tabular-nums;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        transition: color 200ms ease;
      }
      .meta.warn {
        color: var(--warning-color, #ffa600);
      }
      .meta.bad {
        color: var(--error-color, #db4437);
      }
      .run {
        flex: none;
        width: 36px;
        height: 36px;
        padding: 0;
        border: none;
        border-radius: 12px;
        display: grid;
        place-items: center;
        cursor: pointer;
        color: var(--secondary-text-color);
        background: rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.06);
        transition:
          transform 250ms var(--silk-spring),
          background 200ms ease,
          color 200ms ease;
      }
      .run:hover {
        background: rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.12);
      }
      .run:active {
        transform: scale(0.9);
        transition-duration: 120ms;
        transition-timing-function: var(--silk-ease-out);
      }
      .run:focus-visible {
        outline: 2px solid color-mix(in srgb, var(--silk-accent) 70%, transparent);
        outline-offset: 2px;
      }
      .run:disabled {
        cursor: default;
        opacity: 0.45;
      }
      .run ha-icon {
        --mdc-icon-size: 20px;
        pointer-events: none;
      }
      @keyframes silk-backup-spin {
        to {
          transform: rotate(360deg);
        }
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    'silk-backup-card': SilkBackupCard;
  }
}
