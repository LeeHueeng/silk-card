import { LitElement, html, css, nothing, PropertyValues, TemplateResult } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { HomeAssistant, LovelaceCardConfig } from '../types';
import { silkControlStyles } from '../shared/base';
import { haptic } from '../shared/service';
import { accentFor } from '../shared/color';

export const META = {
  type: 'silk-carousel-card',
  name: 'Silk Carousel',
  description: 'Swipe through cards like a phone.',
};

/** YAML-only card: no visual editor — configure `cards` in YAML. */
export interface SilkCarouselCardConfig extends LovelaceCardConfig {
  cards: LovelaceCardConfig[];
  /** Page dots under the track. Default true. */
  dots?: boolean;
  /** Wrap around at both ends. Default true. */
  loop?: boolean;
  /** Auto-advance every N seconds. 0 (default) keeps it manual. */
  auto?: number;
  /** Accent override for the active dot. */
  color?: string;
}

/** A rendered Lovelace card element — the frontend contract, typed locally. */
interface LovelaceCard extends HTMLElement {
  hass?: HomeAssistant;
  getCardSize?(): number | Promise<number>;
}

/** Subset of the helpers object resolved by window.loadCardHelpers(). */
interface CardHelpers {
  createCardElement(config: LovelaceCardConfig): LovelaceCard;
}

/** Slide transition; the settle timer backs up a missing transitionend. */
const SLIDE_MS = 320;
const SETTLE_SLACK_MS = 80;
/** Movement before a gesture claims an axis (below this the page still scrolls). */
const DRAG_THRESHOLD = 6;
/** Past this a release is a swipe, so the click it would spawn is swallowed. */
const CLICK_SLOP = 8;
/** Fraction of the viewport a drag must cover to advance without a flick. */
const ADVANCE_FRACTION = 0.25;
/** px/ms — above this a short flick advances regardless of distance. */
const FLICK_VELOCITY = 0.45;
/** Rubber-band factor when dragging past an end with `loop: false`. */
const EDGE_RESIST = 0.35;

@customElement('silk-carousel-card')
export class SilkCarouselCard extends LitElement {
  @property({ attribute: false }) public hass?: HomeAssistant;

  /** Set by the frontend while the dashboard is in edit mode. */
  @property({ type: Boolean }) public editMode = false;

  @state() private _config?: SilkCarouselCardConfig;
  @state() private _children: LovelaceCard[] | null = null;
  @state() private _helpersMissing = false;

  /** Canonical slide, 0…n-1 — drives the dots and the a11y tree. */
  @state() private _index = 0;
  /**
   * Track position in slide units. Equals `_index` except while a wrap
   * animation runs, when it overshoots to -1 or n.
   */
  @state() private _pos = 0;
  /** Which edge slide is displaced to the far side for a seamless wrap. */
  @state() private _shift: -1 | 0 | 1 = 0;
  /** Live finger offset in px, applied on top of `_pos`. */
  @state() private _drag = 0;
  @state() private _dragging = false;
  /** One frame without a transition, so the post-wrap normalize is invisible. */
  @state() private _noAnim = false;

  private _buildSeq = 0;
  private _building = false;
  private _pointerId?: number;
  private _axis: 'x' | 'y' | null = null;
  private _startX = 0;
  private _startY = 0;
  private _lastX = 0;
  private _lastT = 0;
  private _velocity = 0;
  private _suppressClick = false;
  private _paused = false;
  private _autoTimer?: number;
  private _settleTimer?: number;

  public static getStubConfig(): Partial<SilkCarouselCardConfig> {
    return {
      type: 'custom:silk-carousel-card',
      cards: [
        { type: 'markdown', content: 'First card' },
        { type: 'markdown', content: 'Second card' },
      ],
    };
  }

