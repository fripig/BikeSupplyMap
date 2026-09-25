import { isRiversideRoute } from './riverside.js'

const pointKey = (p) => `${p[0]},${p[1]}`

// Joins lines ([lat, lng][] each) into longer lines where exactly two line ends
// meet at the same point, reversing a line when needed. Joining stops at dead
// ends and at junctions where three or more ends meet; nearby ends that do not
// coincide are left apart. Each result records `first`, the lowest input index
// it contains; results come out in increasing `first` order.
export function joinLinesIndexed(lines) {
  const endsAt = new Map()
  lines.forEach((line, i) => {
    for (const end of [line[0], line[line.length - 1]]) {
      const key = pointKey(end)
      if (!endsAt.has(key)) endsAt.set(key, [])
      endsAt.get(key).push(i)
    }
  })

  const used = new Array(lines.length).fill(false)
  const extend = (chain) => {
    for (;;) {
      const key = pointKey(chain[chain.length - 1])
      const touching = endsAt.get(key)
      if (touching.length !== 2) return
      const next = touching.find((j) => !used[j])
      if (next === undefined) return
      used[next] = true
      const line = pointKey(lines[next][0]) === key ? lines[next] : [...lines[next]].reverse()
      chain.push(...line.slice(1))
    }
  }

  const joined = []
  lines.forEach((line, i) => {
    if (used[i]) return
    used[i] = true
    const chain = [...line]
    extend(chain)
    chain.reverse()
    extend(chain)
    joined.push({ line: chain.reverse(), first: i })
  })
  return joined
}

export const joinLines = (lines) => joinLinesIndexed(lines).map((j) => j.line)

const round5 = (n) => Math.round(n * 1e5) / 1e5
export const BRIDGE_NAME_PATTERN = /橋/

// Classifies a bicycle route relation as 'riverside', 'bridge', or null. The
// riverside rule wins, so a riverside route mentioning a bridge stays riverside.
export function routeKind(tags = {}) {
  if (isRiversideRoute(tags)) return 'riverside'
  if (tags.name && BRIDGE_NAME_PATTERN.test(tags.name)) return 'bridge'
  return null
}

// Builds routes.json content from the route query response (relations with
// members, member ways with geometry). Routes are sorted by relation id.
export function buildRoutes(body) {
  const ways = new Map(body.elements
    .filter((e) => e.type === 'way' && e.geometry)
    .map((w) => [w.id, w.geometry.map((g) => [round5(g.lat), round5(g.lon)])]))
  const routes = body.elements
    .filter((e) => e.type === 'relation' && routeKind(e.tags))
    .sort((a, b) => a.id - b.id)
    .map((r) => ({
      kind: routeKind(r.tags),
      name: r.tags.name,
      lines: joinLines((r.members ?? []).filter((m) => m.type === 'way' && ways.has(m.ref)).map((m) => ways.get(m.ref))),
    }))
    .filter((r) => r.lines.length)
  return { routes }
}
