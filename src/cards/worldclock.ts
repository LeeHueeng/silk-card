import { LitElement, html, css, nothing, TemplateResult } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { HomeAssistant, LovelaceCardConfig } from '../types';
import { silkControlStyles } from '../shared/base';
import { registerRowsEditor } from '../shared/rows';

export const META = {
  type: 'silk-world-clock-card',
  name: 'Silk World Clock',
  description: 'Every timezone that matters to you.',
};

export interface WorldClockZoneConfig {
  label: string;
  /** IANA zone, e.g. 'America/New_York'. */
  tz: string;
  /** A 2-3 character text badge (never an emoji), e.g. 'NY'. */
  flag?: string;
}

export interface SilkWorldClockCardConfig extends LovelaceCardConfig {
  /** 1-6 zones. */
  zones: WorldClockZoneConfig[];
  show_date?: boolean;
  /** Omit to follow the Home Assistant time format / locale. */
  hour12?: boolean;
}

/**
 * `locale.time_format` is absent from Silk's minimal HomeAssistant type, but
 * it is what HA's own clocks read before falling back to the language default.
 */
interface HassWithTimeFormat extends HomeAssistant {
  locale?: { language: string; time_format?: '12' | '24' | 'language' | 'system' };
}

/** Per-zone formatters, rebuilt only when the locale/zones/options change. */
interface ZoneFormatters {
  valid: boolean;
  /** Fixed-locale numeric parts (ASCII digits) for day offset + night test. */
  parts?: Intl.DateTimeFormat;
  time?: Intl.DateTimeFormat;
  date?: Intl.DateTimeFormat;
}

interface ZoneReadout {
  time: string;
  meridiem?: string;
  date?: string;
  /** Calendar days ahead of (or behind) the viewer's own date: -1, 0, +1. */
  offset: number;
  night: boolean;
}

const MAX_ZONES = 6;
const TICK_MS = 60_000;
/** Local hours outside [NIGHT_END, NIGHT_START) read as night in that zone. */
const NIGHT_END = 6;
const NIGHT_START = 21;
const MS_PER_DAY = 86_400_000;
const BADGE_MAX = 3;

const EDITOR_TAG = 'silk-world-clock-card-editor';

/**
 * The cities offered in the dropdown. Any IANA name is still accepted — the
 * picker takes a custom value — but the list covers the zones people actually
 * put on a wall clock, so the common case is one click.
 */
const TZ_OPTIONS: { value: string; label: string }[] = [
  { value: 'Asia/Seoul', label: '서울 (Asia/Seoul)' },
  { value: 'Asia/Tokyo', label: '도쿄 (Asia/Tokyo)' },
  { value: 'Asia/Shanghai', label: '상하이 (Asia/Shanghai)' },
  { value: 'Asia/Hong_Kong', label: '홍콩 (Asia/Hong_Kong)' },
  { value: 'Asia/Singapore', label: '싱가포르 (Asia/Singapore)' },
  { value: 'Asia/Bangkok', label: '방콕 (Asia/Bangkok)' },
  { value: 'Asia/Jakarta', label: '자카르타 (Asia/Jakarta)' },
  { value: 'Asia/Kolkata', label: '콜카타 (Asia/Kolkata)' },
  { value: 'Asia/Dubai', label: '두바이 (Asia/Dubai)' },
  { value: 'Australia/Sydney', label: '시드니 (Australia/Sydney)' },
  { value: 'Pacific/Auckland', label: '오클랜드 (Pacific/Auckland)' },
  { value: 'Europe/London', label: '런던 (Europe/London)' },
  { value: 'Europe/Paris', label: '파리 (Europe/Paris)' },
  { value: 'Europe/Berlin', label: '베를린 (Europe/Berlin)' },
  { value: 'Europe/Madrid', label: '마드리드 (Europe/Madrid)' },
  { value: 'Europe/Rome', label: '로마 (Europe/Rome)' },
  { value: 'Europe/Amsterdam', label: '암스테르담 (Europe/Amsterdam)' },
  { value: 'Europe/Stockholm', label: '스톡홀름 (Europe/Stockholm)' },
  { value: 'Europe/Moscow', label: '모스크바 (Europe/Moscow)' },
  { value: 'Europe/Istanbul', label: '이스탄불 (Europe/Istanbul)' },
  { value: 'America/New_York', label: '뉴욕 (America/New_York)' },
  { value: 'America/Toronto', label: '토론토 (America/Toronto)' },
  { value: 'America/Chicago', label: '시카고 (America/Chicago)' },
  { value: 'America/Denver', label: '덴버 (America/Denver)' },
  { value: 'America/Los_Angeles', label: '로스앤젤레스 (America/Los_Angeles)' },
  { value: 'America/Vancouver', label: '밴쿠버 (America/Vancouver)' },
  { value: 'America/Mexico_City', label: '멕시코시티 (America/Mexico_City)' },
  { value: 'America/Sao_Paulo', label: '상파울루 (America/Sao_Paulo)' },
  { value: 'Africa/Cairo', label: '카이로 (Africa/Cairo)' },
  { value: 'Africa/Johannesburg', label: '요하네스버그 (Africa/Johannesburg)' },
  { value: 'UTC', label: 'UTC' },
];

