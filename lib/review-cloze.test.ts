import { describe, it, expect } from 'vitest'
import { pickClozeExample, isVerbPos, chooseQcmCue, type ClozeExample } from './review-cloze'
import { BLANK } from './mask'

// seed = parseInt('00000000', 16) = 0 → start at examples[0].
const id0 = '00000000-0000-0000-0000-000000000000'

describe('isVerbPos', () => {
  it('true only for v. and v.pron.', () => {
    expect(isVerbPos('v.')).toBe(true)
    expect(isVerbPos('v.pron.')).toBe(true)
    expect(isVerbPos('n.m.')).toBe(false)
    expect(isVerbPos('adj.')).toBe(false)
    expect(isVerbPos(undefined)).toBe(false)
  })
})

describe('pickClozeExample', () => {
  it('returns null when there are no examples', () => {
    expect(pickClozeExample({ examples: [], word: 'casa', id: id0, lemma: null, pos: 'n.f.' })).toBeNull()
  })

  it('non-verb: masks the target word verbatim, target null', () => {
    const r = pickClozeExample({
      examples: [{ es: 'Vimos el atardecer en la playa.', fr: 'fr' }],
      word: 'atardecer',
      id: id0,
      lemma: null,
      pos: 'n.m.',
    })
    expect(r).not.toBeNull()
    expect(r!.masked).toBe(`Vimos el ${BLANK} en la playa.`)
    expect(r!.target).toBeNull()
  })

  it('non-verb: returns null when the word cannot be masked (caller forces MC / definition)', () => {
    const r = pickClozeExample({
      examples: [{ es: 'Una frase sin el término buscado.', fr: 'fr' }],
      word: 'xyzqwk',
      id: id0,
      lemma: null,
      pos: 'n.m.',
    })
    expect(r).toBeNull()
  })

  it('verb (lemma-stored, word = infinitive): masks the contextual conjugated form + coordinates', () => {
    const r = pickClozeExample({
      examples: [{ es: 'El árbol creció muy rápido este año.', fr: 'fr' }],
      word: 'crecer',
      id: id0,
      lemma: null,
      pos: 'v.',
    })
    expect(r!.masked).toBe(`El árbol ${BLANK} muy rápido este año.`)
    expect(r!.target).toMatchObject({ surface: 'creció', tense: 'preterito', person: 'él' })
  })

  it('verb (inflected-stored, word = conjugated): masks via the infinitive lemma paradigm', () => {
    const r = pickClozeExample({
      examples: [{ es: 'Esta tarde estudiamos los verbos irregulares.', fr: 'fr' }],
      word: 'estudiamos',
      id: id0,
      lemma: 'estudiar',
      pos: 'v.',
    })
    expect(r!.masked).toBe(`Esta tarde ${BLANK} los verbos irregulares.`)
    expect(r!.target).toMatchObject({ surface: 'estudiamos', tense: 'presente', person: 'nosotros' })
  })

  it('verb fallback: non-conjugable lemma → maskSentence on the stored word, target null', () => {
    // "saltando" (gerund) is not a conjugable infinitive → maskVerbSentence declines → falls
    // back to the stem heuristic on the stored word.
    const r = pickClozeExample({
      examples: [{ es: 'Los niños están saltando en el parque.', fr: 'fr' }],
      word: 'saltando',
      id: id0,
      lemma: 'saltando',
      pos: 'v.',
    })
    expect(r).not.toBeNull()
    expect(r!.masked).toBe(`Los niños están ${BLANK} en el parque.`)
    expect(r!.target).toBeNull()
  })

  it('is deterministic on the card id (seed 0 → first example)', () => {
    const examples = [
      { es: 'Vimos el atardecer en la playa.', fr: 'a' },
      { es: 'Otro atardecer naranja sobre el mar.', fr: 'b' },
    ]
    const a = pickClozeExample({ examples, word: 'atardecer', id: id0, lemma: null, pos: 'n.m.' })
    const b = pickClozeExample({ examples, word: 'atardecer', id: id0, lemma: null, pos: 'n.m.' })
    expect(a!.example.fr).toBe('a')
    expect(b!.example.fr).toBe('a')
  })
})

describe('chooseQcmCue', () => {
  const ex = [{ es: 'frase', fr: 'phrase' }]
  const cloze = (surface: string): ClozeExample => ({
    example: ex[0],
    masked: `... ${BLANK} ...`,
    target: { surface, tense: 'presente', person: 'yo' },
  })

  it('no example → definition (only option)', () => {
    const card = { examples: [], word: 'crecer', definition: { pos: 'v.' } }
    expect(chooseQcmCue(card, null, 0)).toBe('definition')
  })

  it('verb stored in the example form (target == word) → cloze', () => {
    const card = { examples: ex, word: 'estudiamos', definition: { pos: 'v.' } }
    expect(chooseQcmCue(card, cloze('estudiamos'), 0)).toBe('cloze')
  })

  it('verb stored in form — accent-tolerant match (volvíamos) → cloze', () => {
    const card = { examples: ex, word: 'volvíamos', definition: { pos: 'v.' } }
    expect(chooseQcmCue(card, cloze('volvíamos'), 1)).toBe('cloze')
  })

  it('infinitive-stored verb (blank is a conjugation ≠ stored word) → definition', () => {
    const card = { examples: ex, word: 'crecer', definition: { pos: 'v.' } }
    expect(chooseQcmCue(card, cloze('creció'), 0)).toBe('definition')
  })

  it('verb with target null (gerund/participle-stored, no paradigm match) → definition', () => {
    const card = { examples: ex, word: 'saltando', definition: { pos: 'v.' } }
    const picked: ClozeExample = { example: ex[0], masked: `... ${BLANK} ...`, target: null }
    expect(chooseQcmCue(card, picked, 0)).toBe('definition')
  })

  it('verb with no maskable example (picked null) → definition', () => {
    const card = { examples: ex, word: 'crecer', definition: { pos: 'v.' } }
    expect(chooseQcmCue(card, null, 0)).toBe('definition')
  })

  it('non-verb → existing seed%2 split (even = cloze, odd = definition); picked ignored', () => {
    const card = { examples: ex, word: 'mercado', definition: { pos: 'n.m.' } }
    expect(chooseQcmCue(card, null, 0)).toBe('cloze')
    expect(chooseQcmCue(card, null, 2)).toBe('cloze')
    expect(chooseQcmCue(card, null, 1)).toBe('definition')
    expect(chooseQcmCue(card, null, 3)).toBe('definition')
  })
})
