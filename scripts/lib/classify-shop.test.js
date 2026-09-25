import { describe, expect, it } from 'vitest'
import { classifyShop } from './classify-shop.js'

const node = (tags) => ({ type: 'node', id: 1, lat: 25.03, lon: 121.52, tags })

describe('classifyShop', () => {
  it.each([
    [{ shop: 'convenience', brand: '7-Eleven' }, 'convenience'],
    [{ shop: 'convenience', name: '蝦皮店到店 內湖店' }, null],
    [{ shop: 'supermarket', brand: '家樂福超市' }, 'supermarket'],
    [{ shop: 'supermarket', brand: '家樂福' }, 'hypermarket'],
    [{ shop: 'wholesale', name: '好市多' }, 'hypermarket'],
    [{ shop: 'wholesale', name: '棉花田生機園' }, null],
    [{ shop: 'general', name: '柑仔店' }, 'grocery'],
    [{ shop: 'variety_store', name: '小北百貨' }, 'grocery'],
    [{ shop: 'convenience' }, 'convenience'],
    [{ amenity: 'vending_machine', vending: 'drinks' }, 'vending'],
    [{ amenity: 'vending_machine', vending: 'coffee;food' }, 'vending'],
    [{ amenity: 'vending_machine' }, 'vending'],
    [{ amenity: 'vending_machine', vending: 'parking_tickets' }, null],
    [{ amenity: 'vending_machine', vending: 'excrement_bags' }, null],
    [{ amenity: 'vending_machine', vending: 'drinks', brand: '7-Eleven' }, 'vending'],
  ])('%o → %s', (tags, expected) => {
    const result = classifyShop(node(tags))
    expect(result?.category ?? null).toBe(expected)
  })

  it('keeps a null name when OSM has none', () => {
    expect(classifyShop(node({ shop: 'convenience' })).name).toBeNull()
  })

  it('reduces a way to its center point', () => {
    expect(classifyShop({
      type: 'way', id: 456, center: { lat: 25.03, lon: 121.52 }, tags: { shop: 'supermarket', name: '全聯福利中心' },
    })).toEqual({ id: 'w456', name: '全聯福利中心', category: 'supermarket', lat: 25.03, lng: 121.52 })
  })

  it('publishes an unnamed vending machine node with its vending tag', () => {
    expect(classifyShop({ type: 'node', id: 7, lat: 25.07, lon: 121.51, tags: { amenity: 'vending_machine', vending: 'drinks' } }))
      .toEqual({ id: 'n7', name: null, category: 'vending', lat: 25.07, lng: 121.51, vending: 'drinks' })
  })

  it('keeps a null vending value for untagged machines', () => {
    expect(classifyShop(node({ amenity: 'vending_machine' })).vending).toBeNull()
  })

  it('prefixes node ids with n', () => {
    expect(classifyShop(node({ shop: 'convenience', brand: '全家便利商店' })).id).toBe('n1')
  })
})
