import { LitElement, html, css, nothing, TemplateResult } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { HomeAssistant, LovelaceCardConfig } from '../types';
import { silkControlStyles } from '../shared/base';
import { haptic, isUnavailable, moreInfo } from '../shared/service';
import { accentFor } from '../shared/color';
import { registerRowsEditor } from '../shared/rows';

export const META = {
  type: 'silk-footer-card',
  name: 'Silk Footer',
  description: 'The small print, tastefully.',
};

export interface FooterLinkConfig {
  label: string;
  /** External destination; opens in a new tab. `path` wins when both are set. */
  url?: string;
  /** In-app dashboard path, navigated without a page load. */
  path?: string;
  icon?: string;
}

export type FooterAlign = 'left' | 'center' | 'right';

export interface SilkFooterCardConfig extends LovelaceCardConfig {
  /** The link row, in order — one row each in the editor. */
  links?: FooterLinkConfig[];
  /** A quiet line under the links — attribution, a version, a disclaimer. */
  text?: string;
  /** Row alignment. Default 'center'. */
  align?: FooterAlign;
  /** Show the 'updated 12:04' chip. */
  show_updated?: boolean;
  /** Entity (or entities) whose last change the chip reports. */
  watch_entity?: string | string[];
}

const ALIGNMENTS: FooterAlign[] = ['left', 'center', 'right'];

const MINUTE_MS = 60_000;

/**
 * Link protocols the card will actually hand to the browser. A dashboard is
 * shared with housemates and guests; `javascript:` in a footer link is never
 * anything but a mistake, so those render as plain text instead.
 */
