## Purpose

Produces the static datasets the map reads: YouBike 2.0 station locations in Taipei City and New Taipei City, and supply shops in both cities classified into convenience store, supermarket, hypermarket, and grocery. The data is generated at build time so the site needs no backend.

## ADDED Requirements

### Requirement: Station dataset covers both cities

The data pipeline SHALL fetch YouBike 2.0 stations from the Taipei City open-data endpoint and the New Taipei City open-data endpoint (following every page of the paginated New Taipei endpoint), and SHALL write them to `public/data/stations.json` as an array of objects with fields `id` (string, the source `sno`), `name` (string), `city` (`"臺北市"` or `"新北市"`), `district` (string), `lat` (number), and `lng` (number). The pipeline SHALL remove the leading `YouBike2.0_` prefix from station names. The pipeline SHALL exclude stations whose source `act` field is not `"1"`.

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

### Requirement: Shop dataset covers both cities

The data pipeline SHALL query the Overpass API for OpenStreetMap nodes, ways, and relations inside the Taipei City and New Taipei City administrative areas whose `shop` tag is one of `convenience`, `supermarket`, `wholesale`, `general`, `variety_store`, or `greengrocer`, and SHALL send a descriptive `User-Agent` header identifying the project. The pipeline SHALL write the classified result to `public/data/shops.json` as an array of objects with fields `id` (string, OSM type initial plus OSM id, e.g. `"n123"`, `"w456"`), `name` (string, or `null` when OSM has no name), `category` (one of `convenience`, `supermarket`, `hypermarket`, `grocery`), `lat` (number), and `lng` (number). Ways and relations SHALL use their center coordinate.

#### Scenario: Way is reduced to its center point

- **WHEN** the Overpass response contains a way with `center` `{lat: 25.03, lon: 121.52}`
- **THEN** the shop object has `lat` 25.03 and `lng` 121.52 and an `id` starting with `w`

### Requirement: Shop classification rules

The pipeline SHALL classify each shop by applying rules in this order and using the first match: (1) exclusion rules, (2) brand rules matched against the OSM `brand` tag and then the `name` tag, (3) `shop`-tag fallback. Shops excluded by any rule SHALL NOT appear in `shops.json`.

- Exclusion: name or brand contains `蝦皮`.
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

### Requirement: Pipeline refuses to publish incomplete data

The pipeline SHALL exit with a non-zero status and SHALL NOT modify existing files in `public/data/` when any source request fails, returns a non-JSON body, or yields fewer records than its minimum: 500 active stations for Taipei City, 500 active stations for New Taipei City, and 2000 classified shops in total. On success the pipeline SHALL also write `public/data/meta.json` with `generatedAt` (ISO 8601 timestamp) and `counts` (`stations`, and `shops` per category).

#### Scenario: Overpass failure keeps previous data

- **WHEN** the Overpass request returns HTTP 406 or 504
- **THEN** the pipeline exits non-zero and `public/data/shops.json`, `stations.json`, and `meta.json` are byte-identical to before the run

#### Scenario: Suspiciously small result is rejected

- **WHEN** the New Taipei endpoint returns only 120 active stations
- **THEN** the pipeline exits non-zero with a message naming the source and the count, and no data file is modified
