## MODIFIED Requirements

### Requirement: Bike route dataset

The data pipeline SHALL publish `public/data/routes.json` from the OSM `route=bicycle` relations and member-way geometry already fetched for the riverside station classification, plus the ways selected by the supplementary bridge list. It SHALL include every riverside route (as defined by the riverside station classification) with `kind: "riverside"`, and every other relation whose `name` contains `橋` with `kind: "bridge"`. Each route SHALL be an object with `kind`, `name` (the relation's `name` tag), and `lines` (an array of lines, each an array of `[lat, lng]` pairs), where the member ways are joined into lines by the line-joining rule of the urban cycling dataset. Coordinates SHALL be rounded to 5 decimal places and relation routes SHALL be sorted by OSM relation id.

The supplementary bridge list is kept in the repository. Each entry has an OSM `name`, a `highway` value, and a display `label`. For each entry the pipeline SHALL select the ways inside the two cities tagged with exactly that `name` and `highway` and with `bridge=yes`, join them with the same rule, and publish them as a route with `kind: "bridge"` and `name` set to the entry's `label`. These routes SHALL follow the relation routes in list order. The first entry SHALL be `name` `重陽橋`, `highway` `secondary`, `label` `重陽橋（人行道）`.

The loop route list is kept in the repository. Each entry has the OSM relation `name` of a loop route, a display `label`, and optionally `optional: true`. For each entry the pipeline SHALL take the member ways of the `route=bicycle` relation with exactly that `name`, drop every way that is a member of a relation published as `kind: "riverside"` or `kind: "bridge"` or that is already in a link route published for an earlier entry of the list, join the remaining ways with the same rule, and publish them as a route with `kind: "link"` and `name` set to the entry's `label`; a route from an optional entry SHALL also have `optional: true`, and a route from any other entry SHALL have no `optional` field. Link routes SHALL follow the supplementary bridge routes in list order. The list SHALL hold exactly these entries in this order: `環騎臺北` → `環騎臺北（連接道路）`; `環騎臺北市區替代道路：深南路-南深路段` → `環騎臺北替代道路（深南路-南深路段）`; `環騎臺北市區替代道路：市民大道-莊敬隧道段` → `環騎臺北替代道路（市民大道-莊敬隧道段）`; `環騎臺北市區替代道路：研究院路-莊敬隧道段` → `環騎臺北替代道路（研究院路-莊敬隧道段）`. Every entry except `環騎臺北` SHALL be optional. No OSM way SHALL appear in more than one link route. A loop relation SHALL NOT be published as a riverside or bridge route because of its list entry, and link lines SHALL NOT be used for the riverside station classification.

`routes.json` SHALL also contain a `vending` array: every shop in the `vending` category whose distance to the nearest segment of any published route line without `optional` (riverside, bridge, or non-optional link) is at most 200 meters, as objects with `name` (string or `null`), `vending` (the OSM `vending` tag value or `null`), `lat`, and `lng`, sorted by shop id. Each optional link route SHALL have its own `vending` array in the same shape and order: every vending shop within 200 meters of that route's lines that is not in the top-level array. A shop within 200 meters of two optional routes SHALL appear in both of their arrays.

The pipeline SHALL exit with a non-zero status and SHALL NOT modify any file in `public/data/` when fewer than 10 bridge routes are found among the relations, when any supplementary bridge entry selects no way, or when any loop route entry matches no relation or leaves no way after the riverside, bridge and earlier link ways are dropped. On success `public/data/meta.json` SHALL include `counts.bridgeRoutes` (relation bridge routes) and `counts.routeVending` (the length of the top-level `vending` array).

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
| `環騎臺北市區替代道路：深南路-南深路段` | `kind: "link"`, `optional: true`, `name: "環騎臺北替代道路（深南路-南深路段）"`, only its ways outside riverside, bridge and earlier link routes |
| `北臺濱海環線 (西向)` | not published (not in the loop route list) |
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

#### Scenario: Overlapping loops draw each way once

- **WHEN** the relations `環騎臺北` and `環騎臺北市區替代道路：深南路-南深路段` have the member ways below and neither way is in a riverside or bridge relation
- **THEN** each way is published only in the link route listed

##### Example: shared link way

| Way | Member of | Published in |
| --- | --------- | ------------ |
| 201 | `環騎臺北` and `環騎臺北市區替代道路：深南路-南深路段` | `環騎臺北（連接道路）` only (earlier entry) |
| 202 (深南路) | `環騎臺北市區替代道路：深南路-南深路段` only | `環騎臺北替代道路（深南路-南深路段）` |

#### Scenario: Missing loop route is rejected

- **WHEN** the route query returns no relation named `環騎臺北`, or every member way of it is also a member of a riverside or bridge relation
- **THEN** the pipeline exits non-zero with a message naming `環騎臺北` and no file in `public/data/` is modified

#### Scenario: Loop fully covered by earlier link routes is rejected

- **WHEN** every member way of `環騎臺北市區替代道路：研究院路-莊敬隧道段` is a member of a riverside or bridge relation or of `環騎臺北` or another earlier-listed loop relation
- **THEN** the pipeline exits non-zero with a message naming `環騎臺北市區替代道路：研究院路-莊敬隧道段` and no file in `public/data/` is modified

#### Scenario: Link lines do not mark stations riverside

- **WHEN** a station lies 50 m from a link line and more than 200 m from every riverside route line
- **THEN** the station is published with `riverside: false`

#### Scenario: Optional loops carry their own vending machines

- **WHEN** vending shops lie as below and `環騎臺北替代道路（深南路-南深路段）` and `環騎臺北替代道路（市民大道-莊敬隧道段）` are optional link routes
- **THEN** each shop is published as listed

##### Example: vending placement

| Shop | Near (within 200 m) | Published in |
| ---- | ------------------- | ------------ |
| v1 | a riverside line and `環騎臺北替代道路（深南路-南深路段）` | top-level `vending` only |
| v2 | `環騎臺北替代道路（深南路-南深路段）` only | that route's `vending` only |
| v3 | `環騎臺北替代道路（深南路-南深路段）` and `環騎臺北替代道路（市民大道-莊敬隧道段）` | both routes' `vending` |
| v4 | no route line | nowhere |

#### Scenario: Vending machines near routes

- **WHEN** vending shops lie 150 m and 250 m from the nearest route line, and a third lies 120 m from a link line and more than 200 m from every riverside and bridge line
- **THEN** the shops at 150 m and at 120 m from the link line appear in `routes.json` `vending`, and the one at 250 m does not

### Requirement: Tour route dataset

The tour route list is kept in the repository. Each entry has a 交通部自行車旅遊網 (taiwanbike.tw) tour `id` and the tour `name`. The list SHALL hold exactly these entries, in this order:

- `A01` `北海岸漫遊`
- `A03` `舊草嶺環線`
- `A07` `淡水河金色水岸`

**Reading a tour.** For each entry the pipeline SHALL download the tour page `https://taiwanbike.tw/bikeRoute/tour/<id>`. It SHALL read the tour from the page's `__NUXT_DATA__` Nuxt payload: the value with `type: "tour"` and `info.id` equal to the entry's `id`.

**Building the lines.** The tour's lines are built from its `geometry[].geometry` GeoJSON:

- Each `LineString` becomes one line, and each part of a `MultiLineString` becomes one line.
- Positions are converted from `[lng, lat]` to `[lat, lng]` and rounded to 5 decimal places.
- Consecutive identical points are reduced to one.
- Lines left with fewer than 2 points are dropped.

**Publishing.** Each tour SHALL be published in `routes.json` as `{ kind: "link", name, optional: true, lines }`, with `name` set to the entry's `name`. Ways of riverside, bridge, or loop routes SHALL NOT be subtracted from a tour. Tour routes SHALL follow the loop route list's link routes, in tour list order. As optional link routes, they get their own `vending` array by the Bike route dataset rule. Tour lines SHALL NOT be used for the riverside station classification.

**Refusing to publish.** The pipeline SHALL exit with a non-zero status, with a message naming the tour `id`, and SHALL NOT modify any file in `public/data/` when any of these holds:

- a tour page cannot be downloaded;
- the page has no `__NUXT_DATA__` payload;
- the payload has no tour with the entry's `id`;
- the tour's `info.name` differs from the entry's `name`;
- any position has a longitude outside 119–123 or a latitude outside 21–26.5;
- no line with at least 2 points remains.

#### Scenario: Tours are published after the loop routes

- **WHEN** every tour page serves a payload whose tour matches its entry
- **THEN** the last three routes of `routes.json` are `北海岸漫遊`, `舊草嶺環線`, and `淡水河金色水岸`, each with `kind: "link"`, `optional: true`, and a `vending` array

#### Scenario: Track geometry becomes lines

- **WHEN** a tour's geometry is as below
- **THEN** its published `lines` are as listed

##### Example: tour lines

| GeoJSON | Published lines |
| ------- | --------------- |
| `LineString [[121.511094,25.047777],[121.51151,25.04855]]` | `[[[25.04778,121.51109],[25.04855,121.51151]]]` |
| `MultiLineString [[[121.5,25.0],[121.5,25.0],[121.6,25.1]],[[121.7,25.2]]]` | `[[[25,121.5],[25.1,121.6]]]` (duplicate reduced, one-point part dropped) |

#### Scenario: A missing tour page is rejected

- **WHEN** the page for `A07` answers HTTP 404
- **THEN** the pipeline exits non-zero with a message naming `A07`, and no file in `public/data/` is modified

#### Scenario: A renamed tour is rejected

- **WHEN** the payload for `A03` names the tour `舊草嶺隧道環線`
- **THEN** the pipeline exits non-zero with a message naming `A03` and `舊草嶺隧道環線`, and no file in `public/data/` is modified

#### Scenario: A page without a usable track is rejected

- **WHEN** one tour page has no `__NUXT_DATA__` payload, another tour has a position at longitude 0, and the third has only one-point lines
- **THEN** the pipeline exits non-zero with one message per tour naming its `id` and the reason (`no __NUXT_DATA__ payload`, `invalid position`, `no line with 2 or more points`), and no file in `public/data/` is modified

#### Scenario: A page holding a different tour is rejected

- **WHEN** the `A07` page's payload holds only the tour `A01`
- **THEN** the pipeline exits non-zero with a message naming `A07` and `no tour with this id in the payload`, and no file in `public/data/` is modified

#### Scenario: Tour lines do not mark stations riverside

- **WHEN** a station lies 50 m from a tour line and more than 200 m from every riverside route line
- **THEN** the station is published with `riverside: false`

### Requirement: Route stops

Every route in `routes.json` with `optional: true` SHALL have a `stops` array. Each stop is an object with:

- `kind`: one of `start`, `via`, `end`, or `tip`;
- `name`: a string or `null`;
- `lat` and `lng`, rounded to 5 decimal places.

Routes without `optional` SHALL have no `stops` field.

**Tour routes.** For a tour route of the Tour route dataset, the pipeline SHALL read the tour's `route` segments in order. Each segment `name` SHALL be split on ` - ` into exactly two non-empty parts, `<from>` and `<to>`. The stops are, in order:

1. a `start` named after the first segment's `<from>`, at the first point of the first segment's own point list;
2. one `via` per segment except the last, named after that segment's `<to>`, at the last point of that segment's own point list;
3. an `end` named after the last segment's `<to>`, at the last point of the last segment's own point list.

**Refusing to publish.** The pipeline SHALL exit with a non-zero status, with a message naming the tour `id`, and SHALL NOT modify any file in `public/data/` when any of these holds:

- the tour has no segment;
- a segment name does not split into exactly two non-empty parts;
- a segment's `<from>` differs from the previous segment's `<to>`;
- a stop position has a longitude outside 119–123 or a latitude outside 21–26.5.

**Loop routes.** An optional link route from the loop route list SHALL get stops as follows:

- with exactly one line: two `tip` stops with `name: null`, at the line's first point and at its last point;
- with more than one line: `stops: []`.

#### Scenario: Tour stops follow the day segments

- **WHEN** a tour's segments are as below
- **THEN** its `stops` are as listed

##### Example: tour stops

| Segments (name: first point → last point) | Stops |
| ----------------------------------------- | ----- |
| `臺北府城北門 - 捷運紅樹林車站`: (25.04778, 121.51109) → (25.15482, 121.45859) | start 臺北府城北門 (25.04778, 121.51109); end 捷運紅樹林車站 (25.15482, 121.45859) |
| `松山車站 - 瑞芳老街`: (25.04923, 121.57784) → (25.08406, 121.67619); `瑞芳老街 - 福隆車站`: (25.04923, 121.57784) → (25.01657, 121.94487) | start 松山車站 (25.04923, 121.57784); via 瑞芳老街 (25.08406, 121.67619); end 福隆車站 (25.01657, 121.94487) |

#### Scenario: Loop stops depend on the line count

- **WHEN** the optional loop `環騎臺北替代道路（深南路-南深路段）` has one line, a second optional loop has ten lines, and `環騎臺北（連接道路）` is not optional
- **THEN** the first has two `tip` stops at its line's ends, the second has `stops: []`, and the third has no `stops` field

#### Scenario: A tour with an unreadable segment name is rejected

- **WHEN** the A07 payload's only segment is named `臺北府城北門至捷運紅樹林車站`
- **THEN** the pipeline exits non-zero with a message naming `A07` and that segment name, and no file in `public/data/` is modified

#### Scenario: A tour whose segments do not chain is rejected

- **WHEN** the A01 payload's segments are named `松山車站 - 白沙灣` and `淡水 - 基隆車站`
- **THEN** the pipeline exits non-zero with a message naming `A01`, and no file in `public/data/` is modified
