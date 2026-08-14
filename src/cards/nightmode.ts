import { LitElement, html, css, nothing, TemplateResult } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { HomeAssistant, HassEntity, LovelaceCardConfig } from '../types';
import { silkControlStyles } from '../shared/base';
import { isUnavailable, toggleEntity, moreInfo, haptic, stateText } from '../shared/service';
import { accentFor } from '../shared/color';
import { registerEditor } from '../shared/editor';

export const META = {
  type: 'silk-night-card',
  name: 'Silk Goodnight',
  description: 'One tap, house asleep.',
};

/** The four states a step can be asked to reach. */
export type NightDesired = 'off' | 'on' | 'locked' | 'closed';

export interface NightStep {
  name: string;
  entity: string;
  desired: NightDesired;
  /** `domain.service` to run instead of the per-domain toggle. */
  service?: string;
  /** Extra service data; may override the default `entity_id`. */
  data?: Record<string, unknown>;
}

export interface SilkNightCardConfig extends LovelaceCardConfig {
  /** The checklist, run top to bottom. */
  steps: NightStep[];
  name?: string;
  /** Accent override. */
  color?: string;
}

const DESIRED: readonly NightDesired[] = ['off', 'on', 'locked', 'closed'];
const SERVICE_RE = /^[a-z_0-9]+\.[a-z_0-9]+$/;
const ENTITY_RE = /^[a-z_0-9]+\.[a-zA-Z_0-9]+$/;
const MAX_STEPS = 12;
/** Breathing room between calls so a long routine doesn't arrive as one burst. */
const STEP_GAP_MS = 260;

const EDITOR_TAG = 'silk-night-card-editor';

// Steps are a YAML roster ({name, entity, desired, service, data}); the editor
// owns the card-level options only.
registerEditor(
  EDITOR_TAG,
  [
    { name: 'name', selector: { text: {} } },
    { name: 'color', selector: { ui_color: {} } },
    { name: 'steps', required: true, selector: { object: {} } },
  ],
  {
    name: '이름',
    color: '강조 색상',
    steps: '단계 목록 — {name, entity, desired: off|on|locked|closed, service, data}',
  },
  { name: 'Goodnight' }
);

/**
 * A step is satisfied when its entity literally reports the desired state.
 * Deliberately literal: a checklist that guesses is a checklist you stop
 * trusting at 11pm.
 */
function satisfied(stateObj: HassEntity | undefined, desired: NightDesired): boolean {
  return !!stateObj && stateObj.state === desired;
}

/** A step's live standing, resolved once per render. */
interface StepView {
  step: NightStep;
  stateObj?: HassEntity;
  done: boolean;
  /** No entity, or one that cannot speak right now — never counted as done. */
  unreachable: boolean;
}

/**
 * A goodnight routine that shows its work.
 *
 * Every step is a live row, not a promise: the check marks are read straight
 * from the entity states, so the list fills in as the house actually responds,
 * and a step someone already handled is skipped rather than re-run.
 */
@customElement('silk-night-card')
export class SilkNightCard extends LitElement {
  @property({ attribute: false }) public hass?: HomeAssistant;

  @state() private _config?: SilkNightCardConfig;
  @state() private _running = false;
  /** Set when a service call rejected — shown as one quiet inline note. */
  @state() private _failed = false;

  private _steps: NightStep[] = [];
  /** Bumped to abandon an in-flight run (reconfigure, detach). */
  private _runToken = 0;
  private _gapTimer?: number;
  private _gapResolve?: () => void;

  public static getStubConfig(hass: HomeAssistant): Partial<SilkNightCardConfig> {
    const pick = (prefix: string): string | undefined =>
      Object.keys(hass.states).find((id) => id.startsWith(prefix));
    const steps: NightStep[] = [];
    const light = pick('light.');
    if (light) steps.push({ name: 'Lights out', entity: light, desired: 'off' });
    const lock = pick('lock.');
    if (lock) steps.push({ name: 'Front door', entity: lock, desired: 'locked' });
    const cover = pick('cover.');
    if (cover) steps.push({ name: 'Blinds', entity: cover, desired: 'closed' });
    if (!steps.length) {
      const sw = pick('switch.');
      if (sw) steps.push({ name: 'Switch off', entity: sw, desired: 'off' });
    }
    return { type: 'custom:silk-night-card', steps };
  }

  public static async getConfigElement(): Promise<HTMLElement> {
    return document.createElement(EDITOR_TAG);
  }

