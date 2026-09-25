<script setup lang="ts">
import { nearbyShops, type Category, type Shop, type Station } from '~/utils/geo'
import { CATEGORIES, DEFAULT_RADIUS } from '~/utils/categories'

const { app } = useRuntimeConfig()

const stations = shallowRef<Station[]>([])
const shops = shallowRef<Shop[]>([])
const status = ref<'loading' | 'ready' | 'error'>('loading')

const selected = shallowRef<Station | null>(null)
const radius = ref(DEFAULT_RADIUS)
const enabledCategories = ref(new Set<Category>(CATEGORIES))

const nearby = computed(() =>
  selected.value ? nearbyShops(selected.value, shops.value, radius.value, enabledCategories.value) : [],
)

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
</script>

<template>
  <div class="layout">
    <aside class="panel">
      <header class="panel__header">
        <h1 class="panel__title">雙北 YouBike 補給地圖</h1>
        <MapControls v-model:radius="radius" v-model:categories="enabledCategories" />
      </header>

      <div class="panel__body">
        <template v-if="selected">
          <h2 class="station-name">{{ selected.name }}</h2>
          <p class="station-meta">{{ selected.city }}{{ selected.district }} · 附近 {{ nearby.length }} 家</p>
          <ShopList :station="selected" :items="nearby" />
        </template>
        <p v-else-if="status === 'ready'" class="hint">點地圖上的 YouBike 站點，查看附近可以補給的店家。</p>
      </div>
    </aside>

    <section class="map-pane">
      <p v-if="status === 'loading'" class="notice">載入中…</p>
      <p v-else-if="status === 'error'" class="notice notice--error" role="alert">資料載入失敗，請重新整理</p>
      <ClientOnly v-else>
        <SupplyMap
          :stations="stations"
          :selected="selected"
          :nearby="nearby"
          :radius="radius"
          @select="selected = $event"
        />
      </ClientOnly>
    </section>
  </div>
</template>

<style>
:root {
  --accent: #c2410c;
  --muted: #59636e;
  --border: #d8dee4;
}

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
  display: flex;
  height: 100%;
}

.panel {
  display: flex;
  flex-direction: column;
  width: 360px;
  flex: none;
  border-right: 1px solid var(--border);
  min-height: 0;
}

.panel__header {
  padding: 1rem;
  border-bottom: 1px solid var(--border);
}

.panel__title {
  margin: 0 0 0.75rem;
  font-size: 1.1rem;
}

.panel__body {
  flex: 1;
  overflow-y: auto;
  padding: 0 1rem 1rem;
}

.station-name {
  margin: 1rem 0 0.2rem;
  font-size: 1.05rem;
}

.station-meta, .hint {
  margin: 0 0 0.5rem;
  color: var(--muted);
  font-size: 0.85rem;
}

.hint {
  margin-top: 1rem;
}

.map-pane {
  position: relative;
  flex: 1;
  min-width: 0;
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
