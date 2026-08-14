import { LitElement, html, css, nothing, PropertyValues, TemplateResult } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { HomeAssistant, HassEntity, LovelaceCardConfig } from '../types';
import { silkControlStyles } from '../shared/base';
import { domainOf, isUnavailable, moreInfo, haptic, supportsFeature, clamp } from '../shared/service';
import { accentFor } from '../shared/color';
import { registerEditor } from '../shared/editor';
import '../shared/slider';

export const META = {
  type: 'silk-mixer-card',
  name: 'Silk Mixer',
  description: "Every speaker's volume in one place.",
};

/** MediaPlayerEntityFeature bits (HA core). */
const FEAT_VOLUME_SET = 4;
const FEAT_VOLUME_MUTE = 8;

const MIN_PLAYERS = 2;
const MAX_PLAYERS = 8;
const OPTIMISTIC_TTL_MS = 2000;

/** States where a speaker has nothing to say — the row recedes. */
const OFF_STATES = new Set(['off', 'standby', 'unavailable', 'unknown', '']);

export interface SilkMixerCardConfig extends LovelaceCardConfig {
  /** 2–8 media_player entity ids, one row each. */
  players: string[];
  name?: string;
  /** Accent override. */
  color?: string;
}

const EDITOR_TAG = 'silk-mixer-card-editor';

registerEditor(
  EDITOR_TAG,
  [
    {
      name: 'players',
      required: true,
      selector: { entity: { multiple: true, domain: ['media_player'] } },
    },
    { name: 'name', selector: { text: {} } },
    { name: 'color', selector: { ui_color: {} } },
  ],
  { players: '스피커 (2~8개)', name: '이름', color: '강조 색상' }
);

/** Volume percent for a player, or undefined when it reports none. */
function volumeOf(stateObj: HassEntity): number | undefined {
  const level = stateObj.attributes.volume_level;
  return typeof level === 'number' && Number.isFinite(level)
    ? clamp(Math.round(level * 100), 0, 100)
    : undefined;
}

/**
 * One fader per speaker, plus a master that moves them together.
 *
 * The master reads the LOUDEST player and scales every other by the same
 * ratio, so the balance between rooms survives the gesture and no player can
 * be pushed past 100 (the loudest hits the ceiling first, by definition).
 * When every player sits at zero there is no ratio to keep, so the master
 * simply sets them all to the same level.
 */
@customElement('silk-mixer-card')
export class SilkMixerCard extends LitElement {
  @property({ attribute: false }) public hass?: HomeAssistant;

  @state() private _config?: SilkMixerCardConfig;

  /** Optimistic volume (%) per entity, cleared when THAT entity re-reports. */
  @state() private _optimisticVolume: Record<string, number> = {};
  /** Optimistic mute per entity, cleared the same way. */
  @state() private _optimisticMute: Record<string, boolean> = {};

  /** Per-entity last_updated at call time; a newer stamp clears the override. */
  private _base: Record<string, string> = {};
  private _expiryTimer?: number;

  public static getStubConfig(hass: HomeAssistant): Partial<SilkMixerCardConfig> {
    const ids = Object.keys(hass.states).filter(
      (id) => id.startsWith('media_player.') && supportsFeature(hass.states[id], FEAT_VOLUME_SET)
    );
    const players = (ids.length >= MIN_PLAYERS ? ids : Object.keys(hass.states).filter((id) => id.startsWith('media_player.')))
      .slice(0, 4);
    return { type: 'custom:silk-mixer-card', players };
  }

  public static async getConfigElement(): Promise<HTMLElement> {
    return document.createElement(EDITOR_TAG);
  }

  public setConfig(config: SilkMixerCardConfig): void {
    if (!Array.isArray(config.players) || config.players.length === 0) {
      throw new Error('silk-mixer-card: `players` is required — a list of media_player entity ids');
    }
    if (config.players.some((id) => typeof id !== 'string' || domainOf(id) !== 'media_player')) {
      throw new Error('silk-mixer-card: every entry in `players` must be a media_player entity id');
    }
    if (config.players.length < MIN_PLAYERS || config.players.length > MAX_PLAYERS) {
      throw new Error(
        `silk-mixer-card: \`players\` takes ${MIN_PLAYERS}–${MAX_PLAYERS} entities (got ${config.players.length})`
      );
    }
    this._config = config;
    this._clearOptimistic();
  }

