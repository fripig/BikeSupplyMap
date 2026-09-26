## Context

The rain shelter change (archived as add-rain-shelter-layer) set the pattern this change follows: scripts/lib/shelters.js selects OSM elements near riverside route lines; scripts/fetch-data.js runs the Overpass queries one after another (shops, routes, urban cycling, shelters) and writes every file only after all count checks pass; the page uses `useLazyToggle(load, false)` from app/utils/cycling.ts with `createJsonLoader()` from app/utils/load-data.ts for an off-by-default switch that fetches its file on first use; SupplyMap.client.vue draws 18 px rounded square glyph icons (`shelter-icon`) with `zIndexOffset: -1000` so station markers stay on top.

Measurements taken on 2026-09-26 with scratch scripts against live Overpass (overpass-api.de) and the committed routes.json:
- 335 `amenity=toilets` within 100 m of a riverside route line (357 within 100 m of any route line). Among the 335: `wheelchair` tagged on 124, `unisex` 88, `changing_table` 65, `fee` 44, `access` 40, `name` 16, `opening_hours` 2.
- `amenity=shower`: 11 in the two cities; 2 within 300 m of a riverside line (146 m and 165 m, unnamed), 3 within 500 m.
- `leisure=sports_centre` named with 運動中心: 29 in the two cities; 4 within 500 m and 12 within 1 km of a riverside line (鶯歌 44 m, 萬華 244 m, 南港 412 m, 內湖 481 m, then 永和, 新店, 板橋, 士林, 大同, 蘆洲, 新莊, 克強 up to 922 m).
- Shops tagged `toilets=yes` within 100 m of a riverside line: 9, too few to be worth a separate rule.

## Goals / Non-Goals

**Goals:**

- Two independent switches, `廁所` and `淋浴`, off by default, sharing one lazily loaded `facilities.json`.
- Toilet popups that surface only what OSM records (no guessing).
- Showers from OSM only, with sports centres as the practical source and a clear 可能收費 caveat.
- A refresh with implausibly few toilets or showers fails instead of publishing.

**Non-Goals:**

- `toilets=yes` on shops, restaurants, or cafés; public baths (`amenity=public_bath`); a hand-kept shower list.
- Opening hours, access restrictions, or prices (tagged too rarely to show).
- Facilities along bridge or link routes or the urban cycling layer.
- Clustering, filtering, or remembering switch state.
- Changing the rain shelter layer or station classification.

## Decisions

### One facilities.json for both switches

Toilets and showers come from one Overpass query (`FACILITIES_QUERY`, `out center tags`) run after the shelter query, and are written to one file with `toilets` and `showers` arrays. Both switches use the same `createJsonLoader<FacilityData>(fetch, app.baseURL, 'facilities.json')` instance, whose cached promise makes a request in progress shared and a success reused. Alternative: two files — rejected; the showers array has about 14 entries and would cost a second request and a second query for no benefit.

### Facility selection distances per kind

scripts/lib/facilities.js exports `toiletSpots(routes, elements)` and `showerSpots(routes, elements)` with constants `TOILET_NEAR_METERS = 100`, `SHOWER_NEAR_METERS = 300`, `SPORTS_CENTRE_NEAR_METERS = 1000`. Riders walk from the path to a sports centre, so its radius is wider; plain showers use 300 m because the two measured ones sit at 146 m and 165 m. In scripts/lib/shelters.js the private `riversideSegments(routes)` becomes the exported `riversideRouteSegments(routes)`, and the node-or-center point lookup written inline in `shelterSpots()` becomes the exported `elementPoint(element)`; both modules use them. Distances use `isNearSegments()` from scripts/lib/riverside.js.

### Raw tag values in the data, wording in the front end

Toilet entries carry raw `wheelchair`, `changing_table`, `unisex`, `fee` values (or `null`), like route-side vending carries its raw `vending` tag; the wording lives in pure functions `toiletLabel(toilet)` and `showerLabel(shower)` in app/utils/cycling.ts. This keeps wording changes out of the data pipeline.

### Facility minimums in check-counts

`MINIMUMS` in scripts/lib/check-counts.js gains `toilets: 150` (about half the measured 335) and `showers: 5` (about a third of the measured 14, since the source is small and a few OSM edits move it). Labels: `riverside toilets` and `riverside showers`.

