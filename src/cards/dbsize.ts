import { LitElement, html, css, nothing, PropertyValues, TemplateResult } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { HomeAssistant, HassEntity, LovelaceCardConfig } from '../types';
import { silkControlStyles } from '../shared/base';
import { isUnavailable, moreInfo, haptic, stateText, clamp } from '../shared/service';
import { accentFor } from '../shared/color';
import { registerEditor } from '../shared/editor';

export const META = {
  type: 'silk-database-card',
  name: 'Silk Database',
  description: 'How fat the recorder got.',
};

export interface SilkDatabaseCardConfig extends LovelaceCardConfig {
  /** Recorder database size sensor (MiB by default — the recorder's own unit). */
  size: string;
  /** Row-count sensor, shown as `18.4M rows`. */
  rows?: string;
  /** Recorder `purge_keep_days`, shown as `keeps 10 days` and sent on purge. */
  purge_days?: number;
  /** Sensor holding the oldest recorded timestamp (or an age in days). */
  oldest?: string;
  /** Bar reference in GB. Default 8. */
  max_size?: number;
  /** Show the purge button. Setting `purge_service` also turns it on. */
  purge?: boolean;
  /** Service the purge button calls. Default `recorder.purge`. */
  purge_service?: string;
  name?: string;
  /** Accent override. */
  color?: string;
}

/**
 * Row from `recorder/statistics_during_period` — Silk's minimal HomeAssistant
 * type doesn't model recorder responses, so it is typed locally. A size sensor
 * is a measurement, so it carries `mean` (with `max` as the fallback).
 */
interface StatisticsRow {
  start: number | string;
  mean?: number | null;
  max?: number | null;
}

const DEFAULT_MAX_GB = 8;
const DEFAULT_PURGE_SERVICE = 'recorder.purge';
/** Fill tiers — a database eating the disk is real status, not decoration. */
const WARN_FRACTION = 0.75;
const ERROR_FRACTION = 0.9;
const GROWTH_DAYS = 7;
/** Daily statistics only move once an hour; a slow poll is plenty. */
const REFRESH_INTERVAL_MS = 1_800_000;
/** How long the purge button stays acknowledged after firing. */
const SENT_MS = 3000;

const SIZE_LABELS = ['B', 'KB', 'MB', 'GB', 'TB'];
/** Database size is disk: binary steps, the labels the tooling prints. */
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
const GB = 1024 ** 3;

const EDITOR_TAG = 'silk-database-card-editor';

// `purge_service` is on the form but never defaulted: writing it also turns the
// purge button on, so an empty field has to keep meaning `recorder.purge`.
registerEditor(
  EDITOR_TAG,
  [
    { name: 'size', required: true, selector: { entity: { domain: ['sensor'] } } },
    {
      name: '',
      type: 'grid',
      schema: [
        { name: 'rows', selector: { entity: { domain: ['sensor'] } } },
        { name: 'oldest', selector: { entity: { domain: ['sensor'] } } },
      ],
    },
    {
      name: '',
      type: 'grid',
      schema: [
        { name: 'purge_days', selector: { number: { min: 1, max: 3650, mode: 'box' } } },
        { name: 'max_size', selector: { number: { min: 0.1, step: 0.1, mode: 'box' } } },
      ],
    },
    {
      name: '',
      type: 'grid',
      schema: [
        { name: 'name', selector: { text: {} } },
        { name: 'color', selector: { ui_color: {} } },
      ],
    },
    { name: 'purge', selector: { boolean: {} } },
    { name: 'purge_service', selector: { text: {} } },
  ],
  {
    size: '데이터베이스 크기 센서',
    rows: '행 수 센서',
    oldest: '가장 오래된 기록 센서',
    purge_days: '보관 일수',
    max_size: '막대 최대치(GB)',
    name: '이름',
    color: '강조 색상',
    purge: '정리 버튼 표시',
    purge_service: `정리 서비스 (비우면 ${DEFAULT_PURGE_SERVICE})`,
  },
  { max_size: DEFAULT_MAX_GB }
);

const finite = (value: unknown): number =>
  typeof value === 'number' && Number.isFinite(value) ? value : NaN;

