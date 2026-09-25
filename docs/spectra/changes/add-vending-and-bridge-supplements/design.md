## Context

`focus-map-on-bike-routes` draws 21 riverside and 19 bridge routes from OSM `route=bicycle` relations. 重陽橋 has no such relation, so it is missing. An Overpass lookup on 2026-09-25 found:

- 9 ways tagged `name=重陽橋, highway=secondary, bridge=yes`, 3226 m in total.
- Several `highway=service` ways named 重陽橋, all tagged `access=no, motorcycle=designated`, i.e. motorcycle-only lanes.
- One 87 m ramp with a sidewalk that allows bicycles.

The user confirmed riders cross on the bridge sidewalk, so the main span is the right line to draw.

The same lookup found 300 `amenity=vending_machine` in the two cities. By `vending` tag: drinks 108, none 67, parking_tickets 44, public_transport_tickets 29, excrement_bags 21, coffee 12, food 7, water 7, and fewer of others. The rule below keeps 186 of them, 70 of which lie within 200 m of a riverside, bridge or 重陽橋 line. The shop pipeline (scripts/lib/classify-shop.js) currently knows only `shop=*` tags and four categories.

## Goals / Non-Goals

**Goals:**

- Draw bridges that riders use but OSM does not describe as bicycle routes, from a small list in the repository.
- Offer food and drink vending machines as a fifth shop category near stations, and show those along the routes without any selection.

**Non-Goals:**

- Editing OSM. A `route=bicycle` relation for 重陽橋 would be picked up automatically, but adding it is the user's choice and outside this repository.
- Drawing the 重陽橋 service ways (motorcycle-only per OSM) or deciding bike access from real-world signage.
- Vending machines for tickets, parking, excrement bags, stamps, condoms, engine oil, or bottle returns.
- Opening hours, prices, or stock of vending machines.
- Showing vending machines away from routes until a station is selected (they appear through the category filter like other shops).

## Decisions

### Supplementary bridge list selects ways by name, highway and bridge

`scripts/lib/bridge-supplements.js` exports an array of `{ name, highway, label }`. The route Overpass query gains one clause per entry, `way["name"="<name>"]["highway"="<highway>"]["bridge"="yes"](area.a);`, output with geometry, so no new request is made. `buildRoutes` joins each entry's ways with `joinLines` and appends `{ kind: 'bridge', name: label, lines }` after the relation routes. Alternative considered: a list of OSM way ids. This was rejected because OSM splits and merges ways often, and ids would silently go stale. Alternative considered: a general rule for bike-usable river bridges. This was rejected because OSM does not tag 重陽橋's sidewalk access on the main span, so no general rule would find it.

### A supplementary bridge that selects nothing blocks publishing

A missing entry means the list and OSM disagree, for example after a rename. Failing makes the weekly refresh job fail visibly in GitHub Actions, the same way the other guards do. The trade-off is that one stale entry holds back all data until the list is fixed.

### Vending rule runs before brand and shop-tag rules

`classifyShop` checks `amenity=vending_machine` right after the 蝦皮 exclusion. The element is `vending` when its `vending` tag is missing, or when any `;`-separated value is in a fixed food and drink set. Otherwise it is excluded. It never falls through to brand rules, so a 7-Eleven-branded machine is not counted as a convenience store. Untagged machines are kept because OSM mappers usually leave drink machines untagged (67 measured). The user chose to include them.

### Shops query gains vending machines; category list gains vending

The shops query becomes a union of the existing `shop` clause and `nwr["amenity"="vending_machine"](area.a);`. `Category` gains `'vending'` with the label 自動販賣機 and color `#0c8599`. `meta.json` shop counts gain `vending`, and `checkCounts` gains `vendingMachines: 100` (186 measured).

### Route-side vending computed at build time

After shops and routes are built, the pipeline keeps vending shops within 200 m of any published route line segment, using `pointToSegmentMeters` with the latitude pre-filter. It writes them as `routes.json` `vending: [{ name, vending, lat, lng }]`, sorted by shop id. The raw `vending` tag is carried along for the popup. Computing this at build time keeps the browser from checking 186 points against about 12,700 segments on every load, and puts all route data in one file.

### Vending icons and popup

