## ADDED Requirements

### Requirement: Loop route switches

When route data has loaded and contains at least one route with `optional: true`, the controls SHALL show a group labelled `環線` with one switch per optional route, labelled with the route `name`, in `routes.json` order, all off when the page opens. Any number of these switches SHALL be on at the same time. Turning a switch on SHALL draw that route's lines in the link route color with the same name popup as other link lines, SHALL mark every entry of that route's `vending` array with the vending icon while the 自動販賣機 category toggle is on, and SHALL fit the map view to that route's lines. Turning a switch off SHALL remove that route's lines and vending icons and SHALL NOT move the map. When route data is loading or failed to load, or has no optional route, the `環線` group SHALL NOT be shown.

#### Scenario: Loops are off at first

- **WHEN** the user opens the site with the 2026-10-24 routes.json
- **THEN** the `環線` group lists `環騎臺北替代道路（深南路-南深路段）`, `環騎臺北替代道路（市民大道-莊敬隧道段）`, `環騎臺北替代道路（研究院路-莊敬隧道段）`, and `北臺濱海環線（環島1-1）`, every switch is off, and clicking a point on the `北臺濱海環線（環島1-1）` line opens no popup

#### Scenario: Turning a loop on and off

- **WHEN** the user turns the `北臺濱海環線（環島1-1）` switch on, clicks its line, then turns the switch off
- **THEN** after turning it on the map view contains the whole route and its vending icon is shown, clicking the line shows `北臺濱海環線（環島1-1）`, and after turning it off the line and its vending icon are gone and the map view is unchanged

#### Scenario: Loop vending follows the category toggle

- **WHEN** a loop switch is on and the user turns the 自動販賣機 category toggle off, then on
- **THEN** that loop's vending icons disappear while the toggle is off and reappear when it is on, and the loop line stays drawn

#### Scenario: No loop group without route data

- **WHEN** `data/routes.json` returns HTTP 404
- **THEN** no `環線` group is shown

## MODIFIED Requirements

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
