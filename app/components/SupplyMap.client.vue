<script setup lang="ts">
import type { Circle, LayerGroup, Map as LeafletMap, Marker, MarkerCluster, MarkerClusterGroup } from 'leaflet'
import { splitStations, type NearbyShop, type Station } from '~/utils/geo'
import { CATEGORY_COLORS, CATEGORY_LABELS } from '~/utils/categories'
import { formatDistance } from '~/utils/format'
import { directionsUrl } from '~/utils/links'

const props = defineProps<{
  stations: Station[]
  selected: Station | null
  nearby: NearbyShop[]
  radius: number
  showUrban: boolean
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
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> 貢獻者',
  }).addTo(map)

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

  drawSelection()
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

.station-icon--selected {
  background: #e67700;
  border-width: 3px;
  box-shadow: 0 0 0 2px #e67700, 0 2px 6px rgb(0 0 0 / 40%);
}
</style>
