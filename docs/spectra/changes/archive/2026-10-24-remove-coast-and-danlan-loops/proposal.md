## Why

The user asked to drop two routes from the `環線` group: `北臺濱海環線（環島1-1）` and `單車淡蘭極東2日遊`. Most of both lies outside 臺北 and 新北's riverside network. The coast loop runs about 136 km through 基隆 and down the 桃園 coast toward 新竹. The 淡蘭 tour runs from 松山車站 through 瑞芳 to 福隆.

## What Changes

- **Loop route list.** `北臺濱海環線 (西向)` is removed from `LOOP_ROUTES` in scripts/lib/loop-routes.js. The list keeps `環騎臺北` and its three optional alternative sections.
- **Tour route list.** `A02` `單車淡蘭極東2日遊` is removed from `TOUR_ROUTES` in scripts/lib/tour-routes.js. The list keeps `A01`, `A03` and `A07`.
- **routes.json.** The two route objects are removed from public/data/routes.json. Every other byte stays the same, and so does meta.json.
- **環線 group.** The group then lists six switches: the three 環騎臺北 alternative sections, then `北海岸漫遊`, `舊草嶺環線` and `淡水河金色水岸`.
- **Tests and README.** Unit tests, e2e tests and README.md stop naming the two routes. Tests that used `北臺濱海環線（環島1-1）` as their example loop move to `環騎臺北替代道路（市民大道-莊敬隧道段）`.

## Non-Goals

Recorded in design.md.

## Capabilities

### New Capabilities

(none)

### Modified Capabilities

- `supply-data`: the Bike route dataset requirement drops the coast loop from the loop route list. The Tour route dataset requirement drops `A02` from the tour list. The Route stops requirement's multi-line example no longer names the coast loop.
- `cycling-layer`: the Loop route switches and Recommended tour routes requirements list the six remaining routes.

## Impact

- Affected specs: supply-data, cycling-layer
- Affected code: scripts/lib/loop-routes.js, scripts/lib/tour-routes.js, public/data/routes.json, README.md, scripts/lib/routes.test.js, scripts/lib/tour-routes.test.js, scripts/fetch-data.test.js, app/components/MapControls.test.ts, e2e/map.spec.ts
- No new dependency.