### Legend flags as an options object

`legendEntries(routesShown, urbanShown, vendingShown, sheltersShown)` would grow to six positional booleans. It becomes `legendEntries({ routes, urban, vending, shelters, toilets, showers })` with every field required, and its one caller (`updateLegend()` in SupplyMap.client.vue) and its tests are updated in the same task. Entries 廁所 (icon `glyph cycling-legend__glyph--toilet`) and 淋浴 (`glyph cycling-legend__glyph--shower`) follow the two shelter entries.

### Toilet and shower glyph icons

Same divIcon shape as shelters with class `facility-icon` plus a modifier: toilets `facility-icon--toilet` background `#364fc7` glyph `廁`; showers `facility-icon--shower` background `#c2255c` glyph `浴`; both `zIndexOffset: -1000`, with the popup text as the marker `title`. Each kind has its own layer group added or removed by its switch.

## Implementation Contract

**Behavior:** The page is unchanged until 廁所 or 淋浴 is turned on. Turning 廁所 on draws about 335 indigo `廁` squares along riverside routes; clicking one shows e.g. `公廁 · 無障礙、尿布台`. Turning 淋浴 on draws about 14 pink `浴` squares; clicking a sports centre shows `萬華運動中心 · 淋浴間（可能收費）`.

**Interface / data shape:**
- `public/data/facilities.json`: `{"toilets":[{"name","wheelchair","changing_table","unisex","fee","lat","lng"}...],"showers":[{"kind":"shower"|"sports_centre","name","fee","lat","lng"}...]}`, one entry per line.
- app/utils/load-data.ts: `interface Toilet`, `interface Shower`, `interface FacilityData { toilets: Toilet[]; showers: Shower[] }`.
- app/utils/cycling.ts: `toiletLabel(t: Toilet): string`, `showerLabel(s: Shower): string`, `legendEntries(flags: { routes, urban, vending, shelters, toilets, showers }: Record<…, boolean>)`.
- MapControls.vue: models `showToilets`, `showShowers`; props `toiletFailed`, `showerFailed`. SupplyMap.client.vue: props `showToilets`, `showShowers`, `facilities: FacilityData | null`.
- meta.json: `counts.toilets`, `counts.showers` (numbers).

**Failure modes:** Facility query failure or a count below minimum → pipeline exits non-zero naming the source and count; public/data/ untouched. facilities.json fetch failure → each switch that was on shows its own message and turns off; a later turn-on retries.

**Acceptance criteria:**
- `npx vitest run scripts/lib/facilities.test.js` covers every row of the toilet selection and shower selection examples, including the element matching both shower rules.
- `npx vitest run scripts/lib/shelters.test.js` still passes after the helper extraction.
- `npx vitest run scripts/fetch-data.test.js` covers facilities.json output, meta counts, the too-few rejection naming `riverside toilets: got 120`, and a failed facility query keeping previous data.
- `npx vitest run app` covers every row of the facility popup text and legend entries examples, the shared single load across both switches, and the two switch labels, defaults and failure messages.
- `npx vue-tsc --noEmit` passes.
- `npm run test:e2e` covers: no facilities.json request at load; each switch draws only its icons and legend entry; a toilet popup matching `toiletLabel` of its data; a 404 showing `廁所資料載入失敗` with stations still selectable.
- A real `npm run fetch-data` publishes facilities.json meeting both minimums.

**Scope:** In scope — the files named in the proposal's Impact, plus moving the two private helpers out of scripts/lib/shelters.js. Out of scope — rain shelter behavior, routes.json, cycling.json, stations and shops data, deployment workflows.

## Risks / Trade-offs

- [Sports centres may close showers to non-members or charge] → popup says 淋浴間（可能收費）; no claim of availability.
- [335 toilet icons crowd the map at low zoom] → the layer is off by default; clustering is a follow-up if needed.
- [Few toilets carry attributes, so most popups show just 公廁] → accepted; showing untagged attributes as absent would mislead.
- [A fifth Overpass query lengthens refreshes and adds a failure point] → the query is small (a few thousand elements); the existing instance fallback and retry apply.

## Migration Plan

Regenerate data and deploy as usual. Rollback: revert the commit; the old front end never requests facilities.json.
