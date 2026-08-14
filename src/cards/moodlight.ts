import { LitElement, html, css, nothing, PropertyValues, TemplateResult } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { HomeAssistant, HassEntity, LovelaceCardConfig } from '../types';
import { silkControlStyles } from '../shared/base';
import { domainOf, isUnavailable, moreInfo, haptic, clamp } from '../shared/service';
import { accentFor } from '../shared/color';
import { registerEditor } from '../shared/editor';

export const META = {
  type: 'silk-mood-card',
  name: 'Silk Moods',
  description: 'Preset colors, one tap each.',
};

/** One preset. `hs` wins over `kelvin` when both are given. */
export interface MoodPreset {
  name: string;
  /** [hue 0-360, saturation 0-100]. */
  hs?: [number, number];
  /** White point in kelvin, for color-temp lights. */
  kelvin?: number;
  brightness_pct?: number;
  icon?: string;
}

export interface SilkMoodCardConfig extends LovelaceCardConfig {
  /** Lights every mood is applied to, in one service call. */
  lights: string[];
  /** Presets; omit for the built-in five. */
  moods?: MoodPreset[];
  name?: string;
  /** Accent override. */
  color?: string;
}

const DEFAULT_MOODS: MoodPreset[] = [
  { name: 'Cozy', kelvin: 2700, brightness_pct: 40, icon: 'mdi:sofa' },
  { name: 'Focus', kelvin: 5000, brightness_pct: 100, icon: 'mdi:desk-lamp' },
  { name: 'Sunset', hs: [22, 80], brightness_pct: 60, icon: 'mdi:weather-sunset' },
  { name: 'Movie', hs: [270, 70], brightness_pct: 25, icon: 'mdi:movie-open' },
  { name: 'Night', kelvin: 2200, brightness_pct: 10, icon: 'mdi:weather-night' },
];

const MAX_MOODS = 12;
/** How long the tapped tile keeps its ring before the real state must agree. */
const OPTIMISTIC_TTL_MS = 2000;

/** Match tolerances — lights round-trip color through their own gamut. */
const HUE_TOL = 12;
const SAT_TOL = 12;
const KELVIN_TOL = 175;
const PCT_TOL = 10;

const EDITOR_TAG = 'silk-mood-card-editor';

// The mood list is a YAML roster ({name, hs|kelvin, brightness_pct, icon});
// the editor owns the lights and the card-level options.
registerEditor(
  EDITOR_TAG,
  [
    {
      name: 'lights',
      required: true,
      selector: { entity: { multiple: true, domain: ['light'] } },
    },
    { name: 'name', selector: { text: {} } },
    { name: 'color', selector: { ui_color: {} } },
    { name: 'moods', selector: { object: {} } },
  ],
  {
    lights: '조명',
    name: '이름',
    color: '강조 색상',
    moods: '무드 목록 — {name, hs, kelvin, brightness_pct, icon}',
  }
);

/**
 * HSV(h, s, v = 100) → RGB 0-255. Silk has no shared color-space helper, so
 * the conversion lives here; the swatch only has to be recognizable, not
 * colorimetrically exact.
 */
function hsToRgb(h: number, s: number): [number, number, number] {
  const sat = clamp(s, 0, 100) / 100;
  const hue = ((h % 360) + 360) % 360;
  const c = sat;
  const hp = hue / 60;
  const x = c * (1 - Math.abs((hp % 2) - 1));
  const base: [number, number, number] =
    hp < 1
      ? [c, x, 0]
      : hp < 2
        ? [x, c, 0]
        : hp < 3
          ? [0, c, x]
          : hp < 4
            ? [0, x, c]
            : hp < 5
              ? [x, 0, c]
              : [c, 0, x];
  const m = 1 - c;
  return [
    Math.round((base[0] + m) * 255),
    Math.round((base[1] + m) * 255),
    Math.round((base[2] + m) * 255),
  ];
}

