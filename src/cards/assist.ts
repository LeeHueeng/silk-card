import { LitElement, html, css, nothing, TemplateResult } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { HomeAssistant, LovelaceCardConfig } from '../types';
import { silkControlStyles } from '../shared/base';
import { haptic } from '../shared/service';
import { accentFor } from '../shared/color';
import { registerEditor } from '../shared/editor';

export const META = {
  type: 'silk-assist-card',
  name: 'Silk Assist',
  description: 'Talk to your house from any dashboard.',
};

export interface SilkAssistCardConfig extends LovelaceCardConfig {
  name?: string;
  /** Conversation agent entity/id; omitted = the default agent. */
  agent_id?: string;
  /** Assist pipeline handed to the voice dialog. */
  pipeline_id?: string;
  /** Opening line shown while there is no history. */
  greeting?: string;
  /** Accent override. */
  color?: string;
}

/**
 * Response of the `conversation/process` WS command. Silk's minimal
 * HomeAssistant type models `callWS` generically but knows nothing about
 * conversation payloads, so the shape is declared locally — and every level is
 * optional, because agents (and errors) fill in very different subsets.
 */
interface ConversationResult {
  conversation_id?: string | null;
  response?: {
    response_type?: string;
    speech?: { plain?: { speech?: string } };
  };
}

/** One user turn and whatever came back for it. */
interface Exchange {
  id: number;
  text: string;
  reply?: string;
  error?: string;
  pending: boolean;
}

const DEFAULT_NAME = 'Assist';
const PLACEHOLDER = 'Ask anything';
/** Turns kept on screen; older ones scroll out of the transcript entirely. */
const MAX_EXCHANGES = 4;
/** Agents may act without speaking; an empty reply still deserves an answer. */
const SILENT_REPLY = 'Done';

const EDITOR_TAG = 'silk-assist-card-editor';

registerEditor(
  EDITOR_TAG,
  [
    { name: 'name', selector: { text: {} } },
    { name: 'agent_id', selector: { entity: { domain: ['conversation'] } } },
    // Pipeline ids are opaque uuids — the pipeline picker is the only way to
    // choose one without opening the YAML editor.
    { name: 'pipeline_id', selector: { assist_pipeline: {} } },
    { name: 'greeting', selector: { text: {} } },
    { name: 'color', selector: { ui_color: {} } },
  ],
  {
    name: '이름',
    agent_id: '대화 에이전트',
    pipeline_id: '음성 파이프라인',
    greeting: '첫 인사말',
    color: '강조 색상',
  },
  { name: DEFAULT_NAME }
);

/** Best-effort message out of a WS rejection (`{code, message}`) or an Error. */
function errorText(err: unknown): string {
  if (err instanceof Error && err.message) return err.message;
  if (err && typeof err === 'object') {
    const message = (err as { message?: unknown }).message;
    if (typeof message === 'string' && message) return message;
  }
  return 'Assist could not answer';
}

@customElement('silk-assist-card')
export class SilkAssistCard extends LitElement {
  @property({ attribute: false }) public hass?: HomeAssistant;

  @state() private _config?: SilkAssistCardConfig;
  @state() private _exchanges: Exchange[] = [];
  /** Mirrors the input so the send button can go accent the moment you type. */
  @state() private _text = '';
  @state() private _busy = false;

  /** Threads follow-ups onto the same conversation until Clear. */
  private _conversationId?: string;
  private _seq = 0;

  public static getStubConfig(): Partial<SilkAssistCardConfig> {
    return { type: 'custom:silk-assist-card' };
  }

  public static async getConfigElement(): Promise<HTMLElement> {
    return document.createElement(EDITOR_TAG);
  }

  public setConfig(config: SilkAssistCardConfig): void {
    for (const key of ['agent_id', 'pipeline_id'] as const) {
      if (config[key] !== undefined && typeof config[key] !== 'string') {
        throw new Error(`silk-assist-card: \`${key}\` must be a string`);
      }
    }
    this._config = config;
  }

  public getCardSize(): number {
    return 3;
  }

  public getGridOptions(): Record<string, number> {
    return { columns: 6, rows: 3, min_columns: 4, min_rows: 2 };
  }

  /** Keep the newest turn in view as the transcript grows. */
  protected updated(): void {
    const log = this.renderRoot.querySelector('.log');
    if (log) log.scrollTop = log.scrollHeight;
  }

  private _inputEl(): HTMLInputElement | null {
    return this.renderRoot.querySelector<HTMLInputElement>('.q');
  }

  private _patch(id: number, patch: Partial<Exchange>): void {
    this._exchanges = this._exchanges.map((ex) => (ex.id === id ? { ...ex, ...patch } : ex));
  }

  private _onInput(ev: Event): void {
    this._text = (ev.target as HTMLInputElement).value;
  }

  private _onKeydown(ev: KeyboardEvent): void {
    if (ev.key === 'Enter') {
      ev.preventDefault();
      void this._send();
    } else if (ev.key === 'Escape') {
      ev.preventDefault();
      ev.stopPropagation();
      const input = this._inputEl();
      if (input) input.value = '';
      this._text = '';
    }
  }

