import { describe, it, expect } from 'vitest'
import { selectPoolCards, levelBand, type DiscoveryPoolRow } from './discovery-pool'

let n = 0
const row = (over: Partial<DiscoveryPoolRow> = {}): DiscoveryPoolRow => ({
  id: `id-${n++}`,
  word: 'palabra',
  fr: 'le mot',
  pos: 'n.f.',
  gender: 'f',
  example: { es: 'Una palabra.', fr: 'Un mot.' },
  band: 'core',
  status: 'active',
  ...over,
})

describe('selectPoolCards — exclusion', () => {
  it('drops words the user already has, case/diacritic-insensitive', () => {
    const rows = [row({ word: 'árbol' }), row({ word: 'casa' }), row({ word: 'perro' })]
    const { cards } = selectPoolCards({ rows, excludeWords: ['Arbol', 'CASA'], limit: 10 })
    expect(cards.map((c) => c.word)).toEqual(['perro'])
  })

  it('drops flagged rows', () => {
    const rows = [row({ word: 'uno', status: 'flagged' }), row({ word: 'dos' })]
    const { cards } = selectPoolCards({ rows, excludeWords: [], limit: 10 })
    expect(cards.map((c) => c.word)).toEqual(['dos'])
  })

  it('ignores blank exclude entries', () => {
    const rows = [row({ word: 'uno' })]
    const { cards } = selectPoolCards({ rows, excludeWords: ['', '  '], limit: 10 })
    expect(cards).toHaveLength(1)
  })
})

describe('selectPoolCards — band ordering', () => {
  it('orders core before extended by default', () => {
    const rows = [
      row({ word: 'ext1', band: 'extended' }),
      row({ word: 'core1', band: 'core' }),
      row({ word: 'ext2', band: 'extended' }),
      row({ word: 'core2', band: 'core' }),
    ]
    const { cards } = selectPoolCards({ rows, excludeWords: [], limit: 10 })
    const firstTwo = cards.slice(0, 2).map((c) => c.word).sort()
    expect(firstTwo).toEqual(['core1', 'core2'])
  })

  it('surfaces extended before core for advanced (b1/b2) levels', () => {
    const rows = [row({ word: 'ext', band: 'extended' }), row({ word: 'core', band: 'core' })]
    expect(selectPoolCards({ rows, excludeWords: [], limit: 10, level: 'b2' }).cards[0].word).toBe('ext')
    expect(selectPoolCards({ rows, excludeWords: [], limit: 10, level: 'b1' }).cards[0].word).toBe('ext')
  })

  it('keeps core first for beginner (a1/a2) levels and when unset', () => {
    const rows = [row({ word: 'ext', band: 'extended' }), row({ word: 'core', band: 'core' })]
    expect(selectPoolCards({ rows, excludeWords: [], limit: 10, level: 'a1' }).cards[0].word).toBe('core')
    expect(selectPoolCards({ rows, excludeWords: [], limit: 10, level: 'a2' }).cards[0].word).toBe('core')
    expect(selectPoolCards({ rows, excludeWords: [], limit: 10 }).cards[0].word).toBe('core')
  })
})

describe('levelBand', () => {
  it('maps beginner tiers to core, advanced tiers to extended', () => {
    expect(levelBand('a1')).toBe('core')
    expect(levelBand('a2')).toBe('core')
    expect(levelBand('b1')).toBe('extended')
    expect(levelBand('b2')).toBe('extended')
  })
})

describe('selectPoolCards — limit + exhaustion', () => {
  it('caps to the session limit', () => {
    const rows = Array.from({ length: 20 }, (_, i) => row({ word: `w${i}` }))
    const { cards, exhausted } = selectPoolCards({ rows, excludeWords: [], limit: 8 })
    expect(cards).toHaveLength(8)
    expect(exhausted).toBe(false)
  })

  it('flags exhaustion when nothing is available after exclusion', () => {
    const rows = [row({ word: 'uno' }), row({ word: 'dos' })]
    const { cards, exhausted } = selectPoolCards({ rows, excludeWords: ['uno', 'dos'], limit: 10 })
    expect(cards).toHaveLength(0)
    expect(exhausted).toBe(true)
  })

  it('flags exhaustion for an empty pool', () => {
    expect(selectPoolCards({ rows: [], excludeWords: [], limit: 10 }).exhausted).toBe(true)
  })
})
