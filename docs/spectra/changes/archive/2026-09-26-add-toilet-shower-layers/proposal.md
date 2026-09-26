## Why

Riders on the riverside bike paths also look for toilets and a place to shower, and the map shows neither. Measured on 2026-09-26 with scratch scripts against live Overpass and the committed routes.json: 335 `amenity=toilets` lie within 100 m of a riverside route line (124 tagged `wheelchair`, 88 `unisex`, 65 `changing_table`, 44 `fee`, 16 named), while OSM showers are scarce — 11 `amenity=shower` in the two cities, 2 of them within 300 m of a riverside line — so sports centres (`leisure=sports_centre` named with 運動中心), which usually have paid showers, are the practical source: 12 lie within 1 km of a riverside line.

## What Changes

- The data pipeline publishes a new file `public/data/facilities.json` with two arrays: `toilets` (every `amenity=toilets` within 100 m of a riverside route line, with its name and raw `wheelchair`, `changing_table`, `unisex`, and `fee` values) and `showers` (every `amenity=shower` within 300 m, and every `leisure=sports_centre` whose name contains 運動中心 within 1 km, of a riverside route line).
- The pipeline refuses to publish with fewer than 150 toilets or fewer than 5 showers, and meta.json reports both counts.
- The controls gain two switches, `廁所` and `淋浴`, each off by default. The first one turned on loads facilities.json once for both; each switch shows or hides its own icons. A load failure shows a message under the switch that was turned on and turns it back off.
- Selecting a toilet shows its name (or `公廁`) followed by the tagged attributes among 無障礙, 部分無障礙, 尿布台, 性別友善, 免費, 收費; untagged attributes are not shown. Selecting a shower shows `<name> · 淋浴間（可能收費）` for a sports centre, or the shower's name (or `淋浴間`) with 免費 or 收費 when tagged.
- The legend lists `廁所` and `淋浴` while their switch is on. `legendEntries()` takes its growing list of flags as one options object.

## Non-Goals

Recorded in design.md.

## Capabilities

### New Capabilities

- `toilet-shower-layers`: the 廁所 and 淋浴 switches, their shared lazy loading and failure handling, icons, and popups.

### Modified Capabilities

- `supply-data`: adds the toilet and shower dataset requirement (selection rules, file shape, minimums, meta counts).
- `cycling-layer`: the legend requirement gains the 廁所 and 淋浴 entries.

## Impact

- Affected specs: supply-data, cycling-layer, toilet-shower-layers (new)
- Affected code: a new module scripts/lib/facilities.js with tests, scripts/fetch-data.js, scripts/fetch-data.test.js, scripts/lib/check-counts.js and its test, app/utils/cycling.ts and its test, app/utils/load-data.ts, app/pages/index.vue, app/components/MapControls.vue and its test, app/components/SupplyMap.client.vue, e2e/map.spec.ts, README.md
- Data: new public/data/facilities.json; meta.json gains `counts.toilets` and `counts.showers`.
- One more Overpass query per data refresh, run after the rain shelter query.
