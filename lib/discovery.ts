// Shared discovery-mode types and pure display helpers (safe for client + server).

export type Gender = 'm' | 'f' | null

export type DeckCard = {
  id: string
  word: string
  fr: string
  pos: string
  gender: Gender
  example: { es: string; fr: string }
}

// French POS eyebrow shown above the deck word, e.g. "NOM · MASCULIN", "VERBE".
// Gender drives the noun suffix; non-nouns fall back to a POS label with no suffix.
export function posEyebrow(pos: string, gender: Gender): string {
  if (gender) return `NOM · ${gender === 'm' ? 'MASCULIN' : 'FÉMININ'}`
  const map: Record<string, string> = {
    'v.': 'VERBE',
    'v.pron.': 'VERBE',
    'adj.': 'ADJECTIF',
    'adv.': 'ADVERBE',
    'prep.': 'PRÉPOSITION',
    'conj.': 'CONJONCTION',
    'pron.': 'PRONOM',
    'interj.': 'INTERJECTION',
    'n.m.': 'NOM',
    'n.f.': 'NOM',
    'n.m./f.': 'NOM',
  }
  return map[pos] ?? pos.toUpperCase()
}

// Display-only definite article. Bare word stored in the DB; article never persisted.
export function deckArticle(gender: Gender): string | null {
  return gender === 'm' ? 'el' : gender === 'f' ? 'la' : null
}
