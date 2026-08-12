import { LitElement, html, css, nothing, PropertyValues, TemplateResult } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { HomeAssistant, HassEntity, LovelaceCardConfig } from '../types';
import { silkControlStyles } from '../shared/base';
import {
  isActive,
  isUnavailable,
  moreInfo,
  haptic,
  stateText,
  supportsFeature,
} from '../shared/service';
import { registerEditor } from '../shared/editor';

export const META = {
  type: 'silk-alarm-card',
  name: 'Silk Alarm',
  description: 'Arm modes and a real keypad.',
};

export interface AlarmCardConfig extends LovelaceCardConfig {
  entity: string;
  name?: string;
  icon?: string;
}

const EDITOR_TAG = 'silk-alarm-card-editor';

registerEditor(
  EDITOR_TAG,
  [
    {
      name: 'entity',
      required: true,
      selector: { entity: { domain: ['alarm_control_panel'] } },
    },
    { name: 'name', selector: { text: {} } },
    { name: 'icon', selector: { icon: {} } },
  ],
  { entity: 'Entity', name: 'Name', icon: 'Icon' }
);

/**
 * Alarm accent is state-driven, not domain-driven, so it lives here instead
 * of shared/color.ts: disarmed reads safe, armed reads alert, transitional
 * states read caution, triggered reads error.
 */
function alarmAccent(alarmState: string): string {
  if (alarmState === 'disarmed') return 'var(--success-color, #43a047)';
  if (alarmState === 'triggered') return 'var(--error-color, #db4437)';
  if (alarmState === 'arming' || alarmState === 'pending') {
    return 'var(--warning-color, #ffa600)';
  }
  if (alarmState.startsWith('armed_')) return '#ef6c6c';
  return 'var(--primary-color, #4aa8ff)';
}

// alarm_control_panel supported_features bits (HA core const.py).
const FEATURE_ARM_HOME = 1;
const FEATURE_ARM_AWAY = 2;
const FEATURE_ARM_NIGHT = 4;

type ModeKey = 'disarm' | 'home' | 'away' | 'night';

interface ArmMode {
  key: ModeKey;
  label: string;
  service: 'alarm_disarm' | 'alarm_arm_home' | 'alarm_arm_away' | 'alarm_arm_night';
  /** Panel state this mode lands on — marks the chip as current. */
  activeState: string;
  /** supported_features bit gating the chip; disarm is always offered. */
  feature?: number;
}

const MODES: readonly ArmMode[] = [
  { key: 'disarm', label: 'Disarm', service: 'alarm_disarm', activeState: 'disarmed' },
  {
    key: 'home',
    label: 'Home',
    service: 'alarm_arm_home',
    activeState: 'armed_home',
    feature: FEATURE_ARM_HOME,
  },
  {
    key: 'away',
    label: 'Away',
    service: 'alarm_arm_away',
    activeState: 'armed_away',
    feature: FEATURE_ARM_AWAY,
  },
  {
    key: 'night',
    label: 'Night',
    service: 'alarm_arm_night',
    activeState: 'armed_night',
    feature: FEATURE_ARM_NIGHT,
  },
];

/** Keypad layout: 1-9, then clear / 0 / backspace. */
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
  { k: 'clear', label: 'Clear', icon: 'mdi:close-circle-outline' },
  { k: '0', label: '0' },
  { k: 'back', label: 'Backspace', icon: 'mdi:backspace-outline' },
];

const MAX_CODE_LENGTH = 16;
const OPTIMISTIC_TIMEOUT_MS = 2000;

@customElement('silk-alarm-card')
export class SilkAlarmCard extends LitElement {
  @property({ attribute: false }) public hass?: HomeAssistant;

  @state() private _config?: AlarmCardConfig;

  /** Mode awaiting a code — non-null means the keypad is open. */
  @state() private _pendingMode: ModeKey | null = null;

  @state() private _code = '';

  /** Optimistic state ('arming' | 'disarmed'); null = trust HA. */
  @state() private _optimistic: string | null = null;

  /** last_updated snapshot at call time; any newer stamp clears the override. */
  private _optimisticBase = '';
  private _optimisticTimer?: number;

  public static getStubConfig(hass: HomeAssistant): Partial<AlarmCardConfig> {
    const entity = Object.keys(hass.states).find((id) =>
      id.startsWith('alarm_control_panel.')
    );
    return { type: 'custom:silk-alarm-card', entity };
  }

  public static async getConfigElement(): Promise<HTMLElement> {
    return document.createElement(EDITOR_TAG);
  }

  public setConfig(config: AlarmCardConfig): void {
    if (!config.entity) {
      throw new Error('silk-alarm-card: `entity` is required');
    }
    this._config = config;
    this._pendingMode = null;
    this._code = '';
    this._clearOptimistic();
  }

  public getCardSize(): number {
    return this._pendingMode !== null ? 4 : 2;
  }

