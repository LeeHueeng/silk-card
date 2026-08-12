# Silk Design System & Implementation Rules

Read this fully before writing any card. It is the contract every Silk card follows.

## Design stance

Premium = a few opinionated decisions applied with total consistency + optical refinement + restraint.
The reference is Apple Home iOS 16+: per-domain color, hard binary on/off state, icon left + two text lines.

### Hard rules

1. **One accent per card, from the device domain** — use `accentFor()` from `shared/color.ts`, set it as
   `--silk-accent` (inline style on `ha-card`). Never rainbow, never gradients on controls.
2. **State is SURFACE, not glow.** Active = icon container fills with accent tint (`.icon.on`), text stays
   in text tokens. NEVER colored box-shadows/glows. Unavailable = `.unavailable` class on `ha-card`
   (45% opacity treatment comes from shared styles) + controls disabled.
3. **Radius**: cards inherit ha-card; inner icon container 14px (already in shared styles). No 20px+ blobs.
4. **Typography**: sizes come from shared styles (`.name` 14/500, `.state` 12.5, `.value` 17/600).
   Big hero values (climate current temp, gauge) may go 24–28px/600 with `letter-spacing: -0.02em`.
   `font-variant-numeric: tabular-nums` on EVERY live number.
5. **Motion**: press-in 120ms `var(--silk-ease-out)` scale 0.9–0.97; release `var(--silk-spring)` 250ms.
   State color crossfades 200ms ease. Animate only transform/opacity. Ceiling 500ms. No pulse/breathing
   loops (exception: fan icon may rotate while the fan is actually on — it represents real motion).
   Zero transition during slider drags; snap on release.
6. **No emoji, no uppercase tracked labels, no purple gradients, no glassmorphism, no left border strips.**
7. Entity names truncate with ellipsis, never wrap. A card answers ONE question at a glance.
8. Touch targets ≥ 40px (icon button is 42px). Secondary buttons ≥ 36px with ≥ 6px gaps.

### Card anatomy (from `shared/base.ts` — import `silkControlStyles` and compose)

```html
<ha-card class="control ${unavailable ? 'unavailable' : ''}" style="--silk-accent:${accent}">
  <button class="icon ${active ? 'on' : ''}" @click=${icon action}>
    <ha-state-icon .hass=${this.hass} .stateObj=${stateObj}></ha-state-icon>
  </button>
  <div class="info"><div class="name">…</div><div class="state">…</div></div>
  <div class="trailing">…</div>   <!-- switch / value / buttons / chips -->
</ha-card>
```

Interaction contract: **icon button = the control action** (toggle/press) + `haptic(this)`;
**clicking anywhere else on the card = `moreInfo(this, entityId)`**. Stop propagation on inner controls.
State line composes segments with `<span class="sep">·</span>` (e.g. `On · 72%`).

## Shared API (import paths are from `src/cards/`)

- `../types` — `HomeAssistant`, `HassEntity`, `LovelaceCardConfig`
- `../shared/base` — `silkControlStyles` (use `static styles = [silkControlStyles, css\`…\`]`)
- `../shared/service` — `domainOf, isActive, isUnavailable, toggleEntity, moreInfo, haptic, stateText, supportsFeature, clamp`
- `../shared/color` — `accentFor(stateObj, override?)`
- `../shared/editor` — `registerEditor(tag, schema, labels, defaults?)`; call at module load, then
  `static async getConfigElement() { return document.createElement('<tag>-editor'); }`
- `../shared/slider` — `<silk-slider .value min max step ?disabled ?fill @slide @change>`; `fill` mode
  absolutely fills its positioned parent (whole-card drag surface, z-index 0 under `.icon/.info/.trailing`
  which are z-index 1). Events detail: `{value}`. `slide` fires while dragging (throttled), `change` on release.
