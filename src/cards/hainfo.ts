import { LitElement, html, css, nothing, PropertyValues, TemplateResult } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { HomeAssistant, HassEntity, LovelaceCardConfig } from '../types';
import { silkControlStyles } from '../shared/base';
import { isUnavailable, moreInfo } from '../shared/service';
import { accentFor } from '../shared/color';
import { registerEditor } from '../shared/editor';

export const META = {
  type: 'silk-ha-card',
  name: 'Silk Home Assistant',
  description: 'Your instance, summarized.',
};

export interface SilkHaCardConfig extends LovelaceCardConfig {
  name?: string;
  /** Uptime sensor — a boot timestamp or a numeric duration. */
  uptime?: string;
  /** Accent override. */
  color?: string;
}

/**
 * `hass.config` carries the instance identity (version, location, timezone) but
 * is absent from Silk's minimal HomeAssistant type — extended locally rather
 * than widening the shared one for a single card.
 */
interface HassWithConfig extends HomeAssistant {
  config?: { version?: string; location_name?: string; time_zone?: string };
}

/** One row of `config/entity_registry/list` — only the fields Silk counts. */
interface RegistryEntry {
  entity_id: string;
  platform?: string;
  device_id?: string | null;
}

/** Distinct devices and integrations behind the registry. */
interface RegistryCounts {
  devices: number;
  integrations: number;
}

const HA_ICON = 'mdi:home-assistant';
/** Keeps a timestamp-based uptime readout honest without a per-second tick. */
const TICK_MS = 60_000;

const EDITOR_TAG = 'silk-ha-card-editor';

registerEditor(
  EDITOR_TAG,
  [
    { name: 'name', selector: { text: {} } },
    { name: 'uptime', selector: { entity: { domain: ['sensor', 'binary_sensor'] } } },
  ],
  {
    name: 'Name',
    uptime: 'Uptime sensor (boot time or duration)',
  }
);

/**
 * Seconds of uptime from a sensor that may speak either dialect: a boot
 * *timestamp* (HA's own `sensor.uptime`) or a numeric duration. A unitless
 * number is read as seconds — the common raw-counter convention.
 */
function uptimeSeconds(stateObj: HassEntity | undefined): number | null {
  if (!stateObj || isUnavailable(stateObj) || stateObj.state === '') return null;
  const num = Number(stateObj.state);
  if (stateObj.attributes.device_class === 'timestamp' || !Number.isFinite(num)) {
    const boot = Date.parse(stateObj.state);
    if (!Number.isFinite(boot)) return null;
    return Math.max(0, (Date.now() - boot) / 1000);
  }
  if (num < 0) return null;
  const unit = String(stateObj.attributes.unit_of_measurement ?? '')
    .trim()
    .toLowerCase();
  if (unit.startsWith('d')) return num * 86400;
  if (unit.startsWith('h')) return num * 3600;
  if (unit.startsWith('min') || unit === 'm') return num * 60;
  return num;
}

/** '12d 4h' · '5h 12m' · '42m' · 'just up'. */
function uptimeText(seconds: number): string {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (days > 0) return hours > 0 ? `${days}d ${hours}h` : `${days}d`;
  if (hours > 0) return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
  if (minutes > 0) return `${minutes}m`;
  return 'just up';
}

/**
 * The instance itself, at a glance: which version is running, where it thinks
 * it is, and how much it is looking after.
 */
@customElement('silk-ha-card')
export class SilkHaCard extends LitElement {
  @property({ attribute: false }) public hass?: HomeAssistant;

  @state() private _config?: SilkHaCardConfig;
  /** Registry-derived counts; null until the one-shot fetch lands. */
  @state() private _counts: RegistryCounts | null = null;
  /** True when the registry call failed — the card says so instead of guessing. */
  @state() private _regFailed = false;

  private _fetchStarted = false;
  private _fetchSeq = 0;
  private _tickTimer?: number;

