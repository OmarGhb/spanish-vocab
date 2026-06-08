import { describe, it, expect } from 'vitest'
import { estimateMinutes, median, COLD_START_MS } from './review-estimate'

describe('median', () => {
  it('returns null for empty, the middle for odd, the mean of two middles for even', () => {
    expect(median([])).toBeNull()
    expect(median([3, 1, 2])).toBe(2)
    expect(median([4, 1, 3, 2])).toBe(2.5)
  })
})

describe('estimateMinutes', () => {
  it('uses the cold-start flat cost until there are enough logs', () => {
    expect(estimateMinutes(10, [])).toBe(Math.max(1, Math.round((10 * COLD_START_MS) / 60_000)))
    // 19 logs (< MIN_USABLE_LOGS) → still cold-start, ignoring their (small) values.
    expect(estimateMinutes(5, Array(19).fill(1000))).toBe(Math.max(1, Math.round((5 * COLD_START_MS) / 60_000)))
  })

  it('uses the median per-card once enough logs exist', () => {
    const times = Array(20).fill(6000) // 6 s/card
    expect(estimateMinutes(10, times)).toBe(1) // 60 s → 1 min
    expect(estimateMinutes(20, times)).toBe(2) // 120 s → 2 min
  })

  it('floors at 1 minute and drops non-positive times', () => {
    expect(estimateMinutes(1, [])).toBe(1)
    expect(estimateMinutes(10, [0, -5, ...Array(20).fill(6000)])).toBe(1)
  })
})
