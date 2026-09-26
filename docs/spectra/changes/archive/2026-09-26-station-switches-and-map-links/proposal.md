## Why

With routes, vending machines, rain shelters, toilets and showers on the map, the riverside YouBike station markers are always drawn and crowd the other icons, and there is no way to hide them. Riders who find a toilet, shower, shelter or vending machine also have no quick way to see that place in Google Maps, where they can check photos or start navigation themselves.

## What Changes

- Replace the `顯示市區站點` toggle with two independent switches: `河濱站點` (on by default) shows or hides the riverside station markers, and `市區站點` (off by default) shows or hides the non-riverside station markers. Turning either off keeps the selected station, its highlight, its shop list and its shop markers.
- Add a `在 Google 地圖開啟` link, opening `https://www.google.com/maps/search/?api=1&query=<lat>,<lng>` in a new tab, to the popups of toilet, shower, rain shelter and route-side vending icons, and under the selected station's name in the side panel. The link only shows the place; it does not start directions.

## Non-Goals (optional)

(Recorded in design.md.)

## Capabilities

### New Capabilities

(none)

### Modified Capabilities

- `supply-map`: station visibility moves from one `顯示市區站點` toggle to the `河濱站點` and `市區站點` switches; a new requirement adds the Google Maps location link for facility, shelter and vending popups and the selected station.
- `cycling-layer`: the urban bike-path toggle requirement names the new station switches instead of `顯示市區站點`.

## Impact

- Affected specs: supply-map, cycling-layer
- Affected code: app/components/MapControls.vue, app/components/MapControls.test.ts, app/components/SupplyMap.client.vue, app/pages/index.vue, app/utils/links.ts, app/utils/links.test.ts, e2e/map.spec.ts, e2e/helpers.ts, README.md
- No data or pipeline change; public/data is untouched.
