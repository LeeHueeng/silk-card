import { LitElement, html, css, nothing, PropertyValues, TemplateResult } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { HomeAssistant, HassEntity, LovelaceCardConfig } from '../types';
import { silkControlStyles } from '../shared/base';
import { isActive, isUnavailable, toggleEntity, moreInfo, haptic } from '../shared/service';
import { accentFor } from '../shared/color';
import { registerRowsEditor } from '../shared/rows';

export const META = {
  type: 'silk-meds-card',
  name: 'Silk Meds',
  description: 'Taken or not, today.',
};

export interface SilkMedConfig {
  name: string;
  /** Scheduled time of day, 'HH:MM' (24h). */
  time?: string;
  /** Helper that marks the dose taken — usually an input_boolean. */
  entity?: string;
  icon?: string;
}

export interface SilkMedsCardConfig extends LovelaceCardConfig {
  /** The doses this card tracks. */
  meds: SilkMedConfig[];
  name?: string;
}

/** A dose resolved against the clock and the helper entity. */
interface MedView {
  cfg: SilkMedConfig;
  /** Local ms of today's scheduled time; null when the dose has no time. */
  dueMs: number | null;
  taken: boolean;
  /** True only for a trackable dose: it has a helper we can toggle. */
  trackable: boolean;
  late: boolean;
  unavailable: boolean;
}

/** An optimistic checkbox flip, valid until the entity reports something new. */
interface Optimistic {
  value: boolean;
  /** last_updated at flip time; any newer stamp retires the override. */
  base: string;
}

const TIME_RE = /^([01]?\d|2[0-3]):([0-5]\d)$/;
/** How far past the scheduled time a dose may sit before it reads as late. */
const LATE_AFTER_MS = 30 * 60_000;
const OPTIMISTIC_TIMEOUT_MS = 2000;
/** A minute is the finest the 'late' verdict ever needs. */
const TICK_MS = 60_000;
const DEFAULT_ICON = 'mdi:pill';

const EDITOR_TAG = 'silk-meds-card-editor';

// One form per dose. `time` stays a text field on purpose: the card validates
// 'HH:MM', which HA's time selector would answer with 'HH:MM:SS'.
registerRowsEditor(EDITOR_TAG, {
  field: 'meds',
  title: '복약',
  addLabel: '복약 추가',
  row: [
    { name: 'name', label: '이름', selector: { text: {} } },
    { name: 'time', label: '시간 (HH:MM)', selector: { text: {} } },
    {
      name: 'entity',
      label: '엔티티 (복용 표시)',
      selector: { entity: { domain: ['input_boolean', 'switch'] } },
    },
    { name: 'icon', label: '아이콘', selector: { icon: {} } },
  ],
  blank: { name: '새 복약', time: '08:00', icon: DEFAULT_ICON },
  schema: [{ name: 'name', selector: { text: {} } }],
  labels: { name: '이름' },
  defaults: { name: 'Medication' },
});

/** Today's local ms for an 'HH:MM' schedule. */
function todayAt(time: string, now: number): number | null {
  const m = TIME_RE.exec(time.trim());
  if (!m) return null;
  const d = new Date(now);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), +m[1], +m[2]).getTime();
}

/**
 * One question: what still needs taking today. Every row is the same checkbox,
 * so the answer is a shape you read down the card. Warning appears only for a
 * dose that is genuinely past its time — never as decoration.
 */
@customElement('silk-meds-card')
export class SilkMedsCard extends LitElement {
  @property({ attribute: false }) public hass?: HomeAssistant;

  @state() private _config?: SilkMedsCardConfig;
  /** Clock the late math is resolved against. */
  @state() private _now = Date.now();
  /** Optimistic flips by entity id (empty = trust the real states). */
  @state() private _optimistic: Record<string, Optimistic> = {};

  private _tickTimer?: number;
  private _optimisticTimer?: number;

