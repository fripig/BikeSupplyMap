## Why

Station markers look different depending on kind: riverside stations are 14 px orange dots whose clusters use leaflet.markercluster's default green, yellow and orange circles, while non-riverside stations are 10 px gray dots with gray clusters. Now that the 河濱站點 and 市區站點 switches decide which kinds are shown, the extra style difference adds visual noise, and plain dots do not read as YouBike stations next to the new 廁 / 浴 / 橋 / 亭 glyph icons.

## What Changes

- Draw every station marker, riverside or not, with one icon: an 18 px orange circle with a white line-drawn bicycle.
- Draw the selected station as a 26 px darker orange circle with the same bicycle.
- Draw every station cluster, riverside or not, with one style: an orange circle with the white station count, replacing markercluster's default green / yellow / orange clusters and the gray urban clusters.
- Remove the requirement that non-riverside stations use a visually distinct style; the two kinds are told apart only by the switches.

## Non-Goals (optional)

(Recorded in design.md.)

## Capabilities

### New Capabilities

(none)

### Modified Capabilities

- `supply-map`: station markers and clusters of both kinds share one bicycle icon and one cluster style instead of a distinct urban style.

## Impact

- Affected specs: supply-map
- Affected code: app/components/SupplyMap.client.vue, nuxt.config.ts, e2e/map.spec.ts, README.md
- No data change.
