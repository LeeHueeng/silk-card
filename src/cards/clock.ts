import { LitElement, html, svg, css, nothing, TemplateResult } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { HomeAssistant, LovelaceCardConfig } from '../types';
import { silkControlStyles } from '../shared/base';
import { registerEditor } from '../shared/editor';

export const META = {
  type: 'silk-clock-card',
  name: 'Silk Clock',
  description: 'Time, beautifully told.',
};

export type ClockStyle = 'digital' | 'analog';

export interface SilkClockCardConfig extends LovelaceCardConfig {
  style?: ClockStyle;
  show_seconds?: boolean;
  name?: string;
}

/**
 * Analog face geometry (viewBox 0 0 100 100, center 50/50, rendered ~110px).
 * Twelve tick marks; the four quarter marks sit deeper and heavier.
 */
interface Tick {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  quarter: boolean;
}

const TICKS: Tick[] = Array.from({ length: 12 }, (_, i) => {
  const quarter = i % 3 === 0;
  const rad = (i * 30 * Math.PI) / 180;
  const inner = quarter ? 39.5 : 42.5;
  const outer = 45.5;
  return {
    x1: 50 + inner * Math.sin(rad),
    y1: 50 - inner * Math.cos(rad),
    x2: 50 + outer * Math.sin(rad),
    y2: 50 - outer * Math.cos(rad),
    quarter,
  };
});

const EDITOR_TAG = 'silk-clock-card-editor';

registerEditor(
  EDITOR_TAG,
  [
    { name: 'name', selector: { text: {} } },
    {
      name: 'style',
      selector: {
        select: {
          mode: 'dropdown',
          options: [
            { value: 'digital', label: '디지털' },
            { value: 'analog', label: '아날로그' },
          ],
        },
      },
    },
    { name: 'show_seconds', selector: { boolean: {} } },
  ],
  { name: '이름', style: '표시 방식', show_seconds: '초 표시' },
  { style: 'digital', show_seconds: false }
);

@customElement('silk-clock-card')
export class SilkClockCard extends LitElement {
  @property({ attribute: false }) public hass?: HomeAssistant;

  @state() private _config?: SilkClockCardConfig;
  @state() private _now = new Date();

  private _tickTimer?: number;

  /** Formatters are cached per locale — render runs every second. */
  private _fmtLocale = '';
  private _timeFmt?: Intl.DateTimeFormat;
  private _dateFmt?: Intl.DateTimeFormat;
  private _secondsFmt?: Intl.NumberFormat;

  public static getStubConfig(): Partial<SilkClockCardConfig> {
    return { type: 'custom:silk-clock-card', style: 'digital' };
  }

  public static async getConfigElement(): Promise<HTMLElement> {
    return document.createElement(EDITOR_TAG);
  }

  public setConfig(config: SilkClockCardConfig): void {
    if (config.style !== undefined && config.style !== 'digital' && config.style !== 'analog') {
      throw new Error("silk-clock-card: `style` must be 'digital' or 'analog'");
    }
    this._config = config;
    // Style/seconds change the tick cadence; restart if we're already running.
    if (this.isConnected) this._startTicking();
  }

  public getCardSize(): number {
    return 2;
  }

