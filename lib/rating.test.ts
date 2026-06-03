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

describe('classifyVerbBlank — 6-step order', () => {
  it('1. exact conjugated form → exact (¡Eso es!)', () => {
    expect(grade('estudiamos', 'estudiar', 'estudiamos')).toMatchObject({
      quality: 'exact',
      reason: 'exact',
    })
  })

  it('2. accent-only miss of the target → near (NOT wrongForm) — the accent guard', () => {
    // "estudio" also exists in estudiar's paradigm (pres. yo); the guard must still credit it
    // as a near miss of the target "estudió", not mislabel it "wrong form".
    expect(grade('estudió', 'estudiar', 'estudio')).toMatchObject({
      quality: 'near',
      reason: 'typo',
    })
  })

  it('3. the lemma typed instead of the conjugated form → wrongForm (reason lemma)', () => {
    expect(grade('estudiamos', 'estudiar', 'estudiar')).toMatchObject({
      quality: 'wrongForm',
      reason: 'lemma',
    })
  })

  it('3. lemma match is accent-folded', () => {
    expect(grade('comió', 'comer', 'comer')).toMatchObject({ quality: 'wrongForm', reason: 'lemma' })
  })

  it('4. a different valid inflection → wrongForm (reason inflection)', () => {
    expect(grade('estudiamos', 'estudiar', 'estudió')).toMatchObject({
      quality: 'wrongForm',
      reason: 'inflection',
    })
  })

  it('4. inflection wins over typo — crees→creías (distance 2) is wrongForm, NOT "2 lettres près"', () => {
    const r = grade('creías', 'creer', 'crees')
    expect(r.distance).toBe(2) // within the typo window…
    expect(r).toMatchObject({ quality: 'wrongForm', reason: 'inflection' }) // …but it's a real form
  })

  it('5. a genuine misspelling near-miss (not a valid form) → near (reason typo)', () => {
    // "estudiamus" is within 2 edits of "estudiamos" and is NOT a real inflection.
    expect(isInParadigm('estudiamus', 'estudiar')).toBe(false)
    expect(grade('estudiamos', 'estudiar', 'estudiamus')).toMatchObject({
      quality: 'near',
      reason: 'typo',
    })
  })

  it('6. an unrelated word → wrong (¡Uy!)', () => {
    expect(grade('estudiamos', 'estudiar', 'comieron')).toMatchObject({
      quality: 'wrong',
      reason: 'wrong',
    })
  })
})

describe('classifyVerbBlank — infinitive-target regression (step 3 must never swallow exact)', () => {
  // The most common verb case (42 infinitive-verbatim blanks in the deck): target === lemma.
  it('infinitive target + infinitive answer → exact (NOT wrongForm)', () => {
    expect(grade('estudiar', 'estudiar', 'estudiar')).toMatchObject({
      quality: 'exact',
      reason: 'exact',
    })
  })

  it('infinitive target + a conjugated answer → wrongForm', () => {
    expect(grade('estudiar', 'estudiar', 'estudiamos')).toMatchObject({
      quality: 'wrongForm',
      reason: 'inflection',
    })
  })
})

describe('computeRating — verb recalibration', () => {
  const verbCtx = (target: string, lemma: string) => ({
    target,
    lemma,
    inParadigm: (a: string) => isInParadigm(a, lemma),
  })
  const rate = (target: string, lemma: string, userAnswer: string, timeMs = 3000) =>
    computeRating({ correctWord: target, userAnswer, timeMs, hintUsed: false, mode: 'blank', verb: verbCtx(target, lemma) })

  it('wrongForm (lemma typed) → rating 1 (À revoir), not "close"', () => {
    expect(rate('estudiamos', 'estudiar', 'estudiar').rating).toBe(1)
  })
  it('wrongForm (other inflection) → rating 1', () => {
    expect(rate('estudiamos', 'estudiar', 'estudió').rating).toBe(1)
  })
  it('exact conjugated answer fast → rating 4', () => {
    expect(rate('estudiamos', 'estudiar', 'estudiamos', 2000).rating).toBe(4)
  })
  it('near miss (accent) fast → rating 3', () => {
    expect(rate('estudió', 'estudiar', 'estudio', 2000).rating).toBe(3)
  })
  it('unrelated answer → rating 1', () => {
    expect(rate('estudiamos', 'estudiar', 'comieron').rating).toBe(1)
  })
})

describe('non-verb grading is untouched', () => {
  it('classifyBlankAnswer still classifies exact/near/wrong (never wrongForm)', () => {
    expect(classifyBlankAnswer('mercado', 'mercado')).toMatchObject({ quality: 'exact' })
    expect(classifyBlankAnswer('mercado', 'mercdo')).toMatchObject({ quality: 'near' })
    expect(classifyBlankAnswer('mercado', 'biblioteca')).toMatchObject({ quality: 'wrong' })
  })

  it('computeRating without verb context grades via classifyBlankAnswer', () => {
    const wrong = computeRating({ correctWord: 'mercado', userAnswer: 'biblioteca', timeMs: 2000, hintUsed: false, mode: 'blank' })
    expect(wrong.rating).toBe(1)
    const exact = computeRating({ correctWord: 'mercado', userAnswer: 'mercado', timeMs: 2000, hintUsed: false, mode: 'blank' })
    expect(exact.rating).toBe(4)
  })
})
