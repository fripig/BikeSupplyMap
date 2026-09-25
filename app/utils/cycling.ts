import { ref, shallowRef, watch, type Ref, type ShallowRef } from 'vue'
import type { CyclingData, CyclingPath } from './load-data'

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
