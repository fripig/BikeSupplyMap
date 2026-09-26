import { ref, shallowRef, watch, type Ref, type ShallowRef } from 'vue'
import type { CyclingData, CyclingPath, RouteData, Shelter, Shower, Toilet } from './load-data'

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

export interface LazyToggle<T> {
  show: Ref<boolean>
  data: ShallowRef<T | null>
  failed: Ref<boolean>
  // Loads the data if the switch is on; the page calls it once mounted, so
  // nothing is fetched while the page is pre-rendered.
  start: () => Promise<void>
}

export type CyclingToggle = LazyToggle<CyclingData>

// A layer switch, on or off at first as `initiallyOn` says. Data is loaded by
// `start()` and then whenever the switch is turned on without data; on failure
// the switch goes back off with `failed` set, and turning it on again retries.
// A successful load is never repeated.
export function useLazyToggle<T>(load: () => Promise<T>, initiallyOn: boolean): LazyToggle<T> {
  const show = ref(initiallyOn)
  const data = shallowRef<T | null>(null)
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

// The urban bike-path layer's switch, on by default.
export const useCyclingToggle = (load: () => Promise<CyclingData>): CyclingToggle => useLazyToggle(load, true)

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

// Popup text for a rain shelter: `<name> · 橋下` or 高架橋下 under a bridge, and
// the shelter's name or 涼亭 otherwise.
export function shelterLabel(kind: Shelter['kind'], name: string | null): string {
  if (kind === 'bridge') return name ? `${name} · 橋下` : '高架橋下'
  return name ?? '涼亭'
}

// Popup text for a toilet: its name or 公廁, then the tagged attributes in a
// fixed order. Untagged attributes are left out rather than shown as missing.
export function toiletLabel(t: Pick<Toilet, 'name' | 'wheelchair' | 'changing_table' | 'unisex' | 'fee'>): string {
  const attributes = [
    t.wheelchair === 'yes' && '無障礙',
    t.wheelchair === 'limited' && '部分無障礙',
    t.changing_table === 'yes' && '尿布台',
    t.unisex === 'yes' && '性別友善',
    t.fee === 'no' && '免費',
    t.fee === 'yes' && '收費',
  ].filter(Boolean)
  const name = t.name ?? '公廁'
  return attributes.length ? `${name} · ${attributes.join('、')}` : name
}

// Popup text for a shower: a sports centre says its showers may be paid; an OSM
// shower shows its name or 淋浴間, then 免費 or 收費 when tagged.
export function showerLabel(s: Pick<Shower, 'kind' | 'name' | 'fee'>): string {
  if (s.kind === 'sports_centre') return `${s.name} · 淋浴間（可能收費）`
  const fee = s.fee === 'no' ? ' · 免費' : s.fee === 'yes' ? ' · 收費' : ''
  return `${s.name ?? '淋浴間'}${fee}`
}

// Which layers the legend describes; every flag is required so a new layer
// cannot be left out of the legend by accident.
export interface LegendFlags {
  routes: boolean
  urban: boolean
  vending: boolean
  shelters: boolean
  toilets: boolean
  showers: boolean
}

// Legend entries: route lines whenever routes are drawn, route-side vending
// while routes are drawn and the 自動販賣機 category is on, the two rain shelter
// icons, 廁所 and 淋浴 while their layers are drawn, and urban lines and the
// signal and crossing dots while the urban layer is on.
export function legendEntries(flags: LegendFlags): LegendEntry[] {
  const entries: LegendEntry[] = []
  if (flags.routes) {
    entries.push({ label: '河濱自行車道', icon: 'line cycling-legend__line--riverside' })
    entries.push({ label: '橋梁自行車道', icon: 'line cycling-legend__line--bridge' })
    entries.push({ label: '連接道路', icon: 'line cycling-legend__line--link' })
    if (flags.vending) entries.push({ label: '自動販賣機', icon: 'dot cycling-legend__dot--vending' })
  }
  if (flags.shelters) {
    entries.push({ label: '橋下躲雨點', icon: 'glyph cycling-legend__glyph--bridge' })
    entries.push({ label: '涼亭躲雨點', icon: 'glyph cycling-legend__glyph--shelter' })
  }
  if (flags.toilets) entries.push({ label: '廁所', icon: 'glyph cycling-legend__glyph--toilet' })
  if (flags.showers) entries.push({ label: '淋浴', icon: 'glyph cycling-legend__glyph--shower' })
  if (flags.urban) {
    entries.push({ label: '自行車道', icon: 'line' })
    entries.push({ label: '自行車道（畫線）', icon: 'line cycling-legend__line--lane' })
    entries.push({ label: '紅綠燈', icon: 'dot cycling-legend__dot--signal' })
    entries.push({ label: '穿越道', icon: 'dot cycling-legend__dot--crossing' })
  }
  return entries
}

// Riverside, bridge and link routes, loaded once by `start()` after the page mounts.
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
