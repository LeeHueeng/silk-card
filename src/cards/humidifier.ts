import { LitElement, html, nothing, PropertyValues, TemplateResult } from 'lit';
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
  stateText,
} from '../shared/service';
import { accentFor } from '../shared/color';
import { registerEditor } from '../shared/editor';
import '../shared/slider';

export const META = {
  type: 'silk-humidifier-card',
  name: 'Silk Humidifier',
  description: 'Target humidity at a drag.',
};

const MAX_MODE_CHIPS = 3;
const OPTIMISTIC_TTL_MS = 2000;

export interface SilkHumidifierCardConfig extends LovelaceCardConfig {
  entity: string;
  name?: string;
  icon?: string;
  color?: string;
}

const EDITOR_TAG = 'silk-humidifier-card-editor';

registerEditor(
  EDITOR_TAG,
  [
    { name: 'entity', required: true, selector: { entity: { domain: ['humidifier'] } } },
    { name: 'name', selector: { text: {} } },
    { name: 'icon', selector: { icon: {} } },
    { name: 'color', selector: { ui_color: {} } },
  ],
  { entity: '엔티티', name: '이름', icon: '아이콘', color: '강조 색상' }
);

@customElement('silk-humidifier-card')
export class SilkHumidifierCard extends LitElement {
  @property({ attribute: false }) public hass?: HomeAssistant;

  @state() private _config?: SilkHumidifierCardConfig;
  /** Live target while the finger is on the slider. */
  @state() private _dragTarget?: number;
  /** Optimistic overrides after a service call, until HA confirms (or 2s). */
  @state() private _optOn?: boolean;
  @state() private _optTarget?: number;
  @state() private _optMode?: string;

  private _optTimer?: number;
  private _lastUpdated?: string;

  public static getStubConfig(hass: HomeAssistant): Partial<SilkHumidifierCardConfig> {
    const entity = Object.keys(hass.states).find((id) => id.startsWith('humidifier.'));
    return { type: 'custom:silk-humidifier-card', entity };
  }

  public static async getConfigElement(): Promise<HTMLElement> {
    return document.createElement(EDITOR_TAG);
  }

  public setConfig(config: SilkHumidifierCardConfig): void {
    if (!config.entity) {
      throw new Error('silk-humidifier-card: `entity` is required');
    }
    if (domainOf(config.entity) !== 'humidifier') {
      throw new Error(
        `silk-humidifier-card: \`entity\` must be a humidifier.* entity, got \`${config.entity}\``
      );
    }
    this._config = config;
    this._dragTarget = undefined;
    this._lastUpdated = undefined;
    this._clearOptimistic();
  }

  public getCardSize(): number {
    return 1;
  }

  public getGridOptions(): Record<string, number> {
    return { columns: 6, rows: 1, min_columns: 4, min_rows: 1 };
  }

  public disconnectedCallback(): void {
    super.disconnectedCallback();
    window.clearTimeout(this._optTimer);
    this._optTimer = undefined;
  }

  protected willUpdate(changed: PropertyValues): void {
    if (!changed.has('hass') || !this._config) return;
    // The real state landed — drop optimistic overrides in its favor.
    const stamp = this.hass?.states[this._config.entity]?.last_updated;
    if (stamp && stamp !== this._lastUpdated) {
      const hadPrevious = this._lastUpdated !== undefined;
      this._lastUpdated = stamp;
      if (hadPrevious) this._clearOptimistic();
    }
  }

  // ── Derived state ──────────────────────────────────────────────────────

  private _asNumber(value: unknown): number | undefined {
    const n = Number(value);
    return value !== null && value !== undefined && value !== '' && Number.isFinite(n)
      ? n
      : undefined;
  }

  /** Displayed target humidity: drag beats optimistic beats reported. */
  private _effectiveTarget(stateObj: HassEntity): number | undefined {
    return this._dragTarget ?? this._optTarget ?? this._asNumber(stateObj.attributes.humidity);
  }

  /** Displayed on/off: optimistic beats reported. */
  private _effectiveOn(stateObj: HassEntity): boolean {
    return this._optOn ?? isActive(stateObj);
  }

  // ── Actions ────────────────────────────────────────────────────────────

  private _setOptimistic(patch: { on?: boolean; target?: number; mode?: string }): void {
    if (patch.on !== undefined) this._optOn = patch.on;
    if (patch.target !== undefined) this._optTarget = patch.target;
    if (patch.mode !== undefined) this._optMode = patch.mode;
    window.clearTimeout(this._optTimer);
    this._optTimer = window.setTimeout(() => this._clearOptimistic(), OPTIMISTIC_TTL_MS);
  }

  private _clearOptimistic(): void {
    window.clearTimeout(this._optTimer);
    this._optTimer = undefined;
    this._optOn = undefined;
    this._optTarget = undefined;
    this._optMode = undefined;
  }

