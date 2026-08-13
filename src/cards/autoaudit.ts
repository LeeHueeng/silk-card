import { LitElement, html, css, nothing, PropertyValues, TemplateResult } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { HomeAssistant, LovelaceCardConfig } from '../types';
import { silkControlStyles } from '../shared/base';
import { isUnavailable, moreInfo, haptic } from '../shared/service';
import { accentFor } from '../shared/color';
import { registerEditor } from '../shared/editor';

export const META = {
  type: 'silk-audit-card',
  name: 'Silk Audit',
  description: 'Automations that never fire.',
};

export interface SilkAuditCardConfig extends LovelaceCardConfig {
  name?: string;
  /** Days without a run before an automation reads as stale. Defaults to 30. */
  stale_days?: number;
  /** Maximum rows shown, defaults to 8. */
  limit?: number;
  /** List automations that are switched off. Defaults to true. */
  show_disabled?: boolean;
}

/** One automation, scored by how long it has been silent. */
interface AuditRow {
  entityId: string;
  name: string;
  /** Optimistic-aware enabled flag (automation state `on`). */
  enabled: boolean;
  unavailable: boolean;
  /** Days since the last run; Infinity when it has never run. */
  days: number;
  /** ms of the last run; null when it has never run. */
  lastMs: number | null;
}

const DEFAULT_LIMIT = 8;
const DEFAULT_STALE_DAYS = 30;
const DAY_MS = 86_400_000;
const OPTIMISTIC_TIMEOUT_MS = 2000;
/** Re-render cadence so 'last run 4h ago' never goes stale on screen. */
const TICK_MS = 60_000;
/** Automations rarely appear or vanish; rescan the state machine slowly. */
const RESCAN_MS = 10_000;

/** A local override waiting for the real state to catch up. */
interface Pending {
  /** Optimistic enabled flag, and the last_updated it was based on. */
  on?: boolean;
  onBase?: string;
  /** Optimistic run stamp (ms), and the last_triggered it was based on. */
  ranAt?: number;
  runBase?: string | null;
  timer?: number;
}

const EDITOR_TAG = 'silk-audit-card-editor';

registerEditor(
  EDITOR_TAG,
  [
    { name: 'name', selector: { text: {} } },
    {
      name: '',
      type: 'grid',
      schema: [
        { name: 'stale_days', selector: { number: { min: 1, max: 365, mode: 'box' } } },
        { name: 'limit', selector: { number: { min: 1, max: 40, mode: 'box' } } },
      ],
    },
    { name: 'show_disabled', selector: { boolean: {} } },
  ],
  {
    name: 'Name',
    stale_days: 'Stale after (days)',
    limit: 'Rows to show',
    show_disabled: 'Show disabled automations',
  },
  { stale_days: DEFAULT_STALE_DAYS, limit: DEFAULT_LIMIT, show_disabled: true }
);

