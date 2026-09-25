# supply-data Specification

## Purpose

Produces the static datasets the map reads: YouBike 2.0 station locations in Taipei City and New Taipei City, and supply shops in both cities classified into convenience store, supermarket, hypermarket, and grocery. The data is generated at build time so the site needs no backend.

## Requirements

### Requirement: Station dataset covers both cities

The data pipeline SHALL fetch YouBike 2.0 stations from the Taipei City open-data endpoint and the New Taipei City open-data endpoint (following every page of the paginated New Taipei endpoint), and SHALL write them to `public/data/stations.json` as an array of objects with fields `id` (string, the source `sno`), `name` (string), `city` (`"臺北市"` or `"新北市"`), `district` (string), `lat` (number), `lng` (number), and `riverside` (boolean, set by the riverside station classification). The pipeline SHALL remove the leading `YouBike2.0_` prefix from station names. The pipeline SHALL exclude stations whose source `act` field is not `"1"`.

#### Scenario: Normalize stations from both sources

- **WHEN** the pipeline normalizes one Taipei record and one New Taipei record
- **THEN** both produce objects with the same field set and numeric coordinates

##### Example: source field mapping

| Source | Input | Output |
| ------ | ----- | ------ |
| Taipei | `{"sno":"500101001","sna":"YouBike2.0_捷運科技大樓站","sarea":"大安區","latitude":25.02605,"longitude":121.5436,"act":"1"}` | `{"id":"500101001","name":"捷運科技大樓站","city":"臺北市","district":"大安區","lat":25.02605,"lng":121.5436}` |
| New Taipei | `{"sno":"500201001","sna":"YouBike2.0_下庄市場","sarea":"八里區","lat":"25.14678","lng":"121.3999","act":"1"}` | `{"id":"500201001","name":"下庄市場","city":"新北市","district":"八里區","lat":25.14678,"lng":121.3999}` |
| Either | record with `"act":"0"` | not included |

#### Scenario: New Taipei pagination is exhausted

- **WHEN** the New Taipei endpoint returns a full page of 1000 records
- **THEN** the pipeline requests the next page and stops only after a page with fewer than 1000 records

#### Scenario: Every published station carries the riverside flag

- **WHEN** the pipeline writes `public/data/stations.json`
- **THEN** every record has a boolean `riverside` field

---
### Requirement: Shop dataset covers both cities

The data pipeline SHALL query the Overpass API for OpenStreetMap nodes, ways, and relations inside the Taipei City and New Taipei City administrative areas whose `shop` tag is one of `convenience`, `supermarket`, `wholesale`, `general`, `variety_store`, or `greengrocer`, or whose `amenity` tag is `vending_machine`, and SHALL send a descriptive `User-Agent` header identifying the project. The pipeline SHALL write the classified result to `public/data/shops.json` as an array of objects with fields `id` (string, OSM type initial plus OSM id, e.g. `"n123"`, `"w456"`), `name` (string, or `null` when OSM has no name), `category` (one of `convenience`, `supermarket`, `hypermarket`, `grocery`, `vending`), `lat` (number), and `lng` (number). Ways and relations SHALL use their center coordinate.

#### Scenario: Way is reduced to its center point

- **WHEN** the Overpass response contains a way with `center` `{lat: 25.03, lon: 121.52}`
- **THEN** the shop object has `lat` 25.03 and `lng` 121.52 and an `id` starting with `w`

#### Scenario: Vending machine node is published

- **WHEN** the Overpass response contains a node `amenity=vending_machine, vending=drinks` at (25.07, 121.51) with no name
- **THEN** `shops.json` contains an object with `category: "vending"`, `name: null`, `lat` 25.07 and `lng` 121.51

---
### Requirement: Shop classification rules

The pipeline SHALL classify each shop by applying rules in this order and using the first match: (1) exclusion rules, (2) the vending machine rule, (3) brand rules matched against the OSM `brand` tag and then the `name` tag, (4) `shop`-tag fallback. Shops excluded by any rule SHALL NOT appear in `shops.json`.

