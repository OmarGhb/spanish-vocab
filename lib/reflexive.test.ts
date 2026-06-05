import { describe, it, expect } from 'vitest'
import { correctProcliticReflexive, parseReflexiveClitic } from './reflexive'

const REFLEX = (a: string) => a // readability for the annotation arg

describe('parseReflexiveClitic — person→clitic, hardened against annotation variants', () => {
  it('maps person + number to the reflexive clitic', () => {
    expect(parseReflexiveClitic('Acostarse — 1ª pers. sing., reflexiva')).toBe('me')
    expect(parseReflexiveClitic('Acostarse — 2ª pers. sing., reflexiva')).toBe('te')
    expect(parseReflexiveClitic('Acostarse — 3ª pers. sing., reflexiva')).toBe('se')
    expect(parseReflexiveClitic('Acostarse — 1ª pers. plural, reflexiva')).toBe('nos')
    expect(parseReflexiveClitic('Acostarse — 2ª pers. plural, reflexiva')).toBe('os')
    expect(parseReflexiveClitic('Acostarse — 3ª pers. plural, reflexiva')).toBe('se')
  })

  it('usted / ustedes → se (3rd-person agreement)', () => {
    expect(parseReflexiveClitic('Acostarse — usted, reflexiva')).toBe('se')
    expect(parseReflexiveClitic('Acostarse — ustedes, reflexiva')).toBe('se')
    // even when an annotation labels usted as "2ª" politeness, agreement is still "se"
    expect(parseReflexiveClitic('Acostarse — 2ª pers. sing. (usted), reflexiva')).toBe('se')
  })

  it('tolerates ª/a, pers./persona/person, sing./singular, pl./plural, "2.ª" forms', () => {
    expect(parseReflexiveClitic('Acostarse — 2a pers. singular')).toBe('te')
    expect(parseReflexiveClitic('Acostarse — 2.ª persona del singular')).toBe('te')
    expect(parseReflexiveClitic('Acostarse — 1ª persona plural')).toBe('nos')
    expect(parseReflexiveClitic('Acostarse — 1 person plural')).toBe('nos')
    expect(parseReflexiveClitic('Acostarse — primera persona singular')).toBe('me')
    expect(parseReflexiveClitic('Acostarse — segunda persona plural')).toBe('os')
    expect(parseReflexiveClitic('Acostarse — tercera persona')).toBe('se')
    expect(parseReflexiveClitic('Acostarse — 2ª pers. pl.')).toBe('os')
  })

  it('returns null when no person can be parsed', () => {
    expect(parseReflexiveClitic('Acostarse — reflexiva')).toBeNull()
    expect(parseReflexiveClitic('algo sin persona')).toBeNull()
  })
})

describe('correctProcliticReflexive — split detection/correction (v0.6.5 Item 2)', () => {
  const ANN = 'Acostarse — 2ª pers. sing., reflexiva' // 2sg → te

  it('the repro: "ti acuestas" → "te acuestas"', () => {
    expect(correctProcliticReflexive('ti acuestas', 'acostarse', ANN)).toBe('te acuestas')
  })

  it('valid clitic + person matches → unchanged', () => {
    expect(correctProcliticReflexive('te acuestas', 'acostarse', ANN)).toBe('te acuestas')
    expect(correctProcliticReflexive('se acuesta', 'acostarse', 'Acostarse — 3ª pers. sing., reflexiva')).toBe('se acuesta')
    expect(correctProcliticReflexive('os acostáis', 'acostarse', 'Acostarse — 2ª pers. plural, reflexiva')).toBe('os acostáis')
  })

  it('valid clitic + person MISMATCH → correct the clitic', () => {
    // "se acuestas" labelled 2sg → te acuestas (wrong clitic for the person)
    expect(correctProcliticReflexive('se acuestas', 'acostarse', ANN)).toBe('te acuestas')
  })

  it('invalid clitic ("mi"/"ti") + person parseable → correct the clitic', () => {
    expect(correctProcliticReflexive('mi acuesto', 'acostarse', 'Acostarse — 1ª pers. sing., reflexiva')).toBe('me acuesto')
    expect(correctProcliticReflexive('ti acuestas', 'acostarse', ANN)).toBe('te acuestas')
  })

  it('invalid clitic + person NOT parseable → fall back to the lemma (never the typo)', () => {
    expect(correctProcliticReflexive('ti acuestas', 'acostarse', REFLEX('Acostarse — reflexiva'))).toBe('acostarse')
  })

  it('valid clitic + person ambiguous → unchanged (cannot confidently correct)', () => {
    expect(correctProcliticReflexive('te acuestas', 'acostarse', REFLEX('Acostarse — reflexiva'))).toBe('te acuestas')
  })

  it('never fires without the reflexive flag — "para ti" and non-reflexive forms untouched', () => {
    expect(correctProcliticReflexive('para ti', 'para', null)).toBe('para ti')
    expect(correctProcliticReflexive('para ti', 'para', 'Para — preposición')).toBe('para ti')
    // a non-reflexive verb annotation must not be touched even if 2-token
    expect(correctProcliticReflexive('lo comí', 'comer', 'Comer — 1ª pers. sing., pretérito')).toBe('lo comí')
  })

  it('single-token (infinitive / enclitic) and 3+ token forms are out of scope', () => {
    expect(correctProcliticReflexive('acostarse', 'acostarse', ANN)).toBe('acostarse')
    expect(correctProcliticReflexive('acuéstate', 'acostarse', ANN)).toBe('acuéstate')
    expect(correctProcliticReflexive('no te acuestas', 'acostarse', ANN)).toBe('no te acuestas')
  })

  it('missing lemma → unchanged (no safe fallback target)', () => {
    expect(correctProcliticReflexive('ti acuestas', null, REFLEX('Acostarse — reflexiva'))).toBe('ti acuestas')
    expect(correctProcliticReflexive('ti acuestas', '', ANN)).toBe('ti acuestas')
  })

  it('preserves the verb token verbatim (only the clitic slot is corrected)', () => {
    expect(correctProcliticReflexive('ti DUERMES', 'dormirse', 'Dormirse — 2ª pers. sing., reflexiva')).toBe('te DUERMES')
  })
})
