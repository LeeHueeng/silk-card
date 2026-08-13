import { LitElement, html, css, nothing, PropertyValues, TemplateResult } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { HomeAssistant, LovelaceCardConfig } from '../types';
import { silkControlStyles } from '../shared/base';
import { haptic } from '../shared/service';
import { accentFor } from '../shared/color';
import { registerEditor } from '../shared/editor';

export const META = {
  type: 'silk-errors-card',
  name: 'Silk Errors',
  description: 'The log, but only the parts that matter.',
};

export interface SilkErrorsCardConfig extends LovelaceCardConfig {
  name?: string;
  /** Lowest level kept: `ERROR` (default) or `WARNING`. */
  level?: string;
  /** Rows to show, defaults to 5. */
  limit?: number;
  /** Accent override. */
  color?: string;
}

/**
 * hass.callApi exists on the real frontend hass object but is not part of
 * Silk's minimal HomeAssistant type — extend it locally. `error_log` answers
 * with the raw log file as plain text, so it is typed as a string here.
 */
interface HassWithApi extends HomeAssistant {
  callApi<T>(method: 'GET', path: string): Promise<T>;
}

type Level = 'ERROR' | 'WARNING';

interface LogLine {
  /** Epoch ms of the log line; NaN when the stamp could not be parsed. */
  ts: number;
  level: Level;
  logger: string;
  message: string;
}

const DEFAULT_NAME = 'Errors';
const DEFAULT_LIMIT = 5;
const MAX_LIMIT = 20;
const DEFAULT_LEVEL: Level = 'ERROR';
const REFRESH_INTERVAL_MS = 300_000;
/** Re-render cadence so the relative times never go stale between fetches. */
const CLOCK_TICK_MS = 60_000;
/** The log file can be megabytes; only its tail is ever interesting. */
const TAIL_CHARS = 200_000;

/**
 * `2026-08-12 10:15:32.123 ERROR (MainThread) [homeassistant.core] message`.
 * Deliberately loose: the thread and logger brackets are both optional, so
 * supervisor-flavored lines still parse.
 */
const LINE_RE =
  /^(\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}:\d{2}(?:[.,]\d+)?)\s+(DEBUG|INFO|WARNING|ERROR|CRITICAL|FATAL)\s*(?:\([^)]*\)\s*)?(?:\[([^\]]*)\]\s*)?(.*)$/;

const EDITOR_TAG = 'silk-errors-card-editor';

registerEditor(
  EDITOR_TAG,
  [
    { name: 'name', selector: { text: {} } },
    {
      name: 'level',
      selector: {
        select: {
          mode: 'dropdown',
          options: [
            { value: 'ERROR', label: 'Errors only' },
            { value: 'WARNING', label: 'Warnings and errors' },
          ],
        },
      },
    },
    { name: 'limit', selector: { number: { min: 1, max: MAX_LIMIT, mode: 'box' } } },
  ],
  { name: 'Name', level: 'Lowest level', limit: 'Rows to show' },
  { level: DEFAULT_LEVEL, limit: DEFAULT_LIMIT }
);

/** <60s → 'just now', <1h → 'Nm ago', <24h → 'Hh ago', else 'Dd ago'. */
function relativeTime(ms: number): string {
  if (!Number.isFinite(ms)) return '';
  const sec = Math.max(0, (Date.now() - ms) / 1000);
  if (sec < 60) return 'just now';
  if (sec < 3600) return `${Math.floor(sec / 60)}m ago`;
  if (sec < 86400) return `${Math.floor(sec / 3600)}h ago`;
  return `${Math.floor(sec / 86400)}d ago`;
}

/** HA logs local time without a zone; 'T' makes Date.parse agree with that. */
function parseStamp(raw: string): number {
  return Date.parse(raw.replace(' ', 'T').replace(',', '.'));
}

/** The last path segment of a dotted logger name — `core`, not the full path. */
function shortLogger(logger: string): string {
  if (!logger) return '';
  const parts = logger.split('.');
  return parts.length > 2 ? parts.slice(-2).join('.') : logger;
}

/**
 * The tail of Home Assistant's log, filtered down to the lines that actually
 * mean something: what broke, which component broke it, and how long ago.
 */
@customElement('silk-errors-card')
export class SilkErrorsCard extends LitElement {
  @property({ attribute: false }) public hass?: HomeAssistant;

  @state() private _config?: SilkErrorsCardConfig;
  /** Newest first, capped at MAX_LIMIT; null until the first fetch resolves. */
  @state() private _lines: LogLine[] | null = null;
  /** Every matching line in the fetched tail — the header count. */
  @state() private _total = 0;
  @state() private _failed = false;
  @state() private _loading = false;

