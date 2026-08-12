import { LitElement, html, css, nothing, TemplateResult } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { HomeAssistant, LovelaceCardConfig } from '../types';
import { silkControlStyles } from '../shared/base';
import { haptic } from '../shared/service';
import { registerEditor } from '../shared/editor';

export const META = {
  type: 'silk-keypad-card',
  name: 'Silk Keypad',
  description: 'A PIN pad for anything that takes a code.',
};

/** What submitting the code calls: `service` is `domain.service` shorthand. */
export interface KeypadAction {
  service: string;
  data?: Record<string, unknown>;
}

export interface KeypadCardConfig extends LovelaceCardConfig {
  action: KeypadAction;
  title?: string;
  /** When set, the pad auto-submits as soon as this many digits are entered. */
  code_length?: number;
}

const EDITOR_TAG = 'silk-keypad-card-editor';

registerEditor(EDITOR_TAG, [{ name: 'title', selector: { text: {} } }], { title: 'Title' });

/** Keypad layout: 1-9, then backspace / 0 / submit. */
const KEYS: ReadonlyArray<{ k: string; label: string; icon?: string }> = [
  { k: '1', label: '1' },
  { k: '2', label: '2' },
  { k: '3', label: '3' },
  { k: '4', label: '4' },
  { k: '5', label: '5' },
  { k: '6', label: '6' },
  { k: '7', label: '7' },
  { k: '8', label: '8' },
  { k: '9', label: '9' },
  { k: 'back', label: 'Delete', icon: 'mdi:backspace-outline' },
  { k: '0', label: '0' },
  { k: 'submit', label: 'Submit', icon: 'mdi:check' },
];

/** Free-length codes cap here so the readout can never overflow absurdly. */
const MAX_CODE_LENGTH = 16;
const ERROR_FLASH_MS = 700;

@customElement('silk-keypad-card')
export class SilkKeypadCard extends LitElement {
  @property({ attribute: false }) public hass?: HomeAssistant;

  @state() private _config?: KeypadCardConfig;
  @state() private _code = '';

  /** True while the readout flashes error-color after a rejected call. */
  @state() private _flash = false;

  /** Length of the rejected code, so the flash has dots to color. */
  @state() private _flashLen = 0;

  private _flashTimer?: number;

  public static getStubConfig(): Partial<KeypadCardConfig> {
    return { type: 'custom:silk-keypad-card', action: { service: 'script.turn_on' } };
  }

  public static async getConfigElement(): Promise<HTMLElement> {
    return document.createElement(EDITOR_TAG);
  }

  public setConfig(config: KeypadCardConfig): void {
    const service = config.action?.service;
    if (typeof service !== 'string' || service.indexOf('.') < 1) {
      throw new Error(
        "silk-keypad-card: `action` is required, e.g. {service: 'alarm_control_panel.alarm_disarm', data: {...}}"
      );
    }
    if (
      config.code_length !== undefined &&
      (!Number.isInteger(config.code_length) || config.code_length < 1)
    ) {
      throw new Error('silk-keypad-card: `code_length` must be a positive integer');
    }
    this._config = config;
    this._code = '';
    this._clearFlash();
  }

  public getCardSize(): number {
    return 4;
  }

  public getGridOptions(): Record<string, number> {
    return { columns: 4, rows: 4, min_columns: 3, min_rows: 4 };
  }

  public disconnectedCallback(): void {
    super.disconnectedCallback();
    window.clearTimeout(this._flashTimer);
    this._flashTimer = undefined;
  }

  private _clearFlash(): void {
    window.clearTimeout(this._flashTimer);
    this._flashTimer = undefined;
    this._flash = false;
  }

  private _maxLength(): number {
    return this._config?.code_length ?? MAX_CODE_LENGTH;
  }

  private _append(digit: string): void {
    if (this._code.length >= this._maxLength()) return;
    this._clearFlash();
    haptic(this, 'selection');
    this._code = this._code + digit;
    if (this._config?.code_length !== undefined && this._code.length === this._config.code_length) {
      this._submit();
    }
  }

  private _backspace(): void {
    this._clearFlash();
    if (!this._code) return;
    haptic(this, 'selection');
    this._code = this._code.slice(0, -1);
  }

  private _submit(): void {
    const hass = this.hass;
    const config = this._config;
    const code = this._code;
    if (!hass || !config || !code) return;
    const dot = config.action.service.indexOf('.');
    const domain = config.action.service.slice(0, dot);
    const service = config.action.service.slice(dot + 1);
    haptic(this, 'success');
    this._clearFlash();
    const length = code.length;
    this._code = '';
    // No shake on failure — motion restraint — just a brief error-color flash.
    Promise.resolve(hass.callService(domain, service, { ...(config.action.data ?? {}), code }))
      .catch(() => this._rejected(length));
  }

  private _rejected(length: number): void {
    haptic(this, 'failure');
    this._flashLen = length;
    this._flash = true;
    window.clearTimeout(this._flashTimer);
    this._flashTimer = window.setTimeout(() => {
      this._flashTimer = undefined;
      this._flash = false;
    }, ERROR_FLASH_MS);
  }

  private _onKeyTap(ev: Event): void {
    ev.stopPropagation();
    const key = (ev.currentTarget as HTMLButtonElement).dataset.key;
    if (!key) return;
    if (key === 'back') this._backspace();
    else if (key === 'submit') this._submit();
    else this._append(key);
  }

