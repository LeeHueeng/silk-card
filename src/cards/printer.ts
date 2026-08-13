import { LitElement, html, css, nothing, PropertyValues, TemplateResult } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { HomeAssistant, HassEntity, LovelaceCardConfig } from '../types';
import { silkControlStyles } from '../shared/base';
import { domainOf, isUnavailable, moreInfo, haptic, stateText, clamp } from '../shared/service';
import { accentFor } from '../shared/color';
import { registerEditor } from '../shared/editor';

export const META = {
  type: 'silk-printer-card',
  name: 'Silk Printer',
  description: 'Your 3D print, start to finish.',
};

export interface SilkPrinterCardConfig extends LovelaceCardConfig {
  name?: string;
  /** Print state (sensor/binary_sensor): printing / paused / finish / idle. */
  status?: string;
  /** Job completion, 0–100 (%). */
  progress?: string;
  /** Time remaining; its unit decides the format. */
  remaining?: string;
  nozzle?: string;
  nozzle_target?: string;
  bed?: string;
  bed_target?: string;
  /** `camera.*` — a 16:9 snapshot strip above the rows. */
  camera?: string;
  /** Button entity that pauses/resumes the job. */
  pause?: string;
  /** Button entity that cancels the job (confirmed before pressing). */
  stop?: string;
  icon?: string;
  /** Accent override (YAML). */
  color?: string;
}

const DEFAULT_NAME = '3D Printer';
const DEFAULT_ICON = 'mdi:printer-3d-nozzle';
/** Snapshot cadence — matches silk-camera-card's default. */
const SNAPSHOT_REFRESH_MS = 10_000;
const OPTIMISTIC_TIMEOUT_MS = 2000;
/** A heater within this many degrees of its target reads as settled, not heating. */
const HEATING_DELTA = 3;

/** Print states that mean "no job on the bed" — the bottom bar stays hidden. */
const IDLE_STATES = new Set([
  'idle',
  'standby',
  'off',
  'ready',
  'none',
  'unknown',
  'unavailable',
  'operational',
  '',
]);

/** Print states that read as actively printing (icon container fills). */
const PRINTING_STATES = new Set(['printing', 'running', 'busy', 'print', 'working', 'on']);

const HOUR_UNITS = new Set(['h', 'hr', 'hrs', 'hour', 'hours']);
const MINUTE_UNITS = new Set(['min', 'mins', 'minute', 'minutes']);
const SECOND_UNITS = new Set(['s', 'sec', 'secs', 'second', 'seconds']);

function hoursMinutes(totalMinutes: number): string {
  const t = Math.max(0, Math.round(totalMinutes));
  const h = Math.floor(t / 60);
  const m = t % 60;
  return h > 0 ? `${h}h ${m}m left` : `${m}m left`;
}

/** '4h 59m left' / '59m left' / '4:32 left', by the sensor's unit; unit-suffix fallback. */
function formatRemaining(value: number, unit: string): string {
  const u = unit.trim().toLowerCase();
  if (HOUR_UNITS.has(u)) return hoursMinutes(value * 60);
  if (MINUTE_UNITS.has(u)) return hoursMinutes(value);
  if (SECOND_UNITS.has(u)) {
    const s = Math.max(0, Math.round(value));
    return s >= 3600
      ? hoursMinutes(s / 60)
      : `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')} left`;
  }
  const n = Math.round(value * 10) / 10;
  return unit ? `${n} ${unit} left` : `${n} left`;
}

/** Minutes from an 'H:MM:SS' state — some integrations report the ETA that way. */
function parseClock(text: string): number | null {
  const m = /^(\d+):([0-5]\d):([0-5]\d)$/.exec(text.trim());
  if (!m) return null;
  return (Number(m[1]) * 3600 + Number(m[2]) * 60 + Number(m[3])) / 60;
}

/** Numeric state, NaN when the entity is missing/unavailable/non-numeric. */
function numericState(stateObj?: HassEntity): number {
  if (!stateObj || isUnavailable(stateObj) || stateObj.state === '') return NaN;
  return Number(stateObj.state);
}

