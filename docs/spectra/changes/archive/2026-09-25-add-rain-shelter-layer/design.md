## Context

The map draws riverside, bridge, and link routes from `public/data/routes.json`, built by scripts/fetch-data.js from sequential Overpass queries (shops, routes, urban cycling). The urban layer (`cycling.json`) is loaded through `useCyclingToggle()` in app/utils/cycling.ts and `createCyclingLoader()` in app/utils/load-data.ts: a switch-driven lazy loader that retries after a failure and never reloads after success; it starts on.

Measurements taken on 2026-09-25 with scratch scripts against live Overpass (maps.mail.ru instance) and the committed routes.json:
- 2,296 bridge ways match the bridge filter; riverside route lines cross them 394 times, merging to 157 spots at a 60 m radius. The query answered in well under the 170 s timeout.
- Within 100 m of a riverside route line: 102 `amenity=shelter` (excluding `shelter_type=public_transport`) and 73 `building=roof`, 175 in total. 333 `amenity=toilets` also lie within 100 m and are deliberately left out.
- About 70 % of the nearby shelters have no `shelter_type`, so the popup cannot reliably say 涼亭 vs 遮雨棚; the generic fallback 涼亭 was chosen by the user.

## Goals / Non-Goals

**Goals:**

- A `躲雨點` switch, off by default, that shows bridge-underpass spots and shelter spots along riverside routes with distinct icons and name popups.
- Data built at refresh time into a separate `shelters.json`, fetched only when the switch is first turned on.
- A refresh that would publish implausibly few spots fails instead.

**Non-Goals:**

- Public toilets, convenience stores, or MRT stations as rain cover.
- Judging clearance, width, or whether a bridge deck actually keeps rain off; spots are geometric.
- Spots along bridge or link routes, or along the urban cycling layer.
- Clustering shelter icons, filtering by kind, or remembering the switch state across visits.
- Changing station riverside classification.

## Decisions

### Separate shelters.json built by a shelter query

A new `SHELTERS_QUERY` in scripts/fetch-data.js fetches bridge ways with `out geom` and shelters/roofs with `out center tags` in one request, run after the urban cycling query so a public instance never sees two heavy requests at once. The result goes to its own file rather than into routes.json, so the default page load does not download ~330 extra points that most visits never show. Alternative: append to routes.json — rejected because routes.json loads on every visit.

### Bridge spots from segment crossings merged at 60 m

scripts/lib/shelters.js exports `bridgeSpots(riversideRoutes, bridgeWays)`: segment–segment intersection of each bridge way against riverside route lines (planar lat/lng intersection is adequate at these lengths), using a 0.01° grid to limit candidate pairs; crossings processed by way id and position, merged when within 60 m of a kept spot. Divided carriageways and parallel ramps of one bridge fall within 60 m and become one spot. Alternative: proximity (route point within N m of a bridge way) — rejected because it also flags paths running alongside a viaduct without passing under it.

### Shelter spots within 100 m of riverside lines

`shelterSpots(riversideRoutes, elements)` reuses `isNearSegments()` from scripts/lib/riverside.js with 100 m, the same point-to-segment distance used for stations and vending. Element ids use the shop form (`n123`, `w456`) and are deduplicated.

### Shelter minimums in check-counts

`MINIMUMS` in scripts/lib/check-counts.js gains `bridgeShelters: 80` and `shelters: 80` with labels `bridge shelter spots` and `shelter spots` — about half the measured 157 and 175, so an OSM regression or a broken query fails while normal edits pass. meta.json gains `counts.shelters = { bridge, shelter }`.

### Generic lazy switch for the shelter layer

`useCyclingToggle(load)` becomes a thin wrapper over a generic `useLazyToggle<T>(load, initiallyOn)` in app/utils/cycling.ts; the cycling layer calls it with `true`, the shelter layer with `false`. `createCyclingLoader` in app/utils/load-data.ts is generalized the same way into `createJsonLoader<T>(fetchFn, baseURL, file)`, and `createCyclingLoader` stays as a wrapper so its existing tests keep passing. The shelter failure message is its own `shelterFailed` flag, shown under the new switch in app/components/MapControls.vue.

