import { describe, expect, it } from 'vitest'
import { BRIDGE_SUPPLEMENTS, supplementClauses } from './bridge-supplements.js'
import { buildRoutes, joinLines, routeVending } from './routes.js'

const P1 = [25.0, 121.5]
const P2 = [25.0, 121.501]
const P3 = [25.0, 121.502]
const P4 = [25.001, 121.501]

describe('joinLines', () => {
  it('joins two lines that meet end to start', () => {
    expect(joinLines([[P1, P2], [P2, P3]])).toEqual([[P1, P2, P3]])
  })

  it('reverses the next line to join end to end', () => {
    expect(joinLines([[P1, P2], [P3, P2]])).toEqual([[P1, P2, P3]])
  })

  it('stops at a junction where three ends meet', () => {
    expect(joinLines([[P1, P2], [P2, P3], [P2, P4]])).toEqual([[P1, P2], [P2, P3], [P2, P4]])
  })

  it('does not bridge a gap between nearby ends', () => {
    const P2b = [25.0, 121.50105] // about 5 m from P2
    expect(joinLines([[P1, P2], [P2b, P3]])).toEqual([[P1, P2], [P2b, P3]])
  })

  it('joins a chain in either direction from the first line', () => {
    expect(joinLines([[P2, P3], [P1, P2], [P3, P4]])).toEqual([[P1, P2, P3, P4]])
  })

  it('keeps a closed loop as one line', () => {
    const loop = joinLines([[P1, P2], [P2, P4], [P4, P1]])
    expect(loop).toHaveLength(1)
    expect(loop[0]).toHaveLength(4)
  })
})

describe('buildRoutes', () => {
  const rel = (id, name, refs) => ({ type: 'relation', id, tags: { route: 'bicycle', ...(name ? { name } : {}) }, members: refs.map((ref) => ({ type: 'way', ref, role: '' })) })
  const way = (id, geometry) => ({ type: 'way', id, geometry: geometry.map(([lat, lon]) => ({ lat, lon })) })

  it.each([
    ['基隆河右岸自行車道', 'riverside'],
    ['華江橋自行車道', 'bridge'],
    ['關渡大橋自行車牽引道', 'bridge'],
    ['景美溪左岸大鵬華城堤外便道至鳴遠橋自行車道', 'riverside'],
    ['復興南北路自行車道', null],
  ])('%s → %s', (name, kind) => {
    const { routes } = buildRoutes({ elements: [rel(1, name, [10]), way(10, [[25.0, 121.5], [25.0, 121.501]])] })
    expect(routes[0]?.kind ?? null).toBe(kind)
  })

  it('joins member ways, rounds to 5 decimals and sorts by relation id', () => {
    const { routes } = buildRoutes({
      elements: [
        rel(9, '華江橋自行車道', [20]),
        rel(2, '淡水河左岸自行車道', [10, 11]),
        way(10, [[25.0000012, 121.5], [25.0, 121.501]]),
        way(11, [[25.0, 121.501], [25.0, 121.502]]),
        way(20, [[25.03, 121.49], [25.031, 121.491]]),
      ],
    })
    expect(routes).toEqual([
      { kind: 'riverside', name: '淡水河左岸自行車道', lines: [[[25.0, 121.5], [25.0, 121.501], [25.0, 121.502]]] },
      { kind: 'bridge', name: '華江橋自行車道', lines: [[[25.03, 121.49], [25.031, 121.491]]] },
    ])
  })

  it('leaves out routes whose member ways have no geometry, and nameless relations', () => {
    const { routes } = buildRoutes({ elements: [rel(1, '福和橋自行車道', [99]), rel(2, null, [10]), way(10, [[25, 121.5], [25, 121.501]])] })
    expect(routes).toEqual([])
  })
})

