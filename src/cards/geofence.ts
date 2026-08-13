import { LitElement, html, css, nothing, TemplateResult } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { HomeAssistant, HassEntity, LovelaceCardConfig } from '../types';
import { silkControlStyles } from '../shared/base';
import { domainOf, isUnavailable, moreInfo, haptic, stateText } from '../shared/service';
import { accentFor } from '../shared/color';
import { registerEditor } from '../shared/editor';

export const META = {
  type: 'silk-zones-card',
  name: 'Silk Zones',
  description: 'Who is where, by place.',
};

/** A place to group people under. `entity` is a `zone.*` id when there is one. */
export interface SilkZoneConfig {
  name?: string;
  entity?: string;
  icon?: string;
}

export interface SilkZonesCardConfig extends LovelaceCardConfig {
  /** Zones to list; omit to auto-discover every `zone.*` entity. */
  zones?: (string | SilkZoneConfig)[];
  /** person / device_tracker ids; omit to use every `person.*`. */
  people?: string[];
  name?: string;
  /** Accent override. */
  color?: string;
}

/** A zone after config, discovery and friendly names have been reconciled. */
interface ResolvedZone {
  key: string;
  label: string;
  icon: string;
  entity?: string;
}

interface PersonCell {
  entity: string;
  name: string;
  picture?: string;
  /** Where HA says they are, in words — the avatar's tooltip. */
  where: string;
  unavailable: boolean;
}

const AVATAR_SIZE = 32;
const DEFAULT_NAME = 'Zones';
const AWAY_KEY = '__away__';
const DEFAULT_ZONE_ICON = 'mdi:map-marker';
/** States that mean "in no zone at all". */
const AWAY_STATES = new Set(['not_home', 'unknown', 'unavailable', '']);

const EDITOR_TAG = 'silk-zones-card-editor';

// Zones stay YAML-only — they are objects with an optional icon, and the
// default (auto-discovering every zone) is already the right answer for most.
registerEditor(
  EDITOR_TAG,
  [
    { name: 'name', selector: { text: {} } },
    {
      name: 'people',
      selector: { entity: { multiple: true, domain: ['person', 'device_tracker'] } },
    },
  ],
  { name: 'Name', people: 'People (empty = every person)' }
);

/** `front_garden` → `Front garden`, for zones with no friendly name. */
function prettify(slug: string): string {
  const spaced = slug.replace(/_/g, ' ').trim();
  return spaced ? spaced.charAt(0).toUpperCase() + spaced.slice(1) : slug;
}

/**
 * Presence turned inside out: places first, people second. Every zone is a
 * section; whoever HA reports inside it stands under its header, and the Away
 * group catches everyone else.
 */
@customElement('silk-zones-card')
export class SilkZonesCard extends LitElement {
  @property({ attribute: false }) public hass?: HomeAssistant;

  @state() private _config?: SilkZonesCardConfig;
  /** entity_picture URLs that failed to load → fall back to the initial. */
  @state() private _broken: ReadonlySet<string> = new Set();

  private _zoneConfigs: SilkZoneConfig[] = [];

  public static getStubConfig(): Partial<SilkZonesCardConfig> {
    // No config needed: zones and people are both discovered.
    return { type: 'custom:silk-zones-card' };
  }

  public static async getConfigElement(): Promise<HTMLElement> {
    return document.createElement(EDITOR_TAG);
  }

