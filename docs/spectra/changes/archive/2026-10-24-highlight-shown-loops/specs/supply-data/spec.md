## ADDED Requirements

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

- **WHEN** the optional loop `環騎臺北替代道路（深南路-南深路段）` has one line, `北臺濱海環線（環島1-1）` has ten lines, and `環騎臺北（連接道路）` is not optional
- **THEN** the first has two `tip` stops at its line's ends, the second has `stops: []`, and the third has no `stops` field

#### Scenario: A tour with an unreadable segment name is rejected

- **WHEN** the A07 payload's only segment is named `臺北府城北門至捷運紅樹林車站`
- **THEN** the pipeline exits non-zero with a message naming `A07` and that segment name, and no file in `public/data/` is modified

#### Scenario: A tour whose segments do not chain is rejected

- **WHEN** the A01 payload's segments are named `松山車站 - 白沙灣` and `淡水 - 基隆車站`
- **THEN** the pipeline exits non-zero with a message naming `A01`, and no file in `public/data/` is modified