  public getGridOptions(): Record<string, number> {
    return {
      columns: 6,
      rows: this._pendingMode !== null ? 4 : 2,
      min_columns: 4,
      min_rows: 2,
    };
  }

  public disconnectedCallback(): void {
    super.disconnectedCallback();
    window.clearTimeout(this._optimisticTimer);
  }

  protected willUpdate(changed: PropertyValues): void {
    if (!changed.has('hass') || this._optimistic === null || !this._config) return;
    const stateObj = this.hass?.states[this._config.entity];
    if (stateObj && stateObj.last_updated !== this._optimisticBase) {
      this._clearOptimistic();
    }
  }

  private _clearOptimistic(): void {
    window.clearTimeout(this._optimisticTimer);
    this._optimisticTimer = undefined;
    this._optimistic = null;
  }

  /**
   * A code is required when the panel declares a code_format — except for
   * arming on panels that explicitly waive it (code_arm_required: false).
   */
  private _needsCode(stateObj: HassEntity, mode: ArmMode): boolean {
    if (!stateObj.attributes.code_format) return false;
    if (mode.key !== 'disarm' && stateObj.attributes.code_arm_required === false) {
      return false;
    }
    return true;
  }

  private _send(mode: ArmMode, code?: string): void {
    const config = this._config;
    const hass = this.hass;
    if (!config || !hass) return;
    const stateObj = hass.states[config.entity];
    if (!stateObj) return;
    const data: Record<string, unknown> = { entity_id: config.entity };
    if (code) data.code = code;
    hass.callService('alarm_control_panel', mode.service, data);
    // Optimistically show the honest next state: disarm settles immediately,
    // arm modes pass through the panel's arming countdown first.
    this._optimistic = mode.key === 'disarm' ? 'disarmed' : 'arming';
    this._optimisticBase = stateObj.last_updated;
    window.clearTimeout(this._optimisticTimer);
    this._optimisticTimer = window.setTimeout(
      () => this._clearOptimistic(),
      OPTIMISTIC_TIMEOUT_MS
    );
    this._pendingMode = null;
    this._code = '';
  }

  private _onCardClick(): void {
    if (this._config) moreInfo(this, this._config.entity);
  }

  private _swallow(ev: Event): void {
    ev.stopPropagation();
  }

  private _onModeTap(ev: Event): void {
    ev.stopPropagation();
    const config = this._config;
    const hass = this.hass;
    if (!config || !hass) return;
    const stateObj = hass.states[config.entity];
    if (!stateObj || isUnavailable(stateObj)) return;
    const key = (ev.currentTarget as HTMLButtonElement).dataset.mode as ModeKey | undefined;
    const mode = MODES.find((m) => m.key === key);
    if (!mode) return;
    if (this._needsCode(stateObj, mode)) {
      haptic(this, 'selection');
      if (this._pendingMode === mode.key) {
        // Re-tapping the pending mode collapses the keypad.
        this._pendingMode = null;
        this._code = '';
      } else {
        this._pendingMode = mode.key;
        this._code = '';
      }
    } else {
      haptic(this, 'success');
      this._send(mode);
    }
  }

  private _onKeyTap(ev: Event): void {
    ev.stopPropagation();
    const key = (ev.currentTarget as HTMLButtonElement).dataset.key;
    if (!key) return;
    haptic(this, 'selection');
    if (key === 'clear') {
      this._code = '';
    } else if (key === 'back') {
      this._code = this._code.slice(0, -1);
    } else if (this._code.length < MAX_CODE_LENGTH) {
      this._code = this._code + key;
    }
  }

  private _onEnter(ev: Event): void {
    ev.stopPropagation();
    const config = this._config;
    const hass = this.hass;
    if (!config || !hass || !this._code) return;
    const stateObj = hass.states[config.entity];
    if (!stateObj || isUnavailable(stateObj)) return;
    const mode = MODES.find((m) => m.key === this._pendingMode);
    if (!mode) return;
    haptic(this, 'success');
    this._send(mode, this._code);
  }

