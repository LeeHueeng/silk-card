import { LitElement, html, css, nothing, PropertyValues, TemplateResult } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { HomeAssistant, HassEntity, LovelaceCardConfig } from '../types';
import { silkControlStyles } from '../shared/base';
import { domainOf, isUnavailable, moreInfo, stateText } from '../shared/service';
import { accentFor } from '../shared/color';
import { registerEditor } from '../shared/editor';

export const META = {
  type: 'silk-binary-card',
  name: 'Silk Sensor',
  description: 'A binary sensor with a memory.',
};

export interface SilkBinaryCardConfig extends LovelaceCardConfig {
  entity: string;
  name?: string;
  icon?: string;
  color?: string;
  /** Flips which state counts as the notable one (off = the eventful state). */
  invert?: boolean;
  /** Hide the 24h strip along the bottom edge. Default true. */
  show_strip?: boolean;
}

/**
 * A history row from `history/history_during_period` with minimal_response:
 * the first row per entity is a full state object, the rest are `{s, lu}`.
 */
interface HistoryRow {
  s?: string;
  state?: string;
  lu?: number | string;
  last_updated?: number | string;
  lc?: number;
  last_changed?: string;
}

/** One 2h bucket of the last 24 hours, in seconds of measured time. */
interface Block {
  start: number;
  end: number;
  /** Seconds spent in the notable state. */
  active: number;
  /** Seconds with a known state at all (0 = a recorder gap). */
  known: number;
}

/**
 * HA's own on/off wording per device class — raw `on`/`off` tells nobody
 * whether a door is open or a leak detector is wet.
 */
const WORDS: Record<string, [string, string]> = {
  battery: ['Low', 'Normal'],
  battery_charging: ['Charging', 'Not charging'],
  carbon_monoxide: ['Detected', 'Clear'],
  cold: ['Cold', 'Normal'],
  connectivity: ['Connected', 'Disconnected'],
  door: ['Open', 'Closed'],
  garage_door: ['Open', 'Closed'],
  gas: ['Detected', 'Clear'],
  heat: ['Hot', 'Normal'],
  light: ['Detected', 'Clear'],
  lock: ['Unlocked', 'Locked'],
  moisture: ['Wet', 'Dry'],
  motion: ['Detected', 'Clear'],
  moving: ['Moving', 'Still'],
  occupancy: ['Detected', 'Clear'],
  opening: ['Open', 'Closed'],
  plug: ['Plugged in', 'Unplugged'],
  power: ['Detected', 'Clear'],
  presence: ['Home', 'Away'],
  problem: ['Problem', 'OK'],
  running: ['Running', 'Not running'],
  safety: ['Unsafe', 'Safe'],
  smoke: ['Detected', 'Clear'],
  sound: ['Detected', 'Clear'],
  tamper: ['Detected', 'Clear'],
  update: ['Update available', 'Up to date'],
  vibration: ['Detected', 'Clear'],
  window: ['Open', 'Closed'],
};

/** Icon pair per device class; the glyph itself carries the state. */
const ICONS: Record<string, [string, string]> = {
  battery: ['mdi:battery-alert-variant-outline', 'mdi:battery'],
  battery_charging: ['mdi:battery-charging', 'mdi:battery'],
  carbon_monoxide: ['mdi:molecule-co', 'mdi:molecule-co'],
  cold: ['mdi:snowflake', 'mdi:thermometer'],
  connectivity: ['mdi:lan-connect', 'mdi:lan-disconnect'],
  door: ['mdi:door-open', 'mdi:door-closed'],
  garage_door: ['mdi:garage-open', 'mdi:garage'],
  gas: ['mdi:alert-circle', 'mdi:check-circle-outline'],
  heat: ['mdi:fire', 'mdi:thermometer'],
  light: ['mdi:brightness-7', 'mdi:brightness-5'],
  lock: ['mdi:lock-open-variant', 'mdi:lock'],
  moisture: ['mdi:water-alert', 'mdi:water-off'],
  motion: ['mdi:motion-sensor', 'mdi:motion-sensor-off'],
  moving: ['mdi:arrow-right-thick', 'mdi:arrow-right-thin'],
  occupancy: ['mdi:home-account', 'mdi:home-outline'],
  opening: ['mdi:square-rounded', 'mdi:square-rounded-outline'],
  plug: ['mdi:power-plug', 'mdi:power-plug-off'],
  power: ['mdi:power-plug', 'mdi:power-plug-off'],
  presence: ['mdi:home', 'mdi:home-outline'],
  problem: ['mdi:alert-circle', 'mdi:check-circle-outline'],
  running: ['mdi:play-circle', 'mdi:stop-circle-outline'],
  safety: ['mdi:alert-circle', 'mdi:check-circle-outline'],
  smoke: ['mdi:smoke', 'mdi:smoke-detector-outline'],
  sound: ['mdi:music-note', 'mdi:music-note-off'],
  tamper: ['mdi:hand-back-left', 'mdi:check-circle-outline'],
  update: ['mdi:package-up', 'mdi:package'],
  vibration: ['mdi:vibrate', 'mdi:vibrate-off'],
  window: ['mdi:window-open', 'mdi:window-closed'],
};