const SAFE_URL = /^(https?:|mailto:|tel:|\/|\.\/|#)/i;

const EDITOR_TAG = 'silk-footer-card-editor';

// Links are rows: a label plus where it goes. `path` wins over `url` when both
// are set, which is why they stay two fields instead of one guessed box.
registerRowsEditor(EDITOR_TAG, {
  field: 'links',
  title: '링크',
  addLabel: '링크 추가',
  row: [
    { name: 'label', label: '이름', selector: { text: {} } },
    { name: 'url', label: '주소 (https://…)', selector: { text: {} } },
    { name: 'path', label: '대시보드 경로 (/lovelace/0)', selector: { text: {} } },
    { name: 'icon', label: '아이콘', selector: { icon: {} } },
  ],
  blank: { label: '새 링크' },
  schema: [
    { name: 'text', selector: { text: {} } },
    {
      name: '',
      type: 'grid',
      schema: [
        {
          name: 'align',
          selector: {
            select: {
              mode: 'dropdown',
              options: [
                { value: 'left', label: '왼쪽' },
                { value: 'center', label: '가운데' },
                { value: 'right', label: '오른쪽' },
              ],
            },
          },
        },
        { name: 'show_updated', selector: { boolean: {} } },
      ],
    },
    { name: 'watch_entity', selector: { entity: { multiple: true } } },
  ],
  labels: {
    text: '작은 글씨',
    align: '정렬',
    show_updated: '갱신 시각 표시',
    watch_entity: '감시 엔티티 (비우면 현재 시각)',
  },
  defaults: { align: 'center', show_updated: false },
});

/** What the 'updated' chip should say, and what it is actually reporting. */
interface Stamp {
  at: Date;
  title: string;
  /** Set when the time came from a real entity — the chip then opens more-info. */
  entityId?: string;
}

@customElement('silk-footer-card')
export class SilkFooterCard extends LitElement {
  @property({ attribute: false }) public hass?: HomeAssistant;

  @state() private _config?: SilkFooterCardConfig;

  private _tickTimer?: number;

  public static getStubConfig(): Partial<SilkFooterCardConfig> {
    // Nothing to discover: a footer is written, not detected.
    return {
      type: 'custom:silk-footer-card',
      text: 'Home Assistant',
      align: 'center',
      show_updated: true,
    };
  }

  public static async getConfigElement(): Promise<HTMLElement> {
    return document.createElement(EDITOR_TAG);
  }

  public setConfig(config: SilkFooterCardConfig): void {
    if (config.links !== undefined) {
      if (!Array.isArray(config.links)) {
        throw new Error('silk-footer-card: `links` must be a list of {label, url, path, icon}');
      }
      config.links.forEach((link, i) => {
        if (!link || typeof link.label !== 'string' || !link.label) {
          throw new Error(`silk-footer-card: links[${i}] needs a \`label\``);
        }
        if (link.url !== undefined && typeof link.url !== 'string') {
          throw new Error(`silk-footer-card: links[${i}].url must be a string`);
        }
        if (link.path !== undefined && typeof link.path !== 'string') {
          throw new Error(`silk-footer-card: links[${i}].path must be a string`);
        }
      });
    }
    if (config.text !== undefined && typeof config.text !== 'string') {
      throw new Error('silk-footer-card: `text` must be a string');
    }
    if (config.align !== undefined && !ALIGNMENTS.includes(config.align)) {
      throw new Error("silk-footer-card: `align` must be 'left', 'center' or 'right'");
    }
    if (!config.links?.length && !config.text && !config.show_updated) {
      throw new Error('silk-footer-card: set `links`, `text` or `show_updated` — the card is empty');
    }
    this._config = config;
    this._scheduleTick();
  }

  public getCardSize(): number {
    return 1;
  }

  public getGridOptions(): Record<string, number> {
    return { columns: 12, rows: 1, min_columns: 4, min_rows: 1 };
  }

  public connectedCallback(): void {
    super.connectedCallback();
    this._scheduleTick();
  }

  public disconnectedCallback(): void {
    super.disconnectedCallback();
    window.clearTimeout(this._tickTimer);
    this._tickTimer = undefined;
  }

  /**
   * The chip reads in minutes, so it re-renders on the minute boundary rather
   * than on a free-running 60s interval — no drift, no 12:03 lingering at 12:04.
   */
  private _scheduleTick(): void {
    window.clearTimeout(this._tickTimer);
    this._tickTimer = undefined;
    if (!this.isConnected || !this._config?.show_updated) return;
    const now = Date.now();
    const next = Math.floor(now / MINUTE_MS) * MINUTE_MS + MINUTE_MS + 250;
    this._tickTimer = window.setTimeout(() => {
      this.requestUpdate();
      this._scheduleTick();
    }, next - now);
  }

  private _locale(): string {
    return this.hass?.locale?.language ?? this.hass?.language ?? 'en';
  }

  private _watchIds(): string[] {
    const raw = this._config?.watch_entity;
    if (!raw) return [];
    return (Array.isArray(raw) ? raw : [raw]).filter(
      (id): id is string => typeof id === 'string' && id.length > 0
    );
  }

  /** Newest `last_changed` across the watched entities, else the wall clock. */
  private _stamp(): Stamp {
    const hass = this.hass;
    const ids = this._watchIds();
    const full = new Intl.DateTimeFormat(this._locale(), {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
    let newest = 0;
    let source = '';
    let sourceId: string | undefined;
    let missing = 0;
    let stale = false;
    for (const id of ids) {
      const stateObj = hass?.states[id];
      if (!stateObj) {
        missing++;
        continue;
      }
      const ms = Date.parse(stateObj.last_changed);
      if (!Number.isFinite(ms) || ms <= newest) continue;
      newest = ms;
      sourceId = id;
      source = (stateObj.attributes.friendly_name as string | undefined) ?? id;
      stale = isUnavailable(stateObj);
    }
    if (newest > 0) {
      const at = new Date(newest);
      return {
        at,
        title: `${source} last changed ${full.format(at)}${stale ? ' · now unavailable' : ''}`,
        entityId: sourceId,
      };
    }
    const at = new Date();
    if (ids.length) {
      // Configured but unreadable — say so rather than passing the clock off
      // as a state change that never happened.
      const label = missing === 1 && ids.length === 1 ? ids[0] : 'Watched entities';
      return { at, title: `${label} not available · showing the current time` };
    }
    return { at, title: full.format(at) };
  }

  private _navigate(ev: MouseEvent, path: string): void {
    // Modified clicks belong to the browser — a footer link is a real link.
    if (ev.defaultPrevented || ev.button !== 0 || ev.metaKey || ev.ctrlKey || ev.shiftKey) return;
    ev.preventDefault();
    ev.stopPropagation();
    haptic(this, 'selection');
    history.pushState(null, '', path);
    this.dispatchEvent(
      new CustomEvent('location-changed', {
        detail: { replace: false },
        bubbles: true,
        composed: true,
      })
    );
  }

  private _onStampClick(ev: Event, entityId: string): void {
    ev.stopPropagation();
    haptic(this, 'selection');
    moreInfo(this, entityId);
  }

  private _renderLink(link: FooterLinkConfig): TemplateResult {
    const body = html`${link.icon
      ? html`<ha-icon .icon=${link.icon} aria-hidden="true"></ha-icon>`
      : nothing}<span class="label">${link.label}</span>`;

    if (link.path) {
      return html`<a
        class="link"
        href=${link.path}
        title=${link.label}
        @click=${(ev: MouseEvent) => this._navigate(ev, link.path as string)}
        >${body}</a
      >`;
    }
    if (link.url && SAFE_URL.test(link.url.trim())) {
      return html`<a
        class="link"
        href=${link.url}
        title=${link.label}
        target="_blank"
        rel="noopener noreferrer"
        @click=${(ev: Event) => ev.stopPropagation()}
        >${body}</a
      >`;
    }
    return html`<span class="link plain" title=${link.label}>${body}</span>`;
  }

  private _renderStamp(): TemplateResult {
    const stamp = this._stamp();
    const time = new Intl.DateTimeFormat(this._locale(), {
      hour: 'numeric',
      minute: '2-digit',
    }).format(stamp.at);
    const label = `updated ${time}`;
    return stamp.entityId
      ? html`<button
          class="chip stamp"
          title=${stamp.title}
          @click=${(ev: Event) => this._onStampClick(ev, stamp.entityId as string)}
        >
          ${label}
        </button>`
      : html`<span class="chip stamp" title=${stamp.title}>${label}</span>`;
  }

  protected render(): TemplateResult | typeof nothing {
    const config = this._config;
    if (!config) return nothing;
    const links = config.links ?? [];
    const showUpdated = Boolean(config.show_updated);
    const align = config.align ?? 'center';

    // One flat list so every gap between siblings is the same dot separator.
    const row: TemplateResult[] = links.map((link) => this._renderLink(link));
    if (showUpdated) row.push(this._renderStamp());

    return html`
      <ha-card class="align-${align}" style="--silk-accent:${accentFor(undefined)}">
        ${row.length
          ? html`<div class="row">
              ${row.map(
                (item, i) =>
                  html`${i > 0
                    ? html`<span class="dot" aria-hidden="true">·</span>`
                    : nothing}${item}`
              )}
            </div>`
          : nothing}
        ${config.text ? html`<div class="note" title=${config.text}>${config.text}</div>` : nothing}
      </ha-card>
    `;
  }

  static styles = [
    silkControlStyles,
    css`
      /* A footer sits on the view background — no card chrome at all. */
      ha-card {
        height: 100%;
        min-height: 32px;
        flex-direction: column;
        justify-content: center;
        gap: 3px;
        padding: 4px 6px;
        background: none;
        border: none;
        box-shadow: none;
        border-radius: 0;
        cursor: default;
        overflow: hidden;
      }
      .row {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        column-gap: 8px;
        row-gap: 2px;
        max-width: 100%;
        min-width: 0;
      }
      .note {
        max-width: 100%;
        min-width: 0;
        font-size: 12px;
        line-height: 1.35;
        color: var(--primary-text-color);
        opacity: 0.45;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .align-left {
        align-items: flex-start;
      }
      .align-center {
        align-items: center;
      }
      .align-right {
        align-items: flex-end;
      }
      .align-left .row {
        justify-content: flex-start;
      }
      .align-center .row {
        justify-content: center;
      }
      .align-right .row {
        justify-content: flex-end;
      }
      .link {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        min-width: 0;
        max-width: 100%;
        padding: 3px 2px;
        border-radius: 6px;
        font-size: 11px;
        font-weight: 500;
        line-height: 1.3;
        color: var(--secondary-text-color);
        text-decoration: none;
        white-space: nowrap;
        transition: color 200ms ease;
      }
      .label {
        min-width: 0;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .link ha-icon {
        flex: none;
        --mdc-icon-size: 13px;
      }
      a.link {
        cursor: pointer;
      }
      a.link:hover {
        color: var(--silk-accent);
      }
      a.link:focus-visible {
        outline: 2px solid color-mix(in srgb, var(--silk-accent) 70%, transparent);
        outline-offset: 1px;
      }
      .dot {
        flex: none;
        font-size: 11px;
        line-height: 1;
        color: var(--primary-text-color);
        opacity: 0.3;
        user-select: none;
        pointer-events: none;
      }
      .chip.stamp {
        flex: none;
        padding: 3px 8px;
        font-weight: 500;
        letter-spacing: 0;
        font-variant-numeric: tabular-nums;
      }
      span.chip.stamp {
        cursor: default;
      }
      /* The non-interactive chip must not answer a hover like a button does. */
      span.chip.stamp:hover {
        background: rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.06);
      }
      button.chip.stamp:focus-visible {
        outline: 2px solid color-mix(in srgb, var(--silk-accent) 70%, transparent);
        outline-offset: 1px;
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    'silk-footer-card': SilkFooterCard;
  }
}
