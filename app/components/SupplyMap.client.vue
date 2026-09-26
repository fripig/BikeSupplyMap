<script setup lang="ts">
import type { Circle, Control, LayerGroup, Map as LeafletMap, Marker, MarkerCluster, MarkerClusterGroup } from 'leaflet'
import { splitStations, type NearbyShop, type Station } from '~/utils/geo'
import { cyclingDashArray, cyclingVisibility, legendEntries, shelterLabel, showerLabel, toiletLabel, vendingLabel } from '~/utils/cycling'
import type { CyclingData, FacilityData, RouteData, ShelterData } from '~/utils/load-data'
import { CATEGORY_COLORS, CATEGORY_LABELS } from '~/utils/categories'
import { formatDistance } from '~/utils/format'
import { directionsUrl } from '~/utils/links'

const props = defineProps<{
  stations: Station[]
  selected: Station | null
  nearby: NearbyShop[]
  radius: number
  showUrban: boolean
  showCycling: boolean
  cycling: CyclingData | null
  routes: RouteData | null
  showVending: boolean
  showShelters: boolean
  shelters: ShelterData | null
  showToilets: boolean
  showShowers: boolean
  facilities: FacilityData | null
}>()

const emit = defineEmits<{
  select: [station: Station]
}>()

const container = ref<HTMLElement>()
let L: typeof import('leaflet')
let map: LeafletMap | undefined
let shopLayer: LayerGroup | undefined
let selectedMarker: Marker | undefined
let radiusCircle: Circle | undefined
let urbanLayer: MarkerClusterGroup | undefined
let bikeRenderer: import('leaflet').Canvas | undefined
let routeLayer: LayerGroup | undefined
let vendingLayer: LayerGroup | undefined
let shelterLayer: LayerGroup | undefined
let toiletLayer: LayerGroup | undefined
let showerLayer: LayerGroup | undefined
let cyclingPaths: LayerGroup | undefined
let cyclingPoints: LayerGroup | undefined
let legend: Control | undefined
let legendEl: HTMLElement | undefined

// Riverside, bridge and link routes are thick and always shown; urban paths are thin.
const RIVERSIDE_COLOR = '#1971c2'
const BRIDGE_COLOR = '#ae3ec9'
const LINK_COLOR = '#9c6644'
const CYCLING_COLOR = '#2f9e44'

// Shown when there are no riverside stations to frame.
const FALLBACK_VIEW = { center: [25.0375, 121.5637] as [number, number], zoom: 13 }

const escapeHtml = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!)

onMounted(async () => {
  L = (await import('leaflet')).default
  // leaflet.markercluster extends the global L, so expose it before loading the plugin.
  ;(window as unknown as { L: typeof L }).L = L
  await import('leaflet.markercluster')

  map = L.map(container.value!)
  // The dev server exposes the map to the local Playwright tests in e2e/; the
  // generated site drops this, as import.meta.dev is false there.
  if (import.meta.dev) (window as unknown as { __supplyMap: LeafletMap }).__supplyMap = map
  // Esri World Light Gray: a pale base map without shop, bus or building icons,
  // so the bike routes drawn on top stand out. Its labels sit in their own pane
  // above the bike lines and below the markers, and never take clicks. Esri has
  // no tiles past zoom 16 here, so higher zooms enlarge those.
  const esri = 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas'
  const tileOptions = { maxNativeZoom: 16, maxZoom: 19 }
  L.tileLayer(`${esri}/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}`, {
    ...tileOptions,
    attribution: 'Esri, HERE, Garmin, &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> 貢獻者',
  }).addTo(map)
  map.createPane('labels')
  map.getPane('labels')!.style.zIndex = '450'
  map.getPane('labels')!.style.pointerEvents = 'none'
  L.tileLayer(`${esri}/World_Light_Gray_Reference/MapServer/tile/{z}/{y}/{x}`, { ...tileOptions, pane: 'labels' }).addTo(map)

  // Riverside stations are always shown; urban stations sit in their own muted
  // cluster group that the toggle adds or removes without touching the rest.
  const riversideIcon = L.divIcon({ className: 'station-icon', iconSize: [14, 14] })
  const urbanIcon = L.divIcon({ className: 'station-icon station-icon--urban', iconSize: [10, 10] })
  const riversideLayer = L.markerClusterGroup({ showCoverageOnHover: false, maxClusterRadius: 50 })
  urbanLayer = L.markerClusterGroup({
    showCoverageOnHover: false,
    maxClusterRadius: 50,
    iconCreateFunction: (cluster: MarkerCluster) => L.divIcon({
      html: `<span>${cluster.getChildCount()}</span>`,
      className: 'urban-cluster',
      iconSize: [30, 30],
    }),
  })
  const { riverside, urban } = splitStations(props.stations)
  const addMarkers = (stations: Station[], icon: typeof riversideIcon, layer: MarkerClusterGroup) => {
    for (const station of stations) {
      L.marker([station.lat, station.lng], { icon, title: station.name })
        .on('click', () => emit('select', station))
        .addTo(layer)
    }
  }
  addMarkers(riverside, riversideIcon, riversideLayer)
  addMarkers(urban, urbanIcon, urbanLayer)
  if (riverside.length) map.fitBounds(L.latLngBounds(riverside.map((s) => [s.lat, s.lng])), { padding: [16, 16] })
  else map.setView(FALLBACK_VIEW.center, FALLBACK_VIEW.zoom)
  if (props.showUrban) map.addLayer(urbanLayer)
  map.addLayer(riversideLayer)
  shopLayer = L.layerGroup().addTo(map)
  map.on('zoomend', updateCyclingLayer)

  drawSelection()
  drawRoutes()
  updateCyclingLayer()
  updateShelterLayer()
  updateFacilityLayers()
})

