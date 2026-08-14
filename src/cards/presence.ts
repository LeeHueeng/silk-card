import { LitElement, html, css, nothing, TemplateResult } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { HomeAssistant, HassEntity, LovelaceCardConfig } from '../types';
import { silkControlStyles } from '../shared/base';
import { domainOf, isUnavailable, moreInfo, stateText } from '../shared/service';
import { accentFor } from '../shared/color';
import {
  EntityItem,
  EntityListConfig,
  entityListSelector,
  normalizeEntityList,
} from '../shared/list';
import { registerListEditor } from '../shared/listeditor';

export const META = {
  type: 'silk-presence-card',
  name: 'Silk Family',
  description: "Everyone's whereabouts in one strip.",
};

export interface SilkPresenceCardConfig extends LovelaceCardConfig {
  /**
   * person.* / device_tracker.* — plain ids from the picker, or
   * `{entity, name, icon, color}` when YAML wants to relabel a face.
   */
  entities: EntityListConfig;
  name?: string;
}

const AVATAR_SIZE = 44;

const EDITOR_TAG = 'silk-presence-card-editor';

const EDITOR_LABELS: Record<string, string> = {
  entities: '사람',
  name: '이름',
};

/**
 * One schema, the picker always on screen. A hand-written
 * `{entity, name, icon, color}` face reaches the form as a bare id and the
 * picked ids are folded back into the stored list on change, so relabelled
 * people keep their detail; keys the schema never mentions pass through.
 */
const EDITOR_SCHEMA = [
  entityListSelector('entities', ['person', 'device_tracker']),
  { name: 'name', selector: { text: {} } },
];

registerListEditor(EDITOR_TAG, {
  schema: EDITOR_SCHEMA,
  labels: EDITOR_LABELS,
  listFields: ['entities'],
});

/**
 * The family strip: one 44px avatar per person. Home reads as presence —
 * full color inside an accent ring; away drains to grayscale behind a faint
 * ring. The zone label under each face answers "where?" without a tap.
 */
@customElement('silk-presence-card')
export class SilkPresenceCard extends LitElement {
  @property({ attribute: false }) public hass?: HomeAssistant;

  @state() private _config?: SilkPresenceCardConfig;

  /** entity_picture URLs that failed to load → fall back to the initial. */
  @state() private _broken: ReadonlySet<string> = new Set();

  /** Both config shapes, flattened to objects once at setConfig time. */
  private _people: EntityItem[] = [];

  public static getStubConfig(hass: HomeAssistant): Partial<SilkPresenceCardConfig> {
    const entities = Object.keys(hass.states).filter((id) => id.startsWith('person.'));
    return { type: 'custom:silk-presence-card', entities };
  }

  public static async getConfigElement(): Promise<HTMLElement> {
    return document.createElement(EDITOR_TAG);
  }

  public setConfig(config: SilkPresenceCardConfig): void {
    if (!Array.isArray(config.entities) || config.entities.length === 0) {
      throw new Error(
        'silk-presence-card: `entities` is required — a list of person/device_tracker ids'
      );
    }
    // Validate the raw entries so a typo still throws, whichever shape it is in.
    for (const entry of config.entities) {
      const id = typeof entry === 'string' ? entry : entry?.entity;
      const domain = typeof id === 'string' ? domainOf(id) : '';
      if (domain !== 'person' && domain !== 'device_tracker') {
        throw new Error(
          `silk-presence-card: \`${String(id ?? entry)}\` is not a person or device_tracker entity`
        );
      }
    }
    this._config = config;
    this._people = normalizeEntityList(config.entities);
    this._broken = new Set();
  }

  public getCardSize(): number {
    return 2;
  }

  public getGridOptions(): Record<string, number> {
    return { columns: 6, rows: 1, min_columns: 3, min_rows: 1 };
  }

  /** 'Home' / 'Away' / zone name — localized when hass provides a formatter. */
  private _zone(hass: HomeAssistant, stateObj: HassEntity): string {
    if (hass.formatEntityState) return stateText(hass, stateObj);
    switch (stateObj.state) {
      case 'home':
        return 'Home';
      case 'not_home':
        return 'Away';
      default:
        return stateObj.state.replace(/_/g, ' ');
    }
  }

  private _onPersonClick(ev: Event, entityId: string): void {
    ev.stopPropagation();
    moreInfo(this, entityId);
  }

  private _onImgError(url: string): void {
    const next = new Set(this._broken);
    next.add(url);
    this._broken = next;
  }

