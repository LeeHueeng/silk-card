import { LitElement, html, css, nothing, TemplateResult } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { HomeAssistant, LovelaceCardConfig } from '../types';
import { silkControlStyles } from '../shared/base';
import { haptic } from '../shared/service';
import { accentFor } from '../shared/color';
import { registerEditor } from '../shared/editor';

export const META = {
  type: 'silk-theme-card',
  name: 'Silk Theme',
  description: 'Light or dark, from the dashboard.',
};

export interface SilkThemeCardConfig extends LovelaceCardConfig {
  name?: string;
  /** The theme Light/Dark switch modes on. Default HA's `default`. */
  theme?: string;
  /** Name the themes yourself instead of Auto/Light/Dark. */
  themes?: string[];
}

/**
 * `hass.themes` and `hass.selectedTheme` exist at runtime but are not part of
 * Silk's minimal HomeAssistant type.
 */
interface HassWithThemes extends HomeAssistant {
  themes?: {
    /** Installed theme names, keyed by name. */
    themes?: Record<string, unknown>;
    /** Backend default theme — what `frontend.set_theme` last set. */
    default_theme?: string;
  };
}

interface Choice {
  /** Stored id: a mode ('auto'/'light'/'dark') or a theme name. */
  id: string;
  label: string;
}

const MODE_CHOICES: readonly Choice[] = [
  { id: 'auto', label: 'Auto' },
  { id: 'light', label: 'Light' },
  { id: 'dark', label: 'Dark' },
];

const DEFAULT_THEME = 'default';
const MAX_THEMES = 6;
const ICON = 'mdi:theme-light-dark';
const STORE_KEY = 'silk-theme-card:choice';

/**
 * Every theme card in this document shares one selection: `storage` events do
 * not fire in the tab that wrote them, so a tiny local bus keeps two cards on
 * the same dashboard from disagreeing.
 */
const LISTENERS = new Set<(choice: string) => void>();

function storeChoice(choice: string): void {
  try {
    window.localStorage.setItem(STORE_KEY, choice);
  } catch {
    // Private mode or a full quota — the switch still works, it just forgets.
  }
  for (const listener of LISTENERS) listener(choice);
}

function readChoice(): string | undefined {
  try {
    return window.localStorage.getItem(STORE_KEY) ?? undefined;
  } catch {
    return undefined;
  }
}

const EDITOR_TAG = 'silk-theme-card-editor';

// `themes` names its own chips, so it is a free list of theme names: no
// selector can enumerate them, but a repeatable text field still keeps the
// whole card reachable from the form.
registerEditor(
  EDITOR_TAG,
  [
    { name: 'name', selector: { text: {} } },
    { name: 'theme', selector: { theme: {} } },
    { name: 'themes', selector: { text: { multiple: true } } },
  ],
  {
    name: '이름',
    theme: '라이트/다크 전환 테마',
    themes: `테마 목록 (직접 지정, 최대 ${MAX_THEMES}개)`,
  }
);

/**
 * A theme switch on the dashboard, for the times the profile page is three
 * taps too far away.
 *
 * Caveat, and the reason the active chip is remembered locally: `frontend.
 * set_theme` sets Home Assistant's *backend* theme — it lands on everyone who
 * has not overridden the theme in their own profile — and nothing in `hass`
 * reports which of Auto/Light/Dark a given user is currently on
 * (`themes.default_theme` names the theme, never the mode). So the chip
 * reflects the last choice made from *this browser*, which is the honest
 * thing this card can know.
 */
@customElement('silk-theme-card')
export class SilkThemeCard extends LitElement {
  @property({ attribute: false }) public hass?: HomeAssistant;

  @state() private _config?: SilkThemeCardConfig;
  /** Selected chip id; empty until the first seed. */
  @state() private _choice = '';

  private _seeded = false;

