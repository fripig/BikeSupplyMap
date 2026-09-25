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
const overpassBody = (n) => ({
  elements: Array.from({ length: n }, (_, i) => ({
    type: 'node', id: i + 1, lat: 25.03, lon: 121.54, tags: { shop: 'convenience', brand: '7-Eleven' },
  })),
})

let server
let baseUrl
let responses

beforeAll(async () => {
  server = createServer((req, res) => {
    const url = new URL(req.url, 'http://localhost')
    const [status, body] = responses[url.pathname](url)
    res.writeHead(status, { 'Content-Type': 'application/json' })
    res.end(typeof body === 'string' ? body : JSON.stringify(body))
  })
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
  baseUrl = `http://127.0.0.1:${server.address().port}`
})

afterAll(() => new Promise((resolve) => server.close(resolve)))

let dataDir
const SEED = { 'stations.json': '[\n{"id":"old"}\n]\n', 'shops.json': '[\n{"id":"n0"}\n]\n', 'meta.json': '{"generatedAt":"2026-01-01T00:00:00.000Z"}\n' }

beforeEach(async () => {
  responses = {
    '/taipei': () => [200, taipeiStations(600)],
    '/newtaipei': (url) => [200, url.searchParams.get('page') === '0' ? newTaipeiStations(600) : []],
    '/overpass': () => [200, overpassBody(2100)],
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
    expect(JSON.parse(data['shops.json'])).toHaveLength(2100)
    expect(JSON.parse(data['meta.json']).counts.stations).toBe(1200)
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
