// Deterministic letter scramble for the écriture Indice tier 3 (M5.5f). Pure + tested; seeded so
// it's stable across re-renders (no Math.random → no hydration drift, no reshuffle on every render).
// Returns a permutation of the word's letters, guaranteed ≠ the original when the letters allow it.

// Derive a stable numeric seed from a string (e.g. the card id), same approach as the MCQ shuffle.
export function seedFromString(id: string): number {
  return (parseInt(id.replace(/-/g, '').slice(0, 8), 16) || id.charCodeAt(0) || 1) >>> 0
}

export function scrambleLetters(word: string, seed: number): string[] {
  const letters = [...word]
  if (letters.length <= 1) return letters

  const a = [...letters]
  let s = seed >>> 0
  const rand = () => {
    s = (s * 1664525 + 1013904223) >>> 0
    return s / 0x100000000
  }
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  // Avoid handing back the original spelling when a different arrangement exists.
  if (a.join('') === letters.join('')) {
    for (let i = 1; i < a.length; i++) {
      if (a[i] !== a[0]) {
        ;[a[0], a[i]] = [a[i], a[0]]
        break
      }
    }
  }
  return a
}

// Accent/case-folded letter so typing "bebais" still consumes the "á" tile.
function fold(c: string): string {
  return c.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
}

// Per-tile "used" flags for the scramble Indice: each entered letter (typed OR tapped) consumes one
// matching tile, so tiles grey out one by one. Two passes so tapping a specific tile greys THAT tile
// even when accent variants collide (plain "o" vs "ó"):
//   1. EXACT pass — an entered char consumes a tile with the identical glyph. A tapped tile inserts
//      its exact glyph, so this attributes a tapped "o" to the plain-o tile and a tapped "ó" to the
//      "ó" tile (for true duplicate tiles it greys an equivalent one — visually identical).
//   2. FOLD pass — a char left unmatched (e.g. a TYPED plain "o" when only "ó" tiles remain; the
//      keyboard can't easily produce accents) consumes the first remaining tile that folds to it.
// Purely derived from the answer string, so deletion recomputes for free. A letter not in the pool
// (or beyond its count) consumes nothing.
export function usedScrambleTiles(tiles: string[], typed: string): boolean[] {
  const used = new Array(tiles.length).fill(false)
  // Meaningful entered chars (skip whitespace/empties, same guard as before).
  const chars = [...typed].filter((c) => fold(c).trim() !== '')

  // Pass 1 — exact glyph.
  const leftover: string[] = []
  for (const c of chars) {
    const idx = tiles.findIndex((t, i) => !used[i] && t === c)
    if (idx >= 0) used[idx] = true
    else leftover.push(c)
  }
  // Pass 2 — accent/case fold, over whatever the exact pass didn't claim.
  for (const c of leftover) {
    const f = fold(c)
    const idx = tiles.findIndex((t, i) => !used[i] && fold(t) === f)
    if (idx >= 0) used[idx] = true
  }
  return used
}
