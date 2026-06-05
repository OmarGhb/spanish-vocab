import { describe, it, expect } from 'vitest'
import {
  conjugate,
  paradigm,
  analyze,
  isInParadigm,
  unambiguousPerson,
  isConjugable,
  canDisplayParadigm,
  trustedLemmas,
  PERSONS,
  type Person,
  type Tense,
} from './conjugator'
import { EXPECTED, type ExpectedParadigm } from './conjugator.expected'

const c = (lemma: string, tense: Parameters<typeof conjugate>[1], person?: Person) =>
  conjugate(lemma, tense, person)

describe('battery — strong preterites (yo)', () => {
  const cases: Array<[string, string]> = [
    ['ir', 'fui'],
    ['ser', 'fui'],
    ['tener', 'tuve'],
    ['hacer', 'hice'],
    ['decir', 'dije'],
    ['poner', 'puse'],
    ['poder', 'pude'],
    ['venir', 'vine'],
    ['traer', 'traje'],
    ['conducir', 'conduje'],
    ['estar', 'estuve'],
    ['querer', 'quise'],
    ['andar', 'anduve'],
  ]
  it.each(cases)('%s yo preterite → %s', (lemma, want) => {
    expect(c(lemma, 'preterito', 'yo')).toBe(want)
  })
  it('-j stems drop the i in ellos (dijeron, trajeron, condujeron)', () => {
    expect(c('decir', 'preterito', 'ellos')).toBe('dijeron')
    expect(c('traer', 'preterito', 'ellos')).toBe('trajeron')
    expect(c('conducir', 'preterito', 'ellos')).toBe('condujeron')
  })
  it('hacer él preterite is hizo (c→z)', () => {
    expect(c('hacer', 'preterito', 'él')).toBe('hizo')
  })
})

describe('battery — irregular participles', () => {
  const cases: Array<[string, string]> = [
    ['hacer', 'hecho'],
    ['decir', 'dicho'],
    ['ver', 'visto'],
    ['poner', 'puesto'],
    ['escribir', 'escrito'],
    ['volver', 'vuelto'],
    ['romper', 'roto'],
    ['abrir', 'abierto'],
    ['morir', 'muerto'],
  ]
  it.each(cases)('%s participio → %s', (lemma, want) => {
    expect(c(lemma, 'participio')).toBe(want)
  })
  it('-aer/-eer/-oír participles take an accent', () => {
    expect(c('traer', 'participio')).toBe('traído')
    expect(c('extraer', 'participio')).toBe('extraído')
    expect(c('leer', 'participio')).toBe('leído')
  })
  it('regular participles', () => {
    expect(c('hablar', 'participio')).toBe('hablado')
    expect(c('comer', 'participio')).toBe('comido')
    expect(c('vivir', 'participio')).toBe('vivido')
  })
})

describe('battery — stem changes (present yo)', () => {
  const cases: Array<[string, string]> = [
    ['pensar', 'pienso'],
    ['poder', 'puedo'],
    ['pedir', 'pido'],
    ['jugar', 'juego'],
    ['volver', 'vuelvo'],
    ['contar', 'cuento'],
  ]
  it.each(cases)('%s present yo → %s', (lemma, want) => {
    expect(c(lemma, 'presente', 'yo')).toBe(want)
  })
  it('stem change reverts in nosotros (present)', () => {
    expect(c('pensar', 'presente', 'nosotros')).toBe('pensamos')
    expect(c('poder', 'presente', 'nosotros')).toBe('podemos')
    expect(c('jugar', 'presente', 'nosotros')).toBe('jugamos')
  })
})

