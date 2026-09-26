## MODIFIED Requirements

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
