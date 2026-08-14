import { LitElement, html, css, nothing, PropertyValues, TemplateResult } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { HomeAssistant, HassEntity, LovelaceCardConfig } from '../types';
import { silkControlStyles } from '../shared/base';
import {
  domainOf,
  isActive,
  isUnavailable,
  toggleEntity,
  moreInfo,
  haptic,
} from '../shared/service';
import { accentFor } from '../shared/color';
import {
  EntityItem,
  EntityListConfig,
  entityIds,
  entityListSelector,
  normalizeEntityList,
} from '../shared/list';
import { registerListEditor } from '../shared/listeditor';
import { formatNumber } from '../format';

export const META = {
  type: 'silk-room-card',
  name: 'Silk Room',
  description: 'A room at a glance: climate, activity, and quick controls.',
};

export interface RoomCardConfig extends LovelaceCardConfig {
  /** Room name — the one required key. */
  name: string;
  /** Room icon, defaults to mdi:sofa. */
  icon?: string;
  /** Accent override; otherwise derived from the first toggle entity. */
  color?: string;
  /**
   * Up to 3 numeric sensors rendered as compact readouts (21.3° · 45% · 620W).
   * Plain ids from the picker, or `{entity, name, icon}` for a leading glyph
   * and a tooltip.
   */
  sensors?: EntityListConfig;
  /**
   * Up to 4 controllable entities rendered as quick-toggle icon buttons.
   * `{entity, name, icon, color}` overrides that button's label/glyph/accent.
   */
  toggles?: EntityListConfig;
  /** Entities counted into the "N on" segment of the state line. */
  count_active?: EntityListConfig;
  /** Dashboard path to navigate to on card tap (otherwise more-info). */
  navigation_path?: string;
}

const DEFAULT_ICON = 'mdi:sofa';
const MAX_SENSORS = 3;
const MAX_TOGGLES = 4;
const OPTIMISTIC_TIMEOUT_MS = 2000;

/** Domains that can actually be toggled from a quick-control button. */
const TOGGLE_DOMAINS = ['switch', 'light', 'fan', 'cover', 'media_player', 'lock'];

const EDITOR_TAG = 'silk-room-card-editor';

const EDITOR_LABELS: Record<string, string> = {
  name: '이름',
  icon: '아이콘',
  sensors: '표시할 센서',
  toggles: '조작 버튼',
  count_active: '켜짐 개수 집계',
  navigation_path: '이동 경로',
  color: '강조 색상',
};

/**
 * One schema, pickers always on screen. A list carrying hand-written
 * `{entity, name, icon}` entries still reaches the form as bare ids, and the
 * editor folds the picked ids back into the stored list on change — so editing
 * the room from the UI keeps every per-item label and glyph, and keys the
 * schema never mentions (type, grid_options, tap_action…) pass through.
 */
const EDITOR_SCHEMA = [
  { name: 'name', required: true, selector: { text: {} } },
  { name: 'icon', selector: { icon: {} } },
  entityListSelector('sensors', ['sensor']),
  entityListSelector('toggles', TOGGLE_DOMAINS),
  entityListSelector('count_active'),
  { name: 'navigation_path', selector: { text: {} } },
  { name: 'color', selector: { text: {} } },
];

registerListEditor(EDITOR_TAG, {
  schema: EDITOR_SCHEMA,
  labels: EDITOR_LABELS,
  defaults: { icon: DEFAULT_ICON },
  listFields: ['sensors', 'toggles', 'count_active'],
});

/** °C/°F condense to a bare degree sign; anything else renders as-is. */
function condenseUnit(unit: unknown): string {
  if (typeof unit !== 'string' || !unit) return '';
  if (unit === '°C' || unit === '°F') return '°';
  return unit;
}

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

@customElement('silk-room-card')
export class SilkRoomCard extends LitElement {
  @property({ attribute: false }) public hass?: HomeAssistant;

  @state() private _config?: RoomCardConfig;

  /** Per-entity optimistic targets (absent key = trust the real state). */
  @state() private _optimistic: Record<string, boolean> = {};

  private _sensors: EntityItem[] = [];
  private _toggles: EntityItem[] = [];
  private _countIds: string[] = [];

  /** last_updated snapshots at toggle time; a newer stamp clears the override. */
  private _optimisticBase: Record<string, string> = {};
  private _optimisticTimers: Record<string, number> = {};

  public static getStubConfig(): RoomCardConfig {
    return { type: 'custom:silk-room-card', name: 'Living room', icon: DEFAULT_ICON };
  }

  public static async getConfigElement(): Promise<HTMLElement> {
    return document.createElement(EDITOR_TAG);
  }

