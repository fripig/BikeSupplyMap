import { describe, expect, it } from 'vitest'
import type { Station } from './geo'
import { nearestStation, stopMarkers } from './route-stops'

describe('stopMarkers', () => {
  it('merges a start and an end about 8 m apart into one 起終 marker', () => {
    expect(stopMarkers([
      { kind: 'start', name: '福隆車站', lat: 25.016, lng: 121.94477 },
      { kind: 'end', name: '福隆遊客中心', lat: 25.01606, lng: 121.94471 },
    ])).toEqual([{ glyph: '起終', label: '起點：福隆車站／終點：福隆遊客中心', lat: 25.016, lng: 121.94477 }])
  })

  it('gives start, via and end their own markers', () => {
    expect(stopMarkers([
      { kind: 'start', name: '松山車站', lat: 25.04924, lng: 121.57784 },
      { kind: 'via', name: '白沙灣', lat: 25.28249, lng: 121.51974 },
      { kind: 'end', name: '基隆車站', lat: 25.13411, lng: 121.74042 },
    ])).toEqual([
      { glyph: '起', label: '起點：松山車站', lat: 25.04924, lng: 121.57784 },
      { glyph: '經', label: '分段點：白沙灣', lat: 25.28249, lng: 121.51974 },
      { glyph: '終', label: '終點：基隆車站', lat: 25.13411, lng: 121.74042 },
    ])
  })

  it('labels the two tips of a loop 端點', () => {
    expect(stopMarkers([
      { kind: 'tip', name: null, lat: 25.0, lng: 121.5 },
      { kind: 'tip', name: null, lat: 25.0, lng: 121.53 },
    ])).toEqual([
      { glyph: '端', label: '端點', lat: 25.0, lng: 121.5 },
      { glyph: '端', label: '端點', lat: 25.0, lng: 121.53 },
    ])
  })
})

describe('nearestStation', () => {
  const station = (id: string, lat: number, lng: number): Station =>
    ({ id, name: `站${id}`, city: '臺北市', district: '中正區', lat, lng, riverside: false })

  it('picks the closer of two stations', () => {
    const near = station('1', 25.048, 121.511)
    const far = station('2', 25.06, 121.511)
    const found = nearestStation({ lat: 25.04778, lng: 121.51109 }, [far, near])
    expect(found?.station).toBe(near)
    expect(found?.meters).toBeGreaterThan(20)
    expect(found?.meters).toBeLessThan(30)
  })

  it('returns null when no station is within 2 km', () => {
    expect(nearestStation({ lat: 25.04778, lng: 121.51109 }, [station('1', 25.07, 121.511)])).toBeNull()
  })
})
