import { LitElement, html, css, nothing, PropertyValues, TemplateResult } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { HomeAssistant, HassEntity, LovelaceCardConfig } from '../types';
import { silkControlStyles } from '../shared/base';
import { isUnavailable, haptic, moreInfo } from '../shared/service';
import { accentFor } from '../shared/color';
import { registerEditor } from '../shared/editor';

export const META = {
  type: 'silk-quote-card',
  name: 'Silk Quote',
  description: 'A line worth reading twice.',
};

/** One quotation. `author` is optional — plenty of good lines are unsigned. */
export interface SilkQuote {
  text: string;
  author?: string;
}

export interface SilkQuoteCardConfig extends LovelaceCardConfig {
  /** YAML-only: the pool. Strings or {text, author} both accepted. */
  quotes?: (string | SilkQuote)[];
  /** Alternative source: an entity whose state/attributes carry the line. */
  entity?: string;
  /** Seconds between rotations (ignored when `daily`). Default 3600. */
  interval?: number;
  /** One line per calendar day, identical on every screen in the house. */
  daily?: boolean;
  /** Small label above the quote. */
  name?: string;
  /** Accent override. */
  color?: string;
}

const DEFAULT_INTERVAL_S = 3600;
const MIN_INTERVAL_S = 5;
/** Fade-out, swap, fade-in — the crossfade the spec asks for. */
const FADE_MS = 300;

/** 1-based day of the local year; Math.round keeps it DST-proof. */
function dayOfYear(d: Date): number {
  const startOfYear = new Date(d.getFullYear(), 0, 1).getTime();
  const today = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  return Math.round((today - startOfYear) / 86_400_000) + 1;
}

/** Readers who asked for less motion get the swap instantly, not a blank beat. */
function prefersReducedMotion(): boolean {
  return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true;
}

function normalizeQuote(raw: unknown): SilkQuote | null {
  if (typeof raw === 'string') {
    const text = raw.trim();
    return text ? { text } : null;
  }
  if (!raw || typeof raw !== 'object') return null;
  const obj = raw as Record<string, unknown>;
  const text = String(obj.text ?? obj.quote ?? obj.message ?? '').trim();
  if (!text) return null;
  const rawAuthor = obj.author ?? obj.attribution ?? obj.by;
  const author = rawAuthor === undefined || rawAuthor === null ? '' : String(rawAuthor).trim();
  return author ? { text, author } : { text };
}

function normalizeList(raw: unknown[]): SilkQuote[] {
  return raw.map(normalizeQuote).filter((q): q is SilkQuote => q !== null);
}

const EDITOR_TAG = 'silk-quote-card-editor';

// The quote pool stays YAML-only: ha-form has no editor for a list of
// {text, author} pairs, and a flattened one would dwarf the card.
registerEditor(
  EDITOR_TAG,
  [
    { name: 'entity', selector: { entity: { domain: ['sensor', 'input_text'] } } },
    { name: 'name', selector: { text: {} } },
    {
      name: '',
      type: 'grid',
      schema: [
        {
          name: 'interval',
          selector: { number: { min: MIN_INTERVAL_S, step: 1, mode: 'box' } },
        },
        { name: 'daily', selector: { boolean: {} } },
      ],
    },
    { name: 'color', selector: { ui_color: {} } },
  ],
  {
    entity: '엔터티 (문구 출처, 선택)',
    name: '이름',
    interval: '문구 교체 주기 (초)',
    daily: '하루에 한 문구',
    color: '강조 색상',
  },
  { interval: DEFAULT_INTERVAL_S, daily: false }
);

/**
 * A quote that changes on its own clock. The index is derived from wall time
 * (day-of-year when `daily`, otherwise the interval bucket) rather than an
 * internal counter, so every screen in the house shows the same line and a
 * reload never resets the rotation.
 */
@customElement('silk-quote-card')
export class SilkQuoteCard extends LitElement {
  @property({ attribute: false }) public hass?: HomeAssistant;

  @state() private _config?: SilkQuoteCardConfig;

  /** The quote currently painted — lags the computed one during a fade. */
  @state() private _shown?: SilkQuote;
  @state() private _visible = true;

  /** Identity of `_shown` (index + text) so entity edits also crossfade. */
  private _shownKey = '';
  /** Manual advances from taps, added on top of the time-derived index. */
  private _offset = 0;
  private _fadeTimer?: number;
  private _rotateTimer?: number;

