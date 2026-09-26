export const MINIMUMS = {
  taipeiStations: 500,
  newTaipeiStations: 500,
  shops: 2000,
  vendingMachines: 100,
  riversideRoutes: 15,
  riversideStations: 150,
  cyclingPaths: 1000,
  cyclingPoints: 2000,
  bridgeRoutes: 10,
  bridgeShelters: 80,
  shelters: 80,
  toilets: 150,
  showers: 5,
}

const LABELS = {
  taipeiStations: 'Taipei YouBike active stations',
  newTaipeiStations: 'New Taipei YouBike active stations',
  shops: 'classified shops',
  vendingMachines: 'vending machines',
  riversideRoutes: 'riverside bike-path routes',
  riversideStations: 'riverside stations',
  cyclingPaths: 'urban cycling paths',
  cyclingPoints: 'urban cycling signals and crossings',
  bridgeRoutes: 'bridge bike routes',
  bridgeShelters: 'bridge shelter spots',
  shelters: 'shelter spots',
  toilets: 'riverside toilets',
  showers: 'riverside showers',
}

// Returns one message per source whose count is below its minimum; empty means OK.
export function checkCounts(counts, minimums = MINIMUMS) {
  return Object.entries(minimums)
    .filter(([key, min]) => counts[key] < min)
    .map(([key, min]) => `${LABELS[key]}: got ${counts[key]}, expected at least ${min}`)
}