  public setConfig(config: SilkNightCardConfig): void {
    if (!Array.isArray(config.steps) || config.steps.length === 0) {
      throw new Error('silk-night-card: `steps` must be a non-empty list');
    }
    for (const step of config.steps) {
      if (!step || typeof step.name !== 'string' || !step.name) {
        throw new Error('silk-night-card: every step needs a `name`');
      }
      if (typeof step.entity !== 'string' || !ENTITY_RE.test(step.entity)) {
        throw new Error(`silk-night-card: "${step.name}" needs a valid \`entity\``);
      }
      if (!DESIRED.includes(step.desired)) {
        throw new Error(
          `silk-night-card: "${step.name}" \`desired\` must be one of ${DESIRED.join(', ')}`
        );
      }
      if (step.service !== undefined && !SERVICE_RE.test(String(step.service))) {
        throw new Error(`silk-night-card: "${step.name}" \`service\` must be 'domain.service'`);
      }
      if (step.data !== undefined && (typeof step.data !== 'object' || Array.isArray(step.data))) {
        throw new Error(`silk-night-card: "${step.name}" \`data\` must be a mapping`);
      }
    }
    this._steps = config.steps.slice(0, MAX_STEPS);
    this._config = config;
    this._runToken++; // a reconfigure abandons any run against the old list
    this._running = false;
    this._failed = false;
  }

  public getCardSize(): number {
    return 3;
  }

  public getGridOptions(): Record<string, number> {
    return { columns: 6, rows: 3, min_columns: 4, min_rows: 2 };
  }

  public disconnectedCallback(): void {
    super.disconnectedCallback();
    this._runToken++;
    window.clearTimeout(this._gapTimer);
    this._gapTimer = undefined;
    // Release the pending gap so the run loop unwinds instead of hanging.
    this._gapResolve?.();
    this._gapResolve = undefined;
    // The abandoned loop can no longer clear this itself (its token is stale),
    // so a card that gets re-attached comes back armed, not stuck on "Running…".
    this._running = false;
  }

  private _views(): StepView[] {
    const hass = this.hass;
    return this._steps.map((step) => {
      const stateObj = hass?.states[step.entity];
      const unreachable = !stateObj || isUnavailable(stateObj);
      return { step, stateObj, done: satisfied(stateObj, step.desired), unreachable };
    });
  }

  private _gap(ms: number): Promise<void> {
    return new Promise<void>((resolve) => {
      this._gapResolve = resolve;
      this._gapTimer = window.setTimeout(() => {
        this._gapResolve = undefined;
        resolve();
      }, ms);
    });
  }

  /** Fire one step: its own service when given, else the per-domain toggle. */
  private async _perform(step: NightStep): Promise<void> {
    const hass = this.hass;
    if (!hass) return;
    if (step.service) {
      const [domain, service] = step.service.split('.');
      await hass.callService(domain, service, { entity_id: step.entity, ...(step.data ?? {}) });
      return;
    }
    // toggleEntity mirrors HA's own toggle, which lands on exactly the desired
    // state for every value `desired` can take (off/on/locked/closed).
    await toggleEntity(hass, step.entity);
  }

  private async _onRun(ev: Event): Promise<void> {
    ev.stopPropagation();
    if (this._running || !this.hass) return;
    const token = ++this._runToken;
    this._running = true;
    this._failed = false;
    haptic(this, 'medium');
    try {
      for (const step of this._steps) {
        if (token !== this._runToken) return;
        // Re-read the state each time: earlier steps (and other people) move
        // the house while the run is in flight.
        const stateObj = this.hass?.states[step.entity];
        if (!stateObj || isUnavailable(stateObj)) continue;
        if (satisfied(stateObj, step.desired)) continue;
        try {
          await this._perform(step);
        } catch (err) {
          console.warn('silk-night-card: step failed', step.entity, err);
          this._failed = true;
        }
        if (token !== this._runToken) return;
        await this._gap(STEP_GAP_MS);
      }
    } finally {
      if (token === this._runToken) this._running = false;
    }
  }

  private _onRow(ev: Event, entityId: string): void {
    ev.stopPropagation();
    moreInfo(this, entityId);
  }