  public setConfig(config: SilkZonesCardConfig): void {
    if (config.zones !== undefined && !Array.isArray(config.zones)) {
      throw new Error('silk-zones-card: `zones` must be a list of {name, entity, icon}');
    }
    this._zoneConfigs = (config.zones ?? []).map((item): SilkZoneConfig => {
      if (typeof item === 'string') {
        // A bare string is either a zone entity id or just a place name.
        return item.includes('.') ? { entity: item } : { name: item };
      }
      if (!item || (typeof item.name !== 'string' && typeof item.entity !== 'string')) {
        throw new Error('silk-zones-card: every entry in `zones` needs a `name` or an `entity`');
      }
      if (item.entity !== undefined && domainOf(item.entity) !== 'zone') {
        throw new Error(`silk-zones-card: \`${item.entity}\` is not a zone entity`);
      }
      return item;
    });
    if (config.people !== undefined) {
      if (!Array.isArray(config.people)) {
        throw new Error('silk-zones-card: `people` must be a list of person/device_tracker ids');
      }
      for (const id of config.people) {
        const domain = typeof id === 'string' ? domainOf(id) : '';
        if (domain !== 'person' && domain !== 'device_tracker') {
          throw new Error(
            `silk-zones-card: \`${String(id)}\` is not a person or device_tracker entity`
          );
        }
      }
    }
    this._config = config;
    this._broken = new Set();
  }

  public getCardSize(): number {
    return 3;
  }

  public getGridOptions(): Record<string, number> {
    return { columns: 6, rows: 3, min_columns: 4, min_rows: 2 };
  }

  /** Configured zones, or every `zone.*` entity with home leading. */
  private _zones(hass: HomeAssistant): ResolvedZone[] {
    if (this._zoneConfigs.length) {
      const out: ResolvedZone[] = [];
      for (const item of this._zoneConfigs) {
        const stateObj = item.entity ? hass.states[item.entity] : undefined;
        const label =
          item.name ??
          stateObj?.attributes.friendly_name ??
          (item.entity ? prettify(item.entity.split('.')[1] ?? item.entity) : '');
        if (!label) continue;
        out.push({
          key: item.entity ?? label.toLowerCase(),
          label,
          icon: item.icon ?? stateObj?.attributes.icon ?? DEFAULT_ZONE_ICON,
          entity: item.entity,
        });
      }
      return out;
    }
    return Object.keys(hass.states)
      .filter((id) => id.startsWith('zone.'))
      .map((id): ResolvedZone => {
        const stateObj = hass.states[id];
        return {
          key: id,
          label: stateObj.attributes.friendly_name ?? prettify(id.split('.')[1] ?? id),
          icon: stateObj.attributes.icon ?? (id === 'zone.home' ? 'mdi:home' : DEFAULT_ZONE_ICON),
          entity: id,
        };
      })
      .sort((a, b) => {
        // Home is where the day starts, so it leads; the rest are alphabetical.
        const homeA = a.entity === 'zone.home' ? 0 : 1;
        const homeB = b.entity === 'zone.home' ? 0 : 1;
        return homeA - homeB || a.label.localeCompare(b.label);
      });
  }

  /** Configured people, or every `person.*` sorted by name. */
  private _peopleIds(hass: HomeAssistant): string[] {
    const configured = this._config?.people;
    if (configured && configured.length) return configured;
    return Object.keys(hass.states)
      .filter((id) => id.startsWith('person.'))
      .sort((a, b) =>
        String(hass.states[a].attributes.friendly_name ?? a).localeCompare(
          String(hass.states[b].attributes.friendly_name ?? b)
        )
      );
  }

  /** Where HA says this person is, in words — 'Home', 'Work', 'Away'. */
  private _whereText(hass: HomeAssistant, stateObj: HassEntity): string {
    if (isUnavailable(stateObj)) return 'unavailable';
    if (stateObj.state === 'not_home') return 'Away';
    if (hass.formatEntityState) return stateText(hass, stateObj);
    return stateObj.state === 'home' ? 'Home' : stateObj.state.replace(/_/g, ' ');
  }

  /**
   * Person/device_tracker states carry the *zone's name*, so matching is a
   * case-insensitive name comparison (with the zone's object id as a fallback
   * for slug-shaped states).
   */
  private _zoneKeyFor(zones: ResolvedZone[], stateObj: HassEntity): string {
    const raw = stateObj.state.trim().toLowerCase();
    if (isUnavailable(stateObj) || AWAY_STATES.has(raw)) return AWAY_KEY;
    const slug = raw.replace(/\s+/g, '_');
    for (const zone of zones) {
      if (zone.label.trim().toLowerCase() === raw) return zone.key;
      const objectId = zone.entity?.split('.')[1]?.toLowerCase();
      if (objectId && objectId === slug) return zone.key;
    }
    return AWAY_KEY;
  }

