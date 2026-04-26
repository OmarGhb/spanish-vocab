import { createEmptyCard, fsrs, Rating, type Card } from 'ts-fsrs'

export type { Card }
export { Rating }

export function createInitialCard(): Card {
  return createEmptyCard()
}

// Computes the next FSRS card state for a given rating.
// Accepts the numeric rating (1=Again 2=Hard 3=Good 4=Easy) that matches
// the ts-fsrs Rating enum values at runtime.
export function scheduleCard(card: Card, rating: 1 | 2 | 3 | 4, now: Date): Card {
  const f = fsrs()
  const record = f.repeat(card, now)
  // Rating.Manual (0) is not a key in the repeat() result; we only accept 1–4.
  type GradableRating = Rating.Again | Rating.Hard | Rating.Good | Rating.Easy
  return record[rating as GradableRating].card
}
