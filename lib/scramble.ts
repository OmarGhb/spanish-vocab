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

// Per-tile "used" flags for the scramble Indice: as the user types, each typed letter consumes one
// matching tile (multiset, position-independent), so tiles grey out one by one. A typed letter not
// in the pool (or beyond its count) consumes nothing.
export function usedScrambleTiles(tiles: string[], typed: string): boolean[] {
  const remaining: Record<string, number> = {}
  for (const ch of typed) {
    const f = fold(ch)
    if (f.trim()) remaining[f] = (remaining[f] || 0) + 1
  }
  return tiles.map((ch) => {
    const f = fold(ch)
    if ((remaining[f] || 0) > 0) {
      remaining[f]--
      return true
    }
    return false
  })
}
