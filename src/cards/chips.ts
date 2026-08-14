import { LitElement, html, css, nothing, TemplateResult } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { HomeAssistant, HassEntity, LovelaceCardConfig } from '../types';
import { silkControlStyles } from '../shared/base';
import { isActive, isUnavailable, moreInfo, haptic, stateText } from '../shared/service';
import { accentFor } from '../shared/color';
import { EntityItem, entityListSelector, normalizeEntityList } from '../shared/list';
import { registerListEditor } from '../shared/listeditor';
import { formatNumber } from '../format';

export const META = {
  type: 'silk-chips-card',
  name: 'Silk Chips',
  description: 'A dense strip of glanceable pills.',
};

/** A chip: a bare entity id from the picker, or YAML with per-chip detail. */
export type ChipUserConfig = string | EntityItem;

export interface SilkChipsCardConfig extends LovelaceCardConfig {
  chips: ChipUserConfig[];
  alignment?: 'start' | 'center';
}

type ChipConfig = EntityItem;

const EDITOR_TAG = 'silk-chips-card-editor';

const EDITOR_LABELS: Record<string, string> = {
  chips: '칩 엔티티',
  alignment: '정렬',
};

/**
 * One editor, chip picker always present. The picker answers with bare ids and
 * they are folded back into the stored list, so a chip that survives the edit
 * keeps its name, icon and color; keys the schema never mentions (`type`,
 * `grid_options`, per-chip detail) ride through untouched.
 */
const EDITOR_SCHEMA: object[] = [
  entityListSelector('chips'),
  {
    name: 'alignment',
    selector: {
      select: {
        mode: 'dropdown',
        options: [
          { value: 'start', label: '왼쪽' },
          { value: 'center', label: '가운데' },
        ],
      },
    },
  },
];

registerListEditor(EDITOR_TAG, {
  schema: EDITOR_SCHEMA,
  labels: EDITOR_LABELS,
  defaults: { alignment: 'start' },
  listFields: ['chips'],
});

/** '°C'/'°F' → '°'; everything else trimmed and appended without a space. */
function condenseUnit(unit: string): string {
  const u = unit.trim();
  return u.startsWith('°') ? '°' : u;
}

@customElement('silk-chips-card')
export class SilkChipsCard extends LitElement {
  @property({ attribute: false }) public hass?: HomeAssistant;

  @state() private _config?: SilkChipsCardConfig;

  private _chips: ChipConfig[] = [];

  public static getStubConfig(hass: HomeAssistant): Partial<SilkChipsCardConfig> {
    const chips = Object.keys(hass.states)
      .filter((id) => id.startsWith('sensor.'))
      .slice(0, 3);
    return { type: 'custom:silk-chips-card', chips };
  }

  public static async getConfigElement(): Promise<HTMLElement> {
    return document.createElement(EDITOR_TAG);
  }

  public setConfig(config: SilkChipsCardConfig): void {
    if (!Array.isArray(config.chips) || config.chips.length === 0) {
      throw new Error('silk-chips-card: `chips` must be a non-empty list');
    }
    // Both shapes are legal — 'sensor.a' from the picker, {entity, name?, …}
    // from YAML — but an entry without a usable entity id is still an error.
    const bad = config.chips.findIndex((chip) => {
      const entity = typeof chip === 'string' ? chip : chip?.entity;
      return typeof entity !== 'string' || !entity.includes('.');
    });
    if (bad !== -1) {
      throw new Error(`silk-chips-card: chips[${bad}] needs an \`entity\` (e.g. sensor.porch)`);
    }
    this._chips = normalizeEntityList(config.chips);
    this._config = config;
  }

  public getCardSize(): number {
    return 1;
  }

  public getGridOptions(): Record<string, number> {
    return { columns: 12, rows: 1, min_columns: 6, min_rows: 1 };
  }

