import { describe, expect, it } from 'vitest'
import { haversineMeters, nearbyShops, type Category, type Shop } from './geo'

const station = { lat: 25.0330, lng: 121.5654 }
const METERS_PER_DEGREE_LAT = 111194.93
const shopNorthOf = (id: string, meters: number, category: Category = 'convenience'): Shop => ({
  id, name: id, category, lat: station.lat + meters / METERS_PER_DEGREE_LAT, lng: station.lng,
})
const ALL = new Set<Category>(['convenience', 'supermarket', 'hypermarket', 'grocery'])

describe('haversineMeters', () => {
  it('measures a north offset accurately', () => {
    expect(haversineMeters(station, shopNorthOf('x', 480))).toBeCloseTo(480, 0)
  })
})

describe('nearbyShops', () => {
  const shops = [shopNorthOf('A', 120), shopNorthOf('B', 480), shopNorthOf('C', 510), shopNorthOf('D', 300)]

  it('lists shops within the radius nearest first', () => {
    const result = nearbyShops(station, shops, 500, ALL)
    expect(result.map((r) => r.shop.id)).toEqual(['A', 'D', 'B'])
    expect(result.map((r) => Math.round(r.distance))).toEqual([120, 300, 480])
  })

  it('includes a shop exactly on the radius', () => {
    const edge = shopNorthOf('E', 300)
    expect(nearbyShops(station, [edge], haversineMeters(station, edge), ALL)).toHaveLength(1)
  })

  it('leaves out disabled categories', () => {
    const mixed = [shopNorthOf('A', 100, 'convenience'), shopNorthOf('S', 200, 'supermarket')]
    const result = nearbyShops(station, mixed, 500, new Set<Category>(['supermarket']))
    expect(result.map((r) => r.shop.id)).toEqual(['S'])
  })
})
