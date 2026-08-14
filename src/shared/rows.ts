import { LitElement, html, css, nothing, TemplateResult } from 'lit';
import { property, state } from 'lit/decorators.js';
import { HomeAssistant, LovelaceCardConfig } from '../types';

/**
 * Editor for the config a plain form cannot hold: a list of rows, each with
 * its own fields — thresholds `{value, color}`, irrigation zones
 * `{entity, name, duration}`, radio stations `{name, url}`.
 *
 * `ha-form` has no repeater, so a card that needs one has historically been
 * YAML-only. This renders one `ha-form` per row plus add/remove/reorder
 * controls, which is what makes those cards configurable by clicking.
 *
 * Rows keep any keys the row schema does not mention, so a hand-written entry
 * survives being reordered or having a sibling deleted.
 */

export interface RowField {
  name: string;
  label: string;
  selector: Record<string, unknown>;
}

export interface RowsEditorOptions {
  /** Config key holding the array. */
  field: string;
  /** Heading above the rows, e.g. '구역'. */
  title: string;
  /** Per-row fields. */
  row: RowField[];
  /** Values a freshly added row starts with. */
  blank: Record<string, unknown>;
  /** Schema + labels for the card's own scalar options, rendered above the rows. */
  schema?: object[];
  labels?: Record<string, string>;
  defaults?: Record<string, unknown>;
  /** Text for the add button, e.g. '구역 추가'. */
  addLabel?: string;
}

export function registerRowsEditor(tag: string, options: RowsEditorOptions): void {
  if (customElements.get(tag)) return;

  const {
    field,
    title,
    row,
    blank,
    schema = [],
    labels = {},
    defaults = {},
    addLabel = '항목 추가',
  } = options;
  const rowSchema = row.map((f) => ({ name: f.name, selector: f.selector }));
  const rowLabels = Object.fromEntries(row.map((f) => [f.name, f.label]));

  class RowsEditor extends LitElement {
    @property({ attribute: false }) public hass?: HomeAssistant;
    @state() private _config?: LovelaceCardConfig;

    public setConfig(config: LovelaceCardConfig): void {
      this._config = config;
    }

    private get _rows(): Record<string, unknown>[] {
      const value = (this._config as Record<string, unknown> | undefined)?.[field];
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

    private _setRows(rows: Record<string, unknown>[]): void {
      const next = { ...(this._config as Record<string, unknown>) };
      if (rows.length) next[field] = rows;
      else delete next[field];
      this._emit(next);
    }

    private _scalarsChanged(ev: CustomEvent): void {
      ev.stopPropagation();
      const value = (ev.detail?.value ?? {}) as Record<string, unknown>;
      const next = { ...(this._config as Record<string, unknown>) };
      for (const [key, raw] of Object.entries(value)) {
        if (key === field) continue; // rows are edited below, never here
        if (raw === undefined || raw === '') delete next[key];
        else next[key] = raw;
      }
      this._emit(next);
    }

    private _rowChanged(ev: CustomEvent, index: number): void {
      ev.stopPropagation();
      const value = (ev.detail?.value ?? {}) as Record<string, unknown>;
      const rows = this._rows.map((r) => ({ ...r }));
      // Unknown keys stay: only the fields this editor knows are overwritten.
      rows[index] = { ...rows[index], ...value };
      for (const f of row) {
        if (value[f.name] === '' || value[f.name] === undefined) delete rows[index][f.name];
      }
      this._setRows(rows);
    }

    private _add(): void {
      this._setRows([...this._rows.map((r) => ({ ...r })), { ...blank }]);
    }

    private _remove(index: number): void {
      this._setRows(this._rows.filter((_, i) => i !== index));
    }

    private _move(index: number, delta: number): void {
      const rows = this._rows.map((r) => ({ ...r }));
      const target = index + delta;
      if (target < 0 || target >= rows.length) return;
      [rows[index], rows[target]] = [rows[target], rows[index]];
      this._setRows(rows);
    }

    protected render(): TemplateResult | typeof nothing {
      if (!this.hass || !this._config) return nothing;
      const rows = this._rows;
      return html`
        ${schema.length
          ? html`<ha-form
              .hass=${this.hass}
              .data=${{ ...defaults, ...this._config }}
              .schema=${schema}
              .computeLabel=${(s: { name: string }) => labels[s.name] ?? s.name}
              @value-changed=${this._scalarsChanged}
            ></ha-form>`
          : nothing}

        <div class="head">
          <span class="title">${title}</span>
          <span class="count">${rows.length}</span>
        </div>

        ${rows.map(
          (item, index) => html`
            <div class="row">
              <div class="grip">
                <button
                  class="mini"
                  ?disabled=${index === 0}
                  title="위로"
                  @click=${() => this._move(index, -1)}
                >
                  ▲
                </button>
                <button
                  class="mini"
                  ?disabled=${index === rows.length - 1}
                  title="아래로"
                  @click=${() => this._move(index, 1)}
                >
                  ▼
                </button>
              </div>
              <ha-form
                class="fields"
                .hass=${this.hass}
                .data=${item}
                .schema=${rowSchema}
                .computeLabel=${(s: { name: string }) => rowLabels[s.name] ?? s.name}
                @value-changed=${(ev: CustomEvent) => this._rowChanged(ev, index)}
              ></ha-form>
              <button class="mini remove" title="삭제" @click=${() => this._remove(index)}>✕</button>
            </div>
          `
        )}

        <button class="add" @click=${this._add}>+ ${addLabel}</button>
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

  customElements.define(tag, RowsEditor);
}
