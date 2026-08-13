import { LitElement, html, css, nothing, TemplateResult } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { HomeAssistant, HassEntity, LovelaceCardConfig } from '../types';
import { silkControlStyles } from '../shared/base';
import { isUnavailable, moreInfo, stateText } from '../shared/service';
import { accentFor } from '../shared/color';
import { registerEditor } from '../shared/editor';

export const META = {
  type: 'silk-camera-grid-card',
  name: 'Silk Cameras',
  description: 'Every angle, one screen.',
};

export interface SilkCameraGridCardConfig extends LovelaceCardConfig {
  /** 2–9 camera entities, laid out as a responsive wall. */
  cameras: string[];
  /** Seconds between refreshes of any one tile (default 10). */
  refresh_interval?: number;
  /** Optional header; omit it and the wall runs edge to edge. */
  name?: string;
}

const DEFAULT_REFRESH_S = 10;
const MIN_CAMERAS = 2;
const MAX_CAMERAS = 9;
/** Never hammer the proxy faster than this, however many tiles there are. */
const MIN_STEP_MS = 250;

const EDITOR_TAG = 'silk-camera-grid-card-editor';

registerEditor(
  EDITOR_TAG,
  [
    {
      name: 'cameras',
      required: true,
      selector: { entity: { multiple: true, domain: ['camera'] } },
    },
    { name: 'name', selector: { text: {} } },
    { name: 'refresh_interval', selector: { number: { min: 1, mode: 'box' } } },
  ],
  {
    cameras: 'Cameras (2–9)',
    name: 'Name',
    refresh_interval: 'Refresh interval (seconds)',
  },
  { refresh_interval: DEFAULT_REFRESH_S }
);

/**
 * A wall of still frames, each one refreshed on its own beat so nine cameras
 * never stampede the proxy at the same instant. Tapping a tile opens HA's own
 * live view, which is the only place a real stream belongs.
 */
@customElement('silk-camera-grid-card')
export class SilkCameraGridCard extends LitElement {
  @property({ attribute: false }) public hass?: HomeAssistant;

  @state() private _config?: SilkCameraGridCardConfig;

  /** Per-tile cache-busting counters; only one moves per tick. */
  @state() private _counters: number[] = [];

  /** Per-tile "this URL failed to load"; cleared when the tile next refreshes. */
  @state() private _broken: boolean[] = [];

  /** Round-robin cursor into the tile list. */
  private _next = 0;
  private _timer?: number;

  /** Paused while the tab is hidden; everything refreshes once on return. */
  private readonly _onVisibility = (): void => {
    if (document.hidden) {
      this._stopTimer();
    } else {
      this._bumpAll();
      this._startTimer();
    }
  };

  public static getStubConfig(hass: HomeAssistant): Partial<SilkCameraGridCardConfig> {
    const cameras = Object.keys(hass.states)
      .filter((id) => id.startsWith('camera.'))
      .slice(0, 4);
    return { type: 'custom:silk-camera-grid-card', cameras };
  }

  public static async getConfigElement(): Promise<HTMLElement> {
    return document.createElement(EDITOR_TAG);
  }

  public setConfig(config: SilkCameraGridCardConfig): void {
    if (!Array.isArray(config.cameras)) {
      throw new Error('silk-camera-grid-card: `cameras` must be a list of camera entity ids');
    }
    if (config.cameras.length < MIN_CAMERAS || config.cameras.length > MAX_CAMERAS) {
      throw new Error(
        `silk-camera-grid-card: list between ${MIN_CAMERAS} and ${MAX_CAMERAS} cameras (got ${config.cameras.length})`
      );
    }
    if (config.cameras.some((id) => typeof id !== 'string' || id === '')) {
      throw new Error('silk-camera-grid-card: every entry in `cameras` must be an entity id');
    }
    if (
      config.refresh_interval !== undefined &&
      (typeof config.refresh_interval !== 'number' || !(config.refresh_interval > 0))
    ) {
      throw new Error(
        'silk-camera-grid-card: `refresh_interval` must be a positive number of seconds'
      );
    }
    this._config = config;
    this._counters = config.cameras.map(() => 0);
    this._broken = config.cameras.map(() => false);
    this._next = 0;
    if (this.isConnected) this._startTimer();
  }

  public getCardSize(): number {
    return 4;
  }

