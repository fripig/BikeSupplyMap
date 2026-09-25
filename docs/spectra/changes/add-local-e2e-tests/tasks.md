## 1. Setup

- [x] 1.1 Playwright runs locally beside Vitest: add `@playwright/test` as a dev dependency, `playwright.config.ts` as described in design "Configuration" (desktop and phone Chromium projects, dev server started or reused on port 3000), an `npm run test:e2e` script, and `playwright-report/` and `test-results/` in .gitignore. Verify: `npx playwright test --list` lists each e2e test under both `desktop` and `phone`; `npm test` still reports 16 test files and 178 tests.
- [x] 1.2 Dev-only map hook and test helpers: SupplyMap.client.vue sets `window.__supplyMap = map` inside `if (import.meta.dev)`; e2e/helpers.ts provides blocking of server.arcgisonline.com tiles, waiting for the map and route data, scrolling the map into view, projecting `[lat, lng]` to a page point, and the teal pixel probe from design "Canvas pixel probe for icon visibility". Verify: `npx nuxi typecheck` exits 0; after `npm run generate`, `grep -r __supplyMap .output/public` finds nothing. [after: 1.1]

## 2. Map tests

- [x] 2.1 Vending icons, legend and popup follow the 自動販賣機 toggle (e2e/map.spec.ts): the subject icon's centre pixel is teal and the legend lists 自動販賣機 on load, neither after clicking the 自動販賣機 chip, both again after a second click; clicking the icon opens a popup equal to `vendingLabel(name, vending)` for that record. Verify: `npm run test:e2e` passes these tests in both projects. [after: 1.2]
- [x] 2.2 重陽橋 and station selection (e2e/map.spec.ts): clicking the midpoint of the longest line of `重陽橋（人行道）` shows a popup reading `重陽橋（人行道）`, failing with the route name when the route is missing; after zooming to the first riverside station, clicking its marker shows the station name as the panel heading. Verify: `npm run test:e2e` passes all tests in both projects and exits 0. [after: 1.2, 2.1]

## 3. Docs

- [x] 3.1 README's development section documents `npm run test:e2e`, the one-time `npx playwright install chromium`, that the tests use the dev server and live data files, and that CI does not run them. Verify: content review of README.md; `git diff --stat .github` is empty for this change. [after: 2.2]

## 4. Type checker

- [x] 4.1 `npx nuxi typecheck` works after a clean install: package.json declares `typescript` (^5.9.3) and `vue-tsc` as dev dependencies, recorded in package-lock.json. Verify: after `npm ci`, `npm ls typescript vue-tsc` lists both, `npx nuxi typecheck` exits 0, and `npm test` and `npm run test:e2e` pass. [after: 1.1]
