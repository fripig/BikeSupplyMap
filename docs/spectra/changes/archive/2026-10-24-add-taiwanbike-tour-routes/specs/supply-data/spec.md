## ADDED Requirements

### Requirement: Tour route dataset

The tour route list is kept in the repository. Each entry has a 交通部自行車旅遊網 (taiwanbike.tw) tour `id` and the tour `name`. The list SHALL hold exactly these entries, in this order:

- `A01` `北海岸漫遊`
- `A02` `單車淡蘭極東2日遊`
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
- **THEN** the last four routes of `routes.json` are `北海岸漫遊`, `單車淡蘭極東2日遊`, `舊草嶺環線`, and `淡水河金色水岸`, each with `kind: "link"`, `optional: true`, and a `vending` array

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

- **WHEN** one tour page has no `__NUXT_DATA__` payload, another tour has a position at longitude 0, a third has only one-point lines, and a fourth page's payload holds only a different tour id
- **THEN** the pipeline exits non-zero with one message per tour naming its `id` and the reason (`no __NUXT_DATA__ payload`, `invalid position`, `no line with 2 or more points`, `no tour with this id in the payload`), and no file in `public/data/` is modified

#### Scenario: Tour lines do not mark stations riverside

- **WHEN** a station lies 50 m from a tour line and more than 200 m from every riverside route line
- **THEN** the station is published with `riverside: false`