  public getGridOptions(): Record<string, number> {
    return { columns: 6, rows: 4, min_columns: 4, min_rows: 3 };
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

  /** One tile's share of the refresh window — the stagger, in one number. */
  private _stepMs(): number {
    const count = this._config?.cameras.length ?? 1;
    const interval = Math.max(1, this._config?.refresh_interval ?? DEFAULT_REFRESH_S) * 1000;
    return Math.max(MIN_STEP_MS, Math.round(interval / count));
  }

  private _startTimer(): void {
    this._stopTimer();
    if (document.hidden || !this._config) return; // the visibility listener resumes us
    this._timer = window.setInterval(() => this._bumpNext(), this._stepMs());
  }

  private _stopTimer(): void {
    window.clearInterval(this._timer);
    this._timer = undefined;
  }

  private _bumpNext(): void {
    const count = this._counters.length;
    if (!count) return;
    const i = this._next % count;
    this._next = (i + 1) % count;
    const counters = this._counters.slice();
    counters[i]++;
    this._counters = counters;
    if (this._broken[i]) {
      const broken = this._broken.slice();
      broken[i] = false; // give the retried URL a fair chance
      this._broken = broken;
    }
  }

  private _bumpAll(): void {
    if (!this._counters.length) return;
    this._counters = this._counters.map((n) => n + 1);
    this._broken = this._broken.map(() => false);
  }

  private _onImgError(index: number): void {
    if (this._broken[index]) return;
    const broken = this._broken.slice();
    broken[index] = true;
    this._broken = broken;
  }

  private _onTileClick(ev: Event, entityId: string): void {
    ev.stopPropagation();
    moreInfo(this, entityId);
  }

  private _renderTile(entityId: string, index: number): TemplateResult {
    const hass = this.hass!;
    const stateObj: HassEntity | undefined = hass.states[entityId];
    const name = (stateObj?.attributes.friendly_name as string | undefined) ?? entityId;
    const unavailable = !stateObj || isUnavailable(stateObj);
    const picture = stateObj?.attributes.entity_picture;
    // entity_picture already carries its auth token query string, so the
    // cache-buster normally joins with `&` (`?` covers a bare URL just in case).
    const src =
      !unavailable && typeof picture === 'string' && picture !== ''
        ? `${picture}${picture.includes('?') ? '&' : '?'}counter=${this._counters[index] ?? 0}`
        : undefined;
    const showShot = src !== undefined && !this._broken[index];
    const live = !!stateObj && (stateObj.state === 'streaming' || stateObj.state === 'recording');
    const title = stateObj ? `${name} · ${stateText(hass, stateObj)}` : `${name} · not found`;

    if (!stateObj) {
      return html`
        <div class="tile off" title=${title}>
          <div class="off-inner">
            <ha-icon icon="mdi:video-off"></ha-icon>
            <span class="cname muted">${name}</span>
          </div>
        </div>
      `;
    }

    return html`
      <button
        class="tile ${showShot ? '' : 'off'}"
        title=${title}
        aria-label=${`Show ${name} live view`}
        @click=${(ev: Event) => this._onTileClick(ev, entityId)}
      >
        ${showShot
          ? html`
              <img
                class="shot"
                src=${src}
                alt=${name}
                loading="lazy"
                @error=${() => this._onImgError(index)}
              />
              <div class="scrim"></div>
              <span class="cname">${name}</span>
              ${live ? html`<span class="live" aria-hidden="true"></span>` : nothing}
            `
          : html`
              <div class="off-inner">
                <ha-icon icon="mdi:video-off"></ha-icon>
                <span class="cname muted">${name}</span>
              </div>
            `}
      </button>
    `;
  }

  protected render(): TemplateResult | typeof nothing {
    const config = this._config;
    const hass = this.hass;
    if (!config || !hass) return nothing;

    const cameras = config.cameras;
    const first = cameras.map((id) => hass.states[id]).find((obj) => obj !== undefined);
    const accent = accentFor(first);

    return html`
      <ha-card style="--silk-accent:${accent}">
        ${config.name ? html`<div class="hname">${config.name}</div>` : nothing}
        <div class="wall">${cameras.map((id, i) => this._renderTile(id, i))}</div>
      </ha-card>
    `;
  }

  static styles = [
    silkControlStyles,
    css`
      ha-card {
        flex-direction: column;
        align-items: stretch;
        justify-content: flex-start;
        gap: 8px;
        padding: 10px;
        cursor: default;
      }
      .hname {
        flex: none;
        font-size: 13px;
        font-weight: 600;
        color: var(--secondary-text-color);
        padding: 0 2px;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .wall {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
        gap: 10px;
        align-content: start;
        min-height: 0;
      }
      .tile {
        position: relative;
        display: block;
        width: 100%;
        aspect-ratio: 16 / 9;
        margin: 0;
        padding: 0;
        border: none;
        border-radius: 12px;
        overflow: hidden;
        background: rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.06);
        font: inherit;
        color: inherit;
        text-align: left;
        cursor: pointer;
        outline: none;
        transition: transform 250ms var(--silk-spring);
      }
      .tile:active {
        transform: scale(0.97);
        transition-duration: 120ms;
        transition-timing-function: var(--silk-ease-out);
      }
      .tile:focus-visible {
        box-shadow: inset 0 0 0 2px color-mix(in srgb, var(--silk-accent) 80%, transparent);
      }
      .tile.off {
        cursor: default;
        transform: none;
      }
      .shot {
        position: absolute;
        inset: 0;
        width: 100%;
        height: 100%;
        object-fit: cover;
        display: block;
      }
      /* Photo-legibility scrim (allowed: it serves the image, not chrome). */
      .scrim {
        position: absolute;
        left: 0;
        right: 0;
        bottom: 0;
        height: 46%;
        background: linear-gradient(transparent, rgba(0, 0, 0, 0.6));
        pointer-events: none;
      }
      .cname {
        position: absolute;
        left: 8px;
        right: 8px;
        bottom: 6px;
        color: #fff;
        font-size: 11px;
        font-weight: 500;
        line-height: 1.3;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        pointer-events: none;
      }
      .live {
        position: absolute;
        top: 8px;
        right: 8px;
        width: 6px;
        height: 6px;
        border-radius: 50%;
        background: var(--silk-accent);
        box-shadow: 0 0 0 1.5px rgba(0, 0, 0, 0.35);
      }
      .off-inner {
        position: absolute;
        inset: 0;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 4px;
        padding: 8px;
        box-sizing: border-box;
        color: var(--disabled-text-color, #6f6f6f);
        opacity: 0.45;
      }
      .off-inner ha-icon {
        --mdc-icon-size: 22px;
      }
      .cname.muted {
        position: static;
        max-width: 100%;
        color: var(--primary-text-color);
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    'silk-camera-grid-card': SilkCameraGridCard;
  }
}
