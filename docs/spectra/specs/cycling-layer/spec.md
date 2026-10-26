# cycling-layer Specification

## Purpose

An optional map overlay showing the urban bike-path network of Taipei City and New Taipei City, with traffic signals and crossings along it, so riders can plan the city-street leg between riverside paths, stations, and shops. It reads the static `cycling.json` produced by the `supply-data` capability.

## Requirements

### Requirement: Urban bike-path layer toggle

The site SHALL provide a toggle labelled `都市自行車道`, on by default and operable by touch. The toggle SHALL be independent of the `河濱站點` and `市區站點` switches and SHALL NOT change the station markers, the selected station, or its shop list. The site SHALL request `data/cycling.json` on page load while the toggle is on; if the user turns the toggle off before a load has succeeded, the next turn-on SHALL request it. After a successful load, turning the toggle off and on again SHALL NOT request the file again. If the request fails, the site SHALL show `自行車道資料載入失敗` next to the toggle, turn the toggle off, and leave the rest of the map working; turning it on again SHALL retry.

#### Scenario: Layer is on at load

- **WHEN** the user opens the site
- **THEN** the `都市自行車道` toggle is on, `data/cycling.json` is requested once, and urban bike paths are drawn when it arrives

#### Scenario: Load failure is contained

- **WHEN** the user opens the site and `data/cycling.json` returns HTTP 404
- **THEN** the message `自行車道資料載入失敗` appears, the toggle is off, and stations remain selectable

#### Scenario: No reload after success

- **WHEN** `data/cycling.json` loaded successfully and the user turns the toggle off and on
- **THEN** no further request for `data/cycling.json` is made


<!-- @trace
source: station-switches-and-map-links
updated: 2026-09-26
code:
  - app/components/SupplyMap.client.vue
  - e2e/helpers.ts
  - README.md
  - app/components/ShopList.vue
  - app/components/MapControls.vue
  - app/pages/index.vue
  - app/utils/links.ts
tests:
  - e2e/map.spec.ts
  - app/utils/links.test.ts
  - app/components/MapControls.test.ts
-->

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

While the `都市自行車道` toggle is on and the map zoom is 16 or greater, the site SHALL mark every point in `cycling.json` with an icon by kind: one icon for `signal` (紅綠燈) and a different icon for `crossing` (穿越道). Below zoom 16 the site SHALL NOT show these markers. The site SHALL show a legend naming 河濱自行車道, 橋梁自行車道, and 連接道路 while route data is loaded, 自動販賣機 while route data is loaded and the 自動販賣機 category toggle is on, 橋下躲雨點 and 涼亭躲雨點 while the 躲雨點 switch is on and shelter data is loaded, 廁所 while the 廁所 switch is on and facility data is loaded, 淋浴 while the 淋浴 switch is on and facility data is loaded, and additionally 自行車道, 自行車道（畫線）, 紅綠燈, and 穿越道 while the urban layer is on, each with its line or icon style, in that order.

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

- **WHEN** route data has loaded and the user turns the urban layer, the 躲雨點, 廁所 and 淋浴 switches, and the 自動販賣機 category toggle off and on
- **THEN** the legend always lists 河濱自行車道, 橋梁自行車道, and 連接道路, lists 自動販賣機 only while the 自動販賣機 toggle is on, lists 橋下躲雨點 and 涼亭躲雨點 only while the 躲雨點 switch is on, lists 廁所 only while the 廁所 switch is on, lists 淋浴 only while the 淋浴 switch is on, and lists the four urban entries only while the urban layer is on

##### Example: legend entries

