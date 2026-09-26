## Context

In `app/components/SupplyMap.client.vue`, `onMounted` creates `riversideIcon` (divIcon `station-icon`, 14 px, `#f5a623` with a white border) and `urbanIcon` (`station-icon station-icon--urban`, 10 px, gray `#adb5bd`). The riverside cluster group uses markercluster's default icons (classes `marker-cluster marker-cluster-small|medium|large`, styled green / yellow / orange by `MarkerCluster.Default.css`, loaded in `nuxt.config.ts`); the urban group has an `iconCreateFunction` producing a 30 px gray `urban-cluster`. `drawSelection` draws the selected station as a 22 px `station-icon station-icon--selected` in `#e67700`. The e2e tests in `e2e/map.spec.ts` tell the kinds apart with `.station-icon--urban`, `.urban-cluster` and `.marker-cluster`.

## Goals / Non-Goals

**Goals:**

- One visual style for station markers and one for clusters, regardless of kind.
- A bicycle glyph that reads as a YouBike station next to the 廁 / 浴 / 橋 / 亭 glyph icons.

**Non-Goals:**

- Changing the clustering radius, the switches, the selection behavior, or the shop markers.
- An icon font or icon package; the bicycle is inline SVG.
- Showing live bike availability or YouBike branding.

## Decisions

### One bicycle divIcon for both kinds

A module constant `BIKE_SVG` holds a 24×24 viewBox SVG, white stroke, no fill: two wheels (circles r=4.5 at (6,16) and (18,16)) and a frame path (`M6 16 L10 9 L15 16 L6 16 M10 9 L16 9 M15 16 L18 16 M16 9 L18 16 M9 7 L12 7`) with `stroke-width: 2`, round caps and joins, sized to 12 px inside the 18 px marker. Both kinds use `L.divIcon({ className: 'station-icon station-icon--<kind>', iconSize: [18, 18], html: BIKE_SVG })`. The `--riverside` / `--urban` modifier classes carry no styling; they stay for tests and for telling markers apart in the DOM.

### Selected station is a larger, darker variant

`station-icon station-icon--selected`, 26×26 px, background `#e67700`, 3 px white border, the same `BIKE_SVG` at 16 px, and the existing orange glow shadow. `zIndexOffset: 1000` stays.

### One cluster style for both groups

A shared `iconCreateFunction` returns `L.divIcon({ html: '<span>' + count + '</span>', className: 'station-cluster station-cluster--<kind>', iconSize: [32, 32] })`. `.station-cluster` is a flex-centered circle, background `#f5a623`, 2 px white border, the same 1 px dark outline shadow as `.station-icon`, white bold 0.75rem text. The default cluster stylesheet `leaflet.markercluster/dist/MarkerCluster.Default.css` is removed from `nuxt.config.ts`, since no group uses the default icons; `MarkerCluster.css` (animations) stays. `.urban-cluster` and `.station-icon--urban` styling is removed.

### Colors

| Element | Size | Background | Border | Content |
| ------- | ---- | ---------- | ------ | ------- |
| Station marker | 18 px | `#f5a623` | 2 px `#fff` | bicycle, 12 px, white |
| Selected station | 26 px | `#e67700` | 3 px `#fff` | bicycle, 16 px, white |
| Cluster | 32 px | `#f5a623` | 2 px `#fff` | count, white, bold |

## Implementation Contract

- Behavior: with both switches on, riverside and urban station markers look identical (18 px orange circle with white bicycle), clusters of both kinds look identical (32 px orange circle with white count), and the selected station is a 26 px darker orange circle with the bicycle.
- Interface: DOM classes `station-icon station-icon--riverside`, `station-icon station-icon--urban`, `station-icon station-icon--selected`, `station-cluster station-cluster--riverside`, `station-cluster station-cluster--urban`; each station icon contains one `svg`. Marker titles stay the station names.
- Failure modes: none new.
- Acceptance criteria: an e2e test "station markers and clusters of both kinds share one style" compares computed width, height, background color, and border of a riverside and an urban marker, and of a riverside and an urban cluster, checks each marker contains an `svg`, and checks no `.marker-cluster` element exists; an e2e assertion checks the selected icon is wider than an unselected one and has a different background color; existing e2e locators move from `.urban-cluster` / `.marker-cluster` to the `station-cluster--*` classes and still pass; `npx vue-tsc --noEmit` and `npm run test:e2e` pass.
- Scope boundaries: in scope are SupplyMap.client.vue (icons, cluster function, CSS), nuxt.config.ts (drop the default cluster stylesheet), e2e/map.spec.ts, README.md. Out of scope are switches, data, shop markers, facility and shelter icons.

## Risks / Trade-offs

- [18 px markers are larger than the old 14 px and 10 px dots, so dense areas look busier] → clustering still groups markers within 50 px, and the 河濱站點 and 市區站點 switches hide either kind.
- [Riverside and urban clusters at the same place look the same and can overlap] → accepted by the user's choice; the switches separate them.
- [Removing MarkerCluster.Default.css also removes its spiderfy leg styling] → spiderfy lines use Leaflet's default path style without it, which is acceptable; verified visually during apply.