  public setConfig(config: SilkCarouselCardConfig): void {
    if (!Array.isArray(config.cards) || config.cards.length === 0) {
      throw new Error('silk-carousel-card: `cards` is required — a list of card configurations');
    }
    if (config.auto !== undefined && !(Number(config.auto) >= 0)) {
      throw new Error('silk-carousel-card: `auto` must be a number of seconds (0 disables it)');
    }
    this._config = config;
    this._buildSeq++; // cancels any in-flight build of the old config
    this._children = null;
    this._helpersMissing = false;
    this._index = 0;
    this._pos = 0;
    this._shift = 0;
    this._drag = 0;
    if (this.isConnected) void this._buildChildren();
  }

  /** The tallest child decides how many rows the carousel asks for. */
  public getCardSize(): number {
    let size = 3;
    for (const child of this._children ?? []) {
      const childSize = typeof child.getCardSize === 'function' ? child.getCardSize() : undefined;
      if (typeof childSize === 'number' && Number.isFinite(childSize)) {
        size = Math.max(size, childSize);
      }
    }
    return size;
  }

  public getGridOptions(): Record<string, number> {
    return { columns: 12, rows: 3, min_columns: 4, min_rows: 2 };
  }

  public connectedCallback(): void {
    super.connectedCallback();
    document.addEventListener('visibilitychange', this._onVisibility);
    if (this._config && !this._children && !this._helpersMissing) void this._buildChildren();
    this._armAuto();
  }

  public disconnectedCallback(): void {
    super.disconnectedCallback();
    document.removeEventListener('visibilitychange', this._onVisibility);
    window.clearTimeout(this._autoTimer);
    window.clearTimeout(this._settleTimer);
    this._autoTimer = undefined;
    this._settleTimer = undefined;
    this._dragging = false;
    this._pointerId = undefined;
  }

  protected willUpdate(changed: PropertyValues): void {
    if (changed.has('hass')) this._assignHass();
  }

  private readonly _onVisibility = (): void => {
    // A hidden tab must not burn through slides nobody is watching.
    if (document.hidden) window.clearTimeout(this._autoTimer);
    else this._armAuto();
  };

  private async _buildChildren(): Promise<void> {
    const config = this._config;
    if (!config || this._building) return;
    const seq = this._buildSeq;
    // loadCardHelpers is injected by the HA frontend at runtime; it is not part
    // of our typed hass surface, so reach for it through a local window cast.
    const loadCardHelpers = (window as unknown as { loadCardHelpers?: () => Promise<CardHelpers> })
      .loadCardHelpers;
    if (typeof loadCardHelpers !== 'function') {
      this._helpersMissing = true;
      return;
    }
    this._building = true;
    let helpers: CardHelpers;
    try {
      helpers = await loadCardHelpers();
    } catch (err) {
      console.warn('silk-carousel-card: card helpers failed', err);
      this._building = false;
      if (seq === this._buildSeq) this._helpersMissing = true;
      return;
    }
    this._building = false;
    if (seq !== this._buildSeq) {
      void this._buildChildren(); // a newer config landed mid-flight
      return;
    }
    this._children = config.cards.map((cfg) => helpers.createCardElement(cfg));
    this._assignHass();
    this._armAuto();
  }

  private _assignHass(): void {
    const hass = this.hass;
    if (!hass || !this._children) return;
    for (const child of this._children) child.hass = hass;
  }

  private _count(): number {
    return this._children?.length ?? 0;
  }

  private _loop(): boolean {
    return this._config?.loop !== false;
  }

  private _width(): number {
    return this.renderRoot.querySelector<HTMLElement>('.viewport')?.clientWidth ?? 0;
  }

  // ---- movement -----------------------------------------------------------

  /**
   * Move one slide. Wrapping is clone-free: the edge slide is displaced to the
   * far side with a transform, the track animates one slot past the end, and
   * `_settle()` then normalizes both at once — visually a no-op.
   */
  private _advance(delta: number): void {
    const n = this._count();
    if (n < 2) return;
    const target = this._index + delta;
    if (target >= 0 && target < n) {
      this._shift = 0;
      this._index = target;
      this._pos = target;
    } else if (this._loop()) {
      this._shift = target < 0 ? -1 : 1;
      this._pos = target; // -1 or n — normalized once the animation lands
      this._index = target < 0 ? n - 1 : 0;
    } else {
      this._shift = 0;
      this._pos = this._index; // nothing there: spring back to the edge
    }
    this._drag = 0;
    this._armSettle();
    this._armAuto();
  }