| Route data | 自動販賣機 | 躲雨點 | 廁所 | 淋浴 | Urban layer | Legend |
| ---------- | ---------- | ------ | ---- | ---- | ----------- | ------ |
| loaded | on | off | off | off | on | 河濱自行車道, 橋梁自行車道, 連接道路, 自動販賣機, 自行車道, 自行車道（畫線）, 紅綠燈, 穿越道 |
| loaded | on | on | on | on | on | 河濱自行車道, 橋梁自行車道, 連接道路, 自動販賣機, 橋下躲雨點, 涼亭躲雨點, 廁所, 淋浴, 自行車道, 自行車道（畫線）, 紅綠燈, 穿越道 |
| loaded | on | off | off | off | off | 河濱自行車道, 橋梁自行車道, 連接道路, 自動販賣機 |
| loaded | off | on | off | off | off | 河濱自行車道, 橋梁自行車道, 連接道路, 橋下躲雨點, 涼亭躲雨點 |
| loaded | off | off | on | off | off | 河濱自行車道, 橋梁自行車道, 連接道路, 廁所 |
| loaded | off | off | off | on | off | 河濱自行車道, 橋梁自行車道, 連接道路, 淋浴 |
| loaded | off | off | off | off | off | 河濱自行車道, 橋梁自行車道, 連接道路 |
| not loaded | on | off | off | off | on | 自行車道, 自行車道（畫線）, 紅綠燈, 穿越道 |
| not loaded | on | on | off | off | off | 橋下躲雨點, 涼亭躲雨點 |
| not loaded | on | off | on | on | off | 廁所, 淋浴 |
| not loaded | on | off | off | off | off | (no legend) |


<!-- @trace
source: add-toilet-shower-layers
updated: 2026-09-26
code:
  - public/data/facilities.json
  - app/components/SupplyMap.client.vue
  - public/data/routes.json
  - public/data/shops.json
  - README.md
  - app/components/MapControls.vue
  - scripts/lib/shelters.js
  - scripts/lib/check-counts.js
  - scripts/fetch-data.js
  - public/data/meta.json
  - scripts/lib/facilities.js
  - app/utils/cycling.ts
  - app/pages/index.vue
  - app/utils/load-data.ts
tests:
  - app/components/MapControls.test.ts
  - e2e/map.spec.ts
  - scripts/lib/check-counts.test.js
  - scripts/fetch-data.test.js
  - scripts/lib/facilities.test.js
  - app/utils/cycling.test.ts
-->

---
### Requirement: Riverside and bridge routes are drawn

On page load the site SHALL request `data/routes.json` and draw every route in it that has no `optional` field at every zoom level, independent of the `都市自行車道` switch: riverside routes as thick lines in one color, bridge routes (including supplementary bridges) as thick lines in a second, distinct color, and link routes as thick lines in a third color distinct from both. Each line of a route SHALL be drawn as one continuous polyline. Selecting a bridge route line or a link route line SHALL show that route's `name`. Routes with `optional: true` SHALL NOT be drawn on load; they follow the loop route switches. The site SHALL also mark every entry of the top-level `routes.json` `vending` array with a vending icon at every zoom level while routes are drawn and the 自動販賣機 category toggle is on. Turning the 自動販賣機 toggle off SHALL remove every vending icon, and turning it on again SHALL show them again, without reloading `routes.json` and without changing the route lines. Selecting a vending icon SHALL show its `name`, or 自動販賣機 when the name is `null`, followed by the type from its `vending` value (飲料 for `drinks` or `beverages`, 飲水 for `water`, 咖啡 for `coffee`, 食物 for any other listed food value), and no type when `vending` is `null`. Route lines and vending icons SHALL NOT intercept clicks on station markers. If `data/routes.json` cannot be loaded, the site SHALL show `自行車道資料載入失敗` in the controls and leave stations, shops, and the urban layer working.

#### Scenario: Routes appear on load

- **WHEN** the user opens the site
- **THEN** riverside, bridge, and non-optional link routes are drawn in their three colors, and the top-level route-side vending machines are marked, without any switch being turned on (the 自動販賣機 toggle is on by default), and no optional link route or its vending machines are drawn

#### Scenario: Vending icons follow the category toggle

- **WHEN** route data has loaded and the user turns the 自動販賣機 category toggle off, then on
- **THEN** every route-side vending icon disappears while the toggle is off and reappears when it is turned on, and the riverside, bridge, and link route lines stay drawn throughout

#### Scenario: Bridge name on selection

- **WHEN** the user selects the line of the route named `華江橋自行車道`
- **THEN** the name `華江橋自行車道` is shown next to the line

#### Scenario: Supplementary bridge on the map

- **WHEN** the user selects the 重陽橋 main span line
- **THEN** the name `重陽橋（人行道）` is shown

#### Scenario: Link name on selection

- **WHEN** the user selects a line of the route named `環騎臺北（連接道路）`, such as the one along 研究院路
- **THEN** the name `環騎臺北（連接道路）` is shown next to the line

#### Scenario: Vending details on selection

- **WHEN** the user selects route-side vending machines with the data below
- **THEN** the text shown is as listed

##### Example: vending popup text

