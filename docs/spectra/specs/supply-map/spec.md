# supply-map Specification

## Purpose

The browser map that lets a YouBike rider pick a station in Taipei City or New Taipei City and see which supply shops are nearby, then hand off to Google Maps for walking directions. It runs entirely in the browser from the static datasets produced by the `supply-data` capability.

## Requirements

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

---
### Requirement: Category filter

The site SHALL provide one toggle per category — 便利商店 (convenience), 超市 (supermarket), 量販店 (hypermarket), 雜貨店 (grocery), 自動販賣機 (vending) — all enabled by default. Disabled categories SHALL be removed from both the list and the shop markers. Turning 自動販賣機 off SHALL also hide the route-side vending icons and the 自動販賣機 legend entry, as specified in the cycling-layer capability.

#### Scenario: Hide convenience stores

- **WHEN** a station is selected and the user turns off 便利商店
- **THEN** no convenience-category shop appears in the list or on the map, and other categories are unchanged

#### Scenario: Vending machines listed like shops

- **WHEN** a station has a vending machine without a name 120 m away and the 自動販賣機 toggle is on
- **THEN** the list shows an item labelled 自動販賣機 at 120 m with its category label and a walking directions link, and turning 自動販賣機 off removes it from the list and removes the route-side vending icons from the map

#### Scenario: All categories turned off

- **WHEN** a station is selected and the user turns off all five categories
- **THEN** the list shows `請至少選擇一種店家類型` instead of the empty-range message, and no shop marker is shown

---
### Requirement: Google Maps walking directions link

Each listed shop SHALL provide a link that opens Google Maps walking directions in a new tab, using the URL `https://www.google.com/maps/dir/?api=1&origin=<station lat>,<station lng>&destination=<shop lat>,<shop lng>&travelmode=walking`. The site SHALL NOT compute or draw routes itself.

#### Scenario: Directions link targets the selected station and shop

- **WHEN** the user activates the directions link for a shop
- **THEN** a new tab opens Google Maps with origin at the selected station and destination at that shop in walking mode

##### Example: generated URL

- **GIVEN** station at (25.02605, 121.5436) and shop at (25.0271, 121.5442)
- **WHEN** the link is generated
- **THEN** the URL is `https://www.google.com/maps/dir/?api=1&origin=25.02605,121.5436&destination=25.0271,121.5442&travelmode=walking`

---
### Requirement: Usable on phone screens

The layout SHALL remain usable at a 375 px viewport width: the map and the shop list SHALL both be reachable without horizontal scrolling, and radius and category controls SHALL be operable by touch.

#### Scenario: Phone width layout

- **WHEN** the site is viewed at 375 px wide and a station is selected
- **THEN** the shop list is visible below or over the map without horizontal page scrolling

---
### Requirement: Data freshness notice

The site SHALL display the data generation date from `data/meta.json` and credit OpenStreetMap contributors and the Taipei City and New Taipei City open-data sources.

#### Scenario: Freshness date shown

- **WHEN** `meta.json` has `generatedAt` `2026-09-25T08:00:00Z`
- **THEN** the page shows the data date as 2026-09-25

---
### Requirement: Map shows riverside stations by default

The site SHALL load `data/stations.json` and `data/shops.json` relative to the site base path and render the Esri World Light Gray Canvas base map with its reference (label) layer, crediting Esri and OpenStreetMap contributors in the map attribution. The site SHALL provide two independent switches operable by touch: `河濱站點`, on by default, and `市區站點`, off by default. While `河濱站點` is on, the site SHALL show every station whose `riverside` field is `true` as a clustered marker; while `市區站點` is on, the site SHALL show every station whose `riverside` field is `false` as a clustered marker. Station markers of both kinds SHALL use the same icon, a round marker showing a bicycle, and station clusters of both kinds SHALL use the same round style showing the station count; the kinds are told apart only by the switches. The selected station SHALL be drawn as a larger round marker showing the same bicycle, in a darker color. A switch that is off SHALL remove every marker of its kind, and neither switch SHALL change the other kind's markers. On load the site SHALL fit the initial map view to the bounds of the riverside stations. Turning either switch on or off SHALL NOT clear the selected station, its highlight, its shop list, or its shop markers. The user interface text SHALL be Traditional Chinese.

