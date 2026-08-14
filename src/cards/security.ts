import { LitElement, html, css, nothing, PropertyValues, TemplateResult } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { HomeAssistant, HassEntity, LovelaceCardConfig } from '../types';
import { silkControlStyles } from '../shared/base';
import {
  isActive,
  isUnavailable,
  moreInfo,
  haptic,
  stateText,
  supportsFeature,
} from '../shared/service';
import { registerListEditor } from '../shared/listeditor';
import { entityListSelector } from '../shared/list';

export const META = {
  type: 'silk-security-card',
  name: 'Silk Security',
  description: 'One verdict for the whole house.',
};

export interface SilkSecurityCardConfig extends LovelaceCardConfig {
  /** alarm_control_panel entity — enables the verdict's top severity and the arm chips. */
  alarm?: string;
  /** lock.* ids. */
  locks?: string[];
  /** cover.* / binary_sensor.* door-window ids. */
  openings?: string[];
  /** binary_sensor.* motion/occupancy ids. */
  motion?: string[];
  name?: string;
}

type CatKey = 'locks' | 'openings' | 'motion';

/** One stat pill's worth of truth about a configured category. */
interface Category {
  key: CatKey;
  label: string;
  ids: string[];
  /** Entities currently in the state worth showing: unlocked / open / moving. */
  offenders: string[];
  /** Pill value, e.g. '3/3', '0/5', '1'. */
  value: string;
  /** True when the count is a genuine security fault (never for motion). */
  failing: boolean;
  /** Motion only: something is moving right now. Emphasis, not fault. */
  live: boolean;
}

type VerdictKey = 'triggered' | 'breach' | 'motion' | 'secure' | 'unknown';

// alarm_control_panel supported_features bits (HA core const.py).
const FEATURE_ARM_HOME = 1;
const FEATURE_ARM_AWAY = 2;

interface ArmChip {
  key: 'disarm' | 'home' | 'away';
  label: string;
  service: 'alarm_disarm' | 'alarm_arm_home' | 'alarm_arm_away';
  /** Panel state this chip lands on — marks it as current. */
  activeState: string;
  /** supported_features bit gating the chip; disarm is always offered. */
  feature?: number;
}

/** Service names match silk-alarm-card exactly — one vocabulary for the panel. */
const ARM_CHIPS: readonly ArmChip[] = [
  { key: 'disarm', label: 'Disarm', service: 'alarm_disarm', activeState: 'disarmed' },
  {
    key: 'home',
    label: 'Home',
    service: 'alarm_arm_home',
    activeState: 'armed_home',
    feature: FEATURE_ARM_HOME,
  },
  {
    key: 'away',
    label: 'Away',
    service: 'alarm_arm_away',
    activeState: 'armed_away',
    feature: FEATURE_ARM_AWAY,
  },
];

const VERDICT_ICONS: Record<VerdictKey, string> = {
  triggered: 'mdi:shield-alert',
  breach: 'mdi:shield-alert-outline',
  motion: 'mdi:motion-sensor',
  secure: 'mdi:shield-check',
  unknown: 'mdi:shield-off-outline',
};

const ROW_HEIGHT = 40;
const DRAWER_PAD = 8;
const OVERFLOW_HEIGHT = 18;
const MAX_ROWS = 6;
const OPTIMISTIC_TIMEOUT_MS = 2000;

const EDITOR_TAG = 'silk-security-card-editor';

// The three categories are inventories of entity ids — plain lists, so each one
// is a multi-entity picker. The card only ever reads ids, and the shared list
// editor folds the picker's answer back into the stored list, so a hand-written
// order survives adding or removing a single entity.
registerListEditor(EDITOR_TAG, {
  schema: [
    { name: 'alarm', selector: { entity: { domain: ['alarm_control_panel'] } } },
    { name: 'name', selector: { text: {} } },
    entityListSelector('locks', ['lock']),
    // Doors and windows arrive as either binary_sensors or covers; a
    // device_class filter here would hide every garage door cover.
    entityListSelector('openings', ['binary_sensor', 'cover']),
    entityListSelector('motion', ['binary_sensor'], ['motion', 'occupancy']),
  ],
  labels: {
    alarm: '경보 패널',
    name: '이름',
    locks: '잠금 장치',
    openings: '문·창문',
    motion: '움직임 센서',
  },
  defaults: { name: 'Security' },
  listFields: ['locks', 'openings', 'motion'],
});