onBeforeUnmount(() => map?.remove())

function drawSelection() {
  if (!map || !shopLayer) return
  shopLayer.clearLayers()
  selectedMarker?.remove()
  radiusCircle?.remove()
  const station = props.selected
  if (!station) return

  radiusCircle = L.circle([station.lat, station.lng], {
    radius: props.radius, color: '#e67700', weight: 1, fillOpacity: 0.06, interactive: false,
  }).addTo(map)
  selectedMarker = L.marker([station.lat, station.lng], {
    icon: L.divIcon({ className: 'station-icon station-icon--selected', iconSize: [22, 22] }),
    title: station.name,
    zIndexOffset: 1000,
  }).addTo(map)

  for (const { shop, distance } of props.nearby) {
    const label = shop.name ?? CATEGORY_LABELS[shop.category]
    L.circleMarker([shop.lat, shop.lng], {
      radius: 7, color: '#fff', weight: 2, fillColor: CATEGORY_COLORS[shop.category], fillOpacity: 1,
    })
      .bindPopup(
        `<strong>${escapeHtml(label)}</strong><br>${CATEGORY_LABELS[shop.category]} · 直線距離 ${formatDistance(distance)}`
        + `<br><a href="${directionsUrl(station, shop)}" target="_blank" rel="noopener">Google 地圖步行導航</a>`,
      )
      .addTo(shopLayer)
  }
}

// `nearby` changes whenever the station, radius or categories change, so it alone
// drives the redraw. Picking a station or changing the radius also refits the
// view; flush: 'post' lets the redraw above create the new circle first.
watch(() => props.nearby, drawSelection)
// One canvas renderer draws every bike line and point, so thousands of them add
// no DOM nodes; it sits under the station markers, so stations stay clickable.
const renderer = () => (bikeRenderer ??= L.canvas({ padding: 0.3 }))

// Draws riverside, bridge and link routes once their data arrives. Each joined
// line is one polyline; bridge and link lines open a popup with the route name. Route-side vending
// machines are drawn on the same canvas in their own layer, which follows the
// 自動販賣機 category, and open a popup with name and types.
function drawRoutes() {
  if (!map || routeLayer || !props.routes) return
  routeLayer = L.layerGroup()
  for (const route of props.routes.routes) {
    const named = route.kind !== 'riverside'
    const color = route.kind === 'bridge' ? BRIDGE_COLOR : route.kind === 'link' ? LINK_COLOR : RIVERSIDE_COLOR
    for (const line of route.lines) {
      const polyline = L.polyline(line, { renderer: renderer(), interactive: named, weight: 6, opacity: 0.9, color })
      if (named) polyline.bindPopup(escapeHtml(route.name))
      polyline.addTo(routeLayer)
    }
  }
  vendingLayer = L.layerGroup()
  for (const v of props.routes.vending ?? []) {
    L.circleMarker([v.lat, v.lng], {
      renderer: renderer(), radius: 5, weight: 2, color: '#fff', fillColor: CATEGORY_COLORS.vending, fillOpacity: 1,
    })
      .bindPopup(escapeHtml(vendingLabel(v.name, v.vending)))
      .addTo(vendingLayer)
  }
  // Routes go under the urban paths so the thin green lines stay visible.
  map.addLayer(routeLayer)
  if (cyclingPaths && map.hasLayer(cyclingPaths)) {
    map.removeLayer(cyclingPaths)
    map.addLayer(cyclingPaths)
  }
  // Vending icons are added last so the thick route lines do not cover them.
  updateVendingLayer()
}

function updateVendingLayer() {
  if (!map || !vendingLayer) return
  if (props.showVending) map.addLayer(vendingLayer)
  else map.removeLayer(vendingLayer)
  updateLegend()
}

