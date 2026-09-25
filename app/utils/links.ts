import type { LatLng } from './geo'

export function directionsUrl(station: LatLng, shop: LatLng): string {
  return 'https://www.google.com/maps/dir/?api=1'
    + `&origin=${station.lat},${station.lng}`
    + `&destination=${shop.lat},${shop.lng}`
    + '&travelmode=walking'
}
