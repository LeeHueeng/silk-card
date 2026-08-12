import { LitElement, html, nothing, TemplateResult } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { HomeAssistant, SilkCardConfig } from './types';

const SCHEMA = [
  { name: 'entity', required: true, selector: { entity: { domain: ['sensor', 'number', 'input_number'] } } },
  { name: 'name', selector: { text: {} } },
  {
    name: '',
    type: 'grid',
    schema: [
      { name: 'hours_to_show', selector: { number: { min: 1, mode: 'box' } } },
      { name: 'line_width', selector: { number: { min: 1, max: 8, step: 0.5, mode: 'box' } } },
    ],
  },
  {
    name: '',
    type: 'grid',
    schema: [
      { name: 'fill', selector: { boolean: {} } },
      { name: 'extremes', selector: { boolean: {} } },
      { name: 'range_selector', selector: { boolean: {} } },
      { name: 'delta', selector: { boolean: {} } },
    ],
  },
];

const LABELS: Record<string, string> = {
  entity: 'Entity',
  name: 'Name',
  hours_to_show: 'Hours to show',
  line_width: 'Line width',
  fill: 'Gradient fill',
  extremes: 'Min/max markers',
  range_selector: 'Range selector',
  delta: 'Change badge',
};

@customElement('silk-card-editor')
export class SilkCardEditor extends LitElement {
  @property({ attribute: false }) public hass?: HomeAssistant;
  @state() private _config?: SilkCardConfig;

  public setConfig(config: SilkCardConfig): void {
    this._config = config;
  }

  protected render(): TemplateResult | typeof nothing {
    if (!this.hass || !this._config) return nothing;
    const data = {
      hours_to_show: 24,
      line_width: 2.5,
      fill: true,
      extremes: true,
      range_selector: true,
      delta: true,
      ...this._config,
    };
    return html`
      <ha-form
        .hass=${this.hass}
        .data=${data}
        .schema=${SCHEMA}
        .computeLabel=${(schema: { name: string }) => LABELS[schema.name] ?? schema.name}
        @value-changed=${this._valueChanged}
      ></ha-form>
    `;
  }

  private _valueChanged(ev: CustomEvent): void {
    ev.stopPropagation();
    const config = ev.detail.value as SilkCardConfig;
    this.dispatchEvent(
      new CustomEvent('config-changed', { detail: { config }, bubbles: true, composed: true })
    );
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'silk-card-editor': SilkCardEditor;
  }
}
