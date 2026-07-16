import { describe, it, expect } from 'vitest'
import { getTopic, countByTheme, DISCOVERY_TOPICS, ESENCIAL_TOPIC } from './discovery-topics'

describe('getTopic', () => {
  it('resolves the 8 grid themes', () => {
    expect(getTopic('comida')?.es).toBe('La comida')
    expect(getTopic('ropa')?.key).toBe('ropa')
  })

  it('resolves the curated esencial pseudo-topic (curatedOnly)', () => {
    const t = getTopic('esencial')
    expect(t).toBe(ESENCIAL_TOPIC)
    expect(t?.curatedOnly).toBe(true)
  })

  it('keeps esencial OUT of the /discover grid list', () => {
    expect(DISCOVERY_TOPICS.some((t) => t.key === 'esencial')).toBe(false)
  })

  it('returns undefined for an unknown key', () => {
    expect(getTopic('nope')).toBeUndefined()
  })
})

describe('countByTheme', () => {
  it('groups pool rows into per-theme counts', () => {
    const rows = [
      { theme_key: 'comida' },
      { theme_key: 'comida' },
      { theme_key: 'esencial' },
      { theme_key: 'ropa' },
      { theme_key: 'comida' },
    ]
    expect(countByTheme(rows)).toEqual({ comida: 3, esencial: 1, ropa: 1 })
  })

  it('returns an empty map for no rows (unseeded → 0 via lookup)', () => {
    const counts = countByTheme([])
    expect(counts).toEqual({})
    expect(counts['comida'] ?? 0).toBe(0)
  })
})
