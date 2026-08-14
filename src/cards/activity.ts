import { LitElement, html, css, nothing, TemplateResult } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { HomeAssistant, LovelaceCardConfig } from '../types';
import { silkControlStyles } from '../shared/base';
import { isActive, isUnavailable, haptic, clamp } from '../shared/service';
import { accentFor } from '../shared/color';
import { registerEditor } from '../shared/editor';

export const META = {
  type: 'silk-activity-card',
  name: 'Silk Activity',
  description: 'One tap sets the whole scene.',
};

/** One step of an activity: a service call, then an optional pause. */
export interface SilkActivityStep {
  /** `domain.service`, e.g. `light.turn_on`. */
  service: string;
  /** Service data, passed through as authored (targets stay the user's call). */
  data?: Record<string, unknown>;
  /** Seconds to wait after the call before the next step. */
  delay?: number;
}

export interface SilkActivity {
  name: string;
  icon: string;
  steps: SilkActivityStep[];
  /** Optional entity whose active state marks the activity as running/on. */
  state_entity?: string;
}

export interface SilkActivityCardConfig extends LovelaceCardConfig {
  /** YAML-only: 1–12 activities. */
  activities: SilkActivity[];
  name?: string;
}

const MIN_ACTIVITIES = 1;
const MAX_ACTIVITIES = 12;
const MAX_DELAY_S = 3600;
const SERVICE_RE = /^[a-z_]+\.[a-z0-9_]+$/;
/** How long the finished progress line rests before it clears. */
const FINISH_HOLD_MS = 350;
/** How long an inline failure note stays up. */
const NOTE_TTL_MS = 5000;

const EDITOR_TAG = 'silk-activity-card-editor';

// `activities` is a list of nested objects (name + icon + a service-call list),
// which ha-form cannot author — a row editor is the only way to reach it, so
// the macros stay YAML and the editor covers the scalar options.
registerEditor(EDITOR_TAG, [{ name: 'name', selector: { text: {} } }], { name: '이름' });

/**
 * Activity macros: each tile runs its steps in order, awaiting every service
 * call and honouring the delays between them. A run paints a 2px accent line
 * along the bottom of its own tile — real progress, so the motion is earned —
 * and a second tap aborts whatever is left.
 */
@customElement('silk-activity-card')
export class SilkActivityCard extends LitElement {
  @property({ attribute: false }) public hass?: HomeAssistant;

  @state() private _config?: SilkActivityCardConfig;

  /** index → 0–1 progress. Presence of the key means "this one is running". */
  @state() private _progress: Record<number, number> = {};

  /** Inline note for a step that failed; cleared on a timer. */
  @state() private _note?: string;

  /** index → monotonic run token; bumping it aborts the run in flight. */
  private _tokens: Record<number, number> = {};
  /** index → resolver that ends the current delay early (on cancel). */
  private _wakers: Record<number, () => void> = {};
  private _finishTimers: Record<number, number> = {};
  private _noteTimer?: number;

  public static getStubConfig(hass: HomeAssistant): Partial<SilkActivityCardConfig> {
    const pick = (prefix: string): string | undefined =>
      Object.keys(hass.states).find((id) => id.startsWith(prefix));
    const scene = pick('scene.');
    const light = pick('light.');
    const steps: SilkActivityStep[] = scene
      ? [{ service: 'scene.turn_on', data: { entity_id: scene } }]
      : light
        ? [{ service: 'light.turn_on', data: { entity_id: light, brightness_pct: 30 } }]
        : [{ service: 'homeassistant.turn_off', data: { entity_id: 'light.living_room' } }];
    return {
      type: 'custom:silk-activity-card',
      activities: [{ name: 'Movie night', icon: 'mdi:movie-open', steps }],
    };
  }

  public static async getConfigElement(): Promise<HTMLElement> {
    return document.createElement(EDITOR_TAG);
  }

