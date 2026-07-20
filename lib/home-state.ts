// Home-state resolver (M5.5j) — the SINGLE source for "which hero state + which collection
// section" the Home route renders, extracted out of the page so the branching is pure and
// tested (never inlined). Presentation-only: it reads existing, already-fetched counts and
// maps them to display states. No FSRS/scheduling/gate logic lives here.
//
// Hero and collection resolve INDEPENDENTLY (decoupled by design): a brand-new account with
// due words renders the `due` hero AND the `young` collection — both honest. Don't collapse
// them into one axis.
//
//   hasReviewedBefore = (Σ review_cards.reps) > 0 — a monotonic "has this account ever
//   reviewed" signal, already computed as getDictionaryState().totalReviews. Distinguishes the
//   caught-up established account (Durmiendo) from the never-reviewed one (Animando) when both
//   sit at dueCount === 0.

export type HeroState = 'due' | 'caughtUp' | 'firstReview' | 'preparing'
export type CollectionState = 'empty' | 'young' | 'established' | 'preparing'

export type HomeStateInput = {
  wordCount: number
  dueCount: number
  hasReviewedBefore: boolean
  // Words decided-keep but not yet enriched/promoted (discovery_status = 'kept') — e.g. straight out
  // of onboarding, mid background enrichment. `wordCount` counts only promoted/manual, so without
  // this a fresh onboarding (all kept, 0 promoted) reads as an EMPTY collection. Default 0.
  preparingCount?: number
}

export type HomeState = {
  hero: HeroState
  collection: CollectionState
}

export function resolveHomeState({
  wordCount,
  dueCount,
  hasReviewedBefore,
  preparingCount = 0,
}: HomeStateInput): HomeState {
  const preparing = preparingCount > 0

  // Hero: anything due → the active review hero; else caught-up (has reviewed) vs — when words are
  // still being prepared — the "preparing" state, else the genuine before-first-review invitation.
  // `firstReview` therefore only renders at a genuinely empty account: 0 due, never reviewed, nothing
  // preparing (and promoted words are due-immediately, so wordCount>0 ⇒ due>0 ⇒ never firstReview).
  const hero: HeroState =
    dueCount > 0 ? 'due' : hasReviewedBefore ? 'caughtUp' : preparing ? 'preparing' : 'firstReview'

  // Collection: has real words → young/established; else words being prepared → 'preparing' (NOT the
  // failure-reading empty state); else genuinely empty.
  const collection: CollectionState =
    wordCount > 0 ? (hasReviewedBefore ? 'established' : 'young') : preparing ? 'preparing' : 'empty'

  return { hero, collection }
}
