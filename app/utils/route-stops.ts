import { haversineMeters, type LatLng, type Station } from './geo'
import type { RouteStop } from './load-data'

export interface StopMarker extends LatLng {
  glyph: string
  label: string
}

// A start and an end this close are a loop's one starting point.
const MERGE_METERS = 50

const GLYPHS = { start: '起', via: '經', end: '終', tip: '端' } as const
const label = (stop: RouteStop) => {
  if (stop.kind === 'tip') return '端點'
  const prefix = { start: '起點', via: '分段點', end: '終點' }[stop.kind]
  return `${prefix}：${stop.name ?? ''}`
}

// One marker per stop, except that a start and an end within 50 m share one
// marker at the start, labelled with both names.
export function stopMarkers(stops: RouteStop[]): StopMarker[] {
  const start = stops.find((s) => s.kind === 'start')
  const end = stops.find((s) => s.kind === 'end')
  const merged = start && end && haversineMeters(start, end) <= MERGE_METERS
  return stops.flatMap((stop) => {
    if (merged && stop === end) return []
    if (merged && stop === start) return [{ glyph: '起終', label: `${label(start)}／${label(end)}`, lat: start.lat, lng: start.lng }]
    return [{ glyph: GLYPHS[stop.kind], label: label(stop), lat: stop.lat, lng: stop.lng }]
  })
}

// The station closest to `point`, or null when none is within `maxMeters`.
export function nearestStation(point: LatLng, stations: Station[], maxMeters = 2000): { station: Station, meters: number } | null {
  let best: { station: Station, meters: number } | null = null
  for (const station of stations) {
    const meters = haversineMeters(point, station)
    if (meters <= maxMeters && (!best || meters < best.meters)) best = { station, meters }
  }
  return best
}
