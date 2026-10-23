import { expect, test, type Page } from '@playwright/test'
import { shelterLabel, showerLabel, toiletLabel, vendingLabel } from '../app/utils/cycling'
import { haversineMeters } from '../app/utils/geo'
import { mapsPlaceUrl } from '../app/utils/links'
import type { FacilityData, RouteVending, ShelterData } from '../app/utils/load-data'
import { isVendingTeal, loadRoutes, loadStations, nextFrames, openMap, setView, settleMap, toPagePoint, type LatLng } from './helpers'

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

const COAST = '北臺濱海環線（環島1-1）'
const loopGroup = (page: Page) => page.locator('fieldset', { has: page.locator('legend', { hasText: /^環線$/ }) })
const loopSwitch = (page: Page, name: string) => loopGroup(page).locator('label.switch', { hasText: name })
const popup = (page: Page) => page.locator('.leaflet-popup-content')

// The 北臺濱海環線 route and the middle point of its longest line.
async function coastRoute(page: Page) {
  const route = (await loadRoutes(page)).routes.find((r) => r.optional && r.name === COAST)
  if (!route) throw new Error(`routes.json has no optional route named ${COAST}`)
  const line = route.lines.reduce((a, b) => (b.length > a.length ? b : a))
  return { route, at: line[Math.floor(line.length / 2)]! }
}

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
    '環騎臺北替代道路（市民大道-莊敬隧道段）',
    '環騎臺北替代道路（研究院路-莊敬隧道段）',
    COAST,
  ])
  const switches = loopGroup(page).getByRole('switch')
  await expect(loopGroup(page).locator('label.switch')).toHaveText(optional)
  for (const s of await switches.all()) await expect(s).not.toBeChecked()
  const { route, at } = await coastRoute(page)
  await clickAt(page, at)
  await expect(popup(page)).toHaveCount(0)
  const v = route.vending?.[0]
  if (!v) throw new Error(`${COAST} has no vending machine of its own`)
  await setView(page, [v.lat, v.lng], 17)
  expect(await vendingDrawnAt(page, [v.lat, v.lng])).toBe(false)
})

test('turning the 北臺濱海環線 switch on frames and draws it, and off removes it without moving the map', async ({ page }) => {
  const { route, at } = await coastRoute(page)
  const points = route.lines.flat()
  await loopSwitch(page, COAST).click()
  await expect(loopGroup(page).getByRole('switch', { name: COAST })).toBeChecked()
  await settleMap(page)
  const framed = await page.evaluate((pts) => {
    const bounds = window.__supplyMap!.getBounds()
    return pts.every((p) => bounds.contains(p))
  }, points)
  expect(framed).toBe(true)

  const v = route.vending?.[0]
  if (!v) throw new Error(`${COAST} has no vending machine of its own`)
  await setView(page, [v.lat, v.lng], 17)
  expect(await vendingDrawnAt(page, [v.lat, v.lng])).toBe(true)

  await clickAt(page, at)
  await expect(popup(page)).toHaveText(COAST)
  await page.keyboard.press('Escape')

  const before = await mapView(page)
  await loopSwitch(page, COAST).click()
  await expect(loopGroup(page).getByRole('switch', { name: COAST })).not.toBeChecked()
  await settleMap(page)
  expect(await mapView(page)).toEqual(before)
  await setView(page, [v.lat, v.lng], 17)
  expect(await vendingDrawnAt(page, [v.lat, v.lng])).toBe(false)
  await clickAt(page, at)
  await expect(popup(page)).toHaveCount(0)
})

test('a loop\'s vending icons follow the 自動販賣機 toggle while the loop stays drawn', async ({ page }) => {
  const { route, at } = await coastRoute(page)
  const v = route.vending?.[0]
  if (!v) throw new Error(`${COAST} has no vending machine of its own`)
  await loopSwitch(page, COAST).click()
  await setView(page, [v.lat, v.lng], 17)
  expect(await vendingDrawnAt(page, [v.lat, v.lng])).toBe(true)
  await vendingChip(page).click()
  expect(await vendingDrawnAt(page, [v.lat, v.lng])).toBe(false)
  await vendingChip(page).click()
  expect(await vendingDrawnAt(page, [v.lat, v.lng])).toBe(true)
  await clickAt(page, at)
  await expect(popup(page)).toHaveText(COAST)
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
