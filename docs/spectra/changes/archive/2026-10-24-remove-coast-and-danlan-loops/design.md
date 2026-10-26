## Context

The `環線` group shows one switch per optional route in public/data/routes.json. Two lists decide which optional routes exist:

- `LOOP_ROUTES` in scripts/lib/loop-routes.js holds OSM relations.
- `TOUR_ROUTES` in scripts/lib/tour-routes.js holds 交通部自行車旅遊網 tours.

`npm run fetch-data` builds routes.json from both lists. Today the group lists eight routes. This change removes `北臺濱海環線（環島1-1）`, the last `LOOP_ROUTES` entry, and `單車淡蘭極東2日遊`, tour `A02`.

Several tests and spec scenarios use the coast loop as their example optional loop. It is the only optional loop with more than one line (10) and has one vending machine of its own. One e2e test and one spec scenario use the four tours to show four different failure reasons in a single refresh.

## Goals / Non-Goals

**Goals:**

- The two routes disappear from the lists, from routes.json, from the page and from README.md.
- The remaining routes, their vending arrays and stops stay exactly as they are.
- Every rule the removed routes used to illustrate keeps a test.

**Non-Goals:**

- Refreshing other data. Stations, shops, cycling paths and the other routes are not re-fetched.
- Changing any build, drawing or stop-marker rule.
- Adding replacement routes.

## Decisions

### Edit routes.json by hand instead of re-running fetch-data

The two route objects are deleted from public/data/routes.json. Each one sits on its own line, and neither is the last route, so deleting the two lines keeps the file's one-route-per-line layout and valid JSON.

This gives the same routes.json that `npm run fetch-data` would build from the shortened lists, without new OSM data:

- 北臺濱海環線 is the last `LOOP_ROUTES` entry, so no later loop subtracted its ways.
- Tours are never subtracted.
- An optional route's `vending` array depends only on that route and the top-level array.
- The top-level `vending` array and `counts.routeVending` cover only routes without `optional`. meta.json is therefore unchanged.

Alternative: re-run `npm run fetch-data`. Rejected because it also pulls a week of unrelated OSM and open-data changes into stations.json, shops.json, cycling.json and the other routes. That would hide the removal in a large diff.

### Move single-route examples to 環騎臺北替代道路（市民大道-莊敬隧道段）

The e2e tests that turn the coast loop on and off, and that check its vending icon, switch to `環騎臺北替代道路（市民大道-莊敬隧道段）`. It is an OSM optional loop that also has vending machines of its own (3 in the 2026-10-24 data).

Unit-test fixtures that only need some optional loop name get existing names. These are the `splitRouteVending` fixture and the MapControls `LOOPS` fixture. The spec's vending-placement example and multi-line stops example are reworded the same way.

### Drop the eastbound coast test and spec row

The test `publishes 北臺濱海環線 (西向) as a link route and leaves 東向 out` and the `北臺濱海環線 (東向)` / `(西向)` rows of the route-kinds example existed only for the coast loop. With no list entry, `北臺濱海環線 (西向)` is not published either. The `(西向)` row becomes "not published", and the `(東向)` row and its test are removed.

### Split the four-tour failure test

The scenario `A page without a usable track is rejected` gave each of the four tours a different failure. With three tours, it keeps three of them in one refresh: no payload, invalid position and one-point lines. The fourth reason, `no tour with this id in the payload`, gets its own scenario and fetch-data test.

## Implementation Contract

**Behavior once shipped:**

- The `環線` group lists, in order:
  1. 環騎臺北替代道路（深南路-南深路段）
  2. 環騎臺北替代道路（市民大道-莊敬隧道段）
  3. 環騎臺北替代道路（研究院路-莊敬隧道段）
  4. 北海岸漫遊
  5. 舊草嶺環線
  6. 淡水河金色水岸
- Every switch is off when the page opens.
- Nothing else on the page changes.

**Data shape:**

- `LOOP_ROUTES` holds four entries: `環騎臺北` followed by the three optional alternative sections.
- `TOUR_ROUTES` is `[{ id: 'A01', name: '北海岸漫遊' }, { id: 'A03', name: '舊草嶺環線' }, { id: 'A07', name: '淡水河金色水岸' }]`.
- routes.json has two routes fewer. Every remaining line is byte-identical to the 2026-10-24 file.
- meta.json is unchanged.

**Failure modes:**

- `npm run fetch-data` no longer requests `https://taiwanbike.tw/bikeRoute/tour/A02`.
- It no longer looks up `北臺濱海環線 (西向)`, so an OSM rename of that relation stops blocking a refresh.

**Acceptance:**

- `npm test` and `npx vue-tsc --noEmit` pass.
- `npm run test:e2e` passes against the dev server.
- A content check shows that routes.json without the two lines equals the old file minus those lines.
- `grep` finds no `北臺濱海環線` or `淡蘭極東` outside docs/spectra/changes/archive, the archived specs history, and this change.

**In scope:**

- The two lists, routes.json, README.md, and the tests and spec text that name the two routes.

**Out of scope:**

- Any other data refresh.
- tour-routes.test.js's `returns null when the payload holds a different tour` keeps using an `A02` record. It is a payload holding some other tour, and a tour no longer listed fits that role.

## Risks / Trade-offs

- [The hand edit drifts from what fetch-data would produce] → The Decisions section explains why the two are equal. The next real `npm run fetch-data` rebuilds routes.json from the lists anyway.
- [Losing the only multi-line optional loop in real data] → The multi-line stops rule keeps its unit test with a synthetic fixture. No e2e test depends on a multi-line optional loop.
