export default defineNuxtConfig({
  compatibilityDate: '2026-09-25',
  ssr: true,
  app: {
    baseURL: '/BikeSupplyMap/',
    head: {
      htmlAttrs: { lang: 'zh-Hant-TW' },
      title: '雙北 YouBike 補給地圖',
      meta: [
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        { name: 'description', content: '點選 YouBike 站點，查看附近的便利商店、超市、量販店與雜貨店。' },
      ],
    },
  },
  css: ['leaflet/dist/leaflet.css', 'leaflet.markercluster/dist/MarkerCluster.css'],
  nitro: {
    preset: 'github_pages',
  },
  devtools: { enabled: false },
})