function validateList(value: unknown, key: string): string[] {
  if (value === undefined) return [];
  if (!Array.isArray(value) || value.some((id) => typeof id !== 'string' || id === '')) {
    throw new Error(`silk-security-card: \`${key}\` must be a list of entity ids`);
  }
  return value as string[];
}

/**
 * The house's one-line verdict. Severity is strictly ordered — a triggered
 * alarm outranks an open door, which outranks motion — so the card never asks
 * you to weigh two colors against each other. Chroma is reserved for real
 * status: error for the alarm, warning for a breach, success for all-clear;
 * motion reads as information, not alarm, so it stays uncolored.
 */
@customElement('silk-security-card')
export class SilkSecurityCard extends LitElement {
  @property({ attribute: false }) public hass?: HomeAssistant;

  @state() private _config?: SilkSecurityCardConfig;

  /** Category whose offenders are listed in the drawer; null = collapsed. */
  @state() private _open: CatKey | null = null;

  /** Optimistic panel state ('arming' | 'disarmed'); null = trust HA. */
  @state() private _optimistic: string | null = null;

  /** Kept while the drawer collapses so the rows animate out, not vanish. */
  private _lastOpen: CatKey | null = null;

  /** last_updated snapshot at call time; any newer stamp clears the override. */
  private _optimisticBase = '';
  private _optimisticTimer?: number;

  public static getStubConfig(hass: HomeAssistant): Partial<SilkSecurityCardConfig> {
    const ids = Object.keys(hass.states);
    const byClass = (domain: string, classes: string[]): string[] =>
      ids.filter(
        (id) =>
          id.startsWith(`${domain}.`) &&
          classes.includes(String(hass.states[id].attributes.device_class ?? ''))
      );
    return {
      type: 'custom:silk-security-card',
      alarm: ids.find((id) => id.startsWith('alarm_control_panel.')),
      locks: ids.filter((id) => id.startsWith('lock.')).slice(0, 8),
      openings: [
        ...byClass('binary_sensor', ['door', 'window', 'garage_door', 'opening']),
        ...ids.filter((id) => id.startsWith('cover.')),
      ].slice(0, 8),
      motion: byClass('binary_sensor', ['motion', 'occupancy']).slice(0, 8),
    };
  }

  public static async getConfigElement(): Promise<HTMLElement> {
    return document.createElement(EDITOR_TAG);
  }

  public setConfig(config: SilkSecurityCardConfig): void {
    if (config.alarm !== undefined && typeof config.alarm !== 'string') {
      throw new Error('silk-security-card: `alarm` must be an alarm_control_panel entity id');
    }
    const locks = validateList(config.locks, 'locks');
    const openings = validateList(config.openings, 'openings');
    const motion = validateList(config.motion, 'motion');
    if (!config.alarm && locks.length + openings.length + motion.length === 0) {
      throw new Error(
        'silk-security-card: configure at least one of `alarm`, `locks`, `openings`, `motion`'
      );
    }
    this._config = config;
    this._open = null;
    this._lastOpen = null;
    this._clearOptimistic();
  }

  public getCardSize(): number {
    return this._open ? 3 : 2;
  }

  public getGridOptions(): Record<string, number> {
    return { columns: 6, rows: 2, min_columns: 4, min_rows: 2 };
  }

  public disconnectedCallback(): void {
    super.disconnectedCallback();
    window.clearTimeout(this._optimisticTimer);
  }

  protected willUpdate(changed: PropertyValues): void {
    if (!changed.has('hass') || !this._config) return;
    if (this._optimistic !== null && this._config.alarm) {
      const stateObj = this.hass?.states[this._config.alarm];
      if (stateObj && stateObj.last_updated !== this._optimisticBase) this._clearOptimistic();
    }
    // Nothing left to list — fold the drawer instead of animating to nowhere.
    if (this._open && this._category(this._open)?.offenders.length === 0) this._open = null;
  }

  private _clearOptimistic(): void {
    window.clearTimeout(this._optimisticTimer);
    this._optimisticTimer = undefined;
    this._optimistic = null;
  }

