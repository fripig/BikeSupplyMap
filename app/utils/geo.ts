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
