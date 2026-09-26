import { describe, expect, it } from 'vitest'
import { showerSpots, toiletSpots } from './facilities.js'

// A riverside line along lat 25.0; 0.001° of latitude is about 111 m, so an
// element `m` meters north sits at lat 25.0 + m / 111195.
const riverside = { kind: 'riverside', name: '淡水河左岸自行車道', lines: [[[25.0, 121.5], [25.0, 121.52]]] }
const north = (m) => 25.0 + m / 111195
const node = (id, meters, tags) => ({ type: 'node', id, lat: north(meters), lon: 121.51, tags })
const at = (meters) => ({ lat: Math.round(north(meters) * 1e5) / 1e5, lng: 121.51 })

describe('toiletSpots', () => {
  // A link line 360 m north of the riverside line.
  const link = { kind: 'link', name: '環騎臺北（連接道路）', lines: [[[north(360), 121.5], [north(360), 121.52]]] }
  const NONE = { name: null, wheelchair: null, changing_table: null, unisex: null, fee: null }

  it.each([
    ['wheelchair and fee at 30 m', node(1, 30, { amenity: 'toilets', wheelchair: 'yes', fee: 'no' }), { ...NONE, wheelchair: 'yes', fee: 'no', ...at(30) }],
    ['named with changing table and unisex at 90 m', node(2, 90, { amenity: 'toilets', name: '美堤公廁', changing_table: 'yes', unisex: 'yes' }),
      { ...NONE, name: '美堤公廁', changing_table: 'yes', unisex: 'yes', ...at(90) }],
    ['toilet at 150 m', node(3, 150, { amenity: 'toilets' }), null],
    ['toilet 40 m from a link line, 400 m from the riverside line', node(4, 400, { amenity: 'toilets' }), null],
  ])('%s', (_, element, expected) => {
    expect(toiletSpots([riverside, link], [element])).toEqual(expected ? [expected] : [])
  })

  it('reads a way by its center, ignores other elements, keeps each id once and sorts by id as a string', () => {
    const elements = [
      node(9, 10, { amenity: 'toilets' }),
      { type: 'way', id: 5, center: { lat: 25.0, lon: 121.511 }, tags: { amenity: 'toilets', name: '河濱公廁' } },
      node(10, 10, { amenity: 'toilets', name: '甲' }),
      node(10, 10, { amenity: 'toilets', name: '甲' }),
      node(11, 10, { amenity: 'shower' }),
    ]
    expect(toiletSpots([riverside], elements).map((t) => t.name)).toEqual(['甲', null, '河濱公廁'])
  })
})

describe('showerSpots', () => {
  it.each([
    ['shower at 146 m', node(1, 146, { amenity: 'shower', fee: 'no' }), { kind: 'shower', name: null, fee: 'no', ...at(146) }],
    ['shower at 499 m', node(2, 499, { amenity: 'shower' }), null],
    ['萬華運動中心 at 244 m', node(3, 244, { leisure: 'sports_centre', name: '萬華運動中心' }), { kind: 'sports_centre', name: '萬華運動中心', fee: null, ...at(244) }],
    ['克強運動中心 at 922 m', node(4, 922, { leisure: 'sports_centre', name: '克強運動中心' }), { kind: 'sports_centre', name: '克強運動中心', fee: null, ...at(922) }],
    ['某某羽球館 at 100 m', node(5, 100, { leisure: 'sports_centre', name: '某某羽球館' }), null],
    ['遠方運動中心 at 1200 m', node(6, 1200, { leisure: 'sports_centre', name: '遠方運動中心' }), null],
  ])('%s', (_, element, expected) => {
    expect(showerSpots([riverside], [element])).toEqual(expected ? [expected] : [])
  })

  it('publishes an element matching both rules once, as a shower', () => {
    const both = node(7, 200, { amenity: 'shower', leisure: 'sports_centre', name: '河濱運動中心' })
    expect(showerSpots([riverside], [both])).toEqual([{ kind: 'shower', name: '河濱運動中心', fee: null, ...at(200) }])
  })

  it('falls back to the sports centre rule beyond the shower distance', () => {
    const both = node(8, 600, { amenity: 'shower', leisure: 'sports_centre', name: '河濱運動中心' })
    expect(showerSpots([riverside], [both]).map((s) => s.kind)).toEqual(['sports_centre'])
  })

  it('ignores bridge and link route lines', () => {
    const others = [{ kind: 'link', name: '環騎臺北（連接道路）', lines: [[[25.0, 121.5], [25.0, 121.52]]] }]
    expect(showerSpots(others, [node(9, 10, { amenity: 'shower' })])).toEqual([])
  })
})
