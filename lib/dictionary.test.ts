import { describe, expect, it } from 'vitest'
import { bucketOf, groupAZ, type DictionaryEntry } from './dictionary'

function entry(word: string): DictionaryEntry {
  return { id: word, word, defEs: '' }
}

describe('bucketOf', () => {
  it('buckets a plain initial under its uppercase letter', () => {
    expect(bucketOf('mercado')).toBe('M')
    expect(bucketOf('Zapato')).toBe('Z')
  })

  it('folds accented initials onto their base letter (bucketing only)', () => {
    expect(bucketOf('árbol')).toBe('A')
    expect(bucketOf('éxito')).toBe('E')
    expect(bucketOf('índice')).toBe('I')
    expect(bucketOf('óptimo')).toBe('O')
    expect(bucketOf('último')).toBe('U')
    expect(bucketOf('über')).toBe('U') // ü folds to U
  })

  it('gives ñ its own bucket, not folded into N', () => {
    expect(bucketOf('ñandú')).toBe('Ñ')
    expect(bucketOf('Ñoño')).toBe('Ñ')
    expect(bucketOf('nube')).toBe('N')
  })

  it('routes non-letter initials to #', () => {
    expect(bucketOf('123')).toBe('#')
    expect(bucketOf('')).toBe('#')
  })
})

describe('groupAZ', () => {
  it('orders sections A…N, Ñ, O…Z and drops empty letters', () => {
    const sections = groupAZ([entry('ñandú'), entry('nube'), entry('óptimo'), entry('árbol')])
    expect(sections.map((s) => s.letter)).toEqual(['A', 'N', 'Ñ', 'O'])
  })

  it('sorts within a bucket by Spanish locale', () => {
    const [section] = groupAZ([entry('mesa'), entry('mar'), entry('médico')])
    expect(section.entries.map((e) => e.word)).toEqual(['mar', 'médico', 'mesa'])
  })

  it('places ñ-initial words after all N words across sections', () => {
    const sections = groupAZ([entry('ñu'), entry('nido')])
    const flat = sections.flatMap((s) => s.entries.map((e) => e.word))
    expect(flat).toEqual(['nido', 'ñu'])
  })
})
