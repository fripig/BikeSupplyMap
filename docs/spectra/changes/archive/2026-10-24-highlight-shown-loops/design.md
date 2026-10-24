## Context

Optional routes in routes.json are four OSM loops and four 自行車旅遊網 tours. They are drawn by `addRouteLines()` in app/components/SupplyMap.client.vue with `LINK_COLOR` (`#9c6644`), the same color as 環騎臺北（連接道路）. The page uses one canvas renderer, so draw order equals the order layers were added. `raiseOverRoutes()` re-adds the urban paths and vending layers after route lines change, which keeps urban paths above loops today.

Each tour page's `route` array holds one entry per day segment. Each entry has a `name` written `<from> - <to>` and its own point list `geometry: [{ Lng, Lat, ... }]`. Measured on the 2026-10-24 pages:

| Tour | Segments | Notes |
|---|---|---|
| A01 | `松山車站 - 白沙灣`, `白沙灣 - 基隆車站` | |
| A02 | `松山車站 - 瑞芳老街`, `瑞芳老街 - 福隆車站` | The second segment's point list starts again at 松山車站, 10.6 km from where the first ended. |
| A03 | `福隆車站 - 東北角暨宜蘭海岸國家風景區福隆遊客中心` | The two ends are about 8 m apart. |
| A07 | `臺北府城北門 - 捷運紅樹林車站` | |

In every tour, consecutive segment names chain: segment *i* ends at the name segment *i+1* starts with.

The OSM optional loops in routes.json have these line counts: 深南路-南深路段 1, 市民大道-莊敬隧道段 1, 研究院路-莊敬隧道段 1, 北臺濱海環線 10. The single-line ones are the road sections left after riverside ways are subtracted, so their ends are where they leave or rejoin the riverside network.

## Goals / Non-Goals

**Goals:**

- A shown optional route is visibly different from every always-drawn line, and sits on top of them.
- Riders see where a tour starts, where each day ends, and where it finishes, and can pick the YouBike station nearest a stop.

**Non-Goals:**

- Direction arrows. The user did not choose them.
- A legend entry for shown loops. That needs a change to the legend requirement and its example table; it can be a follow-up.
- Dimming other routes while a loop is shown. The user chose the variant that leaves other routes unchanged.
- Stops for multi-line OSM loops such as 北臺濱海環線 (10 fragments). Their ends are gaps left by subtraction, not places to join.
- Clipping the A02 point lists or explaining the restart at 松山車站.

## Decisions

### Highlight shown loops with a white casing

Each line of an optional route is drawn twice into its loop layer:

- first a non-interactive white casing, weight 10 and opacity 1;
- then the line itself in `LOOP_COLOR` `#f03e3e`, weight 6 and opacity 1, with the existing name popup.

`#f03e3e` was chosen because it is not used by any other line. It is close to the traffic-signal dots (`#e03131`), but those are 4 px dots shown only at zoom 16 and above.

`raiseOverRoutes()` re-adds layers in this order: urban paths, then every shown loop's lines, then route vending, then loop vending. Shown loops are therefore above urban paths, and vending icons stay above loops.

Alternatives considered:

- Thicker brown lines. Rejected: the user chose a distinct color.
- Dimming other lines. Rejected: the user did not choose it.

### Route stops in routes.json

Each optional route gains `stops: [{ kind, name, lat, lng }]`. `kind` is one of `start`, `via`, `end` or `tip`, and `name` is a string or `null`. Coordinates are `[lat, lng]` values rounded to 5 decimals.

**Tours.** `tourStops(tour)` in scripts/lib/tour-routes.js splits each `route[].name` on ` - ` into exactly two non-empty parts. It then builds:

- a `start` at the first point of segment 1, named after segment 1's first part;
- a `via` at the last point of each segment except the last, named after that segment's second part;
- an `end` at the last point of the last segment, named after its second part.

Each stop uses the segment's own point list, never the next segment's first point. That keeps A02's 瑞芳老街 stop where day 1 ends.

`tourStops` returns `{ error }` in these cases, and fetch-data reports `tour route <id> <name>: <error>`:

| Condition | Error |
|---|---|
| A segment name does not split into two parts | `segment name <name> is not "<from> - <to>"` |
| Consecutive names do not chain | `segment <n> starts at <x>, not <y>` |
| A stop position is invalid | `invalid position` |
| `route` is empty | `no segments` |

**OSM loops.** `buildRoutes()` gives every optional link route that has exactly one line two `tip` stops, at its first and last point, with `name: null`. Optional routes with more lines get `stops: []`. Non-optional routes get no `stops` field.

Alternative considered: computing stops on the page. Rejected, because tour segment names only exist on the tour pages, which the page never loads.

### Stop markers with the nearest YouBike station

A new module app/utils/route-stops.ts exports `stopMarkers(stops)` and `nearestStation(point, stations, maxMeters = 2000)`.

`stopMarkers(stops)` merges a `start` and an `end` within 50 m into one marker. It returns `{ glyph, label, lat, lng }` per marker:

