import { LitElement, html, css, nothing, TemplateResult } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { HomeAssistant, LovelaceCardConfig } from '../types';
import { silkControlStyles } from '../shared/base';
import { isUnavailable, moreInfo, haptic, stateText } from '../shared/service';
import { accentFor } from '../shared/color';
import { registerEditor } from '../shared/editor';
import { formatNumber } from '../format';

export const META = {
  type: 'silk-hero-card',
  name: 'Silk Hero',
  description: 'A dashboard needs a cover.',
};

export type HeroAlign = 'left' | 'center';

export interface SilkHeroCardConfig extends LovelaceCardConfig {
  title: string;
  subtitle?: string;
  /** Background picture: `/local/...`, an http(s) URL, or any path HA serves. */
  image?: string;
  /** Its state joins the subtitle line. */
  entity?: string;
  /** Cover height in px. Default 160. */
  height?: number;
  align?: HeroAlign;
  /** Dashboard path (or http(s) URL) the whole cover opens. */
  action?: string;
  /** Accent override for the image-less surface. */
  color?: string;
}

const DEFAULT_HEIGHT = 160;
const MIN_HEIGHT = 60;
const MAX_HEIGHT = 640;
/** Grid rows are ~56px plus an 8px gutter. */
const GRID_ROW_PX = 64;
/** Masonry card-size unit. */
const MASONRY_ROW_PX = 50;

const ALIGNS: readonly HeroAlign[] = ['left', 'center'];

/** Schemes `window.open` may receive — never `javascript:` and friends. */
const URL_SCHEME = /^(https?:|mailto:|tel:)/i;

/** '°C'/'°F' → '°'; everything else trimmed and appended without a space. */
function condenseUnit(unit: string): string {
  const u = unit.trim();
  return u.startsWith('°') ? '°' : u;
}

const EDITOR_TAG = 'silk-hero-card-editor';

registerEditor(
  EDITOR_TAG,
  [
    { name: 'title', required: true, selector: { text: {} } },
    { name: 'subtitle', selector: { text: {} } },
    { name: 'image', selector: { text: {} } },
    { name: 'entity', selector: { entity: {} } },
    {
      name: '',
      type: 'grid',
      schema: [
        {
          name: 'height',
          selector: { number: { min: MIN_HEIGHT, max: MAX_HEIGHT, mode: 'box' } },
        },
        {
          name: 'align',
          selector: {
            select: {
              mode: 'dropdown',
              options: [
                { value: 'left', label: '왼쪽' },
                { value: 'center', label: '가운데' },
              ],
            },
          },
        },
      ],
    },
    { name: 'action', selector: { text: {} } },
    { name: 'color', selector: { ui_color: {} } },
  ],
  {
    title: '제목',
    subtitle: '부제목',
    image: '이미지 경로(/local/…)',
    entity: '엔티티(상태가 부제목에 붙습니다)',
    height: '높이(px)',
    align: '정렬',
    action: '이동 경로',
    color: '강조 색상',
  },
  { height: DEFAULT_HEIGHT, align: 'left' }
);

@customElement('silk-hero-card')
export class SilkHeroCard extends LitElement {
  @property({ attribute: false }) public hass?: HomeAssistant;

  @state() private _config?: SilkHeroCardConfig;
  /** The picture failed to load — fall back to the tinted surface. */
  @state() private _broken = false;

  public static getStubConfig(hass: HomeAssistant): Partial<SilkHeroCardConfig> {
    const weather = Object.keys(hass.states).find((id) => id.startsWith('weather.'));
    return {
      type: 'custom:silk-hero-card',
      title: 'Home',
      subtitle: 'Everything, at a glance',
      entity: weather,
    };
  }

  public static async getConfigElement(): Promise<HTMLElement> {
    return document.createElement(EDITOR_TAG);
  }

