import { LitElement, html, css, nothing, PropertyValues, TemplateResult } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { HomeAssistant, LovelaceCardConfig } from '../types';
import { silkControlStyles } from '../shared/base';
import { isUnavailable } from '../shared/service';
import { accentFor } from '../shared/color';

export const META = {
  type: 'silk-conditional-card',
  name: 'Silk Conditional',
  description: 'Show it only when it matters.',
};

/**
 * One test against one entity. Every field is optional except `entity`; a
 * condition with no test at all passes whenever the entity exists and is
 * neither unavailable nor unknown.
 */
export interface SilkCondition {
  entity: string;
  state?: string | string[];
  state_not?: string | string[];
  above?: number;
  below?: number;
}

/** YAML-only card: a nested `card:` config is YAML territory. */
export interface SilkConditionalCardConfig extends LovelaceCardConfig {
  /** Every condition must pass for the card to appear. */
  conditions: SilkCondition[];
  card: LovelaceCardConfig;
  name?: string;
  /** Forces the edit-mode chrome; the frontend also sets a `preview` class. */
  preview?: boolean;
}

/** A rendered Lovelace card element — the frontend contract, typed locally. */
interface LovelaceCard extends HTMLElement {
  hass?: HomeAssistant;
  getCardSize?: () => number | Promise<number>;
}

/** Subset of the helpers object resolved by window.loadCardHelpers(). */
interface CardHelpers {
  createCardElement(config: LovelaceCardConfig): LovelaceCard;
}

/** Enter animation length; matches the CSS keyframe below. */
const ENTER_MS = 200;

function asList(value: string | string[]): string[] {
  return Array.isArray(value) ? value : [value];
}

/** A child's own size; plenty of cards resolve it lazily or omit it entirely. */
function cardSize(card: LovelaceCard): number {
  if (typeof card.getCardSize !== 'function') return 1;
  try {
    const size = card.getCardSize();
    return typeof size === 'number' && Number.isFinite(size) ? size : 1;
  } catch {
    return 1;
  }
}

/**
 * A wrapper that gets out of the way. When the conditions fail the host is
 * `display: none` — not an empty box, not a collapsed card, nothing at all —
 * so the dashboard closes over the gap. In edit mode it always shows itself,
 * outlined and labelled, because a card you cannot see is a card you cannot fix.
 */
@customElement('silk-conditional-card')
export class SilkConditionalCard extends LitElement {
  @property({ attribute: false }) public hass?: HomeAssistant;

  /** Reflected so the host really takes no grid space while hidden. */
  @property({ type: Boolean, reflect: true }) public hidden = false;

  /** Set by the frontend in editor preview panes. */
  @property({ type: Boolean }) public preview = false;

  /** Set by the frontend while the dashboard is in edit mode. */
  @property({ type: Boolean }) public editMode = false;

  @state() private _config?: SilkConditionalCardConfig;
  @state() private _shown = false;
  /** Built lazily on the first pass; null until then. */
  @state() private _child: LovelaceCard | null = null;
  @state() private _helpersMissing = false;
  @state() private _buildFailed = false;

  private _conditions: SilkCondition[] = [];
  private _buildSeq = 0;
  private _building = false;

  public static getStubConfig(hass: HomeAssistant): Partial<SilkConditionalCardConfig> {
    const ids = Object.keys(hass.states);
    const entity =
      ids.find((id) => id.startsWith('light.')) ??
      ids.find((id) => id.startsWith('switch.')) ??
      ids[0];
    return {
      type: 'custom:silk-conditional-card',
      conditions: entity ? [{ entity, state: 'on' }] : [],
      card: { type: 'custom:silk-toggle-card', entity },
    };
  }