  public static getStubConfig(hass: HomeAssistant): Partial<SilkMedsCardConfig> {
    const helpers = Object.keys(hass.states).filter((id) => id.startsWith('input_boolean.'));
    const dose = helpers.find((id) => /med|pill|dose|vitamin|tablet/i.test(id)) ?? helpers[0];
    return {
      type: 'custom:silk-meds-card',
      name: 'Medication',
      meds: [
        { name: 'Morning dose', time: '08:00', entity: dose, icon: 'mdi:pill' },
        { name: 'Evening dose', time: '20:00', icon: 'mdi:pill' },
      ],
    };
  }

  public static async getConfigElement(): Promise<HTMLElement> {
    return document.createElement(EDITOR_TAG);
  }

  public setConfig(config: SilkMedsCardConfig): void {
    if (!Array.isArray(config.meds) || config.meds.length === 0) {
      throw new Error('silk-meds-card: `meds` is required — a list of {name, time?, entity?}');
    }
    config.meds.forEach((med, i) => {
      if (!med || typeof med.name !== 'string' || med.name.trim() === '') {
        throw new Error(`silk-meds-card: meds[${i}] needs a \`name\``);
      }
      if (med.time !== undefined && !TIME_RE.test(String(med.time).trim())) {
        throw new Error(`silk-meds-card: meds[${i}].time must be 'HH:MM' (e.g. 08:30)`);
      }
      if (med.entity !== undefined && typeof med.entity !== 'string') {
        throw new Error(`silk-meds-card: meds[${i}].entity must be an entity id`);
      }
    });
    this._config = config;
    this._now = Date.now();
    this._clearOptimistic();
  }

  public getCardSize(): number {
    return 3;
  }

  public getGridOptions(): Record<string, number> {
    return { columns: 6, rows: 3, min_columns: 4, min_rows: 2 };
  }

  public connectedCallback(): void {
    super.connectedCallback();
    this._now = Date.now();
    this._tickTimer = window.setInterval(() => {
      this._now = Date.now();
    }, TICK_MS);
  }

  public disconnectedCallback(): void {
    super.disconnectedCallback();
    window.clearInterval(this._tickTimer);
    this._tickTimer = undefined;
    window.clearTimeout(this._optimisticTimer);
    this._optimisticTimer = undefined;
  }

  protected willUpdate(changed: PropertyValues): void {
    if (!changed.has('hass') || !this.hass) return;
    const entries = Object.entries(this._optimistic);
    if (entries.length === 0) return;
    // Drop each override the moment its entity reports anything new.
    const kept: Record<string, Optimistic> = {};
    let dropped = false;
    for (const [id, mark] of entries) {
      const stateObj = this.hass.states[id];
      if (stateObj && stateObj.last_updated !== mark.base) {
        dropped = true;
        continue;
      }
      kept[id] = mark;
    }
    if (dropped) this._optimistic = kept;
  }

  private _clearOptimistic(): void {
    window.clearTimeout(this._optimisticTimer);
    this._optimisticTimer = undefined;
    this._optimistic = {};
  }

  private _view(med: SilkMedConfig): MedView {
    const hass = this.hass;
    const stateObj = med.entity && hass ? hass.states[med.entity] : undefined;
    const unavailable = Boolean(med.entity) && isUnavailable(stateObj);
    const trackable = Boolean(stateObj) && !unavailable;
    const override = med.entity ? this._optimistic[med.entity] : undefined;
    const taken = trackable ? (override?.value ?? isActive(stateObj)) : false;
    const dueMs = med.time ? todayAt(String(med.time), this._now) : null;
    return {
      cfg: med,
      dueMs,
      taken,
      trackable,
      // A dose whose helper is dark cannot be called late — we simply don't know.
      late: !taken && !unavailable && dueMs !== null && this._now - dueMs > LATE_AFTER_MS,
      unavailable,
    };
  }

  private _locale(): string {
    return this.hass?.locale?.language ?? this.hass?.language ?? 'en';
  }

  private _timeText(dueMs: number): string {
    return new Intl.DateTimeFormat(this._locale(), {
      hour: 'numeric',
      minute: '2-digit',
    }).format(new Date(dueMs));
  }

  private _onRowClick(ev: Event, entityId: string): void {
    ev.stopPropagation();
    moreInfo(this, entityId);
  }

