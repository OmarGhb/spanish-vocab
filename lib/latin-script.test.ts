import { describe, it, expect } from 'vitest'
import { isLatinScript } from './latin-script'

// Accented fixtures are built from escapes so the test is unambiguous regardless of source encoding.
const INCREIBLE = 'increíble' // increíble (precomposed í)
const SEGUN = 'según' // según
const NINO = 'niño' // niño
const PINGUINO = 'pingüino' // pingüino (ü)
const BALON = 'balón' // balón
// "bebер": Latin b-e-b then Cyrillic е (U+0435) + р (U+0440) — the homoglyph that leaked in.
const CYRILLIC_HOMOGLYPH = 'bebер'

describe('isLatinScript — discovery script guard (A2)', () => {
  it('accepts everything legitimate Spanish discovery can produce', () => {
    for (const w of [
      'beber',
      INCREIBLE,
      SEGUN,
      NINO,
      PINGUINO,
      BALON,
      'ex-marido', // hyphenated compound
      'a menudo', // two-word phrase
      "pa'lante", // apostrophe (colloquial elision)
    ]) {
      expect(isLatinScript(w), w).toBe(true)
    }
  })

  it('accepts decomposed (NFD) accents via \\p{M}', () => {
    const nfd = INCREIBLE.normalize('NFD')
    expect(nfd).not.toBe(INCREIBLE.normalize('NFC')) // sanity: really decomposed (letter + combining mark)
    expect(isLatinScript(nfd)).toBe(true)
  })

  it('rejects the Cyrillic-homoglyph case that leaked into the deck', () => {
    expect(isLatinScript(CYRILLIC_HOMOGLYPH)).toBe(false)
  })

  it('rejects other foreign scripts and non-letters', () => {
    expect(isLatinScript('λόγος')).toBe(false) // Greek λόγος
    expect(isLatinScript('東京')).toBe(false) // CJK 東京
    expect(isLatinScript('cafe☕')).toBe(false) // emoji
    expect(isLatinScript('')).toBe(false) // empty → never insert
  })
})