  public static getStubConfig(hass: HomeAssistant): Partial<SilkHaCardConfig> {
    const uptime = Object.keys(hass.states).find(
      (id) => id.startsWith('sensor.') && /uptime|last_boot/.test(id)
    );
    return uptime
      ? { type: 'custom:silk-ha-card', uptime }
      : { type: 'custom:silk-ha-card' };
  }

  public static async getConfigElement(): Promise<HTMLElement> {
    return document.createElement(EDITOR_TAG);
  }

  public setConfig(config: SilkHaCardConfig): void {
    if (config.name !== undefined && typeof config.name !== 'string') {
      throw new Error('silk-ha-card: `name` must be text');
    }
    if (config.uptime !== undefined && typeof config.uptime !== 'string') {
      throw new Error('silk-ha-card: `uptime` must be an entity id');
    }
    this._config = config;
  }

  public getCardSize(): number {
    return 3;
  }

  public getGridOptions(): Record<string, number> {
    return { columns: 6, rows: 2, min_columns: 4, min_rows: 2 };
  }

  public connectedCallback(): void {
    super.connectedCallback();
    this._tickTimer = window.setInterval(() => this.requestUpdate(), TICK_MS);
    // A DOM re-attach skips firstUpdated: refresh the registry counts again.
    if (this.hasUpdated && this._fetchStarted) this._loadRegistry();
  }

  public disconnectedCallback(): void {
    super.disconnectedCallback();
    window.clearInterval(this._tickTimer);
    this._tickTimer = undefined;
    this._fetchSeq++; // orphan any in-flight fetch
  }

  protected willUpdate(_changed: PropertyValues): void {
    if (!this.hass || !this._config || this._fetchStarted) return;
    this._fetchStarted = true;
    this._loadRegistry();
  }

  /** One-shot registry read: devices and integrations only live there. */
  private async _loadRegistry(): Promise<void> {
    const hass = this.hass;
    if (!hass) return;
    const seq = ++this._fetchSeq;
    let entries: RegistryEntry[];
    try {
      entries = await hass.callWS<RegistryEntry[]>({ type: 'config/entity_registry/list' });
    } catch (err) {
      console.warn('silk-ha-card: entity registry fetch failed', err);
      if (seq !== this._fetchSeq) return;
      this._counts = null;
      this._regFailed = true;
      return;
    }
    if (seq !== this._fetchSeq) return; // a newer fetch superseded this one
    const devices = new Set<string>();
    const integrations = new Set<string>();
    for (const entry of entries ?? []) {
      if (entry.device_id) devices.add(entry.device_id);
      if (entry.platform) integrations.add(entry.platform);
    }
    this._counts = { devices: devices.size, integrations: integrations.size };
    this._regFailed = false;
  }

  private _locale(): string {
    return this.hass?.locale?.language ?? this.hass?.language ?? 'en';
  }

  private _num(value: number | null): string {
    if (value === null) return '—';
    return new Intl.NumberFormat(this._locale(), { maximumFractionDigits: 0 }).format(value);
  }

  private _onCardClick(): void {
    // The card has no entity of its own; the uptime sensor is the one thing
    // here with a history worth opening.
    const uptime = this._config?.uptime;
    if (uptime && this.hass?.states[uptime]) moreInfo(this, uptime);
  }

  private _renderStat(label: string, value: number | null, title: string): TemplateResult {
    return html`
      <div class="stat" title=${title}>
        <div class="num">${this._num(value)}</div>
        <div class="lbl">${label}</div>
      </div>
    `;
  }