  private _ids(key: CatKey): string[] {
    const config = this._config;
    if (!config) return [];
    if (key === 'locks') return config.locks ?? [];
    if (key === 'openings') return config.openings ?? [];
    return config.motion ?? [];
  }

  private _allIds(): string[] {
    const config = this._config;
    if (!config) return [];
    return [
      ...(config.alarm ? [config.alarm] : []),
      ...this._ids('locks'),
      ...this._ids('openings'),
      ...this._ids('motion'),
    ];
  }

  /** Counts for one configured category, or null when it isn't configured. */
  private _category(key: CatKey): Category | null {
    const hass = this.hass;
    const ids = this._ids(key);
    if (!hass || ids.length === 0) return null;
    // isActive() is HA's own semantics: lock active = not locked, cover active
    // = not closed, binary_sensor active = on. Unavailable never offends.
    const offenders = ids.filter((id) => {
      const stateObj = hass.states[id];
      return stateObj ? isActive(stateObj) : false;
    });
    if (key === 'locks') {
      // Numerator counts what is actually locked, so an unavailable lock reads
      // as "not accounted for" rather than silently passing.
      const locked = ids.filter((id) => hass.states[id]?.state === 'locked').length;
      return {
        key,
        label: 'Locks',
        ids,
        offenders,
        value: `${locked}/${ids.length}`,
        failing: offenders.length > 0,
        live: false,
      };
    }
    if (key === 'openings') {
      return {
        key,
        label: 'Doors',
        ids,
        offenders,
        value: `${offenders.length}/${ids.length}`,
        failing: offenders.length > 0,
        live: false,
      };
    }
    return {
      key,
      label: 'Motion',
      ids,
      offenders,
      value: `${offenders.length}`,
      failing: false,
      live: offenders.length > 0,
    };
  }

  /**
   * A code is required when the panel declares a code_format — except for
   * arming on panels that waive it (code_arm_required: false). This card has
   * no keypad, so any chip that would need a code is simply not offered.
   */
  private _needsCode(stateObj: HassEntity, chip: ArmChip): boolean {
    if (!stateObj.attributes.code_format) return false;
    if (chip.key !== 'disarm' && stateObj.attributes.code_arm_required === false) return false;
    return true;
  }

  private _armChips(stateObj: HassEntity): ArmChip[] {
    return ARM_CHIPS.filter(
      (chip) =>
        (chip.feature === undefined || supportsFeature(stateObj, chip.feature)) &&
        !this._needsCode(stateObj, chip)
    );
  }

  private _onCardClick(): void {
    if (this._config?.alarm) moreInfo(this, this._config.alarm);
  }

  private _onPillTap(ev: Event): void {
    ev.stopPropagation();
    const key = (ev.currentTarget as HTMLButtonElement).dataset.cat as CatKey | undefined;
    if (!key) return;
    const cat = this._category(key);
    if (!cat || cat.offenders.length === 0) return; // nothing to reveal
    haptic(this, 'selection');
    if (this._open === key) {
      this._open = null;
    } else {
      this._open = key;
      this._lastOpen = key;
    }
  }

  private _onRowClick(ev: Event, entityId: string): void {
    ev.stopPropagation();
    moreInfo(this, entityId);
  }

  private _onArmTap(ev: Event): void {
    ev.stopPropagation();
    const config = this._config;
    const hass = this.hass;
    if (!config?.alarm || !hass) return;
    const stateObj = hass.states[config.alarm];
    if (!stateObj || isUnavailable(stateObj)) return;
    const key = (ev.currentTarget as HTMLButtonElement).dataset.arm;
    const chip = ARM_CHIPS.find((c) => c.key === key);
    if (!chip) return;
    haptic(this, 'success');
    hass.callService('alarm_control_panel', chip.service, { entity_id: config.alarm });
    // Optimistically show the honest next state: disarm settles immediately,
    // arm modes pass through the panel's arming countdown first.
    this._optimistic = chip.key === 'disarm' ? 'disarmed' : 'arming';
    this._optimisticBase = stateObj.last_updated;
    window.clearTimeout(this._optimisticTimer);
    this._optimisticTimer = window.setTimeout(() => this._clearOptimistic(), OPTIMISTIC_TIMEOUT_MS);
  }

