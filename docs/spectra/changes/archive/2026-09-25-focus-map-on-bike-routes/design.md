## Context

After `prioritize-riverside-stations` and `add-urban-cycling-layer`, the map uses standard OpenStreetMap tiles, draws no riverside paths, and draws urban bike paths as one polyline per OSM way. The urban layer is off by default and loads `cycling.json` on first toggle. The pipeline already fetches every `route=bicycle` relation with member-way geometry (the riverside route query in scripts/fetch-data.js) but keeps only the segments needed to classify stations.

Measured on 2026-09-25 from a live Overpass run and the committed `cycling.json`:

- Riverside routes: 21 relations, 888 member ways; joined per relation into 70 lines; 168,728 bytes raw, 40,672 gzipped.
- Bridge routes (name contains 橋, not riverside): 19 relations, 150 member ways; 59 lines; 14,447 bytes raw, 3,402 gzipped.
- Urban paths: 2139 ways (1799 cycleway, 340 lane) join into 1303 lines (1133 cycleway, 170 lane).
- Urban network fragmentation: 1096 connected pieces at exact end-point contact, 722 of them shorter than 200 m. The user chose not to bridge gaps or hide short pieces.

## Goals / Non-Goals

**Goals:**

- A low-detail base map so bike routes are the most prominent layer.
- Riverside and bridge bike routes drawn by default as continuous, named routes.
- Urban paths shown by default and drawn as joined lines.

**Non-Goals:**

- Bridging gaps between path ends or removing short pieces. This was considered: bridging within 30 m cut the pieces from 1096 to 625. The user rejected it.
- Bridges that are not part of a `…橋…` bicycle route relation (e.g. 民權大橋, 碧潭大橋). The user chose the 19 curated routes over the 158 bike-usable OSM bridge ways of 150 m or more.
- Routing, turn-by-turn directions, or elevation.
- Self-hosted or vector tiles.
- Changing station, shop, or directions behavior.

## Decisions

### Esri World Light Gray base map

