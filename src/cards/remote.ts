import { LitElement, html, css, nothing, PropertyValues, TemplateResult } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { HomeAssistant, LovelaceCardConfig } from '../types';
import { silkControlStyles } from '../shared/base';
import {
  domainOf,
  isActive,
  isUnavailable,
  toggleEntity,
  moreInfo,
  haptic,
  supportsFeature,
} from '../shared/service';
import { accentFor } from '../shared/color';
import { registerEditor } from '../shared/editor';

export const META = {
  type: 'silk-remote-card',
  name: 'Silk Remote',
  description: 'A TV remote that lives on your dashboard.',
};

/** MediaPlayerEntityFeature bits (HA core). */
const FEAT_PAUSE = 1;
const FEAT_VOLUME_MUTE = 8;
const FEAT_PREVIOUS_TRACK = 16;
const FEAT_NEXT_TRACK = 32;
const FEAT_VOLUME_STEP = 1024;
const FEAT_SELECT_SOURCE = 2048;
const FEAT_PLAY = 16384;

const OPTIMISTIC_TTL_MS = 2000;

/** D-pad geometry: dish diameter, directional key size, center OK size. */
const PAD = 120;
const DIR = 40;
const OK = 44;
const DIR_OFF = (PAD - DIR) / 2;
const OK_OFF = (PAD - OK) / 2;

const DPAD_KEYS = ['up', 'down', 'left', 'right', 'ok'] as const;
type DpadKey = (typeof DPAD_KEYS)[number];

/** One d-pad key: a generic `domain.service` call with optional service data. */
export interface DpadAction {
  service: string;
  data?: Record<string, unknown>;
}

/** The five d-pad slots. Slots left out render as disabled keys. */
export interface DpadConfig {
  up?: DpadAction;
  down?: DpadAction;
  left?: DpadAction;
  right?: DpadAction;
  ok?: DpadAction;
}

export interface SilkRemoteCardConfig extends LovelaceCardConfig {
  entity: string;
  name?: string;
  /**
   * media_player has no directional commands, so the d-pad is honest: each key
   * is a generic service call — wire your remote entity here (e.g.
   * `remote.send_command`, `webostv.button`). When `dpad` is omitted the pad
   * renders disabled at 40% opacity instead of pretending to work.
   */
  dpad?: DpadConfig;
}

const EDITOR_TAG = 'silk-remote-card-editor';

/**
 * One d-pad slot. ha-form nests an expandable section's fields under its own
 * name, so `dpad` → `up` → `{service, data}` comes out of the form in exactly
 * the shape the card reads. `data` is the free-form service payload, so it is
 * the one field that stays a code box.
 */
const padKey = (name: DpadKey, title: string) => ({
  name,
  type: 'expandable',
  title,
  schema: [
    { name: 'service', selector: { text: {} } },
    { name: 'data', selector: { object: {} } },
  ],
});

registerEditor(
  EDITOR_TAG,
  [
    { name: 'entity', required: true, selector: { entity: { domain: ['media_player'] } } },
    { name: 'name', selector: { text: {} } },
    {
      name: 'dpad',
      type: 'expandable',
      title: '방향 패드',
      schema: [
        padKey('up', '위'),
        padKey('down', '아래'),
        padKey('left', '왼쪽'),
        padKey('right', '오른쪽'),
        padKey('ok', '확인 (OK)'),
      ],
    },
  ],
  {
    entity: '미디어 플레이어',
    name: '이름',
    dpad: '방향 패드',
    up: '위',
    down: '아래',
    left: '왼쪽',
    right: '오른쪽',
    ok: '확인 (OK)',
    service: '서비스 (domain.service)',
    data: '서비스 데이터 (선택)',
  }
);

/**
 * A dashboard TV remote. Depth is strictly neutral monochrome (text-color
 * grays + black-alpha inset shadows) so the keys read as pressed plastic on
 * light and dark themes alike; the only chroma is the accent on the power
 * icon while the TV is on and on an engaged mute key.
 */
@customElement('silk-remote-card')
export class SilkRemoteCard extends LitElement {
  @property({ attribute: false }) public hass?: HomeAssistant;

  @state() private _config?: SilkRemoteCardConfig;

