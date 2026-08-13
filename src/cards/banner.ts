import { LitElement, html, css, nothing, TemplateResult } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { HomeAssistant, LovelaceCardConfig } from '../types';
import { silkControlStyles } from '../shared/base';
import { isUnavailable, moreInfo, haptic } from '../shared/service';
import { registerEditor } from '../shared/editor';

export const META = {
  type: 'silk-banner-card',
  name: 'Silk Banner',
  description: 'A message that can be dismissed.',
};

export type BannerLevel = 'info' | 'warning' | 'error' | 'success';

/** The one thing a banner can offer to do about itself. */
export interface BannerAction {
  label: string;
  /** `domain.service`. */
  service?: string;
  /** Service data, passed through verbatim. */
  data?: Record<string, unknown>;
  /** Dashboard path, e.g. `/lovelace/kitchen`. */
  navigation_path?: string;
  /** Opened in a new tab. */
  url?: string;
}

/** Show the banner only while an entity says so (the Lovelace condition shape). */
export interface BannerCondition {
  entity: string;
  /** Exact state match. */
  state?: string;
  /** Numeric state strictly greater than this. */
  above?: number;
  /** Numeric state strictly less than this. */
  below?: number;
}

export interface SilkBannerCardConfig extends LovelaceCardConfig {
  message: string;
  title?: string;
  icon?: string;
  /** Tints the icon and the hairline outline. Default `info`. */
  level?: BannerLevel;
  /** Default true — the X remembers itself until the words change. */
  dismissible?: boolean;
  /** YAML-only: one button on the right. */
  action?: BannerAction;
  /** YAML-only: the banner only exists while this matches. */
  condition?: BannerCondition;
}

const LEVELS: readonly BannerLevel[] = ['info', 'warning', 'error', 'success'];

/**
 * Level is genuine status semantics — an announcement's severity is exactly
 * what the status colors are for — so it earns the theme's status palette
 * rather than the card accent.
 */
const LEVEL_COLORS: Record<BannerLevel, string> = {
  info: 'var(--info-color, var(--primary-color, #4aa8ff))',
  warning: 'var(--warning-color, #ffa600)',
  error: 'var(--error-color, #db4437)',
  success: 'var(--success-color, #43a047)',
};

const LEVEL_ICONS: Record<BannerLevel, string> = {
  info: 'mdi:information-outline',
  warning: 'mdi:alert-outline',
  error: 'mdi:alert-circle-outline',
  success: 'mdi:check-circle-outline',
};

const SERVICE_RE = /^[a-z_0-9]+\.[a-z_0-9]+$/;
/** Schemes `window.open` may receive — never `javascript:` and friends. */
const URL_SCHEME = /^(https?:|mailto:|tel:)/i;

const STORE_PREFIX = 'silk-banner:';
/** Fade-out before the row leaves the layout; storage is written immediately. */
const LEAVE_MS = 200;

/**
 * FNV-1a over the banner's own words. The dismissal is keyed by what it said,
 * so rewording the announcement brings it back and re-rendering the same text
 * on another dashboard keeps it gone.
 */
function textKey(title: string | undefined, message: string): string {
  const text = `${title ?? ''} ${message}`;
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return `${STORE_PREFIX}${(hash >>> 0).toString(36)}`;
}

const EDITOR_TAG = 'silk-banner-card-editor';

// `action` and `condition` stay YAML-only: nested mappings are YAML territory,
// and ha-form has nothing honest to render for them.
registerEditor(
  EDITOR_TAG,
  [
    { name: 'message', required: true, selector: { text: { multiline: true } } },
    { name: 'title', selector: { text: {} } },
    {
      name: '',
      type: 'grid',
      schema: [
        { name: 'icon', selector: { icon: {} } },
        {
          name: 'level',
          selector: {
            select: {
              mode: 'dropdown',
              options: [
                { value: 'info', label: 'Info' },
                { value: 'success', label: 'Success' },
                { value: 'warning', label: 'Warning' },
                { value: 'error', label: 'Error' },
              ],
            },
          },
        },
      ],
    },
    { name: 'dismissible', selector: { boolean: {} } },
  ],
  {
    message: 'Message',
    title: 'Title',
    icon: 'Icon',
    level: 'Level',
    dismissible: 'Allow dismissing',
  },
  { level: 'info', dismissible: true }
);

@customElement('silk-banner-card')
export class SilkBannerCard extends LitElement {
  @property({ attribute: false }) public hass?: HomeAssistant;

