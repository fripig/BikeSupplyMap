## Context

After add-more-loop-routes, `LOOP_ROUTES` (scripts/lib/loop-routes.js) holds five `{ name, label }` entries and `buildRoutes()` (scripts/lib/routes.js) publishes each as a `kind: "link"` route `{ kind, name, lines }`. scripts/fetch-data.js computes the top-level `vending` array with `routeVending(routes, shops)` over every route line and writes `counts.routeVending`.

On the page, `drawRoutes()` in app/components/SupplyMap.client.vue draws every route into one `routeLayer` and all route-side vending into one `vendingLayer` that follows the 自動販賣機 category (`showVending`). Switches live in app/components/MapControls.vue as `<label class="switch">` blocks bound with `defineModel`; app/pages/index.vue owns the state and passes route data (`routes`, from `useRouteData`) to the map. The legend (`legendEntries()` in app/utils/cycling.ts) already lists `連接道路` whenever routes are loaded.

Measured on the committed 2026-10-24 routes.json and shops.json with a scratch script using `routeVending()`: 72 vending machines lie within 200 m of the always-drawn routes (riverside, bridge, `環騎臺北（連接道路）`); of the rest, 3 lie only near 市民大道-莊敬隧道段, 1 only near 北臺濱海環線, 0 only near 深南路-南深路段 or 研究院路-莊敬隧道段.

## Goals / Non-Goals

**Goals:**

- The page opens with riverside, bridge and `環騎臺北（連接道路）` lines only.
- A `環線` group in the controls lists each optional loop as a switch, off at first; any combination can be on.
- Turning a loop on draws it, shows its route-side vending (when 自動販賣機 is on) and frames it; turning it off removes both.
- Vending icons never appear next to a loop that is not drawn.

**Non-Goals:**

- Making `環騎臺北（連接道路）` optional (the user chose to keep it always drawn).
- Remembering loop switch state across visits or in the URL.
- A different color or legend entry per loop; all link routes keep the `連接道路` brown and legend line.
- Optional riverside or bridge routes.
- Rain shelters, toilets and showers along loops (those datasets still use riverside routes only).

## Decisions

### Optional flag on loop entries

`LOOP_ROUTES` entries take an optional `optional: true`. `buildRoutes()` copies it onto the published link route, so routes.json is the single source the page reads; the page never hard-codes route names. Alternative: a new route kind such as `"loop"` — rejected because the color, popup and legend are the same as `link`, and every `kind` switch in the front end would need a new branch for no visual difference.

### Per-route vending for optional loops

A new `splitRouteVending(routes, shops, meters = 200)` in scripts/lib/routes.js returns `{ vending, routes }`: `vending` is `routeVending()` over the routes without `optional`, and each optional route gets a `vending` array of the machines within `meters` of its own lines that are not in the top-level array (compared by shop id), in the same sorted shape as the top-level array. A machine near two optional loops is listed in both, so it shows whenever either loop is on. fetch-data.js writes the returned routes and top-level vending, and `counts.routeVending` stays the top-level length. Alternative: one vending list with a route-name array per entry — rejected as a bigger shape change to the existing `vending` array the page and tests already read.

### Loop switches in the controls

MapControls.vue gets a `loops: string[]` prop and a `shownLoops: Set<string>` model. When `loops` is non-empty it renders a `<fieldset class="controls">` with legend `環線` and one `.switch` per name, in routes.json order, each `role="switch"`. Toggling replaces the Set (like the category chips) so the parent sees a new value. index.vue derives `loops` from `routes.value?.routes.filter((r) => r.optional).map((r) => r.name) ?? []`, keeps `shownLoops = ref(new Set<string>())`, and passes both down; with no route data (loading or failed) no group is shown.

### Draw and frame loops on demand

`drawRoutes()` skips optional routes. For each optional route it builds, on first need, a lines `LayerGroup` (same style and popup as other link lines) and a vending `LayerGroup` on the shared canvas renderer. A watch on `shownLoops` adds the lines of every newly shown loop and removes the hidden ones, then calls `map.fitBounds()` with padding 16 px on the bounds of the loop(s) just turned on; turning a loop off does not move the map. Loop vending layers are shown when their loop is on and `showVending` is true, added after the lines so icons stay on top; loop lines are inserted below the urban paths the same way `drawRoutes()` keeps routes below `cyclingPaths`.

## Implementation Contract

**Behavior:** On load the map shows riverside, bridge and `環騎臺北（連接道路）` lines and 72 route-side vending icons (2026-10-24 data). The controls show a `環線` group with four switches, all off: `環騎臺北替代道路（深南路-南深路段）`, `環騎臺北替代道路（市民大道-莊敬隧道段）`, `環騎臺北替代道路（研究院路-莊敬隧道段）`, `北臺濱海環線（環島1-1）`. Turning `北臺濱海環線（環島1-1）` on draws its brown line, frames it, and shows its vending icon; clicking the line shows its name; turning it off removes the line and icon and leaves the view.

**Interface / data shape:**
- `LOOP_ROUTES: { name: string, label: string, optional?: true }[]`; the four non-`環騎臺北` entries have `optional: true`.
- routes.json link route: `{ kind: "link", name, lines }` or `{ kind: "link", name, optional: true, lines, vending: RouteVending[] }`.
- `BikeRoute` in app/utils/load-data.ts gains `optional?: true` and `vending?: RouteVending[]`.
- `splitRouteVending(routes, shops, meters?) → { vending, routes }` exported from scripts/lib/routes.js.
- MapControls props/models: `loops: string[]`, `v-model:shown-loops` (`Set<string>`).

**Failure modes:** If routes.json fails to load, no `環線` group appears and the existing `自行車道資料載入失敗` message shows. An older routes.json without `optional` simply has no optional loops (no group, all link routes drawn as before).

**Acceptance criteria:**
- `npx vitest run scripts` covers: `buildRoutes()` copies `optional`; `splitRouteVending()` keeps optional routes out of the top-level array, gives each optional route only its own extra machines, and lists a machine near two optional loops in both; fetch-data writes `optional` and per-route `vending`.
- `npx vitest run app` covers: MapControls renders the `環線` group only with loop names, its switches start from the model, and toggling emits a new Set.
- `npm run test:e2e` covers: no optional loop is drawn on load (clicking a point of `北臺濱海環線（環島1-1）` opens no popup); turning its switch on frames it and the line shows its name; its vending icon appears only while it is on; turning it off removes the line.
- `npm run fetch-data` succeeds; routes.json has four link routes with `optional: true`, and `counts.routeVending` equals the top-level `vending` length.
- `npx vue-tsc --noEmit` passes.

**Scope:** In scope — the loop list, route and vending building, fetch-data output, route types, MapControls, index.vue, SupplyMap route drawing, their tests, e2e tests, README, regenerated data. Out of scope — legend entries, colors, shelters/facilities/cycling datasets, Overpass queries, station classification.

## Risks / Trade-offs

- [Framing 北臺濱海環線 zooms the map far out to 新竹] → intended so the rider sees the whole loop; the rider can zoom back.
- [A station selection and a loop switch both move the map] → the last action wins; acceptable.
- [The 環線 group grows the controls panel on phones] → four rows; accepted, same style as the other switches.

## Migration Plan

Regenerate data and redeploy as usual. Rollback: revert the commits; the previous routes.json draws all link routes.
