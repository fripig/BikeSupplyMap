import { execFile } from 'node:child_process'
import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises'
import { createServer } from 'node:http'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'

// Runs scripts/fetch-data.js end to end against a local fake of the three sources.
const SCRIPT = fileURLToPath(new URL('./fetch-data.js', import.meta.url))

const taipeiStations = (n) => Array.from({ length: n }, (_, i) => ({
  sno: `5001${String(i).padStart(5, '0')}`, sna: `YouBike2.0_北${i}`, sarea: '大安區',
  latitude: 25.03, longitude: 121.54, act: '1',
}))
const newTaipeiStations = (n) => Array.from({ length: n }, (_, i) => ({
  sno: `5002${String(i).padStart(5, '0')}`, sna: `YouBike2.0_新${i}`, sarea: '板橋區',
  lat: '25.01', lng: '121.46', act: '1',
}))
// n convenience stores plus `vending` drink machines: the first `nearRoute` on
// the riverside route way at lat 25.03, the rest far from every route.
const overpassBody = (n, vending = 120, nearRoute = 100) => ({
  elements: [
    ...Array.from({ length: n }, (_, i) => ({
      type: 'node', id: i + 1, lat: 25.03, lon: 121.54, tags: { shop: 'convenience', brand: '7-Eleven' },
    })),
    ...Array.from({ length: vending }, (_, i) => ({
      type: 'node', id: 90000 + i, lat: i < nearRoute ? 25.031 : 24.5, lon: 121.54, tags: { amenity: 'vending_machine', vending: 'drinks' },
    })),
  ],
})

// Riverside routes whose single way runs through the fake Taipei stations at
// (25.03, 121.54), so every Taipei station is riverside and no New Taipei one is.
// ...plus `bridges` bridge routes over way 2, far from every station, and
// two 重陽橋 main-span ways for the supplementary bridge list.
const routesBody = (n, bridges = 19, supplement = true) => ({
  elements: [
    { type: 'way', id: 1, geometry: [{ lat: 25.03, lon: 121.53 }, { lat: 25.03, lon: 121.55 }] },
    { type: 'way', id: 2, geometry: [{ lat: 24.9, lon: 121.4 }, { lat: 24.901, lon: 121.4 }] },
    ...(supplement ? [
      { type: 'way', id: 3, tags: { name: '重陽橋', highway: 'secondary', bridge: 'yes' }, geometry: [{ lat: 25.06, lon: 121.49 }, { lat: 25.06, lon: 121.491 }] },
      { type: 'way', id: 4, tags: { name: '重陽橋', highway: 'secondary', bridge: 'yes' }, geometry: [{ lat: 25.06, lon: 121.491 }, { lat: 25.061, lon: 121.492 }] },
    ] : []),
    ...Array.from({ length: n }, (_, i) => ({
      type: 'relation', id: i + 1, tags: { route: 'bicycle', name: `測試河${i}自行車道` }, members: [{ type: 'way', ref: 1 }],
    })),
    ...Array.from({ length: bridges }, (_, i) => ({
      type: 'relation', id: 100 + i, tags: { route: 'bicycle', name: `測試${i}橋自行車道` }, members: [{ type: 'way', ref: 2 }],
    })),
  ],
})

// Urban cycling layer: n short cycleways along lat 25.2, and m signals on the first one.
const cyclingBody = (n, m) => ({
  elements: [
    ...Array.from({ length: n }, (_, i) => ({
      type: 'way', id: 1000 + i, tags: { highway: 'cycleway' },
      geometry: [{ lat: 25.2, lon: 121.0 + i * 0.001 }, { lat: 25.2, lon: 121.0005 + i * 0.001 }],
    })),
    ...Array.from({ length: m }, (_, i) => ({
      type: 'node', id: 5000 + i, lat: 25.2, lon: 121.0001, tags: { highway: 'traffic_signals' },
    })),
  ],
})

let server
let baseUrl
let responses

