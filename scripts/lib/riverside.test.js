import { describe, expect, it } from 'vitest'
import { classifyRiverside, isRiversideRoute, riversideSegments } from './riverside.js'

describe('isRiversideRoute', () => {
  it.each([
    [{ name: '基隆河右岸自行車道' }, true],
    [{ name: '景美溪左岸自行車道' }, true],
    [{ name: '金色水岸自行車道' }, true],
    [{ name: '八里左岸自行車道' }, true],
    [{ name: '社子島環島自行車道' }, true],
    [{ name: '復興南北路自行車道' }, false],
    [{ name: '環島1號線 (順時針)' }, false],
    [{}, false],
  ])('%o → %s', (tags, expected) => {
    expect(isRiversideRoute({ route: 'bicycle', ...tags })).toBe(expected)
  })

  it('accepts the three explicitly named routes', () => {
    for (const name of ['關渡自行車道', '社子島環島自行車道', '二重環狀自行車道']) {
      expect(isRiversideRoute({ route: 'bicycle', name })).toBe(true)
    }
  })
})

describe('riversideSegments', () => {
  const geometry = [{ lat: 25.0, lon: 121.5 }, { lat: 25.0, lon: 121.51 }, { lat: 25.01, lon: 121.51 }]
  const body = {
    elements: [
      { type: 'relation', id: 1, tags: { route: 'bicycle', name: '基隆河右岸自行車道' }, members: [{ type: 'way', ref: 10 }] },
      { type: 'relation', id: 2, tags: { route: 'bicycle', name: '復興南北路自行車道' }, members: [{ type: 'way', ref: 20 }] },
      { type: 'way', id: 10, geometry },
      { type: 'way', id: 20, geometry },
    ],
  }

  it('keeps only member ways of riverside routes, split into segments', () => {
    const { routes, segments } = riversideSegments(body)
    expect(routes).toEqual(['基隆河右岸自行車道'])
    expect(segments).toEqual([
      [{ lat: 25.0, lng: 121.5 }, { lat: 25.0, lng: 121.51 }],
      [{ lat: 25.0, lng: 121.51 }, { lat: 25.01, lng: 121.51 }],
    ])
  })

  it('treats a relation without members as having no segments', () => {
    const noMembers = { elements: [{ type: 'relation', id: 1, tags: { route: 'bicycle', name: '基隆河右岸自行車道' } }] }
    expect(riversideSegments(noMembers)).toMatchObject({ routes: ['基隆河右岸自行車道'], segments: [] })
  })

  it('does not duplicate a way shared by two riverside routes', () => {
    const shared = {
      elements: [
        ...body.elements,
        { type: 'relation', id: 3, tags: { route: 'bicycle', name: '淡水河左岸自行車道' }, members: [{ type: 'way', ref: 10 }] },
      ],
    }
    expect(riversideSegments(shared).segments).toHaveLength(2)
  })
})

describe('classifyRiverside', () => {
  const segments = [[{ lat: 25.0, lng: 121.5 }, { lat: 25.0, lng: 121.51 }]]

  it.each([
    [25.0017, 121.505, true],
    [25.0019, 121.505, false],
    [25.0, 121.5115, true],
    [25.0, 121.5125, false],
  ])('station at (%f, %f) → riverside %s', (lat, lng, expected) => {
    const [station] = classifyRiverside([{ id: 's', lat, lng }], segments)
    expect(station.riverside).toBe(expected)
  })

  it('keeps the other station fields', () => {
    const station = { id: '1', name: 'A', city: '臺北市', district: '大同區', lat: 25.0, lng: 121.505 }
    expect(classifyRiverside([station], segments)).toEqual([{ ...station, riverside: true }])
  })

  it('finds a long segment whose end points are both far from the station', () => {
    const long = [[{ lat: 24.98, lng: 121.505 }, { lat: 25.02, lng: 121.505 }]]
    expect(classifyRiverside([{ id: 's', lat: 25.0, lng: 121.5055 }], long)[0].riverside).toBe(true)
  })

  it('marks every station not riverside when there are no segments', () => {
    expect(classifyRiverside([{ id: 's', lat: 25, lng: 121.5 }], [])[0].riverside).toBe(false)
  })
})
