import { expect, it } from 'vitest'
import { directionsUrl } from './links'

it('builds a Google Maps walking directions URL', () => {
  expect(directionsUrl({ lat: 25.02605, lng: 121.5436 }, { lat: 25.0271, lng: 121.5442 }))
    .toBe('https://www.google.com/maps/dir/?api=1&origin=25.02605,121.5436&destination=25.0271,121.5442&travelmode=walking')
})
