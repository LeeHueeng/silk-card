import { LitElement, html, css, nothing, TemplateResult } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { HomeAssistant, LovelaceCardConfig } from '../types';
import { silkControlStyles } from '../shared/base';
import { domainOf, isUnavailable, moreInfo, haptic } from '../shared/service';
import { accentFor } from '../shared/color';
import { registerEditor } from '../shared/editor';

export const META = {
  type: 'silk-say-card',
  name: 'Silk Say',
  description: 'Type it, the house says it.',
};

export interface SilkSayCardConfig extends LovelaceCardConfig {
  /** The media_player the speech comes out of. */
  entity: string;
  /**
   * A `tts.*` entity id (modern `tts.speak`) or a legacy platform name such as
   * `google_translate` (calls `tts.<platform>_say`). Defaults to the first
   * `tts.*` entity in the state machine.
   */
  engine?: string;
  name?: string;
  icon?: string;
  color?: string;
  /** Quick phrases; tapping one speaks it immediately. */
  presets?: string[];
  language?: string;
}

const DEFAULT_NAME = 'Say';
const DEFAULT_ICON = 'mdi:message-text';
/** How long a failed call keeps its message on screen. */
const ERROR_MS = 4000;
/** Accent surface wash after a dispatched phrase. */
const WASH_MS = 400;

const EDITOR_TAG = 'silk-say-card-editor';

registerEditor(
  EDITOR_TAG,
  [
    { name: 'entity', required: true, selector: { entity: { domain: ['media_player'] } } },
    { name: 'name', selector: { text: {} } },
    {
      name: '',
      type: 'grid',
      schema: [
        // Free text, not an entity picker: `engine` accepts both a tts.* entity
        // id and a legacy platform name, and must round-trip either untouched.
        { name: 'engine', selector: { text: {} } },
        { name: 'language', selector: { text: {} } },
      ],
    },
  ],
  {
    entity: 'Speaker',
    name: 'Name',
    engine: 'TTS engine',
    language: 'Language',
  }
);

/** Configured engine, else the first `tts.*` entity the instance exposes. */
function resolveEngine(hass: HomeAssistant, configured?: string): string | undefined {
  const explicit = configured?.trim();
  if (explicit) return explicit;
  return Object.keys(hass.states).find((id) => id.startsWith('tts.'));
}

/** Best human-readable line out of whatever a rejected service call threw. */
function errorText(err: unknown): string {
  if (typeof err === 'string' && err) return err;
  if (err && typeof err === 'object') {
    const message = (err as { message?: unknown }).message;
    if (typeof message === 'string' && message) return message;
  }
  return 'Speech failed';
}

@customElement('silk-say-card')
export class SilkSayCard extends LitElement {
  @property({ attribute: false }) public hass?: HomeAssistant;

  @state() private _config?: SilkSayCardConfig;
  /** The text in the field; the field is fully controlled by this. */
  @state() private _draft = '';
  /** Non-null while a failure message is on screen. */
  @state() private _error: string | null = null;

  private _errorTimer?: number;

  public static getStubConfig(hass: HomeAssistant): Partial<SilkSayCardConfig> {
    const entity = Object.keys(hass.states).find((id) => id.startsWith('media_player.'));
    return { type: 'custom:silk-say-card', entity };
  }

  public static async getConfigElement(): Promise<HTMLElement> {
    return document.createElement(EDITOR_TAG);
  }

  public setConfig(config: SilkSayCardConfig): void {
    if (!config.entity || domainOf(config.entity) !== 'media_player') {
      throw new Error('silk-say-card: `entity` must be a media_player (the speaker to talk through)');
    }
    if (
      config.presets !== undefined &&
      (!Array.isArray(config.presets) || config.presets.some((p) => typeof p !== 'string'))
    ) {
      throw new Error('silk-say-card: `presets` must be a list of phrases');
    }
    this._config = config;
    this._clearError();
  }

  public getCardSize(): number {
    return this._config?.presets?.length ? 3 : 2;
  }

  public getGridOptions(): Record<string, number> {
    return { columns: 6, rows: 2, min_columns: 4, min_rows: 1 };
  }

  public disconnectedCallback(): void {
    super.disconnectedCallback();
    window.clearTimeout(this._errorTimer);
    this._errorTimer = undefined;
  }

  private _clearError(): void {
    window.clearTimeout(this._errorTimer);
    this._errorTimer = undefined;
    this._error = null;
  }