  /** Optimistic overrides shown until the real state echoes back (or 2s). */
  @state() private _optimisticOn: boolean | null = null;
  @state() private _optimisticPlaying: boolean | null = null;
  @state() private _optimisticMuted: boolean | null = null;
  @state() private _optimisticSource: string | null = null;

  private _expiryTimer?: number;
  private _lastUpdated?: string;

  public static getStubConfig(hass: HomeAssistant): Partial<SilkRemoteCardConfig> {
    const ids = Object.keys(hass.states).filter((id) => id.startsWith('media_player.'));
    const entity = ids.find((id) => hass.states[id].attributes.device_class === 'tv') ?? ids[0];
    return { type: 'custom:silk-remote-card', entity };
  }

  public static async getConfigElement(): Promise<HTMLElement> {
    return document.createElement(EDITOR_TAG);
  }

  public setConfig(config: SilkRemoteCardConfig): void {
    if (!config.entity || domainOf(config.entity) !== 'media_player') {
      throw new Error('silk-remote-card: define a media_player `entity` (e.g. media_player.tv)');
    }
    if (config.dpad !== undefined) {
      if (typeof config.dpad !== 'object' || config.dpad === null || Array.isArray(config.dpad)) {
        throw new Error('silk-remote-card: `dpad` must map up/down/left/right/ok to actions');
      }
      for (const key of DPAD_KEYS) {
        const action = config.dpad[key];
        if (action === undefined) continue;
        if (typeof action?.service !== 'string' || !action.service.includes('.')) {
          throw new Error(`silk-remote-card: dpad.${key}.service must be a "domain.service" string`);
        }
        if (
          action.data !== undefined &&
          (typeof action.data !== 'object' || action.data === null || Array.isArray(action.data))
        ) {
          throw new Error(`silk-remote-card: dpad.${key}.data must be a mapping of service fields`);
        }
      }
    }
    this._config = config;
    this._clearOptimistic();
    this._lastUpdated = undefined;
  }

  public getCardSize(): number {
    return 4;
  }

  public getGridOptions(): Record<string, number> {
    return { columns: 4, rows: 4, min_columns: 3, min_rows: 4 };
  }

  public disconnectedCallback(): void {
    super.disconnectedCallback();
    window.clearTimeout(this._expiryTimer);
    this._expiryTimer = undefined;
  }

  protected willUpdate(changed: PropertyValues): void {
    if (!changed.has('hass') || !this._config) return;
    const stamp = this.hass?.states[this._config.entity]?.last_updated;
    if (stamp === undefined || stamp === this._lastUpdated) return;
    const isFirst = this._lastUpdated === undefined;
    this._lastUpdated = stamp;
    // A real state update arrived: the optimistic overrides have done their job.
    if (!isFirst && this._expiryTimer !== undefined) this._clearOptimistic();
  }

  protected updated(): void {
    // A native <select> keeps its own selection; steer it to the shown source
    // every pass so a change HA rejected snaps back honestly.
    const select = this.renderRoot.querySelector<HTMLSelectElement>('.source select');
    if (!select) return;
    const desired = this._currentSource() ?? '';
    if (select.value !== desired) select.value = desired;
  }

  private _clearOptimistic(): void {
    window.clearTimeout(this._expiryTimer);
    this._expiryTimer = undefined;
    this._optimisticOn = null;
    this._optimisticPlaying = null;
    this._optimisticMuted = null;
    this._optimisticSource = null;
  }

  private _armExpiry(): void {
    window.clearTimeout(this._expiryTimer);
    this._expiryTimer = window.setTimeout(() => {
      this._expiryTimer = undefined;
      this._optimisticOn = null;
      this._optimisticPlaying = null;
      this._optimisticMuted = null;
      this._optimisticSource = null;
    }, OPTIMISTIC_TTL_MS);
  }

  /** Source to display: optimistic first, else the entity's `source` attribute. */
  private _currentSource(): string | undefined {
    if (this._optimisticSource !== null) return this._optimisticSource;
    const src = this._config ? this.hass?.states[this._config.entity]?.attributes.source : undefined;
    return typeof src === 'string' && src ? src : undefined;
  }

  private _onCardClick(): void {
    if (this._config) moreInfo(this, this._config.entity);
  }