  /**
   * The frontend sets one of these while the card sits in an editor or the
   * picker preview. A banner that hides itself there would be unconfigurable,
   * so in those two contexts it always shows.
   */
  @property({ type: Boolean }) public preview = false;
  @property({ type: Boolean }) public editMode = false;

  @state() private _config?: SilkBannerCardConfig;
  @state() private _dismissed = false;
  /** True during the fade-out, before the card leaves the layout. */
  @state() private _leaving = false;

  /** localStorage slot for the current wording. */
  private _key = '';
  private _leaveTimer?: number;
  /** Last visibility reported to the view, so the event fires only on changes. */
  private _lastVisible?: boolean;

  /** Another tab dismissed the same words — agree with it. */
  private readonly _onStorage = (ev: StorageEvent): void => {
    if (!this._key || (ev.key !== null && ev.key !== this._key)) return;
    const dismissed = this._read();
    if (dismissed !== this._dismissed) {
      this._leaving = false;
      this._dismissed = dismissed;
    }
  };

  public static getStubConfig(): Partial<SilkBannerCardConfig> {
    return {
      type: 'custom:silk-banner-card',
      title: 'Heads up',
      message: 'Filters were last changed six months ago.',
      level: 'info',
    };
  }

  public static async getConfigElement(): Promise<HTMLElement> {
    return document.createElement(EDITOR_TAG);
  }

  public setConfig(config: SilkBannerCardConfig): void {
    if (typeof config.message !== 'string' || config.message.trim() === '') {
      throw new Error('silk-banner-card: `message` is required');
    }
    if (config.title !== undefined && typeof config.title !== 'string') {
      throw new Error('silk-banner-card: `title` must be a string');
    }
    if (config.level !== undefined && !LEVELS.includes(config.level)) {
      throw new Error(`silk-banner-card: \`level\` must be one of ${LEVELS.join('/')}`);
    }
    if (config.dismissible !== undefined && typeof config.dismissible !== 'boolean') {
      throw new Error('silk-banner-card: `dismissible` must be true or false');
    }

    const action = config.action;
    if (action !== undefined) {
      if (typeof action.label !== 'string' || action.label.trim() === '') {
        throw new Error('silk-banner-card: `action` needs a `label`');
      }
      const targets = [action.service, action.navigation_path, action.url].filter(
        (t) => typeof t === 'string' && t !== ''
      );
      if (targets.length !== 1) {
        throw new Error(
          'silk-banner-card: `action` needs exactly one of `service`, `navigation_path` or `url`'
        );
      }
      if (action.service !== undefined && !SERVICE_RE.test(action.service)) {
        throw new Error('silk-banner-card: `action.service` must look like `light.turn_on`');
      }
      if (
        action.url !== undefined &&
        !URL_SCHEME.test(action.url) &&
        !action.url.startsWith('/')
      ) {
        throw new Error(
          'silk-banner-card: `action.url` must be http(s), mailto, tel or an absolute path'
        );
      }
      if (action.navigation_path !== undefined && !action.navigation_path.startsWith('/')) {
        throw new Error('silk-banner-card: `action.navigation_path` must start with `/`');
      }
    }

    const condition = config.condition;
    if (condition !== undefined) {
      if (typeof condition.entity !== 'string' || !condition.entity.includes('.')) {
        throw new Error('silk-banner-card: `condition.entity` must be an entity id');
      }
      const hasState = condition.state !== undefined;
      const hasAbove = condition.above !== undefined;
      const hasBelow = condition.below !== undefined;
      if (!hasState && !hasAbove && !hasBelow) {
        throw new Error('silk-banner-card: `condition` needs a `state`, `above` or `below`');
      }
      if (hasAbove && !Number.isFinite(Number(condition.above))) {
        throw new Error('silk-banner-card: `condition.above` must be a number');
      }
      if (hasBelow && !Number.isFinite(Number(condition.below))) {
        throw new Error('silk-banner-card: `condition.below` must be a number');
      }
    }

    this._config = config;
    this._key = textKey(config.title, config.message);
    // New wording is a new banner: it comes back even where the old one was
    // dismissed, and its own dismissal is read fresh.
    window.clearTimeout(this._leaveTimer);
    this._leaveTimer = undefined;
    this._leaving = false;
    this._dismissed = this._read();
  }

  public getCardSize(): number {
    return 1;
  }