  public setConfig(config: SilkActivityCardConfig): void {
    if (!Array.isArray(config.activities)) {
      throw new Error(
        'silk-activity-card: `activities` is required — a list of {name, icon, steps}'
      );
    }
    if (config.activities.length < MIN_ACTIVITIES || config.activities.length > MAX_ACTIVITIES) {
      throw new Error(
        `silk-activity-card: list between ${MIN_ACTIVITIES} and ${MAX_ACTIVITIES} \`activities\` (got ${config.activities.length})`
      );
    }
    config.activities.forEach((activity, i) => {
      const at = `silk-activity-card: activities[${i}]`;
      if (!activity || typeof activity !== 'object') {
        throw new Error(`${at} must be {name, icon, steps}`);
      }
      if (typeof activity.name !== 'string' || activity.name.trim() === '') {
        throw new Error(`${at} needs a \`name\``);
      }
      if (typeof activity.icon !== 'string' || activity.icon.trim() === '') {
        throw new Error(`${at} needs an \`icon\` like \`mdi:movie-open\``);
      }
      if (!Array.isArray(activity.steps) || activity.steps.length === 0) {
        throw new Error(`${at} needs at least one step of {service, data?, delay?}`);
      }
      if (activity.state_entity !== undefined && typeof activity.state_entity !== 'string') {
        throw new Error(`${at} \`state_entity\` must be an entity id`);
      }
      activity.steps.forEach((step, s) => {
        const stepAt = `${at}.steps[${s}]`;
        if (!step || typeof step !== 'object' || !SERVICE_RE.test(String(step.service))) {
          throw new Error(`${stepAt} needs a \`service\` like \`light.turn_on\``);
        }
        if (step.data !== undefined && (typeof step.data !== 'object' || Array.isArray(step.data))) {
          throw new Error(`${stepAt} \`data\` must be a mapping of service fields`);
        }
        if (
          step.delay !== undefined &&
          (!Number.isFinite(Number(step.delay)) ||
            Number(step.delay) < 0 ||
            Number(step.delay) > MAX_DELAY_S)
        ) {
          throw new Error(`${stepAt} \`delay\` must be 0–${MAX_DELAY_S} seconds`);
        }
      });
    });
    this._cancelAll();
    this._config = config;
  }

  public getCardSize(): number {
    return 3;
  }

  public getGridOptions(): Record<string, number> {
    return { columns: 6, rows: 3, min_columns: 3, min_rows: 2 };
  }

  public disconnectedCallback(): void {
    super.disconnectedCallback();
    this._cancelAll();
    window.clearTimeout(this._noteTimer);
    this._noteTimer = undefined;
  }

  /** Abort every run in flight and drop every timer. */
  private _cancelAll(): void {
    for (const key of Object.keys(this._tokens)) this._cancel(Number(key));
    for (const timer of Object.values(this._finishTimers)) window.clearTimeout(timer);
    this._finishTimers = {};
    this._progress = {};
  }

  /** Bump the token (the loop notices), then wake any sleeping delay at once. */
  private _cancel(index: number): void {
    this._tokens[index] = (this._tokens[index] ?? 0) + 1;
    window.clearTimeout(this._finishTimers[index]);
    delete this._finishTimers[index];
    const wake = this._wakers[index];
    delete this._wakers[index];
    wake?.();
    this._clearProgress(index);
  }

  private _setProgress(index: number, value: number): void {
    this._progress = { ...this._progress, [index]: clamp(value, 0, 1) };
  }

  private _clearProgress(index: number): void {
    if (!(index in this._progress)) return;
    const next = { ...this._progress };
    delete next[index];
    this._progress = next;
  }

  private _showNote(text: string): void {
    this._note = text;
    window.clearTimeout(this._noteTimer);
    this._noteTimer = window.setTimeout(() => {
      this._noteTimer = undefined;
      this._note = undefined;
    }, NOTE_TTL_MS);
  }

  /** A cancellable pause: the resolver is parked where _cancel can reach it. */
  private _sleep(index: number, ms: number): Promise<void> {
    return new Promise<void>((resolve) => {
      const timer = window.setTimeout(() => {
        delete this._wakers[index];
        resolve();
      }, ms);
      this._wakers[index] = () => {
        window.clearTimeout(timer);
        resolve();
      };
    });
  }

  private _onTileClick(ev: Event, index: number): void {
    ev.stopPropagation();
    if (index in this._progress) {
      // The tile is busy: a second tap is Cancel, never a second run.
      haptic(this, 'warning');
      this._cancel(index);
      return;
    }
    haptic(this);
    void this._run(index);
  }

  private async _run(index: number): Promise<void> {
    const hass = this.hass;
    const activity = this._config?.activities[index];
    if (!hass || !activity) return;
    const token = (this._tokens[index] = (this._tokens[index] ?? 0) + 1);
    const live = (): boolean => this._tokens[index] === token && this.isConnected;
    const steps = activity.steps;
    this._setProgress(index, 0);

    for (let i = 0; i < steps.length; i++) {
      if (!live()) return;
      const step = steps[i];
      const [domain, service] = step.service.split('.');
      try {
        await hass.callService(domain, service, step.data ? { ...step.data } : undefined);
      } catch (err) {
        console.warn('silk-activity-card: step failed', step.service, err);
        if (live()) {
          this._showNote(`${activity.name} stopped at ${step.service}`);
          this._cancel(index);
        }
        return;
      }
      if (!live()) return;
      this._setProgress(index, (i + 1) / steps.length);
      // A delay is honoured after its own step, including the last one: the
      // activity is not finished until the pause the author asked for is over.
      const delay = Number(step.delay ?? 0);
      if (delay > 0) {
        await this._sleep(index, delay * 1000);
        if (!live()) return;
      }
    }

    haptic(this, 'success');
    // Let the full line rest a beat so the completion is actually seen.
    this._finishTimers[index] = window.setTimeout(() => {
      delete this._finishTimers[index];
      if (this._tokens[index] === token) this._clearProgress(index);
    }, FINISH_HOLD_MS);
  }

