import { describe, it, expect } from 'vitest'
import { pickClozeExample, isVerbPos } from './review-cloze'
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
