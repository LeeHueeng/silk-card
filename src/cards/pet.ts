import { LitElement, html, css, nothing, TemplateResult } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { HomeAssistant, HassEntity, LovelaceCardConfig } from '../types';
import { silkControlStyles } from '../shared/base';
import { domainOf, isUnavailable, toggleEntity, moreInfo, haptic } from '../shared/service';
import { accentFor } from '../shared/color';
import { registerEditor } from '../shared/editor';
import { formatNumber } from '../format';

export const META = {
  type: 'silk-pet-card',
  name: 'Silk Pet',
  description: 'Fed, walked, and when.',
};

export interface SilkPetMealConfig {
  /** button / input_button / script / input_boolean pressed when the meal is served. */
  entity: string;
  label: string;
}

export interface SilkPetConfig {
  name: string;
  /** Photo URL; falls back to `icon` when it fails to load. */
  photo?: string;
  icon?: string;
  meals?: SilkPetMealConfig[];
  /** Entity pressed when the walk happens. */
  walk?: string;
  /** Weight sensor, shown at the end of the state line. */
  weight?: string;
}

export interface SilkPetCardConfig extends LovelaceCardConfig {
  /** YAML-only: usually one pet, but the card takes a household. */
  pets: SilkPetConfig[];
  name?: string;
}

/** One action chip: an entity to press and the word on it. */
interface Action {
  entityId: string;
  label: string;
}

const DEFAULT_ICON = 'mdi:paw';
const MINUTE_MS = 60_000;
const HOUR_MS = 3_600_000;
const DAY_MS = 86_400_000;
const OPTIMISTIC_TIMEOUT_MS = 2000;
/** Relative labels are minute-grained at their finest. */
const TICK_MS = MINUTE_MS;
/** Beyond this the row stops pretending it knows the hour. */
const STALE_DAYS = 14;

const EDITOR_TAG = 'silk-pet-card-editor';

// Pets are a YAML block (photo + meals + walk per pet); the editor owns the title.
registerEditor(
  EDITOR_TAG,
  [{ name: 'name', selector: { text: {} } }],
  { name: 'Name' },
  { name: 'Pets' }
);

/**
 * When an action entity last fired. Buttons and scenes state the timestamp
 * outright; everything else is dated by its last state change.
 */
function lastFired(stateObj?: HassEntity): number | null {
  if (!stateObj || isUnavailable(stateObj)) return null;
  const domain = domainOf(stateObj.entity_id);
  if (
    domain === 'button' ||
    domain === 'input_button' ||
    domain === 'scene' ||
    stateObj.attributes.device_class === 'timestamp'
  ) {
    const ms = Date.parse(stateObj.state);
    return Number.isFinite(ms) ? ms : null;
  }
  const ms = Date.parse(stateObj.last_changed);
  return Number.isFinite(ms) ? ms : null;
}

/** 'just now' · '20m ago' · '3h ago' · '2d ago'. */
function relative(ms: number, now: number): string {
  const diff = Math.max(0, now - ms);
  if (diff < MINUTE_MS) return 'just now';
  if (diff < HOUR_MS) return `${Math.floor(diff / MINUTE_MS)}m ago`;
  if (diff < DAY_MS) return `${Math.floor(diff / HOUR_MS)}h ago`;
  return `${Math.floor(diff / DAY_MS)}d ago`;
}

/**
 * One pet, one question: has anyone fed and walked them yet? The state line is
 * relative time only — the exact clock time of breakfast is never what you are
 * asking. Chips do the two things you would otherwise open an app for.
 */
@customElement('silk-pet-card')
export class SilkPetCard extends LitElement {
  @property({ attribute: false }) public hass?: HomeAssistant;

  @state() private _config?: SilkPetCardConfig;
  /** Clock the relative labels are resolved against. */
  @state() private _now = Date.now();
  /** Optimistic 'just now' stamps by entity id. */
  @state() private _pressed: Record<string, number> = {};
  /** Photo URLs that failed to load → fall back to the icon. */
  @state() private _broken: Record<string, boolean> = {};

  private _tickTimer?: number;
  private _pressTimer?: number;