  public getCardSize(): number {
    return 3;
  }

  public getGridOptions(): Record<string, number> {
    return { columns: 6, rows: 3, min_columns: 4, min_rows: 2 };
  }

  public disconnectedCallback(): void {
    super.disconnectedCallback();
    window.clearTimeout(this._expiryTimer);
    this._expiryTimer = undefined;
  }

  protected willUpdate(changed: PropertyValues): void {
    if (!changed.has('hass') || !this.hass) return;
    const stale = (map: Record<string, unknown>): string[] =>
      Object.keys(map).filter((id) => {
        const stamp = this.hass!.states[id]?.last_updated;
        return stamp !== undefined && stamp !== this._base[id];
      });
    const staleVolume = stale(this._optimisticVolume);
    const staleMute = stale(this._optimisticMute);
    if (!staleVolume.length && !staleMute.length) return;
    const volumes = { ...this._optimisticVolume };
    const mutes = { ...this._optimisticMute };
    for (const id of staleVolume) delete volumes[id];
    for (const id of staleMute) delete mutes[id];
    this._optimisticVolume = volumes;
    this._optimisticMute = mutes;
    for (const id of new Set([...staleVolume, ...staleMute])) {
      if (volumes[id] === undefined && mutes[id] === undefined) delete this._base[id];
    }
  }

  private _clearOptimistic(): void {
    window.clearTimeout(this._expiryTimer);
    this._expiryTimer = undefined;
    this._optimisticVolume = {};
    this._optimisticMute = {};
    this._base = {};
  }

  private _armExpiry(): void {
    window.clearTimeout(this._expiryTimer);
    this._expiryTimer = window.setTimeout(() => {
      this._expiryTimer = undefined;
      this._optimisticVolume = {};
      this._optimisticMute = {};
      this._base = {};
    }, OPTIMISTIC_TTL_MS);
  }

  /** Volume % shown on a fader: optimistic first, else the entity's level. */
  private _volumePct(stateObj: HassEntity): number {
    return this._optimisticVolume[stateObj.entity_id] ?? volumeOf(stateObj) ?? 0;
  }

  private _isMuted(stateObj: HassEntity): boolean {
    return this._optimisticMute[stateObj.entity_id] ?? stateObj.attributes.is_volume_muted === true;
  }

  /** Rows the card actually has state for. */
  private _players(): HassEntity[] {
    const hass = this.hass;
    const ids = this._config?.players ?? [];
    const out: HassEntity[] = [];
    for (const id of ids) {
      const stateObj = hass?.states[id];
      if (stateObj) out.push(stateObj);
    }
    return out;
  }

  /** Players the card may actually command right now. */
  private _controllable(): HassEntity[] {
    return this._players().filter(
      (stateObj) => !isUnavailable(stateObj) && supportsFeature(stateObj, FEAT_VOLUME_SET)
    );
  }

  private _setVolume(stateObj: HassEntity, pct: number): void {
    const hass = this.hass;
    if (!hass) return;
    const value = clamp(Math.round(pct), 0, 100);
    this._optimisticVolume = { ...this._optimisticVolume, [stateObj.entity_id]: value };
    this._base[stateObj.entity_id] = stateObj.last_updated;
    void hass.callService('media_player', 'volume_set', {
      entity_id: stateObj.entity_id,
      volume_level: value / 100,
    });
  }

  private _stopClick(ev: Event): void {
    ev.stopPropagation();
  }

  private _onPlayerVolume(ev: CustomEvent<{ value: number }>, stateObj: HassEntity): void {
    haptic(this);
    this._setVolume(stateObj, ev.detail.value);
    this._armExpiry();
  }