function unitFactor(unit?: string): number {
  // The recorder's own database sensor reports MiB, so that is the assumption
  // when an entity forgets to declare a unit.
  return BYTE_UNITS[String(unit ?? 'MiB').trim().toLowerCase()] ?? BYTE_UNITS.mib;
}

/** Numeric state, NaN when the entity is missing/unavailable/non-numeric. */
function numericState(stateObj?: HassEntity): number {
  if (!stateObj || isUnavailable(stateObj) || stateObj.state === '') return NaN;
  return Number(stateObj.state);
}

/**
 * Recorder health in one card: how big the database is, how fast it grows,
 * and — when you ask for it — the purge you would have run next.
 */
@customElement('silk-database-card')
export class SilkDatabaseCard extends LitElement {
  @property({ attribute: false }) public hass?: HomeAssistant;

  @state() private _config?: SilkDatabaseCardConfig;
  /** Growth per week in the size entity's own unit; null until known. */
  @state() private _growth: number | null = null;
  /** True when the statistics call itself failed (not merely empty). */
  @state() private _statsFailed = false;
  @state() private _repack = false;
  @state() private _purgeSent = false;
  /** False for the first paint so the meter fills in from empty on mount. */
  @state() private _drawn = false;

  private _fetchStarted = false;
  private _fetchSeq = 0;
  private _intervalTimer?: number;
  private _sentTimer?: number;

  public static getStubConfig(hass: HomeAssistant): Partial<SilkDatabaseCardConfig> {
    const ids = Object.keys(hass.states).filter((id) => id.startsWith('sensor.'));
    const size =
      ids.find((id) => id.includes('database') && id.includes('size')) ??
      ids.find((id) => hass.states[id].attributes.device_class === 'data_size') ??
      ids.find((id) => id.includes('database'));
    return { type: 'custom:silk-database-card', size };
  }

  public static async getConfigElement(): Promise<HTMLElement> {
    return document.createElement(EDITOR_TAG);
  }

  public setConfig(config: SilkDatabaseCardConfig): void {
    if (!config.size) {
      throw new Error('silk-database-card: `size` (the database size sensor) is required');
    }
    if (config.max_size !== undefined && !(Number(config.max_size) > 0)) {
      throw new Error('silk-database-card: `max_size` must be a positive number of GB');
    }
    if (config.purge_days !== undefined && !(Number(config.purge_days) > 0)) {
      throw new Error('silk-database-card: `purge_days` must be a positive number of days');
    }
    if (config.purge_service !== undefined && !String(config.purge_service).includes('.')) {
      throw new Error('silk-database-card: `purge_service` must look like `domain.service`');
    }
    this._config = config;
    this._growth = null;
    this._statsFailed = false;
    this._fetchStarted = false;
  }

  public getCardSize(): number {
    return 2;
  }

  public getGridOptions(): Record<string, number> {
    return { columns: 6, rows: 2, min_columns: 4, min_rows: 2 };
  }

  public connectedCallback(): void {
    super.connectedCallback();
    this._intervalTimer = window.setInterval(() => this._refreshGrowth(), REFRESH_INTERVAL_MS);
    if (this.hasUpdated && this._fetchStarted) this._refreshGrowth();
  }

  public disconnectedCallback(): void {
    super.disconnectedCallback();
    window.clearInterval(this._intervalTimer);
    window.clearTimeout(this._sentTimer);
    this._sentTimer = undefined;
  }

