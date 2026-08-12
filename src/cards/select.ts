import { LitElement, html, css, nothing, PropertyValues, TemplateResult } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { HomeAssistant, HassEntity, LovelaceCardConfig } from '../types';
import { silkControlStyles } from '../shared/base';
import { domainOf, isActive, isUnavailable, moreInfo, haptic, stateText } from '../shared/service';
import { accentFor } from '../shared/color';
import { registerEditor } from '../shared/editor';

export const META = {
  type: 'silk-select-card',
  name: 'Silk Select',
  description: 'Options as chips, not dropdowns.',
};

export interface SilkSelectCardConfig extends LovelaceCardConfig {
  entity: string;
  name?: string;
  icon?: string;
  color?: string;
  /** Options at or under this count render as chips; above it, a dropdown. */
  chip_limit?: number;
}

const DEFAULT_CHIP_LIMIT = 4;
const OPTIMISTIC_TTL_MS = 2000;
const DOMAINS = ['select', 'input_select'];

const EDITOR_TAG = 'silk-select-card-editor';

registerEditor(
  EDITOR_TAG,
  [
    { name: 'entity', required: true, selector: { entity: { domain: DOMAINS } } },
    { name: 'name', selector: { text: {} } },
    { name: 'icon', selector: { icon: {} } },
  ],
  { entity: 'Entity', name: 'Name', icon: 'Icon' }
);

/** Raw option → display label (select entities often carry snake_case options). */
const optionLabel = (option: string): string => option.replace(/_/g, ' ');

@customElement('silk-select-card')
export class SilkSelectCard extends LitElement {
  @property({ attribute: false }) public hass?: HomeAssistant;

  @state() private _config?: SilkSelectCardConfig;
  /** Optimistically chosen option (null = trust the real state). */
  @state() private _optimistic: string | null = null;

  private _optimisticTimer?: number;
  private _lastUpdated?: string;

  public static getStubConfig(hass: HomeAssistant): Partial<SilkSelectCardConfig> {
    const ids = Object.keys(hass.states);
    const entity =
      ids.find((id) => id.startsWith('select.')) ?? ids.find((id) => id.startsWith('input_select.'));
    return { type: 'custom:silk-select-card', entity };
  }

  public static async getConfigElement(): Promise<HTMLElement> {
    return document.createElement(EDITOR_TAG);
  }

  public setConfig(config: SilkSelectCardConfig): void {
    if (!config.entity) {
      throw new Error('silk-select-card: `entity` is required');
    }
    if (!DOMAINS.includes(domainOf(config.entity))) {
      throw new Error(
        `silk-select-card: \`entity\` must be a select or input_select (got "${config.entity}")`
      );
    }
    if (config.chip_limit !== undefined && !(Number(config.chip_limit) >= 1)) {
      throw new Error('silk-select-card: `chip_limit` must be a number of at least 1');
    }
    this._config = config;
    this._clearOptimistic();
  }

  public getCardSize(): number {
    return 1;
  }

  public getGridOptions(): Record<string, number> {
    return { columns: 12, rows: 1, min_columns: 6, min_rows: 1 };
  }

  public disconnectedCallback(): void {
    super.disconnectedCallback();
    window.clearTimeout(this._optimisticTimer);
    this._optimisticTimer = undefined;
  }

  protected willUpdate(changed: PropertyValues): void {
    if (!changed.has('hass') || !this._config) return;
    // The real state arrived: drop the optimistic override.
    const stamp = this.hass?.states[this._config.entity]?.last_updated;
    if (stamp !== this._lastUpdated) {
      this._lastUpdated = stamp;
      this._clearOptimistic();
    }
  }

  protected updated(): void {
    // The native dropdown's selection is a live property; `selected` attributes
    // only set the default. Re-sync it whenever the shown option changes.
    const sel = this.renderRoot.querySelector('select');
    const current = this._currentOption();
    if (sel && current !== null && sel.value !== current) sel.value = current;
  }

  private _clearOptimistic(): void {
    window.clearTimeout(this._optimisticTimer);
    this._optimisticTimer = undefined;
    this._optimistic = null;
  }

  private _currentOption(): string | null {
    if (this._optimistic !== null) return this._optimistic;
    const stateObj = this.hass?.states[this._config?.entity ?? ''];
    return stateObj ? stateObj.state : null;
  }

  private _pick(option: string): void {
    const config = this._config;
    const hass = this.hass;
    if (!config || !hass) return;
    const stateObj = hass.states[config.entity];
    if (!stateObj || isUnavailable(stateObj)) return;
    haptic(this, 'selection');
    this._optimistic = option;
    window.clearTimeout(this._optimisticTimer);
    this._optimisticTimer = window.setTimeout(() => this._clearOptimistic(), OPTIMISTIC_TTL_MS);
    hass.callService(domainOf(config.entity), 'select_option', {
      entity_id: config.entity,
      option,
    });
  }

  private _onChipClick(ev: Event, option: string): void {
    ev.stopPropagation();
    if (option === this._currentOption()) return;
    this._pick(option);
  }

  private _onSelectChange(ev: Event): void {
    ev.stopPropagation();
    const value = (ev.currentTarget as HTMLSelectElement).value;
    if (value !== '' && value !== this._currentOption()) this._pick(value);
  }

  private _onCardClick(): void {
    if (this._config) moreInfo(this, this._config.entity);
  }