  private _onMasterVolume(ev: CustomEvent<{ value: number }>): void {
    const targets = this._controllable();
    if (!targets.length) return;
    const target = clamp(Math.round(ev.detail.value), 0, 100);
    const loudest = targets.reduce((max, p) => Math.max(max, this._volumePct(p)), 0);
    haptic(this);
    for (const stateObj of targets) {
      // Ratio scaling keeps the mix; a silent room stays silent unless every
      // room is silent, in which case there is no balance left to preserve.
      const next = loudest > 0 ? (this._volumePct(stateObj) * target) / loudest : target;
      this._setVolume(stateObj, next);
    }
    this._armExpiry();
  }

  private _onMuteClick(ev: Event, stateObj: HassEntity): void {
    ev.stopPropagation();
    const hass = this.hass;
    if (!hass || isUnavailable(stateObj) || !supportsFeature(stateObj, FEAT_VOLUME_MUTE)) return;
    const muted = this._isMuted(stateObj);
    haptic(this);
    this._optimisticMute = { ...this._optimisticMute, [stateObj.entity_id]: !muted };
    this._base[stateObj.entity_id] = stateObj.last_updated;
    this._armExpiry();
    void hass.callService('media_player', 'volume_mute', {
      entity_id: stateObj.entity_id,
      is_volume_muted: !muted,
    });
  }

  private _onNameClick(ev: Event, entityId: string): void {
    ev.stopPropagation();
    moreInfo(this, entityId);
  }

  private _renderRow(stateObj: HassEntity): TemplateResult {
    const name = stateObj.attributes.friendly_name ?? stateObj.entity_id;
    const unavailable = isUnavailable(stateObj);
    const off = unavailable || OFF_STATES.has(stateObj.state);
    const playing = !unavailable && stateObj.state === 'playing';
    const canSet = !unavailable && supportsFeature(stateObj, FEAT_VOLUME_SET);
    const canMute = !unavailable && supportsFeature(stateObj, FEAT_VOLUME_MUTE);
    const muted = this._isMuted(stateObj);
    const pct = this._volumePct(stateObj);
    const level = volumeOf(stateObj);
    return html`
      <div class="row ${off ? 'off' : ''}" title=${`${name} · ${muted ? 'muted' : `${pct}%`}`}>
        <button class="pname" @click=${(ev: Event) => this._onNameClick(ev, stateObj.entity_id)}>
          ${name}
        </button>
        <silk-slider
          class="vol"
          .value=${pct}
          .min=${0}
          .max=${100}
          .step=${1}
          ?disabled=${!canSet}
          @change=${(ev: CustomEvent<{ value: number }>) => this._onPlayerVolume(ev, stateObj)}
          @click=${this._stopClick}
        ></silk-slider>
        <button
          class="mute ${playing && !muted ? 'on' : ''}"
          .disabled=${!canMute}
          aria-pressed=${muted ? 'true' : 'false'}
          aria-label=${muted ? `Unmute ${name}` : `Mute ${name}`}
          @click=${(ev: Event) => this._onMuteClick(ev, stateObj)}
        >
          <ha-icon .icon=${muted ? 'mdi:volume-off' : 'mdi:volume-high'}></ha-icon>
        </button>
        <span class="pct">${level === undefined && !canSet ? '—' : `${pct}%`}</span>
      </div>
    `;
  }

