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

// Tapped-tile identity (v0.12.29). Glyph matching alone can't decide between two byte-identical
// tiles, so pass 1 always greyed the EARLIER twin no matter which one the user touched. The third
// arg carries the tapped tile indices; omitting it must reproduce the old behaviour exactly (the
// suite above is the byte-identical regression lock — none of it passes a third arg).
describe('usedScrambleTiles — tapped tile identity', () => {
  const bebe = ['b', 'e', 'b', 'e'] // two b, two e — the reported "bebe"/"dedo" case

  it('taps the SECOND of a duplicate pair → that tile depletes, not its twin', () => {
    // THE BUG: without the tap log this returned [true, false, false, false] (greyed tile 0).
    expect(usedScrambleTiles(bebe, 'b', [2])).toEqual([false, false, true, false])
  })

  it('taps the FIRST of a duplicate pair → the first tile depletes', () => {
    expect(usedScrambleTiles(bebe, 'b', [0])).toEqual([true, false, false, false])
  })

  it('both twins tapped → both deplete', () => {
    expect(usedScrambleTiles(bebe, 'bb', [2, 0])).toEqual([true, false, true, false])
  })

  it('deleting a tapped letter releases its tile', () => {
    // Backspace shortens the answer; the tapped index finds no matching char and is skipped.
    expect(usedScrambleTiles(bebe, '', [2])).toEqual([false, false, false, false])
  })

  it('a stale tapped index whose glyph is absent is ignored', () => {
    // tile 2 is "b" but only "e" was entered → pass 0 skips, pass 1 greys the first e (index 1).
    expect(usedScrambleTiles(bebe, 'e', [2])).toEqual([false, true, false, false])
  })

  it('tapping one twin then TYPING the same letter greys both', () => {
    // pass 0 claims one "b" for tile 2; pass 1 claims the other for tile 0.
    expect(usedScrambleTiles(bebe, 'bb', [2])).toEqual([true, false, true, false])
  })

  it('accent-variant tiles still resolve by exact glyph when tapped (v0.12.9 intact)', () => {
    const tiles = ['r', 'ó', 'l', 'g', 'o']
    expect(usedScrambleTiles(tiles, 'o', [4])).toEqual([false, false, false, false, true])
    expect(usedScrambleTiles(tiles, 'ó', [1])).toEqual([false, true, false, false, false])
  })

  it('an out-of-range tapped index is ignored (no crash, falls through to glyph matching)', () => {
    expect(usedScrambleTiles(bebe, 'b', [99])).toEqual([true, false, false, false])
    expect(usedScrambleTiles(bebe, 'b', [-1])).toEqual([true, false, false, false])
  })

  it('an empty tap log is identical to omitting the argument', () => {
    expect(usedScrambleTiles(bebe, 'be', [])).toEqual(usedScrambleTiles(bebe, 'be'))
    expect(usedScrambleTiles(['ó', 'o'], 'óo', [])).toEqual(usedScrambleTiles(['ó', 'o'], 'óo'))
  })
})
