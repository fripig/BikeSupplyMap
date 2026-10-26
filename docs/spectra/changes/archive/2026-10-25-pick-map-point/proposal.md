## Why

A rider can only look up nearby supplies from a YouBike station. That is a problem for someone on their own bike, or anyone stopped somewhere between stations, because the place they care about is where they are. The user asked that clicking any spot on the map should find supplies near that spot.

## What Changes

- **Pick a point.** Clicking or tapping a blank part of the map selects that point. A blank part is anywhere without a station, cluster, shop, icon, vending dot, route stop, or a route line that shows a popup. Dragging or zooming does not pick.
- **Same panel as a station.** A picked point gets the selected-station treatment:
  - The side panel lists shops within the radius, nearest first, using the same radius and category filters.
  - Each shop's 步行導航 link starts from the point.
  - The radius circle and shop markers are drawn, and the map fits the circle.
- **Panel header for a point.**
  - The heading reads `地圖上選的地點`.
  - The meta line reads `附近 N 家`.
  - The point gets a `在 Google 地圖開啟` link, like a station.
- **Nearest YouBike station.** The panel shows `最近的 YouBike：<name>（<distance>）` with a `選這個站` button that selects that station. When no station is within 2 km, it shows `2 km 內沒有 YouBike 站`. Riverside and urban stations both count, the same as route-stop popups.
- **Marker.** The map shows a point marker, distinct from the selected-station bike icon.
- **Replacing a pick.** Selecting a station replaces the point, and picking another point replaces the station or the earlier point.
- **Hint text.** The text shown before anything is selected mentions that a blank spot on the map can be clicked.

## Non-Goals

- **Other ways to pick.** 「我的位置」 (geolocation) and long-press are left out by the user's choice.
- **Address or place-name lookup.** No address or place name is shown for the point. That would need an online geocoding service, and the site calls no APIs at runtime.
- **Remembering the pick.** A picked point is not kept in the URL and is not restored after a reload.

## Capabilities

### New Capabilities

(none)

### Modified Capabilities

- `supply-map`:
  - **Selection.** Adds the requirement that a picked map point lists nearby shops and its nearest station.
  - **Directions link.** The walking directions requirement now takes its origin from whichever station or point is selected.
  - **Location link.** The Google Maps location link requirement now also covers a picked point.

## Impact

- Affected specs: supply-map
- Affected code:
  - Modified: app/pages/index.vue, app/components/SupplyMap.client.vue, app/components/ShopList.vue, app/components/ShopList.test.ts, app/utils/geo.ts, e2e/map.spec.ts, README.md
- No data or build changes; public/data is untouched.
