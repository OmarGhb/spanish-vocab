import { describe, it, expect } from 'vitest'
import { estimateMinutes, median, nextReviewLabel, COLD_START_MS } from './review-estimate'

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

describe('nextReviewLabel', () => {
  const now = new Date('2026-06-25T10:00:00').getTime() // local

  it('returns null when nothing is scheduled', () => {
    expect(nextReviewLabel(null, now)).toBeNull()
  })

  it('uses relative-day granularity', () => {
    expect(nextReviewLabel(new Date('2026-06-25T22:00:00').getTime(), now)).toBe('aujourd’hui')
    expect(nextReviewLabel(new Date('2026-06-26T07:00:00').getTime(), now)).toBe('demain')
    expect(nextReviewLabel(new Date('2026-06-28T09:00:00').getTime(), now)).toBe('dans 3 jours')
    expect(nextReviewLabel(new Date('2026-07-02T09:00:00').getTime(), now)).toBe('la semaine prochaine')
    expect(nextReviewLabel(new Date('2026-07-16T09:00:00').getTime(), now)).toBe('dans 3 semaines')
  })

  it('counts from local calendar midnight, not a rolling 24h window', () => {
    // ~20h ahead but ACROSS local midnight → "demain", not "aujourd’hui".
    const late = new Date('2026-06-25T23:30:00').getTime()
    expect(nextReviewLabel(new Date('2026-06-26T02:00:00').getTime(), late)).toBe('demain')
    // Later the same evening (no midnight crossed) → "aujourd’hui".
    expect(nextReviewLabel(new Date('2026-06-25T23:55:00').getTime(), late)).toBe('aujourd’hui')
  })

  it('treats an already-past due time as today (defensive)', () => {
    expect(nextReviewLabel(new Date('2026-06-25T08:00:00').getTime(), now)).toBe('aujourd’hui')
  })
})
