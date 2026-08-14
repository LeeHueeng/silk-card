import { LitElement, html, svg, css, nothing, PropertyValues, TemplateResult } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { HomeAssistant, HassEntity, LovelaceCardConfig } from '../types';
import { silkControlStyles } from '../shared/base';
import { domainOf, isUnavailable, moreInfo, haptic, stateText, clamp } from '../shared/service';
import { accentFor } from '../shared/color';
import { registerEditor } from '../shared/editor';

export const META = {
  type: 'silk-hydration-card',
  name: 'Silk Water Intake',
  description: 'Glasses in, day tracked.',
};

export interface SilkHydrationCardConfig extends LovelaceCardConfig {
  /** The counter behind the glasses: counter, input_number or number. */
  entity: string;
  /** Glasses in a day. Default 8. */
  goal?: number;
  name?: string;
  icon?: string;
  /** Accent override. */
  color?: string;
}

const DEFAULT_GOAL = 8;
const MAX_GOAL = 24;
const DEFAULT_ICON = 'mdi:cup-water';
const SUPPORTED = ['counter', 'input_number', 'number'];
/** How long an optimistic count survives before the real state wins back. */
const OPTIMISTIC_HOLD_MS = 2000;

/**
 * A tumbler, drawn once and reused: rounded bottom, slight taper, no handle.
 * Filled glasses are solid accent; empty ones are the outline alone.
 */
const CUP_PATH = 'M3,3.4 H13 L12,15.9 A1.8 1.8 0 0 1 10.2,17.6 H5.8 A1.8 1.8 0 0 1 4,15.9 Z';

/**
 * First value that is genuinely a number. `Number(null)` is 0, so an absent
 * counter maximum must be rejected before it silently clamps the goal away.
 */
function numAttr(...values: unknown[]): number | undefined {
  for (const value of values) {
    if (value === null || value === undefined || value === '') continue;
    const n = Number(value);
    if (Number.isFinite(n)) return n;
  }
  return undefined;
}

/** Bounds the backing entity enforces; counters name them differently. */
function boundsOf(stateObj: HassEntity): { min: number; max: number } {
  const attrs = stateObj.attributes;
  return {
    min: numAttr(attrs.min, attrs.minimum) ?? 0,
    max: numAttr(attrs.max, attrs.maximum) ?? Infinity,
  };
}

const EDITOR_TAG = 'silk-hydration-card-editor';

registerEditor(
  EDITOR_TAG,
  [
    {
      name: 'entity',
      required: true,
      selector: { entity: { domain: ['counter', 'input_number', 'number'] } },
    },
    { name: 'name', selector: { text: {} } },
    {
      name: '',
      type: 'grid',
      schema: [
        { name: 'icon', selector: { icon: {} } },
        { name: 'goal', selector: { number: { min: 1, max: MAX_GOAL, mode: 'box' } } },
      ],
    },
    { name: 'color', selector: { ui_color: {} } },
  ],
  {
    entity: '엔티티',
    name: '이름',
    icon: '아이콘',
    goal: '하루 목표(잔)',
    color: '강조 색상',
  },
  { goal: DEFAULT_GOAL }
);

@customElement('silk-hydration-card')
export class SilkHydrationCard extends LitElement {
  @property({ attribute: false }) public hass?: HomeAssistant;

  @state() private _config?: SilkHydrationCardConfig;
  /** Optimistic count (null = trust the entity). */
  @state() private _optimistic: number | null = null;

  /** last_updated snapshot at tap time; any newer stamp clears the override. */
  private _optimisticBase = '';
  private _optimisticTimer?: number;

  public static getStubConfig(hass: HomeAssistant): Partial<SilkHydrationCardConfig> {
    const ids = Object.keys(hass.states);
    const byName = ids.find(
      (id) =>
        SUPPORTED.includes(domainOf(id)) &&
        /water|hydrat|glass|drink/i.test(
          `${id} ${hass.states[id].attributes.friendly_name ?? ''}`
        )
    );
    const entity =
      byName ?? ids.find((id) => id.startsWith('counter.')) ?? ids.find((id) => id.startsWith('input_number.'));
    return { type: 'custom:silk-hydration-card', entity, goal: DEFAULT_GOAL };
  }

  public static async getConfigElement(): Promise<HTMLElement> {
    return document.createElement(EDITOR_TAG);
  }

