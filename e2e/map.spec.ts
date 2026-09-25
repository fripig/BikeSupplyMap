import { expect, test, type Page } from '@playwright/test'
import { vendingLabel } from '../app/utils/cycling'
import { haversineMeters } from '../app/utils/geo'
import type { RouteVending } from '../app/utils/load-data'
import { isVendingTeal, loadRoutes, loadStations, nextFrames, openMap, setView, toPagePoint, type LatLng } from './helpers'

const legend = (page: Page) => page.locator('.cycling-legend')
const vendingChip = (page: Page) => page.getByRole('button', { name: '自動販賣機' })

async function vendingDrawnAt(page: Page, at: LatLng) {
  await nextFrames(page)
  return isVendingTeal(page, await toPagePoint(page, at))
}

// The first route-side vending machine whose icon centre shows teal on load;
// others can sit under a neighbouring icon or an urban path line.
async function findVisibleVending(page: Page): Promise<RouteVending> {
  const { vending } = await loadRoutes(page)
  for (const v of vending) {
    await setView(page, [v.lat, v.lng], 17)
    if (await vendingDrawnAt(page, [v.lat, v.lng])) return v
  }
  throw new Error(`none of the ${vending.length} route-side vending icons is visible`)
}

test.beforeEach(async ({ page }) => {
  await openMap(page)
})

test('vending icons and legend entry follow the 自動販賣機 toggle', async ({ page }) => {
  const v = await findVisibleVending(page)
  const at: LatLng = [v.lat, v.lng]
  await expect(legend(page)).toContainText('自動販賣機')

  await vendingChip(page).click()
  await expect(vendingChip(page)).toHaveAttribute('aria-pressed', 'false')
  expect(await vendingDrawnAt(page, at)).toBe(false)
  await expect(legend(page)).not.toContainText('自動販賣機')

  await vendingChip(page).click()
  await expect(vendingChip(page)).toHaveAttribute('aria-pressed', 'true')
  expect(await vendingDrawnAt(page, at)).toBe(true)
  await expect(legend(page)).toContainText('自動販賣機')
})

test('a vending icon opens a popup matching its routes.json record', async ({ page }) => {
  const v = await findVisibleVending(page)
  const point = await toPagePoint(page, [v.lat, v.lng])
  await page.mouse.click(point.x, point.y)
  await expect(page.locator('.leaflet-popup-content')).toHaveText(vendingLabel(v.name, v.vending))
})

test('the 重陽橋 main span shows 重陽橋（人行道）', async ({ page }) => {
  const name = '重陽橋（人行道）'
  const route = (await loadRoutes(page)).routes.find((r) => r.name === name)
  if (!route) throw new Error(`routes.json has no route named ${name}`)
  const line = route.lines.reduce((a, b) => (b.length > a.length ? b : a))
  const at = line[Math.floor(line.length / 2)]!
  await setView(page, at, 17)
  const point = await toPagePoint(page, at)
  await page.mouse.click(point.x, point.y)
  await expect(page.locator('.leaflet-popup-content')).toHaveText(name)
})

test('a riverside station on a route can be selected', async ({ page }) => {
  // At zoom 18 the cluster radius (50 px) is about 27 m, so pick a station with
  // no other riverside station within 40 m; its marker is then never clustered.
  const riverside = (await loadStations(page)).filter((s) => s.riverside)
  const station = riverside.find((s) => riverside.every((o) => o === s || haversineMeters(s, o) > 40))
  if (!station) throw new Error('stations.json has no riverside station clear of neighbours')
  await setView(page, [station.lat, station.lng], 18)
  await page.getByTitle(station.name, { exact: true }).first().click()
  await expect(page.locator('.station-name')).toHaveText(station.name)
})
