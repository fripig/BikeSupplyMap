## Context

The repository contains only Spectra scaffolding; there is no application code yet. The repository fripig/BikeSupplyMap is public so GitHub Pages is available on the free plan. The owner chose a static site with no backend; walking directions are delegated to Google Maps by link.

Source probes run on 2026-09-25 (measured):

- Taipei YouBike JSON (`https://tcgbusfs.blob.core.windows.net/dotapp/youbike/v2/youbike_immediate.json`): HTTP 200, 1807 records, coordinates as numbers in `latitude` / `longitude`.
- New Taipei YouBike JSON (`https://data.ntpc.gov.tw/api/datasets/010e5b15-3823-4b20-b401-b1cf000550c5/json?page=N&size=1000`): HTTP 200, page 0 returned a full 1000 records, coordinates as strings in `lat` / `lng`. Total record count not yet measured.
- Overpass (`https://overpass-api.de/api/interpreter`): without a `User-Agent` header it returned HTTP 406; with one it returned HTTP 200 and 5465 elements for the two cities (convenience 4159, supermarket 793, greengrocer 205, variety_store 205, department_store 53, general 43, wholesale 7). 107 elements carry brand `蝦皮店到店` under `shop=convenience`. A minified name + coordinate projection was 274,643 bytes.

## Goals / Non-Goals

**Goals:**

- A rider picks a station and sees nearby supply shops by category and distance in a few taps.
- Zero running cost and no server: static files on GitHub Pages.
- Data refreshes automatically without manual work.

**Non-Goals:**

- Real-time bike or dock availability (owner chose station positions only).
- Computing or drawing walking or cycling routes inside the site.
- Cities other than Taipei City and New Taipei City.
- Shop opening hours, prices, or stock.
- Station name search and geolocation ("stations near me"); candidates for a follow-up change.
- Department stores (`shop=department_store`): mostly malls and specialty shops, not quick restock stops.

## Decisions

### Static site on GitHub Pages with build-time data

All data is fetched by a Node script at build time and shipped as JSON under `public/data/`. Alternative: a Cloudflare Worker fetching live data — rejected because station positions change rarely and the owner declined a backend.

### Nuxt static generation with client-only Leaflet

**Supersedes**: add-youbike-supply-map / Vite with vanilla JavaScript and Leaflet

Decided with the owner on 2026-09-25: Nuxt 4 (Vue 3) replaces the earlier Vite + vanilla JavaScript choice because server-side rendering may be needed later. For now the site is statically generated with `nuxt generate` using the Nitro `github_pages` preset and `app.baseURL` `/BikeSupplyMap/`; the output directory `.output/public` is what gets deployed. Enabling SSR later means switching the Nitro preset to a Cloudflare target and moving hosting there — application code is not expected to change, but that migration is outside this change.

Leaflet touches `window` and cannot run during generation, so the map is a client-only component (a `.client.vue` component rendered inside `<ClientOnly>`) that imports `leaflet` and `leaflet.markercluster` directly. Alternative: the `@nuxtjs/leaflet` module (v1.3.3 on npm) — rejected because the marker clustering and imperative marker updates are simpler against the plain Leaflet API, and the wrapper adds another layer to debug. Alternatives considered at the framework level: React and Svelte — the owner chose Nuxt for its SSR path.

Station and shop data stay as static files under `public/data/` and are fetched in the browser with the base URL prefix from `useRuntimeConfig().app.baseURL`; they are not embedded into the generated page payload, keeping the HTML small.

### Straight-line distance with fixed radius options

Nearby shops are filtered by haversine distance with radius options 300 / 500 / 1000 m (default 500 m). Alternative: walking distance from a routing service — rejected because it needs a routing API (and a backend to hide its key). Straight-line distance is labelled as such; actual walking distance is longer (unmeasured, typically 1.2–1.4× in a street grid — an estimate, not relied upon by any decision here).

With about 3,500 stations and 5,000 shops (estimated from the probes above), a linear scan of all shops per selection is roughly 5,000 haversine calls — cheap enough that no spatial index is used. If selection feels slow on a low-end phone during manual verification, a grid index is the fallback.

### Brand-first shop classification

Classification uses brand / name rules before the OSM `shop` tag because OSM tags are inconsistent (Costco is tagged `wholesale`, 蝦皮店到店 is tagged `convenience`, 家樂福 appears as both supermarket and hypermarket). The rule table lives in the `supply-data` spec and is implemented as a pure function with a table-driven unit test.

### Scheduled refresh commits data back to main

A GitHub Actions workflow runs weekly (Monday 03:00 Asia/Taipei, cron `0 19 * * 0` UTC) and on manual dispatch: it runs the fetch script and, when the data differ, commits `public/data/` to `main` as `github-actions[bot]`. A separate deploy workflow builds and deploys on every push to `main`. Alternative: fetch during every deploy — rejected because an upstream outage would then break deploys, and committed data gives a reviewable history. The refresh commit must be pushed with a token that triggers the deploy workflow; the refresh workflow therefore calls the deploy workflow via `workflow_call` after committing instead of relying on the push event (pushes made with `GITHUB_TOKEN` do not trigger other workflows).

### Google Maps link for directions

Directions use the documented Maps URLs format `https://www.google.com/maps/dir/?api=1&...&travelmode=walking`, which needs no API key and opens the Google Maps app on phones.

## Implementation Contract