  private _stopClick(ev: Event): void {
    ev.stopPropagation();
  }

  private _onPowerClick(ev: Event): void {
    ev.stopPropagation();
    const config = this._config;
    const hass = this.hass;
    if (!config || !hass) return;
    const stateObj = hass.states[config.entity];
    if (!stateObj || isUnavailable(stateObj)) return;
    haptic(this);
    this._optimisticOn = !(this._optimisticOn ?? isActive(stateObj));
    this._armExpiry();
    toggleEntity(hass, config.entity);
  }

  private _onSourceChange(ev: Event): void {
    ev.stopPropagation();
    const config = this._config;
    const hass = this.hass;
    if (!config || !hass) return;
    const source = (ev.target as HTMLSelectElement).value;
    if (!source) return;
    haptic(this, 'selection');
    this._optimisticSource = source;
    this._armExpiry();
    hass.callService('media_player', 'select_source', { entity_id: config.entity, source });
  }

  /** Fire-and-forget media_player services (volume steps, track skips). */
  private _onSimpleKey(
    ev: Event,
    service: 'volume_down' | 'volume_up' | 'media_previous_track' | 'media_next_track'
  ): void {
    ev.stopPropagation();
    const config = this._config;
    const hass = this.hass;
    if (!config || !hass || isUnavailable(hass.states[config.entity])) return;
    haptic(this);
    hass.callService('media_player', service, { entity_id: config.entity });
  }

  private _onMuteClick(ev: Event): void {
    ev.stopPropagation();
    const config = this._config;
    const hass = this.hass;
    if (!config || !hass) return;
    const stateObj = hass.states[config.entity];
    if (!stateObj || isUnavailable(stateObj)) return;
    const muted = this._optimisticMuted ?? stateObj.attributes.is_volume_muted === true;
    haptic(this);
    this._optimisticMuted = !muted;
    this._armExpiry();
    hass.callService('media_player', 'volume_mute', {
      entity_id: config.entity,
      is_volume_muted: !muted,
    });
  }

  private _onPlayPause(ev: Event): void {
    ev.stopPropagation();
    const config = this._config;
    const hass = this.hass;
    if (!config || !hass) return;
    const stateObj = hass.states[config.entity];
    if (!stateObj || isUnavailable(stateObj)) return;
    const playing = this._optimisticPlaying ?? stateObj.state === 'playing';
    haptic(this);
    this._optimisticPlaying = !playing;
    this._armExpiry();
    hass.callService('media_player', 'media_play_pause', { entity_id: config.entity });
  }

  private _onPadPress(ev: Event, key: DpadKey): void {
    ev.stopPropagation();
    const config = this._config;
    const hass = this.hass;
    if (!config || !hass) return;
    const action = config.dpad?.[key];
    if (!action || isUnavailable(hass.states[config.entity])) return;
    const dot = action.service.indexOf('.');
    const domain = action.service.slice(0, dot);
    const service = action.service.slice(dot + 1);
    haptic(this);
    hass.callService(domain, service, action.data ? { ...action.data } : undefined);
  }

  private _padDir(
    key: Exclude<DpadKey, 'ok'>,
    icon: string,
    label: string,
    unavailable: boolean
  ): TemplateResult {
    const disabled = unavailable || !this._config?.dpad?.[key];
    return html`
      <button
        class="dir ${key}"
        .disabled=${disabled}
        aria-label=${label}
        @click=${(ev: Event) => this._onPadPress(ev, key)}
      >
        <ha-icon .icon=${icon}></ha-icon>
      </button>
    `;
  }

  private _key(opts: {
    icon: string;
    label: string;
    disabled: boolean;
    on?: boolean;
    onClick: (ev: Event) => void;
  }): TemplateResult {
    return html`
      <button
        class="key ${opts.on ? 'on' : ''}"
        .disabled=${opts.disabled}
        aria-label=${opts.label}
        @click=${opts.onClick}
      >
        <ha-icon .icon=${opts.icon}></ha-icon>
      </button>
    `;
  }

