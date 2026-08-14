import { LitElement, html, css, nothing, PropertyValues, TemplateResult } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { HomeAssistant, HassEntity, LovelaceCardConfig } from '../types';
import { silkControlStyles } from '../shared/base';
import { domainOf, isActive, isUnavailable, toggleEntity, moreInfo, haptic } from '../shared/service';
import { accentFor } from '../shared/color';
import { normalizeEntityList, entityListSelector } from '../shared/list';
import { registerListEditor } from '../shared/listeditor';

export const META = {
  type: 'silk-launcher-card',
  name: 'Silk Launcher',
  description: 'An app-grid for your home.',
};

export type LauncherActionType = 'toggle' | 'navigate' | 'url' | 'more-info' | 'perform-action';

export interface LauncherAction {
  action: LauncherActionType;
  /** navigate: dashboard path, e.g. `/lovelace/kitchen`. */
  path?: string;
  /** url: opened in a new tab. */
  url?: string;
  /** perform-action: `domain.service`. */
  service?: string;
  /** perform-action: service data, passed through verbatim. */
  data?: Record<string, unknown>;
}

export interface LauncherItemConfig {
  /** Optional when the item has an `entity` — the entity's own icon is used then. */
  icon?: string;
  name?: string;
  entity?: string;
  tap?: LauncherAction;
  /** Accent override for this tile. */
  color?: string;
}

/**
 * `items` takes both shapes: a bare entity id (what the picker writes) turns
 * into a tile that borrows its icon and label from the entity, while an object
 * spells out icon/name/tap/color by hand.
 */
export type LauncherItemEntry = string | LauncherItemConfig;

export interface SilkLauncherCardConfig extends LovelaceCardConfig {
  items: LauncherItemEntry[];
  /** Optional header above the grid. */
  name?: string;
}

/** A config item resolved for rendering. */
interface ResolvedItem extends LauncherItemConfig {
  /** Written as a bare id: icon and label come from the entity at render time. */
  auto?: boolean;
}

const MAX_ITEMS = 12;
const OPTIMISTIC_TIMEOUT_MS = 2000;

const ACTIONS: readonly LauncherActionType[] = [
  'toggle',
  'navigate',
  'url',
  'more-info',
  'perform-action',
];

/**
 * Domains a tap can command outright. Anything else (a sensor, a weather
 * entity) opens more-info instead, because there is nothing to switch.
 */
const CONTROLLABLE = new Set([
  'automation',
  'button',
  'cover',
  'fan',
  'group',
  'humidifier',
  'input_boolean',
  'input_button',
  'light',
  'lock',
  'scene',
  'script',
  'siren',
  'switch',
  'valve',
]);

/** Schemes `window.open` may receive — never `javascript:` and friends. */
const URL_SCHEME = /^(https?:|mailto:|tel:)/i;

/** The state the service call will land on, per domain, for optimistic display. */
function predictedState(domain: string, active: boolean): string {
  switch (domain) {
    case 'lock':
      return active ? 'unlocked' : 'locked';
    case 'cover':
    case 'valve':
      return active ? 'open' : 'closed';
    default:
      return active ? 'on' : 'off';
  }
}

/**
 * Both config shapes → tiles. Objects pass through exactly as authored (they may
 * be pure tap actions with no entity, which the shared normalizer would drop);
 * bare ids go through `normalizeEntityList` so an id means the same thing here
 * as on every other Silk card.
 */
function resolveItems(items: LauncherItemEntry[] | undefined): ResolvedItem[] {
  if (!Array.isArray(items)) return [];
  return items.flatMap((item): ResolvedItem[] =>
    typeof item === 'string'
      ? normalizeEntityList([item]).map((entry) => ({ entity: entry.entity, auto: true }))
      : item && typeof item === 'object'
        ? [item]
        : []
  );
}

const EDITOR_TAG = 'silk-launcher-card-editor';

/** Shortcuts point at things you can command; anything else opens more-info. */
const PICKER_DOMAINS = [...CONTROLLABLE, 'climate', 'media_player', 'vacuum'].sort();

/**
 * The picker is always on screen, even for a hand-written list: the ids it
 * returns are folded back into the stored items, so every tile that survives
 * keeps its icon, name, color and `tap` exactly as authored. Only a tile with
 * no `entity` at all — a pure navigate/url shortcut — cannot be represented in
 * an entity picker; such a list is still best edited in YAML.
 */
