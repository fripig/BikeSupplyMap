<script setup lang="ts">
import type { Shop, Station } from '~/utils/geo'

const { app } = useRuntimeConfig()

const stations = ref<Station[]>([])
const shops = ref<Shop[]>([])
const status = ref<'loading' | 'ready' | 'error'>('loading')

async function loadJson<T>(name: string): Promise<T> {
  const res = await fetch(`${app.baseURL}data/${name}`)
  if (!res.ok) throw new Error(`${name}: HTTP ${res.status}`)
  return res.json()
}

onMounted(async () => {
  try {
    ;[stations.value, shops.value] = await Promise.all([
      loadJson<Station[]>('stations.json'),
      loadJson<Shop[]>('shops.json'),
    ])
    status.value = 'ready'
  } catch (err) {
    console.error(err)
    status.value = 'error'
  }
})

function onSelect(station: Station) {
  console.log('selected', station.id, station.name)
}
</script>

<template>
  <div class="layout">
    <section class="map-pane">
      <p v-if="status === 'loading'" class="notice">載入中…</p>
      <p v-else-if="status === 'error'" class="notice notice--error" role="alert">資料載入失敗，請重新整理</p>
      <ClientOnly v-else>
        <SupplyMap :stations="stations" @select="onSelect" />
      </ClientOnly>
    </section>
  </div>
</template>

<style>
html, body, #__nuxt {
  margin: 0;
  height: 100%;
}

body {
  font-family: system-ui, -apple-system, "PingFang TC", "Noto Sans TC", "Microsoft JhengHei", sans-serif;
  color: #1f2328;
  background: #fff;
}

.layout {
  height: 100%;
}

.map-pane {
  position: relative;
  height: 100%;
}

.notice {
  margin: 0;
  padding: 2rem 1rem;
  text-align: center;
}

.notice--error {
  color: #b42318;
}
</style>
