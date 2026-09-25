import { mkdir, writeFile } from 'node:fs/promises'
import { classifyShop } from './lib/classify-shop.js'
import { normalizeNewTaipei, normalizeTaipei } from './lib/normalize-stations.js'

const TAIPEI_URL = 'https://tcgbusfs.blob.core.windows.net/dotapp/youbike/v2/youbike_immediate.json'
const NEW_TAIPEI_URL = 'https://data.ntpc.gov.tw/api/datasets/010e5b15-3823-4b20-b401-b1cf000550c5/json'
const NEW_TAIPEI_PAGE_SIZE = 1000
const OVERPASS_URL = process.env.OVERPASS_URL ?? 'https://overpass-api.de/api/interpreter'
const USER_AGENT = 'BikeSupplyMap/0.1 (https://github.com/fripig/BikeSupplyMap)'
const OUT_DIR = new URL('../public/data/', import.meta.url)

const OVERPASS_QUERY = `[out:json][timeout:170];
(area["name"="臺北市"]["admin_level"="4"];area["name"="新北市"]["admin_level"="4"];)->.a;
(nwr["shop"~"^(convenience|supermarket|wholesale|general|variety_store|greengrocer)$"](area.a););
out center tags;`

async function fetchJson(label, url, init = {}) {
  const res = await fetch(url, {
    ...init,
    headers: { 'User-Agent': USER_AGENT, Accept: 'application/json', ...init.headers },
    signal: AbortSignal.timeout(200_000),
  })
  if (!res.ok) throw new Error(`${label}: HTTP ${res.status}`)
  const text = await res.text()
  try {
    return JSON.parse(text)
  } catch {
    throw new Error(`${label}: response is not JSON (starts with ${JSON.stringify(text.slice(0, 60))})`)
  }
}

async function fetchTaipeiStations() {
  const records = await fetchJson('Taipei YouBike', TAIPEI_URL)
  return records.map(normalizeTaipei).filter(Boolean)
}

async function fetchNewTaipeiStations() {
  const records = []
  for (let page = 0; ; page++) {
    const batch = await fetchJson(`New Taipei YouBike page ${page}`, `${NEW_TAIPEI_URL}?page=${page}&size=${NEW_TAIPEI_PAGE_SIZE}`)
    records.push(...batch)
    if (batch.length < NEW_TAIPEI_PAGE_SIZE) break
  }
  return records.map(normalizeNewTaipei).filter(Boolean)
}

async function fetchShops() {
  const body = await fetchJson('Overpass', OVERPASS_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ data: OVERPASS_QUERY }),
  })
  if (body.remark) throw new Error(`Overpass: ${body.remark}`)
  return body.elements.map(classifyShop).filter(Boolean)
}

const round6 = (n) => Math.round(n * 1e6) / 1e6
const byId = (a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0)

// One record per line keeps weekly data diffs reviewable.
const toJsonLines = (items) => `[\n${items.map((i) => JSON.stringify(i)).join(',\n')}\n]\n`

async function main() {
  const [taipei, newTaipei, shops] = await Promise.all([
    fetchTaipeiStations(),
    fetchNewTaipeiStations(),
    fetchShops(),
  ])

  const stations = [...taipei, ...newTaipei]
    .map((s) => ({ ...s, lat: round6(s.lat), lng: round6(s.lng) }))
    .sort(byId)
  const sortedShops = shops
    .map((s) => ({ ...s, lat: round6(s.lat), lng: round6(s.lng) }))
    .sort(byId)

  const shopCounts = { convenience: 0, supermarket: 0, hypermarket: 0, grocery: 0 }
  for (const s of sortedShops) shopCounts[s.category]++
  const meta = {
    generatedAt: new Date().toISOString(),
    counts: { stations: stations.length, shops: shopCounts },
  }

  await mkdir(OUT_DIR, { recursive: true })
  await writeFile(new URL('stations.json', OUT_DIR), toJsonLines(stations))
  await writeFile(new URL('shops.json', OUT_DIR), toJsonLines(sortedShops))
  await writeFile(new URL('meta.json', OUT_DIR), `${JSON.stringify(meta, null, 2)}\n`)

  console.log(`stations: 臺北市 ${taipei.length}, 新北市 ${newTaipei.length}`)
  console.log(`shops: ${Object.entries(shopCounts).map(([k, v]) => `${k} ${v}`).join(', ')}`)
}

main().catch((err) => {
  console.error(`fetch-data failed: ${err.message}`)
  process.exitCode = 1
})