  private _onPersonClick(ev: Event, entityId: string): void {
    ev.stopPropagation();
    haptic(this, 'selection');
    moreInfo(this, entityId);
  }

  private _onImgError(url: string): void {
    const next = new Set(this._broken);
    next.add(url);
    this._broken = next;
  }

  private _renderPerson(cell: PersonCell, inZone: boolean): TemplateResult {
    const initial = (Array.from(cell.name.trim())[0] ?? '?').toUpperCase();
    const title = `${cell.name} · ${cell.where}`;
    return html`
      <button
        class="cell ${cell.unavailable ? 'na' : ''}"
        title=${title}
        aria-label=${title}
        @click=${(ev: Event) => this._onPersonClick(ev, cell.entity)}
      >
        <span class="avatar ${inZone ? 'here' : 'away'}">
          ${cell.picture
            ? html`<img
                src=${cell.picture}
                alt=${cell.name}
                loading="lazy"
                @error=${() => this._onImgError(cell.picture!)}
              />`
            : html`<span class="initial">${initial}</span>`}
        </span>
        <span class="pname">${cell.name}</span>
      </button>
    `;
  }

  private _renderGroup(
    label: string,
    icon: string,
    cells: PersonCell[],
    inZone: boolean
  ): TemplateResult {
    return html`
      <section class="group">
        <div class="ghead">
          <ha-icon class="gicon" .icon=${icon}></ha-icon>
          <span class="glabel" title=${label}>${label}</span>
          <span class="chip ${inZone && cells.length ? 'active' : ''}">${cells.length}</span>
        </div>
        ${cells.length
          ? html`<div class="people">
              ${cells.map((cell) => this._renderPerson(cell, inZone))}
            </div>`
          : html`<div class="none">Nobody here</div>`}
      </section>
    `;
  }