const BLOCKS = 12;
const WINDOW_HOURS = 24;
const MINUTE_MS = 60_000;
const REFRESH_INTERVAL_MS = 300_000;
const REFRESH_THROTTLE_MS = 60_000;

const EDITOR_TAG = 'silk-binary-card-editor';

registerEditor(
  EDITOR_TAG,
  [
    { name: 'entity', required: true, selector: { entity: { domain: ['binary_sensor'] } } },
    { name: 'name', selector: { text: {} } },
    {
      name: '',
      type: 'grid',
      schema: [
        { name: 'icon', selector: { icon: {} } },
        { name: 'color', selector: { ui_color: {} } },
      ],
    },
    {
      name: '',
      type: 'grid',
      schema: [
        { name: 'invert', selector: { boolean: {} } },
        { name: 'show_strip', selector: { boolean: {} } },
      ],
    },
  ],
  {
    entity: '엔티티',
    name: '이름',
    icon: '아이콘',
    color: '강조 색상',
    invert: '반대로 보기(꺼짐이 사건)',
    show_strip: '24시간 막대 표시',
  },
  { show_strip: true }
);

function durationText(seconds: number): string {
  const total = Math.max(0, Math.floor(seconds / 60));
  if (total < 1) return '<1m';
  const d = Math.floor(total / 1440);
  if (d >= 1) {
    const h = Math.floor((total % 1440) / 60);
    return h > 0 ? `${d}d ${h}h` : `${d}d`;
  }
  const h = Math.floor(total / 60);
  const m = total % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

@customElement('silk-binary-card')
export class SilkBinaryCard extends LitElement {
  @property({ attribute: false }) public hass?: HomeAssistant;

  @state() private _config?: SilkBinaryCardConfig;
  @state() private _blocks: Block[] | null = null;
  /** True when the history call failed — the card says so instead of lying. */
  @state() private _historyFailed = false;

  private _fetchStarted = false;
  private _fetchSeq = 0;
  private _lastFetch = 0;
  private _lastChanged?: string;
  private _tickTimer?: number;
  private _intervalTimer?: number;
  private _refreshTimer?: number;

  public static getStubConfig(hass: HomeAssistant): Partial<SilkBinaryCardConfig> {
    const ids = Object.keys(hass.states).filter((id) => id.startsWith('binary_sensor.'));
    const byClass = (cls: string) =>
      ids.find((id) => hass.states[id].attributes.device_class === cls);
    return {
      type: 'custom:silk-binary-card',
      entity: byClass('door') ?? byClass('motion') ?? byClass('window') ?? ids[0],
    };
  }

  public static async getConfigElement(): Promise<HTMLElement> {
    return document.createElement(EDITOR_TAG);
  }

  public setConfig(config: SilkBinaryCardConfig): void {
    if (!config.entity) {
      throw new Error('silk-binary-card: `entity` is required');
    }
    if (domainOf(config.entity) !== 'binary_sensor') {
      throw new Error('silk-binary-card: `entity` must be a binary_sensor entity');
    }
    this._config = config;
    this._blocks = null;
    this._historyFailed = false;
    this._fetchStarted = false;
    this._lastChanged = undefined;
  }

  public getCardSize(): number {
    return 1;
  }

  public getGridOptions(): Record<string, number> {
    return { columns: 6, rows: 1, min_columns: 4, min_rows: 1 };
  }

  public connectedCallback(): void {
    super.connectedCallback();
    // "for 3h 12m" is clock-relative — tick it once a minute.
    this._tickTimer = window.setInterval(() => this.requestUpdate(), MINUTE_MS);
    this._intervalTimer = window.setInterval(() => this._refresh(), REFRESH_INTERVAL_MS);
    if (this.hasUpdated && this._fetchStarted) this._refresh();
  }

  public disconnectedCallback(): void {
    super.disconnectedCallback();
    window.clearInterval(this._tickTimer);
    window.clearInterval(this._intervalTimer);
    window.clearTimeout(this._refreshTimer);
    this._refreshTimer = undefined;
  }

  protected willUpdate(changed: PropertyValues): void {
    if (!this.hass || !this._config || this._config.show_strip === false) return;
    if (!this._fetchStarted) {
      this._fetchStarted = true;
      this._refresh();
      return;
    }
    if (changed.has('hass')) this._onStatesChanged();
  }

  /** Refetch when the sensor actually flips, throttled to once a minute. */
  private _onStatesChanged(): void {
    const stamp = this.hass?.states[this._config!.entity]?.last_changed;
    if (!stamp || stamp === this._lastChanged) return;
    this._lastChanged = stamp;
    if (this._refreshTimer) return;
    const wait = Math.max(0, REFRESH_THROTTLE_MS - (Date.now() - this._lastFetch));
    this._refreshTimer = window.setTimeout(() => {
      this._refreshTimer = undefined;
      this._refresh();
    }, wait);
  }

  private async _refresh(): Promise<void> {
    const hass = this.hass;
    const config = this._config;
    if (!hass || !config || config.show_strip === false) return;
    const seq = ++this._fetchSeq;
    const end = Date.now() / 1000;
    const start = end - WINDOW_HOURS * 3600;
    let resp: Record<string, HistoryRow[]>;
    try {
      resp = await hass.callWS<Record<string, HistoryRow[]>>({
        type: 'history/history_during_period',
        start_time: new Date(start * 1000).toISOString(),
        end_time: new Date(end * 1000).toISOString(),
        entity_ids: [config.entity],
        minimal_response: true,
        no_attributes: true,
        significant_changes_only: false,
      });
    } catch (err) {
      console.warn('silk-binary-card: history fetch failed', err);
      if (seq === this._fetchSeq) {
        this._historyFailed = true;
        this._blocks = null;
      }
      return;
    }
    if (seq !== this._fetchSeq) return; // a newer fetch superseded this one
    this._lastFetch = Date.now();
    this._historyFailed = false;
    const samples: [number, string][] = (resp?.[config.entity] ?? [])
      .map((row): [number, string] => {
        const raw = row.lu ?? row.last_updated ?? row.lc ?? row.last_changed ?? NaN;
        const t = typeof raw === 'number' ? raw : Date.parse(String(raw)) / 1000;
        return [t, String(row.s ?? row.state ?? '')];
      })
      .filter((p) => Number.isFinite(p[0]) && p[0] <= end)
      .sort((a, b) => a[0] - b[0]);
    this._buildBlocks(samples, start, end);
  }

  /**
   * `invert` decides which state is the eventful one: a closed door and a
   * cleared leak sensor are both "quiet", and the strip paints the eventful
   * time only.
   */
  private _isNotable(rawState: string): boolean | null {
    const s = rawState.toLowerCase();
    if (s !== 'on' && s !== 'off') return null;
    const on = s === 'on';
    return this._config?.invert ? !on : on;
  }

  private _buildBlocks(samples: [number, string][], start: number, end: number): void {
    const span = (end - start) / BLOCKS;
    const blocks: Block[] = Array.from({ length: BLOCKS }, (_, i) => ({
      start: start + i * span,
      end: start + (i + 1) * span,
      active: 0,
      known: 0,
    }));
    for (let i = 0; i < samples.length; i++) {
      const t0 = Math.max(samples[i][0], start);
      const t1 = i + 1 < samples.length ? Math.min(Math.max(samples[i + 1][0], start), end) : end;
      if (t1 <= t0) continue;
      const notable = this._isNotable(samples[i][1]);
      if (notable === null) continue; // unavailable/unknown reads as a gap
      const first = Math.max(0, Math.floor((t0 - start) / span));
      const last = Math.min(BLOCKS - 1, Math.floor((t1 - start - 1e-6) / span));
      for (let b = first; b <= last; b++) {
        const lo = Math.max(t0, blocks[b].start);
        const hi = Math.min(t1, blocks[b].end);
        if (hi <= lo) continue;
        blocks[b].known += hi - lo;
        if (notable) blocks[b].active += hi - lo;
      }
    }
    this._blocks = blocks;
  }

  private _locale(): string {
    return this.hass?.locale?.language ?? this.hass?.language ?? 'en';
  }

  private _onCardClick(): void {
    if (this._config) moreInfo(this, this._config.entity);
  }

  /** [onWord, offWord] for the entity's device class. */
  private _words(stateObj: HassEntity): [string, string] {
    return WORDS[stateObj.attributes.device_class as string] ?? ['On', 'Off'];
  }

  private _renderStrip(stateObj: HassEntity): TemplateResult | typeof nothing {
    const blocks = this._blocks;
    if (!blocks) return nothing;
    const [onWord, offWord] = this._words(stateObj);
    const notableWord = this._config?.invert ? offWord : onWord;
    const quietWord = this._config?.invert ? onWord : offWord;
    const timeFmt = new Intl.DateTimeFormat(this._locale(), {
      hour: 'numeric',
      minute: '2-digit',
    });
    return html`
      <div class="strip" aria-hidden="true">
        ${blocks.map((b) => {
          const fraction = b.known > 0 ? b.active / b.known : 0;
          // One accent hue: only its opacity carries how much of the bucket
          // was eventful, with a floor so a two-minute event stays visible.
          const opacity = fraction > 0 ? 0.3 + 0.7 * fraction : 0;
          const range = `${timeFmt.format(new Date(b.start * 1000))}–${timeFmt.format(
            new Date(b.end * 1000)
          )}`;
          const detail =
            b.known <= 0
              ? 'no data'
              : b.active > 0
                ? `${notableWord} ${durationText(b.active)}`
                : quietWord;
          return html`
            <div class="blk ${b.known > 0 ? '' : 'gap'}" title=${`${range} · ${detail}`}>
              <span style="opacity:${opacity.toFixed(3)}"></span>
            </div>
          `;
        })}
      </div>
    `;
  }

  protected render(): TemplateResult | typeof nothing {
    const config = this._config;
    const hass = this.hass;
    if (!config || !hass) return nothing;
    const stateObj = hass.states[config.entity];
    if (!stateObj) {
      return html`
        <ha-card class="control">
          <div class="warning">Entity not found: ${config.entity}</div>
        </ha-card>
      `;
    }

    const unavailable = isUnavailable(stateObj);
    const accent = accentFor(stateObj, config.color);
    const name = config.name ?? stateObj.attributes.friendly_name ?? config.entity;
    const deviceClass = stateObj.attributes.device_class as string | undefined;
    const on = stateObj.state === 'on';
    const [onWord, offWord] = this._words(stateObj);
    const word = unavailable ? stateText(hass, stateObj) : on ? onWord : offWord;
    const notable = !unavailable && Boolean(this._isNotable(stateObj.state));
    const icons = deviceClass ? ICONS[deviceClass] : undefined;
    const icon = config.icon ?? (icons ? (on ? icons[0] : icons[1]) : undefined);
    const sinceMs = Date.parse(stateObj.last_changed);
    const since = Number.isFinite(sinceMs)
      ? `for ${durationText((Date.now() - sinceMs) / 1000)}`
      : '';
    const showStrip = config.show_strip !== false;

    return html`
      <ha-card
        class="control ${unavailable ? 'unavailable' : ''} ${showStrip ? 'strips' : ''}"
        style="--silk-accent:${accent}"
        @click=${this._onCardClick}
      >
        <div class="icon ${notable ? 'on' : ''}">
          ${icon
            ? html`<ha-icon .icon=${icon}></ha-icon>`
            : html`<ha-state-icon .hass=${hass} .stateObj=${stateObj}></ha-state-icon>`}
        </div>
        <div class="info">
          <div class="name" title=${name}>${name}</div>
          <div class="state">
            ${since}${showStrip && this._historyFailed
              ? html`<span class="sep">·</span>no history`
              : nothing}
          </div>
        </div>
        <div class="trailing">
          <span class="word" title=${word}>${word}</span>
        </div>
        ${showStrip ? this._renderStrip(stateObj) : nothing}
      </ha-card>
    `;
  }

  static styles = [
    silkControlStyles,
    css`
      /* No control action: the icon presses with the card. */
      .icon {
        cursor: inherit;
      }
      .icon:active {
        transform: none;
      }
      /* The strip owns the bottom 4px, so the row sits a touch higher. */
      ha-card.strips {
        padding-bottom: 14px;
      }
      .trailing {
        flex: 0 1 auto;
        min-width: 0;
      }
      .word {
        min-width: 0;
        font-size: 15px;
        font-weight: 600;
        letter-spacing: -0.01em;
        line-height: 1.2;
        color: var(--primary-text-color);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        transition: color 200ms ease;
      }
      .strip {
        position: absolute;
        left: 0;
        right: 0;
        bottom: 0;
        height: 4px;
        display: flex;
        gap: 2px;
        z-index: 0;
      }
      .blk {
        position: relative;
        flex: 1 1 0;
        min-width: 0;
        background: rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.09);
      }
      .blk.gap {
        background: rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.04);
      }
      .blk span {
        position: absolute;
        inset: 0;
        background: var(--silk-accent);
        transition: opacity 250ms var(--silk-ease-out);
      }
      .unavailable .strip {
        opacity: 0.45;
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    'silk-binary-card': SilkBinaryCard;
  }
}