/** Blackbody approximation (Tanner Helland fit) — kelvin → RGB 0-255. */
function kelvinToRgb(kelvin: number): [number, number, number] {
  const t = clamp(kelvin, 1000, 12000) / 100;
  const r = t <= 66 ? 255 : 329.698727446 * Math.pow(t - 60, -0.1332047592);
  const g =
    t <= 66
      ? 99.4708025861 * Math.log(t) - 161.1195681661
      : 288.1221695283 * Math.pow(t - 60, -0.0755148492);
  const b =
    t >= 66 ? 255 : t <= 19 ? 0 : 138.5177312231 * Math.log(t - 10) - 305.0447927307;
  return [
    Math.round(clamp(r, 0, 255)),
    Math.round(clamp(g, 0, 255)),
    Math.round(clamp(b, 0, 255)),
  ];
}

/**
 * Dim the swatch toward black by the mood's own brightness, floored at 45% so
 * a 10% "Night" tile still reads as a color rather than a black hole.
 */
function dim(rgb: [number, number, number], pct: number | undefined): [number, number, number] {
  if (pct === undefined) return rgb;
  const f = 0.45 + 0.55 * (clamp(pct, 0, 100) / 100);
  return [Math.round(rgb[0] * f), Math.round(rgb[1] * f), Math.round(rgb[2] * f)];
}

function moodRgb(mood: MoodPreset): [number, number, number] {
  const base = mood.hs
    ? hsToRgb(mood.hs[0], mood.hs[1])
    : mood.kelvin !== undefined
      ? kelvinToRgb(mood.kelvin)
      : ([255, 214, 170] as [number, number, number]);
  return dim(base, mood.brightness_pct);
}

const rgbCss = (rgb: [number, number, number]): string => `rgb(${rgb[0]},${rgb[1]},${rgb[2]})`;

/** Ink that survives on the swatch — dark glyph on pale colors, light on deep. */
function inkOn(rgb: [number, number, number]): string {
  const luma = (0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2]) / 255;
  return luma > 0.62 ? 'rgba(0,0,0,0.72)' : 'rgba(255,255,255,0.94)';
}

/** Shortest angular distance between two hues, in degrees. */
function hueDelta(a: number, b: number): number {
  const d = Math.abs(((a - b) % 360) + 360) % 360;
  return d > 180 ? 360 - d : d;
}

/** Current hue/saturation of a light, or null when it reports no color. */
function currentHs(stateObj: HassEntity): [number, number] | null {
  const hs = stateObj.attributes.hs_color as unknown;
  if (Array.isArray(hs) && hs.length >= 2) {
    const h = Number(hs[0]);
    const s = Number(hs[1]);
    if (Number.isFinite(h) && Number.isFinite(s)) return [h, s];
  }
  return null;
}

function brightnessPct(stateObj: HassEntity): number | null {
  const b = stateObj.attributes.brightness;
  return typeof b === 'number' ? clamp(Math.round((b / 255) * 100), 0, 100) : null;
}

/** True when one light is currently sitting on this preset, within tolerance. */
function lightMatches(stateObj: HassEntity, mood: MoodPreset): boolean {
  if (stateObj.state !== 'on') return false;
  if (mood.brightness_pct !== undefined) {
    const pct = brightnessPct(stateObj);
    if (pct === null || Math.abs(pct - mood.brightness_pct) > PCT_TOL) return false;
  }
  const mode = stateObj.attributes.color_mode as string | undefined;
  if (mood.hs) {
    // A color-temp light still publishes an hs_color derived from its white
    // point; without this guard a warm white would masquerade as "Sunset".
    if (mode === 'color_temp') return false;
    const hs = currentHs(stateObj);
    if (!hs) return false;
    return hueDelta(hs[0], mood.hs[0]) <= HUE_TOL && Math.abs(hs[1] - mood.hs[1]) <= SAT_TOL;
  }
  if (mood.kelvin !== undefined) {
    if (mode !== undefined && mode !== 'color_temp') return false;
    const k = stateObj.attributes.color_temp_kelvin;
    if (typeof k !== 'number') return false;
    return Math.abs(k - mood.kelvin) <= KELVIN_TOL;
  }
  return true; // brightness-only mood: the check above already passed
}

