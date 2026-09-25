import { expect, it } from 'vitest'
import { checkCounts } from './check-counts.js'

it('passes when every source meets its minimum', () => {
  expect(checkCounts({ taipeiStations: 1780, newTaipeiStations: 1586, shops: 5060 })).toEqual([])
})

it('passes at exactly the minimum', () => {
  expect(checkCounts({ taipeiStations: 500, newTaipeiStations: 500, shops: 2000 })).toEqual([])
})

it('names the source and count that fall short', () => {
  expect(checkCounts({ taipeiStations: 1780, newTaipeiStations: 120, shops: 5060 }))
    .toEqual(['New Taipei YouBike active stations: got 120, expected at least 500'])
})

it('reports every short source', () => {
  expect(checkCounts({ taipeiStations: 0, newTaipeiStations: 0, shops: 0 })).toHaveLength(3)
})