function buildCyclingLayers(data: CyclingData) {
  cyclingPaths = L.layerGroup()
  for (const path of data.paths) {
    L.polyline(path.coords, {
      renderer: renderer(), interactive: false, color: CYCLING_COLOR, weight: 3, opacity: 0.85,
      dashArray: cyclingDashArray(path.kind),
    }).addTo(cyclingPaths)
  }
  cyclingPoints = L.layerGroup()
  for (const point of data.points) {
    L.circleMarker([point.lat, point.lng], point.kind === 'signal'
      ? { renderer: renderer(), interactive: false, radius: 4, weight: 1, color: '#fff', fillColor: '#e03131', fillOpacity: 1 }
      : { renderer: renderer(), interactive: false, radius: 4, weight: 2, color: '#343a40', fillColor: '#fff', fillOpacity: 1 },
    ).addTo(cyclingPoints)
  }
}

// Rain shelters are square glyph icons, drawn once their data arrives and shown
// while the 躲雨點 switch is on. They sit below the station markers so a station
// at the same place stays selectable.
function updateShelterLayer() {
  if (!map) return
  if (!shelterLayer && props.shelters) {
    shelterLayer = L.layerGroup()
    for (const s of props.shelters.shelters) {
      const icon = L.divIcon({
        className: 'shelter-icon', iconSize: [18, 18], html: s.kind === 'bridge' ? '橋' : '亭',
      })
      L.marker([s.lat, s.lng], { icon, zIndexOffset: -1000, title: shelterLabel(s.kind, s.name) })
        .bindPopup(escapeHtml(shelterLabel(s.kind, s.name)))
        .addTo(shelterLayer)
    }
  }
  if (shelterLayer) {
    if (props.showShelters) map.addLayer(shelterLayer)
    else map.removeLayer(shelterLayer)
  }
  updateLegend()
}

// A layer of square glyph icons below the station markers, each titled and
// opening a popup with its label.
function glyphLayer<T extends { lat: number, lng: number }>(items: T[], className: string, glyph: string, label: (item: T) => string) {
  const layer = L.layerGroup()
  const icon = L.divIcon({ className, iconSize: [18, 18], html: glyph })
  for (const item of items) {
    L.marker([item.lat, item.lng], { icon, zIndexOffset: -1000, title: label(item) })
      .bindPopup(escapeHtml(label(item)))
      .addTo(layer)
  }
  return layer
}

// Toilets and showers are built once facilities.json arrives, then each layer
// follows its own switch.
function updateFacilityLayers() {
  if (!map) return
  if (!toiletLayer && props.facilities) {
    toiletLayer = glyphLayer(props.facilities.toilets, 'facility-icon facility-icon--toilet', '廁', toiletLabel)
    showerLayer = glyphLayer(props.facilities.showers, 'facility-icon facility-icon--shower', '浴', showerLabel)
  }
  for (const [layer, show] of [[toiletLayer, props.showToilets], [showerLayer, props.showShowers]] as const) {
    if (!layer) continue
    if (show) map.addLayer(layer)
    else map.removeLayer(layer)
  }
  updateLegend()
}

// The legend lists route entries while routes are drawn, shelter, toilet and
// shower entries while those layers are shown, and urban entries while the
// urban layer is on; it is hidden when none is shown.
function updateLegend() {
  if (!map) return
  const sheltersShown = !!shelterLayer && map.hasLayer(shelterLayer)
  const entries = legendEntries({
    routes: !!routeLayer,
    urban: !!cyclingPaths && map.hasLayer(cyclingPaths),
    vending: props.showVending,
    shelters: sheltersShown,
    toilets: !!toiletLayer && map.hasLayer(toiletLayer),
    showers: !!showerLayer && map.hasLayer(showerLayer),
  })
    .map(({ label, icon }) => `<span><i class="cycling-legend__${icon}"></i>${label}</span>`)
  if (!legend) {
    legend = new L.Control({ position: 'bottomleft' })
    legend.onAdd = () => (legendEl = L.DomUtil.create('div', 'cycling-legend'))
  }
  if (!entries.length) {
    legend.remove()
    return
  }
  if (!legendEl?.isConnected) legend.addTo(map)
  legendEl!.innerHTML = entries.join('')
}

