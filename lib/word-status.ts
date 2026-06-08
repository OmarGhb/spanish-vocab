import { State } from 'ts-fsrs'

export const MEMORIZED_STABILITY_DAYS = 30
export const LEARNING_STABILITY_DAYS = 7
// Mid-point of the 7–30 "En cours" band — the gauge's 2/4↔3/4 line, so all four
// dots fill smoothly between New and Mémorisé. Gauge-presentation only (see
// getMasteryGauge); it does NOT subdivide the status bands or the partition.
export const GAUGE_MID_STABILITY_DAYS = 15

export type WordCard = {
  state: number
  due: string
  stability: number
}

// PostgREST returns a to-one embedded relationship as a single object and a to-many
// one as an array. Adding UNIQUE(review_cards.word_id) in M5.1 flipped words→review_cards
// from to-many to to-one, so embed reads must accept BOTH shapes. Normalizes to one row.
// See SESSION_PROTOCOL.md — "UNIQUE on an FK column flips embed cardinality".
export function oneEmbed<T>(embed: T | T[] | null | undefined): T | null {
  if (Array.isArray(embed)) return embed[0] ?? null
  return embed ?? null
}

// One mapping, three presentations so they can't drift:
//   cls  = chip classes (background + text) — the detail-page pill
//   text = text-only colour — the plain-text status on list rows
//   dot  = background colour — the filled familiarity dots, matching the status
export function getWordStatus(
  card: WordCard | null,
): { label: string; cls: string; text: string; dot: string } {
  if (!card || card.state === State.New) {
    return { label: 'Nouveau', cls: 'bg-surface-alt text-muted', text: 'text-muted', dot: 'bg-muted' }
  }
  if (card.state === State.Relearning) {
    return { label: 'À rappeler', cls: 'bg-err/10 text-err', text: 'text-err', dot: 'bg-err' }
  }
  if (new Date(card.due) <= new Date()) {
    return { label: 'À réviser', cls: 'bg-accent/10 text-accent', text: 'text-accent', dot: 'bg-accent' }
  }
  if (card.stability >= MEMORIZED_STABILITY_DAYS) {
    return { label: 'Mémorisé', cls: 'bg-ok/10 text-ok', text: 'text-ok', dot: 'bg-ok' }
  }
  if (card.stability >= LEARNING_STABILITY_DAYS) {
    return { label: 'En cours', cls: 'bg-surface-alt text-muted', text: 'text-muted', dot: 'bg-muted' }
  }
  return { label: 'En apprentissage', cls: 'bg-surface-alt text-muted', text: 'text-muted', dot: 'bg-muted' }
}

export function isMemorized(card: WordCard | null): boolean {
  if (!card) return false
  return card.state !== State.Relearning && card.stability >= MEMORIZED_STABILITY_DAYS
}

// Familiarity is a coarse 0–3 strength signal driven purely by stability bands.
// Unlike getWordStatus it does NOT special-case due or Relearning — Learning and
// Relearning fall through to the stability bands (same fall-through philosophy).
export function getFamiliarity(card: WordCard | null): 0 | 1 | 2 | 3 {
  if (!card || card.state === State.New) return 0
  if (card.stability >= MEMORIZED_STABILITY_DAYS) return 3
  if (card.stability >= LEARNING_STABILITY_DAYS) return 2
  return 1
}

// Instantaneous due check — uses the raw timestamp, NOT the calendar-day
// normalization the detail-page stats line applies.
export function isDue(card: WordCard | null): boolean {
  if (!card) return false
  return new Date(card.due) <= new Date()
}

// PRESENTATION-ONLY projection (board §06 "Mots" cluster): the 4-dot mastery gauge.
// A pure function of stability, rendered as fifths 0→4 so all four dots fill smoothly
// as a word matures. Like getFamiliarity, due-ness and Relearning don't affect it
// (stability-only). Does NOT touch the partition or the status bands — it only adds a
// finer 15-day display split inside the existing 7–30 "En cours" band.
//   New / no card               → 0
//   0 < stability < 7           → 1
//   7 ≤ stability < 15          → 2
//   15 ≤ stability < 30         → 3
//   stability ≥ 30              → 4   (Mémorisé)
export function getMasteryGauge(card: WordCard | null): 0 | 1 | 2 | 3 | 4 {
  if (!card || card.state === State.New) return 0
  if (card.stability >= MEMORIZED_STABILITY_DAYS) return 4
  if (card.stability >= GAUGE_MID_STABILITY_DAYS) return 3
  if (card.stability >= LEARNING_STABILITY_DAYS) return 2
  return 1
}
