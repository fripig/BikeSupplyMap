## 1. Pipeline

- [x] 1.1 Join ways at two-way end points: add a route module under scripts/lib/ exporting `joinLines(lines)`, which joins lines only where exactly two ends meet (reversing as needed) and stops at dead ends and junctions. Verify: a Vitest test covers every row of the "joining" example table in the supply-data delta spec under `npm test`.
- [x] 1.2 Urban cycling dataset joins paths per kind: `buildCyclingLayer` returns paths joined with `joinLines` separately for `cycleway` and `lane`, sorted by the smallest way id each contains, and also returns the included way count before joining. Verify: updated tests in scripts/lib/cycling-layer.test.js pass, including a case where two touching cycleway ways become one path and a cycleway touching a lane stays two. [after: 1.1]
- [x] 1.3 Bike route dataset / Route dataset in its own file: the route module exports `buildRoutes(body)`, which selects riverside routes (via `isRiversideRoute`) and other relations whose name contains 橋 as bridge routes, joins each route's member ways with `joinLines`, rounds coordinates to 5 decimals, and sorts by relation id. Verify: a Vitest test covers every row of the "route kinds" example table. [after: 1.1]
- [x] 1.4 Guard counts source ways and bridge routes: `checkCounts` gains `bridgeRoutes: 10`; scripts/fetch-data.js passes the pre-join urban way count as `cyclingPaths` to the guard, reuses the route query response for `buildRoutes`, writes `routes.json` one route per line, and adds `counts.bridgeRoutes` and joined-line `counts.cyclingPaths` to meta.json. Verify: fetch-data end-to-end tests assert routes.json content, that 6 bridge routes blocks publishing with a message naming bridge routes and 6, and the meta counts; then `npm run fetch-data` succeeds against live sources and prints riverside and bridge route counts. [after: 1.2, 1.3]

## 2. Map

- [x] 2.1 Esri World Light Gray base map for "Map shows riverside stations by default": SupplyMap.client.vue uses the Esri World_Light_Gray_Base tiles under the bike lines and World_Light_Gray_Reference labels above them, both with `maxNativeZoom` 16 and `maxZoom` 19, and an attribution naming Esri and OpenStreetMap 貢獻者. Verify: `npx nuxi typecheck` reports no errors and the manual check in 2.4 sees Esri tiles and the attribution.
  - Note: first implemented with CARTO Positron; the manual check found every CARTO tile was an "API KEY REQUIRED" image, and the user chose Esri instead.
- [x] 2.2 Urban switch defaults on and loads with the page (Urban bike-path layer toggle): `useCyclingToggle` starts on and loads immediately, keeping failure, retry, and no-reload behavior; a `routes.json` loader in app/utils/load-data.ts runs on mount in index.vue and sets the failure message flag on error. Verify: tests in app/utils/cycling.test.ts assert one load on creation with the switch on, the switch turning off on HTTP 404, the retry, and no reload after success; a load-data test asserts the routes loader rejects on HTTP 404.
- [x] 2.3 Riverside and bridge routes are drawn, with the Route and path styles from the design: SupplyMap.client.vue draws routes from a new `routes` prop on the canvas renderer (riverside blue, bridge purple and clickable with a name tooltip), draws urban paths thinner, keeps Urban bike paths are drawn and Traffic signals and crossings along urban paths behavior, and shows the route legend entries whenever routes are loaded plus urban entries while the urban layer is on. Verify: `npx nuxi typecheck` reports no errors and the manual check in 2.4 passes. [after: 2.1, 2.2]
- [x] 2.4 Manual check in `npm run dev`, desktop and 375 px:
  - Esri light gray tiles, with Esri and OSM in the attribution.
  - Blue riverside, purple bridge, and green urban lines on load, with the switch on.
  - Clicking a bridge line shows its name.
  - Turning the switch off removes only green lines, points, and their legend entries.
  - A station on a route line is still selectable.
  - With routes.json renamed away, 自行車道資料載入失敗 shows and stations still work.

  Record the results in the task notes. [after: 1.4, 2.3]
  - Result (2026-09-25, `npm run dev`, Chrome):
    - The CARTO Positron tiles first used were all "API KEY REQUIRED" images, so the base map moved to Esri (see 2.1). Esri tiles came from server.arcgisonline.com, and the attribution read "Leaflet | Esri, HERE, Garmin, © OpenStreetMap 貢獻者". Labels are bilingual and drawn above the bike lines.
    - On load: routes.json, cycling.json, meta.json, shops.json and stations.json were requested. Blue riverside, purple bridge and green urban lines were drawn with the switch on, and the legend listed all six entries.
    - A real click on a purple line opened the popup 「新北大橋-重翠大橋自行車道」.
    - Switch off: only the green lines went away, and the legend showed just 河濱自行車道 and 橋梁自行車道.
    - A real click on the station 親水公園, which sits on a riverside line, selected it (附近 5 家) with no route popup.
    - routes.json renamed away (HTTP 404): 「自行車道資料載入失敗」 was shown, the urban layer and its legend still worked, and 34 riverside clusters were shown.
    - 375 px iframe: scrollWidth was 360. The legend (142×122) first overlapped the attribution line, so a phone-only bottom margin was added; after it, the legend bottom was at 730 and the attribution top at 739.

## 3. Docs and release

- [x] 3.1 README describes the Esri light gray base map and Esri credit, riverside and bridge routes drawn by default, the urban switch default, and that lines are joined only where ways meet. The data-source table adds Esri. Verify: content review of README.md. [after: 2.4]
- [x] 3.2 Regenerated public/data/cycling.json, routes.json and meta.json ship in the same commit as the UI change. Verify: `npm test` and `npm run generate` pass, and `git show --stat` lists the three data files with the app/ changes. [after: 3.1]
