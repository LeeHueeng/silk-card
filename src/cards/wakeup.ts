import { LitElement, html, css, nothing, PropertyValues, TemplateResult } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { HomeAssistant, HassEntity, LovelaceCardConfig } from '../types';
import { silkControlStyles } from '../shared/base';
import {
  domainOf,
  isActive,
  isUnavailable,
  toggleEntity,
  moreInfo,
  haptic,
  clamp,
} from '../shared/service';
import { accentFor } from '../shared/color';
import { registerEditor } from '../shared/editor';

export const META = {
  type: 'silk-wakeup-card',
  name: 'Silk Wake-up',
  description: 'Sunrise before the alarm.',
};

export interface SilkWakeupCardConfig extends LovelaceCardConfig {
  /** The light the sunrise fades up. */
  light: string;
  /** input_datetime holding the alarm time; wins over `time`. */
  alarm_entity?: string;
  /** Fixed wake time 'HH:MM', when no entity backs it. */
  time?: string;
  /** Minutes the fade takes, ending at the wake time. Default 20. */
  duration_minutes?: number;
  /** input_boolean gating the routine. */
  enabled?: string;
  /** Transition length of the Preview call, in seconds. Default 10. */
  preview_seconds?: number;
  name?: string;
  /** Accent override. */
  color?: string;
}

const DEFAULT_DURATION = 20;
const DEFAULT_PREVIEW = 10;
const STEP_MINUTES = 5;
const DAY_MINUTES = 1440;
const OPTIMISTIC_TTL_MS = 2000;
const TIME_RE = /^([01]?\d|2[0-3]):([0-5]\d)$/;

/** Sunrise curve box, in CSS px — a 40px illustration of the plan, not a chart. */
const CURVE_W = 40;
const CURVE_H = 24;
const CURVE_SAMPLES = 18;

const EDITOR_TAG = 'silk-wakeup-card-editor';

registerEditor(
  EDITOR_TAG,
  [
    { name: 'light', required: true, selector: { entity: { domain: ['light'] } } },
    { name: 'alarm_entity', selector: { entity: { domain: ['input_datetime'] } } },
    { name: 'time', selector: { text: {} } },
    {
      name: '',
      type: 'grid',
      schema: [
        { name: 'duration_minutes', selector: { number: { min: 1, max: 180, mode: 'box' } } },
        { name: 'preview_seconds', selector: { number: { min: 1, max: 120, mode: 'box' } } },
      ],
    },
    { name: 'enabled', selector: { entity: { domain: ['input_boolean', 'switch'] } } },
    {
      name: '',
      type: 'grid',
      schema: [
        { name: 'name', selector: { text: {} } },
        { name: 'color', selector: { ui_color: {} } },
      ],
    },
  ],
  {
    light: '조명',
    alarm_entity: '알람 시각 엔티티',
    time: '고정 시각 (HH:MM)',
    duration_minutes: '페이드 시간(분)',
    preview_seconds: '미리보기 시간(초)',
    enabled: '사용 스위치',
    name: '이름',
    color: '강조 색상',
  },
  { duration_minutes: DEFAULT_DURATION, preview_seconds: DEFAULT_PREVIEW }
);

/** Minutes past local midnight → the same instant today, for Intl formatting. */
function atMinutes(minutes: number): Date {
  const d = new Date();
  d.setHours(Math.floor(minutes / 60), minutes % 60, 0, 0);
  return d;
}

const wrapDay = (minutes: number): number => ((minutes % DAY_MINUTES) + DAY_MINUTES) % DAY_MINUTES;

const two = (n: number): string => String(n).padStart(2, '0');

/**
 * Wake minutes from an alarm entity: input_datetime publishes hour/minute
 * attributes, and anything else that states a wall clock ('HH:MM[:SS]') is
 * parsed from the state instead.
 */
function entityMinutes(stateObj: HassEntity): number | null {
  const a = stateObj.attributes;
  if (a.has_time !== false && typeof a.hour === 'number' && typeof a.minute === 'number') {
    return wrapDay(a.hour * 60 + a.minute);
  }
  const m = /^(\d{1,2}):(\d{2})/.exec(stateObj.state);
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h > 23 || min > 59) return null;
  return wrapDay(h * 60 + min);
}

/**
 * The plan, not the engine.
 *
 * Home Assistant runs the actual fade (an automation with a long light
 * transition); this card is the dial you set it with and the sentence that
 * tells you what will happen. Preview fires one short fade so you can see the
 * colour without waiting for 6am.
 */
@customElement('silk-wakeup-card')
export class SilkWakeupCard extends LitElement {
  @property({ attribute: false }) public hass?: HomeAssistant;

  @state() private _config?: SilkWakeupCardConfig;
  /** Locally held wake minutes while the set_datetime call is in flight. */
  @state() private _optimistic: number | null = null;