  protected render(): TemplateResult | typeof nothing {
    const config = this._config;
    const hass = this.hass;
    if (!config || !hass) return nothing;
    const players = this._players();
    if (!players.length) {
      return html`
        <ha-card><div class="warning">No player entities found: ${config.players.join(', ')}</div></ha-card>
      `;
    }

    const controllable = this._controllable();
    const allDead = controllable.length === 0;
    const accent = accentFor(players.find((p) => !isUnavailable(p)) ?? players[0], config.color);
    // The master reads the loudest room — see the class comment.
    const master = controllable.reduce((max, p) => Math.max(max, this._volumePct(p)), 0);

    // No card-wide more-info: a mixer has no single subject, so each row's
    // name is the handle that opens that player's dialog.
    return html`
      <ha-card class="control ${allDead ? 'unavailable' : ''}" style="--silk-accent:${accent}">
        ${config.name ? html`<div class="hname" title=${config.name}>${config.name}</div>` : nothing}
        <div class="row master" title=${`Master · ${master}%`}>
          <span class="pname mlabel">Master</span>
          <silk-slider
            class="vol"
            .value=${master}
            .min=${0}
            .max=${100}
            .step=${1}
            ?disabled=${allDead}
            @change=${this._onMasterVolume}
            @click=${this._stopClick}
          ></silk-slider>
          <span class="spacer" aria-hidden="true"></span>
          <span class="pct">${allDead ? '—' : `${master}%`}</span>
        </div>
        <div class="rows">${players.map((stateObj) => this._renderRow(stateObj))}</div>
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
        gap: 4px;
        padding: 10px 14px;
        cursor: default;
      }
      .hname {
        flex: none;
        font-size: 13px;
        font-weight: 600;
        color: var(--secondary-text-color);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        margin-bottom: 2px;
      }
      /* Eight faders can outgrow a three-row card: they scroll rather than
         clip, and safe centering keeps the first row reachable when they do. */
      .rows {
        flex: 1;
        min-height: 0;
        display: flex;
        flex-direction: column;
        justify-content: safe center;
        gap: 2px;
        overflow-y: auto;
        overscroll-behavior-y: contain;
        scrollbar-width: thin;
      }
      .row {
        flex: none;
        display: flex;
        align-items: center;
        gap: 8px;
        min-height: 30px;
        min-width: 0;
      }
      /* The master sits above its own hairline: same row, different job. */
      .row.master {
        flex: none;
        padding-bottom: 6px;
        margin-bottom: 4px;
        border-bottom: 1px solid rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.09);
      }
      .pname {
        flex: none;
        width: 90px;
        min-width: 0;
        margin: 0;
        padding: 0;
        border: none;
        background: none;
        font: inherit;
        font-size: 13px;
        font-weight: 500;
        line-height: 1.3;
        text-align: left;
        color: var(--primary-text-color);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        cursor: pointer;
        outline: none;
      }
      .pname:focus-visible {
        text-decoration: underline;
        text-underline-offset: 3px;
      }
      .mlabel {
        font-weight: 600;
        cursor: default;
      }
      silk-slider.vol {
        flex: 1;
        min-width: 48px;
        --silk-slider-height: 24px;
      }
      .row.master silk-slider.vol {
        --silk-slider-height: 28px;
      }
      .mute {
        flex: none;
        position: relative;
        width: 28px;
        height: 28px;
        border: none;
        border-radius: 10px;
        display: grid;
        place-items: center;
        padding: 0;
        cursor: pointer;
        color: var(--secondary-text-color);
        background: rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.06);
        transition:
          transform 250ms var(--silk-spring),
          background 200ms ease,
          color 200ms ease;
      }
      /* Invisible halo lifts the touch target past 40px without a fatter row. */
      .mute::after {
        content: '';
        position: absolute;
        inset: -6px;
        border-radius: 12px;
      }
      .mute:active:not(:disabled) {
        transform: scale(0.9);
        transition-duration: 120ms;
        transition-timing-function: var(--silk-ease-out);
      }
      /* Playing = surface, not glow. */
      .mute.on {
        color: var(--silk-accent);
        background: color-mix(in srgb, var(--silk-accent) 20%, transparent);
      }
      .mute ha-icon {
        --mdc-icon-size: 17px;
        pointer-events: none;
      }
      .mute:disabled {
        cursor: default;
        opacity: 0.4;
      }
      .mute:focus-visible {
        outline: 2px solid color-mix(in srgb, var(--silk-accent) 70%, transparent);
        outline-offset: 2px;
      }
      .spacer {
        flex: none;
        width: 28px;
      }
      .pct {
        flex: none;
        width: 34px;
        text-align: right;
        font-size: 11px;
        line-height: 1;
        color: var(--secondary-text-color);
        font-variant-numeric: tabular-nums;
      }
      .row.master .pct {
        color: var(--primary-text-color);
        font-weight: 600;
      }
      /* A speaker that is off recedes; it is still readable and still movable. */
      .row.off {
        opacity: 0.45;
      }
      /* Nothing left to mix: the master recedes with the rows it commands. */
      .unavailable .row.master,
      .unavailable .hname {
        opacity: 0.45;
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    'silk-mixer-card': SilkMixerCard;
  }
}
