## Why

The map draws only the main `環騎臺北` loop (環小台北) and no larger loop. OSM already has three alternative road sections of the same loop and the 北臺濱海環線 (Cycling Route No. 1-1, the north-coast loop through 淡水, 金山 and 基隆), but scripts/lib/loop-routes.js lists only `環騎臺北`. Adding them as-is would also redraw ways the earlier link route already covers, because `buildRoutes()` subtracts only riverside and bridge ways. Measured on 2026-10-24 against a live Overpass route query (scratch script, way-id subtraction): new length after dropping riverside, bridge and earlier-listed loop ways is 13.3 km for 深南路-南深路段, 13.4 km for 市民大道-莊敬隧道段, 4.6 km for 研究院路-莊敬隧道段 and 136.3 km for 北臺濱海環線 (西向); `環騎臺北` itself stays at 15.7 km.

## What Changes

- The loop route list gains four entries after `環騎臺北`: the relations `環騎臺北市區替代道路：深南路-南深路段`, `環騎臺北市區替代道路：市民大道-莊敬隧道段`, `環騎臺北市區替代道路：研究院路-莊敬隧道段` and `北臺濱海環線 (西向)`, each published as a `kind: "link"` route under its own display label.
- The link subtraction rule also drops every way already published by a link route earlier in the list, so overlapping loops are drawn once.
- The publish-blocking failure for a loop entry now also fires when its ways are all covered by earlier link routes; the problem message names the earlier link routes too.
- README describes the new loops.

## Non-Goals

Recorded in design.md.

## Capabilities

### New Capabilities

(none)

### Modified Capabilities

- `supply-data`: the Bike route dataset requirement changes the link subtraction rule (also earlier link ways), the failure rule, and lists the new loop entries.

## Impact

- Affected specs: supply-data
- Affected code: scripts/lib/loop-routes.js, scripts/lib/routes.js, scripts/lib/routes.test.js, scripts/fetch-data.js, scripts/fetch-data.test.js, e2e/map.spec.ts, README.md
- Data: public/data/routes.json gains four link routes (about 168 km of lines in total, measured as above) and more route-side vending entries; meta.json shape unchanged.
- No Overpass query change: the existing route query already returns these relations and their member ways, including ways outside the two cities.