  protected render(): TemplateResult | typeof nothing {
    const config = this._config;
    const hass = this.hass;
    if (!config || !hass) return nothing;
    const stateObj = hass.states[config.entity];
    if (!stateObj) {
      return html`<ha-card><div class="warning">Entity not found: ${config.entity}</div></ha-card>`;
    }

    const unavailable = isUnavailable(stateObj);
    const on = !unavailable && (this._optimisticOn ?? isActive(stateObj));
    const accent = accentFor(stateObj);
    const name = config.name ?? stateObj.attributes.friendly_name ?? config.entity;
    const sourceList: string[] = Array.isArray(stateObj.attributes.source_list)
      ? stateObj.attributes.source_list.filter((s: unknown): s is string => typeof s === 'string')
      : [];
    const showSource = supportsFeature(stateObj, FEAT_SELECT_SOURCE) && sourceList.length > 0;
    const current = this._currentSource();
    const padDead = !config.dpad;

    const volumeKeys: TemplateResult[] = [];
    if (supportsFeature(stateObj, FEAT_VOLUME_STEP)) {
      volumeKeys.push(
        this._key({
          icon: 'mdi:volume-minus',
          label: 'Volume down',
          disabled: unavailable,
          onClick: (ev) => this._onSimpleKey(ev, 'volume_down'),
        })
      );
    }
    if (supportsFeature(stateObj, FEAT_VOLUME_MUTE)) {
      const muted = this._optimisticMuted ?? stateObj.attributes.is_volume_muted === true;
      volumeKeys.push(
        this._key({
          icon: muted ? 'mdi:volume-off' : 'mdi:volume-high',
          label: muted ? 'Unmute' : 'Mute',
          disabled: unavailable,
          on: muted,
          onClick: (ev) => this._onMuteClick(ev),
        })
      );
    }
    if (supportsFeature(stateObj, FEAT_VOLUME_STEP)) {
      volumeKeys.push(
        this._key({
          icon: 'mdi:volume-plus',
          label: 'Volume up',
          disabled: unavailable,
          onClick: (ev) => this._onSimpleKey(ev, 'volume_up'),
        })
      );
    }

    const transportKeys: TemplateResult[] = [];
    if (supportsFeature(stateObj, FEAT_PREVIOUS_TRACK)) {
      transportKeys.push(
        this._key({
          icon: 'mdi:skip-previous',
          label: 'Previous track',
          disabled: unavailable,
          onClick: (ev) => this._onSimpleKey(ev, 'media_previous_track'),
        })
      );
    }
    if (supportsFeature(stateObj, FEAT_PAUSE) || supportsFeature(stateObj, FEAT_PLAY)) {
      const playing = !unavailable && (this._optimisticPlaying ?? stateObj.state === 'playing');
      transportKeys.push(
        this._key({
          icon: playing ? 'mdi:pause' : 'mdi:play',
          label: playing ? 'Pause' : 'Play',
          disabled: unavailable,
          onClick: (ev) => this._onPlayPause(ev),
        })
      );
    }
    if (supportsFeature(stateObj, FEAT_NEXT_TRACK)) {
      transportKeys.push(
        this._key({
          icon: 'mdi:skip-next',
          label: 'Next track',
          disabled: unavailable,
          onClick: (ev) => this._onSimpleKey(ev, 'media_next_track'),
        })
      );
    }

    const keys: TemplateResult[] = [...volumeKeys];
    if (volumeKeys.length && transportKeys.length) {
      keys.push(html`<span class="split" aria-hidden="true"></span>`);
    }
    keys.push(...transportKeys);

    return html`
      <ha-card
        class=${unavailable ? 'unavailable' : ''}
        style="--silk-accent:${accent}"
        @click=${this._onCardClick}
      >
        <div class="row ${showSource ? '' : 'solo'}">
          <button
            class="power ${on ? 'on' : ''}"
            .disabled=${unavailable}
            aria-label=${`Toggle ${name}`}
            @click=${this._onPowerClick}
          >
            <ha-icon icon="mdi:power"></ha-icon>
          </button>
          ${showSource
            ? html`
                <div class="source" @click=${this._stopClick}>
                  <select
                    aria-label="Input source"
                    .disabled=${unavailable}
                    @change=${this._onSourceChange}
                  >
                    <option value="" disabled hidden>Source</option>
                    ${sourceList.map(
                      (src) => html`<option value=${src} ?selected=${src === current}>${src}</option>`
                    )}
                  </select>
                  <ha-icon icon="mdi:chevron-down"></ha-icon>
                </div>
              `
            : nothing}
        </div>
        <div
          class="pad ${padDead ? 'dead' : ''}"
          title=${padDead
            ? 'D-pad not wired — add dpad: actions in YAML (e.g. remote.send_command)'
            : nothing}
        >
          ${this._padDir('up', 'mdi:chevron-up', 'Up', unavailable)}
          ${this._padDir('left', 'mdi:chevron-left', 'Left', unavailable)}
          <button
            class="ok"
            .disabled=${unavailable || !config.dpad?.ok}
            aria-label="OK"
            @click=${(ev: Event) => this._onPadPress(ev, 'ok')}
          >
            OK
          </button>
          ${this._padDir('right', 'mdi:chevron-right', 'Right', unavailable)}
          ${this._padDir('down', 'mdi:chevron-down', 'Down', unavailable)}
        </div>
        ${keys.length ? html`<div class="keys">${keys}</div>` : nothing}
        <div class="label" title=${name}>${name}</div>
      </ha-card>
    `;
  }

