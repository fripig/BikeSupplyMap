## 1. Pipeline

- [x] 1.1 Shop classification rules / Vending rule runs before brand and shop-tag rules: `classifyShop` in scripts/lib/classify-shop.js returns category `vending` for `amenity=vending_machine` elements with no `vending` tag or with any food or drink value, and excludes other vending machines, before brand rules. Verify: new rows in scripts/lib/classify-shop.test.js cover every vending row of the "classification table" example in the supply-data delta spec, and existing rows still pass under `npm test`.
- [x] 1.2 Supplementary bridge list selects ways by name, highway and bridge: add scripts/lib/bridge-supplements.js with the 重陽橋 entry (`name` 重陽橋, `highway` secondary, `label` 重陽橋（人行道）); `buildRoutes(body, supplements)` appends one `bridge` route per entry, joined with `joinLines`, and reports entries that selected no way. Verify: Vitest cases in scripts/lib/routes.test.js cover every row of the "supplementary way selection" example and a missing entry being reported.
- [x] 1.3 Route-side vending computed at build time: `routeVending(routes, shops, meters = 200)` in scripts/lib/routes.js returns vending shops within 200 m of any route line segment as `{ name, vending, lat, lng }` sorted by shop id. Verify: a Vitest case with shops 150 m and 250 m from a line returns only the 150 m one. [after: 1.2]
- [x] 1.4 Shop dataset covers both cities, Bike route dataset, and Pipeline refuses to publish incomplete data, wired in scripts/fetch-data.js (Shops query gains vending machines; A supplementary bridge that selects nothing blocks publishing):
  - The shop query adds the vending machine clause.
  - The route query adds one clause per supplement.
  - The pipeline writes supplementary routes and the `vending` array to routes.json.
  - shopCounts and meta gain `vending`, and meta gains `routeVending`.
  - "Pipeline refuses to publish incomplete data" gains `vendingMachines: 100` in `checkCounts`, and a missing supplement fails with its name.

  Verify:
  - fetch-data end-to-end tests assert vending shops in shops.json, the supplementary route and `vending` array in routes.json, rejection at 40 vending machines, and rejection naming 重陽橋 when no way matches.
  - `npm run fetch-data` succeeds live and prints the vending and route-side vending counts.

  [after: 1.1, 1.3]

## 2. Map

- [x] 2.1 Category filter gains 自動販賣機: `Category` in app/utils/geo.ts and CATEGORIES, CATEGORY_LABELS, CATEGORY_COLORS in app/utils/categories.ts include `vending` (自動販賣機, `#0c8599`), so the MapControls chips and station shop list show it. Verify: app/utils/categories.test.ts asserts five categories with labels and colors, and the manual check in 2.3 filters a station list with the 自動販賣機 toggle.
- [x] 2.2 Vending icons and popup for "Riverside and bridge routes are drawn": `RouteData` gains `vending`; app/utils/cycling.ts gains `vendingLabel(name, vending)`, and `legendEntries` lists 自動販賣機 with the route entries (Traffic signals and crossings along urban paths legend rule); SupplyMap.client.vue draws route-side vending as clickable teal circles with the label popup. Verify: Vitest covers every row of the "vending popup text" example and the updated legend combinations; `npx nuxi typecheck` reports no errors. [after: 2.1]
- [x] 2.3 Manual check in `npm run dev`, desktop and 375 px:
  - The purple 重陽橋 main span shows 重陽橋（人行道） on click.
  - Teal vending icons appear along routes on load, with popup text matching the data.
  - The 自動販賣機 toggle removes vending machines from a station's list, and hides the route-side vending icons and the 自動販賣機 legend entry; turning it on shows them again.
  - The legend lists 自動販賣機.
  - A station on a line is still selectable.

  Record the results in the task notes. [after: 1.4, 2.2, 2.4]

  Results (2026-09-25, `npm run dev`):
  - By Claude in Chrome, desktop: the 自動販賣機 chip and legend entry are shown; teal vending icons appear along routes near 大稻埕 on load; the popup of an untagged machine reads 自動販賣機, matching its `vending: null` record. After 2.4, toggling the chip removes and restores the legend entry (`aria-pressed` true → false → true).
  - By the user, desktop and 375 px: accepted all items (重陽橋 popup, route-side icons and legend following the toggle, station list filtering, station selection).
- [x] 2.4 Route-side vending follows the 自動販賣機 toggle (compensates the always-on icons from 2.2 and the README text from 3.1, per the design decision "Route-side vending follows the 自動販賣機 toggle"):
  - `legendEntries(routesShown, urbanShown, vendingShown)` in app/utils/cycling.ts lists 自動販賣機 only when `vendingShown` is true.
  - SupplyMap.client.vue keeps route-side vending markers in their own layer group and adds or removes it when a new `showVending` prop changes, refreshing the legend; app/pages/index.vue passes `enabledCategories.has('vending')`.
  - README.md says the route-side vending icons follow the 自動販賣機 toggle.

  Verify: app/utils/cycling.test.ts covers every row of the "legend entries" example in the cycling-layer delta spec; `npm test` and `npx nuxi typecheck` pass. [after: 2.2, 3.1]

## 3. Docs and release

- [x] 3.1 README describes the supplementary bridge list and how to add an entry, the 重陽橋 sidewalk note, vending machines as a category and along routes, and that vending coverage depends on OSM. Verify: content review of README.md. [after: 2.3]
- [x] 3.2 Regenerated shops.json, routes.json and meta.json ship in the same commit as the UI change. Verify: `npm test` and `npm run generate` pass, and `git show --stat` lists the three data files with the app/ changes. [after: 3.1, 2.3]