  public setConfig(config: SilkConditionalCardConfig): void {
    if (!Array.isArray(config.conditions) || config.conditions.length === 0) {
      throw new Error(
        'silk-conditional-card: `conditions` is required — a list of {entity, state | state_not | above | below}'
      );
    }
    // Normalize into a local first: a throw halfway through must not leave the
    // card holding conditions that disagree with its config.
    const conditions: SilkCondition[] = config.conditions.map((raw, i) => {
      if (!raw || typeof raw !== 'object' || typeof raw.entity !== 'string' || !raw.entity.includes('.')) {
        throw new Error(`silk-conditional-card: conditions[${i}].entity must be an entity id`);
      }
      for (const key of ['above', 'below'] as const) {
        if (raw[key] !== undefined && !Number.isFinite(Number(raw[key]))) {
          throw new Error(`silk-conditional-card: conditions[${i}].${key} must be a number`);
        }
      }
      return raw;
    });
    if (!config.card || typeof config.card !== 'object' || typeof config.card.type !== 'string') {
      throw new Error('silk-conditional-card: `card` is required — a card configuration with a `type`');
    }
    this._conditions = conditions;
    this._config = config;
    this._buildSeq++; // cancels any in-flight build of the old config
    this._building = false;
    this._child = null; // rebuilt on the next pass with the fresh config
    this._helpersMissing = false;
    this._buildFailed = false;
  }

  public getCardSize(): number {
    return this._child ? cardSize(this._child) : 1;
  }

  public getGridOptions(): Record<string, number> {
    return { columns: 12, rows: 2, min_columns: 3, min_rows: 1 };
  }

  protected firstUpdated(): void {
    // The `preview` class lands on the host after our first render, and a class
    // is not reactive — one extra pass picks up the edit-mode chrome.
    this.requestUpdate();
  }

  protected willUpdate(changed: PropertyValues): void {
    if (!this._config) return;
    const shown = this._editing() || this._pass();
    this._shown = shown;
    this.hidden = !shown;
    if (!shown) return;
    if (!this._child && !this._helpersMissing && !this._buildFailed && !this._building) {
      void this._buildChild();
    } else if (changed.has('hass')) {
      this._assignHass();
    }
  }

  protected updated(changed: PropertyValues): void {
    // Replay the entrance on every hidden → visible transition, not just the
    // first: reappearing is the whole point of this card.
    if (changed.has('_shown') && this._shown) this._replayEnter();
  }

  /** Edit and preview panes always render, whatever the conditions say. */
  private _editing(): boolean {
    return (
      this.preview || this.editMode || this._config?.preview === true || this.classList.contains('preview')
    );
  }

  private _pass(): boolean {
    const hass = this.hass;
    if (!hass) return false;
    return this._conditions.every((condition) => this._passOne(condition));
  }

  private _passOne(condition: SilkCondition): boolean {
    const stateObj = this.hass?.states[condition.entity];
    if (!stateObj) return false;
    const value = stateObj.state;
    if (condition.state !== undefined && !asList(condition.state).includes(value)) return false;
    if (condition.state_not !== undefined && asList(condition.state_not).includes(value)) return false;
    const numeric = Number(value);
    if (condition.above !== undefined) {
      if (!Number.isFinite(numeric) || !(numeric > Number(condition.above))) return false;
    }
    if (condition.below !== undefined) {
      if (!Number.isFinite(numeric) || !(numeric < Number(condition.below))) return false;
    }
    // A bare {entity} means "this entity is reporting something".
    if (
      condition.state === undefined &&
      condition.state_not === undefined &&
      condition.above === undefined &&
      condition.below === undefined
    ) {
      return !isUnavailable(stateObj);
    }
    return true;
  }

  private _replayEnter(): void {
    const body = this.renderRoot.querySelector<HTMLElement>('.body');
    if (!body) return;
    body.classList.remove('enter');
    void body.offsetWidth; // commit the removal so the animation restarts
    body.classList.add('enter');
  }

