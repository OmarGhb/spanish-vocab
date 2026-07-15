import { describe, it, expect } from 'vitest'
import { selectPoolCards, type DiscoveryPoolRow } from './discovery-pool'

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

  it('does not force core ahead of extended for advanced learners', () => {
    // With core forced first, the two core rows would always lead. For 'avance', ordering falls to
    // the stable id hash, so an extended row can appear before a core row.
    const rows = [
      row({ id: 'a', word: 'ext', band: 'extended' }),
      row({ id: 'z', word: 'core', band: 'core' }),
    ]
    const def = selectPoolCards({ rows, excludeWords: [], limit: 10 })
    const adv = selectPoolCards({ rows, excludeWords: [], limit: 10, level: 'avance' })
    expect(def.cards[0].word).toBe('core') // default: core first
    expect(adv.cards[0].word).toBe('ext') // advanced: id-hash order (a < z), core not forced ahead
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
