import { LitElement, html, css, nothing, PropertyValues, TemplateResult } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { HomeAssistant, HassEntity, LovelaceCardConfig } from '../types';
import { silkControlStyles } from '../shared/base';
import { domainOf, isUnavailable, moreInfo, haptic, stateText } from '../shared/service';
import { accentFor } from '../shared/color';
import { registerEditor } from '../shared/editor';

export const META = {
  type: 'silk-text-card',
  name: 'Silk Text',
  description: 'Type it, store it.',
};

export interface SilkTextCardConfig extends LovelaceCardConfig {
  entity: string;
  name?: string;
  icon?: string;
  placeholder?: string;
}

/** `input_text` and `text` share the same attributes and the same set_value. */
const SUPPORTED_DOMAINS = ['input_text', 'text'];

/** The success chip lingers just long enough to be read, then leaves. */
const SAVED_MS = 1200;
/** Optimistic value ceiling, matching the rest of the suite. */
const OPTIMISTIC_HOLD_MS = 2000;

const EDITOR_TAG = 'silk-text-card-editor';

registerEditor(
  EDITOR_TAG,
  [
    { name: 'entity', required: true, selector: { entity: { domain: SUPPORTED_DOMAINS } } },
    { name: 'name', selector: { text: {} } },
    {
      name: '',
      type: 'grid',
      schema: [
        { name: 'icon', selector: { icon: {} } },
        { name: 'placeholder', selector: { text: {} } },
      ],
    },
  ],
  { entity: 'Entity', name: 'Name', icon: 'Icon', placeholder: 'Placeholder' }
);

/** `min`/`max` on a text entity are *lengths*, not values. */
function asLength(value: unknown): number | undefined {
  if (value === null || value === undefined || value === '') return undefined;
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? Math.floor(n) : undefined;
}

@customElement('silk-text-card')
export class SilkTextCard extends LitElement {
  @property({ attribute: false }) public hass?: HomeAssistant;

  @state() private _config?: SilkTextCardConfig;

  /** What the user has typed since the last sync; null = mirror the entity. */
  @state() private _draft: string | null = null;

  /** Value shown while the service call is in flight; undefined = trust HA. */
  @state() private _pending?: string;

  @state() private _error: string | null = null;
  @state() private _saved = false;
  @state() private _focused = false;

  private _pendingBase = '';
  private _holdTimer?: number;
  private _savedTimer?: number;

  public static getStubConfig(hass: HomeAssistant): Partial<SilkTextCardConfig> {
    const ids = Object.keys(hass.states);
    const entity =
      ids.find((id) => id.startsWith('input_text.')) ?? ids.find((id) => id.startsWith('text.'));
    return { type: 'custom:silk-text-card', entity };
  }

  public static async getConfigElement(): Promise<HTMLElement> {
    return document.createElement(EDITOR_TAG);
  }

  public setConfig(config: SilkTextCardConfig): void {
    if (!config.entity) {
      throw new Error('silk-text-card: `entity` is required');
    }
    if (!SUPPORTED_DOMAINS.includes(domainOf(config.entity))) {
      throw new Error('silk-text-card: `entity` must be an input_text or text entity');
    }
    this._config = config;
    this._draft = null;
    this._error = null;
    this._clearPending();
  }

  public getCardSize(): number {
    return 1;
  }

  public getGridOptions(): Record<string, number> {
    return { columns: 6, rows: 1, min_columns: 4, min_rows: 1 };
  }

  public disconnectedCallback(): void {
    super.disconnectedCallback();
    window.clearTimeout(this._holdTimer);
    window.clearTimeout(this._savedTimer);
    this._holdTimer = undefined;
    this._savedTimer = undefined;
  }

  protected willUpdate(changed: PropertyValues): void {
    if (!changed.has('hass') || !this._config || this._pending === undefined) return;
    const stateObj = this.hass?.states[this._config.entity];
    // The real value moved: the confirmation landed, drop the override.
    if (stateObj && stateObj.last_updated !== this._pendingBase) this._clearPending();
  }

  private _clearPending(): void {
    window.clearTimeout(this._holdTimer);
    this._holdTimer = undefined;
    this._pending = undefined;
  }

  /** The stored string; 'unknown' means never written, which reads as empty. */
  private _stored(stateObj: HassEntity): string {
    const raw = stateObj.state;
    return raw === 'unknown' || raw === 'unavailable' ? '' : raw;
  }

  /** The string the field is showing right now. */
  private _shown(stateObj: HassEntity): string {
    return this._draft ?? this._pending ?? this._stored(stateObj);
  }