  private _onChipClick(ev: Event, entityId: string): void {
    ev.stopPropagation();
    haptic(this);
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

  private _renderChip(chip: ChipConfig): TemplateResult {
    const hass = this.hass;
    const stateObj = hass?.states[chip.entity];
    if (!stateObj) {
      return html`
        <button
          class="pill unavailable"
          aria-label=${chip.entity}
          @click=${(ev: Event) => this._onChipClick(ev, chip.entity)}
        >
          <ha-icon .icon=${chip.icon ?? 'mdi:help-circle-outline'}></ha-icon>
          <span class="label"><span class="val">${chip.name ?? chip.entity}</span></span>
        </button>
      `;
    }

    const unavailable = isUnavailable(stateObj);
    const active = !unavailable && isActive(stateObj);
    const accent = accentFor(stateObj, chip.color);
    const value = unavailable ? stateText(hass, stateObj) : this._valueText(stateObj);
    const ariaName = chip.name ?? stateObj.attributes.friendly_name ?? chip.entity;

    return html`
      <button
        class="pill ${active ? 'active' : ''} ${unavailable ? 'unavailable' : ''}"
        style="--silk-accent:${accent}"
        aria-label=${`${ariaName}: ${value}`}
        @click=${(ev: Event) => this._onChipClick(ev, chip.entity)}
      >
        ${chip.icon
          ? html`<ha-icon .icon=${chip.icon}></ha-icon>`
          : html`<ha-state-icon .hass=${hass} .stateObj=${stateObj}></ha-state-icon>`}
        <span class="label">
          ${chip.name ? html`<span class="cname">${chip.name}</span>` : nothing}
          <span class="val">${value}</span>
        </span>
      </button>
    `;
  }

  protected render(): TemplateResult | typeof nothing {
    const config = this._config;
    if (!config || !this.hass) return nothing;
    return html`
      <ha-card class=${config.alignment === 'center' ? 'align-center' : ''}>
        ${this._chips.map((chip) => this._renderChip(chip))}
      </ha-card>
    `;
  }

  static styles = [
    silkControlStyles,
    css`
      ha-card {
        flex-wrap: wrap;
        gap: 8px;
        padding: 10px 12px;
        cursor: default;
        justify-content: flex-start;
        align-content: center;
      }
      ha-card.align-center {
        justify-content: center;
      }
      .pill {
        flex: none;
        display: inline-flex;
        align-items: center;
        gap: 6px;
        height: 28px;
        max-width: 100%;
        padding: 0 10px;
        border: none;
        border-radius: 999px;
        cursor: pointer;
        font: inherit;
        font-size: 12px;
        font-weight: 500;
        line-height: 1;
        position: relative;
        color: var(--secondary-text-color);
        background: rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.06);
        transition:
          transform 250ms var(--silk-spring),
          background 200ms ease,
          color 200ms ease;
      }
      /* Invisible halo lifts the touch target toward 40px without fattening the strip. */
      .pill::after {
        content: '';
        position: absolute;
        inset: -6px -2px;
        border-radius: 999px;
      }
      .pill:hover {
        background: rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.1);
      }
      .pill:active {
        transform: scale(0.94);
        transition-duration: 120ms;
        transition-timing-function: var(--silk-ease-out);
      }
      .pill:focus-visible {
        outline: 2px solid color-mix(in srgb, var(--silk-accent) 70%, transparent);
        outline-offset: 1px;
      }
      .pill.active {
        color: var(--silk-accent);
        background: color-mix(in srgb, var(--silk-accent) 16%, transparent);
      }
      .pill.unavailable {
        opacity: 0.45;
        cursor: pointer;
      }
      .pill ha-state-icon,
      .pill ha-icon {
        --mdc-icon-size: 16px;
        flex: none;
        pointer-events: none;
      }
      .label {
        display: inline-flex;
        align-items: baseline;
        gap: 4px;
        min-width: 0;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .cname {
        color: var(--secondary-text-color);
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .pill.active .cname {
        color: color-mix(in srgb, var(--silk-accent) 70%, var(--primary-text-color));
      }
      .val {
        color: var(--primary-text-color);
        font-weight: 600;
        font-variant-numeric: tabular-nums;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .pill.active .val {
        color: var(--silk-accent);
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    'silk-chips-card': SilkChipsCard;
  }
}
