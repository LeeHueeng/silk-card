import { LitElement, html, css, nothing, PropertyValues, TemplateResult } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { HomeAssistant, LovelaceCardConfig } from '../types';
import { silkControlStyles } from '../shared/base';
import { accentFor } from '../shared/color';

export const META = {
  type: 'silk-grid-card',
  name: 'Silk Grid',
  description: 'Lay children out exactly how you want.',
};

/** A child card plus how much of the grid it claims. */
export interface SilkGridChildConfig extends LovelaceCardConfig {
  /** Columns this child spans. Default 1, clamped to the grid width. */
  column_span?: number;
  /** Rows this child spans. Default 1. */
  row_span?: number;
}

/** YAML-only card: a nested `cards:` list is YAML territory. */
export interface SilkGridCardConfig extends LovelaceCardConfig {
  cards: SilkGridChildConfig[];
  /** Track count. Default 2. */
  columns?: number;
  /** Gutter in px. Default 10. */
  gap?: number;
  /** Force 1:1 cells — a tile wall rather than a stack of cards. */
  square?: boolean;
  /** Optional heading row. */
  name?: string;
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

/** Per-child placement, resolved once in setConfig. */
interface CellSpec {
  type: string;
  columnSpan: number;
  rowSpan: number;
}

const DEFAULT_COLUMNS = 2;
const MAX_COLUMNS = 12;
const DEFAULT_GAP = 10;
const MAX_GAP = 48;
const MAX_SPAN = 12;

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

function positiveInt(value: unknown, fallback: number, max: number): number {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(Math.max(Math.round(n), 1), max);
}

/**
 * A layout container, not a card: no chrome of its own, no opinions about what
 * goes inside, just an honest CSS grid that honours the spans you asked for.
 * One child failing to build leaves a small tile behind rather than taking the
 * whole wall down with it.
 */
@customElement('silk-grid-card')
export class SilkGridCard extends LitElement {
  @property({ attribute: false }) public hass?: HomeAssistant;

  @state() private _config?: SilkGridCardConfig;
  /** Built children, index-aligned with `_specs`; null entries failed to build. */
  @state() private _children: (LovelaceCard | null)[] | null = null;
  @state() private _helpersMissing = false;
  /** Measured square-cell edge in px; null until the grid has a width. */
  @state() private _cell: number | null = null;

  private _specs: CellSpec[] = [];
  private _buildSeq = 0;
  private _building = false;
  private _resize?: ResizeObserver;

  public static getStubConfig(): Partial<SilkGridCardConfig> {
    return { type: 'custom:silk-grid-card', columns: 2, cards: [] };
  }

  public setConfig(config: SilkGridCardConfig): void {
    if (!Array.isArray(config.cards)) {
      throw new Error('silk-grid-card: `cards` is required — a list of card configurations');
    }
    if (config.columns !== undefined && !(Number(config.columns) >= 1)) {
      throw new Error('silk-grid-card: `columns` must be a number of at least 1');
    }
    if (config.gap !== undefined && !(Number(config.gap) >= 0)) {
      throw new Error('silk-grid-card: `gap` must be zero or more pixels');
    }
    const columns = positiveInt(config.columns, DEFAULT_COLUMNS, MAX_COLUMNS);
    // Normalize into a local first: a throw halfway through must not leave the
    // card holding a layout that disagrees with its config.
    const specs: CellSpec[] = config.cards.map((cfg, i) => {
      if (!cfg || typeof cfg !== 'object' || typeof cfg.type !== 'string') {
        throw new Error(`silk-grid-card: cards[${i}] must be a card configuration with a \`type\``);
      }
      return {
        type: cfg.type,
        // A child can never claim more columns than the grid has.
        columnSpan: Math.min(positiveInt(cfg.column_span, 1, MAX_SPAN), columns),
        rowSpan: positiveInt(cfg.row_span, 1, MAX_SPAN),
      };
    });
    this._specs = specs;
    this._config = config;
    this._buildSeq++; // cancels any in-flight build of the old config
    this._building = false;
    this._children = null; // rebuilt with the fresh config
    this._helpersMissing = false;
  }

  public getCardSize(): number {
    const columns = this._columns();
    const total = (this._children ?? []).reduce(
      (sum, child) => sum + (child ? cardSize(child) : 1),
      0
    );
    return Math.max(1, Math.ceil((total || this._specs.length) / columns));
  }

  public getGridOptions(): Record<string, number> {
    return { columns: 12, rows: 4, min_columns: 4, min_rows: 2 };
  }

  public disconnectedCallback(): void {
    super.disconnectedCallback();
    this._resize?.disconnect();
    this._resize = undefined;
  }

  protected firstUpdated(): void {
    this._observe();
  }

  protected willUpdate(changed: PropertyValues): void {
    if (!this._config) return;
    if (this._children === null && !this._helpersMissing && !this._building) {
      void this._buildChildren();
    }
    if (changed.has('hass')) this._assignHass();
  }

  protected updated(changed: PropertyValues): void {
    // The grid element is absent on the helpers-missing render, so the observer
    // is (re)attached here as well as on first paint.
    this._observe();
    if (changed.has('_config')) this._measure();
  }

  private _columns(): number {
    return positiveInt(this._config?.columns, DEFAULT_COLUMNS, MAX_COLUMNS);
  }

