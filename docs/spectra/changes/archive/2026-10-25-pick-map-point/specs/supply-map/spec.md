## ADDED Requirements

### Requirement: Selecting a map point lists nearby shops

When the user clicks or taps a blank spot on the map, the site SHALL select that point and treat it like a selected station. A blank spot is one not on a station marker, cluster, icon, shop or vending dot, route-stop marker, interactive route line, or the legend. The point's coordinates SHALL be rounded to 5 decimals.
- **Shops.** The side panel SHALL list shops within the selected radius of the point under the same rules, filters and empty-state messages as a selected station. The map SHALL draw the radius circle and the shop markers, and fit the map to the circle.
- **Panel header.** The side panel SHALL show the heading `地圖上選的地點` and the meta line `附近 N 家`, where N is the number of listed shops.
- **Nearest station.** Next SHALL come a line `最近的 YouBike：<station name>（<distance>）` for the nearest station within 2 km. Riverside and urban stations both count. The distance is rounded to the nearest 10 meters as in the shop list, and the line ends with a `選這個站` button that selects that station. When no station is within 2 km, the line SHALL read `2 km 內沒有 YouBike 站`.
- **Marker.** The map SHALL mark the point with a marker distinct from the selected-station icon.
- **Replacing a selection.** Selecting a station SHALL replace a selected point, and picking a point SHALL replace a selected station or an earlier point.
- **Clicks that do not pick.** A drag SHALL NOT pick a point. Nor SHALL a double-click (which zooms the map in), a click on the legend or on any interactive map feature, or a click that only closes an open popup.

#### Scenario: Clicking a blank spot lists shops near it

- **WHEN** the user clicks a blank spot on the map with the 500 m radius
- **THEN** the side panel shows `地圖上選的地點`, `附近 N 家`, the nearest station line, and the shops within 500 m of the clicked point, nearest first

##### Example: nearest station line

- **GIVEN** a picked point whose nearest station 景美國小 is 120 m away
- **WHEN** the panel is shown
- **THEN** it reads `最近的 YouBike：景美國小（120 m）` followed by a `選這個站` button

#### Scenario: Choosing the nearest station from a point

- **WHEN** a point is selected and the user activates `選這個站`
- **THEN** that station becomes the selection, and the panel shows its name and the shops near it

#### Scenario: No station within 2 km

- **WHEN** the picked point has no station within 2 km
- **THEN** the nearest station line reads `2 km 內沒有 YouBike 站`

#### Scenario: Clicks that do not pick a point

- **WHEN** a station is selected and the user clicks the legend, clicks a route-side vending dot, clicks the map only to close an open popup, or double-clicks a blank spot
- **THEN** the selected station stays selected, and the double-click zooms the map in one level

## MODIFIED Requirements

### Requirement: Google Maps walking directions link

Each listed shop SHALL provide a link that opens Google Maps walking directions in a new tab, using the URL `https://www.google.com/maps/dir/?api=1&origin=<origin lat>,<origin lng>&destination=<shop lat>,<shop lng>&travelmode=walking`. The origin SHALL be the selected station, or the selected map point when a point is selected. The site SHALL NOT compute or draw routes itself.

#### Scenario: Directions link targets the selected station and shop

- **WHEN** the user activates the directions link for a shop
- **THEN** a new tab opens Google Maps with origin at the selected station and destination at that shop in walking mode

#### Scenario: Directions link starts from a selected map point

- **WHEN** a map point is selected and the user activates the directions link for a shop
- **THEN** a new tab opens Google Maps with origin at the point's rounded coordinates and destination at that shop in walking mode

##### Example: generated URL

- **GIVEN** station at (25.02605, 121.5436) and shop at (25.0271, 121.5442)
- **WHEN** the link is generated
- **THEN** the URL is `https://www.google.com/maps/dir/?api=1&origin=25.02605,121.5436&destination=25.0271,121.5442&travelmode=walking`

### Requirement: Google Maps location link

The popup of every toilet, shower, rain shelter, and route-side vending icon SHALL show, below its existing text, a link labelled `在 Google 地圖開啟`. The side panel SHALL show the same link under the selected station's name, or under the `地圖上選的地點` heading when a map point is selected. Each link SHALL open in a new tab the URL `https://www.google.com/maps/search/?api=1&query=<lat>,<lng>`. The URL SHALL be built from that icon's or station's coordinates exactly as they appear in the data, or from the point's rounded coordinates. The link SHALL NOT request directions. The popup text before the link and the icon titles SHALL stay as specified in the cycling-layer, rain-shelter-layer, and toilet-shower-layers capabilities.

#### Scenario: Facility popup links to its place

- **WHEN** the user selects a toilet icon at (25.07023, 121.50849)
- **THEN** the popup shows the toilet text followed by `在 Google 地圖開啟`, linking to `https://www.google.com/maps/search/?api=1&query=25.07023,121.50849` in a new tab

#### Scenario: Selected station links to its place

- **WHEN** the user selects a station
- **THEN** the side panel shows `在 Google 地圖開啟` under the station name, linking to that station's coordinates in a new tab, and selecting another station updates the link

#### Scenario: Selected map point links to its place

- **WHEN** the user picks a map point
- **THEN** the side panel shows `在 Google 地圖開啟` under `地圖上選的地點`, linking to the point's rounded coordinates in a new tab

##### Example: generated URL

| Place | lat | lng | URL |
| ----- | --- | --- | --- |
| toilet | 25.07023 | 121.50849 | `https://www.google.com/maps/search/?api=1&query=25.07023,121.50849` |
| station | 25.02605 | 121.5436 | `https://www.google.com/maps/search/?api=1&query=25.02605,121.5436` |