const capitalize = (text: string): string =>
  text.length ? text.charAt(0).toUpperCase() + text.slice(1) : text;

/** Normalized state token — 'Print Paused' and 'print_paused' compare equal. */
const normalize = (text: string): string => text.toLowerCase().replace(/[\s-]+/g, '_');

/** A heater pair; `target` is NaN when no target entity is configured. */
interface Reading {
  current: number;
  target: number;
}

const EDITOR_TAG = 'silk-printer-card-editor';

registerEditor(
  EDITOR_TAG,
  [
    { name: 'name', selector: { text: {} } },
    { name: 'status', selector: { entity: { domain: ['sensor', 'binary_sensor'] } } },
    {
      name: '',
      type: 'grid',
      schema: [
        { name: 'progress', selector: { entity: { domain: ['sensor', 'number'] } } },
        { name: 'remaining', selector: { entity: { domain: ['sensor'] } } },
        { name: 'nozzle', selector: { entity: { domain: ['sensor', 'number'] } } },
        { name: 'nozzle_target', selector: { entity: { domain: ['sensor', 'number'] } } },
        { name: 'bed', selector: { entity: { domain: ['sensor', 'number'] } } },
        { name: 'bed_target', selector: { entity: { domain: ['sensor', 'number'] } } },
      ],
    },
    { name: 'camera', selector: { entity: { domain: ['camera'] } } },
    {
      name: '',
      type: 'grid',
      schema: [
        { name: 'pause', selector: { entity: { domain: ['button', 'input_button'] } } },
        { name: 'stop', selector: { entity: { domain: ['button', 'input_button'] } } },
      ],
    },
    { name: 'icon', selector: { icon: {} } },
  ],
  {
    name: 'Name',
    status: 'Print state',
    progress: 'Progress (%)',
    remaining: 'Time remaining',
    nozzle: 'Nozzle temperature',
    nozzle_target: 'Nozzle target',
    bed: 'Bed temperature',
    bed_target: 'Bed target',
    camera: 'Camera',
    pause: 'Pause button',
    stop: 'Stop button',
    icon: 'Icon',
  },
  { name: DEFAULT_NAME }
);

/**
 * The whole print at a glance: an optional live snapshot, what the printer is
 * doing and how long it has left, both heaters with their targets, and the two
 * buttons that interrupt a job. A 4px accent bar rides the card's bottom edge
 * for as long as there is a job on the bed.
 */
@customElement('silk-printer-card')
export class SilkPrinterCard extends LitElement {
  @property({ attribute: false }) public hass?: HomeAssistant;

  @state() private _config?: SilkPrinterCardConfig;

  /** Cache-busting counter appended to the snapshot URL each refresh tick. */
  @state() private _counter = 0;

  /** True after the current snapshot URL failed to load; retried on the next tick. */
  @state() private _broken = false;

  /** Optimistic state line after a control press ('Pausing…' / 'Stopping…'). */
  @state() private _pending: string | null = null;

  /** Status `last_updated` at press time; any newer stamp clears the override. */
  private _pendingBase = '';
  private _pendingTimer?: number;
  private _snapshotTimer?: number;

  /** Paused while the tab is hidden; refreshed immediately on return. */
  private readonly _onVisibility = (): void => {
    if (document.hidden) {
      this._stopSnapshots();
    } else {
      this._bump();
      this._startSnapshots();
    }
  };

  public static getStubConfig(hass: HomeAssistant): Partial<SilkPrinterCardConfig> {
    const ids = Object.keys(hass.states);
    const progress = ids.find(
      (id) =>
        id.startsWith('sensor.') &&
        /print|job/.test(id) &&
        hass.states[id].attributes.unit_of_measurement === '%'
    );
    const status = ids.find(
      (id) => id.startsWith('sensor.') && /print.*(state|status|stage)/.test(id)
    );
    const camera = ids.find((id) => id.startsWith('camera.') && /print|chamber/.test(id));
    return { type: 'custom:silk-printer-card', name: DEFAULT_NAME, status, progress, camera };
  }