  private _gap(): number {
    const raw = Number(this._config?.gap ?? DEFAULT_GAP);
    if (!Number.isFinite(raw)) return DEFAULT_GAP;
    return Math.min(Math.max(raw, 0), MAX_GAP);
  }

  private _observe(): void {
    const grid = this.renderRoot.querySelector<HTMLElement>('.grid');
    if (!grid || this._resize) return;
    // Square cells are measured, not guessed: a CSS aspect-ratio would be off
    // by one gutter on every child that spans more than a single column.
    this._resize = new ResizeObserver(() => this._measure());
    this._resize.observe(grid);
    this._measure();
  }

  private _measure(): void {
    if (!this._config?.square) {
      if (this._cell !== null) this._cell = null;
      return;
    }
    const grid = this.renderRoot.querySelector<HTMLElement>('.grid');
    if (!grid) return;
    const columns = this._columns();
    const width = grid.clientWidth;
    if (!width) return;
    const cell = (width - this._gap() * (columns - 1)) / columns;
    if (!(cell > 0)) return;
    if (this._cell === null || Math.abs(this._cell - cell) > 0.5) this._cell = cell;
  }

  private async _buildChildren(): Promise<void> {
    const cfgs = this._config?.cards ?? [];
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
      // One bad child must not cost the others their place in the grid.
      this._children = cfgs.map((cfg) => {
        try {
          return helpers.createCardElement(cfg);
        } catch (err) {
          console.warn('silk-grid-card: card could not be created', err);
          return null;
        }
      });
      this._assignHass();
    } catch (err) {
      console.warn('silk-grid-card: card helpers failed', err);
      if (seq === this._buildSeq) this._helpersMissing = true;
    } finally {
      if (seq === this._buildSeq) this._building = false;
    }
  }

  private _assignHass(): void {
    if (!this.hass || !this._children) return;
    for (const child of this._children) {
      if (child) child.hass = this.hass;
    }
  }

  private _renderCell(spec: CellSpec, index: number): TemplateResult {
    const child = this._children?.[index];
    const style = `grid-column:span ${spec.columnSpan};grid-row:span ${spec.rowSpan}`;
    if (child === null) {
      return html`
        <div class="cell failed" style=${style} title=${`${spec.type} could not be created`}>
          <ha-icon .icon=${'mdi:alert-circle-outline'}></ha-icon>
          <span class="ftype">${spec.type}</span>
        </div>
      `;
    }
    return html`<div class="cell" style=${style}>${child ?? nothing}</div>`;
  }

  protected render(): TemplateResult | typeof nothing {
    const config = this._config;
    if (!config) return nothing;
    if (this._helpersMissing) {
      return html`<ha-card><div class="note">Grids require Home Assistant</div></ha-card>`;
    }
    const square = config.square === true;
    const gridStyle = [
      `--silk-grid-cols:${this._columns()}`,
      `--silk-grid-gap:${this._gap()}px`,
      square && this._cell !== null ? `grid-auto-rows:${this._cell.toFixed(2)}px` : '',
    ]
      .filter(Boolean)
      .join(';');

    return html`
      <ha-card style="--silk-accent:${accentFor(undefined)}">
        ${config.name ? html`<div class="hname" title=${config.name}>${config.name}</div>` : nothing}
        <div class="grid ${square ? 'square' : ''}" style=${gridStyle}>
          ${this._specs.length
            ? this._specs.map((spec, i) => this._renderCell(spec, i))
            : html`<div class="note">No cards yet — add a <code>cards:</code> list.</div>`}
        </div>
      </ha-card>
    `;
  }

  static styles = [
    silkControlStyles,
    css`
      /* A container, not a card: it holds real cards, so it wears no chrome and
         grows with whatever it is given. */
      :host {
        height: auto;
      }
      ha-card {
        height: auto;
        flex-direction: column;
        align-items: stretch;
        gap: 8px;
        padding: 0;
        overflow: visible;
        background: none;
        border: none;
        box-shadow: none;
        border-radius: 0;
        cursor: default;
      }
      .hname {
        flex: none;
        font-size: 13px;
        font-weight: 600;
        color: var(--secondary-text-color);
        padding: 0 2px;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .grid {
        display: grid;
        grid-template-columns: repeat(var(--silk-grid-cols, 2), minmax(0, 1fr));
        gap: var(--silk-grid-gap, 10px);
        align-content: start;
        min-width: 0;
      }
      .cell {
        min-width: 0;
        display: block;
      }
      /* Square mode gives every cell a definite height, so children fill it
         instead of setting the row height themselves. */
      .grid.square .cell {
        min-height: 0;
      }
      .grid.square .cell > * {
        height: 100%;
      }
      .failed {
        display: flex;
        align-items: center;
        gap: 8px;
        min-height: 56px;
        padding: 10px 12px;
        box-sizing: border-box;
        border-radius: var(--ha-card-border-radius, 12px);
        border: 1px dashed rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.25);
        background: rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.03);
        color: var(--secondary-text-color);
        font-size: 12.5px;
      }
      .failed ha-icon {
        flex: none;
        --mdc-icon-size: 18px;
        color: var(--error-color, #db4437);
      }
      .ftype {
        min-width: 0;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .note {
        grid-column: 1 / -1;
        padding: 4px 2px;
        font-size: 13px;
        color: var(--secondary-text-color);
      }
      .note code {
        font-size: 12px;
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    'silk-grid-card': SilkGridCard;
  }
}
