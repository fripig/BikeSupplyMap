## Context

The `環線` group (change make-loop-routes-selectable) lists every routes.json route with `optional: true`. Today those routes all come from OSM relations named in `LOOP_ROUTES`. The user wants the recommended tours of 交通部自行車旅遊網 (taiwanbike.tw) as well, and wants them next to the OSM loops, not instead of them.

What the site offers (checked 2026-10-24):

- https://taiwanbike.tw/data/zh/tour.json lists 35 tours with `id`, `name`, `length`, `grades` and `city`, but no geometry. Nine pass through 臺北市 or 新北市.
- Each tour page https://taiwanbike.tw/bikeRoute/tour/<id> is prerendered by Nuxt. Its `<script id="__NUXT_DATA__">` holds a Nuxt payload: a JSON array in which objects and arrays refer to other entries by index, and `["ShallowReactive", i]`, `["Reactive", i]`, `["Ref", i]` and `["ShallowRef", i]` wrap entry `i`. Entry 3 is the data object. One of its values has `type: "tour"`, `info: { id, name, length, grades, ... }`, `route: [{ name, length, geometry: [{ Lng, Lat, Elevation, Distance }] }]`, and `geometry: [{ color, geometry: <GeoJSON> }]`. The GeoJSON is a `LineString` (A01, A02 and others) or a `MultiLineString` (A07), with `[lng, lat]` positions.
- Page sizes measured on 2026-10-24: A01 997 KB, A02 861 KB, A03 227 KB, A07 781 KB.
- The 政府網站資料開放宣告 at https://taiwanbike.tw/gov grants free, non-exclusive, irrevocable use including derivative products, on condition that the source is credited. It excludes trademarks and agency logos.

The four tours chosen by the user, measured from their GeoJSON on 2026-10-24 (haversine length; "in 雙北" uses a rough bounding box, so it is an estimate):

| id | name | site length | measured length | in 雙北 (estimate) | points |
|---|---|---|---|---|---|
| A01 | 北海岸漫遊 | 86.9 km | 91.6 km | 78.0 km | 4,905 |
| A02 | 單車淡蘭極東2日遊 | 110.4 km | 80.8 km | 61.4 km | 4,437 |
| A03 | 舊草嶺環線 | 18.5 km | 19.5 km | 19.5 km | 1,217 |
| A07 | 淡水河金色水岸 | 27.0 km | 28.6 km | 28.6 km | 1,975 |

A02's track (80.8 km) is shorter than the length the site states (110.4 km). We publish the track as given and do not try to explain the gap.

## Goals / Non-Goals

**Goals:**

- Publish the four tours as optional routes in routes.json, each with its full track and its own vending array.
- Show them in the `環線` group after the OSM loops, using the same switch behaviour.
- Fail the weekly refresh loudly if the site changes so a tour can no longer be read.
- Credit the source in the footer.

**Non-Goals:**

- The other five tours through 雙北 (D01 北宜淡蘭之旅 and four long tours across several counties, including two 環島 routes). The user chose the four above.
- Tour descriptions, photos, itineraries, elevation, or the site's daily segments. Only the track and the tour name are used.
- Subtracting riverside, bridge or OSM loop ways from a tour. A tour is drawn as recommended, even where it overlaps a riverside line.
- Simplifying the tracks. If the measured size turns out to be a problem, that is a follow-up change.
- A different color or style for tours. They are drawn like other optional link routes.
- Clipping tracks to 雙北. A01 runs into 基隆, and A02 and A03 run to 福隆.

## Decisions

### Tour route list

A new module scripts/lib/tour-routes.js exports `TOUR_ROUTES`, in this order: `{ id: 'A01', name: '北海岸漫遊' }`, `{ id: 'A02', name: '單車淡蘭極東2日遊' }`, `{ id: 'A03', name: '舊草嶺環線' }`, `{ id: 'A07', name: '淡水河金色水岸' }`. Order follows the site's ids.

The published route `name` is the list `name`. The tour page's `info.name` must equal it, otherwise the refresh fails. This follows `LOOP_ROUTES`: a rename on the source shows up as a failed refresh, not as a silently changed label.

Alternative considered: take the name from the page. Rejected, because then a different tour behind the same id would be published without anyone noticing.

### Read the track from the Nuxt payload

`tourFromPage(html, id)` in scripts/lib/tour-routes.js does the following:

1. Finds the `__NUXT_DATA__` script.
2. Parses it as JSON and revives index references from entry 3, unwrapping the four wrapper kinds.
3. Returns the value with `type === 'tour'` and `info.id === id`.

`tourLines(tour)` turns `tour.geometry[].geometry` into lines:

- one line per LineString, or per MultiLineString part;
- positions converted to `[lat, lng]` and rounded to 5 decimals, like OSM routes;
- consecutive duplicate points dropped;
- lines with fewer than 2 points dropped.

A position is valid only when lng is in 119–123 and lat in 21–26.5, which roughly bounds Taiwan and its islands. An invalid position makes the tour unusable instead of being skipped silently.

Alternatives considered:

