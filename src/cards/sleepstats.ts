import { LitElement, html, css, nothing, TemplateResult } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { HomeAssistant, HassEntity, LovelaceCardConfig } from '../types';
import { silkControlStyles } from '../shared/base';
import { isUnavailable, moreInfo } from '../shared/service';
import { accentFor } from '../shared/color';
import { registerEditor } from '../shared/editor';

export const META = {
  type: 'silk-sleep-card',
  name: 'Silk Sleep',
  description: 'Last night, in one bar.',
};

export interface SilkSleepCardConfig extends LovelaceCardConfig {
  /** Total sleep. Read as hours unless the entity carries a unit. */
  duration: string;
  /** Sleep score 0–100, shown as a chip. */
  score?: string;
  /** Stage sensors. Read as minutes unless the entity carries a unit. */
  deep?: string;
  rem?: string;
  awake?: string;
  /** Times to bed and up — timestamps or plain `HH:MM` strings. */
  bedtime?: string;
  wake?: string;
  name?: string;
  /** Accent override. */
  color?: string;
}

/**
 * The shared Silk categorical palette, in order. Stages are categories, not
 * magnitudes, so they take palette slots in a fixed order — deep, rem, light,
 * awake — and two sleep cards side by side always agree.
 */
const PALETTE = [
  'var(--primary-color, #4aa8ff)',
  '#ef6c6c',
  '#5ec78d',
  '#f0b357',
  '#a97ee8',
  '#e879b9',
];

type StageKey = 'deep' | 'rem' | 'light' | 'awake';

const STAGES: { key: StageKey; label: string; color: string }[] = [
  { key: 'deep', label: 'Deep', color: PALETTE[0] },
  { key: 'rem', label: 'REM', color: PALETTE[1] },
  { key: 'light', label: 'Light', color: PALETTE[2] },
  { key: 'awake', label: 'Awake', color: PALETTE[3] },
];

interface Stage {
  key: StageKey;
  label: string;
  color: string;
  minutes: number;
  pct: number;
}

/** Anything thinner than this is a seam, not a stage. */
const MIN_PCT = 1.5;

const HHMM_RE = /^(\d{1,2}):(\d{2})/;

/**
 * Minutes from a numeric state. The unit decides; without one, totals are
 * hours (how sleep duration is nearly always exposed) and stages are minutes.
 */
function toMinutes(stateObj: HassEntity | undefined, assume: 'hours' | 'minutes'): number | undefined {
  if (!stateObj || isUnavailable(stateObj) || stateObj.state === '') return undefined;
  const n = Number(stateObj.state);
  if (!Number.isFinite(n) || n < 0) return undefined;
  const unit = String(stateObj.attributes.unit_of_measurement ?? '').trim().toLowerCase();
  if (unit.startsWith('min') || unit === 'm') return n;
  if (unit.startsWith('h')) return n * 60;
  if (unit.startsWith('s')) return n / 60;
  if (unit === 'd') return n * 1440;
  return assume === 'hours' ? n * 60 : n;
}

