import { describe, expect, it } from 'vitest'
import { buildCyclingLayer, classifyCyclingElement } from './cycling-layer.js'

const way = (id, tags, geometry = [{ lat: 25.0, lon: 121.5 }, { lat: 25.0, lon: 121.501 }]) => ({ type: 'way', id, tags, geometry })
const node = (id, tags, lat = 25.0, lon = 121.5005) => ({ type: 'node', id, lat, lon, tags })

describe('classifyCyclingElement', () => {
  it.each([
    [way(1, { highway: 'cycleway' }), { kind: 'cycleway' }],
    [way(2, { highway: 'primary', 'cycleway:right': 'lane' }), { kind: 'lane' }],
    [way(3, { highway: 'secondary', cycleway: 'track' }), { kind: 'lane' }],
    [way(4, { highway: 'footway', bicycle: 'designated' }), null],
    [way(5, { highway: 'footway', 'cycleway:right': 'lane' }), null],
    [way(6, { highway: 'residential', 'cycleway:left': 'no' }), null],
    [node(7, { highway: 'traffic_signals' }), { kind: 'signal' }],
    [node(8, { highway: 'crossing', crossing: 'traffic_signals' }), { kind: 'signal' }],
    [node(9, { highway: 'crossing', crossing: 'marked' }), { kind: 'crossing' }],
    [node(10, { highway: 'stop' }), null],
  ])('%o → %o', (element, expected) => {
    const result = classifyCyclingElement(element)
    expect(result === null ? null : { kind: result.kind }).toEqual(expected)
  })
})

describe('buildCyclingLayer', () => {
  it('excludes riverside route members and rounds coordinates to 5 decimals', () => {
    const body = {
      elements: [
        way(20, { highway: 'cycleway' }, [{ lat: 25.0337912, lon: 121.5645188 }, { lat: 25.0340001, lon: 121.5650004 }]),
        way(10, { highway: 'cycleway' }),
        way(30, { highway: 'footway', bicycle: 'designated' }),
      ],
    }
    const { paths } = buildCyclingLayer(body, new Set([10]))
    expect(paths).toEqual([{ kind: 'cycleway', coords: [[25.03379, 121.56452], [25.034, 121.565]] }])
  })

  it('sorts paths by way id and points by node id', () => {
    const body = {
      elements: [
        way(9, { highway: 'cycleway' }),
        way(3, { highway: 'primary', cycleway: 'lane' }, [{ lat: 25.0, lon: 121.5 }, { lat: 25.0, lon: 121.5001 }]),
        node(50, { highway: 'crossing' }),
        node(40, { highway: 'traffic_signals' }),
      ],
    }
    const { paths, points } = buildCyclingLayer(body, new Set())
    expect(paths.map((p) => p.kind)).toEqual(['lane', 'cycleway'])
    expect(points.map((p) => p.kind)).toEqual(['signal', 'crossing'])
  })

  it('keeps only points within 30 m of a published urban path', () => {
    // The path runs along lat 25.0; 0.00025° of latitude is about 28 m, 0.0003° about 33 m.
    const body = {
      elements: [
        way(1, { highway: 'cycleway' }),
        way(2, { highway: 'cycleway' }, [{ lat: 25.1, lon: 121.5 }, { lat: 25.1, lon: 121.501 }]),
        node(11, { highway: 'traffic_signals' }, 25.00025, 121.5005),
        node(12, { highway: 'traffic_signals' }, 25.0003, 121.5005),
        node(13, { highway: 'crossing' }, 25.1, 121.5005),
      ],
    }
    const { points } = buildCyclingLayer(body, new Set([2]))
    expect(points).toEqual([{ kind: 'signal', lat: 25.00025, lng: 121.5005 }])
  })
})
