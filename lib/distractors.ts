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

// Filter an over-generated candidate pool down to (at most) `count` distractor words:
//   1. dedup by normalized word; drop the target surface itself
//   2. drop synonyms — candidates whose gloss overlaps the target's gloss
//   3. spread-maximizing greedy pick: build a set whose members don't share a gloss token with each
//      other (so the picks are mutually distinct, not a tight cluster)
//   4. graceful degradation: if <count survive step 2, backfill from the dropped (synonym)
//      candidates so the result is exactly `count` (the save schema requires 3) — a hopeless word
//      falls back to a synonym rather than failing to build a card.
// Returns exactly `count` words when the pool has ≥count unique non-target candidates; fewer only
// when the pool itself is that thin (the caller treats <count as a malformed generation).
export function selectDistractors(
  target: DistractorCandidate,
  candidates: DistractorCandidate[],
  count = 3,
): string[] {
  const targetKey = normalizeSearch(target.word)

  // 1. dedup by normalized word; drop the target surface.
  const seen = new Set<string>()
  const unique: DistractorCandidate[] = []
  for (const c of candidates) {
    const key = normalizeSearch(c.word)
    if (!key || key === targetKey || seen.has(key)) continue
    seen.add(key)
    unique.push(c)
  }

  // 2. partition into non-synonyms (kept) and synonyms (backfill reserve).
  const kept: DistractorCandidate[] = []
  const dropped: DistractorCandidate[] = []
  for (const c of unique) (glossesOverlap(target, c) ? dropped : kept).push(c)

  // 3. spread-maximizing greedy pick: only add a survivor that shares no gloss token with any
  //    already-picked one, so the final set is mutually distinct.
  const picked: DistractorCandidate[] = []
  for (const c of kept) {
    if (picked.length >= count) break
    if (picked.every((p) => !glossesOverlap(p, c))) picked.push(c)
  }
  // If mutual-distinctness couldn't fill `count`, top up from the remaining survivors (may overlap).
  if (picked.length < count) {
    for (const c of kept) {
      if (picked.length >= count) break
      if (!picked.includes(c)) picked.push(c)
    }
  }
  // 4. still short → backfill from the dropped synonyms so we hit exactly `count` when possible.
  if (picked.length < count) {
    for (const c of dropped) {
      if (picked.length >= count) break
      picked.push(c)
    }
  }

  return picked.slice(0, count).map((c) => c.word)
}
