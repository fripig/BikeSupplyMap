## ADDED Requirements

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
  - `北臺濱海環線（環島1-1）`
  - `北海岸漫遊`
  - `單車淡蘭極東2日遊`
  - `舊草嶺環線`
  - `淡水河金色水岸`
- **AND** every switch is off

#### Scenario: Turning a tour on

- **WHEN** the user turns the `淡水河金色水岸` switch on and clicks its line
- **THEN** the map view contains the whole route, and the popup shows `淡水河金色水岸`

#### Scenario: Source credit

- **WHEN** the page has loaded
- **THEN** the credits footer contains `推薦遊程路線來源：交通部自行車旅遊網`, with a link to `https://taiwanbike.tw/bikeRoute/tour`
