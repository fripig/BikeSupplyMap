const SITE_NAME = '雙北 YouBike 補給地圖'
const SITE_URL = 'https://fripig.github.io/BikeSupplyMap/'
const DESCRIPTION = '騎雙北河濱自行車道時，點 YouBike 站點找附近的便利商店、超市與自動販賣機，另標出躲雨點、廁所、淋浴與推薦環線。涵蓋臺北市與新北市。'

export default defineNuxtConfig({
  compatibilityDate: '2026-09-25',
  ssr: true,
  app: {
    baseURL: '/BikeSupplyMap/',
    head: {
      htmlAttrs: { lang: 'zh-Hant-TW' },
      title: SITE_NAME,
      meta: [
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        { name: 'description', content: DESCRIPTION },
        { property: 'og:type', content: 'website' },
        { property: 'og:url', content: SITE_URL },
        { property: 'og:title', content: SITE_NAME },
        { property: 'og:description', content: DESCRIPTION },
        { property: 'og:image', content: `${SITE_URL}og-image.png` },
        { property: 'og:image:width', content: '1200' },
        { property: 'og:image:height', content: '630' },
        { property: 'og:locale', content: 'zh_TW' },
        { name: 'twitter:card', content: 'summary_large_image' },
      ],
      link: [{ rel: 'canonical', href: SITE_URL }],
      script: [{
        type: 'application/ld+json',
        innerHTML: JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'WebApplication',
          name: SITE_NAME,
          url: SITE_URL,
          description: DESCRIPTION,
          inLanguage: 'zh-Hant-TW',
          applicationCategory: 'TravelApplication',
          operatingSystem: 'Any',
          isAccessibleForFree: true,
          areaServed: [
            { '@type': 'City', name: '臺北市' },
            { '@type': 'City', name: '新北市' },
          ],
        }),
      }],
    },
  },
  css: ['leaflet/dist/leaflet.css', 'leaflet.markercluster/dist/MarkerCluster.css'],
  nitro: {
    preset: 'github_pages',
  },
  devtools: { enabled: false },
})