- Exclusion: name or brand contains `蝦皮`.
- Vending machine: an element with `amenity=vending_machine` is `vending` when it has no `vending` tag, or when any `;`-separated value of its `vending` tag is one of `drinks`, `water`, `coffee`, `food`, `ice_cream`, `sweets`, `bread`, `milk`, `snacks`, `beverages`. Any other `amenity=vending_machine` element is excluded, and vending machines never fall through to brand or `shop`-tag rules.
- Hypermarket brands: `家樂福` (unless the name or brand contains `超市` or `Market`), `好市多`, `Costco`, `大潤發`, `愛買`.
- Supermarket brands: `全聯`, `美廉社`, `家樂福超市`, `家樂福 Market`, `頂好`, `Wellcome`, `聖德科斯`, `楓康`.
- Convenience brands: `7-Eleven`, `統一超商`, `全家`, `FamilyMart`, `萊爾富`, `Hi-Life`, `OK超商`, `OK mart`.
- Fallback by `shop` tag: `convenience` → convenience; `supermarket` → supermarket; `general`, `variety_store`, `greengrocer` → grocery; `wholesale` → excluded.

#### Scenario: Classify representative shops

- **WHEN** the classifier receives shops with the tags below
- **THEN** each is assigned the expected category or excluded

##### Example: classification table

| Tags | Expected | Notes |
| ---- | -------- | ----- |
| `shop=convenience, brand=7-Eleven` | convenience | brand rule |
| `shop=convenience, name=蝦皮店到店 內湖店` | excluded | exclusion rule wins over shop tag |
| `shop=supermarket, brand=家樂福超市` | supermarket | 超市 suffix keeps it out of hypermarket |
| `shop=supermarket, brand=家樂福` | hypermarket | |
| `shop=wholesale, name=好市多` | hypermarket | brand rule wins over wholesale fallback |
| `shop=wholesale, name=棉花田生機園` | excluded | wholesale fallback |
| `shop=general, name=柑仔店` | grocery | fallback |
| `shop=variety_store, name=小北百貨` | grocery | fallback |
| `shop=convenience` (no name, no brand) | convenience | fallback, `name` is `null` |
| `amenity=vending_machine, vending=drinks` | vending | |
| `amenity=vending_machine, vending=coffee;food` | vending | any listed value counts |
| `amenity=vending_machine` (no `vending` tag) | vending | untagged machines count |
| `amenity=vending_machine, vending=parking_tickets` | excluded | not food or drink |
| `amenity=vending_machine, vending=excrement_bags` | excluded | not food or drink |
| `amenity=vending_machine, vending=drinks, brand=7-Eleven` | vending | vending rule wins over brand rules |

---
### Requirement: Pipeline refuses to publish incomplete data

The pipeline SHALL exit with a non-zero status and SHALL NOT modify existing files in `public/data/` when any source request fails, returns a non-JSON body, or yields fewer records than its minimum: 500 active stations for Taipei City, 500 active stations for New Taipei City, 2000 classified shops in total, 100 shops in the `vending` category, 15 riverside routes, and 150 riverside stations. On success the pipeline SHALL also write `public/data/meta.json` with `generatedAt` (ISO 8601 timestamp) and `counts` (`stations`, `riversideStations`, and `shops` per category, including `vending`).

#### Scenario: Overpass failure keeps previous data

- **WHEN** the Overpass request returns HTTP 406 or 504
- **THEN** the pipeline exits non-zero and `public/data/shops.json`, `stations.json`, and `meta.json` are byte-identical to before the run

#### Scenario: Suspiciously small result is rejected

- **WHEN** the New Taipei endpoint returns only 120 active stations
- **THEN** the pipeline exits non-zero with a message naming the source and the count, and no data file is modified

#### Scenario: Too few riverside routes is rejected

- **WHEN** the riverside route query returns only 4 riverside routes
- **THEN** the pipeline exits non-zero with a message naming riverside routes and the count 4, and no data file is modified

#### Scenario: Riverside count is reported

- **WHEN** the pipeline succeeds and 326 stations are marked riverside
- **THEN** `meta.json` has `counts.riversideStations` equal to 326

#### Scenario: Too few vending machines is rejected

- **WHEN** the shop query yields 40 vending machines
- **THEN** the pipeline exits non-zero with a message naming vending machines and the count 40, and no data file is modified

---
### Requirement: Riverside station classification

The data pipeline SHALL query the Overpass API for OpenStreetMap relations tagged `route=bicycle` inside the Taipei City and New Taipei City administrative areas, together with the geometry of their member ways. A relation is a riverside route when its `name` tag matches the regular expression `河|溪|水岸|左岸|右岸`, or equals one of `關渡自行車道`, `社子島環島自行車道`, `二重環狀自行車道`. A station SHALL be marked riverside when the shortest distance from the station to any segment of any member way of any riverside route is less than or equal to 200 meters; otherwise it SHALL be marked not riverside. The distance SHALL be measured to the nearest point on the segment, including the segment end points. The riverside query SHALL use the same Overpass instances, retry behaviour, and `User-Agent` header as the shop query.

