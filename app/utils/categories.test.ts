import { expect, it } from 'vitest'
import { CATEGORIES, DEFAULT_RADIUS, RADIUS_OPTIONS } from './categories'

it('offers 300 m, 500 m and 1000 m with 500 m selected by default', () => {
  expect(RADIUS_OPTIONS).toEqual([300, 500, 1000])
  expect(DEFAULT_RADIUS).toBe(500)
})

it('has one filter per category', () => {
  expect(CATEGORIES).toEqual(['convenience', 'supermarket', 'hypermarket', 'grocery'])
})
