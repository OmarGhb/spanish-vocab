import 'server-only'
import nspell from 'nspell'
import { distance } from 'fastest-levenshtein'

// Top-level await: module resolves once on cold start (~539 ms).
// Exported functions are synchronous — callers never need await.
const dict = await import('dictionary-es')
// dictionary-es ships Uint8Array; nspell types expect Buffer. At runtime Node.js
// Buffer extends Uint8Array, so the cast is safe.
const _checker = nspell({
  aff: dict.default.aff as unknown as Buffer,
  dic: dict.default.dic as unknown as Buffer,
})
// checker.data is an internal property not exposed in @types/nspell.
// It contains every valid word form after affix expansion (656k entries).
type WordData = Record<string, unknown>
const _data = (_checker as unknown as { data: WordData }).data

// 656k accent-preserving expanded forms from the Hunspell affix expansion.
const WORDS: string[] = Object.keys(_data)
const WORD_SET: Set<string> = new Set(WORDS)

// Strip vowel accents from a query string (used only in prefixMatch for
// accent-tolerant suggestions when the user hasn't typed an accent yet).
function normalizeQuery(q: string): string {
  return q
    .replace(/[áàä]/g, 'a')
    .replace(/[éèë]/g, 'e')
    .replace(/[íìï]/g, 'i')
    .replace(/[óòö]/g, 'o')
    .replace(/[úùü]/g, 'u')
}

export function contains(word: string): boolean {
  return WORD_SET.has(word.toLowerCase())
}

export function prefixMatch(query: string, limit = 5): string[] {
  const q = query.toLowerCase()
  const qNorm = normalizeQuery(q)
  const hasAccent = q !== qNorm // user typed an explicit accent → strict matching

  const matches: string[] = []
  for (const w of WORDS) {
    const wl = w.toLowerCase()
    if (hasAccent ? wl.startsWith(q) : normalizeQuery(wl).startsWith(qNorm)) {
      matches.push(w)
      if (matches.length >= limit * 8) break
    }
  }

  // Exact-prefix matches first, then by length (shorter = more likely base form).
  matches.sort((a, b) => {
    const aExact = a.toLowerCase().startsWith(q)
    const bExact = b.toLowerCase().startsWith(q)
    if (aExact !== bExact) return aExact ? -1 : 1
    return a.length - b.length
  })
  return matches.slice(0, limit)
}

export type SpellResult = { ok: true } | { ok: false; candidates: string[] }

/**
 * Phrase-aware spellcheck gate. Single-token inputs behave exactly as before
 * (`contains` → ok; else `fuzzyMatch`). Multi-token inputs (e.g. "te acuestas",
 * "a menudo", "sin embargo") are checked PER TOKEN — the 656k Hunspell set holds
 * only single tokens, so the old whole-string `contains` lookup failed on every
 * phrase regardless of validity. A phrase passes iff every whitespace-separated
 * token is a known form. On exactly one missing token, the fuzzy candidates are
 * reconstructed into the full phrase (corrected token swapped in, the rest kept)
 * so the caller surfaces a usable phrase, never a bare token. Two or more missing
 * tokens → no candidate (SPELLCHECK_UNKNOWN).
 */
export function checkSpelling(input: string): SpellResult {
  const tokens = input.trim().split(/\s+/)
  const missing: number[] = []
  for (let i = 0; i < tokens.length; i++) {
    if (!contains(tokens[i])) missing.push(i)
  }
  if (missing.length === 0) return { ok: true }
  if (missing.length > 1) return { ok: false, candidates: [] }

  const i = missing[0]
  const candidates = fuzzyMatch(tokens[i], 5).map((c) => {
    const swapped = [...tokens]
    swapped[i] = c
    return swapped.join(' ')
  })
  return { ok: false, candidates }
}

export function fuzzyMatch(word: string, limit = 5): string[] {
  const q = word.toLowerCase()
  const threshold = q.length <= 4 ? 1 : 2
  const minLen = q.length - threshold
  const maxLen = q.length + threshold

  const candidates: { word: string; dist: number }[] = []
  for (const w of WORDS) {
    if (w.length < minLen || w.length > maxLen) continue
    const d = distance(q, w)
    if (d > 0 && d <= threshold) {
      candidates.push({ word: w, dist: d })
    }
  }

  candidates.sort((a, b) => a.dist - b.dist || a.word.length - b.word.length)
  return candidates.slice(0, limit).map((c) => c.word)
}
