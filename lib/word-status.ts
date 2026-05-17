import { State } from 'ts-fsrs'

export const MEMORIZED_STABILITY_DAYS = 30
export const LEARNING_STABILITY_DAYS = 7

export type WordCard = {
  state: number
  due: string
  stability: number
}

export function getWordStatus(card: WordCard | null): { label: string; cls: string } {
  if (!card || card.state === State.New) {
    return { label: 'Nouveau', cls: 'bg-surface-alt text-muted' }
  }
  if (card.state === State.Relearning) {
    return { label: 'À rappeler', cls: 'bg-err/10 text-err' }
  }
  if (new Date(card.due) <= new Date()) {
    return { label: 'À réviser', cls: 'bg-accent/10 text-accent' }
  }
  if (card.stability >= MEMORIZED_STABILITY_DAYS) {
    return { label: 'Mémorisé', cls: 'bg-ok/10 text-ok' }
  }
  if (card.stability >= LEARNING_STABILITY_DAYS) {
    return { label: 'En cours', cls: 'bg-surface-alt text-muted' }
  }
  return { label: 'En apprentissage', cls: 'bg-surface-alt text-muted' }
}

export function isMemorized(card: WordCard | null): boolean {
  if (!card) return false
  return card.state !== State.Relearning && card.stability >= MEMORIZED_STABILITY_DAYS
}
