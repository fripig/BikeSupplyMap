// @vitest-environment happy-dom
import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import ShopList from './ShopList.vue'

const station = { id: 's1', name: '金華國中', city: '臺北市', district: '大安區', lat: 25.02605, lng: 121.5436, riverside: false }

describe('ShopList', () => {
  it('shows the empty-range message when no shop is within the radius', () => {
    const wrapper = mount(ShopList, { props: { station, items: [] } })
    expect(wrapper.text()).toContain('這個範圍內沒有店家，試試擴大範圍')
    expect(wrapper.findAll('li')).toHaveLength(0)
  })

  it('asks for a category instead of a wider range when every category is off', () => {
    const wrapper = mount(ShopList, { props: { station, items: [], noCategorySelected: true } })
    expect(wrapper.text()).toContain('請至少選擇一種店家類型')
    expect(wrapper.text()).not.toContain('試試擴大範圍')
  })

  it('lists shops with category, straight-line distance and a walking directions link', () => {
    const wrapper = mount(ShopList, {
      props: {
        station,
        items: [
          { shop: { id: 'n1', name: '全聯福利中心', category: 'supermarket', lat: 25.0271, lng: 121.5442 }, distance: 124 },
          { shop: { id: 'n2', name: null, category: 'grocery', lat: 25.028, lng: 121.545 }, distance: 296 },
        ],
      },
    })
    const items = wrapper.findAll('li')
    expect(items).toHaveLength(2)
    const [first, second] = [items[0]!, items[1]!]
    expect(first.text()).toContain('全聯福利中心')
    expect(first.text()).toContain('超市 · 直線距離 120 m')
    expect(second.find('.shop__name').text()).toBe('雜貨店')
    const link = first.find('a')
    expect(link.attributes('href')).toBe(
      'https://www.google.com/maps/dir/?api=1&origin=25.02605,121.5436&destination=25.0271,121.5442&travelmode=walking',
    )
    expect(link.attributes('target')).toBe('_blank')
  })

  it('lists an unnamed vending machine like a shop', () => {
    const wrapper = mount(ShopList, {
      props: { station, items: [{ shop: { id: 'n3', name: null, category: 'vending', lat: 25.027, lng: 121.5436 }, distance: 120 }] },
    })
    const item = wrapper.find('li')
    expect(item.find('.shop__name').text()).toBe('自動販賣機')
    expect(item.text()).toContain('自動販賣機 · 直線距離 120 m')
    expect(item.find('a').attributes('href')).toContain('travelmode=walking')
  })
})
