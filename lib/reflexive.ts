// Deterministic, verb-agnostic correction of a malformed proclitic on a reflexive add (v0.6.5
// Item 2). Pure: no I/O, no Next/Supabase, no conjugator. The v0.6.2 per-token spellcheck passes
// "ti acuestas" because "ti" is a real Spanish word (prepositional pronoun) and "acuestas" is
// valid — the malformation is grammatical (wrong proclitic for the person), not lexical. When
// enrichment flags a reflexive finite form, the leading token occupies the clitic slot; validate
// it against the person→clitic map and offer/store the corrected surface, never the typo.
//
// DETECTION is split from CORRECTION (so annotation drift degrades to "store the lemma", never to
// "store the malformed surface"): the valid proclitic set {me,te,se,nos,os} flags malformation
// WITHOUT needing the person ("ti"/"mi" are definitively wrong); the person is only needed to pick
// the replacement.

export type Clitic = 'me' | 'te' | 'se' | 'nos' | 'os'

const VALID_CLITICS: ReadonlySet<string> = new Set<Clitic>(['me', 'te', 'se', 'nos', 'os'])

// person + number → reflexive clitic. usted/ustedes take "se" (3rd-person agreement).
//   1sg me · 2sg te · 3sg/usted se · 1pl nos · 2pl os · 3pl/ustedes se
export function parseReflexiveClitic(formAnnotation: string): Clitic | null {
  const a = formAnnotation.toLowerCase()
  // usted/ustedes conjugate 3rd-person → "se", regardless of how the person is otherwise written.
  if (/\busted(es)?\b/.test(a)) return 'se'
  const plural = /\bplural\b/.test(a) || /\bpl\./.test(a)
  // Ordinal tolerant to "1ª pers.", "2.ª persona", "3 person", "2a pers", and the spelled forms.
  let person: 1 | 2 | 3 | null = null
  if (/\bprimera\b/.test(a) || /\b1\s*[ªaºo.]*\s*pers/.test(a)) person = 1
  else if (/\bsegunda\b/.test(a) || /\b2\s*[ªaºo.]*\s*pers/.test(a)) person = 2
  else if (/\btercera\b/.test(a) || /\b3\s*[ªaºo.]*\s*pers/.test(a)) person = 3
  if (person === null) return null
  if (person === 1) return plural ? 'nos' : 'me'
  if (person === 2) return plural ? 'os' : 'te'
  return 'se' // 3rd person, singular or plural
}

/**
 * Returns the surface to OFFER/STORE for `word`. For a flagged reflexive finite form with a
 * malformed leading proclitic, returns the corrected `"<clitic> <verb>"`. Behavior:
 *   - valid clitic + person matches             → unchanged
 *   - valid clitic + person mismatch            → correct the clitic
 *   - invalid clitic + person parseable         → correct the clitic
 *   - invalid clitic + person NOT parseable     → fall back to the LEMMA (never store the typo)
 *   - valid clitic + person ambiguous           → unchanged (can't confidently correct)
 * Anything not a flagged-reflexive 2-token proclitic form is returned untouched — so non-reflexive
 * uses like "para ti" are never rejected (the reflexive flag gates the whole function).
 */
export function correctProcliticReflexive(
  word: string,
  lemma: string | null | undefined,
  formAnnotation: string | null | undefined,
): string {
  // Gate: enrichment must have flagged this reflexive, with a lemma to fall back to.
  if (!formAnnotation || !/reflexiv/i.test(formAnnotation)) return word
  if (!lemma || !lemma.trim()) return word
  // Only a 2-token proclitic surface has a clitic slot (single-token infinitive/enclitic forms
  // like "acostarse"/"acuéstate", and 3+ token phrases, are out of scope).
  const m = word.trim().match(/^(\S+)\s+(\S+)$/u)
  if (!m) return word

  const leading = m[1].toLowerCase()
  const verb = m[2]
  const valid = VALID_CLITICS.has(leading)
  const correct = parseReflexiveClitic(formAnnotation)

  if (valid) {
    if (correct === null || correct === leading) return word // ambiguous person, or already right
    return `${correct} ${verb}` // valid clitic but wrong person → fix it
  }
  // Invalid leading token ("ti"/"mi"/…) = definitive malformation (no person needed to detect).
  if (correct !== null) return `${correct} ${verb}`
  return lemma.trim() // can't determine the clitic → store the lemma, never the malformed surface
}