#### Scenario: Riverside route selection by name

- **WHEN** the Overpass response contains bicycle route relations with the names below
- **THEN** each is selected or skipped as listed

##### Example: route names

| Relation name | Selected | Notes |
| ------------- | -------- | ----- |
| `基隆河右岸自行車道` | yes | contains 河 |
| `景美溪左岸自行車道` | yes | contains 溪 |
| `金色水岸自行車道` | yes | contains 水岸 |
| `八里左岸自行車道` | yes | contains 左岸 |
| `社子島環島自行車道` | yes | explicit name |
| `復興南北路自行車道` | no | urban road |
| `環島1號線 (順時針)` | no | long-distance route |
| relation without a `name` tag | no | |

#### Scenario: Station distance threshold

- **WHEN** a riverside route has a single segment from (25.0, 121.50) to (25.0, 121.51) and the pipeline classifies the stations below
- **THEN** each station's `riverside` flag is as listed

##### Example: distance boundary

| Station (lat, lng) | Approx. distance | Expected `riverside` | Notes |
| ------------------ | ---------------- | -------------------- | ----- |
| (25.0017, 121.505) | 189 m | `true` | perpendicular to the segment |
| (25.0019, 121.505) | 211 m | `false` | just beyond 200 m |
| (25.0, 121.5115) | 151 m | `true` | beyond the segment end, measured to the end point |
| (25.0, 121.5125) | 252 m | `false` | beyond the end point by more than 200 m |

---
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

---
### Requirement: Bike route dataset

The data pipeline SHALL publish `public/data/routes.json` from the OSM `route=bicycle` relations and member-way geometry already fetched for the riverside station classification, plus the ways selected by the supplementary bridge list. It SHALL include every riverside route (as defined by the riverside station classification) with `kind: "riverside"`, and every other relation whose `name` contains `橋` with `kind: "bridge"`. Each route SHALL be an object with `kind`, `name` (the relation's `name` tag), and `lines` (an array of lines, each an array of `[lat, lng]` pairs), where the member ways are joined into lines by the line-joining rule of the urban cycling dataset. Coordinates SHALL be rounded to 5 decimal places and relation routes SHALL be sorted by OSM relation id.

The supplementary bridge list is kept in the repository. Each entry has an OSM `name`, a `highway` value, and a display `label`. For each entry the pipeline SHALL select the ways inside the two cities tagged with exactly that `name` and `highway` and with `bridge=yes`, join them with the same rule, and publish them as a route with `kind: "bridge"` and `name` set to the entry's `label`. These routes SHALL follow the relation routes in list order. The first entry SHALL be `name` `重陽橋`, `highway` `secondary`, `label` `重陽橋（人行道）`.

`routes.json` SHALL also contain a `vending` array: every shop in the `vending` category whose distance to the nearest segment of any published route line is at most 200 meters, as objects with `name` (string or `null`), `vending` (the OSM `vending` tag value or `null`), `lat`, and `lng`, sorted by shop id.

The pipeline SHALL exit with a non-zero status and SHALL NOT modify any file in `public/data/` when fewer than 10 bridge routes are found among the relations, or when any supplementary bridge entry selects no way. On success `public/data/meta.json` SHALL include `counts.bridgeRoutes` (relation bridge routes) and `counts.routeVending` (the length of the `vending` array).

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

#### Scenario: Supplementary bridge selection

- **WHEN** the route query returns the ways below and the list holds the 重陽橋 entry
- **THEN** only the listed ways form the route `重陽橋（人行道）`

##### Example: supplementary way selection

| Way tags | Selected |
| -------- | -------- |
| `name=重陽橋, highway=secondary, bridge=yes` | yes |
| `name=重陽橋, highway=service, bridge=yes, motorcycle=designated` | no (different highway) |
| `name=重陽橋, highway=secondary` (no bridge tag) | no |
| `name=重陽陸橋, highway=footway, bridge=yes` | no (different name) |

#### Scenario: Missing supplementary bridge is rejected

- **WHEN** no way matches the 重陽橋 entry
- **THEN** the pipeline exits non-zero with a message naming `重陽橋` and no file in `public/data/` is modified

#### Scenario: Vending machines near routes

- **WHEN** vending shops lie 150 m and 250 m from the nearest route line
- **THEN** only the one at 150 m appears in `routes.json` `vending`
