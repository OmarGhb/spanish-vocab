// Deterministic context cue for the écriture answering state (review Fix #1). Pure + tested —
// never inline in the component (the chooseQcmCue/resultHintExample lesson), never LLM.
//
// The verb cue is shown ABOVE the blank so the user can produce the conjugated form: the
// infinitive (which is NOT the answer) + the tense + person — needed to conjugate. Grammar terms
// are SPANISH, honoring the standing "grammar in accented Spanish everywhere" decision (M5.3c) —
// the design board's French mock is a deliberate divergence.
//
// Degrade-safe: only show a tense/person we can derive deterministically from a TRUSTED paradigm
// (canDisplayParadigm) + an unambiguous analysis; otherwise drop it and keep just the infinitive.
// A guessed tense would mis-teach, so we omit rather than guess.

import {
  analyze,
  unambiguousPerson,
  canDisplayParadigm,
  type Tense,
  type Person,
} from './conjugator'
import { PERSON_LABELS } from './conjugation-grid'
import { DRILL_TENSES_ORDER, drillTenseLabel, type DrillTense } from './drill'

export type VerbCue = { infinitive: string; tense: string | null; person: string | null }

const FINITE_TENSES = new Set<Tense>(DRILL_TENSES_ORDER as readonly Tense[])

// Canonical short Spanish tense label (Presente/Pretérito/…), reusing the drill's single source
// of truth. Returns null for non-finite/imperative tenses (no clean conjugation descriptor).
function tenseLabelEs(t: Tense): string | null {
  return FINITE_TENSES.has(t) ? drillTenseLabel(t as DrillTense) : null
}

// Build the verb chip parts for a conjugated target form. `target` is the surface form blanked
// from the sentence (the answer); `lemma` is the infinitive (the cue, ≠ answer).
export function verbCue(target: string, lemma: string): VerbCue {
  const cue: VerbCue = { infinitive: lemma, tense: null, person: null }
  if (!canDisplayParadigm(lemma)) return cue

  const matches = analyze(target, lemma)
  if (matches.length === 0) return cue

  // Only show the tense when the analysis resolves to a SINGLE finite tense (else ambiguous).
  const tenses = new Set<Tense>(matches.map((m) => m.tense))
  if (tenses.size === 1) cue.tense = tenseLabelEs([...tenses][0])

  const person: Person | null = unambiguousPerson(target, lemma)
  if (person) cue.person = PERSON_LABELS[person]

  return cue
}

// Raw {tense, person} for building a deterministic conjugation grid (Indice 2 + verb verdicts) —
// returns null unless the target resolves to a SINGLE finite grid tense AND an unambiguous person
// on a trusted paradigm, so callers can degrade safely (Indice 2 → ES definition; verdict → plain
// reveal) rather than highlight a guessed cell. The display-side companion to verbCue.
export function verbGridCoords(target: string, lemma: string): { tense: Tense; person: Person } | null {
  if (!canDisplayParadigm(lemma)) return null
  const tenses = new Set<Tense>(analyze(target, lemma).map((m) => m.tense))
  if (tenses.size !== 1) return null
  const tense = [...tenses][0]
  if (!FINITE_TENSES.has(tense)) return null
  const person = unambiguousPerson(target, lemma)
  if (!person) return null
  return { tense, person }
}
