## Why

The map is meant for planning bike rides, but the OpenStreetMap base map shows every shop, bus stop, and building, and the bike network is hard to see. The riverside bike paths the map is built around are not drawn at all. Urban paths are drawn as 2139 separate OSM way fragments and hidden by default. Riders also need to know which bridges they can ride across between the two banks.

## What Changes

- Replace the OpenStreetMap standard tiles with the Esri World Light Gray Canvas base map and its label layer, so colored bike routes stand out. CARTO Positron was the first choice, but on 2026-09-25 its tiles returned an "API KEY REQUIRED" image for every referrer.
- Add a build-time route dataset `public/data/routes.json` with the 21 riverside bike-path routes and the 19 bridge bike routes, meaning OSM `route=bicycle` relations whose name contains 橋 and that are not riverside routes. Each route keeps its name, and its member ways are joined into continuous lines.
- Join urban bike-path ways in `public/data/cycling.json` into continuous lines where their end points meet, stopping at junctions. Gaps are not bridged and short pieces are not removed.
- Draw riverside routes and bridge routes on page load in distinct styles; selecting a bridge route shows its name.
- **BREAKING (UI default)**: the `都市自行車道` switch is on by default, and `cycling.json` loads with the page instead of on first toggle.
- The legend covers riverside routes, bridge routes, urban paths, and (at street zoom) signals and crossings.

## Non-Goals (optional)

Recorded in design.md.

## Capabilities

### New Capabilities

(none)

### Modified Capabilities

- `supply-data`: urban cycling paths are published as joined lines, and the guard counts source ways; a new route dataset with riverside and bridge routes, guarded by a minimum number of bridge routes.
- `supply-map`: the base map is Esri World Light Gray Canvas with Esri and OpenStreetMap attribution.
- `cycling-layer`: riverside and bridge routes are drawn on load; the urban switch defaults to on and loads with the page; the legend covers the new route styles.

## Impact

- Affected code: scripts/fetch-data.js, scripts/lib/cycling-layer.js, scripts/lib/check-counts.js, a new route module under scripts/lib/, app/utils/load-data.ts, app/utils/cycling.ts, app/pages/index.vue, app/components/SupplyMap.client.vue, README.md.
- Data: new public/data/routes.json (measured on 2026-09-25: 70 riverside lines, 169 KB raw or 41 KB gzipped, plus 59 bridge lines, 14 KB raw or 3 KB gzipped). public/data/cycling.json paths go from 2139 ways to 1303 joined lines. meta.json gains route counts.
- External services at run time: tiles move from tile.openstreetmap.org to server.arcgisonline.com (Esri World Light Gray Base and Reference), which requires Esri attribution.
- Page load: cycling.json (about 103 KB gzipped) and routes.json (about 44 KB gzipped) now load with the page.