  private _validate(value: string, stateObj: HassEntity): string | null {
    const attrs = stateObj.attributes;
    const min = asLength(attrs.min);
    const max = asLength(attrs.max);
    if (min !== undefined && value.length < min) {
      return min === 1 ? 'Cannot be empty' : `At least ${min} characters`;
    }
    if (max !== undefined && value.length > max) return `At most ${max} characters`;
    const pattern = typeof attrs.pattern === 'string' ? attrs.pattern.trim() : '';
    if (pattern) {
      let re: RegExp | undefined;
      try {
        // HTML `pattern` semantics: the whole value must match. A pattern the
        // integration got wrong must not block editing, so it is skipped.
        re = new RegExp(`^(?:${pattern})$`);
      } catch {
        re = undefined;
      }
      if (re && !re.test(value)) return 'Does not match the required format';
    }
    return null;
  }

  private _onCardClick(): void {
    if (this._config) moreInfo(this, this._config.entity);
  }

  private _stopClick(ev: Event): void {
    // Touching the field must not open more-info behind the keyboard.
    ev.stopPropagation();
  }

  private _onInput(ev: Event): void {
    ev.stopPropagation();
    this._draft = (ev.target as HTMLInputElement).value;
    // Errors are raised on commit, but they clear the instant they are fixed —
    // nagging while someone is still typing helps nobody.
    if (!this._error) return;
    const stateObj = this._config ? this.hass?.states[this._config.entity] : undefined;
    if (stateObj && !this._validate(this._draft, stateObj)) this._error = null;
  }

  private _onKeyDown(ev: KeyboardEvent): void {
    ev.stopPropagation();
    if (ev.key === 'Enter') {
      ev.preventDefault();
      this._commit();
    } else if (ev.key === 'Escape') {
      ev.preventDefault();
      this._draft = null;
      this._error = null;
      (ev.target as HTMLInputElement).blur();
    }
  }

  private _onFocus(): void {
    this._focused = true;
  }

  private _onBlur(): void {
    this._focused = false;
    this._commit();
  }

  private _commit(): void {
    const config = this._config;
    const hass = this.hass;
    if (!config || !hass) return;
    const stateObj = hass.states[config.entity];
    if (!stateObj || stateObj.state === 'unavailable') return;
    const draft = this._draft;
    if (draft === null) return; // nothing typed since the last sync
    const current = this._pending ?? this._stored(stateObj);
    if (draft === current) {
      // Unchanged — no service call, and no check chip pretending there was one.
      this._draft = null;
      this._error = null;
      return;
    }
    const invalid = this._validate(draft, stateObj);
    if (invalid) {
      this._error = invalid;
      return;
    }

    this._error = null;
    this._draft = null;
    this._pending = draft;
    this._pendingBase = stateObj.last_updated;
    window.clearTimeout(this._holdTimer);
    this._holdTimer = window.setTimeout(() => this._clearPending(), OPTIMISTIC_HOLD_MS);
    haptic(this, 'success');
    this._flashSaved();
    Promise.resolve(
      hass.callService(domainOf(config.entity), 'set_value', {
        entity_id: config.entity,
        value: draft,
      })
    ).catch((err) => {
      console.warn('silk-text-card: set_value failed', err);
      this._clearPending();
      this._draft = draft;
      this._error = 'Could not save';
    });
  }

  private _flashSaved(): void {
    this._saved = true;
    window.clearTimeout(this._savedTimer);
    this._savedTimer = window.setTimeout(() => {
      this._savedTimer = undefined;
      this._saved = false;
    }, SAVED_MS);
  }