  public static getStubConfig(): Partial<SilkQuoteCardConfig> {
    return {
      type: 'custom:silk-quote-card',
      quotes: [
        { text: 'The details are not the details. They make the design.', author: 'Charles Eames' },
        { text: 'Simplicity is the ultimate sophistication.', author: 'Leonardo da Vinci' },
      ],
      daily: true,
    };
  }

  public static async getConfigElement(): Promise<HTMLElement> {
    return document.createElement(EDITOR_TAG);
  }

  public setConfig(config: SilkQuoteCardConfig): void {
    if (config.quotes !== undefined && !Array.isArray(config.quotes)) {
      throw new Error('silk-quote-card: `quotes` must be a list of texts or {text, author}');
    }
    const pool = Array.isArray(config.quotes) ? normalizeList(config.quotes) : [];
    if (pool.length === 0 && !config.entity) {
      throw new Error('silk-quote-card: needs `quotes` (a non-empty list) or an `entity`');
    }
    if (config.interval !== undefined && !(Number(config.interval) >= MIN_INTERVAL_S)) {
      throw new Error(`silk-quote-card: \`interval\` must be at least ${MIN_INTERVAL_S} seconds`);
    }
    this._config = config;
    this._offset = 0;
    this._shown = undefined;
    this._shownKey = '';
    this._visible = true;
    if (this.isConnected) {
      this._sync();
      this._schedule();
    }
  }

  public getCardSize(): number {
    return 2;
  }

  public getGridOptions(): Record<string, number> {
    return { columns: 6, rows: 2, min_columns: 4, min_rows: 2 };
  }

  public connectedCallback(): void {
    super.connectedCallback();
    this._sync();
    this._schedule();
  }

  public disconnectedCallback(): void {
    super.disconnectedCallback();
    window.clearTimeout(this._fadeTimer);
    window.clearTimeout(this._rotateTimer);
    this._fadeTimer = undefined;
    this._rotateTimer = undefined;
  }

  protected willUpdate(changed: PropertyValues): void {
    // An entity-sourced line can change under us at any state update.
    if (changed.has('hass') && this._config?.entity) this._sync();
  }

  private _intervalMs(): number {
    return Math.max(MIN_INTERVAL_S, Number(this._config?.interval ?? DEFAULT_INTERVAL_S)) * 1000;
  }

  /** Quotes from config, else whatever the entity carries. */
  private _pool(): SilkQuote[] {
    const config = this._config;
    if (!config) return [];
    const fromConfig = Array.isArray(config.quotes) ? normalizeList(config.quotes) : [];
    if (fromConfig.length) return fromConfig;
    return this._entityQuotes(config.entity ? this.hass?.states[config.entity] : undefined);
  }

  /** A sensor may hold one line in its state, or a whole list in an attribute. */
  private _entityQuotes(stateObj?: HassEntity): SilkQuote[] {
    if (!stateObj || isUnavailable(stateObj)) return [];
    const attrs = stateObj.attributes;
    if (Array.isArray(attrs.quotes)) return normalizeList(attrs.quotes);
    const fromAttrs = normalizeQuote(attrs);
    if (fromAttrs) return [fromAttrs];
    const text = String(stateObj.state ?? '').trim();
    if (!text) return [];
    const rawAuthor = attrs.author ?? attrs.attribution ?? attrs.by;
    const author = rawAuthor === undefined || rawAuthor === null ? '' : String(rawAuthor).trim();
    return [author ? { text, author } : { text }];
  }

  /** Time-derived index, so all screens agree without any shared state. */
  private _index(count: number, now: number): number {
    if (count <= 0) return 0;
    const base = this._config?.daily
      ? dayOfYear(new Date(now))
      : Math.floor(now / this._intervalMs());
    return (((base + this._offset) % count) + count) % count;
  }

  /** Paint the current quote, crossfading when it is replacing another. */
  private _sync(): void {
    const pool = this._pool();
    if (!pool.length) {
      window.clearTimeout(this._fadeTimer);
      this._fadeTimer = undefined;
      this._shown = undefined;
      this._shownKey = '';
      this._visible = true;
      return;
    }
    const index = this._index(pool.length, Date.now());
    const next = pool[index];
    const key = `${index}|${next.text}`;
    if (key === this._shownKey) return;
    if (!this._shown || prefersReducedMotion()) {
      window.clearTimeout(this._fadeTimer);
      this._fadeTimer = undefined;
      this._shown = next;
      this._shownKey = key;
      this._visible = true;
      return;
    }
    this._shownKey = key;
    this._visible = false;
    window.clearTimeout(this._fadeTimer);
    this._fadeTimer = window.setTimeout(() => {
      this._fadeTimer = undefined;
      this._shown = next;
      this._visible = true;
    }, FADE_MS);
  }