/** 432 → '7h 12m'. */
function hm(minutes: number): string {
  const total = Math.round(minutes);
  const h = Math.floor(total / 60);
  const m = total % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

const EDITOR_TAG = 'silk-sleep-card-editor';

registerEditor(
  EDITOR_TAG,
  [
    { name: 'duration', required: true, selector: { entity: { domain: ['sensor', 'input_number'] } } },
    { name: 'name', selector: { text: {} } },
    { name: 'score', selector: { entity: { domain: ['sensor', 'input_number'] } } },
    {
      name: '',
      type: 'grid',
      schema: [
        { name: 'deep', selector: { entity: { domain: ['sensor', 'input_number'] } } },
        { name: 'rem', selector: { entity: { domain: ['sensor', 'input_number'] } } },
        { name: 'awake', selector: { entity: { domain: ['sensor', 'input_number'] } } },
      ],
    },
    {
      name: '',
      type: 'grid',
      schema: [
        { name: 'bedtime', selector: { entity: {} } },
        { name: 'wake', selector: { entity: {} } },
      ],
    },
    { name: 'color', selector: { ui_color: {} } },
  ],
  {
    duration: '수면 시간',
    name: '이름',
    score: '수면 점수',
    deep: '깊은 수면',
    rem: '렘수면',
    awake: '깬 시간',
    bedtime: '취침 시각',
    wake: '기상 시각',
    color: '강조 색상',
  }
);

@customElement('silk-sleep-card')
export class SilkSleepCard extends LitElement {
  @property({ attribute: false }) public hass?: HomeAssistant;

  @state() private _config?: SilkSleepCardConfig;

  public static getStubConfig(hass: HomeAssistant): Partial<SilkSleepCardConfig> {
    const ids = Object.keys(hass.states).filter((id) => id.startsWith('sensor.'));
    const find = (...needles: string[]) =>
      ids.find((id) => needles.some((n) => id.toLowerCase().includes(n)));
    const duration =
      find('sleep_duration', 'sleep_time', 'time_asleep', 'sleep') ??
      ids.find((id) => Number.isFinite(Number(hass.states[id].state)));
    const config: Partial<SilkSleepCardConfig> = {
      type: 'custom:silk-sleep-card',
      duration,
    };
    const score = find('sleep_score', 'sleep_quality');
    const deep = find('deep_sleep', 'deep');
    const rem = find('rem_sleep', 'rem');
    if (score) config.score = score;
    if (deep) config.deep = deep;
    if (rem) config.rem = rem;
    return config;
  }

  public static async getConfigElement(): Promise<HTMLElement> {
    return document.createElement(EDITOR_TAG);
  }

  public setConfig(config: SilkSleepCardConfig): void {
    if (!config.duration || typeof config.duration !== 'string') {
      throw new Error('silk-sleep-card: `duration` is required (a sleep-duration entity)');
    }
    for (const key of ['score', 'deep', 'rem', 'awake', 'bedtime', 'wake'] as const) {
      const value = config[key];
      if (value !== undefined && (typeof value !== 'string' || value === '')) {
        throw new Error(`silk-sleep-card: \`${key}\` must be an entity id`);
      }
    }
    this._config = config;
  }

  public getCardSize(): number {
    return 2;
  }

  public getGridOptions(): Record<string, number> {
    return { columns: 6, rows: 2, min_columns: 4, min_rows: 2 };
  }

  private _locale(): string {
    return this.hass?.locale?.language ?? this.hass?.language ?? 'en';
  }

  private _obj(entityId?: string): HassEntity | undefined {
    return entityId ? this.hass?.states[entityId] : undefined;
  }

  /**
   * Stage split. Light sleep is what the night has left over once deep, REM
   * and awake are removed — the way every wearable derives it.
   */
  private _stages(total: number): Stage[] {
    const config = this._config!;
    const deep = toMinutes(this._obj(config.deep), 'minutes');
    const rem = toMinutes(this._obj(config.rem), 'minutes');
    const awake = toMinutes(this._obj(config.awake), 'minutes');
    if (deep === undefined && rem === undefined && awake === undefined) return [];
    const known = (deep ?? 0) + (rem ?? 0) + (awake ?? 0);
    const light = Math.max(total - known, 0);
    const minutes: Record<StageKey, number> = {
      deep: deep ?? 0,
      rem: rem ?? 0,
      light,
      awake: awake ?? 0,
    };
    // Honest denominator: never let the parts imply more night than there was.
    const denom = Math.max(total, known + light, 1);
    return STAGES.map((stage) => ({
      ...stage,
      minutes: minutes[stage.key],
      pct: (minutes[stage.key] / denom) * 100,
    })).filter((stage) => stage.pct >= MIN_PCT);
  }

  /** A clock time from a timestamp entity or a plain `HH:MM` state. */
  private _clock(entityId?: string): string | undefined {
    const stateObj = this._obj(entityId);
    if (!stateObj || isUnavailable(stateObj) || stateObj.state === '') return undefined;
    const raw = stateObj.state.trim();
    const hhmm = HHMM_RE.exec(raw);
    if (hhmm) {
      const h = Number(hhmm[1]);
      const m = Number(hhmm[2]);
      if (h < 24 && m < 60) {
        return new Intl.DateTimeFormat(this._locale(), {
          hour: '2-digit',
          minute: '2-digit',
        }).format(new Date(2000, 0, 1, h, m));
      }
    }
    const ms = Date.parse(raw);
    if (Number.isFinite(ms)) {
      return new Intl.DateTimeFormat(this._locale(), {
        hour: '2-digit',
        minute: '2-digit',
      }).format(new Date(ms));
    }
    return raw;
  }

  private _onCardClick(): void {
    if (this._config) moreInfo(this, this._config.duration);
  }

  protected render(): TemplateResult | typeof nothing {
    const config = this._config;
    const hass = this.hass;
    if (!config || !hass) return nothing;
    const durationObj = hass.states[config.duration];
    if (!durationObj) {
      return html`
        <ha-card class="control">
          <div class="warning">Entity not found: ${config.duration}</div>
        </ha-card>
      `;
    }

    const unavailable = isUnavailable(durationObj);
    const accent = accentFor(durationObj, config.color);
    const name = config.name ?? durationObj.attributes.friendly_name ?? config.duration;
    const total = toMinutes(durationObj, 'hours');
    const stages = total !== undefined ? this._stages(total) : [];
    const scoreObj = this._obj(config.score);
    const scoreNum = Number(scoreObj?.state);
    const score =
      scoreObj && !isUnavailable(scoreObj) && Number.isFinite(scoreNum)
        ? Math.round(scoreNum)
        : undefined;
    const bedtime = this._clock(config.bedtime);
    const wake = this._clock(config.wake);

    return html`
      <ha-card
        class="control ${unavailable ? 'unavailable' : ''}"
        style="--silk-accent:${accent}"
        @click=${this._onCardClick}
      >
        <div class="top">
          <div class="head">
            <div class="duration">${total !== undefined ? hm(total) : '—'}</div>
            <div class="name" title=${name}>${name}</div>
          </div>
          ${score !== undefined
            ? html`<span class="chip active" title="Sleep score ${score}">${score}</span>`
            : nothing}
        </div>

        <div class="bar" role="img" aria-label=${
          stages.length
            ? stages.map((s) => `${s.label} ${Math.round(s.minutes)} minutes`).join(', ')
            : 'Sleep duration'
        }>
          ${stages.length
            ? stages.map(
                (stage) => html`
                  <span
                    class="seg"
                    style="flex-grow:${stage.pct};background:${stage.color}"
                    title="${stage.label} · ${Math.round(stage.minutes)}m · ${Math.round(
                      stage.pct
                    )}%"
                  ></span>
                `
              )
            : html`<span
                class="seg"
                style="flex-grow:1;background:var(--silk-accent)"
                title=${total !== undefined ? `Asleep · ${hm(total)}` : 'No sleep data'}
              ></span>`}
        </div>

        <div class="foot">
          <div class="legend">
            ${stages.length
              ? stages.map(
                  (stage) => html`
                    <span class="litem">
                      <span class="dot" style="background:${stage.color}"></span>
                      <span class="llabel">${stage.label}</span>
                      <span class="lval">${Math.round(stage.minutes)}m</span>
                    </span>
                  `
                )
              : html`<span class="note">No stage breakdown</span>`}
          </div>
          ${bedtime || wake
            ? html`<div class="times">${bedtime ?? '—'} → ${wake ?? '—'}</div>`
            : nothing}
        </div>
      </ha-card>
    `;
  }

  static styles = [
    silkControlStyles,
    css`
      ha-card {
        flex-direction: column;
        align-items: stretch;
        justify-content: center;
        gap: 8px;
      }
      .top {
        display: flex;
        align-items: center;
        gap: 10px;
        min-width: 0;
      }
      .head {
        flex: 1;
        min-width: 0;
      }
      .duration {
        font-size: 24px;
        font-weight: 700;
        letter-spacing: -0.02em;
        line-height: 1.1;
        color: var(--primary-text-color);
        font-variant-numeric: tabular-nums;
        white-space: nowrap;
      }
      .name {
        font-size: 12px;
        font-weight: 400;
        color: var(--secondary-text-color);
      }
      .chip {
        flex: none;
        font-size: 12px;
        cursor: default;
      }
      .chip:hover {
        background: color-mix(in srgb, var(--silk-accent) 16%, transparent);
      }
      /* 2px flex gaps are the surface showing through between stages. */
      .bar {
        display: flex;
        gap: 2px;
        height: 10px;
        min-width: 0;
        animation: silk-sleep-in 250ms var(--silk-ease-out);
      }
      .seg {
        flex: 1 1 0;
        min-width: 2px;
        border-radius: 5px;
        transition: opacity 200ms ease;
      }
      .foot {
        display: flex;
        align-items: baseline;
        gap: 10px;
        min-width: 0;
      }
      .legend {
        flex: 1;
        display: flex;
        flex-wrap: wrap;
        align-items: baseline;
        gap: 2px 10px;
        min-width: 0;
        overflow: hidden;
      }
      .litem {
        display: inline-flex;
        align-items: baseline;
        gap: 4px;
        white-space: nowrap;
      }
      .dot {
        width: 6px;
        height: 6px;
        border-radius: 50%;
        transform: translateY(-1px);
      }
      .llabel {
        font-size: 11px;
        color: var(--secondary-text-color);
      }
      .lval {
        font-size: 11px;
        font-weight: 600;
        color: var(--primary-text-color);
        font-variant-numeric: tabular-nums;
      }
      .times {
        flex: none;
        font-size: 11px;
        color: var(--secondary-text-color);
        font-variant-numeric: tabular-nums;
        white-space: nowrap;
      }
      .note {
        font-size: 11px;
        color: var(--secondary-text-color);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .unavailable .bar,
      .unavailable .foot,
      .unavailable .top {
        opacity: 0.45;
      }
      @keyframes silk-sleep-in {
        from {
          opacity: 0;
        }
        to {
          opacity: 1;
        }
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    'silk-sleep-card': SilkSleepCard;
  }
}