  public static async getConfigElement(): Promise<HTMLElement> {
    return document.createElement(EDITOR_TAG);
  }

  public setConfig(config: SilkPrinterCardConfig): void {
    if (
      !config.status &&
      !config.progress &&
      !config.remaining &&
      !config.nozzle &&
      !config.bed &&
      !config.camera
    ) {
      throw new Error(
        'silk-printer-card: configure at least one of `status`, `progress`, `remaining`, `nozzle`, `bed` or `camera`'
      );
    }
    if (config.camera !== undefined && domainOf(config.camera) !== 'camera') {
      throw new Error('silk-printer-card: `camera` must be a camera entity (e.g. camera.printer)');
    }
    this._config = config;
    this._broken = false;
    this._clearPending();
    if (this.isConnected) this._startSnapshots();
  }

  public getCardSize(): number {
    return 3;
  }

  public getGridOptions(): Record<string, number> {
    return { columns: 6, rows: 3, min_columns: 4, min_rows: 2 };
  }

  public connectedCallback(): void {
    super.connectedCallback();
    document.addEventListener('visibilitychange', this._onVisibility);
    this._startSnapshots();
  }

  public disconnectedCallback(): void {
    super.disconnectedCallback();
    document.removeEventListener('visibilitychange', this._onVisibility);
    this._stopSnapshots();
    window.clearTimeout(this._pendingTimer);
    this._pendingTimer = undefined;
  }

  protected willUpdate(changed: PropertyValues): void {
    if (!changed.has('hass') || this._pending === null || !this._config?.status) return;
    const stateObj = this.hass?.states[this._config.status];
    // The printer answered: the optimistic line has done its job.
    if (stateObj && stateObj.last_updated !== this._pendingBase) this._clearPending();
  }

  private _bump(): void {
    this._counter++;
    this._broken = false;
  }

  private _startSnapshots(): void {
    this._stopSnapshots();
    if (!this._config?.camera || document.hidden) return; // the visibility listener resumes us
    this._snapshotTimer = window.setInterval(() => this._bump(), SNAPSHOT_REFRESH_MS);
  }

  private _stopSnapshots(): void {
    window.clearInterval(this._snapshotTimer);
    this._snapshotTimer = undefined;
  }

  private _clearPending(): void {
    window.clearTimeout(this._pendingTimer);
    this._pendingTimer = undefined;
    this._pending = null;
  }

  /** Every entity this card was given — used for the unavailable verdict. */
  private _tracked(): string[] {
    const c = this._config;
    if (!c) return [];
    return [
      c.status,
      c.progress,
      c.remaining,
      c.nozzle,
      c.nozzle_target,
      c.bed,
      c.bed_target,
      c.camera,
    ].filter((id): id is string => typeof id === 'string' && id !== '');
  }

  /** Card taps land on the headline number, then the print state, then whatever exists. */
  private _primaryEntity(): string | undefined {
    const c = this._config;
    if (!c) return undefined;
    return c.progress ?? c.status ?? c.remaining ?? c.camera ?? c.nozzle ?? c.bed;
  }

  private _remainingText(): string | undefined {
    const id = this._config?.remaining;
    if (!id || !this.hass) return undefined;
    const stateObj = this.hass.states[id];
    if (!stateObj || isUnavailable(stateObj) || stateObj.state === '') return undefined;
    const value = Number(stateObj.state);
    if (Number.isFinite(value)) {
      return formatRemaining(value, String(stateObj.attributes.unit_of_measurement ?? ''));
    }
    const minutes = parseClock(stateObj.state);
    return minutes === null ? undefined : hoursMinutes(minutes);
  }

