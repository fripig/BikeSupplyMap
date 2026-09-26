## ADDED Requirements

### Requirement: Toilet and shower dataset

The data pipeline SHALL publish `public/data/facilities.json` as `{"toilets": [...], "showers": [...]}` with coordinates rounded to 5 decimal places. Distances SHALL be measured from an element's point (node position or way/relation center) to the nearest segment of a route line published in `routes.json` with `kind: "riverside"`; bridge and link routes SHALL NOT be used.

`toilets` SHALL hold every element inside the two cities tagged `amenity=toilets` within 100 meters of a riverside route line, as objects with `name`, `wheelchair`, `changing_table`, `unisex`, and `fee` (each the element's tag value, or `null` when untagged), `lat`, and `lng`.

`showers` SHALL hold every element tagged `amenity=shower` within 300 meters of a riverside route line, as `kind: "shower"`, and every element tagged `leisure=sports_centre` whose `name` contains `運動中心` within 1000 meters of a riverside route line, as `kind: "sports_centre"`; each as an object with `kind`, `name` (tag value or `null`), `fee` (tag value or `null`), `lat`, and `lng`. An element matching both rules SHALL be published once, as `kind: "shower"`.

Both arrays SHALL be sorted by OSM element id written as type initial plus number (`n123`, `w456`, `r7`), compared as strings, with each element published at most once per array.

The pipeline SHALL exit with a non-zero status and SHALL NOT modify any file in `public/data/` when the facility query fails, or when fewer than 150 toilets or fewer than 5 showers are found. On success `public/data/meta.json` SHALL include `counts.toilets` and `counts.showers` (the array lengths).

#### Scenario: Toilet selection and attributes

- **WHEN** the facility query returns the elements below
- **THEN** each is published as listed

##### Example: toilet selection

| Element | Distance to nearest riverside line | Published |
| ------- | ---------------------------------- | --------- |
| `amenity=toilets, wheelchair=yes, fee=no` | 30 m | toilet with `wheelchair: "yes"`, `fee: "no"`, `name`, `changing_table`, `unisex` all `null` |
| `amenity=toilets, name=美堤公廁, changing_table=yes, unisex=yes` | 90 m | toilet with `name: "美堤公廁"`, `changing_table: "yes"`, `unisex: "yes"` |
| `amenity=toilets` | 150 m | not published |
| `amenity=toilets` | 40 m from a link route line, 400 m from every riverside line | not published |

#### Scenario: Shower selection

- **WHEN** the facility query returns the elements below
- **THEN** each is published as listed

##### Example: shower selection

| Element | Distance to nearest riverside line | Published |
| ------- | ---------------------------------- | --------- |
| `amenity=shower, fee=no` | 146 m | `kind: "shower"`, `name: null`, `fee: "no"` |
| `amenity=shower` | 499 m | not published |
| `leisure=sports_centre, name=萬華運動中心` | 244 m | `kind: "sports_centre"`, `name: "萬華運動中心"` |
| `leisure=sports_centre, name=克強運動中心` | 922 m | `kind: "sports_centre"` |
| `leisure=sports_centre, name=某某羽球館` | 100 m | not published (name lacks 運動中心) |
| `leisure=sports_centre, name=遠方運動中心` | 1200 m | not published |

#### Scenario: Too few facilities is rejected

- **WHEN** the facility query yields 120 toilets and 14 showers
- **THEN** the pipeline exits non-zero with a message naming toilets and the count 120, and no file in `public/data/` is modified

#### Scenario: Facility counts are reported

- **WHEN** the pipeline succeeds with, for example, 335 toilets and 14 showers
- **THEN** `meta.json` has `counts.toilets` equal to 335 and `counts.showers` equal to 14
