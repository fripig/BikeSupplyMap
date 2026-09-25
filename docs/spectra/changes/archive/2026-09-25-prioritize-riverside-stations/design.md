## Context

The site shows all 3366 YouBike stations of Taipei City and New Taipei City (measured from `public/data/stations.json` on 2026-09-25). Its rider rides the riverside bike paths, so the stations near those paths are the ones that matter and they are lost among urban clusters. Station data is generated at build time by `npm run fetch-data` (scripts/fetch-data.js), which already queries Overpass for shops with instance fallback and a publish guard (`checkCounts`).

A probe on 2026-09-25 found 77 OSM `route=bicycle` relations in the two cities. Selecting by name (`河|溪|水岸|左岸|右岸` plus three explicitly named routes) gave 21 riverside routes with 770 member ways. With a 200 m threshold, 326 of 3366 stations were within reach of those routes (50 m: 88, 100 m: 160, 300 m: 493).

## Goals / Non-Goals

**Goals:**

- Mark each station riverside or not at build time, from OSM riverside bike-path routes.
- Show only riverside stations by default, with a `顯示市區站點` toggle for the rest.
- Frame the riverside stations on first load.

**Non-Goals:**

- Drawing the riverside paths or urban bike lanes on the map. The urban bike-path layer with traffic signals and crossings is a separate change.
- Changing nearby-shop search: straight-line distance and the 300 m / 500 m / 1 km radius stay. Riverside stations do not get a different default radius.
- Accounting for levees or floodgates (水門) when computing shop distance.
- Remembering the toggle state across visits.
- A manually maintained allow/deny list of stations.

## Decisions

### Select riverside routes by relation name

Riverside routes are `route=bicycle` relations whose `name` matches `河|溪|水岸|左岸|右岸`, plus `關渡自行車道`, `社子島環島自行車道`, and `二重環狀自行車道`, which run along the river without a river word in the name. Alternative considered: all `highway=cycleway` ways (495 km measured), which rejected because urban cycleways and sidewalk shared paths would mark most downtown stations riverside. Alternative considered: `leisure=park` areas named `河濱公園`, rejected because riverside parks miss long path stretches between parks. The name rule is the only place where route choice lives, kept as exported constants so a missed route is a one-line fix.

### Measure station-to-path distance with a flat projection

For each station, compute the shortest distance to every member-way segment using an equirectangular projection around the station's latitude (x scaled by cos(lat)), clamped to the segment ends, and convert to meters. At the 200 m scale, the error against haversine is well under 1 m. Segments whose both endpoints are more than 0.01° latitude away from the station are skipped as a fast prefilter; 0.01° latitude is about 1.1 km, far beyond the threshold. The probe computed all 3366 stations against 7038 segments in about a second, so no spatial index is needed.

### Store the riverside flag on each station record

`stations.json` gains `riverside: boolean` on every record. Alternative considered: a separate `riverside-stations.json` of IDs, which was rejected because the page would need a join and two files could drift apart. The flag keeps the weekly data diff small: a station line changes only when its flag flips.

### Fetch riverside routes with a second Overpass query

The route query runs as a second request through the existing Overpass fallback, reusing the same instances, retry, and `User-Agent`. It is not merged into the shop query, so a timeout on one does not waste the other, and the queries can be tested independently. The query body is `rel["route"="bicycle"](area.a)->.r; way(r.r); out geom; .r out body;` with the same area definition as the shop query; `out body` is required because `out tags` omits relation members, which the classifier needs to find each route's ways. The Overpass fetch function takes the query as a parameter. The shop query and the route query run one after the other, not in parallel, so a public instance never receives two heavy requests from the pipeline at once.

### Guard riverside counts in the publish check

`checkCounts` gains `riversideRoutes` (minimum 15; 21 measured) and `riversideStations` (minimum 150; 326 measured). The two minimums sit about 30% and 55% below the measured values, which leaves room for OSM edits while still catching an empty or truncated response. `meta.json` gains `counts.riversideStations`.

### Two station layers on the map