  protected render(): TemplateResult | typeof nothing {
    const config = this._config;
    const hass = this.hass;
    if (!config || !hass) return nothing;

    const zones = this._zones(hass);
    const peopleIds = this._peopleIds(hass).filter((id) => hass.states[id]);
    const accent = accentFor(hass.states[peopleIds[0]], config.color);
    const name = config.name ?? DEFAULT_NAME;

    const buckets = new Map<string, PersonCell[]>();
    for (const zone of zones) buckets.set(zone.key, []);
    buckets.set(AWAY_KEY, []);
    for (const id of peopleIds) {
      const stateObj = hass.states[id];
      const rawPicture = stateObj.attributes.entity_picture;
      const picture =
        typeof rawPicture === 'string' && rawPicture && !this._broken.has(rawPicture)
          ? rawPicture
          : undefined;
      const cell: PersonCell = {
        entity: id,
        name: stateObj.attributes.friendly_name ?? id.split('.')[1] ?? id,
        picture,
        where: this._whereText(hass, stateObj),
        unavailable: isUnavailable(stateObj),
      };
      const key = this._zoneKeyFor(zones, stateObj);
      (buckets.get(key) ?? buckets.get(AWAY_KEY)!).push(cell);
    }
    const away = buckets.get(AWAY_KEY) ?? [];
    const allUnavailable =
      peopleIds.length > 0 && peopleIds.every((id) => isUnavailable(hass.states[id]));

    return html`
      <ha-card
        class="control ${allUnavailable ? 'unavailable' : ''}"
        style="--silk-accent:${accent}"
      >
        <div class="header">
          <div class="hname" title=${name}>${name}</div>
          ${peopleIds.length
            ? html`<div class="summary">
                <span class="scount">${peopleIds.length - away.length}</span> in a zone
              </div>`
            : nothing}
        </div>
        <div class="groups">
          ${peopleIds.length === 0
            ? html`<div class="note">No people found — add \`people:\` to the card config</div>`
            : zones.length === 0
              ? html`<div class="note">No zones found — add \`zones:\` to the card config</div>`
              : html`
                  ${zones.map((zone) =>
                    this._renderGroup(zone.label, zone.icon, buckets.get(zone.key) ?? [], true)
                  )}
                  ${this._renderGroup('Away', 'mdi:map-marker-off', away, false)}
                `}
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
        gap: 8px;
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
      .hname {
        flex: 1;
        min-width: 0;
        font-size: 13px;
        font-weight: 600;
        color: var(--secondary-text-color);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .summary {
        flex: none;
        font-size: 12px;
        color: var(--secondary-text-color);
        white-space: nowrap;
        font-variant-numeric: tabular-nums;
      }
      .scount {
        font-weight: 600;
        color: var(--silk-accent);
      }
      .groups {
        flex: 1;
        min-height: 0;
        display: flex;
        flex-direction: column;
        gap: 10px;
        overflow: hidden;
      }
      .group {
        flex: none;
        display: flex;
        flex-direction: column;
        gap: 6px;
        min-width: 0;
      }
      .ghead {
        display: flex;
        align-items: center;
        gap: 7px;
        min-width: 0;
      }
      .gicon {
        flex: none;
        --mdc-icon-size: 15px;
        color: var(--secondary-text-color);
        opacity: 0.8;
      }
      .glabel {
        flex: 1;
        min-width: 0;
        font-size: 12.5px;
        font-weight: 600;
        line-height: 1.3;
        color: var(--primary-text-color);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      /* The count chip is a label, not a button. */
      .chip {
        flex: none;
        cursor: default;
        pointer-events: none;
        font-variant-numeric: tabular-nums;
        line-height: 1;
      }
      .people {
        display: flex;
        flex-wrap: wrap;
        align-items: flex-start;
        gap: 8px 10px;
        min-width: 0;
      }
      .cell {
        flex: none;
        width: 48px;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 3px;
        margin: 0;
        padding: 0;
        border: none;
        background: none;
        font: inherit;
        color: inherit;
        cursor: pointer;
        outline: none;
      }
      .cell.na {
        opacity: 0.45;
      }
      .avatar {
        flex: none;
        width: ${AVATAR_SIZE}px;
        height: ${AVATAR_SIZE}px;
        border-radius: 50%;
        overflow: hidden;
        display: grid;
        place-items: center;
        user-select: none;
        background: rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.06);
        color: var(--secondary-text-color);
        /* Hard 2px ring, zero blur — a border, not a glow. */
        box-shadow: 0 0 0 2px rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.35);
        transition:
          transform 250ms var(--silk-spring),
          box-shadow 200ms ease,
          background 200ms ease,
          color 200ms ease;
      }
      .cell:active .avatar {
        transform: scale(0.92);
        transition-duration: 120ms;
        transition-timing-function: var(--silk-ease-out);
      }
      .cell:focus-visible .avatar {
        box-shadow: 0 0 0 2px color-mix(in srgb, var(--silk-accent) 70%, transparent);
      }
      .avatar.here {
        box-shadow: 0 0 0 2px var(--silk-accent);
        background: color-mix(in srgb, var(--silk-accent) 20%, transparent);
        color: var(--silk-accent);
      }
      .avatar img {
        width: 100%;
        height: 100%;
        object-fit: cover;
        display: block;
        transition:
          filter 200ms ease,
          opacity 200ms ease;
      }
      /* Away reads as absence: the portrait goes monochrome, no color needed. */
      .avatar.away img {
        filter: grayscale(1);
        opacity: 0.7;
      }
      .initial {
        font-size: 13px;
        font-weight: 600;
        line-height: 1;
      }
      .pname {
        max-width: 100%;
        font-size: 10px;
        line-height: 1.2;
        color: var(--secondary-text-color);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .none {
        font-size: 11.5px;
        line-height: 1.3;
        color: var(--secondary-text-color);
        opacity: 0.7;
        white-space: nowrap;
      }
      .note {
        font-size: 12.5px;
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
    'silk-zones-card': SilkZonesCard;
  }
}