  protected render(): TemplateResult | typeof nothing {
    const config = this._config;
    if (!config) return nothing;
    const hass = this.hass;

    const views = this._views();
    const actionable = views.filter((v) => !v.unreachable);
    const doneCount = views.filter((v) => v.done).length;
    const missing = views.length - actionable.length;
    const allSet = actionable.length > 0 && actionable.every((v) => v.done);
    const nothingToDo = actionable.length === 0;
    const accent = accentFor(undefined, config.color);
    const name = config.name ?? 'Goodnight';
    const progress = views.length ? (doneCount / views.length) * 100 : 0;
    const label = this._running ? 'Running…' : allSet ? 'All set' : 'Goodnight';

    return html`
      <ha-card class="control" style="--silk-accent:${accent}">
        <div class="header">
          <ha-icon
            class="crest ${allSet ? 'set' : ''}"
            .icon=${allSet ? 'mdi:weather-night' : 'mdi:home-clock'}
          ></ha-icon>
          <div class="hname">${name}</div>
          <span class="count">
            ${doneCount} of ${views.length} done${missing
              ? html`<span class="sep">·</span>${missing} unavailable`
              : nothing}
          </span>
        </div>

        <div class="steps">
          ${views.map(
            (view) => html`
              <button
                class="step ${view.unreachable ? 'off' : ''}"
                title=${view.step.entity}
                aria-label=${`${view.step.name}: ${view.done ? 'done' : 'pending'}`}
                @click=${(ev: Event) => this._onRow(ev, view.step.entity)}
              >
                <ha-icon
                  class="mark ${view.done ? 'done' : ''}"
                  .icon=${view.done ? 'mdi:check-circle' : 'mdi:circle-outline'}
                ></ha-icon>
                <span class="sname">${view.step.name}</span>
                <span class="sstate">
                  ${view.stateObj
                    ? view.unreachable
                      ? 'unavailable'
                      : stateText(hass, view.stateObj)
                    : 'not found'}
                </span>
              </button>
            `
          )}
        </div>

        ${this._failed
          ? html`<div class="note">Some steps didn’t respond</div>`
          : nothing}

        <div class="run">
          <button
            class="go"
            ?disabled=${allSet || nothingToDo || this._running}
            aria-busy=${this._running ? 'true' : 'false'}
            @click=${this._onRun}
          >
            ${label}
          </button>
          <div class="track" aria-hidden="true">
            <div class="bar" style="width:${progress.toFixed(1)}%"></div>
          </div>
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
        justify-content: flex-start;
        gap: 10px;
        padding: 12px 14px;
        cursor: default;
      }
      .header {
        flex: none;
        display: flex;
        align-items: center;
        gap: 8px;
        min-height: 22px;
      }
      .crest {
        flex: none;
        --mdc-icon-size: 18px;
        color: var(--secondary-text-color);
        transition: color 200ms ease;
      }
      .crest.set {
        color: var(--silk-accent);
      }
      .hname {
        flex: 1 1 auto;
        min-width: 0;
        font-size: 13px;
        font-weight: 600;
        line-height: 1.3;
        color: var(--secondary-text-color);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .count {
        flex: none;
        max-width: 55%;
        font-size: 12px;
        line-height: 1.3;
        color: var(--secondary-text-color);
        font-variant-numeric: tabular-nums;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .count .sep {
        opacity: 0.5;
        margin: 0 3px;
      }
      .steps {
        flex: 1;
        display: flex;
        flex-direction: column;
        gap: 2px;
        min-height: 0;
        margin: 0 -6px;
        overflow: hidden;
      }
      .step {
        display: flex;
        align-items: center;
        gap: 10px;
        width: 100%;
        min-height: 30px;
        margin: 0;
        padding: 3px 6px;
        border: none;
        border-radius: 10px;
        background: none;
        font: inherit;
        color: inherit;
        text-align: left;
        cursor: pointer;
        outline: none;
        transition: background 150ms ease-out;
      }
      .step:hover {
        background: rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.05);
      }
      .step:focus-visible {
        box-shadow: inset 0 0 0 2px color-mix(in srgb, var(--silk-accent) 70%, transparent);
      }
      .step.off {
        opacity: 0.45;
      }
      .mark {
        flex: none;
        --mdc-icon-size: 18px;
        color: rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.35);
        transition: color 200ms ease;
      }
      /* Genuine status semantics: the step is verified done. */
      .mark.done {
        color: var(--success-color, #43a047);
      }
      .sname {
        flex: 1 1 auto;
        min-width: 0;
        font-size: 13px;
        font-weight: 500;
        line-height: 1.3;
        color: var(--primary-text-color);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .sstate {
        flex: none;
        max-width: 40%;
        font-size: 11.5px;
        line-height: 1.3;
        color: var(--secondary-text-color);
        font-variant-numeric: tabular-nums;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .note {
        flex: none;
        font-size: 11.5px;
        line-height: 1.3;
        color: var(--secondary-text-color);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .run {
        flex: none;
      }
      .go {
        display: block;
        width: 100%;
        min-height: 44px;
        border: none;
        border-radius: 14px;
        font: inherit;
        font-size: 15px;
        font-weight: 600;
        letter-spacing: -0.01em;
        cursor: pointer;
        color: var(--silk-accent);
        background: color-mix(in srgb, var(--silk-accent) 16%, transparent);
        transition:
          transform 250ms var(--silk-spring),
          background 200ms ease,
          color 200ms ease;
      }
      .go:active:not(:disabled) {
        transform: scale(0.97);
        transition-duration: 120ms;
        transition-timing-function: var(--silk-ease-out);
      }
      .go:focus-visible {
        outline: 2px solid color-mix(in srgb, var(--silk-accent) 70%, transparent);
        outline-offset: 2px;
      }
      .go:disabled {
        cursor: default;
        color: var(--secondary-text-color);
        background: rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.06);
      }
      .track {
        height: 2px;
        margin: 6px 2px 0;
        border-radius: 1px;
        background: rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.08);
        overflow: hidden;
      }
      .bar {
        height: 100%;
        border-radius: 1px;
        background: var(--silk-accent);
        transition: width 300ms var(--silk-ease-out);
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    'silk-night-card': SilkNightCard;
  }
}
