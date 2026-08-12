# Silk Card

**Buttery-smooth, interactive history graphs for Home Assistant.**
Scrub it like a stock app. Switch ranges and watch it morph. Zero config required to look great.

![Silk Card preview](docs/preview.png)

> Screenshots don't do it justice — the scrubbing and range-morphing need motion. Run `npm run demo` to feel it.

[![HACS](https://img.shields.io/badge/HACS-Custom-41BDF5.svg)](https://github.com/hacs/integration)
[![GitHub Release](https://img.shields.io/github/v/release/LeeHueeng/silk-card)](https://github.com/LeeHueeng/silk-card/releases)
[![License](https://img.shields.io/github/license/LeeHueeng/silk-card)](LICENSE)

## Why Silk?

Existing graph cards make you choose: minimal but frozen in time, or powerful but a YAML dungeon. Silk picks a third door:

- **Scrub through time** — press and drag anywhere on the graph to read the exact value and time at that point, the way finance and health apps do it. Works with touch and mouse.
- **Morphing range switching** — tap `1H / 12H / 1D / 1W / 1M` chips and the curve fluidly animates into the new time window instead of redrawing.
- **Beautiful by default** — smooth monotone curves (no fake overshoot), soft gradient fill, a live pulsing "now" dot, min/max markers, and a change badge. All theme-aware out of the box.
- **Long ranges that just work** — short windows use raw history; longer windows automatically switch to Home Assistant long-term statistics, so a 1-month graph works even after the recorder purges.
- **Tiny** — hand-rolled SVG rendering, no charting library. One small JS file.

## Install

### HACS (recommended)

1. HACS → three-dot menu → **Custom repositories**
2. Add `https://github.com/LeeHueeng/silk-card` with category **Dashboard**
3. Search for **Silk Card**, install, and reload

### Manual

Download `silk-card.js` from the [latest release](https://github.com/LeeHueeng/silk-card/releases), copy it to `config/www/`, then add it as a dashboard resource:

```yaml
url: /local/silk-card.js
type: module
```

## Quick start

```yaml
type: custom:silk-card
entity: sensor.living_room_temperature
```

That's it. The card ships with a full visual editor, so you may never need YAML at all.

## Options

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `entity` | string | — | Entity to graph (or use `entities`) |
| `entities` | list | — | Multiple entities; strings or objects (see below) |
| `name` | string | friendly name | Card title |
| `icon` | string | — | Optional icon next to the title |
| `hours_to_show` | number | `24` | Initial time window |
| `ranges` | list | `[1h, 12h, 1d, 1w, 1m]` | Range chips (`Nh`, `Nd`, `Nw`, `Nm`) |
| `range_selector` | boolean | `true` | Show the range chips |
| `fill` | boolean | `true` | Gradient fill under the line |
| `extremes` | boolean | `true` | Min/max markers |
| `delta` | boolean | `true` | Change-over-window badge |
| `color` | string | theme primary | Line color (any CSS color) |
| `line_width` | number | `2.5` | Line thickness |
| `points` | number | `120` | Resampling resolution |
| `unit` | string | entity unit | Unit override |
| `y_min` / `y_max` | number | auto | Fixed y-axis bounds |

### Multiple entities

```yaml
type: custom:silk-card
name: Climate
entities:
  - entity: sensor.living_room_temperature
    name: Living room
  - entity: sensor.bedroom_temperature
    name: Bedroom
    color: '#f0b357'
hours_to_show: 48
```

Tap a legend chip to spotlight one series; tap again to restore.

### More examples

Minimal, no chrome:

```yaml
type: custom:silk-card
entity: sensor.energy_power
range_selector: false
extremes: false
delta: false
```

Fixed scale for humidity:

```yaml
type: custom:silk-card
entity: sensor.bathroom_humidity
y_min: 0
y_max: 100
```

## Roadmap

- [ ] Attribute graphing (`attribute:` per series)
- [ ] Bar mode for energy/consumption sensors
- [ ] Pinch-to-zoom range adjustment
- [ ] `sum`/`min`/`max` statistics selection for long ranges

Issues and PRs welcome.

## Development

```bash
npm install
npm run watch     # rebuild on change (sourcemapped)
npm run demo      # build + serve the demo page at http://localhost:5050/demo/
npm run typecheck
```

The `demo/` page runs the card against a mock `hass` object with generated data — no Home Assistant needed for UI work.

## License

[MIT](LICENSE)
