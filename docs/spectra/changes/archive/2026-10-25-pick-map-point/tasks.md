## 1. Selection data shape

- [x] 1.1 Selection becomes a station or a map point.
  - **Types.** app/utils/geo.ts exports `MapPoint` (`{ kind: 'point', lat, lng }`) and `isMapPoint(p)`, which is true only when `kind === 'point'`.
  - **Verify.** app/utils/geo.test.ts checks that `isMapPoint` is true for `{ kind: 'point', lat: 25, lng: 121.5 }` and false for a `Station` object, and `npm test` passes.
- [x] 1.2 ShopList takes an origin, not a station, so the Google Maps walking directions link can start from a map point.
  - **Prop.** `ShopList`'s prop `station` becomes `origin: LatLng`, and every 步行導航 link is `directionsUrl(origin, shop)`.
  - **Callers.** app/components/ShopList.test.ts and app/pages/index.vue pass `origin`.
  - **Verify.** The existing ShopList tests pass with `origin` and still assert the same URLs, and `npx vue-tsc --noEmit` passes.

## 2. Picking a point on the map

- [x] 2.1 Blank-click detection by stopping bubbling, not by hit-testing. [after: 1.1]
  - **Stop bubbling.** In app/components/SupplyMap.client.vue, set `bubblingMouseEvents: false` on these interactive vector layers:
    - the shop circleMarkers in `drawSelection`
    - the route-side vending circleMarkers
    - the interactive (named) polylines in `addRouteLines`
  - **Legend.** Call `L.DomEvent.disableClickPropagation` on the legend element when it is created.
  - **Pick on click.** A map `click` handler emits `select` with `{ kind: 'point', lat, lng }`, rounded to 5 decimals.
  - **A click that closes a popup does not pick.** A `preclick` listener, registered at map creation, records whether a popup is open, and that click is skipped.
  - **Verify.** The e2e tests in 3.1.
- [x] 2.2 The point marker and nearest-station line, which together implement "Selecting a map point lists nearby shops" and the Google Maps location link for a point. [after: 1.1, 1.2, 2.1]
  - **Map.** `drawSelection` draws the radius circle and a non-interactive `map-point-icon` divIcon for a `MapPoint`: an 18 px #e67700 circle with a 3 px white border, `zIndexOffset: 1000`, title `地圖上選的地點`. For a station it keeps drawing the bike icon.
  - **Panel.** For a point, app/pages/index.vue shows:
    - the heading `地圖上選的地點` (`h2.station-name`) and the meta line `附近 N 家`
    - the `在 Google 地圖開啟` link to `mapsPlaceUrl(point)`
    - `最近的 YouBike：<name>（<formatDistance>）` with a `button.point-station-select` reading `選這個站` that selects that station, or `2 km 內沒有 YouBike 站`. It comes from `nearestStation(point, stations)`, using all stations.
  - **Hint.** The hint reads `地圖預設只顯示河濱自行車道旁的 YouBike 站點，點站點或地圖上任一處，查看附近可以補給的店家。要找市區站點，打開「市區站點」。`
  - **Verify.** `npx vue-tsc --noEmit` passes, and the e2e tests in 3.1 pass.

- [x] 2.3 A double-click zooms without picking: a blank click schedules its pick 250 ms later (`PICK_DELAY_MS`), and any later click or `dblclick` cancels it. [after: 2.1]
  - **Verify.** The double-click e2e test in 3.1 passes, and it fails when the pick is emitted at once.

## 3. Tests and docs

- [x] 3.1 Add e2e tests in e2e/map.spec.ts for selecting a map point. They run on desktop and phone. [after: 2.2]
  1. **A blank click lists shops.** Clicking a blank spot (`setView` near a known station at zoom 17, then click a pixel that is not on a station marker) shows:
     - the heading `地圖上選的地點`
     - `附近 N 家`
     - the line `最近的 YouBike：<name>（<formatDistance(haversineMeters(point, nearest))>）`
     - shop 步行導航 links whose `origin=` is the clicked point, with each coordinate rounded to 5 decimals
     - a `在 Google 地圖開啟` link equal to `mapsPlaceUrl(point)`
  2. **`選這個站` selects the station.** `.station-name` then shows that station's name.
  3. **The legend does not pick.** With a station selected, clicking the legend keeps `.station-name` unchanged.
  4. **Clicking a vending dot, then closing its popup, does not pick.** With a station selected, clicking a route-side vending dot opens its popup and keeps the station. Then clicking a blank spot closes the popup and still keeps the station.
  5. **The shop list is nearest first.** For the picked point, the listed distances never decrease.
  6. **No station within 2 km.** A point more than 2.5 km from every station shows `2 km 內沒有 YouBike 站` and no `選這個站` button.
  7. **Double-click does not pick.** With a station selected, double-clicking a blank spot zooms in one level and keeps the station.
  - **Verify.** `npm run test:e2e` passes, and the earlier tests still pass.
- [x] 3.2 Update README.md's feature list to describe picking a map point. It should say that clicking a blank spot lists shops within the radius with walking links from that point, plus the nearest YouBike station within 2 km and `選這個站`. [after: 2.2]
  - **Verify.** Review: the README wording matches the panel text in the spec.
