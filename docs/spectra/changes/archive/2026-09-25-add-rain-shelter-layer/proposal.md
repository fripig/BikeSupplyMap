## Why

Riders caught in rain on the riverside bike paths have no way to find cover on the map. OSM already holds the data: measured on 2026-09-25 with scratch scripts against live Overpass and the committed routes.json, riverside route lines pass under 157 distinct elevated road or rail bridges (2,296 bridge ways checked, crossings merged within 60 m), and 175 shelters lie within 100 m of a riverside route line (102 `amenity=shelter` other than bus shelters, 73 `building=roof`).

## What Changes

- The data pipeline publishes a new file `public/data/shelters.json` listing two kinds of rain shelter along riverside routes: `bridge` spots, where a riverside route line passes under an elevated road or rail bridge, named after the bridge; and `shelter` spots, OSM shelters and roofs within 100 m of a riverside route line.
- The pipeline refuses to publish when either kind falls below a minimum (80 each), and meta.json reports both counts.
- The controls gain a `躲雨點` switch, off by default. Turning it on loads shelters.json once and marks every spot on the map with an icon per kind; selecting an icon shows `<bridge name> · 橋下` (or `高架橋下` when unnamed) for bridge spots and the shelter's name (or `涼亭`) for shelter spots. A load failure shows `躲雨點資料載入失敗` and turns the switch back off.
- The legend lists `橋下躲雨點` and `涼亭躲雨點` while the switch is on.
- Public toilets are not marked.

## Non-Goals

Recorded in design.md.

## Capabilities

### New Capabilities

- `rain-shelter-layer`: the 躲雨點 switch, its lazy loading and failure handling, the shelter icons and their popups.

### Modified Capabilities

- `supply-data`: adds the rain shelter dataset requirement (selection rules, file shape, minimums, meta counts).
- `cycling-layer`: the legend requirement gains the two shelter entries shown while the 躲雨點 switch is on.

## Impact

- Affected specs: supply-data, cycling-layer, rain-shelter-layer (new)
- Affected code: a new module scripts/lib/shelters.js with tests, scripts/fetch-data.js, scripts/fetch-data.test.js, scripts/lib/check-counts.js, app/utils/cycling.ts, app/utils/load-data.ts, app/pages/index.vue, app/components/MapControls.vue, app/components/SupplyMap.client.vue and their tests, e2e/map.spec.ts, README.md
- Data: new public/data/shelters.json; meta.json gains `counts.shelters`.
- One more Overpass query per data refresh, run after the existing queries.
