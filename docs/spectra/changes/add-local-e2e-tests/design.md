## Context

The site draws route lines, bridge lines and route-side vending icons on one Leaflet canvas renderer (`renderer()` in app/components/SupplyMap.client.vue). Canvas features have no DOM nodes, so a browser test cannot find them with selectors. Popups, the legend control, category chips and station markers are DOM elements. Vitest covers pure helpers (`legendEntries`, `vendingLabel`) and components without Leaflet, but no test mounts the map. The user wants e2e tests for local development only, with Playwright, and no CI change.

Measured facts this design relies on:

- Nuxt's type-check scope (`.nuxt/tsconfig.app.json` include list) covers `app/**` but not a top-level `e2e/` directory.
- At widths up to 767 px, app/pages/index.vue stacks the header, then the map at 55dvh, then the station list; the map is below the controls and may need scrolling into view.
- Map tiles come from server.arcgisonline.com.

## Goals / Non-Goals

**Goals:**

- One command, `npm run test:e2e`, runs browser tests against the dev server in desktop and 375 px sizes.
- Tests assert what a rider sees on the canvas (vending icons present or absent) and in the DOM (popup text, legend, station heading).

**Non-Goals:**

- CI integration, cross-browser runs beyond Chromium, visual snapshot baselines.
- Changing site behavior; capability-level observable behavior is unchanged.

## Decisions

### Dev-only map hook

`SupplyMap.client.vue` sets `window.__supplyMap = map` after creating the map, inside `if (import.meta.dev)`. Nuxt replaces `import.meta.dev` with `false` in `nuxt generate`, so the statement is removed from the published site. Tests call `map.setView`, `map.latLngToContainerPoint` and `map.getContainer()` through it. Alternative considered: clicking at pixel positions computed from the initial `fitBounds` view. Rejected because the view depends on window size and on the station data, which changes weekly. Alternative considered: a `data-*` attribute per feature. Rejected because canvas features have no elements to carry it.

### Canvas pixel probe for icon visibility

To decide whether a vending icon is drawn at a point, the test finds the canvas element under that container point and reads one pixel with `getContext('2d').getImageData`, scaling by `canvas.width / rect.width` for device pixel ratio. The icon's fill is `#0c8599`; a pixel within 12 of that color on each RGB channel counts as teal. Because the green urban lines or neighbouring icons can overlap one icon, the test picks as its subject the first `routes.json` `vending` entry whose centre pixel is teal on load, and then asserts that the same pixel is not teal with 自動販賣機 off and teal again with it on. Alternative considered: full screenshot comparison. Rejected as brittle against weekly data and tile changes.

### Tiles are blocked in tests

Each test routes requests to `server.arcgisonline.com` to an empty 204 response, so tests do not depend on a third-party tile server and tile images never cover the canvas probe.

### Test data comes from the served files

Tests read `data/routes.json` and `data/stations.json` through the dev server at run time and pick their subjects from them (the route named `重陽橋（人行道）`, the first vending entry passing the probe, the first station with `riverside: true`). No fixtures are copied, so the weekly data refresh does not require test edits unless the named bridge disappears.

### Configuration

`playwright.config.ts` sets `testDir: 'e2e'`, `baseURL: 'http://localhost:3000/BikeSupplyMap/'`, two Chromium projects (`desktop` 1280×800, `phone` 375×812 with `isMobile` and `hasTouch`), and `webServer: { command: 'npm run dev', url: baseURL, reuseExistingServer: true, timeout: 120_000 }`. Reports go to `playwright-report/` and artifacts to `test-results/`, both git-ignored. Vitest's `include` patterns (`scripts/**/*.test.js`, `app/**/*.test.ts`) do not match `e2e/*.spec.ts`, so `npm test` is unaffected.

## Implementation Contract

**Behavior**

- `npm run test:e2e` starts the dev server if port 3000 is free (or reuses a running one), runs every test in `e2e/` in the `desktop` and `phone` projects, and exits 0 only when all pass.
- `npm test` still runs Vitest only; its test count is unchanged by this change.
- In `npm run dev`, `window.__supplyMap` is the Leaflet map. In `.output/public` produced by `npm run generate`, no file contains the string `__supplyMap`.
- Capability-level observable behavior of the site is unchanged.

**Tests (each in both projects)**

- Vending toggle: on load a subject vending icon's centre pixel is teal and the legend lists 自動販賣機; after clicking the 自動販賣機 chip the pixel is not teal and the legend does not list it; after clicking again both return.
- Vending popup: clicking the subject icon opens a popup whose text equals the `vendingLabel` rule applied to that record's `name` and `vending` (the test computes the expected text with the same mapping table as app/utils/cycling.ts by importing `vendingLabel`).
- 重陽橋: clicking the midpoint of the longest line of `重陽橋（人行道）` opens a popup reading `重陽橋（人行道）`.
- Station: after `setView` on the first riverside station at zoom 18, clicking its marker (located by its `title`) shows the station name in the panel heading.

**Failure modes**

- Missing Chromium: Playwright prints its install hint; README tells the developer to run `npx playwright install chromium`.
- `重陽橋（人行道）` absent from routes.json: the 重陽橋 test fails with a message naming the route.

**Scope**

- In scope: playwright.config.ts, e2e/, the dev-only hook, package.json scripts and dev dependency, .gitignore entries, README section.
- Out of scope: .github/workflows, site behavior, data pipeline.

## Risks / Trade-offs

- [The dev hook ships by mistake] → Task verification greps the generated output for `__supplyMap`.
- [Pixel probe misreads anti-aliased edges] → The probe reads the icon centre only and uses a subject verified teal on load.
- [Phone layout hides the map below the controls] → Helpers scroll the map container into view before projecting points.
- [Weekly data removes 重陽橋] → The test failure names the route; the bridge supplement guard in the pipeline would already have failed the refresh.

## Migration Plan

1. Land the dependency, config, hook, tests and README in one commit.
2. Rollback: revert the commit; no data or deployed behavior depends on it.

## Open Questions

(none)
