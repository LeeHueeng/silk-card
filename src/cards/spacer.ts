import { LitElement, html, css, nothing, PropertyValues, TemplateResult } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { HomeAssistant, LovelaceCardConfig } from '../types';
import { silkControlStyles } from '../shared/base';
import { registerEditor } from '../shared/editor';

export const META = {
  type: 'silk-spacer-card',
  name: 'Silk Spacer',
  description: 'Room to breathe.',
};

export interface SilkSpacerCardConfig extends LovelaceCardConfig {
  /** Space to hold open, in px. Default 24. */
  height?: number;
  /** Draw a hairline rule through the middle of the gap. */
  line?: boolean;
}

const DEFAULT_HEIGHT = 24;
const MIN_HEIGHT = 4;
const MAX_HEIGHT = 400;
/** Grid rows are ~56px plus an 8px gutter. */
const GRID_ROW_PX = 64;
/** Masonry card-size unit. */
const MASONRY_ROW_PX = 50;

const EDITOR_TAG = 'silk-spacer-card-editor';

registerEditor(
  EDITOR_TAG,
  [
    { name: 'height', selector: { number: { min: MIN_HEIGHT, max: MAX_HEIGHT, mode: 'box' } } },
    { name: 'line', selector: { boolean: {} } },
  ],
  { height: 'Height (px)', line: 'Draw a line' },
  { height: DEFAULT_HEIGHT, line: false }
);

/**
 * Deliberately inert. The spacer reads nothing from `hass` — it exists so the
 * cards around it can breathe — so it refuses to re-render on state churn,
 * which on a busy dashboard is thousands of updates an hour.
 */
@customElement('silk-spacer-card')
export class SilkSpacerCard extends LitElement {
  @property({ attribute: false }) public hass?: HomeAssistant;

  @state() private _config?: SilkSpacerCardConfig;

  public static getStubConfig(): Partial<SilkSpacerCardConfig> {
    return { type: 'custom:silk-spacer-card', height: DEFAULT_HEIGHT };
  }

  public static async getConfigElement(): Promise<HTMLElement> {
    return document.createElement(EDITOR_TAG);
  }

  public setConfig(config: SilkSpacerCardConfig): void {
    if (config.height !== undefined) {
      const height = Number(config.height);
      if (!Number.isFinite(height) || height < MIN_HEIGHT || height > MAX_HEIGHT) {
        throw new Error(`silk-spacer-card: \`height\` must be ${MIN_HEIGHT}-${MAX_HEIGHT} px`);
      }
    }
    if (config.line !== undefined && typeof config.line !== 'boolean') {
      throw new Error('silk-spacer-card: `line` must be true or false');
    }
    this._config = config;
  }

  public getCardSize(): number {
    return Math.max(1, Math.round(this._height() / MASONRY_ROW_PX));
  }

  public getGridOptions(): Record<string, number> {
    // One row is the default gap; a taller spacer claims the rows it actually
    // occupies, or the cards below would slide up underneath it.
    return {
      columns: 12,
      rows: Math.max(1, Math.floor(this._height() / GRID_ROW_PX)),
      min_columns: 1,
      min_rows: 1,
    };
  }

  /** Everything here comes from the config; `hass` never changes the picture. */
  protected shouldUpdate(changed: PropertyValues): boolean {
    for (const key of changed.keys()) {
      if (key !== 'hass') return true;
    }
    return false;
  }

  private _height(): number {
    const raw = Number(this._config?.height ?? DEFAULT_HEIGHT);
    return Number.isFinite(raw) ? Math.min(Math.max(raw, MIN_HEIGHT), MAX_HEIGHT) : DEFAULT_HEIGHT;
  }

  protected render(): TemplateResult | typeof nothing {
    const config = this._config;
    if (!config) return nothing;
    // No card chrome at all: a spacer is a hole in the layout, not a surface.
    // Inline so it survives themes that restyle ha-card.
    return html`
      <ha-card
        style="height:${this._height()}px;background:none;border:none;box-shadow:none;border-radius:0"
        role="presentation"
        aria-hidden="true"
      >
        ${config.line ? html`<div class="rule"></div>` : nothing}
      </ha-card>
    `;
  }

  static styles = [
    silkControlStyles,
    css`
      ha-card {
        display: flex;
        align-items: center;
        padding: 0;
        max-height: 100%;
        overflow: hidden;
        cursor: default;
        /* Nothing here is a target; taps belong to whatever is underneath. */
        pointer-events: none;
      }
      .rule {
        flex: 1;
        height: 1px;
        background: rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.08);
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    'silk-spacer-card': SilkSpacerCard;
  }
}
