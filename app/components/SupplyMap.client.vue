<script setup lang="ts">
import type { Map as LeafletMap, LayerGroup, MarkerClusterGroup } from 'leaflet'
import type { Station } from '~/utils/geo'

const props = defineProps<{
  stations: Station[]
}>()

const emit = defineEmits<{
  select: [station: Station]
}>()

const container = ref<HTMLElement>()
let map: LeafletMap | undefined
let stationLayer: MarkerClusterGroup | undefined

onMounted(async () => {
  const L = (await import('leaflet')).default
  // leaflet.markercluster extends the global L, so expose it before loading the plugin.
  ;(window as unknown as { L: typeof L }).L = L
  await import('leaflet.markercluster')

  map = L.map(container.value!, { zoomControl: true }).setView([25.0375, 121.5637], 13)
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> 貢獻者',
  }).addTo(map)

  const stationIcon = L.divIcon({ className: 'station-icon', iconSize: [14, 14] })
  stationLayer = L.markerClusterGroup({ showCoverageOnHover: false, maxClusterRadius: 50 })
  for (const station of props.stations) {
    L.marker([station.lat, station.lng], { icon: stationIcon, title: station.name })
      .on('click', () => emit('select', station))
      .addTo(stationLayer)
  }
  map.addLayer(stationLayer)
})

onBeforeUnmount(() => map?.remove())
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
</style>