  public setConfig(config: RoomCardConfig): void {
    if (!config.name) {
      throw new Error('silk-room-card: `name` is required');
    }
    for (const key of ['sensors', 'toggles', 'count_active'] as const) {
      if (config[key] !== undefined && !Array.isArray(config[key])) {
        throw new Error(`silk-room-card: \`${key}\` must be a list of entities`);
      }
    }
    this._config = config;
    // Either shape — ['sensor.a'] from the picker, or [{entity, name, icon}].
    this._sensors = normalizeEntityList(config.sensors).slice(0, MAX_SENSORS);
    this._toggles = normalizeEntityList(config.toggles).slice(0, MAX_TOGGLES);
    this._countIds = entityIds(config.count_active);
    this._clearAllOptimistic();
  }

  public getCardSize(): number {
    return 1;
  }

  public getGridOptions(): Record<string, number> {
    return { columns: 6, rows: 1, min_columns: 4, min_rows: 1 };
  }

  public disconnectedCallback(): void {
    super.disconnectedCallback();
    for (const id of Object.keys(this._optimisticTimers)) {
      window.clearTimeout(this._optimisticTimers[id]);
    }
    this._optimisticTimers = {};
  }

  protected willUpdate(changed: PropertyValues): void {
    if (!changed.has('hass') || !this.hass) return;
    for (const id of Object.keys(this._optimistic)) {
      const stateObj = this.hass.states[id];
      if (stateObj && stateObj.last_updated !== this._optimisticBase[id]) {
        this._clearOptimistic(id);
      }
    }
  }

  private _clearOptimistic(entityId: string): void {
    window.clearTimeout(this._optimisticTimers[entityId]);
    delete this._optimisticTimers[entityId];
    delete this._optimisticBase[entityId];
    if (entityId in this._optimistic) {
      const next = { ...this._optimistic };
      delete next[entityId];
      this._optimistic = next;
    }
  }

  private _clearAllOptimistic(): void {
    for (const id of Object.keys(this._optimisticTimers)) {
      window.clearTimeout(this._optimisticTimers[id]);
    }
    this._optimisticTimers = {};
    this._optimisticBase = {};
    this._optimistic = {};
  }

  /** Active state of an entity with any optimistic override applied. */
  private _displayActive(entityId: string): boolean {
    const override: boolean | undefined = this._optimistic[entityId];
    if (override !== undefined) return override;
    return isActive(this.hass?.states[entityId]);
  }

  private _onCardClick(): void {
    const config = this._config;
    if (!config) return;
    if (config.navigation_path) {
      history.pushState(null, '', config.navigation_path);
      this.dispatchEvent(
        new CustomEvent('location-changed', {
          detail: { replace: false },
          bubbles: true,
          composed: true,
        })
      );
      return;
    }
    const target = this._sensors[0]?.entity ?? this._toggles[0]?.entity;
    if (target) moreInfo(this, target);
  }

  private _onToggleClick(ev: Event, entityId: string): void {
    ev.stopPropagation();
    const hass = this.hass;
    if (!hass) return;
    const stateObj = hass.states[entityId];
    if (!stateObj || isUnavailable(stateObj)) return;
    haptic(this);
    // Optimistic flip mirrors what toggleEntity decides from the *real* state,
    // so rapid taps stay honest about the service calls actually sent.
    this._optimistic = { ...this._optimistic, [entityId]: !isActive(stateObj) };
    this._optimisticBase[entityId] = stateObj.last_updated;
    window.clearTimeout(this._optimisticTimers[entityId]);
    this._optimisticTimers[entityId] = window.setTimeout(
      () => this._clearOptimistic(entityId),
      OPTIMISTIC_TIMEOUT_MS
    );
    toggleEntity(hass, entityId);
  }

  /** Compact numeric readouts for the state line; missing entities skipped silently. */
  private _sensorSegments(): TemplateResult[] {
    const hass = this.hass!;
    const out: TemplateResult[] = [];
    for (const item of this._sensors) {
      const stateObj = hass.states[item.entity];
      if (!stateObj) continue;
      const value = Number(stateObj.state);
      const unit = Number.isFinite(value)
        ? condenseUnit(stateObj.attributes.unit_of_measurement)
        : '';
      // A hand-written name stays a tooltip — the readout line has no room for
      // labels — while an icon renders as a small glyph in front of the value.
      const glyph = item.icon
        ? html`<ha-icon class="ricon" .icon=${item.icon}></ha-icon>`
        : nothing;
      const text = `${formatNumber(hass, item.entity, value)}${unit}`;
      out.push(
        html`<span
          class="reading ${item.icon ? 'ico' : ''}"
          title=${item.name ?? nothing}
          >${glyph}${text}</span
        >`
      );
    }
    return out;
  }

  private _activeCount(): number {
    let n = 0;
    for (const id of this._countIds) {
      if (this._displayActive(id)) n++;
    }
    return n;
  }