describe('battery — orthographic', () => {
  it('-car/-gar/-zar preterite yo', () => {
    expect(c('buscar', 'preterito', 'yo')).toBe('busqué')
    expect(c('llegar', 'preterito', 'yo')).toBe('llegué')
    expect(c('empezar', 'preterito', 'yo')).toBe('empecé')
  })
  it('-car/-gar/-zar subjunctive (all persons)', () => {
    expect(c('buscar', 'subjPresente', 'yo')).toBe('busque')
    expect(c('llegar', 'subjPresente', 'nosotros')).toBe('lleguemos')
    expect(c('empezar', 'subjPresente', 'ellos')).toBe('empiecen') // + e→ie
  })
  it('-ger/-gir yo present (g→j)', () => {
    expect(c('coger', 'presente', 'yo')).toBe('cojo')
    expect(c('coger', 'presente', 'tú')).toBe('coges')
  })
  it('-uir y-insertion (construir)', () => {
    expect(c('construir', 'presente', 'yo')).toBe('construyo')
    expect(c('construir', 'presente', 'él')).toBe('construye')
    expect(c('construir', 'presente', 'nosotros')).toBe('construimos')
    expect(c('construir', 'preterito', 'él')).toBe('construyó')
    expect(c('construir', 'gerundio')).toBe('construyendo')
  })
})

describe('battery — imperative tú irregulars', () => {
  const cases: Array<[string, string]> = [
    ['decir', 'di'],
    ['hacer', 'haz'],
    ['ir', 've'],
    ['poner', 'pon'],
    ['salir', 'sal'],
    ['ser', 'sé'],
    ['tener', 'ten'],
    ['venir', 'ven'],
  ]
  it.each(cases)('%s imperative tú → %s', (lemma, want) => {
    expect(c(lemma, 'imperativoAfirmativo', 'tú')).toBe(want)
  })
  it('regular affirmative imperative derives from indicative/subjunctive', () => {
    expect(c('comer', 'imperativoAfirmativo', 'tú')).toBe('come')
    expect(c('hablar', 'imperativoAfirmativo', 'vosotros')).toBe('hablad')
    expect(c('comer', 'imperativoAfirmativo', 'nosotros')).toBe('comamos')
  })
  it('negative imperative = no + subjunctive', () => {
    expect(c('comer', 'imperativoNegativo', 'tú')).toBe('no comas')
    expect(c('hablar', 'imperativoNegativo', 'vosotros')).toBe('no habléis')
  })
})

describe('regular conjugations across persons', () => {
  it('hablar present', () => {
    expect(PERSONS_MAP('hablar', 'presente')).toEqual([
      'hablo',
      'hablas',
      'habla',
      'hablamos',
      'habláis',
      'hablan',
    ])
  })
  it('comer preterite', () => {
    expect(PERSONS_MAP('comer', 'preterito')).toEqual([
      'comí',
      'comiste',
      'comió',
      'comimos',
      'comisteis',
      'comieron',
    ])
  })
  it('vivir imperfect', () => {
    expect(PERSONS_MAP('vivir', 'imperfecto')).toEqual([
      'vivía',
      'vivías',
      'vivía',
      'vivíamos',
      'vivíais',
      'vivían',
    ])
  })
  it('estudiar future + conditional', () => {
    expect(c('estudiar', 'futuro', 'yo')).toBe('estudiaré')
    expect(c('estudiar', 'condicional', 'ellos')).toBe('estudiarían')
  })
  it('irregular future stems', () => {
    expect(c('tener', 'futuro', 'yo')).toBe('tendré')
    expect(c('hacer', 'futuro', 'él')).toBe('hará')
    expect(c('decir', 'condicional', 'yo')).toBe('diría')
  })
})