  public static getStubConfig(hass: HomeAssistant): Partial<SilkPetCardConfig> {
    const ids = Object.keys(hass.states);
    const pressable = (re: RegExp) =>
      ids.find(
        (id) =>
          (id.startsWith('button.') ||
            id.startsWith('input_button.') ||
            id.startsWith('script.') ||
            id.startsWith('input_boolean.')) &&
          re.test(id)
      );
    const feed = pressable(/feed|food|meal|kibble/i);
    const walk = pressable(/walk|outside|garden/i);
    return {
      type: 'custom:silk-pet-card',
      pets: [
        {
          name: 'Pet',
          icon: DEFAULT_ICON,
          meals: feed ? [{ entity: feed, label: 'Feed' }] : [],
          walk,
        },
      ],
    };
  }

  public static async getConfigElement(): Promise<HTMLElement> {
    return document.createElement(EDITOR_TAG);
  }

  public setConfig(config: SilkPetCardConfig): void {
    if (!Array.isArray(config.pets) || config.pets.length === 0) {
      throw new Error('silk-pet-card: `pets` is required — a list of {name, meals?, walk?}');
    }
    config.pets.forEach((pet, i) => {
      if (!pet || typeof pet.name !== 'string' || pet.name.trim() === '') {
        throw new Error(`silk-pet-card: pets[${i}] needs a \`name\``);
      }
      if (pet.meals !== undefined) {
        if (!Array.isArray(pet.meals)) {
          throw new Error(`silk-pet-card: pets[${i}].meals must be a list of {entity, label}`);
        }
        pet.meals.forEach((meal, j) => {
          if (!meal || typeof meal.entity !== 'string' || meal.entity === '') {
            throw new Error(`silk-pet-card: pets[${i}].meals[${j}] needs an \`entity\``);
          }
        });
      }
      if (pet.walk !== undefined && typeof pet.walk !== 'string') {
        throw new Error(`silk-pet-card: pets[${i}].walk must be an entity id`);
      }
      if (pet.weight !== undefined && typeof pet.weight !== 'string') {
        throw new Error(`silk-pet-card: pets[${i}].weight must be a sensor entity id`);
      }
    });
    this._config = config;
    this._now = Date.now();
    this._pressed = {};
    this._broken = {};
  }

  public getCardSize(): number {
    return 2;
  }

  public getGridOptions(): Record<string, number> {
    return { columns: 6, rows: 2, min_columns: 4, min_rows: 2 };
  }

  public connectedCallback(): void {
    super.connectedCallback();
    this._now = Date.now();
    this._tickTimer = window.setInterval(() => {
      this._now = Date.now();
    }, TICK_MS);
  }

  public disconnectedCallback(): void {
    super.disconnectedCallback();
    window.clearInterval(this._tickTimer);
    this._tickTimer = undefined;
    window.clearTimeout(this._pressTimer);
    this._pressTimer = undefined;
  }

  /** Latest of the real stamp and any optimistic press still standing. */
  private _firedAt(entityId?: string): number | null {
    if (!entityId) return null;
    const real = lastFired(this.hass?.states[entityId]);
    const pressed = this._pressed[entityId];
    if (real === null) return pressed ?? null;
    return pressed !== undefined && pressed > real ? pressed : real;
  }

  private _meals(pet: SilkPetConfig): SilkPetMealConfig[] {
    return (pet.meals ?? []).filter((meal) => typeof meal?.entity === 'string' && meal.entity);
  }

  private _actions(pet: SilkPetConfig): Action[] {
    const meals = this._meals(pet).map((meal) => ({
      entityId: meal.entity,
      label: meal.label?.trim() || 'Feed',
    }));
    return pet.walk ? [...meals, { entityId: pet.walk, label: 'Walk' }] : meals;
  }

  /** The entity a tap on the pet's row should open. */
  private _primary(pet: SilkPetConfig): string | undefined {
    return this._meals(pet)[0]?.entity ?? pet.walk ?? pet.weight;
  }

  /** Every entity this pet was given — used for the unavailable verdict. */
  private _tracked(pet: SilkPetConfig): string[] {
    return [...this._meals(pet).map((meal) => meal.entity), pet.walk, pet.weight].filter(
      (id): id is string => typeof id === 'string' && id !== ''
    );
  }