  /** Self-correcting chain aligned to the day/interval boundary. */
  private _schedule(): void {
    window.clearTimeout(this._rotateTimer);
    this._rotateTimer = undefined;
    if (!this.isConnected || !this._config) return;
    const now = Date.now();
    let delay: number;
    if (this._config.daily) {
      const midnight = new Date(now);
      midnight.setHours(24, 0, 0, 0);
      delay = midnight.getTime() - now + 1000;
    } else {
      const period = this._intervalMs();
      delay = period - (now % period) + 50;
    }
    this._rotateTimer = window.setTimeout(() => {
      this._sync();
      this._schedule();
    }, delay);
  }

  /** Tap advances — the one control on this card. */
  private _onTap(): void {
    if (!this._config) return;
    if (this._pool().length < 2) {
      // Nothing to advance to; a single entity-backed line still deserves
      // a way into more-info.
      if (this._config.entity) moreInfo(this, this._config.entity);
      return;
    }
    haptic(this, 'selection');
    this._offset += 1;
    this._sync();
    this._schedule();
  }

  protected render(): TemplateResult | typeof nothing {
    const config = this._config;
    if (!config) return nothing;
    const stateObj = config.entity ? this.hass?.states[config.entity] : undefined;
    if (config.entity && this.hass && !stateObj) {
      return html`<ha-card><div class="warning">Entity not found: ${config.entity}</div></ha-card>`;
    }
    const accent = accentFor(stateObj, config.color);
    const quote = this._shown;
    const unavailable = !quote && config.entity !== undefined && isUnavailable(stateObj);

    return html`
      <ha-card
        class="control ${unavailable ? 'unavailable' : ''}"
        style="--silk-accent:${accent}"
        role="button"
        tabindex="0"
        aria-label=${quote ? `${quote.text}. Tap for another.` : 'Quote'}
        @click=${this._onTap}
        @keydown=${(ev: KeyboardEvent) => {
          if (ev.key === 'Enter' || ev.key === ' ') {
            ev.preventDefault();
            this._onTap();
          }
        }}
      >
        ${config.name ? html`<div class="label" title=${config.name}>${config.name}</div>` : nothing}
        <div class="body ${this._visible ? 'in' : 'out'}">
          ${quote
            ? html`
                <div class="line">
                  <ha-icon class="mark" icon="mdi:format-quote-open"></ha-icon>
                  <div class="text" title=${quote.text}>${quote.text}</div>
                </div>
                ${quote.author ? html`<div class="author">— ${quote.author}</div>` : nothing}
              `
            : html`<div class="note">${
                config.entity ? 'No quote from this entity' : 'No quotes configured'
              }</div>`}
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
        gap: 4px;
        padding: 12px 14px;
      }
      ha-card:focus-visible {
        outline: 2px solid color-mix(in srgb, var(--silk-accent) 70%, transparent);
        outline-offset: -2px;
      }
      .label {
        flex: none;
        font-size: 12px;
        font-weight: 500;
        line-height: 1.3;
        color: var(--secondary-text-color);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .body {
        flex: none;
        min-width: 0;
        overflow: hidden;
        opacity: 1;
        transition: opacity ${FADE_MS}ms var(--silk-ease-out);
      }
      .body.out {
        opacity: 0;
      }
      .line {
        display: flex;
        align-items: flex-start;
        gap: 6px;
        min-width: 0;
      }
      .mark {
        flex: none;
        --mdc-icon-size: 15px;
        margin-top: 3px;
        color: var(--silk-accent);
        opacity: 0.55;
      }
      .text {
        min-width: 0;
        font-size: 15px;
        font-weight: 500;
        line-height: 1.45;
        color: var(--primary-text-color);
        /* Three lines of 15px is the design budget; anything longer is cropped
           rather than allowed to push the author out of the card. */
        max-height: 66px;
        overflow: hidden;
      }
      .author {
        margin-top: 4px;
        padding-left: 21px;
        font-size: 12px;
        line-height: 1.3;
        color: var(--secondary-text-color);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .note {
        font-size: 13px;
        line-height: 1.4;
        color: var(--secondary-text-color);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    'silk-quote-card': SilkQuoteCard;
  }
}
