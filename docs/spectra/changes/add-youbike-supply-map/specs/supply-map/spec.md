## Purpose

The browser map that lets a YouBike rider pick a station in Taipei City or New Taipei City and see which supply shops are nearby, then hand off to Google Maps for walking directions. It runs entirely in the browser from the static datasets produced by the `supply-data` capability.

## ADDED Requirements

### Requirement: Map shows all stations

The site SHALL load `data/stations.json` and `data/shops.json` relative to the site base path, render an OpenStreetMap tile layer centered on Taipei, and show every station as a clustered marker. The user interface text SHALL be Traditional Chinese.

#### Scenario: Stations appear on load

- **WHEN** the user opens the site
- **THEN** station markers (clustered at low zoom) cover both Taipei City and New Taipei City, and the OpenStreetMap attribution is visible

#### Scenario: Data fails to load

- **WHEN** either data file returns a non-200 response
- **THEN** the site shows the message `資料載入失敗，請重新整理` and does not show an empty map without explanation

### Requirement: Selecting a station lists nearby shops

When the user selects a station marker, the site SHALL highlight that station and list every shop whose straight-line (haversine) distance from the station is less than or equal to the selected radius, sorted by ascending distance. Each list item SHALL show the shop name (or the category label when `name` is `null`), the category label, and the distance rounded to the nearest 10 meters. Shops in the list SHALL also be shown as markers on the map, colored by category. The radius options SHALL be 300 m, 500 m, and 1000 m, with 500 m selected by default. The distance label SHALL state that it is straight-line distance.

#### Scenario: Shops within radius sorted by distance

- **WHEN** a station is selected with the 500 m radius
- **THEN** only shops within 500 m appear, nearest first

##### Example: radius filter and ordering

- **GIVEN** station S at (25.0330, 121.5654) and shops A at 120 m, B at 480 m, C at 510 m, D at 300 m from S
- **WHEN** the user selects S with radius 500 m
- **THEN** the list is A (120 m), D (300 m), B (480 m); C is not listed

#### Scenario: Changing the radius updates the list

- **WHEN** a station is selected and the user switches the radius from 500 m to 1000 m
- **THEN** the list and shop markers update without reselecting the station

#### Scenario: No shops within radius

- **WHEN** the selected station has no shop within the selected radius
- **THEN** the list shows `這個範圍內沒有店家，試試擴大範圍`

### Requirement: Category filter

The site SHALL provide one toggle per category — 便利商店 (convenience), 超市 (supermarket), 量販店 (hypermarket), 雜貨店 (grocery) — all enabled by default. Disabled categories SHALL be removed from both the list and the shop markers.

#### Scenario: Hide convenience stores

- **WHEN** a station is selected and the user turns off 便利商店
- **THEN** no convenience-category shop appears in the list or on the map, and other categories are unchanged

### Requirement: Google Maps walking directions link

Each listed shop SHALL provide a link that opens Google Maps walking directions in a new tab, using the URL `https://www.google.com/maps/dir/?api=1&origin=<station lat>,<station lng>&destination=<shop lat>,<shop lng>&travelmode=walking`. The site SHALL NOT compute or draw routes itself.

#### Scenario: Directions link targets the selected station and shop

- **WHEN** the user activates the directions link for a shop
- **THEN** a new tab opens Google Maps with origin at the selected station and destination at that shop in walking mode

##### Example: generated URL

- **GIVEN** station at (25.02605, 121.5436) and shop at (25.0271, 121.5442)
- **WHEN** the link is generated
- **THEN** the URL is `https://www.google.com/maps/dir/?api=1&origin=25.02605,121.5436&destination=25.0271,121.5442&travelmode=walking`

### Requirement: Usable on phone screens

The layout SHALL remain usable at a 375 px viewport width: the map and the shop list SHALL both be reachable without horizontal scrolling, and radius and category controls SHALL be operable by touch.

#### Scenario: Phone width layout

- **WHEN** the site is viewed at 375 px wide and a station is selected
- **THEN** the shop list is visible below or over the map without horizontal page scrolling

### Requirement: Data freshness notice

The site SHALL display the data generation date from `data/meta.json` and credit OpenStreetMap contributors and the Taipei City and New Taipei City open-data sources.

#### Scenario: Freshness date shown

- **WHEN** `meta.json` has `generatedAt` `2026-09-25T08:00:00Z`
- **THEN** the page shows the data date as 2026-09-25
