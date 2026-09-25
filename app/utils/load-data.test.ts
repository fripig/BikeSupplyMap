import { describe, expect, it, vi } from 'vitest'
import { loadSupplyData } from './load-data'

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
