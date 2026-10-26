## MODIFIED Requirements

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
