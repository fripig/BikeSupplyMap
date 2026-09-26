import { isNearSegments } from './riverside.js'
import { elementPoint, riversideRouteSegments, round5 } from './shelters.js'

// Distances from a riverside route line within which each kind is kept. Riders
// walk to a sports centre, so its radius is wider than a plain shower's.
export const TOILET_NEAR_METERS = 100
export const SHOWER_NEAR_METERS = 300
export const SPORTS_CENTRE_NEAR_METERS = 1000

const shopStyleId = (e) => `${e.type[0]}${e.id}`
const orNull = (v) => v ?? null

// Keeps each element once, by shop-style id, sorted by that id as a string.
// `classify(tags)` lists the rules an element may match, most specific first, as
// [meters, fields] pairs; the first rule whose distance from a riverside segment
// is within its meters decides the published fields.
function select(routes, elements, classify) {
  const segments = riversideRouteSegments(routes)
  const byId = new Map()
  for (const e of elements) {
    const rules = classify(e.tags ?? {})
    const point = rules.length ? elementPoint(e) : null
    const id = shopStyleId(e)
    if (!point || byId.has(id)) continue
    const rule = rules.find(([meters]) => isNearSegments(point, segments, meters))
    if (rule) byId.set(id, { ...rule[1], lat: round5(point.lat), lng: round5(point.lng) })
  }
  return [...byId.keys()].sort().map((id) => byId.get(id))
}

// Toilets within TOILET_NEAR_METERS of a riverside route line, with their raw
// wheelchair, changing_table, unisex and fee tag values (null when untagged).
export const toiletSpots = (routes, elements) => select(routes, elements, (tags) => (tags.amenity === 'toilets'
  ? [[TOILET_NEAR_METERS, {
      name: orNull(tags.name),
      wheelchair: orNull(tags.wheelchair),
      changing_table: orNull(tags.changing_table),
      unisex: orNull(tags.unisex),
      fee: orNull(tags.fee),
    }]]
  : []))

const isSportsCentre = (tags) => tags.leisure === 'sports_centre' && (tags.name ?? '').includes('運動中心')

// Showers within SHOWER_NEAR_METERS and sports centres named with 運動中心 within
// SPORTS_CENTRE_NEAR_METERS of a riverside route line; an element meeting both
// rules counts as a shower.
export const showerSpots = (routes, elements) => select(routes, elements, (tags) => {
  const fields = (kind) => ({ kind, name: orNull(tags.name), fee: orNull(tags.fee) })
  return [
    ...(tags.amenity === 'shower' ? [[SHOWER_NEAR_METERS, fields('shower')]] : []),
    ...(isSportsCentre(tags) ? [[SPORTS_CENTRE_NEAR_METERS, fields('sports_centre')]] : []),
  ]
})
