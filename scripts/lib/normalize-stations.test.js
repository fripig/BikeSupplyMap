import { describe, expect, it } from 'vitest'
import { normalizeNewTaipei, normalizeTaipei } from './normalize-stations.js'

describe('normalizeTaipei', () => {
  it('maps Taipei fields and strips the YouBike2.0_ prefix', () => {
    expect(normalizeTaipei({
      sno: '500101001', sna: 'YouBike2.0_捷運科技大樓站', sarea: '大安區',
      latitude: 25.02605, longitude: 121.5436, act: '1',
    })).toEqual({
      id: '500101001', name: '捷運科技大樓站', city: '臺北市', district: '大安區', lat: 25.02605, lng: 121.5436,
    })
  })

  it('drops inactive stations', () => {
    expect(normalizeTaipei({ sno: '1', sna: 'x', sarea: 'y', latitude: 25, longitude: 121, act: '0' })).toBeNull()
  })
})

describe('normalizeNewTaipei', () => {
  it('maps New Taipei fields and converts string coordinates to numbers', () => {
    expect(normalizeNewTaipei({
      sno: '500201001', sna: 'YouBike2.0_下庄市場', sarea: '八里區',
      lat: '25.14678', lng: '121.3999', act: '1',
    })).toEqual({
      id: '500201001', name: '下庄市場', city: '新北市', district: '八里區', lat: 25.14678, lng: 121.3999,
    })
  })

  it('drops inactive stations', () => {
    expect(normalizeNewTaipei({ sno: '1', sna: 'x', sarea: 'y', lat: '25', lng: '121', act: '0' })).toBeNull()
  })
})

describe('coordinate validation', () => {
  const taipei = (coords) => ({ sno: '1', sna: 'x', sarea: 'y', act: '1', ...coords })
  const newTaipei = (coords) => ({ sno: '1', sna: 'x', sarea: 'y', act: '1', ...coords })

  it.each([
    ['missing', {}],
    ['empty string', { latitude: '', longitude: '' }],
    ['non-numeric', { latitude: 'N/A', longitude: 121.5 }],
    ['null', { latitude: null, longitude: 121.5 }],
  ])('drops a Taipei record with %s coordinates', (_, coords) => {
    expect(normalizeTaipei(taipei(coords))).toBeNull()
  })

  it.each([
    ['missing', {}],
    ['empty string', { lat: '', lng: '' }],
    ['non-numeric', { lat: '25.1', lng: 'abc' }],
  ])('drops a New Taipei record with %s coordinates', (_, coords) => {
    expect(normalizeNewTaipei(newTaipei(coords))).toBeNull()
  })
})
