export const MINIMUMS = {
  taipeiStations: 500,
  newTaipeiStations: 500,
  shops: 2000,
  riversideRoutes: 15,
  riversideStations: 150,
}

const LABELS = {
  taipeiStations: 'Taipei YouBike active stations',
  newTaipeiStations: 'New Taipei YouBike active stations',
  shops: 'classified shops',
  riversideRoutes: 'riverside bike-path routes',
  riversideStations: 'riverside stations',
}

// Returns one message per source whose count is below its minimum; empty means OK.
export function checkCounts(counts, minimums = MINIMUMS) {
  return Object.entries(minimums)
    .filter(([key, min]) => counts[key] < min)
    .map(([key, min]) => `${LABELS[key]}: got ${counts[key]}, expected at least ${min}`)
}
