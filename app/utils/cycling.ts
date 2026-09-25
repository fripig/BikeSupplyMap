import { ref, shallowRef, watch, type Ref, type ShallowRef } from 'vue'
import type { CyclingData, CyclingPath, RouteData } from './load-data'

// Signals and crossings only mean something at street level.
export const CYCLING_POINTS_MIN_ZOOM = 16

// Which parts of the bike-path layer are on the map: lines and legend follow
// the switch once data is loaded; points also need street-level zoom.
export function cyclingVisibility(switchOn: boolean, loaded: boolean, zoom: number) {
  const paths = switchOn && loaded
  return { paths, points: paths && zoom >= CYCLING_POINTS_MIN_ZOOM }
}

// Separate cycleways are solid lines, painted lanes dashed.
export const cyclingDashArray = (kind: CyclingPath['kind']) => (kind === 'lane' ? '6 5' : undefined)

export interface CyclingToggle {
  show: Ref<boolean>
  data: ShallowRef<CyclingData | null>
  failed: Ref<boolean>
  // Loads the data if the switch is on; the page calls it once mounted, so
  // nothing is fetched while the page is pre-rendered.
  start: () => Promise<void>
}

// The layer's switch state, on by default. Data is loaded by `start()` and then
// whenever the switch is turned on without data; on failure the switch goes back
// off with `failed` set, and turning it on again retries. A successful load is
// never repeated.
export function useCyclingToggle(load: () => Promise<CyclingData>): CyclingToggle {
  const show = ref(true)
  const data = shallowRef<CyclingData | null>(null)
  const failed = ref(false)
  let started = false
  const ensureLoaded = async () => {
    if (!show.value || data.value) return
    failed.value = false
    try {
      data.value = await load()
    } catch (err) {
      console.error(err)
      failed.value = true
      show.value = false
    }
  }
  watch(show, () => {
    if (started) ensureLoaded()
  })
  const start = () => {
    started = true
    return ensureLoaded()
  }
  return { show, data, failed, start }
}

export interface LegendEntry {
  label: string
  // CSS modifier after `cycling-legend__`, naming the line or dot style.
  icon: string
}

// Popup text for a route-side vending machine: its name or 自動販賣機, then the
// food and drink types from its OSM `vending` value, deduplicated in first-seen
// order. Values that are not food or drink are left out.
const VENDING_TYPES: Record<string, string> = {
  drinks: '飲料', beverages: '飲料', water: '飲水', coffee: '咖啡',
  food: '食物', ice_cream: '食物', sweets: '食物', bread: '食物', milk: '食物', snacks: '食物',
}

export function vendingLabel(name: string | null, vending: string | null): string {
  const types = [...new Set((vending ?? '').split(';').map((v) => VENDING_TYPES[v.trim()]).filter(Boolean))]
  const label = name ?? '自動販賣機'
  return types.length ? `${label} · ${types.join('、')}` : label
}

// Legend entries: route lines whenever routes are drawn, route-side vending
// while routes are drawn and the 自動販賣機 category is on, and urban lines and
// the signal and crossing dots while the urban layer is on.
export function legendEntries(routesShown: boolean, urbanShown: boolean, vendingShown: boolean): LegendEntry[] {
  const entries: LegendEntry[] = []
  if (routesShown) {
    entries.push({ label: '河濱自行車道', icon: 'line cycling-legend__line--riverside' })
    entries.push({ label: '橋梁自行車道', icon: 'line cycling-legend__line--bridge' })
    if (vendingShown) entries.push({ label: '自動販賣機', icon: 'dot cycling-legend__dot--vending' })
  }
  if (urbanShown) {
    entries.push({ label: '自行車道', icon: 'line' })
    entries.push({ label: '自行車道（畫線）', icon: 'line cycling-legend__line--lane' })
    entries.push({ label: '紅綠燈', icon: 'dot cycling-legend__dot--signal' })
    entries.push({ label: '穿越道', icon: 'dot cycling-legend__dot--crossing' })
  }
  return entries
}

// Riverside and bridge routes, loaded once by `start()` after the page mounts.
// A failure sets `failed` and leaves `data` empty; there is no retry.
export function useRouteData(load: () => Promise<RouteData>) {
  const data = shallowRef<RouteData | null>(null)
  const failed = ref(false)
  const start = async () => {
    try {
      data.value = await load()
    } catch (err) {
      console.error(err)
      failed.value = true
    }
  }
  return { data, failed, start }
}