  private _jumpTo(index: number): void {
    const n = this._count();
    if (index < 0 || index >= n) return;
    this._settle(); // normalize any in-flight wrap before aiming somewhere new
    if (index === this._index) return;
    this._shift = 0;
    this._index = index;
    this._pos = index;
    this._drag = 0;
    this._armSettle();
    this._armAuto();
  }

  /** Collapse the wrap overshoot and the displaced slide in the same frame. */
  private _settle(): void {
    window.clearTimeout(this._settleTimer);
    this._settleTimer = undefined;
    const jumped = this._pos !== this._index;
    if (!jumped && this._shift === 0) return;
    this._pos = this._index;
    this._shift = 0;
    if (jumped) {
      this._noAnim = true;
      // Two frames: the first paints the normalized position with transitions
      // off, the second restores them without animating the jump.
      requestAnimationFrame(() =>
        requestAnimationFrame(() => {
          this._noAnim = false;
        })
      );
    }
  }

  private _armSettle(): void {
    window.clearTimeout(this._settleTimer);
    this._settleTimer = window.setTimeout(() => {
      this._settleTimer = undefined;
      this._settle();
    }, SLIDE_MS + SETTLE_SLACK_MS);
  }

  private _onTransitionEnd(ev: TransitionEvent): void {
    if (ev.propertyName !== 'transform' || ev.target !== ev.currentTarget) return;
    this._settle();
  }

  // ---- auto-advance -------------------------------------------------------

  private _armAuto(): void {
    window.clearTimeout(this._autoTimer);
    this._autoTimer = undefined;
    const seconds = Number(this._config?.auto ?? 0);
    const n = this._count();
    if (!(seconds > 0) || n < 2 || this.editMode) return;
    if (this._paused || document.hidden || !this.isConnected) return;
    if (!this._loop() && this._index === n - 1) return; // the end is the end
    this._autoTimer = window.setTimeout(() => {
      this._autoTimer = undefined;
      if (!this._paused && !document.hidden) this._advance(1);
      else this._armAuto();
    }, seconds * 1000);
  }

  // ---- gestures -----------------------------------------------------------

  private _onPointerDown(ev: PointerEvent): void {
    if (this._count() < 2 || this.editMode) return;
    if (ev.button > 0) return; // right/middle clicks are not swipes
    this._suppressClick = false;
    this._paused = true;
    window.clearTimeout(this._autoTimer);
    this._autoTimer = undefined;
    this._settle(); // grabbing takes control of any animation in flight
    this._pointerId = ev.pointerId;
    this._axis = null;
    this._startX = ev.clientX;
    this._startY = ev.clientY;
    this._lastX = ev.clientX;
    this._lastT = performance.now();
    this._velocity = 0;
  }

  private _onPointerMove(ev: PointerEvent): void {
    if (this._pointerId !== ev.pointerId) return;
    if (this._axis === null) {
      const dx = ev.clientX - this._startX;
      const dy = ev.clientY - this._startY;
      if (Math.abs(dx) < DRAG_THRESHOLD && Math.abs(dy) < DRAG_THRESHOLD) return;
      if (Math.abs(dy) > Math.abs(dx)) {
        this._axis = 'y'; // a vertical scroll — hands the gesture back
        this._finishDrag(false);
        return;
      }
      this._axis = 'x';
      this._dragging = true;
      // Re-origin so the finger keeps 1:1 contact from the moment it takes over.
      this._startX = ev.clientX;
      (ev.currentTarget as HTMLElement).setPointerCapture(ev.pointerId);
      return;
    }
    if (this._axis !== 'x') return;
    const now = performance.now();
    const dt = now - this._lastT;
    if (dt > 0) {
      this._velocity = (ev.clientX - this._lastX) / dt;
      this._lastX = ev.clientX;
      this._lastT = now;
    }
    this._drag = this._resist(ev.clientX - this._startX);
    this._updateShiftForDrag(this._drag);
  }