beforeAll(async () => {
  server = createServer(async (req, res) => {
    const url = new URL(req.url, 'http://localhost')
    let form = ''
    for await (const chunk of req) form += chunk
    // Both Overpass queries go to one URL; tell them apart by the query text.
    const query = new URLSearchParams(form).get('data') ?? ''
    const route = url.pathname !== '/overpass' ? url.pathname
      : query.includes('"route"="bicycle"') ? '/routes'
        : query.includes('"highway"="cycleway"') ? '/cycling'
          : url.pathname
    const [status, body] = responses[route](url)
    res.writeHead(status, { 'Content-Type': 'application/json' })
    res.end(typeof body === 'string' ? body : JSON.stringify(body))
  })
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
  baseUrl = `http://127.0.0.1:${server.address().port}`
})

afterAll(() => new Promise((resolve) => server.close(resolve)))

let dataDir
const SEED = {
  'stations.json': '[\n{"id":"old"}\n]\n',
  'shops.json': '[\n{"id":"n0"}\n]\n',
  'cycling.json': '{"paths":[],"points":[]}\n',
  'routes.json': '{"routes":[]}\n',
  'meta.json': '{"generatedAt":"2026-01-01T00:00:00.000Z"}\n',
}

beforeEach(async () => {
  responses = {
    '/taipei': () => [200, taipeiStations(600)],
    '/newtaipei': (url) => [200, url.searchParams.get('page') === '0' ? newTaipeiStations(600) : []],
    '/overpass': () => [200, overpassBody(2100)],
    '/routes': () => [200, routesBody(21)],
    '/cycling': () => [200, cyclingBody(1000, 2000)],
  }
  const root = await mkdtemp(join(tmpdir(), 'fetch-data-test-'))
  dataDir = join(root, 'data')
  await mkdir(dataDir)
  for (const [name, content] of Object.entries(SEED)) await writeFile(join(dataDir, name), content)
  return () => rm(root, { recursive: true, force: true })
})

function run() {
  return new Promise((resolve) => {
    execFile(process.execPath, [SCRIPT], {
      env: {
        ...process.env,
        TAIPEI_URL: `${baseUrl}/taipei`,
        NEW_TAIPEI_URL: `${baseUrl}/newtaipei`,
        OVERPASS_URL: `${baseUrl}/overpass`,
        OVERPASS_RETRY_DELAY_MS: '0',
        DATA_DIR: dataDir,
      },
    }, (error, stdout, stderr) => resolve({ code: error?.code ?? 0, stdout, stderr }))
  })
}

const readData = async () => Object.fromEntries(
  await Promise.all(Object.keys(SEED).map(async (name) => [name, await readFile(join(dataDir, name), 'utf8')])),
)