  public setConfig(config: SilkHydrationCardConfig): void {
    if (!config.entity || typeof config.entity !== 'string') {
      throw new Error('silk-hydration-card: `entity` is required');
    }
    if (!SUPPORTED.includes(domainOf(config.entity))) {
      throw new Error(
        'silk-hydration-card: `entity` must be a counter, input_number or number entity'
      );
    }
    if (
      config.goal !== undefined &&
      (!Number.isFinite(Number(config.goal)) || Number(config.goal) < 1 || Number(config.goal) > MAX_GOAL)
    ) {
      throw new Error(`silk-hydration-card: \`goal\` must be between 1 and ${MAX_GOAL}`);
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
    if (!changed.has('hass') || this._optimistic === null || !this._config) return;
    const stateObj = this.hass?.states[this._config.entity];
    // The confirmation landed: the entity moved on from the value we snapshotted.
    if (stateObj && stateObj.last_updated !== this._optimisticBase) this._clearOptimistic();
  }

  private _clearOptimistic(): void {
    window.clearTimeout(this._optimisticTimer);
    this._optimisticTimer = undefined;
    this._optimistic = null;
  }

  private _goal(): number {
    return Math.round(clamp(Number(this._config?.goal ?? DEFAULT_GOAL), 1, MAX_GOAL));
  }

  /** Current count: the optimistic override, else the entity's number. */
  private _count(stateObj: HassEntity): number | undefined {
    if (this._optimistic !== null) return this._optimistic;
    if (isUnavailable(stateObj) || stateObj.state === '') return undefined;
    const n = Number(stateObj.state);
    return Number.isFinite(n) ? n : undefined;
  }

  private _locale(): string {
    return this.hass?.locale?.language ?? this.hass?.language ?? 'en';
  }

  private _formatCount(value: number): string {
    return new Intl.NumberFormat(this._locale(), { maximumFractionDigits: 1 }).format(value);
  }

  /** Send an absolute count; counters get their own set_value service. */
  private _send(stateObj: HassEntity, target: number): void {
    const hass = this.hass;
    if (!hass) return;
    const entity = stateObj.entity_id;
    const domain = domainOf(entity);
    this._optimistic = target;
    this._optimisticBase = stateObj.last_updated;
    window.clearTimeout(this._optimisticTimer);
    this._optimisticTimer = window.setTimeout(() => this._clearOptimistic(), OPTIMISTIC_HOLD_MS);
    if (domain === 'counter') {
      hass.callService('counter', 'set_value', { entity_id: entity, value: target });
    } else {
      hass.callService(domain, 'set_value', { entity_id: entity, value: target });
    }
  }

  private _onGlassClick(ev: Event, index: number): void {
    ev.stopPropagation();
    const stateObj = this._config ? this.hass?.states[this._config.entity] : undefined;
    if (!stateObj || isUnavailable(stateObj)) return;
    const current = this._count(stateObj);
    if (current === undefined) return;
    const bounds = boundsOf(stateObj);
    // Tapping the last full glass empties it — the way you undo a mis-tap.
    const wanted = Math.round(current) === index + 1 ? index : index + 1;
    const target = clamp(wanted, bounds.min, bounds.max);
    if (target === current) return;
    haptic(this, 'selection');
    this._send(stateObj, target);
  }

  private _onStep(ev: Event, dir: 1 | -1): void {
    ev.stopPropagation();
    const hass = this.hass;
    const stateObj = this._config ? hass?.states[this._config.entity] : undefined;
    if (!hass || !stateObj || isUnavailable(stateObj)) return;
    const current = this._count(stateObj);
    if (current === undefined) return;
    const bounds = boundsOf(stateObj);
    const target = clamp(current + dir, bounds.min, bounds.max);
    if (target === current) return;
    haptic(this, 'selection');
    if (domainOf(stateObj.entity_id) === 'counter') {
      // Counters have first-class stepping that respects their own step size.
      this._optimistic = target;
      this._optimisticBase = stateObj.last_updated;
      window.clearTimeout(this._optimisticTimer);
      this._optimisticTimer = window.setTimeout(() => this._clearOptimistic(), OPTIMISTIC_HOLD_MS);
      hass.callService('counter', dir > 0 ? 'increment' : 'decrement', {
        entity_id: stateObj.entity_id,
      });
      return;
    }
    this._send(stateObj, target);
  }

  private _onCardClick(): void {
    if (this._config) moreInfo(this, this._config.entity);
  }

  private _onIconClick(ev: Event): void {
    ev.stopPropagation();
    if (this._config) moreInfo(this, this._config.entity);
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
    const name = config.name ?? stateObj.attributes.friendly_name ?? config.entity;
    const goal = this._goal();
    const count = unavailable ? undefined : this._count(stateObj);
    const filled = count === undefined ? 0 : clamp(Math.round(count), 0, goal);
    const done = count !== undefined && count >= goal;
    const bounds = boundsOf(stateObj);
    const left = count === undefined ? 0 : Math.max(Math.ceil(goal - count), 0);
    const stateLine = unavailable
      ? stateText(hass, stateObj)
      : done
        ? 'Goal reached'
        : `${left} to go`;

    return html`
      <ha-card
        class="control ${unavailable ? 'unavailable' : ''}"
        style="--silk-accent:${accent}"
        @click=${this._onCardClick}
      >
        <div class="top">
          <button
            class="icon ${done ? 'on' : ''}"
            ?disabled=${unavailable}
            aria-label="Show details"
            @click=${this._onIconClick}
          >
            <ha-icon .icon=${config.icon ?? DEFAULT_ICON}></ha-icon>
          </button>
          <div class="info">
            <div class="name">${name}</div>
            <div class="state">${stateLine}</div>
          </div>
          <div class="trailing">
            <span class="readout ${done ? 'done' : ''}">
              <span class="count">${count === undefined ? '—' : this._formatCount(count)}</span>
              <span class="slash">/</span>
              <span class="goal">${goal}</span>
            </span>
          </div>
        </div>

        <div class="glasses">
          <button
            class="step"
            ?disabled=${unavailable || count === undefined || count <= bounds.min}
            aria-label="One glass less"
            @click=${(ev: Event) => this._onStep(ev, -1)}
          >
            <ha-icon icon="mdi:minus"></ha-icon>
          </button>
          <div class="cups">
            ${Array.from({ length: goal }, (_, i) => {
              const on = i < filled;
              const label = `${i + 1} ${i === 0 ? 'glass' : 'glasses'}`;
              return html`
                <button
                  class="glass ${on ? 'on' : ''}"
                  ?disabled=${unavailable || count === undefined}
                  title=${`Set ${label}`}
                  aria-label=${`Set ${label}`}
                  aria-pressed=${on ? 'true' : 'false'}
                  @click=${(ev: Event) => this._onGlassClick(ev, i)}
                >
                  <svg viewBox="0 0 16 20" aria-hidden="true">
                    ${svg`<path d=${CUP_PATH}></path>`}
                  </svg>
                </button>
              `;
            })}
          </div>
          <button
            class="step"
            ?disabled=${unavailable || count === undefined || count >= bounds.max}
            aria-label="One glass more"
            @click=${(ev: Event) => this._onStep(ev, 1)}
          >
            <ha-icon icon="mdi:plus"></ha-icon>
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
        gap: 10px;
      }
      .top {
        display: flex;
        align-items: center;
        gap: 12px;
        min-width: 0;
      }
      .readout {
        display: inline-flex;
        align-items: baseline;
        gap: 3px;
        font-size: 15px;
        font-weight: 600;
        letter-spacing: -0.01em;
        color: var(--primary-text-color);
        font-variant-numeric: tabular-nums;
        transition: color 200ms ease;
      }
      .readout.done .count {
        color: var(--silk-accent);
      }
      .slash,
      .goal {
        color: var(--secondary-text-color);
        font-weight: 500;
      }
      .glasses {
        display: flex;
        align-items: center;
        gap: 8px;
        min-width: 0;
      }
      .cups {
        flex: 1;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 6px;
        min-width: 0;
      }
      .glass {
        flex: 1 1 0;
        min-width: 10px;
        max-width: 28px;
        height: 30px;
        margin: 0;
        padding: 0;
        border: none;
        background: none;
        cursor: pointer;
        display: grid;
        place-items: center;
        color: var(--secondary-text-color);
        transition:
          transform 250ms var(--silk-spring),
          color 200ms ease;
      }
      .glass:active:not(:disabled) {
        transform: scale(0.88);
        transition-duration: 120ms;
        transition-timing-function: var(--silk-ease-out);
      }
      .glass:disabled {
        cursor: default;
      }
      .glass:focus-visible {
        outline: 2px solid color-mix(in srgb, var(--silk-accent) 70%, transparent);
        outline-offset: 1px;
        border-radius: 6px;
      }
      .glass svg {
        width: 100%;
        height: 100%;
        display: block;
      }
      .glass path {
        fill: none;
        stroke: currentColor;
        stroke-width: 1.4;
        stroke-linejoin: round;
        opacity: 0.45;
        transition:
          fill 200ms ease,
          opacity 200ms ease;
      }
      .glass.on path {
        fill: var(--silk-accent);
        stroke: var(--silk-accent);
        opacity: 1;
      }
      .step {
        flex: none;
        width: 36px;
        height: 36px;
        border: none;
        border-radius: 50%;
        display: grid;
        place-items: center;
        padding: 0;
        cursor: pointer;
        color: var(--primary-text-color);
        background: rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.06);
        transition:
          transform 250ms var(--silk-spring),
          background 200ms ease,
          opacity 200ms ease;
      }
      .step:hover:not(:disabled) {
        background: rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.12);
      }
      .step:active:not(:disabled) {
        transform: scale(0.9);
        transition-duration: 120ms;
        transition-timing-function: var(--silk-ease-out);
      }
      .step:disabled {
        cursor: default;
        opacity: 0.4;
      }
      .step ha-icon {
        --mdc-icon-size: 18px;
        pointer-events: none;
      }
      .icon:disabled {
        cursor: default;
      }
      .unavailable .glasses {
        opacity: 0.45;
        pointer-events: none;
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    'silk-hydration-card': SilkHydrationCard;
  }
}
