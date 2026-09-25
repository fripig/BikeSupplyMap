## Why

The rider this map is for rides the riverside bike paths (淡水河, 基隆河, 新店溪, 大漢溪, 景美溪 and their branches), not city streets. Showing all 3366 YouBike stations buries the roughly 300 stations next to those paths under dense urban clusters, so the useful stations are hard to find.

## What Changes

- Add a build-time step that fetches the riverside bike-path routes in Taipei City and New Taipei City from OpenStreetMap and marks every station within 200 m of one of those paths as a riverside station. The flag is stored on each station in `public/data/stations.json`.
- The data pipeline refuses to publish when the riverside routes or the riverside station count come back suspiciously small, in the same way it already guards station and shop counts.
- The map shows only riverside stations by default. A new 「顯示市區站點」 toggle in the controls, off by default, adds the other (urban) stations back, drawn in a muted style so riverside stations stay distinguishable.
- On load the map frames the riverside stations instead of the fixed downtown view.
- Nearby-shop search is unchanged: straight-line distance with the 300 m / 500 m / 1 km radius.

## Non-Goals (optional)

Recorded in design.md.

## Capabilities

### New Capabilities

(none)

### Modified Capabilities

- `supply-data`: stations gain a `riverside` flag computed from OSM riverside bike-path routes; the publish guard gains minimums for those routes and for riverside stations; `meta.json` reports the riverside station count.
- `supply-map`: the map shows riverside stations by default, with a toggle that adds urban stations; the initial view frames riverside stations.

## Impact

- Affected code: scripts/fetch-data.js, scripts/lib/check-counts.js, a new riverside-classification module under scripts/lib/, app/utils/geo.ts (Station type), app/pages/index.vue, app/components/MapControls.vue, app/components/SupplyMap.client.vue.
- Data: public/data/stations.json gains a `riverside` field on every record; public/data/meta.json gains a riverside station count.
- External services at build time: one additional Overpass API query against the same instances already used for shops.
- README: feature list describes the riverside default and the toggle.
