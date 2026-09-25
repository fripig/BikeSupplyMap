## Purpose

Lets riders caught in rain on the riverside bike paths find nearby cover: spots where the path runs under an elevated bridge, and shelters or roofs next to the path, shown on demand as a map layer.

## ADDED Requirements

### Requirement: Rain shelter switch

The controls SHALL show a switch labelled `躲雨點`, off when the page opens. The site SHALL NOT request `data/shelters.json` while the switch has never been on. Turning the switch on SHALL request `data/shelters.json` once; after a successful load, turning the switch off and on again SHALL NOT request it again. If the request fails, the site SHALL show `躲雨點資料載入失敗` under the switch, turn the switch back off, and keep stations, shops, routes, and the urban layer working; turning the switch on again SHALL retry the request and hide the message while retrying.

#### Scenario: Off at load

- **WHEN** the user opens the site
- **THEN** the `躲雨點` switch is off, no shelter icon is drawn, and `data/shelters.json` has not been requested

#### Scenario: Loaded once

- **WHEN** the user turns the switch on, off, and on again, and the first request succeeds
- **THEN** `data/shelters.json` is requested exactly once

#### Scenario: Load failure is contained

- **WHEN** the user turns the switch on and `data/shelters.json` returns HTTP 404
- **THEN** `躲雨點資料載入失敗` appears under the switch, the switch is off, and stations remain selectable

---
### Requirement: Rain shelter icons

While the `躲雨點` switch is on and shelter data is loaded, the site SHALL mark every entry of `shelters.json` at every zoom level: `bridge` entries with a rounded square icon showing `橋` and `shelter` entries with a rounded square icon showing `亭`. Turning the switch off SHALL remove every shelter icon without reloading. Selecting a `bridge` icon SHALL show `<name> · 橋下`, or `高架橋下` when `name` is `null`; selecting a `shelter` icon SHALL show its `name`, or `涼亭` when `name` is `null`. Shelter icons SHALL be drawn below station markers so that a station marker at the same place stays selectable.

#### Scenario: Icons follow the switch

- **WHEN** shelter data has loaded and the user turns the switch off, then on
- **THEN** every shelter icon disappears while the switch is off and reappears when it is turned on

#### Scenario: Popup text

- **WHEN** the user selects shelter icons with the data below
- **THEN** the text shown is as listed

##### Example: shelter popup text

| kind | name | Shown |
| ---- | ---- | ----- |
| `bridge` | `中正橋` | 中正橋 · 橋下 |
| `bridge` | `null` | 高架橋下 |
| `shelter` | `單車道終點涼亭` | 單車道終點涼亭 |
| `shelter` | `null` | 涼亭 |
