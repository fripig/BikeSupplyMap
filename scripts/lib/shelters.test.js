import { describe, expect, it } from 'vitest'
import { bridgeSpots, shelterSpots } from './shelters.js'

// A riverside line along lat 25.0; at this latitude 0.0001° of longitude is
// about 10 m, and 0.001° of latitude about 111 m.
const riverside = { kind: 'riverside', name: '淡水河左岸自行車道', lines: [[[25.0, 121.5], [25.0, 121.52]]] }
// A way running north–south across lat 25.0 at the given longitude.
const bridge = (id, lng, tags = {}) => ({
  type: 'way', id, tags: { highway: 'primary', bridge: 'yes', ...tags },
  geometry: [{ lat: 24.999, lon: lng }, { lat: 25.001, lon: lng }],
})

describe('bridgeSpots', () => {
  it.each([
    // [label, ways, expected spots]
    ['same-named ways 30 m apart merge', [bridge(10, 121.501, { name: '中正橋' }), bridge(11, 121.5013, { name: '中正橋' })],
      [{ kind: 'bridge', name: '中正橋', lat: 25.0, lng: 121.501 }]],
    ['a later named way names an unnamed spot', [bridge(20, 121.505), bridge(21, 121.5054, { name: '環河快速道路' })],
      [{ kind: 'bridge', name: '環河快速道路', lat: 25.0, lng: 121.505 }]],
    ['a lone unnamed crossing', [bridge(30, 121.51)],
      [{ kind: 'bridge', name: null, lat: 25.0, lng: 121.51 }]],
    ['ways 80 m apart stay two spots', [bridge(40, 121.515, { name: '忠孝橋' }), bridge(41, 121.5158, { name: '忠孝橋' })],
      [{ kind: 'bridge', name: '忠孝橋', lat: 25.0, lng: 121.515 }, { kind: 'bridge', name: '忠孝橋', lat: 25.0, lng: 121.5158 }]],
  ])('%s', (_, ways, expected) => {
    expect(bridgeSpots([riverside], ways)).toEqual(expected)
  })

  it('merges in way-id order regardless of input order', () => {
    const spots = bridgeSpots([riverside], [bridge(11, 121.5013, { name: '中正橋' }), bridge(10, 121.501)])
    expect(spots).toEqual([{ kind: 'bridge', name: '中正橋', lat: 25.0, lng: 121.501 }])
  })

  it.each([
    [{ highway: 'primary', bridge: 'yes' }, 1],
    [{ highway: undefined, railway: 'subway', bridge: 'yes' }, 1],
    [{ highway: 'primary', bridge: undefined }, 0],
    [{ highway: 'residential', bridge: 'yes' }, 0],
    [{ highway: 'cycleway', bridge: 'yes' }, 0],
  ])('%o gives %i crossing', (tags, count) => {
    expect(bridgeSpots([riverside], [bridge(1, 121.505, tags)])).toHaveLength(count)
  })

  it('ignores bridge and link route lines', () => {
    const others = [
      { kind: 'bridge', name: '華江橋自行車道', lines: [[[25.0, 121.5], [25.0, 121.52]]] },
      { kind: 'link', name: '環騎臺北（連接道路）', lines: [[[25.0, 121.5], [25.0, 121.52]]] },
    ]
    expect(bridgeSpots(others, [bridge(1, 121.505)])).toEqual([])
  })

  it('sorts spots by lat then lng', () => {
    const second = { kind: 'riverside', name: '基隆河右岸自行車道', lines: [[[24.9995, 121.53], [24.9995, 121.54]]] }
    const ways = [bridge(1, 121.505), { ...bridge(2, 121.535), geometry: [{ lat: 24.999, lon: 121.535 }, { lat: 25.0, lon: 121.535 }] }]
    expect(bridgeSpots([riverside, second], ways).map((s) => [s.lat, s.lng])).toEqual([[24.9995, 121.535], [25.0, 121.505]])
  })
})

describe('shelterSpots', () => {
  // Offsets north of the riverside line: 0.0001° of latitude is about 11 m.
  const node = (id, dLat, tags) => ({ type: 'node', id, lat: 25.0 + dLat, lon: 121.51, tags })
  const link = { kind: 'link', name: '環騎臺北（連接道路）', lines: [[[25.0027, 121.5], [25.0027, 121.52]]] }

  it.each([
    ['named shelter at 4 m', node(1, 0.000036, { amenity: 'shelter', name: '單車道終點涼亭' }), { kind: 'shelter', name: '單車道終點涼亭', lat: 25.00004, lng: 121.51 }],
    ['gazebo at 90 m', node(2, 0.00081, { amenity: 'shelter', shelter_type: 'gazebo' }), { kind: 'shelter', name: null, lat: 25.00081, lng: 121.51 }],
    ['roof way at 60 m by center', { type: 'way', id: 3, center: { lat: 25.00054, lon: 121.51 }, tags: { building: 'roof' } }, { kind: 'shelter', name: null, lat: 25.00054, lng: 121.51 }],
    ['bus shelter at 10 m', node(4, 0.00009, { amenity: 'shelter', shelter_type: 'public_transport' }), null],
    ['shelter at 150 m', node(5, 0.00135, { amenity: 'shelter' }), null],
    ['shelter 50 m from a link line, 300 m from the riverside line', node(6, 0.0027 + 0.00045, { amenity: 'shelter' }), null],
  ])('%s', (_, element, expected) => {
    expect(shelterSpots([riverside, link], [element])).toEqual(expected ? [expected] : [])
  })

  it('publishes an element tagged both ways once and sorts by id as a string', () => {
    const elements = [
      node(9, 0, { amenity: 'shelter' }),
      { type: 'way', id: 5, center: { lat: 25.0, lon: 121.511 }, tags: { building: 'roof', name: '棚' } },
      node(10, 0, { amenity: 'shelter', building: 'roof', name: '亭' }),
      node(10, 0, { amenity: 'shelter', building: 'roof', name: '亭' }),
    ]
    expect(shelterSpots([riverside], elements).map((s) => s.name)).toEqual(['亭', null, '棚'])
  })
})