  /**
   * Second line, in priority order: what is broken, what is unsaved, what the
   * rules are (only once the field has focus — a resting card stays quiet).
   */
  private _secondLine(
    stateObj: HassEntity,
    unavailable: boolean,
    dirty: boolean,
    shown: string
  ): TemplateResult | string | typeof nothing {
    if (unavailable) return stateText(this.hass, stateObj);
    if (this._error) return this._error;
    const max = asLength(stateObj.attributes.max);
    if (dirty) {
      return max === undefined
        ? 'Press Enter to save'
        : html`Press Enter to save<span class="sep">·</span
            ><span class="count">${shown.length}/${max}</span>`;
    }
    if (this._focused) {
      const min = asLength(stateObj.attributes.min);
      if (min && max !== undefined) return `${min}–${max} characters`;
      if (min) return `At least ${min} characters`;
      if (max !== undefined) return `Up to ${max} characters`;
      return nothing;
    }
    return shown ? nothing : 'Not set';
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

    // `isUnavailable()` folds 'unknown' in with 'unavailable', but a text helper
    // that has never been written to rests at 'unknown' and is perfectly
    // editable — so only a genuinely unavailable entity locks the field.
    const unavailable = isUnavailable(stateObj) && stateObj.state !== 'unknown';
    const accent = accentFor(stateObj);
    const name = config.name ?? stateObj.attributes.friendly_name ?? config.entity;
    const shown = this._shown(stateObj);
    // Dirty against the same baseline `_commit` uses, so the hint never
    // promises a save that would turn out to be a no-op.
    const dirty = this._draft !== null && this._draft !== (this._pending ?? this._stored(stateObj));
    const password = stateObj.attributes.mode === 'password';
    const second = this._secondLine(stateObj, unavailable, dirty, shown);

    return html`
      <ha-card
        class="control ${unavailable ? 'unavailable' : ''}"
        style="--silk-accent:${accent}"
        @click=${this._onCardClick}
      >
        <div class="icon ${!unavailable && shown ? 'on' : ''}">
          ${config.icon
            ? html`<ha-icon .icon=${config.icon}></ha-icon>`
            : html`<ha-state-icon .hass=${hass} .stateObj=${stateObj}></ha-state-icon>`}
        </div>
        <div class="info">
          <div class="name" title=${name}>${name}</div>
          ${second === nothing
            ? nothing
            : html`<div class="state ${this._error ? 'bad' : ''}">${second}</div>`}
        </div>
        <div class="trailing">
          <span class="saved ${this._saved ? 'show' : ''}" role="status" title="Saved">
            <ha-icon icon="mdi:check"></ha-icon>
          </span>
          <input
            class="field ${this._error ? 'bad' : ''}"
            type=${password ? 'password' : 'text'}
            .value=${shown}
            .placeholder=${config.placeholder ?? ''}
            ?disabled=${unavailable}
            autocomplete="off"
            autocapitalize="off"
            spellcheck="false"
            enterkeyhint="done"
            aria-label=${name}
            aria-invalid=${this._error ? 'true' : 'false'}
            title=${this._error ?? (password ? '' : shown)}
            @click=${this._stopClick}
            @input=${this._onInput}
            @keydown=${this._onKeyDown}
            @focus=${this._onFocus}
            @blur=${this._onBlur}
          />
        </div>
      </ha-card>
    `;
  }

  static styles = [
    silkControlStyles,
    css`
      /* No control action on the icon: it presses with the card. */
      .icon {
        cursor: inherit;
      }
      .icon:active {
        transform: none;
      }
      .info {
        flex: 1 1 auto;
      }
      .state.bad {
        font-size: 11px;
        color: var(--error-color, #db4437);
      }
      .count {
        font-variant-numeric: tabular-nums;
      }
      .trailing {
        flex: 1 1 auto;
        min-width: 0;
        justify-content: flex-end;
        gap: 6px;
      }
      .field {
        flex: 1 1 auto;
        width: 100%;
        max-width: 200px;
        min-width: 0;
        box-sizing: border-box;
        appearance: none;
        -webkit-appearance: none;
        border: none;
        outline: none;
        height: 36px;
        padding: 0 10px;
        border-radius: 10px;
        font: inherit;
        font-size: 13px;
        font-weight: 500;
        color: var(--primary-text-color);
        background: rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.06);
        text-overflow: ellipsis;
        transition:
          box-shadow 150ms var(--silk-ease-out),
          background 200ms ease;
      }
      .field:hover:not(:disabled) {
        background: rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.12);
      }
      .field:focus {
        box-shadow: inset 0 0 0 2px color-mix(in srgb, var(--silk-accent) 70%, transparent);
      }
      /* The outline is the error, so it outranks focus. */
      .field.bad,
      .field.bad:focus {
        box-shadow: inset 0 0 0 2px color-mix(in srgb, var(--error-color, #db4437) 70%, transparent);
      }
      .field::placeholder {
        color: var(--secondary-text-color);
        opacity: 0.7;
      }
      .field:disabled {
        cursor: default;
      }
      /*
       * The chip keeps its 22px slot at all times — showing it must never
       * reflow the row, so only opacity and transform ever move.
       */
      .saved {
        flex: none;
        width: 22px;
        height: 22px;
        display: grid;
        place-items: center;
        border-radius: 50%;
        color: var(--silk-accent);
        background: color-mix(in srgb, var(--silk-accent) 18%, transparent);
        opacity: 0;
        transform: scale(0.8);
        transition:
          opacity 200ms var(--silk-ease-out),
          transform 250ms var(--silk-spring);
        pointer-events: none;
      }
      .saved.show {
        opacity: 1;
        transform: scale(1);
      }
      .saved ha-icon {
        --mdc-icon-size: 14px;
      }
      .unavailable .field {
        pointer-events: none;
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    'silk-text-card': SilkTextCard;
  }
}
