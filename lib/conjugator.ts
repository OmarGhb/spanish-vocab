// Deterministic Spanish conjugator — rule engine + irregular tables. Pure: no I/O, no
// Next.js, no Supabase, no `server-only` (safe for Server AND Client consumers, like
// lib/word-status.ts). NOT LLM-sourced (same lesson as M3.2's wordlist-over-LLM, higher
// stakes: a wrong conjugation taught is real harm).
//
// SCOPE (M5.3a): the A2/B1 single-token form union — presente, pretérito indefinido,
// imperfecto, futuro, condicional, presente de subjuntivo, imperativo (afirmativo +
// negativo), gerundio, participio. (Pretérito perfecto is haber + participio; its only
// blankable single token is the participio, which the paradigm includes.)
//
// SAFETY NOTE (M5.3a): nothing this module GENERATES is displayed to the user in M5.3a —
// the answer shown is always the real blanked token from the Anthropic-authored sentence,
// and the hint shows facts (lemma, person), not a generated form. So an untabled-irregular
// verb falling through to regular rules degrades verdict generosity, it does NOT miseducate.
// HARD REQUIREMENT for M5.3b: once a generated form is DISPLAYED (Astuce hint / conjugation
// table), it must refuse to show a paradigm for an untabled verb rather than show a guess.

export type Person = 'yo' | 'tú' | 'él' | 'nosotros' | 'vosotros' | 'ellos'

export type Tense =
  | 'presente'
  | 'preterito'
  | 'imperfecto'
  | 'futuro'
  | 'condicional'
  | 'subjPresente'
  | 'imperativoAfirmativo'
  | 'imperativoNegativo'
  | 'gerundio'
  | 'participio'
  | 'infinitivo'

export const PERSONS: readonly Person[] = ['yo', 'tú', 'él', 'nosotros', 'vosotros', 'ellos']

export type ParadigmEntry = { surface: string; tense: Tense; person: Person | null }

// ── normalization (accent + case folded) for membership / reverse lookup ────────────────
// Conjugated OUTPUT keeps accents (correct forms); matching folds them so an accent-less
// user answer is still recognized as an inflection.
export function normalize(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
}

// ── reflexive handling ──────────────────────────────────────────────────────────────────
// Pronominal lemmas ("divertirse") conjugate on the base verb; the clitic pronoun is a
// separate token in the sentence (se divierte), so the blankable verb form is non-reflexive.
function stripReflexive(lemma: string): string {
  const l = lemma.trim().toLowerCase()
  if (/(ar|er|ir)se$/.test(l)) return l.slice(0, -2)
  return l
}

type Ending = 'ar' | 'er' | 'ir'
function endingOf(inf: string): Ending | null {
  const e = inf.slice(-2)
  return e === 'ar' || e === 'er' || e === 'ir' ? e : null
}

// ════════════════════════════════════════════════════════════════════════════════════════
// DATA TABLES — the irregular substrate. Rules handle the rest.
// ════════════════════════════════════════════════════════════════════════════════════════

