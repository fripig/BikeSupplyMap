import { nextTick } from 'vue'
import { describe, expect, it, vi } from 'vitest'
import { cyclingDashArray, cyclingVisibility, legendEntries, shelterLabel, showerLabel, toiletLabel, useCyclingToggle, useLazyToggle, useRouteData, vendingLabel } from './cycling'
import type { LegendFlags } from './cycling'
import { createJsonLoader } from './load-data'

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

describe('two switches sharing one loader', () => {
  it('fetches the shared file once across on and off of both switches', async () => {
    const data = { toilets: [], showers: [] }
    const fetchFn = vi.fn(async () => ({ ok: true, status: 200, json: async () => data }))
    const load = createJsonLoader(fetchFn, '/BikeSupplyMap/', 'facilities.json')
    const toilets = useLazyToggle(load, false)
    const showers = useLazyToggle(load, false)
    await toilets.start()
    await showers.start()
    expect(fetchFn).not.toHaveBeenCalled()
    toilets.show.value = true
    showers.show.value = true
    await flush()
    toilets.show.value = false
    showers.show.value = false
    await flush()
    toilets.show.value = true
    showers.show.value = true
    await flush()
    expect(fetchFn).toHaveBeenCalledTimes(1)
    expect(toilets.data.value).toBe(data)
    expect(showers.data.value).toBe(data)
  })
})

describe('legendEntries', () => {
  const ROUTES = ['河濱自行車道', '橋梁自行車道', '連接道路']
  const URBAN = ['自行車道', '自行車道（畫線）', '紅綠燈', '穿越道']
  const SHELTERS = ['橋下躲雨點', '涼亭躲雨點']
  const on = (...keys: string[]) => Object.fromEntries(
    ['routes', 'urban', 'vending', 'shelters', 'toilets', 'showers'].map((k) => [k, keys.includes(k)]),
  ) as unknown as LegendFlags

  it.each([
    [on('routes', 'vending', 'urban'), [...ROUTES, '自動販賣機', ...URBAN]],
    [on('routes', 'vending', 'shelters', 'toilets', 'showers', 'urban'), [...ROUTES, '自動販賣機', ...SHELTERS, '廁所', '淋浴', ...URBAN]],
    [on('routes', 'vending'), [...ROUTES, '自動販賣機']],
    [on('routes', 'shelters'), [...ROUTES, ...SHELTERS]],
    [on('routes', 'toilets'), [...ROUTES, '廁所']],
    [on('routes', 'showers'), [...ROUTES, '淋浴']],
    [on('routes'), ROUTES],
    [on('vending', 'urban'), URBAN],
    [on('vending', 'shelters'), SHELTERS],
    [on('vending', 'toilets', 'showers'), ['廁所', '淋浴']],
    [on('vending'), []],
  ])('%o', (flags, expected) => {
    expect(legendEntries(flags).map((e) => e.label)).toEqual(expected)
  })
})

describe('toiletLabel', () => {
  const NONE = { name: null, wheelchair: null, changing_table: null, unisex: null, fee: null }
  it.each([
    [{ ...NONE, wheelchair: 'yes', changing_table: 'yes', fee: 'no' }, '公廁 · 無障礙、尿布台、免費'],
    [{ ...NONE, name: '美堤公廁', wheelchair: 'limited', unisex: 'yes' }, '美堤公廁 · 部分無障礙、性別友善'],
    [NONE, '公廁'],
    [{ ...NONE, wheelchair: 'no', fee: 'yes' }, '公廁 · 收費'],
  ])('%o → %s', (toilet, expected) => {
    expect(toiletLabel(toilet)).toBe(expected)
  })
})

describe('showerLabel', () => {
  it.each([
    [{ kind: 'sports_centre', name: '萬華運動中心', fee: null }, '萬華運動中心 · 淋浴間（可能收費）'],
    [{ kind: 'shower', name: null, fee: 'no' }, '淋浴間 · 免費'],
    [{ kind: 'shower', name: null, fee: null }, '淋浴間'],
  ] as const)('%o → %s', (shower, expected) => {
    expect(showerLabel(shower)).toBe(expected)
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
