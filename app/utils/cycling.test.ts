import { nextTick } from 'vue'
import { describe, expect, it, vi } from 'vitest'
import { cyclingDashArray, cyclingVisibility, legendEntries, useCyclingToggle, useRouteData } from './cycling'

const layer = { paths: [], points: [] }
const flush = async () => {
  await nextTick()
  await new Promise((r) => setTimeout(r, 0))
}

describe('cyclingVisibility', () => {
  it.each([
    [true, 15, false],
    [true, 16, true],
    [true, 18, true],
    [false, 18, false],
  ])('layer on=%s at zoom %i → points shown %s', (on, zoom, points) => {
    expect(cyclingVisibility(on, true, zoom).points).toBe(points)
  })

  it('draws lines at every zoom while the layer is on', () => {
    expect(cyclingVisibility(true, true, 10).paths).toBe(true)
    expect(cyclingVisibility(false, true, 10).paths).toBe(false)
  })

  it('shows nothing until the data is loaded', () => {
    expect(cyclingVisibility(true, false, 18)).toEqual({ paths: false, points: false })
  })
})

describe('cyclingDashArray', () => {
  it('draws cycleways solid and painted lanes dashed', () => {
    expect(cyclingDashArray('cycleway')).toBeUndefined()
    expect(cyclingDashArray('lane')).toBe('6 5')
  })
})

describe('useCyclingToggle', () => {
  it('starts on and loads once when started', async () => {
    const load = vi.fn(async () => layer)
    const toggle = useCyclingToggle(load)
    expect(toggle.show.value).toBe(true)
    await flush()
    expect(load).not.toHaveBeenCalled()
    await toggle.start()
    expect(load).toHaveBeenCalledTimes(1)
    expect(toggle.data.value).toBe(layer)
  })

  it('does not load on start when the switch was turned off first', async () => {
    const load = vi.fn(async () => layer)
    const toggle = useCyclingToggle(load)
    toggle.show.value = false
    await toggle.start()
    expect(load).not.toHaveBeenCalled()
    toggle.show.value = true
    await flush()
    expect(load).toHaveBeenCalledTimes(1)
  })

  it('turns the switch off with a failure flag on HTTP 404, and retries on the next turn-on', async () => {
    const load = vi.fn()
      .mockRejectedValueOnce(new Error('cycling.json: HTTP 404'))
      .mockResolvedValueOnce(layer)
    const toggle = useCyclingToggle(load)
    vi.spyOn(console, 'error').mockImplementation(() => {})
    await toggle.start()
    await flush()
    expect(toggle.show.value).toBe(false)
    expect(toggle.failed.value).toBe(true)
    expect(toggle.data.value).toBeNull()

    toggle.show.value = true
    await flush()
    expect(toggle.show.value).toBe(true)
    expect(toggle.failed.value).toBe(false)
    expect(toggle.data.value).toBe(layer)
  })

  it('does not load again when turned off and on after a successful load', async () => {
    const load = vi.fn(async () => layer)
    const toggle = useCyclingToggle(load)
    await toggle.start()
    toggle.show.value = false
    await flush()
    toggle.show.value = true
    await flush()
    expect(load).toHaveBeenCalledTimes(1)
  })
})

describe('legendEntries', () => {
  const labels = (routes: boolean, urban: boolean) => legendEntries(routes, urban).map((e) => e.label)

  it.each([
    [true, true, ['河濱自行車道', '橋梁自行車道', '自行車道', '自行車道（畫線）', '紅綠燈', '穿越道']],
    [true, false, ['河濱自行車道', '橋梁自行車道']],
    [false, true, ['自行車道', '自行車道（畫線）', '紅綠燈', '穿越道']],
    [false, false, []],
  ])('routes drawn=%s, urban on=%s', (routes, urban, expected) => {
    expect(labels(routes, urban)).toEqual(expected)
  })
})

describe('useRouteData', () => {
  it('loads the routes when started', async () => {
    const data = { routes: [] }
    const routes = useRouteData(vi.fn(async () => data))
    expect(routes.data.value).toBeNull()
    await routes.start()
    expect(routes.data.value).toBe(data)
    expect(routes.failed.value).toBe(false)
  })

  it('sets the failure flag and draws nothing on HTTP 404', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const routes = useRouteData(vi.fn(async () => { throw new Error('routes.json: HTTP 404') }))
    await routes.start()
    expect(routes.failed.value).toBe(true)
    expect(routes.data.value).toBeNull()
  })
})
