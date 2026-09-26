## Context

`app/components/SupplyMap.client.vue` builds two marker cluster groups on mount: a riverside group that is always added to the map, and `urbanLayer`, which the `showUrban` prop adds or removes. `app/pages/index.vue` holds `showUrban = ref(false)` and binds it through `MapControls.vue`, whose first switch is labelled `顯示市區站點`. The selected station is drawn as its own `selectedMarker` outside both groups, so hiding a group already leaves the selection intact.

Facility, shelter and vending markers bind their popups with `bindPopup(escapeHtml(label))` (the vending marker uses `vendingLabel`, the shelter and facility markers go through `updateShelterLayer` and `glyphLayer`). `app/utils/links.ts` only has `directionsUrl` for the shop list's walking directions. The side panel in `index.vue` shows the selected station's name (`.station-name`) and a meta line (`.station-meta`).

## Goals / Non-Goals

**Goals:**

- Let the rider hide riverside station markers, and keep urban markers on their own switch.
- Give facility, shelter and vending popups and the selected station a link that shows the place in Google Maps.

**Non-Goals:**

- No directions link for these places; the existing walking directions from a station to a shop stay as they are.
- No link on bridge or link route line popups (those are lines, not places) and no change to the shop markers' popups, which already have walking directions.
- Remembering switch states across visits.
- Changing station clustering, icon styles, or the initial view (still framed on riverside stations even if the switch is later turned off).

## Decisions

### Two station switches instead of a master switch

`河濱站點` (default on) and `市區站點` (default off) each control one cluster group. A master YouBike switch with the urban toggle nested under it was rejected at the user's request; two flat switches match the other layer switches in the controls.

### Riverside switch mirrors the urban one in SupplyMap

Keep `riversideLayer` in a module variable like `urbanLayer`, add a `showRiverside` prop, and add or remove the group in a watcher, with the initial add conditioned on the prop. The `showUrban` prop, model and ref keep their names; only the label changes to `市區站點`. `fitBounds` on the riverside stations still runs on mount regardless of the switch.

### Location link URL uses Google Maps search

`mapsPlaceUrl(place: LatLng)` in `app/utils/links.ts` returns `https://www.google.com/maps/search/?api=1&query=<lat>,<lng>`, using the numbers as they appear in the data (template string, no rounding), matching how `directionsUrl` formats coordinates.

### Popup markup: escaped label, line break, link

A helper in SupplyMap, `placePopup(label, place)`, returns `${escapeHtml(label)}<br><a href="${mapsPlaceUrl(place)}" target="_blank" rel="noopener">在 Google 地圖開啟</a>`. It replaces `escapeHtml(label)` in the vending, shelter and glyph-layer `bindPopup` calls. Marker titles stay the plain label, so existing `getByTitle(label)` lookups keep working. Route line popups keep only the escaped name.

### Station link in the side panel

In `index.vue`, under `.station-meta`, add `<a class="station-link" :href="mapsPlaceUrl(selected)" target="_blank" rel="noopener">在 Google 地圖開啟</a>`, styled like the shop list's `.shop__link`.

## Implementation Contract

- Behavior: the controls show `河濱站點` (checked on load) and `市區站點` (unchecked on load) as the first two switches. Unchecking `河濱站點` removes every riverside marker and cluster; checking it restores them. Neither switch clears the selected station's highlight, shop list or shop markers. Toilet, shower, shelter and vending popups show their existing text, then a `在 Google 地圖開啟` link; the side panel shows the same link under the selected station.
- Interface: `mapsPlaceUrl(place: LatLng): string` exported from `app/utils/links.ts`. `MapControls.vue` gains a required `showRiverside` model; `SupplyMap.client.vue` gains a `showRiverside: boolean` prop; `index.vue` holds `showRiverside = ref(true)`. The hint text in `index.vue` names `市區站點` instead of `顯示市區站點`.
- Failure modes: none new; the switches are local state and the link is a static URL.
- Acceptance criteria: `app/utils/links.test.ts` covers both rows of the "generated URL" example; `app/components/MapControls.test.ts` covers the two labels, their default states and emitted values; e2e tests cover turning off `河濱站點` (no riverside marker titles left, selection kept), the popup link href and `target="_blank"` on a toilet popup, the popup text before the link for vending, shelter and toilet popups, and the side panel link for a selected station; `npx vitest run`, `npx vue-tsc --noEmit` and `npm run test:e2e` pass.
- Scope boundaries: in scope are app/utils/links.ts and its test, MapControls.vue and its test, SupplyMap.client.vue, index.vue, e2e/map.spec.ts and README.md. Out of scope are the data pipeline, public/data, route line popups and the shop list.

## Risks / Trade-offs

- [Riders turn off 河濱站點 and cannot pick a station] → the switch is on by default and sits first in the controls, and turning it on restores the markers immediately.
- [Existing e2e assertions compare the full popup text] → those for vending, shelter and toilet popups change to check the text before the link and the link separately.
