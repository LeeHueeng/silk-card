import { LitElement, html, css, nothing, PropertyValues, TemplateResult } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { HomeAssistant, HassEntity, LovelaceCardConfig } from '../types';
import { silkControlStyles } from '../shared/base';
import {
  domainOf,
  isUnavailable,
  toggleEntity,
  moreInfo,
  haptic,
  stateText,
  clamp,
} from '../shared/service';
import { accentFor } from '../shared/color';
import '../shared/slider';

export const META = {
  type: 'silk-color-card',
  name: 'Silk Color',
  description: 'Pick a light color like an artist.',
};

export interface SilkColorCardConfig extends LovelaceCardConfig {
  entity: string;
  name?: string;
  /** Icon override; falls back to the light's own state icon. */
  icon?: string;
  /** Accent override. */
  color?: string;
  /** Favorite [hue 0-360, saturation 0-100] swatches; three by default. */
  favorites?: [number, number][];
}

const EDITOR_TAG = 'silk-color-card-editor';

/** How long an optimistic override survives without a confirming state update. */
const OPTIMISTIC_TTL_MS = 2000;
/** Native wheel resolution; CSS may scale the square down responsively. */
const WHEEL_PX = 140;
const DEG = 180 / Math.PI;

/** Color modes that mean "this light can render an actual hue". */
const COLOR_MODES = new Set(['hs', 'rgb', 'xy', 'rgbw', 'rgbww']);

/**
 * White presets: approximate blackbody RGB (Tanner Helland fit) so the swatch
 * shows roughly what the light will look like at that temperature.
 */
const KELVIN_PRESETS: { kelvin: number; rgb: [number, number, number] }[] = [
  { kelvin: 2700, rgb: [255, 169, 87] },
  { kelvin: 4000, rgb: [255, 209, 163] },
  { kelvin: 6500, rgb: [255, 249, 253] },
];

/** Default favorites: warm amber, soft blue, magenta. */
const DEFAULT_FAVORITES: [number, number][] = [
  [35, 75],
  [215, 55],
  [305, 65],
];

interface SwatchDef {
  rgb: [number, number, number];
  hs: [number, number];
  /** Present only when the light natively supports color temperature. */
  kelvin?: number;
  label: string;
}

/** HSV(h, s, v=100) → RGB 0-255. */
function hsToRgb(h: number, s: number): [number, number, number] {
  const sat = clamp(s, 0, 100) / 100;
  const hue = ((h % 360) + 360) % 360;
  const c = sat; // chroma = s·v with v = 1
  const hp = hue / 60;
  const x = c * (1 - Math.abs((hp % 2) - 1));
  const base: [number, number, number] =
    hp < 1 ? [c, x, 0] : hp < 2 ? [x, c, 0] : hp < 3 ? [0, c, x] : hp < 4 ? [0, x, c] : hp < 5 ? [x, 0, c] : [c, 0, x];
  const m = 1 - c;
  return [
    Math.round((base[0] + m) * 255),
    Math.round((base[1] + m) * 255),
    Math.round((base[2] + m) * 255),
  ];
}

/** RGB 0-255 → [hue 0-360, saturation 0-100] (value discarded). */
function rgbToHs(rgb: [number, number, number]): [number, number] {
  const r = clamp(rgb[0], 0, 255) / 255;
  const g = clamp(rgb[1], 0, 255) / 255;
  const b = clamp(rgb[2], 0, 255) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  let h = 0;
  if (d > 0) {
    if (max === r) h = 60 * (((g - b) / d) % 6);
    else if (max === g) h = 60 * ((b - r) / d + 2);
    else h = 60 * ((r - g) / d + 4);
  }
  return [(h + 360) % 360, max === 0 ? 0 : (d / max) * 100];
}

const rgbCss = (rgb: [number, number, number]): string => `rgb(${rgb[0]},${rgb[1]},${rgb[2]})`;

function supportsColor(stateObj: HassEntity): boolean {
  const modes = stateObj.attributes.supported_color_modes as unknown;
  return Array.isArray(modes) && modes.some((m) => COLOR_MODES.has(String(m)));
}