registerListEditor(EDITOR_TAG, {
  schema: [
    entityListSelector('items', PICKER_DOMAINS),
    { name: 'name', selector: { text: {} } },
  ],
  labels: {
    items: '바로가기 엔티티',
    name: '이름',
  },
  listFields: ['items'],
});

@customElement('silk-launcher-card')
export class SilkLauncherCard extends LitElement {
  @property({ attribute: false }) public hass?: HomeAssistant;

  @state() private _config?: SilkLauncherCardConfig;

  /** entity_id → optimistic active state (absent = trust the real state). */
  @state() private _optimistic: Record<string, boolean> = {};

  /** last_updated snapshots at call time; any newer stamp clears the override. */
  private _optimisticBase: Record<string, string> = {};
  private _optimisticTimers: Record<string, number> = {};

  public static getStubConfig(hass: HomeAssistant): Partial<SilkLauncherCardConfig> {
    // Bare ids, so the freshly added card is editable in the visual editor.
    const items: LauncherItemEntry[] = Object.keys(hass.states)
      .filter((id) => CONTROLLABLE.has(domainOf(id)))
      .slice(0, 6);
    if (!items.length) {
      items.push({ icon: 'mdi:home', name: 'Home', tap: { action: 'navigate', path: '/lovelace/0' } });
    }
    return { type: 'custom:silk-launcher-card', items };
  }

  public static async getConfigElement(): Promise<HTMLElement> {
    return document.createElement(EDITOR_TAG);
  }

  public setConfig(config: SilkLauncherCardConfig): void {
    if (!Array.isArray(config.items) || config.items.length === 0) {
      throw new Error(
        'silk-launcher-card: `items` is required — 2-12 entity ids or {icon, entity/tap}'
      );
    }
    if (config.items.length > MAX_ITEMS) {
      throw new Error(`silk-launcher-card: at most ${MAX_ITEMS} \`items\``);
    }
    config.items.forEach((entry, i) => {
      const at = `silk-launcher-card: items[${i}]`;
      // A bare id is a complete item: the entity supplies icon, name and action.
      if (typeof entry === 'string') {
        if (!entry.includes('.')) {
          throw new Error(`${at} must be an entity id like \`light.kitchen\``);
        }
        return;
      }
      if (!entry || typeof entry !== 'object') {
        throw new Error(`${at} must be an entity id or an item object`);
      }
      const item: LauncherItemConfig = entry;
      if (item.icon !== undefined && (typeof item.icon !== 'string' || !item.icon)) {
        throw new Error(`${at} \`icon\` must be an icon name`);
      }
      if (item.entity !== undefined && typeof item.entity !== 'string') {
        throw new Error(`${at} \`entity\` must be an entity id`);
      }
      // Nothing to borrow an icon from, so one has to be spelled out.
      if (!item.entity && !item.icon) {
        throw new Error(`${at} needs an \`icon\``);
      }
      const tap = item.tap;
      if (tap === undefined) {
        // Without a tap the entity IS the action — there is nothing else to do.
        if (!item.entity) throw new Error(`${at} needs an \`entity\` or a \`tap\` action`);
        return;
      }
      if (!ACTIONS.includes(tap.action)) {
        throw new Error(`${at} \`tap.action\` must be one of ${ACTIONS.join('/')}`);
      }
      if (tap.action === 'navigate' && !tap.path) {
        throw new Error(`${at} navigate needs a \`path\``);
      }
      if (tap.action === 'url') {
        if (!tap.url) throw new Error(`${at} url needs a \`url\``);
        if (!URL_SCHEME.test(tap.url) && !tap.url.startsWith('/')) {
          throw new Error(`${at} \`url\` must be http(s), mailto, tel or an absolute path`);
        }
      }
      if (tap.action === 'perform-action' && !/^[a-z_]+\.[a-z0-9_]+$/.test(String(tap.service))) {
        throw new Error(`${at} perform-action needs a \`service\` like \`light.turn_on\``);
      }
      if ((tap.action === 'toggle' || tap.action === 'more-info') && !item.entity) {
        throw new Error(`${at} ${tap.action} needs an \`entity\``);
      }
    });
    this._config = config;
    this._clearOptimistic();
  }