  private _stopClick(ev: Event): void {
    ev.stopPropagation();
  }

  private _renderChips(options: string[], current: string, unavailable: boolean): TemplateResult {
    return html`
      ${options.map((option) => {
        const active = option === current;
        return html`
          <button
            class="chip ${active ? 'active' : ''}"
            aria-pressed=${active ? 'true' : 'false'}
            title=${option}
            ?disabled=${unavailable}
            @click=${(ev: Event) => this._onChipClick(ev, option)}
          >
            ${optionLabel(option)}
          </button>
        `;
      })}
    `;
  }

  private _renderDropdown(
    options: string[],
    current: string,
    unavailable: boolean,
    name: string
  ): TemplateResult {
    return html`
      <span class="selectwrap" @click=${this._stopClick}>
        <select
          aria-label=${`Option for ${name}`}
          ?disabled=${unavailable}
          @change=${this._onSelectChange}
          @click=${this._stopClick}
        >
          ${options.map(
            (option) => html`
              <option value=${option} ?selected=${option === current}>${optionLabel(option)}</option>
            `
          )}
        </select>
        <ha-icon class="chevron" .icon=${'mdi:chevron-down'}></ha-icon>
      </span>
    `;
  }

  protected render(): TemplateResult | typeof nothing {
    const config = this._config;
    const hass = this.hass;
    if (!config || !hass) return nothing;
    const stateObj = hass.states[config.entity];
    if (!stateObj) {
      return html`<ha-card><div class="warning">Entity not found: ${config.entity}</div></ha-card>`;
    }

    const unavailable = isUnavailable(stateObj);
    const options: string[] = Array.isArray(stateObj.attributes.options)
      ? stateObj.attributes.options.map(String)
      : [];
    const chipLimit = config.chip_limit ?? DEFAULT_CHIP_LIMIT;
    const current = this._optimistic ?? stateObj.state;
    // While an optimistic pick is live, present a synthetic state object so the
    // state line and icon agree with the chip that was just tapped.
    const displayObj: HassEntity =
      this._optimistic === null ? stateObj : { ...stateObj, state: this._optimistic };
    const accent = accentFor(stateObj, config.color);
    const name = config.name ?? stateObj.attributes.friendly_name ?? config.entity;

    return html`
      <ha-card
        class="control ${unavailable ? 'unavailable' : ''}"
        style="--silk-accent:${accent}"
        @click=${this._onCardClick}
      >
        <!-- The select card has no icon action: the icon presses with the card. -->
        <div class="icon ${!unavailable && isActive(displayObj) ? 'on' : ''}">
          ${config.icon
            ? html`<ha-icon .icon=${config.icon}></ha-icon>`
            : html`<ha-state-icon .hass=${hass} .stateObj=${displayObj}></ha-state-icon>`}
        </div>
        <div class="info">
          <div class="name">${name}</div>
          <div class="state">${stateText(hass, displayObj)}</div>
        </div>
        <div class="trailing">
          ${options.length === 0
            ? nothing
            : options.length <= chipLimit
              ? this._renderChips(options, current, unavailable)
              : this._renderDropdown(options, current, unavailable, name)}
        </div>
      </ha-card>
    `;
  }

  static styles = [
    silkControlStyles,
    css`
      .icon {
        cursor: pointer;
      }
      .icon:active {
        transform: none;
      }
      /* Chips may wrap to a second line when the card is given the height. */
      .trailing {
        flex: 0 1 auto;
        min-width: 0;
        max-width: 70%;
        flex-wrap: wrap;
        justify-content: flex-end;
        gap: 6px;
      }
      .chip {
        position: relative;
        max-width: 110px;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      /* Invisible halo lifts the touch target toward the 36px floor. */
      .chip::after {
        content: '';
        position: absolute;
        inset: -6px;
        border-radius: 999px;
      }
      .chip:focus-visible {
        outline: 2px solid color-mix(in srgb, var(--silk-accent) 70%, transparent);
        outline-offset: 2px;
      }
      .chip:disabled {
        cursor: default;
      }
      .selectwrap {
        position: relative;
        display: inline-flex;
        align-items: center;
        min-width: 0;
        max-width: 100%;
      }
      select {
        appearance: none;
        -webkit-appearance: none;
        border: none;
        font: inherit;
        font-size: 11px;
        font-weight: 600;
        letter-spacing: 0.02em;
        line-height: 1.4;
        padding: 5px 26px 5px 12px;
        border-radius: 999px;
        cursor: pointer;
        max-width: 100%;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        color: var(--silk-accent);
        background: color-mix(in srgb, var(--silk-accent) 16%, transparent);
        transition: background 150ms ease-out;
      }
      select:hover {
        background: color-mix(in srgb, var(--silk-accent) 22%, transparent);
      }
      select:focus-visible {
        outline: 2px solid color-mix(in srgb, var(--silk-accent) 70%, transparent);
        outline-offset: 2px;
      }
      select:disabled {
        cursor: default;
      }
      select option {
        color: var(--primary-text-color);
        background: var(--card-background-color, #fff);
      }
      .chevron {
        position: absolute;
        right: 6px;
        color: var(--silk-accent);
        --mdc-icon-size: 16px;
        pointer-events: none;
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    'silk-select-card': SilkSelectCard;
  }
}