  private _onSendClick(ev: Event): void {
    ev.stopPropagation();
    void this._send();
  }

  private async _send(): Promise<void> {
    const hass = this.hass;
    const config = this._config;
    if (!hass || !config || this._busy) return;
    const input = this._inputEl();
    const text = (input?.value ?? '').trim();
    if (!text) return;

    haptic(this);
    // Focus is about to be taken away by `disabled`; remember whether it was
    // ours at all, so the answer never yanks the caret out of another card.
    const hadFocus = (this.renderRoot as ShadowRoot).activeElement !== null;
    // Optimistic: the question lands in the transcript before the round trip,
    // and the field empties immediately so the next one can be typed.
    const id = ++this._seq;
    this._exchanges = [...this._exchanges, { id, text, pending: true }].slice(-MAX_EXCHANGES);
    this._busy = true;
    this._text = '';
    if (input) input.value = '';

    const msg: Record<string, unknown> = { type: 'conversation/process', text };
    if (config.agent_id) msg.agent_id = config.agent_id;
    if (this._conversationId) msg.conversation_id = this._conversationId;
    const language = hass.locale?.language ?? hass.language;
    if (language) msg.language = language;

    try {
      const resp = await hass.callWS<ConversationResult>(msg);
      if (typeof resp?.conversation_id === 'string') this._conversationId = resp.conversation_id;
      const speech = resp?.response?.speech?.plain?.speech;
      const reply = typeof speech === 'string' && speech.trim() ? speech : SILENT_REPLY;
      this._patch(id, { pending: false, reply });
    } catch (err) {
      this._patch(id, { pending: false, error: errorText(err) });
    } finally {
      this._busy = false;
      if (hadFocus) void this.updateComplete.then(() => this._inputEl()?.focus());
    }
  }

  private _onMicClick(ev: Event): void {
    ev.stopPropagation();
    haptic(this);
    // Best-effort: HA's dashboard root listens for this event to open the voice
    // dialog, but the name is not a stable public API. Nothing here depends on
    // it — the text path above is the reliable one, and a missing listener is a
    // silent no-op rather than an error.
    this.dispatchEvent(
      new CustomEvent('show-dialog-voice-command', {
        detail: { pipeline_id: this._config?.pipeline_id, start_listening: true },
        bubbles: true,
        composed: true,
      })
    );
  }

  private _onClearClick(ev: Event): void {
    ev.stopPropagation();
    haptic(this);
    this._exchanges = [];
    this._conversationId = undefined;
  }

  private _renderExchange(ex: Exchange): TemplateResult {
    return html`
      <div class="bubble me">${ex.text}</div>
      ${ex.pending
        ? html`
            <div class="bubble bot dots" aria-label="Assist is thinking">
              <span class="dot"></span><span class="dot"></span><span class="dot"></span>
            </div>
          `
        : nothing}
      ${ex.error ? html`<div class="bubble err">${ex.error}</div>` : nothing}
      ${ex.reply ? html`<div class="bubble bot">${ex.reply}</div>` : nothing}
    `;
  }

  protected render(): TemplateResult | typeof nothing {
    const config = this._config;
    const hass = this.hass;
    if (!config || !hass) return nothing;
    const accent = accentFor(undefined, config.color);
    const name = config.name ?? DEFAULT_NAME;
    const history = this._exchanges;
    const canSend = this._text.trim().length > 0 && !this._busy;

    return html`
      <ha-card style="--silk-accent:${accent}">
        <div class="head">
          <div class="name">${name}</div>
          ${history.length
            ? html`
                <button class="clear" @click=${this._onClearClick}>Clear</button>
              `
            : nothing}
        </div>
        <div class="log" role="log" aria-live="polite">
          ${history.length === 0 && config.greeting
            ? html`<div class="bubble bot">${config.greeting}</div>`
            : nothing}
          ${history.map((ex) => this._renderExchange(ex))}
        </div>
        <div class="compose">
          <div class="field">
            <input
              class="q"
              type="text"
              autocomplete="off"
              autocapitalize="sentences"
              spellcheck="false"
              .placeholder=${PLACEHOLDER}
              .disabled=${this._busy}
              aria-label=${name}
              @input=${this._onInput}
              @keydown=${this._onKeydown}
              @click=${(ev: Event) => ev.stopPropagation()}
            />
          </div>
          <button class="act" aria-label="Start voice input" @click=${this._onMicClick}>
            <ha-icon icon="mdi:microphone"></ha-icon>
          </button>
          <button
            class="act ${canSend ? 'on' : ''}"
            aria-label="Send"
            .disabled=${!canSend}
            @click=${this._onSendClick}
          >
            <ha-icon icon="mdi:send"></ha-icon>
          </button>
        </div>
      </ha-card>
    `;
  }

