import { describe, expect, it } from 'vitest'
import { formatDataDate, formatDistance } from './format'

describe('formatDistance', () => {
  it.each([[0, '0 m'], [124, '120 m'], [125, '130 m'], [480.4, '480 m'], [996, '1000 m']])('%d → %s', (m, text) => {
    expect(formatDistance(m)).toBe(text)
  })
})

describe('formatDataDate', () => {
  it('shows the Taipei calendar date', () => {
    expect(formatDataDate('2026-09-25T08:00:00Z')).toBe('2026-09-25')
  })

  it('rolls over to the next day in Taipei after 16:00 UTC', () => {
    expect(formatDataDate('2026-09-25T16:30:00Z')).toBe('2026-09-26')
  })
})
