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
}

// The layer's switch state. Data is loaded the first time the switch is turned
// on; on failure the switch goes back off with `failed` set, and turning it on
// again retries.
export function useCyclingToggle(load: () => Promise<CyclingData>): CyclingToggle {
  const show = ref(false)
  const data = shallowRef<CyclingData | null>(null)
  const failed = ref(false)
  watch(show, async (on) => {
    if (!on || data.value) return
    failed.value = false
    try {
      data.value = await load()
    } catch (err) {
      console.error(err)
      failed.value = true
      show.value = false
    }
  })
  return { show, data, failed }
}
