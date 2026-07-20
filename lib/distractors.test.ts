import { describe, it, expect } from 'vitest'
import { glossesOverlap, selectDistractors, isSpanishInfinitive, type DistractorCandidate } from './distractors'

describe('isSpanishInfinitive', () => {
  it('accepts clear infinitives (-ar/-er/-ir)', () => {
    for (const w of ['hablar', 'comer', 'vivir', 'dar', 'ser', 'ir']) {
      expect(isSpanishInfinitive(w)).toBe(true)
    }
  })

  it('accepts enclitic-reflexive infinitives', () => {
    for (const w of ['levantarse', 'acostarse', 'irse', 'reírse']) {
      expect(isSpanishInfinitive(w)).toBe(true)
    }
  })

  it('accepts accented infinitives (accent-folded)', () => {
    for (const w of ['reír', 'oír', 'freír']) {
      expect(isSpanishInfinitive(w)).toBe(true)
    }
  })

  it('REJECTS conjugated forms — including ones that superficially resemble infinitives', () => {
    // none of these end in a bare -ar/-er/-ir; accented ones are rejected after accent-folding
    for (const w of ['contaron', 'gritaron', 'escucharon', 'bebes', 'pruebas', 'muerdes', 'hablaron', 'bebieron', 'comería', 'comió', 'duermes', 'vivís', 'hablo']) {
      expect(isSpanishInfinitive(w)).toBe(false)
    }
  })

  it('rejects multi-word phrases and empty input', () => {
    expect(isSpanishInfinitive('a menudo')).toBe(false)
    expect(isSpanishInfinitive('')).toBe(false)
    expect(isSpanishInfinitive('   ')).toBe(false)
  })

  it('KNOWN LIMIT: a FORM check, so non-verbs ending in -ar/-er/-ir pass (the verb-POS gate upstream handles this)', () => {
    // documented over-acceptance — mujer/lugar are nouns, but the filter only runs on verb-POS candidates
    expect(isSpanishInfinitive('mujer')).toBe(true)
    expect(isSpanishInfinitive('lugar')).toBe(true)
  })
})

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

  it('requireInfinitive: prefers infinitive candidates, drops conjugated ones when enough infinitives exist', () => {
    const target: DistractorCandidate = { word: 'hablar', fr: 'parler' }
    const candidates: DistractorCandidate[] = [
      { word: 'contaron', fr: 'raconter' }, // conjugated → excluded when infinitives suffice
      { word: 'gritar', fr: 'crier' },
      { word: 'escuchar', fr: 'écouter' },
      { word: 'callar', fr: 'se taire' },
      { word: 'bebes', fr: 'boire' }, // conjugated → excluded
      { word: 'preguntar', fr: 'demander' },
    ]
    const result = selectDistractors(target, candidates, 3, { requireInfinitive: true })
    expect(result).toHaveLength(3)
    expect(result.every((w) => isSpanishInfinitive(w))).toBe(true)
    expect(result).not.toContain('contaron')
    expect(result).not.toContain('bebes')
  })

  it('rejectInfinitive: for an inflected target, drops infinitive distractors and keeps conjugated ones', () => {
    const target: DistractorCandidate = { word: 'sujetaron', fr: 'tenir' }
    const candidates: DistractorCandidate[] = [
      { word: 'soltar', fr: 'lâcher' }, // infinitive → wrong form → excluded
      { word: 'soltaron', fr: 'lâcher' },
      { word: 'lanzaron', fr: 'lancer' },
      { word: 'empujaron', fr: 'pousser' },
      { word: 'lanzar', fr: 'lancer' }, // infinitive → excluded
      { word: 'agarraron', fr: 'attraper' },
    ]
    const result = selectDistractors(target, candidates, 3, { rejectInfinitive: true })
    expect(result).toHaveLength(3)
    expect(result.some((w) => isSpanishInfinitive(w))).toBe(false) // no infinitive survives
    expect(result).not.toContain('soltar')
    expect(result).not.toContain('lanzar')
  })

  it('rejectInfinitive: backfills an infinitive only when too few conjugated forms survive (graceful)', () => {
    const target: DistractorCandidate = { word: 'sujetaron', fr: 'tenir' }
    const candidates: DistractorCandidate[] = [
      { word: 'soltaron', fr: 'lâcher' }, // 1 clean conjugated form
      { word: 'soltar', fr: 'a' },
      { word: 'lanzar', fr: 'b' },
      { word: 'empujar', fr: 'c' },
      { word: 'agarrar', fr: 'd' },
      { word: 'atar', fr: 'e' },
    ]
    const result = selectDistractors(target, candidates, 3, { rejectInfinitive: true })
    expect(result).toHaveLength(3) // still exactly 3 — backfilled from infinitives
    expect(result).toContain('soltaron')
    expect(result.some((w) => isSpanishInfinitive(w))).toBe(true) // an infinitive was backfilled
  })

  it('requireInfinitive: backfills a conjugated form only when too few infinitives survive (graceful)', () => {
    const target: DistractorCandidate = { word: 'hablar', fr: 'parler' }
    const candidates: DistractorCandidate[] = [
      { word: 'gritar', fr: 'crier' }, // 1 clean infinitive
      { word: 'contaron', fr: 'raconter' }, // conjugated
      { word: 'bebieron', fr: 'boire' }, // conjugated
      { word: 'comieron', fr: 'manger' }, // conjugated
      { word: 'durmieron', fr: 'dormir' }, // conjugated
      { word: 'saltaron', fr: 'sauter' }, // conjugated
    ]
    const result = selectDistractors(target, candidates, 3, { requireInfinitive: true })
    expect(result).toHaveLength(3) // still exactly 3 — backfilled from conjugated forms
    expect(result).toContain('gritar')
    expect(result.some((w) => !isSpanishInfinitive(w))).toBe(true) // a conjugated form was backfilled
  })
})
