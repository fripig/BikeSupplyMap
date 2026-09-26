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

On page load the site SHALL request `data/routes.json` and draw every route in it at every zoom level, independent of the `都市自行車道` switch: riverside routes as thick lines in one color, bridge routes (including supplementary bridges) as thick lines in a second, distinct color, and link routes as thick lines in a third color distinct from both. Each line of a route SHALL be drawn as one continuous polyline. Selecting a bridge route line or a link route line SHALL show that route's `name`. The site SHALL also mark every entry of the `routes.json` `vending` array with a vending icon at every zoom level while routes are drawn and the 自動販賣機 category toggle is on. Turning the 自動販賣機 toggle off SHALL remove every vending icon, and turning it on again SHALL show them again, without reloading `routes.json` and without changing the route lines. Selecting a vending icon SHALL show its `name`, or 自動販賣機 when the name is `null`, followed by the type from its `vending` value (飲料 for `drinks` or `beverages`, 飲水 for `water`, 咖啡 for `coffee`, 食物 for any other listed food value), and no type when `vending` is `null`. Route lines and vending icons SHALL NOT intercept clicks on station markers. If `data/routes.json` cannot be loaded, the site SHALL show `自行車道資料載入失敗` in the controls and leave stations, shops, and the urban layer working.

#### Scenario: Routes appear on load

- **WHEN** the user opens the site
- **THEN** riverside, bridge, and link routes are drawn in their three colors, and route-side vending machines are marked, without any switch being turned on (the 自動販賣機 toggle is on by default)

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
source: add-loop-link-route
updated: 2026-09-25
code:
  - app/utils/load-data.ts
  - app/utils/cycling.ts
  - public/data/meta.json
  - public/data/routes.json
  - app/components/SupplyMap.client.vue
  - scripts/fetch-data.js
  - scripts/lib/loop-routes.js
  - scripts/lib/routes.js
tests:
  - app/utils/cycling.test.ts
  - e2e/map.spec.ts
  - scripts/fetch-data.test.js
  - scripts/lib/routes.test.js
-->