| name | vending | Shown |
| ---- | ------- | ----- |
| `null` | `drinks` | 自動販賣機 · 飲料 |
| `黑松販賣機` | `coffee;food` | 黑松販賣機 · 咖啡、食物 |
| `null` | `null` | 自動販賣機 |

#### Scenario: Route data failure is contained

- **WHEN** `data/routes.json` returns HTTP 404
- **THEN** the message `自行車道資料載入失敗` appears in the controls, no route line or vending icon is drawn, and stations remain selectable


<!-- @trace
source: make-loop-routes-selectable
updated: 2026-10-24
code:
  - app/components/SupplyMap.client.vue
  - scripts/lib/routes.js
  - public/data/routes.json
  - app/pages/index.vue
  - README.md
  - app/utils/load-data.ts
  - app/components/MapControls.vue
  - public/data/meta.json
  - scripts/fetch-data.js
  - scripts/lib/loop-routes.js
tests:
  - scripts/fetch-data.test.js
  - e2e/map.spec.ts
  - app/components/MapControls.test.ts
  - scripts/lib/routes.test.js
-->

---
### Requirement: Loop route switches

When route data has loaded and contains at least one route with `optional: true`, the controls SHALL show a group labelled `環線`:

- one switch per optional route, labelled with the route `name`, in `routes.json` order;
- every switch off when the page opens;
- any number of switches on at the same time.

**Turning a switch on** SHALL:

- draw that route's lines in a highlight color that no other route or urban line uses, each with a white casing wider than the line;
- draw those lines above every riverside, bridge, link and urban bike-path line, with the same name popup as other link lines;
- mark every entry of that route's `vending` array with the vending icon while the 自動販賣機 category toggle is on, with vending icons drawn above the highlighted lines;
- fit the map view to that route's lines.

**Turning a switch off** SHALL remove that route's lines and vending icons and SHALL NOT move the map.

When route data is loading or failed to load, or has no optional route, the `環線` group SHALL NOT be shown.

#### Scenario: Loops are off at first

- **WHEN** the user opens the site with the 2026-10-24 routes.json
- **THEN** the `環線` group lists `環騎臺北替代道路（深南路-南深路段）`, `環騎臺北替代道路（市民大道-莊敬隧道段）`, `環騎臺北替代道路（研究院路-莊敬隧道段）`, `北海岸漫遊`, `舊草嶺環線`, and `淡水河金色水岸`, every switch is off, and clicking a point on the `環騎臺北替代道路（市民大道-莊敬隧道段）` line opens no popup

#### Scenario: Turning a loop on and off

- **WHEN** the user turns the `環騎臺北替代道路（市民大道-莊敬隧道段）` switch on, clicks its line, then turns the switch off
- **THEN** after turning it on the map view contains the whole route and its vending icons are shown, clicking the line shows `環騎臺北替代道路（市民大道-莊敬隧道段）`, and after turning it off the line and its vending icons are gone and the map view is unchanged

#### Scenario: A shown loop is highlighted above other lines

- **WHEN** the user turns the `淡水河金色水岸` switch on, and the map shows a point of its line that also lies on a riverside route line
- **THEN** the pixel at that point has the highlight color, not the riverside color

#### Scenario: Loop vending follows the category toggle

- **WHEN** a loop switch is on and the user turns the 自動販賣機 category toggle off, then on
- **THEN** that loop's vending icons disappear while the toggle is off and reappear when it is on, and the loop line stays drawn

#### Scenario: No loop group without route data

- **WHEN** `data/routes.json` returns HTTP 404
- **THEN** no `環線` group is shown


<!-- @trace
source: remove-coast-and-danlan-loops
updated: 2026-10-24
code:
  - scripts/lib/tour-routes.js
  - README.md
  - public/data/routes.json
  - scripts/lib/loop-routes.js
  - CLAUDE.md
tests:
  - e2e/map.spec.ts
  - app/components/MapControls.test.ts
  - scripts/lib/tour-routes.test.js
  - scripts/lib/routes.test.js
  - scripts/fetch-data.test.js
-->

---
### Requirement: Recommended tour routes in the loop group

The tour routes of the supply-data Tour route dataset are optional link routes. The `環線` group SHALL therefore list them after the OSM loop routes, in `routes.json` order, with the same switch behaviour as the other loop route switches:

- every switch is off when the page opens;
- turning a switch on draws the route, marks its vending machines, and fits the map to it;
- turning a switch off removes them without moving the map.

