// Pure helpers for building MCQ distractors from an over-generated candidate pool.
// `glossesOverlap` kills synonyms deterministically (even when the prompt slips); `selectDistractors`
// filters + spreads the pool down to exactly 3 words. Used by lib/anthropic.ts `getWordData` at
// generation time — the stored shape stays `string[]`, so no consumer changes.
//
// Language-agnostic on the gloss: iterate GLOSS_LANGS, never hard-code a single field name. The day
// an `en` gloss is added to candidates, overlap detection picks it up with no rewrite.

import { normalizeSearch } from './word-search'

// Candidate gloss language fields, in priority order. Add 'en' etc. here and the helpers use any
// field present on BOTH words automatically.
const GLOSS_LANGS = ['fr', 'en'] as const
type GlossLang = (typeof GLOSS_LANGS)[number]

// A word carrying one or more short glosses (e.g. { fr: 'voiture' }). Extra keys are ignored.
export type Glossed = Partial<Record<GlossLang, string>>
export type DistractorCandidate = Glossed & { word: string }

// Tokenize a gloss into a comparable set: normalize (lowercase + accent-fold, reusing
// normalizeSearch) then split on '/' and ',' — the separators a dictionary-style gloss uses to list
// alternatives ("dire / parler", "voiture, automobile"). Trims, drops empties.
function glossTokens(gloss: string | undefined): Set<string> {
  if (!gloss) return new Set()
  return new Set(
    gloss
      .split(/[/,]/)
      .map((t) => normalizeSearch(t))
      .filter(Boolean),
  )
}

// True if two words share any gloss token within a COMMON language field. Per-language comparison
// (fr↔fr, en↔en) avoids cross-language false hits; returns true on the first overlapping language.
export function glossesOverlap(a: Glossed, b: Glossed): boolean {
  for (const lang of GLOSS_LANGS) {
    const ga = a[lang]
    const gb = b[lang]
    if (!ga || !gb) continue
    const ta = glossTokens(ga)
    for (const tok of glossTokens(gb)) {
      if (ta.has(tok)) return true
    }
  }
  return false
}

// Deterministic FORM check for the verb-infinitive distractor filter (Piece 1): is `word` a Spanish
// infinitive? Infinitives end in -ar/-er/-ir, optionally with an enclitic reflexive (-arse/-erse/-irse).
// This is a FORM test, NOT a POS test — it can't tell an infinitive from a noun that happens to end in
// -ar/-er/-ir ("lugar", "mujer"), so it's only applied to candidates the model already constrained to
// the verb POS; its job is to REJECT conjugated forms, which never end in -ar/-er/-ir. normalizeSearch
// strips accents, so accented infinitives ("reír"→reir, "oír"→oir) pass, and accented conjugated forms
// ("comería"→comeria) are rejected. Multi-word / empty → false (an infinitive is one token).
export function isSpanishInfinitive(word: string): boolean {
  const w = normalizeSearch(word)
  if (!w || /\s/.test(w)) return false
  return /(ar|er|ir)(se)?$/.test(w)
}

// Filter an over-generated candidate pool down to (at most) `count` distractor words:
//   1. dedup by normalized word; drop the target surface itself
//   2. PRIMARY pool = non-synonyms (gloss doesn't overlap the target) that also satisfy the form
//      requirement — for a verb-infinitive target (`requireInfinitive`), only infinitives; otherwise all.
//   3. spread-maximizing greedy pick over the primary pool (mutually gloss-distinct — no tight cluster)
//   4. graceful degradation: if <count survive, backfill from the rest, RANKED — prefer non-synonyms
//      (avoid a valid-but-marked-wrong answer, the v0.12.5 goal) over form-violators — so the result is
//      exactly `count` (the save schema requires 3). The caller re-checks length and logs a shortfall.
// With `requireInfinitive` false the behavior is identical to before (form check is a no-op).
export function selectDistractors(
  target: DistractorCandidate,
  candidates: DistractorCandidate[],
  count = 3,
  opts: { requireInfinitive?: boolean; rejectInfinitive?: boolean } = {},
): string[] {
  const targetKey = normalizeSearch(target.word)
  // Form gate: infinitive-STORED verb target → only infinitives; inflected verb target → only
  // NON-infinitives (reject the wrong-form infinitive class); otherwise no form constraint. The two
  // flags are mutually exclusive by construction (getWordData picks one); requireInfinitive wins if both.
  const formOk = (c: DistractorCandidate): boolean => {
    if (opts.requireInfinitive) return isSpanishInfinitive(c.word)
    if (opts.rejectInfinitive) return !isSpanishInfinitive(c.word)
    return true
  }

  // 1. dedup by normalized word; drop the target surface.
  const seen = new Set<string>()
  const unique: DistractorCandidate[] = []
  for (const c of candidates) {
    const key = normalizeSearch(c.word)
    if (!key || key === targetKey || seen.has(key)) continue
    seen.add(key)
    unique.push(c)
  }

  // 2. primary = non-synonym AND form-ok; everything else is graceful backfill.
  const primary: DistractorCandidate[] = []
  const backfill: DistractorCandidate[] = []
  for (const c of unique) (!glossesOverlap(target, c) && formOk(c) ? primary : backfill).push(c)

  // 3. spread-maximizing greedy pick over the primary pool.
  const picked: DistractorCandidate[] = []
  for (const c of primary) {
    if (picked.length >= count) break
    if (picked.every((p) => !glossesOverlap(p, c))) picked.push(c)
  }
  if (picked.length < count) {
    for (const c of primary) {
      if (picked.length >= count) break
      if (!picked.includes(c)) picked.push(c)
    }
  }

  // 4. still short → backfill, least-bad first: synonym is worse (2) than a form violation (1), since a
  //    synonym is a genuinely-valid answer marked wrong; combine both when a candidate is both.
  if (picked.length < count) {
    const rank = (c: DistractorCandidate) =>
      (glossesOverlap(target, c) ? 2 : 0) + (formOk(c) ? 0 : 1)
    for (const c of [...backfill].sort((a, b) => rank(a) - rank(b))) {
      if (picked.length >= count) break
      picked.push(c)
    }
  }

  return picked.slice(0, count).map((c) => c.word)
}