  public getCardSize(): number {
    return Math.ceil((this._config?.items.length ?? 4) / 4) + 1;
  }

  public getGridOptions(): Record<string, number> {
    return { columns: 6, rows: 2, min_columns: 3, min_rows: 1 };
  }

  public disconnectedCallback(): void {
    super.disconnectedCallback();
    this._clearOptimistic();
  }

  protected willUpdate(changed: PropertyValues): void {
    if (!changed.has('hass')) return;
    // Drop each override the moment its entity reports a fresher state.
    for (const entityId of Object.keys(this._optimistic)) {
      const stamp = this.hass?.states[entityId]?.last_updated;
      if (stamp && stamp !== this._optimisticBase[entityId]) this._clearOptimistic(entityId);
    }
  }

  private _clearOptimistic(entityId?: string): void {
    if (entityId === undefined) {
      for (const timer of Object.values(this._optimisticTimers)) window.clearTimeout(timer);
      this._optimisticTimers = {};
      this._optimisticBase = {};
      this._optimistic = {};
      return;
    }
    window.clearTimeout(this._optimisticTimers[entityId]);
    delete this._optimisticTimers[entityId];
    delete this._optimisticBase[entityId];
    const next = { ...this._optimistic };
    delete next[entityId];
    this._optimistic = next;
  }

  private _setOptimistic(stateObj: HassEntity, active: boolean): void {
    const entityId = stateObj.entity_id;
    this._optimistic = { ...this._optimistic, [entityId]: active };
    this._optimisticBase[entityId] = stateObj.last_updated;
    window.clearTimeout(this._optimisticTimers[entityId]);
    this._optimisticTimers[entityId] = window.setTimeout(
      () => this._clearOptimistic(entityId),
      OPTIMISTIC_TIMEOUT_MS
    );
  }

  /** The tap an item performs: explicit, or inferred from its entity. */
  private _resolveAction(item: LauncherItemConfig): LauncherAction {
    if (item.tap) return item.tap;
    const entity = item.entity as string; // setConfig guarantees one exists
    return CONTROLLABLE.has(domainOf(entity)) ? { action: 'toggle' } : { action: 'more-info' };
  }

  private _navigate(path: string): void {
    history.pushState(null, '', path);
    this.dispatchEvent(
      new CustomEvent('location-changed', {
        detail: { replace: false },
        bubbles: true,
        composed: true,
      })
    );
  }

  private _onItemClick(ev: Event, item: LauncherItemConfig): void {
    ev.stopPropagation();
    const hass = this.hass;
    if (!hass) return;
    const stateObj = item.entity ? hass.states[item.entity] : undefined;
    const requested = this._resolveAction(item);
    // An unavailable entity can still be inspected, never commanded.
    const blocked =
      Boolean(item.entity) &&
      isUnavailable(stateObj) &&
      (requested.action === 'toggle' || requested.action === 'perform-action');
    const action: LauncherActionType = blocked ? 'more-info' : requested.action;

    switch (action) {
      case 'toggle': {
        if (!stateObj) return;
        haptic(this);
        this._setOptimistic(stateObj, !isActive(stateObj));
        void toggleEntity(hass, stateObj.entity_id);
        return;
      }
      case 'navigate': {
        if (!requested.path) return;
        haptic(this, 'selection');
        this._navigate(requested.path);
        return;
      }
      case 'url': {
        if (!requested.url) return;
        haptic(this, 'selection');
        window.open(requested.url, '_blank', 'noopener');
        return;
      }
      case 'more-info': {
        if (!item.entity) return;
        haptic(this, 'selection');
        moreInfo(this, item.entity);
        return;
      }
      case 'perform-action': {
        const [domain, service] = String(requested.service).split('.');
        if (!domain || !service) return;
        haptic(this);
        // `data` is passed through as authored — targets stay the user's call.
        void hass.callService(domain, service, requested.data ? { ...requested.data } : undefined);
        return;
      }
    }
  }

