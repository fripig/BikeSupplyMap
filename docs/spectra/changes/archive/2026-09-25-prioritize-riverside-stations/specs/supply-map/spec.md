## REMOVED Requirements

### Requirement: Map shows all stations

**Reason**: Showing every station buries the riverside stations the rider needs under dense urban clusters; replaced by "Map shows riverside stations by default", which keeps data loading, the load-failure message, and Traditional Chinese UI text.
**Migration**: Urban stations remain reachable through the `顯示市區站點` toggle.

## ADDED Requirements

### Requirement: Map shows riverside stations by default

The site SHALL load `data/stations.json` and `data/shops.json` relative to the site base path and render an OpenStreetMap tile layer. On load the site SHALL show every station whose `riverside` field is `true` as a clustered marker, SHALL NOT show stations whose `riverside` field is `false`, and SHALL fit the initial map view to the bounds of the riverside stations. The site SHALL provide a toggle labelled `顯示市區站點`, off by default; while it is on, the site SHALL also show every non-riverside station, drawn in a marker style visually distinct from riverside stations. Turning the toggle on or off SHALL NOT clear the selected station, its shop list, or its shop markers. The user interface text SHALL be Traditional Chinese.

#### Scenario: Only riverside stations appear on load

- **WHEN** the user opens the site
- **THEN** only stations with `riverside: true` are shown (clustered at low zoom), the view frames those stations across both cities, the `顯示市區站點` toggle is off, and the OpenStreetMap attribution is visible

##### Example: default visibility

- **GIVEN** stations A (`riverside: true`), B (`riverside: true`), C (`riverside: false`)
- **WHEN** the site finishes loading
- **THEN** markers for A and B are on the map and no marker for C is on the map

#### Scenario: Toggle adds urban stations

- **WHEN** the user turns on `顯示市區站點`
- **THEN** non-riverside stations appear in the urban marker style alongside the riverside stations, and turning the toggle off removes them again

#### Scenario: Selection survives the toggle

- **WHEN** the user turns on `顯示市區站點`, selects a non-riverside station, and then turns the toggle off
- **THEN** that station stays selected with its highlight, shop list, and shop markers, while the other non-riverside station markers are removed

#### Scenario: Data fails to load

- **WHEN** either data file returns a non-200 response
- **THEN** the site shows the message `資料載入失敗，請重新整理` and does not show an empty map without explanation
