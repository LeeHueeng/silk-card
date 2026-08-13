import { LitElement, html, css, nothing, TemplateResult } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { HomeAssistant, HassEntity, LovelaceCardConfig } from '../types';
import { silkControlStyles } from '../shared/base';
import { isActive, isUnavailable, moreInfo } from '../shared/service';
import { accentFor } from '../shared/color';
import { registerEditor } from '../shared/editor';

export const META = {
  type: 'silk-window-advisor-card',
  name: 'Silk Window',
  description: 'Cooler outside? Then open up.',
};

export interface SilkWindowAdvisorCardConfig extends LovelaceCardConfig {
  /** Indoor temperature sensor. */
  indoor: string;
  /** Outdoor temperature sensor. */
  outdoor: string;
  /** Outdoor PM2.5 or AQI sensor; poor air overrides the temperature advice. */
  pm25?: string;
  /** Window/door contacts, YAML-only — summarised as an "N open" chip. */
  openings?: string[];
  name?: string;
  color?: string;
}

/**
 * `config` is absent from Silk's minimal HomeAssistant type; the unit system is
 * the fallback when a sensor carries no unit of its own.
 */
interface HassWithConfig extends HomeAssistant {
  config?: { unit_system?: { temperature?: string } };
}

type Verdict = 'open' | 'closed-warm' | 'closed-air' | 'neutral' | 'unknown';

/** Above this the outdoor air is not worth letting in (µg/m³, US AQI 101+). */
const POOR_PM25 = 35;
/** Same idea when the sensor reports an AQI index instead of a concentration. */
const POOR_AQI = 100;
/** Below this the two readings are the same for practical purposes. */
const SAME_DEG = 0.5;
/** Opening the windows only pays off once it is at least this much cooler. */
const WORTH_IT_DEG = 1;

const EDITOR_TAG = 'silk-window-advisor-card-editor';

// `openings` stays YAML-only: it is a list, and the three sensors are what
// actually change the verdict.
registerEditor(
  EDITOR_TAG,
  [
    {
      name: 'indoor',
      required: true,
      selector: { entity: { domain: ['sensor', 'climate'], device_class: ['temperature'] } },
    },
    {
      name: 'outdoor',
      required: true,
      selector: { entity: { domain: ['sensor'], device_class: ['temperature'] } },
    },
    { name: 'pm25', selector: { entity: { domain: ['sensor'] } } },
    { name: 'name', selector: { text: {} } },
  ],
  {
    indoor: 'Indoor temperature',
    outdoor: 'Outdoor temperature',
    pm25: 'Outdoor PM2.5 / AQI (optional)',
    name: 'Name',
  }
);

function readNumber(stateObj?: HassEntity): number | undefined {
  if (!stateObj || isUnavailable(stateObj) || stateObj.state === '') return undefined;
  const n = Number(stateObj.state);
  return Number.isFinite(n) ? n : undefined;
}

/** One decimal at most, and never a trailing `.0`. */
function trim1(value: number): string {
  return String(Math.round(value * 10) / 10);
}

/**
 * The "should I open the windows" card: two readings, the gap between them,
 * and a single sentence telling you what to do about it.
 */
@customElement('silk-window-advisor-card')
export class SilkWindowAdvisorCard extends LitElement {
  @property({ attribute: false }) public hass?: HomeAssistant;

  @state() private _config?: SilkWindowAdvisorCardConfig;

  public static getStubConfig(hass: HomeAssistant): Partial<SilkWindowAdvisorCardConfig> {
    const temps = Object.keys(hass.states).filter(
      (id) =>
        id.startsWith('sensor.') &&
        hass.states[id].attributes.device_class === 'temperature' &&
        Number.isFinite(Number(hass.states[id].state))
    );
    const looksOutdoor = (id: string): boolean =>
      /outdoor|outside|garden|balcon|terrace|weather/i.test(
        `${id} ${hass.states[id].attributes.friendly_name ?? ''}`
      );
    const outdoor = temps.find(looksOutdoor);
    const indoor = temps.find((id) => id !== outdoor);
    return {
      type: 'custom:silk-window-advisor-card',
      indoor: indoor ?? temps[0],
      outdoor: outdoor ?? temps[1] ?? temps[0],
    };
  }

  public static async getConfigElement(): Promise<HTMLElement> {
    return document.createElement(EDITOR_TAG);
  }

