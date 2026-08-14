import { LitElement, html, css, nothing, PropertyValues, TemplateResult } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { HomeAssistant, LovelaceCardConfig } from '../types';
import { silkControlStyles } from '../shared/base';
import {
  domainOf,
  isActive,
  isUnavailable,
  moreInfo,
  haptic,
  stateText,
  clamp,
} from '../shared/service';
import { accentFor } from '../shared/color';
import { registerEditor } from '../shared/editor';

export const META = {
  type: 'silk-search-card',
  name: 'Silk Search',
  description: 'Find any entity, fast.',
};

export interface SilkSearchCardConfig extends LovelaceCardConfig {
  name?: string;
  /** Restrict the scan to these domains. Default: every domain. */
  domains?: string[];
  /** Result rows shown. Default 8. */
  limit?: number;
  placeholder?: string;
  /** Accent override. */
  color?: string;
}

/** One scored hit, resolved against `hass.states` at render time. */
interface Match {
  id: string;
  name: string;
  /** [start, length] of the query inside `name`; null when only the id matched. */
  hit: [number, number] | null;
}

const DEFAULT_LIMIT = 8;
const MAX_LIMIT = 25;
const DEFAULT_PLACEHOLDER = 'Search entities';
/** Keystrokes coalesce for this long before the (potentially large) scan runs. */
const DEBOUNCE_MS = 120;

/** Rank buckets — lower sorts first, ties broken by name. */
const SCORE_NAME_PREFIX = 0;
const SCORE_WORD_PREFIX = 1;
const SCORE_NAME_SUBSTR = 2;
const SCORE_ID_SUBSTR = 3;
const NO_MATCH = -1;

/** True when `q` starts a word inside `hay` (both already lowercase). */
function wordPrefix(hay: string, q: string): boolean {
  for (let i = hay.indexOf(' '); i >= 0; i = hay.indexOf(' ', i + 1)) {
    if (hay.startsWith(q, i + 1)) return true;
  }
  return false;
}

/**
 * Scores one entity against the query. `name`, `id` and `q` are lowercase.
 * A name prefix beats a word prefix beats a loose substring; id-only hits sink
 * to the bottom so typing "kitchen" never buries "Kitchen Lamp" under
 * `light.hallway_kitchen_side`.
 */
function scoreOf(name: string, id: string, q: string): number {
  const ni = name.indexOf(q);
  const ii = id.indexOf(q);
  if (ni < 0 && ii < 0) return NO_MATCH;
  if (ni === 0) return SCORE_NAME_PREFIX;
  const dot = id.indexOf('.');
  const objectPrefix = ii === 0 || (dot >= 0 && id.startsWith(q, dot + 1));
  if (objectPrefix || (ni > 0 && wordPrefix(name, q))) return SCORE_WORD_PREFIX;
  if (ni > 0) return SCORE_NAME_SUBSTR;
  return SCORE_ID_SUBSTR;
}

const EDITOR_TAG = 'silk-search-card-editor';

/** Domains worth offering by name; any other domain can still be typed in. */
const DOMAIN_OPTIONS: { value: string; label: string }[] = [
  { value: 'light', label: '조명 (light)' },
  { value: 'switch', label: '스위치 (switch)' },
  { value: 'sensor', label: '센서 (sensor)' },
  { value: 'binary_sensor', label: '이진 센서 (binary_sensor)' },
  { value: 'climate', label: '냉난방 (climate)' },
  { value: 'cover', label: '커버 (cover)' },
  { value: 'fan', label: '팬 (fan)' },
  { value: 'media_player', label: '미디어 플레이어 (media_player)' },
  { value: 'lock', label: '잠금 (lock)' },
  { value: 'vacuum', label: '청소기 (vacuum)' },
  { value: 'camera', label: '카메라 (camera)' },
  { value: 'scene', label: '씬 (scene)' },
  { value: 'script', label: '스크립트 (script)' },
  { value: 'automation', label: '자동화 (automation)' },
  { value: 'person', label: '사람 (person)' },
  { value: 'device_tracker', label: '기기 추적 (device_tracker)' },
  { value: 'number', label: '숫자 (number)' },
  { value: 'select', label: '선택 (select)' },
  { value: 'button', label: '버튼 (button)' },
  { value: 'input_boolean', label: '입력 부울 (input_boolean)' },
  { value: 'input_number', label: '입력 숫자 (input_number)' },
  { value: 'input_select', label: '입력 선택 (input_select)' },
  { value: 'input_text', label: '입력 텍스트 (input_text)' },
  { value: 'update', label: '업데이트 (update)' },
  { value: 'weather', label: '날씨 (weather)' },
  { value: 'calendar', label: '캘린더 (calendar)' },
  { value: 'timer', label: '타이머 (timer)' },
  { value: 'alarm_control_panel', label: '경보 패널 (alarm_control_panel)' },
  { value: 'humidifier', label: '가습기 (humidifier)' },
  { value: 'water_heater', label: '온수기 (water_heater)' },
];

