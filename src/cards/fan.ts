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
  stateText,
  supportsFeature,
  clamp,
} from '../shared/service';
import { accentFor } from '../shared/color';
import { registerEditor } from '../shared/editor';
import '../shared/slider';

export const META = {
  type: 'silk-fan-card',
  name: 'Silk Fan',
  description: 'Speed at your fingertips, with an icon that actually spins.',
};

/** fan.FanEntityFeature */
const FEATURE_SET_SPEED = 1;
const FEATURE_PRESET_MODE = 8;

const MAX_PRESET_CHIPS = 3;
const OPTIMISTIC_TTL_MS = 2000;

interface SilkFanCardConfig extends LovelaceCardConfig {
  entity: string;
  name?: string;
  icon?: string;
  color?: string;
}

registerEditor(
  'silk-fan-card-editor',
  [
    { name: 'entity', required: true, selector: { entity: { domain: ['fan'] } } },
    { name: 'name', selector: { text: {} } },
    { name: 'icon', selector: { icon: {} } },
  ],
  { entity: 'Entity', name: 'Name', icon: 'Icon' }
);

@customElement('silk-fan-card')
export class SilkFanCard extends LitElement {
  @property({ attribute: false }) public hass?: HomeAssistant;

  @state() private _config?: SilkFanCardConfig;
  /** Live value while the finger is on the slider. */
  @state() private _dragPct?: number;
  /** Optimistic overrides after a service call, until HA confirms (or 2s). */
  @state() private _optOn?: boolean;
  @state() private _optPct?: number;
  @state() private _optPreset?: string;

  private _optTimer?: number;
  private _lastUpdated?: string;

  public static getStubConfig(hass: HomeAssistant): Partial<SilkFanCardConfig> {
    const entity = Object.keys(hass.states).find((id) => id.startsWith('fan.'));
    return { type: 'custom:silk-fan-card', entity };
  }

  public static async getConfigElement(): Promise<HTMLElement> {
    return document.createElement('silk-fan-card-editor');
  }

