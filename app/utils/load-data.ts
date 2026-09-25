import type { Shop, Station } from './geo'

export interface SupplyData {
  stations: Station[]
  shops: Shop[]
}

type Fetch = (url: string) => Promise<Pick<Response, 'ok' | 'status' | 'json'>>

export async function loadJson<T>(fetchFn: Fetch, baseURL: string, name: string): Promise<T> {
  const res = await fetchFn(`${baseURL}data/${name}`)
  if (!res.ok) throw new Error(`${name}: HTTP ${res.status}`)
  return res.json() as Promise<T>
}

// Rejects when either file cannot be loaded; the page then shows its error message.
export async function loadSupplyData(fetchFn: Fetch, baseURL: string): Promise<SupplyData> {
  const [stations, shops] = await Promise.all([
    loadJson<Station[]>(fetchFn, baseURL, 'stations.json'),
    loadJson<Shop[]>(fetchFn, baseURL, 'shops.json'),
  ])
  return { stations, shops }
}

export interface CyclingPath {
  kind: 'cycleway' | 'lane'
  coords: [number, number][]
}

export interface CyclingPoint {
  kind: 'signal' | 'crossing'
  lat: number
  lng: number
}

export interface CyclingData {
  paths: CyclingPath[]
  points: CyclingPoint[]
}

// cycling.json is fetched on first use only. A successful load is reused; a
// failed one is forgotten so the next call tries again.
export function createCyclingLoader(fetchFn: Fetch, baseURL: string): () => Promise<CyclingData> {
  let pending: Promise<CyclingData> | null = null
  return () => {
    pending ??= loadJson<CyclingData>(fetchFn, baseURL, 'cycling.json').catch((err) => {
      pending = null
      throw err
    })
    return pending
  }
}
