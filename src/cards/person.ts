import { LitElement, html, css, nothing, TemplateResult } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { HomeAssistant, HassEntity, LovelaceCardConfig } from '../types';
import { silkControlStyles } from '../shared/base';
import { domainOf, isActive, isUnavailable, moreInfo, stateText } from '../shared/service';
import { accentFor } from '../shared/color';
import { registerEditor } from '../shared/editor';
import { formatNumber } from '../format';

export const META = {
  type: 'silk-person-card',
  name: 'Silk Person',
  description: "Who's home, at a glance.",
};

export interface SilkPersonCardConfig extends LovelaceCardConfig {
  entity: string;
  name?: string;
  /** Optional battery sensor appended to the state line as `· 60%`. */
  battery?: string;
}

const BATTERY_LOW_PCT = 20;

const EDITOR_TAG = 'silk-person-card-editor';

registerEditor(
  EDITOR_TAG,
  [
    {
      name: 'entity',
      required: true,
      selector: { entity: { domain: ['person', 'device_tracker'] } },
    },
    { name: 'name', selector: { text: {} } },
    { name: 'battery', selector: { entity: { domain: ['sensor'], device_class: 'battery' } } },
  ],
  {
    entity: 'Entity',
    name: 'Name',
    battery: 'Battery sensor',
  }
);

@customElement('silk-person-card')
export class SilkPersonCard extends LitElement {
  @property({ attribute: false }) public hass?: HomeAssistant;

  @state() private _config?: SilkPersonCardConfig;

  /** entity_picture URL that failed to load → fall back to the initial. */
  @state() private _brokenPicture?: string;

  public static getStubConfig(hass: HomeAssistant): Partial<SilkPersonCardConfig> {
    const ids = Object.keys(hass.states);
    const entity =
      ids.find((id) => id.startsWith('person.')) ??
      ids.find((id) => id.startsWith('device_tracker.'));
    return { type: 'custom:silk-person-card', entity };
  }

  public static async getConfigElement(): Promise<HTMLElement> {
    return document.createElement(EDITOR_TAG);
  }

  public setConfig(config: SilkPersonCardConfig): void {
    const domain = config.entity ? domainOf(config.entity) : '';
    if (!config.entity || (domain !== 'person' && domain !== 'device_tracker')) {
      throw new Error(
        'silk-person-card: define a person or device_tracker `entity` (e.g. person.jamie)'
      );
    }
    this._config = config;
    this._brokenPicture = undefined;
  }

  public getCardSize(): number {
    return 1;
  }

  public getGridOptions(): Record<string, number> {
    return { columns: 6, rows: 1, min_columns: 3, min_rows: 1 };
  }

  /** 'Home' / 'Away' / zone name — localized when hass provides a formatter. */
  private _presence(hass: HomeAssistant, stateObj: HassEntity): string {
    if (hass.formatEntityState) return stateText(hass, stateObj);
    switch (stateObj.state) {
      case 'home':
        return 'Home';
      case 'not_home':
        return 'Away';
      default:
        return stateObj.state.replace(/_/g, ' ');
    }
  }

  private _battery(): { text: string; low: boolean } | null {
    const id = this._config?.battery;
    const hass = this.hass;
    if (!id || !hass) return null;
    const batteryObj = hass.states[id];
    if (!batteryObj || isUnavailable(batteryObj)) return null;
    const value = Number(batteryObj.state);
    if (!Number.isFinite(value)) return null;
    return { text: `${formatNumber(hass, id, value)}%`, low: value < BATTERY_LOW_PCT };
  }

  private _onCardClick(): void {
    if (this._config) moreInfo(this, this._config.entity);
  }

  private _onImgError(): void {
    const stateObj = this._config && this.hass?.states[this._config.entity];
    const picture = stateObj?.attributes.entity_picture;
    if (typeof picture === 'string') this._brokenPicture = picture;
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
    const home = !unavailable && isActive(stateObj);
    const accent = accentFor(stateObj);
    const name: string = config.name ?? stateObj.attributes.friendly_name ?? config.entity;
    const rawPicture = stateObj.attributes.entity_picture;
    const picture =
      typeof rawPicture === 'string' && rawPicture && rawPicture !== this._brokenPicture
        ? rawPicture
        : undefined;
    const initial = (Array.from(name.trim())[0] ?? '?').toUpperCase();
    const battery = this._battery();

    return html`
      <ha-card
        class="control ${unavailable ? 'unavailable' : ''}"
        style="--silk-accent:${accent}"
        @click=${this._onCardClick}
      >
        <div class="avatar ${home ? 'home' : 'away'}">
          ${picture
            ? html`<img src=${picture} alt=${name} loading="lazy" @error=${this._onImgError} />`
            : html`<span class="initial">${initial}</span>`}
        </div>
        <div class="info">
          <div class="name">${name}</div>
          <div class="state">
            ${this._presence(hass, stateObj)}${battery
              ? html`<span class="sep">·</span><span class="battery ${battery.low ? 'low' : ''}"
                  >${battery.text}</span
                >`
              : nothing}
          </div>
        </div>
      </ha-card>
    `;
  }

  static styles = [
    silkControlStyles,
    css`
      .avatar {
        flex: none;
        width: 42px;
        height: 42px;
        border-radius: 50%;
        overflow: hidden;
        display: grid;
        place-items: center;
        position: relative;
        z-index: 1;
        background: rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.06);
        color: var(--secondary-text-color);
        user-select: none;
        transition:
          background 200ms ease,
          color 200ms ease;
      }
      .avatar.home {
        background: color-mix(in srgb, var(--silk-accent) 20%, transparent);
        color: var(--silk-accent);
      }
      .initial {
        font-size: 18px;
        font-weight: 600;
        line-height: 1;
      }
      .avatar img {
        width: 100%;
        height: 100%;
        object-fit: cover;
        display: block;
        transition: opacity 200ms ease;
      }
      /* Away reads as absence: the portrait goes monochrome, no color needed. */
      .avatar.away img {
        filter: grayscale(1);
        opacity: 0.7;
      }
      .unavailable .avatar {
        opacity: 0.45;
      }
      .battery.low {
        color: var(--error-color, #db4437);
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    'silk-person-card': SilkPersonCard;
  }
}
