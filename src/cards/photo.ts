import { LitElement, html, css, nothing, PropertyValues, TemplateResult } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { HomeAssistant, LovelaceCardConfig } from '../types';
import { silkControlStyles } from '../shared/base';
import { isUnavailable, haptic } from '../shared/service';
import { registerEditor } from '../shared/editor';

export const META = {
  type: 'silk-photo-card',
  name: 'Silk Photo',
  description: 'A quiet frame for your pictures.',
};

export type PhotoFit = 'cover' | 'contain';

export interface SilkPhotoCardConfig extends LovelaceCardConfig {
  /** image.* / camera.* ids — their `entity_picture` is the source. YAML-only. */
  entities?: string[];
  /** Plain URLs or `/local/...` paths. YAML-only. */
  images?: string[];
  /** Seconds per photo (default 30). */
  interval?: number;
  fit?: PhotoFit;
  /** Caption the source, bottom-left over a scrim. */
  caption?: boolean;
  shuffle?: boolean;
}

/** One slide: either an entity whose picture we re-read, or a fixed URL. */
interface PhotoSlide {
  entity?: string;
  url?: string;
}

/** The image staged in the top (invisible) layer, waiting to load. */
interface PendingLoad {
  src: string;
  layer: 0 | 1;
  pos: number;
}

const DEFAULT_INTERVAL_S = 30;
const CROSSFADE_MS = 400;

const EDITOR_TAG = 'silk-photo-card-editor';

// Source lists stay YAML-only: a slideshow is its list, and ha-form has no
// repeatable entity/text rows worth the ceremony here.
registerEditor(
  EDITOR_TAG,
  [
    {
      name: '',
      type: 'grid',
      schema: [
        { name: 'interval', selector: { number: { min: 1, mode: 'box' } } },
        {
          name: 'fit',
          selector: {
            select: {
              mode: 'dropdown',
              options: [
                { value: 'cover', label: 'Fill the frame' },
                { value: 'contain', label: 'Fit inside' },
              ],
            },
          },
        },
      ],
    },
    { name: 'caption', selector: { boolean: {} } },
  ],
  {
    interval: 'Seconds per photo',
    fit: 'Framing',
    caption: 'Show caption',
  },
  { interval: DEFAULT_INTERVAL_S, fit: 'cover', caption: false }
);

/**
 * A slideshow that never blinks. Two stacked `<img>` layers: the visible one
 * sits underneath at full opacity while the next photo loads invisibly on top,
 * then fades in over it — so a slow or broken source never shows a blank frame
 * and nothing ever reflows.
 */
@customElement('silk-photo-card')
export class SilkPhotoCard extends LitElement {
  @property({ attribute: false }) public hass?: HomeAssistant;

  @state() private _config?: SilkPhotoCardConfig;

  /** Sources in play order (shuffled once at setConfig when asked). */
  @state() private _slides: PhotoSlide[] = [];

  @state() private _srcA = '';
  @state() private _srcB = '';
  /** The staging layer — on top, transparent until its image loads. */
  @state() private _top: 0 | 1 = 0;
  @state() private _topShown = false;

  /** Resolved URLs that failed to load; skipped until their URL changes. */
  @state() private _failed: ReadonlySet<string> = new Set();

  /** Slide the frame is actually showing (drives the caption). */
  @state() private _shownPos = -1;

  /** Cursor into `_slides`; -1 until the first photo is staged. */
  private _pos = -1;
  private _pending?: PendingLoad;
  private _timer?: number;
  private _lastAdvance = 0;

  public static getStubConfig(hass: HomeAssistant): Partial<SilkPhotoCardConfig> {
    const ids = Object.keys(hass.states);
    const entity =
      ids.find((id) => id.startsWith('image.')) ?? ids.find((id) => id.startsWith('camera.'));
    return entity
      ? { type: 'custom:silk-photo-card', entities: [entity] }
      : // No picture entity to borrow — hand back the shape of a file source.
        { type: 'custom:silk-photo-card', images: ['/local/photo.jpg'] };
  }

  public static async getConfigElement(): Promise<HTMLElement> {
    return document.createElement(EDITOR_TAG);
  }

  public setConfig(config: SilkPhotoCardConfig): void {
    const entities = config.entities ?? [];
    const images = config.images ?? [];
    if (!Array.isArray(entities) || !Array.isArray(images)) {
      throw new Error('silk-photo-card: `entities` and `images` must be lists');
    }
    if (entities.length + images.length === 0) {
      throw new Error(
        'silk-photo-card: give it something to show — `entities` (image./camera.) or `images` (urls)'
      );
    }
    for (const id of entities) {
      if (typeof id !== 'string' || !id.includes('.')) {
        throw new Error(`silk-photo-card: \`${String(id)}\` is not an entity id`);
      }
    }
    for (const url of images) {
      if (typeof url !== 'string' || url === '') {
        throw new Error('silk-photo-card: `images` entries must be non-empty urls');
      }
    }
    if (config.interval !== undefined && !(Number(config.interval) > 0)) {
      throw new Error('silk-photo-card: `interval` must be a positive number of seconds');
    }
    if (config.fit !== undefined && config.fit !== 'cover' && config.fit !== 'contain') {
      throw new Error("silk-photo-card: `fit` must be 'cover' or 'contain'");
    }

    this._config = config;
    const slides: PhotoSlide[] = [
      ...entities.map((entity) => ({ entity })),
      ...images.map((url) => ({ url })),
    ];
    this._slides = config.shuffle ? shuffled(slides) : slides;
    this._pos = -1;
    this._shownPos = -1;
    this._srcA = '';
    this._srcB = '';
    this._top = 0;
    this._topShown = false;
    this._failed = new Set();
    this._pending = undefined;
    this._lastAdvance = 0;
    if (this.isConnected) this._schedule();
  }