  private _onPointerUp(ev: PointerEvent): void {
    if (this._pointerId !== ev.pointerId) return;
    this._finishDrag(true);
  }

  private _onPointerCancel(ev: PointerEvent): void {
    if (this._pointerId !== ev.pointerId) return;
    this._finishDrag(false);
  }

  /** Rubber-band past the ends when there is nothing to wrap to. */
  private _resist(dx: number): number {
    if (this._loop()) return dx;
    const n = this._count();
    const past = (this._index === 0 && dx > 0) || (this._index === n - 1 && dx < 0);
    return past ? dx * EDGE_RESIST : dx;
  }

  /** Keep the wrap-around neighbour parked where the finger is pulling from. */
  private _updateShiftForDrag(dx: number): void {
    const n = this._count();
    if (!this._loop() || n < 2) return;
    const want: -1 | 0 | 1 =
      this._index === 0 && dx > 0 ? -1 : this._index === n - 1 && dx < 0 ? 1 : 0;
    if (want !== this._shift) this._shift = want;
  }

  private _finishDrag(decide: boolean): void {
    const wasDragging = this._dragging;
    const dx = this._drag;
    const velocity = this._velocity;
    this._pointerId = undefined;
    this._axis = null;
    this._dragging = false;
    this._paused = false;
    if (!wasDragging || !decide) {
      this._drag = 0;
      this._pos = this._index;
      this._armSettle();
      this._armAuto();
      return;
    }
    // A drag must never click through to the card underneath it.
    this._suppressClick = Math.abs(dx) > CLICK_SLOP;
    const far = Math.abs(dx) > Math.max(this._width(), 1) * ADVANCE_FRACTION;
    const flick = Math.abs(velocity) > FLICK_VELOCITY && Math.abs(dx) > CLICK_SLOP;
    if (far || flick) {
      // A flick wins over distance: it is the more recent intent.
      const dir = flick ? (velocity < 0 ? 1 : -1) : dx < 0 ? 1 : -1;
      const target = this._index + dir;
      // Only a move that actually lands somewhere earns the haptic.
      if (this._loop() || (target >= 0 && target < this._count())) haptic(this, 'selection');
      this._advance(dir);
      return;
    }
    this._drag = 0;
    this._pos = this._index;
    this._armSettle();
    this._armAuto();
  }

  /** Capture-phase: a swipe that ends over a child must not tap it. */
  private readonly _clickCapture = {
    handleEvent: (ev: Event): void => {
      if (!this._suppressClick) return;
      this._suppressClick = false;
      ev.stopPropagation();
      ev.preventDefault();
    },
    capture: true,
  };

  private _onKeyDown(ev: KeyboardEvent): void {
    // Only when the viewport itself has focus — inner cards keep their keys.
    if (ev.target !== ev.currentTarget) return;
    const dir = ev.key === 'ArrowRight' ? 1 : ev.key === 'ArrowLeft' ? -1 : 0;
    if (!dir) return;
    ev.preventDefault();
    haptic(this, 'selection');
    this._advance(dir);
  }

  private _onDotClick(ev: Event, index: number): void {
    ev.stopPropagation();
    haptic(this, 'selection');
    this._jumpTo(index);
  }

  // ---- render -------------------------------------------------------------

  /** The displaced edge slide, parked one full lap away from its own slot. */
  private _slideStyle(index: number, count: number): string {
    if (this._shift === 1 && index === 0) return `transform:translateX(${count * 100}%)`;
    if (this._shift === -1 && index === count - 1) return `transform:translateX(-${count * 100}%)`;
    return '';
  }