  private _weight(pet: SilkPetConfig): string | null {
    const hass = this.hass;
    if (!pet.weight || !hass) return null;
    const stateObj = hass.states[pet.weight];
    if (!stateObj || isUnavailable(stateObj) || stateObj.state === '') return null;
    const value = Number(stateObj.state);
    if (!Number.isFinite(value)) return null;
    const unit = String(stateObj.attributes.unit_of_measurement ?? '').trim();
    return `${formatNumber(hass, pet.weight, value)}${unit ? ` ${unit}` : ''}`;
  }

  private _onRowClick(pet: SilkPetConfig): void {
    const entityId = this._primary(pet);
    if (entityId) moreInfo(this, entityId);
  }

  private _onImgError(pet: SilkPetConfig): void {
    this._broken = { ...this._broken, [pet.name]: true };
  }

  private _onAction(ev: Event, entityId: string): void {
    ev.stopPropagation();
    const hass = this.hass;
    if (!hass) return;
    const stateObj = hass.states[entityId];
    if (!stateObj || isUnavailable(stateObj)) return;
    haptic(this, 'success');
    // Optimistic 'just now'; the real stamp lands within a beat and wins.
    this._pressed = { ...this._pressed, [entityId]: Date.now() };
    window.clearTimeout(this._pressTimer);
    this._pressTimer = window.setTimeout(() => {
      this._pressed = {};
      this._pressTimer = undefined;
    }, OPTIMISTIC_TIMEOUT_MS);
    // A script is an action, never a switch: re-running it is the point, so it
    // is always turn_on. Everything else follows HA's own toggle semantics.
    const call =
      domainOf(entityId) === 'script'
        ? hass.callService('script', 'turn_on', { entity_id: entityId })
        : toggleEntity(hass, entityId);
    Promise.resolve(call).catch((err) => {
      console.warn('silk-pet-card: action failed', err);
      const pressed = { ...this._pressed };
      delete pressed[entityId];
      this._pressed = pressed;
    });
  }

  /** 'fed 3h ago · walked 1h ago · 4.2 kg'. */
  private _stateLine(pet: SilkPetConfig): TemplateResult | string {
    const segments: string[] = [];
    const mealStamps = this._meals(pet)
      .map((meal) => this._firedAt(meal.entity))
      .filter((ms): ms is number => ms !== null);
    if (mealStamps.length) {
      const latest = Math.max(...mealStamps);
      segments.push(
        this._now - latest > STALE_DAYS * DAY_MS ? 'not fed lately' : `fed ${relative(latest, this._now)}`
      );
    }
    const walked = this._firedAt(pet.walk);
    if (walked !== null) {
      segments.push(
        this._now - walked > STALE_DAYS * DAY_MS
          ? 'not walked lately'
          : `walked ${relative(walked, this._now)}`
      );
    }
    const weight = this._weight(pet);
    if (weight) segments.push(weight);
    if (!segments.length) return 'Nothing logged yet';
    return html`${segments.map((text, i) =>
      i === 0 ? html`${text}` : html`<span class="sep">·</span>${text}`
    )}`;
  }

  private _renderPet(pet: SilkPetConfig): TemplateResult {
    const hass = this.hass;
    const actions = this._actions(pet);
    const photo = pet.photo && !this._broken[pet.name] ? pet.photo : undefined;
    const primary = this._primary(pet);
    // Only a pet whose every entity has gone dark reads as unavailable — one
    // dead feeder button must not grey out a walk we still know about.
    const tracked = this._tracked(pet);
    const gone = tracked.length > 0 && tracked.every((id) => isUnavailable(hass?.states[id]));
    return html`
      <div class="pet ${gone ? 'gone' : ''}">
        <button
          class="body ${primary ? '' : 'static'}"
          title=${pet.name}
          aria-label=${pet.name}
          .disabled=${!primary}
          @click=${() => this._onRowClick(pet)}
        >
          <span class="avatar">
            ${photo
              ? html`<img
                  src=${photo}
                  alt=${pet.name}
                  loading="lazy"
                  @error=${() => this._onImgError(pet)}
                />`
              : html`<ha-icon .icon=${pet.icon ?? DEFAULT_ICON}></ha-icon>`}
          </span>
          <span class="info">
            <span class="name">${pet.name}</span>
            <span class="state">${this._stateLine(pet)}</span>
          </span>
        </button>
        ${actions.length
          ? html`
              <div class="chips">
                ${actions.map((action) => {
                  const disabled = isUnavailable(hass?.states[action.entityId]);
                  return html`
                    <button
                      class="act"
                      title=${`${action.label} — ${action.entityId}`}
                      aria-label=${`${action.label} ${pet.name}`}
                      .disabled=${disabled}
                      @click=${(ev: Event) => this._onAction(ev, action.entityId)}
                    >
                      ${action.label}
                    </button>
                  `;
                })}
              </div>
            `
          : nothing}
      </div>
    `;
  }

