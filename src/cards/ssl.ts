import { LitElement, html, css, nothing, TemplateResult } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { HomeAssistant, HassEntity, LovelaceCardConfig } from '../types';
import { silkControlStyles } from '../shared/base';
import { isUnavailable, moreInfo, clamp } from '../shared/service';
import { accentFor } from '../shared/color';
import { registerEditor } from '../shared/editor';

export const META = {
  type: 'silk-cert-card',
  name: 'Silk Certificates',
  description: 'What expires next.',
};

/** One tracked certificate: a days-remaining sensor or an expiry timestamp. */
export interface CertConfig {
  entity: string;
  name?: string;
}

export interface SilkCertCardConfig extends LovelaceCardConfig {
  /** YAML-only: the certificates this card watches. */
  certs: CertConfig[];
  name?: string;
  /** Days remaining below which a row reads warning. Default 14. */
  warn_days?: number;
  /** Days remaining below which a row reads error. Default 7. */
  critical_days?: number;
  /** Accent override. */
  color?: string;
}

const DEFAULT_WARN_DAYS = 14;
const DEFAULT_CRITICAL_DAYS = 7;
/** The bar reads full at a quarter's worth of life — one Let's Encrypt cycle. */
const HORIZON_DAYS = 90;
const DAY_MS = 86_400_000;
const ROW_HEIGHT = 34;
/** Day-granularity labels only need a lazy clock. */
const TICK_MS = 900_000;

const EDITOR_TAG = 'silk-cert-card-editor';

// Certificates stay YAML-only — a nested entity+name picker per row would
// dwarf the card; the editor owns the title and the two thresholds.
registerEditor(
  EDITOR_TAG,
  [
    { name: 'name', selector: { text: {} } },
    {
      name: '',
      type: 'grid',
      schema: [
        { name: 'warn_days', selector: { number: { min: 1, mode: 'box' } } },
        { name: 'critical_days', selector: { number: { min: 1, mode: 'box' } } },
      ],
    },
  ],
  { name: 'Name', warn_days: 'Warn under (days)', critical_days: 'Critical under (days)' },
  { name: 'Certificates', warn_days: DEFAULT_WARN_DAYS, critical_days: DEFAULT_CRITICAL_DAYS }
);

type Tier = 'ok' | 'warn' | 'crit';

/** One certificate resolved against the clock, ready to sort and draw. */
interface CertRow {
  cfg: CertConfig;
  name: string;
  /** Days until expiry; negative once expired, null when unreadable. */
  days: number | null;
  tier: Tier;
  expired: boolean;
  /** '42 days' · '1 day' · 'EXPIRED' · '—'. */
  label: string;
  dead: boolean;
}

/**
 * The expiry board: every row is the same 4px bar against the same 90-day
 * horizon, so "what expires next" is a shape you read down the card rather
 * than four numbers you compare. Warning and error appear only when a
 * certificate is genuinely close to — or past — its expiry.
 */
@customElement('silk-cert-card')
export class SilkCertCard extends LitElement {
  @property({ attribute: false }) public hass?: HomeAssistant;

  @state() private _config?: SilkCertCardConfig;
  /** Clock the day math is resolved against; ticked so labels stay honest. */
  @state() private _now = Date.now();

  private _tickTimer?: number;

  public static getStubConfig(hass: HomeAssistant): Partial<SilkCertCardConfig> {
    const certs = Object.keys(hass.states)
      .filter((id) => id.startsWith('sensor.') && /cert|ssl|expir/i.test(id))
      .slice(0, 3)
      .map((id): CertConfig => ({
        entity: id,
        name: String(hass.states[id].attributes.friendly_name ?? id),
      }));
    return { type: 'custom:silk-cert-card', certs };
  }

  public static async getConfigElement(): Promise<HTMLElement> {
    return document.createElement(EDITOR_TAG);
  }

  public setConfig(config: SilkCertCardConfig): void {
    if (!Array.isArray(config.certs) || config.certs.length === 0) {
      throw new Error('silk-cert-card: `certs` is required — a list of {entity, name?}');
    }
    config.certs.forEach((cert, i) => {
      if (!cert || typeof cert.entity !== 'string' || cert.entity === '') {
        throw new Error(`silk-cert-card: certs[${i}] needs an \`entity\``);
      }
    });
    if (config.warn_days !== undefined && !(Number(config.warn_days) > 0)) {
      throw new Error('silk-cert-card: `warn_days` must be a positive number');
    }
    if (config.critical_days !== undefined && !(Number(config.critical_days) > 0)) {
      throw new Error('silk-cert-card: `critical_days` must be a positive number');
    }
    this._config = config;
    this._now = Date.now();
  }

  public getCardSize(): number {
    return Math.max(3, 1 + Math.ceil((this._config?.certs.length ?? 3) / 2));
  }

  public getGridOptions(): Record<string, number> {
    return { columns: 6, rows: 3, min_columns: 4, min_rows: 2 };
  }

  public connectedCallback(): void {
    super.connectedCallback();
    this._now = Date.now();
    this._tickTimer = window.setInterval(() => {
      this._now = Date.now();
    }, TICK_MS);
  }

  public disconnectedCallback(): void {
    super.disconnectedCallback();
    window.clearInterval(this._tickTimer);
  }

  private _warnDays(): number {
    return Number(this._config?.warn_days) > 0
      ? Number(this._config!.warn_days)
      : DEFAULT_WARN_DAYS;
  }

  private _criticalDays(): number {
    return Number(this._config?.critical_days) > 0
      ? Number(this._config!.critical_days)
      : DEFAULT_CRITICAL_DAYS;
  }