Riverside stations go in the existing marker cluster group. Urban stations go in a second cluster group with a muted marker (grey fill, smaller), added to or removed from the map when the toggle changes. Two groups are used instead of one group with filtering, so turning the toggle does not rebuild the riverside markers. The selected-station highlight, radius circle, and shop markers are drawn on their own layers already, so they are unaffected by the toggle.

### Toggle lives in MapControls and state in the page

`MapControls` gains a `showUrban` model (default `false`) rendered as a checkbox-style switch labelled `顯示市區站點`. The page passes it to `SupplyMap` as a prop. The page's hint text changes to point at riverside stations and mention the toggle.

### Initial view fits riverside stations

On mount, the map calls `fitBounds` on the riverside stations' bounds instead of the fixed `setView([25.0375, 121.5637], 13)`. If there are no riverside stations (only possible with hand-edited data, because the publish guard blocks it), it falls back to the fixed view. Which stations go in which layer and what to frame is decided by a pure helper `splitStations` in app/utils/geo.ts so it can be unit-tested. When no station carries a boolean `riverside` field at all (a browser holding a cached pre-change `stations.json` right after deploy), the helper treats every station as riverside so the map shows all stations instead of an empty map.

## Implementation Contract

**Behavior**

- `npm run fetch-data` writes `stations.json` where every record has boolean `riverside`, and `meta.json` with `counts.riversideStations`.
- The pipeline exits non-zero without touching `public/data/` when the route query fails, when fewer than 15 riverside routes are found, or when fewer than 150 stations are riverside. The error message names the source and the count.
- Opening the site shows only riverside stations, framed; the `顯示市區站點` toggle is off. Turning it on adds urban stations in a muted style; turning it off removes them. A selected station, its list, circle, and shop markers survive toggling.

**Interfaces**

- Riverside classification module under scripts/lib/ exports the route-name predicate `isRiversideRoute(tags)`, a function that turns an Overpass response into segments, and `classifyRiverside(stations, segments, thresholdMeters = 200)`, which returns the stations with `riverside` set.
- `Station` in app/utils/geo.ts gains `riverside: boolean`.
- `MapControls` gains `v-model:show-urban`; `SupplyMap` gains a `showUrban: boolean` prop.

**Acceptance**

- Unit tests (Vitest) cover the route-name table and the distance-boundary table in the supply-data delta spec, and the new `checkCounts` minimums.
- `npm test` passes; `npm run fetch-data` succeeds against live sources and reports the riverside station count.
- Manual check in `npm run dev`: default view, the toggle both ways, and selection surviving the toggle at a 375 px width and on desktop.

**In scope**: scripts/fetch-data.js, scripts/lib/check-counts.js, a new riverside module and its tests, app/utils/geo.ts, app/pages/index.vue, app/components/MapControls.vue, app/components/SupplyMap.client.vue, regenerated public/data/, README feature list.

**Out of scope**: shop search, radius options, category filter, directions links, deployment workflows, and any path drawing on the map.

## Risks / Trade-offs

- [An OSM route named without a river word is missed, or an urban route with 河 in its name is included] → The name rule is exported constants with a table test; fixing means editing one list. The 2026-09-25 probe's 21 selected names are recorded in the tests as the reference set.
- [Route relations include approach segments on city streets, so some stations just inside the levee count as riverside, e.g. 民權迪化街口 at 89 m] → Accepted: those stations are reachable through a floodgate and useful to riverside riders. The threshold is one constant if it needs tuning.
- [A second Overpass request doubles the chance of hitting a busy instance] → Same fallback and retry as shops; a failure keeps the previous data rather than publishing partial flags.
- [Users looking for an urban station do not find it at first] → The toggle sits in the always-visible controls, and the hint text mentions it.

## Migration Plan

1. Ship the pipeline change and regenerate `public/data/` in the same commit as the UI change, so the deployed page never reads stations without `riverside`.
2. The weekly refresh workflow needs no edit; it runs `npm run fetch-data`, which now includes the route query.
3. Rollback: revert the commit; the older page ignores the extra `riverside` field.
