import { LitElement, html, css, nothing, PropertyValues, TemplateResult } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { HomeAssistant, HassEntity, LovelaceCardConfig } from '../types';
import { silkControlStyles } from '../shared/base';
import {
  domainOf,
  isActive,
  isUnavailable,
  moreInfo,
  haptic,
  stateText,
  supportsFeature,
  clamp,
} from '../shared/service';
import { accentFor } from '../shared/color';
import { registerEditor } from '../shared/editor';
import '../shared/slider';

export const META = {
  type: 'silk-media-group-card',
  name: 'Silk Media Group',
  description: 'Group speakers with checkboxes, not gymnastics.',
};

/** MediaPlayerEntityFeature bits (HA core). */
const FEAT_VOLUME_SET = 4;
const FEAT_GROUPING = 524288;

const OPTIMISTIC_TTL_MS = 2000;

export interface SilkMediaGroupCardConfig extends LovelaceCardConfig {
  /** The group master: joins pull candidates into THIS player's group. */
  entity: string;
  /** YAML-only. Candidate members, one checkbox row each. */
  players?: string[];
  name?: string;
}

const EDITOR_TAG = 'silk-media-group-card-editor';

registerEditor(
  EDITOR_TAG,
  [{ name: 'entity', required: true, selector: { entity: { domain: ['media_player'] } } }],
  { entity: 'Entity' }
);

/** Non-empty string attribute, else undefined. */
function stringAttr(stateObj: HassEntity, key: string): string | undefined {
  const value = stateObj.attributes[key];
  return typeof value === 'string' && value ? value : undefined;
}

@customElement('silk-media-group-card')
export class SilkMediaGroupCard extends LitElement {
  @property({ attribute: false }) public hass?: HomeAssistant;

  @state() private _config?: SilkMediaGroupCardConfig;

  /** Optimistic membership per player, cleared when the master re-reports. */
  @state() private _optimisticGroup: Record<string, boolean> = {};

  /** Optimistic volume (%) per entity, cleared when THAT entity re-reports. */
  @state() private _optimisticVolume: Record<string, number> = {};

  /** master.last_updated at toggle time; any newer stamp clears group overrides. */
  private _groupBase = '';
  /** Per-entity last_updated at volume-set time. */
  private _volumeBase: Record<string, string> = {};
  private _expiryTimer?: number;

  public static getStubConfig(hass: HomeAssistant): Partial<SilkMediaGroupCardConfig> {
    const ids = Object.keys(hass.states).filter((id) => id.startsWith('media_player.'));
    const entity = ids.find((id) => supportsFeature(hass.states[id], FEAT_GROUPING)) ?? ids[0];
    const players = ids.filter((id) => id !== entity).slice(0, 3);
    return { type: 'custom:silk-media-group-card', entity, players };
  }

  public static async getConfigElement(): Promise<HTMLElement> {
    return document.createElement(EDITOR_TAG);
  }

