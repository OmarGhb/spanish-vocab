// Verb-conjugation drill (M5.3c) — pure, client-safe (no I/O, no Next/Supabase, no
// `server-only`, same posture as lib/conjugator.ts / lib/conjugation-grid.ts). ALL drill logic
// lives here, never inline in the components (the chooseQcmCue / resultHintExample lesson):
// the verb pool filter + the unlock gate, the prompt builder, the trigger-frame map (the single
// swappable seam (iii) sentences replace later), the STRICT grading verdict, and the teaching-line
// generator. Consumes the conjugator + its display guard; does NOT modify them.
//
// The drill is pure practice: nothing here writes review_logs or touches review_cards scheduling.

import {
  type Person,
  type Tense,
  PERSONS,
  conjugate,
  canDisplayParadigm,
  paradigm,
  normalize,
  isInParadigm,
} from './conjugator'
import { isVerbPos } from './review-cloze'
import { classifyVerbBlank, type BlankReason } from './rating'

export const DRILL_UNLOCK_THRESHOLD = 5 // distinct trusted deck verbs needed to start the drill
export const DRILL_PROMPT_COUNT = 10 // prompts per session

// THE canonical drill tense set — the SINGLE source of truth: exactly the six finite, six-person
// tenses (== the conjugation-grid tenses). Imperative + non-finite forms (gerundio/participio) are
// deliberately excluded (no clean six-person production target). `DrillTense` derives from this
// constant, so the type and the runtime membership set can never drift apart, and a non-finite
// conjugator tense (`imperativoAfirmativo`, …) is not assignable to `DrillTense` by construction.
export const DRILL_TENSES_ORDER = [
  'presente',
  'preterito',
  'imperfecto',
  'futuro',
  'condicional',
  'subjPresente',
] as const

export type DrillTense = (typeof DRILL_TENSES_ORDER)[number]

const DRILL_TENSE_SET = new Set<Tense>(DRILL_TENSES_ORDER)
function isDrillTense(t: Tense): t is DrillTense {
  return DRILL_TENSE_SET.has(t)
}

// Grammar terms are shown in SPANISH, consistently, everywhere a tense label appears in the drill —
// setup chips, both focus headers (prompt + result), the cue chip, the result teaching line, and the
// recap missed-list. `tenseLabel` is the SINGLE source for those surfaces (no tense string is ever
// inlined in a drill component); `DRILL_TENSES` keeps only the ordered key list the setup screen maps
// over. The conjugation-grid sheet keeps its own labelEs/glossFr (a separate concern, reused as-is).
export const DRILL_TENSES: ReadonlyArray<{ tense: DrillTense }> = DRILL_TENSES_ORDER.map((tense) => ({
  tense,
}))

// Canonical FULL Spanish display name for a drill tense ("Pretérito indefinido"), the one
// source every drill surface renders. Regression-locked in drill.test.ts so a future relabel/rekey
// fails CI. (lib/review-cue.ts keeps its own short `drillTenseLabel` below — a different surface.)
const TENSE_LABEL: Record<DrillTense, string> = {
  presente: 'Presente',
  preterito: 'Pretérito indefinido',
  imperfecto: 'Imperfecto',
  futuro: 'Futuro',
  condicional: 'Condicional',
  subjPresente: 'Subjuntivo presente',
}

export function tenseLabel(tense: DrillTense): string {
  return TENSE_LABEL[tense]
}

// Short Spanish label ("Pretérito") — kept ONLY for lib/review-cue.ts's review cue chip, whose
// compact layout wants the short form. Drill surfaces use the full `tenseLabel` above.
const DRILL_TENSE_LABEL_SHORT: Record<DrillTense, string> = {
  presente: 'Presente',
  preterito: 'Pretérito',
  imperfecto: 'Imperfecto',
  futuro: 'Futuro',
  condicional: 'Condicional',
  subjPresente: 'Subjuntivo',
}

export function drillTenseLabel(tense: DrillTense): string {
  return DRILL_TENSE_LABEL_SHORT[tense]
}

// ── person scope ────────────────────────────────────────────────────────────────────────────
export type PersonScope = 'singular' | 'all'
const SINGULAR_PERSONS: readonly Person[] = ['yo', 'tú', 'él']

