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
  stateText,
} from '../shared/service';
import { accentFor } from '../shared/color';
import { registerEditor } from '../shared/editor';

export const META = {
  type: 'silk-fireplace-card',
  name: 'Silk Fireplace',
  description: "A hearth that's actually on.",
};

export interface SilkFireplaceCardConfig extends LovelaceCardConfig {
  /** The switch/light behind the hearth — the flame follows it, never fakes it. */
  entity: string;
  name?: string;
  /** Accent override; the ember tones follow via --silk-flame-mid/core. */
  color?: string;
}

/** Default hearth accent — the outer flame's colour. */
const HEARTH = '#e8734f';

/**
 * Flame geometry (viewBox 0 0 64 92, base at y≈86). Three nested leaf shapes,
 * each scaled from its own base by CSS so the lick reads as fire rather than
 * as a bouncing icon.
 */
const FLAME_OUTER =
  'M32 5 C 38 21 51 32 51 50 C 51 70 42 86 32 86 C 22 86 13 70 13 50 C 13 33 26 21 32 5 Z';
const FLAME_MID =
  'M32 23 C 36 34 45 42 45 55 C 45 71 39 83 32 83 C 25 83 19 71 19 55 C 19 42 28 34 32 23 Z';
const FLAME_CORE =
  'M32 41 C 35 48 39 53 39 62 C 39 73 36 81 32 81 C 28 81 25 73 25 62 C 25 53 29 48 32 41 Z';

const OPTIMISTIC_TIMEOUT_MS = 2000;

const EDITOR_TAG = 'silk-fireplace-card-editor';

registerEditor(
  EDITOR_TAG,
  [
    {
      name: 'entity',
      required: true,
      selector: { entity: { domain: ['switch', 'light', 'input_boolean', 'fan', 'climate'] } },
    },
    { name: 'name', selector: { text: {} } },
    { name: 'color', selector: { text: {} } },
  ],
  { entity: 'Entity', name: 'Name', color: 'Flame colour' }
);

/** The state the service call lands on, for optimistic display. */
function predictedState(domain: string, on: boolean): string {
  if (domain === 'climate') return on ? 'heat' : 'off';
  return on ? 'on' : 'off';
}

/**
 * An ambient hearth wired to a real device. The flame only moves while the
 * device is on — the loop depicts something genuinely in motion, which is the
 * single exception Silk grants to looping animation. Off, it collapses to a
 * flat 12% silhouette: cold, honest, unmistakable at a glance.
 */
@customElement('silk-fireplace-card')
export class SilkFireplaceCard extends LitElement {
  @property({ attribute: false }) public hass?: HomeAssistant;

  @state() private _config?: SilkFireplaceCardConfig;

  /** Optimistic target (null = trust the real state). */
  @state() private _optimistic: boolean | null = null;

  /** last_updated snapshot at toggle time; any newer stamp clears the override. */
  private _optimisticBase = '';
  private _optimisticTimer?: number;

  public static getStubConfig(hass: HomeAssistant): Partial<SilkFireplaceCardConfig> {
    const ids = Object.keys(hass.states);
    const looksLikeHearth = (id: string): boolean =>
      /fire|hearth|stove|chimney|ember/i.test(
        `${id} ${String(hass.states[id].attributes.friendly_name ?? '')}`
      );
    const entity =
      ids.find((id) => id.startsWith('switch.') && looksLikeHearth(id)) ??
      ids.find((id) => id.startsWith('light.') && looksLikeHearth(id)) ??
      ids.find((id) => id.startsWith('switch.'));
    return { type: 'custom:silk-fireplace-card', entity };
  }

  public static async getConfigElement(): Promise<HTMLElement> {
    return document.createElement(EDITOR_TAG);
  }

  public setConfig(config: SilkFireplaceCardConfig): void {
    if (!config.entity) {
      throw new Error('silk-fireplace-card: `entity` is required');
    }
    this._config = config;
    this._clearOptimistic();
  }

  public getCardSize(): number {
    return 3;
  }

  public getGridOptions(): Record<string, number> {
    return { columns: 3, rows: 3, min_columns: 2, min_rows: 2 };
  }

  public disconnectedCallback(): void {
    super.disconnectedCallback();
    this._clearOptimistic();
  }

  protected willUpdate(changed: PropertyValues): void {
    if (!changed.has('hass') || this._optimistic === null || !this._config) return;
    const stateObj = this.hass?.states[this._config.entity];
    if (stateObj && stateObj.last_updated !== this._optimisticBase) this._clearOptimistic();
  }

  private _clearOptimistic(): void {
    window.clearTimeout(this._optimisticTimer);
    this._optimisticTimer = undefined;
    this._optimistic = null;
  }

  /** Tap anywhere on the hearth lights it — the flame *is* the control. */
  private _onToggle(): void {
    const config = this._config;
    const hass = this.hass;
    if (!config || !hass) return;
    const stateObj = hass.states[config.entity];
    if (!stateObj || isUnavailable(stateObj)) return;
    haptic(this);
    this._optimistic = !isActive(stateObj);
    this._optimisticBase = stateObj.last_updated;
    window.clearTimeout(this._optimisticTimer);
    this._optimisticTimer = window.setTimeout(() => this._clearOptimistic(), OPTIMISTIC_TIMEOUT_MS);
    void toggleEntity(hass, config.entity);
  }