/**
 * Mood presets for a room, as swatches.
 *
 * The tile background is the mood's own approximate color — the one place this
 * card paints outside the accent, because the swatch *is* the data: it shows
 * what the room will look like. Everything else (the ring on the active mood,
 * the header) stays on the single light accent.
 */
@customElement('silk-mood-card')
export class SilkMoodCard extends LitElement {
  @property({ attribute: false }) public hass?: HomeAssistant;

  @state() private _config?: SilkMoodCardConfig;
  /** Tapped mood name, held until the lights confirm (or the TTL expires). */
  @state() private _pending: string | null = null;

  private _moods: MoodPreset[] = DEFAULT_MOODS;
  private _pendingTimer?: number;
  private _stamp = '';

  public static getStubConfig(hass: HomeAssistant): Partial<SilkMoodCardConfig> {
    const lights = Object.keys(hass.states).filter((id) => id.startsWith('light.'));
    return { type: 'custom:silk-mood-card', lights: lights.slice(0, 3) };
  }

  public static async getConfigElement(): Promise<HTMLElement> {
    return document.createElement(EDITOR_TAG);
  }

  public setConfig(config: SilkMoodCardConfig): void {
    if (!Array.isArray(config.lights) || config.lights.length === 0) {
      throw new Error('silk-mood-card: `lights` must be a non-empty list of light entity ids');
    }
    const stray = config.lights.find((id) => typeof id !== 'string' || domainOf(id) !== 'light');
    if (stray !== undefined) {
      throw new Error(`silk-mood-card: \`lights\` must all be light entities (got "${stray}")`);
    }
    if (config.moods !== undefined) {
      if (!Array.isArray(config.moods) || config.moods.length === 0) {
        throw new Error('silk-mood-card: `moods` must be a non-empty list of presets');
      }
      for (const mood of config.moods) {
        if (!mood || typeof mood.name !== 'string' || !mood.name) {
          throw new Error('silk-mood-card: every mood needs a `name`');
        }
        const hsOk =
          mood.hs === undefined ||
          (Array.isArray(mood.hs) &&
            mood.hs.length >= 2 &&
            Number.isFinite(Number(mood.hs[0])) &&
            Number.isFinite(Number(mood.hs[1])));
        if (!hsOk) {
          throw new Error(`silk-mood-card: "${mood.name}" \`hs\` must be [hue, saturation]`);
        }
        if (mood.kelvin !== undefined && !(Number(mood.kelvin) > 0)) {
          throw new Error(`silk-mood-card: "${mood.name}" \`kelvin\` must be a positive number`);
        }
        if (
          mood.hs === undefined &&
          mood.kelvin === undefined &&
          mood.brightness_pct === undefined
        ) {
          throw new Error(
            `silk-mood-card: "${mood.name}" needs one of \`hs\`, \`kelvin\` or \`brightness_pct\``
          );
        }
      }
      this._moods = config.moods.slice(0, MAX_MOODS).map((mood) => ({
        name: mood.name,
        hs: mood.hs
          ? ([((Number(mood.hs[0]) % 360) + 360) % 360, clamp(Number(mood.hs[1]), 0, 100)] as [
              number,
              number,
            ])
          : undefined,
        kelvin: mood.kelvin === undefined ? undefined : Number(mood.kelvin),
        brightness_pct:
          mood.brightness_pct === undefined
            ? undefined
            : clamp(Number(mood.brightness_pct), 1, 100),
        icon: mood.icon,
      }));
    } else {
      this._moods = DEFAULT_MOODS;
    }
    this._config = config;
    this._clearPending();
  }