function supportsColorTemp(stateObj: HassEntity): boolean {
  const modes = stateObj.attributes.supported_color_modes as unknown;
  return Array.isArray(modes) && modes.some((m) => String(m) === 'color_temp');
}

/** Current hue/saturation, falling back through rgb_color when hs is absent. */
function currentHs(stateObj: HassEntity): [number, number] {
  const hs = stateObj.attributes.hs_color as unknown;
  if (Array.isArray(hs) && hs.length >= 2 && Number.isFinite(Number(hs[0])) && Number.isFinite(Number(hs[1]))) {
    return [Number(hs[0]), Number(hs[1])];
  }
  const rgb = stateObj.attributes.rgb_color as unknown;
  if (Array.isArray(rgb) && rgb.length >= 3) {
    return rgbToHs([Number(rgb[0]), Number(rgb[1]), Number(rgb[2])]);
  }
  return [0, 0];
}

const SCALAR_SCHEMA: object[] = [
  { name: 'entity', required: true, selector: { entity: { domain: ['light'] } } },
  { name: 'name', selector: { text: {} } },
  {
    name: '',
    type: 'grid',
    schema: [
      { name: 'icon', selector: { icon: {} } },
      { name: 'color', selector: { ui_color: {} } },
    ],
  },
];

const SCALAR_LABELS: Record<string, string> = {
  entity: '엔티티',
  name: '이름',
  icon: '아이콘',
  color: '강조 색상',
};

/** One picker per favorite; the row's value is a plain rgb triple. */
const FAVORITE_SCHEMA: object[] = [{ name: 'rgb', selector: { color_rgb: {} } }];
const FAVORITE_LABELS: Record<string, string> = { rgb: '색상' };

/**
 * `favorites` is a list of [hue, saturation] PAIRS — arrays inside an array,
 * the one shape the shared row editor cannot author (it copies each row with
 * an object spread, which would turn `[35, 75]` into `{0: 35, 1: 75}` and fail
 * the card's own validation). So the favorites get their own rows here, and
 * they are edited as what they actually are: colors. Hue and saturation go out
 * to a color picker and come back from it; the value channel is dropped
 * deliberately, because the card paints its swatches at full value.
 */
