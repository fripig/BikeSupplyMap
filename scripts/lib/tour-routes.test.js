import { describe, expect, it } from 'vitest'
import { TOUR_ROUTES, tourFromPage, tourLines } from './tour-routes.js'
import { lineString, multiLineString, tourPage, tourRecord } from './tour-page.fixture.js'

describe('TOUR_ROUTES', () => {
  it('lists the four 雙北 tours in site id order', () => {
    expect(TOUR_ROUTES).toEqual([
      { id: 'A01', name: '北海岸漫遊' },
      { id: 'A02', name: '單車淡蘭極東2日遊' },
      { id: 'A03', name: '舊草嶺環線' },
      { id: 'A07', name: '淡水河金色水岸' },
    ])
  })
})

describe('tourFromPage', () => {
  const a07 = tourRecord('A07', '淡水河金色水岸', [lineString([[121.5, 25.0], [121.6, 25.1]])])

  it('revives the tour with the requested id from the indexed payload', () => {
    const html = tourPage({ type: 'list', items: [1, 2] }, tourRecord('A01', '北海岸漫遊', []), a07)
    expect(tourFromPage(html, 'A07')).toEqual(a07)
  })

  it('unwraps Reactive and Ref wrappers inside the payload', () => {
    const entries = [['ShallowReactive', 1], { data: 2 }, ['ShallowReactive', 3], { $f: 4 }, ['Reactive', 5],
      { type: 6, info: 7, geometry: 10 }, 'tour', ['Ref', 8], { id: 9 }, 'A03', []]
    const html = `<script type="application/json" id="__NUXT_DATA__">${JSON.stringify(entries)}</script>`
    expect(tourFromPage(html, 'A03')).toEqual({ type: 'tour', info: { id: 'A03' }, geometry: [] })
  })

  it('returns null for a page without a payload', () => {
    expect(tourFromPage('<html><body>維護中</body></html>', 'A07')).toBeNull()
  })

  it('returns null when the payload holds a different tour', () => {
    expect(tourFromPage(tourPage(tourRecord('A02', '單車淡蘭極東2日遊', [])), 'A07')).toBeNull()
  })

  it('throws on a malformed payload', () => {
    expect(() => tourFromPage('<script id="__NUXT_DATA__">[1,</script>', 'A07')).toThrow()
  })
})

describe('tourLines', () => {
  it('turns a LineString into one [lat, lng] line rounded to 5 decimals', () => {
    const tour = tourRecord('A07', '淡水河金色水岸', [lineString([[121.511094, 25.047777], [121.51151, 25.04855]])])
    expect(tourLines(tour)).toEqual({ lines: [[[25.04778, 121.51109], [25.04855, 121.51151]]] })
  })

  it('reduces duplicate points and drops one-point MultiLineString parts', () => {
    const tour = tourRecord('A07', '淡水河金色水岸', [multiLineString([[[121.5, 25.0], [121.5, 25.0], [121.6, 25.1]], [[121.7, 25.2]]])])
    expect(tourLines(tour)).toEqual({ lines: [[[25, 121.5], [25.1, 121.6]]] })
  })

  it('keeps every geometry entry in order', () => {
    const tour = tourRecord('A01', '北海岸漫遊', [
      lineString([[121.5, 25.0], [121.6, 25.1]]),
      lineString([[121.6, 25.1], [121.7, 25.2]]),
    ])
    expect(tourLines(tour).lines).toHaveLength(2)
  })

  it('reports an invalid position outside Taiwan', () => {
    const tour = tourRecord('A01', '北海岸漫遊', [lineString([[0, 25.0], [121.6, 25.1]])])
    expect(tourLines(tour)).toEqual({ error: 'invalid position' })
  })

  it('returns no lines when every line has one point', () => {
    const tour = tourRecord('A01', '北海岸漫遊', [lineString([[121.5, 25.0], [121.5, 25.0]])])
    expect(tourLines(tour)).toEqual({ lines: [] })
  })
})