// Fully-irregular verbs: explicit forms per irregular tense. Anything not listed here for a
// given verb is computed by the rule engine (using the tables below). 6-element arrays follow
// PERSONS order; participio/gerundio are single strings.
type IrregularForms = Partial<Record<Tense, string[] | string>>
const IRREGULAR_FORMS: Record<string, IrregularForms> = {
  ser: {
    presente: ['soy', 'eres', 'es', 'somos', 'sois', 'son'],
    preterito: ['fui', 'fuiste', 'fue', 'fuimos', 'fuisteis', 'fueron'],
    imperfecto: ['era', 'eras', 'era', 'éramos', 'erais', 'eran'],
    subjPresente: ['sea', 'seas', 'sea', 'seamos', 'seáis', 'sean'],
    gerundio: 'siendo',
    participio: 'sido',
  },
  ir: {
    presente: ['voy', 'vas', 'va', 'vamos', 'vais', 'van'],
    preterito: ['fui', 'fuiste', 'fue', 'fuimos', 'fuisteis', 'fueron'],
    imperfecto: ['iba', 'ibas', 'iba', 'íbamos', 'ibais', 'iban'],
    subjPresente: ['vaya', 'vayas', 'vaya', 'vayamos', 'vayáis', 'vayan'],
    gerundio: 'yendo',
    participio: 'ido',
  },
  haber: {
    presente: ['he', 'has', 'ha', 'hemos', 'habéis', 'han'],
    subjPresente: ['haya', 'hayas', 'haya', 'hayamos', 'hayáis', 'hayan'],
  },
  estar: {
    presente: ['estoy', 'estás', 'está', 'estamos', 'estáis', 'están'],
    subjPresente: ['esté', 'estés', 'esté', 'estemos', 'estéis', 'estén'],
  },
  dar: {
    presente: ['doy', 'das', 'da', 'damos', 'dais', 'dan'],
    preterito: ['di', 'diste', 'dio', 'dimos', 'disteis', 'dieron'],
    subjPresente: ['dé', 'des', 'dé', 'demos', 'deis', 'den'],
  },
  ver: {
    presente: ['veo', 'ves', 've', 'vemos', 'veis', 'ven'],
    preterito: ['vi', 'viste', 'vio', 'vimos', 'visteis', 'vieron'],
    imperfecto: ['veía', 'veías', 'veía', 'veíamos', 'veíais', 'veían'],
    subjPresente: ['vea', 'veas', 'vea', 'veamos', 'veáis', 'vean'],
    participio: 'visto',
  },
  hacer: {
    presente: ['hago', 'haces', 'hace', 'hacemos', 'hacéis', 'hacen'],
    subjPresente: ['haga', 'hagas', 'haga', 'hagamos', 'hagáis', 'hagan'],
    participio: 'hecho',
  },
  decir: {
    presente: ['digo', 'dices', 'dice', 'decimos', 'decís', 'dicen'],
    subjPresente: ['diga', 'digas', 'diga', 'digamos', 'digáis', 'digan'],
    gerundio: 'diciendo',
    participio: 'dicho',
  },
  tener: {
    presente: ['tengo', 'tienes', 'tiene', 'tenemos', 'tenéis', 'tienen'],
    subjPresente: ['tenga', 'tengas', 'tenga', 'tengamos', 'tengáis', 'tengan'],
  },
  venir: {
    presente: ['vengo', 'vienes', 'viene', 'venimos', 'venís', 'vienen'],
    subjPresente: ['venga', 'vengas', 'venga', 'vengamos', 'vengáis', 'vengan'],
    gerundio: 'viniendo',
  },
  poner: {
    presente: ['pongo', 'pones', 'pone', 'ponemos', 'ponéis', 'ponen'],
    subjPresente: ['ponga', 'pongas', 'ponga', 'pongamos', 'pongáis', 'pongan'],
    participio: 'puesto',
  },
  salir: {
    presente: ['salgo', 'sales', 'sale', 'salimos', 'salís', 'salen'],
    subjPresente: ['salga', 'salgas', 'salga', 'salgamos', 'salgáis', 'salgan'],
  },
  saber: {
    presente: ['sé', 'sabes', 'sabe', 'sabemos', 'sabéis', 'saben'],
    subjPresente: ['sepa', 'sepas', 'sepa', 'sepamos', 'sepáis', 'sepan'],
  },
  traer: {
    presente: ['traigo', 'traes', 'trae', 'traemos', 'traéis', 'traen'],
    subjPresente: ['traiga', 'traigas', 'traiga', 'traigamos', 'traigáis', 'traigan'],
    gerundio: 'trayendo',
  },
  extraer: {
    presente: ['extraigo', 'extraes', 'extrae', 'extraemos', 'extraéis', 'extraen'],
    subjPresente: [
      'extraiga',
      'extraigas',
      'extraiga',
      'extraigamos',
      'extraigáis',
      'extraigan',
    ],
    gerundio: 'extrayendo',
  },
  conducir: {
    presente: ['conduzco', 'conduces', 'conduce', 'conducimos', 'conducís', 'conducen'],
    subjPresente: [
      'conduzca',
      'conduzcas',
      'conduzca',
      'conduzcamos',
      'conduzcáis',
      'conduzcan',
    ],
  },
}

