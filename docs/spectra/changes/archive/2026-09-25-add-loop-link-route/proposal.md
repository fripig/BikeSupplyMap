## Why

The map cannot show a complete 環小台北 loop: the riverside routes stop at 南港 on the 基隆河 and at 木柵 on the 景美溪, and the road link between them (研究院路 and the 木柵 side streets) is missing. OSM already describes the whole loop as the relation `環騎臺北` (id 19140471, `network=rcn`), but `routeKind()` in scripts/lib/routes.js keeps only relations whose name matches the riverside pattern or contains 橋, so this relation is dropped. Measured on 2026-09-25 against the published routes.json: the relation is 66.9 km long and 14.0 km of it lies more than 40 m from any published route line, almost all of it on the 南港–木柵 link.

## What Changes

- The data pipeline publishes a third route kind, `kind: "link"`, in `public/data/routes.json`: the member ways of the relations named in a repository-kept list of loop routes (first entry `環騎臺北`), minus every way that is already a member of a published riverside or bridge relation. The route's `name` is a display label (`環騎臺北（連接道路）`).
- A listed loop relation that is missing from the Overpass response, or that leaves no way after the subtraction, makes the pipeline exit non-zero without touching `public/data/`, so an OSM rename shows up as a failed refresh.
- Route-side vending machines (within 200 m) also cover the link lines, since the `vending` array is computed from every published route line.
- The map draws link routes as thick lines in a third color, selectable to show the route name, and the legend gains a `連接道路` entry shown whenever routes are drawn.
- Link lines do NOT count as riverside: the YouBike station `riverside` flag and the urban cycling layer's exclusion of riverside ways stay unchanged.

## Non-Goals

Recorded in design.md.

## Capabilities

### New Capabilities

(none)

### Modified Capabilities

- `supply-data`: the Bike route dataset requirement gains the `link` kind, the loop route list, its subtraction rule, and its failure rule.
- `cycling-layer`: the routes-drawn requirement gains the link color and name popup; the legend gains the `連接道路` entry.

## Impact

- Affected specs: supply-data, cycling-layer
- Affected code: scripts/lib/routes.js, scripts/lib/routes.test.js, scripts/fetch-data.js, a new loop route list module under scripts/lib/, app/utils/load-data.ts, app/utils/cycling.ts, app/utils/cycling.test.ts, app/components/SupplyMap.client.vue, e2e tests under e2e/
- Data: public/data/routes.json gains one route with `kind: "link"`; meta.json unchanged in shape.
- No new dependency; the existing route Overpass query already returns every `route=bicycle` relation and its member ways in the two cities.