  /** Another theme card (this document) or another tab changed the choice. */
  private readonly _onLocalChange = (choice: string): void => {
    if (this._choices().some((c) => c.id === choice)) this._choice = choice;
  };

  private readonly _onStorage = (ev: StorageEvent): void => {
    if (ev.key !== null && ev.key !== STORE_KEY) return;
    const stored = readChoice();
    if (stored && this._choices().some((c) => c.id === stored)) this._choice = stored;
  };

  public static getStubConfig(): Partial<SilkThemeCardConfig> {
    return { type: 'custom:silk-theme-card' };
  }

  public static async getConfigElement(): Promise<HTMLElement> {
    return document.createElement(EDITOR_TAG);
  }

  public setConfig(config: SilkThemeCardConfig): void {
    if (config.name !== undefined && typeof config.name !== 'string') {
      throw new Error('silk-theme-card: `name` must be a string');
    }
    if (config.theme !== undefined && (typeof config.theme !== 'string' || !config.theme)) {
      throw new Error('silk-theme-card: `theme` must be a theme name');
    }
    if (config.themes !== undefined) {
      if (
        !Array.isArray(config.themes) ||
        config.themes.length === 0 ||
        config.themes.some((t) => typeof t !== 'string' || t.trim() === '')
      ) {
        throw new Error('silk-theme-card: `themes` must be a list of theme names');
      }
      if (config.themes.length > MAX_THEMES) {
        throw new Error(
          `silk-theme-card: at most ${MAX_THEMES} \`themes\` — past that it stops reading as one control`
        );
      }
    }
    this._config = config;
    this._seeded = false;
    this._choice = '';
  }

  public getCardSize(): number {
    return 1;
  }

  public getGridOptions(): Record<string, number> {
    return { columns: 6, rows: 1, min_columns: 4, min_rows: 1 };
  }

  public connectedCallback(): void {
    super.connectedCallback();
    LISTENERS.add(this._onLocalChange);
    window.addEventListener('storage', this._onStorage);
    // A remount may land after another card moved the theme along.
    this._seeded = false;
  }

  public disconnectedCallback(): void {
    super.disconnectedCallback();
    LISTENERS.delete(this._onLocalChange);
    window.removeEventListener('storage', this._onStorage);
  }

  /** Seeding touches state, so it happens before the render, never inside it. */
  protected willUpdate(): void {
    if (this._config && this.hass) this._seed();
  }

  /** The chips this card offers: named themes, or the three modes. */
  private _choices(): readonly Choice[] {
    const themes = this._config?.themes;
    return themes && themes.length
      ? themes.map((name) => ({ id: name, label: name }))
      : MODE_CHOICES;
  }

  /**
   * The starting chip: this browser's last choice when it still exists, else
   * the backend's default theme (knowable only in the named-themes variant),
   * else the first chip.
   */
  private _seed(): void {
    if (this._seeded) return;
    this._seeded = true;
    const choices = this._choices();
    const stored = readChoice();
    if (stored && choices.some((c) => c.id === stored)) {
      this._choice = stored;
      return;
    }
    if (this._config?.themes?.length) {
      const backend = (this.hass as HassWithThemes | undefined)?.themes?.default_theme;
      if (backend && choices.some((c) => c.id === backend)) {
        this._choice = backend;
        return;
      }
    }
    this._choice = choices[0].id;
  }

  /** Installed themes; undefined when `hass` has not said yet. */
  private _installed(): Record<string, unknown> | undefined {
    return (this.hass as HassWithThemes | undefined)?.themes?.themes;
  }

  /** A named theme HA does not have cannot be applied. */
  private _missing(choice: Choice): boolean {
    if (!this._config?.themes?.length) return false;
    const installed = this._installed();
    return installed !== undefined && !(choice.id in installed);
  }