  public getGridOptions(): Record<string, number> {
    return { columns: 3, rows: 2, min_columns: 2 };
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

  /** 1s cadence whenever a second-resolution display is on screen, else 60s. */
  private _cadenceMs(): number {
    const c = this._config;
    return c && (c.style === 'analog' || c.show_seconds) ? 1000 : 60_000;
  }

  private _startTicking(): void {
    this._stopTicking();
    if (document.hidden) return;
    this._now = new Date();
    this._scheduleTick();
  }

  /**
   * Self-correcting timeout chain aligned to the second/minute boundary, so
   * the display flips exactly on the tick and never drifts like setInterval.
   */
  private _scheduleTick(): void {
    const period = this._cadenceMs();
    const delay = period - (Date.now() % period) + 20;
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

  private _ensureFormatters(): void {
    const locale = this._locale();
    if (locale === this._fmtLocale && this._timeFmt) return;
    this._fmtLocale = locale;
    this._timeFmt = new Intl.DateTimeFormat(locale, { hour: '2-digit', minute: '2-digit' });
    this._dateFmt = new Intl.DateTimeFormat(locale, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
    this._secondsFmt = new Intl.NumberFormat(locale, { minimumIntegerDigits: 2 });
  }

  /** Locale time split into digits and (when the locale has one) a day period. */
  private _timeParts(now: Date): { time: string; meridiem?: string } {
    const parts = this._timeFmt!.formatToParts(now);
    const time = parts
      .filter((p) => p.type !== 'dayPeriod')
      .map((p) => p.value)
      .join('')
      .trim();
    const meridiem = parts.find((p) => p.type === 'dayPeriod')?.value;
    return { time, meridiem };
  }

  private _renderDigital(now: Date, showSeconds: boolean): TemplateResult {
    const { time, meridiem } = this._timeParts(now);
    return html`
      <div class="time-row">
        <span class="time">${time}</span>
        ${showSeconds
          ? html`<span class="small">${this._secondsFmt!.format(now.getSeconds())}</span>`
          : nothing}
        ${meridiem ? html`<span class="small">${meridiem}</span>` : nothing}
      </div>
      <div class="date">${this._dateFmt!.format(now)}</div>
    `;
  }

  private _renderAnalog(now: Date, showSeconds: boolean): TemplateResult {
    const seconds = now.getSeconds();
    const minutes = now.getMinutes() + seconds / 60;
    const hours = (now.getHours() % 12) + minutes / 60;
    // The transform attribute carries the rotation and .hand sets transition:
    // none, so the once-per-revolution 359°→0° wrap never animates backwards.
    const { time, meridiem } = this._timeParts(now);
    return html`
      <svg
        class="face"
        viewBox="0 0 100 100"
        role="img"
        aria-label=${meridiem ? `${time} ${meridiem}` : time}
      >
        <circle class="face-bg" cx="50" cy="50" r="47"></circle>
        ${TICKS.map(
          (t) => svg`
            <line
              class="tick ${t.quarter ? 'quarter' : ''}"
              x1=${t.x1.toFixed(2)}
              y1=${t.y1.toFixed(2)}
              x2=${t.x2.toFixed(2)}
              y2=${t.y2.toFixed(2)}
            ></line>`
        )}
        <rect
          class="hand"
          x="48.4"
          y="25"
          width="3.2"
          height="29"
          rx="1.6"
          transform="rotate(${(hours * 30).toFixed(2)} 50 50)"
        ></rect>
        <rect
          class="hand"
          x="48.8"
          y="17"
          width="2.4"
          height="37"
          rx="1.2"
          transform="rotate(${(minutes * 6).toFixed(2)} 50 50)"
        ></rect>
        ${showSeconds
          ? svg`
            <rect
              class="hand second"
              x="49.25"
              y="13"
              width="1.5"
              height="45"
              rx="0.75"
              transform="rotate(${seconds * 6} 50 50)"
            ></rect>`
          : nothing}
        <circle class="cap" cx="50" cy="50" r="2.6"></circle>
      </svg>
    `;
  }

  protected render(): TemplateResult | typeof nothing {
    const config = this._config;
    if (!config) return nothing;
    this._ensureFormatters();
    const analog = config.style === 'analog';
    const showSeconds = config.show_seconds === true;
    return html`
      <ha-card>
        ${config.name ? html`<div class="label" title=${config.name}>${config.name}</div>` : nothing}
        ${analog
          ? this._renderAnalog(this._now, showSeconds)
          : this._renderDigital(this._now, showSeconds)}
      </ha-card>
    `;
  }

  static styles = [
    silkControlStyles,
    css`
      ha-card {
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 2px;
        padding: 10px 12px;
        cursor: default;
      }
      .label {
        flex: none;
        font-size: 12px;
        font-weight: 500;
        line-height: 1.3;
        color: var(--secondary-text-color);
        max-width: 100%;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .time-row {
        display: flex;
        align-items: baseline;
        gap: 5px;
        max-width: 100%;
        min-width: 0;
      }
      .time {
        font-size: 34px;
        font-weight: 700;
        letter-spacing: -0.02em;
        line-height: 1.1;
        color: var(--primary-text-color);
        font-variant-numeric: tabular-nums;
        white-space: nowrap;
      }
      .small {
        font-size: 15px;
        font-weight: 500;
        color: var(--secondary-text-color);
        font-variant-numeric: tabular-nums;
        white-space: nowrap;
      }
      .date {
        font-size: 12px;
        line-height: 1.3;
        color: var(--secondary-text-color);
        max-width: 100%;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        font-variant-numeric: tabular-nums;
      }
      .face {
        display: block;
        width: 110px;
        max-width: 100%;
        max-height: 100%;
        min-height: 0;
        flex: 0 1 auto;
        aspect-ratio: 1 / 1;
      }
      .face-bg {
        fill: rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.04);
      }
      .tick {
        stroke: var(--primary-text-color);
        stroke-width: 1.5;
        stroke-linecap: round;
        opacity: 0.3;
      }
      .tick.quarter {
        stroke-width: 2.5;
        opacity: 0.7;
      }
      .hand {
        fill: var(--primary-text-color);
        /* Discrete quartz ticks; also prevents a 359°→0° spin-back animation. */
        transition: none;
      }
      .hand.second {
        fill: var(--silk-accent);
      }
      .cap {
        fill: var(--primary-text-color);
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    'silk-clock-card': SilkClockCard;
  }
}
