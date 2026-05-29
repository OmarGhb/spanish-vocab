import { State } from 'ts-fsrs'

export const MEMORIZED_STABILITY_DAYS = 30
export const LEARNING_STABILITY_DAYS = 7

export type WordCard = {
  state: number
  due: string
  stability: number
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