  private _onCheck(ev: Event, view: MedView): void {
    ev.stopPropagation();
    const hass = this.hass;
    const entityId = view.cfg.entity;
    if (!hass || !entityId || !view.trackable) return;
    const stateObj = hass.states[entityId];
    if (!stateObj) return;
    haptic(this, view.taken ? 'light' : 'success');
    // Optimistic flip mirrors what toggleEntity decides from the *real* state,
    // so rapid taps stay honest about the service calls actually sent.
    this._optimistic = {
      ...this._optimistic,
      [entityId]: { value: !isActive(stateObj), base: stateObj.last_updated },
    };
    window.clearTimeout(this._optimisticTimer);
    this._optimisticTimer = window.setTimeout(() => this._clearOptimistic(), OPTIMISTIC_TIMEOUT_MS);
    toggleEntity(hass, entityId).catch((err) => {
      console.warn('silk-meds-card: toggle failed', err);
      this._clearOptimistic();
    });
  }

  private _renderRow(view: MedView): TemplateResult {
    const hass = this.hass;
    const { cfg, taken, trackable, late, dueMs, unavailable } = view;
    const stateObj = cfg.entity && hass ? hass.states[cfg.entity] : undefined;
    const clickable = Boolean(stateObj);
    const timeText = dueMs === null ? '' : this._timeText(dueMs);
    const status = taken ? 'taken' : late ? 'late' : timeText ? `due ${timeText}` : 'no time set';
    return html`
      <div class="row ${late ? 'late' : ''} ${unavailable ? 'gone' : ''}">
        <button
          class="check ${taken ? 'on' : ''} ${trackable ? '' : 'static'}"
          role="checkbox"
          aria-checked=${taken ? 'true' : 'false'}
          aria-label=${`${cfg.name}: ${status}`}
          title=${trackable
            ? taken
              ? 'Taken — tap to undo'
              : 'Mark taken'
            : unavailable
              ? 'Helper unavailable'
              : 'No helper entity for this dose'}
          .disabled=${!trackable}
          @click=${(ev: Event) => this._onCheck(ev, view)}
        >
          ${taken ? html`<ha-icon icon="mdi:check"></ha-icon>` : nothing}
        </button>
        <button
          class="body ${clickable ? '' : 'static'} ${taken ? 'done' : ''}"
          title=${cfg.name}
          .disabled=${!clickable}
          @click=${clickable ? (ev: Event) => this._onRowClick(ev, cfg.entity as string) : undefined}
        >
          <ha-icon class="ricon" .icon=${cfg.icon ?? DEFAULT_ICON}></ha-icon>
          <span class="rname">${cfg.name}</span>
          ${late ? html`<span class="tag">late</span>` : nothing}
          ${timeText ? html`<span class="time">${timeText}</span>` : nothing}
        </button>
      </div>
    `;
  }