  protected render(): TemplateResult | typeof nothing {
    const config = this._config;
    const hass = this.hass;
    if (!config || !hass) return nothing;

    const firstId = config.pets.map((pet) => this._primary(pet)).find((id) => id !== undefined);
    const accent = accentFor(firstId ? hass.states[firstId] : undefined);
    // With one pet the pet's own name is the title; a second line would only
    // repeat it. A household, or a title that says something else, earns one.
    const showTitle =
      Boolean(config.name) && (config.pets.length > 1 || config.name !== config.pets[0].name);

    return html`
      <ha-card class="control" style="--silk-accent:${accent}">
        ${showTitle
          ? html`<div class="title" title=${config.name}>${config.name}</div>`
          : nothing}
        ${config.pets.map((pet) => this._renderPet(pet))}
      </ha-card>
    `;
  }

  static styles = [
    silkControlStyles,
    css`
      /* A roster card: it grows with its pets and presses nowhere as a whole. */
      ha-card {
        flex-direction: column;
        align-items: stretch;
        justify-content: center;
        gap: 8px;
        height: auto;
        min-height: 100%;
        cursor: default;
      }
      .title {
        font-size: 13px;
        font-weight: 600;
        line-height: 1.3;
        color: var(--secondary-text-color);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .pet {
        display: flex;
        align-items: center;
        gap: 10px;
        min-width: 0;
      }
      .pet.gone {
        opacity: 0.45;
      }
      .body {
        flex: 1;
        display: flex;
        align-items: center;
        gap: 12px;
        min-width: 0;
        margin: 0;
        padding: 4px;
        border: none;
        border-radius: 14px;
        background: none;
        font: inherit;
        color: inherit;
        text-align: left;
        cursor: pointer;
        transition: background 150ms ease-out;
      }
      .body:hover {
        background: rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.05);
      }
      .body.static {
        cursor: default;
      }
      .body.static:hover {
        background: none;
      }
      .body:focus-visible {
        outline: 2px solid color-mix(in srgb, var(--silk-accent) 70%, transparent);
        outline-offset: -2px;
      }
      .avatar {
        flex: none;
        width: 48px;
        height: 48px;
        border-radius: 50%;
        overflow: hidden;
        display: grid;
        place-items: center;
        color: var(--silk-accent);
        background: color-mix(in srgb, var(--silk-accent) 18%, transparent);
        transition: background 200ms ease;
      }
      .avatar img {
        width: 100%;
        height: 100%;
        object-fit: cover;
        display: block;
      }
      .avatar ha-icon {
        --mdc-icon-size: 24px;
        pointer-events: none;
      }
      .info {
        flex: 1;
        min-width: 0;
        display: block;
      }
      .name,
      .state {
        display: block;
      }
      .chips {
        flex: none;
        display: flex;
        align-items: center;
        gap: 6px;
      }
      .act {
        flex: none;
        min-height: 36px;
        padding: 0 13px;
        border: none;
        border-radius: 999px;
        font: inherit;
        font-size: 12.5px;
        font-weight: 600;
        letter-spacing: 0.01em;
        cursor: pointer;
        white-space: nowrap;
        color: var(--silk-accent);
        background: color-mix(in srgb, var(--silk-accent) 14%, transparent);
        transition:
          transform 250ms var(--silk-spring),
          background 150ms ease-out;
      }
      .act:hover:not(:disabled) {
        background: color-mix(in srgb, var(--silk-accent) 22%, transparent);
      }
      .act:active:not(:disabled) {
        transform: scale(0.94);
        transition-duration: 120ms;
        transition-timing-function: var(--silk-ease-out);
      }
      .act:disabled {
        cursor: default;
        opacity: 0.45;
      }
      .act:focus-visible {
        outline: 2px solid color-mix(in srgb, var(--silk-accent) 70%, transparent);
        outline-offset: 2px;
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    'silk-pet-card': SilkPetCard;
  }
}
