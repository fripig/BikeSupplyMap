import { describe, expect, it, vi } from 'vitest'
import { createCyclingLoader, createJsonLoader, loadRoutes, loadSupplyData } from './load-data'

const ok = (body: unknown) => ({ ok: true, status: 200, json: async () => body })
const notFound = { ok: false, status: 404, json: async () => ({}) }

describe('loadSupplyData', () => {
  it('loads both files from under the base URL', async () => {
    const fetchFn = vi.fn(async (url: string) => ok(url.endsWith('stations.json') ? [{ id: 's' }] : [{ id: 'n1' }]))
    const data = await loadSupplyData(fetchFn, '/BikeSupplyMap/')
    expect(fetchFn.mock.calls.map(([url]) => url).sort()).toEqual([
      '/BikeSupplyMap/data/shops.json',
      '/BikeSupplyMap/data/stations.json',
    ])
    expect(data.stations).toHaveLength(1)
    expect(data.shops).toHaveLength(1)
  })

  it('rejects when shops.json returns a non-200 response', async () => {
    const fetchFn = vi.fn(async (url: string) => (url.endsWith('shops.json') ? notFound : ok([])))
    await expect(loadSupplyData(fetchFn, '/BikeSupplyMap/')).rejects.toThrow('shops.json: HTTP 404')
  })

  it('rejects when stations.json returns a non-200 response', async () => {
    const fetchFn = vi.fn(async (url: string) => (url.endsWith('stations.json') ? notFound : ok([])))
    await expect(loadSupplyData(fetchFn, '/BikeSupplyMap/')).rejects.toThrow('stations.json: HTTP 404')
  })
})

describe('createCyclingLoader', () => {
  const layer = { paths: [{ kind: 'cycleway', coords: [[25, 121.5], [25, 121.501]] }], points: [] }

  it('does not fetch until first called, then loads cycling.json under the base URL', async () => {
    const fetchFn = vi.fn(async () => ok(layer))
    const load = createCyclingLoader(fetchFn, '/BikeSupplyMap/')
    expect(fetchFn).not.toHaveBeenCalled()
    await expect(load()).resolves.toEqual(layer)
    expect(fetchFn.mock.calls).toEqual([['/BikeSupplyMap/data/cycling.json']])
  })

  it('reuses a successful load without fetching again', async () => {
    const fetchFn = vi.fn(async () => ok(layer))
    const load = createCyclingLoader(fetchFn, '/BikeSupplyMap/')
    await load()
    await load()
    expect(fetchFn).toHaveBeenCalledTimes(1)
  })

  it('rejects on HTTP 404 and retries on the next call', async () => {
    const fetchFn = vi.fn()
      .mockResolvedValueOnce(notFound)
      .mockResolvedValueOnce(ok(layer))
    const load = createCyclingLoader(fetchFn, '/BikeSupplyMap/')
    await expect(load()).rejects.toThrow('cycling.json: HTTP 404')
    await expect(load()).resolves.toEqual(layer)
    expect(fetchFn).toHaveBeenCalledTimes(2)
  })
})

describe('createJsonLoader', () => {
  it('loads the named file under the base URL on first call only', async () => {
    const data = { shelters: [] }
    const fetchFn = vi.fn(async () => ok(data))
    const load = createJsonLoader(fetchFn, '/BikeSupplyMap/', 'shelters.json')
    expect(fetchFn).not.toHaveBeenCalled()
    await expect(load()).resolves.toEqual(data)
    await load()
    expect(fetchFn.mock.calls).toEqual([['/BikeSupplyMap/data/shelters.json']])
  })
})

describe('loadRoutes', () => {
  it('loads routes.json under the base URL', async () => {
    const body = { routes: [{ kind: 'bridge', name: '華江橋自行車道', lines: [] }] }
    const fetchFn = vi.fn(async () => ok(body))
    await expect(loadRoutes(fetchFn, '/BikeSupplyMap/')).resolves.toEqual(body)
    expect(fetchFn.mock.calls).toEqual([['/BikeSupplyMap/data/routes.json']])
  })

  it('rejects on HTTP 404', async () => {
    await expect(loadRoutes(vi.fn(async () => notFound), '/BikeSupplyMap/')).rejects.toThrow('routes.json: HTTP 404')
  })
})
