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
- **THEN** the `環線` group lists `環騎臺北替代道路（深南路-南深路段）`, `環騎臺北替代道路（市民大道-莊敬隧道段）`, `環騎臺北替代道路（研究院路-莊敬隧道段）`, `北臺濱海環線（環島1-1）`, `北海岸漫遊`, `單車淡蘭極東2日遊`, `舊草嶺環線`, and `淡水河金色水岸`, every switch is off, and clicking a point on the `北臺濱海環線（環島1-1）` line opens no popup

#### Scenario: Turning a loop on and off

- **WHEN** the user turns the `北臺濱海環線（環島1-1）` switch on, clicks its line, then turns the switch off
- **THEN** after turning it on the map view contains the whole route and its vending icon is shown, clicking the line shows `北臺濱海環線（環島1-1）`, and after turning it off the line and its vending icon are gone and the map view is unchanged

#### Scenario: A shown loop is highlighted above other lines

- **WHEN** the user turns the `淡水河金色水岸` switch on, and the map shows a point of its line that also lies on a riverside route line
- **THEN** the pixel at that point has the highlight color, not the riverside color

#### Scenario: Loop vending follows the category toggle

- **WHEN** a loop switch is on and the user turns the 自動販賣機 category toggle off, then on
- **THEN** that loop's vending icons disappear while the toggle is off and reappear when it is on, and the loop line stays drawn

#### Scenario: No loop group without route data

- **WHEN** `data/routes.json` returns HTTP 404
- **THEN** no `環線` group is shown

## ADDED Requirements

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