  /** Segments joined with the Silk separator dot. */
  private _joined(parts: string[]): TemplateResult {
    return html`${parts.map(
      (part, i) => html`${i > 0 ? html`<span class="sep">·</span>` : nothing}${part}`
    )}`;
  }

  private _renderDrawer(open: CatKey | null): TemplateResult {
    const hass = this.hass;
    const cat = this._lastOpen ? this._category(this._lastOpen) : null;
    const offenders = cat?.offenders ?? [];
    const shown = offenders.slice(0, MAX_ROWS);
    const overflow = offenders.length - shown.length;
    const height =
      open && shown.length > 0
        ? shown.length * ROW_HEIGHT + (overflow > 0 ? OVERFLOW_HEIGHT : 0) + DRAWER_PAD
        : 0;
    return html`
      <div class="drawer" style="max-height:${height}px">
        <div class="rows">
          ${shown.map((id) => {
            const stateObj = hass?.states[id];
            const label = stateObj?.attributes.friendly_name ?? id;
            return html`
              <button class="row" title=${label} @click=${(ev: Event) => this._onRowClick(ev, id)}>
                <ha-state-icon .hass=${hass} .stateObj=${stateObj}></ha-state-icon>
                <span class="row-name">${label}</span>
                <span class="row-state">${stateObj ? stateText(hass, stateObj) : '—'}</span>
              </button>
            `;
          })}
          ${overflow > 0 ? html`<div class="more">+${overflow} more</div>` : nothing}
        </div>
      </div>
    `;
  }