export function personsForScope(scope: PersonScope): Person[] {
  return scope === 'all' ? [...PERSONS] : [...SINGULAR_PERSONS]
}

// ── verb pool + unlock gate ───────────────────────────────────────────────────────────────────
export type DeckVerbInput = { pos?: string | null; word: string; lemma: string | null }
export type DrillVerb = { verb: string } // infinitive — conjugated against AND shown in the cue chip

function isReflexiveInfinitive(inf: string): boolean {
  return /(ar|er|ir)se$/.test(inf)
}

// A deck verb is drillable iff it is a (non-reflexive) verb whose full paradigm is reference-verified
// (canDisplayParadigm). Reflexives are excluded in v1 (proclitic typing/grading out of scope) — both
// by the v.pron. POS tag AND by an -se infinitive (a mis-tagged reflexive). The infinitive to
// conjugate is `lemma ?? word` (lemma is null for verbs added in infinitive form — the stored word
// is then the infinitive).
export function isDrillableVerb(w: DeckVerbInput): boolean {
  if (!isVerbPos(w.pos ?? undefined)) return false
  if (w.pos === 'v.pron.') return false
  const inf = (w.lemma ?? w.word).trim().toLowerCase()
  if (isReflexiveInfinitive(inf)) return false
  return canDisplayParadigm(inf)
}

// The drillable verb pool (deduped by infinitive — a deck holding both "comer" and "comió" yields one
// `comer`). Drives both the unlock count and the prompt source.
export function buildDrillPool(words: DeckVerbInput[]): DrillVerb[] {
  const seen = new Set<string>()
  const out: DrillVerb[] = []
  for (const w of words) {
    if (!isDrillableVerb(w)) continue
    const verb = (w.lemma ?? w.word).trim().toLowerCase()
    if (seen.has(verb)) continue
    seen.add(verb)
    out.push({ verb })
  }
  return out
}

// ── trigger frames — THE single swappable content seam ──────────────────────────────────────────
// A fixed, verb-agnostic, object-less Spanish lead-in per tense that fixes the tense (the (ii) format).
// (iii) full generated sentences later replace ONLY this function — the rest of the loop is untouched.
const TRIGGER_FRAMES: Record<DrillTense, string> = {
  presente: 'Ahora mismo, ',
  preterito: 'Ayer, ',
  imperfecto: 'Antes, ',
  futuro: 'Mañana, ',
  condicional: 'En ese caso, ',
  subjPresente: 'Ojalá ',
}

export function triggerFrame(tense: DrillTense): string {
  return TRIGGER_FRAMES[tense]
}

// ── prompt builder ──────────────────────────────────────────────────────────────────────────────
export type DrillPromptItem = {
  verb: string // infinitive
  tense: DrillTense
  person: Person
  correctForm: string // the conjugated target (the conjugator's accented form)
  frame: string // the trigger lead-in
}

function shuffle<T>(arr: readonly T[], rng: () => number): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

// 10 prompts, each a random (verb, tense, person) from the guard-filtered pool × selected scope.
// Prefers UNIQUE combos; tops up with repeats only when fewer than `count` unique combos exist
// (e.g. 1 tense × 3 persons × 3 verbs = 9 < 10). `rng` is injected so the client passes Math.random
// and tests pass a seeded generator. Every combo is guard-safe (pool is trusted), but conjugate()
// is still null-checked defensively.
export function buildDrillPrompts(
  pool: readonly DrillVerb[],
  tenses: readonly DrillTense[],
  persons: readonly Person[],
  rng: () => number = Math.random,
  count = DRILL_PROMPT_COUNT,
): DrillPromptItem[] {
  // Defense-in-depth: only ever build from the six finite drill tenses. The type already restricts
  // `tenses` to DrillTense, and coercePrefs filters the DB; this guard makes "no imperativo /
  // gerundio / participio can enter" hold even under a future cast or a widened type — so conjugate()
  // is never asked for a non-finite tense (a leak like beber→"bebed" cannot reach a prompt).
  const finite = tenses.filter(isDrillTense)
  // Dev-only: a silent drop here would hide a real regression (a non-finite tense reaching the pool),
  // so surface it. Stays out of production noise via the NODE_ENV guard.
  if (process.env.NODE_ENV !== 'production' && finite.length !== tenses.length) {
    const dropped = tenses.filter((t) => !isDrillTense(t))
    console.warn('[drill] non-finite tense dropped:', dropped)
  }

  const combos: DrillPromptItem[] = []
  for (const { verb } of pool) {
    for (const tense of finite) {
      for (const person of persons) {
        const correctForm = conjugate(verb, tense, person)
        if (!correctForm) continue
        combos.push({ verb, tense, person, correctForm, frame: triggerFrame(tense) })
      }
    }
  }
  if (combos.length === 0) return []

  const result = shuffle(combos, rng).slice(0, count)
  // Top up with re-shuffled repeats only when the unique pool is smaller than `count`.
  while (result.length < count) {
    for (const c of shuffle(combos, rng)) {
      if (result.length >= count) break
      result.push(c)
    }
  }
  return result
}

