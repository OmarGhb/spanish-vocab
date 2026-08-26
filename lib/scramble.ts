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
// matching tile, so tiles grey out one by one. Three passes:
//   0. TAPPED pass (identity, v0.12.29) — a tile the user actually TOUCHED claims one entered char
//      with its exact glyph, so THAT tile greys even when a byte-identical twin sits earlier in the
//      row ("bebe" → tapping the 2nd "b" must not grey the 1st). Glyph alone can't decide this: the
//      twins are indistinguishable, so pass 1 always picked the lower index. `tapped` carries the
//      caller's tile indices, in tap order; a tile whose glyph is no longer in the answer (deleted)
//      is skipped and releases for free.
//   1. EXACT pass — an entered char consumes a tile with the identical glyph. A tapped tile inserts
//      its exact glyph, so this attributes a tapped "o" to the plain-o tile and a tapped "ó" to the
//      "ó" tile (the v0.12.9 accent-collision fix).
//   2. FOLD pass — a char left unmatched (e.g. a TYPED plain "o" when only "ó" tiles remain; the
//      keyboard can't easily produce accents) consumes the first remaining tile that folds to it.
// Still purely derived from the answer string + tap log, so deletion recomputes for free. A letter
// not in the pool (or beyond its count) consumes nothing. `tapped` defaults to [] — omitting it
// reproduces the pre-v0.12.29 behaviour exactly (pass 0 no-ops).
export function usedScrambleTiles(tiles: string[], typed: string, tapped: number[] = []): boolean[] {
  const used = new Array(tiles.length).fill(false)
  // Meaningful entered chars (skip whitespace/empties, same guard as before).
  const chars = [...typed].filter((c) => fold(c).trim() !== '')
  // Which entered chars a tapped tile already accounted for, so passes 1–2 don't double-consume.
  const claimed = new Array(chars.length).fill(false)

  // Pass 0 — tapped tile identity.
  for (const idx of tapped) {
    if (idx < 0 || idx >= tiles.length || used[idx]) continue
    const ci = chars.findIndex((c, i) => !claimed[i] && c === tiles[idx])
    if (ci >= 0) {
      claimed[ci] = true
      used[idx] = true
    }
  }
  // Pass 1 — exact glyph, over the chars no tapped tile claimed.
  const leftover: string[] = []
  chars.forEach((c, i) => {
    if (claimed[i]) return
    const idx = tiles.findIndex((t, j) => !used[j] && t === c)
    if (idx >= 0) used[idx] = true
    else leftover.push(c)
  })
  // Pass 2 — accent/case fold, over whatever the exact pass didn't claim.
  for (const c of leftover) {
    const f = fold(c)
    const idx = tiles.findIndex((t, i) => !used[i] && fold(t) === f)
    if (idx >= 0) used[idx] = true
  }
  return used
}
