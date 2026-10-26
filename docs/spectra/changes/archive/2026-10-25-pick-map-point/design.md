## Context

Selection today is a single `selected: Station | null` ref in app/pages/index.vue.
- **Where it flows.** It feeds `nearbyShops`, the side panel heading and meta line, the `在 Google 地圖開啟` link, `ShopList` (which uses the station only as the walking-directions origin) and `SupplyMap`. `SupplyMap` draws the radius circle, the selected bike icon and the shop markers, and fits the map to the circle when `selected` or `radius` changes.
- **How it is set.** It is set only by the `select` event, which fires from station markers and from the route-stop popup's `選這個站` button.
- **Popup helper.** The route-stop popup already shows the nearest station within 2 km through `nearestStation` in app/utils/route-stops.ts.

Leaflet 1.9.4 rules that matter here, checked in node_modules/leaflet/src:
- **Markers do not bubble clicks.** `Marker` defaults to `bubblingMouseEvents: false`, so clicking a station, cluster or divIcon does not fire the map's `click`.
- **Vector layers do bubble.** `Path` defaults to `bubblingMouseEvents: true`, so a click on an interactive circleMarker (shop, route-side vending) or an interactive route polyline (a named route with a popup) also fires the map's `click`.
- **Drags never fire click.** A click that ends a drag is dropped by `Map._draggableMoved`.
- **Popups stop clicks.** Popup content calls `DomEvent.disableClickPropagation`.
- **The legend does not.** The custom legend control (`.cycling-legend`, created with `L.DomUtil.create`) does not, so a click on it reaches the map.
- **Popups close on click.** The map closes an open popup on `preclick` (`closePopupOnClick`).

## Goals / Non-Goals

**Goals:**

- **Pick a point.** A click on a blank map spot selects that point. The panel then shows nearby shops, walking links from the point, a Google Maps link, and the nearest station with `選這個站`.
- **No accidental picks.** Clicks on anything interactive, on the legend, or that only close a popup do not pick a point.

**Non-Goals:**

- **Other ways to pick.** No geolocation and no long-press.
- **Place names.** No reverse geocoding.
- **Remembering the pick.** No URL state.

## Decisions

### Selection becomes a station or a map point

`selected` becomes `Station | MapPoint | null`.
- **Type.** `MapPoint` is `{ kind: 'point', lat: number, lng: number }`, exported from app/utils/geo.ts.
- **Telling them apart.** A helper `isMapPoint(pick)` checks `kind === 'point'`. Stations have no `kind` field, so `Station` and the data files stay unchanged.
- **Alternative considered.** A tagged wrapper `{ kind: 'station', station } | { kind: 'point', … }`. It is cleaner in theory, but it touches every `selected.name` and `selected.city` use and the `select` event payload, for no behavior gain.

### ShopList takes an origin, not a station

`ShopList`'s `station: Station` prop is renamed to `origin: LatLng`, since it only builds `directionsUrl(origin, shop)`. The shop-marker popups in `drawSelection` already call `directionsUrl` with the selection's coordinates, so they work unchanged with a point.

### Blank-click detection by stopping bubbling, not by hit-testing

Every interactive vector layer sets `bubblingMouseEvents: false`:
- the shop circleMarkers drawn by `drawSelection`
- the route-side vending circleMarkers
- the interactive (named) route polylines in `addRouteLines`

The legend element gets `L.DomEvent.disableClickPropagation` when it is created. After that, the map's `click` fires only for blank spots and non-interactive lines. The non-interactive lines are unnamed riverside lines, white casings, urban paths, signals and crossings, and they count as blank.

Alternative considered: in the map click handler, inspect `originalEvent.target` or hit-test layers. It is fragile with one shared canvas renderer, where every vector shares one `<canvas>` element.

### A click that closes a popup does not pick

A map `preclick` listener, registered when the map is created, records whether a popup is open (`map` has an open popup). It runs before Leaflet's own close-on-preclick. The following `click` is ignored when one was open. So a rider who taps the map to dismiss a popup does not lose the selection. The recorded flag is reset after each click.

### A double-click zooms without picking

A double-click sends two `click` events before `dblclick`. Picking on each of them would replace the selection and fight the zoom animation, because the map fits the new radius circle while zooming. So a blank click schedules its pick `PICK_DELAY_MS` (250 ms) later. Every later `click` and every `dblclick` cancels the scheduled pick. The cost is that a single-click pick appears about 0.25 s after the click.

