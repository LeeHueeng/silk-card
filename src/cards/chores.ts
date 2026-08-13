import { LitElement, html, css, nothing, TemplateResult } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { HomeAssistant, HassEntity, LovelaceCardConfig } from '../types';
import { silkControlStyles } from '../shared/base';
import { isUnavailable, moreInfo, haptic } from '../shared/service';
import { accentFor } from '../shared/color';
import { registerEditor } from '../shared/editor';

export const META = {
  type: 'silk-chores-card',
  name: 'Silk Chores',
  description: 'Whose turn it is this week.',
};

export interface SilkChoreConfig {
  name: string;
  /** Rotation order — index 0 is up first after the anchor. */
  people: string[];
  /** How often the chore comes round, in days. */
  interval_days: number;
  /** Last time it was done: an ISO date, or an entity holding one. */
  last?: string;
  icon?: string;
}

export interface SilkChoresCardConfig extends LovelaceCardConfig {
  /** YAML-only: the chores this card rotates. */
  chores: SilkChoreConfig[];
  name?: string;
  /** `domain.service` called with `{chore}` when a row's Done is pressed. */
  done_service?: string;
  /** Rotation origin for chores without a `last`. Default 2026-01-05 (a Monday). */
  epoch?: string;
}

/** A chore resolved against the clock — ready to draw, no math at render time. */
interface ChoreView {
  cfg: SilkChoreConfig;
  /** Local midnight the rotation counts from. */
  anchor: number;
  /** Intervals elapsed since the anchor — the cycle the calendar is in. */
  rawCycle: number;
  /** The cycle actually shown: one ahead of raw once this one is marked done. */
  cycle: number;
  assignee: string;
  daysLeft: number;
  label: string;
  overdue: boolean;
  done: boolean;
  /** Set when `last` points at an entity — the row opens its more-info. */
  entityId?: string;
  /** True when `last` names an entity that cannot speak right now. */
  unknown: boolean;
}

/** A locally recorded completion, valid only while the anchor it was taken against holds. */
interface DoneMark {
  /** Anchor at the time of marking; a moved anchor retires the mark. */
  a: number;
  /** Cycle index that was completed. */
  c: number;
}

const DAY_MS = 86_400_000;
const DEFAULT_EPOCH = '2026-01-05';
const DEFAULT_ICON = 'mdi:broom';
const STORE_PREFIX = 'silk-chores:';
/** Day-granularity labels only need a lazy clock. */
const TICK_MS = 900_000;
const POP_MS = 250;
const SERVICE_RE = /^[a-z_0-9]+\.[a-z_0-9]+$/;
const ENTITY_RE = /^[a-z_0-9]+\.[a-zA-Z_0-9]+$/;

const EDITOR_TAG = 'silk-chores-card-editor';

// Chores are a YAML roster (name + people + interval per row); the editor owns
// only the card-level options.
registerEditor(
  EDITOR_TAG,
  [
    { name: 'name', selector: { text: {} } },
    { name: 'done_service', selector: { text: {} } },
    { name: 'epoch', selector: { text: {} } },
  ],
  {
    name: 'Name',
    done_service: 'Service on Done (domain.service)',
    epoch: 'Rotation start (YYYY-MM-DD)',
  },
  { name: 'Chores', epoch: DEFAULT_EPOCH }
);

/** 'YYYY-MM-DD' and ISO stamps, read as local time (Date.parse would shift a bare date). */
function parseDateish(raw: string): number | null {
  const s = raw.trim();
  if (!s || s === 'unknown' || s === 'unavailable') return null;
  const date = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (date) return new Date(+date[1], +date[2] - 1, +date[3]).getTime();
  const local = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?$/.exec(s);
  if (local) {
    const [, y, mo, d, h, mi, sec] = local;
    return new Date(+y, +mo - 1, +d, +h, +mi, +(sec ?? 0)).getTime();
  }
  const ms = Date.parse(s);
  return Number.isFinite(ms) ? ms : null;
}