describe('deck verbs — pronominal + -ir weakeners + irregular yo', () => {
  it('reflexive lemmas conjugate on the base verb', () => {
    expect(c('probarse', 'presente', 'yo')).toBe('pruebo')
    expect(c('divertirse', 'presente', 'él')).toBe('divierte')
    expect(c('reunirse', 'presente', 'yo')).toBe('reúno')
  })
  it('-ir vowel weakeners (preterite él/ellos + gerund)', () => {
    expect(c('pedir', 'preterito', 'él')).toBe('pidió')
    expect(c('despedir', 'preterito', 'ellos')).toBe('despidieron')
    expect(c('divertir', 'gerundio')).toBe('divirtiendo')
    expect(c('hervir', 'preterito', 'él')).toBe('hirvió')
  })
  it('-cer irregular yo + derived subjunctive', () => {
    expect(c('crecer', 'presente', 'yo')).toBe('crezco')
    expect(c('crecer', 'subjPresente', 'nosotros')).toBe('crezcamos')
  })
  it('hiatus accent (vaciar)', () => {
    expect(c('vaciar', 'presente', 'yo')).toBe('vacío')
    expect(c('vaciar', 'presente', 'nosotros')).toBe('vaciamos')
  })
})

describe('fully-irregular verbs', () => {
  it('ser/ir/estar/haber present', () => {
    expect(PERSONS_MAP('ser', 'presente')).toEqual(['soy', 'eres', 'es', 'somos', 'sois', 'son'])
    expect(PERSONS_MAP('ir', 'presente')).toEqual(['voy', 'vas', 'va', 'vamos', 'vais', 'van'])
    expect(c('estar', 'presente', 'yo')).toBe('estoy')
    expect(c('haber', 'presente', 'él')).toBe('ha')
  })
  it('imperfect irregulars', () => {
    expect(c('ser', 'imperfecto', 'yo')).toBe('era')
    expect(c('ir', 'imperfecto', 'nosotros')).toBe('íbamos')
    expect(c('ver', 'imperfecto', 'yo')).toBe('veía') // regular on stem "ve"
  })
})

describe('paradigm / analyze / membership', () => {
  it('paradigm includes infinitive, gerund, participle and finite forms', () => {
    const surf = paradigm('estudiar').map((e) => e.surface)
    expect(surf).toContain('estudiar')
    expect(surf).toContain('estudiando')
    expect(surf).toContain('estudiado')
    expect(surf).toContain('estudiamos')
    expect(surf).toContain('estudié')
  })
  it('isInParadigm is accent/case insensitive', () => {
    expect(isInParadigm('estudiamos', 'estudiar')).toBe(true)
    expect(isInParadigm('Estudió', 'estudiar')).toBe(true)
    expect(isInParadigm('estudio', 'estudiar')).toBe(true) // accent-less "estudió"
    expect(isInParadigm('comiste', 'estudiar')).toBe(false)
  })
  it('analyze recovers coordinates', () => {
    expect(analyze('estudiamos', 'estudiar')).toEqual(
      expect.arrayContaining([
        { tense: 'presente', person: 'nosotros' },
        { tense: 'preterito', person: 'nosotros' },
      ]),
    )
  })
})

describe('unambiguousPerson (hint source)', () => {
  it('returns the person when all matches agree', () => {
    // estudiamos = presente nosotros AND preterito nosotros → person agrees
    expect(unambiguousPerson('estudiamos', 'estudiar')).toBe('nosotros')
  })
  it('returns null on person ambiguity (imperfecto yo/él)', () => {
    expect(unambiguousPerson('estudiaba', 'estudiar')).toBeNull()
  })
  it('returns null for a non-finite form (infinitive)', () => {
    expect(unambiguousPerson('estudiar', 'estudiar')).toBeNull()
  })
  it('returns null when the surface is not in the paradigm', () => {
    expect(unambiguousPerson('xyz', 'estudiar')).toBeNull()
  })
})

describe('guards', () => {
  it('non-infinitive lemma is not conjugable and degrades gracefully', () => {
    expect(isConjugable('saltando')).toBe(false)
    expect(c('saltando', 'presente', 'yo')).toBeNull()
    expect(c('saltando', 'infinitivo')).toBe('saltando')
    expect(paradigm('saltando')).toEqual([
      { surface: 'saltando', tense: 'infinitivo', person: null },
    ])
  })
  it('imperative has no yo form', () => {
    expect(c('hablar', 'imperativoAfirmativo', 'yo')).toBeNull()
  })
})