  /** The label under the flame opens more-info, keeping the card contract intact. */
  private _onMetaClick(ev: Event): void {
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
    const lit = !unavailable && (this._optimistic ?? isActive(stateObj));
    // While an override is live the reported state is stale — synthesize one so
    // the label agrees with the flame.
    const displayObj: HassEntity =
      this._optimistic === null
        ? stateObj
        : { ...stateObj, state: predictedState(domainOf(config.entity), this._optimistic) };
    // A hearth is warm by definition, so the domain accent yields to the flame
    // colour; an explicit `color` still wins over both.
    const accent = accentFor(stateObj, config.color ?? HEARTH);
    const name = config.name ?? stateObj.attributes.friendly_name ?? config.entity;
    const label = unavailable ? 'Unavailable' : stateText(hass, displayObj);

    return html`
      <ha-card
        class="control ${unavailable ? 'unavailable' : ''}"
        style="--silk-accent:${accent}"
        role="button"
        tabindex=${unavailable ? -1 : 0}
        aria-pressed=${lit ? 'true' : 'false'}
        aria-label=${lit ? `Turn off ${name}` : `Turn on ${name}`}
        @click=${this._onToggle}
        @keydown=${(ev: KeyboardEvent) => {
          if (ev.key === 'Enter' || ev.key === ' ') {
            ev.preventDefault();
            this._onToggle();
          }
        }}
      >
        <div class="hearth">
          <svg
            class="flame ${lit ? 'on' : 'off'}"
            viewBox="0 0 64 92"
            preserveAspectRatio="xMidYMax meet"
            role="img"
          >
            <title>${name}: ${label}</title>
            <path class="layer outer" d=${FLAME_OUTER}></path>
            <path class="layer mid" d=${FLAME_MID}></path>
            <path class="layer core" d=${FLAME_CORE}></path>
          </svg>
        </div>
        <button class="meta" @click=${this._onMetaClick} aria-label=${`Show ${name} details`}>
          <span class="name">${name}</span>
          <span class="state">${label}</span>
        </button>
      </ha-card>
    `;
  }

  static styles = [
    silkControlStyles,
    css`
      ha-card {
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 6px;
        padding: 10px 12px;
      }
      ha-card:focus-visible {
        outline: 2px solid color-mix(in srgb, var(--silk-accent) 70%, transparent);
        outline-offset: -2px;
      }
      .hearth {
        flex: 1 1 auto;
        min-height: 44px;
        width: 100%;
      }
      /* preserveAspectRatio letterboxes the flame inside whatever box the grid
         hands us, anchored to the bottom — no aspect-ratio guesswork needed. */
      .flame {
        display: block;
        width: 100%;
        height: 100%;
      }
      .layer {
        /* Each leaf scales from its own base, so the flame grows upward. */
        transform-box: fill-box;
        transform-origin: 50% 100%;
        transition:
          fill 250ms ease,
          opacity 250ms ease;
      }
      .outer {
        fill: var(--silk-accent);
        opacity: 0.7;
      }
      .mid {
        fill: var(--silk-flame-mid, #e6a23c);
        opacity: 0.5;
      }
      .core {
        fill: var(--silk-flame-core, #f0b357);
        opacity: 0.3;
      }
      /* Cold hearth: one flat silhouette, no colour, no motion. */
      .flame.off .outer {
        fill: var(--primary-text-color);
        opacity: 0.12;
      }
      .flame.off .mid,
      .flame.off .core {
        opacity: 0;
      }
      /* Motion only while the device is genuinely burning. */
      .flame.on .outer {
        animation: silk-flame-lick 2.4s ease-in-out infinite;
      }
      .flame.on .mid {
        animation: silk-flame-lick 3.1s ease-in-out -0.7s infinite;
      }
      .flame.on .core {
        animation: silk-flame-flick 1.8s ease-in-out -1.3s infinite;
      }
      @keyframes silk-flame-lick {
        0%,
        100% {
          transform: scale(1, 1) translateY(0);
        }
        35% {
          transform: scale(0.98, 1.08) translateY(-2%);
        }
        70% {
          transform: scale(1.02, 0.96) translateY(1%);
        }
      }
      @keyframes silk-flame-flick {
        0%,
        100% {
          transform: scale(1, 1) translateY(0);
        }
        45% {
          transform: scale(0.94, 1.14) translateY(-3%);
        }
      }
      .meta {
        flex: none;
        display: block;
        width: 100%;
        max-width: 100%;
        min-width: 0;
        margin: 0;
        padding: 2px 0;
        border: none;
        background: none;
        font: inherit;
        color: inherit;
        text-align: center;
        cursor: pointer;
        border-radius: 8px;
        outline: none;
      }
      .meta:focus-visible {
        box-shadow: inset 0 0 0 2px color-mix(in srgb, var(--silk-accent) 70%, transparent);
      }
      .name,
      .state {
        display: block;
        max-width: 100%;
      }
      .state {
        text-transform: capitalize;
      }
      .unavailable .hearth,
      .unavailable .meta {
        opacity: 0.45;
      }
      /* The shared reduced-motion rule zeroes durations; kill the loop outright. */
      @media (prefers-reduced-motion: reduce) {
        .layer {
          animation: none !important;
        }
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    'silk-fireplace-card': SilkFireplaceCard;
  }
}
