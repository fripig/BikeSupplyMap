import { expect, it } from 'vitest'
import { checkCounts } from './check-counts.js'

const OK = { taipeiStations: 1780, newTaipeiStations: 1586, shops: 5060, riversideRoutes: 21, riversideStations: 326, cyclingPaths: 2181, cyclingPoints: 3926 }

it('passes when every source meets its minimum', () => {
  expect(checkCounts({ ...OK })).toEqual([])
})

it('passes at exactly the minimum', () => {
  expect(checkCounts({ taipeiStations: 500, newTaipeiStations: 500, shops: 2000, riversideRoutes: 15, riversideStations: 150, cyclingPaths: 1000, cyclingPoints: 2000 })).toEqual([])
})

it('names the source and count that fall short', () => {
  expect(checkCounts({ ...OK, newTaipeiStations: 120 }))
    .toEqual(['New Taipei YouBike active stations: got 120, expected at least 500'])
})

it('reports every short source', () => {
  expect(checkCounts({ taipeiStations: 0, newTaipeiStations: 0, shops: 0, riversideRoutes: 0, riversideStations: 0, cyclingPaths: 0, cyclingPoints: 0 })).toHaveLength(7)
})

it('names riverside routes and the count when too few come back', () => {
  expect(checkCounts({ ...OK, riversideRoutes: 4 }))
    .toEqual(['riverside bike-path routes: got 4, expected at least 15'])
})

it('rejects too few riverside stations', () => {
  expect(checkCounts({ ...OK, riversideStations: 149 }))
    .toEqual(['riverside stations: got 149, expected at least 150'])
})

it('names urban cycling paths and the count when too few come back', () => {
  expect(checkCounts({ ...OK, cyclingPaths: 300 }))
    .toEqual(['urban cycling paths: got 300, expected at least 1000'])
})

it('rejects too few urban cycling signals and crossings', () => {
  expect(checkCounts({ ...OK, cyclingPoints: 1999 }))
    .toEqual(['urban cycling signals and crossings: got 1999, expected at least 2000'])
})
