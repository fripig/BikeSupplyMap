## MODIFIED Requirements

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
