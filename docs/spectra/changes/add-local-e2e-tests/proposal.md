## Why

The map behaviors added by `add-vending-and-bridge-supplements` — route-side vending icons and the 自動販賣機 legend entry following the category toggle, the 重陽橋 popup, and station selection on top of route lines — are drawn on a Leaflet canvas and were verified only by hand. `/spectra-verify` flagged the toggle as an uncovered scenario. A browser test that a developer runs locally catches regressions in these without clicking through the map each time.

## What Changes

- Add Playwright (`@playwright/test`) as a dev dependency with a `playwright.config.ts` that starts or reuses `npm run dev` on port 3000 and runs every test in two browser sizes: desktop (1280×800) and phone (375×812).
- Add an `npm run test:e2e` script. `npm test` keeps running Vitest only.
- Expose the Leaflet map instance on `window.__supplyMap` only in the dev server (`import.meta.dev`), so tests can turn a latitude and longitude into a screen point and read the canvas pixel there. Built output from `npm run generate` does not contain this hook.
- Add e2e tests under `e2e/` for four checks: vending icons and legend entry follow the 自動販賣機 toggle; a vending icon's popup matches its `routes.json` record; the 重陽橋 main span shows 重陽橋（人行道）; a riverside station can be selected.
- Document in README how to run the e2e tests and that CI does not run them.
- Declare `typescript` (^5.9.3) and `vue-tsc` as dev dependencies. `npx nuxi typecheck` needs them; they had only been present as extraneous packages in node_modules, and installing Playwright pruned them. TypeScript stays on major version 5 because vue-tsc 3 fails on TypeScript 7 (`ERR_PACKAGE_PATH_NOT_EXPORTED` for `typescript/lib/tsc`, observed on 2026-09-25).

## Non-Goals (optional)

- Running e2e tests in GitHub Actions or any CI workflow. The user asked for local use only.
- Visual snapshot comparison of whole screenshots; tiles and data change weekly.
- Fixing the verify and review suggestions of `add-vending-and-bridge-supplements` (bridge count by label, keeping the two vending type lists in step).

## Impact

- Affected specs: none
- Affected code:
  - New: playwright.config.ts, e2e/map.spec.ts, e2e/helpers.ts
  - Modified: package.json, package-lock.json, app/components/SupplyMap.client.vue, README.md, .gitignore
  - Removed: (none)
- Compatibility: no capability-level observable behavior changes. The dev-only hook is absent from the generated site.