#### Scenario: Only riverside stations appear on load

- **WHEN** the user opens the site
- **THEN** only stations with `riverside: true` are shown (clustered at low zoom), the view frames those stations across both cities, the `河濱站點` switch is on, the `市區站點` switch is off, the base map is Esri World Light Gray, and the attribution names Esri and OpenStreetMap

##### Example: station visibility

| 河濱站點 | 市區站點 | Stations A, B (`riverside: true`) | Station C (`riverside: false`) |
| -------- | -------- | --------------------------------- | ------------------------------ |
| on | off | shown | hidden |
| on | on | shown | shown |
| off | on | hidden | shown |
| off | off | hidden | hidden |

#### Scenario: Switches add and remove station kinds

- **WHEN** the user turns on `市區站點`, then turns off `河濱站點`
- **THEN** non-riverside stations appear, and then every riverside station marker is removed while the non-riverside markers stay; turning `河濱站點` on again brings the riverside markers back

#### Scenario: Both kinds share one station style

- **WHEN** both switches are on and the user views a riverside station marker, a non-riverside station marker, a riverside cluster, and a non-riverside cluster
- **THEN** both station markers have the same size, colors, and bicycle icon, both clusters have the same size and colors, and neither cluster uses markercluster's default green, yellow, or orange cluster colors

#### Scenario: Selected station stands out

- **WHEN** the user selects a station
- **THEN** it is drawn larger than unselected station markers, in a darker color, with the same bicycle icon

#### Scenario: Selection survives the switches

- **WHEN** the user selects a riverside station and then turns off `河濱站點`
- **THEN** that station stays selected with its highlight, shop list, and shop markers, while the other riverside station markers are removed; the same holds for a non-riverside station and the `市區站點` switch

#### Scenario: Data fails to load

- **WHEN** either data file returns a non-200 response
- **THEN** the site shows the message `資料載入失敗，請重新整理` and does not show an empty map without explanation


<!-- @trace
source: unify-station-icons
updated: 2026-09-26
code:
  - nuxt.config.ts
  - README.md
  - app/components/SupplyMap.client.vue
  - e2e/helpers.ts
tests:
  - e2e/map.spec.ts
-->

---
### Requirement: Google Maps location link

The popup of every toilet, shower, rain shelter, and route-side vending icon SHALL show, below its existing text, a link labelled `在 Google 地圖開啟`, and the side panel SHALL show the same link under the selected station's name. Each link SHALL open in a new tab the URL `https://www.google.com/maps/search/?api=1&query=<lat>,<lng>` built from that icon's or station's coordinates exactly as they appear in the data, and SHALL NOT request directions. The popup text before the link and the icon titles SHALL stay as specified in the cycling-layer, rain-shelter-layer, and toilet-shower-layers capabilities.

#### Scenario: Facility popup links to its place

- **WHEN** the user selects a toilet icon at (25.07023, 121.50849)
- **THEN** the popup shows the toilet text followed by `在 Google 地圖開啟`, linking to `https://www.google.com/maps/search/?api=1&query=25.07023,121.50849` in a new tab

#### Scenario: Selected station links to its place

- **WHEN** the user selects a station
- **THEN** the side panel shows `在 Google 地圖開啟` under the station name, linking to that station's coordinates in a new tab, and selecting another station updates the link

##### Example: generated URL

| Place | lat | lng | URL |
| ----- | --- | --- | --- |
| toilet | 25.07023 | 121.50849 | `https://www.google.com/maps/search/?api=1&query=25.07023,121.50849` |
| station | 25.02605 | 121.5436 | `https://www.google.com/maps/search/?api=1&query=25.02605,121.5436` |

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