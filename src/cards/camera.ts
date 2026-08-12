import { LitElement, html, css, nothing, TemplateResult } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { HomeAssistant, LovelaceCardConfig } from '../types';
import { silkControlStyles } from '../shared/base';
import { domainOf, isUnavailable, moreInfo, stateText } from '../shared/service';
import { accentFor } from '../shared/color';
import { registerEditor } from '../shared/editor';

export const META = {
  type: 'silk-camera-card',
  name: 'Silk Camera',
  description: 'A live view that stays fresh.',
};

const DEFAULT_REFRESH_S = 10;

export interface SilkCameraCardConfig extends LovelaceCardConfig {
  entity: string;
  name?: string;
  /** Snapshot refresh cadence in seconds (default 10). */
  refresh_interval?: number;
}

const EDITOR_TAG = 'silk-camera-card-editor';

registerEditor(
  EDITOR_TAG,
  [
    { name: 'entity', required: true, selector: { entity: { domain: ['camera'] } } },
    { name: 'name', selector: { text: {} } },
    { name: 'refresh_interval', selector: { number: { min: 1, mode: 'box' } } },
  ],
  {
    entity: 'Entity',
    name: 'Name',
    refresh_interval: 'Refresh interval (seconds)',
  },
  { refresh_interval: DEFAULT_REFRESH_S }
);

@customElement('silk-camera-card')
export class SilkCameraCard extends LitElement {
  @property({ attribute: false }) public hass?: HomeAssistant;

  @state() private _config?: SilkCameraCardConfig;

  /** Cache-busting counter appended to the snapshot URL each refresh tick. */
  @state() private _counter = 0;

  /** True after the current snapshot URL failed to load; retried on the next tick. */
  @state() private _broken = false;

  private _timer?: number;

  /** Paused while the tab is hidden; refreshed immediately on return. */
  private readonly _onVisibility = (): void => {
    if (document.hidden) {
      this._stopTimer();
    } else {
      this._bump();
      this._startTimer();
    }
  };

  public static getStubConfig(hass: HomeAssistant): Partial<SilkCameraCardConfig> {
    const entity = Object.keys(hass.states).find((id) => id.startsWith('camera.'));
    return { type: 'custom:silk-camera-card', entity };
  }

  public static async getConfigElement(): Promise<HTMLElement> {
    return document.createElement(EDITOR_TAG);
  }

  public setConfig(config: SilkCameraCardConfig): void {
    if (!config.entity || domainOf(config.entity) !== 'camera') {
      throw new Error('silk-camera-card: define a camera `entity` (e.g. camera.front_door)');
    }
    if (
      config.refresh_interval !== undefined &&
      (typeof config.refresh_interval !== 'number' || !(config.refresh_interval > 0))
    ) {
      throw new Error('silk-camera-card: `refresh_interval` must be a positive number of seconds');
    }
    this._config = config;
    if (this.isConnected) this._startTimer();
  }

  public getCardSize(): number {
    return 3;
  }

  public getGridOptions(): Record<string, number> {
    return { columns: 6, rows: 3, min_columns: 4, min_rows: 2 };
  }

  public connectedCallback(): void {
    super.connectedCallback();
    document.addEventListener('visibilitychange', this._onVisibility);
    this._startTimer();
  }

  public disconnectedCallback(): void {
    super.disconnectedCallback();
    document.removeEventListener('visibilitychange', this._onVisibility);
    this._stopTimer();
  }

  private _intervalMs(): number {
    return Math.max(1, this._config?.refresh_interval ?? DEFAULT_REFRESH_S) * 1000;
  }

  private _bump(): void {
    this._counter++;
    this._broken = false;
  }

  private _startTimer(): void {
    this._stopTimer();
    if (document.hidden) return; // the visibility listener resumes us
    this._timer = window.setInterval(() => this._bump(), this._intervalMs());
  }

  private _stopTimer(): void {
    window.clearInterval(this._timer);
    this._timer = undefined;
  }

  private _onCardClick(): void {
    if (this._config) moreInfo(this, this._config.entity);
  }

  private _onImgError(): void {
    this._broken = true;
  }

  protected render(): TemplateResult | typeof nothing {
    if (!this.hass || !this._config) return nothing;
    const stateObj = this.hass.states[this._config.entity];
    if (!stateObj) {
      return html`<ha-card><div class="warning">Entity not found: ${this._config.entity}</div></ha-card>`;
    }

    const unavailable = isUnavailable(stateObj);
    const rawPicture = stateObj.attributes.entity_picture;
    const picture =
      !unavailable && typeof rawPicture === 'string' && rawPicture !== '' ? rawPicture : undefined;
    const name = this._config.name ?? stateObj.attributes.friendly_name ?? stateObj.entity_id;
    const accent = accentFor(stateObj);
    // entity_picture already carries its auth token query string, so the
    // cache-buster normally joins with `&` (`?` covers a bare URL just in case).
    const src =
      picture !== undefined
        ? `${picture}${picture.includes('?') ? '&' : '?'}counter=${this._counter}`
        : undefined;
    const showFeed = src !== undefined && !this._broken;

    return html`
      <ha-card
        class=${unavailable ? 'unavailable' : ''}
        style="--silk-accent:${accent}"
        aria-label=${`Show ${name} live view`}
        @click=${this._onCardClick}
      >
        ${showFeed
          ? html`
              <img class="feed" src=${src} alt=${name} @error=${this._onImgError} />
              <div class="scrim">
                <div class="cam-name">${name}</div>
                <div class="cam-state">${stateText(this.hass, stateObj)}</div>
              </div>
            `
          : html`
              <div class="fallback">
                <ha-icon icon="mdi:video-off"></ha-icon>
                <div class="fallback-name">${name}</div>
                <div class="fallback-state">Unavailable</div>
              </div>
            `}
      </ha-card>
    `;
  }

  static styles = [
    silkControlStyles,
    css`
      /* Full-bleed image card: drop the base row layout and padding. The
         aspect-ratio only applies where the layout gives no definite height
         (masonry); in grid sections the assigned rows win. */
      ha-card {
        display: block;
        padding: 0;
        aspect-ratio: 16 / 9;
      }
      .feed {
        position: absolute;
        inset: 0;
        width: 100%;
        height: 100%;
        object-fit: cover;
      }
      /* Photo-legibility scrim (allowed: it serves the image, not chrome). */
      .scrim {
        position: absolute;
        left: 0;
        right: 0;
        bottom: 0;
        padding: 28px 12px 10px;
        background: linear-gradient(transparent, rgba(0, 0, 0, 0.55));
        pointer-events: none;
      }
      .cam-name {
        color: #fff;
        font-size: 13px;
        font-weight: 500;
        line-height: 1.3;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .cam-state {
        color: rgba(255, 255, 255, 0.78);
        font-size: 11.5px;
        line-height: 1.3;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        font-variant-numeric: tabular-nums;
      }
      .fallback {
        position: absolute;
        inset: 0;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 2px;
        padding: 12px;
        box-sizing: border-box;
        background: rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.04);
        color: var(--secondary-text-color);
        transition: opacity 200ms ease;
      }
      .fallback ha-icon {
        --mdc-icon-size: 28px;
        margin-bottom: 4px;
      }
      .fallback-name {
        font-size: 13px;
        font-weight: 500;
        line-height: 1.3;
        color: var(--primary-text-color);
        max-width: 100%;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .fallback-state {
        font-size: 11.5px;
        line-height: 1.3;
      }
      .unavailable .fallback {
        opacity: 0.45;
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    'silk-camera-card': SilkCameraCard;
  }
}
