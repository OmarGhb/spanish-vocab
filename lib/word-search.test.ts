import { describe, it, expect } from 'vitest'
import { normalizeSearch, matchesWordSearch, type WordSearchFields } from './word-search'

const item = (over: Partial<WordSearchFields> = {}): WordSearchFields => ({
  word: '',
  defEs: '',
  defFr: '',
  ...over,
})

describe('normalizeSearch', () => {
  it('lowercases', () => {
    expect(normalizeSearch('BEBÍ')).toBe('bebi')
  })

  it('strips diacritics (accents fold to base)', () => {
    expect(normalizeSearch('bebí')).toBe('bebi')
    expect(normalizeSearch('canción')).toBe('cancion')
  })

  it('folds ñ→n (the WANTED behaviour here)', () => {
    expect(normalizeSearch('niño')).toBe('nino')
  })

  it('trims surrounding whitespace', () => {
    expect(normalizeSearch('  bebí  ')).toBe('bebi')
  })
})

describe('matchesWordSearch', () => {
  it('matches an accent-insensitive query against the Spanish word', () => {
    expect(matchesWordSearch(item({ word: 'bebí' }), 'bebi')).toBe(true)
  })

  it('matches "nino" against "niño" (ñ→n fold)', () => {
    expect(matchesWordSearch(item({ word: 'niño' }), 'nino')).toBe(true)
  })

  it('matches against the Spanish gloss (defEs)', () => {
    expect(matchesWordSearch(item({ defEs: 'pequeño de edad' }), 'pequeno')).toBe(true)
  })

  it('matches against the French gloss (defFr)', () => {
    expect(matchesWordSearch(item({ defFr: 'enfant' }), 'enfant')).toBe(true)
  })

  it('is case-insensitive', () => {
    expect(matchesWordSearch(item({ word: 'Comer' }), 'COM')).toBe(true)
  })

  it('trims the query', () => {
    expect(matchesWordSearch(item({ word: 'comer' }), '  com  ')).toBe(true)
  })

  it('an empty / whitespace-only query matches everything', () => {
    expect(matchesWordSearch(item({ word: 'comer' }), '')).toBe(true)
    expect(matchesWordSearch(item({ word: 'comer' }), '   ')).toBe(true)
  })

  it('returns false when no field contains the query', () => {
    expect(
      matchesWordSearch(item({ word: 'comer', defEs: 'ingerir', defFr: 'manger' }), 'xyz'),
    ).toBe(false)
  })
})
