import type { LatLng } from './geo'

export function directionsUrl(station: LatLng, shop: LatLng): string {
  return 'https://www.google.com/maps/dir/?api=1'
    + `&origin=${station.lat},${station.lng}`
    + `&destination=${shop.lat},${shop.lng}`
    + '&travelmode=walking'
}

// Shows a place in Google Maps without asking for directions.
export function mapsPlaceUrl(place: LatLng): string {
  return `https://www.google.com/maps/search/?api=1&query=${place.lat},${place.lng}`
}
