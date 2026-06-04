import { paradigm, isConjugable, normalize, type Tense, type Person } from './conjugator'

export const BLANK = '_____'

export type VerbTarget = { surface: string; tense: Tense; person: Person | null }

// Function words a paradigm form accent-folds onto (dé→de, sé→se, está→esta, estás→estas, él→el,
// té→te, mí→mi, tú→tu, sí→si, más→mas, aún→aun, sólo→solo). When a sentence token matches the
// paradigm ONLY via accent-folding and the bare token is one of these, it's the function word,
// not the verb — so the masker must skip it (require an accent-EXACT hit for these) and keep
// scanning for the genuine verb form. Without this, e.g. dar masks the preposition "de" in
// "…película de terror me dio…" instead of "dio". Affects écriture too (no cue-gate there).
const HOMOGRAPH_DENYLIST = new Set([
  'de', 'se', 'el', 'te', 'mi', 'tu', 'si', 'mas', 'esta', 'estas', 'aun', 'solo',
])

/**
 * Verb-aware masking (M5.3a). Blanks the first sentence token that is a member of `lemma`'s
 * conjugation paradigm — so it masks the *contextually-correct conjugated form* actually in the
 * sentence (estudiamos, creció, even dio/fue whose stem differs from the infinitive — which the
 * 4-char stem heuristic missed and dropped to MC). The captured {tense, person} feeds the
 * in-question hint with no stored data (derive-on-the-fly).
 *
 * Returns the masked sentence + the blanked token's grammatical coordinates, or null when no
 * paradigm token is found (caller falls back to maskSentence, then MC). Tokenizes on whitespace
 * and strips surrounding punctuation for the membership test (the rendered blank still drops the
 * whole token, matching maskSentence's single-blank behaviour).
 */
export function maskVerbSentence(sentence: string, lemma: string): { masked: string; target: VerbTarget } | null {
  if (!isConjugable(lemma)) return null

  // Two lookups: an accent-preserving one (case-insensitive) for ACCURATE coordinate recovery
  // — "logró" (pret. él) and "logro" (pres. yo) are distinct keys here — and an accent-folded
  // one as a tolerant fallback. The authored sentence token always carries its accent, so the
  // exact map resolves the right {tense, person}; folding alone would conflate the two.
  const exact = new Map<string, VerbTarget>()
  const folded = new Map<string, VerbTarget>()
  for (const entry of paradigm(lemma)) {
    const ek = entry.surface.toLowerCase()
    const fk = normalize(entry.surface)
    if (!exact.has(ek)) exact.set(ek, entry)
    if (!folded.has(fk)) folded.set(fk, entry)
  }

  const tokens = sentence.split(/\s+/)
  for (let i = 0; i < tokens.length; i++) {
    // Strip leading/trailing punctuation (¿¡"«» . , ; : ! ? …) for the membership test.
    const bare = tokens[i].replace(/^[^\p{L}]+|[^\p{L}]+$/gu, '')
    if (!bare) continue
    const lower = bare.toLowerCase()
    // Never select a function-word homograph as the verb form. The denylist holds the UNACCENTED
    // function words (de/se/esta…); the accented verb forms (dé/está/estás…) are not in it, so a
    // genuine accented form in the sentence still masks. This also guards the conjugator's
    // unaccented usted-imperative table entries ("de"/"esta") — which sit in the exact map and
    // would otherwise blank the preposition/demonstrative (e.g. dar masking "de" in "…de terror…").
    if (HOMOGRAPH_DENYLIST.has(lower)) continue
    const hit = exact.get(lower) ?? folded.get(normalize(bare))
    if (hit) {
      const masked = tokens.map((t, j) => (j === i ? t.replace(bare, BLANK) : t)).join(' ')
      return { masked, target: { surface: bare, tense: hit.tense, person: hit.person } }
    }
  }
  return null
}

/**
 * Attempts to mask the target word in a Spanish example sentence (non-verb path + verb fallback).
 *
 * Strategy (tried in order):
 * 1. Exact case-insensitive match — handles capitalization differences
 *    e.g. "Trasnocha" masked when target is "trasnochar"; "El amanecer" masked when target is "amanecer".
 * 2. Stem match — first 4 chars with \b word boundary — handles conjugations and derived forms
 *    e.g. "amanece" masked when target is "amanecer" (stem "aman"); "comieron" masked via "comi".
 *
 * Only the first occurrence is masked (no global flag) to keep the sentence readable.
 * Returns the masked sentence, or null if no match was found.
 * Callers should fall back to MC mode when null is returned.
 */
export function maskSentence(sentence: string, word: string): string | null {
  const trimmed = word.trim()

  // Strategy 1: exact case-insensitive
  const exactEscaped = trimmed.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const exactRegex = new RegExp(exactEscaped, 'i')
  if (exactRegex.test(sentence)) {
    return sentence.replace(exactRegex, '_____')
  }

  // Strategy 2: stem match on first 4 chars with word boundary
  // \b ensures we don't partially match inside an unrelated word
  const stem = trimmed.toLowerCase().slice(0, 4)
  if (stem.length >= 4) {
    const stemEscaped = stem.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const stemRegex = new RegExp(`\\b${stemEscaped}\\S*`, 'i')
    if (stemRegex.test(sentence)) {
      return sentence.replace(stemRegex, '_____')
    }
  }

  // No match — caller should force MC for this card
  return null
}