// One row per clock: a label, a zone picked from the list (or typed), and the
// short text badge. The zone list is the whole card, so it must be clickable.
registerRowsEditor(EDITOR_TAG, {
  field: 'zones',
  title: `시간대 (최대 ${MAX_ZONES}개)`,
  addLabel: '시간대 추가',
  blank: { label: '새 도시', tz: 'UTC' },
  row: [
    { name: 'label', label: '도시 이름', selector: { text: {} } },
    {
      name: 'tz',
      label: '시간대(IANA)',
      selector: { select: { mode: 'dropdown', custom_value: true, options: TZ_OPTIONS } },
    },
    { name: 'flag', label: `배지(최대 ${BADGE_MAX}자)`, selector: { text: {} } },
  ],
  schema: [
    { name: 'show_date', selector: { boolean: {} } },
    { name: 'hour12', selector: { boolean: {} } },
  ],
  labels: { show_date: '현지 날짜 표시', hour12: '12시간 표기' },
  defaults: { show_date: false },
});

@customElement('silk-world-clock-card')
export class SilkWorldClockCard extends LitElement {
  @property({ attribute: false }) public hass?: HomeAssistant;

  @state() private _config?: SilkWorldClockCardConfig;
  @state() private _now = new Date();

  private _tickTimer?: number;
  private _fmtKey = '';
  private _fmts: ZoneFormatters[] = [];

  public static getStubConfig(): Partial<SilkWorldClockCardConfig> {
    return {
      type: 'custom:silk-world-clock-card',
      zones: [
        { label: 'New York', tz: 'America/New_York', flag: 'NY' },
        { label: 'London', tz: 'Europe/London', flag: 'LDN' },
      ],
    };
  }

  public static async getConfigElement(): Promise<HTMLElement> {
    return document.createElement(EDITOR_TAG);
  }

  public setConfig(config: SilkWorldClockCardConfig): void {
    if (!Array.isArray(config.zones) || config.zones.length === 0) {
      throw new Error(
        'silk-world-clock-card: `zones` is required — 1-6 of {label, tz} (tz is an IANA name)'
      );
    }
    if (config.zones.length > MAX_ZONES) {
      throw new Error(`silk-world-clock-card: at most ${MAX_ZONES} \`zones\``);
    }
    config.zones.forEach((zone, i) => {
      if (!zone || typeof zone.label !== 'string' || zone.label === '') {
        throw new Error(`silk-world-clock-card: zones[${i}] needs a \`label\``);
      }
      if (typeof zone.tz !== 'string' || zone.tz === '') {
        throw new Error(
          `silk-world-clock-card: zones[${i}] needs a \`tz\` (e.g. America/New_York)`
        );
      }
      if (zone.flag !== undefined && typeof zone.flag !== 'string') {
        throw new Error(`silk-world-clock-card: zones[${i}].flag must be a short text badge`);
      }
    });
    this._config = config;
    // An unknown zone must not break the card, so it is resolved per row at
    // render time (Intl throws on the constructor) rather than rejected here.
    this._fmtKey = '';
    this._now = new Date();
  }

  public getCardSize(): number {
    return Math.max(2, Math.ceil((this._config?.zones.length ?? 2) / 2));
  }

  public getGridOptions(): Record<string, number> {
    return { columns: 6, rows: 2, min_columns: 3, min_rows: 1 };
  }

  public connectedCallback(): void {
    super.connectedCallback();
    document.addEventListener('visibilitychange', this._onVisibility);
    this._startTicking();
  }

  public disconnectedCallback(): void {
    super.disconnectedCallback();
    document.removeEventListener('visibilitychange', this._onVisibility);
    this._stopTicking();
  }