### Rounded square glyph icons below stations

Shelter icons are Leaflet `divIcon` markers (class `shelter-icon`, 18 px rounded square, background `#495057`, white glyph `橋` or `亭`) in their own layer group, with `zIndexOffset: -1000` so station markers stay on top. Glyph squares are distinct from every existing circle icon. Popup text comes from a pure `shelterLabel(kind, name)` in app/utils/cycling.ts. `legendEntries()` gains a fourth parameter `sheltersShown` and adds `{ label: '橋下躲雨點', icon: 'glyph cycling-legend__glyph--bridge' }` and `{ label: '涼亭躲雨點', icon: 'glyph cycling-legend__glyph--shelter' }` after 自動販賣機.

## Implementation Contract

**Behavior:** With the switch off (default) the page is unchanged and never fetches shelters.json. Turning `躲雨點` on draws about 330 gray square icons (橋 / 亭) along riverside routes; clicking one shows e.g. `中正橋 · 橋下` or `涼亭`; the legend adds 橋下躲雨點 and 涼亭躲雨點.

**Interface / data shape:**
- `public/data/shelters.json`: `{"shelters":[ {"kind":"bridge"|"shelter","name":string|null,"lat":number,"lng":number}, ... ]}`, one entry per line like the other data files.
- scripts/lib/shelters.js exports `bridgeSpots(routes, bridgeWays)`, `shelterSpots(routes, elements)`, and the constants `BRIDGE_SPOT_MERGE_METERS = 60` and `SHELTER_NEAR_METERS = 100`.
- app/utils/load-data.ts: `interface Shelter { kind: 'bridge' | 'shelter'; name: string | null; lat: number; lng: number }`, `interface ShelterData { shelters: Shelter[] }`, `createJsonLoader<T>(fetchFn, baseURL, file)`.
- app/utils/cycling.ts: `shelterLabel(kind, name): string`, `useLazyToggle<T>(load, initiallyOn)`, `legendEntries(routesShown, urbanShown, vendingShown, sheltersShown)`.
- SupplyMap.client.vue gains props `showShelters: boolean` and `shelters: ShelterData | null`.

**Failure modes:** Shelter query failure or a count below a minimum → pipeline exits non-zero, no file in public/data/ changes, message names the source and count. shelters.json fetch failure in the browser → `躲雨點資料載入失敗`, switch off, retry on next switch-on.

**Acceptance criteria:**
- `npx vitest run scripts/lib/shelters.test.js` covers every row of the crossing merge, bridge way selection, and shelter selection examples.
- `npx vitest run scripts/fetch-data.test.js` covers shelters.json output order, meta counts, and the too-few rejection.
- `npx vitest run app` covers `shelterLabel` rows, the legend example table, `useLazyToggle` with initial off (no load until on, single load, retry), and the MapControls switch label, default, and failure message.
- `npx vue-tsc --noEmit` passes.
- `npm run test:e2e` covers: no shelters.json request at load; switch on draws icons and adds legend entries; clicking a bridge icon shows its `· 橋下` text.
- A real `npm run fetch-data` publishes shelters.json with at least 80 of each kind.

**Scope:** In scope — the files named in the proposal's Impact. Out of scope — station classification, routes.json and cycling.json contents, existing switches' behavior, deployment workflows.

## Risks / Trade-offs

- [A crossing under a ramp where the path actually runs beside the viaduct] → spot is still near cover; accepted.
- [Bridges over the path without OSM `bridge=yes` (tagged `bridge=viaduct` or `layer` only)] → missed; the filter uses `bridge=yes` only, matching the measured 157. Widening is a follow-up if riders report gaps.
- [Refresh time grows by one Overpass query] → measured under 170 s; the retry and instance fallback in `fetchOverpass()` apply.
- [`building=roof` includes non-public canopies such as a gas station roof] → only those within 100 m of a riverside line are kept, which rules out most; popup says 涼亭 as a generic fallback.

## Migration Plan

Regenerate data and deploy as usual. Rollback: revert the commit; the old front end never requests shelters.json.
