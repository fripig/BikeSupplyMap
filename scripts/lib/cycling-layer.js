import { pointToSegmentMeters } from './riverside.js'

// Signals and crossings are kept only within this distance of an urban path.
export const POINT_MAX_DISTANCE_METERS = 30

const LANE_TAGS = ['cycleway', 'cycleway:both', 'cycleway:left', 'cycleway:right']
const LANE_VALUES = new Set(['lane', 'track'])
// Sidewalks and paths are left out even when they permit bicycles or carry a
// cycleway tag: they would cover most of downtown with shared footways.
const PEDESTRIAN_HIGHWAYS = new Set(['footway', 'pedestrian', 'path', 'steps', 'sidewalk'])

// Maps an Overpass element to { kind } for a path or point, or null.
export function classifyCyclingElement(element) {
  const tags = element.tags ?? {}
  if (element.type === 'way') {
    if (tags.highway === 'cycleway') return { kind: 'cycleway' }
    if (!tags.highway || PEDESTRIAN_HIGHWAYS.has(tags.highway)) return null
    return LANE_TAGS.some((key) => LANE_VALUES.has(tags[key])) ? { kind: 'lane' } : null
  }
  if (element.type === 'node') {
    if (tags.highway === 'traffic_signals' || tags.crossing === 'traffic_signals') return { kind: 'signal' }
    if (tags.highway === 'crossing') return { kind: 'crossing' }
  }
  return null
}

const round5 = (n) => Math.round(n * 1e5) / 1e5
const byId = (a, b) => a.id - b.id
// Skip segments whose latitude span misses the point by more than this (about 110 m).
const PREFILTER_DEGREES = 0.001

// Builds cycling.json content from the urban cycling Overpass response. Ways in
// riversideWayIds belong to riverside routes and are left out. Points farther
// than 30 m from every published path are dropped, since the query's `around`
// also covered the riverside ways.
export function buildCyclingLayer(body, riversideWayIds) {
  const ways = body.elements
    .filter((e) => e.type === 'way' && e.geometry && !riversideWayIds.has(e.id))
    .map((e) => ({ element: e, entry: classifyCyclingElement(e) }))
    .filter(({ entry }) => entry)
    .sort((a, b) => byId(a.element, b.element))

  const segments = []
  for (const { element } of ways) {
    for (let i = 1; i < element.geometry.length; i++) {
      const a = element.geometry[i - 1]
      const b = element.geometry[i]
      segments.push([{ lat: a.lat, lng: a.lon }, { lat: b.lat, lng: b.lon }])
    }
  }
  const nearPath = (p) => segments.some(([a, b]) =>
    p.lat >= Math.min(a.lat, b.lat) - PREFILTER_DEGREES
    && p.lat <= Math.max(a.lat, b.lat) + PREFILTER_DEGREES
    && pointToSegmentMeters(p, a, b) <= POINT_MAX_DISTANCE_METERS)

  const points = body.elements
    .filter((e) => e.type === 'node')
    .map((e) => ({ element: e, entry: classifyCyclingElement(e) }))
    .filter(({ element, entry }) => entry && nearPath({ lat: element.lat, lng: element.lon }))
    .sort((a, b) => byId(a.element, b.element))

  return {
    paths: ways.map(({ element, entry }) => ({
      kind: entry.kind,
      coords: element.geometry.map((g) => [round5(g.lat), round5(g.lon)]),
    })),
    points: points.map(({ element, entry }) => ({ kind: entry.kind, lat: round5(element.lat), lng: round5(element.lon) })),
  }
}