  protected render(): TemplateResult | typeof nothing {
    const config = this._config;
    const hass = this.hass as HassWithConfig | undefined;
    if (!config || !hass) return nothing;

    const version = hass.config?.version;
    const location = hass.config?.location_name;
    const zone = hass.config?.time_zone;
    const title = config.name ?? 'Home Assistant';
    const nameLine = config.name ? title : version ? `Home Assistant ${version}` : title;

    // 'Seoul · Asia/Seoul', plus the version when a custom name took its place.
    const segments = [location, zone, config.name && version ? version : undefined].filter(
      (s): s is string => Boolean(s)
    );

    const uptimeObj = config.uptime ? hass.states[config.uptime] : undefined;
    const uptimeMissing = Boolean(config.uptime) && !uptimeObj;
    const seconds = uptimeSeconds(uptimeObj);

    const ids = Object.keys(hass.states);
    const entities = ids.length;
    const automations = ids.reduce(
      (total, id) => (id.startsWith('automation.') ? total + 1 : total),
      0
    );

    return html`
      <ha-card
        class="control ${config.uptime ? 'tappable' : ''}"
        style="--silk-accent:${accentFor(undefined, config.color)}"
        @click=${this._onCardClick}
      >
        <div class="top">
          <div class="icon on">
            <ha-icon .icon=${HA_ICON}></ha-icon>
          </div>
          <div class="info">
            <div class="name" title=${nameLine}>${nameLine}</div>
            <div class="state">
              ${segments.length
                ? segments.map((segment, i) =>
                    i === 0
                      ? html`<span>${segment}</span>`
                      : html`<span class="sep">·</span><span>${segment}</span>`
                  )
                : html`<span>Instance details unavailable</span>`}
            </div>
          </div>
          ${config.uptime
            ? html`<div class="trailing">
                <span class="uptime ${seconds === null ? 'muted' : ''}">
                  ${seconds === null ? '—' : `up ${uptimeText(seconds)}`}
                </span>
              </div>`
            : nothing}
        </div>
        <div class="stats">
          ${this._renderStat('Entities', entities, 'Entities currently in the state machine')}
          ${this._renderStat(
            'Devices',
            this._counts?.devices ?? null,
            'Distinct devices in the entity registry'
          )}
          ${this._renderStat('Automations', automations, 'automation.* entities')}
          ${this._renderStat(
            'Integrations',
            this._counts?.integrations ?? null,
            'Distinct integration platforms supplying entities'
          )}
        </div>
        ${this._regFailed
          ? html`<div class="note">Registry unreachable — device and integration counts unknown</div>`
          : nothing}
        ${uptimeMissing
          ? html`<div class="note">Uptime entity not found: ${config.uptime}</div>`
          : nothing}
      </ha-card>
    `;
  }

  static styles = [
    silkControlStyles,
    css`
      /* A summary card: it grows with its content and presses nowhere. */
      ha-card {
        flex-direction: column;
        align-items: stretch;
        justify-content: flex-start;
        gap: 10px;
        height: auto;
        min-height: 100%;
        cursor: default;
      }
      ha-card.tappable {
        cursor: pointer;
      }
      .top {
        flex: none;
        display: flex;
        align-items: center;
        gap: 12px;
        min-width: 0;
      }
      /* The mark is identity, not a control — it never presses on its own. */
      .icon {
        cursor: inherit;
      }
      .icon:active {
        transform: none;
      }
      .icon ha-icon {
        --mdc-icon-size: 24px;
      }
      .uptime {
        font-size: 13px;
        font-weight: 600;
        letter-spacing: -0.01em;
        color: var(--primary-text-color);
        font-variant-numeric: tabular-nums;
        white-space: nowrap;
      }
      .uptime.muted {
        color: var(--secondary-text-color);
      }
      .stats {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 6px 12px;
        animation: silk-ha-in 250ms var(--silk-ease-out);
      }
      .stat {
        min-width: 0;
      }
      .num {
        font-size: 15px;
        font-weight: 600;
        line-height: 1.25;
        letter-spacing: -0.01em;
        color: var(--primary-text-color);
        font-variant-numeric: tabular-nums;
      }
      .lbl {
        font-size: 10px;
        line-height: 1.3;
        color: var(--secondary-text-color);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .note {
        font-size: 11px;
        line-height: 1.3;
        color: var(--secondary-text-color);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      @keyframes silk-ha-in {
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
    'silk-ha-card': SilkHaCard;
  }
}
