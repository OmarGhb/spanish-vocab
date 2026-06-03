import { describe, it, expect } from 'vitest'
import {
  conjugate,
  paradigm,
  analyze,
  isInParadigm,
  unambiguousPerson,
  isConjugable,
  type Person,
} from './conjugator'

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
