import { LitElement, html, css, nothing, TemplateResult } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { HomeAssistant, HassEntity, LovelaceCardConfig } from '../types';
import { silkControlStyles } from '../shared/base';
import { isActive, isUnavailable, moreInfo, haptic, stateText, clamp } from '../shared/service';
import { accentFor } from '../shared/color';
import { registerEditor } from '../shared/editor';

export const META = {
  type: 'silk-progress-card',
  name: 'Silk Progress',
  description: 'Any percentage, with an honest ETA.',
};

export interface SilkProgressCardConfig extends LovelaceCardConfig {
  entity: string;
  name?: string;
  icon?: string;
  color?: string;
  /** Sensor whose numeric state is time remaining; its unit decides the format. */
  remaining?: string;
}

const EDITOR_TAG = 'silk-progress-card-editor';

registerEditor(
  EDITOR_TAG,
  [
    {
      name: 'entity',
      required: true,
      selector: { entity: { domain: ['sensor', 'number', 'input_number'] } },
    },
    { name: 'name', selector: { text: {} } },
    { name: 'icon', selector: { icon: {} } },
    { name: 'remaining', selector: { entity: { domain: ['sensor'] } } },
  ],
  { entity: 'Entity', name: 'Name', icon: 'Icon', remaining: 'Time-remaining entity' }
);

const HOUR_UNITS = new Set(['h', 'hr', 'hrs', 'hour', 'hours']);
const MINUTE_UNITS = new Set(['min', 'mins', 'minute', 'minutes']);
const SECOND_UNITS = new Set(['s', 'sec', 'secs', 'second', 'seconds']);

function hoursMinutes(totalMinutes: number): string {
  const t = Math.max(0, totalMinutes);
  const h = Math.floor(t / 60);
  const m = t % 60;
  return h > 0 ? `${h}h ${m}m left` : `${m}m left`;
}

/** '4h 59m left' / '59m left' / '4:32 left', by the sensor's unit; unit-suffix fallback. */
function formatRemaining(value: number, unit: string): string {
  const u = unit.trim().toLowerCase();
  if (HOUR_UNITS.has(u)) return hoursMinutes(Math.round(value * 60));
  if (MINUTE_UNITS.has(u)) return hoursMinutes(Math.round(value));
  if (SECOND_UNITS.has(u)) {
    const s = Math.max(0, Math.round(value));
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')} left`;
  }
  const n = Math.round(value * 10) / 10;
  return unit ? `${n} ${unit} left` : `${n} left`;
}

/**
 * Generic progress row for any 0–100 sensor (print jobs, downloads, backups).
 * Big trailing percentage, a 4px accent bar riding the card's bottom edge, and
 * an optional companion time-remaining sensor folded into the state line.
 * Done (>= 100) flips the whole card's accent to the theme success color.
 */
@customElement('silk-progress-card')
export class SilkProgressCard extends LitElement {
  @property({ attribute: false }) public hass?: HomeAssistant;

  @state() private _config?: SilkProgressCardConfig;

  public static getStubConfig(hass: HomeAssistant): Partial<SilkProgressCardConfig> {
    const entity = Object.keys(hass.states).find((id) => {
      if (!id.startsWith('sensor.')) return false;
      const s = hass.states[id];
      return (
        s.attributes.unit_of_measurement === '%' &&
        s.attributes.device_class !== 'battery' &&
        Number.isFinite(Number(s.state))
      );
    });
    return { type: 'custom:silk-progress-card', entity };
  }

  public static async getConfigElement(): Promise<HTMLElement> {
    return document.createElement(EDITOR_TAG);
  }

  public setConfig(config: SilkProgressCardConfig): void {
    if (!config.entity) {
      throw new Error('silk-progress-card: `entity` is required');
    }
    this._config = config;
  }

  public getCardSize(): number {
    return 1;
  }

