// Pure, unit-tested free-text search for the /words list. The match predicate
// lives here (not inlined in WordList) per the chooseQcmCue/resultHintExample
// inline-regression lesson.

export type WordSearchFields = {
  word: string
  defEs: string
  defFr: string
}

// Forgiving normalize: lowercase + NFD diacritic-strip, so "bebi" matches "bebí"
// and "nino" matches "niño". The plain NFD strip folds ñ→n, which is what we WANT
// here — deliberately NOT the Ñ-preserving guard from lib/dictionary.ts's bucketing
// (that does the opposite, for a different purpose).
export function normalizeSearch(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
}

// An empty / whitespace-only query matches everything. Otherwise the normalized
// query must be a substring of the normalized Spanish word OR either gloss.
export function matchesWordSearch(item: WordSearchFields, query: string): boolean {
  const q = normalizeSearch(query)
  if (q === '') return true
  return (
    normalizeSearch(item.word).includes(q) ||
    normalizeSearch(item.defEs).includes(q) ||
    normalizeSearch(item.defFr).includes(q)
  )
}
