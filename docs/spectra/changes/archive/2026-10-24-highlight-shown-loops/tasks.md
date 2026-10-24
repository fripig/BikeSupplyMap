## 1. Route stops in routes.json

- [x] 1.1 Deliver the Route stops requirement for tours: `tourStops(tour)` in scripts/lib/tour-routes.js returns `{ stops }` (start, via per non-last segment, end, each from its own segment's point list, `[lat, lng]` rounded to 5 decimals) or `{ error }` (`no segments`, `segment name <name> is not "<from> - <to>"`, `segment <n> starts at <x>, not <y>`, `invalid position`).
  - In scripts/fetch-data.js, `fetchTourRoute()` adds the stops to each tour route as `{ kind, name, optional, lines, stops }`, and turns an error into `tour route <id> <name>: <error>`.
  - The fixture `tourRecord()` in scripts/lib/tour-page.fixture.js gains a default one-segment `route` built from the first line, so existing fetch-data cases keep passing.
  - Verified with `npx vitest run scripts` by new scripts/lib/tour-routes.test.js cases:
    - both rows of the spec's "tour stops" example;
    - an unsplittable name;
    - a broken chain;
    - an invalid position;
    - an empty `route`.
  - Also verified by new scripts/fetch-data.test.js cases:
    - A07 named `臺北府城北門至捷運紅樹林車站` rejects, naming `A07` and keeping the previous data;
    - A01 with segments `松山車站 - 白沙灣` and `淡水 - 基隆車站` rejects, naming `A01`.
- [x] 1.2 [after: 1.1] Give OSM loop routes their stops: `buildRoutes()` in scripts/lib/routes.js publishes an optional link route with one line as `{ kind, name, optional, lines, stops }` with two `tip` stops (`name: null`) at the line's ends, and with more lines `stops: []`. Non-optional routes stay without `stops`.
  - Verified in scripts/lib/routes.test.js with `npx vitest run scripts/lib/routes.test.js`: a one-line optional loop, a two-line optional loop, and a non-optional loop whose keys stay exactly `kind,name,lines`.
  - The fetch-data success case for `北臺濱海環線（環島1-1）` (one fixture line) now expects two `tip` stops, and `npx vitest run scripts` passes.
- [x] 1.3 [after: 1.2] Regenerate data with `npm run fetch-data`.
  - routes.json stops match the design's acceptance list: A01, A02, A03 and A07 as listed; two `tip` stops on each 替代道路; `[]` on 北臺濱海環線.
  - Record the routes.json byte size before and after in design.md under the "routes.json grows" risk.
  - Verified by the command output and a node check of routes.json.

## 2. Highlighted loops with stop markers

- [x] 2.1 Add stop marker labels and the nearest station in app/utils/route-stops.ts: `stopMarkers(stops)` returns `{ glyph, label, lat, lng }` per marker, merging a start and an end within 50 m, and `nearestStation(point, stations, maxMeters = 2000)` returns `{ station, meters }` or `null`. `BikeRoute` in app/utils/load-data.ts gains `stops?: RouteStop[]`.
  - Verified by app/utils/route-stops.test.ts with `npx vitest run app/utils/route-stops.test.ts`:
    - the three rows of the spec's "stop markers" example;
    - `nearestStation` picking the closer of two stations;
    - `nearestStation` returning `null` beyond 2 km.
- [x] 2.2 [after: 1.3, 2.1] Deliver the modified Loop route switches requirement and the Route stop markers requirement: highlight shown loops with a white casing and draw stop markers with the nearest YouBike station. In app/components/SupplyMap.client.vue:
  - optional route lines are drawn as a white weight-10 casing under a `#f03e3e` weight-6 line;
  - `raiseOverRoutes()` re-adds urban paths, then shown loop lines, then vending layers;
  - each loop layer gains a stops layer of `route-stop-icon` markers with `zIndexOffset: 1000`;
  - each stop popup shows the label, `最近的 YouBike：<name>（<distance>）` with a `選這個站` button that emits `select` and closes the popup (or `2 km 內沒有 YouBike 站` without one), and the `placePopup` Google Maps link.

  Verified by `npm run test:e2e` with new tests for:
  - "A shown loop is highlighted above other lines": the pixel at a 淡水河金色水岸 point on a riverside line is the highlight color;
  - "Tour start marker";
  - "Selecting the nearest station from a stop": the popup lists the station nearest per stations.json, the Google Maps link equals `mapsPlaceUrl` of the stop, and after `選這個站` the selected station's name is shown in the side panel;
  - "Stop markers follow the switch".

  Also verified by `npx vue-tsc --noEmit`.
- [x] 2.3 [after: 2.2] Update README.md: the 環線 feature line describes the highlight and the 起／經／終／端 markers with the nearest YouBike station, and the 推薦遊程 section explains how stops come from the day segments and the new failure messages. Verified by content review against routes.json.