  private _optimisticTimer?: number;
  private _stamp?: string;

  public static getStubConfig(hass: HomeAssistant): Partial<SilkWakeupCardConfig> {
    const light = Object.keys(hass.states).find((id) => id.startsWith('light.'));
    const alarm = Object.keys(hass.states).find(
      (id) => id.startsWith('input_datetime.') && hass.states[id].attributes.has_time
    );
    return alarm
      ? { type: 'custom:silk-wakeup-card', light, alarm_entity: alarm }
      : { type: 'custom:silk-wakeup-card', light, time: '06:30' };
  }

  public static async getConfigElement(): Promise<HTMLElement> {
    return document.createElement(EDITOR_TAG);
  }

  public setConfig(config: SilkWakeupCardConfig): void {
    if (!config.light) {
      throw new Error('silk-wakeup-card: `light` is required');
    }
    if (domainOf(config.light) !== 'light') {
      throw new Error(`silk-wakeup-card: \`light\` must be a light (got "${config.light}")`);
    }
    if (!config.alarm_entity && !config.time) {
      throw new Error("silk-wakeup-card: set `alarm_entity` or a fixed `time` ('HH:MM')");
    }
    if (config.time !== undefined && !TIME_RE.test(String(config.time))) {
      throw new Error("silk-wakeup-card: `time` must look like '06:30'");
    }
    if (config.duration_minutes !== undefined && !(Number(config.duration_minutes) > 0)) {
      throw new Error('silk-wakeup-card: `duration_minutes` must be a positive number');
    }
    if (config.preview_seconds !== undefined && !(Number(config.preview_seconds) > 0)) {
      throw new Error('silk-wakeup-card: `preview_seconds` must be a positive number');
    }
    this._config = config;
    this._clearOptimistic();
  }

  public getCardSize(): number {
    return 2;
  }

  public getGridOptions(): Record<string, number> {
    return { columns: 6, rows: 2, min_columns: 4, min_rows: 2 };
  }

  public disconnectedCallback(): void {
    super.disconnectedCallback();
    window.clearTimeout(this._optimisticTimer);
    this._optimisticTimer = undefined;
  }

  protected willUpdate(changed: PropertyValues): void {
    if (!changed.has('hass') || !this._config || this._optimistic === null) return;
    const id = this._config.alarm_entity;
    const stamp = id ? this.hass?.states[id]?.last_updated : undefined;
    if (stamp !== this._stamp) this._clearOptimistic();
  }

  private _clearOptimistic(): void {
    window.clearTimeout(this._optimisticTimer);
    this._optimisticTimer = undefined;
    this._optimistic = null;
  }

  private _duration(): number {
    return Math.round(clamp(Number(this._config?.duration_minutes ?? DEFAULT_DURATION), 1, 720));
  }

  private _previewSeconds(): number {
    return Math.round(clamp(Number(this._config?.preview_seconds ?? DEFAULT_PREVIEW), 1, 300));
  }

  /** Configured wake time in minutes past midnight, or null when unknown. */
  private _wakeMinutes(): number | null {
    if (this._optimistic !== null) return this._optimistic;
    const config = this._config;
    if (!config) return null;
    if (config.alarm_entity) {
      const stateObj = this.hass?.states[config.alarm_entity];
      if (stateObj && !isUnavailable(stateObj)) {
        const minutes = entityMinutes(stateObj);
        if (minutes !== null) return minutes;
      }
    }
    if (config.time) {
      const m = TIME_RE.exec(config.time);
      if (m) return wrapDay(Number(m[1]) * 60 + Number(m[2]));
    }
    return null;
  }

  /** Only an entity-backed time with a clock in it can be written back. */
  private _editable(): boolean {
    const id = this._config?.alarm_entity;
    if (!id || domainOf(id) !== 'input_datetime') return false;
    const stateObj = this.hass?.states[id];
    return !!stateObj && !isUnavailable(stateObj) && stateObj.attributes.has_time !== false;
  }

  private _locale(): string {
    return this.hass?.locale?.language ?? this.hass?.language ?? 'en';
  }

  private _formatClock(minutes: number): string {
    return new Intl.DateTimeFormat(this._locale(), {
      hour: 'numeric',
      minute: '2-digit',
    }).format(atMinutes(minutes));
  }

  private _onCardClick(): void {
    if (this._config) moreInfo(this, this._config.light);
  }

  private _onStep(ev: Event, delta: number): void {
    ev.stopPropagation();
    const hass = this.hass;
    const config = this._config;
    if (!hass || !config?.alarm_entity || !this._editable()) return;
    const current = this._wakeMinutes();
    if (current === null) return;
    const next = wrapDay(current + delta);
    haptic(this, 'selection');
    this._stamp = hass.states[config.alarm_entity]?.last_updated;
    this._optimistic = next;
    window.clearTimeout(this._optimisticTimer);
    this._optimisticTimer = window.setTimeout(() => this._clearOptimistic(), OPTIMISTIC_TTL_MS);
    void hass.callService('input_datetime', 'set_datetime', {
      entity_id: config.alarm_entity,
      time: `${two(Math.floor(next / 60))}:${two(next % 60)}:00`,
    });
  }