  public setConfig(config: SilkFanCardConfig): void {
    if (!config.entity) {
      throw new Error('silk-fan-card: `entity` is required');
    }
    if (domainOf(config.entity) !== 'fan') {
      throw new Error(`silk-fan-card: \`entity\` must be a fan.* entity, got \`${config.entity}\``);
    }
    this._config = config;
    this._dragPct = undefined;
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

  private _rawPct(stateObj: HassEntity): number | undefined {
    const pct = stateObj.attributes.percentage;
    return typeof pct === 'number' && Number.isFinite(pct) ? pct : undefined;
  }

  /** Displayed percentage: drag beats optimistic beats reported. */
  private _effectivePct(stateObj: HassEntity): number | undefined {
    return this._dragPct ?? this._optPct ?? this._rawPct(stateObj);
  }

  /** Displayed on/off: drag beats optimistic beats reported. */
  private _effectiveOn(stateObj: HassEntity): boolean {
    if (this._dragPct !== undefined) return this._dragPct > 0;
    return this._optOn ?? isActive(stateObj);
  }

  // ── Actions ────────────────────────────────────────────────────────────

  private _setOptimistic(patch: { on?: boolean; pct?: number; preset?: string }): void {
    if (patch.on !== undefined) this._optOn = patch.on;
    if (patch.pct !== undefined) this._optPct = patch.pct;
    if (patch.preset !== undefined) this._optPreset = patch.preset;
    window.clearTimeout(this._optTimer);
    this._optTimer = window.setTimeout(() => this._clearOptimistic(), OPTIMISTIC_TTL_MS);
  }

  private _clearOptimistic(): void {
    window.clearTimeout(this._optTimer);
    this._optTimer = undefined;
    this._optOn = undefined;
    this._optPct = undefined;
    this._optPreset = undefined;
  }

  private _onIconClick(ev: Event): void {
    ev.stopPropagation();
    if (!this.hass || !this._config) return;
    const stateObj = this.hass.states[this._config.entity];
    if (!stateObj || isUnavailable(stateObj)) return;
    const turningOn = !this._effectiveOn(stateObj);
    toggleEntity(this.hass, this._config.entity);
    this._setOptimistic(turningOn ? { on: true } : { on: false, pct: 0 });
    haptic(this);
  }

  private _onSlide(ev: CustomEvent<{ value: number }>): void {
    this._dragPct = ev.detail.value;
  }

  private _onSliderChange(ev: CustomEvent<{ value: number }>): void {
    const value = ev.detail.value;
    this._dragPct = undefined;
    if (!this.hass || !this._config) return;
    const entityId = this._config.entity;
    if (value <= 0) {
      this.hass.callService('fan', 'turn_off', { entity_id: entityId });
      this._setOptimistic({ on: false, pct: 0 });
    } else {
      this.hass.callService('fan', 'set_percentage', { entity_id: entityId, percentage: value });
      this._setOptimistic({ on: true, pct: value });
    }
    haptic(this);
  }

  private _onPresetClick(ev: Event, preset: string): void {
    ev.stopPropagation();
    if (!this.hass || !this._config) return;
    this.hass.callService('fan', 'set_preset_mode', {
      entity_id: this._config.entity,
      preset_mode: preset,
    });
    this._setOptimistic({ preset });
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
    const pct = this._effectivePct(stateObj);
    const hasSpeed = supportsFeature(stateObj, FEATURE_SET_SPEED);
    const name = config.name ?? stateObj.attributes.friendly_name ?? config.entity;

    // Real motion: spin only while the fan actually spins; speed tracks percentage.
    const spinning = active && (pct === undefined || pct > 0);
    const spinDuration = clamp(3.5 - (pct ?? 50) * 0.03, 0.6, 3.5);

    const presets = supportsFeature(stateObj, FEATURE_PRESET_MODE)
      ? ((stateObj.attributes.preset_modes as string[] | undefined) ?? []).slice(0, MAX_PRESET_CHIPS)
      : [];
    const currentPreset = this._optPreset ?? (stateObj.attributes.preset_mode as string | undefined);

    return html`
      <ha-card
        class="control ${unavailable ? 'unavailable' : ''}"
        style="--silk-accent:${accentFor(stateObj, config.color)}"
        @click=${this._onCardClick}
      >
        ${hasSpeed
          ? html`
              <silk-slider
                fill
                .value=${pct ?? 0}
                .min=${0}
                .max=${100}
                .step=${stateObj.attributes.percentage_step ?? 25}
                .disabled=${unavailable}
                @slide=${this._onSlide}
                @change=${this._onSliderChange}
              ></silk-slider>
            `
          : nothing}
        <button
          class="icon ${active ? 'on' : ''}"
          .disabled=${unavailable}
          aria-label=${active ? `Turn off ${name}` : `Turn on ${name}`}
          @click=${this._onIconClick}
        >
          <span
            class="blades ${spinning ? 'spinning' : ''}"
            style=${spinning ? `animation-duration:${spinDuration.toFixed(2)}s` : nothing}
          >
            ${config.icon
              ? html`<ha-icon .icon=${config.icon}></ha-icon>`
              : html`<ha-state-icon .hass=${this.hass} .stateObj=${stateObj}></ha-state-icon>`}
          </span>
        </button>
        <div class="info">
          <div class="name">${name}</div>
          <div class="state">${this._renderStateLine(stateObj, active, pct, hasSpeed)}</div>
        </div>
        ${presets.length
          ? html`
              <div class="trailing">
                ${presets.map(
                  (preset) => html`
                    <button
                      class="chip ${preset === currentPreset ? 'active' : ''}"
                      .disabled=${unavailable}
                      @click=${(ev: Event) => this._onPresetClick(ev, preset)}
                    >
                      ${preset}
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
    pct: number | undefined,
    hasSpeed: boolean
  ): TemplateResult {
    // While an override is live, the reported state is stale — synthesize On/Off.
    const overridden = this._dragPct !== undefined || this._optOn !== undefined;
    const base = overridden && !isUnavailable(stateObj)
      ? active
        ? 'On'
        : 'Off'
      : stateText(this.hass, stateObj);
    const showPct = hasSpeed && active && pct !== undefined && pct > 0;
    return html`${base}${showPct
      ? html`<span class="sep">·</span>${Math.round(pct)}%`
      : nothing}`;
  }

  static styles = [
    silkControlStyles,
    css`
      .blades {
        display: grid;
        place-items: center;
        line-height: 0;
        pointer-events: none;
      }
      .blades.spinning {
        /* Duration comes from the inline style (tracks speed); the shared
           prefers-reduced-motion rule zeroes it out with !important. */
        animation: silk-fan-spin linear infinite;
      }
      @keyframes silk-fan-spin {
        from {
          transform: rotate(0deg);
        }
        to {
          transform: rotate(360deg);
        }
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    'silk-fan-card': SilkFanCard;
  }
}