  /**
   * Days left, from either shape of sensor: a numeric days-remaining state, or
   * an expiry timestamp (ISO string, epoch seconds, epoch millis).
   */
  private _daysLeft(stateObj?: HassEntity): number | null {
    if (!stateObj || isUnavailable(stateObj) || stateObj.state.trim() === '') return null;
    const raw = stateObj.state.trim();
    const numeric = Number(raw);
    if (Number.isFinite(numeric)) {
      // Bare numbers are days remaining — unless they are plainly an epoch.
      if (Math.abs(numeric) < 1e6) return numeric;
      const ms = numeric > 1e12 ? numeric : numeric * 1000;
      return (ms - this._now) / DAY_MS;
    }
    const parsed = Date.parse(raw);
    if (!Number.isFinite(parsed)) return null;
    return (parsed - this._now) / DAY_MS;
  }

  private _label(days: number | null): string {
    if (days === null) return '—';
    if (days < 0) return 'EXPIRED';
    const whole = Math.floor(days);
    if (whole === 0) return 'today';
    return `${whole} ${whole === 1 ? 'day' : 'days'}`;
  }

  private _row(cfg: CertConfig): CertRow {
    const stateObj = this.hass?.states[cfg.entity];
    const days = this._daysLeft(stateObj);
    const expired = days !== null && days < 0;
    const tier: Tier =
      days === null
        ? 'ok'
        : expired || days < this._criticalDays()
          ? 'crit'
          : days < this._warnDays()
            ? 'warn'
            : 'ok';
    return {
      cfg,
      name: cfg.name ?? stateObj?.attributes.friendly_name ?? cfg.entity,
      days,
      tier,
      expired,
      label: this._label(days),
      dead: !stateObj || isUnavailable(stateObj),
    };
  }

  /** Soonest expiry first; certificates that cannot speak sink to the bottom. */
  private _rows(): CertRow[] {
    return this._config!.certs.map((cfg) => this._row(cfg)).sort((a, b) => {
      if (a.days === null && b.days === null) return a.name.localeCompare(b.name);
      if (a.days === null) return 1;
      if (b.days === null) return -1;
      return a.days - b.days || a.name.localeCompare(b.name);
    });
  }

  private _onRowClick(ev: Event, entityId: string): void {
    ev.stopPropagation();
    moreInfo(this, entityId);
  }

  private _renderRow(row: CertRow): TemplateResult {
    // One horizon for every row: 90 days of life is a full bar.
    const fraction = row.days === null ? 0 : clamp(row.days / HORIZON_DAYS, 0, 1);
    const width = row.days !== null && row.days > 0 ? Math.max(3, fraction * 100) : 0;
    return html`
      <button
        class="row ${row.dead ? 'unavailable' : ''}"
        title=${row.name}
        aria-label=${`${row.name}: ${row.expired ? 'expired' : row.label}`}
        @click=${(ev: Event) => this._onRowClick(ev, row.cfg.entity)}
      >
        <span class="cname">${row.name}</span>
        <span class="track" aria-hidden="true">
          <span class="fill ${row.tier}" style="width:${width.toFixed(1)}%"></span>
        </span>
        <span class="left ${row.tier} ${row.expired ? 'expired' : ''}">${row.label}</span>
      </button>
    `;
  }

  protected render(): TemplateResult | typeof nothing {
    const config = this._config;
    const hass = this.hass;
    if (!config || !hass) return nothing;

    const rows = this._rows();
    const soonest = rows.find((row) => row.days !== null);
    const accent = accentFor(hass.states[config.certs[0].entity], config.color);
    const title = config.name ?? 'Certificates';

    return html`
      <ha-card class="control" style="--silk-accent:${accent}">
        <div class="header">
          <div class="hname" title=${title}>${title}</div>
          ${soonest
            ? html`<span class="chip soon ${soonest.tier}" title=${`Soonest: ${soonest.name}`}>
                ${soonest.label}
              </span>`
            : nothing}
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
      .chip.soon {
        flex: none;
        cursor: default;
        font-variant-numeric: tabular-nums;
      }
      .chip.soon.warn {
        color: var(--warning-color, #ffa600);
        background: color-mix(in srgb, var(--warning-color, #ffa600) 14%, transparent);
      }
      .chip.soon.crit {
        color: var(--error-color, #db4437);
        background: color-mix(in srgb, var(--error-color, #db4437) 14%, transparent);
      }
      .rows {
        display: flex;
        flex-direction: column;
        margin: 0 -6px;
      }
      .row {
        display: flex;
        align-items: center;
        gap: 10px;
        width: 100%;
        height: ${ROW_HEIGHT}px;
        margin: 0;
        padding: 0 6px;
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
      .cname {
        flex: 2 1 40px;
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
        position: relative;
        flex: 1 1 60px;
        min-width: 28px;
        max-width: 92px;
        height: 4px;
        border-radius: 2px;
        overflow: hidden;
        background: rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.08);
      }
      .fill {
        position: absolute;
        inset: 0 auto 0 0;
        border-radius: 2px;
        background: var(--silk-accent);
        transition:
          width 400ms var(--silk-ease-out),
          background 200ms ease;
      }
      .fill.warn {
        background: var(--warning-color, #ffa600);
      }
      .fill.crit {
        background: var(--error-color, #db4437);
      }
      .left {
        flex: none;
        min-width: 62px;
        text-align: right;
        font-size: 12px;
        font-weight: 500;
        line-height: 1.3;
        color: var(--secondary-text-color);
        font-variant-numeric: tabular-nums;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        transition: color 200ms ease;
      }
      .left.warn {
        color: var(--warning-color, #ffa600);
      }
      .left.crit {
        color: var(--error-color, #db4437);
      }
      /* The one word that earns emphasis — weight, never tracking. */
      .left.expired {
        font-weight: 600;
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    'silk-cert-card': SilkCertCard;
  }
}