  private async _buildChild(): Promise<void> {
    const cfg = this._config?.card;
    if (!cfg) return;
    const seq = ++this._buildSeq;
    this._building = true;
    // loadCardHelpers is injected by the HA frontend at runtime; it is not part
    // of our typed hass surface, so reach for it through a local window cast.
    const loadCardHelpers = (window as unknown as { loadCardHelpers?: () => Promise<CardHelpers> })
      .loadCardHelpers;
    if (typeof loadCardHelpers !== 'function') {
      this._building = false;
      this._helpersMissing = true;
      return;
    }
    try {
      const helpers = await loadCardHelpers();
      if (seq !== this._buildSeq) return; // superseded by a newer config
      this._child = helpers.createCardElement(cfg);
      this._assignHass();
    } catch (err) {
      console.warn('silk-conditional-card: card could not be created', err);
      if (seq === this._buildSeq) this._buildFailed = true;
    } finally {
      if (seq === this._buildSeq) this._building = false;
    }
  }

  /** Hidden children stay parked: hass only flows while the card is on screen. */
  private _assignHass(): void {
    if (this.hass && this._child) this._child.hass = this.hass;
  }

  /** Human-readable conditions, for the edit-mode chip's tooltip. */
  private _summary(): string {
    return this._conditions
      .map((c) => {
        const parts: string[] = [];
        if (c.state !== undefined) parts.push(`is ${asList(c.state).join(' / ')}`);
        if (c.state_not !== undefined) parts.push(`is not ${asList(c.state_not).join(' / ')}`);
        if (c.above !== undefined) parts.push(`> ${c.above}`);
        if (c.below !== undefined) parts.push(`< ${c.below}`);
        return `${c.entity} ${parts.join(' and ') || 'is reporting'}`;
      })
      .join('\n');
  }

  private _renderChild(): TemplateResult | LovelaceCard | typeof nothing {
    if (this._helpersMissing) {
      return html`<div class="note">Conditional cards require Home Assistant</div>`;
    }
    if (this._buildFailed) {
      return html`<div class="note">Could not build <code>${this._config?.card.type}</code></div>`;
    }
    if (!this._child) return nothing; // build in flight
    return this._child;
  }

  protected render(): TemplateResult | typeof nothing {
    const config = this._config;
    if (!config || !this._shown) return nothing;
    const editing = this._editing();
    const passing = this._pass();
    return html`
      <div class="body ${editing ? 'editing' : ''}" style="--silk-accent:${accentFor(undefined)}">
        ${editing
          ? html`
              <div class="tagline">
                <span class="chip tag" title=${this._summary()}>Conditional</span>
                ${config.name ? html`<span class="label" title=${config.name}>${config.name}</span>` : nothing}
                <span class="verdict">${passing ? 'showing now' : 'hidden now'}</span>
              </div>
            `
          : nothing}
        ${this._renderChild()}
      </div>
    `;
  }

  static styles = [
    silkControlStyles,
    css`
      /* A wrapper, not a card: it owns no chrome and no height of its own. */
      :host {
        height: auto;
        display: block;
      }
      :host([hidden]) {
        display: none !important;
      }
      .body {
        display: flex;
        flex-direction: column;
        gap: 8px;
        min-width: 0;
      }
      .body.enter {
        animation: silk-conditional-in ${ENTER_MS}ms var(--silk-ease-out) both;
      }
      /* Edit mode: the wrapper becomes visible so it can be selected and fixed. */
      .body.editing {
        padding: 8px;
        border-radius: 14px;
        outline: 1px dashed rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.35);
        outline-offset: -1px;
      }
      .tagline {
        display: flex;
        align-items: center;
        gap: 8px;
        min-width: 0;
      }
      .tag {
        flex: none;
        cursor: default;
      }
      .tag:hover {
        background: rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.06);
      }
      .label {
        flex: 0 1 auto;
        min-width: 0;
        font-size: 12.5px;
        color: var(--primary-text-color);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .verdict {
        flex: none;
        margin-left: auto;
        font-size: 11px;
        color: var(--secondary-text-color);
        white-space: nowrap;
      }
      .note {
        font-size: 13px;
        color: var(--secondary-text-color);
      }
      .note code {
        font-size: 12px;
      }
      @keyframes silk-conditional-in {
        from {
          opacity: 0;
          transform: translateY(4px);
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
    'silk-conditional-card': SilkConditionalCard;
  }
}
