## Context

`buildRoutes(body, supplements, loops)` in scripts/lib/routes.js publishes one `kind: "link"` route per entry of `LOOP_ROUTES` (scripts/lib/loop-routes.js): the member ways of the relation with exactly that `name`, minus every way that belongs to a relation published as riverside or bridge. Today the list has one entry, `環騎臺北` → `環騎臺北（連接道路）`. scripts/fetch-data.js turns every name in `missingLoops` into a publish-blocking problem and logs the link count.

The existing route Overpass query (`ROUTES_QUERY`) already returns every `route=bicycle` relation that has a member in 臺北市 or 新北市, with all of its member ways' geometry (also ways outside the two cities). Relations found there on 2026-10-24 that complete or enlarge the loop:

| Relation (id) | Total | New after riverside, bridge and earlier-listed loop ways are dropped |
| --- | --- | --- |
| 環騎臺北 (19140471) | 66.9 km | 15.7 km |
| 環騎臺北市區替代道路：深南路-南深路段 (21628591) | 68.1 km | 13.3 km |
| 環騎臺北市區替代道路：市民大道-莊敬隧道段 (21628592) | 68.6 km | 13.4 km |
| 環騎臺北市區替代道路：研究院路-莊敬隧道段 (21628724) | 71.2 km | 4.6 km |
| 北臺濱海環線 (西向) (7642391) | 155.3 km | 136.3 km |
| 北臺濱海環線 (東向) (7644461) | 155.4 km | 112.0 km |
| 關渡碧潭支線(逆時針) (7735266) | 31.4 km | 1.0 km |
| 台北大縱走#8 (16717544) | 39.9 km | 2.1 km |

All numbers are measured with a scratch script that sums member-way lengths (equirectangular approximation) over the live response, processing entries in the order shown. Without the earlier-link subtraction, the three 替代道路 entries would redraw 3.6 km, 4.0 km and 15.4 km respectively of ways already drawn by an earlier link route (16.9/17.4/20.0 km vs 13.3/13.4/4.6 km).

## Goals / Non-Goals

**Goals:**

- Draw every alternative section of 環騎臺北 that OSM describes, each selectable under its own name.
- Draw the 北臺濱海環線 as the large loop riders know as 環大台北 / 北海岸環線.
- Never draw the same OSM way twice across link routes.
- Keep the existing failure rule: a renamed or fully-covered loop entry blocks publishing.

**Non-Goals:**

- `北臺濱海環線 (東向)`: most of its 112 km of new ways are the opposite carriageway of the 西向 route, which would draw two parallel lines; rejected.
- `關渡碧潭支線` and `台北大縱走#8`: only 1.0 km and 2.1 km of short pieces remain after subtraction; rejected as noise.
- Defining a custom 環大台北 riverside loop from several relations.
- Any front-end change: link routes already share one color, popup and legend entry (`連接道路`).
- New meta.json counts or a minimum for link routes in scripts/lib/check-counts.js.
- Clipping link lines to the two cities.

## Decisions

### Subtract ways of earlier link routes

`buildRoutes()` keeps a set of way ids already used, seeded with every member way of published riverside and bridge relations. Each loop entry keeps only its member ways not in the set, and then adds its kept ways to the set before the next entry. So list order decides which link route owns a shared way; `環騎臺北` stays first and its route is unchanged. Alternative: keep each loop's full remainder and let lines overlap — rejected because the overlapping link line hides the earlier one and its popup name. Alternative: geometric de-duplication — rejected for the same reasons as in add-loop-link-route (threshold-sensitive, slower).

### Loop entries and display labels

`LOOP_ROUTES` becomes, in order:

| name | label |
| --- | --- |
| `環騎臺北` | `環騎臺北（連接道路）` |
| `環騎臺北市區替代道路：深南路-南深路段` | `環騎臺北替代道路（深南路-南深路段）` |
| `環騎臺北市區替代道路：市民大道-莊敬隧道段` | `環騎臺北替代道路（市民大道-莊敬隧道段）` |
| `環騎臺北市區替代道路：研究院路-莊敬隧道段` | `環騎臺北替代道路（研究院路-莊敬隧道段）` |
| `北臺濱海環線 (西向)` | `北臺濱海環線（環島1-1）` |

The labels drop the OSM `市區` wording and direction suffix so the popup stays short; the 北臺濱海 label carries the national route number riders see on signs. Alternative: select by relation id — rejected as in add-loop-link-route; names keep the list readable and renames fail loudly.

### Failure message names earlier link routes

The problem text for a `missingLoops` entry becomes `loop route <name>: no relation with this name, or no way left outside riverside, bridge and earlier link routes`. The condition already covers "no way left"; only the set it is measured against grows.

## Implementation Contract

**Behavior:** After a data refresh, routes.json holds five link routes in `LOOP_ROUTES` order, no OSM way appears in more than one link route, and no link way is a member of a published riverside or bridge relation. On the map they are drawn in the existing link color; clicking a line of an alternative section shows e.g. `環騎臺北替代道路（深南路-南深路段）`, and clicking the north-coast line shows `北臺濱海環線（環島1-1）`. `環騎臺北（連接道路）` keeps the same lines as before this change (same OSM data).

**Interface / data shape:** `LOOP_ROUTES: { name, label }[]` and `buildRoutes(body, supplements, loops) → { routes, missingSupplements, missingLoops }` keep their shapes. routes.json route objects keep `{ kind, name, lines }`.

**Failure modes:** A loop entry whose relation is missing, or whose ways are all members of riverside, bridge or earlier link routes, is reported in `missingLoops`; fetch-data.js adds the problem above, exits non-zero and leaves public/data/ untouched.

**Acceptance criteria:**
- `npx vitest run scripts/lib/routes.test.js` covers: a way shared by two loop entries goes only to the earlier entry; an entry fully covered by an earlier link route is in `missingLoops`; `LOOP_ROUTES` equals the table above.
- `npx vitest run scripts` passes, including the fetch-data failure message assertion.
- `npm run fetch-data` succeeds and its log line reports `5 link`; a node check over public/data/routes.json confirms five link routes with the labels above and no way coordinate line shared between them.
- `npm run test:e2e` passes with a new test clicking `北臺濱海環線（環島1-1）`.

**Scope:** In scope — scripts/lib/loop-routes.js, scripts/lib/routes.js, scripts/fetch-data.js, their tests, e2e/map.spec.ts, README.md, regenerated public/data files. Out of scope — app/ code, Overpass queries, check-counts minimums, other datasets' rules (shelters and facilities still ignore link routes; urban cycling layer exclusion unchanged).

## Risks / Trade-offs

- [routes.json grows by about 168 km of lines; the current file is 208,668 bytes] → estimated +100–150 KB; measured after the 2026-10-24 refresh: 294,205 bytes (+85,537 bytes), below the estimate. Acceptable for a static site; no decision depends on it beyond noting it in the commit.
- [北臺濱海環線 runs outside 雙北 (基隆), where no stations or shops exist] → lines draw there without nearby data; acceptable, the route is useful as a whole.
- [Route-side vending grows because vending within 200 m of any route line is listed] → more cyan dots along the north coast and 替代道路; intended.
- [OSM editors reshuffle membership between the 替代道路 relations] → a fully covered entry fails the refresh with its name; fix by reordering or removing the entry.

## Migration Plan

Regenerate data and redeploy as usual. Rollback: revert the commit; the previous routes.json renders unchanged.
