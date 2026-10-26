// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { mapsLinkEvent, track, trackMapsLinks } from './analytics'

const withGtag = () => {
  const gtag = vi.fn()
  vi.stubGlobal('gtag', gtag)
  return gtag
}

afterEach(() => {
  vi.unstubAllGlobals()
  document.body.innerHTML = ''
})

describe('track', () => {
  it('sends an event through gtag', () => {
    const gtag = withGtag()
    track('toggle_layer', { layer: 'toilets', enabled: true })
    expect(gtag).toHaveBeenCalledWith('event', 'toggle_layer', { layer: 'toilets', enabled: true })
  })

  it('does nothing without gtag', () => {
    expect(() => track('toggle_layer')).not.toThrow()
  })
})

describe('mapsLinkEvent', () => {
  it('names walking directions open_directions and turns data-ga-* into params', () => {
    expect(mapsLinkEvent(
      'https://www.google.com/maps/dir/?api=1&origin=25,121&destination=25.1,121.1&travelmode=walking',
      { gaFrom: 'list', gaCategory: 'convenience', gaDistanceM: '120', other: 'x' },
    )).toEqual({ name: 'open_directions', params: { from: 'list', category: 'convenience', distance_m: 120 } })
  })

  it('names a place link open_map_place', () => {
    expect(mapsLinkEvent('https://www.google.com/maps/search/?api=1&query=25,121', { gaPlace: 'toilet' }))
      .toEqual({ name: 'open_map_place', params: { place: 'toilet' } })
  })

  it('ignores other links', () => {
    expect(mapsLinkEvent('https://www.openstreetmap.org/copyright', {})).toBeNull()
  })
})

describe('trackMapsLinks', () => {
  it('tracks a Google Maps link even when a parent stops the click', () => {
    const gtag = withGtag()
    document.body.innerHTML = '<div><a href="https://www.google.com/maps/search/?api=1&query=25,121" data-ga-place="shelter"><span>開啟</span></a></div>'
    document.querySelector('div')!.addEventListener('click', (e) => e.stopPropagation())
    const stop = trackMapsLinks(document)
    document.querySelector('a')!.addEventListener('click', (e) => e.preventDefault())
    document.querySelector('span')!.click()
    expect(gtag).toHaveBeenCalledWith('event', 'open_map_place', { place: 'shelter' })
    stop()
    document.querySelector('span')!.click()
    expect(gtag).toHaveBeenCalledTimes(1)
  })

  it('tracks a middle-click but not a right-click', () => {
    const gtag = withGtag()
    document.body.innerHTML = '<a href="https://www.google.com/maps/search/?api=1&query=25,121" data-ga-place="station">開啟</a>'
    trackMapsLinks(document)
    const link = document.querySelector('a')!
    link.dispatchEvent(new MouseEvent('auxclick', { bubbles: true, button: 2 }))
    link.dispatchEvent(new MouseEvent('auxclick', { bubbles: true, button: 1 }))
    expect(gtag).toHaveBeenCalledTimes(1)
  })
})