// helper: all six persons of a tense as an array
function PERSONS_MAP(lemma: string, tense: Parameters<typeof conjugate>[1]): (string | null)[] {
  return (['yo', 'tú', 'él', 'nosotros', 'vosotros', 'ellos'] as Person[]).map((p) =>
    conjugate(lemma, tense, p),
  )
}

// ════════════════════════════════════════════════════════════════════════════════════════
// v0.6.4 CONJUGATOR-HARDENING HARNESS — the committed, data-driven version of the audit script.
// Admission rule: a verb may enter TRUSTED_LEMMAS only if its FULL paradigm matches a reference.
//   • irregulars + stem-changers → the hand-authored EXPECTED fixture (lib/conjugator.expected.ts)
//   • regulars                   → the clean-room regularReference() below (independent of the
//                                  production conjugator, so it actually verifies rather than echo)
// Every trusted lemma must be covered by exactly one path (invariant test below).
// ════════════════════════════════════════════════════════════════════════════════════════

const FINITE: Exclude<Tense, 'infinitivo' | 'gerundio' | 'participio'>[] = [
  'presente', 'preterito', 'imperfecto', 'futuro', 'condicional',
  'subjPresente', 'imperativoAfirmativo', 'imperativoNegativo',
]

describe('hardening harness — full paradigm vs golden fixture (irregulars + stem-changers)', () => {
  for (const [lemma, par] of Object.entries(EXPECTED)) {
    it(`${lemma} — every cell matches conjugate()`, () => {
      for (const tense of FINITE) {
        const want = par[tense] as readonly (string | null)[]
        const got = PERSONS.map((p) => conjugate(lemma, tense, p))
        expect(got, `${lemma}/${tense}`).toEqual([...want])
      }
      expect(conjugate(lemma, 'gerundio'), `${lemma}/gerundio`).toBe(par.gerundio)
      expect(conjugate(lemma, 'participio'), `${lemma}/participio`).toBe(par.participio)
    })
  }
})

// ── clean-room regular reference (independent reimplementation of the textbook rules) ──
function regularReference(inf: string): ExpectedParadigm {
  const end = inf.slice(-2) as 'ar' | 'er' | 'ir'
  const stem = inf.slice(0, -2)
  // Spelling-preserving consonant shift at the stem/ending seam (independent of orthoStem).
  const ortho = (next: string): string => {
    const front = next === 'e' || next === 'é' || next === 'i' || next === 'í'
    const back = next === 'a' || next === 'á' || next === 'o' || next === 'ó'
    if (front) {
      if (inf.endsWith('car')) return stem.slice(0, -1) + 'qu'
      if (inf.endsWith('gar')) return stem.slice(0, -1) + 'gu'
      if (inf.endsWith('zar')) return stem.slice(0, -1) + 'c'
    }
    if (back && (inf.endsWith('ger') || inf.endsWith('gir'))) return stem.slice(0, -1) + 'j'
    return stem
  }
  const map = (ends: string[]): string[] => ends.map((e) => ortho(e[0]) + e)
  const PRES = { ar: ['o', 'as', 'a', 'amos', 'áis', 'an'], er: ['o', 'es', 'e', 'emos', 'éis', 'en'], ir: ['o', 'es', 'e', 'imos', 'ís', 'en'] }[end]
  const PRET = end === 'ar' ? ['é', 'aste', 'ó', 'amos', 'asteis', 'aron'] : ['í', 'iste', 'ió', 'imos', 'isteis', 'ieron']
  const IMPF = end === 'ar' ? ['aba', 'abas', 'aba', 'ábamos', 'abais', 'aban'] : ['ía', 'ías', 'ía', 'íamos', 'íais', 'ían']
  const SUBJ = end === 'ar' ? ['e', 'es', 'e', 'emos', 'éis', 'en'] : ['a', 'as', 'a', 'amos', 'áis', 'an']
  const FUT = ['é', 'ás', 'á', 'emos', 'éis', 'án'].map((e) => inf + e)
  const COND = ['ía', 'ías', 'ía', 'íamos', 'íais', 'ían'].map((e) => inf + e)
  const presente = map(PRES)
  const subj = map(SUBJ)
  return {
    presente,
    preterito: map(PRET),
    imperfecto: IMPF.map((e) => stem + e),
    futuro: FUT,
    condicional: COND,
    subjPresente: subj,
    imperativoAfirmativo: [null, presente[2], subj[2], subj[3], inf.slice(0, -1) + 'd', subj[5]],
    imperativoNegativo: [null, ...subj.slice(1).map((s) => `no ${s}`)] as (string | null)[],
    gerundio: stem + (end === 'ar' ? 'ando' : 'iendo'),
    participio: stem + (end === 'ar' ? 'ado' : 'ido'),
  }
}

