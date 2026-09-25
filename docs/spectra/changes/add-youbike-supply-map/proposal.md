## Why

Riders on YouBike in Taipei and New Taipei often need to restock (water, snacks, groceries) mid-ride, but no single map shows which convenience stores, supermarkets, or hypermarkets are within walking distance of a given YouBike station. This project starts from an empty repository, so the first change establishes the whole map.

## What Changes

- Add a build-time data pipeline that fetches YouBike 2.0 station locations for Taipei City and New Taipei City from the two cities' open-data endpoints, and fetches supply shops in both cities from OpenStreetMap via the Overpass API, then normalizes both into static JSON files shipped with the site.
- Classify shops into four categories — convenience store, supermarket, hypermarket, grocery — using brand/name rules first and the OSM `shop` tag as fallback; exclude parcel pickup points (e.g. 蝦皮店到店) and department stores.
- Add a map page that shows all stations; selecting a station lists shops within a chosen walking radius, sorted by distance, with category filters. The page is built with Nuxt 4 (Vue 3) and Leaflet on OpenStreetMap tiles and statically generated with `nuxt generate` for GitHub Pages; Nuxt is chosen so server-side rendering can be enabled later by switching the deployment target.
- Each listed shop links to Google Maps walking directions from the selected station to that shop. No route is computed or drawn by this site.
- Add a GitHub Actions workflow that refreshes the data on a schedule and on manual dispatch, builds the site, and deploys it to GitHub Pages.

## Non-Goals (optional)

Recorded in design.md.

## Capabilities

### New Capabilities

- `supply-data`: Fetching, classifying, and publishing YouBike station and supply-shop data as static JSON.
- `supply-map`: The browser map — station display, station selection, nearby-shop listing, filtering, and the Google Maps directions link.

### Modified Capabilities

(none)

## Impact

- New project files: package.json, nuxt.config.ts, app/ (Nuxt pages, components, utils), scripts/ (data fetch and normalize), public/data/ (generated JSON), .github/workflows/ (refresh and deploy).
- New dependencies: nuxt, leaflet, leaflet.markercluster; vitest for tests.
- External services at build time: Taipei YouBike open data (tcgbusfs.blob.core.windows.net), New Taipei open data (data.ntpc.gov.tw), Overpass API (overpass-api.de). At run time: OpenStreetMap tile servers and Google Maps (link only).
- GitHub repository fripig/BikeSupplyMap: Pages enabled with the GitHub Actions source.