// Strong (irregular) preterite stems. Endings: e, iste, o, imos, isteis, (j-stem ? eron : ieron).
// `hacer` 3rd-person is "hizo" (c→z), special-cased below.
const STRONG_PRET: Record<string, string> = {
  andar: 'anduv',
  estar: 'estuv',
  tener: 'tuv',
  poder: 'pud',
  poner: 'pus',
  saber: 'sup',
  caber: 'cup',
  hacer: 'hic',
  querer: 'quis',
  venir: 'vin',
  decir: 'dij',
  traer: 'traj',
  extraer: 'extraj',
  conducir: 'conduj',
  haber: 'hub',
}

// Irregular future / conditional stems (shared between the two tenses).
const FUT_STEM: Record<string, string> = {
  tener: 'tendr',
  poner: 'pondr',
  salir: 'saldr',
  venir: 'vendr',
  poder: 'podr',
  querer: 'querr',
  saber: 'sabr',
  haber: 'habr',
  caber: 'cabr',
  valer: 'valdr',
  hacer: 'har',
  decir: 'dir',
}

// Irregular past participles (regular formation otherwise; -aer/-eer/-oír accent handled by rule).
const IRREG_PART: Record<string, string> = {
  hacer: 'hecho',
  decir: 'dicho',
  ver: 'visto',
  poner: 'puesto',
  escribir: 'escrito',
  volver: 'vuelto',
  devolver: 'devuelto',
  resolver: 'resuelto',
  romper: 'roto',
  abrir: 'abierto',
  cubrir: 'cubierto',
  morir: 'muerto',
  ir: 'ido',
  ser: 'sido',
}

// Affirmative imperative tú irregulars (rest derive from indicative él / subjunctive).
const IRREG_IMP_TU: Record<string, string> = {
  decir: 'di',
  hacer: 'haz',
  ir: 've',
  poner: 'pon',
  salir: 'sal',
  ser: 'sé',
  tener: 'ten',
  venir: 'ven',
}

// Stressed present/subjunctive stem (yo/tú/él/ellos + the matching subjunctive persons).
// Encodes diphthongization (e→ie, o→ue, e→i, u→ue) and hiatus accent (vaciar→vací, reunir→reún)
// as the resulting stem directly — simpler and less error-prone than a change-direction code.
const PRES_STEM: Record<string, string> = {
  // e→ie
  pensar: 'piens',
  cerrar: 'cierr',
  comenzar: 'comienz',
  empezar: 'empiez',
  entender: 'entiend',
  perder: 'pierd',
  querer: 'quier',
  sentir: 'sient',
  divertir: 'diviert',
  hervir: 'hierv',
  preferir: 'prefier',
  // o→ue
  poder: 'pued',
  volver: 'vuelv',
  contar: 'cuent',
  encontrar: 'encuentr',
  probar: 'prueb',
  volcar: 'vuelc',
  dormir: 'duerm',
  morir: 'muer',
  // e→i (-ir)
  pedir: 'pid',
  despedir: 'despid',
  repetir: 'repit',
  servir: 'sirv',
  // u→ue
  jugar: 'jueg',
  // hiatus accent
  vaciar: 'vací',
  reunir: 'reún',
}

// Weak stem for -ir vowel-changing verbs: used in nosotros/vosotros subjunctive, the él/ellos
// preterite, and the gerundio (e→i, o→u). Only true vowel-weakeners belong here.
const WEAK_STEM: Record<string, string> = {
  pedir: 'pid',
  despedir: 'despid',
  repetir: 'repit',
  servir: 'sirv',
  sentir: 'sint',
  divertir: 'divirt',
  hervir: 'hirv',
  preferir: 'prefir',
  dormir: 'durm',
  morir: 'mur',
}

