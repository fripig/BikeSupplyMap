## Why

The 環線 group only offers loops that exist as OSM `route=bicycle` relations. The user wants the routes recommended on 交通部自行車旅遊網 (https://taiwanbike.tw/bikeRoute/tour). Those are curated day and two-day rides with a full track on each tour page. Four of them run mainly in 雙北, and riders can then switch one on and see the vending machines along it.

## What Changes

- A tour route list is kept in the repository, with four 自行車旅遊網 tours: A01 北海岸漫遊, A02 單車淡蘭極東2日遊, A03 舊草嶺環線, A07 淡水河金色水岸.
- For each listed tour, `npm run fetch-data` downloads `https://taiwanbike.tw/bikeRoute/tour/<id>` and reads the tour track from the page's `__NUXT_DATA__` payload. The track is a GeoJSON LineString or MultiLineString.
- Each tour is published in routes.json as an optional link route with its whole track; nothing is subtracted for riverside or bridge routes. Like the OSM loops it has its own `vending` array of the machines within 200 m that are not in the top-level array.
- The pipeline refuses to publish, keeping the previous data, if a tour page cannot be fetched, has no payload, has no tour with the listed id or name, or has no usable track.
- The `環線` group lists the tours after the OSM loops and uses the same switches: off at first, several can be on, turning one on fits the map to it.
- The page footer credits 交通部自行車旅遊網 as the source of the tour tracks, as its 政府網站資料開放宣告 requires.

## Non-Goals

Recorded in design.md.

## Capabilities

### New Capabilities

(none)

### Modified Capabilities

- `supply-data`: the Bike route dataset requirement gains the tour route list, the tour track source, and the refuse-to-publish rule for tours.
- `cycling-layer`: the Loop route switches requirement lists the tour routes after the OSM loops, and the footer gains the tour track source credit.

## Impact

- Affected specs: supply-data, cycling-layer
- Affected code: scripts/lib/tour-routes.js (new), scripts/lib/tour-routes.test.js (new), scripts/fetch-data.js, scripts/fetch-data.test.js, app/pages/index.vue, e2e/map.spec.ts, README.md
- Data: public/data/routes.json grows by the four tracks (12,528 points after duplicate reduction, measured on 2026-10-24) and their vending arrays; meta.json `counts.routeVending` is unchanged because it counts top-level vending only.
- A new external source at build time: four HTTP GETs to taiwanbike.tw per refresh. No new npm dependency.
