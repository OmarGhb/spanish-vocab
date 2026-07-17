import { describe, it, expect } from 'vitest'
import { scrambleLetters, seedFromString, usedScrambleTiles } from './scramble'

const sorted = (s: string[]) => [...s].sort().join('')

describe('scrambleLetters', () => {
  it('is deterministic for a given seed', () => {
    expect(scrambleLetters('mariposa', 42)).toEqual(scrambleLetters('mariposa', 42))
  })

  it('returns a permutation (same multiset of letters)', () => {
    const out = scrambleLetters('biblioteca', 7)
    expect(out).toHaveLength('biblioteca'.length)
    expect(sorted(out)).toBe(sorted([...'biblioteca']))
  })

  it('differs from the original spelling when the letters allow it', () => {
    expect(scrambleLetters('gato', 1).join('')).not.toBe('gato')
    expect(scrambleLetters('ventana', 99).join('')).not.toBe('ventana')
  })

  it('handles short / single-letter / all-same gracefully', () => {
    expect(scrambleLetters('a', 5)).toEqual(['a'])
    expect(scrambleLetters('', 5)).toEqual([])
    expect(scrambleLetters('aaa', 5).join('')).toBe('aaa') // no distinct arrangement
  })

  it('seedFromString is stable and numeric', () => {
    const id = '3f9c1a2b-0000-0000-0000-000000000000'
    expect(seedFromString(id)).toBe(seedFromString(id))
    expect(Number.isFinite(seedFromString(id))).toBe(true)
  })
})

describe('usedScrambleTiles', () => {
  it('consumes one tile per typed letter, multiset + position-independent', () => {
    const tiles = ['o', 'g', 'a', 't'] // scramble of "gato"
    expect(usedScrambleTiles(tiles, '')).toEqual([false, false, false, false])
    // typing "ga" greys the g + a tiles wherever they sit
    expect(usedScrambleTiles(tiles, 'ga')).toEqual([false, true, true, false])
    expect(usedScrambleTiles(tiles, 'gato')).toEqual([true, true, true, true])
  })

  it('handles duplicate letters by count', () => {
    const tiles = ['b', 'e', 'b', 'e'] // two b, two e
    expect(usedScrambleTiles(tiles, 'b')).toEqual([true, false, false, false])
    expect(usedScrambleTiles(tiles, 'bbb')).toEqual([true, false, true, false]) // only two b exist
  })

  it('folds accents/case so typing without accents still consumes the tile', () => {
    const tiles = ['á', 'i', 's']
    expect(usedScrambleTiles(tiles, 'AIS')).toEqual([true, true, true])
  })

  it('ignores letters not in the pool', () => {
    expect(usedScrambleTiles(['g', 'a', 't', 'o'], 'xyz')).toEqual([false, false, false, false])
  })

  // Accent-variant collision (v0.12.9): tapping a tile inserts its EXACT glyph, so depletion must
  // match the exact glyph before folding — otherwise an inserted plain "o" greys the "ó" tile.
  it('exact glyph is depleted before folding when accent variants collide', () => {
    const tiles = ['r', 'ó', 'l', 'g', 'o'] // scramble with both "o" and "ó"
    // tapping the plain "o" inserts "o" → the plain-o tile (index 4) greys, "ó" (index 1) untouched
    expect(usedScrambleTiles(tiles, 'o')).toEqual([false, false, false, false, true])
    // tapping "ó" inserts "ó" → the "ó" tile (index 1) greys, plain "o" (index 4) untouched
    expect(usedScrambleTiles(tiles, 'ó')).toEqual([false, true, false, false, false])
  })

  it('still folds a typed plain letter onto the accented tile when no exact tile remains', () => {
    // no plain-o tile exists → a typed "o" folds onto "ó" (the keyboard-typing cushion, unchanged)
    expect(usedScrambleTiles(['ó'], 'o')).toEqual([true])
    // both entered: exact "ó" claims the ó tile, the folded "o" claims the plain-o tile
    expect(usedScrambleTiles(['ó', 'o'], 'óo')).toEqual([true, true])
  })
})