  private _onIconClick(ev: Event): void {
    ev.stopPropagation();
    if (!this.hass || !this._config) return;
    const stateObj = this.hass.states[this._config.entity];
    if (!stateObj || isUnavailable(stateObj)) return;
    const turningOn = !this._effectiveOn(stateObj);
    toggleEntity(this.hass, this._config.entity);
    this._setOptimistic({ on: turningOn });
    haptic(this);
  }

  private _onSlide(ev: CustomEvent<{ value: number }>): void {
    this._dragTarget = ev.detail.value;
  }

  private _onSliderChange(ev: CustomEvent<{ value: number }>): void {
    const value = ev.detail.value;
    this._dragTarget = undefined;
    if (!this.hass || !this._config) return;
    this.hass.callService('humidifier', 'set_humidity', {
      entity_id: this._config.entity,
      humidity: value,
    });
    this._setOptimistic({ target: value });
    haptic(this);
  }

  private _onModeClick(ev: Event, mode: string): void {
    ev.stopPropagation();
    if (!this.hass || !this._config) return;
    this.hass.callService('humidifier', 'set_mode', {
      entity_id: this._config.entity,
      mode,
    });
    this._setOptimistic({ mode });
    haptic(this);
  }

  private _onCardClick(ev: Event): void {
    // The fill slider already handled this pointer — don't double-fire more-info.
    if ((ev.target as HTMLElement).localName === 'silk-slider') return;
    if (this._config) moreInfo(this, this._config.entity);
  }

  // ── Render ─────────────────────────────────────────────────────────────

  protected render(): TemplateResult | typeof nothing {
    if (!this._config || !this.hass) return nothing;
    const config = this._config;
    const stateObj = this.hass.states[config.entity];
    if (!stateObj) {
      return html`<ha-card><div class="warning">Entity not found: ${config.entity}</div></ha-card>`;
    }

    const unavailable = isUnavailable(stateObj);
    const active = !unavailable && this._effectiveOn(stateObj);
    const target = this._effectiveTarget(stateObj);
    const min = this._asNumber(stateObj.attributes.min_humidity) ?? 0;
    const max = this._asNumber(stateObj.attributes.max_humidity) ?? 100;
    const name = config.name ?? stateObj.attributes.friendly_name ?? config.entity;

    const modes = ((stateObj.attributes.available_modes as string[] | undefined) ?? []).slice(
      0,
      MAX_MODE_CHIPS
    );
    const currentMode = this._optMode ?? (stateObj.attributes.mode as string | undefined);

    return html`
      <ha-card
        class="control ${unavailable ? 'unavailable' : ''}"
        style="--silk-accent:${accentFor(stateObj, config.color)}"
        @click=${this._onCardClick}
      >
        <silk-slider
          fill
          .value=${target ?? min}
          .min=${min}
          .max=${max}
          .step=${1}
          .disabled=${unavailable}
          @slide=${this._onSlide}
          @change=${this._onSliderChange}
        ></silk-slider>
        <button
          class="icon ${active ? 'on' : ''}"
          .disabled=${unavailable}
          aria-label=${active ? `Turn off ${name}` : `Turn on ${name}`}
          @click=${this._onIconClick}
        >
          ${config.icon
            ? html`<ha-icon .icon=${config.icon}></ha-icon>`
            : html`<ha-state-icon .hass=${this.hass} .stateObj=${stateObj}></ha-state-icon>`}
        </button>
        <div class="info">
          <div class="name">${name}</div>
          <div class="state">${this._renderStateLine(stateObj, active, target)}</div>
        </div>
        ${modes.length
          ? html`
              <div class="trailing">
                ${modes.map(
                  (mode) => html`
                    <button
                      class="chip ${mode === currentMode ? 'active' : ''}"
                      .disabled=${unavailable}
                      @click=${(ev: Event) => this._onModeClick(ev, mode)}
                    >
                      ${mode}
                    </button>
                  `
                )}
              </div>
            `
          : nothing}
      </ha-card>
    `;
  }

  private _renderStateLine(
    stateObj: HassEntity,
    active: boolean,
    target: number | undefined
  ): TemplateResult {
    // While an override is live, the reported state is stale — synthesize On/Off.
    const overridden = this._optOn !== undefined;
    const base =
      overridden && !isUnavailable(stateObj) ? (active ? 'On' : 'Off') : stateText(this.hass, stateObj);
    const current = this._asNumber(stateObj.attributes.current_humidity);
    return html`${base}${target !== undefined
      ? html`<span class="sep">·</span>target ${Math.round(target)}%`
      : nothing}${current !== undefined
      ? html`<span class="sep">·</span>now ${Math.round(current)}%`
      : nothing}`;
  }

  static styles = [silkControlStyles];
}

declare global {
  interface HTMLElementTagNameMap {
    'silk-humidifier-card': SilkHumidifierCard;
  }
}