  public getGridOptions(): Record<string, number> {
    return { columns: 6, rows: 1, min_columns: 4, min_rows: 1 };
  }

  /** State line ETA from the companion sensor, or undefined when it can't speak. */
  private _remainingText(): string | undefined {
    const id = this._config?.remaining;
    if (!id || !this.hass) return undefined;
    const obj: HassEntity | undefined = this.hass.states[id];
    if (!obj || isUnavailable(obj)) return undefined;
    const value = Number(obj.state);
    if (obj.state === '' || !Number.isFinite(value)) return undefined;
    return formatRemaining(value, String(obj.attributes.unit_of_measurement ?? ''));
  }

  private _onTap(): void {
    if (!this._config) return;
    haptic(this);
    moreInfo(this, this._config.entity);
  }

  protected render(): TemplateResult | typeof nothing {
    const config = this._config;
    const hass = this.hass;
    if (!config || !hass) return nothing;
    const stateObj = hass.states[config.entity];
    if (!stateObj) {
      return html`
        <ha-card class="control">
          <div class="warning">Entity not found: ${config.entity}</div>
        </ha-card>
      `;
    }

    const unavailable = isUnavailable(stateObj);
    const numeric = Number(stateObj.state);
    const hasValue = !unavailable && stateObj.state !== '' && Number.isFinite(numeric);
    const pct = hasValue ? clamp(numeric, 0, 100) : 0;
    const done = hasValue && numeric >= 100;
    // Done overrides the accent locally — completion reads as success everywhere.
    const accent = done ? 'var(--success-color, #43a047)' : accentFor(stateObj, config.color);
    const name = config.name ?? stateObj.attributes.friendly_name ?? config.entity;

    const remaining = !unavailable && !done ? this._remainingText() : undefined;
    const stateLine = unavailable
      ? html`${stateText(hass, stateObj)}`
      : !hasValue
        ? html`—`
        : done
          ? html`Done`
          : remaining
            ? html`In progress<span class="sep">·</span>${remaining}`
            : html`In progress`;

    return html`
      <ha-card
        class="control ${unavailable ? 'unavailable' : ''}"
        style="--silk-accent:${accent}"
        @click=${this._onTap}
      >
        <div class="icon ${!unavailable && isActive(stateObj) ? 'on' : ''}">
          ${config.icon
            ? html`<ha-icon .icon=${config.icon}></ha-icon>`
            : html`<ha-state-icon .hass=${hass} .stateObj=${stateObj}></ha-state-icon>`}
        </div>
        <div class="info">
          <div class="name">${name}</div>
          <div class="state">${stateLine}</div>
        </div>
        <div class="trailing">
          <span class="value">${hasValue ? `${Math.round(pct)}%` : '—'}</span>
        </div>
        <div class="track" aria-hidden="true">
          <div class="bar" style="width:${pct.toFixed(2)}%"></div>
        </div>
      </ha-card>
    `;
  }

  static styles = [
    silkControlStyles,
    css`
      /* Display card: the whole card presses as one and opens more-info. */
      ha-card {
        transition: transform 250ms var(--silk-spring);
      }
      ha-card:active {
        transform: scale(0.97);
        transition-duration: 120ms;
        transition-timing-function: var(--silk-ease-out);
      }
      /* No lone control action, so the icon presses with the card, not alone. */
      .icon:active {
        transform: none;
      }
      /* Progress bar riding the card's bottom edge. */
      .track {
        position: absolute;
        left: 0;
        right: 0;
        bottom: 0;
        height: 4px;
        background: rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.07);
        pointer-events: none;
        z-index: 0;
      }
      .bar {
        position: absolute;
        inset: 0 auto 0 0;
        background: var(--silk-accent);
        transition:
          width 400ms var(--silk-ease-out),
          background 200ms ease;
      }
      .unavailable .track {
        opacity: 0.45;
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    'silk-progress-card': SilkProgressCard;
  }
}
