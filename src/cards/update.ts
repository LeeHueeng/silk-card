import { LitElement, html, css, nothing, PropertyValues, TemplateResult } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { HomeAssistant, HassEntity, LovelaceCardConfig } from '../types';
import { silkControlStyles } from '../shared/base';
import { isUnavailable, moreInfo, haptic } from '../shared/service';
import { accentFor } from '../shared/color';
import { registerEditor } from '../shared/editor';

export const META = {
  type: 'silk-update-card',
  name: 'Silk Updates',
  description: 'Every pending update in one place.',
};

export interface UpdateCardConfig extends LovelaceCardConfig {
  /** Update entities to track; omit to auto-discover every update.* entity. */
  entities?: string[];
  /** Header label, defaults to "Updates". */
  name?: string;
  /** Also list entities that are already up to date. */
  show_up_to_date?: boolean;
}

const EDITOR_TAG = 'silk-update-card-editor';

registerEditor(
  EDITOR_TAG,
  [
    { name: 'name', selector: { text: {} } },
    { name: 'entities', selector: { entity: { multiple: true, domain: ['update'] } } },
    { name: 'show_up_to_date', selector: { boolean: {} } },
  ],
  {
    name: 'Name',
    entities: 'Entities (empty = every update)',
    show_up_to_date: 'Show up-to-date items',
  },
  { show_up_to_date: false }
);

const OPTIMISTIC_TIMEOUT_MS = 2000;

/** Preferred display title for an update entity. */
function displayTitle(stateObj: HassEntity): string {
  return (
    (stateObj.attributes.title as string | undefined) ??
    (stateObj.attributes.friendly_name as string | undefined) ??
    stateObj.entity_id
  );
}

@customElement('silk-update-card')
export class SilkUpdateCard extends LitElement {
  @property({ attribute: false }) public hass?: HomeAssistant;

  @state() private _config?: UpdateCardConfig;

  /**
   * Optimistic "installing" overrides: entity_id → last_updated snapshot at
   * press time. A newer stamp (HA flipping in_progress) clears the override.
   */
  @state() private _installing: Record<string, string> = {};

  private _installingTimers: Record<string, number> = {};

  public static getStubConfig(): Partial<UpdateCardConfig> {
    // No entity required — the card auto-discovers every update.* entity.
    return { type: 'custom:silk-update-card' };
  }

  public static async getConfigElement(): Promise<HTMLElement> {
    return document.createElement(EDITOR_TAG);
  }

  public setConfig(config: UpdateCardConfig): void {
    if (config.entities !== undefined && !Array.isArray(config.entities)) {
      throw new Error('silk-update-card: `entities` must be a list of update entity ids');
    }
    this._config = config;
    this._clearAllInstalling();
  }

  public getCardSize(): number {
    if (!this.hass || !this._config) return 3;
    return (this._visible().length || 1) + 1;
  }

  public getGridOptions(): Record<string, number> {
    return { columns: 6, rows: 2, min_columns: 4, min_rows: 2 };
  }

  public disconnectedCallback(): void {
    super.disconnectedCallback();
    for (const id of Object.keys(this._installingTimers)) {
      window.clearTimeout(this._installingTimers[id]);
    }
    this._installingTimers = {};
  }

  protected willUpdate(changed: PropertyValues): void {
    if (!changed.has('hass') || !this.hass) return;
    for (const id of Object.keys(this._installing)) {
      const stateObj = this.hass.states[id];
      if (stateObj && stateObj.last_updated !== this._installing[id]) {
        this._clearInstalling(id);
      }
    }
  }

  private _clearInstalling(entityId: string): void {
    window.clearTimeout(this._installingTimers[entityId]);
    delete this._installingTimers[entityId];
    if (entityId in this._installing) {
      const next = { ...this._installing };
      delete next[entityId];
      this._installing = next;
    }
  }

  private _clearAllInstalling(): void {
    for (const id of Object.keys(this._installingTimers)) {
      window.clearTimeout(this._installingTimers[id]);
    }
    this._installingTimers = {};
    this._installing = {};
  }

