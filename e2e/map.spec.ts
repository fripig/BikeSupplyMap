import { expect, test, type Page } from '@playwright/test'
import { shelterLabel, showerLabel, toiletLabel, vendingLabel } from '../app/utils/cycling'
import { haversineMeters } from '../app/utils/geo'
import { formatDistance } from '../app/utils/format'
import { mapsPlaceUrl } from '../app/utils/links'
import type { FacilityData, RouteVending, ShelterData } from '../app/utils/load-data'
import { isCanvasColor, isVendingTeal, loadRoutes, loadStations, nextFrames, openMap, setView, settleMap, toPagePoint, type LatLng } from './helpers'

const legend = (page: Page) => page.locator('.cycling-legend')
const vendingChip = (page: Page) => page.getByRole('button', { name: '自動販賣機' })
// The switch input is visually hidden; its label takes the click.
const shelterSwitch = (page: Page) => page.locator('label.switch', { hasText: '躲雨點' })
const shelterIcons = (page: Page) => page.locator('.shelter-icon')
const facilitySwitch = (page: Page, label: '廁所' | '淋浴') => page.locator('label.switch', { hasText: new RegExp(`^${label}$`) })
const toiletIcons = (page: Page) => page.locator('.facility-icon--toilet')
const showerIcons = (page: Page) => page.locator('.facility-icon--shower')
const facilityRequests = (page: Page) => page.evaluate(() =>
  performance.getEntriesByType('resource').filter((e) => e.name.endsWith('/data/facilities.json')).length)

// A place popup shows its text, then a link opening the place in Google Maps.
async function expectPlacePopup(page: Page, label: string, place: { lat: number, lng: number }) {
  const popup = page.locator('.leaflet-popup-content')
  await expect(popup).toHaveText(`${label}在 Google 地圖開啟`)
  const link = popup.getByRole('link', { name: '在 Google 地圖開啟' })
  await expect(link).toHaveAttribute('href', mapsPlaceUrl(place))
  await expect(link).toHaveAttribute('target', '_blank')
}

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
  await expectPlacePopup(page, vendingLabel(v.name, v.vending), v)
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

test('the 環騎臺北 link line shows its name and is in the legend', async ({ page }) => {
  const name = '環騎臺北（連接道路）'
  const route = (await loadRoutes(page)).routes.find((r) => r.kind === 'link' && r.name === name)
  if (!route) throw new Error(`routes.json has no link route named ${name}`)
  await expect(legend(page)).toContainText('連接道路')
  const line = route.lines.reduce((a, b) => (b.length > a.length ? b : a))
  const at = line[Math.floor(line.length / 2)]!
  await setView(page, at, 17)
  const point = await toPagePoint(page, at)
  await page.mouse.click(point.x, point.y)
  await expect(page.locator('.leaflet-popup-content')).toHaveText(name)
})

const CIVIC = '環騎臺北替代道路（市民大道-莊敬隧道段）'
const loopGroup = (page: Page) => page.locator('fieldset', { has: page.locator('legend', { hasText: /^環線$/ }) })
const loopSwitch = (page: Page, name: string) => loopGroup(page).locator('label.switch', { hasText: name })
const popup = (page: Page) => page.locator('.leaflet-popup-content')

// An optional route and the middle point of its longest line.
async function optionalRoute(page: Page, name: string) {
  const route = (await loadRoutes(page)).routes.find((r) => r.optional && r.name === name)
  if (!route) throw new Error(`routes.json has no optional route named ${name}`)
  const line = route.lines.reduce((a, b) => (b.length > a.length ? b : a))
  return { route, at: line[Math.floor(line.length / 2)]! }
}
const civicRoute = (page: Page) => optionalRoute(page, CIVIC)

async function clickAt(page: Page, at: LatLng) {
  await setView(page, at, 17)
  const point = await toPagePoint(page, at)
  await page.mouse.click(point.x, point.y)
}

const mapView = (page: Page) => page.evaluate(() => {
  const map = window.__supplyMap!
  return { center: map.getCenter(), zoom: map.getZoom() }
})

test('optional loops are listed in 環線, all off, and not drawn on load', async ({ page }) => {
  const optional = (await loadRoutes(page)).routes.filter((r) => r.optional).map((r) => r.name)
  expect(optional).toEqual([
    '環騎臺北替代道路（深南路-南深路段）',
    CIVIC,
    '環騎臺北替代道路（研究院路-莊敬隧道段）',
    '北海岸漫遊',
    '舊草嶺環線',
    '淡水河金色水岸',
  ])
  const switches = loopGroup(page).getByRole('switch')
  await expect(loopGroup(page).locator('label.switch')).toHaveText(optional)
  for (const s of await switches.all()) await expect(s).not.toBeChecked()
  const { route, at } = await civicRoute(page)
  await clickAt(page, at)
  await expect(popup(page)).toHaveCount(0)
  const v = route.vending?.[0]
  if (!v) throw new Error(`${CIVIC} has no vending machine of its own`)
  await setView(page, [v.lat, v.lng], 17)
  expect(await vendingDrawnAt(page, [v.lat, v.lng])).toBe(false)
})

