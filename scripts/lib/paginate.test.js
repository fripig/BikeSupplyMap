import { expect, it, vi } from 'vitest'
import { fetchAllPages } from './paginate.js'

const page = (n, offset = 0) => Array.from({ length: n }, (_, i) => offset + i)

it('requests the next page after a full page and stops after a short one', async () => {
  const fetchPage = vi.fn(async (p) => [page(1000), page(1000, 1000), page(610, 2000)][p])
  const records = await fetchAllPages(fetchPage, 1000)
  expect(fetchPage.mock.calls.map(([p]) => p)).toEqual([0, 1, 2])
  expect(records).toHaveLength(2610)
  expect(records.at(-1)).toBe(2609)
})

it('stops after one request when the first page is short', async () => {
  const fetchPage = vi.fn(async () => page(610))
  await fetchAllPages(fetchPage, 1000)
  expect(fetchPage).toHaveBeenCalledTimes(1)
})

it('requests one more page when the last full page is followed by an empty one', async () => {
  const fetchPage = vi.fn(async (p) => (p === 0 ? page(1000) : []))
  expect(await fetchAllPages(fetchPage, 1000)).toHaveLength(1000)
  expect(fetchPage).toHaveBeenCalledTimes(2)
})
