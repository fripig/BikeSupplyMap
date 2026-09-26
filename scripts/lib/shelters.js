import { isNearSegments, pointToSegmentMeters } from './riverside.js'

// Crossings closer than this to an already kept bridge spot join it, so both
// carriageways and parallel ramps of one bridge make a single spot.
export const BRIDGE_SPOT_MERGE_METERS = 60
// Shelters and roofs at most this far from a riverside route line are kept.
export const SHELTER_NEAR_METERS = 100

const BRIDGE_HIGHWAYS = new Set([
  'motorway', 'trunk', 'primary', 'secondary', 'tertiary',
  'motorway_link', 'trunk_link', 'primary_link', 'secondary_link',
])
const BRIDGE_RAILWAYS = new Set(['rail', 'subway', 'light_rail'])

// Whether a way is an elevated road or railway a rider can shelter under.
export const isShelterBridge = (tags = {}) =>
  tags.bridge === 'yes' && (BRIDGE_HIGHWAYS.has(tags.highway) || BRIDGE_RAILWAYS.has(tags.railway))

export const round5 = (n) => Math.round(n * 1e5) / 1e5

// An Overpass element's point: a node's position or a way or relation's center,
// or null when the response carries neither.
export function elementPoint(element) {
  const lat = element.lat ?? element.center?.lat
  const lng = element.lon ?? element.center?.lon
  return lat === undefined || lng === undefined ? null : { lat, lng }
}
const GRID = 100 // cells of 0.01°

// Segments of riverside route lines as [{lat, lng}, {lat, lng}] pairs.
export const riversideRouteSegments = (routes) => routes
  .filter((r) => r.kind === 'riverside')
  .flatMap((r) => r.lines.flatMap((line) =>
    line.slice(1).map(([lat, lng], i) => [{ lat: line[i][0], lng: line[i][1] }, { lat, lng }])))

// Grid cells a segment's bounding box covers.
function* cells(a, b) {
  for (let x = Math.floor(Math.min(a.lat, b.lat) * GRID); x <= Math.floor(Math.max(a.lat, b.lat) * GRID); x++) {
    for (let y = Math.floor(Math.min(a.lng, b.lng) * GRID); y <= Math.floor(Math.max(a.lng, b.lng) * GRID); y++) yield `${x},${y}`
  }
}

// Where segment ab crosses segment cd, as {lat, lng}, or null; treats lat/lng as
// planar, which is fine over the few hundred meters a segment spans.
function crossing(a, b, c, d) {
  const den = (b.lat - a.lat) * (d.lng - c.lng) - (b.lng - a.lng) * (d.lat - c.lat)
  if (den === 0) return null
  const t = ((c.lat - a.lat) * (d.lng - c.lng) - (c.lng - a.lng) * (d.lat - c.lat)) / den
  const u = ((c.lat - a.lat) * (b.lng - a.lng) - (c.lng - a.lng) * (b.lat - a.lat)) / den
  if (t < 0 || t > 1 || u < 0 || u > 1) return null
  return { lat: a.lat + t * (b.lat - a.lat), lng: a.lng + t * (b.lng - a.lng) }
}

// Spots where a riverside route line passes under an elevated road or railway.
// `bridgeWays` are Overpass ways with tags and geometry; ways that are not
// shelter bridges are ignored. Crossings are taken in way-id order and then
// along each way; one within BRIDGE_SPOT_MERGE_METERS of a kept spot joins it,
// and a spot is named after the first named way among its crossings.
export function bridgeSpots(routes, bridgeWays) {
  const segments = riversideRouteSegments(routes)
  const grid = new Map()
  segments.forEach(([a, b], i) => {
    for (const cell of cells(a, b)) {
      if (!grid.has(cell)) grid.set(cell, [])
      grid.get(cell).push(i)
    }
  })

  const spots = []
  const ways = bridgeWays.filter((w) => w.geometry && isShelterBridge(w.tags)).sort((a, b) => a.id - b.id)
  for (const way of ways) {
    const points = way.geometry.map((g) => ({ lat: g.lat, lng: g.lon }))
    for (let k = 1; k < points.length; k++) {
      const c = points[k - 1]
      const d = points[k]
      const candidates = new Set([...cells(c, d)].flatMap((cell) => grid.get(cell) ?? []))
      // Crossings on this bridge segment, ordered along it.
      const hits = [...candidates]
        .map((i) => crossing(c, d, ...segments[i]))
        .filter(Boolean)
        .sort((p, q) => Math.hypot(p.lat - c.lat, p.lng - c.lng) - Math.hypot(q.lat - c.lat, q.lng - c.lng))
      for (const hit of hits) {
        const near = spots.find((s) => pointToSegmentMeters(s, hit, hit) <= BRIDGE_SPOT_MERGE_METERS)
        if (near) near.name ??= way.tags.name ?? null
        else spots.push({ kind: 'bridge', name: way.tags.name ?? null, lat: hit.lat, lng: hit.lng })
      }
    }
  }
  return spots
    .map((s) => ({ ...s, lat: round5(s.lat), lng: round5(s.lng) }))
    .sort((a, b) => a.lat - b.lat || a.lng - b.lng)
}

const isShelter = (tags = {}) =>
  (tags.amenity === 'shelter' && tags.shelter_type !== 'public_transport') || tags.building === 'roof'

// Shelters (other than bus shelters) and roofs whose point lies within
// SHELTER_NEAR_METERS of a riverside route line, sorted by shop-style id.
export function shelterSpots(routes, elements) {
  const segments = riversideRouteSegments(routes)
  const byId = new Map()
  for (const e of elements) {
    if (!isShelter(e.tags)) continue
    const point = elementPoint(e)
    if (!point) continue
    const id = `${e.type[0]}${e.id}`
    if (byId.has(id) || !isNearSegments(point, segments, SHELTER_NEAR_METERS)) continue
    byId.set(id, { kind: 'shelter', name: e.tags.name ?? null, lat: round5(point.lat), lng: round5(point.lng) })
  }
  return [...byId.keys()].sort().map((id) => byId.get(id))
}
