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
})