  public getCardSize(): number {
    return 4;
  }

  public getGridOptions(): Record<string, number> {
    return { columns: 6, rows: 4, min_columns: 3, min_rows: 2 };
  }

  public connectedCallback(): void {
    super.connectedCallback();
    document.addEventListener('visibilitychange', this._onVisibility);
    this._schedule();
  }

  public disconnectedCallback(): void {
    super.disconnectedCallback();
    document.removeEventListener('visibilitychange', this._onVisibility);
    this._clearTimer();
  }

  /** Paused while the tab is hidden; an overdue slide flips the moment it returns. */
  private readonly _onVisibility = (): void => {
    if (document.hidden) this._clearTimer();
    else this._schedule();
  };

  protected willUpdate(changed: PropertyValues): void {
    if (!this._config || this._slides.length === 0) return;
    if (this._pos < 0) {
      this._advance();
      this._schedule();
      return;
    }
    if (!changed.has('hass') || this._pending) return;
    // image.* entities bump the token on `entity_picture` whenever the picture
    // changes — follow it so the frame never shows a stale (or 404'd) URL.
    const fresh = this._resolve(this._slides[this._pos]);
    if (fresh && !this._failed.has(fresh)) this._show(fresh, this._pos);
  }

  private _intervalMs(): number {
    return Math.max(1, Number(this._config?.interval ?? DEFAULT_INTERVAL_S)) * 1000;
  }

  private _clearTimer(): void {
    window.clearTimeout(this._timer);
    this._timer = undefined;
  }

  /** Self-correcting chain: the remaining time is honored across pauses. */
  private _schedule(): void {
    this._clearTimer();
    if (document.hidden || !this.isConnected) return;
    if (this._slides.length < 2) return;
    const wait = Math.max(0, this._intervalMs() - (Date.now() - this._lastAdvance));
    this._timer = window.setTimeout(() => {
      this._advance();
      this._schedule();
    }, wait);
  }

  /** Current URL for a slide — undefined when the entity has no usable picture. */
  private _resolve(slide?: PhotoSlide): string | undefined {
    if (!slide) return undefined;
    if (slide.url) return slide.url;
    if (!slide.entity) return undefined;
    const stateObj = this.hass?.states[slide.entity];
    if (!stateObj || isUnavailable(stateObj)) return undefined;
    const picture = stateObj.attributes.entity_picture;
    return typeof picture === 'string' && picture !== '' ? picture : undefined;
  }

  /** Step to the next source that resolves and hasn't failed. */
  private _advance(): void {
    const count = this._slides.length;
    if (count === 0) return;
    this._lastAdvance = Date.now();
    for (let step = 1; step <= count; step++) {
      const pos = (this._pos + step) % count;
      const url = this._resolve(this._slides[pos]);
      if (url && !this._failed.has(url)) {
        this._pos = pos;
        this._show(url, pos);
        return;
      }
    }
    // Every source is broken or has no picture yet: hold the current frame.
  }

  private _srcOf(layer: 0 | 1): string {
    return layer === 0 ? this._srcA : this._srcB;
  }

  /**
   * Stage `src` in the top layer. While the top layer has never been shown it
   * IS the staging layer, so retries after an error reuse it and the visible
   * photo underneath is never disturbed.
   */
  private _show(src: string, pos: number): void {
    const visible = this._topShown ? this._srcOf(this._top) : this._srcOf(this._top === 0 ? 1 : 0);
    if (src === visible) {
      this._shownPos = pos;
      return;
    }
    if (this._pending?.src === src) return;
    const layer: 0 | 1 = this._topShown ? (this._top === 0 ? 1 : 0) : this._top;
    this._pending = { src, layer, pos };
    this._top = layer;
    this._topShown = false;
    if (layer === 0) this._srcA = src;
    else this._srcB = src;
  }

  private _onLoad(layer: 0 | 1, src: string): void {
    const pending = this._pending;
    if (!pending || pending.layer !== layer || pending.src !== src) return;
    this._pending = undefined;
    this._topShown = true;
    this._shownPos = pending.pos;
  }

  private _onError(layer: 0 | 1, src: string): void {
    const pending = this._pending;
    if (!pending || pending.layer !== layer || pending.src !== src) return;
    this._pending = undefined;
    this._failed = new Set(this._failed).add(src);
    this._advance();
  }

  private _onTap(): void {
    haptic(this);
    this._advance();
    this._schedule();
  }