Route-side vending machines are teal (`#0c8599`) circle markers, radius 5, with a white border, on the shared bike canvas. They are clickable and open a popup built by a pure helper `vendingLabel(name, vending)`. The helper returns the name or 自動販賣機, then ` · ` and the mapped types (飲料, 飲水, 咖啡, 食物) joined with 、, deduplicated and in first-seen order. The legend adds 自動販賣機 to the route entries. Station markers remain in the marker pane above the canvas.

### Route-side vending follows the 自動販賣機 toggle

Supersedes the part of "Vending icons and popup" that drew route-side vending machines whenever routes are drawn. During the manual check the user turned 自動販賣機 off and expected the teal icons to disappear; they chose one toggle for both places over a separate switch or the original always-on behavior.

The route-side vending markers live in their own layer group, separate from the route lines. `SupplyMap.client.vue` gains a `showVending` prop, which `app/pages/index.vue` sets to `enabledCategories.has('vending')`. A watch on it adds or removes that layer group and refreshes the legend; `routes.json` is not reloaded and route lines are untouched. `legendEntries(routesShown, urbanShown, vendingShown)` lists 自動販賣機 only when routes are shown and `vendingShown` is true. Alternative considered: a separate 路線旁販賣機 switch. This was rejected by the user in favor of one control.

## Implementation Contract

**Behavior**

- `npm run fetch-data` publishes vending shops (category `vending`), a 重陽橋（人行道） bridge route, and `routes.json` `vending` entries within 200 m of route lines. It fails without touching `public/data/` when there are fewer than 100 vending machines or when a supplementary bridge selects no way.
- On the site, 自動販賣機 is a fifth category toggle and appears in station shop lists. Route-side vending icons show on load while the toggle is on (the default), disappear with the 自動販賣機 legend entry when it is turned off, and selecting one shows the name or 自動販賣機 plus its types. The 重陽橋 main span is drawn purple and shows 重陽橋（人行道） on selection.

**Interfaces**

- `scripts/lib/bridge-supplements.js`: `BRIDGE_SUPPLEMENTS` array. The route query text is built from it.
- `buildRoutes(body, supplements)` returns `{ routes }`. A new `routeVending(routes, shops, meters = 200)` returns the `vending` array. Missing supplements are reported to the guard.
- `app/utils/cycling.ts`: `vendingLabel(name, vending)`. `legendEntries(routesShown, urbanShown, vendingShown)` includes 自動販賣機 with the route entries only when `vendingShown` is true.
- `SupplyMap.client.vue` gains a `showVending: boolean` prop; `app/pages/index.vue` passes `enabledCategories.has('vending')`.
- `RouteData` gains `vending`.

**Acceptance**

- Vitest covers:
  - the classification table rows for vending machines
  - the supplementary way selection table
  - the missing-supplement failure
  - the 150 m / 250 m route-side vending case
  - the vending popup text table
  - the legend entries table, including the 自動販賣機 toggle column
  - the vending minimum
- `npm test`, `npx nuxi typecheck`, `npm run fetch-data`, and `npm run generate` succeed.
- Manual check in `npm run dev`, desktop and 375 px:
  - The 重陽橋 line and its popup name.
  - Teal vending icons along routes and their popup text.
  - The 自動販賣機 toggle filtering a station's list and hiding and showing the route-side vending icons.
  - The legend entry.

**In scope**: supplementary bridge list and its guard, vending classification and category, route-side vending data and icons, legend, README.

**Out of scope**: OSM edits, other bridges not yet reported, non-food vending, vending details beyond name and type.

## Risks / Trade-offs

- [Untagged vending machines include some non-food ones] → Accepted by the user. A popup without a type tells the rider the type is unknown.
- [OSM vending coverage is sparse (300 machines across both cities)] → The layer shows what OSM has. README says coverage depends on OSM.
- [A stale supplementary entry blocks the weekly refresh] → The guard's message names the bridge. Fixing the list is a one-line change.
- [The 重陽橋 secondary ways include approach viaducts on both sides] → They are part of the crossing a rider uses, so they are drawn in full.

## Migration Plan

1. Ship the pipeline, regenerated `shops.json`, `routes.json` and `meta.json`, and the UI in one commit.
2. The weekly refresh needs no workflow edit.
3. Rollback: revert the commit. The previous page ignores `routes.json` `vending` and the new shop category would not be present in the reverted data.
