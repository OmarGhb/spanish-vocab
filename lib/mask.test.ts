import { describe, it, expect } from 'vitest'
import { maskSentence, maskVerbSentence, maskProcliticReflexive, BLANK } from './mask'

describe('maskVerbSentence — paradigm-aware verb masking', () => {
  it('blanks the conjugated form and recovers coordinates', () => {
    const r = maskVerbSentence('Esta tarde estudiamos los verbos irregulares.', 'estudiar')
    expect(r).not.toBeNull()
    expect(r!.masked).toBe(`Esta tarde ${BLANK} los verbos irregulares.`)
    expect(r!.target).toEqual({ surface: 'estudiamos', tense: 'presente', person: 'nosotros' })
  })

  it('blanks an irregular form whose stem differs from the infinitive (dio — the old MC gap)', () => {
    const r = maskVerbSentence('El profesor dio una hoja a cada alumno.', 'dar')
    expect(r).not.toBeNull()
    expect(r!.target.surface).toBe('dio')
    expect(r!.target).toMatchObject({ tense: 'preterito', person: 'él' })
  })

  it('recovers accent-accurate coordinates (logró = pretérito él, not presente yo)', () => {
    const r = maskVerbSentence('El concierto logró llenar el estadio.', 'lograr')
    expect(r!.target).toMatchObject({ surface: 'logró', tense: 'preterito', person: 'él' })
  })

  it('blanks the infinitive when that is the form in the sentence', () => {
    const r = maskVerbSentence('Me gusta estudiar por la mañana.', 'estudiar')
    expect(r!.target).toMatchObject({ surface: 'estudiar', tense: 'infinitivo', person: null })
  })

  it('handles a reflexive lemma via the finite form (clitic is a separate token)', () => {
    const r = maskVerbSentence('Me divierto mucho en las fiestas.', 'divertirse')
    expect(r).not.toBeNull()
    expect(r!.target).toMatchObject({ surface: 'divierto', person: 'yo' })
  })

  it('returns null for a clitic-attached infinitive (probarme) → falls back to maskSentence', () => {
    // "probarme" is a single token not in the paradigm; the verb path declines, the caller
    // falls back to the stem heuristic on the stored word.
    expect(maskVerbSentence('Quiero probarme estos pantalones.', 'probarse')).toBeNull()
  })

  it('strips surrounding punctuation for the membership test', () => {
    const r = maskVerbSentence('¿Comieron toda la sopa?', 'comer')
    expect(r!.target).toMatchObject({ surface: 'Comieron', tense: 'preterito', person: 'ellos' })
  })

  it('returns null for a non-conjugable lemma (graceful fallback to maskSentence)', () => {
    expect(maskVerbSentence('Estaba saltando en el parque.', 'saltando')).toBeNull()
  })

  it('returns null when no paradigm token is present', () => {
    expect(maskVerbSentence('La casa es azul.', 'comer')).toBeNull()
  })

  it('backfilled inflected-add (lemma=volver) now resolves a verb target', () => {
    // Before the lemma backfill, verbLemma was the inflected word "volvíamos" (not conjugable)
    // → null → verb path bypassed. With lemma="volver" the imperfecto form is masked + coordinated.
    const r = maskVerbSentence('Antes volvíamos a casa caminando.', 'volver')
    expect(r).not.toBeNull()
    expect(r!.target).toMatchObject({ surface: 'volvíamos', tense: 'imperfecto', person: 'nosotros' })
  })
})