  private _renderKeypad(): TemplateResult {
    const hasCode = this._code.length > 0;
    return html`
      <div class="keypad" @click=${this._swallow}>
        <div class="code-row">
          <div class="dots" aria-label=${hasCode ? `${this._code.length} digits entered` : 'No code entered'}>
            ${hasCode
              ? Array.from(this._code, () => html`<span class="dot"></span>`)
              : html`<span class="hint">Enter code</span>`}
          </div>
          <button
            class="chip enter ${hasCode ? 'active' : ''}"
            .disabled=${!hasCode}
            @click=${this._onEnter}
          >
            Enter
          </button>
        </div>
        <div class="keys">
          ${KEYS.map(
            (key) => html`
              <button
                class="key ${key.icon ? 'aux' : ''}"
                data-key=${key.k}
                aria-label=${key.label}
                @click=${this._onKeyTap}
              >
                ${key.icon ? html`<ha-icon .icon=${key.icon}></ha-icon>` : key.label}
              </button>
            `
          )}
        </div>
      </div>
    `;
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
    const displayObj: HassEntity =
      this._optimistic === null ? stateObj : { ...stateObj, state: this._optimistic };
    const displayState = displayObj.state;
    const active = isActive(displayObj); // anything but disarmed lights the icon
    const accent = alarmAccent(displayState);
    const triggered = displayState === 'triggered';
    const name = config.name ?? stateObj.attributes.friendly_name ?? config.entity;
    const modes = MODES.filter(
      (m) => m.feature === undefined || supportsFeature(stateObj, m.feature)
    );

    return html`
      <ha-card
        class="control ${unavailable ? 'unavailable' : ''}"
        style="--silk-accent:${accent}"
        @click=${this._onCardClick}
      >
        <div class="top">
          <div class="icon ${active ? 'on' : ''}">
            ${config.icon
              ? html`<ha-icon .icon=${config.icon}></ha-icon>`
              : html`<ha-state-icon .hass=${hass} .stateObj=${displayObj}></ha-state-icon>`}
          </div>
          <div class="info">
            <div class="name">${name}</div>
            <div class="state ${triggered ? 'alert' : ''}">
              ${stateText(hass, displayObj)}
            </div>
          </div>
        </div>
        <div class="modes">
          ${modes.map((mode) => {
            const current = displayState === mode.activeState;
            const pending = this._pendingMode === mode.key;
            return html`
              <button
                class="chip ${current ? 'active' : ''} ${pending ? 'pending' : ''}"
                data-mode=${mode.key}
                .disabled=${unavailable}
                aria-pressed=${current ? 'true' : 'false'}
                @click=${this._onModeTap}
              >
                ${mode.label}
              </button>
            `;
          })}
        </div>
        ${this._pendingMode !== null ? this._renderKeypad() : nothing}
      </ha-card>
    `;
  }

  static styles = [
    silkControlStyles,
    css`
      /* Two stacked rows (+ keypad); grow past the grid allotment rather than
         clip the keypad — sections give 4 rows, masonry sizes naturally. */
      ha-card {
        flex-direction: column;
        align-items: stretch;
        justify-content: flex-start;
        gap: 10px;
        height: auto;
        min-height: 100%;
      }
      .top {
        display: flex;
        align-items: center;
        gap: 12px;
        min-width: 0;
      }
      .state.alert {
        font-weight: 600;
        color: var(--error-color, #db4437);
      }
      .modes {
        display: flex;
        align-items: center;
        flex-wrap: wrap;
        gap: 6px;
        position: relative;
        z-index: 1;
      }
      .unavailable .modes {
        opacity: 0.45;
      }
      .chip:disabled {
        cursor: default;
      }
      /* Awaiting a code: a lighter accent tint than .active, so the target
         mode reads distinct from the currently armed one. */
      .chip.pending {
        color: var(--silk-accent);
        background: color-mix(in srgb, var(--silk-accent) 10%, transparent);
      }
      .keypad {
        display: flex;
        flex-direction: column;
        gap: 8px;
        position: relative;
        z-index: 1;
        animation: silk-reveal 200ms var(--silk-ease-out);
      }
      @keyframes silk-reveal {
        from {
          opacity: 0;
          transform: translateY(-4px);
        }
      }
      .code-row {
        display: flex;
        align-items: center;
        gap: 8px;
        min-height: 26px;
        padding: 0 2px;
      }
      .dots {
        flex: 1;
        min-width: 0;
        display: flex;
        align-items: center;
        gap: 5px;
        overflow: hidden;
      }
      .dot {
        flex: none;
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background: var(--primary-text-color);
        opacity: 0.75;
      }
      .hint {
        font-size: 11.5px;
        color: var(--secondary-text-color);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .chip.enter:disabled {
        opacity: 0.5;
        cursor: default;
      }
      .keys {
        display: grid;
        grid-template-columns: repeat(3, 44px);
        gap: 6px;
        justify-content: center;
      }
      .key {
        width: 44px;
        height: 44px;
        border: none;
        border-radius: 12px;
        padding: 0;
        display: grid;
        place-items: center;
        cursor: pointer;
        font: inherit;
        font-size: 16px;
        font-weight: 600;
        font-variant-numeric: tabular-nums;
        color: var(--primary-text-color);
        background: rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.06);
        transition:
          transform 250ms var(--silk-spring),
          background 150ms ease;
        -webkit-tap-highlight-color: transparent;
      }
      .key:hover {
        background: rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.1);
      }
      .key:active {
        transform: scale(0.88);
        transition-duration: 120ms;
        transition-timing-function: var(--silk-ease-out);
        background: rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.12);
      }
      .key.aux {
        color: var(--secondary-text-color);
      }
      .key ha-icon {
        --mdc-icon-size: 20px;
        pointer-events: none;
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    'silk-alarm-card': SilkAlarmCard;
  }
}