  static styles = [
    silkControlStyles,
    css`
      /* A conversation surface, not a control row: no card-level tap action. */
      ha-card {
        flex-direction: column;
        align-items: stretch;
        justify-content: flex-start;
        gap: 8px;
        cursor: default;
      }
      .head {
        flex: none;
        display: flex;
        align-items: center;
        gap: 8px;
        min-width: 0;
      }
      .head .name {
        flex: 1;
        min-width: 0;
      }
      .clear {
        flex: none;
        position: relative;
        border: none;
        background: none;
        font: inherit;
        font-size: 11px;
        line-height: 1;
        padding: 6px 8px;
        border-radius: 9px;
        color: var(--secondary-text-color);
        cursor: pointer;
        transition: background 150ms ease-out;
      }
      /* Invisible halo lifts the tap target past 36px without a bigger chip. */
      .clear::after {
        content: '';
        position: absolute;
        inset: -8px -6px;
      }
      .clear:hover {
        background: rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.08);
      }
      .log {
        flex: 1;
        min-height: 0;
        display: flex;
        flex-direction: column;
        gap: 6px;
        overflow-y: auto;
        overscroll-behavior: contain;
      }
      .bubble {
        flex: none;
        max-width: 80%;
        padding: 7px 11px;
        box-sizing: border-box;
        border-radius: 14px;
        font-size: 13px;
        line-height: 1.35;
        white-space: pre-wrap;
        overflow-wrap: anywhere;
        animation: silk-assist-in 250ms var(--silk-ease-out);
      }
      .bubble.me {
        align-self: flex-end;
        color: var(--primary-text-color);
        background: color-mix(in srgb, var(--silk-accent) 16%, transparent);
      }
      .bubble.bot {
        align-self: flex-start;
        color: var(--primary-text-color);
        background: rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.06);
      }
      .bubble.err {
        align-self: flex-start;
        color: var(--error-color, #db4437);
        background: color-mix(in srgb, var(--error-color, #db4437) 12%, transparent);
      }
      .dots {
        display: flex;
        align-items: center;
        gap: 4px;
        padding: 10px 11px;
      }
      /* A loop, but an honest one: it runs exactly while a request is in flight. */
      .dot {
        width: 5px;
        height: 5px;
        border-radius: 50%;
        background: var(--secondary-text-color);
        opacity: 0.25;
        animation: silk-assist-dot 1.2s ease-in-out infinite;
      }
      .dot:nth-child(2) {
        animation-delay: 150ms;
      }
      .dot:nth-child(3) {
        animation-delay: 300ms;
      }
      .compose {
        flex: none;
        display: flex;
        align-items: center;
        gap: 6px;
      }
      .field {
        flex: 1;
        min-width: 0;
        display: flex;
        align-items: center;
        height: 36px;
        padding: 0 12px;
        box-sizing: border-box;
        border-radius: 12px;
        background: rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.06);
        transition: box-shadow 150ms var(--silk-ease-out);
      }
      .field:focus-within {
        box-shadow: inset 0 0 0 2px var(--silk-accent);
      }
      .q {
        flex: 1;
        min-width: 0;
        border: none;
        outline: none;
        background: none;
        padding: 0;
        font: inherit;
        font-size: 13.5px;
        line-height: 1.3;
        color: var(--primary-text-color);
      }
      .q::placeholder {
        color: var(--secondary-text-color);
        opacity: 0.8;
      }
      .q:disabled {
        opacity: 0.45;
      }
      .act {
        flex: none;
        width: 36px;
        height: 36px;
        display: grid;
        place-items: center;
        padding: 0;
        border: none;
        border-radius: 12px;
        cursor: pointer;
        color: var(--secondary-text-color);
        background: rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.06);
        transition:
          transform 250ms var(--silk-spring),
          background 200ms ease,
          color 200ms ease;
      }
      .act:active {
        transform: scale(0.92);
        transition-duration: 120ms;
        transition-timing-function: var(--silk-ease-out);
      }
      .act.on {
        color: var(--silk-accent);
        background: color-mix(in srgb, var(--silk-accent) 16%, transparent);
      }
      .act:disabled {
        cursor: default;
      }
      .act:disabled:active {
        transform: none;
      }
      .act:focus-visible {
        outline: 2px solid color-mix(in srgb, var(--silk-accent) 70%, transparent);
        outline-offset: 2px;
      }
      .act ha-icon {
        --mdc-icon-size: 20px;
        pointer-events: none;
        display: flex;
      }
      @keyframes silk-assist-in {
        from {
          opacity: 0;
          transform: translateY(4px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }
      @keyframes silk-assist-dot {
        0%,
        60%,
        100% {
          opacity: 0.25;
        }
        30% {
          opacity: 0.9;
        }
      }
      /* Shared styles crush every duration to ~0; kill the loop outright instead. */
      @media (prefers-reduced-motion: reduce) {
        .dot {
          animation-name: none !important;
          opacity: 0.5;
        }
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    'silk-assist-card': SilkAssistCard;
  }
}
