import { expect, it } from 'vitest'
import { directionsUrl, mapsPlaceUrl } from './links'

it('builds a Google Maps walking directions URL', () => {
  expect(directionsUrl({ lat: 25.02605, lng: 121.5436 }, { lat: 25.0271, lng: 121.5442 }))
    .toBe('https://www.google.com/maps/dir/?api=1&origin=25.02605,121.5436&destination=25.0271,121.5442&travelmode=walking')
})

it.each([
  ['toilet', 25.07023, 121.50849, 'https://www.google.com/maps/search/?api=1&query=25.07023,121.50849'],
  ['station', 25.02605, 121.5436, 'https://www.google.com/maps/search/?api=1&query=25.02605,121.5436'],
])('builds a Google Maps place URL for a %s', (_, lat, lng, url) => {
  expect(mapsPlaceUrl({ lat, lng })).toBe(url)
})
