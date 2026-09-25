## Why

Two things riders rely on are missing from the map. 重陽橋 is a common bike crossing between 三重 and 社子, but OSM has no `route=bicycle` relation for it, so the name-based bridge rule never draws it. Vending machines, often the only drink stop along the riverside paths, are not in the shop data at all.

## What Changes

- Add a supplementary bridge list kept in the repository. Each entry selects OSM ways by exact name, `highway` value and `bridge=yes`, and gives the display name. The first entry draws the 重陽橋 main span (`name=重陽橋`, `highway=secondary`; 9 ways, 3226 m measured) as the bridge route 「重陽橋（人行道）」. The riders' route is the bridge sidewalk; the OSM `service` ways are motorcycle-only lanes (`access=no`, `motorcycle=designated`) and are not used.
- Add OSM `amenity=vending_machine` to the shop data as a fifth category, 自動販賣機. It covers machines whose `vending` tag is a drink or food value, and machines with no `vending` tag. Parking, ticket, excrement-bag and other non-food machines are excluded (186 of 300 machines kept, measured).
- Vending machines within 200 m of a riverside or bridge route (70 measured) are published in `routes.json` and shown on the map with the routes while the 自動販賣機 category toggle is on; turning it off hides them. Selecting one shows its name or type.
- The shop category filter and legend gain 自動販賣機.

## Non-Goals (optional)

Recorded in design.md.

## Capabilities

### New Capabilities

(none)

### Modified Capabilities

- `supply-data`: the shop query and classifier add vending machines as a fifth category; the route dataset adds supplementary bridges and the vending machines near routes; the guard adds a vending minimum and requires every supplementary bridge to be found.
- `supply-map`: the category filter has five categories including 自動販賣機; turning 自動販賣機 off also hides the route-side vending icons.
- `cycling-layer`: vending machines near routes are drawn with the routes and listed in the legend, both following the 自動販賣機 category toggle.

## Impact

- Affected code: scripts/fetch-data.js, scripts/lib/classify-shop.js, scripts/lib/routes.js, scripts/lib/check-counts.js, a new supplementary bridge list under scripts/lib/, app/utils/geo.ts, app/utils/categories.ts, app/utils/load-data.ts, app/utils/cycling.ts, app/components/SupplyMap.client.vue, app/pages/index.vue, README.md.
- Data: public/data/shops.json gains about 186 `vending` records; public/data/routes.json gains one supplementary bridge route and a `vending` array of about 70 entries; meta.json gains the vending counts.
- External services: no new service. The shop and route Overpass queries each gain one clause.
