## Purpose

Lets riders on the riverside bike paths find nearby toilets and places to shower, each shown on demand as its own map layer with the details OSM records.

## ADDED Requirements

### Requirement: Toilet and shower switches

The controls SHALL show two switches labelled `廁所` and `淋浴`, both off when the page opens. The site SHALL NOT request `data/facilities.json` while neither switch has ever been on. Turning either switch on SHALL request `data/facilities.json` if it has not loaded yet; after a successful load, turning either switch on or off SHALL NOT request it again, and a request in progress SHALL be shared by both switches. If the request fails, the site SHALL show `廁所資料載入失敗` under the 廁所 switch or `淋浴資料載入失敗` under the 淋浴 switch for each switch that was on, turn that switch back off, and keep stations, shops, routes, and the other layers working; turning a switch on again SHALL retry the request and hide its message while retrying.

#### Scenario: Off at load

- **WHEN** the user opens the site
- **THEN** both switches are off, no toilet or shower icon is drawn, and `data/facilities.json` has not been requested

#### Scenario: One file for both switches

- **WHEN** the user turns 廁所 on, then 淋浴 on, then both off and on again, and the first request succeeds
- **THEN** `data/facilities.json` is requested exactly once

#### Scenario: Load failure is contained

- **WHEN** the user turns 廁所 on and `data/facilities.json` returns HTTP 404
- **THEN** `廁所資料載入失敗` appears under the 廁所 switch, the 廁所 switch is off, the 淋浴 switch is unchanged, and stations remain selectable

---
### Requirement: Toilet and shower icons

While the 廁所 switch is on and facility data is loaded, the site SHALL mark every entry of `toilets` with a rounded square icon showing `廁`; while the 淋浴 switch is on and facility data is loaded, it SHALL mark every entry of `showers` with a rounded square icon showing `浴`, in a color distinct from the toilet icon and the rain shelter icons. Turning a switch off SHALL remove only that switch's icons, without reloading. The icons SHALL be drawn below station markers so that a station marker at the same place stays selectable.

Selecting a toilet icon SHALL show its `name`, or `公廁` when `name` is `null`, followed by ` · ` and the applicable attributes joined with `、`, in this order: 無障礙 when `wheelchair` is `yes`, 部分無障礙 when `wheelchair` is `limited`, 尿布台 when `changing_table` is `yes`, 性別友善 when `unisex` is `yes`, 免費 when `fee` is `no`, 收費 when `fee` is `yes`; with no applicable attribute, only the name is shown. Selecting a shower icon SHALL show `<name> · 淋浴間（可能收費）` for `kind: "sports_centre"`; for `kind: "shower"` it SHALL show its `name`, or `淋浴間` when `name` is `null`, followed by ` · 免費` when `fee` is `no` or ` · 收費` when `fee` is `yes`.

#### Scenario: Icons follow their switch

- **WHEN** facility data has loaded, both switches are on, and the user turns 廁所 off
- **THEN** every toilet icon disappears and every shower icon stays

#### Scenario: Popup text

- **WHEN** the user selects icons with the data below
- **THEN** the text shown is as listed

##### Example: facility popup text

| Entry | Shown |
| ----- | ----- |
| toilet, `name: null`, `wheelchair: "yes"`, `changing_table: "yes"`, `fee: "no"` | 公廁 · 無障礙、尿布台、免費 |
| toilet, `name: "美堤公廁"`, `wheelchair: "limited"`, `unisex: "yes"` | 美堤公廁 · 部分無障礙、性別友善 |
| toilet, `name: null`, all attributes `null` | 公廁 |
| toilet, `name: null`, `wheelchair: "no"`, `fee: "yes"` | 公廁 · 收費 |
| shower, `kind: "sports_centre"`, `name: "萬華運動中心"` | 萬華運動中心 · 淋浴間（可能收費） |
| shower, `kind: "shower"`, `name: null`, `fee: "no"` | 淋浴間 · 免費 |
| shower, `kind: "shower"`, `name: null`, `fee: null` | 淋浴間 |