  /** All tracked update entities, pending ones floated to the top. */
  private _tracked(): HassEntity[] {
    const hass = this.hass!;
    const explicit = this._config?.entities;
    const ids = explicit ?? Object.keys(hass.states).filter((id) => id.startsWith('update.'));
    const objs: HassEntity[] = [];
    for (const id of ids) {
      const stateObj = hass.states[id];
      if (stateObj) objs.push(stateObj);
    }
    // Auto-discovery reads best alphabetically; explicit lists keep user order.
    if (!explicit) objs.sort((a, b) => displayTitle(a).localeCompare(displayTitle(b)));
    // Stable sort: pending first, source order preserved within each group.
    objs.sort((a, b) => Number(b.state === 'on') - Number(a.state === 'on'));
    return objs;
  }

  /** Tracked entities that actually render as rows. */
  private _visible(): HassEntity[] {
    const tracked = this._tracked();
    return this._config?.show_up_to_date ? tracked : tracked.filter((s) => s.state === 'on');
  }

  private _onRowClick(entityId: string): void {
    moreInfo(this, entityId);
  }

  private _onRowKeydown(ev: KeyboardEvent, entityId: string): void {
    if (ev.key !== 'Enter' && ev.key !== ' ') return;
    ev.preventDefault();
    moreInfo(this, entityId);
  }

  private _onInstall(ev: Event, entityId: string): void {
    ev.stopPropagation();
    const hass = this.hass;
    if (!hass) return;
    const stateObj = hass.states[entityId];
    if (!stateObj || isUnavailable(stateObj) || Boolean(stateObj.attributes.in_progress)) return;
    haptic(this);
    // Optimistic: show the spinner immediately; cleared when the real state
    // update (in_progress flipping true) arrives or after 2s.
    this._installing = { ...this._installing, [entityId]: stateObj.last_updated };
    window.clearTimeout(this._installingTimers[entityId]);
    this._installingTimers[entityId] = window.setTimeout(
      () => this._clearInstalling(entityId),
      OPTIMISTIC_TIMEOUT_MS
    );
    hass.callService('update', 'install', { entity_id: entityId });
  }

  private _renderTrailing(stateObj: HassEntity, title: string): TemplateResult {
    const unavailable = isUnavailable(stateObj);
    const installing =
      !unavailable &&
      (Boolean(stateObj.attributes.in_progress) || stateObj.entity_id in this._installing);
    if (installing) {
      return html`
        <button class="btn installing" disabled aria-label=${`Installing ${title}`}>
          <ha-icon icon="mdi:loading"></ha-icon>
        </button>
      `;
    }
    if (stateObj.state === 'on') {
      return html`
        <button
          class="btn"
          .disabled=${unavailable}
          aria-label=${`Install ${title}`}
          @click=${(ev: Event) => this._onInstall(ev, stateObj.entity_id)}
        >
          <ha-icon icon="mdi:download"></ha-icon>
        </button>
      `;
    }
    return html`
      <span class="ok" title="Up to date"><ha-icon icon="mdi:check"></ha-icon></span>
    `;
  }

  private _renderRow(stateObj: HassEntity): TemplateResult {
    const unavailable = isUnavailable(stateObj);
    const pending = stateObj.state === 'on';
    const title = displayTitle(stateObj);
    const installed = stateObj.attributes.installed_version as string | undefined;
    const latest = stateObj.attributes.latest_version as string | undefined;
    // Up-to-date rows show the bare version — an arrow to the same version is noise.
    const version = pending ? `${installed ?? '—'} → ${latest ?? '—'}` : (installed ?? latest ?? '');
    const picture = stateObj.attributes.entity_picture as string | undefined;
    return html`
      <div
        class="row ${unavailable ? 'unavailable' : ''}"
        role="button"
        tabindex="0"
        @click=${() => this._onRowClick(stateObj.entity_id)}
        @keydown=${(ev: KeyboardEvent) => this._onRowKeydown(ev, stateObj.entity_id)}
      >
        ${picture
          ? html`<img class="pic" src=${picture} alt="" />`
          : html`
              <div class="pic fallback"><ha-icon icon="mdi:package-up"></ha-icon></div>
            `}
        <div class="info">
          <div class="name">${title}</div>
          ${version ? html`<div class="state">${version}</div>` : nothing}
        </div>
        ${this._renderTrailing(stateObj, title)}
      </div>
    `;
  }

