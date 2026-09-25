## ADDED Requirements

### Requirement: Rain shelter dataset

The data pipeline SHALL publish `public/data/shelters.json` as `{"shelters": [...]}`, where each entry is an object with `kind` (`"bridge"` or `"shelter"`), `name` (string or `null`), `lat`, and `lng`, with coordinates rounded to 5 decimal places. Only lines of routes published in `routes.json` with `kind: "riverside"` SHALL be used; bridge and link routes SHALL NOT be used.

Bridge spots: the pipeline SHALL fetch every way inside the two cities tagged `bridge=yes` with `highway` one of `motorway`, `trunk`, `primary`, `secondary`, `tertiary`, `motorway_link`, `trunk_link`, `primary_link`, `secondary_link`, or with `railway` one of `rail`, `subway`, `light_rail`. Every point where a segment of such a way crosses a segment of a riverside route line is a crossing. Crossings SHALL be processed ordered by way id and then by position along the way; a crossing within 60 meters of an already kept spot SHALL be merged into that spot, otherwise it becomes a new spot at the crossing point. A spot's `name` SHALL be the `name` tag of the first way in its merged crossings that has one, or `null` when none has. Bridge spots SHALL be sorted by `lat` and then `lng`.

Shelter spots: the pipeline SHALL fetch every element inside the two cities tagged `amenity=shelter` whose `shelter_type` is not `public_transport`, and every element tagged `building=roof`, reduced to a point (node position or way/relation center). An element SHALL become a shelter spot when that point is at most 100 meters from the nearest segment of a riverside route line. Its `name` SHALL be the element's `name` tag or `null`. An element tagged both ways SHALL be published once. Shelter spots SHALL be sorted by their OSM element id written as type initial plus number (`n123`, `w456`, `r7`, the same form shops use), compared as strings, and SHALL follow all bridge spots in the file.

The pipeline SHALL exit with a non-zero status and SHALL NOT modify any file in `public/data/` when the shelter query fails or when fewer than 80 bridge spots or fewer than 80 shelter spots are found. On success `public/data/meta.json` SHALL include `counts.shelters` as `{ "bridge": <count>, "shelter": <count> }`.

#### Scenario: Bridge crossings become merged spots

- **WHEN** riverside route lines and bridge ways cross as listed
- **THEN** the bridge spots are as listed

##### Example: crossing merge

| Crossings (way id, name, position) | Published bridge spots |
| ---------------------------------- | ---------------------- |
| way 10 `中正橋` at P; way 11 `中正橋` 30 m from P | one spot at P, `name: "中正橋"` |
| way 20 (no name) at Q; way 21 `環河快速道路` 40 m from Q | one spot at Q, `name: "環河快速道路"` |
| way 30 (no name) at R, no other crossing within 60 m | one spot at R, `name: null` |
| way 40 `忠孝橋` at S; way 41 `忠孝橋` 80 m from S | two spots, both `name: "忠孝橋"` |

#### Scenario: Only listed bridge types count

- **WHEN** a riverside route line crosses the ways below
- **THEN** only the ways marked yes produce a crossing

##### Example: bridge way selection

| Way tags | Crossing |
| -------- | -------- |
| `highway=primary, bridge=yes` | yes |
| `railway=subway, bridge=yes` | yes |
| `highway=primary` (no bridge tag) | no |
| `highway=residential, bridge=yes` | no |
| `highway=cycleway, bridge=yes` | no |

#### Scenario: Shelters near riverside routes

- **WHEN** the shelter query returns the elements below
- **THEN** each is published as listed

##### Example: shelter selection

| Element | Distance to nearest riverside line | Published |
| ------- | ---------------------------------- | --------- |
| `amenity=shelter, name=單車道終點涼亭` | 4 m | `kind: "shelter"`, `name: "單車道終點涼亭"` |
| `amenity=shelter, shelter_type=gazebo` | 90 m | `kind: "shelter"`, `name: null` |
| `building=roof` way | 60 m (center) | `kind: "shelter"`, `name: null` |
| `amenity=shelter, shelter_type=public_transport` | 10 m | not published |
| `amenity=shelter` | 150 m | not published |
| `amenity=shelter` | 50 m from a link route line, 300 m from every riverside line | not published |

#### Scenario: Too few shelters is rejected

- **WHEN** the shelter query yields 40 bridge spots and 120 shelter spots
- **THEN** the pipeline exits non-zero with a message naming bridge shelter spots and the count 40, and no file in `public/data/` is modified

#### Scenario: Shelter counts are reported

- **WHEN** the pipeline succeeds with, for example, 157 bridge spots and 175 shelter spots
- **THEN** `meta.json` has `counts.shelters` equal to the two counts (`{ "bridge": 157, "shelter": 175 }` in the example) and `shelters.json` holds their sum (332) as entries, bridge spots first
