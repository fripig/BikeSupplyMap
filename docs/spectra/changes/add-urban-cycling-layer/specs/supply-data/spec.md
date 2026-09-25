## ADDED Requirements

### Requirement: Urban cycling dataset

The data pipeline SHALL query the Overpass API for OpenStreetMap ways inside the Taipei City and New Taipei City administrative areas that are either tagged `highway=cycleway`, or tagged `highway` with any of `cycleway`, `cycleway:both`, `cycleway:left`, `cycleway:right` equal to `lane` or `track`. Ways that are members of a riverside route, as defined by the riverside station classification, SHALL be excluded. Ways tagged only as footways or sidewalks that permit bicycles SHALL NOT be included. The pipeline SHALL also query nodes tagged `highway=traffic_signals` or `highway=crossing` within 30 meters of the included ways. The query SHALL use the same Overpass instances, retry behaviour, and `User-Agent` header as the shop query.

The pipeline SHALL write `public/data/cycling.json` as an object with two arrays:

- `paths`: objects with `kind` (`"cycleway"` for `highway=cycleway`, otherwise `"lane"`) and `coords` (array of `[lat, lng]` pairs in way order).
- `points`: objects with `kind` (`"signal"` when the node has `highway=traffic_signals` or `crossing=traffic_signals`, otherwise `"crossing"`), `lat`, and `lng`.

All coordinates SHALL be rounded to 5 decimal places. Paths SHALL be sorted by OSM way id and points by OSM node id so weekly diffs stay stable.

The pipeline SHALL exit with a non-zero status and SHALL NOT modify any file in `public/data/` when the urban cycling query fails or yields fewer than 1000 paths or fewer than 2000 points. On success `public/data/meta.json` SHALL include `counts.cyclingPaths` and `counts.cyclingPoints`.

#### Scenario: Classify ways and nodes

- **WHEN** the Overpass response contains the elements below
- **THEN** each is published as listed

##### Example: element mapping

| Element | Expected |
| ------- | -------- |
| way `highway=cycleway`, not in a riverside route | path with `kind: "cycleway"` |
| way `highway=primary, cycleway:right=lane` | path with `kind: "lane"` |
| way `highway=cycleway` that is a member of `基隆河右岸自行車道` | not published |
| way `highway=footway, bicycle=designated` | not published |
| node `highway=traffic_signals` | point with `kind: "signal"` |
| node `highway=crossing, crossing=traffic_signals` | point with `kind: "signal"` |
| node `highway=crossing, crossing=marked` | point with `kind: "crossing"` |

#### Scenario: Coordinates are rounded

- **WHEN** a path node is at (25.0337912, 121.5645188)
- **THEN** the published pair is `[25.03379, 121.56452]`

#### Scenario: Too few urban paths is rejected

- **WHEN** the urban cycling query yields 300 paths
- **THEN** the pipeline exits non-zero with a message naming urban cycling paths and the count 300, and no file in `public/data/` is modified

#### Scenario: Counts are reported

- **WHEN** the pipeline succeeds with 2181 paths and 3926 points
- **THEN** `meta.json` has `counts.cyclingPaths` 2181 and `counts.cyclingPoints` 3926
