import { nextTick } from 'vue'
import { describe, expect, it, vi } from 'vitest'
import { cyclingDashArray, cyclingVisibility, legendEntries, shelterLabel, useCyclingToggle, useLazyToggle, useRouteData, vendingLabel } from './cycling'

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

describe('useLazyToggle starting off', () => {
  const shelters = { shelters: [] }

  it('does not load on start while off, then loads once across on, off and on', async () => {
    const load = vi.fn(async () => shelters)
    const toggle = useLazyToggle(load, false)
    expect(toggle.show.value).toBe(false)
    await toggle.start()
    expect(load).not.toHaveBeenCalled()
    toggle.show.value = true
    await flush()
    toggle.show.value = false
    await flush()
    toggle.show.value = true
    await flush()
    expect(load).toHaveBeenCalledTimes(1)
    expect(toggle.data.value).toBe(shelters)
  })

  it('turns back off with a failure flag, hides it while retrying, and retries on the next turn-on', async () => {
    let finishRetry = (_: typeof shelters) => {}
    const load = vi.fn()
      .mockRejectedValueOnce(new Error('shelters.json: HTTP 404'))
      .mockImplementationOnce(() => new Promise((resolve) => { finishRetry = resolve }))
    const toggle = useLazyToggle(load, false)
    vi.spyOn(console, 'error').mockImplementation(() => {})
    await toggle.start()
    toggle.show.value = true
    await flush()
    expect(toggle.show.value).toBe(false)
    expect(toggle.failed.value).toBe(true)
    toggle.show.value = true
    await flush()
    // The retry is still pending: the failure message is already hidden.
    expect(load).toHaveBeenCalledTimes(2)
    expect(toggle.data.value).toBeNull()
    expect(toggle.failed.value).toBe(false)
    finishRetry(shelters)
    await flush()
    expect(toggle.data.value).toBe(shelters)
    expect(toggle.show.value).toBe(true)
  })
})

describe('legendEntries', () => {
  const labels = (routes: boolean, vending: boolean, shelters: boolean, urban: boolean) =>
    legendEntries(routes, urban, vending, shelters).map((e) => e.label)
  const ROUTES = ['河濱自行車道', '橋梁自行車道', '連接道路']
  const URBAN = ['自行車道', '自行車道（畫線）', '紅綠燈', '穿越道']
  const SHELTERS = ['橋下躲雨點', '涼亭躲雨點']

  it.each([
    [true, true, false, true, [...ROUTES, '自動販賣機', ...URBAN]],
    [true, true, true, true, [...ROUTES, '自動販賣機', ...SHELTERS, ...URBAN]],
    [true, true, false, false, [...ROUTES, '自動販賣機']],
    [true, false, true, false, [...ROUTES, ...SHELTERS]],
    [true, false, false, false, ROUTES],
    [false, true, false, true, URBAN],
    [false, true, true, false, SHELTERS],
    [false, true, false, false, []],
  ])('routes drawn=%s, vending on=%s, shelters on=%s, urban on=%s', (routes, vending, shelters, urban, expected) => {
    expect(labels(routes, vending, shelters, urban)).toEqual(expected)
  })
})

describe('shelterLabel', () => {
  it.each([
    ['bridge', '中正橋', '中正橋 · 橋下'],
    ['bridge', null, '高架橋下'],
    ['shelter', '單車道終點涼亭', '單車道終點涼亭'],
    ['shelter', null, '涼亭'],
  ] as const)('%s + %s → %s', (kind, name, expected) => {
    expect(shelterLabel(kind, name)).toBe(expected)
  })
})

describe('vendingLabel', () => {
  it.each([
    [null, 'drinks', '自動販賣機 · 飲料'],
    ['黑松販賣機', 'coffee;food', '黑松販賣機 · 咖啡、食物'],
    [null, null, '自動販賣機'],
    [null, 'drinks;beverages;water', '自動販賣機 · 飲料、飲水'],
    [null, 'coffee;meals', '自動販賣機 · 咖啡'],
  ])('%s + %s → %s', (name, vending, expected) => {
    expect(vendingLabel(name, vending)).toBe(expected)
  })
})

describe('useRouteData', () => {
  it('loads the routes when started', async () => {
    const data = { routes: [], vending: [] }
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
