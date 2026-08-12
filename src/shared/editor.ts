import { LitElement, html, nothing, TemplateResult } from 'lit';
import { property, state } from 'lit/decorators.js';
import { HomeAssistant, LovelaceCardConfig } from '../types';

/**
 * Registers `<tag>` as an ha-form based visual editor. Card modules call this
 * once at load and return `document.createElement(tag)` from getConfigElement.
 */
export function registerEditor(
  tag: string,
  schema: object[],
  labels: Record<string, string>,
  defaults: Record<string, unknown> = {}
): void {
  if (customElements.get(tag)) return;

  class Editor extends LitElement {
    @property({ attribute: false }) public hass?: HomeAssistant;
    @state() private _config?: LovelaceCardConfig;

    public setConfig(config: LovelaceCardConfig): void {
      this._config = config;
    }

    protected render(): TemplateResult | typeof nothing {
      if (!this.hass || !this._config) return nothing;
      return html`
        <ha-form
          .hass=${this.hass}
          .data=${{ ...defaults, ...this._config }}
          .schema=${schema}
          .computeLabel=${(s: { name: string }) => labels[s.name] ?? s.name}
          @value-changed=${this._valueChanged}
        ></ha-form>
      `;
    }

    private _valueChanged(ev: CustomEvent): void {
      ev.stopPropagation();
      this.dispatchEvent(
        new CustomEvent('config-changed', {
          detail: { config: ev.detail.value },
          bubbles: true,
          composed: true,
        })
      );
    }
  }

  customElements.define(tag, Editor);
}