- Graph internals (tile sparkline only): `../data` `fetchSeries(hass, ids, start, end, hours)`,
  `../graph` `resampleHold, niceDomain, toPxYs, buildLinePath, buildAreaPath`, `../format` `formatNumber`.

## Module conventions (match `src/cards/graph.ts`)

- `@customElement('<tag>')`, export the class, and export
  `export const META = { type: '<tag>', name: 'Silk <X>', description: '<one line>' };`
- `setConfig(config)` validates and throws a clear Error when required config is missing.
- `static getStubConfig(hass)` returns `{ type: 'custom:<tag>', entity: <first sensible entity> }`.
- `getCardSize()` and `getGridOptions()` — single-row control cards:
  `{ columns: 6, rows: 1, min_columns: 4, min_rows: 1 }`; two-row cards use `rows: 2`.
- Editors: minimal, via `registerEditor` — entity + name + icon + card-specific options only.
- Config extends `LovelaceCardConfig`; common keys: `entity`, `name`, `icon`, `color` (accent override).
- Optimistic UI: after a service call, reflect the expected state immediately (local override cleared
  when the real state update arrives or after 2s).

## HA API cheat sheet (verified against 2026 frontend/core)

- Services: `hass.callService(domain, service, { entity_id, ...fields })`.
- `toggleEntity()` in shared/service.ts already implements HA's per-domain toggle. Use it.
- **light**: `light.turn_on {brightness_pct 0-100, color_temp_kelvin, rgb_color}` / `turn_off`.
  Attributes: `brightness` (0-255), `supported_color_modes` (brightness-capable = anything beyond
  `onoff`), `color_mode`, `min/max_color_temp_kelvin`.
- **climate**: `climate.set_temperature {temperature}` (feature 1) or `{target_temp_high, target_temp_low}`
  (feature 2); `climate.set_hvac_mode {hvac_mode}`. Attributes: `current_temperature, temperature,
  target_temp_high/low, min_temp, max_temp, target_temp_step, hvac_modes, hvac_action`.
  State IS the hvac mode (`heat|cool|heat_cool|auto|dry|fan_only|off`). `accentFor` already colors by mode.
- **cover**: `open_cover/close_cover/stop_cover/set_cover_position {position 0-100}` (100 = open).
  Features: OPEN=1, CLOSE=2, SET_POSITION=4, STOP=8. Attribute `current_position`.
- **fan**: `fan.set_percentage {percentage}`, `turn_on/turn_off`; attrs `percentage, percentage_step,
  preset_modes, preset_mode`; features SET_SPEED=1, PRESET_MODE=8.
- **media_player**: `media_play_pause`, `media_next_track`, `media_previous_track`,
  `volume_set {volume_level 0-1}`; attrs `media_title, media_artist, volume_level, entity_picture`
  (relative URL — use as-is in src); features PAUSE=1, VOLUME_SET=4, PREV=16, NEXT=32, PLAY=16384.
- **script/scene/button**: `script.turn_on`, `scene.turn_on`, `button.press` / `input_button.press`.
  Scene/button state = last-activated timestamp; script state `on` while running.
- Active-state semantics: use `isActive()` from shared/service.ts (mirrors HA exactly:
  cover active unless closed, lock active unless locked, media active unless standby/off, etc.).
- More-info: `moreInfo(this, entityId)`. Haptics: `haptic(this)` on successful control taps.
- Theme state color vars exist per domain (`--state-light-active-color` etc.) — `accentFor` handles them.
  The old `--rgb-state-*-color` vars are GONE; use `color-mix(in srgb, var(--silk-accent) N%, transparent)`
  for alpha tints.

## Editor schema selector examples

```ts
{ name: 'entity', required: true, selector: { entity: { domain: ['light'] } } }
{ name: 'name', selector: { text: {} } }
{ name: 'icon', selector: { icon: {} } }
{ name: 'hours_to_show', selector: { number: { min: 1, mode: 'box' } } }
{ name: 'show_position', selector: { boolean: {} } }
```