test('turning the 市民大道-莊敬隧道段 switch on frames and draws it, and off removes it without moving the map', async ({ page }) => {
  const { route, at } = await civicRoute(page)
  const points = route.lines.flat()
  await loopSwitch(page, CIVIC).click()
  await expect(loopGroup(page).getByRole('switch', { name: CIVIC })).toBeChecked()
  await settleMap(page)
  const framed = await page.evaluate((pts) => {
    const bounds = window.__supplyMap!.getBounds()
    return pts.every((p) => bounds.contains(p))
  }, points)
  expect(framed).toBe(true)

  const v = route.vending?.[0]
  if (!v) throw new Error(`${CIVIC} has no vending machine of its own`)
  await setView(page, [v.lat, v.lng], 17)
  expect(await vendingDrawnAt(page, [v.lat, v.lng])).toBe(true)

  await clickAt(page, at)
  await expect(popup(page)).toHaveText(CIVIC)
  await page.keyboard.press('Escape')

  const before = await mapView(page)
  await loopSwitch(page, CIVIC).click()
  await expect(loopGroup(page).getByRole('switch', { name: CIVIC })).not.toBeChecked()
  await settleMap(page)
  expect(await mapView(page)).toEqual(before)
  await setView(page, [v.lat, v.lng], 17)
  expect(await vendingDrawnAt(page, [v.lat, v.lng])).toBe(false)
  await clickAt(page, at)
  await expect(popup(page)).toHaveCount(0)
})

test('a loop\'s vending icons follow the 自動販賣機 toggle while the loop stays drawn', async ({ page }) => {
  const { route, at } = await civicRoute(page)
  const v = route.vending?.[0]
  if (!v) throw new Error(`${CIVIC} has no vending machine of its own`)
  await loopSwitch(page, CIVIC).click()
  await setView(page, [v.lat, v.lng], 17)
  expect(await vendingDrawnAt(page, [v.lat, v.lng])).toBe(true)
  await vendingChip(page).click()
  expect(await vendingDrawnAt(page, [v.lat, v.lng])).toBe(false)
  await vendingChip(page).click()
  expect(await vendingDrawnAt(page, [v.lat, v.lng])).toBe(true)
  await clickAt(page, at)
  await expect(popup(page)).toHaveText(CIVIC)
})

test('turning the 淡水河金色水岸 tour on frames it and its line shows the name', async ({ page }) => {
  const name = '淡水河金色水岸'
  const { route, at } = await optionalRoute(page, name)
  await loopSwitch(page, name).click()
  await expect(loopGroup(page).getByRole('switch', { name })).toBeChecked()
  await settleMap(page)
  const framed = await page.evaluate((pts) => {
    const bounds = window.__supplyMap!.getBounds()
    return pts.every((p) => bounds.contains(p))
  }, route.lines.flat())
  expect(framed).toBe(true)
  await clickAt(page, at)
  await expect(popup(page)).toHaveText(name)
})

const TAMSUI = '淡水河金色水岸'
const LOOP_RED = '#f03e3e'
const stopMarker = (page: Page, label: string) => page.locator(`.route-stop-icon[title="${label}"]`)

test('a shown loop is drawn in the highlight color above the riverside line it runs on', async ({ page }) => {
  const { routes, vending } = await loadRoutes(page)
  const tour = routes.find((r) => r.name === TAMSUI)!
  const riverside = routes.filter((r) => r.kind === 'riverside').flatMap((r) => r.lines.flat())
  const vendingNear = (p: LatLng) => [...vending, ...(tour.vending ?? [])].some((v) => haversineMeters({ lat: p[0], lng: p[1] }, v) < 40)
  // A tour vertex that is also a riverside vertex, clear of vending icons and
  // away from the tour's ends, where the stop markers sit.
  const points = tour.lines.flatMap((line) => line.slice(5, -5))
  const at = points.find((p) => !vendingNear(p) && riverside.some((q) => haversineMeters({ lat: p[0], lng: p[1] }, { lat: q[0], lng: q[1] }) < 2))
  if (!at) throw new Error(`${TAMSUI} shares no vertex with a riverside line`)
  await setView(page, at, 17)
  expect(await isCanvasColor(page, await toPagePoint(page, at), LOOP_RED)).toBe(false)
  await loopSwitch(page, TAMSUI).click()
  await settleMap(page)
  await setView(page, at, 17)
  expect(await isCanvasColor(page, await toPagePoint(page, at), LOOP_RED)).toBe(true)
})