describe('buildRoutes supplementary bridges', () => {
  const tagged = (id, tags, geometry) => ({ type: 'way', id, tags, geometry: geometry.map(([lat, lon]) => ({ lat, lon })) })
  const ENTRY = { name: '重陽橋', highway: 'secondary', label: '重陽橋（人行道）' }

  it('lists 重陽橋 as the first supplementary bridge', () => {
    expect(BRIDGE_SUPPLEMENTS[0]).toEqual(ENTRY)
  })

  it.each([
    [{ name: '重陽橋', highway: 'secondary', bridge: 'yes' }, true],
    [{ name: '重陽橋', highway: 'service', bridge: 'yes', motorcycle: 'designated' }, false],
    [{ name: '重陽橋', highway: 'secondary' }, false],
    [{ name: '重陽陸橋', highway: 'footway', bridge: 'yes' }, false],
  ])('%o selected: %s', (tags, selected) => {
    const selector = tagged(1, { name: '重陽橋', highway: 'secondary', bridge: 'yes' }, [[25.06, 121.49], [25.061, 121.49]])
    const candidate = tagged(2, tags, [[25.07, 121.5], [25.071, 121.5]])
    const { routes } = buildRoutes({ elements: [selector, candidate] }, [ENTRY])
    expect(routes).toHaveLength(1)
    expect(routes[0].lines.some((l) => l[0][0] === 25.07)).toBe(selected)
  })

  it('joins the selected ways into one bridge route after the relation routes', () => {
    const rel = { type: 'relation', id: 1, tags: { route: 'bicycle', name: '華江橋自行車道' }, members: [{ type: 'way', ref: 10 }] }
    const { routes, missingSupplements } = buildRoutes({
      elements: [
        rel,
        tagged(10, {}, [[25.03, 121.49], [25.031, 121.491]]),
        tagged(21, { name: '重陽橋', highway: 'secondary', bridge: 'yes' }, [[25.06, 121.491], [25.06, 121.492]]),
        tagged(20, { name: '重陽橋', highway: 'secondary', bridge: 'yes' }, [[25.06, 121.49], [25.06, 121.491]]),
      ],
    }, [ENTRY])
    expect(missingSupplements).toEqual([])
    expect(routes).toEqual([
      { kind: 'bridge', name: '華江橋自行車道', lines: [[[25.03, 121.49], [25.031, 121.491]]] },
      { kind: 'bridge', name: '重陽橋（人行道）', lines: [[[25.06, 121.49], [25.06, 121.491], [25.06, 121.492]]] },
    ])
  })

  it('reports an entry that selects no way', () => {
    const { routes, missingSupplements } = buildRoutes({ elements: [tagged(1, { name: '重陽橋', highway: 'service', bridge: 'yes' }, [[25.06, 121.49], [25.06, 121.491]])] }, [ENTRY])
    expect(routes).toEqual([])
    expect(missingSupplements).toEqual(['重陽橋'])
  })

  it('builds one Overpass clause per entry', () => {
    expect(supplementClauses([ENTRY])).toBe('way["name"="重陽橋"]["highway"="secondary"]["bridge"="yes"](area.a);')
  })
})

describe('routeVending', () => {
  // A line along lat 25.0; 0.001° of latitude is about 111 m.
  const routes = [{ kind: 'riverside', name: '淡水河左岸自行車道', lines: [[[25.0, 121.5], [25.0, 121.51]]] }]
  const vending = (id, lat, extra = {}) => ({ id, name: null, category: 'vending', lat, lng: 121.505, vending: 'drinks', ...extra })

  it('keeps vending machines within 200 m of a route line and drops farther ones', () => {
    const near = vending('n2', 25.00135) // about 150 m
    const far = vending('n1', 25.00225) // about 250 m
    expect(routeVending(routes, [far, near])).toEqual([{ name: null, vending: 'drinks', lat: 25.00135, lng: 121.505 }])
  })

  it('ignores other categories and sorts by shop id', () => {
    const shops = [
      vending('n9', 25.0, { name: '黑松販賣機', vending: 'coffee;food' }),
      { id: 'n5', name: '7-ELEVEN', category: 'convenience', lat: 25.0, lng: 121.505 },
      vending('n10', 25.0, { vending: undefined }),
    ]
    expect(routeVending(routes, shops)).toEqual([
      { name: null, vending: null, lat: 25.0, lng: 121.505 },
      { name: '黑松販賣機', vending: 'coffee;food', lat: 25.0, lng: 121.505 },
    ])
  })
})