// ── strict grading ──────────────────────────────────────────────────────────────────────────────
export type DrillVerdict = 'correct' | 'close' | 'wrong'

// Reuses the proven, already-STRICT classifyVerbBlank (lib/rating.ts) and collapses its four
// qualities to the drill's three verdicts. classifyVerbBlank routes a different valid inflection to
// `wrongForm` (NOT the lenient "any valid inflection = ¡Casi!"), so a wrong tense/person → ¡Uy!:
//   exact target form            → correct (¡Eso es!)
//   accent / small typo near-miss → close   (¡Casi!)
//   lemma OR a different valid form → wrong  (¡Uy!)   ← the deterministic teaching-line case
//   unrelated answer             → wrong   (¡Uy!)
export function gradeDrillAnswer(params: {
  target: string
  lemma: string
  userAnswer: string
}): { verdict: DrillVerdict; reason: BlankReason; distance: number } {
  const { target, lemma, userAnswer } = params
  const { quality, reason, distance } = classifyVerbBlank({
    target,
    lemma,
    userAnswer,
    inParadigm: (a) => isInParadigm(a, lemma),
  })
  const verdict: DrillVerdict =
    quality === 'exact' ? 'correct' : quality === 'near' ? 'close' : 'wrong'
  return { verdict, reason, distance }
}

// ── teaching line (¡Uy! only) ───────────────────────────────────────────────────────────────────
// Deterministic "tu as donné [X], on attendait [Y]" line, generated ONLY when the wrong answer is
// itself a recognizable form (analyze() non-empty). On a pure typo-wrong (answer not in the paradigm)
// it returns null → the result shows just the struck answer + correct form. It NEVER guesses: an
// answer that maps to several distinct tenses degrades to "Ce n'est pas [Y]". The FRENCH prose frame
// carries the SPANISH tense names from `tenseLabel` (the drill's single tense-name source).
export function drillTeachingLine(params: {
  userAnswer: string
  lemma: string
  targetTense: DrillTense
}): string | null {
  const { userAnswer, lemma, targetTense } = params
  const target = tenseLabel(targetTense)
  // Prefer accent-EXACT paradigm matches over accent-folded ones (the logró/logro lesson): an
  // accented "hablé" is unambiguously preterite, whereas a bare "hable" genuinely collides with
  // the subjunctive — so it should degrade. Fall back to folded matching only when nothing matches
  // exactly (the user dropped an accent).
  const ans = userAnswer.trim().toLowerCase()
  const entries = paradigm(lemma)
  const exact = entries.filter((e) => e.surface.toLowerCase() === ans)
  const nAns = normalize(ans)
  const matched = exact.length > 0 ? exact : entries.filter((e) => normalize(e.surface) === nAns)
  if (matched.length === 0) return null

  const tenses = new Set(matched.map((e) => e.tense))
  if (tenses.has('infinitivo')) {
    return `Tu as donné l'infinitif, on attendait ${target}.`
  }

  const drillTenses = new Set([...tenses].filter(isDrillTense))
  const others = new Set([...drillTenses].filter((t) => t !== targetTense))

  if (others.size === 1) {
    return `Tu as donné ${tenseLabel([...others][0])}, on attendait ${target}.`
  }
  if (others.size === 0 && drillTenses.has(targetTense)) {
    // Right tense, wrong person (the form maps only to the target tense).
    return `C'est bien ${target}, mais pas la bonne personne.`
  }
  // Ambiguous (several distinct tenses) or a non-drill form (imperativo / gerundio / participio).
  return `Ce n'est pas ${target}.`
}
