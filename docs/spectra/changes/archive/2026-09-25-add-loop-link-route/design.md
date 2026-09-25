## Context

`scripts/fetch-data.js` runs one route Overpass query (`ROUTES_QUERY`) that returns every `route=bicycle` relation in 臺北市 and 新北市 with `out body`, plus the geometry of all their member ways. `buildRoutes()` in scripts/lib/routes.js keeps a relation only when `routeKind()` returns `riverside` or `bridge`, then appends supplementary bridges from scripts/lib/bridge-supplements.js. The OSM relation `環騎臺北` (id 19140471) is already in that response but is dropped because its name matches neither rule.

Measurements taken on 2026-09-25 (scratch scripts against live Overpass and the committed routes.json):
- `環騎臺北` is 66.9 km long; 14.0 km of it lies more than 40 m from any published route line, almost all on the 南港 → 研究院路 → 木柵 link.
- Dropping every member way that also belongs to one of the riverside relations it shares ways with (新店溪右岸, 景美溪左/右岸, 基隆河左岸, 淡水河河濱, 社子島環島) leaves 60 ways, 15.7 km.

The front end types routes as `kind: 'riverside' | 'bridge'` in app/utils/load-data.ts; `drawRoutes()` in app/components/SupplyMap.client.vue picks color and interactivity from `kind`; `legendEntries()` in app/utils/cycling.ts lists the route legend lines.

## Goals / Non-Goals

**Goals:**

- The map shows a continuous 環小台北 loop by drawing the parts of `環騎臺北` that no riverside or bridge route already covers.
- Link lines are visually distinct from riverside and bridge lines, selectable for their name, and listed in the legend.
- Vending machines within 200 m of link lines appear like other route-side vending machines.
- A rename or deletion of the relation in OSM fails the refresh loudly instead of silently dropping the link.

**Non-Goals:**

- Drawing the whole 66.9 km relation on top of the riverside lines (rejected: duplicates lines and hides riverside color).
- Adding other road routes such as `環島1號線`, `南港展覽館站至軍人公墓`, or `深坑自行車道`; the list mechanism allows it later but this change adds only `環騎臺北`.
- Changing the YouBike `riverside` flag, the riverside route minimum, or the urban cycling layer's riverside-way exclusion.
- Adding a toggle for link routes; they follow the always-on route layer.
- New meta.json counts.

## Decisions

### Loop route list keyed by relation name

A new module scripts/lib/loop-routes.js exports `LOOP_ROUTES = [{ name: '環騎臺北', label: '環騎臺北（連接道路）' }]`, mirroring `BRIDGE_SUPPLEMENTS`. Selection is by exact relation `name` because the existing query already returns the relation, so no Overpass query change is needed. Alternative: select by relation id — rejected because the rest of the pipeline keys on names and the failure rule already catches renames.

### Subtract riverside and bridge ways by way id

The link route is the relation's member ways minus every way that is a member of any relation published as riverside or bridge. Way-id subtraction is exact and cheap; the measured result (15.7 km) matches the geometric gap (14.0 km) closely. Alternative: geometric subtraction (drop ways within 40 m of a published line) — rejected as slower and threshold-sensitive; the extra ~1.7 km from way-id subtraction is short connector pieces the riverside relations do not list, which are correct to draw as link.

### Link routes placed after supplementary bridges

`buildRoutes()` appends link routes after the supplementary bridge routes, in list order, and reports entries that match no relation or keep no way in a new `missingLoops` array, which fetch-data.js turns into a publish-blocking problem message just like `missingSupplements`.

### Link kind excluded from riverside classification

`riversideSegments()` keeps using `isRiversideRoute()`, so link ways never feed station classification or `riversideWayIds`. `routeKind()` stays unchanged; a loop relation that also matches the riverside or bridge rule is not expected and is not special-cased.

### Third route color with popup

`BikeRoute.kind` becomes `'riverside' | 'bridge' | 'link'`. `drawRoutes()` draws link lines with weight 6, opacity 0.9, color `LINK_COLOR = '#9c6644'` (brown, distinct from riverside `#1971c2`, bridge `#ae3ec9`, urban `#2f9e44`, every shop category color in app/utils/categories.ts, whose convenience color `#d9480f` rules out orange, and the urban layer's signal dot `#e03131`, which rules out red), interactive with a name popup like bridge lines. `legendEntries()` adds `{ label: '連接道路', icon: 'line cycling-legend__line--link' }` right after 橋梁自行車道, with a matching CSS rule in SupplyMap.client.vue.

## Implementation Contract

**Behavior:** After a data refresh, routes.json contains one route `{ kind: "link", name: "環騎臺北（連接道路）", lines: [...] }` whose lines cover 研究院路 between 南港 and 木柵. On the map this appears as a brown thick line; clicking it shows `環騎臺北（連接道路）`; the legend shows `連接道路` whenever routes are loaded; route-side vending near 研究院路 is marked.

**Interface / data shape:**
- `LOOP_ROUTES: { name: string, label: string }[]` exported from scripts/lib/loop-routes.js.
- `buildRoutes(body, supplements = [], loops = [])` returns `{ routes, missingSupplements, missingLoops }`; `missingLoops` holds entry `name`s.
- routes.json route objects keep the shape `{ kind, name, lines }`; `kind` gains the value `"link"`.
- `BikeRoute['kind']` in app/utils/load-data.ts is `'riverside' | 'bridge' | 'link'`.

**Failure modes:** A missing or fully-subtracted loop entry adds the problem `loop route 環騎臺北: no relation with this name, or no way left outside riverside and bridge routes` and the pipeline exits non-zero with no file in public/data/ modified. A stale routes.json without link routes renders as before (no link line, legend still lists 連接道路).

**Acceptance criteria:**
- `npx vitest run scripts/lib/routes.test.js` covers: link way subtraction (riverside and bridge member ways dropped, ways of unpublished relations kept), link routes after supplementary bridges, `missingLoops` for an absent relation and for a fully-subtracted relation, and a vending machine near only a link line included by `routeVending()`.
- `npx vitest run app/utils/cycling.test.ts` asserts the new legend order.
- An e2e test in e2e/map.spec.ts reads the published routes.json through the existing `loadRoutes` helper, clicks a point on the `環騎臺北（連接道路）` line, and asserts the popup text `環騎臺北（連接道路）`.
- A real `node scripts/fetch-data.js` run publishes routes.json with the link route and logs a link count.

**Scope:** In scope — scripts/lib/loop-routes.js, scripts/lib/routes.js, scripts/fetch-data.js, their tests, app/utils/load-data.ts, app/utils/cycling.ts, app/components/SupplyMap.client.vue, e2e tests, regenerated public/data files. Out of scope — cycling.json, stations.json classification logic, Overpass queries, UI controls.

## Risks / Trade-offs

- [OSM editors change `環騎臺北` membership so a riverside stretch uses ways outside riverside relations] → those stretches draw brown over blue; acceptable and visible on review of the data diff.
- [Relation renamed or deleted] → refresh fails with a message naming `環騎臺北`; fix by updating LOOP_ROUTES.

## Migration Plan

Deploy by regenerating data and redeploying the site as usual. Rollback: revert the commit; the previous routes.json has no link route and the old front end ignores nothing new.
