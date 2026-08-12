import { css } from 'lit';

/**
 * The Silk control-card look. Every control card imports this and composes:
 *
 *   <ha-card class="control">
 *     <button class="icon [on] [glow]" style="--silk-accent:...">…</button>
 *     <div class="info"><div class="name">…</div><div class="state">…</div></div>
 *     <div class="trailing">…</div>
 *   </ha-card>
 *
 * Motion language: press-in fast (120ms), release springs back (~250ms with
 * slight overshoot). State changes crossfade 200ms. Never longer than 500ms.
 * State reads as SURFACE (tinted fill), never as glow shadows.
 */
export const silkControlStyles = css`
  :host {
    display: block;
    height: 100%;
    --silk-accent: var(--primary-color, #4aa8ff);
    --silk-ease-out: cubic-bezier(0.23, 1, 0.32, 1);
    --silk-spring: cubic-bezier(0.175, 0.885, 0.32, 1.275);
  }
  ha-card {
    height: 100%;
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px;
    box-sizing: border-box;
    overflow: hidden;
    position: relative;
    cursor: pointer;
  }
  .icon {
    flex: none;
    width: 42px;
    height: 42px;
    border: none;
    border-radius: 14px;
    display: grid;
    place-items: center;
    cursor: pointer;
    padding: 0;
    position: relative;
    z-index: 1;
    color: var(--secondary-text-color);
    background: rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.06);
    transition:
      transform 250ms var(--silk-spring),
      background 200ms ease,
      color 200ms ease;
  }
  .icon:active {
    transform: scale(0.9);
    transition-duration: 120ms;
    transition-timing-function: var(--silk-ease-out);
  }
  .icon.on {
    color: var(--silk-accent);
    background: color-mix(in srgb, var(--silk-accent) 20%, transparent);
  }
  .icon ha-state-icon,
  .icon ha-icon {
    --mdc-icon-size: 22px;
    pointer-events: none;
  }
  .info {
    flex: 1;
    min-width: 0;
    position: relative;
    z-index: 1;
  }
  .name {
    font-size: 14px;
    font-weight: 500;
    line-height: 1.3;
    color: var(--primary-text-color);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .state {
    font-size: 12.5px;
    line-height: 1.3;
    color: var(--secondary-text-color);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    font-variant-numeric: tabular-nums;
  }
  .state .sep {
    opacity: 0.5;
    margin: 0 3px;
  }
  .trailing {
    flex: none;
    position: relative;
    z-index: 1;
    display: flex;
    align-items: center;
    gap: 6px;
  }
  .value {
    font-size: 17px;
    font-weight: 600;
    letter-spacing: -0.01em;
    color: var(--primary-text-color);
    font-variant-numeric: tabular-nums;
  }
  .unit {
    font-size: 12px;
    font-weight: 500;
    color: var(--secondary-text-color);
  }
  .unavailable .icon,
  .unavailable .info,
  .unavailable .trailing {
    opacity: 0.45;
  }
  .unavailable .icon {
    color: var(--disabled-text-color, #6f6f6f);
    background: rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.04);
  }
  .chip {
    border: none;
    font: inherit;
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.02em;
    padding: 4px 9px;
    border-radius: 999px;
    cursor: pointer;
    color: var(--secondary-text-color);
    background: rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.06);
    transition: background 150ms ease-out, color 150ms ease-out;
  }
  .chip:hover {
    background: rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.12);
  }
  .chip.active {
    color: var(--silk-accent);
    background: color-mix(in srgb, var(--silk-accent) 16%, transparent);
  }
  .warning {
    padding: 12px;
    color: var(--error-color, #db4437);
    font-size: 13px;
  }
  @media (prefers-reduced-motion: reduce) {
    * {
      transition-duration: 0.01ms !important;
      animation-duration: 0.01ms !important;
    }
  }
`;