  protected render(): TemplateResult | typeof nothing {
    const config = this._config;
    const hass = this.hass;
    if (!config || !hass) return nothing;

    const views = config.meds.map((med) => this._view(med));
    const trackable = views.filter((v) => v.trackable);
    const taken = trackable.filter((v) => v.taken).length;
    const total = trackable.length;
    const done = total > 0 && taken === total;
    const firstObj = views
      .map((v) => (v.cfg.entity ? hass.states[v.cfg.entity] : undefined))
      .find((obj) => obj !== undefined);
    // Every dose in: the tally reads as success, the one moment it is status.
    const accent = done ? 'var(--success-color, #43a047)' : accentFor(firstObj);
    const name = config.name ?? 'Medication';
    const summary = total > 0 ? `${taken} of ${total} taken today` : `${views.length} scheduled`;

    return html`
      <ha-card class="control" style="--silk-accent:${accent}">
        <div class="head">
          <div class="title" title=${name}>${name}</div>
          <span class="tally">${summary}</span>
        </div>
        ${total > 0
          ? html`
              <div
                class="track"
                role="progressbar"
                aria-valuemin="0"
                aria-valuemax=${total}
                aria-valuenow=${taken}
                title=${summary}
              >
                <div class="bar" style="width:${((taken / total) * 100).toFixed(1)}%"></div>
              </div>
            `
          : nothing}
        <div class="rows">${views.map((view) => this._renderRow(view))}</div>
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
      .tally {
        flex: none;
        font-size: 12px;
        font-weight: 500;
        line-height: 1.3;
        color: var(--secondary-text-color);
        font-variant-numeric: tabular-nums;
        white-space: nowrap;
      }
      .track {
        flex: none;
        position: relative;
        height: 4px;
        border-radius: 999px;
        overflow: hidden;
        background: rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.08);
      }
      .bar {
        position: absolute;
        inset: 0 auto 0 0;
        border-radius: 999px;
        background: var(--silk-accent);
        transition:
          width 400ms var(--silk-ease-out),
          background 200ms ease;
      }
      .rows {
        display: flex;
        flex-direction: column;
        min-width: 0;
        margin-top: 2px;
      }
      .row {
        display: flex;
        align-items: center;
        gap: 10px;
        min-width: 0;
        min-height: 40px;
      }
      /* A dose whose helper went dark cannot be answered for. */
      .row.gone {
        opacity: 0.45;
      }
      .check {
        position: relative;
        flex: none;
        width: 24px;
        height: 24px;
        box-sizing: border-box;
        padding: 0;
        display: grid;
        place-items: center;
        border-radius: 50%;
        border: 2px solid rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.3);
        background: none;
        cursor: pointer;
        color: #fff;
        transition:
          transform 250ms var(--silk-spring),
          background 200ms ease,
          border-color 200ms ease;
      }
      /* Invisible halo lifts the touch target past 40px without a bigger ring. */
      .check::after {
        content: '';
        position: absolute;
        inset: -9px;
        border-radius: 50%;
      }
      .check:active:not(:disabled) {
        transform: scale(0.85);
        transition-duration: 120ms;
        transition-timing-function: var(--silk-ease-out);
      }
      .check.on {
        background: var(--silk-accent);
        border-color: var(--silk-accent);
      }
      /* No helper to toggle: the ring says so instead of pretending to be live. */
      .check.static {
        cursor: default;
        border-style: dashed;
        opacity: 0.6;
      }
      .check:focus-visible {
        outline: 2px solid color-mix(in srgb, var(--silk-accent) 70%, transparent);
        outline-offset: 3px;
      }
      .check ha-icon {
        --mdc-icon-size: 15px;
        display: flex;
        pointer-events: none;
      }
      .body {
        flex: 1;
        display: flex;
        align-items: center;
        gap: 8px;
        min-width: 0;
        height: 36px;
        margin: 0;
        padding: 0 4px;
        border: none;
        border-radius: 10px;
        background: none;
        font: inherit;
        color: inherit;
        text-align: left;
        cursor: pointer;
        transition: background 150ms ease-out;
      }
      .body:hover {
        background: rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.05);
      }
      .body.static {
        cursor: default;
      }
      .body.static:hover {
        background: none;
      }
      .body:focus-visible {
        outline: 2px solid color-mix(in srgb, var(--silk-accent) 70%, transparent);
        outline-offset: -2px;
      }
      .ricon {
        flex: none;
        --mdc-icon-size: 18px;
        color: var(--secondary-text-color);
        pointer-events: none;
      }
      .rname {
        flex: 1 1 auto;
        min-width: 0;
        font-size: 13.5px;
        font-weight: 500;
        color: var(--primary-text-color);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        transition: opacity 200ms ease;
      }
      /* Taken doses recede so the card shows what is still owed. */
      .body.done .ricon,
      .body.done .rname,
      .body.done .time {
        opacity: 0.45;
      }
      .tag {
        flex: none;
        padding: 2px 7px;
        border-radius: 999px;
        font-size: 11px;
        font-weight: 600;
        letter-spacing: 0.02em;
        line-height: 1.4;
        color: var(--warning-color, #ffa600);
        background: color-mix(in srgb, var(--warning-color, #ffa600) 16%, transparent);
      }
      .time {
        flex: none;
        min-width: 52px;
        text-align: right;
        font-size: 11px;
        font-weight: 500;
        line-height: 1.3;
        color: var(--secondary-text-color);
        font-variant-numeric: tabular-nums;
        white-space: nowrap;
      }
      .row.late .time {
        color: var(--warning-color, #ffa600);
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    'silk-meds-card': SilkMedsCard;
  }
}