  public setConfig(config: SilkHeroCardConfig): void {
    if (typeof config.title !== 'string' || config.title.trim() === '') {
      throw new Error('silk-hero-card: `title` is required');
    }
    if (config.subtitle !== undefined && typeof config.subtitle !== 'string') {
      throw new Error('silk-hero-card: `subtitle` must be a string');
    }
    if (config.image !== undefined && (typeof config.image !== 'string' || !config.image)) {
      throw new Error('silk-hero-card: `image` must be a URL or a path like /local/cover.jpg');
    }
    if (config.entity !== undefined && (typeof config.entity !== 'string' || !config.entity.includes('.'))) {
      throw new Error('silk-hero-card: `entity` must be an entity id');
    }
    if (config.height !== undefined) {
      const height = Number(config.height);
      if (!Number.isFinite(height) || height < MIN_HEIGHT || height > MAX_HEIGHT) {
        throw new Error(`silk-hero-card: \`height\` must be ${MIN_HEIGHT}-${MAX_HEIGHT} px`);
      }
    }
    if (config.align !== undefined && !ALIGNS.includes(config.align)) {
      throw new Error("silk-hero-card: `align` must be 'left' or 'center'");
    }
    if (config.action !== undefined) {
      if (typeof config.action !== 'string' || config.action === '') {
        throw new Error('silk-hero-card: `action` must be a dashboard path like /lovelace/kitchen');
      }
      if (!config.action.startsWith('/') && !URL_SCHEME.test(config.action)) {
        throw new Error('silk-hero-card: `action` must start with `/` or be an http(s) URL');
      }
    }
    // A config edit is a fresh chance for a picture that failed before.
    this._config = config;
    this._broken = false;
  }

  public getCardSize(): number {
    return Math.max(2, Math.round(this._height() / MASONRY_ROW_PX));
  }

  public getGridOptions(): Record<string, number> {
    // Two rows is the cover's natural size; a taller one claims the rows it
    // actually occupies instead of spilling over the cards beneath it.
    return {
      columns: 12,
      rows: Math.max(2, Math.floor(this._height() / GRID_ROW_PX)),
      min_columns: 6,
      min_rows: 1,
    };
  }

  private _height(): number {
    const raw = Number(this._config?.height ?? DEFAULT_HEIGHT);
    return Number.isFinite(raw) ? Math.min(Math.max(raw, MIN_HEIGHT), MAX_HEIGHT) : DEFAULT_HEIGHT;
  }

  private _onImgError(): void {
    this._broken = true;
  }

  /** The entity's contribution to the subtitle: number + unit, or its state. */
  private _entityText(): string | undefined {
    const entityId = this._config?.entity;
    const stateObj = entityId ? this.hass?.states[entityId] : undefined;
    if (!stateObj) return undefined;
    if (isUnavailable(stateObj)) return 'Unavailable';
    const numeric = Number(stateObj.state);
    if (stateObj.state !== '' && Number.isFinite(numeric)) {
      const unit = stateObj.attributes.unit_of_measurement;
      const text = formatNumber(this.hass, stateObj.entity_id, numeric);
      return unit ? `${text}${condenseUnit(String(unit))}` : text;
    }
    return stateText(this.hass, stateObj);
  }

  private _navigate(path: string): void {
    history.pushState(null, '', path);
    this.dispatchEvent(
      new CustomEvent('location-changed', {
        detail: { replace: false },
        bubbles: true,
        composed: true,
      })
    );
  }

  /** A cover with somewhere to go goes there; otherwise its entity opens up. */
  private _onCardClick(): void {
    const config = this._config;
    if (!config) return;
    const action = config.action;
    if (action) {
      haptic(this, 'selection');
      if (action.startsWith('/')) this._navigate(action);
      else window.open(action, '_blank', 'noopener');
      return;
    }
    if (config.entity && this.hass?.states[config.entity]) {
      haptic(this, 'selection');
      moreInfo(this, config.entity);
    }
  }

  private _onKeyDown(ev: KeyboardEvent): void {
    if (ev.key !== 'Enter' && ev.key !== ' ') return;
    ev.preventDefault();
    this._onCardClick();
  }