  protected render(): TemplateResult | typeof nothing {
    const config = this._config;
    if (!config) return nothing;
    if (this._helpersMissing) {
      return html`<ha-card><div class="warning">Carousel requires Home Assistant</div></ha-card>`;
    }
    const children = this._children;
    if (!children) return html`<div class="pending" aria-hidden="true"></div>`;

    const count = children.length;
    const accent = accentFor(undefined, config.color);
    const showDots = config.dots !== false && count > 1;
    const offset = `calc(${(-this._pos * 100).toFixed(3)}% + ${this._drag.toFixed(1)}px)`;

    return html`
      <div class="carousel" style="--silk-accent:${accent}">
        <div
          class="viewport"
          role="group"
          aria-roledescription="carousel"
          aria-label="Carousel"
          tabindex=${count > 1 ? 0 : -1}
          @keydown=${this._onKeyDown}
          @click=${this._clickCapture}
        >
          <div
            class="track ${this._dragging ? 'dragging' : ''} ${this._noAnim ? 'no-anim' : ''}"
            style="transform:translateX(${offset})"
            @pointerdown=${this._onPointerDown}
            @pointermove=${this._onPointerMove}
            @pointerup=${this._onPointerUp}
            @pointercancel=${this._onPointerCancel}
            @transitionend=${this._onTransitionEnd}
          >
            ${children.map(
              (child, i) => html`
                <div
                  class="slide"
                  style=${this._slideStyle(i, count)}
                  role="group"
                  aria-roledescription="slide"
                  aria-label=${`${i + 1} of ${count}`}
                  ?inert=${i !== this._index}
                >
                  ${child}
                </div>
              `
            )}
          </div>
        </div>
        ${showDots
          ? html`
              <div class="dots">
                ${children.map(
                  (_child, i) => html`
                    <button
                      class="dot ${i === this._index ? 'on' : ''}"
                      aria-label=${`Go to card ${i + 1}`}
                      aria-current=${i === this._index ? 'true' : nothing}
                      @click=${(ev: Event) => this._onDotClick(ev, i)}
                    ></button>
                  `
                )}
              </div>
            `
          : nothing}
      </div>
    `;
  }

  static styles = [
    silkControlStyles,
    css`
      /* Container card: children bring their own ha-card, so there is no
         wrapper chrome to double up on. */
      .pending {
        display: none;
      }
      .carousel {
        height: 100%;
        display: flex;
        flex-direction: column;
        gap: 8px;
      }
      .viewport {
        position: relative;
        flex: 1 1 auto;
        min-height: 0;
        overflow: hidden;
        border-radius: var(--ha-card-border-radius, 12px);
        outline: none;
      }
      .viewport:focus-visible {
        box-shadow: 0 0 0 2px color-mix(in srgb, var(--silk-accent) 70%, transparent);
      }
      .track {
        display: flex;
        align-items: stretch;
        height: 100%;
        /* Vertical scrolling still belongs to the page. */
        touch-action: pan-y;
        will-change: transform;
        transition: transform ${SLIDE_MS}ms var(--silk-ease-out);
      }
      .track.dragging,
      .track.no-anim {
        transition: none;
      }
      .track.dragging {
        user-select: none;
      }
      .slide {
        flex: none;
        width: 100%;
        min-width: 0;
        display: flex;
        align-items: stretch;
      }
      .slide > * {
        flex: 1 1 auto;
        min-width: 0;
      }
      .dots {
        flex: none;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 6px;
        height: 12px;
      }
      .dot {
        position: relative;
        flex: none;
        width: 6px;
        height: 6px;
        padding: 0;
        border: none;
        border-radius: 999px;
        cursor: pointer;
        background: rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.25);
        transition:
          width 250ms var(--silk-spring),
          background 200ms ease;
      }
      /* Invisible halo lifts the touch target past 24px without fattening the row. */
      .dot::after {
        content: '';
        position: absolute;
        inset: -9px -4px;
      }
      .dot.on {
        width: 10px;
        background: var(--silk-accent);
      }
      .dot:focus-visible {
        outline: 2px solid color-mix(in srgb, var(--silk-accent) 70%, transparent);
        outline-offset: 3px;
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    'silk-carousel-card': SilkCarouselCard;
  }
}