Whenever the page is shown, its credits footer SHALL contain the text `推薦遊程路線來源：交通部自行車旅遊網`. In that text, `交通部自行車旅遊網` SHALL be a link to `https://taiwanbike.tw/bikeRoute/tour`.

#### Scenario: Tours follow the OSM loops

- **WHEN** route data has loaded
- **THEN** the `環線` group lists, in order:
  - `環騎臺北替代道路（深南路-南深路段）`
  - `環騎臺北替代道路（市民大道-莊敬隧道段）`
  - `環騎臺北替代道路（研究院路-莊敬隧道段）`
  - `北海岸漫遊`
  - `舊草嶺環線`
  - `淡水河金色水岸`
- **AND** every switch is off

#### Scenario: Turning a tour on

- **WHEN** the user turns the `淡水河金色水岸` switch on and clicks its line
- **THEN** the map view contains the whole route, and the popup shows `淡水河金色水岸`

#### Scenario: Source credit

- **WHEN** the page has loaded
- **THEN** the credits footer contains `推薦遊程路線來源：交通部自行車旅遊網`, with a link to `https://taiwanbike.tw/bikeRoute/tour`


<!-- @trace
source: remove-coast-and-danlan-loops
updated: 2026-10-24
code:
  - scripts/lib/tour-routes.js
  - README.md
  - public/data/routes.json
  - scripts/lib/loop-routes.js
  - CLAUDE.md
tests:
  - e2e/map.spec.ts
  - app/components/MapControls.test.ts
  - scripts/lib/tour-routes.test.js
  - scripts/lib/routes.test.js
  - scripts/fetch-data.test.js
-->

---
### Requirement: Route stop markers

While an optional route's switch is on, the site SHALL mark each entry of that route's `stops` array with a stop marker, and SHALL remove those markers when the switch is turned off.

**Markers.** Each marker shows a glyph and has a label:

| Stop | Glyph | Label |
| ---- | ----- | ----- |
| `start` | 起 | `起點：<name>` |
| `via` | 經 | `分段點：<name>` |
| `end` | 終 | `終點：<name>` |
| `tip` | 端 | `端點` |

A `start` stop and an `end` stop of the same route within 50 meters of each other SHALL share one marker at the start position. That marker has glyph 起終 and label `起點：<start name>／終點：<end name>`. Stop markers SHALL be drawn above station markers.

**Popup.** Selecting a stop marker SHALL open a popup showing:

1. its label;
2. then either:
   - `最近的 YouBike：<station name>（<distance>）` for the YouBike station closest to the marker among all stations, with a `選這個站` button, when that station is within 2 kilometers; or
   - `2 km 內沒有 YouBike 站` when no station is within 2 kilometers;
3. then a 在 Google 地圖開啟 link showing the marker position in Google Maps.

The distance is formatted like shop distances. Pressing `選這個站` SHALL select that station, exactly as selecting its station marker does, and SHALL close the popup.

#### Scenario: Tour start marker

- **WHEN** the user turns the `淡水河金色水岸` switch on
- **THEN** a marker labelled `起點：臺北府城北門` and one labelled `終點：捷運紅樹林車站` are shown

#### Scenario: Selecting the nearest station from a stop

- **WHEN** the user turns the `淡水河金色水岸` switch on, opens the `起點：臺北府城北門` marker, and presses `選這個站`
- **THEN** the popup listed the station nearest that point with its distance and a Google Maps link for the stop, and after pressing the button that station is the selected station

#### Scenario: Stop markers follow the switch

- **WHEN** the user turns the `淡水河金色水岸` switch on and then off
- **THEN** its stop markers are shown while it is on and gone after it is off

#### Scenario: Marker merging and labels

- **WHEN** a route's stops are as below
- **THEN** its markers are as listed

##### Example: stop markers

| Stops | Markers |
| ----- | ------- |
| start 福隆車站, end 福隆遊客中心 8 m away | one marker 起終 `起點：福隆車站／終點：福隆遊客中心` |
| start 松山車站, via 白沙灣, end 基隆車站 | 起 `起點：松山車站`, 經 `分段點：白沙灣`, 終 `終點：基隆車站` |
| two `tip` stops 3 km apart | two markers 端 `端點` |

<!-- @trace
source: highlight-shown-loops
updated: 2026-10-24
code:
  - CLAUDE.md
-->