  protected firstUpdated(): void {
    // Commit one frame at zero width so the meter transition sweeps in.
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        this._drawn = true;
      });
    });
  }

  protected willUpdate(_changed: PropertyValues): void {
    if (!this.hass || !this._config || this._fetchStarted) return;
    this._fetchStarted = true;
    this._refreshGrowth();
  }

  /** Weekly growth from 7 days of daily statistics on the size entity. */
  private async _refreshGrowth(): Promise<void> {
    const hass = this.hass;
    const config = this._config;
    if (!hass || !config) return;
    const seq = ++this._fetchSeq;
    const end = new Date();
    const start = new Date(end.getTime() - GROWTH_DAYS * 86_400_000);
    let resp: Record<string, StatisticsRow[]>;
    try {
      resp = await hass.callWS<Record<string, StatisticsRow[]>>({
        type: 'recorder/statistics_during_period',
        start_time: start.toISOString(),
        end_time: end.toISOString(),
        statistic_ids: [config.size],
        period: 'day',
        types: ['mean', 'max'],
      });
    } catch (err) {
      console.warn('silk-database-card: statistics fetch failed', err);
      if (seq === this._fetchSeq) {
        this._growth = null;
        this._statsFailed = true;
      }
      return;
    }
    if (seq !== this._fetchSeq) return; // a newer fetch superseded this one
    this._statsFailed = false;
    const points = (resp?.[config.size] ?? [])
      .map((row) => {
        const t = typeof row.start === 'number' ? row.start : Date.parse(String(row.start));
        const mean = finite(row.mean);
        return { t, v: Number.isFinite(mean) ? mean : finite(row.max) };
      })
      .filter((p) => Number.isFinite(p.t) && Number.isFinite(p.v))
      .sort((a, b) => a.t - b.t);
    if (points.length < 2) {
      this._growth = null;
      return;
    }
    const first = points[0];
    const last = points[points.length - 1];
    const spanDays = (last.t - first.t) / 86_400_000;
    // Under half a day of history the slope is noise, not a trend.
    this._growth = spanDays >= 0.5 ? ((last.v - first.v) / spanDays) * 7 : null;
  }

  private _locale(): string {
    return this.hass?.locale?.language ?? this.hass?.language ?? 'en';
  }

  private _num(value: number, digits: number): string {
    return new Intl.NumberFormat(this._locale(), {
      minimumFractionDigits: digits,
      maximumFractionDigits: digits,
    }).format(value);
  }

  /** Bytes → '4.2 GB'. Big numbers drop the decimal, small ones keep it. */
  private _bytes(bytes: number): string {
    if (!Number.isFinite(bytes)) return '—';
    let scaled = Math.abs(bytes);
    let step = 0;
    while (scaled >= 1024 && step < SIZE_LABELS.length - 1) {
      scaled /= 1024;
      step += 1;
    }
    const digits = step === 0 || scaled >= 100 ? 0 : 1;
    return `${this._num(scaled, digits)} ${SIZE_LABELS[step]}`;
  }

  /** 18400000 → '18.4M'. Row counts are read at a glance, never in full. */
  private _count(value: number): string {
    if (!Number.isFinite(value)) return '—';
    const abs = Math.abs(value);
    if (abs >= 1e9) return `${this._num(value / 1e9, 1)}B`;
    if (abs >= 1e6) return `${this._num(value / 1e6, 1)}M`;
    if (abs >= 1e3) return `${this._num(value / 1e3, 1)}k`;
    return this._num(value, 0);
  }

  /** 'oldest 12d' from a timestamp state, or from a plain age in days. */
  private _oldestText(): string | undefined {
    const id = this._config?.oldest;
    const stateObj = id ? this.hass?.states[id] : undefined;
    if (!stateObj || isUnavailable(stateObj) || stateObj.state === '') return undefined;
    const parsed = Date.parse(stateObj.state);
    if (Number.isFinite(parsed)) {
      const days = Math.max(0, Math.floor((Date.now() - parsed) / 86_400_000));
      return `oldest ${this._num(days, 0)}d`;
    }
    const numeric = Number(stateObj.state);
    if (Number.isFinite(numeric)) return `oldest ${this._num(Math.abs(numeric), 0)}d`;
    return undefined;
  }

  private _purgeEnabled(): boolean {
    return this._config?.purge === true || typeof this._config?.purge_service === 'string';
  }

  private _onCardClick(): void {
    if (this._config) moreInfo(this, this._config.size);
  }

  private _onRepack(ev: Event): void {
    ev.stopPropagation();
    this._repack = !this._repack;
    haptic(this, 'selection');
  }

  /**
   * Purge is destructive and irreversible, so it is gated twice: it only exists
   * when the config asks for it, and it always asks before firing.
   */
  private _onPurge(ev: Event): void {
    ev.stopPropagation();
    const hass = this.hass;
    const config = this._config;
    if (!hass || !config || this._purgeSent) return;
    const keepDays = Number(config.purge_days);
    const hasKeep = Number.isFinite(keepDays) && keepDays > 0;
    const question =
      `Purge the recorder database${hasKeep ? `, keeping ${this._num(keepDays, 0)} days` : ''}` +
      `${this._repack ? ' and repack it' : ''}? This cannot be undone.`;
    if (!window.confirm(question)) return;
    const [domain, service] = String(config.purge_service ?? DEFAULT_PURGE_SERVICE).split('.');
    if (!domain || !service) return;
    haptic(this, 'warning');
    const data: Record<string, unknown> = { repack: this._repack };
    if (hasKeep) data.keep_days = Math.round(keepDays);
    hass.callService(domain, service, data);
    this._purgeSent = true;
    window.clearTimeout(this._sentTimer);
    this._sentTimer = window.setTimeout(() => {
      this._sentTimer = undefined;
      this._purgeSent = false;
    }, SENT_MS);
  }

  protected render(): TemplateResult | typeof nothing {
    const config = this._config;
    if (!config) return nothing;
    const hass = this.hass;
    const sizeObj = hass?.states[config.size];
    if (hass && !sizeObj) {
      return html`<ha-card><div class="warning">Entity not found: ${config.size}</div></ha-card>`;
    }

    const unavailable = isUnavailable(sizeObj);
    const accent = accentFor(sizeObj, config.color);
    const name = config.name ?? sizeObj?.attributes.friendly_name ?? 'Database';
    const factor = unitFactor(sizeObj?.attributes.unit_of_measurement as string | undefined);
    const bytes = numericState(sizeObj) * factor;
    const hasSize = Number.isFinite(bytes);
    const maxBytes = (Number(config.max_size) > 0 ? Number(config.max_size) : DEFAULT_MAX_GB) * GB;
    const fraction = hasSize ? clamp(bytes / maxBytes, 0, 1) : 0;
    // Status tiers, not decoration: a database near its ceiling is a problem.
    const tier = !hasSize
      ? ''
      : fraction >= ERROR_FRACTION
        ? 'crit'
        : fraction >= WARN_FRACTION
          ? 'warn'
          : '';
    const shown = this._drawn ? fraction : 0;

    const segments: string[] = [];
    const keepDays = Number(config.purge_days);
    if (Number.isFinite(keepDays) && keepDays > 0) {
      segments.push(`keeps ${this._num(keepDays, 0)} ${keepDays === 1 ? 'day' : 'days'}`);
    }
    const rowsValue = numericState(config.rows ? hass?.states[config.rows] : undefined);
    if (Number.isFinite(rowsValue)) segments.push(`${this._count(rowsValue)} rows`);
    const oldest = this._oldestText();
    if (oldest) segments.push(oldest);
    if (!segments.length && sizeObj) segments.push(stateText(hass, sizeObj));

    const growthBytes = this._growth === null ? null : this._growth * factor;
    const meterTitle = `${hasSize ? this._bytes(bytes) : '—'} of ${this._bytes(maxBytes)} · ${this._num(fraction * 100, 0)}%`;

    return html`
      <ha-card
        class="control ${unavailable ? 'unavailable' : ''}"
        style="--silk-accent:${accent}"
        @click=${this._onCardClick}
      >
        <div class="top">
          <div class="icon">
            <ha-icon .icon=${'mdi:database'}></ha-icon>
          </div>
          <div class="info">
            <div class="name">${name}</div>
            <div class="state">
              ${segments.map(
                (segment, i) =>
                  html`${i ? html`<span class="sep">·</span>` : nothing}${segment}`
              )}
            </div>
          </div>
          ${this._purgeEnabled()
            ? html`
                <div class="trailing">
                  <button
                    class="chip ${this._repack ? 'active' : ''}"
                    role="checkbox"
                    aria-checked=${this._repack ? 'true' : 'false'}
                    title="Rebuild the database file after purging"
                    @click=${this._onRepack}
                  >
                    Repack
                  </button>
                  <button
                    class="purge ${this._purgeSent ? 'sent' : ''}"
                    aria-label="Purge the recorder database"
                    title="Purge the recorder database"
                    .disabled=${this._purgeSent}
                    @click=${this._onPurge}
                  >
                    <ha-icon .icon=${this._purgeSent ? 'mdi:check' : 'mdi:broom'}></ha-icon>
                  </button>
                </div>
              `
            : nothing}
        </div>
        <div class="meter">
          <div class="head">
            <span class="size ${tier}">${hasSize ? this._bytes(bytes) : '—'}</span>
            <span class="cap">of ${this._bytes(maxBytes)}</span>
            ${growthBytes !== null
              ? html`<span class="growth" title="Change over the last ${GROWTH_DAYS} days"
                  >${growthBytes >= 0 ? '+' : '−'}${this._bytes(Math.abs(growthBytes))}/week</span
                >`
              : this._statsFailed
                ? html`<span class="growth muted">growth unavailable</span>`
                : nothing}
          </div>
          <div class="bar" title=${meterTitle}>
            <span class="fill ${tier}" style="width:${(shown * 100).toFixed(2)}%"></span>
          </div>
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
        justify-content: center;
        gap: 10px;
      }
      .top {
        flex: none;
        display: flex;
        align-items: center;
        gap: 12px;
        min-width: 0;
      }
      /* Data card: the icon presses with the card, it is not a control. */
      .icon {
        cursor: pointer;
      }
      .icon:active {
        transform: none;
      }
      .chip {
        flex: none;
        white-space: nowrap;
      }
      .purge {
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
      .purge::after {
        content: '';
        position: absolute;
        inset: -5px;
        border-radius: 12px;
      }
      .purge:hover {
        color: var(--error-color, #db4437);
        background: color-mix(in srgb, var(--error-color, #db4437) 14%, transparent);
      }
      .purge:active {
        transform: scale(0.9);
        transition-duration: 120ms;
        transition-timing-function: var(--silk-ease-out);
      }
      .purge:focus-visible {
        outline: 2px solid color-mix(in srgb, var(--silk-accent) 70%, transparent);
        outline-offset: 2px;
      }
      .purge.sent,
      .purge.sent:hover {
        cursor: default;
        color: var(--silk-accent);
        background: color-mix(in srgb, var(--silk-accent) 16%, transparent);
      }
      .purge ha-icon {
        --mdc-icon-size: 18px;
        pointer-events: none;
      }
      .meter {
        flex: none;
        min-width: 0;
      }
      .head {
        display: flex;
        align-items: baseline;
        gap: 6px;
        min-width: 0;
        margin-bottom: 6px;
      }
      .size {
        flex: none;
        font-size: 22px;
        font-weight: 600;
        line-height: 1.1;
        letter-spacing: -0.02em;
        color: var(--primary-text-color);
        font-variant-numeric: tabular-nums;
      }
      .size.warn {
        color: var(--warning-color, #ffa600);
      }
      .size.crit {
        color: var(--error-color, #db4437);
      }
      .cap {
        flex: 1;
        min-width: 0;
        font-size: 12px;
        color: var(--secondary-text-color);
        font-variant-numeric: tabular-nums;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .growth {
        flex: none;
        font-size: 11px;
        font-weight: 600;
        line-height: 1;
        padding: 4px 8px;
        border-radius: 999px;
        color: var(--silk-accent);
        background: color-mix(in srgb, var(--silk-accent) 14%, transparent);
        font-variant-numeric: tabular-nums;
        white-space: nowrap;
      }
      .growth.muted {
        font-weight: 500;
        color: var(--secondary-text-color);
        background: rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.06);
      }
      .bar {
        height: 8px;
        border-radius: 4px;
        background: rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.08);
        overflow: hidden;
      }
      .fill {
        display: block;
        height: 100%;
        border-radius: 4px;
        background: var(--silk-accent);
        transition:
          width 450ms var(--silk-ease-out),
          background 200ms ease;
      }
      .fill.warn {
        background: var(--warning-color, #ffa600);
      }
      .fill.crit {
        background: var(--error-color, #db4437);
      }
      .unavailable .meter {
        opacity: 0.45;
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    'silk-database-card': SilkDatabaseCard;
  }
}
