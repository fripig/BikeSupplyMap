<script setup lang="ts">
import { nearbyShops, type Category, type Shop, type Station } from '~/utils/geo'
import { CATEGORIES, DEFAULT_RADIUS } from '~/utils/categories'
import { formatDataDate } from '~/utils/format'
import { useCyclingToggle, useRouteData } from '~/utils/cycling'
import { createCyclingLoader, loadJson, loadRoutes, loadSupplyData } from '~/utils/load-data'

const { app } = useRuntimeConfig()

const stations = shallowRef<Station[]>([])
const shops = shallowRef<Shop[]>([])
const status = ref<'loading' | 'ready' | 'error'>('loading')
const dataDate = ref<string | null>(null)

const selected = shallowRef<Station | null>(null)
const radius = ref(DEFAULT_RADIUS)
const enabledCategories = ref(new Set<Category>(CATEGORIES))
const showUrban = ref(false)
const {
  show: showCycling,
  data: cycling,
  failed: urbanFailed,
  start: startCycling,
} = useCyclingToggle(createCyclingLoader(fetch, app.baseURL))
const { data: routes, failed: routesFailed, start: startRoutes } = useRouteData(() => loadRoutes(fetch, app.baseURL))
const cyclingFailed = computed(() => urbanFailed.value || routesFailed.value)

const nearby = computed(() =>
  selected.value ? nearbyShops(selected.value, shops.value, radius.value, enabledCategories.value) : [],
)

onMounted(async () => {
  // Bike routes and the urban layer load alongside stations; a failure shows a
  // message in the controls and leaves the rest of the map working.
  startRoutes()
  startCycling()

  // The data date is informative only; the map works without it.
  loadJson<{ generatedAt: string }>(fetch, app.baseURL, 'meta.json')
    .then((meta) => { dataDate.value = formatDataDate(meta.generatedAt) })
    .catch((err) => console.warn(err))

  try {
    const data = await loadSupplyData(fetch, app.baseURL)
    stations.value = data.stations
    shops.value = data.shops
    status.value = 'ready'
  } catch (err) {
    console.error(err)
    status.value = 'error'
  }
})

// On narrow screens the list sits below the map; bring it into view after a pick.
const stationHeading = ref<HTMLElement>()
watch(selected, async () => {
  if (!window.matchMedia('(max-width: 767px)').matches) return
  await nextTick()
  stationHeading.value?.scrollIntoView({ behavior: 'smooth', block: 'start' })
})
</script>

<template>
  <div class="layout">
    <aside class="panel">
      <header class="panel__header">
        <h1 class="panel__title">雙北 YouBike 補給地圖</h1>
        <MapControls
          v-model:radius="radius"
          v-model:categories="enabledCategories"
          v-model:show-urban="showUrban"
          v-model:show-cycling="showCycling"
          :cycling-failed="cyclingFailed"
        />
      </header>

      <div class="panel__body">
        <template v-if="selected">
          <h2 ref="stationHeading" class="station-name">{{ selected.name }}</h2>
          <p class="station-meta">{{ selected.city }}{{ selected.district }} · 附近 {{ nearby.length }} 家</p>
          <ShopList :station="selected" :items="nearby" :no-category-selected="enabledCategories.size === 0" />
        </template>
        <p v-else-if="status === 'ready'" class="hint">地圖預設只顯示河濱自行車道旁的 YouBike 站點，點站點查看附近可以補給的店家。要找市區站點，打開「顯示市區站點」。</p>
      </div>

      <footer class="credits">
        <p v-if="dataDate">資料日期：{{ dataDate }}</p>
        <p>
          店家與自行車道資料 ©
          <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap 貢獻者</a>（ODbL）；
          站點資料來源：<a href="https://data.taipei/" target="_blank" rel="noopener">臺北市資料大平臺</a>、<a href="https://data.ntpc.gov.tw/" target="_blank" rel="noopener">新北市政府資料開放平臺</a>（政府資料開放授權條款）。
        </p>
      </footer>
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
          :show-urban="showUrban"
          :show-cycling="showCycling"
          :cycling="cycling"
          :routes="routes"
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

.credits {
  padding: 0.6rem 1rem;
  border-top: 1px solid var(--border);
  font-size: 0.72rem;
  line-height: 1.5;
  color: var(--muted);
}

.credits p {
  margin: 0;
}

.credits a {
  color: inherit;
}

/* Phone: controls on top, map in the middle, list and credits below; the page scrolls. */
@media (max-width: 767px) {
  html, body, #__nuxt {
    height: auto;
  }

  .layout {
    display: grid;
    grid-template-areas: "header" "map" "body" "credits";
    height: auto;
  }

  .panel {
    display: contents;
  }

  .panel__header {
    grid-area: header;
  }

  .map-pane {
    grid-area: map;
    height: 55vh;
    height: 55dvh;
  }

  .panel__body {
    grid-area: body;
    overflow: visible;
  }

  .credits {
    grid-area: credits;
  }

  .station-name {
    scroll-margin-top: 0.5rem;
  }
}
</style>