describe('hardening harness — full paradigm vs clean-room reference (deck regulars)', () => {
  const regulars = [...trustedLemmas()].filter((l) => !(l in EXPECTED))
  for (const lemma of regulars) {
    it(`${lemma} — every cell matches the regular reference`, () => {
      const ref = regularReference(lemma)
      for (const tense of FINITE) {
        const want = ref[tense] as readonly (string | null)[]
        const got = PERSONS.map((p) => conjugate(lemma, tense, p))
        expect(got, `${lemma}/${tense}`).toEqual([...want])
      }
      expect(conjugate(lemma, 'gerundio'), `${lemma}/gerundio`).toBe(ref.gerundio)
      expect(conjugate(lemma, 'participio'), `${lemma}/participio`).toBe(ref.participio)
    })
  }
})

describe('hardening harness — trusted-set admission invariant', () => {
  it('every trusted lemma is covered by exactly one verification path (fixture XOR regular)', () => {
    for (const lemma of trustedLemmas()) {
      const inFixture = lemma in EXPECTED
      const isRegular = /(ar|er|ir)$/.test(lemma) && !inFixture
      expect(inFixture !== isRegular, `${lemma} must be covered by one path`).toBe(true)
    }
  })
  it('every fixture key is a trusted lemma (no orphan golden entries)', () => {
    for (const lemma of Object.keys(EXPECTED)) {
      expect(trustedLemmas().has(lemma), `${lemma} fixtured but not trusted`).toBe(true)
    }
  })
})

describe('Finding 1 invariant — imperatives honour IRREGULAR_FORMS (table-bypass can never return)', () => {
  // The bug: imperativeAffirmative/negative built on rule-computed present()/subjunctive(), which
  // ignore the IRREGULAR_FORMS table. Lock that affirmative-usted == the table subjunctive-él and
  // negative-tú == "no " + table subjunctive-tú for every fully-irregular verb.
  const IRREG = ['ser', 'ir', 'ver', 'estar', 'dar', 'hacer', 'decir', 'tener', 'venir', 'poner', 'salir', 'saber', 'traer', 'extraer', 'conducir']
  it.each(IRREG)('%s: imperative usted == subjuntivo él, neg tú == "no " + subjuntivo tú', (lemma) => {
    expect(conjugate(lemma, 'imperativoAfirmativo', 'él')).toBe(conjugate(lemma, 'subjPresente', 'él'))
    expect(conjugate(lemma, 'imperativoNegativo', 'tú')).toBe(`no ${conjugate(lemma, 'subjPresente', 'tú')}`)
  })
  it('the specific forms the v0.6.3 denylist worked around are now accent-correct', () => {
    expect(conjugate('dar', 'imperativoAfirmativo', 'él')).toBe('dé')
    expect(conjugate('estar', 'imperativoAfirmativo', 'tú')).toBe('está')
    expect(conjugate('estar', 'imperativoAfirmativo', 'él')).toBe('esté')
    expect(conjugate('ser', 'imperativoAfirmativo', 'él')).toBe('sea')
  })
})

