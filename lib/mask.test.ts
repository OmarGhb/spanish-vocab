import { describe, it, expect } from 'vitest'
import { maskSentence, maskVerbSentence, maskInfinitive, maskProcliticReflexive, BLANK } from './mask'

describe('maskInfinitive — bare-infinitive masking (L1 écriture form-coherence)', () => {
  it('masks the bare infinitive after a modal', () => {
    const r = maskInfinitive('Los niños quieren gritar más fuerte.', 'gritar')
    expect(r).not.toBeNull()
    expect(r!.masked).toBe(`Los niños quieren ${BLANK} más fuerte.`)
    expect(r!.target).toEqual({ surface: 'gritar', tense: 'infinitivo', person: null })
  })

  it('masks the INFINITIVE, not an earlier conjugation of the same verb', () => {
    // the explicit case: "gritaron … para gritar" must blank "gritar", skipping "gritaron"
    const r = maskInfinitive('Los aficionados gritaron para gritar aún más.', 'gritar')
    expect(r).not.toBeNull()
    expect(r!.masked).toBe(`Los aficionados gritaron para ${BLANK} aún más.`)
    expect(r!.target.surface).toBe('gritar')
  })

  it('masks the infinitive after a preposition (sin / para)', () => {
    expect(maskInfinitive('Se fue sin gritar.', 'gritar')!.masked).toBe(`Se fue sin ${BLANK}.`)
  })

  it('does NOT match a future form that merely starts with the infinitive (gritaré ≠ gritar)', () => {
    expect(maskInfinitive('Mañana gritaré de alegría.', 'gritar')).toBeNull()
  })

  it('returns null when there is no bare infinitive', () => {
    expect(maskInfinitive('Los aficionados gritaron de alegría.', 'gritar')).toBeNull()
  })

  it('masks a bare reflexive infinitive', () => {
    const r = maskInfinitive('Es difícil levantarse temprano.', 'levantarse')
    expect(r!.masked).toBe(`Es difícil ${BLANK} temprano.`)
    expect(r!.target.surface).toBe('levantarse')
  })
})

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

  // v0.6.4 re-verify: the conjugator's usted-imperatives are now accent-correct (dar→"dé",
  // estar→"está"/"esté"), so the UNACCENTED homographs ("de"/"esta") leave dar's/estar's paradigm
  // entirely and the denylist now guards ONLY the genuine function words. Confirm it neither
  // over-skips a real accented form nor under-guards the preposition.
  it('keeps masking dar→"dio" after the imperative fix (denylist still skips the preposition "de")', () => {
    const r = maskVerbSentence('Esa película de terror me dio tanto miedo.', 'dar')
    expect(r!.target.surface).toBe('dio')
    expect(r!.masked).toBe('Esa película de terror me ' + BLANK + ' tanto miedo.')
  })
  it('masks the now-correct accented imperative "dé" (NOT skipped — only unaccented "de" is denylisted)', () => {
    const r = maskVerbSentence('Quiero que me dé una respuesta.', 'dar')
    expect(r).not.toBeNull()
    expect(r!.target.surface).toBe('dé')
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

  it('AUTO-UPGRADE (v0.6.4): now masks "te sientas" once sentar has the e→ie stem (sientas)', () => {
    // Was the v0.6.3 known gap: the conjugator lacked sentar's e→ie present stem, so "sientas" was
    // not in the paradigm → null → "te sientas" stayed definition-MCQ. v0.6.4 adds PRES_STEM['sentar']
    // = 'sient', so "sientas" resolves and the full clitic+verb unit masks → coherent cloze-MCQ.
    const r = maskProcliticReflexive('¿Por qué siempre te sientas al fondo?', 'te sientas', 'sentarse')
    expect(r).not.toBeNull()
    expect(r!.masked).toBe(`¿Por qué siempre ${BLANK} al fondo?`)
    expect(r!.target).toMatchObject({ surface: 'te sientas', tense: 'presente', person: 'tú' })
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

// ── Roadmap 8d — the folded / length-aware fallback ──────────────────────────────────────────────
describe('maskSentence — 8d strategies 3 and 4', () => {
  it('S3: matches across an accent the raw regex cannot reach', () => {
    // JS `\b` is ASCII-only, so `\búlti\S*` never fires before "última" — the bug that made every
    // accent-initial headword unmaskable.
    expect(maskSentence('Es la última vez que lo digo.', 'última', 'adj.')).toBe(
      `Es la ${BLANK} vez que lo digo.`,
    )
  })

  it('S4: gender agreement (the whole "adjective gender" class)', () => {
    expect(maskSentence('Lleva una vida sana.', 'sano', 'adj.')).toBe(`Lleva una vida ${BLANK}.`)
    expect(maskSentence('Es la última vez que lo digo.', 'último', 'adj.')).toBe(
      `Es la ${BLANK} vez que lo digo.`,
    )
  })

  it('S4: a bare imperative carrying an enclitic', () => {
    // "Ponte" = pon + te. The ending is empty and the enclitic carries the match.
    expect(maskSentence('Ponte el abrigo.', 'ponerse', 'v.pron.')).toBe(`${BLANK} el abrigo.`)
  })

  it('S4: a regular verb whose 4th character is the ending vowel', () => {
    // The old 4-char stem "vivi" cannot prefix "vivo" — regularity was never the issue.
    expect(maskSentence('Vivo en Madrid.', 'vivir', 'v.')).toBe(`${BLANK} en Madrid.`)
  })

  it('S4 declines a stem too short to be safe', () => {
    // "reír" strips to "re", which would match recto / reunión / relación.
    expect(maskSentence('Nos reímos mucho.', 'reír', 'v.')).toBeNull()
  })

  it('S4 declines multiword headwords', () => {
    expect(maskSentence('Me di cuenta de mi error.', 'darse cuenta', 'v.pron.')).toBeNull()
  })

  it('keeps surrounding punctuation outside the blank', () => {
    // `andar` has a stable stem; `venir` would NOT match here (e→ie makes "vienes" unreachable from
    // "ven"), which is the stem-change class 8e owns.
    expect(maskSentence('¿Andas mucho?', 'andar', 'v.')).toBe(`¿${BLANK} mucho?`)
    expect(maskSentence('¿Vienes a la fiesta?', 'venir', 'v.')).toBeNull()
  })
})

describe('maskSentence — 8d false-positive guards', () => {
  // A looser stem can blank the WRONG word. These four are the adversarial set: the suffix
  // constraint must reject a remainder that is not a plausible inflection. Returning null is the
  // right answer — the definition fallback is a worse exercise than a sentence, but a blank over
  // the wrong word is worse than both.
  it('does not blank an unrelated word that merely shares a stem', () => {
    expect(maskSentence('El santo bebe sangre.', 'sano', 'adj.')).toBeNull() // san + "to"
    expect(maskSentence('El ponche está en la mesa.', 'poner', 'v.')).toBeNull() // pon + "che"
    expect(maskSentence('El crimen fue cruel.', 'criar', 'v.')).toBeNull() // cri + "men"
  })

  it('prefers the real form over a decoy that precedes it', () => {
    // "nación" comes first and shares the stem; "ion" is not a verb ending, "io" is.
    expect(maskSentence('La nación nació ayer.', 'nacer', 'v.')).toBe(`La nación ${BLANK} ayer.`)
  })

  it('never masks an apocope, which would be ungradeable', () => {
    // The card stores "malo"; the only form fitting the slot is "mal". Masking it would show a
    // blank the learner cannot correctly fill from the stored headword.
    expect(maskSentence('Hace mal tiempo hoy.', 'malo', 'adj.')).toBeNull()
    expect(maskSentence('Hace mal tiempo hoy.', 'malo')).toBeNull()
  })

  it('S1 and S2 are untouched — existing behaviour is preserved exactly', () => {
    expect(maskSentence('El mercado está cerrado.', 'mercado')).toBe(`El ${BLANK} está cerrado.`)
    expect(maskSentence('La casa es azul.', 'mercado')).toBeNull()
  })

  it('preserves S1 quirks rather than quietly fixing them', () => {
    // S1 is a bare case-insensitive regex with no word boundary, so a plural leaves its "s" outside
    // the blank: "mercados" → "_____s". That is pre-existing behaviour on a path that fires for
    // hundreds of rows; 8d is append-only and deliberately does NOT touch it. Pinned here so the
    // quirk is a recorded decision rather than an accident, and so a future fix is a visible change.
    expect(maskSentence('Los mercados están cerrados.', 'mercado')).toBe(
      `Los ${BLANK}s están cerrados.`,
    )
  })
})
