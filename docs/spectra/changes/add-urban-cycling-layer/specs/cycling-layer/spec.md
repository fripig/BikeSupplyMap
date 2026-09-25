## Purpose

An optional map overlay showing the urban bike-path network of Taipei City and New Taipei City, with traffic signals and crossings along it, so riders can plan the city-street leg between riverside paths, stations, and shops. It reads the static `cycling.json` produced by the `supply-data` capability.

## ADDED Requirements

### Requirement: Urban bike-path layer toggle

The site SHALL provide a toggle labelled `都市自行車道`, off by default and operable by touch. The toggle SHALL be independent of the `顯示市區站點` toggle and SHALL NOT change the station markers, the selected station, or its shop list. The site SHALL NOT request `data/cycling.json` until the toggle is first turned on; after a successful load, turning it off and on again SHALL NOT request the file again. If the request fails, the site SHALL show `自行車道資料載入失敗` next to the toggle, turn the toggle back off, and leave the rest of the map working.

#### Scenario: Layer is off on load

- **WHEN** the user opens the site
- **THEN** the `都市自行車道` toggle is off, no bike path is drawn, and no request for `data/cycling.json` has been made

#### Scenario: Load failure is contained

- **WHEN** the user turns on `都市自行車道` and `data/cycling.json` returns HTTP 404
- **THEN** the message `自行車道資料載入失敗` appears, the toggle is off, and stations remain selectable

### Requirement: Urban bike paths are drawn

While the `都市自行車道` toggle is on, the site SHALL draw every path in `cycling.json` as a line at every zoom level, with `cycleway` paths drawn as solid lines and `lane` paths drawn as dashed lines. The lines SHALL NOT intercept clicks on station markers.

#### Scenario: Paths appear when enabled

- **WHEN** the user turns on `都市自行車道`
- **THEN** solid lines appear for separate cycleways and dashed lines for painted lanes, and clicking a station marker on top of a line still selects the station

#### Scenario: Paths disappear when disabled

- **WHEN** the layer is on and the user turns it off
- **THEN** all bike-path lines and signal and crossing markers are removed

### Requirement: Traffic signals and crossings along urban paths

While the `都市自行車道` toggle is on and the map zoom is 16 or greater, the site SHALL mark every point in `cycling.json` with an icon by kind: one icon for `signal` (紅綠燈) and a different icon for `crossing` (穿越道). Below zoom 16 the site SHALL NOT show these markers. While the layer is on, the site SHALL show a legend naming 自行車道, 自行車道（畫線）, 紅綠燈, and 穿越道 with their line or icon styles.

#### Scenario: Markers depend on zoom

- **WHEN** the layer is on
- **THEN** signal and crossing markers are visible at zoom 16 and above and hidden below zoom 16

##### Example: zoom threshold

| Layer | Zoom | Signal and crossing markers |
| ----- | ---- | --------------------------- |
| on | 15 | hidden |
| on | 16 | shown |
| on | 18 | shown |
| off | 18 | hidden |

#### Scenario: Legend is shown with the layer

- **WHEN** the user turns on `都市自行車道`
- **THEN** a legend with the four entries appears, and it disappears when the layer is turned off