  private _reading(currentId?: string, targetId?: string): Reading | null {
    const hass = this.hass;
    if (!hass || !currentId) return null;
    const current = numericState(hass.states[currentId]);
    if (!Number.isFinite(current)) return null;
    return { current, target: targetId ? numericState(hass.states[targetId]) : NaN };
  }

  private _onCardClick(): void {
    const entity = this._primaryEntity();
    if (entity) moreInfo(this, entity);
  }

  private _onCameraClick(ev: Event): void {
    ev.stopPropagation();
    if (this._config?.camera) moreInfo(this, this._config.camera);
  }

  private _onSnapshotError(): void {
    this._broken = true;
  }

  private _onPauseClick(ev: Event): void {
    ev.stopPropagation();
    const id = this._config?.pause;
    if (id) this._press(id, 'Pausing…', 'light');
  }

  private _onStopClick(ev: Event): void {
    ev.stopPropagation();
    const config = this._config;
    if (!config?.stop) return;
    const name = config.name ?? DEFAULT_NAME;
    // Cancelling a print destroys hours of work — always ask first.
    if (!window.confirm(`Stop the print on ${name}?`)) return;
    this._press(config.stop, 'Stopping…', 'warning');
  }

  private _press(entityId: string, pending: string, feedback: 'light' | 'warning'): void {
    const hass = this.hass;
    if (!hass) return;
    const stateObj = hass.states[entityId];
    if (!stateObj || isUnavailable(stateObj)) return;
    haptic(this, feedback);
    this._pending = pending;
    this._pendingBase = this._config?.status
      ? (hass.states[this._config.status]?.last_updated ?? '')
      : '';
    window.clearTimeout(this._pendingTimer);
    this._pendingTimer = window.setTimeout(() => this._clearPending(), OPTIMISTIC_TIMEOUT_MS);
    // `button.press` — domainOf keeps input_button helpers working too.
    hass.callService(domainOf(entityId), 'press', { entity_id: entityId });
  }

  private _renderCamera(): TemplateResult | typeof nothing {
    const id = this._config?.camera;
    if (!id || !this.hass) return nothing;
    const stateObj = this.hass.states[id];
    const picture = stateObj?.attributes.entity_picture;
    const live =
      stateObj !== undefined &&
      !isUnavailable(stateObj) &&
      typeof picture === 'string' &&
      picture !== '' &&
      !this._broken;
    // entity_picture already carries its auth token query string, so the
    // cache-buster normally joins with `&` (`?` covers a bare URL just in case).
    const src = live
      ? `${picture}${(picture as string).includes('?') ? '&' : '?'}counter=${this._counter}`
      : undefined;
    const label = String(stateObj?.attributes.friendly_name ?? id);
    return html`
      <button class="cam" aria-label=${`Show ${label} live view`} @click=${this._onCameraClick}>
        ${src !== undefined
          ? html`<img src=${src} alt=${label} @error=${this._onSnapshotError} />`
          : html`<div class="camoff"><ha-icon icon="mdi:video-off"></ha-icon></div>`}
      </button>
    `;
  }

  /**
   * 'Nozzle 220 → 220°'. With no target entity — or a target of zero, which is
   * how printers say "heater off" — the reading stands alone as 'Nozzle 24°'.
   */
  private _renderTemp(label: string, reading: Reading | null): TemplateResult | typeof nothing {
    if (!reading) return nothing;
    const hasTarget = Number.isFinite(reading.target) && reading.target > 0;
    const heating = hasTarget && Math.abs(reading.current - reading.target) > HEATING_DELTA;
    return html`
      <div class="temp">
        <span class="tlabel">${label}</span>
        <span class="tval ${heating ? 'hot' : ''}"
          >${Math.round(reading.current)}${hasTarget ? '' : '°'}</span
        >
        ${hasTarget ? html`<span class="ttarget">→ ${Math.round(reading.target)}°</span>` : nothing}
      </div>
    `;
  }