test('a tour shows its start and end markers while its switch is on', async ({ page }) => {
  await expect(stopMarker(page, '起點：臺北府城北門')).toHaveCount(0)
  await loopSwitch(page, TAMSUI).click()
  await expect(stopMarker(page, '起點：臺北府城北門')).toHaveCount(1)
  await expect(stopMarker(page, '終點：捷運紅樹林車站')).toHaveCount(1)
  await loopSwitch(page, TAMSUI).click()
  await expect(stopMarker(page, '起點：臺北府城北門')).toHaveCount(0)
  await expect(stopMarker(page, '終點：捷運紅樹林車站')).toHaveCount(0)
})

test('a stop popup offers the nearest YouBike station and selects it', async ({ page }) => {
  const start = (await loadRoutes(page)).routes.find((r) => r.name === TAMSUI)!.stops!.find((s) => s.kind === 'start')!
  const stations = await loadStations(page)
  const nearest = stations.reduce((a, b) => (haversineMeters(start, b) < haversineMeters(start, a) ? b : a))
  await loopSwitch(page, TAMSUI).click()
  await settleMap(page)
  await stopMarker(page, '起點：臺北府城北門').click()
  await expect(popup(page)).toContainText('起點：臺北府城北門')
  await expect(popup(page)).toContainText(`最近的 YouBike：${nearest.name}（${formatDistance(haversineMeters(start, nearest))}）`)
  await expect(popup(page).getByRole('link', { name: '在 Google 地圖開啟' })).toHaveAttribute('href', mapsPlaceUrl(start))
  await popup(page).getByRole('button', { name: '選這個站' }).click()
  await expect(popup(page)).toHaveCount(0)
  await expect(page.locator('.station-name')).toHaveText(nearest.name)
})

test('the footer credits 交通部自行車旅遊網 for the tour routes', async ({ page }) => {
  const credits = page.locator('footer.credits')
  await expect(credits).toContainText('推薦遊程路線來源：交通部自行車旅遊網')
  await expect(credits.getByRole('link', { name: '交通部自行車旅遊網' })).toHaveAttribute('href', 'https://taiwanbike.tw/bikeRoute/tour')
})

test('the head carries a canonical link, one description and WebApplication JSON-LD', async ({ page }) => {
  const siteUrl = 'https://fripig.github.io/BikeSupplyMap/'
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', siteUrl)
  const description = await page.locator('meta[name="description"]').getAttribute('content')
  expect(description).toBeTruthy()
  await expect(page.locator('meta[property="og:description"]')).toHaveAttribute('content', description!)
  const jsonLd = JSON.parse(await page.locator('script[type="application/ld+json"]').textContent() ?? '')
  expect(jsonLd).toMatchObject({
    '@type': 'WebApplication',
    name: '雙北 YouBike 補給地圖',
    url: siteUrl,
    description,
    inLanguage: 'zh-Hant-TW',
    applicationCategory: 'TravelApplication',
    operatingSystem: 'Any',
    isAccessibleForFree: true,
    areaServed: [{ '@type': 'City', name: '臺北市' }, { '@type': 'City', name: '新北市' }],
  })
})