  private _onPreview(ev: Event): void {
    ev.stopPropagation();
    const hass = this.hass;
    const config = this._config;
    if (!hass || !config) return;
    const stateObj = hass.states[config.light];
    if (!stateObj || isUnavailable(stateObj)) return;
    haptic(this);
    // A short taste of the real thing: full brightness over `preview_seconds`.
    void hass.callService('light', 'turn_on', {
      entity_id: config.light,
      brightness_pct: 100,
      transition: this._previewSeconds(),
    });
  }

  private _onEnable(ev: Event): void {
    ev.stopPropagation();
    const hass = this.hass;
    const id = this._config?.enabled;
    if (!hass || !id) return;
    const stateObj = hass.states[id];
    if (!stateObj || isUnavailable(stateObj)) return;
    haptic(this);
    void toggleEntity(hass, id);
  }

  /**
   * Quarter-sine ramp: flat at the start, steepening into the wake time — the
   * shape a sunrise fade actually has. Purely illustrative, one accent hue.
   */
  private _curvePaths(): { line: string; area: string } {
    const pts: string[] = [];
    for (let i = 0; i <= CURVE_SAMPLES; i++) {
      const x = (i / CURVE_SAMPLES) * CURVE_W;
      const y = CURVE_H - Math.sin((i / CURVE_SAMPLES) * (Math.PI / 2)) * (CURVE_H - 2) - 1;
      pts.push(`${x.toFixed(2)},${y.toFixed(2)}`);
    }
    const line = `M${pts.join(' L')}`;
    return { line, area: `${line} L${CURVE_W},${CURVE_H} L0,${CURVE_H} Z` };
  }

  protected render(): TemplateResult | typeof nothing {
    const config = this._config;
    const hass = this.hass;
    if (!config || !hass) return nothing;
    const stateObj = hass.states[config.light];
    if (!stateObj) {
      return html`<ha-card><div class="warning">Entity not found: ${config.light}</div></ha-card>`;
    }

    const unavailable = isUnavailable(stateObj);
    const accent = accentFor(stateObj, config.color);
    const name = config.name ?? stateObj.attributes.friendly_name ?? config.light;
    const wake = this._wakeMinutes();
    const duration = this._duration();
    const editable = this._editable();
    const enableObj = config.enabled ? hass.states[config.enabled] : undefined;
    const enabled = enableObj ? isActive(enableObj) : true;
    const startsAt = wake === null ? null : this._formatClock(wrapDay(wake - duration));
    const { line, area } = this._curvePaths();
    const curveTitle = `${duration} min fade${startsAt ? `, from ${startsAt}` : ''}`;

    return html`
      <ha-card
        class="control ${unavailable ? 'unavailable' : ''}"
        style="--silk-accent:${accent}"
        @click=${this._onCardClick}
      >
        <div class="top">
          <div class="icon ${enabled && !unavailable ? 'on' : ''}">
            <ha-icon icon="mdi:weather-sunset-up"></ha-icon>
          </div>
          <div class="info">
            <div class="name">${name}</div>
            <div class="state">
              ${startsAt
                ? html`starts at ${startsAt}<span class="sep">·</span>${duration} min fade`
                : 'No wake time set'}${enableObj && !enabled
                ? html`<span class="sep">·</span>off`
                : nothing}
            </div>
          </div>
          ${enableObj
            ? html`
                <div class="trailing">
                  <button
                    class="switch ${enabled ? 'checked' : ''}"
                    role="switch"
                    aria-checked=${enabled ? 'true' : 'false'}
                    aria-label=${`Enable ${name} wake-up`}
                    ?disabled=${isUnavailable(enableObj)}
                    @click=${this._onEnable}
                  >
                    <span class="thumb"></span>
                  </button>
                </div>
              `
            : nothing}
        </div>

        <div class="plan ${enabled ? '' : 'muted'}">
          <div class="clock">
            <button
              class="step"
              aria-label="Wake 5 minutes earlier"
              ?disabled=${!editable || wake === null}
              @click=${(ev: Event) => this._onStep(ev, -STEP_MINUTES)}
            >
              <ha-icon icon="mdi:minus"></ha-icon>
            </button>
            <span class="time" title=${editable ? 'Wake time' : 'Wake time (fixed in YAML)'}>
              ${wake === null ? '—:—' : this._formatClock(wake)}
            </span>
            <button
              class="step"
              aria-label="Wake 5 minutes later"
              ?disabled=${!editable || wake === null}
              @click=${(ev: Event) => this._onStep(ev, STEP_MINUTES)}
            >
              <ha-icon icon="mdi:plus"></ha-icon>
            </button>
          </div>

          <svg class="curve" viewBox="0 0 ${CURVE_W} ${CURVE_H}" aria-hidden="true">
            <path class="fill" d=${area}><title>${curveTitle}</title></path>
            <path class="line" d=${line}><title>${curveTitle}</title></path>
          </svg>

          <button
            class="chip preview"
            ?disabled=${unavailable}
            title=${`Fade up over ${this._previewSeconds()}s`}
            @click=${this._onPreview}
          >
            Preview
          </button>
        </div>
      </ha-card>
    `;
  }

