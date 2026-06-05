import { maskVerbSentence, maskSentence, maskProcliticReflexive, type VerbTarget } from './mask'
import { normalize } from './conjugator'

// Pure, client-safe (no server-only, no Next/Supabase) — runs in the client review
// components. Single source of truth for "which example becomes the cloze, and how it
// is blanked", shared by FillInBlank (écriture) and MultipleChoice (cloze-cue QCM) so
// the two masking paths can't drift.

export const isVerbPos = (pos?: string): boolean => pos === 'v.' || pos === 'v.pron.'

export type ClozeExample = {
  example: { es: string; fr: string }
  masked: string
  // Verb cards: the blanked token's surface + coordinates (paradigm-aware masking). null for
  // non-verbs and for the verb fallback to plain maskSentence.
  target: VerbTarget | null
}

export type ClozeInput = {
  examples: Array<{ es: string; fr: string }>
  word: string
  id: string
  lemma: string | null
  pos?: string
  // ts-fsrs review count — rotates the chosen example among the MASKABLE ones across reviews so a
  // card doesn't fix on its first form forever. Optional (default 0 = no rotation / first maskable).
  reps?: number
}

/**
 * Deterministic example selection + masking (server + client agree — no hydration mismatch).
 * For verb cards (v./v.pron.), paradigm-aware masking blanks the contextually-correct conjugated
 * form (maskVerbSentence over lemma ?? word, M5.3a); the plain stem-heuristic maskSentence is the
 * fallback for non-verbs and for verb sentences where no paradigm token matched. Returns null only
 * when there is no example or no example can be masked at all — the caller then falls back (MC for
 * FillInBlank; the definition cue for MultipleChoice).
 */
export function pickClozeExample({ examples, word, id, lemma, pos, reps = 0 }: ClozeInput): ClozeExample | null {
  if (examples.length === 0) return null
  const seed = parseInt(id.replace(/-/g, '').slice(0, 8), 16) || id.charCodeAt(0)
  const start = seed % examples.length
  const verbLemma = lemma ?? word
  const verb = isVerbPos(pos)

  // Mask a single example under the card's path, or null if it can't be masked.
  const maskOne = (ex: { es: string; fr: string }): ClozeExample | null => {
    if (verb) {
      // Proclitic-reflexive stored words ("te levantas") mask the full clitic+verb unit so the
      // blank == the stored word + full-reflexive options. Falls through (null) for non-reflexive
      // words and legacy lemma-null cards → existing verb masking.
      const rr = maskProcliticReflexive(ex.es, word, verbLemma)
      if (rr) return { example: ex, masked: rr.masked, target: rr.target }
      const vr = maskVerbSentence(ex.es, verbLemma)
      if (vr) return { example: ex, masked: vr.masked, target: vr.target }
    }
    const masked = maskSentence(ex.es, word)
    if (masked !== null) return { example: ex, masked, target: null }
    return null
  }

  // UUID-stable ordering, then rotate among the MASKABLE examples by reps so a card cycles its
  // usable forms across reviews instead of fixing on the first. reps is constant during a single
  // review (determinism preserved); 1 maskable example → no rotation. Format selection
  // (chooseMode / chooseQcmCue) does NOT read reps — only the example does.
  const maskable: ClozeExample[] = []
  for (let i = 0; i < examples.length; i++) {
    const r = maskOne(examples[(start + i) % examples.length])
    if (r) maskable.push(r)
  }
  if (maskable.length === 0) return null

  // Prefer examples whose masked form IS the stored word — a COHERENT cloze (chooseQcmCue's gate),
  // so a card with a mixed example set (e.g. "te duermes" alongside a "me dormiría" sentence) masks
  // its own form, not a different paradigm member that would mis-route it to definition-MCQ.
  // Infinitive-stored verbs have no coherent example → pool = maskable → definition (unchanged).
  // reps then rotates WITHIN the chosen pool (the #3 spec should have read "coherent-maskable").
  const coherent = maskable.filter((m) => m.target && normalize(m.target.surface) === normalize(word))
  const pool = coherent.length > 0 ? coherent : maskable
  return pool[reps % pool.length]
}

/**
 * The example the RESULT screen's "Exemple" hint must render. Single source of truth shared with
 * the exercise: when the card masked an example (`picked` non-null), it is the SAME example the
 * exercise blanked (`picked.example`, un-blanked) — never a re-pick. Lifted out of an inline
 * `card.examples[0]` in FillInBlank (which diverged the moment reps-rotation / prefer-coherent
 * selection chose a non-first example) and unit-tested, per the chooseQcmCue lesson: an inline
 * decision silently regresses. Picked-null cards (definition-fallback écriture) masked no example,
 * so they keep the first example as a supplementary hint (contradicts nothing shown).
 */
export function resultHintExample(
  picked: ClozeExample | null,
  card: { examples: Array<{ es: string; fr: string }> },
): { es: string; fr: string } | null {
  if (picked) return picked.example
  return card.examples[0] ?? null
}

export type QcmCue = 'cloze' | 'definition'

/**
 * Decides the QCM cue type for a card. Pure — no I/O, no React. Locked by unit tests because an
 * inline, untested version of this regressed (commit 2e858f0 routed infinitive-stored verbs to a
 * cloze whose blank is a conjugation while the options are infinitives — incoherent).
 *
 * - No example → 'definition' (only option).
 * - Verb (v./v.pron.): 'cloze' ONLY when the card is stored in the example's form — the masked
 *   blank and the word/distractor options are then the same morphological form
 *   (normalize(target.surface) === normalize(word)). Otherwise (infinitive-stored verb whose blank
 *   is a conjugation ≠ the stored infinitive, or no paradigm token matched → target null) →
 *   'definition', coherent at the lemma level. Form-test MCQ for infinitive cards needs conjugated
 *   distractors → M5.3c.
 * - Non-verb: unchanged seed%2 split (the existing literal-word cloze is built by the caller).
 */
export function chooseQcmCue(
  card: { examples: Array<{ es: string; fr: string }>; word: string; definition: { pos?: string } },
  picked: ClozeExample | null,
  seed: number,
): QcmCue {
  if (card.examples.length === 0) return 'definition'
  if (isVerbPos(card.definition.pos)) {
    return picked?.target && normalize(picked.target.surface) === normalize(card.word)
      ? 'cloze'
      : 'definition'
  }
  return seed % 2 === 0 ? 'cloze' : 'definition'
}