  private _fetchStarted = false;
  private _fetchSeq = 0;
  private _intervalTimer?: number;
  private _clockTimer?: number;

  public static getStubConfig(): Partial<SilkErrorsCardConfig> {
    // No entity required — the card reads the log file itself.
    return { type: 'custom:silk-errors-card' };
  }

  public static async getConfigElement(): Promise<HTMLElement> {
    return document.createElement(EDITOR_TAG);
  }

  public setConfig(config: SilkErrorsCardConfig): void {
    if (config.level !== undefined) {
      const level = String(config.level).toUpperCase();
      if (level !== 'ERROR' && level !== 'WARNING') {
        throw new Error("silk-errors-card: `level` must be either `ERROR` or `WARNING`");
      }
    }
    if (config.limit !== undefined && (!Number.isFinite(config.limit) || config.limit < 1)) {
      throw new Error('silk-errors-card: `limit` must be a number of at least 1');
    }
    this._config = config;
    this._lines = null;
    this._total = 0;
    this._failed = false;
    this._fetchStarted = false;
  }

  public getCardSize(): number {
    // Two-line messages make these rows taller than a plain list card's.
    return 4;
  }

  public getGridOptions(): Record<string, number> {
    return { columns: 6, rows: 3, min_columns: 4, min_rows: 2 };
  }

  public connectedCallback(): void {
    super.connectedCallback();
    this._intervalTimer = window.setInterval(() => this._refresh(), REFRESH_INTERVAL_MS);
    this._clockTimer = window.setInterval(() => this.requestUpdate(), CLOCK_TICK_MS);
    if (this.hasUpdated && this._fetchStarted) this._refresh();
  }

  public disconnectedCallback(): void {
    super.disconnectedCallback();
    window.clearInterval(this._intervalTimer);
    window.clearInterval(this._clockTimer);
  }

  protected willUpdate(_changed: PropertyValues): void {
    if (!this.hass || !this._config || this._fetchStarted) return;
    this._fetchStarted = true;
    this._refresh();
  }

  private _level(): Level {
    return String(this._config?.level ?? DEFAULT_LEVEL).toUpperCase() === 'WARNING'
      ? 'WARNING'
      : 'ERROR';
  }

  private _limit(): number {
    return Math.min(MAX_LIMIT, Math.max(1, Math.floor(this._config?.limit ?? DEFAULT_LIMIT)));
  }

  private async _refresh(): Promise<void> {
    const hass = this.hass;
    if (!hass) return;
    const seq = ++this._fetchSeq;
    this._loading = true;
    let text: string;
    try {
      // `error_log` answers with the plain log file, not JSON.
      text = String(await (hass as HassWithApi).callApi<string>('GET', 'error_log'));
    } catch (err) {
      console.warn('silk-errors-card: error log fetch failed', err);
      if (seq === this._fetchSeq) {
        this._failed = true;
        this._loading = false;
      }
      return;
    }
    if (seq !== this._fetchSeq) return; // a newer fetch superseded this one
    this._failed = false;
    this._loading = false;
    this._lines = this._parse(text);
  }

  /**
   * Header lines only: a traceback's continuation lines belong to the entry
   * above them and would flood a two-line message clamp with stack frames.
   */
  private _parse(text: string): LogLine[] {
    const tail = text.length > TAIL_CHARS ? text.slice(-TAIL_CHARS) : text;
    const wanted = this._level();
    const out: LogLine[] = [];
    for (const raw of tail.split('\n')) {
      const match = LINE_RE.exec(raw.trimEnd());
      if (!match) continue;
      const severity = match[2];
      const level: Level = severity === 'WARNING' ? 'WARNING' : 'ERROR';
      if (severity === 'DEBUG' || severity === 'INFO') continue;
      if (wanted === 'ERROR' && level === 'WARNING') continue;
      const message = match[4].trim();
      if (!message) continue;
      out.push({ ts: parseStamp(match[1]), level, logger: match[3] ?? '', message });
    }
    this._total = out.length;
    // The file reads oldest-first; the card reads newest-first.
    return out.reverse().slice(0, MAX_LIMIT);
  }

  private _onReload(ev: Event): void {
    ev.stopPropagation();
    if (this._loading) return;
    haptic(this);
    this._refresh();
  }

  private _renderRow(line: LogLine): TemplateResult {
    const logger = shortLogger(line.logger);
    // Sentence case, not an uppercase tracked label — the tint carries the level.
    const label = line.level === 'ERROR' ? 'Error' : 'Warning';
    return html`
      <div class="row" title=${`${line.logger || label}: ${line.message}`}>
        <div class="meta">
          <span class="level ${line.level === 'ERROR' ? 'err' : 'warn'}">${label}</span>
          ${logger ? html`<span class="logger">${logger}</span>` : nothing}
          <span class="when">${relativeTime(line.ts)}</span>
        </div>
        <div class="message">${line.message}</div>
      </div>
    `;
  }

