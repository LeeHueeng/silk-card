import { LitElement, html, css, nothing, TemplateResult } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { HomeAssistant, LovelaceCardConfig } from '../types';
import { silkControlStyles } from '../shared/base';
import { haptic } from '../shared/service';
import { accentFor } from '../shared/color';
import { registerRowsEditor } from '../shared/rows';

export const META = {
  type: 'silk-breadcrumb-card',
  name: 'Silk Breadcrumb',
  description: 'Know where you are.',
};

export interface BreadcrumbItemConfig {
  label: string;
  /** Dashboard path; the trail's last item is the current page and never links. */
  path?: string;
}

export interface SilkBreadcrumbCardConfig extends LovelaceCardConfig {
  /** The trail, oldest first. Omit and set `auto` to derive it. */
  items?: BreadcrumbItemConfig[];
  /** Derive the trail from the URL when `items` is omitted. */
  auto?: boolean;
  /** Accessible label for the nav landmark. Default "Breadcrumb". */
  name?: string;
}

const EDITOR_TAG = 'silk-breadcrumb-card-editor';

// The trail is a list of {label, path}: one ha-form per crumb, reorderable,
// with `auto` above it for the derive-from-the-URL case.
registerRowsEditor(EDITOR_TAG, {
  field: 'items',
  title: '경로 항목',
  addLabel: '항목 추가',
  blank: { label: '새 항목' },
  row: [
    { name: 'label', label: '이름', selector: { text: {} } },
    { name: 'path', label: '주소', selector: { text: {} } },
  ],
  schema: [
    { name: 'auto', selector: { boolean: {} } },
    { name: 'name', selector: { text: {} } },
  ],
  labels: { auto: 'URL에서 자동 생성', name: '접근성 레이블' },
});

/** 'living-room' → 'Living Room'; URL-escapes are decoded first. */
function humanizeSegment(segment: string): string {
  let text = segment;
  try {
    text = decodeURIComponent(segment);
  } catch {
    /* a malformed escape stays as-is */
  }
  return (
    text
      .replace(/[-_]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      // Only a word's *first* letter is raised. `\b` is ASCII-only, so it would
      // see a boundary before every accented letter and shout "CafÉ Bar".
      .replace(/(^|\s)(\p{Ll})/gu, (_, lead: string, first: string) => lead + first.toUpperCase()) ||
    text
  );
}

@customElement('silk-breadcrumb-card')
export class SilkBreadcrumbCard extends LitElement {
  /**
   * The frontend assigns hass on every state change; a breadcrumb reads none
   * of it, so keep it a plain field — no reactive churn, no re-renders.
   */
  public hass?: HomeAssistant;

  @state() private _config?: SilkBreadcrumbCardConfig;

  /** Re-render on navigation so an auto trail follows the URL. */
  private readonly _onLocationChanged = (): void => {
    if (this._config?.items === undefined) this.requestUpdate();
  };

  public static getStubConfig(): Partial<SilkBreadcrumbCardConfig> {
    return { type: 'custom:silk-breadcrumb-card', auto: true };
  }

  public static async getConfigElement(): Promise<HTMLElement> {
    return document.createElement(EDITOR_TAG);
  }

  public setConfig(config: SilkBreadcrumbCardConfig): void {
    if (config.items !== undefined) {
      if (!Array.isArray(config.items) || config.items.length === 0) {
        throw new Error('silk-breadcrumb-card: `items` must be a non-empty list of {label, path}');
      }
      config.items.forEach((item, i) => {
        if (!item || typeof item.label !== 'string' || !item.label) {
          throw new Error(`silk-breadcrumb-card: items[${i}] needs a \`label\``);
        }
        if (item.path !== undefined && typeof item.path !== 'string') {
          throw new Error(`silk-breadcrumb-card: items[${i}].path must be a string`);
        }
      });
    } else if (!config.auto) {
      throw new Error('silk-breadcrumb-card: set `items`, or `auto: true` to derive them');
    }
    this._config = config;
  }

  public getCardSize(): number {
    return 1;
  }

  public getGridOptions(): Record<string, number> {
    return { columns: 12, rows: 1, min_columns: 4, min_rows: 1 };
  }

  public connectedCallback(): void {
    super.connectedCallback();
    window.addEventListener('location-changed', this._onLocationChanged);
    window.addEventListener('popstate', this._onLocationChanged);
  }

  public disconnectedCallback(): void {
    super.disconnectedCallback();
    window.removeEventListener('location-changed', this._onLocationChanged);
    window.removeEventListener('popstate', this._onLocationChanged);
  }

  /** The URL trail: '/lovelace/living-room' → Lovelace › Living Room. */
  private _autoItems(): BreadcrumbItemConfig[] {
    const segments = window.location.pathname.split('/').filter(Boolean);
    if (!segments.length) return [{ label: 'Home' }];
    let path = '';
    return segments.map((segment) => {
      path += `/${segment}`;
      return { label: humanizeSegment(segment), path };
    });
  }

  private _items(): BreadcrumbItemConfig[] {
    return this._config?.items ?? this._autoItems();
  }

  private _onCrumbClick(ev: MouseEvent, path: string): void {
    // Let the browser handle modified clicks — a crumb is a real link.
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

  protected render(): TemplateResult | typeof nothing {
    const config = this._config;
    if (!config) return nothing;
    const items = this._items();
    const last = items.length - 1;

    return html`
      <ha-card style="--silk-accent:${accentFor(undefined)}">
        <nav aria-label=${config.name ?? 'Breadcrumb'}>
          ${items.map((item, i) => {
            const crumb =
              i === last
                ? html`<span class="crumb current" aria-current="page" title=${item.label}
                    >${item.label}</span
                  >`
                : item.path
                  ? html`<a
                      class="crumb link"
                      href=${item.path}
                      title=${item.label}
                      @click=${(ev: MouseEvent) => this._onCrumbClick(ev, item.path as string)}
                      >${item.label}</a
                    >`
                  : html`<span class="crumb" title=${item.label}>${item.label}</span>`;
            return html`${i > 0
              ? html`<ha-icon class="sep" icon="mdi:chevron-right" aria-hidden="true"></ha-icon>`
              : nothing}${crumb}`;
          })}
        </nav>
      </ha-card>
    `;
  }

  static styles = [
    silkControlStyles,
    css`
      /* A breadcrumb floats on the view background — no card chrome at all. */
      ha-card {
        height: 32px;
        min-height: 32px;
        background: none;
        border: none;
        box-shadow: none;
        border-radius: 0;
        padding: 0 4px;
        cursor: default;
      }
      nav {
        display: flex;
        align-items: center;
        gap: 2px;
        min-width: 0;
        overflow: hidden;
      }
      .crumb {
        min-width: 0;
        padding: 2px 4px;
        border-radius: 6px;
        font-size: 13px;
        font-weight: 400;
        line-height: 1.3;
        color: var(--secondary-text-color);
        text-decoration: none;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        /* Earlier crumbs give way first; the current page truncates last. */
        flex: 0 3 auto;
        transition: color 200ms ease;
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
      .current {
        flex: 0 1 auto;
        font-weight: 500;
        color: var(--primary-text-color);
      }
      .sep {
        flex: none;
        --mdc-icon-size: 12px;
        width: 12px;
        height: 12px;
        color: var(--primary-text-color);
        opacity: 0.35;
        pointer-events: none;
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    'silk-breadcrumb-card': SilkBreadcrumbCard;
  }
}