  /** Ticks only while connected AND the document is visible. */
  private readonly _onVisibility = (): void => {
    if (document.hidden) this._stopTicking();
    else this._startTicking();
  };

  private _startTicking(): void {
    this._stopTicking();
    if (document.hidden) return;
    this._now = new Date();
    this._scheduleTick();
  }

  /**
   * Boundary-aligned timeout chain: every row flips exactly on the minute and
   * never drifts the way a 60s setInterval would.
   */
  private _scheduleTick(): void {
    const delay = TICK_MS - (Date.now() % TICK_MS) + 20;
    this._tickTimer = window.setTimeout(() => {
      this._now = new Date();
      this._scheduleTick();
    }, delay);
  }

  private _stopTicking(): void {
    window.clearTimeout(this._tickTimer);
    this._tickTimer = undefined;
  }

  private _locale(): string {
    return this.hass?.locale?.language ?? this.hass?.language ?? 'en';
  }

  /** Config wins; then HA's time format; undefined = let the locale decide. */
  private _hour12(): boolean | undefined {
    if (typeof this._config?.hour12 === 'boolean') return this._config.hour12;
    const format = (this.hass as HassWithTimeFormat | undefined)?.locale?.time_format;
    if (format === '12') return true;
    if (format === '24') return false;
    return undefined;
  }

  private _buildFormatters(
    tz: string,
    locale: string,
    hour12: boolean | undefined,
    withDate: boolean
  ): ZoneFormatters {
    try {
      const timeOpts: Intl.DateTimeFormatOptions = {
        timeZone: tz,
        hour: '2-digit',
        minute: '2-digit',
      };
      if (hour12 !== undefined) timeOpts.hour12 = hour12;
      return {
        valid: true,
        // en-US + h23 keeps these parts ASCII and 0-23 whatever the UI locale.
        parts: new Intl.DateTimeFormat('en-US', {
          timeZone: tz,
          year: 'numeric',
          month: 'numeric',
          day: 'numeric',
          hour: 'numeric',
          hourCycle: 'h23',
        }),
        time: new Intl.DateTimeFormat(locale, timeOpts),
        date: withDate
          ? new Intl.DateTimeFormat(locale, {
              timeZone: tz,
              weekday: 'short',
              month: 'short',
              day: 'numeric',
            })
          : undefined,
      };
    } catch {
      return { valid: false }; // RangeError: not a recognised IANA zone
    }
  }

  private _ensureFormatters(config: SilkWorldClockCardConfig): void {
    const locale = this._locale();
    const hour12 = this._hour12();
    const withDate = config.show_date === true;
    const key = `${locale}|${String(hour12)}|${withDate ? 1 : 0}|${config.zones
      .map((z) => z.tz)
      .join(',')}`;
    if (key === this._fmtKey && this._fmts.length === config.zones.length) return;
    this._fmtKey = key;
    this._fmts = config.zones.map((zone) =>
      this._buildFormatters(zone.tz, locale, hour12, withDate)
    );
  }

  /** Everything one row needs, or null when the zone can't be formatted. */
  private _readout(fmt: ZoneFormatters, now: Date, localDay: number): ZoneReadout | null {
    if (!fmt.valid || !fmt.parts || !fmt.time) return null;
    try {
      let year = NaN;
      let month = NaN;
      let day = NaN;
      let hour = NaN;
      for (const part of fmt.parts.formatToParts(now)) {
        const value = Number(part.value);
        if (part.type === 'year') year = value;
        else if (part.type === 'month') month = value;
        else if (part.type === 'day') day = value;
        else if (part.type === 'hour') hour = value;
      }
      if (![year, month, day, hour].every(Number.isFinite)) return null;
      const timeParts = fmt.time.formatToParts(now);
      const time = timeParts
        .filter((p) => p.type !== 'dayPeriod')
        .map((p) => p.value)
        .join('')
        .trim();
      return {
        time,
        meridiem: timeParts.find((p) => p.type === 'dayPeriod')?.value,
        date: fmt.date?.format(now),
        offset: Math.round((Date.UTC(year, month - 1, day) - localDay) / MS_PER_DAY),
        night: hour < NIGHT_END || hour >= NIGHT_START,
      };
    } catch {
      return null;
    }
  }

  private _renderBadge(flag?: string): TemplateResult | typeof nothing {
    const badge = flag ? Array.from(flag.trim()).slice(0, BADGE_MAX).join('') : '';
    return badge ? html`<span class="badge">${badge}</span>` : nothing;
  }

