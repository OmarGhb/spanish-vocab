// Shared discovery-mode types and pure display helpers (safe for client + server).

export type Gender = 'm' | 'f' | null

export type CollectionCard = {
  id: string
  word: string
  fr: string
  pos: string
  gender: Gender
  example: { es: string; fr: string }
}

// French POS eyebrow shown above the discovery collection word, e.g. "NOM · MASCULIN", "VERBE".
// Gender drives the noun suffix; non-nouns fall back to a POS label with no suffix.
// (The /words detail + /add cards use the inline abbreviated `posAbbrev` instead — board
// §3 reconciliation — so they keep gender in the n.m./n.f. abbreviation.)
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
export function collectionArticle(gender: Gender): string | null {
  return gender === 'm' ? 'el' : gender === 'f' ? 'la' : null
}

// Inline, abbreviated FRENCH part-of-speech shown right after the headword on BOTH the
// /words detail card and the /add enrichment card (board §3 — one coherent treatment, so
// the two can't drift). Gender RIDES IN the noun abbreviation (n.m. / n.f.), which is why
// abbreviated wins over the spelled-out "NOM" eyebrow (that dropped gender). Maps the
// stored pos (enrichment notation) to its French display abbreviation; only `prep.`→`prép.`
// and the pronominal verb collapse actually differ — the rest are identity — but routing
// every caller through one map is what keeps the two cards consistent. Unknown → as-is.
const POS_ABBR: Record<string, string> = {
  'v.': 'v.',
  'v.pron.': 'v.',
  'n.m.': 'n.m.',
  'n.f.': 'n.f.',
  'n.m./f.': 'n.m./f.',
  'adj.': 'adj.',
  'adv.': 'adv.',
  'prep.': 'prép.',
  'conj.': 'conj.',
  'pron.': 'pron.',
  'interj.': 'interj.',
}
export function posAbbrev(pos: string): string {
  return POS_ABBR[pos] ?? pos
}