  static styles = [
    silkControlStyles,
    css`
      ha-card {
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 10px;
        padding: 12px;
      }
      .row {
        flex: none;
        display: flex;
        align-items: center;
        gap: 8px;
        width: 100%;
        min-width: 0;
      }
      .row.solo {
        justify-content: center;
      }
      /* Power key: neutral pressed-plastic dome; accent only on the glyph when on. */
      .power {
        flex: none;
        width: 40px;
        height: 40px;
        border-radius: 50%;
        border: 1px solid rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.1);
        background: rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.07);
        box-shadow:
          inset 0 1px 1px rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.06),
          inset 0 -2px 5px rgba(0, 0, 0, 0.12);
        display: grid;
        place-items: center;
        padding: 0;
        cursor: pointer;
        color: var(--secondary-text-color);
        transition:
          transform 250ms var(--silk-spring),
          box-shadow 250ms var(--silk-spring),
          color 200ms ease;
      }
      .power:active:not(:disabled) {
        transform: scale(0.92);
        box-shadow: inset 0 2px 6px rgba(0, 0, 0, 0.2);
        transition-duration: 100ms;
        transition-timing-function: var(--silk-ease-out);
      }
      .power.on {
        color: var(--silk-accent);
      }
      .power ha-icon {
        --mdc-icon-size: 22px;
        pointer-events: none;
      }
      .source {
        position: relative;
        flex: 1;
        min-width: 0;
        max-width: 200px;
      }
      .source select {
        width: 100%;
        height: 36px;
        appearance: none;
        -webkit-appearance: none;
        border: 1px solid rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.08);
        border-radius: 12px;
        padding: 0 30px 0 12px;
        font: inherit;
        font-size: 12.5px;
        font-weight: 500;
        color: var(--secondary-text-color);
        background: rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.06);
        box-shadow:
          inset 0 1px 1px rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.05),
          inset 0 -2px 4px rgba(0, 0, 0, 0.08);
        cursor: pointer;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        transition: background 150ms ease-out;
      }
      .source select:hover:not(:disabled) {
        background: rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.1);
      }
      .source select:disabled {
        cursor: default;
      }
      .source ha-icon {
        position: absolute;
        right: 8px;
        top: 50%;
        transform: translateY(-50%);
        pointer-events: none;
        color: var(--secondary-text-color);
        opacity: 0.7;
        --mdc-icon-size: 16px;
      }
      /* The d-pad dish: concave neutral well; keys sit inside it. */
      .pad {
        position: relative;
        flex: none;
        width: ${PAD}px;
        height: ${PAD}px;
        border-radius: 50%;
        border: 1px solid rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.08);
        background: rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.06);
        box-shadow:
          inset 0 2px 6px rgba(0, 0, 0, 0.1),
          inset 0 -1px 1px rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.05);
        transition: opacity 200ms ease;
      }
      .pad.dead {
        opacity: 0.4;
      }
      /* When the whole pad is dead its keys must not dim a second time. */
      .pad.dead .dir:disabled,
      .pad.dead .ok:disabled {
        opacity: 1;
      }
      .dir {
        position: absolute;
        width: ${DIR}px;
        height: ${DIR}px;
        border: none;
        border-radius: 50%;
        background: transparent;
        display: grid;
        place-items: center;
        padding: 0;
        cursor: pointer;
        color: var(--secondary-text-color);
        transition:
          transform 250ms var(--silk-spring),
          background 150ms ease-out,
          opacity 200ms ease;
      }
      .dir:hover:not(:disabled) {
        background: rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.08);
      }
      .dir:active:not(:disabled) {
        transform: scale(0.88);
        background: rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.12);
        transition-duration: 100ms;
        transition-timing-function: var(--silk-ease-out);
      }
      .dir:disabled {
        cursor: default;
        opacity: 0.35;
      }
      .dir ha-icon {
        --mdc-icon-size: 24px;
        pointer-events: none;
      }
      .dir.up {
        top: 2px;
        left: ${DIR_OFF}px;
      }
      .dir.down {
        bottom: 2px;
        left: ${DIR_OFF}px;
      }
      .dir.left {
        left: 2px;
        top: ${DIR_OFF}px;
      }
      .dir.right {
        right: 2px;
        top: ${DIR_OFF}px;
      }
      /* Center OK: raised card-surface puck against the concave dish. */
      .ok {
        position: absolute;
        top: ${OK_OFF}px;
        left: ${OK_OFF}px;
        width: ${OK}px;
        height: ${OK}px;
        border-radius: 50%;
        border: 1px solid rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.14);
        background: var(--card-background-color, #fff);
        box-shadow:
          inset 0 1px 0 rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.06),
          inset 0 -3px 5px rgba(0, 0, 0, 0.1);
        display: grid;
        place-items: center;
        padding: 0;
        cursor: pointer;
        font: inherit;
        font-size: 12px;
        font-weight: 600;
        color: var(--primary-text-color);
        transition:
          transform 250ms var(--silk-spring),
          box-shadow 250ms var(--silk-spring);
      }
      .ok:active:not(:disabled) {
        transform: scale(0.92);
        box-shadow: inset 0 2px 6px rgba(0, 0, 0, 0.18);
        transition-duration: 100ms;
        transition-timing-function: var(--silk-ease-out);
      }
      .ok:disabled {
        cursor: default;
        opacity: 0.35;
      }
      .keys {
        flex: none;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-wrap: wrap;
        gap: 6px;
        width: 100%;
        min-width: 0;
      }
      .split {
        flex: none;
        width: 6px;
      }
      .key {
        flex: none;
        width: 36px;
        height: 36px;
        border-radius: 12px;
        border: 1px solid rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.08);
        background: rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.07);
        box-shadow:
          inset 0 1px 1px rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.06),
          inset 0 -2px 4px rgba(0, 0, 0, 0.1);
        display: grid;
        place-items: center;
        padding: 0;
        cursor: pointer;
        color: var(--secondary-text-color);
        transition:
          transform 250ms var(--silk-spring),
          box-shadow 250ms var(--silk-spring),
          color 200ms ease;
      }
      .key:active:not(:disabled) {
        transform: scale(0.92);
        box-shadow: inset 0 2px 5px rgba(0, 0, 0, 0.18);
        transition-duration: 100ms;
        transition-timing-function: var(--silk-ease-out);
      }
      .key.on {
        color: var(--silk-accent);
      }
      .key:disabled {
        cursor: default;
        opacity: 0.35;
      }
      .key ha-icon {
        --mdc-icon-size: 18px;
        pointer-events: none;
      }
      .label {
        flex: none;
        max-width: 100%;
        font-size: 12px;
        font-weight: 400;
        line-height: 1.3;
        color: var(--secondary-text-color);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        text-align: center;
      }
      .power:focus-visible,
      .dir:focus-visible,
      .ok:focus-visible,
      .key:focus-visible,
      .source select:focus-visible {
        outline: 2px solid color-mix(in srgb, var(--silk-accent) 70%, transparent);
        outline-offset: 2px;
      }
      .unavailable .row,
      .unavailable .pad,
      .unavailable .keys,
      .unavailable .label {
        opacity: 0.45;
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    'silk-remote-card': SilkRemoteCard;
  }
}
