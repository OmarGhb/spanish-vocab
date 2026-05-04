import 'server-only'
import { distance } from 'fastest-levenshtein'
// eslint-disable-next-line @typescript-eslint/no-require-imports
const rawWords: string[] = require('an-array-of-spanish-words') as string[]

const WORD_SET = new Set(rawWords)

// Strip vowel accents only — ñ is a distinct Spanish letter, not a diacritic.
function normalize(word: string): string {
  return word
    .toLowerCase()
    .replace(/[áàä]/g, 'a')
    .replace(/[éèë]/g, 'e')
    .replace(/[íìï]/g, 'i')
    .replace(/[óòö]/g, 'o')
    .replace(/[úùü]/g, 'u')
}

export function contains(word: string): boolean {
  return WORD_SET.has(normalize(word))
}

export function prefixMatch(query: string, limit = 5): string[] {
  const q = normalize(query)
  const matches: string[] = []
  for (const w of rawWords) {
    if (w.startsWith(q)) {
      matches.push(w)
      if (matches.length >= limit * 8) break
    }
  }
  matches.sort((a, b) => a.length - b.length)
  return matches.slice(0, limit)
}

export function fuzzyMatch(word: string, limit = 5): string[] {
  const q = normalize(word)
  const threshold = q.length <= 4 ? 1 : 2
  const minLen = q.length - threshold
  const maxLen = q.length + threshold

  const candidates: { word: string; dist: number }[] = []
  for (const w of rawWords) {
    if (w.length < minLen || w.length > maxLen) continue
    const d = distance(q, w)
    if (d > 0 && d <= threshold) {
      candidates.push({ word: w, dist: d })
    }
  }

  candidates.sort((a, b) => a.dist - b.dist || a.word.length - b.word.length)
  return candidates.slice(0, limit).map((c) => c.word)
}
