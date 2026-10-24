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
        { property: 'og:type', content: 'website' },
        { property: 'og:url', content: 'https://fripig.github.io/BikeSupplyMap/' },
        { property: 'og:title', content: '雙北 YouBike 補給地圖' },
        { property: 'og:description', content: '騎河濱自行車道，點 YouBike 站點找附近的便利商店、超市與自動販賣機，另標出躲雨點、廁所、淋浴與推薦環線。' },
        { property: 'og:image', content: 'https://fripig.github.io/BikeSupplyMap/og-image.png' },
        { property: 'og:image:width', content: '1200' },
        { property: 'og:image:height', content: '630' },
        { property: 'og:locale', content: 'zh_TW' },
        { name: 'twitter:card', content: 'summary_large_image' },
      ],
    },
  },
  css: ['leaflet/dist/leaflet.css', 'leaflet.markercluster/dist/MarkerCluster.css'],
  nitro: {
    preset: 'github_pages',
  },
  devtools: { enabled: false },
})