// Verbs whose irregular yo-present form is consonantal (so it PERSISTS into all subjunctive
// persons, unlike diphthongs which revert in nosotros/vosotros). Value = yo-present form.
const IRREG_YO: Record<string, string> = {
  crecer: 'crezco',
  conocer: 'conozco',
  parecer: 'parezco',
  nacer: 'nazco',
  ofrecer: 'ofrezco',
  traducir: 'traduzco',
  coger: 'cojo',
  proteger: 'protejo',
  dirigir: 'dirijo',
  exigir: 'exijo',
  oír: 'oigo',
  caer: 'caigo',
}

// ════════════════════════════════════════════════════════════════════════════════════════
// ORTHOGRAPHIC ADJUSTMENT — spelling-preserving consonant shifts at the stem/ending seam.
// ════════════════════════════════════════════════════════════════════════════════════════
function orthoStem(stem: string, inf: string, nextChar: string): string {
  const front = nextChar === 'e' || nextChar === 'é' || nextChar === 'i' || nextChar === 'í'
  const back = nextChar === 'o' || nextChar === 'a' || nextChar === 'á'
  if (front) {
    if (inf.endsWith('car')) return stem.replace(/c$/, 'qu')
    if (inf.endsWith('gar')) return stem.replace(/g$/, 'gu')
    if (inf.endsWith('zar')) return stem.replace(/z$/, 'c')
  }
  if (back) {
    if (inf.endsWith('ger') || inf.endsWith('gir')) return stem.replace(/g$/, 'j')
  }
  return stem
}

// ── ending tables ───────────────────────────────────────────────────────────────────────
const PRES_ENDINGS: Record<Ending, string[]> = {
  ar: ['o', 'as', 'a', 'amos', 'áis', 'an'],
  er: ['o', 'es', 'e', 'emos', 'éis', 'en'],
  ir: ['o', 'es', 'e', 'imos', 'ís', 'en'],
}
const PRET_ENDINGS: Record<Ending, string[]> = {
  ar: ['é', 'aste', 'ó', 'amos', 'asteis', 'aron'],
  er: ['í', 'iste', 'ió', 'imos', 'isteis', 'ieron'],
  ir: ['í', 'iste', 'ió', 'imos', 'isteis', 'ieron'],
}
const IMPF_ENDINGS: Record<Ending, string[]> = {
  ar: ['aba', 'abas', 'aba', 'ábamos', 'abais', 'aban'],
  er: ['ía', 'ías', 'ía', 'íamos', 'íais', 'ían'],
  ir: ['ía', 'ías', 'ía', 'íamos', 'íais', 'ían'],
}
const FUT_ENDINGS = ['é', 'ás', 'á', 'emos', 'éis', 'án']
const COND_ENDINGS = ['ía', 'ías', 'ía', 'íamos', 'íais', 'ían']
const SUBJ_ENDINGS: Record<Ending, string[]> = {
  ar: ['e', 'es', 'e', 'emos', 'éis', 'en'],
  er: ['a', 'as', 'a', 'amos', 'áis', 'an'],
  ir: ['a', 'as', 'a', 'amos', 'áis', 'an'],
}

// stressed persons (diphthongizing) in present/subjunctive: yo, tú, él, ellos
const STRESSED = new Set([0, 1, 2, 5])

// ════════════════════════════════════════════════════════════════════════════════════════
// PER-TENSE COMPUTATION
// ════════════════════════════════════════════════════════════════════════════════════════
function regularStem(inf: string): string {
  return inf.slice(0, -2)
}

function present(inf: string, end: Ending): string[] {
  const reg = regularStem(inf)
  const stressedStem = PRES_STEM[inf] ?? reg
  const isUir = /[^g]uir$/.test(inf) // construir, huir — y-insertion before non-i endings
  return PERSONS.map((_, i) => {
    if (i === 0 && IRREG_YO[inf]) return IRREG_YO[inf]
    let stem = STRESSED.has(i) ? stressedStem : reg
    const ending = PRES_ENDINGS[end][i]
    if (isUir && i !== 3 && i !== 4) stem = reg + 'y' // construyo/-es/-e/-en, not construimos/-ís
    if (i === 0) stem = orthoStem(stem, inf, ending[0]) // coger→cojo (handled too via IRREG_YO)
    return stem + ending
  })
}

