import { LitElement, html, nothing, TemplateResult } from 'lit';
import { property, state } from 'lit/decorators.js';
import { HomeAssistant, LovelaceCardConfig } from '../types';
import { EntityListConfig, entityIds, mergeEntityList } from './list';

/**
 * Editor for cards whose config holds one or more entity lists.
 *
 * The picker is always shown, even when the list carries per-item names and
 * icons: on change the picked ids are folded back into the previous list, so
 * the detail of every surviving entry is kept. Hiding the picker to protect
 * that detail — the obvious first instinct — just means the card can never be
 * edited from the UI at all, which is worse.
 *
 * Keys the schema does not mention (type, grid_options, thresholds, …) pass
 * through untouched, because the merge starts from the stored config rather
 * than from the form's answer.
 */
export function registerListEditor(
  tag: string,
  options: {
    /** Full ha-form schema, including the list pickers. */
    schema: object[];
    labels: Record<string, string>;
    defaults?: Record<string, unknown>;
    /** Config keys that hold entity lists. */
    listFields: string[];
  }
): void {
  if (customElements.get(tag)) return;

  const { schema, labels, defaults = {}, listFields } = options;

  class ListEditor extends LitElement {
    @property({ attribute: false }) public hass?: HomeAssistant;
    @state() private _config?: LovelaceCardConfig;

    public setConfig(config: LovelaceCardConfig): void {
      this._config = config;
    }

    /** Lists reach the form as plain id arrays — that is what a picker speaks. */
    private _formData(): Record<string, unknown> {
      const config = (this._config ?? {}) as Record<string, unknown>;
      const data: Record<string, unknown> = { ...defaults, ...config };
      for (const field of listFields) {
        data[field] = entityIds(config[field] as EntityListConfig);
      }
      return data;
    }

    protected render(): TemplateResult | typeof nothing {
      if (!this.hass || !this._config) return nothing;
      return html`
        <ha-form
          .hass=${this.hass}
          .data=${this._formData()}
          .schema=${schema}
          .computeLabel=${(s: { name: string }) => labels[s.name] ?? s.name}
          @value-changed=${this._valueChanged}
        ></ha-form>
      `;
    }

    private _valueChanged(ev: CustomEvent): void {
      ev.stopPropagation();
      const value = (ev.detail?.value ?? {}) as Record<string, unknown>;
      const previous = (this._config ?? {}) as Record<string, unknown>;
      const next: Record<string, unknown> = { ...previous };

      for (const [key, raw] of Object.entries(value)) {
        if (listFields.includes(key)) {
          const ids = Array.isArray(raw) ? (raw as string[]).filter((id) => typeof id === 'string') : [];
          if (ids.length) {
            next[key] = mergeEntityList(previous[key] as EntityListConfig, ids);
          } else {
            delete next[key];
          }
        } else if (raw === undefined || raw === '') {
          delete next[key];
        } else {
          next[key] = raw;
        }
      }

      this.dispatchEvent(
        new CustomEvent('config-changed', {
          detail: { config: next },
          bubbles: true,
          composed: true,
        })
      );
    }
  }

  customElements.define(tag, ListEditor);
}
