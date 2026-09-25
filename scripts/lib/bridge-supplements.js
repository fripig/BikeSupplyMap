// Bridges riders use that OSM does not describe as a route=bicycle relation.
// Each entry selects the ways inside the two cities tagged with exactly this
// `name` and `highway` and with bridge=yes; they are published as one bridge
// route named `label`. An entry that selects no way blocks publishing, so a
// rename in OSM shows up as a failed refresh rather than a silently missing line.
export const BRIDGE_SUPPLEMENTS = [
  // Riders cross on the sidewalk of the main span; the highway=service ways
  // named 重陽橋 are motorcycle-only lanes and are not drawn.
  { name: '重陽橋', highway: 'secondary', label: '重陽橋（人行道）' },
]

// Overpass clauses selecting each entry's ways, for the route query.
export const supplementClauses = (supplements = BRIDGE_SUPPLEMENTS) => supplements
  .map((s) => `way["name"="${s.name}"]["highway"="${s.highway}"]["bridge"="yes"](area.a);`)
  .join('\n')

export const selectsWay = (supplement, tags = {}) =>
  tags.name === supplement.name && tags.highway === supplement.highway && tags.bridge === 'yes'
