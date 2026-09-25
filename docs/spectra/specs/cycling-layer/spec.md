# cycling-layer Specification

## Purpose

An optional map overlay showing the urban bike-path network of Taipei City and New Taipei City, with traffic signals and crossings along it, so riders can plan the city-street leg between riverside paths, stations, and shops. It reads the static `cycling.json` produced by the `supply-data` capability.

## Requirements

### Requirement: Urban bike-path layer toggle

The site SHALL provide a toggle labelled `都市自行車道`, on by default and operable by touch. The toggle SHALL be independent of the `顯示市區站點` toggle and SHALL NOT change the station markers, the selected station, or its shop list. The site SHALL request `data/cycling.json` on page load while the toggle is on; if the user turns the toggle off before a load has succeeded, the next turn-on SHALL request it. After a successful load, turning the toggle off and on again SHALL NOT request the file again. If the request fails, the site SHALL show `自行車道資料載入失敗` next to the toggle, turn the toggle off, and leave the rest of the map working; turning it on again SHALL retry.

#### Scenario: Layer is on at load

- **WHEN** the user opens the site
- **THEN** the `都市自行車道` toggle is on, `data/cycling.json` is requested once, and urban bike paths are drawn when it arrives

#### Scenario: Load failure is contained

- **WHEN** the user opens the site and `data/cycling.json` returns HTTP 404
- **THEN** the message `自行車道資料載入失敗` appears, the toggle is off, and stations remain selectable

#### Scenario: No reload after success

- **WHEN** `data/cycling.json` loaded successfully and the user turns the toggle off and on
- **THEN** no further request for `data/cycling.json` is made

---
### Requirement: Urban bike paths are drawn

While the `都市自行車道` toggle is on, the site SHALL draw every path in `cycling.json` as one continuous line at every zoom level, with `cycleway` paths drawn as solid lines and `lane` paths drawn as dashed lines, thinner than riverside and bridge route lines. The lines SHALL NOT intercept clicks on station markers.

#### Scenario: Paths appear when enabled

- **WHEN** the `都市自行車道` toggle is on and `cycling.json` has loaded
- **THEN** solid lines appear for separate cycleways and dashed lines for painted lanes, and clicking a station marker on top of a line still selects the station

#### Scenario: Paths disappear when disabled

- **WHEN** the layer is on and the user turns it off
- **THEN** all urban bike-path lines and signal and crossing markers are removed, and riverside and bridge routes stay drawn

---
### Requirement: Traffic signals and crossings along urban paths

While the `都市自行車道` toggle is on and the map zoom is 16 or greater, the site SHALL mark every point in `cycling.json` with an icon by kind: one icon for `signal` (紅綠燈) and a different icon for `crossing` (穿越道). Below zoom 16 the site SHALL NOT show these markers. The site SHALL show a legend naming 河濱自行車道 and 橋梁自行車道 while route data is loaded, and additionally 自行車道, 自行車道（畫線）, 紅綠燈, and 穿越道 while the urban layer is on, each with its line or icon style.

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

#### Scenario: Legend follows the layers

- **WHEN** route data has loaded and the user turns the urban layer off and on
- **THEN** the legend always lists 河濱自行車道 and 橋梁自行車道, and lists the four urban entries only while the urban layer is on

---
### Requirement: Riverside and bridge routes are drawn

On page load the site SHALL request `data/routes.json` and draw every route in it at every zoom level, independent of the `都市自行車道` switch: riverside routes as thick lines in one color, and bridge routes as thick lines in a second, distinct color. Each line of a route SHALL be drawn as one continuous polyline. Selecting a bridge route line SHALL show that route's `name`. Route lines SHALL NOT intercept clicks on station markers. If `data/routes.json` cannot be loaded, the site SHALL show `自行車道資料載入失敗` in the controls and leave stations, shops, and the urban layer working.

#### Scenario: Routes appear on load

- **WHEN** the user opens the site
- **THEN** riverside routes and bridge routes are drawn in their two colors without any switch being turned on

#### Scenario: Bridge name on selection

- **WHEN** the user selects the line of the route named `華江橋自行車道`
- **THEN** the name `華江橋自行車道` is shown next to the line

#### Scenario: Route data failure is contained

- **WHEN** `data/routes.json` returns HTTP 404
- **THEN** the message `自行車道資料載入失敗` appears in the controls, no route line is drawn, and stations remain selectable