  protected render(): TemplateResult | typeof nothing {
    const config = this._config;
    const hass = this.hass;
    if (!config || !hass) return nothing;
    const allIds = this._allIds();
    if (allIds.length > 0 && allIds.every((id) => !hass.states[id])) {
      return html`
        <ha-card class="control">
          <div class="warning">Entities not found: ${allIds.join(', ')}</div>
        </ha-card>
      `;
    }

    const cats = (['locks', 'openings', 'motion'] as CatKey[])
      .map((key) => this._category(key))
      .filter((cat): cat is Category => cat !== null);
    const byKey = (key: CatKey): Category | undefined => cats.find((c) => c.key === key);

    const alarmObj = config.alarm ? hass.states[config.alarm] : undefined;
    // While an optimistic override is live, present a synthetic panel object so
    // the verdict, the detail line and the chips all agree with the tap.
    const alarmDisplay: HassEntity | undefined =
      alarmObj && this._optimistic !== null
        ? { ...alarmObj, state: this._optimistic }
        : alarmObj;

    const unlocked = byKey('locks')?.offenders.length ?? 0;
    const opened = byKey('openings')?.offenders.length ?? 0;
    const moving = byKey('motion')?.offenders.length ?? 0;
    const unavailable = allIds.length > 0 && allIds.every((id) => isUnavailable(hass.states[id]));

    let verdict: VerdictKey;
    let word: string;
    let accent: string;
    if (unavailable) {
      verdict = 'unknown';
      word = 'Unknown';
      accent = 'var(--primary-color, #4aa8ff)';
    } else if (alarmDisplay?.state === 'triggered') {
      verdict = 'triggered';
      word = 'Alarm triggered';
      accent = 'var(--error-color, #db4437)';
    } else if (unlocked > 0 || opened > 0) {
      verdict = 'breach';
      word = unlocked > 0 ? 'Unlocked' : 'Open';
      accent = 'var(--warning-color, #ffa600)';
    } else if (moving > 0) {
      // Motion is information, not a fault: no status color, no tinted shield.
      verdict = 'motion';
      word = 'Motion';
      accent = 'var(--primary-color, #4aa8ff)';
    } else {
      verdict = 'secure';
      word = 'Secure';
      accent = 'var(--success-color, #43a047)';
    }

    const breachParts: string[] = [];
    if (opened > 0) breachParts.push(`${opened} open`);
    if (unlocked > 0) breachParts.push(`${unlocked} unlocked`);

    let detail: TemplateResult;
    if (verdict === 'unknown') {
      detail = html`No data`;
    } else if (verdict === 'triggered') {
      detail = breachParts.length
        ? this._joined(breachParts)
        : html`${alarmObj?.attributes.friendly_name ?? config.alarm}`;
    } else if (verdict === 'breach') {
      detail = this._joined(breachParts);
    } else if (verdict === 'motion') {
      const names = (byKey('motion')?.offenders ?? []).map(
        (id) => hass.states[id]?.attributes.friendly_name ?? id
      );
      detail = this._joined(names);
    } else if (alarmDisplay) {
      detail = html`${stateText(hass, alarmDisplay)}`;
    } else {
      const calm: string[] = [];
      if (byKey('locks')) calm.push('All locked');
      if (byKey('openings')) calm.push('all closed');
      detail = calm.length ? this._joined(calm) : html`All clear`;
    }

    const chips = alarmObj && !isUnavailable(alarmObj) ? this._armChips(alarmObj) : [];
    const name = config.name ?? 'Security';
    const tinted = verdict !== 'motion' && verdict !== 'unknown';
    const cardClass = [
      'control',
      unavailable ? 'unavailable' : '',
      this._open ? 'expanded' : '',
      config.alarm ? '' : 'static',
    ]
      .filter(Boolean)
      .join(' ');

    return html`
      <ha-card
        class=${cardClass}
        style="--silk-accent:${accent}"
        @click=${this._onCardClick}
      >
        <div class="top">
          <div class="shield ${tinted ? 'tinted' : ''}">
            <ha-icon .icon=${VERDICT_ICONS[verdict]}></ha-icon>
          </div>
          <div class="info">
            <div class="cap" title=${name}>${name}</div>
            <div class="verdict ${tinted ? 'status' : ''}">${word}</div>
            <div class="state">${detail}</div>
          </div>
          <div class="trailing pills">
            ${cats.map((cat) => {
              // A pill with nothing to reveal stays readable but inert — no
              // dead expand, no misleading aria-expanded.
              const expandable = cat.offenders.length > 0;
              const open = this._open === cat.key;
              return html`
                <button
                  class="pill ${cat.failing ? 'warn' : ''} ${cat.live ? 'live' : ''} ${open
                    ? 'open'
                    : ''} ${expandable ? '' : 'mute'}"
                  data-cat=${cat.key}
                  aria-expanded=${expandable ? (open ? 'true' : 'false') : nothing}
                  aria-label=${`${cat.label} ${cat.value}`}
                  @click=${this._onPillTap}
                >
                  <span class="pl">${cat.label}</span><span class="pv">${cat.value}</span>
                </button>
              `;
            })}
          </div>
        </div>
        ${chips.length > 0
          ? html`
              <div class="modes">
                ${chips.map((chip) => {
                  const current = alarmDisplay?.state === chip.activeState;
                  return html`
                    <button
                      class="chip ${current ? 'active' : ''}"
                      data-arm=${chip.key}
                      aria-pressed=${current ? 'true' : 'false'}
                      @click=${this._onArmTap}
                    >
                      ${chip.label}
                    </button>
                  `;
                })}
              </div>
            `
          : nothing}
        ${this._renderDrawer(this._open)}
      </ha-card>
    `;
  }

  static styles = [
    silkControlStyles,
    css`
      /* Stacked rows; the card may outgrow its cell while the drawer is open. */
      ha-card {
        flex-direction: column;
        align-items: stretch;
        justify-content: center;
        gap: 10px;
        height: auto;
        min-height: 100%;
      }
      /* Without a panel there is no card-level action, so no pointer promise. */
      ha-card.static {
        cursor: default;
      }
      .top {
        display: flex;
        align-items: center;
        gap: 12px;
        min-width: 0;
      }
      .shield {
        flex: none;
        width: 46px;
        height: 46px;
        border-radius: 14px;
        display: grid;
        place-items: center;
        color: var(--secondary-text-color);
        background: rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.06);
        transition:
          background 200ms ease,
          color 200ms ease;
      }
      .shield.tinted {
        color: var(--silk-accent);
        background: color-mix(in srgb, var(--silk-accent) 20%, transparent);
      }
      .shield ha-icon {
        --mdc-icon-size: 24px;
        pointer-events: none;
      }
      /* The card's own label sits above the headline, quiet and small — the
         verdict is what you read, the name is only how you find the card. */
      .cap {
        font-size: 11.5px;
        font-weight: 600;
        line-height: 1.2;
        color: var(--secondary-text-color);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .verdict {
        font-size: 17px;
        font-weight: 600;
        letter-spacing: -0.01em;
        line-height: 1.25;
        color: var(--primary-text-color);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        transition: color 200ms ease;
      }
      .verdict.status {
        color: var(--silk-accent);
      }
      /* Panel states arrive lowercase ('armed away'); lift the first letter. */
      .state::first-letter {
        text-transform: uppercase;
      }
      .pills {
        flex: none;
        display: flex;
        flex-wrap: wrap;
        justify-content: flex-end;
        align-items: center;
        gap: 4px 6px;
        max-width: 52%;
      }
      .pill {
        position: relative;
        display: inline-flex;
        align-items: baseline;
        gap: 4px;
        border: none;
        margin: 0;
        padding: 3px 8px;
        border-radius: 999px;
        font: inherit;
        font-size: 11px;
        font-weight: 600;
        line-height: 1.3;
        white-space: nowrap;
        cursor: pointer;
        color: var(--secondary-text-color);
        background: rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.06);
        transition:
          background 150ms ease-out,
          color 200ms ease;
      }
      /* Invisible halo lifts the touch target without growing the pill. */
      .pill::after {
        content: '';
        position: absolute;
        inset: -8px -2px;
        border-radius: 999px;
      }
      .pill:hover {
        background: rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.12);
      }
      .pill:focus-visible {
        outline: 2px solid color-mix(in srgb, var(--silk-accent) 70%, transparent);
        outline-offset: 2px;
      }
      .pill .pv {
        font-variant-numeric: tabular-nums;
      }
      /* Chroma only where it means a fault. */
      .pill.warn {
        color: var(--warning-color, #ffa600);
        background: color-mix(in srgb, var(--warning-color, #ffa600) 14%, transparent);
      }
      /* Motion is emphasis, not alarm: weight and contrast, no hue. */
      .pill.live {
        color: var(--primary-text-color);
        background: rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.12);
      }
      .pill.open {
        color: var(--primary-text-color);
        background: rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.16);
      }
      .pill.mute {
        cursor: default;
      }
      .pill.mute:hover {
        background: rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.06);
      }
      .modes {
        display: flex;
        align-items: center;
        flex-wrap: wrap;
        gap: 6px;
        position: relative;
        z-index: 1;
      }
      .unavailable .modes,
      .unavailable .shield {
        opacity: 0.45;
      }
      .drawer {
        overflow: hidden;
        visibility: hidden;
        transition:
          max-height 250ms ease-out,
          visibility 0s linear 250ms;
      }
      .expanded .drawer {
        visibility: visible;
        transition: max-height 250ms ease-out;
      }
      .rows {
        display: flex;
        flex-direction: column;
        padding-top: ${DRAWER_PAD}px;
      }
      .row {
        display: flex;
        align-items: center;
        gap: 10px;
        width: 100%;
        height: ${ROW_HEIGHT}px;
        border: none;
        background: none;
        margin: 0;
        padding: 0 4px;
        border-radius: 10px;
        cursor: pointer;
        font: inherit;
        text-align: left;
        color: inherit;
        transition: background 150ms ease-out;
      }
      .row:hover {
        background: rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.05);
      }
      .row ha-state-icon {
        flex: none;
        --mdc-icon-size: 18px;
        color: var(--silk-accent);
        pointer-events: none;
      }
      .row-name {
        flex: 1;
        min-width: 0;
        font-size: 13px;
        font-weight: 500;
        color: var(--primary-text-color);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .row-state {
        flex: none;
        max-width: 40%;
        font-size: 12px;
        color: var(--secondary-text-color);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        font-variant-numeric: tabular-nums;
      }
      .row-state::first-letter {
        text-transform: uppercase;
      }
      .more {
        font-size: 12px;
        line-height: ${OVERFLOW_HEIGHT}px;
        color: var(--secondary-text-color);
        padding-left: 4px;
        font-variant-numeric: tabular-nums;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    'silk-security-card': SilkSecurityCard;
  }
}