registerEditor(
  EDITOR_TAG,
  [
    { name: 'name', selector: { text: {} } },
    { name: 'placeholder', selector: { text: {} } },
    {
      name: 'domains',
      selector: {
        select: { options: DOMAIN_OPTIONS, multiple: true, custom_value: true, mode: 'dropdown' },
      },
    },
    {
      name: '',
      type: 'grid',
      schema: [
        { name: 'limit', selector: { number: { min: 1, max: MAX_LIMIT, step: 1, mode: 'box' } } },
        { name: 'color', selector: { ui_color: {} } },
      ],
    },
  ],
  {
    name: '이름',
    placeholder: '입력 안내 문구',
    domains: '검색할 도메인',
    limit: '표시 개수',
    color: '강조 색상',
  },
  { limit: DEFAULT_LIMIT, placeholder: DEFAULT_PLACEHOLDER }
);

@customElement('silk-search-card')
export class SilkSearchCard extends LitElement {
  @property({ attribute: false }) public hass?: HomeAssistant;

  @state() private _config?: SilkSearchCardConfig;
  /** null = nothing typed yet; [] = a real query with no hits. */
  @state() private _results: Match[] | null = null;

  /** The lowercase query the current results were scanned for. */
  private _applied = '';
  private _domains?: Set<string>;
  private _debounce?: number;

  public static getStubConfig(): Partial<SilkSearchCardConfig> {
    return { type: 'custom:silk-search-card' };
  }

  public static async getConfigElement(): Promise<HTMLElement> {
    return document.createElement(EDITOR_TAG);
  }

  public setConfig(config: SilkSearchCardConfig): void {
    if (config.domains !== undefined) {
      if (!Array.isArray(config.domains) || config.domains.some((d) => typeof d !== 'string')) {
        throw new Error('silk-search-card: `domains` must be a list of domain names');
      }
    }
    if (config.limit !== undefined && !(Number(config.limit) > 0)) {
      throw new Error('silk-search-card: `limit` must be a positive number');
    }
    this._config = config;
    this._domains = config.domains?.length ? new Set(config.domains) : undefined;
  }

  public getCardSize(): number {
    return 3;
  }

  public getGridOptions(): Record<string, number> {
    return { columns: 6, rows: 3, min_columns: 3, min_rows: 1 };
  }

  public disconnectedCallback(): void {
    super.disconnectedCallback();
    window.clearTimeout(this._debounce);
    this._debounce = undefined;
  }

  /**
   * Rescan only when the *config* moved (domains/limit). A hass update never
   * rescans: results hold entity ids, so live state text stays fresh for free.
   */
  protected willUpdate(changed: PropertyValues): void {
    if (changed.has('_config') && this._applied) this._compute(this._applied);
  }

  private _inputEl(): HTMLInputElement | null {
    return this.renderRoot.querySelector<HTMLInputElement>('.q');
  }

  private _limit(): number {
    return clamp(Math.round(this._config?.limit ?? DEFAULT_LIMIT), 1, MAX_LIMIT);
  }