- Scrape the rendered HTML or SVG. Rejected: the track is only in the payload.
- Use `route[].geometry` (the Lng/Lat/Elevation list). Rejected: it duplicates the GeoJSON and is about twice as large.
- Use an official open dataset. None was found that has these tours.

### Fetch tours alongside the other sources

fetch-data.js gains `fetchTourRoutes()`. It GETs each tour page in turn, sending the existing User-Agent and asking for HTML. It runs as another branch of the existing `Promise.all`, so it does not delay the Overpass chain.

The base URL is `process.env.TAIWANBIKE_URL ?? 'https://taiwanbike.tw'` and pages are read from `${base}/bikeRoute/tour/<id>`, so tests can serve fixture pages. There is no retry: the site is a single static host, and a failed refresh is retried the next week or by hand.

A tour that fails any check adds `tour route <id> <name>: <reason>` to the existing problem list, so the run throws `refusing to publish incomplete data` and nothing is written. The reasons are:

- `HTTP <status>` or a network error
- `no __NUXT_DATA__ payload`
- `no tour with this id in the payload`
- `page names it <info.name>`
- `invalid position`
- `no line with 2 or more points`

### Publish tours as optional link routes after the OSM loops

Each tour becomes `{ kind: 'link', name, optional: true, lines }`. Tours are appended after the `buildRoutes()` result and before `splitRouteVending()`, so each one gets its own `vending` array by the existing rule: machines within 200 m that are not in the top-level array.

The `環線` group already lists optional routes in routes.json order, so tours appear after the OSM loops without front-end logic changes.

Reusing `kind: 'link'` keeps the front end, the colors and the popup unchanged.

Alternative considered: a new `kind: 'tour'`. Rejected for now, because it needs a fourth color and new legend wording for no rider-visible benefit.

### Credit the source in the footer

The footer in app/pages/index.vue gains a sentence:

> 推薦遊程路線來源：交通部自行車旅遊網（taiwanbike.tw）

The site name links to https://taiwanbike.tw/bikeRoute/tour. README.md describes the tour list, the source and its license terms.

## Implementation Contract

**In scope**

- scripts/lib/tour-routes.js with `TOUR_ROUTES`, `tourFromPage(html, id)` and `tourLines(tour)`, plus unit tests.
- fetch-data.js fetches, validates and publishes the tours.
- The fetch-data test server serves fixture tour pages.
- The footer credit.
- e2e coverage of one tour switch.
- README.
- Regenerated public/data.

**Out of scope**

- Front-end drawing changes beyond the footer: no change to MapControls.vue or SupplyMap.client.vue.
- Other tours.
- Track simplification.

**Data shape**

routes.json routes, in this order: relation routes, supplementary bridges, `LOOP_ROUTES` link routes, then the four tour routes in `TOUR_ROUTES` order. A tour route serializes with keys in the order `kind, name, optional, lines, vending`. For example, a tour route is `{"kind":"link","name":"淡水河金色水岸","optional":true,"lines":[[[25.04778,121.51109],...]],"vending":[...]}`.

**Behaviour**

- `tourFromPage` returns `null` when there is no payload or no matching tour. It throws only on malformed JSON, which fetch-data reports as `no __NUXT_DATA__ payload`.
- `tourLines` returns `{ lines }` or `{ error: 'invalid position' }`. An empty `lines` makes fetch-data report `no line with 2 or more points`.

**Acceptance**

- `npx vitest run scripts` passes with new cases:
  - a payload with wrapped and indexed values;
  - a MultiLineString with two parts;
  - a LineString;
  - duplicate points;
  - a one-point line;
  - an out-of-range position;
  - a page without a payload;
  - a payload whose tour id differs;
  - fetch-data success, with the tours as the last four routes;
  - fetch-data refusing on a 404 tour page, keeping the previous data;
  - fetch-data refusing on a name mismatch, keeping the previous data.
- `npm run fetch-data` succeeds against the live site. routes.json then has 8 routes with `optional: true`, the last four named as in `TOUR_ROUTES`.
- `npm run test:e2e` passes with a test that turns on `淡水河金色水岸` and checks the map frames it and its line popup shows the name.
- `npx vue-tsc --noEmit` exits 0.

## Risks / Trade-offs

- [The site changes its Nuxt payload layout or URL] → The refresh fails with a message naming the tour and the reason, and the previous data stays published. The fix is a code change, as with an OSM rename.
- [routes.json grows] → Measured on 2026-10-24 with `npm run fetch-data`: routes.json went from 294,315 to 555,293 bytes (+260,978 bytes) for 12,528 tour points after duplicate reduction. The estimate before measuring was about 240 KB. The growth is under the 400 KB threshold, so the tracks are not simplified.
- [Tours overlap riverside lines, so the same path is drawn twice when a tour is on] → Accepted. The tour is drawn on top in the link color, which shows where the recommended ride goes.
- [Four extra page loads (about 2.9 MB) per weekly refresh] → Negligible for the site. Pages are fetched one at a time.
- [License conditions] → Credit is given in the footer and README. No trademark or agency logo is used.

## Migration Plan

Regenerate public/data with `npm run fetch-data` and commit it with the code. Rollback is reverting the commit; older pages ignore routes they do not know.

## Open Questions

(none)
