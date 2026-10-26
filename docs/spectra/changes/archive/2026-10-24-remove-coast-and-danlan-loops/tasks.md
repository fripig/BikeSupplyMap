## 1. Lists and data

- [x] 1.1 Deliver the Bike route dataset requirement's shorter loop route list. `LOOP_ROUTES` in scripts/lib/loop-routes.js holds only `環騎臺北` and the three optional `環騎臺北市區替代道路` entries; the 北臺濱海環線 entry and its comment are gone. In scripts/lib/routes.test.js:
  - the list test expects those four entries;
  - the test `publishes 北臺濱海環線 (西向) as a link route and leaves 東向 out` is removed (design: Drop the eastbound coast test and spec row);
  - the `splitRouteVending` fixture names its first optional loop `環騎臺北替代道路（深南路-南深路段）` (design: Move single-route examples to 環騎臺北替代道路（市民大道-莊敬隧道段）).

  Verified by `npx vitest run scripts/lib/routes.test.js`.
- [x] 1.2 Deliver the Tour route dataset requirement's three-tour list. `TOUR_ROUTES` in scripts/lib/tour-routes.js is `A01`, `A03`, `A07`. scripts/lib/tour-routes.test.js expects that list.

  Verified by `npx vitest run scripts/lib/tour-routes.test.js`.
- [x] 1.3 [after: 1.1, 1.2] Keep the Route stops requirement and the refuse-to-publish rules covered with the shorter lists in scripts/fetch-data.test.js. The routes test expects 48 routes, with the optional link routes and tours in the shifted positions. Following design: Split the four-tour failure test:
  - `rejects tour pages without a usable track and names every one` covers three tours (no payload, invalid position, one-point lines);
  - a new test `rejects a tour page that holds a different tour` checks that an `A07` page holding only `A01` fails with `tour route A07 淡水河金色水岸: no tour with this id in the payload` and leaves the seed data unchanged.

  Optional loops keep their stops in the shifted positions. Verified by `npx vitest run scripts/fetch-data.test.js`.
- [x] 1.4 [after: 1.1, 1.2] Remove the two routes from public/data/routes.json by hand, following design: Edit routes.json by hand instead of re-running fetch-data. Delete the `北臺濱海環線（環島1-1）` and `單車淡蘭極東2日遊` lines and change nothing else; meta.json stays untouched. Verified by a script comparing the new file with `git show HEAD:public/data/routes.json` minus those two lines (byte-identical), and by `JSON.parse` listing the six optional routes in order.

## 2. Page, docs and checks

- [x] 2.1 [after: 1.4] Deliver the Loop route switches and Recommended tour routes in the loop group requirements with six switches:
  - e2e/map.spec.ts's optional-route list test expects the six names;
  - the on/off, framing and vending-toggle tests use `環騎臺北替代道路（市民大道-莊敬隧道段）` in place of the coast loop;
  - app/components/MapControls.test.ts's `LOOPS` fixture uses `淡水河金色水岸` as its second name.

  Verified by `npx vitest run app/components/MapControls.test.ts` and `npm run test:e2e`.
- [x] 2.2 [after: 1.4] Update README.md so it no longer describes the two routes:
  - the 環線 feature line lists the three alternative sections and three tours;
  - the vending line drops the 北臺濱海環線 and 淡蘭 counts;
  - the loop table and tour table lose their rows;
  - the 西向/東向 paragraph is reduced to the remaining note about 關渡碧潭支線 and 台北大縱走 #8.

  Verified by `grep -n "北臺濱海\|淡蘭" README.md` returning nothing, and a content review against routes.json.
- [x] 2.3 [after: 1.3, 2.1, 2.2] Run the full check: `npm test`, `npx vue-tsc --noEmit` and `npm run test:e2e` all pass. `grep -rn "北臺濱海\|淡蘭極東" app scripts e2e public README.md` finds only the deliberate `A02` record in tour-routes.test.js's different-tour test.