describe('fetch-data', () => {
  it('writes all three files when every source succeeds', async () => {
    const { code, stdout } = await run()
    expect(code).toBe(0)
    expect(stdout).toContain('臺北市 600, 新北市 600')
    const data = await readData()
    expect(JSON.parse(data['stations.json'])).toHaveLength(1200)
    expect(JSON.parse(data['shops.json'])).toHaveLength(2220)
    expect(JSON.parse(data['meta.json']).counts.stations).toBe(1200)
  })

  it('marks stations near a riverside route and reports the count', async () => {
    const { code, stdout } = await run()
    expect(code).toBe(0)
    expect(stdout).toContain('riverside: 21 routes, 600 stations')
    const stations = JSON.parse((await readData())['stations.json'])
    expect(stations.every((s) => typeof s.riverside === 'boolean')).toBe(true)
    expect(stations.filter((s) => s.riverside)).toHaveLength(600)
    expect(stations.find((s) => s.city === '新北市').riverside).toBe(false)
    expect(JSON.parse((await readData())['meta.json']).counts.riversideStations).toBe(600)
  })

  it('rejects too few riverside routes and keeps previous data', async () => {
    responses['/routes'] = () => [200, routesBody(4)]
    const { code, stderr } = await run()
    expect(code).not.toBe(0)
    expect(stderr).toContain('riverside bike-path routes: got 4, expected at least 15')
    expect(await readData()).toEqual(SEED)
  })

  it('rejects too few riverside stations and keeps previous data', async () => {
    // Routes far from every fake station: 21 routes, but no riverside station.
    responses['/routes'] = () => {
      const body = routesBody(21)
      body.elements[0].geometry = [{ lat: 24.5, lon: 121.0 }, { lat: 24.5, lon: 121.01 }]
      return [200, body]
    }
    const { code, stderr } = await run()
    expect(code).not.toBe(0)
    expect(stderr).toContain('riverside stations: got 0, expected at least 150')
    expect(await readData()).toEqual(SEED)
  })

  it('writes the urban cycling layer and reports its counts', async () => {
    const { code, stdout } = await run()
    expect(code).toBe(0)
    expect(stdout).toContain('cycling: 1000 ways joined into 1000 paths, 2000 signals and crossings')
    const data = await readData()
    const cycling = JSON.parse(data['cycling.json'])
    expect(cycling.paths).toHaveLength(1000)
    expect(cycling.paths[0]).toEqual({ kind: 'cycleway', coords: [[25.2, 121.0], [25.2, 121.0005]] })
    expect(cycling.points[0]).toEqual({ kind: 'signal', lat: 25.2, lng: 121.0001 })
    expect(data['cycling.json'].split('\n')[1]).toBe(JSON.stringify(cycling.paths[0]) + ',')
    const { counts } = JSON.parse(data['meta.json'])
    expect([counts.cyclingPaths, counts.cyclingPoints]).toEqual([1000, 2000])
  })

  it('writes riverside and bridge routes and reports the bridge count', async () => {
    const { code, stdout } = await run()
    expect(code).toBe(0)
    expect(stdout).toContain('routes: 21 riverside, 19 bridge, 1 supplementary bridge')
    const data = await readData()
    const { routes } = JSON.parse(data['routes.json'])
    expect(routes).toHaveLength(41)
    expect(routes[40]).toEqual({ kind: 'bridge', name: '重陽橋（人行道）', lines: [[[25.06, 121.49], [25.06, 121.491], [25.061, 121.492]]] })
    expect(routes[0]).toEqual({ kind: 'riverside', name: '測試河0自行車道', lines: [[[25.03, 121.53], [25.03, 121.55]]] })
    expect(routes[21]).toEqual({ kind: 'bridge', name: '測試0橋自行車道', lines: [[[24.9, 121.4], [24.901, 121.4]]] })
    expect(data['routes.json'].split('\n')[1]).toBe(JSON.stringify(routes[0]) + ',')
    expect(JSON.parse(data['meta.json']).counts.bridgeRoutes).toBe(19)
  })

  it('publishes vending machines as shops and reports their count', async () => {
    const { code, stdout } = await run()
    expect(code).toBe(0)
    expect(stdout).toContain('vending 120')
    const data = await readData()
    const vending = JSON.parse(data['shops.json']).filter((s) => s.category === 'vending')
    expect(vending).toHaveLength(120)
    expect(vending[0]).toEqual({ id: 'n90000', name: null, category: 'vending', lat: 25.031, lng: 121.54 })
    expect(JSON.parse(data['meta.json']).counts.shops.vending).toBe(120)
  })

  it('writes vending machines near routes to routes.json', async () => {
    const { code, stdout } = await run()
    expect(code).toBe(0)
    expect(stdout).toContain('route-side vending: 100')
    const data = await readData()
    const { vending } = JSON.parse(data['routes.json'])
    expect(vending).toHaveLength(100)
    expect(vending[0]).toEqual({ name: null, vending: 'drinks', lat: 25.031, lng: 121.54 })
    expect(JSON.parse(data['meta.json']).counts.routeVending).toBe(100)
  })

  it('rejects too few vending machines and keeps previous data', async () => {
    responses['/overpass'] = () => [200, overpassBody(2100, 40, 40)]
    const { code, stderr } = await run()
    expect(code).not.toBe(0)
    expect(stderr).toContain('vending machines: got 40, expected at least 100')
    expect(await readData()).toEqual(SEED)
  })

  it('rejects a supplementary bridge that selects no way and keeps previous data', async () => {
    responses['/routes'] = () => [200, routesBody(21, 19, false)]
    const { code, stderr } = await run()
    expect(code).not.toBe(0)
    expect(stderr).toContain('重陽橋')
    expect(await readData()).toEqual(SEED)
  })

  it('rejects too few bridge routes and keeps previous data', async () => {
    responses['/routes'] = () => [200, routesBody(21, 6)]
    const { code, stderr } = await run()
    expect(code).not.toBe(0)
    expect(stderr).toContain('bridge bike routes: got 6, expected at least 10')
    expect(await readData()).toEqual(SEED)
  })

  it('guards on ways before joining but reports joined lines in meta.json', async () => {
    // 1000 ways in touching pairs: each pair shares an end point and joins into one line.
    const body = cyclingBody(1000, 2000)
    for (const w of body.elements.filter((e) => e.type === 'way')) {
      const i = w.id - 1000
      const x = 121.0 + Math.floor(i / 2) * 0.002
      w.geometry = i % 2 === 0
        ? [{ lat: 25.2, lon: x }, { lat: 25.2, lon: x + 0.0005 }]
        : [{ lat: 25.2, lon: x + 0.0005 }, { lat: 25.2, lon: x + 0.001 }]
    }
    responses['/cycling'] = () => [200, body]
    const { code, stdout } = await run()
    expect(code).toBe(0)
    expect(stdout).toContain('cycling: 1000 ways joined into 500 paths')
    const data = await readData()
    expect(JSON.parse(data['cycling.json']).paths[0]).toEqual({ kind: 'cycleway', coords: [[25.2, 121.0], [25.2, 121.0005], [25.2, 121.001]] })
    expect(JSON.parse(data['meta.json']).counts.cyclingPaths).toBe(500)
  })

  it('rejects too few urban cycling paths and keeps previous data', async () => {
    responses['/cycling'] = () => [200, cyclingBody(300, 2000)]
    const { code, stderr } = await run()
    expect(code).not.toBe(0)
    expect(stderr).toContain('urban cycling paths: got 300, expected at least 1000')
    expect(await readData()).toEqual(SEED)
  })

  it('keeps previous data when the urban cycling query fails', async () => {
    responses['/cycling'] = () => [504, '<html>error</html>']
    const { code, stderr } = await run()
    expect(code).not.toBe(0)
    expect(stderr).toContain('HTTP 504')
    expect(await readData()).toEqual(SEED)
  })

  it('keeps previous data when the riverside route query fails', async () => {
    responses['/routes'] = () => [504, '<html>error</html>']
    const { code, stderr } = await run()
    expect(code).not.toBe(0)
    expect(stderr).toContain('HTTP 504')
    expect(await readData()).toEqual(SEED)
  })

  it.each([406, 504])('keeps previous data when Overpass returns HTTP %i', async (status) => {
    responses['/overpass'] = () => [status, '<html>error</html>']
    const { code, stderr } = await run()
    expect(code).not.toBe(0)
    expect(stderr).toContain(`HTTP ${status}`)
    expect(await readData()).toEqual(SEED)
  })

  it('rejects a suspiciously small New Taipei result and keeps previous data', async () => {
    responses['/newtaipei'] = (url) => [200, url.searchParams.get('page') === '0' ? newTaipeiStations(120) : []]
    const { code, stderr } = await run()
    expect(code).not.toBe(0)
    expect(stderr).toContain('New Taipei YouBike active stations: got 120, expected at least 500')
    expect(await readData()).toEqual(SEED)
  })

  it('names the source when a response has an unexpected shape and keeps previous data', async () => {
    responses['/taipei'] = () => [200, { retVal: taipeiStations(600) }]
    const { code, stderr } = await run()
    expect(code).not.toBe(0)
    expect(stderr).toContain('Taipei YouBike: expected an array')
    expect(await readData()).toEqual(SEED)
  })

  it('rejects stations with broken coordinates through the minimum count', async () => {
    responses['/taipei'] = () => [200, taipeiStations(600).map(({ latitude, longitude, ...rest }) => rest)]
    const { code, stderr } = await run()
    expect(code).not.toBe(0)
    expect(stderr).toContain('Taipei YouBike active stations: got 0, expected at least 500')
    expect(await readData()).toEqual(SEED)
  })

  it('leaves no temp directory behind', async () => {
    await run()
    const siblings = await readdir(join(dataDir, '..'))
    expect(siblings.filter((n) => n.startsWith('.data-tmp-'))).toEqual([])
  })
})
