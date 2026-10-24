## Why

A loop or tour turned on in the `環線` group is drawn in the same brown as the always-drawn 環騎臺北 link line. It mostly runs on top of blue riverside lines and green urban paths, which are drawn over it. Riders cannot tell which line is the one they chose, or where it starts. The user wants the chosen route to stand out and to show where to join it.

## What Changes

- **Highlighted lines.** A shown optional route is drawn in its own highlight color with a white casing. Its lines sit above every riverside, bridge, link and urban line. Vending icons stay above it.
- **Stops in routes.json.** routes.json gains a `stops` array on optional routes:
  - Tours get a start, waypoints and an end, named from the tour page's day segments (for example `臺北府城北門 - 捷運紅樹林車站`).
  - OSM loops made of exactly one line get its two ends as unnamed end points.
  - Other loops get no stops.
- **Refusing to publish.** A tour whose segment names cannot be read as `起點 - 終點`, or whose names do not chain from one segment to the next, blocks publishing.
- **Stop markers.** While a route is shown, each stop gets a marker labelled 起, 經 or 終, or 端 for an unnamed end. A start and end within 50 m share one marker. A marker's popup shows:
  - its label (for example `起點：臺北府城北門`);
  - the nearest YouBike station within 2 km and its distance, with a button that selects that station;
  - a 在 Google 地圖開啟 link for the stop.

## Non-Goals

Recorded in design.md.

## Capabilities

### New Capabilities

(none)

### Modified Capabilities

- `supply-data`: a new Route stops requirement covers the `stops` field and its refuse-to-publish rules.
- `cycling-layer`: the Loop route switches requirement draws shown routes highlighted instead of in the link color, and a new Route stop markers requirement covers the stop markers and their popup.

## Impact

- Affected specs: supply-data, cycling-layer
- Affected code: scripts/lib/tour-routes.js, scripts/lib/tour-routes.test.js, scripts/lib/routes.js, scripts/lib/routes.test.js, scripts/fetch-data.js, scripts/fetch-data.test.js, app/utils/load-data.ts, app/utils/route-stops.ts (new), app/utils/route-stops.test.ts (new), app/components/SupplyMap.client.vue, e2e/map.spec.ts, README.md
- Data: public/data/routes.json regenerated with `stops`.
- No new dependency.
