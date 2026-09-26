## MODIFIED Requirements

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
