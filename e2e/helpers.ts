import type { Page } from '@playwright/test'
import type { Map as LeafletMap } from 'leaflet'
import type { RouteData } from '../app/utils/load-data'
import type { Station } from '../app/utils/geo'

declare global {
  interface Window {
    // Set by SupplyMap.client.vue in the dev server only.
    __supplyMap?: LeafletMap
  }
}

export type LatLng = [number, number]

// Opens the site with map tiles blocked, so tests never wait on the tile server
// and tile images never cover the canvas, and waits until routes are drawn.
export async function openMap(page: Page) {
  await page.route('https://server.arcgisonline.com/**', (route) => route.fulfill({ status: 204 }))
  await page.goto('')
  // The legend also appears when only the urban layer has loaded, so wait for
  // a route entry, which is added once routes.json has been drawn.
  await page.waitForFunction(() =>
    window.__supplyMap && document.querySelector('.cycling-legend')?.textContent?.includes('河濱自行車道'))
}

export const loadRoutes = async (page: Page) => (await page.request.get('data/routes.json')).json() as Promise<RouteData>
export const loadStations = async (page: Page) => (await page.request.get('data/stations.json')).json() as Promise<Station[]>

// Leaflet redraws its canvas on the next animation frame; wait for two to be safe.
export const nextFrames = (page: Page) =>
  page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))))

export async function setView(page: Page, center: LatLng, zoom: number) {
  await page.evaluate(([c, z]) => {
    window.__supplyMap!.setView(c, z, { animate: false })
  }, [center, zoom] as const)
  await nextFrames(page)
}

// Page coordinates of a map position, for mouse clicks and pixel probes. On
// phones the map sits below the controls and clicking a chip can scroll it out
// of view, so it is scrolled back first.
export async function toPagePoint(page: Page, at: LatLng) {
  await page.locator('.supply-map').scrollIntoViewIfNeeded()
  return page.evaluate((latlng) => {
    const map = window.__supplyMap!
    const p = map.latLngToContainerPoint(latlng)
    const box = map.getContainer().getBoundingClientRect()
    return { x: box.left + p.x, y: box.top + p.y }
  }, at)
}

// Whether the map canvas pixel at a page point is the vending icon fill
// (#0c8599), within 12 on each RGB channel.
export const isVendingTeal = (page: Page, point: { x: number, y: number }) => page.evaluate(({ x, y }) => {
  const canvas = document.elementsFromPoint(x, y).find((e): e is HTMLCanvasElement => e instanceof HTMLCanvasElement)
  if (!canvas) return false
  const box = canvas.getBoundingClientRect()
  const px = Math.round((x - box.left) * (canvas.width / box.width))
  const py = Math.round((y - box.top) * (canvas.height / box.height))
  const [r, g, b] = canvas.getContext('2d')!.getImageData(px, py, 1, 1).data
  return Math.abs(r! - 0x0c) <= 12 && Math.abs(g! - 0x85) <= 12 && Math.abs(b! - 0x99) <= 12
}, point)