  private _onKeydown(ev: KeyboardEvent): void {
    if (ev.key !== 'Enter' && ev.key !== ' ') return;
    ev.preventDefault();
    this._onTap();
  }

  /** Friendly name for an entity slide; the bare filename for a URL slide. */
  private _labelOf(slide?: PhotoSlide): string {
    if (!slide) return '';
    if (slide.entity) {
      const stateObj = this.hass?.states[slide.entity];
      return stateObj?.attributes.friendly_name ?? slide.entity;
    }
    const file = (slide.url ?? '').split(/[?#]/)[0].split('/').pop() ?? '';
    let name = file;
    try {
      name = decodeURIComponent(file);
    } catch {
      /* a malformed escape is not worth a broken caption */
    }
    return name.replace(/\.[a-z0-9]+$/i, '');
  }

  private _renderLayer(layer: 0 | 1, fit: PhotoFit, alt: string): TemplateResult | typeof nothing {
    const src = this._srcOf(layer);
    if (!src) return nothing;
    const top = layer === this._top;
    const shown = top ? this._topShown : true;
    return html`<img
      class="slide ${fit} ${top ? 'top' : ''} ${shown ? 'shown' : ''}"
      src=${src}
      alt=${alt}
      decoding="async"
      draggable="false"
      @load=${() => this._onLoad(layer, src)}
      @error=${() => this._onError(layer, src)}
    />`;
  }

  protected render(): TemplateResult | typeof nothing {
    const config = this._config;
    if (!config) return nothing;

    const fit: PhotoFit = config.fit ?? 'cover';
    const bottom = this._top === 0 ? 1 : 0;
    const blank = !this._topShown && !this._srcOf(bottom);
    const label = this._shownPos >= 0 ? this._labelOf(this._slides[this._shownPos]) : '';
    const showCaption = config.caption === true && !blank && label !== '';

    return html`
      <ha-card
        class=${blank ? 'unavailable' : ''}
        role="button"
        tabindex="0"
        aria-label=${label ? `Photo: ${label}. Next photo` : 'Next photo'}
        @click=${this._onTap}
        @keydown=${this._onKeydown}
      >
        ${this._renderLayer(0, fit, label)} ${this._renderLayer(1, fit, label)}
        ${showCaption
          ? html`<div class="scrim"><div class="caption">${label}</div></div>`
          : nothing}
        ${blank && !this._pending
          ? html`
              <div class="fallback">
                <ha-icon icon="mdi:image-outline"></ha-icon>
                <div class="fallback-text">No photo</div>
              </div>
            `
          : nothing}
      </ha-card>
    `;
  }

  static styles = [
    silkControlStyles,
    css`
      /* Full-bleed frame: drop the base row layout. The aspect-ratio only
         applies where the layout gives no definite height (masonry); in grid
         sections the assigned rows win. */
      ha-card {
        display: block;
        padding: 0;
        aspect-ratio: 4 / 3;
        background-color: var(--card-background-color, #fff);
      }
      ha-card:focus-visible {
        outline: 2px solid color-mix(in srgb, var(--silk-accent) 70%, transparent);
        outline-offset: 2px;
      }
      .slide {
        position: absolute;
        inset: 0;
        width: 100%;
        height: 100%;
        display: block;
        user-select: none;
        /* Invisible until it has loaded — the photo underneath keeps the frame. */
        opacity: 0;
        z-index: 0;
      }
      .slide.cover {
        object-fit: cover;
      }
      .slide.contain {
        object-fit: contain;
      }
      .slide.shown {
        opacity: 1;
      }
      .slide.top {
        z-index: 1;
      }
      /* Only the incoming photo animates; the outgoing one stays opaque below,
         so the crossfade never lets the card background bleed through. */
      .slide.top.shown {
        animation: silk-photo-fade ${CROSSFADE_MS}ms ease;
      }
      @keyframes silk-photo-fade {
        from {
          opacity: 0;
        }
        to {
          opacity: 1;
        }
      }
      /* Photo-legibility scrim (allowed: it serves the image, not chrome). */
      .scrim {
        position: absolute;
        left: 0;
        right: 0;
        bottom: 0;
        z-index: 2;
        padding: 28px 12px 10px;
        background: linear-gradient(transparent, rgba(0, 0, 0, 0.55));
        pointer-events: none;
      }
      .caption {
        color: #fff;
        font-size: 13px;
        font-weight: 500;
        line-height: 1.3;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .fallback {
        position: absolute;
        inset: 0;
        z-index: 2;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 4px;
        padding: 12px;
        box-sizing: border-box;
        background: rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.04);
        color: var(--secondary-text-color);
      }
      .fallback ha-icon {
        --mdc-icon-size: 28px;
      }
      .fallback-text {
        font-size: 12.5px;
        line-height: 1.3;
      }
      .unavailable .fallback {
        opacity: 0.45;
      }
    `,
  ];
}

/** Fisher-Yates, on a copy — the configured list is never mutated. */
function shuffled(slides: PhotoSlide[]): PhotoSlide[] {
  const out = slides.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

declare global {
  interface HTMLElementTagNameMap {
    'silk-photo-card': SilkPhotoCard;
  }
}