  /** The one place that walks `hass.states` — only ever from a debounced input. */
  private _compute(raw: string): void {
    const hass = this.hass;
    if (!hass) return;
    const q = raw.trim().toLowerCase();
    this._applied = q;
    if (!q) {
      this._results = null;
      return;
    }
    const domains = this._domains;
    const scored: { id: string; name: string; score: number }[] = [];
    for (const id of Object.keys(hass.states)) {
      if (domains && !domains.has(domainOf(id))) continue;
      const friendly = hass.states[id].attributes.friendly_name;
      const name = typeof friendly === 'string' && friendly ? friendly : id;
      const score = scoreOf(name.toLowerCase(), id.toLowerCase(), q);
      if (score === NO_MATCH) continue;
      scored.push({ id, name, score });
    }
    scored.sort(
      (a, b) => a.score - b.score || a.name.localeCompare(b.name) || a.id.localeCompare(b.id)
    );
    this._results = scored.slice(0, this._limit()).map((m) => {
      const at = m.name.toLowerCase().indexOf(q);
      return { id: m.id, name: m.name, hit: at < 0 ? null : ([at, q.length] as [number, number]) };
    });
  }

  /** Run a pending debounce right now (Enter must act on what is typed). */
  private _flush(): void {
    if (this._debounce === undefined) return;
    window.clearTimeout(this._debounce);
    this._debounce = undefined;
    this._compute(this._inputEl()?.value ?? '');
  }

  private _onInput(ev: Event): void {
    const value = (ev.target as HTMLInputElement).value;
    window.clearTimeout(this._debounce);
    this._debounce = window.setTimeout(() => {
      this._debounce = undefined;
      this._compute(value);
    }, DEBOUNCE_MS);
  }

  private _clear(): void {
    window.clearTimeout(this._debounce);
    this._debounce = undefined;
    const input = this._inputEl();
    if (input) input.value = '';
    this._applied = '';
    this._results = null;
  }

  private _onKeydown(ev: KeyboardEvent): void {
    if (ev.key === 'Enter') {
      ev.preventDefault();
      this._flush();
      const first = this._results?.[0];
      if (first) this._open(first.id);
    } else if (ev.key === 'Escape') {
      ev.preventDefault();
      ev.stopPropagation();
      this._clear();
    }
  }

  private _open(entityId: string): void {
    haptic(this);
    moreInfo(this, entityId);
  }

  private _onRowClick(ev: Event, entityId: string): void {
    ev.stopPropagation();
    this._open(entityId);
  }

  /** The matched run of the name, tinted with the card accent. */
  private _renderName(match: Match): TemplateResult {
    if (!match.hit) return html`${match.name}`;
    const [at, len] = match.hit;
    return html`${match.name.slice(0, at)}<span class="hit"
        >${match.name.slice(at, at + len)}</span
      >${match.name.slice(at + len)}`;
  }

  private _renderResults(hass: HomeAssistant): TemplateResult | typeof nothing {
    const results = this._results;
    if (!results) return nothing; // nothing typed — the card stays a single row
    if (results.length === 0) return html`<div class="empty">No matches</div>`;
    return html`
      <div class="results" role="listbox">
        ${results.map((match) => {
          const stateObj = hass.states[match.id];
          if (!stateObj) return nothing;
          const gone = isUnavailable(stateObj);
          return html`
            <button
              class="row ${!gone && isActive(stateObj) ? 'on' : ''} ${gone ? 'dim' : ''}"
              role="option"
              title=${match.name}
              @click=${(ev: Event) => this._onRowClick(ev, match.id)}
            >
              <ha-state-icon .hass=${hass} .stateObj=${stateObj}></ha-state-icon>
              <span class="rname">${this._renderName(match)}</span>
              <span class="rstate">${stateText(hass, stateObj)}</span>
            </button>
          `;
        })}
      </div>
    `;
  }

