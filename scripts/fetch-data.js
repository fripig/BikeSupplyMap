import { mkdir, mkdtemp, rename, rm, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { join } from 'node:path'
import { checkCounts } from './lib/check-counts.js'
import { classifyShop } from './lib/classify-shop.js'
import { normalizeNewTaipei, normalizeTaipei } from './lib/normalize-stations.js'
import { fetchAllPages } from './lib/paginate.js'

// Source URLs and the output directory can be overridden by environment
// variables so tests can run the whole script against a local server.
const TAIPEI_URL = process.env.TAIPEI_URL
  ?? 'https://tcgbusfs.blob.core.windows.net/dotapp/youbike/v2/youbike_immediate.json'
const NEW_TAIPEI_URL = process.env.NEW_TAIPEI_URL
  ?? 'https://data.ntpc.gov.tw/api/datasets/010e5b15-3823-4b20-b401-b1cf000550c5/json'
const NEW_TAIPEI_PAGE_SIZE = 1000
// Public Overpass instances, tried in order when one is busy or unreachable.
const OVERPASS_URLS = process.env.OVERPASS_URL
  ? [process.env.OVERPASS_URL]
  : [
      'https://overpass-api.de/api/interpreter',
      'https://maps.mail.ru/osm/tools/overpass/api/interpreter',
      'https://overpass.kumi.systems/api/interpreter',
    ]
const USER_AGENT = 'BikeSupplyMap/0.1 (https://github.com/fripig/BikeSupplyMap)'
const OUT_DIR = process.env.DATA_DIR ?? fileURLToPath(new URL('../public/data/', import.meta.url))

const OVERPASS_QUERY = `[out:json][timeout:170];
(area["name"="臺北市"]["admin_level"="4"];area["name"="新北市"]["admin_level"="4"];)->.a;
(nwr["shop"~"^(convenience|supermarket|wholesale|general|variety_store|greengrocer)$"](area.a););
out center tags;`

async function fetchJson(label, url, init = {}) {
  let res
  try {
    res = await fetch(url, {
      ...init,
      headers: { 'User-Agent': USER_AGENT, Accept: 'application/json', ...init.headers },
      signal: AbortSignal.timeout(200_000),
    })
  } catch (err) {
    throw new Error(`${label}: ${err.cause?.code ?? err.message}`)
  }
  if (!res.ok) throw new Error(`${label}: HTTP ${res.status}`)
  const text = await res.text()
  try {
    return JSON.parse(text)
  } catch {
    throw new Error(`${label}: response is not JSON (starts with ${JSON.stringify(text.slice(0, 60))})`)
  }
}

function expectArray(label, value) {
  if (!Array.isArray(value)) throw new Error(`${label}: expected an array`)
  return value
}

async function fetchTaipeiStations() {
  const records = expectArray('Taipei YouBike', await fetchJson('Taipei YouBike', TAIPEI_URL))
  return records.map(normalizeTaipei).filter(Boolean)
}

async function fetchNewTaipeiStations() {
  const records = await fetchAllPages(
    async (page) => {
      const label = `New Taipei YouBike page ${page}`
      return expectArray(label, await fetchJson(label, `${NEW_TAIPEI_URL}?page=${page}&size=${NEW_TAIPEI_PAGE_SIZE}`))
    },
    NEW_TAIPEI_PAGE_SIZE,
  )
  return records.map(normalizeNewTaipei).filter(Boolean)
}

// A busy Overpass instance answers 429/5xx, times out, or returns a `remark`
// error; move on to the next instance, and after a full round wait and try once
// more. Client errors (4xx other than 429) mean the query is wrong, so stop.
const OVERPASS_ROUNDS = 2
const OVERPASS_RETRY_DELAY_MS = Number(process.env.OVERPASS_RETRY_DELAY_MS ?? 30_000)
const isRetryable = (err) => !/HTTP 4(?!29)\d\d$/.test(err.message)

async function fetchOverpass() {
  let lastError
  for (let round = 1; round <= OVERPASS_ROUNDS; round++) {
    for (const url of OVERPASS_URLS) {
      try {
        const label = `Overpass (${new URL(url).host})`
        const body = await fetchJson(label, url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({ data: OVERPASS_QUERY }),
        })
        if (body.remark) throw new Error(`${label}: ${body.remark}`)
        expectArray(`${label} elements`, body.elements)
        return body
      } catch (err) {
        if (!isRetryable(err)) throw err
        lastError = err
        console.warn(`${err.message}; trying next Overpass instance`)
      }
    }
    if (round < OVERPASS_ROUNDS) await new Promise((r) => setTimeout(r, OVERPASS_RETRY_DELAY_MS))
  }
  throw lastError
}

async function fetchShops() {
  const body = await fetchOverpass()
  return body.elements.map(classifyShop).filter(Boolean)
}

const round6 = (n) => Math.round(n * 1e6) / 1e6
const byId = (a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0)

// One record per line keeps weekly data diffs reviewable.
const toJsonLines = (items) => `[\n${items.map((i) => JSON.stringify(i)).join(',\n')}\n]\n`

// Nothing is written until every source has succeeded and passed its count
// check. The files are then written to a temp directory and renamed into place
// one by one, so a failed or partial write never leaves a truncated file; a crash
// between the renames could still leave old and new files side by side.
async function writeAllOrNothing(files) {
  await mkdir(OUT_DIR, { recursive: true })
  const tmp = await mkdtemp(join(OUT_DIR, '..', '.data-tmp-'))
  try {
    for (const [name, content] of Object.entries(files)) await writeFile(join(tmp, name), content)
    for (const name of Object.keys(files)) await rename(join(tmp, name), join(OUT_DIR, name))
  } finally {
    await rm(tmp, { recursive: true, force: true })
  }
}

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

  const problems = checkCounts({
    taipeiStations: taipei.length,
    newTaipeiStations: newTaipei.length,
    shops: sortedShops.length,
  })
  if (problems.length) throw new Error(`refusing to publish incomplete data:\n  ${problems.join('\n  ')}`)

  await writeAllOrNothing({
    'stations.json': toJsonLines(stations),
    'shops.json': toJsonLines(sortedShops),
    'meta.json': `${JSON.stringify(meta, null, 2)}\n`,
  })

  console.log(`stations: 臺北市 ${taipei.length}, 新北市 ${newTaipei.length}`)
  console.log(`shops: ${Object.entries(shopCounts).map(([k, v]) => `${k} ${v}`).join(', ')}`)
}

main().catch((err) => {
  console.error(`fetch-data failed: ${err.message}`)
  process.exitCode = 1
})