  public getGridOptions(): Record<string, number> {
    return { columns: 12, rows: 1, min_columns: 6, min_rows: 1 };
  }

  public connectedCallback(): void {
    super.connectedCallback();
    // Re-read on remount: another view may have dismissed these words meanwhile.
    if (this._key) this._dismissed = this._read();
    window.addEventListener('storage', this._onStorage);
  }

  public disconnectedCallback(): void {
    super.disconnectedCallback();
    window.removeEventListener('storage', this._onStorage);
    window.clearTimeout(this._leaveTimer);
    this._leaveTimer = undefined;
  }

  private _read(): boolean {
    try {
      return window.localStorage.getItem(this._key) === '1';
    } catch {
      // Private mode or a full quota — the banner simply stays dismissible.
      return false;
    }
  }

  private _write(): void {
    try {
      window.localStorage.setItem(this._key, '1');
    } catch {
      // A dismissal is a convenience; losing it must never break the card.
    }
  }

  private _level(): BannerLevel {
    return this._config?.level ?? 'info';
  }

  /** Whether the configured condition currently holds (no condition = always). */
  private _conditionMet(): boolean {
    const condition = this._config?.condition;
    if (!condition) return true;
    const stateObj = this.hass?.states[condition.entity];
    if (!stateObj) return false;
    if (condition.state !== undefined && String(stateObj.state) !== String(condition.state)) {
      return false;
    }
    if (condition.above !== undefined || condition.below !== undefined) {
      // A number comparison against an entity that cannot speak is not a match.
      if (isUnavailable(stateObj)) return false;
      const value = Number(stateObj.state);
      if (!Number.isFinite(value)) return false;
      if (condition.above !== undefined && !(value > Number(condition.above))) return false;
      if (condition.below !== undefined && !(value < Number(condition.below))) return false;
    }
    return true;
  }

  /**
   * Edit and preview panes always show the banner. The picker sets `preview`,
   * hui-card sets `editMode`, and some panes only add a `preview` class — a
   * banner that hid itself in any of them would be unconfigurable.
   */
  private _editing(): boolean {
    return this.preview || this.editMode || this.classList.contains('preview');
  }

  private _visible(): boolean {
    if (!this._config) return false;
    if (this._editing()) return true;
    if (this._dismissed) return false;
    return this._conditionMet();
  }

  protected firstUpdated(): void {
    // The `preview` class lands on the host after the first render, and a class
    // is not reactive — one extra pass picks up the edit-mode exemption.
    this.requestUpdate();
  }

