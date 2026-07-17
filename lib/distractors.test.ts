import { describe, it, expect } from 'vitest'
import { glossesOverlap, selectDistractors, type DistractorCandidate } from './distractors'

describe('glossesOverlap', () => {
  it('flags a synonym pair sharing a gloss token', () => {
    expect(glossesOverlap({ fr: 'heureux, content' }, { fr: 'heureux' })).toBe(true)
    expect(glossesOverlap({ fr: 'voiture' }, { fr: 'voiture, automobile' })).toBe(true)
  })

  it('flags a partial overlap (slash-separated alternatives)', () => {
    expect(glossesOverlap({ fr: 'dire / parler' }, { fr: 'parler' })).toBe(true)
  })

  it('keeps clearly-different words (no shared token)', () => {
    expect(glossesOverlap({ fr: 'chien' }, { fr: 'chat' })).toBe(false)
  })

  it('handles multi-token glosses (comma-separated)', () => {
    expect(glossesOverlap({ fr: 'le marché, la place' }, { fr: 'la place' })).toBe(true)
    expect(glossesOverlap({ fr: 'le marché, la place' }, { fr: 'la gare' })).toBe(false)
  })

  it('is accent- and case-insensitive', () => {
    expect(glossesOverlap({ fr: 'Café' }, { fr: 'café' })).toBe(true)
    expect(glossesOverlap({ fr: 'éléphant' }, { fr: 'elephant' })).toBe(true)
  })

  it('auto-uses a second gloss field (en-readiness) without a rewrite', () => {
    // fr differs, but both carry en:'dog' → overlap detected via the en field.
    expect(glossesOverlap({ fr: 'chien', en: 'dog' }, { fr: 'chat', en: 'dog' })).toBe(true)
    // both fields differ → no overlap.
    expect(glossesOverlap({ fr: 'chien', en: 'dog' }, { fr: 'chat', en: 'cat' })).toBe(false)
  })
})

describe('selectDistractors', () => {
  it('drops a synonym of the target, keeps distinct words, returns exactly 3', () => {
    const target: DistractorCandidate = { word: 'feliz', fr: 'heureux' }
    const candidates: DistractorCandidate[] = [
      { word: 'contento', fr: 'heureux, content' }, // synonym → dropped
      { word: 'triste', fr: 'triste' },
      { word: 'cansado', fr: 'fatigué' },
      { word: 'enfadado', fr: 'fâché' },
      { word: 'nervioso', fr: 'nerveux' },
      { word: 'aburrido', fr: 'ennuyé' },
    ]
    const result = selectDistractors(target, candidates)
    expect(result).toHaveLength(3)
    expect(result).not.toContain('contento')
    expect(new Set(result).size).toBe(3) // all distinct
  })

  it('excludes a candidate equal to the target word', () => {
    const target: DistractorCandidate = { word: 'gato', fr: 'chat' }
    const candidates: DistractorCandidate[] = [
      { word: 'Gato', fr: 'matou' }, // same word (case-folded) → excluded even though gloss differs
      { word: 'perro', fr: 'chien' },
      { word: 'pájaro', fr: 'oiseau' },
      { word: 'pez', fr: 'poisson' },
      { word: 'conejo', fr: 'lapin' },
      { word: 'ratón', fr: 'souris' },
    ]
    const result = selectDistractors(target, candidates)
    expect(result).toHaveLength(3)
    expect(result.map((w) => w.toLowerCase())).not.toContain('gato')
  })

  it('backfills from dropped synonyms when fewer than 3 survive the filter', () => {
    const target: DistractorCandidate = { word: 'x', fr: 'aaa' }
    const candidates: DistractorCandidate[] = [
      { word: 'a1', fr: 'aaa' }, // synonym
      { word: 'a2', fr: 'aaa, zzz' }, // synonym
      { word: 'a3', fr: 'aaa' }, // synonym
      { word: 'a4', fr: 'aaa' }, // synonym
      { word: 'b1', fr: 'bbb' }, // distinct
      { word: 'b2', fr: 'ccc' }, // distinct
    ]
    const result = selectDistractors(target, candidates)
    expect(result).toHaveLength(3) // never fewer than the required 3
    expect(result).toContain('b1')
    expect(result).toContain('b2')
    // the 3rd is backfilled from a dropped synonym
    expect(result.some((w) => ['a1', 'a2', 'a3', 'a4'].includes(w))).toBe(true)
  })

  it('spread guarantee: the 3 picked are mutually non-overlapping in gloss', () => {
    const target: DistractorCandidate = { word: 't', fr: 'zzz' }
    const candidates: DistractorCandidate[] = [
      { word: 'p', fr: 'aaa' },
      { word: 'q', fr: 'aaa' }, // overlaps p → should be skipped by the spread pick
      { word: 'r', fr: 'bbb' },
      { word: 's', fr: 'ccc' },
      { word: 'u', fr: 'ddd' },
      { word: 'v', fr: 'eee' },
    ]
    const result = selectDistractors(target, candidates)
    expect(result).toHaveLength(3)
    const glossOf = new Map(candidates.map((c) => [c.word, c.fr]))
    for (let i = 0; i < result.length; i++) {
      for (let j = i + 1; j < result.length; j++) {
        expect(glossesOverlap({ fr: glossOf.get(result[i]) }, { fr: glossOf.get(result[j]) })).toBe(false)
      }
    }
  })
})
