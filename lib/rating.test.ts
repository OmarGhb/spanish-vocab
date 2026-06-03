import { describe, it, expect } from 'vitest'
import { classifyVerbBlank, classifyBlankAnswer, computeRating } from './rating'
import { isInParadigm } from './conjugator'

// target = the conjugated form blanked from the sentence; lemma = the infinitive.
const grade = (target: string, lemma: string, userAnswer: string) =>
  classifyVerbBlank({
    target,
    lemma,
    userAnswer,
    inParadigm: (a) => isInParadigm(a, lemma),
  })

describe('classifyVerbBlank — option C acceptance', () => {
  it('exact conjugated form → exact (¡Eso es!)', () => {
    expect(grade('estudiamos', 'estudiar', 'estudiamos')).toMatchObject({
      quality: 'exact',
      reason: 'exact',
    })
  })

  it('accent-less exact form → exact (folded distance 0... or near)', () => {
    // "estudio" vs target "estudió": distance 1 → typo near-miss, still ¡Casi! (accent cushion)
    expect(grade('estudió', 'estudiar', 'estudio')).toMatchObject({ quality: 'near' })
  })

  it('the lemma typed instead of the conjugated form → near (¡Casi!, reason lemma)', () => {
    expect(grade('estudiamos', 'estudiar', 'estudiar')).toMatchObject({
      quality: 'near',
      reason: 'lemma',
    })
  })

  it('lemma match is accent-folded', () => {
    expect(grade('comió', 'comer', 'comer')).toMatchObject({ quality: 'near', reason: 'lemma' })
  })

  it('a typo near-miss of the target → near (reason typo)', () => {
    expect(grade('estudiamos', 'estudiar', 'estudiamus')).toMatchObject({
      quality: 'near',
      reason: 'typo',
    })
  })

  it('a different valid inflection of the same verb → near (reason inflection)', () => {
    // target nosotros-present, user types the él-preterite — far from target, but valid paradigm
    expect(grade('estudiamos', 'estudiar', 'estudió')).toMatchObject({
      quality: 'near',
      reason: 'inflection',
    })
  })

  it('an unrelated word → wrong (¡Uy!)', () => {
    expect(grade('estudiamos', 'estudiar', 'comieron')).toMatchObject({
      quality: 'wrong',
      reason: 'wrong',
    })
  })
})

describe('computeRating — verb context reuses the existing near rating', () => {
  const verb = {
    target: 'estudiamos',
    lemma: 'estudiar',
    inParadigm: (a: string) => isInParadigm(a, 'estudiar'),
  }

  it('lemma answer rates like a near miss (not wrong)', () => {
    const r = computeRating({
      correctWord: 'estudiamos',
      userAnswer: 'estudiar',
      timeMs: 4000,
      hintUsed: false,
      mode: 'blank',
      verb,
    })
    // near + fast → rating 3 (same mapping as a typo near-miss); NOT 1 (wrong)
    expect(r.rating).toBe(3)
  })

  it('exact conjugated answer fast → rating 4', () => {
    const r = computeRating({
      correctWord: 'estudiamos',
      userAnswer: 'estudiamos',
      timeMs: 2000,
      hintUsed: false,
      mode: 'blank',
      verb,
    })
    expect(r.rating).toBe(4)
  })

  it('unrelated answer → rating 1', () => {
    const r = computeRating({
      correctWord: 'estudiamos',
      userAnswer: 'comieron',
      timeMs: 2000,
      hintUsed: false,
      mode: 'blank',
      verb,
    })
    expect(r.rating).toBe(1)
  })
})

describe('non-verb grading is untouched', () => {
  it('classifyBlankAnswer still classifies exact/near/wrong as before', () => {
    expect(classifyBlankAnswer('mercado', 'mercado')).toMatchObject({ quality: 'exact' })
    expect(classifyBlankAnswer('mercado', 'mercdo')).toMatchObject({ quality: 'near' })
    expect(classifyBlankAnswer('mercado', 'biblioteca')).toMatchObject({ quality: 'wrong' })
  })

  it('computeRating without verb context grades via classifyBlankAnswer', () => {
    const r = computeRating({
      correctWord: 'mercado',
      userAnswer: 'biblioteca',
      timeMs: 2000,
      hintUsed: false,
      mode: 'blank',
    })
    expect(r.rating).toBe(1)
  })
})