  /**
   * Take the host out of the layout when there is nothing to say, the way HA's
   * own conditional card does — an empty grid cell is still a gap.
   */
  protected updated(): void {
    const visible = this._visible();
    if (visible === this._lastVisible) return;
    this._lastVisible = visible;
    this.hidden = !visible;
    this.style.display = visible ? '' : 'none';
    this.dispatchEvent(
      new CustomEvent('card-visibility-changed', {
        detail: { value: visible },
        bubbles: true,
        composed: true,
      })
    );
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

  /** The body opens the condition entity when there is one — nothing otherwise. */
  private _onCardClick(): void {
    const entity = this._config?.condition?.entity;
    if (entity && this.hass?.states[entity]) moreInfo(this, entity);
  }

  private _onActionClick(ev: Event): void {
    ev.stopPropagation();
    const action = this._config?.action;
    const hass = this.hass;
    if (!action || !hass) return;
    haptic(this);
    if (action.service) {
      const [domain, service] = action.service.split('.');
      // `data` is passed through as authored — targets stay the user's call.
      hass.callService(domain, service, action.data ? { ...action.data } : undefined).catch(
        (err) => console.warn('silk-banner-card: action service failed', err)
      );
      return;
    }
    if (action.navigation_path) {
      this._navigate(action.navigation_path);
      return;
    }
    if (action.url) window.open(action.url, '_blank', 'noopener');
  }

  private _onDismissClick(ev: Event): void {
    ev.stopPropagation();
    if (this._leaving) return;
    haptic(this);
    // Store first: a reload mid-fade must not resurrect the banner.
    this._write();
    this._leaving = true;
    this._leaveTimer = window.setTimeout(() => {
      this._leaveTimer = undefined;
      this._dismissed = true;
      this._leaving = false;
    }, LEAVE_MS);
  }

  protected render(): TemplateResult | typeof nothing {
    const config = this._config;
    if (!config || !this._visible()) return nothing;

    const level = this._level();
    const dismissible = config.dismissible !== false;
    const action = config.action;
    const title = config.title?.trim();
    const message = config.message;
    const icon = config.icon ?? LEVEL_ICONS[level];
    const clickable = Boolean(config.condition?.entity && this.hass?.states[config.condition.entity]);

    return html`
      <ha-card
        class="control banner ${this._leaving ? 'leaving' : ''} ${clickable ? 'clickable' : ''}"
        style="--silk-accent:${LEVEL_COLORS[level]}"
        role="status"
        @click=${this._onCardClick}
      >
        <div class="icon on"><ha-icon .icon=${icon}></ha-icon></div>
        <div class="info">
          ${title
            ? html`
                <div class="name" title=${title}>${title}</div>
                <div class="state" title=${message}>${message}</div>
              `
            : html`<div class="name" title=${message}>${message}</div>`}
        </div>
        <div class="trailing">
          ${action
            ? html`
                <button
                  class="chip act"
                  title=${action.label}
                  @click=${this._onActionClick}
                >
                  ${action.label}
                </button>
              `
            : nothing}
          ${dismissible
            ? html`
                <button
                  class="dismiss"
                  aria-label=${`Dismiss ${title ?? message}`}
                  title="Dismiss"
                  @click=${this._onDismissClick}
                >
                  <ha-icon icon="mdi:close"></ha-icon>
                </button>
              `
            : nothing}
        </div>
      </ha-card>
    `;
  }

  static styles = [
    silkControlStyles,
    css`
      /* A hairline in the level colour, inset so it hugs the card radius —
         a tint on the surface, never a glow. */
      ha-card {
        outline: 1px solid color-mix(in srgb, var(--silk-accent) 38%, transparent);
        outline-offset: -1px;
        cursor: default;
        animation: silk-banner-in 200ms var(--silk-ease-out);
      }
      ha-card.clickable {
        cursor: pointer;
      }
      ha-card.leaving {
        animation: none;
        opacity: 0;
        transform: translateY(-4px);
        transition:
          opacity 200ms var(--silk-ease-out),
          transform 200ms var(--silk-ease-out);
      }
      /* The icon is a level lamp, not a control. */
      .icon {
        cursor: inherit;
      }
      .icon:active {
        transform: none;
      }
      .act {
        position: relative;
        flex: none;
        height: 32px;
        padding: 0 12px;
        max-width: 40vw;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        color: var(--silk-accent);
        background: color-mix(in srgb, var(--silk-accent) 16%, transparent);
        transition:
          transform 250ms var(--silk-spring),
          background 150ms ease-out;
      }
      .act:hover {
        background: color-mix(in srgb, var(--silk-accent) 24%, transparent);
      }
      .act:active {
        transform: scale(0.94);
        transition-duration: 120ms;
        transition-timing-function: var(--silk-ease-out);
      }
      /* Invisible halo lifts the touch target past 40px without a fatter chip. */
      .act::after {
        content: '';
        position: absolute;
        inset: -5px -2px;
        border-radius: 999px;
      }
      .act:focus-visible {
        outline: 2px solid color-mix(in srgb, var(--silk-accent) 70%, transparent);
        outline-offset: 2px;
      }
      .dismiss {
        position: relative;
        flex: none;
        width: 30px;
        height: 30px;
        border: none;
        border-radius: 10px;
        display: grid;
        place-items: center;
        padding: 0;
        cursor: pointer;
        color: var(--secondary-text-color);
        background: rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.06);
        transition:
          transform 250ms var(--silk-spring),
          background 150ms ease-out,
          color 150ms ease-out;
      }
      .dismiss:hover {
        color: var(--primary-text-color);
        background: rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.12);
      }
      .dismiss:active {
        transform: scale(0.9);
        transition-duration: 120ms;
        transition-timing-function: var(--silk-ease-out);
      }
      /* Invisible halo lifts the 30px button to a 42px touch target. */
      .dismiss::after {
        content: '';
        position: absolute;
        inset: -6px;
      }
      .dismiss:focus-visible {
        outline: 2px solid color-mix(in srgb, var(--silk-accent) 70%, transparent);
        outline-offset: 2px;
      }
      .dismiss ha-icon {
        --mdc-icon-size: 16px;
        pointer-events: none;
      }
      @keyframes silk-banner-in {
        from {
          opacity: 0;
          transform: translateY(-4px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    'silk-banner-card': SilkBannerCard;
  }
}
