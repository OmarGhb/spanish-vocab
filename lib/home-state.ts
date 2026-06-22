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

export type HeroState = 'due' | 'caughtUp' | 'firstReview'
export type CollectionState = 'empty' | 'young' | 'established'

export type HomeStateInput = {
  wordCount: number
  dueCount: number
  hasReviewedBefore: boolean
}

export type HomeState = {
  hero: HeroState
  collection: CollectionState
}

export function resolveHomeState({
  wordCount,
  dueCount,
  hasReviewedBefore,
}: HomeStateInput): HomeState {
  // Hero: anything due → the active review hero; otherwise split caught-up (has reviewed) vs
  // before-first-review (never reviewed) so the never-reviewed account gets the invitation, not
  // the "tout est à jour" rest state.
  const hero: HeroState =
    dueCount > 0 ? 'due' : hasReviewedBefore ? 'caughtUp' : 'firstReview'

  // Collection: no words → empty; words but never reviewed → the young "tes premiers mots"
  // framing; otherwise the established "ta collection" preview.
  const collection: CollectionState =
    wordCount === 0 ? 'empty' : hasReviewedBefore ? 'established' : 'young'

  return { hero, collection }
}
