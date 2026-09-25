## ADDED Requirements

### Requirement: Bike route dataset

The data pipeline SHALL publish `public/data/routes.json` from the OSM `route=bicycle` relations and member-way geometry already fetched for the riverside station classification. It SHALL include every riverside route (as defined by the riverside station classification) with `kind: "riverside"`, and every other relation whose `name` contains `橋` with `kind: "bridge"`. Each route SHALL be an object with `kind`, `name` (the relation's `name` tag), and `lines` (an array of lines, each an array of `[lat, lng]` pairs), where the member ways are joined into lines by the line-joining rule of the urban cycling dataset. Coordinates SHALL be rounded to 5 decimal places and routes SHALL be sorted by OSM relation id.

The pipeline SHALL exit with a non-zero status and SHALL NOT modify any file in `public/data/` when fewer than 10 bridge routes are found. On success `public/data/meta.json` SHALL include `counts.bridgeRoutes`.

#### Scenario: Route selection and kinds

- **WHEN** the route query returns the relations below
- **THEN** each is published as listed

##### Example: route kinds

| Relation name | Published as |
| ------------- | ------------ |
| `基隆河右岸自行車道` | `kind: "riverside"` |
| `華江橋自行車道` | `kind: "bridge"` |
| `關渡大橋自行車牽引道` | `kind: "bridge"` |
| `景美溪左岸大鵬華城堤外便道至鳴遠橋自行車道` | `kind: "riverside"` (riverside wins over 橋) |
| `復興南北路自行車道` | not published |

#### Scenario: Too few bridge routes is rejected

- **WHEN** the route query yields 6 bridge routes
- **THEN** the pipeline exits non-zero with a message naming bridge routes and the count 6, and no file in `public/data/` is modified

## MODIFIED Requirements

### Requirement: Urban cycling dataset

The data pipeline SHALL query the Overpass API for OpenStreetMap ways inside the Taipei City and New Taipei City administrative areas that are either tagged `highway=cycleway`, or tagged `highway` with any of `cycleway`, `cycleway:both`, `cycleway:left`, `cycleway:right` equal to `lane` or `track`. Ways that are members of a riverside route, as defined by the riverside station classification, SHALL be excluded. Ways whose `highway` tag is `footway`, `pedestrian`, `path`, `steps`, or `sidewalk` SHALL NOT be included, even when they permit bicycles or carry a `cycleway*` tag. The pipeline SHALL also query nodes tagged `highway=traffic_signals` or `highway=crossing` within 30 meters of the included ways. The query SHALL use the same Overpass instances, retry behaviour, and `User-Agent` header as the shop query.

Included ways of the same kind SHALL be joined into lines: two ways are joined where an end point of one equals an end point of the other (after rounding to 5 decimal places) and exactly two way ends meet at that point. Joining SHALL stop at points where one or three or more way ends meet. Ways SHALL NOT be joined across gaps, and no line SHALL be dropped for being short.

The pipeline SHALL write `public/data/cycling.json` as an object with two arrays:

- `paths`: objects with `kind` (`"cycleway"` for `highway=cycleway`, otherwise `"lane"`) and `coords` (array of `[lat, lng]` pairs along the joined line).
- `points`: objects with `kind` (`"signal"` when the node has `highway=traffic_signals` or `crossing=traffic_signals`, otherwise `"crossing"`), `lat`, and `lng`.

All coordinates SHALL be rounded to 5 decimal places. Paths SHALL be sorted by the smallest OSM way id they contain and points by OSM node id so weekly diffs stay stable.

The pipeline SHALL exit with a non-zero status and SHALL NOT modify any file in `public/data/` when the urban cycling query fails or yields fewer than 1000 included ways (counted before joining) or fewer than 2000 points. On success `public/data/meta.json` SHALL include `counts.cyclingPaths` (joined lines) and `counts.cyclingPoints`.

#### Scenario: Classify ways and nodes

- **WHEN** the Overpass response contains the elements below
- **THEN** each is published as listed

##### Example: element mapping

| Element | Expected |
| ------- | -------- |
| way `highway=cycleway`, not in a riverside route | part of a path with `kind: "cycleway"` |
| way `highway=primary, cycleway:right=lane` | part of a path with `kind: "lane"` |
| way `highway=cycleway` that is a member of `基隆河右岸自行車道` | not published |
| way `highway=footway, bicycle=designated` | not published |
| node `highway=traffic_signals` | point with `kind: "signal"` |
| node `highway=crossing, crossing=traffic_signals` | point with `kind: "signal"` |
| node `highway=crossing, crossing=marked` | point with `kind: "crossing"` |

#### Scenario: Ways are joined where they meet

- **WHEN** cycleway ways are published with the end points below
- **THEN** they are joined into the listed paths

##### Example: joining

| Ways (end points) | Published paths | Notes |
| ----------------- | --------------- | ----- |
| A: P1→P2, B: P2→P3 | one path P1→P2→P3 | two ends meet at P2 |
| A: P1→P2, B: P3→P2 | one path P1→P2→P3 | B is reversed to join |
| A: P1→P2, B: P2→P3, C: P2→P4 | three paths | three ends meet at P2, a junction |
| A: P1→P2, B: P2'→P3 with P2' 5 m from P2 | two paths | gaps are not bridged |
| A (cycleway): P1→P2, B (lane): P2→P3 | two paths | different kinds are not joined |

#### Scenario: Coordinates are rounded

- **WHEN** a path node is at (25.0337912, 121.5645188)
- **THEN** the published pair is `[25.03379, 121.56452]`

#### Scenario: Too few urban paths is rejected

- **WHEN** the urban cycling query yields 300 included ways
- **THEN** the pipeline exits non-zero with a message naming urban cycling paths and the count 300, and no file in `public/data/` is modified

#### Scenario: Counts are reported

- **WHEN** the pipeline succeeds with 2139 included ways joined into 1303 paths and 3907 points
- **THEN** `meta.json` has `counts.cyclingPaths` 1303 and `counts.cyclingPoints` 3907