  public getCardSize(): number {
    return 3;
  }

  public getGridOptions(): Record<string, number> {
    return { columns: 6, rows: 3, min_columns: 4, min_rows: 2 };
  }

  public disconnectedCallback(): void {
    super.disconnectedCallback();
    window.clearTimeout(this._pendingTimer);
    this._pendingTimer = undefined;
  }

  protected willUpdate(changed: PropertyValues): void {
    if (!changed.has('hass') || !this._config || this._pending === null) return;
    // Any light reporting a fresh state means the truth has landed — drop the
    // optimistic ring and let the real match decide which tile wears it.
    const stamp = this._config.lights
      .map((id) => this.hass?.states[id]?.last_updated ?? '')
      .join('|');
    if (stamp !== this._stamp) this._clearPending();
  }

  private _clearPending(): void {
    window.clearTimeout(this._pendingTimer);
    this._pendingTimer = undefined;
    this._pending = null;
  }

  private _lights(): HassEntity[] {
    const hass = this.hass;
    if (!hass || !this._config) return [];
    return this._config.lights
      .map((id) => hass.states[id])
      .filter((stateObj): stateObj is HassEntity => !!stateObj);
  }

  /** The mood every reachable light currently sits on, if they agree. */
  private _activeMood(lights: HassEntity[]): MoodPreset | undefined {
    const live = lights.filter((stateObj) => !isUnavailable(stateObj));
    if (!live.length) return undefined;
    return this._moods.find((mood) => live.every((stateObj) => lightMatches(stateObj, mood)));
  }

  private _onCardClick(): void {
    const first = this._config?.lights[0];
    if (first) moreInfo(this, first);
  }

  private _onMood(ev: Event, mood: MoodPreset): void {
    ev.stopPropagation();
    const hass = this.hass;
    const config = this._config;
    if (!hass || !config) return;
    const targets = this._lights()
      .filter((stateObj) => !isUnavailable(stateObj))
      .map((stateObj) => stateObj.entity_id);
    if (!targets.length) return;
    haptic(this, 'selection');
    const data: Record<string, unknown> = { entity_id: targets };
    if (mood.hs) {
      data.hs_color = [Math.round(mood.hs[0]), Math.round(mood.hs[1])];
    } else if (mood.kelvin !== undefined) {
      data.color_temp_kelvin = Math.round(mood.kelvin);
    }
    if (mood.brightness_pct !== undefined) data.brightness_pct = Math.round(mood.brightness_pct);
    this._stamp = config.lights.map((id) => hass.states[id]?.last_updated ?? '').join('|');
    this._pending = mood.name;
    window.clearTimeout(this._pendingTimer);
    this._pendingTimer = window.setTimeout(() => this._clearPending(), OPTIMISTIC_TTL_MS);
    void hass.callService('light', 'turn_on', data);
  }

  private _moodLabel(mood: MoodPreset): string {
    const parts: string[] = [];
    if (mood.hs) parts.push(`hue ${Math.round(mood.hs[0])}°`);
    else if (mood.kelvin !== undefined) parts.push(`${Math.round(mood.kelvin)} K`);
    if (mood.brightness_pct !== undefined) parts.push(`${Math.round(mood.brightness_pct)}%`);
    return parts.length ? `${mood.name} · ${parts.join(' · ')}` : mood.name;
  }

