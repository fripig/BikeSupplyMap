## MODIFIED Requirements

### Requirement: Map shows riverside stations by default

The site SHALL load `data/stations.json` and `data/shops.json` relative to the site base path and render the Esri World Light Gray Canvas base map with its reference (label) layer, crediting Esri and OpenStreetMap contributors in the map attribution. The site SHALL provide two independent switches operable by touch: `河濱站點`, on by default, and `市區站點`, off by default. While `河濱站點` is on, the site SHALL show every station whose `riverside` field is `true` as a clustered marker; while `市區站點` is on, the site SHALL show every station whose `riverside` field is `false` as a clustered marker in a style visually distinct from riverside stations. A switch that is off SHALL remove every marker of its kind, and neither switch SHALL change the other kind's markers. On load the site SHALL fit the initial map view to the bounds of the riverside stations. Turning either switch on or off SHALL NOT clear the selected station, its highlight, its shop list, or its shop markers. The user interface text SHALL be Traditional Chinese.

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
- **THEN** non-riverside stations appear in the urban marker style, and then every riverside station marker is removed while the non-riverside markers stay; turning `河濱站點` on again brings the riverside markers back

#### Scenario: Selection survives the switches

- **WHEN** the user selects a riverside station and then turns off `河濱站點`
- **THEN** that station stays selected with its highlight, shop list, and shop markers, while the other riverside station markers are removed; the same holds for a non-riverside station and the `市區站點` switch

#### Scenario: Data fails to load

- **WHEN** either data file returns a non-200 response
- **THEN** the site shows the message `資料載入失敗，請重新整理` and does not show an empty map without explanation

## ADDED Requirements

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