function preterite(inf: string, end: Ending): string[] {
  const strong = STRONG_PRET[inf]
  if (strong) {
    const last = strong.endsWith('j') ? 'eron' : 'ieron'
    const forms = ['e', 'iste', 'o', 'imos', 'isteis', last].map((e) => strong + e)
    if (inf === 'hacer') forms[2] = 'hizo'
    return forms
  }
  const reg = regularStem(inf)
  const weak = WEAK_STEM[inf]
  const vowelStem = /[aeiouáéíóú]$/.test(reg) // leer, construir, oír → i→y in 3rd person
  return PERSONS.map((_, i) => {
    if (end === 'ar') {
      if (i === 0) return orthoStem(reg, inf, 'é') + 'é'
      return reg + PRET_ENDINGS.ar[i]
    }
    // -er / -ir
    if ((i === 2 || i === 5) && weak) {
      return weak + (i === 2 ? 'ió' : 'ieron')
    }
    if ((i === 2 || i === 5) && vowelStem) {
      return reg + (i === 2 ? 'yó' : 'yeron')
    }
    return reg + PRET_ENDINGS[end][i]
  })
}

function imperfect(inf: string, end: Ending): string[] {
  const reg = regularStem(inf)
  return IMPF_ENDINGS[end].map((e) => reg + e)
}

function future(inf: string): string[] {
  const stem = FUT_STEM[inf] ?? inf
  return FUT_ENDINGS.map((e) => stem + e)
}

function conditional(inf: string): string[] {
  const stem = FUT_STEM[inf] ?? inf
  return COND_ENDINGS.map((e) => stem + e)
}

function subjunctive(inf: string, end: Ending): string[] {
  // Base stem = yo-present minus the final -o (captures irregular yo: teng-, conozc-, cuent-).
  const yo = present(inf, end)[0]
  const yoStem = yo.replace(/o$/, '')
  const reg = regularStem(inf)
  const weak = WEAK_STEM[inf]
  const isDiphthong = !!PRES_STEM[inf] // diphthong/accent changers revert in nos/vos
  return SUBJ_ENDINGS[end].map((ending, i) => {
    let stem: string
    if (STRESSED.has(i)) {
      stem = yoStem
    } else {
      // nosotros / vosotros
      if (weak) stem = weak
      else if (isDiphthong) stem = reg
      else stem = yoStem
    }
    return orthoStem(stem, inf, ending[0]) + ending
  })
}

function gerund(inf: string, end: Ending): string {
  const fixed = IRREGULAR_FORMS[inf]?.gerundio
  if (typeof fixed === 'string') return fixed
  const reg = regularStem(inf)
  if (end === 'ar') return reg + 'ando'
  const weak = WEAK_STEM[inf]
  if (weak) return weak + 'iendo'
  if (/[aeiouáéíóú]$/.test(reg)) return reg + 'yendo' // leyendo, construyendo, oyendo
  return reg + 'iendo'
}

function participle(inf: string, end: Ending): string {
  const irr = IRREG_PART[inf]
  if (irr) return irr
  const reg = regularStem(inf)
  if (end === 'ar') return reg + 'ado'
  // -er/-ir: -aer/-eer/-oír take an accent (traído, leído, oído, extraído)
  if (/[aeo]$/.test(reg)) return reg + 'ído'
  return reg + 'ido'
}

// affirmative imperative: tú, usted(él), nosotros, vosotros, ustedes(ellos) — no yo
function imperativeAffirmative(inf: string, end: Ending): (string | null)[] {
  const subj = subjunctive(inf, end)
  const pres = present(inf, end)
  const tu = IRREG_IMP_TU[inf] ?? pres[2] // él indicative
  const vosotros = inf.slice(0, -1) + 'd' // comer→comed, ir→id
  // PERSONS order; yo has no imperative
  return [null, tu, subj[2], subj[3], vosotros, subj[5]]
}

// ════════════════════════════════════════════════════════════════════════════════════════
// PUBLIC API
// ════════════════════════════════════════════════════════════════════════════════════════

// True iff `lemma` is a conjugatable Spanish infinitive (after stripping a reflexive clitic).
export function isConjugable(lemma: string): boolean {
  return endingOf(stripReflexive(lemma)) !== null
}