// Shows or hides urban lines and (at street-level zoom) points to match the
// switch, the loaded data and the current zoom.
function updateCyclingLayer() {
  if (!map) return
  const { paths: on, points: showPoints } = cyclingVisibility(props.showCycling, props.cycling !== null, map.getZoom())
  if (on && !cyclingPaths) buildCyclingLayers(props.cycling!)
  if (cyclingPaths && cyclingPoints) {
    if (on && !map.hasLayer(cyclingPaths)) map.addLayer(cyclingPaths)
    if (!on && map.hasLayer(cyclingPaths)) map.removeLayer(cyclingPaths)
    if (showPoints && !map.hasLayer(cyclingPoints)) map.addLayer(cyclingPoints)
    if (!showPoints && map.hasLayer(cyclingPoints)) map.removeLayer(cyclingPoints)
  }
  updateLegend()
}

watch(() => props.routes, drawRoutes)
watch(() => props.showVending, updateVendingLayer)
watch(() => [props.showCycling, props.cycling] as const, updateCyclingLayer)
watch(() => [props.showShelters, props.shelters] as const, updateShelterLayer)
watch(() => [props.showToilets, props.showShowers, props.facilities] as const, updateFacilityLayers)
watch(() => props.showUrban, (show) => {
  if (!map || !urbanLayer) return
  if (show) map.addLayer(urbanLayer)
  else map.removeLayer(urbanLayer)
})
watch(() => [props.selected, props.radius] as const, () => {
  if (radiusCircle && map) map.fitBounds(radiusCircle.getBounds(), { padding: [16, 16] })
}, { flush: 'post' })
</script>

<template>
  <div ref="container" class="supply-map" />
</template>

<style>
.supply-map {
  width: 100%;
  height: 100%;
}

.station-icon {
  background: #f5a623;
  border: 2px solid #fff;
  border-radius: 50%;
  box-shadow: 0 0 0 1px rgb(0 0 0 / 35%);
}

.facility-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid #fff;
  border-radius: 4px;
  box-shadow: 0 0 0 1px rgb(0 0 0 / 35%);
  color: #fff;
  font-size: 11px;
  line-height: 1;
}

.facility-icon--toilet {
  background: #364fc7;
}

.facility-icon--shower {
  background: #c2255c;
}

.shelter-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  background: #495057;
  border: 1px solid #fff;
  border-radius: 4px;
  box-shadow: 0 0 0 1px rgb(0 0 0 / 35%);
  color: #fff;
  font-size: 11px;
  line-height: 1;
}

.station-icon--urban {
  background: #adb5bd;
  border-width: 1px;
}

.urban-cluster {
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgb(173 181 189 / 75%);
  border: 2px solid #fff;
  border-radius: 50%;
  color: #343a40;
  font-size: 0.75rem;
}

.cycling-legend {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  padding: 0.4rem 0.6rem;
  background: rgb(255 255 255 / 92%);
  border-radius: 6px;
  box-shadow: 0 1px 4px rgb(0 0 0 / 25%);
  font-size: 0.75rem;
  line-height: 1.3;
}

/* On phones the attribution wraps under the legend; keep the legend above it. */
@media (max-width: 767px) {
  .cycling-legend {
    margin-bottom: 1.6rem !important;
  }
}

.cycling-legend span {
  display: flex;
  align-items: center;
  gap: 0.4rem;
}

.cycling-legend__line {
  width: 20px;
  border-top: 3px solid #2f9e44;
}

.cycling-legend__line--riverside {
  border-top: 5px solid #1971c2;
}

.cycling-legend__line--bridge {
  border-top: 5px solid #ae3ec9;
}

.cycling-legend__line--link {
  border-top: 5px solid #9c6644;
}

.cycling-legend__glyph {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 14px;
  height: 14px;
  border-radius: 3px;
  background: #495057;
  color: #fff;
  font-size: 10px;
  font-style: normal;
  line-height: 1;
}

.cycling-legend__glyph--bridge::after {
  content: "橋";
}

.cycling-legend__glyph--shelter::after {
  content: "亭";
}

.cycling-legend__glyph--toilet {
  background: #364fc7;
}

.cycling-legend__glyph--toilet::after {
  content: "廁";
}

.cycling-legend__glyph--shower {
  background: #c2255c;
}

.cycling-legend__glyph--shower::after {
  content: "浴";
}

.cycling-legend__line--lane {
  border-top-style: dashed;
}

.cycling-legend__dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  box-sizing: border-box;
}

.cycling-legend__dot--signal {
  background: #e03131;
  border: 1px solid #fff;
  box-shadow: 0 0 0 1px #e03131;
}

.cycling-legend__dot--crossing {
  background: #fff;
  border: 2px solid #343a40;
}

.cycling-legend__dot--vending {
  width: 10px;
  height: 10px;
  background: #0c8599;
  border: 2px solid #fff;
  box-shadow: 0 0 0 1px #0c8599;
}

.station-icon--selected {
  background: #e67700;
  border-width: 3px;
  box-shadow: 0 0 0 2px #e67700, 0 2px 6px rgb(0 0 0 / 40%);
}
</style>