describe('maskVerbSentence — accent-homograph denylist (#2)', () => {
  it('does NOT mask the preposition "de" (dé→de); masks the real verb "dio" instead', () => {
    const r = maskVerbSentence('Esa película de terror me dio tanto miedo que no dormí.', 'dar')
    expect(r).not.toBeNull()
    expect(r!.target.surface).toBe('dio')
    expect(r!.masked).toBe('Esa película de terror me ' + BLANK + ' tanto miedo que no dormí.')
  })

  it('still masks an accent-EXACT form that is not a function word (está)', () => {
    const r = maskVerbSentence('La tienda está cerrada hoy.', 'estar')
    expect(r!.target.surface).toBe('está')
  })

  it('skips the demonstrative "esta" (esta→está) and declines when no real form is present', () => {
    expect(maskVerbSentence('Esta casa es azul.', 'estar')).toBeNull()
  })

  it('does NOT mask the clitic/pronoun "se" via saber\'s "sé" (sé→se)', () => {
    // "se" is the impersonal pronoun here; the only paradigm fold is saber's "sé".
    expect(maskVerbSentence('Aquí no se permite fumar.', 'saber')).toBeNull()
  })
})

describe('maskProcliticReflexive — clitic-aware masking (#1)', () => {
  it('masks the full "te + verb" unit and sets surface to the stored form', () => {
    const r = maskProcliticReflexive(
      '¿A qué hora te levantas los lunes para ir al trabajo?',
      'te levantas',
      'levantarse',
    )
    expect(r).not.toBeNull()
    expect(r!.masked).toBe(`¿A qué hora ${BLANK} los lunes para ir al trabajo?`)
    expect(r!.target).toMatchObject({ surface: 'te levantas', tense: 'presente', person: 'tú' })
  })

  it('masks a "se + verb" unit (3rd person reflexive)', () => {
    const r = maskProcliticReflexive('Mi hermano se levanta muy temprano.', 'se levanta', 'levantarse')
    expect(r!.masked).toBe(`Mi hermano ${BLANK} muy temprano.`)
    expect(r!.target.surface).toBe('se levanta')
  })

  it('lemma passed RAW handles an o→ue stem-changer (dormirse → duermes)', () => {
    // Proves Claim 1: the -se lemma is passed raw (paradigm strips internally) AND a stem-change
    // verb resolves — "duermes" is in dormirse's paradigm.
    const r = maskProcliticReflexive('Siempre te duermes en el sofá por la noche.', 'te duermes', 'dormirse')
    expect(r).not.toBeNull()
    expect(r!.target.surface).toBe('te duermes')
  })

  it('declines for an e→ie verb the conjugator lacks (sentarse → sientas) — known coverage gap', () => {
    // The conjugator does NOT have sentar as an e→ie present stem-changer, so "sientas" is not in
    // its paradigm → the verb is not located → null → "te sientas" stays definition-MCQ (graceful,
    // no regression). Locked so a future conjugator fix flips this deliberately. (v0.6.x backlog.)
    expect(maskProcliticReflexive('¿Por qué siempre te sientas al fondo?', 'te sientas', 'sentarse')).toBeNull()
  })

  it('declines for a non-proclitic word (returns null → caller falls back)', () => {
    expect(maskProcliticReflexive('Esta tarde estudiamos mucho.', 'estudiamos', 'estudiar')).toBeNull()
  })

  it('declines gracefully when the lemma is non-conjugable (legacy lemma-null before backfill)', () => {
    // verbLemma = the stored word itself ("te levantas"); maskVerbSentence declines → null.
    expect(
      maskProcliticReflexive('¿A qué hora te levantas?', 'te levantas', 'te levantas'),
    ).toBeNull()
  })

  it('declines when the clitic is absent before the verb in the sentence', () => {
    // Sentence uses a different person ("se levanta") than the stored proclitic word ("te levantas").
    expect(maskProcliticReflexive('Ella se levanta tarde.', 'te levantas', 'levantarse')).toBeNull()
  })
})

describe('maskSentence — unchanged non-verb path', () => {
  it('exact case-insensitive match', () => {
    expect(maskSentence('El mercado está cerrado.', 'mercado')).toBe(`El ${BLANK} está cerrado.`)
  })
  it('returns null when nothing matches', () => {
    expect(maskSentence('La casa es azul.', 'mercado')).toBeNull()
  })
})
