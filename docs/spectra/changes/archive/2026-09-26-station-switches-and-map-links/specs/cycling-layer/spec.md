## MODIFIED Requirements

### Requirement: Urban bike-path layer toggle

The site SHALL provide a toggle labelled `都市自行車道`, on by default and operable by touch. The toggle SHALL be independent of the `河濱站點` and `市區站點` switches and SHALL NOT change the station markers, the selected station, or its shop list. The site SHALL request `data/cycling.json` on page load while the toggle is on; if the user turns the toggle off before a load has succeeded, the next turn-on SHALL request it. After a successful load, turning the toggle off and on again SHALL NOT request the file again. If the request fails, the site SHALL show `自行車道資料載入失敗` next to the toggle, turn the toggle off, and leave the rest of the map working; turning it on again SHALL retry.

#### Scenario: Layer is on at load

- **WHEN** the user opens the site
- **THEN** the `都市自行車道` toggle is on, `data/cycling.json` is requested once, and urban bike paths are drawn when it arrives

#### Scenario: Load failure is contained

- **WHEN** the user opens the site and `data/cycling.json` returns HTTP 404
- **THEN** the message `自行車道資料載入失敗` appears, the toggle is off, and stations remain selectable

#### Scenario: No reload after success

- **WHEN** `data/cycling.json` loaded successfully and the user turns the toggle off and on
- **THEN** no further request for `data/cycling.json` is made