/** Local midnight of the day a stamp falls in — rotations turn over on days. */
function midnightOf(ms: number): number {
  const d = new Date(ms);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

/** Whole calendar days from `now` to `target` — DST-proof, unlike ms division. */
function dayDiff(targetMs: number, nowMs: number): number {
  const t = new Date(targetMs);
  const n = new Date(nowMs);
  return Math.round(
    (Date.UTC(t.getFullYear(), t.getMonth(), t.getDate()) -
      Date.UTC(n.getFullYear(), n.getMonth(), n.getDate())) /
      DAY_MS
  );
}

const markKey = (choreName: string): string => STORE_PREFIX + choreName.trim().toLowerCase();

/**
 * Whose turn it is, without a helper entity per chore: the rotation is pure
 * arithmetic on the calendar, so two dashboards (or two phones) agree without
 * syncing anything. Done marks are the one local piece — a convenience, never
 * the source of truth, and they retire themselves the moment `last` moves.
 */
@customElement('silk-chores-card')
export class SilkChoresCard extends LitElement {
  @property({ attribute: false }) public hass?: HomeAssistant;

  @state() private _config?: SilkChoresCardConfig;
  /** Clock the day math is resolved against; ticked so labels don't go stale. */
  @state() private _now = Date.now();
  /** Locally recorded completions, keyed by chore. */
  @state() private _marks: Record<string, DoneMark> = {};
  /** One-shot press acknowledgement, keyed by chore. */
  @state() private _popped?: string;

  private _tickTimer?: number;
  private _popTimer?: number;

  public static getStubConfig(hass: HomeAssistant): Partial<SilkChoresCardConfig> {
    const people = Object.keys(hass.states)
      .filter((id) => id.startsWith('person.'))
      .slice(0, 3)
      .map((id) => String(hass.states[id].attributes.friendly_name ?? id.split('.')[1]));
    const roster = people.length >= 2 ? people : ['Alex', 'Sam'];
    return {
      type: 'custom:silk-chores-card',
      name: 'Chores',
      chores: [
        {
          name: 'Take the bins out',
          people: roster,
          interval_days: 7,
          icon: 'mdi:trash-can-outline',
        },
        { name: 'Vacuum', people: roster, interval_days: 7, icon: 'mdi:robot-vacuum' },
      ],
    };
  }

  public static async getConfigElement(): Promise<HTMLElement> {
    return document.createElement(EDITOR_TAG);
  }

  public setConfig(config: SilkChoresCardConfig): void {
    if (!Array.isArray(config.chores) || config.chores.length === 0) {
      throw new Error(
        'silk-chores-card: `chores` is required — a list of {name, people, interval_days}'
      );
    }
    config.chores.forEach((chore, i) => {
      if (!chore || typeof chore.name !== 'string' || chore.name.trim() === '') {
        throw new Error(`silk-chores-card: chores[${i}] needs a \`name\``);
      }
      if (
        !Array.isArray(chore.people) ||
        chore.people.length === 0 ||
        chore.people.some((p) => typeof p !== 'string' || p.trim() === '')
      ) {
        throw new Error(`silk-chores-card: chores[${i}].people must be a list of names`);
      }
      if (!(Number(chore.interval_days) > 0)) {
        throw new Error(`silk-chores-card: chores[${i}].interval_days must be a positive number`);
      }
      if (chore.last !== undefined && typeof chore.last !== 'string') {
        throw new Error(`silk-chores-card: chores[${i}].last must be an ISO date or an entity id`);
      }
    });
    if (config.done_service !== undefined && !SERVICE_RE.test(String(config.done_service))) {
      throw new Error('silk-chores-card: `done_service` must look like `domain.service`');
    }
    if (config.epoch !== undefined && parseDateish(String(config.epoch)) === null) {
      throw new Error('silk-chores-card: `epoch` must be a date like 2026-01-05');
    }
    this._config = config;
    this._now = Date.now();
    this._loadMarks();
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
    // Another dashboard may have marked something while we were detached.
    this._loadMarks();
    this._tickTimer = window.setInterval(() => {
      this._now = Date.now();
    }, TICK_MS);
  }

  public disconnectedCallback(): void {
    super.disconnectedCallback();
    window.clearInterval(this._tickTimer);
    this._tickTimer = undefined;
    window.clearTimeout(this._popTimer);
    this._popTimer = undefined;
  }

  private _loadMarks(): void {
    const chores = this._config?.chores ?? [];
    const marks: Record<string, DoneMark> = {};
    for (const chore of chores) {
      const key = markKey(chore.name);
      try {
        const raw = window.localStorage.getItem(key);
        if (!raw) continue;
        const parsed = JSON.parse(raw) as Partial<DoneMark>;
        if (typeof parsed?.a === 'number' && typeof parsed?.c === 'number') {
          marks[key] = { a: parsed.a, c: parsed.c };
        }
      } catch {
        // Private mode, quota, or junk in the slot — the card works without it.
      }
    }
    this._marks = marks;
  }

  private _storeMark(key: string, mark: DoneMark | null): void {
    try {
      if (mark) window.localStorage.setItem(key, JSON.stringify(mark));
      else window.localStorage.removeItem(key);
    } catch {
      // A mark is a convenience; losing it must never break the card.
    }
  }

  /** Local midnight the rotation counts from, and whether it could be resolved. */
  private _anchor(chore: SilkChoreConfig): { ms: number; unknown: boolean } {
    const hass = this.hass;
    const epoch = parseDateish(String(this._config?.epoch ?? DEFAULT_EPOCH)) ?? Date.now();
    const raw = chore.last?.trim();
    if (!raw) return { ms: midnightOf(epoch), unknown: false };
    if (hass && ENTITY_RE.test(raw)) {
      const stateObj: HassEntity | undefined = hass.states[raw];
      if (stateObj && !isUnavailable(stateObj)) {
        // input_datetime carries epoch seconds; everything else states a date.
        const ts = stateObj.attributes.timestamp;
        const ms =
          typeof ts === 'number' && Number.isFinite(ts) ? ts * 1000 : parseDateish(stateObj.state);
        if (ms !== null) return { ms: midnightOf(ms), unknown: false };
      }
      // The entity was named but cannot say when — the epoch keeps the rotation
      // turning, and the row admits it does not know the date.
      return { ms: midnightOf(epoch), unknown: true };
    }
    const literal = parseDateish(raw);
    return literal === null
      ? { ms: midnightOf(epoch), unknown: true }
      : { ms: midnightOf(literal), unknown: false };
  }

  private _view(chore: SilkChoreConfig): ChoreView {
    const { ms: anchor, unknown } = this._anchor(chore);
    const intervalMs = Number(chore.interval_days) * DAY_MS;
    const rawCycle = Math.max(0, Math.floor((this._now - anchor) / intervalMs));
    const key = markKey(chore.name);
    const mark = this._marks[key];
    const done = !!mark && mark.a === anchor && mark.c >= rawCycle;
    // A completed cycle rolls the row forward: the chip shows who is up next.
    const cycle = done ? rawCycle + 1 : rawCycle;
    const people = chore.people;
    const assignee = people[cycle % people.length];
    const daysLeft = dayDiff(anchor + (cycle + 1) * intervalMs, this._now);
    const entityId =
      chore.last && ENTITY_RE.test(chore.last.trim()) ? chore.last.trim() : undefined;
    return {
      cfg: chore,
      anchor,
      rawCycle,
      cycle,
      assignee,
      daysLeft,
      label: unknown ? '—' : this._dueLabel(daysLeft),
      overdue: !unknown && daysLeft < 0,
      done,
      entityId,
      unknown,
    };
  }

  /** 'due today' · 'due tomorrow' · 'due in 2d' · 'overdue 1d'. */
  private _dueLabel(daysLeft: number): string {
    if (daysLeft > 1) return `due in ${daysLeft}d`;
    if (daysLeft === 1) return 'due tomorrow';
    if (daysLeft === 0) return 'due today';
    return `overdue ${-daysLeft}d`;
  }

  private _onRowClick(ev: Event, entityId: string): void {
    ev.stopPropagation();
    moreInfo(this, entityId);
  }

  private _onDone(ev: Event, view: ChoreView): void {
    ev.stopPropagation();
    const hass = this.hass;
    const config = this._config;
    if (!hass || !config) return;
    const key = markKey(view.cfg.name);

    if (view.done) {
      // Undo a mis-tap. Only the local mark can be taken back — a service call
      // that already went out is HA's now, so we never try to unsend it.
      haptic(this);
      const marks = { ...this._marks };
      delete marks[key];
      this._marks = marks;
      this._storeMark(key, null);
      return;
    }

    haptic(this, 'success');
    const mark: DoneMark = { a: view.anchor, c: view.rawCycle };
    this._marks = { ...this._marks, [key]: mark };
    this._storeMark(key, mark);
    this._pop(key);

    const service = config.done_service;
    if (service) {
      const [domain, name] = service.split('.');
      hass.callService(domain, name, { chore: view.cfg.name }).catch((err) => {
        console.warn('silk-chores-card: done_service failed', err);
      });
    }
  }

  private _pop(key: string): void {
    this._popped = key;
    window.clearTimeout(this._popTimer);
    this._popTimer = window.setTimeout(() => {
      this._popped = undefined;
      this._popTimer = undefined;
    }, POP_MS + 40);
  }

  private _renderRow(view: ChoreView): TemplateResult {
    const hass = this.hass;
    const { cfg, assignee, label, overdue, done, unknown } = view;
    const key = markKey(cfg.name);
    const stateObj = view.entityId ? hass?.states[view.entityId] : undefined;
    const clickable = Boolean(stateObj);
    return html`
      <div class="row ${unknown ? 'unknown' : ''}">
        <button
          class="body ${clickable ? '' : 'static'}"
          title=${cfg.name}
          aria-label=${`${cfg.name}: ${assignee}, ${label}`}
          .disabled=${!clickable}
          @click=${clickable
            ? (ev: Event) => this._onRowClick(ev, view.entityId as string)
            : undefined}
        >
          <ha-icon class="ricon" .icon=${cfg.icon ?? DEFAULT_ICON}></ha-icon>
          <span class="rname">${cfg.name}</span>
          <span class="who" title=${assignee}>${assignee}</span>
          <span class="due ${overdue ? 'over' : ''}">${label}</span>
        </button>
        <button
          class="done ${done ? 'on' : ''} ${this._popped === key ? 'pop' : ''}"
          aria-pressed=${done ? 'true' : 'false'}
          aria-label=${done ? `Undo ${cfg.name}` : `Mark ${cfg.name} done`}
          title=${done ? 'Done — tap to undo' : 'Mark done'}
          @click=${(ev: Event) => this._onDone(ev, view)}
        >
          <ha-icon icon="mdi:check"></ha-icon>
        </button>
      </div>
    `;
  }

  protected render(): TemplateResult | typeof nothing {
    const config = this._config;
    const hass = this.hass;
    if (!config || !hass) return nothing;

    // Config order is the reading order: a rota you can learn by heart beats
    // rows that reshuffle every time someone presses Done.
    const views = config.chores.map((chore) => this._view(chore));
    const overdue = views.filter((v) => v.overdue).length;
    const firstObj = views
      .map((v) => (v.entityId ? hass.states[v.entityId] : undefined))
      .find((obj) => obj !== undefined);
    const accent = accentFor(firstObj);
    const name = config.name ?? 'Chores';

    return html`
      <ha-card class="control" style="--silk-accent:${accent}">
        <div class="head">
          <div class="title" title=${name}>${name}</div>
          ${overdue > 0 ? html`<span class="chip late">${overdue} overdue</span>` : nothing}
        </div>
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
        align-items: center;
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
      .chip.late {
        flex: none;
        cursor: default;
        font-variant-numeric: tabular-nums;
        color: var(--error-color, #db4437);
        background: color-mix(in srgb, var(--error-color, #db4437) 14%, transparent);
      }
      .rows {
        display: flex;
        flex-direction: column;
        min-width: 0;
      }
      .row {
        display: flex;
        align-items: center;
        gap: 6px;
        min-width: 0;
        min-height: 40px;
      }
      /* A chore nothing can date recedes rather than inventing a due day. */
      .row.unknown .body {
        opacity: 0.45;
      }
      .body {
        flex: 1;
        display: flex;
        align-items: center;
        gap: 10px;
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
      /* Icons stay neutral — the chip and the due label carry the state. */
      .ricon {
        flex: none;
        --mdc-icon-size: 20px;
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
      }
      .who {
        flex: 0 1 auto;
        max-width: 40%;
        padding: 3px 9px;
        border-radius: 999px;
        font-size: 11px;
        font-weight: 600;
        letter-spacing: 0.02em;
        line-height: 1.4;
        color: var(--silk-accent);
        background: color-mix(in srgb, var(--silk-accent) 16%, transparent);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .due {
        flex: none;
        min-width: 62px;
        text-align: right;
        font-size: 12px;
        font-weight: 500;
        line-height: 1.3;
        color: var(--secondary-text-color);
        font-variant-numeric: tabular-nums;
        white-space: nowrap;
      }
      .due.over {
        font-weight: 600;
        color: var(--error-color, #db4437);
      }
      .done {
        position: relative;
        flex: none;
        width: 28px;
        height: 28px;
        display: grid;
        place-items: center;
        padding: 0;
        border: none;
        border-radius: 9px;
        cursor: pointer;
        color: var(--secondary-text-color);
        background: rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.06);
        transition:
          transform 250ms var(--silk-spring),
          background 200ms ease,
          color 200ms ease;
      }
      /* Invisible halo lifts the touch target past 40px without a bigger button. */
      .done::after {
        content: '';
        position: absolute;
        inset: -6px;
      }
      .done:active {
        transform: scale(0.9);
        transition-duration: 120ms;
        transition-timing-function: var(--silk-ease-out);
      }
      .done.on {
        color: var(--silk-accent);
        background: color-mix(in srgb, var(--silk-accent) 20%, transparent);
      }
      .done:focus-visible {
        outline: 2px solid color-mix(in srgb, var(--silk-accent) 70%, transparent);
        outline-offset: 2px;
      }
      .done ha-icon {
        --mdc-icon-size: 17px;
        pointer-events: none;
      }
      /* One-shot acknowledgement of the tap — never a loop. */
      .done.pop {
        animation: silk-chores-pop 250ms var(--silk-spring);
      }
      @keyframes silk-chores-pop {
        0% {
          transform: scale(0.9);
        }
        45% {
          transform: scale(1.12);
        }
        100% {
          transform: scale(1);
        }
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    'silk-chores-card': SilkChoresCard;
  }
}
