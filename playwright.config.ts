import { defineConfig, devices } from '@playwright/test'

// Browser tests for local development only; CI runs Vitest, not these.
// They run against the dev server, which exposes the map for the tests.
const baseURL = 'http://localhost:3000/BikeSupplyMap/'

export default defineConfig({
  testDir: 'e2e',
  fullyParallel: true,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: { baseURL, trace: 'retain-on-failure' },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 800 } } },
    {
      name: 'phone',
      use: { ...devices['Desktop Chrome'], viewport: { width: 375, height: 812 }, isMobile: true, hasTouch: true },
    },
  ],
  webServer: { command: 'npm run dev', url: baseURL, reuseExistingServer: true, timeout: 120_000 },
})