  private _renderRow(
    zone: WorldClockZoneConfig,
    fmt: ZoneFormatters,
    localDay: number
  ): TemplateResult {
    const read = this._readout(fmt, this._now, localDay);
    if (!read) {
      return html`
        <div class="row">
          <ha-icon class="sky bad" icon="mdi:alert-circle-outline"></ha-icon>
          <div class="info">
            <div class="lead">
              <span class="label">${zone.label}</span>${this._renderBadge(zone.flag)}
            </div>
          </div>
          <div class="right"><span class="bad">Invalid timezone</span></div>
        </div>
      `;
    }
    // U+2212 for the behind-marker: a real minus sign, not a hyphen.
    const offset = read.offset > 0 ? `+${read.offset}` : `−${Math.abs(read.offset)}`;
    return html`
      <div class="row ${read.night ? 'night' : 'day'}">
        <ha-icon
          class="sky"
          .icon=${read.night ? 'mdi:weather-night' : 'mdi:weather-sunny'}
          aria-hidden="true"
        ></ha-icon>
        <div class="info">
          <div class="lead">
            <span class="label" title=${zone.label}>${zone.label}</span>${this._renderBadge(
              zone.flag
            )}
          </div>
          ${read.date ? html`<div class="zdate">${read.date}</div>` : nothing}
        </div>
        <div class="right">
          <span class="ztime">${read.time}</span>
          ${read.meridiem ? html`<span class="meri">${read.meridiem}</span>` : nothing}
          ${read.offset !== 0
            ? html`<span class="offset" title=${read.offset > 0 ? 'Next day' : 'Previous day'}
                >${offset}</span
              >`
            : nothing}
        </div>
      </div>
    `;
  }

  protected render(): TemplateResult | typeof nothing {
    const config = this._config;
    if (!config) return nothing;
    this._ensureFormatters(config);
    const now = this._now;
    const localDay = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
    return html`
      <ha-card>
        ${config.zones.map((zone, i) =>
          this._renderRow(zone, this._fmts[i] ?? { valid: false }, localDay)
        )}
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
        gap: 2px;
        padding: 8px 14px;
        cursor: default;
      }
      .row {
        flex: none;
        display: flex;
        align-items: center;
        gap: 10px;
        min-width: 0;
        min-height: 30px;
      }
      .sky {
        flex: none;
        --mdc-icon-size: 14px;
        width: 14px;
        height: 14px;
        color: var(--silk-accent);
        transition: color 200ms ease, opacity 200ms ease;
      }
      /* Night is the absence of light, not another color: the sun's accent
         drops to a dim monochrome moon. */
      .row.night .sky {
        color: var(--primary-text-color);
        opacity: 0.45;
      }
      .sky.bad {
        color: var(--error-color, #db4437);
        opacity: 1;
      }
      .info {
        flex: 1;
        min-width: 0;
      }
      .lead {
        display: flex;
        align-items: center;
        gap: 6px;
        min-width: 0;
      }
      .label {
        font-size: 13px;
        font-weight: 500;
        line-height: 1.3;
        color: var(--primary-text-color);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .badge {
        flex: none;
        font-size: 10px;
        font-weight: 600;
        line-height: 1;
        padding: 3px 5px;
        border-radius: 5px;
        white-space: nowrap;
        color: var(--secondary-text-color);
        background: rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.08);
      }
      .zdate {
        font-size: 11px;
        line-height: 1.3;
        color: var(--secondary-text-color);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        font-variant-numeric: tabular-nums;
      }
      .right {
        flex: none;
        display: flex;
        align-items: baseline;
        gap: 4px;
        min-width: 0;
      }
      .ztime {
        font-size: 17px;
        font-weight: 600;
        letter-spacing: -0.01em;
        line-height: 1.25;
        color: var(--primary-text-color);
        font-variant-numeric: tabular-nums;
        white-space: nowrap;
      }
      .meri {
        font-size: 11px;
        font-weight: 500;
        color: var(--secondary-text-color);
        white-space: nowrap;
      }
      .offset {
        font-size: 10px;
        line-height: 1;
        color: var(--secondary-text-color);
        font-variant-numeric: tabular-nums;
        white-space: nowrap;
      }
      .bad {
        font-size: 12.5px;
        color: var(--error-color, #db4437);
        white-space: nowrap;
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    'silk-world-clock-card': SilkWorldClockCard;
  }
}