describe('affirmative-tú invariant — IRREG_IMP_TU survives the reroute (the 8 short forms)', () => {
  // Proof for Condition 1: the reroute changed the present/subjunctive SOURCE, not the
  // "IRREG_IMP_TU[inf] ?? present-él" tú branch. tú stays the short form, never present-3sg.
  const cases: Array<[string, string]> = [
    ['decir', 'di'], ['hacer', 'haz'], ['ir', 've'], ['poner', 'pon'],
    ['salir', 'sal'], ['ser', 'sé'], ['tener', 'ten'], ['venir', 'ven'],
  ]
  it.each(cases)('%s affirmative tú → %s (not the present-3sg)', (lemma, want) => {
    expect(conjugate(lemma, 'imperativoAfirmativo', 'tú')).toBe(want)
  })
  it('tener tú is "ten", NOT the present-3sg "tiene"', () => {
    expect(conjugate('tener', 'imperativoAfirmativo', 'tú')).not.toBe('tiene')
  })
  it('ver tú falls back to present-3sg "ve" (not in IRREG_IMP_TU, still correct)', () => {
    expect(conjugate('ver', 'imperativoAfirmativo', 'tú')).toBe('ve')
  })
})

describe('ir hortative — affirmative nosotros "vamos" does NOT leak into the negative', () => {
  it('affirmative nosotros is the indicative "vamos"', () => {
    expect(conjugate('ir', 'imperativoAfirmativo', 'nosotros')).toBe('vamos')
  })
  it('negative nosotros stays the subjunctive "no vayamos"', () => {
    expect(conjugate('ir', 'imperativoNegativo', 'nosotros')).toBe('no vayamos')
  })
})

describe('canDisplayParadigm — conservative display guard (M5.3b/c primitive)', () => {
  it('true for reference-verified tabled verbs (fixed irregulars + stem-changers)', () => {
    for (const l of ['dar', 'estar', 'ser', 'sentar', 'seguir', 'almorzar', 'tener', 'volcar']) {
      expect(canDisplayParadigm(l), l).toBe(true)
    }
  })
  it('true for verified deck regulars', () => {
    for (const l of ['hablar', 'comer', 'tocar', 'destacar']) {
      expect(canDisplayParadigm(l), l).toBe(true)
    }
  })
  it('reflexive variants inherit via stripReflexive', () => {
    expect(canDisplayParadigm('sentarse')).toBe(canDisplayParadigm('sentar'))
    expect(canDisplayParadigm('sentarse')).toBe(true)
    expect(canDisplayParadigm('Levantarse')).toBe(true) // case-insensitive
  })
  it('FALSE for plausible-but-untabled irregulars (the guessed-regular-for-irregular trap)', () => {
    // None are tabled; conjugate() would silently emit a wrong regular form — the guard refuses.
    for (const l of ['forzar', 'aprobar', 'soler', 'acertar', 'colgar', 'torcer']) {
      expect(canDisplayParadigm(l), l).toBe(false)
    }
  })
  it('FALSE for the cells excluded by the audit (blind spots), so they are never displayed', () => {
    for (const l of ['haber', 'poder', 'creer', 'llover']) {
      expect(canDisplayParadigm(l), l).toBe(false)
    }
  })
  it('FALSE for non-verbs / non-infinitives / nonsense', () => {
    for (const l of ['mercado', 'saltando', 'comieron', 'xyz', '']) {
      expect(canDisplayParadigm(l), l).toBe(false)
    }
  })
  it('soñar (to dream) is trusted; sonar (to sound) is NOT — no accent-folding conflation', () => {
    expect(canDisplayParadigm('soñar')).toBe(true)
    expect(canDisplayParadigm('sonar')).toBe(false)
  })
})
