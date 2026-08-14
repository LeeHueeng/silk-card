import { LitElement, html, css, nothing, TemplateResult } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { HomeAssistant, HassEntity, LovelaceCardConfig } from '../types';
import { silkControlStyles } from '../shared/base';
import { isActive, isUnavailable, moreInfo, haptic, stateText } from '../shared/service';
import { accentFor } from '../shared/color';
import { registerListEditor } from '../shared/listeditor';
import { entityListSelector } from '../shared/list';
import { formatNumber } from '../format';

export const META = {
  type: 'silk-heading-card',
  name: 'Silk Heading',
  description: 'A section title that can carry live chips.',
};

export interface SilkHeadingCardConfig extends LovelaceCardConfig {
  heading: string;
  icon?: string;
  /** Entity ids rendered as compact live readouts after the title. */
  chips?: string[];
  /** Navigation path; when set, tapping the heading navigates there. */
  action_path?: string;
}

const EDITOR_TAG = 'silk-heading-card-editor';

// Chips are a plain list of entity ids, so a multi picker says all there is to
// say; the merge keeps ids the picker cannot show untouched.
registerListEditor(EDITOR_TAG, {
  schema: [
    { name: 'heading', required: true, selector: { text: {} } },
    { name: 'icon', selector: { icon: {} } },
    entityListSelector('chips'),
    { name: 'action_path', selector: { text: {} } },
  ],
  labels: {
    heading: '제목',
    icon: '아이콘',
    chips: '칩 엔티티',
    action_path: '이동 경로',
  },
  listFields: ['chips'],
});

/** '°C'/'°F' → '°'; everything else trimmed and appended without a space. */
function condenseUnit(unit: string): string {
  const u = unit.trim();
  return u.startsWith('°') ? '°' : u;
}

@customElement('silk-heading-card')
export class SilkHeadingCard extends LitElement {
  @property({ attribute: false }) public hass?: HomeAssistant;

  @state() private _config?: SilkHeadingCardConfig;

  public static getStubConfig(): Partial<SilkHeadingCardConfig> {
    return { type: 'custom:silk-heading-card', heading: 'Living Room' };
  }

  public static async getConfigElement(): Promise<HTMLElement> {
    return document.createElement(EDITOR_TAG);
  }

  public setConfig(config: SilkHeadingCardConfig): void {
    if (!config.heading || typeof config.heading !== 'string') {
      throw new Error('silk-heading-card: `heading` is required');
    }
    if (config.chips !== undefined && !Array.isArray(config.chips)) {
      throw new Error('silk-heading-card: `chips` must be a list of entity ids');
    }
    this._config = config;
  }

  public getCardSize(): number {
    return 1;
  }

  public getGridOptions(): Record<string, number> {
    return { columns: 12, rows: 1, min_columns: 3, min_rows: 1 };
  }

  private _onCardClick(): void {
    const path = this._config?.action_path;
    if (!path) return;
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

  private _onChipClick(ev: Event, entityId: string): void {
    ev.stopPropagation();
    moreInfo(this, entityId);
  }

  /** Chip value text: numeric → condensed number+unit, else localized state. */
  private _valueText(stateObj: HassEntity): string {
    const raw = stateObj.state;
    const numeric = Number(raw);
    if (raw !== '' && Number.isFinite(numeric)) {
      const unit = stateObj.attributes.unit_of_measurement;
      const num = formatNumber(this.hass, stateObj.entity_id, numeric);
      return unit ? `${num}${condenseUnit(String(unit))}` : num;
    }
    return stateText(this.hass, stateObj);
  }

  /** Missing entities are skipped silently — a heading stays a heading. */
  private _renderChip(entityId: string): TemplateResult | typeof nothing {
    const hass = this.hass;
    const stateObj = hass?.states[entityId];
    if (!stateObj) return nothing;
    const unavailable = isUnavailable(stateObj);
    const active = !unavailable && isActive(stateObj);
    const accent = accentFor(stateObj);
    const value = this._valueText(stateObj);
    const name = stateObj.attributes.friendly_name ?? entityId;
    return html`
      <button
        class="chip ${active ? 'active' : ''} ${unavailable ? 'unavailable' : ''}"
        style="--silk-accent:${accent}"
        title=${name}
        aria-label=${`${name}: ${value}`}
        @click=${(ev: Event) => this._onChipClick(ev, entityId)}
      >
        ${value}
      </button>
    `;
  }

  protected render(): TemplateResult | typeof nothing {
    const config = this._config;
    if (!config) return nothing;
    const chips = config.chips ?? [];
    const nav = Boolean(config.action_path);
    return html`
      <ha-card class=${nav ? 'nav' : ''} @click=${this._onCardClick}>
        ${config.icon ? html`<ha-icon class="lead" .icon=${config.icon}></ha-icon>` : nothing}
        <div class="heading" title=${config.heading}>${config.heading}</div>
        <div class="trail">
          ${chips.map((id) => this._renderChip(id))}
          ${nav ? html`<ha-icon class="chev" .icon=${'mdi:chevron-right'}></ha-icon>` : nothing}
        </div>
      </ha-card>
    `;
  }

  static styles = [
    silkControlStyles,
    css`
      /* A heading floats on the view background, like a divider. */
      ha-card {
        background: none;
        border: none;
        box-shadow: none;
        border-radius: 0;
        padding: 4px 8px;
        gap: 8px;
        cursor: default;
      }
      ha-card.nav {
        cursor: pointer;
      }
      .lead {
        flex: none;
        color: var(--secondary-text-color);
        --mdc-icon-size: 18px;
      }
      .heading {
        flex: 0 1 auto;
        min-width: 0;
        font-size: 15px;
        font-weight: 600;
        letter-spacing: -0.01em;
        line-height: 1.3;
        color: var(--primary-text-color);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .trail {
        margin-left: auto;
        flex: 0 1 auto;
        min-width: 0;
        display: flex;
        align-items: center;
        justify-content: flex-end;
        gap: 6px;
        overflow: hidden;
      }
      .chip {
        flex: 0 1 auto;
        min-width: 0;
        position: relative;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        font-variant-numeric: tabular-nums;
        transition:
          transform 250ms var(--silk-spring),
          background 150ms ease-out,
          color 150ms ease-out;
      }
      /* Invisible halo lifts the touch target without fattening the row. */
      .chip::after {
        content: '';
        position: absolute;
        inset: -9px -2px;
        border-radius: 999px;
      }
      .chip:active {
        transform: scale(0.94);
        transition-duration: 120ms;
        transition-timing-function: var(--silk-ease-out);
      }
      .chip:focus-visible {
        outline: 2px solid color-mix(in srgb, var(--silk-accent) 70%, transparent);
        outline-offset: 1px;
      }
      .chip.unavailable {
        opacity: 0.45;
      }
      .chev {
        flex: none;
        color: var(--secondary-text-color);
        --mdc-icon-size: 18px;
        pointer-events: none;
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    'silk-heading-card': SilkHeadingCard;
  }
}
