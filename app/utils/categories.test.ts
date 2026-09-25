import { expect, it } from 'vitest'
import { CATEGORIES, CATEGORY_COLORS, CATEGORY_LABELS, DEFAULT_RADIUS, RADIUS_OPTIONS } from './categories'

it('offers 300 m, 500 m and 1000 m with 500 m selected by default', () => {
  expect(RADIUS_OPTIONS).toEqual([300, 500, 1000])
  expect(DEFAULT_RADIUS).toBe(500)
})

it('has one filter per category', () => {
  expect(CATEGORIES).toEqual(['convenience', 'supermarket', 'hypermarket', 'grocery', 'vending'])
})

it('labels and colors all five categories, including 自動販賣機', () => {
  expect(CATEGORIES.map((c) => CATEGORY_LABELS[c])).toEqual(['便利商店', '超市', '量販店', '雜貨店', '自動販賣機'])
  expect(CATEGORIES.every((c) => /^#[0-9a-f]{6}$/.test(CATEGORY_COLORS[c]))).toBe(true)
  expect(CATEGORY_COLORS.vending).toBe('#0c8599')
})