  protected render(): TemplateResult | typeof nothing {
    const config = this._config;
    const hass = this.hass;
    if (!config || !hass) return nothing;

    const primary = this._primaryEntity();
    if (primary && !hass.states[primary]) {
      return html`
        <ha-card class="control">
          <div class="warning">Entity not found: ${primary}</div>
        </ha-card>
      `;
    }

    const statusObj = config.status ? hass.states[config.status] : undefined;
    const progressObj = config.progress ? hass.states[config.progress] : undefined;
    const tracked = this._tracked();
    const unavailable = tracked.length > 0 && tracked.every((id) => isUnavailable(hass.states[id]));

    const rawPct = numericState(progressObj);
    const hasPct = Number.isFinite(rawPct);
    const pct = hasPct ? clamp(rawPct, 0, 100) : 0;

    const statusToken = statusObj && !isUnavailable(statusObj) ? normalize(statusObj.state) : '';
    const idle = statusObj
      ? IDLE_STATES.has(statusToken)
      : !hasPct || pct <= 0; // no status entity: the percentage speaks for the job
    const printing = statusObj
      ? PRINTING_STATES.has(statusToken) || statusToken.includes('printing')
      : hasPct && pct > 0 && pct < 100;

    const accent = accentFor(progressObj ?? statusObj, config.color);
    const name = config.name ?? DEFAULT_NAME;
    const statusLabel =
      this._pending ??
      (statusObj && !isUnavailable(statusObj)
        ? capitalize(stateText(hass, statusObj))
        : printing
          ? 'Printing'
          : 'Idle');
    const remaining = idle ? undefined : this._remainingText();

    const nozzle = this._reading(config.nozzle, config.nozzle_target);
    const bed = this._reading(config.bed, config.bed_target);
    const hasTemps = nozzle !== null || bed !== null;
    const hasControls = !!config.pause || !!config.stop;
    const pauseObj = config.pause ? hass.states[config.pause] : undefined;
    const stopObj = config.stop ? hass.states[config.stop] : undefined;
    // The bar reports the job, so it hides the moment there is no job to report.
    const barHidden = unavailable || idle || !hasPct || pct <= 0;

    return html`
      <ha-card
        class="control ${unavailable ? 'unavailable' : ''}"
        style="--silk-accent:${accent}"
        @click=${this._onCardClick}
      >
        ${this._renderCamera()}
        <div class="top">
          <div class="icon ${printing && !unavailable ? 'on' : ''}">
            <ha-icon .icon=${config.icon ?? DEFAULT_ICON}></ha-icon>
          </div>
          <div class="info">
            <div class="name">${name}</div>
            <div class="state">
              ${statusLabel}${remaining ? html`<span class="sep">·</span>${remaining}` : nothing}
            </div>
          </div>
          ${config.progress
            ? html`
                <div class="trailing">
                  <span class="value">${hasPct ? `${Math.round(pct)}%` : '—'}</span>
                </div>
              `
            : nothing}
        </div>
        ${hasTemps || hasControls
          ? html`
              <div class="row2">
                <div class="temps">
                  ${this._renderTemp('Nozzle', nozzle)}${this._renderTemp('Bed', bed)}
                </div>
                ${hasControls
                  ? html`
                      <div class="ctls">
                        ${config.pause
                          ? html`
                              <button
                                class="ctl"
                                ?disabled=${isUnavailable(pauseObj)}
                                aria-label=${`Pause ${name}`}
                                @click=${this._onPauseClick}
                              >
                                <ha-icon icon="mdi:pause"></ha-icon>
                              </button>
                            `
                          : nothing}
                        ${config.stop
                          ? html`
                              <button
                                class="ctl"
                                ?disabled=${isUnavailable(stopObj)}
                                aria-label=${`Stop the print on ${name}`}
                                @click=${this._onStopClick}
                              >
                                <ha-icon icon="mdi:stop"></ha-icon>
                              </button>
                            `
                          : nothing}
                      </div>
                    `
                  : nothing}
              </div>
            `
          : nothing}
        <div class="track ${barHidden ? 'hidden' : ''}" aria-hidden="true">
          <div class="bar" style="width:${pct.toFixed(2)}%"></div>
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
        flex: none;
        display: flex;
        align-items: center;
        gap: 12px;
        min-width: 0;
      }
      /* The buttons own the controls, so the icon presses with the card. */
      .icon {
        cursor: pointer;
      }
      .icon:active {
        transform: none;
      }
      .value {
        font-size: 22px;
        letter-spacing: -0.02em;
      }
      /* Snapshot strip, bled to the card edges; it shrinks before the rows do. */
      .cam {
        position: relative;
        flex: 1 1 auto;
        min-height: 0;
        margin: -12px -12px 0;
        padding: 0;
        border: none;
        display: block;
        width: auto;
        aspect-ratio: 16 / 9;
        overflow: hidden;
        cursor: pointer;
        background: rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.05);
      }
      .cam:focus-visible {
        outline: 2px solid color-mix(in srgb, var(--silk-accent) 70%, transparent);
        outline-offset: -2px;
      }
      .cam img {
        position: absolute;
        inset: 0;
        display: block;
        width: 100%;
        height: 100%;
        object-fit: cover;
      }
      .camoff {
        position: absolute;
        inset: 0;
        display: grid;
        place-items: center;
        color: var(--secondary-text-color);
      }
      .camoff ha-icon {
        --mdc-icon-size: 22px;
      }
      .row2 {
        flex: none;
        display: flex;
        align-items: center;
        gap: 10px;
        min-width: 0;
      }
      .temps {
        flex: 1;
        display: flex;
        align-items: baseline;
        gap: 14px;
        min-width: 0;
        overflow: hidden;
      }
      .temp {
        display: flex;
        align-items: baseline;
        gap: 4px;
        min-width: 0;
        font-size: 13px;
        line-height: 1.3;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        font-variant-numeric: tabular-nums;
      }
      .tlabel {
        color: var(--secondary-text-color);
      }
      .tval {
        font-weight: 600;
        color: var(--primary-text-color);
        transition: color 200ms ease;
      }
      /* Chroma only where it means something: the heater is still climbing. */
      .tval.hot {
        color: var(--silk-accent);
      }
      .ttarget {
        color: var(--secondary-text-color);
      }
      .ctls {
        flex: none;
        display: flex;
        align-items: center;
        gap: 6px;
      }
      .ctl {
        width: 36px;
        height: 36px;
        border: none;
        border-radius: 12px;
        display: grid;
        place-items: center;
        padding: 0;
        cursor: pointer;
        color: var(--secondary-text-color);
        background: rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.06);
        transition:
          transform 250ms var(--silk-spring),
          background 200ms ease,
          color 200ms ease,
          opacity 200ms ease;
      }
      .ctl:hover:not(:disabled) {
        background: rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.12);
      }
      .ctl:active:not(:disabled) {
        transform: scale(0.92);
        transition-duration: 120ms;
        transition-timing-function: var(--silk-ease-out);
      }
      .ctl:focus-visible {
        outline: 2px solid color-mix(in srgb, var(--silk-accent) 70%, transparent);
        outline-offset: 2px;
      }
      .ctl:disabled {
        opacity: 0.35;
        cursor: default;
      }
      .ctl ha-icon {
        --mdc-icon-size: 20px;
        pointer-events: none;
      }
      /* Job progress riding the card's bottom edge. */
      .track {
        position: absolute;
        left: 0;
        right: 0;
        bottom: 0;
        height: 4px;
        background: rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.07);
        pointer-events: none;
        z-index: 1;
        opacity: 1;
        transition: opacity 200ms ease;
      }
      .track.hidden {
        opacity: 0;
      }
      .bar {
        position: absolute;
        inset: 0 auto 0 0;
        background: var(--silk-accent);
        transition:
          width 400ms var(--silk-ease-out),
          background 200ms ease;
      }
      .unavailable .cam,
      .unavailable .row2 {
        opacity: 0.45;
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    'silk-printer-card': SilkPrinterCard;
  }
}
