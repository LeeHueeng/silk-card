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

const EDITOR_TAG = 'silk-conditional-card-editor';

/** The card's own options, above the conditions. */
const SCALAR_SCHEMA = [
  { name: 'name', selector: { text: {} } },
  { name: 'preview', selector: { boolean: {} } },
];
const SCALAR_LABELS: Record<string, string> = {
  name: '이름',
  preview: '편집 중 항상 표시',
};

/** One condition row. `state`/`state_not` accept several values each. */
const CONDITION_FIELDS: { name: string; label: string; selector: Record<string, unknown> }[] = [
  { name: 'entity', label: '엔티티', selector: { entity: {} } },
  { name: 'state', label: '상태가 같을 때', selector: { text: { multiple: true } } },
  { name: 'state_not', label: '상태가 아닐 때', selector: { text: { multiple: true } } },
  { name: 'above', label: '초과', selector: { number: { mode: 'box', step: 'any' } } },
  { name: 'below', label: '미만', selector: { number: { mode: 'box', step: 'any' } } },
];
const CONDITION_SCHEMA = CONDITION_FIELDS.map((f) => ({ name: f.name, selector: f.selector }));
const CONDITION_LABELS = Object.fromEntries(CONDITION_FIELDS.map((f) => [f.name, f.label]));

/**
 * The child card. Its `type` is a plain text field so the card can be swapped
 * by typing, and everything else lands in an object box — a child card holds
 * *another* card's whole configuration, which no fixed schema can describe and
 * which a custom card cannot hand to HA's own card picker.
 */
const CARD_SCHEMA = [
  { name: 'type', selector: { text: {} } },
  { name: 'card_config', selector: { object: {} } },
];
const CARD_LABELS: Record<string, string> = { type: '카드 종류', card_config: '카드 설정' };

/** `'on'` and `['on','home']` both reach the multi-text field as a list. */
function toTextList(value: unknown): string[] {
  if (Array.isArray(value)) return value.map((item) => String(item));
  if (typeof value === 'string' || typeof value === 'number') return [String(value)];
  return [];
}

/** …and come back as the tidiest shape the card already understands. */
function fromTextList(value: unknown): string | string[] | undefined {
  const list = toTextList(value).filter((item) => item !== '');
  if (list.length === 0) return undefined;
  return list.length === 1 ? list[0] : list;
}

/** A finite number, or undefined — an emptied box must delete the key. */
function optionalNumber(value: unknown): number | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  const num = Number(value);
  return Number.isFinite(num) ? num : undefined;
}

/**
 * Editor: card options, then a repeater of conditions, then the child card.
 * `ha-form` has no repeater and no card picker, so both are built here in the
 * shape `shared/rows.ts` uses — ▲▼ reorder, ✕ delete, add button — with keys
 * the schema never mentions carried through untouched.
 */