  private _renderToggle(item: EntityItem): TemplateResult {
    const hass = this.hass!;
    const entityId = item.entity;
    const stateObj = hass.states[entityId];
    const disabled = !stateObj || isUnavailable(stateObj);
    const override: boolean | undefined = this._optimistic[entityId];
    const active = override ?? isActive(stateObj);
    // While an optimistic override is live, present a synthetic state object so
    // the icon glyph agrees with the flipped state.
    const displayObj: HassEntity | undefined =
      stateObj && override !== undefined
        ? { ...stateObj, state: predictedState(domainOf(entityId), override) }
        : stateObj;
    const label = item.name ?? stateObj?.attributes.friendly_name ?? entityId;
    // Per-item detail wins over the domain defaults when YAML supplies it.
    const glyph = item.icon
      ? html`<ha-icon .icon=${item.icon}></ha-icon>`
      : displayObj
        ? html`<ha-state-icon .hass=${hass} .stateObj=${displayObj}></ha-state-icon>`
        : html`<ha-icon icon="mdi:help-circle-outline"></ha-icon>`;
    return html`
      <button
        class="tbtn ${active ? 'on' : ''}"
        style="--silk-accent:${accentFor(displayObj, item.color)}"
        .disabled=${disabled}
        aria-label=${`Toggle ${label}`}
        aria-pressed=${active ? 'true' : 'false'}
        title=${item.name ?? nothing}
        @click=${(ev: Event) => this._onToggleClick(ev, entityId)}
      >
        ${glyph}
      </button>
    `;
  }

  protected render(): TemplateResult | typeof nothing {
    const config = this._config;
    const hass = this.hass;
    if (!config || !hass) return nothing;

    const first = this._toggles[0];
    const accent = accentFor(
      first ? hass.states[first.entity] : undefined,
      config.color ?? first?.color
    );

    const activeCount = this._countIds.length ? this._activeCount() : 0;
    const roomActive =
      activeCount > 0 || this._toggles.some((item) => this._displayActive(item.entity));

    const parts: TemplateResult[] = [];
    for (const segment of this._sensorSegments()) {
      if (parts.length) parts.push(html`<span class="sep">·</span>`);
      parts.push(segment);
    }
    if (this._countIds.length) {
      if (parts.length) parts.push(html`<span class="sep">·</span>`);
      parts.push(
        html`<span class="count ${activeCount > 0 ? 'on' : ''}">${activeCount} on</span>`
      );
    }

    return html`
      <ha-card class="control" style="--silk-accent:${accent}" @click=${this._onCardClick}>
        <div class="icon ${roomActive ? 'on' : ''}">
          <ha-icon .icon=${config.icon ?? DEFAULT_ICON}></ha-icon>
        </div>
        <div class="info">
          <div class="name">${config.name}</div>
          ${parts.length ? html`<div class="state">${parts}</div>` : nothing}
        </div>
        ${this._toggles.length
          ? html`<div class="trailing">
              ${this._toggles.map((item) => this._renderToggle(item))}
            </div>`
          : nothing}
      </ha-card>
    `;
  }

  static styles = [
    silkControlStyles,
    css`
      /* Hero proportions: a touch larger than the standard control row. */
      .icon {
        width: 46px;
        height: 46px;
      }
      .icon ha-icon {
        --mdc-icon-size: 24px;
      }
      .name {
        font-size: 15px;
        font-weight: 600;
      }
      .count.on {
        color: var(--silk-accent);
      }
      /* Only readouts that opted into an icon become flex rows — a bare number
         keeps the plain inline flow it has always had. */
      .reading.ico {
        display: inline-flex;
        align-items: center;
        gap: 3px;
        vertical-align: -1px;
      }
      .reading .ricon {
        --mdc-icon-size: 13px;
        color: var(--secondary-text-color);
      }
      .tbtn {
        flex: none;
        position: relative;
        width: 36px;
        height: 36px;
        border: none;
        border-radius: 12px;
        display: grid;
        place-items: center;
        padding: 0;
        cursor: pointer;
        color: var(--secondary-text-color);
        background: rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.06);
        transition:
          transform 250ms var(--silk-spring),
          background 200ms ease,
          color 200ms ease;
      }
      /* Invisible halo widens the touch target without growing the button. */
      .tbtn::after {
        content: '';
        position: absolute;
        inset: -3px;
        border-radius: 15px;
      }
      .tbtn:active {
        transform: scale(0.9);
        transition-duration: 120ms;
        transition-timing-function: var(--silk-ease-out);
      }
      .tbtn.on {
        color: var(--silk-accent);
        background: color-mix(in srgb, var(--silk-accent) 18%, transparent);
      }
      .tbtn ha-state-icon,
      .tbtn ha-icon {
        --mdc-icon-size: 20px;
        pointer-events: none;
      }
      .tbtn:disabled {
        opacity: 0.45;
        cursor: default;
      }
      .tbtn:focus-visible {
        outline: 2px solid color-mix(in srgb, var(--silk-accent) 70%, transparent);
        outline-offset: 2px;
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    'silk-room-card': SilkRoomCard;
  }
}