test('no 環線 group is shown when routes.json fails to load', async ({ page }) => {
  await page.route('**/data/routes.json', (route) => route.fulfill({ status: 404, body: 'not found' }))
  await page.reload()
  await expect(page.getByRole('alert').filter({ hasText: '自行車道資料載入失敗' })).toBeVisible()
  await expect(loopGroup(page)).toHaveCount(0)
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

test('rain shelters are not fetched until the 躲雨點 switch is turned on', async ({ page }) => {
  const requested = () => page.evaluate(() =>
    performance.getEntriesByType('resource').some((e) => e.name.endsWith('/data/shelters.json')))
  expect(await requested()).toBe(false)
  await expect(shelterIcons(page)).toHaveCount(0)
  await expect(legend(page)).not.toContainText('橋下躲雨點')

  await shelterSwitch(page).click()
  await expect(legend(page)).toContainText('橋下躲雨點')
  await expect(legend(page)).toContainText('涼亭躲雨點')
  expect(await requested()).toBe(true)
  expect(await shelterIcons(page).count()).toBeGreaterThan(0)

  await shelterSwitch(page).click()
  await expect(shelterIcons(page)).toHaveCount(0)
  await expect(legend(page)).not.toContainText('橋下躲雨點')
})

test('a bridge shelter icon shows its name with 橋下', async ({ page }) => {
  const { shelters } = await (await page.request.get('data/shelters.json')).json() as ShelterData
  // A named bridge spot with no riverside station close enough to cover its icon.
  const riverside = (await loadStations(page)).filter((s) => s.riverside)
  const spot = shelters.find((s) => s.kind === 'bridge' && s.name
    && riverside.every((st) => haversineMeters(st, s) > 40))
  if (!spot) throw new Error('shelters.json has no named bridge spot clear of stations')
  await shelterSwitch(page).click()
  await setView(page, [spot.lat, spot.lng], 17)
  const label = shelterLabel(spot.kind, spot.name)
  await page.getByTitle(label, { exact: true }).first().click()
  await expectPlacePopup(page, label, spot)
})

test('a failed shelters.json load shows a message, turns the switch off and leaves stations working', async ({ page }) => {
  await page.route('**/data/shelters.json', (route) => route.fulfill({ status: 404, body: 'not found' }))
  await shelterSwitch(page).click()
  await expect(page.getByRole('alert').filter({ hasText: '躲雨點資料載入失敗' })).toBeVisible()
  await expect(page.getByRole('switch', { name: '躲雨點' })).not.toBeChecked()
  await expect(shelterIcons(page)).toHaveCount(0)
  // Same station choice as the riverside station test below.
  const riverside = (await loadStations(page)).filter((s) => s.riverside)
  const station = riverside.find((s) => riverside.every((o) => o === s || haversineMeters(s, o) > 40))!
  await setView(page, [station.lat, station.lng], 18)
  await page.getByTitle(station.name, { exact: true }).first().click()
  await expect(page.locator('.station-name')).toHaveText(station.name)
})

test('a station marker overlapping a shelter icon stays selectable', async ({ page }) => {
  const { shelters } = await (await page.request.get('data/shelters.json')).json() as ShelterData
  // A riverside station with a shelter within 15 m and no other riverside
  // station within 70 m, so at zoom 17 it is not clustered.
  const riverside = (await loadStations(page)).filter((s) => s.riverside)
  const station = riverside.find((st) => riverside.every((o) => o === st || haversineMeters(st, o) > 70)
    && shelters.some((s) => haversineMeters(st, s) <= 15))
  if (!station) throw new Error('no riverside station has a shelter within 15 m')
  await shelterSwitch(page).click()
  await expect(shelterIcons(page).first()).toBeVisible()
  await setView(page, [station.lat, station.lng], 17)
  const marker = page.getByTitle(station.name, { exact: true }).first()
  // On phones the map sits below the controls, so the marker can start below the viewport.
  await marker.scrollIntoViewIfNeeded()
  const a = (await marker.boundingBox())!
  // Click inside the area where the station marker and a shelter icon overlap.
  let overlap: { x: number, y: number } | undefined
  for (const icon of await shelterIcons(page).all()) {
    const b = await icon.boundingBox()
    if (!b) continue
    const left = Math.max(a.x, b.x)
    const right = Math.min(a.x + a.width, b.x + b.width)
    const top = Math.max(a.y, b.y)
    const bottom = Math.min(a.y + a.height, b.y + b.height)
    if (left < right && top < bottom) overlap = { x: (left + right) / 2, y: (top + bottom) / 2 }
  }
  if (!overlap) throw new Error(`no shelter icon overlaps the ${station.name} marker at zoom 17`)
  await page.mouse.click(overlap.x, overlap.y)
  await expect(page.locator('.station-name')).toHaveText(station.name)
})

test('toilets and showers load once, only when a switch is turned on, and follow their own switch', async ({ page }) => {
  expect(await facilityRequests(page)).toBe(0)
  await expect(toiletIcons(page)).toHaveCount(0)

  await facilitySwitch(page, '廁所').click()
  await expect(legend(page)).toContainText('廁所')
  expect(await toiletIcons(page).count()).toBeGreaterThan(0)
  await expect(showerIcons(page)).toHaveCount(0)
  await expect(legend(page)).not.toContainText('淋浴')

  await facilitySwitch(page, '淋浴').click()
  await expect(legend(page)).toContainText('淋浴')
  expect(await showerIcons(page).count()).toBeGreaterThan(0)
  expect(await facilityRequests(page)).toBe(1)

  await facilitySwitch(page, '廁所').click()
  await expect(toiletIcons(page)).toHaveCount(0)
  await expect(legend(page)).not.toContainText('廁所')
  expect(await showerIcons(page).count()).toBeGreaterThan(0)
})

test('a toilet icon shows its name and tagged attributes', async ({ page }) => {
  const { toilets } = await (await page.request.get('data/facilities.json')).json() as FacilityData
  // A toilet with a tagged attribute and no riverside station or other toilet
  // close enough to cover its icon.
  const riverside = (await loadStations(page)).filter((s) => s.riverside)
  const toilet = toilets.find((t) => t.wheelchair === 'yes'
    && riverside.every((st) => haversineMeters(st, t) > 40)
    && toilets.every((o) => o === t || haversineMeters(o, t) > 40))
  if (!toilet) throw new Error('facilities.json has no wheelchair toilet clear of stations and other toilets')
  await facilitySwitch(page, '廁所').click()
  await setView(page, [toilet.lat, toilet.lng], 17)
  const label = toiletLabel(toilet)
  await page.getByTitle(label, { exact: true }).first().click()
  await expectPlacePopup(page, label, toilet)
})

test('a shower icon shows its label and a Google Maps link', async ({ page }) => {
  const { showers } = await (await page.request.get('data/facilities.json')).json() as FacilityData
  const stations = await loadStations(page)
  const shower = showers.find((sh) => stations.every((st) => haversineMeters(st, sh) > 40)
    && showers.every((o) => o === sh || haversineMeters(o, sh) > 40))
  if (!shower) throw new Error('facilities.json has no shower clear of stations and other showers')
  await facilitySwitch(page, '淋浴').click()
  await setView(page, [shower.lat, shower.lng], 17)
  const label = showerLabel(shower)
  await page.getByTitle(label, { exact: true }).first().click()
  await expectPlacePopup(page, label, shower)
})

test('a failed facilities.json load shows a message under 廁所 and leaves stations working', async ({ page }) => {
  await page.route('**/data/facilities.json', (route) => route.fulfill({ status: 404, body: 'not found' }))
  await facilitySwitch(page, '廁所').click()
  await expect(page.getByRole('alert').filter({ hasText: '廁所資料載入失敗' })).toBeVisible()
  await expect(page.getByRole('switch', { name: '廁所' })).not.toBeChecked()
  await expect(page.getByRole('switch', { name: '淋浴' })).not.toBeChecked()
  await expect(page.getByText('淋浴資料載入失敗')).toHaveCount(0)
  const riverside = (await loadStations(page)).filter((s) => s.riverside)
  const station = riverside.find((s) => riverside.every((o) => o === s || haversineMeters(s, o) > 40))!
  await setView(page, [station.lat, station.lng], 18)
  await page.getByTitle(station.name, { exact: true }).first().click()
  await expect(page.locator('.station-name')).toHaveText(station.name)
})

test('the 廁所 failure message clears once 淋浴 loads facilities.json', async ({ page }) => {
  await page.route('**/data/facilities.json', (route) => route.fulfill({ status: 404, body: 'not found' }))
  await facilitySwitch(page, '廁所').click()
  await expect(page.getByRole('alert').filter({ hasText: '廁所資料載入失敗' })).toBeVisible()
  await page.unroute('**/data/facilities.json')
  await facilitySwitch(page, '淋浴').click()
  await expect(showerIcons(page).first()).toBeAttached()
  await expect(page.getByText('廁所資料載入失敗')).toHaveCount(0)
})

const stationSwitch = (page: Page, label: '河濱站點' | '市區站點') => page.locator('label.switch', { hasText: new RegExp(`^${label}$`) })
const urbanMarkers = (page: Page) => page.locator('.station-icon--urban, .station-cluster--urban')

const riversideMarkers = (page: Page) => page.locator('.station-icon--riverside, .station-cluster--riverside')
// The selected station's shop list items and its shop and radius circles.
const selectionCounts = async (page: Page) => [
  await page.locator('.shop').count(),
  await page.locator('.leaflet-overlay-pane svg path').count(),
]

// Picks a station of the given kind with no other station within 40 m, whose
// shop list is not empty at the default radius.
async function selectLoneStation(page: Page, riverside: boolean) {
  const stations = await loadStations(page)
  for (const station of stations.filter((s) => s.riverside === riverside)) {
    if (stations.some((o) => o !== station && haversineMeters(station, o) <= 40)) continue
    await settleMap(page)
    await setView(page, [station.lat, station.lng], 18)
    await page.getByTitle(station.name, { exact: true }).first().click()
    await expect(page.locator('.station-name')).toHaveText(station.name)
    if (await page.locator('.shop').count() > 0) return station
  }
  throw new Error(`no lone ${riverside ? 'riverside' : 'urban'} station with nearby shops`)
}

test('station switches show and hide each kind of station and keep the selection', async ({ page }) => {
  await expect(page.getByRole('switch', { name: '河濱站點' })).toBeChecked()
  await expect(page.getByRole('switch', { name: '市區站點' })).not.toBeChecked()
  await expect(riversideMarkers(page).first()).toBeAttached()
  await expect(urbanMarkers(page)).toHaveCount(0)
  const station = await selectLoneStation(page, true)
  const counts = await selectionCounts(page)
  expect(counts[1]).toBeGreaterThan(counts[0]!)

  // 河濱 on, 市區 on: both kinds shown.
  await stationSwitch(page, '市區站點').click()
  await expect(urbanMarkers(page).first()).toBeAttached()
  await expect(riversideMarkers(page).first()).toBeAttached()
  // 河濱 off, 市區 on: only urban stations.
  await stationSwitch(page, '河濱站點').click()
  await expect(riversideMarkers(page)).toHaveCount(0)
  await expect(urbanMarkers(page).first()).toBeAttached()
  // 河濱 off, 市區 off: no station markers but the selected one.
  await stationSwitch(page, '市區站點').click()
  await expect(riversideMarkers(page)).toHaveCount(0)
  await expect(urbanMarkers(page)).toHaveCount(0)
  // The selected station keeps its highlight, name, shop list and shop markers.
  await expect(page.locator('.station-icon--selected')).toHaveCount(1)
  await expect(page.locator('.station-name')).toHaveText(station.name)
  expect(await selectionCounts(page)).toEqual(counts)

  await stationSwitch(page, '河濱站點').click()
  await expect(riversideMarkers(page).first()).toBeAttached()
  await expect(page.getByRole('switch', { name: '都市自行車道' })).toBeChecked()
  await expect(legend(page)).toContainText('自行車道（畫線）')
})

test('an urban station stays selected when 市區站點 is turned off', async ({ page }) => {
  await stationSwitch(page, '市區站點').click()
  const station = await selectLoneStation(page, false)
  const counts = await selectionCounts(page)
  await stationSwitch(page, '市區站點').click()
  await expect(urbanMarkers(page)).toHaveCount(0)
  await expect(page.locator('.station-icon--selected')).toHaveCount(1)
  await expect(page.locator('.station-name')).toHaveText(station.name)
  expect(await selectionCounts(page)).toEqual(counts)
})

test('the selected station links to its place in Google Maps', async ({ page }) => {
  const riverside = (await loadStations(page)).filter((s) => s.riverside)
  const [first, second] = riverside.filter((s) => riverside.every((o) => o === s || haversineMeters(s, o) > 40))
  const link = page.locator('.station-link')
  for (const station of [first!, second!]) {
    await settleMap(page)
    await setView(page, [station.lat, station.lng], 18)
    await page.getByTitle(station.name, { exact: true }).first().click()
    await expect(page.locator('.station-name')).toHaveText(station.name)
    await expect(link).toHaveText('在 Google 地圖開啟')
    await expect(link).toHaveAttribute('href', mapsPlaceUrl(station))
    await expect(link).toHaveAttribute('target', '_blank')
  }
})

// Computed size and colors of the first element matching the selector.
const iconStyle = (page: Page, selector: string) => page.locator(selector).first().evaluate((el) => {
  const s = getComputedStyle(el)
  return { outer: (el as HTMLElement).offsetWidth, width: s.width, height: s.height, background: s.backgroundColor, border: `${s.borderTopWidth} ${s.borderTopColor}`, svg: el.querySelectorAll('svg').length }
})

// Shows an isolated station of the given kind at zoom 18, so it is drawn as a marker.
async function showLoneStation(page: Page, riverside: boolean) {
  const stations = await loadStations(page)
  const station = stations.find((s) => s.riverside === riverside && stations.every((o) => o === s || haversineMeters(s, o) > 60))!
  await setView(page, [station.lat, station.lng], 18)
  return station
}

test('station markers and clusters of both kinds share one style', async ({ page }) => {
  await stationSwitch(page, '市區站點').click()
  await setView(page, [25.05, 121.52], 12)
  await expect(page.locator('.station-cluster--riverside').first()).toBeAttached()
  await expect(page.locator('.station-cluster--urban').first()).toBeAttached()
  await expect(page.locator('.marker-cluster')).toHaveCount(0)
  const riversideCluster = await iconStyle(page, '.station-cluster--riverside')
  expect(await iconStyle(page, '.station-cluster--urban')).toEqual(riversideCluster)
  // Icons render at the size Leaflet centres them by, borders included.
  expect(riversideCluster.outer).toBe(32)

  await showLoneStation(page, true)
  const riverside = await iconStyle(page, '.station-icon--riverside')
  expect(riverside.svg).toBe(1)
  expect(riverside.outer).toBe(18)
  const urban = await showLoneStation(page, false)
  expect(await iconStyle(page, '.station-icon--urban')).toEqual(riverside)

  await page.getByTitle(urban.name, { exact: true }).first().click()
  const selected = await iconStyle(page, '.station-icon--selected')
  expect(selected.svg).toBe(1)
  expect(parseFloat(selected.width)).toBeGreaterThan(parseFloat(riverside.width))
  expect(selected.outer).toBe(26)
  expect(selected.background).toBe('rgb(230, 119, 0)')
  expect(riverside.background).toBe('rgb(245, 166, 35)')
})

// A blank spot near `near` at `zoom`: the first of a few pixel offsets where
// nothing but the map is under the pointer and the bike canvas draws nothing.
// Returns its page point and its position rounded to 5 decimals as the site does.
async function findBlankSpot(page: Page, near: LatLng, zoom = 17) {
  await setView(page, near, zoom)
  const center = await toPagePoint(page, near)
  for (const [dx, dy] of [[-90, -70], [90, -70], [-90, 70], [90, 70], [0, -110], [0, 110]]) {
    // Whole pixels, so the point worked out here is the one the click reports.
    const at = { x: Math.round(center.x + dx!), y: Math.round(center.y + dy!) }
    const blank = await page.evaluate(({ x, y }) => {
      const top = document.elementFromPoint(x, y)
      if (!(top instanceof HTMLCanvasElement) && !top?.classList.contains('leaflet-container')) return false
      for (const canvas of document.querySelectorAll<HTMLCanvasElement>('.leaflet-pane canvas')) {
        const box = canvas.getBoundingClientRect()
        const px = Math.round((x - box.left) * (canvas.width / box.width))
        const py = Math.round((y - box.top) * (canvas.height / box.height))
        if (canvas.getContext('2d')!.getImageData(px, py, 1, 1).data[3] !== 0) return false
      }
      return true
    }, at)
    if (!blank) continue
    const point = await page.evaluate(({ x, y }) => {
      const map = window.__supplyMap!
      const box = map.getContainer().getBoundingClientRect()
      const { lat, lng } = map.containerPointToLatLng([x - box.left, y - box.top])
      return { lat: Math.round(lat * 1e5) / 1e5, lng: Math.round(lng * 1e5) / 1e5 }
    }, at)
    return { at, point }
  }
  throw new Error(`no blank spot near ${near}`)
}

// Clicks a blank spot near `near` at zoom 17 and returns the picked point.
async function clickBlankSpot(page: Page, near: LatLng) {
  const { at, point } = await findBlankSpot(page, near)
  await page.mouse.click(at.x, at.y)
  return point
}

// Longer than the site's 250 ms pick delay, for checks that nothing was picked.
const PICK_WAIT_MS = 400

// Taipei Main Station's surroundings: dense with shops, and urban stations are
// hidden by default, so blank spots are easy to find.
const TAIPEI_MAIN: LatLng = [25.0478, 121.517]

test('clicking a blank spot lists shops near it and its nearest station', async ({ page }) => {
  const stations = await loadStations(page)
  const point = await clickBlankSpot(page, TAIPEI_MAIN)
  const nearest = stations.reduce((a, b) => (haversineMeters(point, b) < haversineMeters(point, a) ? b : a))
  await expect(page.locator('.station-name')).toHaveText('地圖上選的地點')
  await expect(page.locator('.station-meta')).toHaveText(/^附近 \d+ 家$/)
  await expect(page.locator('.point-station')).toContainText(`最近的 YouBike：${nearest.name}（${formatDistance(haversineMeters(point, nearest))}）`)
  await expect(page.locator('.station-link')).toHaveAttribute('href', mapsPlaceUrl(point))
  const links = page.locator('.shop__link')
  const count = Number((await page.locator('.station-meta').textContent())!.match(/\d+/)![0])
  expect(count).toBeGreaterThan(0)
  await expect(links).toHaveCount(count)
  for (const href of await links.evaluateAll((as) => as.map((a) => (a as HTMLAnchorElement).href))) {
    expect(new URL(href).searchParams.get('origin')).toBe(`${point.lat},${point.lng}`)
  }
  const meters = (await page.locator('.shop__meta').allTextContents()).map((t) => Number(t.match(/(\d+) m$/)![1]))
  expect(meters).toEqual([...meters].sort((a, b) => a - b))
  await expect(page.locator('.map-point-icon')).toHaveCount(1)
})

test('選這個站 on a picked point selects the nearest station', async ({ page }) => {
  const stations = await loadStations(page)
  const point = await clickBlankSpot(page, TAIPEI_MAIN)
  const nearest = stations.reduce((a, b) => (haversineMeters(point, b) < haversineMeters(point, a) ? b : a))
  await page.getByRole('button', { name: '選這個站' }).click()
  await expect(page.locator('.station-name')).toHaveText(nearest.name)
  await expect(page.locator('.map-point-icon')).toHaveCount(0)
})

test('clicking the legend does not pick a point', async ({ page }) => {
  await clickBlankSpot(page, TAIPEI_MAIN)
  await page.getByRole('button', { name: '選這個站' }).click()
  const name = await page.locator('.station-name').textContent()
  await settleMap(page)
  await legend(page).click()
  await page.waitForTimeout(PICK_WAIT_MS)
  await expect(page.locator('.station-name')).toHaveText(name!)
})

test('clicking a vending dot, then a blank spot to close its popup, keeps the selected station', async ({ page }) => {
  await clickBlankSpot(page, TAIPEI_MAIN)
  await page.getByRole('button', { name: '選這個站' }).click()
  const name = await page.locator('.station-name').textContent()
  await settleMap(page)
  const v = await findVisibleVending(page)
  const at = await toPagePoint(page, [v.lat, v.lng])
  await page.mouse.click(at.x, at.y)
  await expect(popup(page)).toContainText(vendingLabel(v.name, v.vending))
  await page.waitForTimeout(PICK_WAIT_MS)
  await expect(page.locator('.station-name')).toHaveText(name!)
  await clickBlankSpot(page, [v.lat, v.lng])
  await expect(popup(page)).toHaveCount(0)
  await page.waitForTimeout(PICK_WAIT_MS)
  await expect(page.locator('.station-name')).toHaveText(name!)
})

test('double-clicking a blank spot zooms in without picking it', async ({ page }) => {
  await clickBlankSpot(page, TAIPEI_MAIN)
  await page.getByRole('button', { name: '選這個站' }).click()
  const name = await page.locator('.station-name').textContent()
  await settleMap(page)
  const { at } = await findBlankSpot(page, TAIPEI_MAIN, 15)
  await page.mouse.dblclick(at.x, at.y)
  await settleMap(page)
  await page.waitForTimeout(PICK_WAIT_MS)
  expect(await page.evaluate(() => window.__supplyMap!.getZoom())).toBe(16)
  await expect(page.locator('.station-name')).toHaveText(name!)
  await expect(page.locator('.map-point-icon')).toHaveCount(0)
})

test('a picked point with no station within 2 km says so', async ({ page }) => {
  const stations = await loadStations(page)
  // Hills and coast in 新北; the test takes the first more than 2.5 km from
  // every station, leaving room for the blank-spot offset.
  const candidates: LatLng[] = [[25.17, 121.56], [24.85, 121.55], [25.0, 121.8], [25.25, 121.62]]
  const far = candidates.find(([lat, lng]) => stations.every((s) => haversineMeters({ lat, lng }, s) > 2500))!
  expect(far).toBeTruthy()
  await clickBlankSpot(page, far)
  await expect(page.locator('.station-name')).toHaveText('地圖上選的地點')
  await expect(page.locator('.point-station')).toHaveText('2 km 內沒有 YouBike 站')
  await expect(page.getByRole('button', { name: '選這個站' })).toHaveCount(0)
})

test('selections and Google Maps links send analytics events', async ({ page }) => {
  // The dev server loads no Google Analytics, so a stub gtag records the events.
  // Google Maps links are kept from opening a tab; window's capture listener
  // runs before the site's, which still sees the click.
  await page.addInitScript(() => {
    const w = window as unknown as { events: unknown[][], gtag: (...args: unknown[]) => void }
    w.events = []
    w.gtag = (...args) => { w.events.push(args) }
    window.addEventListener('click', (e) => {
      if ((e.target as Element).closest?.('a[href^="https://www.google.com/maps/"]')) e.preventDefault()
    }, true)
  })
  await openMap(page)
  const events = () => page.evaluate(() =>
    (window as unknown as { events: unknown[][] }).events.filter(([kind]) => kind === 'event').map(([, name, params]) => [name, params]))

  const stations = await loadStations(page)
  const point = await clickBlankSpot(page, TAIPEI_MAIN)
  await expect.poll(events).toEqual([['pick_map_point', { has_station: true }]])

  const nearest = stations.reduce((a, b) => (haversineMeters(point, b) < haversineMeters(point, a) ? b : a))
  await page.getByRole('button', { name: '選這個站' }).click()
  await expect.poll(events).toContainEqual(['select_station', {
    station_name: nearest.name, station_kind: nearest.riverside ? 'riverside' : 'urban', via: 'map_point',
  }])

  await page.locator('.station-link').click()
  await expect.poll(events).toContainEqual(['open_map_place', { place: 'station' }])

  const shop = page.locator('.shop__link').first()
  const category = await shop.getAttribute('data-ga-category')
  const distance = Number(await shop.getAttribute('data-ga-distance-m'))
  expect(category).toBeTruthy()
  await shop.click()
  await expect.poll(events).toContainEqual(['open_directions', { from: 'list', category, distance_m: distance }])
})
