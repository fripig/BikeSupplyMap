## MODIFIED Requirements

### Requirement: Bike route dataset

The data pipeline SHALL publish `public/data/routes.json` from the OSM `route=bicycle` relations and member-way geometry already fetched for the riverside station classification, plus the ways selected by the supplementary bridge list. It SHALL include every riverside route (as defined by the riverside station classification) with `kind: "riverside"`, and every other relation whose `name` contains `橋` with `kind: "bridge"`. Each route SHALL be an object with `kind`, `name` (the relation's `name` tag), and `lines` (an array of lines, each an array of `[lat, lng]` pairs), where the member ways are joined into lines by the line-joining rule of the urban cycling dataset. Coordinates SHALL be rounded to 5 decimal places and relation routes SHALL be sorted by OSM relation id.

The supplementary bridge list is kept in the repository. Each entry has an OSM `name`, a `highway` value, and a display `label`. For each entry the pipeline SHALL select the ways inside the two cities tagged with exactly that `name` and `highway` and with `bridge=yes`, join them with the same rule, and publish them as a route with `kind: "bridge"` and `name` set to the entry's `label`. These routes SHALL follow the relation routes in list order. The first entry SHALL be `name` `重陽橋`, `highway` `secondary`, `label` `重陽橋（人行道）`.

The loop route list is kept in the repository. Each entry has the OSM relation `name` of a loop route and a display `label`. For each entry the pipeline SHALL take the member ways of the `route=bicycle` relation with exactly that `name`, drop every way that is a member of a relation published as `kind: "riverside"` or `kind: "bridge"`, join the remaining ways with the same rule, and publish them as a route with `kind: "link"` and `name` set to the entry's `label`. Link routes SHALL follow the supplementary bridge routes in list order. The first entry SHALL be `name` `環騎臺北`, `label` `環騎臺北（連接道路）`. A loop relation SHALL NOT be published as a riverside or bridge route because of its list entry, and link lines SHALL NOT be used for the riverside station classification.

`routes.json` SHALL also contain a `vending` array: every shop in the `vending` category whose distance to the nearest segment of any published route line (riverside, bridge, or link) is at most 200 meters, as objects with `name` (string or `null`), `vending` (the OSM `vending` tag value or `null`), `lat`, and `lng`, sorted by shop id.

The pipeline SHALL exit with a non-zero status and SHALL NOT modify any file in `public/data/` when fewer than 10 bridge routes are found among the relations, when any supplementary bridge entry selects no way, or when any loop route entry matches no relation or leaves no way after the riverside and bridge ways are dropped. On success `public/data/meta.json` SHALL include `counts.bridgeRoutes` (relation bridge routes) and `counts.routeVending` (the length of the `vending` array).

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
| `環騎臺北` | `kind: "link"`, `name: "環騎臺北（連接道路）"`, only its ways outside riverside and bridge relations |
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

#### Scenario: Link ways exclude riverside and bridge ways

- **WHEN** the relation `環騎臺北` has the member ways below
- **THEN** only the ways marked kept form the route `環騎臺北（連接道路）`

##### Example: link way selection

| Way | Also a member of | Kept |
| --- | ---------------- | ---- |
| 101 (研究院路二段) | `環島1號線 (順時針)` only | yes (that relation is not published) |
| 102 | `基隆河左岸自行車道` | no (riverside) |
| 103 | `華江橋自行車道` | no (bridge) |
| 104 (木柵路五段43巷) | no other relation | yes |

#### Scenario: Missing loop route is rejected

- **WHEN** the route query returns no relation named `環騎臺北`, or every member way of it is also a member of a riverside or bridge relation
- **THEN** the pipeline exits non-zero with a message naming `環騎臺北` and no file in `public/data/` is modified

#### Scenario: Link lines do not mark stations riverside

- **WHEN** a station lies 50 m from a link line and more than 200 m from every riverside route line
- **THEN** the station is published with `riverside: false`

#### Scenario: Vending machines near routes

- **WHEN** vending shops lie 150 m and 250 m from the nearest route line, and a third lies 120 m from a link line and more than 200 m from every riverside and bridge line
- **THEN** the shops at 150 m and at 120 m from the link line appear in `routes.json` `vending`, and the one at 250 m does not
