// Blank the target word where it appears in a definition string, so a REVIEW HINT that shows the
// ES definition can't give the answer away. Render-time only — the stored definition and the
// dictionary detail view keep the full, unblanked text; this is a review-exercise concern.
//
// Match rule (kept deliberately narrow per the v0.12.4 scope):
//   • exact stem match, case- AND accent-insensitive (via normalizeSearch)
//   • plus a Spanish PLURAL suffix (+s / +es), preserving the actual suffix:
//       word "palabra"  in "conjunto de palabras"  →  "conjunto de ____s"
//   • full inflections are intentionally NOT matched — "corres" is never blanked for "correr",
//     "comería" never for "comer" (the trailing letter fails the plural gate + word boundary).
//   • whole-word only (a trailing/leading letter kills the match) so "palabra" ignores "palabrota".
// Multi-word headwords ("a menudo") are handled uniformly by the same pattern (internal whitespace
// runs are allowed), so an exact phrase occurrence is blanked too.

import { normalizeSearch } from './word-search'

const BLANK = '____'

// Base letter → every Spanish surface form that folds to it. Built on the STEM (already accent-
// stripped + ñ→n by normalizeSearch), so each base letter is expanded back to an accent-insensitive
// class — that lets us match accented text in `def` without mutating the characters we splice back.
const FOLD: Record<string, string> = {
  a: 'aáàäâ',
  e: 'eéèëê',
  i: 'iíìïî',
  o: 'oóòöô',
  u: 'uúùüû',
  n: 'nñ',
  c: 'cç',
}

function charClass(c: string): string {
  const group = FOLD[c]
  if (group) return `[${group}]`
  // Non-folded char (plain consonant, digit): escape any regex metachar.
  return c.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

export function blankTargetInDefinition(def: string, word: string): string {
  const stem = normalizeSearch(word) // lowercase + accent-strip (ñ→n) + trim
  if (!stem) return def

  // Accent-/case-insensitive pattern for the stem; internal whitespace runs cover multi-word
  // headwords; an optional plural suffix is captured so we can preserve it. The lookbehind/lookahead
  // enforce whole-word boundaries (no letter immediately adjacent), which is what rejects longer
  // inflections and substrings.
  const body = stem
    .split(/\s+/)
    .filter(Boolean)
    .map((tok) => Array.from(tok).map(charClass).join(''))
    .join('\\s+')
  const re = new RegExp(`(?<![\\p{L}])(?:${body})(es|s)?(?![\\p{L}])`, 'giu')

  return def.replace(re, (_match, suffix: string | undefined) => BLANK + (suffix ?? ''))
}