  public setConfig(config: SilkMediaGroupCardConfig): void {
    if (!config.entity || domainOf(config.entity) !== 'media_player') {
      throw new Error(
        'silk-media-group-card: define a media_player `entity` — the group master'
      );
    }
    if (config.players !== undefined) {
      if (
        !Array.isArray(config.players) ||
        config.players.some((p) => typeof p !== 'string' || domainOf(p) !== 'media_player')
      ) {
        throw new Error(
          'silk-media-group-card: `players` must be a list of media_player entity ids'
        );
      }
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
    if (!changed.has('hass') || !this._config || !this.hass) return;
    // Group overrides are truth-checked against the MASTER (group_members lives
    // there); volume overrides against each player's own state.
    if (Object.keys(this._optimisticGroup).length) {
      const stamp = this.hass.states[this._config.entity]?.last_updated;
      if (stamp !== undefined && stamp !== this._groupBase) this._optimisticGroup = {};
    }
    const stale = Object.keys(this._optimisticVolume).filter((id) => {
      const stamp = this.hass!.states[id]?.last_updated;
      return stamp !== undefined && stamp !== this._volumeBase[id];
    });
    if (stale.length) {
      const volumes = { ...this._optimisticVolume };
      for (const id of stale) {
        delete volumes[id];
        delete this._volumeBase[id];
      }
      this._optimisticVolume = volumes;
    }
  }

  private _clearOptimistic(): void {
    window.clearTimeout(this._expiryTimer);
    this._expiryTimer = undefined;
    this._optimisticGroup = {};
    this._optimisticVolume = {};
    this._volumeBase = {};
  }

  private _armExpiry(): void {
    window.clearTimeout(this._expiryTimer);
    this._expiryTimer = window.setTimeout(() => {
      this._expiryTimer = undefined;
      this._optimisticGroup = {};
      this._optimisticVolume = {};
      this._volumeBase = {};
    }, OPTIMISTIC_TTL_MS);
  }

  /** Membership shown on a checkbox: optimistic first, else the master's list. */
  private _isGrouped(playerId: string): boolean {
    const optimistic = this._optimisticGroup[playerId];
    if (optimistic !== undefined) return optimistic;
    const members = this._config
      ? this.hass?.states[this._config.entity]?.attributes.group_members
      : undefined;
    return Array.isArray(members) && members.includes(playerId);
  }

  /** Volume % shown on a slider: optimistic first, else the entity's level. */
  private _volumePct(stateObj: HassEntity): number {
    const optimistic = this._optimisticVolume[stateObj.entity_id];
    if (optimistic !== undefined) return optimistic;
    const level = stateObj.attributes.volume_level;
    return typeof level === 'number' && Number.isFinite(level)
      ? Math.round(clamp(level, 0, 1) * 100)
      : 0;
  }

  private _onCardClick(): void {
    if (this._config) moreInfo(this, this._config.entity);
  }

  /** The synthetic click after a slider drag must not open more-info. */
  private _stopClick(ev: Event): void {
    ev.stopPropagation();
  }

  private _onCheckToggle(ev: Event, playerId: string): void {
    ev.stopPropagation();
    const config = this._config;
    const hass = this.hass;
    if (!config || !hass) return;
    const master = hass.states[config.entity];
    if (!master || isUnavailable(master) || isUnavailable(hass.states[playerId])) return;
    const grouped = this._isGrouped(playerId);
    haptic(this);
    this._optimisticGroup = { ...this._optimisticGroup, [playerId]: !grouped };
    this._groupBase = master.last_updated;
    this._armExpiry();
    if (grouped) {
      hass.callService('media_player', 'unjoin', { entity_id: playerId });
    } else {
      // HA merges the new member into the master's existing group.
      hass.callService('media_player', 'join', {
        entity_id: config.entity,
        group_members: [playerId],
      });
    }
  }

  private _onVolumeChange(ev: CustomEvent<{ value: number }>, entityId: string): void {
    const hass = this.hass;
    if (!hass) return;
    const pct = clamp(Math.round(ev.detail.value), 0, 100);
    this._optimisticVolume = { ...this._optimisticVolume, [entityId]: pct };
    this._volumeBase[entityId] = hass.states[entityId]?.last_updated ?? '';
    this._armExpiry();
    haptic(this);
    hass.callService('media_player', 'volume_set', {
      entity_id: entityId,
      volume_level: pct / 100,
    });
  }

  private _renderPlayer(playerId: string, masterDead: boolean, canGroup: boolean): TemplateResult {
    const hass = this.hass!;
    const stateObj = hass.states[playerId] as HassEntity | undefined;
    const off = !stateObj || isUnavailable(stateObj);
    const checked = !off && this._isGrouped(playerId);
    const pname = stateObj?.attributes.friendly_name ?? playerId;
    const disabled = off || masterDead || !canGroup;
    const showVolume =
      checked && stateObj !== undefined && supportsFeature(stateObj, FEAT_VOLUME_SET);
    return html`
      <div class="player ${off ? 'off' : ''}">
        <button
          class="check ${checked ? 'checked' : ''}"
          role="checkbox"
          aria-checked=${checked ? 'true' : 'false'}
          aria-label=${checked ? `Ungroup ${pname}` : `Group ${pname}`}
          .disabled=${disabled}
          @click=${(ev: Event) => this._onCheckToggle(ev, playerId)}
        >
          <ha-icon icon="mdi:check"></ha-icon>
        </button>
        <div class="pname" title=${pname}>${pname}</div>
        ${showVolume
          ? html`
              <silk-slider
                class="pvol"
                .value=${this._volumePct(stateObj)}
                .min=${0}
                .max=${100}
                .step=${1}
                ?disabled=${off || masterDead}
                @change=${(ev: CustomEvent<{ value: number }>) =>
                  this._onVolumeChange(ev, playerId)}
                @click=${this._stopClick}
              ></silk-slider>
            `
          : nothing}
      </div>
    `;
  }

  protected render(): TemplateResult | typeof nothing {
    const config = this._config;
    const hass = this.hass;
    if (!config || !hass) return nothing;
    const master = hass.states[config.entity];
    if (!master) {
      return html`<ha-card><div class="warning">Entity not found: ${config.entity}</div></ha-card>`;
    }

    const unavailable = isUnavailable(master);
    const active = !unavailable && isActive(master);
    const accent = accentFor(master);
    const name = config.name ?? master.attributes.friendly_name ?? config.entity;
    const line2 = stringAttr(master, 'media_title') ?? stateText(hass, master);
    const canGroup = supportsFeature(master, FEAT_GROUPING);
    const showMasterVolume = supportsFeature(master, FEAT_VOLUME_SET);
    const candidates = (config.players ?? []).filter((id) => id !== config.entity);

    return html`
      <ha-card
        class="control ${unavailable ? 'unavailable' : ''}"
        style="--silk-accent:${accent}"
        @click=${this._onCardClick}
      >
        <div class="master">
          <div class="icon ${active ? 'on' : ''}">
            <ha-state-icon .hass=${hass} .stateObj=${master}></ha-state-icon>
          </div>
          <div class="info">
            <div class="name">${name}</div>
            <div class="state">${line2}</div>
          </div>
        </div>
        ${showMasterVolume
          ? html`
              <silk-slider
                class="mvol"
                .value=${this._volumePct(master)}
                .min=${0}
                .max=${100}
                .step=${1}
                ?disabled=${unavailable}
                @change=${(ev: CustomEvent<{ value: number }>) =>
                  this._onVolumeChange(ev, config.entity)}
                @click=${this._stopClick}
              ></silk-slider>
            `
          : nothing}
        ${candidates.length
          ? html`
              <div class="players">
                ${candidates.map((id) => this._renderPlayer(id, unavailable, canGroup))}
              </div>
            `
          : html`<div class="hint">Add players: in YAML to list group candidates.</div>`}
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
      .master {
        flex: none;
        display: flex;
        align-items: center;
        gap: 12px;
        min-width: 0;
      }
      /* No control action on the icon — it presses with the card (more-info). */
      .icon {
        cursor: pointer;
      }
      .icon:active {
        transform: none;
      }
      silk-slider.mvol {
        flex: none;
        --silk-slider-height: 30px;
        position: relative;
        z-index: 1;
      }
      .players {
        flex: none;
        display: flex;
        flex-direction: column;
        gap: 2px;
        min-width: 0;
      }
      .player {
        display: flex;
        align-items: center;
        gap: 10px;
        min-height: 32px;
        min-width: 0;
      }
      .check {
        flex: none;
        position: relative;
        width: 20px;
        height: 20px;
        border-radius: 50%;
        border: 2px solid rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.35);
        background: transparent;
        box-sizing: border-box;
        display: grid;
        place-items: center;
        padding: 0;
        cursor: pointer;
        transition:
          transform 250ms var(--silk-spring),
          background 200ms ease,
          border-color 200ms ease;
      }
      /* Invisible halo lifts the touch target to 40px without growing the box. */
      .check::after {
        content: '';
        position: absolute;
        inset: -10px;
        border-radius: 50%;
      }
      .check:active:not(:disabled) {
        transform: scale(0.88);
        transition-duration: 120ms;
        transition-timing-function: var(--silk-ease-out);
      }
      .check.checked {
        background: var(--silk-accent);
        border-color: var(--silk-accent);
      }
      .check ha-icon {
        --mdc-icon-size: 14px;
        color: var(--card-background-color, #fff);
        opacity: 0;
        transform: scale(0.6);
        transition:
          opacity 150ms ease,
          transform 250ms var(--silk-spring);
        pointer-events: none;
      }
      .check.checked ha-icon {
        opacity: 1;
        transform: scale(1);
      }
      .check:disabled {
        cursor: default;
        opacity: 0.4;
      }
      .check:focus-visible {
        outline: 2px solid color-mix(in srgb, var(--silk-accent) 70%, transparent);
        outline-offset: 2px;
      }
      .pname {
        flex: 1;
        min-width: 0;
        font-size: 13px;
        font-weight: 500;
        line-height: 1.3;
        color: var(--primary-text-color);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      silk-slider.pvol {
        flex: 0 1 120px;
        min-width: 64px;
        --silk-slider-height: 24px;
        position: relative;
        z-index: 1;
      }
      .player.off .check,
      .player.off .pname,
      .player.off .pvol {
        opacity: 0.45;
      }
      .hint {
        font-size: 12.5px;
        line-height: 1.3;
        color: var(--secondary-text-color);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .unavailable .mvol,
      .unavailable .players,
      .unavailable .hint {
        opacity: 0.45;
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    'silk-media-group-card': SilkMediaGroupCard;
  }
}