if (!customElements.get(EDITOR_TAG)) {
  class SilkColorCardEditor extends LitElement {
    @property({ attribute: false }) public hass?: HomeAssistant;
    @state() private _config?: SilkColorCardConfig;

    public setConfig(config: SilkColorCardConfig): void {
      this._config = config;
    }

    /** The configured pairs, or the card's own defaults while none are set. */
    private get _favorites(): [number, number][] {
      const value = this._config?.favorites;
      if (!Array.isArray(value)) return DEFAULT_FAVORITES.map((f) => [f[0], f[1]]);
      return value
        .filter((pair) => Array.isArray(pair) && pair.length >= 2)
        .map((pair) => [Number(pair[0]), Number(pair[1])] as [number, number]);
    }

    private _emit(next: Record<string, unknown>): void {
      this.dispatchEvent(
        new CustomEvent('config-changed', {
          detail: { config: next },
          bubbles: true,
          composed: true,
        })
      );
    }

    private _setFavorites(favorites: [number, number][]): void {
      const next = { ...(this._config as Record<string, unknown>) };
      if (favorites.length) next.favorites = favorites;
      else delete next.favorites;
      this._emit(next);
    }

    private _scalarsChanged(ev: CustomEvent): void {
      ev.stopPropagation();
      const value = (ev.detail?.value ?? {}) as Record<string, unknown>;
      const next = { ...(this._config as Record<string, unknown>) };
      for (const [key, raw] of Object.entries(value)) {
        if (key === 'favorites') continue; // the swatches are edited below
        if (raw === undefined || raw === '') delete next[key];
        else next[key] = raw;
      }
      this._emit(next);
    }

    private _favoriteChanged(ev: CustomEvent, index: number): void {
      ev.stopPropagation();
      const rgb = ((ev.detail?.value ?? {}) as Record<string, unknown>).rgb;
      if (!Array.isArray(rgb) || rgb.length < 3) return;
      const [hue, sat] = rgbToHs([Number(rgb[0]), Number(rgb[1]), Number(rgb[2])]);
      const favorites = this._favorites;
      favorites[index] = [Math.round(hue), Math.round(sat)];
      this._setFavorites(favorites);
    }

    private _add(): void {
      this._setFavorites([...this._favorites, [DEFAULT_FAVORITES[0][0], DEFAULT_FAVORITES[0][1]]]);
    }

    private _remove(index: number): void {
      this._setFavorites(this._favorites.filter((_, i) => i !== index));
    }

    private _move(index: number, delta: number): void {
      const favorites = this._favorites;
      const target = index + delta;
      if (target < 0 || target >= favorites.length) return;
      [favorites[index], favorites[target]] = [favorites[target], favorites[index]];
      this._setFavorites(favorites);
    }

    protected render(): TemplateResult | typeof nothing {
      if (!this.hass || !this._config) return nothing;
      const favorites = this._favorites;
      return html`
        <ha-form
          .hass=${this.hass}
          .data=${this._config}
          .schema=${SCALAR_SCHEMA}
          .computeLabel=${(s: { name: string }) => SCALAR_LABELS[s.name] ?? s.name}
          @value-changed=${this._scalarsChanged}
        ></ha-form>

        <div class="head">
          <span class="title">즐겨찾기 색상</span>
          <span class="count">${favorites.length}</span>
        </div>

        ${favorites.map(
          (fav, index) => html`
            <div class="row">
              <div class="grip">
                <button
                  class="mini"
                  ?disabled=${index === 0}
                  title="위로"
                  @click=${() => this._move(index, -1)}
                >
                  ▲
                </button>
                <button
                  class="mini"
                  ?disabled=${index === favorites.length - 1}
                  title="아래로"
                  @click=${() => this._move(index, 1)}
                >
                  ▼
                </button>
              </div>
              <span class="chip" style="background:${rgbCss(hsToRgb(fav[0], fav[1]))}"></span>
              <ha-form
                class="fields"
                .hass=${this.hass}
                .data=${{ rgb: hsToRgb(fav[0], fav[1]) }}
                .schema=${FAVORITE_SCHEMA}
                .computeLabel=${(s: { name: string }) => FAVORITE_LABELS[s.name] ?? s.name}
                @value-changed=${(ev: CustomEvent) => this._favoriteChanged(ev, index)}
              ></ha-form>
              <button class="mini remove" title="삭제" @click=${() => this._remove(index)}>✕</button>
            </div>
          `
        )}

        <button class="add" @click=${this._add}>+ 색상 추가</button>
      `;
    }

    static styles = css`
      :host {
        display: block;
      }
      .head {
        display: flex;
        align-items: center;
        gap: 6px;
        margin: 14px 0 6px;
        font-size: 13px;
        font-weight: 600;
        color: var(--primary-text-color);
      }
      .count {
        font-size: 11px;
        font-weight: 600;
        color: var(--secondary-text-color);
        background: rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.08);
        border-radius: 999px;
        padding: 1px 7px;
      }
      .row {
        display: flex;
        align-items: center;
        gap: 6px;
        padding: 8px;
        margin-bottom: 6px;
        border-radius: 12px;
        background: rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.04);
      }
      .chip {
        flex: none;
        width: 22px;
        height: 22px;
        border-radius: 50%;
        box-shadow: inset 0 0 0 1px rgba(0, 0, 0, 0.12);
      }
      .fields {
        flex: 1;
        min-width: 0;
      }
      .grip {
        display: flex;
        flex-direction: column;
        gap: 2px;
      }
      .mini {
        border: none;
        background: rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.08);
        color: var(--secondary-text-color);
        border-radius: 8px;
        width: 26px;
        height: 22px;
        font-size: 10px;
        cursor: pointer;
        padding: 0;
      }
      .mini:disabled {
        opacity: 0.3;
        cursor: default;
      }
      .mini.remove {
        height: 26px;
        color: var(--error-color, #db4437);
      }
      .add {
        border: none;
        width: 100%;
        padding: 10px;
        border-radius: 12px;
        font: inherit;
        font-size: 13px;
        font-weight: 600;
        cursor: pointer;
        color: var(--primary-color);
        background: rgba(var(--rgb-primary-color, 74, 168, 255), 0.12);
      }
    `;
  }

  customElements.define(EDITOR_TAG, SilkColorCardEditor);
}

