import { selectsWay } from './bridge-supplements.js'
import { isNearSegments, isRiversideRoute } from './riverside.js'

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

const memberWays = (relation) => (relation.members ?? []).filter((m) => m.type === 'way').map((m) => m.ref)

// Builds routes.json content from the route query response (relations with
// members, ways with geometry). Relation routes are sorted by relation id and
// followed by one bridge route per supplementary entry, then one link route per
// loop entry, each in list order. A link route holds the loop relation's member
// ways that no riverside or bridge relation lists. Supplementary entries that
// select no way are returned by name in `missingSupplements`, and loop entries
// that match no relation or keep no way in `missingLoops`.
export function buildRoutes(body, supplements = [], loops = []) {
  const wayElements = body.elements.filter((e) => e.type === 'way' && e.geometry)
  const ways = new Map(wayElements.map((w) => [w.id, w.geometry.map((g) => [round5(g.lat), round5(g.lon)])]))
  const relations = body.elements.filter((e) => e.type === 'relation')
  const published = relations.filter((r) => routeKind(r.tags)).sort((a, b) => a.id - b.id)
  const routes = published
    .map((r) => ({
      kind: routeKind(r.tags),
      name: r.tags.name,
      lines: joinLines(memberWays(r).filter((ref) => ways.has(ref)).map((ref) => ways.get(ref))),
    }))
    .filter((r) => r.lines.length)

  const missingSupplements = []
  for (const supplement of supplements) {
    const selected = wayElements.filter((w) => selectsWay(supplement, w.tags)).sort((a, b) => a.id - b.id)
    if (!selected.length) {
      missingSupplements.push(supplement.name)
      continue
    }
    routes.push({ kind: 'bridge', name: supplement.label, lines: joinLines(selected.map((w) => ways.get(w.id))) })
  }

  const publishedWays = new Set(published.flatMap(memberWays))
  const missingLoops = []
  for (const loop of loops) {
    const refs = [...new Set(relations.filter((r) => r.tags?.name === loop.name).flatMap(memberWays))]
      .filter((ref) => ways.has(ref) && !publishedWays.has(ref))
    if (!refs.length) {
      missingLoops.push(loop.name)
      continue
    }
    routes.push({ kind: 'link', name: loop.label, lines: joinLines(refs.map((ref) => ways.get(ref))) })
  }
  return { routes, missingSupplements, missingLoops }
}

const byId = (a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0)

// Vending shops within `meters` of any segment of any route line, as the
// routes.json `vending` array sorted by shop id.
export function routeVending(routes, shops, meters = 200) {
  const segments = routes.flatMap((r) => r.lines.flatMap((line) =>
    line.slice(1).map(([lat, lng], i) => [{ lat: line[i][0], lng: line[i][1] }, { lat, lng }])))
  return shops
    .filter((s) => s.category === 'vending' && isNearSegments(s, segments, meters))
    .sort(byId)
    .map(({ name, vending, lat, lng }) => ({ name, vending: vending ?? null, lat, lng }))
}