  private _fail(message: string): void {
    haptic(this, 'failure');
    this._error = message;
    window.clearTimeout(this._errorTimer);
    this._errorTimer = window.setTimeout(() => {
      this._errorTimer = undefined;
      this._error = null;
    }, ERROR_MS);
  }

  /** One 400ms accent wash over the card surface — never a glow. */
  private _wash(): void {
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
    const el = this.renderRoot.querySelector('.wash') as HTMLElement | null;
    // Web Animations rather than a class toggle: re-firing mid-flight restarts
    // cleanly, which a CSS animation on a persistent element cannot do.
    el?.animate([{ opacity: 1 }, { opacity: 0 }], {
      duration: WASH_MS,
      easing: 'cubic-bezier(0.23, 1, 0.32, 1)',
    });
  }

  private async _speak(raw: string): Promise<void> {
    const hass = this.hass;
    const config = this._config;
    if (!hass || !config) return;
    const message = raw.trim();
    if (!message) return;
    const stateObj = hass.states[config.entity];
    if (!stateObj || isUnavailable(stateObj)) return;

    const engine = resolveEngine(hass, config.engine);
    if (!engine) {
      this._fail('No TTS engine found — set `engine` in the card config');
      return;
    }

    // Optimistic: the field empties and the card washes accent the instant the
    // call is dispatched. A rejection puts the words back, so nothing is lost.
    const restore = this._draft;
    this._clearError();
    this._draft = '';
    haptic(this, 'success');
    this._wash();

    const language = config.language ? { language: config.language } : {};
    try {
      // A `tts.*` entity id means the modern speak service; anything else is
      // read as a platform name (`google_translate` → `tts.google_translate_say`).
      if (engine.startsWith('tts.')) {
        await hass.callService('tts', 'speak', {
          entity_id: engine,
          media_player_entity_id: config.entity,
          message,
          ...language,
        });
      } else {
        // Legacy per-platform service, still shipped by older integrations.
        await hass.callService('tts', `${engine}_say`, {
          entity_id: config.entity,
          message,
          ...language,
        });
      }
    } catch (err) {
      if (!this._draft) this._draft = restore; // only if nothing new was typed
      this._fail(errorText(err));
    }
  }

  private _onCardClick(): void {
    if (this._config) moreInfo(this, this._config.entity);
  }

  private _onInput(ev: Event): void {
    this._draft = (ev.target as HTMLInputElement).value;
    if (this._error) this._clearError();
  }

  private _onKeydown(ev: KeyboardEvent): void {
    // HA binds single-letter dashboard shortcuts on the document; a composed
    // keydown from inside this shadow root would trip them while typing.
    ev.stopPropagation();
    if (ev.key !== 'Enter') return;
    ev.preventDefault();
    void this._speak(this._draft);
  }

  private _onSend(ev: Event): void {
    ev.stopPropagation();
    void this._speak(this._draft);
  }

  private _onPreset(ev: Event, phrase: string): void {
    ev.stopPropagation();
    void this._speak(phrase);
  }

  private _stop(ev: Event): void {
    ev.stopPropagation();
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
    const accent = accentFor(stateObj, config.color);
    const name = config.name ?? DEFAULT_NAME;
    const target = (stateObj.attributes.friendly_name as string | undefined) ?? config.entity;
    const armed = this._draft.trim().length > 0 && !unavailable;
    const presets = config.presets ?? [];

    return html`
      <ha-card
        class="control ${unavailable ? 'unavailable' : ''}"
        style="--silk-accent:${accent}"
        @click=${this._onCardClick}
      >
        <div class="wash" aria-hidden="true"></div>
        <div class="head">
          <div class="icon ${armed ? 'on' : ''}">
            <ha-icon .icon=${config.icon ?? DEFAULT_ICON}></ha-icon>
          </div>
          <div class="info">
            <div class="name">${name}</div>
            <div class="state">
              <span>${target}</span>
              ${config.language
                ? html`<span class="sep">·</span><span>${config.language}</span>`
                : nothing}
            </div>
          </div>
        </div>

        <div class="compose" @click=${this._stop}>
          <input
            class="field"
            type="text"
            autocomplete="off"
            enterkeyhint="send"
            placeholder="Say something…"
            aria-label=${`Message to speak on ${target}`}
            .value=${this._draft}
            .disabled=${unavailable}
            @input=${this._onInput}
            @keydown=${this._onKeydown}
          />
          <button
            class="send ${armed ? 'armed' : ''}"
            aria-label="Speak"
            .disabled=${!armed}
            @click=${this._onSend}
          >
            <ha-icon icon="mdi:send"></ha-icon>
          </button>
        </div>

        ${presets.length
          ? html`
              <div class="presets" @click=${this._stop}>
                ${presets.map(
                  (phrase) => html`
                    <button
                      class="chip"
                      title=${phrase}
                      .disabled=${unavailable}
                      @click=${(ev: Event) => this._onPreset(ev, phrase)}
                    >
                      ${phrase}
                    </button>
                  `
                )}
              </div>
            `
          : nothing}
        ${this._error
          ? html`<div class="error" role="alert" title=${this._error}>${this._error}</div>`
          : nothing}
      </ha-card>
    `;
  }