  protected render(): TemplateResult | typeof nothing {
    const config = this._config;
    const hass = this.hass;
    if (!config || !hass) return nothing;
    const accent = accentFor(undefined, config.color);
    const placeholder = config.placeholder ?? DEFAULT_PLACEHOLDER;

    return html`
      <ha-card style="--silk-accent:${accent}">
        ${config.name ? html`<div class="name">${config.name}</div>` : nothing}
        <div class="field">
          <ha-icon class="lead" icon="mdi:magnify"></ha-icon>
          <input
            class="q"
            type="text"
            inputmode="search"
            autocomplete="off"
            autocapitalize="off"
            spellcheck="false"
            .placeholder=${placeholder}
            aria-label=${config.name ?? placeholder}
            @input=${this._onInput}
            @keydown=${this._onKeydown}
            @click=${(ev: Event) => ev.stopPropagation()}
          />
        </div>
        ${this._renderResults(hass)}
      </ha-card>
    `;
  }

  static styles = [
    silkControlStyles,
    css`
      /* A search surface, not a control row: no card-level tap action. */
      ha-card {
        flex-direction: column;
        align-items: stretch;
        justify-content: flex-start;
        gap: 8px;
        cursor: default;
      }
      .name {
        flex: none;
      }
      .field {
        flex: none;
        display: flex;
        align-items: center;
        gap: 8px;
        height: 36px;
        padding: 0 10px;
        box-sizing: border-box;
        border-radius: 12px;
        background: rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.06);
        transition: box-shadow 150ms var(--silk-ease-out);
      }
      .field:focus-within {
        box-shadow: inset 0 0 0 2px var(--silk-accent);
      }
      .lead {
        flex: none;
        --mdc-icon-size: 18px;
        color: var(--secondary-text-color);
        display: flex;
      }
      .q {
        flex: 1;
        min-width: 0;
        border: none;
        outline: none;
        background: none;
        padding: 0;
        font: inherit;
        font-size: 13.5px;
        line-height: 1.3;
        color: var(--primary-text-color);
      }
      .q::placeholder {
        color: var(--secondary-text-color);
        opacity: 0.8;
      }
      .results {
        flex: 1;
        min-height: 0;
        display: flex;
        flex-direction: column;
        gap: 2px;
        overflow-y: auto;
        overscroll-behavior: contain;
      }
      .row {
        flex: none;
        display: flex;
        align-items: center;
        gap: 10px;
        width: 100%;
        min-height: 38px;
        padding: 2px 6px;
        margin: 0;
        box-sizing: border-box;
        border: none;
        border-radius: 10px;
        background: none;
        font: inherit;
        color: var(--primary-text-color);
        text-align: left;
        cursor: pointer;
        animation: silk-search-in 250ms var(--silk-ease-out);
        transition: background 150ms ease-out;
      }
      .row:hover {
        background: rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.06);
      }
      .row:focus-visible {
        outline: 2px solid color-mix(in srgb, var(--silk-accent) 70%, transparent);
        outline-offset: -2px;
      }
      .row ha-state-icon {
        flex: none;
        --mdc-icon-size: 20px;
        color: var(--secondary-text-color);
        pointer-events: none;
        transition: color 200ms ease;
      }
      .row.on ha-state-icon {
        color: var(--silk-accent);
      }
      .row.dim ha-state-icon,
      .row.dim .rstate {
        opacity: 0.45;
      }
      .rname {
        flex: 1;
        min-width: 0;
        font-size: 13.5px;
        line-height: 1.3;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .hit {
        color: var(--silk-accent);
        font-weight: 600;
      }
      .rstate {
        flex: none;
        max-width: 42%;
        font-size: 11px;
        line-height: 1.3;
        color: var(--secondary-text-color);
        font-variant-numeric: tabular-nums;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .empty {
        flex: none;
        padding: 2px 6px;
        font-size: 12.5px;
        line-height: 1.3;
        color: var(--secondary-text-color);
      }
      @keyframes silk-search-in {
        from {
          opacity: 0;
        }
        to {
          opacity: 1;
        }
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    'silk-search-card': SilkSearchCard;
  }
}