  private _renderActivity(activity: SilkActivity, index: number): TemplateResult {
    const hass = this.hass;
    const stateObj = activity.state_entity ? hass?.states[activity.state_entity] : undefined;
    // The indicator being offline says nothing about the steps, which may not
    // touch it at all: the glyph dims to admit it cannot report, the macro
    // still runs.
    const unavailable = Boolean(activity.state_entity) && isUnavailable(stateObj);
    const active = !unavailable && isActive(stateObj);
    const progress = this._progress[index];
    const running = progress !== undefined;
    const label = running ? `Cancel ${activity.name}` : activity.name;

    return html`
      <button
        class="tile ${active ? 'active' : ''} ${running ? 'running' : ''} ${unavailable
          ? 'gone'
          : ''}"
        aria-label=${label}
        aria-busy=${running ? 'true' : 'false'}
        title=${label}
        @click=${(ev: Event) => this._onTileClick(ev, index)}
      >
        <span class="glyph"><ha-icon .icon=${activity.icon}></ha-icon></span>
        <span class="aname">${activity.name}</span>
        <span class="run" style="transform:scaleX(${running ? progress : 0})"></span>
      </button>
    `;
  }

  protected render(): TemplateResult | typeof nothing {
    const config = this._config;
    if (!config) return nothing;
    // No single entity backs this card, so there is nothing to open on a body
    // tap — the tiles are the whole interface.
    return html`
      <ha-card class="control" style="--silk-accent:${accentFor(undefined)}">
        ${config.name ? html`<div class="title">${config.name}</div>` : nothing}
        <div class="grid">
          ${config.activities.map((activity, index) => this._renderActivity(activity, index))}
        </div>
        ${this._note ? html`<div class="note">${this._note}</div>` : nothing}
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
        cursor: default;
      }
      .title {
        flex: none;
        font-size: 14px;
        font-weight: 500;
        line-height: 1.3;
        color: var(--primary-text-color);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .grid {
        flex: 1 1 auto;
        min-height: 0;
        overflow-y: auto;
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(72px, 1fr));
        align-content: start;
        gap: 8px;
      }
      .tile {
        position: relative;
        overflow: hidden;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 5px;
        height: 72px;
        box-sizing: border-box;
        padding: 6px 5px;
        border: none;
        border-radius: 14px;
        cursor: pointer;
        min-width: 0;
        font: inherit;
        color: var(--secondary-text-color);
        background: rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.06);
        transition:
          transform 250ms var(--silk-spring),
          background 200ms ease,
          color 200ms ease;
      }
      .tile:hover {
        background: rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.1);
      }
      .tile:active {
        transform: scale(0.94);
        transition-duration: 120ms;
        transition-timing-function: var(--silk-ease-out);
      }
      .tile:focus-visible {
        outline: 2px solid color-mix(in srgb, var(--silk-accent) 70%, transparent);
        outline-offset: 2px;
      }
      /* Active (per state_entity) reads as surface; running only tints the glyph
         so the two states never look like the same thing. */
      .tile.active {
        color: var(--silk-accent);
        background: color-mix(in srgb, var(--silk-accent) 20%, transparent);
      }
      .tile.active .aname {
        color: var(--silk-accent);
      }
      .tile.running {
        color: var(--silk-accent);
      }
      .tile.gone .glyph {
        opacity: 0.45;
      }
      .glyph {
        flex: none;
        --mdc-icon-size: 24px;
        width: 28px;
        height: 28px;
        display: grid;
        place-items: center;
        pointer-events: none;
      }
      .aname {
        max-width: 100%;
        font-size: 10px;
        font-weight: 500;
        line-height: 1.2;
        color: var(--primary-text-color);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        transition: color 200ms ease;
      }
      /* Real progress along the tile's own edge: transform only, no repaint. */
      .run {
        position: absolute;
        left: 0;
        right: 0;
        bottom: 0;
        height: 2px;
        background: var(--silk-accent);
        transform-origin: left center;
        transform: scaleX(0);
        opacity: 0;
        pointer-events: none;
        transition:
          transform 250ms var(--silk-ease-out),
          opacity 200ms ease;
      }
      .tile.running .run {
        opacity: 1;
      }
      .note {
        flex: none;
        font-size: 12px;
        line-height: 1.3;
        color: var(--secondary-text-color);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    'silk-activity-card': SilkActivityCard;
  }
}