const PERSON_TENSES: Tense[] = [
  'presente',
  'preterito',
  'imperfecto',
  'futuro',
  'condicional',
  'subjPresente',
]

function formsFor(inf: string, end: Ending, tense: Tense): string[] {
  const fixed = IRREGULAR_FORMS[inf]?.[tense]
  if (Array.isArray(fixed)) return fixed
  switch (tense) {
    case 'presente':
      return present(inf, end)
    case 'preterito':
      return preterite(inf, end)
    case 'imperfecto':
      return imperfect(inf, end)
    case 'futuro':
      return future(inf)
    case 'condicional':
      return conditional(inf)
    case 'subjPresente':
      return subjunctive(inf, end)
    default:
      return []
  }
}

// Conjugate a single form. Returns null only for an unconjugable lemma or a person/tense
// combination that does not exist (e.g. imperativo yo).
export function conjugate(lemma: string, tense: Tense, person?: Person | null): string | null {
  const inf = stripReflexive(lemma)
  const end = endingOf(inf)
  if (!end) return tense === 'infinitivo' ? inf : null

  if (tense === 'infinitivo') return inf
  if (tense === 'gerundio') return gerund(inf, end)
  if (tense === 'participio') return participle(inf, end)

  if (tense === 'imperativoAfirmativo') {
    if (!person) return null
    const v = imperativeAffirmative(inf, end)[PERSONS.indexOf(person)]
    return v ?? null
  }
  if (tense === 'imperativoNegativo') {
    if (!person || person === 'yo') return null
    const subj = subjunctive(inf, end)[PERSONS.indexOf(person)]
    return `no ${subj}`
  }

  if (!person) return null
  return formsFor(inf, end, tense)[PERSONS.indexOf(person)] ?? null
}

// Every single-token form of the verb, with grammatical coordinates. Drives paradigm-aware
// masking, the "is X another valid inflection?" generosity check, and reverse person lookup.
export function paradigm(lemma: string): ParadigmEntry[] {
  const inf = stripReflexive(lemma)
  const end = endingOf(inf)
  const out: ParadigmEntry[] = [{ surface: inf, tense: 'infinitivo', person: null }]
  if (!end) return out

  out.push({ surface: gerund(inf, end), tense: 'gerundio', person: null })
  out.push({ surface: participle(inf, end), tense: 'participio', person: null })

  for (const tense of PERSON_TENSES) {
    const forms = formsFor(inf, end, tense)
    forms.forEach((surface, i) => {
      if (surface) out.push({ surface, tense, person: PERSONS[i] })
    })
  }
  // affirmative imperative (single tokens; negative imperative's verb token = subjunctive)
  imperativeAffirmative(inf, end).forEach((surface, i) => {
    if (surface) out.push({ surface, tense: 'imperativoAfirmativo', person: PERSONS[i] })
  })
  return out
}

// Reverse lookup: which {tense, person} coordinates produce `surface` for `lemma`.
// Accent/case-insensitive. Empty when `surface` is not in the paradigm.
export function analyze(surface: string, lemma: string): Array<{ tense: Tense; person: Person | null }> {
  const n = normalize(surface)
  return paradigm(lemma)
    .filter((e) => normalize(e.surface) === n)
    .map(({ tense, person }) => ({ tense, person }))
}

// Is `surface` any valid inflection of `lemma`? (accent/case-insensitive)
export function isInParadigm(surface: string, lemma: string): boolean {
  return analyze(surface, lemma).length > 0
}

// The unambiguous person of `surface` within `lemma`'s paradigm, or null when it is absent,
// is a non-finite form (infinitive/gerundio/participio), or maps to MORE THAN ONE person
// (e.g. imperfecto yo/él "estudiaba"). Used by the in-question hint — never guesses.
export function unambiguousPerson(surface: string, lemma: string): Person | null {
  const persons = new Set<Person>()
  for (const { person } of analyze(surface, lemma)) {
    if (person) persons.add(person)
  }
  return persons.size === 1 ? [...persons][0] : null
}