  protected render(): TemplateResult | typeof nothing {
    const config = this._config;
    if (!config) return nothing;

    const image = config.image && !this._broken ? config.image : undefined;
    const stateObj = config.entity ? this.hass?.states[config.entity] : undefined;
    const accent = accentFor(stateObj, config.color);
    const subtitle = config.subtitle?.trim();
    const entityText = this._entityText();
    const dim = Boolean(stateObj && isUnavailable(stateObj));
    const parts = [subtitle, entityText].filter((p): p is string => Boolean(p));
    const interactive = Boolean(
      config.action || (config.entity && this.hass?.states[config.entity])
    );

    return html`
      <ha-card
        class="hero ${image ? 'shot' : 'flat'} ${config.align === 'center' ? 'center' : ''} ${
          interactive ? 'nav' : ''
        }"
        style="--silk-accent:${accent};--silk-hero-height:${this._height()}px"
        role=${interactive ? 'button' : nothing}
        tabindex=${interactive ? '0' : nothing}
        @click=${this._onCardClick}
        @keydown=${this._onKeyDown}
      >
        ${image
          ? html`
              <img class="bg" src=${image} alt="" aria-hidden="true" @error=${this._onImgError} />
              <div class="scrim" aria-hidden="true"></div>
            `
          : nothing}
        <div class="body">
          <div class="title" title=${config.title}>${config.title}</div>
          ${parts.length
            ? html`
                <div class="sub ${dim ? 'dim' : ''}" title=${parts.join(' · ')}>
                  ${parts.map((part, i) =>
                    i ? html`<span class="sep">·</span>${part}` : html`${part}`
                  )}
                </div>
              `
            : nothing}
        </div>
      </ha-card>
    `;
  }

  static styles = [
    silkControlStyles,
    css`
      /* Full-bleed cover: drop the base row layout. The configured height rules
         masonry, where the host has no definite height of its own; inside grid
         sections the assigned rows win and the cover fills them exactly. */
      ha-card {
        display: flex;
        flex-direction: column;
        justify-content: flex-end;
        align-items: stretch;
        gap: 0;
        padding: 0;
        height: var(--silk-hero-height, 160px);
        min-height: 100%;
        max-height: 100%;
        cursor: default;
      }
      ha-card.nav {
        cursor: pointer;
      }
      ha-card.nav:focus-visible {
        outline: 2px solid color-mix(in srgb, var(--silk-accent) 70%, transparent);
        outline-offset: 2px;
      }
      /* No picture: a quiet wash of the accent, text in theme tokens. */
      ha-card.flat {
        background: color-mix(in srgb, var(--silk-accent) 12%, var(--card-background-color, #fff));
      }
      .bg {
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
        height: 70%;
        background: linear-gradient(transparent, rgba(0, 0, 0, 0.62));
        pointer-events: none;
      }
      .body {
        position: relative;
        z-index: 1;
        min-width: 0;
        padding: 16px 18px;
      }
      ha-card.center .body {
        text-align: center;
      }
      .title {
        font-size: 26px;
        font-weight: 700;
        letter-spacing: -0.02em;
        line-height: 1.15;
        color: var(--primary-text-color);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .sub {
        margin-top: 3px;
        font-size: 13px;
        line-height: 1.35;
        color: var(--secondary-text-color);
        font-variant-numeric: tabular-nums;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .sub.dim {
        opacity: 0.6;
      }
      .sub .sep {
        opacity: 0.5;
        margin: 0 5px;
      }
      /* Over a photograph the type goes white — the scrim carries the contrast. */
      ha-card.shot .title {
        color: #fff;
      }
      ha-card.shot .sub {
        color: rgba(255, 255, 255, 0.8);
      }
      ha-card.shot .sub.dim {
        color: rgba(255, 255, 255, 0.6);
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    'silk-hero-card': SilkHeroCard;
  }
}