  static styles = [
    silkControlStyles,
    css`
      /* Compose surface: it grows past its grid allotment rather than clipping
         the field or the preset row. */
      ha-card {
        flex-direction: column;
        align-items: stretch;
        justify-content: center;
        gap: 8px;
        height: auto;
        min-height: 100%;
      }
      .head {
        flex: none;
        display: flex;
        align-items: center;
        gap: 12px;
        min-width: 0;
      }
      /* The header icon is an indicator, not a control — the send button is. */
      .icon {
        cursor: pointer;
      }
      .icon:active {
        transform: none;
      }
      .wash {
        position: absolute;
        inset: 0;
        z-index: 0;
        opacity: 0;
        pointer-events: none;
        background: color-mix(in srgb, var(--silk-accent) 18%, transparent);
      }
      .compose {
        flex: none;
        position: relative;
        z-index: 1;
        display: flex;
        align-items: center;
        gap: 8px;
        min-width: 0;
        cursor: default;
      }
      .field {
        flex: 1;
        min-width: 0;
        height: 38px;
        box-sizing: border-box;
        border: none;
        border-radius: 12px;
        padding: 0 12px;
        font: inherit;
        font-size: 13.5px;
        color: var(--primary-text-color);
        background: rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.06);
        outline: none;
        text-overflow: ellipsis;
        transition: box-shadow 200ms ease;
      }
      .field::placeholder {
        color: var(--secondary-text-color);
        opacity: 0.85;
      }
      .field:focus {
        box-shadow: inset 0 0 0 2px color-mix(in srgb, var(--silk-accent) 55%, transparent);
      }
      .field:disabled {
        cursor: default;
      }
      .send {
        flex: none;
        position: relative;
        width: 38px;
        height: 38px;
        border: none;
        border-radius: 12px;
        display: grid;
        place-items: center;
        padding: 0;
        cursor: pointer;
        color: var(--secondary-text-color);
        background: rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.06);
        transition:
          transform 250ms var(--silk-spring),
          background 200ms ease,
          color 200ms ease;
      }
      .send:active:not(:disabled) {
        transform: scale(0.9);
        transition-duration: 120ms;
        transition-timing-function: var(--silk-ease-out);
      }
      /* Invisible halo lifts the 38px button past the 40px touch floor. */
      .send::after {
        content: '';
        position: absolute;
        inset: -3px;
        border-radius: 14px;
      }
      .send.armed {
        color: var(--silk-accent);
        background: color-mix(in srgb, var(--silk-accent) 20%, transparent);
      }
      .send:disabled {
        cursor: default;
      }
      .send:focus-visible {
        outline: 2px solid color-mix(in srgb, var(--silk-accent) 70%, transparent);
        outline-offset: 2px;
      }
      .send ha-icon {
        --mdc-icon-size: 19px;
        pointer-events: none;
      }
      .presets {
        flex: none;
        position: relative;
        z-index: 1;
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
        cursor: default;
      }
      .chip {
        position: relative;
        max-width: 100%;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      /* Invisible halo lifts the chip toward the 36px secondary-target floor. */
      .chip::after {
        content: '';
        position: absolute;
        inset: -6px;
        border-radius: 999px;
      }
      .chip:focus-visible {
        outline: 2px solid color-mix(in srgb, var(--silk-accent) 70%, transparent);
        outline-offset: 2px;
      }
      .chip:disabled {
        cursor: default;
      }
      .error {
        flex: none;
        position: relative;
        z-index: 1;
        font-size: 12px;
        line-height: 1.3;
        color: var(--error-color, #db4437);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .unavailable .compose,
      .unavailable .presets {
        opacity: 0.45;
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    'silk-say-card': SilkSayCard;
  }
}
