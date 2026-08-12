import { LitElement, html, css, nothing, TemplateResult } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { HomeAssistant, LovelaceCardConfig } from '../types';
import { silkControlStyles } from '../shared/base';
import { registerEditor } from '../shared/editor';

export const META = {
  type: 'silk-divider-card',
  name: 'Silk Divider',
  description: 'A quiet line that says a little.',
};

export interface SilkDividerCardConfig extends LovelaceCardConfig {
  label?: string;
  icon?: string;
}

const EDITOR_TAG = 'silk-divider-card-editor';

registerEditor(
  EDITOR_TAG,
  [
    { name: 'label', selector: { text: {} } },
    { name: 'icon', selector: { icon: {} } },
  ],
  {
    label: 'Label',
    icon: 'Icon',
  }
);

@customElement('silk-divider-card')
export class SilkDividerCard extends LitElement {
  /**
   * The frontend assigns hass on every state change; a divider renders nothing
   * live, so keep it a plain field — no reactive churn, no re-renders.
   */
  public hass?: HomeAssistant;

  @state() private _config?: SilkDividerCardConfig;

  public static getStubConfig(): Partial<SilkDividerCardConfig> {
    return { type: 'custom:silk-divider-card' };
  }

  public static async getConfigElement(): Promise<HTMLElement> {
    return document.createElement(EDITOR_TAG);
  }

  public setConfig(config: SilkDividerCardConfig): void {
    if (config.label !== undefined && typeof config.label !== 'string') {
      throw new Error('silk-divider-card: `label` must be a string');
    }
    if (config.icon !== undefined && typeof config.icon !== 'string') {
      throw new Error('silk-divider-card: `icon` must be a string');
    }
    this._config = config;
  }

  public getCardSize(): number {
    return 1;
  }

  public getGridOptions(): Record<string, number> {
    return { columns: 12, rows: 1, min_rows: 1 };
  }

  protected render(): TemplateResult | typeof nothing {
    const config = this._config;
    if (!config) return nothing;
    const label = config.label?.trim() ?? '';
    const hasTag = Boolean(label || config.icon);
    return html`
      <ha-card role="separator" aria-label=${label || nothing}>
        <div class="line"></div>
        ${hasTag
          ? html`
              <div class="tag" title=${label || nothing}>
                ${config.icon ? html`<ha-icon .icon=${config.icon}></ha-icon>` : nothing}
                ${label ? html`<span class="text">${label}</span>` : nothing}
              </div>
              <div class="line"></div>
            `
          : nothing}
      </ha-card>
    `;
  }

  static styles = [
    silkControlStyles,
    css`
      /* A divider floats on the view background — no card chrome at all. */
      ha-card {
        background: none;
        border: none;
        box-shadow: none;
        border-radius: 0;
        padding: 0 8px;
        gap: 10px;
        cursor: default;
      }
      .line {
        flex: 1;
        height: 1px;
        background: rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.1);
      }
      .tag {
        flex: none;
        display: flex;
        align-items: center;
        gap: 5px;
        min-width: 0;
        max-width: 70%;
        color: var(--secondary-text-color);
      }
      .tag ha-icon {
        flex: none;
        --mdc-icon-size: 14px;
      }
      .text {
        min-width: 0;
        font-size: 11px;
        font-weight: 600;
        letter-spacing: 0.02em;
        line-height: 1.3;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    'silk-divider-card': SilkDividerCard;
  }
}