  protected render(): TemplateResult | typeof nothing {
    const config = this._config;
    const hass = this.hass;
    if (!config || !hass) return nothing;

    const tracked = this._tracked();
    const pendingCount = tracked.filter((s) => s.state === 'on').length;
    const rows = config.show_up_to_date ? tracked : tracked.filter((s) => s.state === 'on');
    // Update isn't a colored domain, so this lands on the theme primary accent.
    const accent = accentFor(tracked[0]);
    const name = config.name ?? 'Updates';

    return html`
      <ha-card class="control" style="--silk-accent:${accent}">
        <div class="header">
          <div class="hname">${name}</div>
          ${pendingCount > 0 ? html`<span class="badge">${pendingCount}</span>` : nothing}
        </div>
        ${rows.length
          ? html`<div class="rows">${rows.map((s) => this._renderRow(s))}</div>`
          : html`
              <div class="empty">
                <ha-icon icon="mdi:check-circle-outline"></ha-icon>
                <span>All up to date</span>
              </div>
            `}
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
        gap: 6px;
        padding: 12px 14px;
        cursor: default;
      }
      .header {
        display: flex;
        align-items: center;
        gap: 8px;
        min-height: 22px;
      }
      .hname {
        min-width: 0;
        font-size: 13px;
        font-weight: 600;
        color: var(--secondary-text-color);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .badge {
        flex: none;
        font-size: 11px;
        font-weight: 600;
        line-height: 1;
        padding: 4px 8px;
        border-radius: 999px;
        color: var(--silk-accent);
        background: color-mix(in srgb, var(--silk-accent) 16%, transparent);
        font-variant-numeric: tabular-nums;
      }
      .rows {
        display: flex;
        flex-direction: column;
        gap: 2px;
        margin: 0 -6px;
      }
      .row {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 4px 6px;
        border-radius: 10px;
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
      .pic {
        flex: none;
        width: 28px;
        height: 28px;
        border-radius: 8px;
        object-fit: cover;
      }
      .pic.fallback {
        display: grid;
        place-items: center;
        color: var(--secondary-text-color);
        background: rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.06);
      }
      .pic.fallback ha-icon {
        --mdc-icon-size: 18px;
      }
      .row .name {
        font-size: 13.5px;
      }
      .row .state {
        font-size: 12px;
      }
      .btn {
        flex: none;
        width: 36px;
        height: 36px;
        border: none;
        border-radius: 12px;
        display: grid;
        place-items: center;
        padding: 0;
        cursor: pointer;
        color: var(--silk-accent);
        background: color-mix(in srgb, var(--silk-accent) 14%, transparent);
        transition:
          transform 250ms var(--silk-spring),
          background 200ms ease,
          color 200ms ease;
      }
      .btn:hover:not(:disabled) {
        background: color-mix(in srgb, var(--silk-accent) 22%, transparent);
      }
      .btn:active:not(:disabled) {
        transform: scale(0.9);
        transition-duration: 120ms;
        transition-timing-function: var(--silk-ease-out);
      }
      .btn:focus-visible {
        outline: 2px solid color-mix(in srgb, var(--silk-accent) 70%, transparent);
        outline-offset: 2px;
      }
      .btn:disabled {
        cursor: default;
      }
      .btn ha-icon {
        --mdc-icon-size: 20px;
        pointer-events: none;
      }
      .btn.installing {
        color: var(--secondary-text-color);
        background: rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.06);
      }
      /* Real motion for a real install in flight — not a decorative loop. */
      .btn.installing ha-icon {
        animation: silk-update-spin 900ms linear infinite;
      }
      @keyframes silk-update-spin {
        to {
          transform: rotate(360deg);
        }
      }
      .ok {
        flex: none;
        width: 36px;
        height: 36px;
        display: grid;
        place-items: center;
        color: var(--secondary-text-color);
        opacity: 0.5;
      }
      .ok ha-icon {
        --mdc-icon-size: 18px;
      }
      .empty {
        flex: 1;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 7px;
        min-height: 48px;
        padding: 6px 0;
        font-size: 13px;
        color: var(--secondary-text-color);
      }
      .empty ha-icon {
        --mdc-icon-size: 20px;
        opacity: 0.7;
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    'silk-update-card': SilkUpdateCard;
  }
}
