import { describe, expect, it } from 'vitest'
import { buildRoutes, joinLines } from './routes.js'

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