@customElement('silk-color-card')
export class SilkColorCard extends LitElement {
  @property({ attribute: false }) public hass?: HomeAssistant;

  @state() private _config?: SilkColorCardConfig;
  /** Locally assumed hue/sat while dragging / awaiting the real state. */
  @state() private _optimisticHs: [number, number] | null = null;
  /** Locally assumed on/off while awaiting the real state. */
  @state() private _optimisticOn: boolean | null = null;
  /** Locally assumed brightness % while dragging / awaiting the real state. */
  @state() private _optimisticPct: number | null = null;

  private _favorites: [number, number][] = DEFAULT_FAVORITES;
  private _dragging = false;
  private _sliding = false;
  private _painted = false;
  private _optimisticTimer?: number;
  private _lastUpdated?: string;

  public static getStubConfig(hass: HomeAssistant): Partial<SilkColorCardConfig> {
    const lights = Object.keys(hass.states).filter((id) => id.startsWith('light.'));
    const colorful = lights.find((id) => supportsColor(hass.states[id]));
    return { type: 'custom:silk-color-card', entity: colorful ?? lights[0] };
  }

  public static async getConfigElement(): Promise<HTMLElement> {
    return document.createElement(EDITOR_TAG);
  }

  public setConfig(config: SilkColorCardConfig): void {
    if (!config.entity) {
      throw new Error('silk-color-card: `entity` is required');
    }
    if (domainOf(config.entity) !== 'light') {
      throw new Error(`silk-color-card: \`entity\` must be a light (got "${config.entity}")`);
    }
    if (config.favorites !== undefined) {
      const ok =
        Array.isArray(config.favorites) &&
        config.favorites.every(
          (f) =>
            Array.isArray(f) && f.length >= 2 && Number.isFinite(Number(f[0])) && Number.isFinite(Number(f[1]))
        );
      if (!ok) {
        throw new Error('silk-color-card: `favorites` must be a list of [hue, saturation] pairs');
      }
      this._favorites = config.favorites.map((f) => [
        ((Number(f[0]) % 360) + 360) % 360,
        clamp(Number(f[1]), 0, 100),
      ]);
    } else {
      this._favorites = DEFAULT_FAVORITES;
    }
    this._config = config;
    this._painted = false;
    this._clearOptimistic();
  }

  public getCardSize(): number {
    return 4;
  }

  public getGridOptions(): Record<string, number> {
    return { columns: 4, rows: 4, min_columns: 3, min_rows: 3 };
  }

  public disconnectedCallback(): void {
    super.disconnectedCallback();
    window.clearTimeout(this._optimisticTimer);
    this._optimisticTimer = undefined;
  }

  protected willUpdate(changed: PropertyValues): void {
    if (!changed.has('hass') || !this._config) return;
    // The real state arrived: drop the optimistic override (but never mid-drag).
    const stamp = this.hass?.states[this._config.entity]?.last_updated;
    if (stamp !== this._lastUpdated) {
      this._lastUpdated = stamp;
      if (!this._dragging && !this._sliding) this._clearOptimistic();
    }
  }

  protected updated(): void {
    this._paintWheel();
  }

  private _clearOptimistic(): void {
    window.clearTimeout(this._optimisticTimer);
    this._optimisticTimer = undefined;
    this._optimisticHs = null;
    this._optimisticOn = null;
    this._optimisticPct = null;
  }

