// Recommended tours of 交通部自行車旅遊網 (https://taiwanbike.tw/bikeRoute/tour)
// published as optional link routes after the loop routes, in list order. Each
// entry names the tour by its site `id`; the tour page must still call it `name`,
// so a rename on the site shows up as a failed refresh rather than a silently
// changed label. The site's 政府網站資料開放宣告 allows reuse with credit, which
// the page footer gives.
export const TOUR_ROUTES = [
  { id: 'A01', name: '北海岸漫遊' },
  { id: 'A03', name: '舊草嶺環線' },
  { id: 'A07', name: '淡水河金色水岸' },
]

const PAYLOAD_PATTERN = /<script[^>]*\bid="__NUXT_DATA__"[^>]*>([\s\S]*?)<\/script>/
const WRAPPERS = new Set(['ShallowReactive', 'Reactive', 'Ref', 'ShallowRef'])

// Revives entry `start` of a Nuxt payload: a JSON array whose arrays and objects
// refer to other entries by index, with ["ShallowReactive", i] and the like
// wrapping entry i. Negative indexes stand for undefined, NaN and the like.
function revive(entries, start) {
  const done = new Map()
  const at = (i) => {
    if (typeof i !== 'number' || i < 0) return undefined
    if (done.has(i)) return done.get(i)
    const v = entries[i]
    let out = v
    if (Array.isArray(v)) {
      if (WRAPPERS.has(v[0])) out = at(v[1])
      else {
        out = []
        done.set(i, out)
        for (const x of v) out.push(at(x))
      }
    } else if (v && typeof v === 'object') {
      out = {}
      done.set(i, out)
      for (const k in v) out[k] = at(v[k])
    }
    done.set(i, out)
    return out
  }
  return at(start)
}

// The tour with this `id` in a tour page's __NUXT_DATA__ payload, or null when
// the page has no payload or no such tour. Malformed payload JSON throws.
export function tourFromPage(html, id) {
  const match = html.match(PAYLOAD_PATTERN)
  if (!match) return null
  const data = revive(JSON.parse(match[1]), 3)
  if (!data || typeof data !== 'object') return null
  return Object.values(data).find((v) => v?.type === 'tour' && v.info?.id === id) ?? null
}

const round5 = (n) => Math.round(n * 1e5) / 1e5
const validPosition = (p) => Array.isArray(p)
  && typeof p[0] === 'number' && p[0] >= 119 && p[0] <= 123
  && typeof p[1] === 'number' && p[1] >= 21 && p[1] <= 26.5

// The tour's GeoJSON tracks as routes.json lines: one line per LineString or
// MultiLineString part, [lat, lng] rounded to 5 decimals, consecutive duplicate
// points reduced to one, and lines of fewer than 2 points dropped. Any position
// outside Taiwan makes the whole tour unusable.
export function tourLines(tour) {
  const parts = (tour.geometry ?? []).flatMap(({ geometry: g } = {}) =>
    g?.type === 'LineString' ? [g.coordinates] : g?.type === 'MultiLineString' ? g.coordinates : [])
  const lines = []
  for (const part of parts) {
    if (!Array.isArray(part) || !part.every(validPosition)) return { error: 'invalid position' }
    const line = []
    for (const [lng, lat] of part) {
      const p = [round5(lat), round5(lng)]
      const last = line[line.length - 1]
      if (!last || last[0] !== p[0] || last[1] !== p[1]) line.push(p)
    }
    if (line.length >= 2) lines.push(line)
  }
  return { lines }
}

const SEGMENT_SEPARATOR = ' - '

// The tour's start, the end of every day segment but the last (via), and its
// end, each taken from that segment's own point list and named from the
// segment's `<from> - <to>` name. Segment names must chain: each segment starts
// where the previous one ends.
export function tourStops(tour) {
  const segments = tour.route ?? []
  if (!segments.length) return { error: 'no segments' }
  const stops = []
  let previousTo
  for (const [i, { name, geometry: points = [] }] of segments.entries()) {
    const parts = String(name).split(SEGMENT_SEPARATOR)
    if (parts.length !== 2 || !parts[0].trim() || !parts[1].trim()) return { error: `segment name ${name} is not "<from> - <to>"` }
    const [from, to] = parts.map((p) => p.trim())
    if (i > 0 && from !== previousTo) return { error: `segment ${i + 1} starts at ${from}, not ${previousTo}` }
    previousTo = to
    const first = points[0]
    const last = points[points.length - 1]
    if (![first, last].every((p) => p && validPosition([p.Lng, p.Lat]))) return { error: 'invalid position' }
    const at = (p) => ({ lat: round5(p.Lat), lng: round5(p.Lng) })
    if (i === 0) stops.push({ kind: 'start', name: from, ...at(first) })
    stops.push({ kind: i === segments.length - 1 ? 'end' : 'via', name: to, ...at(last) })
  }
  return { stops }
}