  protected render(): TemplateResult | typeof nothing {
    const config = this._config;
    if (!config) return nothing;

    const shown = this._lines?.slice(0, this._limit()) ?? [];
    const total = this._total;
    const scope = this._level() === 'WARNING' ? 'warnings and errors' : 'errors';

    return html`
      <ha-card class="control" style="--silk-accent:${accentFor(undefined, config.color)}">
        <div class="header">
          <div class="hname">${config.name ?? DEFAULT_NAME}</div>
          ${total
            ? html`<span class="count" title=${`${total} ${scope} in the log tail`}
                >${total}</span
              >`
            : nothing}
          <button
            class="reload"
            aria-label="Reload the error log"
            title="Reload the error log"
            .disabled=${this._loading}
            @click=${this._onReload}
          >
            <ha-icon class=${this._loading ? 'spin' : ''} .icon=${'mdi:refresh'}></ha-icon>
          </button>
        </div>
        ${this._failed
          ? html`<div class="note">Error log unavailable</div>`
          : this._lines === null
            ? html`<div class="note">Reading the log…</div>`
            : shown.length
              ? html`<div class="rows">${shown.map((line) => this._renderRow(line))}</div>`
              : html`<div class="note">No errors logged</div>`}
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
        gap: 8px;
        padding: 12px 14px;
        cursor: default;
      }
      .header {
        flex: none;
        display: flex;
        align-items: center;
        gap: 8px;
        min-height: 28px;
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
        line-height: 1;
        padding: 4px 9px;
        border-radius: 999px;
        color: var(--secondary-text-color);
        background: rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.06);
        font-variant-numeric: tabular-nums;
      }
      .reload {
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
        color: var(--secondary-text-color);
        background: rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.06);
        transition:
          transform 250ms var(--silk-spring),
          background 150ms ease-out,
          color 150ms ease-out;
      }
      /* Invisible halo lifts the touch target past 40px without growing the key. */
      .reload::after {
        content: '';
        position: absolute;
        inset: -7px;
        border-radius: 12px;
      }
      .reload:hover {
        color: var(--silk-accent);
        background: color-mix(in srgb, var(--silk-accent) 16%, transparent);
      }
      .reload:active {
        transform: scale(0.9);
        transition-duration: 120ms;
        transition-timing-function: var(--silk-ease-out);
      }
      .reload:disabled {
        cursor: default;
      }
      .reload:focus-visible {
        outline: 2px solid color-mix(in srgb, var(--silk-accent) 70%, transparent);
        outline-offset: 2px;
      }
      .reload ha-icon {
        --mdc-icon-size: 16px;
        pointer-events: none;
      }
      /* Real activity, not decoration: it spins only while a fetch is in air. */
      .reload ha-icon.spin {
        animation: silk-errors-spin 900ms linear infinite;
      }
      .rows {
        flex: 1;
        min-height: 0;
        display: flex;
        flex-direction: column;
        gap: 8px;
        overflow: hidden;
      }
      .row {
        flex: none;
        min-width: 0;
        animation: silk-errors-in 250ms var(--silk-ease-out);
      }
      .meta {
        display: flex;
        align-items: center;
        gap: 6px;
        min-width: 0;
      }
      .level {
        flex: none;
        font-size: 11px;
        font-weight: 600;
        line-height: 1;
        padding: 3px 7px;
        border-radius: 999px;
      }
      /* Status colors for genuine status: this line is an error or a warning. */
      .level.err {
        color: var(--error-color, #db4437);
        background: color-mix(in srgb, var(--error-color, #db4437) 14%, transparent);
      }
      .level.warn {
        color: var(--warning-color, #ffa600);
        background: color-mix(in srgb, var(--warning-color, #ffa600) 16%, transparent);
      }
      .logger {
        flex: 1;
        min-width: 0;
        font-size: 11px;
        line-height: 1.3;
        color: var(--secondary-text-color);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .when {
        flex: none;
        margin-left: auto;
        font-size: 11px;
        line-height: 1.3;
        color: var(--secondary-text-color);
        font-variant-numeric: tabular-nums;
        white-space: nowrap;
      }
      .message {
        margin-top: 2px;
        font-size: 12px;
        line-height: 1.35;
        color: var(--primary-text-color);
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
        overflow: hidden;
        overflow-wrap: anywhere;
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
      @keyframes silk-errors-in {
        from {
          opacity: 0;
        }
        to {
          opacity: 1;
        }
      }
      @keyframes silk-errors-spin {
        to {
          transform: rotate(360deg);
        }
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    'silk-errors-card': SilkErrorsCard;
  }
}