  static styles = [
    silkControlStyles,
    css`
      ha-card {
        flex-direction: column;
        align-items: stretch;
        justify-content: center;
        gap: 8px;
      }
      .top {
        flex: none;
        display: flex;
        align-items: center;
        gap: 12px;
        min-width: 0;
      }
      /* The header icon is a status light, not a control. */
      .icon {
        cursor: inherit;
      }
      .icon:active {
        transform: none;
      }
      .plan {
        flex: none;
        display: flex;
        align-items: center;
        gap: 10px;
        min-width: 0;
        position: relative;
        z-index: 1;
        transition: opacity 200ms ease;
      }
      .plan.muted {
        opacity: 0.55;
      }
      .clock {
        display: flex;
        align-items: center;
        gap: 6px;
        min-width: 0;
      }
      .time {
        min-width: 68px;
        text-align: center;
        font-size: 22px;
        font-weight: 700;
        letter-spacing: -0.02em;
        line-height: 1;
        color: var(--primary-text-color);
        font-variant-numeric: tabular-nums;
        white-space: nowrap;
      }
      .step {
        position: relative;
        flex: none;
        width: 34px;
        height: 34px;
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
          background 200ms ease;
      }
      /* Invisible halo lifts the touch target past 40px. */
      .step::after {
        content: '';
        position: absolute;
        inset: -4px;
        border-radius: 14px;
      }
      .step:active:not(:disabled) {
        transform: scale(0.9);
        transition-duration: 120ms;
        transition-timing-function: var(--silk-ease-out);
      }
      .step:focus-visible {
        outline: 2px solid color-mix(in srgb, var(--silk-accent) 70%, transparent);
        outline-offset: 2px;
      }
      .step:disabled {
        cursor: default;
        opacity: 0.4;
      }
      .step ha-icon {
        --mdc-icon-size: 18px;
        pointer-events: none;
      }
      .curve {
        flex: none;
        width: ${CURVE_W}px;
        height: ${CURVE_H}px;
        display: block;
        margin-left: auto;
        overflow: visible;
      }
      .curve .line {
        fill: none;
        stroke: var(--silk-accent);
        stroke-width: 2;
        stroke-linecap: round;
      }
      .curve .fill {
        fill: color-mix(in srgb, var(--silk-accent) 16%, transparent);
        stroke: none;
      }
      .preview {
        flex: none;
        min-height: 30px;
        padding: 4px 12px;
        transition:
          transform 250ms var(--silk-spring),
          background 150ms ease-out,
          color 150ms ease-out;
      }
      .preview:active:not(:disabled) {
        transform: scale(0.94);
        transition-duration: 120ms;
        transition-timing-function: var(--silk-ease-out);
      }
      .preview:focus-visible {
        outline: 2px solid color-mix(in srgb, var(--silk-accent) 70%, transparent);
        outline-offset: 2px;
      }
      .preview:disabled {
        cursor: default;
        opacity: 0.5;
      }
      .unavailable .plan {
        opacity: 0.45;
      }
      /* Enable switch (mirrors silk-toggle-card). */
      .switch {
        flex: none;
        position: relative;
        width: 46px;
        height: 28px;
        border: none;
        border-radius: 999px;
        padding: 2px;
        cursor: pointer;
        display: block;
        background: rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.15);
        transition: background 200ms ease;
      }
      .switch::after {
        content: '';
        position: absolute;
        inset: -7px;
        border-radius: 999px;
      }
      .switch.checked {
        background: var(--silk-accent);
      }
      .switch:focus-visible {
        outline: 2px solid color-mix(in srgb, var(--silk-accent) 70%, transparent);
        outline-offset: 2px;
      }
      .switch:disabled {
        cursor: default;
      }
      .thumb {
        display: block;
        width: 24px;
        height: 24px;
        border-radius: 50%;
        background: var(--card-background-color, #fff);
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
        transform: translateX(0);
        transition: transform 200ms var(--silk-ease-out);
        will-change: transform;
      }
      .switch.checked .thumb {
        transform: translateX(18px);
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    'silk-wakeup-card': SilkWakeupCard;
  }
}