/** 'just now' · '12m ago' · '4h ago' · '34d ago'. */
function relativeTime(ms: number): string {
  const seconds = Math.max(0, (Date.now() - ms) / 1000);
  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86_400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86_400)}d ago`;
}

/**
 * The automation audit: which ones still earn their keep, which ones have not
 * fired in a month, and which ones are quietly switched off.
 */
@customElement('silk-audit-card')
export class SilkAuditCard extends LitElement {
  @property({ attribute: false }) public hass?: HomeAssistant;

  @state() private _config?: SilkAuditCardConfig;
  /** automation.* ids; rescanned slowly, their states are read live. */
  @state() private _ids: string[] = [];

  private _lastScan = 0;
  private _scanTimer?: number;
  private _tickTimer?: number;
  private readonly _pending = new Map<string, Pending>();

  public static getStubConfig(): Partial<SilkAuditCardConfig> {
    // No entity required — the card audits every automation it can see.
    return { type: 'custom:silk-audit-card' };
  }

  public static async getConfigElement(): Promise<HTMLElement> {
    return document.createElement(EDITOR_TAG);
  }

  public setConfig(config: SilkAuditCardConfig): void {
    if (config.stale_days !== undefined && !(Number(config.stale_days) > 0)) {
      throw new Error('silk-audit-card: `stale_days` must be a positive number');
    }
    if (config.limit !== undefined && !(Number(config.limit) >= 1)) {
      throw new Error('silk-audit-card: `limit` must be a number of at least 1');
    }
    if (config.show_disabled !== undefined && typeof config.show_disabled !== 'boolean') {
      throw new Error('silk-audit-card: `show_disabled` must be true or false');
    }
    this._config = config;
    this._lastScan = 0;
  }

  public getCardSize(): number {
    return 2 + Math.ceil(Math.min(this._limit(), 12) * 0.8);
  }

  public getGridOptions(): Record<string, number> {
    return { columns: 6, rows: 3, min_columns: 4, min_rows: 2 };
  }

  public connectedCallback(): void {
    super.connectedCallback();
    this._tickTimer = window.setInterval(() => this.requestUpdate(), TICK_MS);
  }

  public disconnectedCallback(): void {
    super.disconnectedCallback();
    window.clearInterval(this._tickTimer);
    window.clearTimeout(this._scanTimer);
    this._tickTimer = undefined;
    this._scanTimer = undefined;
    for (const pending of this._pending.values()) window.clearTimeout(pending.timer);
    this._pending.clear();
  }

  protected willUpdate(changed: PropertyValues): void {
    if (!this.hass || !this._config) return;
    if (!this._lastScan) {
      this._scan();
      return;
    }
    if (!changed.has('hass')) return;
    this._reconcilePending();
    this._scheduleScan();
  }

  private _limit(): number {
    return Math.max(1, Math.floor(this._config?.limit ?? DEFAULT_LIMIT));
  }

  private _staleDays(): number {
    const days = Number(this._config?.stale_days ?? DEFAULT_STALE_DAYS);
    return days > 0 ? days : DEFAULT_STALE_DAYS;
  }

  /** Walking every state on every tick is wasteful; the id set barely moves. */
  private _scheduleScan(): void {
    if (this._scanTimer) return;
    const wait = Math.max(0, RESCAN_MS - (Date.now() - this._lastScan));
    this._scanTimer = window.setTimeout(() => {
      this._scanTimer = undefined;
      this._scan();
    }, wait);
  }

  private _scan(): void {
    const hass = this.hass;
    if (!hass) return;
    this._lastScan = Date.now();
    const ids = Object.keys(hass.states).filter((id) => id.startsWith('automation.'));
    // Only publish a genuinely different set — the states themselves are read
    // live at render time, so churn here would repaint for nothing.
    if (ids.length !== this._ids.length || ids.some((id, i) => id !== this._ids[i])) {
      this._ids = ids;
    }
  }

  /** Drop each local override once the real state (or 2s) overtakes it. */
  private _reconcilePending(): void {
    const hass = this.hass;
    if (!hass || !this._pending.size) return;
    let dirty = false;
    for (const [entityId, pending] of [...this._pending]) {
      const stateObj = hass.states[entityId];
      if (!stateObj) {
        this._clearPending(entityId);
        dirty = true;
        continue;
      }
      if (pending.on !== undefined && stateObj.last_updated !== pending.onBase) {
        delete pending.on;
        delete pending.onBase;
        dirty = true;
      }
      if (
        pending.ranAt !== undefined &&
        (stateObj.attributes.last_triggered ?? null) !== pending.runBase
      ) {
        delete pending.ranAt;
        delete pending.runBase;
        dirty = true;
      }
      if (pending.on === undefined && pending.ranAt === undefined) {
        this._clearPending(entityId);
      }
    }
    if (dirty) this.requestUpdate();
  }

  private _clearPending(entityId: string): void {
    const pending = this._pending.get(entityId);
    if (!pending) return;
    window.clearTimeout(pending.timer);
    this._pending.delete(entityId);
  }

  /** Arm the 2s safety net that retires an override the bus never confirmed. */
  private _armPending(entityId: string, pending: Pending): void {
    window.clearTimeout(pending.timer);
    pending.timer = window.setTimeout(() => {
      this._clearPending(entityId);
      this.requestUpdate();
    }, OPTIMISTIC_TIMEOUT_MS);
    this._pending.set(entityId, pending);
    this.requestUpdate();
  }

  private _rows(): AuditRow[] {
    const hass = this.hass;
    if (!hass) return [];
    const now = Date.now();
    const showDisabled = this._config?.show_disabled ?? true;
    const rows: AuditRow[] = [];
    for (const entityId of this._ids) {
      const stateObj = hass.states[entityId];
      if (!stateObj) continue;
      const pending = this._pending.get(entityId);
      const unavailable = isUnavailable(stateObj);
      const enabled = pending?.on ?? stateObj.state === 'on';
      if (!showDisabled && !enabled && !unavailable) continue;
      const raw = stateObj.attributes.last_triggered;
      const parsed = typeof raw === 'string' && raw ? Date.parse(raw) : NaN;
      const realMs = Number.isFinite(parsed) ? parsed : null;
      const lastMs = pending?.ranAt ?? realMs;
      rows.push({
        entityId,
        name: (stateObj.attributes.friendly_name as string | undefined) ?? entityId,
        enabled,
        unavailable,
        days: lastMs === null ? Infinity : Math.max(0, (now - lastMs) / DAY_MS),
        lastMs,
      });
    }
    // Stalest first — the ones that never fire are the point of the card.
    rows.sort((a, b) => b.days - a.days || a.name.localeCompare(b.name));
    return rows;
  }

  private _locale(): string {
    return this.hass?.locale?.language ?? this.hass?.language ?? 'en';
  }

  private _num(value: number): string {
    return new Intl.NumberFormat(this._locale(), { maximumFractionDigits: 0 }).format(value);
  }

  private _onRowClick(ev: Event, entityId: string): void {
    ev.stopPropagation();
    moreInfo(this, entityId);
  }

  /** Fire it now — confirmed, because a manual run has real-world effects. */
  private _onRunClick(ev: Event, row: AuditRow): void {
    ev.stopPropagation();
    const hass = this.hass;
    if (!hass || row.unavailable) return;
    const stateObj = hass.states[row.entityId];
    if (!stateObj) return;
    if (!window.confirm(`Run ${row.name} now?`)) return;
    haptic(this);
    const pending = this._pending.get(row.entityId) ?? {};
    pending.ranAt = Date.now();
    pending.runBase = stateObj.attributes.last_triggered ?? null;
    this._armPending(row.entityId, pending);
    hass.callService('automation', 'trigger', { entity_id: row.entityId });
  }

  private _onToggleClick(ev: Event, row: AuditRow): void {
    ev.stopPropagation();
    const hass = this.hass;
    if (!hass || row.unavailable) return;
    const stateObj = hass.states[row.entityId];
    if (!stateObj) return;
    haptic(this);
    const enable = !row.enabled;
    const pending = this._pending.get(row.entityId) ?? {};
    pending.on = enable;
    pending.onBase = stateObj.last_updated;
    this._armPending(row.entityId, pending);
    hass.callService('automation', enable ? 'turn_on' : 'turn_off', {
      entity_id: row.entityId,
    });
  }

  private _renderRow(row: AuditRow, staleDays: number): TemplateResult {
    const stale = row.days > staleDays;
    const runText = row.lastMs === null ? 'never run' : `last run ${relativeTime(row.lastMs)}`;
    return html`
      <div class="row ${row.unavailable ? 'unavailable' : ''}">
        <button
          class="rmain"
          title=${`${row.entityId} — ${runText}`}
          aria-label=${`${row.name}: ${runText}`}
          @click=${(ev: Event) => this._onRowClick(ev, row.entityId)}
        >
          <span class="rname">${row.name}</span>
          <span class="rsub ${stale ? 'stale' : ''}">${runText}</span>
        </button>
        ${!row.enabled && !row.unavailable
          ? html`<span class="chip off">disabled</span>`
          : nothing}
        <button
          class="run"
          .disabled=${row.unavailable}
          title="Run now"
          aria-label=${`Run ${row.name} now`}
          @click=${(ev: Event) => this._onRunClick(ev, row)}
        >
          <ha-icon icon="mdi:play"></ha-icon>
        </button>
        <button
          class="switch ${row.enabled ? 'checked' : ''}"
          role="switch"
          aria-checked=${row.enabled ? 'true' : 'false'}
          aria-label=${`Enable ${row.name}`}
          .disabled=${row.unavailable}
          @click=${(ev: Event) => this._onToggleClick(ev, row)}
        >
          <span class="thumb"></span>
        </button>
      </div>
    `;
  }

  protected render(): TemplateResult | typeof nothing {
    const config = this._config;
    const hass = this.hass;
    if (!config || !hass) return nothing;

    const staleDays = this._staleDays();
    const rows = this._rows();
    const staleCount = rows.reduce((total, row) => (row.days > staleDays ? total + 1 : total), 0);
    const listed = rows.slice(0, this._limit());
    const hidden = rows.length - listed.length;
    const name = config.name ?? 'Automations';

    return html`
      <ha-card class="control" style="--silk-accent:${accentFor(undefined)}">
        <div class="head">
          <div class="title" title=${name}>${name}</div>
          <div class="sum">
            <span>${this._num(rows.length)} automations</span>
            ${staleCount
              ? html`<span class="sep">·</span
                  ><span class="bad">${this._num(staleCount)} stale</span>`
              : nothing}
          </div>
        </div>
        ${listed.length
          ? html`<div class="rows">${listed.map((row) => this._renderRow(row, staleDays))}</div>`
          : html`<div class="empty">No automations to audit</div>`}
        ${hidden > 0 ? html`<div class="more">+${this._num(hidden)} more</div>` : nothing}
      </ha-card>
    `;
  }

  static styles = [
    silkControlStyles,
    css`
      /* A list card: it grows with its rows and presses nowhere as a whole. */
      ha-card {
        flex-direction: column;
        align-items: stretch;
        justify-content: flex-start;
        gap: 6px;
        height: auto;
        min-height: 100%;
        cursor: default;
      }
      .head {
        flex: none;
        display: flex;
        align-items: baseline;
        gap: 8px;
        min-width: 0;
      }
      .title {
        flex: 1;
        min-width: 0;
        font-size: 14px;
        font-weight: 500;
        line-height: 1.3;
        color: var(--primary-text-color);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .sum {
        flex: none;
        font-size: 12px;
        line-height: 1.3;
        color: var(--secondary-text-color);
        font-variant-numeric: tabular-nums;
        white-space: nowrap;
      }
      .sum .bad {
        color: var(--error-color, #db4437);
      }
      .rows {
        display: flex;
        flex-direction: column;
        gap: 2px;
        min-width: 0;
      }
      .row {
        display: flex;
        align-items: center;
        gap: 8px;
        min-width: 0;
        min-height: 40px;
      }
      .row.unavailable {
        opacity: 0.45;
      }
      .rmain {
        flex: 1;
        min-width: 0;
        display: block;
        margin: 0;
        padding: 3px 6px;
        border: none;
        border-radius: 10px;
        background: none;
        font: inherit;
        color: inherit;
        text-align: left;
        cursor: pointer;
        transition: background 150ms ease-out;
      }
      .rmain:hover {
        background: rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.05);
      }
      .rmain:focus-visible {
        outline: 2px solid color-mix(in srgb, var(--silk-accent) 70%, transparent);
        outline-offset: -2px;
      }
      .rname {
        display: block;
        font-size: 13.5px;
        font-weight: 500;
        line-height: 1.3;
        color: var(--primary-text-color);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .rsub {
        display: block;
        font-size: 11px;
        line-height: 1.3;
        color: var(--secondary-text-color);
        font-variant-numeric: tabular-nums;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      /* Status color for a genuine status: this automation has gone dead. */
      .rsub.stale {
        color: var(--error-color, #db4437);
      }
      .chip.off {
        flex: none;
        cursor: default;
        font-weight: 500;
        letter-spacing: 0;
      }
      .run {
        flex: none;
        position: relative;
        width: 28px;
        height: 28px;
        border: none;
        border-radius: 10px;
        padding: 0;
        display: grid;
        place-items: center;
        cursor: pointer;
        color: var(--secondary-text-color);
        background: rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.06);
        transition:
          transform 250ms var(--silk-spring),
          background 200ms ease,
          color 200ms ease;
      }
      /* Invisible halo lifts the touch target past 40px without growing the key. */
      .run::after {
        content: '';
        position: absolute;
        inset: -6px;
        border-radius: 12px;
      }
      .run:hover {
        background: rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.12);
      }
      .run:active {
        transform: scale(0.9);
        transition-duration: 120ms;
        transition-timing-function: var(--silk-ease-out);
      }
      .run:focus-visible {
        outline: 2px solid color-mix(in srgb, var(--silk-accent) 70%, transparent);
        outline-offset: 2px;
      }
      .run ha-icon {
        --mdc-icon-size: 17px;
        pointer-events: none;
      }
      /* Compact 34×20 switch — silk-toggle-card's anatomy, scaled to a row. */
      .switch {
        flex: none;
        position: relative;
        width: 34px;
        height: 20px;
        border: none;
        border-radius: 999px;
        padding: 2px;
        cursor: pointer;
        display: block;
        background: rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.15);
        transition: background 200ms ease;
      }
      .switch::after {
        content: '';
        position: absolute;
        inset: -10px;
        border-radius: 999px;
      }
      .switch.checked {
        background: var(--silk-accent);
      }
      .switch:focus-visible {
        outline: 2px solid color-mix(in srgb, var(--silk-accent) 70%, transparent);
        outline-offset: 2px;
      }
      .thumb {
        display: block;
        width: 16px;
        height: 16px;
        border-radius: 50%;
        background: var(--card-background-color, #fff);
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
        transform: translateX(0);
        transition: transform 200ms var(--silk-ease-out);
        will-change: transform;
      }
      .switch.checked .thumb {
        transform: translateX(14px);
      }
      .run:disabled,
      .switch:disabled {
        cursor: default;
      }
      .run:disabled {
        transform: none;
      }
      .empty {
        flex: 1;
        display: flex;
        align-items: center;
        min-height: 40px;
        padding: 4px 6px;
        font-size: 13px;
        color: var(--secondary-text-color);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .more {
        flex: none;
        padding: 0 6px;
        font-size: 11px;
        line-height: 1.4;
        color: var(--secondary-text-color);
        font-variant-numeric: tabular-nums;
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    'silk-audit-card': SilkAuditCard;
  }
}