  private _holdOptimistic(): void {
    window.clearTimeout(this._optimisticTimer);
    this._optimisticTimer = window.setTimeout(() => this._clearOptimistic(), OPTIMISTIC_TTL_MS);
  }

  /**
   * Paint the HS disc once: hue around the angle, saturation along the radius,
   * value pinned at 100. This is the one place a Silk card may show a rainbow —
   * the wheel IS the data (it depicts the actual selectable colors).
   */
  private _paintWheel(): void {
    if (this._painted) return;
    const canvas = this.renderRoot.querySelector('canvas');
    if (!(canvas instanceof HTMLCanvasElement)) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const size = Math.round(WHEEL_PX * dpr);
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const img = ctx.createImageData(size, size);
    const data = img.data;
    const radius = size / 2;
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const dx = x - radius + 0.5;
        const dy = y - radius + 0.5;
        const r = Math.hypot(dx, dy);
        if (r > radius) continue; // outside the disc: alpha stays 0
        const hue = (Math.atan2(dy, dx) * DEG + 360) % 360;
        const sat = Math.min(r / radius, 1) * 100;
        const [rr, gg, bb] = hsToRgb(hue, sat);
        const i = (y * size + x) * 4;
        data[i] = rr;
        data[i + 1] = gg;
        data[i + 2] = bb;
        data[i + 3] = Math.round(clamp(radius - r, 0, 1) * 255); // 1px antialiased rim
      }
    }
    ctx.putImageData(img, 0, 0);
    this._painted = true;
  }

  /** Hue/sat under the pointer, in the same convention the disc was painted. */
  private _hsFromPointer(ev: PointerEvent): [number, number] {
    const rect = (ev.currentTarget as HTMLElement).getBoundingClientRect();
    const dx = ev.clientX - (rect.left + rect.width / 2);
    const dy = ev.clientY - (rect.top + rect.height / 2);
    const hue = (Math.atan2(dy, dx) * DEG + 360) % 360;
    const sat = clamp(Math.hypot(dx, dy) / (rect.width / 2), 0, 1) * 100;
    return [Math.round(hue * 10) / 10, Math.round(sat * 10) / 10];
  }

  private _displayOn(stateObj: HassEntity): boolean {
    return this._optimisticOn ?? stateObj.state === 'on';
  }

  private _onWheelDown(ev: PointerEvent): void {
    const stateObj = this.hass?.states[this._config?.entity ?? ''];
    if (!stateObj || isUnavailable(stateObj)) return;
    // Off: the tap bubbles up to the card, which wakes the light instead.
    if (!this._displayOn(stateObj)) return;
    (ev.currentTarget as HTMLElement).setPointerCapture(ev.pointerId);
    this._dragging = true;
    this._optimisticHs = this._hsFromPointer(ev);
  }

  private _onWheelMove(ev: PointerEvent): void {
    if (!this._dragging) return;
    this._optimisticHs = this._hsFromPointer(ev);
  }

  private _onWheelUp(): void {
    if (!this._dragging) return;
    this._dragging = false;
    const hs = this._optimisticHs;
    const config = this._config;
    if (!hs || !config || !this.hass) return;
    haptic(this);
    this._optimisticOn = true;
    this._holdOptimistic();
    this.hass.callService('light', 'turn_on', {
      entity_id: config.entity,
      hs_color: [Math.round(hs[0]), Math.round(hs[1])],
    });
  }

  private _onWheelCancel(): void {
    // Drag stolen (scroll, etc.): abandon without a service call.
    if (!this._dragging) return;
    this._dragging = false;
    this._optimisticHs = null;
  }

  private _onWheelClick(ev: Event): void {
    // A tap/drag on the wheel already picked a color while the light is on;
    // it must not fall through to more-info. Off, it bubbles to wake the light.
    const stateObj = this.hass?.states[this._config?.entity ?? ''];
    if (stateObj && !isUnavailable(stateObj) && this._displayOn(stateObj)) ev.stopPropagation();
  }

  private _onSwatch(ev: Event, sw: SwatchDef): void {
    ev.stopPropagation();
    const config = this._config;
    const hass = this.hass;
    if (!config || !hass) return;
    const stateObj = hass.states[config.entity];
    if (!stateObj || isUnavailable(stateObj)) return;
    haptic(this, 'selection');
    this._optimisticHs = sw.hs;
    this._optimisticOn = true;
    this._holdOptimistic();
    if (sw.kelvin !== undefined) {
      hass.callService('light', 'turn_on', { entity_id: config.entity, color_temp_kelvin: sw.kelvin });
    } else {
      hass.callService('light', 'turn_on', {
        entity_id: config.entity,
        hs_color: [Math.round(sw.hs[0]), Math.round(sw.hs[1])],
      });
    }
  }

  private _onSlide(ev: CustomEvent<{ value: number }>): void {
    this._sliding = true;
    this._optimisticPct = ev.detail.value;
    this._optimisticOn = ev.detail.value > 0;
  }

  private _onSliderChange(ev: CustomEvent<{ value: number }>): void {
    this._sliding = false;
    const config = this._config;
    if (!config || !this.hass) return;
    const value = ev.detail.value;
    this._optimisticPct = value;
    this._optimisticOn = value > 0;
    this._holdOptimistic();
    haptic(this);
    if (value <= 0) {
      this.hass.callService('light', 'turn_off', { entity_id: config.entity });
    } else {
      this.hass.callService('light', 'turn_on', { entity_id: config.entity, brightness_pct: value });
    }
  }

  private _onIconClick(ev: Event): void {
    ev.stopPropagation();
    const config = this._config;
    if (!config || !this.hass) return;
    const stateObj = this.hass.states[config.entity];
    if (!stateObj || isUnavailable(stateObj)) return;
    const wasOn = this._displayOn(stateObj);
    haptic(this);
    toggleEntity(this.hass, config.entity);
    this._optimisticOn = !wasOn;
    this._optimisticPct = null;
    this._holdOptimistic();
  }

  private _onCardClick(): void {
    const config = this._config;
    const hass = this.hass;
    if (!config || !hass) return;
    const stateObj = hass.states[config.entity];
    // Off + color-capable: per the wheel's contract, a tap anywhere wakes the light.
    if (stateObj && !isUnavailable(stateObj) && supportsColor(stateObj) && !this._displayOn(stateObj)) {
      haptic(this);
      this._optimisticOn = true;
      this._holdOptimistic();
      hass.callService('light', 'turn_on', { entity_id: config.entity });
      return;
    }
    moreInfo(this, config.entity);
  }

  private _stopClick(ev: Event): void {
    // The synthetic click after a slider drag must not open more-info.
    ev.stopPropagation();
  }

  /** Brightness % to display: optimistic first, else derived from the entity. */
  private _displayPct(stateObj: HassEntity, on: boolean): number | null {
    if (this._optimisticPct !== null) return this._optimisticPct;
    if (!on) return 0;
    const brightness = stateObj.attributes.brightness;
    if (typeof brightness !== 'number') return null;
    return clamp(Math.round((brightness / 255) * 100), 1, 100);
  }

  private _swatches(stateObj: HassEntity): SwatchDef[] {
    const ct = supportsColorTemp(stateObj);
    // Lights without native color_temp still get the white swatches — sent as
    // the equivalent hs color instead of a kelvin the light would reject.
    const whites: SwatchDef[] = KELVIN_PRESETS.map((p) => ({
      rgb: p.rgb,
      hs: rgbToHs(p.rgb),
      kelvin: ct ? p.kelvin : undefined,
      label: `${p.kelvin} K white`,
    }));
    const favs: SwatchDef[] = this._favorites.map((f, i) => ({
      rgb: hsToRgb(f[0], f[1]),
      hs: f,
      label: `Favorite ${i + 1}`,
    }));
    return [...whites, ...favs];
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
    const actualOn = !unavailable && stateObj.state === 'on';
    const on = unavailable ? false : this._displayOn(stateObj);
    const accent = accentFor(stateObj, config.color);
    const name = config.name ?? stateObj.attributes.friendly_name ?? config.entity;
    // Localized state text whenever it agrees with what we show; a plain
    // On/Off only during the brief optimistic window where they differ.
    const label = unavailable || on === actualOn ? stateText(hass, stateObj) : on ? 'On' : 'Off';
    const displayObj: HassEntity =
      this._optimisticOn === null ? stateObj : { ...stateObj, state: on ? 'on' : 'off' };
    const iconTpl = config.icon
      ? html`<ha-icon .icon=${config.icon}></ha-icon>`
      : html`<ha-state-icon .hass=${hass} .stateObj=${displayObj}></ha-state-icon>`;

    if (!supportsColor(stateObj)) {
      // No color support: a plain toggle row with an honest note.
      return html`
        <ha-card
          class="control ${unavailable ? 'unavailable' : ''}"
          style="--silk-accent:${accent}"
          @click=${this._onCardClick}
        >
          <button
            class="icon ${on ? 'on' : ''}"
            ?disabled=${unavailable}
            aria-label=${`Toggle ${name}`}
            @click=${this._onIconClick}
          >
            ${iconTpl}
          </button>
          <div class="info">
            <div class="name">${name}</div>
            <div class="state">${label}<span class="sep">·</span>No color support</div>
          </div>
          <div class="trailing">
            <button
              class="switch ${on ? 'checked' : ''}"
              role="switch"
              aria-checked=${on ? 'true' : 'false'}
              aria-label=${`Toggle ${name}`}
              ?disabled=${unavailable}
              @click=${this._onIconClick}
            >
              <span class="thumb"></span>
            </button>
          </div>
        </ha-card>
      `;
    }

    const pct = unavailable ? 0 : this._displayPct(stateObj, on);
    const hs = this._optimisticHs ?? currentHs(stateObj);
    const dist = (clamp(hs[1], 0, 100) / 100) * 50;
    const rad = (hs[0] * Math.PI) / 180;
    const thumbX = 50 + dist * Math.cos(rad);
    const thumbY = 50 + dist * Math.sin(rad);
    const thumbColor = rgbCss(hsToRgb(hs[0], hs[1]));
    const showPct = on && pct !== null && !unavailable;

    return html`
      <ha-card
        class="control wheel ${unavailable ? 'unavailable' : ''}"
        style="--silk-accent:${accent}"
        @click=${this._onCardClick}
      >
        <div class="top">
          <button
            class="icon ${on ? 'on' : ''}"
            ?disabled=${unavailable}
            aria-label=${`Toggle ${name}`}
            @click=${this._onIconClick}
          >
            ${iconTpl}
          </button>
          <div class="info">
            <div class="name">${name}</div>
            <div class="state">
              ${label}${showPct ? html`<span class="sep">·</span>${pct}%` : nothing}
            </div>
          </div>
        </div>
        <div class="wheelwrap ${on ? '' : 'off'}">
          <div
            class="wheelbox"
            aria-label=${`Color wheel for ${name}`}
            @pointerdown=${this._onWheelDown}
            @pointermove=${this._onWheelMove}
            @pointerup=${this._onWheelUp}
            @pointercancel=${this._onWheelCancel}
            @click=${this._onWheelClick}
          >
            <canvas aria-hidden="true"></canvas>
            <div
              class="thumb"
              style="left:${thumbX.toFixed(2)}%;top:${thumbY.toFixed(2)}%;background:${thumbColor}"
            ></div>
          </div>
        </div>
        <div class="swatches">
          ${this._swatches(stateObj).map(
            (sw) => html`
              <button
                class="swatch"
                style="background:${rgbCss(sw.rgb)}"
                aria-label=${sw.label}
                title=${sw.label}
                ?disabled=${unavailable}
                @click=${(ev: Event) => this._onSwatch(ev, sw)}
              ></button>
            `
          )}
        </div>
        <silk-slider
          class="brightness"
          .value=${on ? (pct ?? 100) : 0}
          min="1"
          max="100"
          step="1"
          ?disabled=${unavailable}
          aria-label=${`Brightness for ${name}`}
          @slide=${this._onSlide}
          @change=${this._onSliderChange}
          @click=${this._stopClick}
        ></silk-slider>
      </ha-card>
    `;
  }

  static styles = [
    silkControlStyles,
    css`
      ha-card.wheel {
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
      .wheelwrap {
        flex: 1;
        min-height: 72px;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: opacity 200ms ease;
      }
      .wheelwrap.off {
        opacity: 0.4;
      }
      .wheelbox {
        position: relative;
        height: 100%;
        max-height: ${WHEEL_PX}px;
        max-width: 100%;
        aspect-ratio: 1;
        touch-action: none;
        cursor: pointer;
      }
      canvas {
        position: absolute;
        inset: 0;
        width: 100%;
        height: 100%;
        display: block;
        border-radius: 50%;
      }
      /* Faint rim so the disc holds its shape against any card background. */
      .wheelbox::after {
        content: '';
        position: absolute;
        inset: 0;
        border-radius: 50%;
        box-shadow: inset 0 0 0 1px rgba(0, 0, 0, 0.08);
        pointer-events: none;
      }
      /* No transition on the thumb: it tracks the finger and snaps to state. */
      .thumb {
        position: absolute;
        width: 14px;
        height: 14px;
        box-sizing: border-box;
        border-radius: 50%;
        border: 2px solid #fff;
        box-shadow:
          0 1px 4px rgba(0, 0, 0, 0.35),
          0 0 0 1px rgba(0, 0, 0, 0.08);
        transform: translate(-50%, -50%);
        pointer-events: none;
      }
      .swatches {
        flex: none;
        display: flex;
        justify-content: center;
        gap: 7px;
      }
      .swatch {
        position: relative;
        flex: none;
        width: 22px;
        height: 22px;
        border: none;
        padding: 0;
        border-radius: 50%;
        cursor: pointer;
        box-shadow: inset 0 0 0 1px rgba(0, 0, 0, 0.12);
        transition: transform 250ms var(--silk-spring);
      }
      .swatch:active {
        transform: scale(0.88);
        transition-duration: 120ms;
        transition-timing-function: var(--silk-ease-out);
      }
      /* Invisible halo lifts the touch target to ~36px. */
      .swatch::after {
        content: '';
        position: absolute;
        inset: -7px;
        border-radius: 50%;
      }
      .swatch:focus-visible {
        outline: 2px solid color-mix(in srgb, var(--silk-accent) 70%, transparent);
        outline-offset: 2px;
      }
      .swatch:disabled {
        cursor: default;
      }
      .brightness {
        flex: none;
        --silk-slider-height: 36px;
      }
      .unavailable .wheelwrap,
      .unavailable .swatches,
      .unavailable .brightness {
        opacity: 0.45;
        pointer-events: none;
      }
      .icon:disabled {
        cursor: default;
      }
      /* Plain-toggle fallback switch (mirrors silk-toggle-card). */
      .switch {
        flex: none;
        position: relative;
        width: 46px;
        height: 28px;
        border: none;
        border-radius: 999px;
        padding: 2px;
        cursor: pointer;
        display: block;
        background: rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.15);
        transition: background 200ms ease;
      }
      .switch::after {
        content: '';
        position: absolute;
        inset: -7px;
        border-radius: 999px;
      }
      .switch.checked {
        background: var(--silk-accent);
      }
      .switch:focus-visible {
        outline: 2px solid color-mix(in srgb, var(--silk-accent) 70%, transparent);
        outline-offset: 2px;
      }
      .switch:disabled {
        cursor: default;
      }
      .switch .thumb {
        position: static;
        display: block;
        width: 24px;
        height: 24px;
        border: none;
        border-radius: 50%;
        background: var(--card-background-color, #fff);
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
        transform: translateX(0);
        transition: transform 200ms var(--silk-ease-out);
        will-change: transform;
      }
      .switch.checked .thumb {
        transform: translateX(18px);
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    'silk-color-card': SilkColorCard;
  }
}