Alternatives considered:
- **Turn off `doubleClickZoom`.** Users lose a familiar way to zoom.
- **Skip clicks with `originalEvent.detail > 1`.** The first click of a double-click still picks.

### The point marker and nearest-station line

- **Marker.** The point is drawn with an `L.marker` and a divIcon of class `map-point-icon`. It is an orange (#e67700, the radius-circle colour) filled circle, 18×18 px, with a 3 px white border, `zIndexOffset: 1000` and `title` `地圖上選的地點`. It is `interactive: false`, so clicks on it fall through to the map and pick again.
- **Nearest-station line.** The side panel calls `nearestStation(point, stations)` from app/utils/route-stops.ts, with the default 2000 m. `stations` is the full riverside-plus-urban list, the same one the route-stop popup uses.
- **Text.** The line reads `最近的 YouBike：<name>（<formatDistance>）`, followed by a `<button class="point-station-select">選這個站</button>` that sets `selected` to that station. Without a station in range it reads `2 km 內沒有 YouBike 站`.

## Implementation Contract

**Behavior:**

- **Clicking a blank spot**, meaning no marker, cluster, divIcon, interactive circleMarker, interactive route line or legend, while no popup is open:
  - `selected` is set to `{ kind: 'point', lat, lng }`, with the click's latlng rounded to 5 decimals.
  - The radius circle and point marker are drawn there, shops within the radius are listed and drawn, and the map fits the circle.
  - On a phone (max-width 767px) the panel heading scrolls into view, as for a station.
- **Panel for a point.** The heading is `地圖上選的地點` (`h2.station-name`). The meta line is `附近 N 家`. The `在 Google 地圖開啟` link points to `mapsPlaceUrl(point)`. The nearest-station line comes next, then `ShopList` with `origin` set to the point.
- **Replacing a pick.** Clicking a station marker, or `選這個站` in the panel or a route-stop popup, replaces the point with that station. The station renders exactly as today. Clicking another blank spot replaces the earlier point or station.
- **Clicks that do not pick.** A click on the legend, on a shop or vending dot, or on a named route line does not change `selected`. Nor does a click that closes an open popup, a drag, or a double-click (which zooms in).
- **Pick delay.** A blank-click pick lands 250 ms after the click.
- **Hint text.** Before anything is selected, the hint reads `地圖預設只顯示河濱自行車道旁的 YouBike 站點，點站點或地圖上任一處，查看附近可以補給的店家。要找市區站點，打開「市區站點」。`

**Interface:**

- `export interface MapPoint extends LatLng { kind: 'point' }`
- `export function isMapPoint(p: Station | MapPoint): p is MapPoint`, both in app/utils/geo.ts.
- `SupplyMap` prop `selected: Station | MapPoint | null`. Its `select` event payload is `Station | MapPoint`.
- `ShopList` props become `{ origin: LatLng, items: NearbyShop[], noCategorySelected?: boolean }`.

**Failure modes:**

- **No station in range.** The panel shows `2 km 內沒有 YouBike 站`.
- **Not ready.** Clicks before the map and stations load cannot happen, because the map mounts only when `status === 'ready'`.

**Acceptance:**

- **Unit tests.**
  - `isMapPoint` passes in app/utils/geo.test.ts.
  - app/components/ShopList.test.ts uses `origin`.
  - `npm test` passes.
- **e2e tests** in e2e/map.spec.ts, on desktop and phone:
  1. Clicking a blank spot shows `地圖上選的地點`, the shop count, a nearest-station line with distance, and walking links whose origin is the clicked point (rounded to 5 decimals).
  2. `選這個站` selects that station, and `.station-name` shows its name.
  3. Clicking the legend does not change the selection.
  4. A click that closes an open popup keeps the selected station.
- **Type check.** `npx vue-tsc --noEmit` passes.

**Scope:** app/pages/index.vue, app/components/SupplyMap.client.vue, app/components/ShopList.vue (and its test), app/utils/geo.ts (and its test), e2e/map.spec.ts, README.md. No change to scripts/ or public/data.

## Risks / Trade-offs

- **Accidental picks.** Tapping the map to pan on a phone can pick a point when the finger does not move enough to count as a drag. That is accepted: a new pick only replaces the selection, and the earlier station is one tap away.
- **Non-interactive lines count as blank.** Clicking on an unnamed riverside line picks a point under it. That is intended, since those lines have no popup to open.
- **The map jumps.** Fitting the map to the 300–1000 m radius circle after a pick at city zoom zooms in sharply. This matches station selection today, so it is kept for consistency.