function registerConditionalEditor(tag: string): void {
  if (customElements.get(tag)) return;

  class ConditionalEditor extends LitElement {
    @property({ attribute: false }) public hass?: HomeAssistant;
    @state() private _config?: LovelaceCardConfig;

    public setConfig(config: LovelaceCardConfig): void {
      this._config = config;
    }

    private get _conditions(): Record<string, unknown>[] {
      const value = (this._config as Record<string, unknown> | undefined)?.conditions;
      return Array.isArray(value) ? (value as Record<string, unknown>[]) : [];
    }

    private _emit(next: Record<string, unknown>): void {
      this.dispatchEvent(
        new CustomEvent('config-changed', {
          detail: { config: next },
          bubbles: true,
          composed: true,
        })
      );
    }

    private _setConditions(rows: Record<string, unknown>[]): void {
      const next = { ...(this._config as Record<string, unknown>) };
      if (rows.length) next.conditions = rows;
      else delete next.conditions;
      this._emit(next);
    }

    private _scalarsChanged(ev: CustomEvent): void {
      ev.stopPropagation();
      const value = (ev.detail?.value ?? {}) as Record<string, unknown>;
      const next = { ...(this._config as Record<string, unknown>) };
      for (const [key, raw] of Object.entries(value)) {
        if (key === 'conditions' || key === 'card') continue; // edited below
        if (raw === undefined || raw === '') delete next[key];
        else next[key] = raw;
      }
      this._emit(next);
    }

    /** Stored condition → form data (list-shaped state fields). */
    private _conditionData(row: Record<string, unknown>): Record<string, unknown> {
      return { ...row, state: toTextList(row.state), state_not: toTextList(row.state_not) };
    }

    private _conditionChanged(ev: CustomEvent, index: number): void {
      ev.stopPropagation();
      const value = (ev.detail?.value ?? {}) as Record<string, unknown>;
      const rows = this._conditions.map((r) => ({ ...r }));
      // Unknown keys stay: only the five fields this editor knows are touched.
      const row = { ...rows[index] };
      for (const field of CONDITION_FIELDS) {
        const raw = value[field.name];
        let normalized: unknown;
        if (field.name === 'state' || field.name === 'state_not') normalized = fromTextList(raw);
        else if (field.name === 'above' || field.name === 'below') normalized = optionalNumber(raw);
        else normalized = raw === '' ? undefined : raw;
        if (normalized === undefined) delete row[field.name];
        else row[field.name] = normalized;
      }
      rows[index] = row;
      this._setConditions(rows);
    }

    /**
     * A new row starts on a real entity when one is to hand: an empty `entity`
     * fails the card's own validation, so a blank row would put the preview in
     * an error state before the user has typed anything.
     */
    private _blankCondition(): Record<string, unknown> {
      const ids = Object.keys(this.hass?.states ?? {});
      const entity =
        ids.find((id) => id.startsWith('light.')) ??
        ids.find((id) => id.startsWith('switch.')) ??
        ids.find((id) => id.startsWith('binary_sensor.')) ??
        ids[0] ??
        '';
      return { entity, state: 'on' };
    }

    private _addCondition(): void {
      this._setConditions([...this._conditions.map((r) => ({ ...r })), this._blankCondition()]);
    }

    private _removeCondition(index: number): void {
      this._setConditions(this._conditions.filter((_, i) => i !== index));
    }

    private _moveCondition(index: number, delta: number): void {
      const rows = this._conditions.map((r) => ({ ...r }));
      const target = index + delta;
      if (target < 0 || target >= rows.length) return;
      [rows[index], rows[target]] = [rows[target], rows[index]];
      this._setConditions(rows);
    }

    /** Child card → {type, everything else}. */
    private _cardData(): Record<string, unknown> {
      const card = ((this._config as Record<string, unknown> | undefined)?.card ?? {}) as Record<
        string,
        unknown
      >;
      const { type, ...rest } = card;
      return { type: typeof type === 'string' ? type : '', card_config: rest };
    }

    private _cardChanged(ev: CustomEvent): void {
      ev.stopPropagation();
      const value = (ev.detail?.value ?? {}) as Record<string, unknown>;
      const previous = ((this._config as Record<string, unknown> | undefined)?.card ?? {}) as Record<
        string,
        unknown
      >;
      const body = value.card_config;
      const rest =
        body && typeof body === 'object' && !Array.isArray(body)
          ? (body as Record<string, unknown>)
          : {};
      const type = typeof value.type === 'string' && value.type !== '' ? value.type : previous.type;
      const next = { ...(this._config as Record<string, unknown>) };
      next.card = { ...rest, ...(type === undefined ? {} : { type }) };
      this._emit(next);
    }

    protected render(): TemplateResult | typeof nothing {
      if (!this.hass || !this._config) return nothing;
      const conditions = this._conditions;
      return html`
        <ha-form
          .hass=${this.hass}
          .data=${{ ...this._config }}
          .schema=${SCALAR_SCHEMA}
          .computeLabel=${(s: { name: string }) => SCALAR_LABELS[s.name] ?? s.name}
          @value-changed=${this._scalarsChanged}
        ></ha-form>

        <div class="head">
          <span class="title">조건</span>
          <span class="count">${conditions.length}</span>
        </div>

        ${conditions.map(
          (item, index) => html`
            <div class="row">
              <div class="grip">
                <button
                  class="mini"
                  ?disabled=${index === 0}
                  title="위로"
                  @click=${() => this._moveCondition(index, -1)}
                >
                  ▲
                </button>
                <button
                  class="mini"
                  ?disabled=${index === conditions.length - 1}
                  title="아래로"
                  @click=${() => this._moveCondition(index, 1)}
                >
                  ▼
                </button>
              </div>
              <ha-form
                class="fields"
                .hass=${this.hass}
                .data=${this._conditionData(item)}
                .schema=${CONDITION_SCHEMA}
                .computeLabel=${(s: { name: string }) => CONDITION_LABELS[s.name] ?? s.name}
                @value-changed=${(ev: CustomEvent) => this._conditionChanged(ev, index)}
              ></ha-form>
              <button
                class="mini remove"
                title="삭제"
                @click=${() => this._removeCondition(index)}
              >
                ✕
              </button>
            </div>
          `
        )}

        <button class="add" @click=${this._addCondition}>+ 조건 추가</button>

        <div class="head"><span class="title">표시할 카드</span></div>
        <div class="row card">
          <ha-form
            class="fields"
            .hass=${this.hass}
            .data=${this._cardData()}
            .schema=${CARD_SCHEMA}
            .computeLabel=${(s: { name: string }) => CARD_LABELS[s.name] ?? s.name}
            @value-changed=${this._cardChanged}
          ></ha-form>
        </div>
      `;
    }

    static styles = css`
      :host {
        display: block;
      }
      .head {
        display: flex;
        align-items: center;
        gap: 6px;
        margin: 14px 0 6px;
        font-size: 13px;
        font-weight: 600;
        color: var(--primary-text-color);
      }
      .count {
        font-size: 11px;
        font-weight: 600;
        color: var(--secondary-text-color);
        background: rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.08);
        border-radius: 999px;
        padding: 1px 7px;
      }
      .row {
        display: flex;
        align-items: flex-start;
        gap: 6px;
        padding: 8px;
        margin-bottom: 6px;
        border-radius: 12px;
        background: rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.04);
      }
      .fields {
        flex: 1;
        min-width: 0;
      }
      .grip {
        display: flex;
        flex-direction: column;
        gap: 2px;
      }
      .mini {
        border: none;
        background: rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.08);
        color: var(--secondary-text-color);
        border-radius: 8px;
        width: 26px;
        height: 22px;
        font-size: 10px;
        cursor: pointer;
        padding: 0;
      }
      .mini:disabled {
        opacity: 0.3;
        cursor: default;
      }
      .mini.remove {
        height: 26px;
        color: var(--error-color, #db4437);
      }
      .add {
        border: none;
        width: 100%;
        padding: 10px;
        border-radius: 12px;
        font: inherit;
        font-size: 13px;
        font-weight: 600;
        cursor: pointer;
        color: var(--primary-color);
        background: rgba(var(--rgb-primary-color, 74, 168, 255), 0.12);
      }
    `;
  }

  customElements.define(tag, ConditionalEditor);
}

registerConditionalEditor(EDITOR_TAG);

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

  public static async getConfigElement(): Promise<HTMLElement> {
    return document.createElement(EDITOR_TAG);
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
