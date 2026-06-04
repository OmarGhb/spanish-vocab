import { maskVerbSentence, maskSentence, type VerbTarget } from './mask'
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
}

/**
 * Deterministic example selection + masking (server + client agree — no hydration mismatch).
 * For verb cards (v./v.pron.), paradigm-aware masking blanks the contextually-correct conjugated
 * form (maskVerbSentence over lemma ?? word, M5.3a); the plain stem-heuristic maskSentence is the
 * fallback for non-verbs and for verb sentences where no paradigm token matched. Returns null only
 * when there is no example or no example can be masked at all — the caller then falls back (MC for
 * FillInBlank; the definition cue for MultipleChoice).
 */
export function pickClozeExample({ examples, word, id, lemma, pos }: ClozeInput): ClozeExample | null {
  if (examples.length === 0) return null
  const seed = parseInt(id.replace(/-/g, '').slice(0, 8), 16) || id.charCodeAt(0)
  const start = seed % examples.length

  if (isVerbPos(pos)) {
    const verbLemma = lemma ?? word
    for (let i = 0; i < examples.length; i++) {
      const ex = examples[(start + i) % examples.length]
      const vr = maskVerbSentence(ex.es, verbLemma)
      if (vr) return { example: ex, masked: vr.masked, target: vr.target }
    }
  }

  for (let i = 0; i < examples.length; i++) {
    const ex = examples[(start + i) % examples.length]
    const masked = maskSentence(ex.es, word)
    if (masked !== null) return { example: ex, masked, target: null }
  }
  return null
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