| Stop | Glyph | Label |
|---|---|---|
| `start` | 起 | `起點：<name>` |
| `via` | 經 | `分段點：<name>` |
| `end` | 終 | `終點：<name>` |
| `tip` | 端 | `端點` |
| merged `start` and `end` | 起終 | `起點：<a>／終點：<b>` |

`nearestStation` returns the station closest to a marker by `haversineMeters`, or `null` when none is within `maxMeters`.

In SupplyMap.client.vue, each loop layer gains a stops layer. It is shown with the loop lines and not filtered by any category. Each marker is an `L.marker` with a `route-stop-icon` divIcon, `title` set to the label, and `zIndexOffset: 1000`, so it sits above station markers. Its popup shows:

- the label;
- then `最近的 YouBike：<station name>（<distance>）` and a `選這個站` button, or `2 km 內沒有 YouBike 站`;
- then the 在 Google 地圖開啟 link from `placePopup`.

The button emits `select` with the station. The popup content is a DOM element built each time the popup opens, so the button's click handler is attached to it directly; the popup closes after the click.

Two details came up while implementing:

- **Popup and legend.** On a phone a start or end marker often sits in the bottom-left corner, under the legend, which then covers the popup's `選這個站` button. Each stop marker therefore sets its popup's `autoPanPaddingBottomRight` to the legend height plus 16 px just before the popup opens (a `click` handler registered before `bindPopup`). The popup's own auto-pan then keeps it above the legend. Panning the map after the popup opened was tried first and lost to the popup's running auto-pan animation.
- **Turning on the urban layer.** `updateCyclingLayer()` calls `raiseOverRoutes()` when it adds the urban paths, so turning 都市自行車道 on after a loop keeps the loop above them.

Alternatives considered:

- A list of stations. Rejected, because one nearest station answers "where do I pick up a bike".
- Nearest riverside station only. Rejected, because a tour start such as 臺北府城北門 is in the city.

## Implementation Contract

**In scope**

- `stops` in routes.json for optional routes.
- The tour stop errors and the refusal to publish that they cause.
- The highlight line style and draw order.
- Stop markers and their popup, including selecting a station.
- Unit, fetch-data and e2e tests.
- README.
- Regenerated data.

**Out of scope**

- Legend entries.
- Arrows.
- Dimming other lines.
- Any change to the always-drawn routes' look.
- New tours or loops.

**Data shape**

- Tour example: `"stops":[{"kind":"start","name":"臺北府城北門","lat":25.04778,"lng":121.51109},{"kind":"end","name":"捷運紅樹林車站","lat":25.15482,"lng":121.45859}]`.
- The key order of an optional route is `kind, name, optional, lines, stops, vending`.

**Behaviour**

- Turning a loop on shows its highlighted lines and stop markers. Turning it off removes both.
- Vending still follows the 自動販賣機 toggle.
- Clicking a stop marker opens its popup. `選這個站` selects that station, so the side panel shows it, exactly as clicking its marker would.

**Acceptance**

- `npx vitest run` passes with new cases:
  - `tourStops` for one segment, two chained segments, the A02-style restart (the via stop at the end of day 1), an unsplittable name, a broken chain, and an invalid position;
  - `buildRoutes` `tip` stops for a one-line optional loop, `[]` for a two-line one, and no `stops` on a non-optional route;
  - `stopMarkers`, including the 50 m merge;
  - `nearestStation` within and beyond 2 km;
  - fetch-data refusing a tour with an unsplittable segment name.
- `npm run fetch-data` succeeds, and routes.json stops are, in order:

  | Route | Stops |
  |---|---|
  | A01 | start 松山車站, via 白沙灣, end 基隆車站 |
  | A02 | start 松山車站, via 瑞芳老街, end 福隆車站 |
  | A03 | start 福隆車站, end 東北角暨宜蘭海岸國家風景區福隆遊客中心 |
  | A07 | start 臺北府城北門, end 捷運紅樹林車站 |
  | the three 替代道路 | two `tip` stops each |
  | 北臺濱海環線 | `[]` |

- `npm run test:e2e` passes with tests that turn on 淡水河金色水岸 and check:
  - the line pixel at its midpoint is the highlight color, above an urban path or riverside line;
  - a `起點：臺北府城北門` marker exists;
  - its popup lists a nearest station and `選這個站`, and clicking it selects that station;
  - the Google Maps link is present.
- `npx vue-tsc --noEmit` exits 0.

## Risks / Trade-offs

- [Stop markers above station markers can cover a station at the same spot] → The marker's popup offers that very station through `選這個站`.
- [A tour page renames a segment so the names no longer chain] → The refresh fails naming the tour and the segment, and the previous data stays published.
- [The highlight red is close to traffic-signal red] → Signals are small dots shown only at zoom 16 and above, while the highlight is a 6 px line with a white casing.
- [routes.json grows] → Measured on 2026-10-24 with `npm run fetch-data`: 18 stops (4 tours with 10 in all, 3 one-line loops with 2 tips each, 北臺濱海環線 none) took routes.json from 555,293 to 556,464 bytes (+1,171 bytes), within the under-2 KB estimate.

## Migration Plan

Regenerate public/data with `npm run fetch-data` and commit it with the code. Pages without the new code ignore `stops`. Rollback is reverting the commit.

## Open Questions

(none)