Use two Esri tile layers: `https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}` below the bike lines, and `.../Canvas/World_Light_Gray_Reference/MapServer/tile/{z}/{y}/{x}` for labels. Both use `maxNativeZoom` 16 and `maxZoom` 19. On 2026-09-25, tiles at zoom 17 and 18 came back as 2.5 KB blanks, so higher zooms enlarge the zoom 16 tiles. The attribution is `Esri, HERE, Garmin, © OpenStreetMap 貢獻者` (the service's copyright text is "Esri, HERE, Garmin, (c) OpenStreetMap contributors, and the GIS user community").

The first choice was CARTO Positron. On 2026-09-25 every CARTO tile returned the same "API KEY REQUIRED" image whether the Referer was empty, localhost, or fripig.github.io. Stadia (Stamen Toner Lite, Alidade Smooth) returned HTTP 401 without an account. A CSS grey filter on the OSM tiles was the remaining fallback; it keeps every icon and only fades it. The user chose Esri.

### Join ways at two-way end points

A single pure function joins lines: it builds a map from rounded end-point keys to way ends. It extends a line through a point only when exactly two ends meet there, reversing the next way when needed. It stops at dead ends and junctions. The same function joins urban paths (per kind) and each route's member ways. Alternative considered: one line per connected network. This was rejected because a network with branches cannot be drawn as one polyline without doubling back.

### Route dataset in its own file

`routes.json` holds `{ routes: [{ kind, name, lines }] }` and loads on page load, separate from `cycling.json`. Riverside and bridge routes must show even when the urban switch is off, and a failure in one file must not hide the other. The route query result is reused, so the pipeline makes no new Overpass request. Bridge routes are relations whose `name` contains `橋` and which are not riverside routes. The riverside rule is checked first, so `景美溪左岸大鵬華城堤外便道至鳴遠橋自行車道` stays riverside.

### Guard counts source ways and bridge routes

The urban guard keeps its minimum of 1000 but counts included ways before joining (2139 measured). Joined lines (1303 measured) would sit close to that minimum and would change whenever OSM splits or merges ways. A new `bridgeRoutes` minimum of 10 (19 measured) catches a truncated route response. `meta.json` gains `counts.bridgeRoutes` and reports `cyclingPaths` as joined lines.

### Route and path styles

One canvas renderer draws all bike lines under the station markers:

| Layer | Color | Weight | Dash | Interactive |
| ----- | ----- | ------ | ---- | ----------- |
| 河濱自行車道 | `#1971c2` | 6 | solid | no |
| 橋梁自行車道 | `#ae3ec9` | 6 | solid | yes, click opens a popup with the name |
| 自行車道 | `#2f9e44` | 3 | solid | no |
| 自行車道（畫線） | `#2f9e44` | 3 | `6 5` | no |

Station markers sit in the marker pane above the overlay pane, so the interactive bridge lines cannot take clicks meant for stations. The legend control lists the route entries whenever routes are loaded, and adds the urban and point entries while the urban layer is on.

### Urban switch defaults on and loads with the page

`useCyclingToggle` starts with `show` true. The page calls its `start()` from `onMounted` to trigger the first load. A watch with `immediate` was rejected: it would also run during `nuxt generate` pre-rendering and bake a failed-load state into the static page. The existing rules are kept: a failure turns the switch off and shows the message, turning it on retries, and a successful load is never repeated. A separate loader for `routes.json` runs on mount. On failure it sets the same failure message flag and leaves routes empty.

## Implementation Contract

**Behavior**

- `npm run fetch-data` writes `routes.json` with 21 riverside and 19 bridge routes (as measured), each with joined lines. `cycling.json` paths are joined lines. `meta.json` has `counts.bridgeRoutes` and `counts.cyclingPaths` equal to the joined line count. Fewer than 10 bridge routes or fewer than 1000 included urban ways stops the pipeline without touching `public/data/`.
- Opening the site shows the Esri light gray base map with Esri and OSM attribution, blue riverside routes, purple bridge routes, and green urban paths. The `都市自行車道` switch is on. Clicking a bridge line shows its name. Turning the switch off removes only urban lines, points, and their legend entries.

**Interfaces**

- A route module under scripts/lib/ exports `joinLines(lines)`, a pure function from an array of `[lat, lng][]` to joined lines, and `buildRoutes(body)`, which turns the route query response into `{ routes }` sorted by relation id. `buildCyclingLayer` uses `joinLines` per kind.
- `app/utils/load-data.ts` gains the `RouteData` type and a loader for `routes.json`. `useCyclingToggle` defaults to on.
- `SupplyMap` gains a `routes: RouteData | null` prop.

**Acceptance**

- Vitest covers the joining example table, the route kinds table, the bridge-route minimum, `cyclingPaths` counted as joined lines, and the urban switch loading on mount.
- `npm test`, `npx nuxi typecheck`, `npm run fetch-data`, and `npm run generate` succeed.
- Manual check in `npm run dev`, desktop and 375 px:
  - Esri light gray tiles and the Esri attribution.
  - Routes in three colors on load.
  - A bridge name on click.
  - The switch toggling only the urban layer.
  - A station on a route line still selectable.
  - With routes.json renamed away, the failure message shows and stations still work.

**In scope**: pipeline joining and route dataset, guards, base map, route drawing and legend, urban default and loading, README.

**Out of scope**: gap bridging, short-piece removal, non-route bridges, routing, station and shop behavior.

## Risks / Trade-offs

- [Many short urban pieces stay visible (722 under 200 m measured)] → Accepted by the user. Thin green lines under thick route lines keep them visually secondary.
- [Esri usage terms or availability] → The attribution is required and kept. If Esri tiles become unavailable, the tile URLs are constants and can switch back to OSM with a CSS grey filter.
- [About 150 KB gzipped more loaded at page open (cycling.json 103 KB, routes.json 44 KB, measured)] → Both load in parallel after stations and shops. Stations and the shop list do not wait for them.
- [OSM renames a bridge route without 橋 or adds unrelated 橋 routes] → The bridge minimum catches a collapse. The published names are visible in routes.json diffs during the weekly refresh.

## Migration Plan

1. Ship the pipeline change with regenerated `cycling.json`, `routes.json` and `meta.json` in the same commit as the UI change.
2. The weekly refresh needs no workflow edit.
3. Rollback: revert the commit. The older page ignores `routes.json` and reads the joined `cycling.json` paths the same way, as polylines.
