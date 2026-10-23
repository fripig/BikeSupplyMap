## Why

The previous change (add-more-loop-routes) draws five link routes on page load, including the 136 km 北臺濱海環線 that runs to 桃園 and 新竹. Riders who only want the riverside network now see four extra brown loops they did not ask for. The user wants the four newly added loops hidden at first and chosen from the controls, while `環騎臺北（連接道路）`, which closes the 環小台北 riverside loop, stays always drawn.

## What Changes

- Loop route list entries can be marked optional. The three `環騎臺北替代道路` entries and `北臺濱海環線（環島1-1）` are optional; `環騎臺北` is not.
- routes.json marks optional link routes with `optional: true` and gives each its own `vending` array: vending machines within 200 m of that route that are not already in the top-level `vending` array.
- The top-level `vending` array (and `meta.json` `counts.routeVending`) counts only routes that are always drawn. Measured on the 2026-10-24 data: 72 top-level entries, plus 3 for 市民大道-莊敬隧道段, 1 for 北臺濱海環線, 0 for the other two (today's 76 = 72 + 4).
- The controls gain a `環線` group with one switch per optional link route, labelled with the route name, all off when the page opens; several can be on at once.
- Turning a loop switch on draws that route and its vending icons (vending still follows the 自動販賣機 category toggle) and fits the map to the route; turning it off removes both.

## Non-Goals

Recorded in design.md.

## Capabilities

### New Capabilities

(none)

### Modified Capabilities

- `supply-data`: the Bike route dataset requirement gains optional loop entries, the `optional` flag, per-route vending, and the top-level vending rule.
- `cycling-layer`: the routes-drawn requirement stops drawing optional link routes on load; a new requirement covers the 環線 switches.

## Impact

- Affected specs: supply-data, cycling-layer
- Affected code: scripts/lib/loop-routes.js, scripts/lib/routes.js, scripts/lib/routes.test.js, scripts/fetch-data.js, scripts/fetch-data.test.js, app/utils/load-data.ts, app/components/MapControls.vue, app/components/MapControls.test.ts, app/components/SupplyMap.client.vue, app/pages/index.vue, e2e/map.spec.ts, README.md
- Data: public/data/routes.json and meta.json regenerated in the new shape.
- No new dependency and no Overpass query change.
