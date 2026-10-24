## 1. Tour route dataset

- [x] 1.1 Add the tour route list and read the track from the Nuxt payload. Create scripts/lib/tour-routes.js with:
  - `TOUR_ROUTES`, holding the four entries A01, A02, A03, A07 with their names, in that order;
  - `tourFromPage(html, id)`, which revives the `__NUXT_DATA__` payload (index references; ShallowReactive, Reactive, Ref and ShallowRef wrappers) and returns the `type: "tour"` value whose `info.id` is `id`, or `null`;
  - `tourLines(tour)`, which returns `{ lines }` in `[lat, lng]` rounded to 5 decimals, with consecutive duplicates reduced and lines of fewer than 2 points dropped, or `{ error: 'invalid position' }` for a longitude outside 119–123 or a latitude outside 21–26.5.

  Verified by new cases in scripts/lib/tour-routes.test.js, run with `npx vitest run scripts/lib/tour-routes.test.js`:
  - the `TOUR_ROUTES` table;
  - a payload with wrapped and indexed values;
  - a page without a payload, and a payload with a different tour id;
  - both rows of the spec's "tour lines" example (LineString; MultiLineString with a duplicate point and a one-point part);
  - an out-of-range position.
- [x] 1.2 [after: 1.1] Deliver the Tour route dataset requirement: fetch tours alongside the other sources and publish tours as optional link routes after the OSM loops.
  - scripts/fetch-data.js gains `fetchTourRoutes()`. It GETs `${TAIWANBIKE_URL ?? 'https://taiwanbike.tw'}/bikeRoute/tour/<id>` for each entry in turn, as another `Promise.all` branch.
  - A failed check adds `tour route <id> <name>: <reason>` to the problem list. The reasons are an HTTP status or network error, `no __NUXT_DATA__ payload`, `no tour with this id in the payload`, `page names it <name>`, `invalid position`, and `no line with 2 or more points`.
  - Tours are appended as `{ kind: 'link', name, optional: true, lines }` before `splitRouteVending()`, so they get their own `vending`.

  In scripts/fetch-data.test.js the test server serves fixture tour pages at `/taiwanbike/bikeRoute/tour/<id>` and `run()` sets `TAIWANBIKE_URL`. Line indexes in existing routes.json assertions are checked against the longer file. Verified by `npx vitest run scripts` with new cases:
  - success, where the last four routes are the tours with `optional: true` and a `vending` array;
  - an A07 page answering 404, which rejects with a message naming `A07` and keeps the previous data;
  - an A03 payload naming `舊草嶺隧道環線`, which rejects with a message naming `A03` and that name and keeps the previous data;
  - an A01 page without a payload, which rejects with a message naming `A01`.

- [x] 1.3 [after: 1.2] Regenerate data with `npm run fetch-data` against the live site.
  - The command succeeds, and public/data/routes.json has 8 routes with `optional: true`, the last four named as in `TOUR_ROUTES`.
  - Record the routes.json byte size before and after in design.md under the "routes.json grows" risk, replacing the estimate.
  - Verified by the command output and a node check of routes.json.

## 2. Tours on the map

- [x] 2.1 [after: 1.3] Show recommended tour routes in the loop group, and credit the source in the footer.
  - The footer in app/pages/index.vue gains `推薦遊程路線來源：<a href="https://taiwanbike.tw/bikeRoute/tour">交通部自行車旅遊網</a>（taiwanbike.tw）。`.
  - The existing e2e test `optional loops are listed in 環線, all off, and not drawn on load` lists the four OSM loops, so its expected names gain the four tours in order.
  - A new e2e test turns `淡水河金色水岸` on and checks that the map bounds contain the route's bounds and that clicking its line shows its name.
  - A new e2e test checks the footer credit and its link.

  Verified by `npm run test:e2e` and `npx vue-tsc --noEmit`.
- [x] 2.2 [after: 2.1] Update README.md.
  - The feature list says the 環線 group also offers four 自行車旅遊網 recommended tours.
  - A new section describes `TOUR_ROUTES` in scripts/lib/tour-routes.js, how the track is read, the failure messages, and the 政府網站資料開放宣告 credit condition.
  - The section gives the measured length of each tour and the vending counts from routes.json.

  Verified by content review against public/data/routes.json.