  private _renderItem(item: ResolvedItem): TemplateResult {
    const hass = this.hass;
    const stateObj = item.entity ? hass?.states[item.entity] : undefined;
    const override = item.entity ? this._optimistic[item.entity] : undefined;
    const unavailable = Boolean(item.entity) && (!stateObj || isUnavailable(stateObj));
    const active = override ?? (!unavailable && isActive(stateObj));
    // While an override is live, present a synthetic state so the accent agrees
    // with the tile (lock and climate accents read the state string).
    const displayObj: HassEntity | undefined =
      stateObj && override !== undefined
        ? { ...stateObj, state: predictedState(domainOf(stateObj.entity_id), override) }
        : stateObj;
    const accent = accentFor(displayObj, item.color);
    const action = this._resolveAction(item).action;
    const entityName = stateObj?.attributes.friendly_name ?? item.entity;
    // An icon-only tile stays icon-only; a tile written as a bare id has nothing
    // but its entity to name it, so the friendly name becomes the label.
    const label = item.name ?? (item.auto ? entityName : undefined);
    const aria = item.name ?? entityName ?? item.icon ?? 'shortcut';

    return html`
      <button
        class="item ${active ? 'on' : ''} ${!active && item.color ? 'tinted' : ''} ${unavailable
          ? 'unavailable'
          : ''}"
        style="--silk-accent:${accent}"
        aria-label=${aria}
        aria-pressed=${action === 'toggle' && !unavailable ? String(active) : nothing}
        @click=${(ev: Event) => this._onItemClick(ev, item)}
      >
        <span class="tile">
          ${item.icon
            ? html`<ha-icon .icon=${item.icon}></ha-icon>`
            : html`<ha-state-icon .hass=${hass} .stateObj=${stateObj}></ha-state-icon>`}
        </span>
        ${label ? html`<span class="label" title=${label}>${label}</span>` : nothing}
      </button>
    `;
  }

  protected render(): TemplateResult | typeof nothing {
    const config = this._config;
    if (!config) return nothing;
    const items = resolveItems(config.items);
    return html`
      <ha-card>
        ${config.name ? html`<div class="header">${config.name}</div>` : nothing}
        <div class="grid">${items.map((item) => this._renderItem(item))}</div>
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
        gap: 0;
        padding: 12px;
        cursor: default;
      }
      .header {
        min-width: 0;
        margin: 0 2px 10px;
        font-size: 13px;
        font-weight: 600;
        line-height: 1.2;
        color: var(--secondary-text-color);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(64px, 1fr));
        gap: 10px;
        justify-items: center;
      }
      .item {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 5px;
        width: 100%;
        max-width: 84px;
        min-width: 0;
        margin: 0;
        padding: 0;
        border: none;
        background: none;
        font: inherit;
        cursor: pointer;
        -webkit-tap-highlight-color: transparent;
      }
      .tile {
        flex: none;
        width: 64px;
        height: 64px;
        border-radius: 18px;
        display: grid;
        place-items: center;
        color: var(--secondary-text-color);
        background: rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.06);
        transition:
          transform 250ms var(--silk-spring),
          background 200ms ease,
          color 200ms ease;
      }
      .item:active .tile {
        transform: scale(0.93);
        transition-duration: 120ms;
        transition-timing-function: var(--silk-ease-out);
      }
      /* State reads as surface: the tile fills, the label stays a text token. */
      .item.on .tile {
        color: var(--silk-accent);
        background: color-mix(in srgb, var(--silk-accent) 20%, transparent);
      }
      /* An explicitly coloured shortcut carries its accent on the glyph only. */
      .item.tinted .tile {
        color: var(--silk-accent);
      }
      .item:focus-visible {
        outline: none;
      }
      .item:focus-visible .tile {
        outline: 2px solid color-mix(in srgb, var(--silk-accent) 70%, transparent);
        outline-offset: 2px;
      }
      .tile ha-icon,
      .tile ha-state-icon {
        --mdc-icon-size: 26px;
        pointer-events: none;
      }
      .label {
        font-size: 10px;
        font-weight: 500;
        line-height: 1.2;
        color: var(--secondary-text-color);
        max-width: 100%;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .item.unavailable {
        opacity: 0.45;
      }
      .item.unavailable .tile {
        color: var(--disabled-text-color, #6f6f6f);
        background: rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.04);
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    'silk-launcher-card': SilkLauncherCard;
  }
}
