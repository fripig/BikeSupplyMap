export type Category = 'convenience' | 'supermarket' | 'hypermarket' | 'grocery'

export interface LatLng {
  lat: number
  lng: number
}

export interface Station extends LatLng {
  id: string
  name: string
  city: string
  district: string
  // Within 200 m of an OSM riverside bike-path route; set at build time.
  riverside: boolean
}

export interface Shop extends LatLng {
  id: string
  name: string | null
  category: Category
}

export interface NearbyShop {
  shop: Shop
  distance: number
}

const EARTH_RADIUS_METERS = 6371008.8
const toRad = (deg: number) => (deg * Math.PI) / 180

export interface StationSplit {
  riverside: Station[]
  urban: Station[]
}

// Riverside stations are shown by default, urban ones behind the toggle. Data
// without any riverside flag (a cached pre-flag stations.json) keeps every
// station visible rather than showing an empty map.
export function splitStations(stations: Station[]): StationSplit {
  if (!stations.some((s) => typeof s.riverside === 'boolean')) return { riverside: stations, urban: [] }
  const split: StationSplit = { riverside: [], urban: [] }
  for (const s of stations) (s.riverside ? split.riverside : split.urban).push(s)
  return split
}

export function haversineMeters(a: LatLng, b: LatLng): number {
  const dLat = toRad(b.lat - a.lat)
  const dLng = toRad(b.lng - a.lng)
  const h = Math.sin(dLat / 2) ** 2
    + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2
  return 2 * EARTH_RADIUS_METERS * Math.asin(Math.sqrt(h))
}

export function nearbyShops(
  station: LatLng,
  shops: Shop[],
  radiusMeters: number,
  enabledCategories: ReadonlySet<Category>,
): NearbyShop[] {
  const result: NearbyShop[] = []
  for (const shop of shops) {
    if (!enabledCategories.has(shop.category)) continue
    const distance = haversineMeters(station, shop)
    if (distance <= radiusMeters) result.push({ shop, distance })
  }
  return result.sort((a, b) => a.distance - b.distance)
}
