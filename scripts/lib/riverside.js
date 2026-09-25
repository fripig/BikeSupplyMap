// A station counts as riverside when it is within this distance of a riverside
// bike-path route.
export const RIVERSIDE_THRESHOLD_METERS = 200

// Riverside routes are OSM route=bicycle relations named after a river or bank,
// plus routes that follow the river without saying so in their name.
export const RIVERSIDE_NAME_PATTERN = /河|溪|水岸|左岸|右岸/
export const RIVERSIDE_ROUTE_NAMES = new Set(['關渡自行車道', '社子島環島自行車道', '二重環狀自行車道'])

export function isRiversideRoute(tags = {}) {
  const name = tags.name
  if (!name) return false
  return RIVERSIDE_NAME_PATTERN.test(name) || RIVERSIDE_ROUTE_NAMES.has(name)
}

// Turns an Overpass response (relations with tags, member ways with geometry)
// into the names of the riverside routes, the ids of their member ways, and
// their line segments as [{lat, lng}, {lat, lng}] pairs.
export function riversideSegments(body) {
  const relations = body.elements.filter((e) => e.type === 'relation' && isRiversideRoute(e.tags))
  const wayIds = new Set(relations.flatMap((r) => (r.members ?? []).filter((m) => m.type === 'way').map((m) => m.ref)))
  const segments = []
  for (const way of body.elements) {
    if (way.type !== 'way' || !wayIds.has(way.id) || !way.geometry) continue
    for (let i = 1; i < way.geometry.length; i++) {
      const a = way.geometry[i - 1]
      const b = way.geometry[i]
      segments.push([{ lat: a.lat, lng: a.lon }, { lat: b.lat, lng: b.lon }])
    }
  }
  return { routes: relations.map((r) => r.tags.name), wayIds, segments }
}

const EARTH_RADIUS_METERS = 6371008.8
const toRad = (deg) => (deg * Math.PI) / 180
// Skip segments whose latitude span misses the station by more than 0.01°
// (about 1.1 km, far beyond the threshold).
const PREFILTER_DEGREES = 0.01

// Distance from point p to segment ab, projecting onto a flat plane around p;
// at a few hundred meters the error against haversine is well under a meter.
export function pointToSegmentMeters(p, a, b) {
  const k = Math.cos(toRad(p.lat))
  const ax = (a.lng - p.lng) * k
  const ay = a.lat - p.lat
  const dx = (b.lng - p.lng) * k - ax
  const dy = b.lat - p.lat - ay
  const lengthSq = dx * dx + dy * dy
  const t = lengthSq === 0 ? 0 : Math.max(0, Math.min(1, -(ax * dx + ay * dy) / lengthSq))
  return toRad(Math.hypot(ax + t * dx, ay + t * dy)) * EARTH_RADIUS_METERS
}

// Whether point p ({lat, lng}) is within `meters` of any [{lat, lng}, {lat, lng}] segment.
export const isNearSegments = (p, segments, meters) => segments.some(([a, b]) =>
  p.lat >= Math.min(a.lat, b.lat) - PREFILTER_DEGREES
  && p.lat <= Math.max(a.lat, b.lat) + PREFILTER_DEGREES
  && pointToSegmentMeters(p, a, b) <= meters)

export function classifyRiverside(stations, segments, thresholdMeters = RIVERSIDE_THRESHOLD_METERS) {
  return stations.map((station) => ({ ...station, riverside: isNearSegments(station, segments, thresholdMeters) }))
}