  public setConfig(config: SilkWindowAdvisorCardConfig): void {
    if (!config.indoor || typeof config.indoor !== 'string') {
      throw new Error('silk-window-advisor-card: `indoor` is required (a temperature entity)');
    }
    if (!config.outdoor || typeof config.outdoor !== 'string') {
      throw new Error('silk-window-advisor-card: `outdoor` is required (a temperature entity)');
    }
    if (config.openings !== undefined) {
      if (!Array.isArray(config.openings)) {
        throw new Error('silk-window-advisor-card: `openings` must be a list of entity ids');
      }
      for (const id of config.openings) {
        if (typeof id !== 'string' || !id.includes('.')) {
          throw new Error(`silk-window-advisor-card: \`${String(id)}\` is not an entity id`);
        }
      }
    }
    this._config = config;
  }

  public getCardSize(): number {
    return 2;
  }

  public getGridOptions(): Record<string, number> {
    return { columns: 6, rows: 2, min_columns: 4, min_rows: 2 };
  }

  /** A climate entity reports its room temperature as an attribute, not a state. */
  private _temperature(entityId: string): number | undefined {
    const stateObj = this.hass?.states[entityId];
    if (!stateObj || isUnavailable(stateObj)) return undefined;
    const attr = Number(stateObj.attributes.current_temperature);
    if (Number.isFinite(attr)) return attr;
    return readNumber(stateObj);
  }

  private _unit(stateObj?: HassEntity): string {
    return (
      (stateObj?.attributes.unit_of_measurement as string | undefined) ??
      (this.hass as HassWithConfig | undefined)?.config?.unit_system?.temperature ??
      '°'
    );
  }

  /** True when the optional air sensor says the outdoor air is not worth it. */
  private _airIsPoor(): boolean {
    const id = this._config?.pm25;
    if (!id) return false;
    const stateObj = this.hass?.states[id];
    const value = readNumber(stateObj);
    if (value === undefined) return false;
    const isIndex = stateObj?.attributes.device_class === 'aqi';
    return value > (isIndex ? POOR_AQI : POOR_PM25);
  }

  private _verdict(indoor?: number, outdoor?: number): { kind: Verdict; text: string } {
    if (indoor === undefined || outdoor === undefined) {
      return { kind: 'unknown', text: 'Waiting for readings' };
    }
    if (this._airIsPoor()) {
      return { kind: 'closed-air', text: 'Keep closed — outdoor air is poor' };
    }
    const cooler = indoor - outdoor;
    if (cooler >= WORTH_IT_DEG) {
      return { kind: 'open', text: `Open windows — ${trim1(cooler)}° cooler outside` };
    }
    if (cooler <= -SAME_DEG) {
      return { kind: 'closed-warm', text: 'Keep closed — outside is warmer' };
    }
    return { kind: 'neutral', text: 'No real difference outside' };
  }

  /** Open contacts among `openings`; null when none are configured. */
  private _openCount(): number | null {
    const ids = this._config?.openings;
    const hass = this.hass;
    if (!ids?.length || !hass) return null;
    let open = 0;
    for (const id of ids) {
      const stateObj = hass.states[id];
      if (stateObj && !isUnavailable(stateObj) && isActive(stateObj)) open++;
    }
    return open;
  }

  private _onCardClick(): void {
    if (this._config) moreInfo(this, this._config.outdoor);
  }

  private _onColumnClick(ev: Event, entityId: string): void {
    ev.stopPropagation();
    moreInfo(this, entityId);
  }

  private _renderColumn(
    entityId: string,
    label: string,
    value: number | undefined
  ): TemplateResult {
    const stateObj = this.hass?.states[entityId];
    const unit = this._unit(stateObj);
    return html`
      <button
        class="col ${value === undefined ? 'dead' : ''}"
        aria-label=${`${label}: ${value === undefined ? 'unavailable' : `${trim1(value)}${unit}`}`}
        @click=${(ev: Event) => this._onColumnClick(ev, entityId)}
      >
        <span class="temp"
          >${value === undefined ? '—' : trim1(value)}<span class="deg">${unit}</span></span
        >
        <span class="label">${label}</span>
      </button>
    `;
  }

