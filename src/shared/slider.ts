import { LitElement, html, css, PropertyValues, TemplateResult } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { clamp } from './service';

/**
 * Shared drag slider. Two looks:
 *  - default: standalone rounded bar (42px)
 *  - `fill`: transparent overlay that fills its positioned parent, so a whole
 *    card becomes the slider (drag anywhere), Silk's signature light control.
 *
 * Events: `slide` (throttled, while dragging) and `change` (on release),
 * both with detail {value}.
 */
@customElement('silk-slider')
export class SilkSlider extends LitElement {
  @property({ type: Number }) public value = 0;
  @property({ type: Number }) public min = 0;
  @property({ type: Number }) public max = 100;
  @property({ type: Number }) public step = 1;
  @property({ type: Boolean }) public disabled = false;
  @property({ type: Boolean, reflect: true }) public fill = false;

  @state() private _pct = 0;
  private _dragging = false;
  private _lastEmit = 0;

  protected willUpdate(changed: PropertyValues): void {
    if (!this._dragging && (changed.has('value') || changed.has('min') || changed.has('max'))) {
      const span = this.max - this.min || 1;
      this._pct = clamp(((this.value - this.min) / span) * 100, 0, 100);
    }
  }

  private _valueFromPct(pct: number): number {
    const raw = this.min + (pct / 100) * (this.max - this.min);
    const snapped = Math.round(raw / this.step) * this.step;
    return clamp(Number(snapped.toFixed(3)), this.min, this.max);
  }

  private _updateFromEvent(ev: PointerEvent, emit: boolean): void {
    const rect = this.getBoundingClientRect();
    if (!rect.width) return;
    this._pct = clamp(((ev.clientX - rect.left) / rect.width) * 100, 0, 100);
    if (emit) {
      const now = Date.now();
      if (now - this._lastEmit > 100) {
        this._lastEmit = now;
        this._fire('slide');
      }
    }
  }

  private _fire(type: 'slide' | 'change'): void {
    this.dispatchEvent(
      new CustomEvent(type, { detail: { value: this._valueFromPct(this._pct) }, bubbles: false })
    );
  }

  private _onPointerDown(ev: PointerEvent): void {
    if (this.disabled) return;
    ev.stopPropagation();
    this.setPointerCapture(ev.pointerId);
    this._dragging = true;
    this._updateFromEvent(ev, true);
  }

  private _onPointerMove(ev: PointerEvent): void {
    if (!this._dragging) return;
    this._updateFromEvent(ev, true);
  }

  private _onPointerUp(): void {
    if (!this._dragging) return;
    this._dragging = false;
    this._fire('change');
  }

  private _onKeydown(ev: KeyboardEvent): void {
    if (this.disabled) return;
    const dir = ev.key === 'ArrowRight' || ev.key === 'ArrowUp' ? 1 : ev.key === 'ArrowLeft' || ev.key === 'ArrowDown' ? -1 : 0;
    if (!dir) return;
    ev.preventDefault();
    this.value = clamp(this.value + dir * this.step, this.min, this.max);
    const span = this.max - this.min || 1;
    this._pct = ((this.value - this.min) / span) * 100;
    this._fire('change');
  }

  protected render(): TemplateResult {
    return html`
      <div
        class="track ${this._dragging ? 'dragging' : ''}"
        role="slider"
        tabindex=${this.disabled ? -1 : 0}
        aria-valuemin=${this.min}
        aria-valuemax=${this.max}
        aria-valuenow=${this._valueFromPct(this._pct)}
        @pointerdown=${this._onPointerDown}
        @pointermove=${this._onPointerMove}
        @pointerup=${this._onPointerUp}
        @pointercancel=${this._onPointerUp}
        @keydown=${this._onKeydown}
      >
        <div class="bar" style="width:${this._pct}%">
          <div class="handle"></div>
        </div>
      </div>
    `;
  }

  static styles = css`
    :host {
      display: block;
      --silk-slider-height: 42px;
    }
    :host([fill]) {
      position: absolute;
      inset: 0;
      z-index: 0;
    }
    .track {
      position: relative;
      height: var(--silk-slider-height);
      border-radius: 13px;
      background: rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.06);
      overflow: hidden;
      touch-action: pan-y;
      cursor: ew-resize;
      outline: none;
    }
    :host([fill]) .track {
      height: 100%;
      border-radius: 0;
      background: transparent;
    }
    .track:focus-visible {
      box-shadow: inset 0 0 0 2px var(--silk-accent);
    }
    .bar {
      position: absolute;
      inset: 0 auto 0 0;
      background: color-mix(in srgb, var(--silk-accent) 22%, transparent);
      transition: width 160ms cubic-bezier(0.2, 0, 0, 1);
    }
    :host([fill]) .bar {
      background: color-mix(in srgb, var(--silk-accent) 14%, transparent);
    }
    .track.dragging .bar {
      transition: none;
    }
    .handle {
      position: absolute;
      right: 7px;
      top: 50%;
      transform: translateY(-50%);
      width: 4px;
      height: 16px;
      border-radius: 2px;
      background: var(--silk-accent);
      opacity: 0.9;
    }
    :host([disabled]) .track {
      opacity: 0.4;
      cursor: default;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    'silk-slider': SilkSlider;
  }
}