  /**
   * Light/Dark carry the mode; Auto hands the theme over with no mode at all,
   * which is what leaves Home Assistant following the system preference.
   */
  private _serviceData(choice: string): Record<string, unknown> {
    if (this._config?.themes?.length) return { name: choice };
    const name = this._config?.theme ?? DEFAULT_THEME;
    return choice === 'auto' ? { name } : { name, mode: choice };
  }

  private _onChipClick(ev: Event, choice: Choice): void {
    ev.stopPropagation();
    const hass = this.hass;
    if (!hass || this._missing(choice) || choice.id === this._choice) return;
    haptic(this, 'selection');
    const previous = this._choice;
    // Optimistic: the chip moves now, and moves back if HA refuses.
    this._choice = choice.id;
    storeChoice(choice.id);
    hass.callService('frontend', 'set_theme', this._serviceData(choice.id)).catch((err) => {
      console.warn('silk-theme-card: set_theme failed', err);
      this._choice = previous;
      if (previous) storeChoice(previous);
    });
  }

  protected render(): TemplateResult | typeof nothing {
    const config = this._config;
    const hass = this.hass;
    if (!config || !hass) return nothing;

    const choices = this._choices();
    const active = choices.find((c) => c.id === this._choice);
    const name = config.name ?? 'Theme';

    return html`
      <ha-card class="control" style="--silk-accent:${accentFor(undefined)}">
        <div class="icon on"><ha-icon .icon=${ICON}></ha-icon></div>
        <div class="info">
          <div class="name" title=${name}>${name}</div>
          <div class="state">${active ? active.label : '—'}</div>
        </div>
        <div class="trailing">
          <div class="seg" role="radiogroup" aria-label=${name}>
            ${choices.map((choice) => {
              const selected = choice.id === this._choice;
              const missing = this._missing(choice);
              return html`
                <button
                  class="chip opt ${selected ? 'active' : ''} ${missing ? 'gone' : ''}"
                  role="radio"
                  aria-checked=${selected ? 'true' : 'false'}
                  .disabled=${missing}
                  title=${missing ? `${choice.label} is not installed` : choice.label}
                  @click=${(ev: Event) => this._onChipClick(ev, choice)}
                >
                  ${choice.label}
                </button>
              `;
            })}
          </div>
        </div>
      </ha-card>
    `;
  }

  static styles = [
    silkControlStyles,
    css`
      ha-card {
        cursor: default;
      }
      /* The icon is a label, not a control. */
      .icon {
        cursor: default;
      }
      .icon:active {
        transform: none;
      }
      .info {
        flex: 0 1 auto;
      }
      .trailing {
        flex: 0 1 auto;
        min-width: 0;
      }
      /* One track, three seats: the selection reads as a filled seat inside a
         single control rather than three loose buttons. */
      .seg {
        display: flex;
        align-items: center;
        gap: 2px;
        min-width: 0;
        padding: 2px;
        border-radius: 999px;
        background: rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.06);
      }
      .opt {
        position: relative;
        flex: 0 1 auto;
        min-width: 0;
        height: 28px;
        padding: 0 11px;
        background: none;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        transition:
          transform 250ms var(--silk-spring),
          background 200ms ease,
          color 200ms ease;
      }
      .opt:hover {
        background: rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.08);
      }
      .opt.active {
        color: var(--silk-accent);
        background: color-mix(in srgb, var(--silk-accent) 18%, transparent);
      }
      .opt:active {
        transform: scale(0.94);
        transition-duration: 120ms;
        transition-timing-function: var(--silk-ease-out);
      }
      /* Invisible halo lifts each seat to a 40px touch target. */
      .opt::after {
        content: '';
        position: absolute;
        inset: -6px -1px;
        border-radius: 999px;
      }
      .opt:focus-visible {
        outline: 2px solid color-mix(in srgb, var(--silk-accent) 70%, transparent);
        outline-offset: 1px;
      }
      .opt.gone {
        opacity: 0.45;
        cursor: default;
      }
      .opt.gone:hover {
        background: none;
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    'silk-theme-card': SilkThemeCard;
  }
}
