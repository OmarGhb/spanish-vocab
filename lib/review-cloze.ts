import { maskVerbSentence, maskSentence, type VerbTarget } from './mask'

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