  protected render(): TemplateResult | typeof nothing {
    const config = this._config;
    const hass = this.hass;
    if (!config) return nothing;
    if (hass && !hass.states[config.indoor]) {
      return html`<ha-card><div class="warning">Entity not found: ${config.indoor}</div></ha-card>`;
    }
    if (hass && !hass.states[config.outdoor]) {
      return html`<ha-card><div class="warning">Entity not found: ${config.outdoor}</div></ha-card>`;
    }

    const indoor = this._temperature(config.indoor);
    const outdoor = this._temperature(config.outdoor);
    const dead = indoor === undefined && outdoor === undefined;
    const verdict = this._verdict(indoor, outdoor);
    const delta = indoor !== undefined && outdoor !== undefined ? outdoor - indoor : undefined;
    // One accent for the card, taken from the outdoor sensor's domain; the
    // verdict dot is the only place that speaks in status colors.
    const accent = accentFor(hass?.states[config.outdoor], config.color);
    const name = config.name;
    const open = this._openCount();
    const arrow =
      delta === undefined
        ? 'mdi:minus'
        : delta <= -SAME_DEG
          ? 'mdi:arrow-down'
          : delta >= SAME_DEG
            ? 'mdi:arrow-up'
            : 'mdi:approximately-equal';

    return html`
      <ha-card
        class="control ${dead ? 'unavailable' : ''}"
        style="--silk-accent:${accent}"
        @click=${this._onCardClick}
      >
        ${name ? html`<div class="hname" title=${name}>${name}</div>` : nothing}
        <div class="compare">
          ${this._renderColumn(config.indoor, 'Inside', indoor)}
          <div
            class="gap"
            title=${delta === undefined
              ? 'No comparison yet'
              : `Outside is ${trim1(Math.abs(delta))}° ${delta < 0 ? 'cooler' : 'warmer'}`}
          >
            <ha-icon class="arrow" .icon=${arrow}></ha-icon>
            <span class="gapval">${delta === undefined ? '—' : `${trim1(Math.abs(delta))}°`}</span>
          </div>
          ${this._renderColumn(config.outdoor, 'Outside', outdoor)}
        </div>
        <div class="verdict">
          <span class="vdot ${verdict.kind}"></span>
          <span class="vtext" title=${verdict.text}>${verdict.text}</span>
          ${open !== null
            ? html`<span class="chip static" title="Configured windows and doors"
                >${open > 0 ? `${open} open` : 'All closed'}</span
              >`
            : nothing}
        </div>
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
        gap: 8px;
        padding: 12px 14px;
      }
      .hname {
        flex: none;
        font-size: 13px;
        font-weight: 600;
        line-height: 1.3;
        color: var(--secondary-text-color);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .compare {
        flex: none;
        display: flex;
        align-items: center;
        gap: 8px;
        min-width: 0;
      }
      .col {
        flex: 1 1 0;
        min-width: 0;
        display: flex;
        flex-direction: column;
        align-items: flex-start;
        gap: 1px;
        margin: 0;
        padding: 2px 4px;
        border: none;
        border-radius: 10px;
        background: none;
        font: inherit;
        color: inherit;
        text-align: left;
        cursor: pointer;
        outline: none;
        transition: background 150ms ease-out;
      }
      .col:last-of-type {
        align-items: flex-end;
        text-align: right;
      }
      .col:hover {
        background: rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.05);
      }
      .col:focus-visible {
        box-shadow: inset 0 0 0 2px color-mix(in srgb, var(--silk-accent) 70%, transparent);
      }
      .col.dead {
        opacity: 0.45;
      }
      .temp {
        font-size: 22px;
        font-weight: 600;
        letter-spacing: -0.02em;
        line-height: 1.1;
        color: var(--primary-text-color);
        font-variant-numeric: tabular-nums;
        white-space: nowrap;
      }
      .deg {
        font-size: 12px;
        font-weight: 500;
        margin-left: 2px;
        color: var(--secondary-text-color);
      }
      .label {
        font-size: 11px;
        line-height: 1.2;
        color: var(--secondary-text-color);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        max-width: 100%;
      }
      .gap {
        flex: none;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 1px;
        padding: 0 2px;
      }
      .arrow {
        --mdc-icon-size: 18px;
        color: var(--silk-accent);
        transition: color 200ms ease;
      }
      .gapval {
        font-size: 11px;
        line-height: 1;
        color: var(--secondary-text-color);
        font-variant-numeric: tabular-nums;
        white-space: nowrap;
      }
      .verdict {
        flex: none;
        display: flex;
        align-items: center;
        gap: 8px;
        min-width: 0;
      }
      .vdot {
        flex: none;
        width: 7px;
        height: 7px;
        border-radius: 50%;
        background: var(--secondary-text-color);
        opacity: 0.5;
        transition: background 200ms ease;
      }
      /* Status colors for a genuine status: the verdict itself. */
      .vdot.open {
        background: var(--success-color, #57ad60);
        opacity: 1;
      }
      .vdot.closed-warm {
        background: var(--warning-color, #e6a23c);
        opacity: 1;
      }
      .vdot.closed-air {
        background: var(--error-color, #db4437);
        opacity: 1;
      }
      .vtext {
        flex: 1;
        min-width: 0;
        font-size: 13px;
        font-weight: 500;
        line-height: 1.3;
        color: var(--primary-text-color);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      /* A read-only summary, not a control — it must not look pressable. */
      .chip.static {
        flex: none;
        cursor: default;
        white-space: nowrap;
      }
      .chip.static:hover {
        background: rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.06);
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    'silk-window-advisor-card': SilkWindowAdvisorCard;
  }
}