  /** Physical keyboard entry; Enter/Space stay with the focused button. */
  private _onKeydown(ev: KeyboardEvent): void {
    if (/^[0-9]$/.test(ev.key)) {
      ev.preventDefault();
      this._append(ev.key);
    } else if (ev.key === 'Backspace') {
      ev.preventDefault();
      this._backspace();
    }
  }

  private _renderReadout(): TemplateResult {
    const filled = this._code.length;
    const flashing = this._flash && filled === 0;
    // Fixed-length pads always show every slot; free-length pads show what's
    // typed (or the rejected code's silhouette while the error flashes).
    const slots = this._config?.code_length ?? (flashing ? this._flashLen : filled);
    const label = filled
      ? `${filled} digit${filled === 1 ? '' : 's'} entered`
      : flashing
        ? 'Code rejected'
        : 'No code entered';
    return html`
      <div class="dots ${this._flash ? 'error' : ''}" role="status" aria-label=${label}>
        ${slots === 0
          ? html`<span class="hint">Enter code</span>`
          : Array.from(
              { length: slots },
              (_, i) => html`<span class="slot ${i < filled ? 'filled' : 'hollow'}"></span>`
            )}
      </div>
    `;
  }

  protected render(): TemplateResult | typeof nothing {
    const config = this._config;
    if (!config) return nothing;
    const hasCode = this._code.length > 0;

    return html`
      <ha-card class="control" @keydown=${this._onKeydown}>
        ${config.title ? html`<div class="title">${config.title}</div>` : nothing}
        ${this._renderReadout()}
        <div class="keys">
          ${KEYS.map(
            (key) => html`
              <button
                class="key ${key.k === 'submit' ? 'submit' : key.icon ? 'aux' : ''}"
                data-key=${key.k}
                aria-label=${key.label}
                ?disabled=${key.k === 'submit' && !hasCode}
                @click=${this._onKeyTap}
              >
                ${key.icon ? html`<ha-icon .icon=${key.icon}></ha-icon>` : key.label}
              </button>
            `
          )}
        </div>
      </ha-card>
    `;
  }

  static styles = [
    silkControlStyles,
    css`
      /* Standalone pad: no entity behind it, so the card itself is inert.
         Grow past the grid allotment rather than clip the keys. */
      ha-card {
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 12px;
        padding: 16px 12px;
        cursor: default;
        height: auto;
        min-height: 100%;
      }
      .title {
        font-size: 14px;
        font-weight: 500;
        line-height: 1.3;
        color: var(--primary-text-color);
        max-width: 100%;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        text-align: center;
      }
      /* Masked readout: fixed 18px slots give the dots tabular spacing, and
         the min-height keeps the layout stable at zero digits. */
      .dots {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        min-height: 24px;
        max-width: 100%;
        overflow: hidden;
        color: var(--primary-text-color);
        transition: color 150ms ease;
      }
      .dots.error {
        color: var(--error-color, #db4437);
      }
      .slot {
        flex: none;
        position: relative;
        width: 18px;
        height: 18px;
      }
      .slot::after {
        content: '';
        position: absolute;
        inset: 3px;
        border-radius: 50%;
      }
      .slot.filled::after {
        background: currentColor;
      }
      .slot.hollow::after {
        box-shadow: inset 0 0 0 1.5px currentColor;
        opacity: 0.3;
      }
      .hint {
        font-size: 12.5px;
        color: var(--secondary-text-color);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .keys {
        display: grid;
        grid-template-columns: repeat(3, 52px);
        gap: 8px;
        justify-content: center;
      }
      /* Skeuomorphic keys: neutral monochrome depth only — text-color grays
         with black-alpha inset shadows; chroma stays on the submit accent. */
      .key {
        width: 52px;
        height: 52px;
        border: none;
        border-radius: 14px;
        padding: 0;
        display: grid;
        place-items: center;
        cursor: pointer;
        font: inherit;
        font-size: 19px;
        font-weight: 600;
        font-variant-numeric: tabular-nums;
        color: var(--primary-text-color);
        background: rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.07);
        box-shadow: inset 0 -1px 0 rgba(0, 0, 0, 0.08);
        transition:
          transform 100ms var(--silk-ease-out),
          box-shadow 100ms var(--silk-ease-out),
          background 150ms ease;
        -webkit-tap-highlight-color: transparent;
      }
      .key:hover:not(:disabled) {
        background: rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.1);
      }
      .key:active:not(:disabled) {
        transform: translateY(1px);
        box-shadow: inset 0 2px 5px rgba(0, 0, 0, 0.18);
      }
      .key:focus-visible {
        outline: 2px solid color-mix(in srgb, var(--silk-accent) 70%, transparent);
        outline-offset: 2px;
      }
      .key:disabled {
        cursor: default;
        opacity: 0.5;
      }
      .key.aux {
        color: var(--secondary-text-color);
      }
      .key.submit {
        color: var(--silk-accent);
        background: color-mix(in srgb, var(--silk-accent) 16%, transparent);
      }
      .key.submit:hover:not(:disabled) {
        background: color-mix(in srgb, var(--silk-accent) 22%, transparent);
      }
      .key ha-icon {
        --mdc-icon-size: 22px;
        pointer-events: none;
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    'silk-keypad-card': SilkKeypadCard;
  }
}