  private _renderPerson(item: EntityItem): TemplateResult {
    const hass = this.hass!;
    const entityId = item.entity;
    const stateObj = hass.states[entityId];
    const name: string =
      item.name ?? stateObj?.attributes.friendly_name ?? entityId.split('.')[1] ?? entityId;
    const unavailable = isUnavailable(stateObj);
    const home = !unavailable && stateObj.state === 'home';
    const rawPicture = stateObj?.attributes.entity_picture;
    // A hand-written icon is an explicit choice — it outranks the profile photo.
    const picture =
      !item.icon && typeof rawPicture === 'string' && rawPicture && !this._broken.has(rawPicture)
        ? rawPicture
        : undefined;
    const initial = (Array.from(name.trim())[0] ?? '?').toUpperCase();
    const zone = stateObj ? this._zone(hass, stateObj) : '—';

    let face: TemplateResult;
    if (picture) {
      face = html`<img
        src=${picture}
        alt=${name}
        loading="lazy"
        @error=${() => this._onImgError(picture)}
      />`;
    } else if (item.icon) {
      face = html`<ha-icon .icon=${item.icon}></ha-icon>`;
    } else {
      face = html`<span class="initial">${initial}</span>`;
    }

    return html`
      <button
        class="cell ${unavailable ? 'unavailable' : ''}"
        style=${item.color ? `--silk-accent:${item.color}` : nothing}
        aria-label=${`${name}: ${zone}`}
        title=${name}
        @click=${(ev: Event) => this._onPersonClick(ev, entityId)}
      >
        <span class="avatar ${home ? 'home' : 'away'}">${face}</span>
        <span class="zone">${zone}</span>
      </button>
    `;
  }

  protected render(): TemplateResult | typeof nothing {
    const config = this._config;
    const hass = this.hass;
    if (!config || !hass) return nothing;

    const people = this._people;
    const homeCount = people.filter(
      (item) => hass.states[item.entity]?.state === 'home'
    ).length;
    // Accent from the first tracked person: presence green, theme-overridable.
    const first = people[0];
    const accent = accentFor(first ? hass.states[first.entity] : undefined, first?.color);
    const summary = html`
      <div class="summary">
        <span class="count ${homeCount > 0 ? 'some' : ''}">${homeCount}</span> home
      </div>
    `;

    return html`
      <ha-card class="control" style="--silk-accent:${accent}">
        ${config.name
          ? html`<div class="header">
              <div class="hname">${config.name}</div>
              ${summary}
            </div>`
          : nothing}
        <div class="strip">
          <div class="people">${people.map((item) => this._renderPerson(item))}</div>
          ${config.name ? nothing : summary}
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
        padding: 10px 14px;
        cursor: default;
      }
      .header {
        display: flex;
        align-items: center;
        gap: 8px;
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
      .strip {
        display: flex;
        align-items: center;
        gap: 12px;
        min-width: 0;
      }
      .people {
        flex: 1;
        min-width: 0;
        display: flex;
        flex-wrap: wrap;
        align-items: flex-start;
        gap: 8px 10px;
      }
      .cell {
        flex: none;
        width: 56px;
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
      .cell.unavailable {
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
        box-shadow: 0 0 0 2px rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.45);
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
      .avatar.home {
        box-shadow: 0 0 0 2px var(--silk-accent);
        background: color-mix(in srgb, var(--silk-accent) 20%, transparent);
        color: var(--silk-accent);
      }
      .avatar img {
        width: 100%;
        height: 100%;
        object-fit: cover;
        display: block;
        transition: filter 200ms ease, opacity 200ms ease;
      }
      /* Away reads as absence: the portrait goes monochrome, no color needed. */
      .avatar.away img {
        filter: grayscale(1);
        opacity: 0.7;
      }
      .avatar ha-icon {
        --mdc-icon-size: 22px;
      }
      .initial {
        font-size: 18px;
        font-weight: 600;
        line-height: 1;
      }
      .zone {
        max-width: 100%;
        font-size: 10px;
        line-height: 1.2;
        color: var(--secondary-text-color);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .summary {
        flex: none;
        font-size: 13px;
        color: var(--secondary-text-color);
        white-space: nowrap;
        font-variant-numeric: tabular-nums;
      }
      .count.some {
        color: var(--silk-accent);
        font-weight: 600;
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    'silk-presence-card': SilkPresenceCard;
  }
}