**Behavior:**

- `npm run fetch-data` produces `public/data/stations.json`, `public/data/shops.json`, `public/data/meta.json` per the `supply-data` spec, or exits non-zero leaving existing files untouched.
- `npm run dev` serves the map via `nuxt dev`; `npm run generate` runs `nuxt generate` and emits `.output/public/` deployable under `/BikeSupplyMap/`.
- The deployed site at `https://fripig.github.io/BikeSupplyMap/` behaves per the `supply-map` spec.

**Module boundaries (pure logic separated from I/O so it is unit-testable):**

- `scripts/lib/normalize-stations.js`: `normalizeTaipei(record)` and `normalizeNewTaipei(record)` → station object or `null` when inactive.
- `scripts/lib/classify-shop.js`: `classifyShop(osmElement)` → shop object or `null` when excluded.
- `scripts/lib/paginate.js`: `fetchAllPages(fetchPage, pageSize)` → every record, requesting the next page only after a full page.
- `scripts/lib/check-counts.js`: `checkCounts(counts)` → one message per source below its minimum.
- `scripts/fetch-data.js`: network I/O, Overpass instance fallback, minimum-count checks, and the write step (nothing is written until every check passes; the three files are then written to a temp directory and renamed into `public/data/` one by one). Source URLs and the output directory can be overridden with `TAIPEI_URL`, `NEW_TAIPEI_URL`, `OVERPASS_URL`, and `DATA_DIR` so tests can run the script against a local server.
- `app/utils/geo.ts`: `haversineMeters(a, b)`, `nearbyShops(station, shops, radiusMeters, enabledCategories)` → sorted array of `{shop, distance}`. Pure, no Nuxt imports, so vitest imports it directly.
- `app/utils/links.ts`: `directionsUrl(station, shop)` → string. Pure.
- `app/utils/load-data.ts`: `loadSupplyData(fetch, baseURL)` → `{ stations, shops }`, rejecting when either file returns a non-200 response.
- `app/components/SupplyMap.client.vue`: Leaflet map, station clusters, shop markers; emits the selected station.
- `app/components/ShopList.vue`, `app/components/MapControls.vue`, `app/pages/index.vue`: list rendering, radius and category controls, data loading, error and freshness display; no business logic beyond calling the utils above.

**Failure modes:** fetch-script failures are loud (non-zero exit, message naming the source and the reason). Front-end data load failures show `資料載入失敗，請重新整理`. The data date is formatted in the Asia/Taipei time zone.

**Acceptance criteria:**

- `npx vitest run` passes, covering: both station normalizers (including `act` filtering and prefix removal), every row of the classification example table, New Taipei pagination, the fetch script end to end against a local server (success, Overpass 406/504 keeping previous files byte-identical, and a 120-station New Taipei result being rejected), haversine radius filtering and ordering from the `supply-map` example, the directions URL example, data-load failure, the empty-range message, and the radius options with the 500 m default.
- `npm run fetch-data` succeeds against live sources and prints per-city station counts and per-category shop counts.
- `npm run generate` succeeds and `.output/public/index.html` references assets under `/BikeSupplyMap/_nuxt/`; manual check in a browser at desktop width and at 375 px covers: station click lists shops, radius switch, category toggles, directions link opens Google Maps walking mode, data date shown.
- Deploy workflow run is green and the Pages URL returns HTTP 200.

**In scope:** everything under Goals, the two workflows, a README describing commands and data sources.

**Out of scope:** everything under Non-Goals; server-side rendering at request time and Cloudflare hosting; custom domain; analytics; PWA / offline support.

## Risks / Trade-offs

- [Overpass rate limits or outages] → refresh runs weekly only and sends a User-Agent. During implementation on 2026-09-25 overpass-api.de answered HTTP 504 for several minutes, so the script falls back across public instances in order — overpass-api.de, maps.mail.ru, overpass.kumi.systems — treating 429/5xx, network errors, timeouts, and `remark` errors as "try the next instance", and repeats the round once after 30 s. Other 4xx responses stop immediately. If every attempt fails, it exits non-zero without overwriting data and the site keeps serving the last good data.
- [OSM coverage gaps: some real stores missing or mis-tagged] → accepted; site credits OSM so users know the source. Classification table is easy to extend.
- [Open-data endpoint URLs or field names change] → normalizers are unit-tested with recorded samples; the minimum-count check makes a silent schema break fail loudly.
- [About 600 KB of JSON on first load (estimated from probes: ~275 KB shops + station file of similar order)] → acceptable for an MVP; Pages serves gzip. Measure the built payload during verification; if over 1 MB, trim fields.
- [Nuxt adds framework weight to a one-page app (bundle size not yet measured)] → measure `.output/public` JavaScript size during verification; accepted in exchange for the SSR path the owner wants.
- [Leaflet rendered during generation would crash `nuxt generate`] → map component is client-only; `npm run generate` succeeding is an acceptance criterion.
- [OpenStreetMap public tile server usage policy] → low-traffic hobby site with attribution is within policy; switch tile provider if traffic grows.

## Migration Plan

New project; no migration. Enable Pages with the "GitHub Actions" source (via `gh api` or repository settings) before the first deploy. Rollback: re-run the deploy workflow on a previous commit, or revert the data commit.

## Open Questions

(none — radius options, categories, and no-backend approach were decided with the owner on 2026-09-25)