  protected render(): TemplateResult | typeof nothing {
    const config = this._config;
    const hass = this.hass;
    if (!config || !hass) return nothing;

    const lights = this._lights();
    if (!lights.length) {
      return html`
        <ha-card class="control">
          <div class="warning">No lights found: ${config.lights.join(', ')}</div>
        </ha-card>
      `;
    }

    const reachable = lights.filter((stateObj) => !isUnavailable(stateObj));
    const unavailable = reachable.length === 0;
    const onCount = reachable.filter((stateObj) => stateObj.state === 'on').length;
    const accent = accentFor(lights[0], config.color);
    const name = config.name ?? 'Moods';
    const active = this._pending ?? this._activeMood(lights)?.name;
    const detail = unavailable
      ? 'Unavailable'
      : active
        ? active
        : `${onCount} of ${lights.length} on`;

    return html`
      <ha-card
        class="control ${unavailable ? 'unavailable' : ''}"
        style="--silk-accent:${accent}"
        @click=${this._onCardClick}
      >
        <div class="header">
          <div class="hname">${name}</div>
          <span class="now ${active ? 'lit' : ''}" title=${detail}>${detail}</span>
        </div>
        <div class="grid">
          ${this._moods.map((mood) => {
            const rgb = moodRgb(mood);
            const label = this._moodLabel(mood);
            return html`
              <button
                class="mood ${active === mood.name ? 'active' : ''}"
                title=${label}
                aria-label=${`Apply ${label}`}
                aria-pressed=${active === mood.name ? 'true' : 'false'}
                ?disabled=${unavailable}
                @click=${(ev: Event) => this._onMood(ev, mood)}
              >
                <span class="tile" style="background:${rgbCss(rgb)};color:${inkOn(rgb)}">
                  ${mood.icon ? html`<ha-icon .icon=${mood.icon}></ha-icon>` : nothing}
                </span>
                <span class="label">${mood.name}</span>
              </button>
            `;
          })}
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
      }
      .header {
        flex: none;
        display: flex;
        align-items: baseline;
        gap: 8px;
        min-height: 20px;
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
      .now {
        flex: none;
        max-width: 55%;
        font-size: 12.5px;
        line-height: 1.3;
        color: var(--secondary-text-color);
        font-variant-numeric: tabular-nums;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      /* The live mood names itself in the accent — text, never a glow. */
      .now.lit {
        color: var(--silk-accent);
        font-weight: 600;
      }
      .grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(64px, 1fr));
        gap: 10px;
        justify-items: center;
        position: relative;
        z-index: 1;
      }
      .mood {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 5px;
        width: 100%;
        max-width: 76px;
        min-width: 0;
        margin: 0;
        padding: 0;
        border: none;
        background: none;
        font: inherit;
        cursor: pointer;
        -webkit-tap-highlight-color: transparent;
      }
      .tile {
        position: relative;
        flex: none;
        width: 64px;
        height: 64px;
        border-radius: 18px;
        display: grid;
        place-items: center;
        /* Hairline keeps a pale swatch from dissolving into a light card. */
        box-shadow: inset 0 0 0 1px rgba(0, 0, 0, 0.12);
        transition: transform 250ms var(--silk-spring);
      }
      .mood:active .tile {
        transform: scale(0.93);
        transition-duration: 120ms;
        transition-timing-function: var(--silk-ease-out);
      }
      .tile ha-icon {
        --mdc-icon-size: 24px;
        pointer-events: none;
      }
      /* Active mood: a ring, drawn as a real border — never a glow. */
      .mood.active .tile::after {
        content: '';
        position: absolute;
        inset: -4px;
        border: 2px solid var(--silk-accent);
        border-radius: 22px;
      }
      .mood:focus-visible {
        outline: none;
      }
      .mood:focus-visible .tile {
        outline: 2px solid color-mix(in srgb, var(--silk-accent) 70%, transparent);
        outline-offset: 3px;
      }
      .label {
        font-size: 11px;
        font-weight: 500;
        line-height: 1.2;
        color: var(--secondary-text-color);
        max-width: 100%;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .mood.active .label {
        color: var(--primary-text-color);
      }
      .mood:disabled {
        cursor: default;
      }
      .unavailable .grid {
        opacity: 0.45;
        pointer-events: none;
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    'silk-mood-card': SilkMoodCard;
  }
}
