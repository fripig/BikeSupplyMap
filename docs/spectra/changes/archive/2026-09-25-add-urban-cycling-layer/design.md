## Context

After `prioritize-riverside-stations`, the map shows riverside stations by default and the pipeline knows which OSM `route=bicycle` relations are riverside routes. Riders still need to ride city streets between the riverside path, a station, and a shop.

A probe against Overpass on 2026-09-25 measured, for Taipei City and New Taipei City:

- `highway=cycleway` plus roads with `cycleway*=lane|track`: 2831 ways; after removing the member ways of the 21 riverside routes, 2181 ways remain (about 279 km of separate cycleways and 71 km of painted lanes).
- Within 30 m of those 2831 ways: 4170 nodes. Keeping only nodes within 30 m of the 2181 urban ways leaves 3926 points: 3056 `signal` (`highway=traffic_signals` or `crossing=traffic_signals`) and 870 `crossing`.
- Encoded as the planned `cycling.json` (one record per line, 5-decimal coordinates): 576,542 bytes, 103,633 bytes gzipped.
- For comparison, the whole two cities hold 9439 traffic-signal nodes and 18465 crossing nodes.

## Goals / Non-Goals

**Goals:**

- Publish urban bike paths with the signals and crossings along them as one static file.
- Show them as an optional layer, off by default, that does not slow down first load.

**Non-Goals:**

- Sidewalk shared paths (人車共道, `highway=footway` with `bicycle=yes|designated`): 3074 ways measured; including them would cover most of downtown and bury the actual bike network. The classifier therefore rejects every way whose `highway` is `footway`, `pedestrian`, `path`, `steps`, or `sidewalk`, even when it carries a `cycleway*=lane|track` tag.
- Drawing the riverside routes themselves.
- Signals and crossings away from the urban paths.
- Routing, turn-by-turn directions, or signal timing.
- Changing station visibility or shop search.

## Decisions

### Exclude riverside route members from the urban layer

The urban path query runs after the riverside route query from `prioritize-riverside-stations` and drops any way whose id is a member of a riverside route. Riverside and urban then stay disjoint. Alternative considered: include everything in one bicycle layer. Rejected because the user asked for an independent urban layer, and the riverside network is already expressed through riverside stations.

### Signals and crossings within 30 m of urban paths

Use Overpass `node(around.<paths>:30)` on the pre-exclusion path set, then drop points farther than 30 m from any published urban path during classification. Nodes tagged `crossing=traffic_signals` count as `signal`, because the cue a rider needs is that they will stop at a light. Alternative considered: all 27,904 signal and crossing nodes in the two cities. Rejected for size and noise.

### One cycling.json with compact arrays

`public/data/cycling.json` holds `paths` (`kind`, `coords`) and `points` (`kind`, `lat`, `lng`), coordinates rounded to 5 decimals (about 1 m). No OSM ids or names are published: the layer is visual only. Records are sorted by OSM id before the ids are dropped, one record per line, so weekly diffs stay stable. Alternative considered: GeoJSON. Rejected because it is roughly twice the size for no consumer benefit.

### Lazy-load cycling.json on first toggle

The page fetches `data/cycling.json` only when `都市自行車道` is first turned on and keeps it in memory afterwards. A failure shows `自行車道資料載入失敗`, turns the toggle back off, and a later toggle retries. This keeps the default load at stations plus shops.

### Canvas rendering for paths and points

The layer uses one Leaflet `L.canvas()` renderer for both polylines and point markers (`circleMarker`s styled per kind), so about 2200 lines and 3900 points do not create thousands of DOM nodes. Lines are non-interactive so station markers stay clickable. Point markers live in a layer group added only while zoom is 16 or greater, driven by the map `zoomend` event. Signal markers are red filled circles; crossing markers are white circles with a dark outline. Cycleways are solid green lines; lanes are dashed green lines. The legend is a small Leaflet control shown only while the layer is on.

### Guard urban cycling counts

`checkCounts` gains `cyclingPaths` (minimum 1000; 2181 measured) and `cyclingPoints` (minimum 2000; 3926 measured). The failure message names urban cycling paths or points and the count.

## Implementation Contract

**Behavior**

- `npm run fetch-data` writes `public/data/cycling.json` in the shape defined by the supply-data delta spec, and meta.json with `counts.cyclingPaths` and `counts.cyclingPoints`; it exits non-zero without touching `public/data/` on query failure or below-minimum counts.
- On the site, `都市自行車道` is off by default and no request for cycling.json is made. Turning it on loads the file once, draws solid and dashed lines, shows the legend, and shows signal and crossing markers at zoom ≥ 16. Turning it off removes all of them. A load failure shows `自行車道資料載入失敗` and turns the toggle off.

**Interfaces**

- A cycling-layer module under scripts/lib/ exports the element classifier, which maps an Overpass way or node to a `paths` or `points` entry or to null, and a builder, which takes the Overpass response and the riverside member-way ids and returns `{ paths, points }` sorted and rounded.
- `MapControls` gains `v-model:show-cycling`; `SupplyMap` gains `showCycling: boolean` and `cycling: CyclingData | null` props.

**Acceptance**

- Vitest covers the "element mapping" table, the rounding example, and the new `checkCounts` minimums.
- `npm test` passes; `npm run fetch-data` succeeds against live sources.
- Manual check in `npm run dev`, desktop and 375 px: no cycling.json request on load (browser network panel), lines on toggle, markers at zoom 16 but not 15, legend on and off, and a station still selectable where a line crosses it.

**In scope**: pipeline query, classification, and guard; cycling.json; layer toggle, drawing, legend, and lazy load; README.

**Out of scope**: sidewalk shared paths, riverside route drawing, station or shop behavior changes, routing.

## Risks / Trade-offs

- [OSM lane tagging is inconsistent: some roads tag only one side, some tag both, and some older lanes are untagged] → Accepted. The layer reflects OSM, and README says so. Missing lanes are an OSM edit, not a code change.
- [30 m around a path picks up crossings on the parallel road] → Accepted for this scale; the point is to warn about stops nearby.
- [About 3900 canvas markers at zoom 16 on older phones] → At zoom 16 the viewport shows only a few hundred of them; canvas renders off-screen markers cheaply. Measure with the 375 px manual check; if it stutters, switch to viewport-bounded rendering.
- [Depends on the riverside route query from the other change] → Apply `prioritize-riverside-stations` first; tasks declare this.

## Migration Plan

1. Apply after `prioritize-riverside-stations` is applied.
2. Ship the pipeline change with the generated `cycling.json` in the same commit as the UI change.
3. The weekly refresh workflow needs no edit.
4. Rollback: revert the commit; the older page never requests cycling.json.
