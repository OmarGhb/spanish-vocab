# Backlog

> Items here are not yet scheduled. Committed work lives in `docs/roadmap.md`.
> When a backlog item is promoted to a milestone, it moves out of this file.

## Word list improvements
- Pagination: show 10 newest by default, "Voir plus" button or infinite scroll. Important at 50+ words.
- Swipe-to-delete/archive: requires a swipeable-list approach + an `archived` flag in schema.
- Search/filter on word list. Matters at 200+ words.
- Smarter truncation of definition preview: truncate at sentence boundary or first clause, not arbitrary character count.

## Status indicators (bundles with M3 two-step confirm)
- Status tag on word entries: "Déjà ajouté" / "En cours d'apprentissage" / "Pas dans votre vocabulaire" — at top of definition card.
- "Récemment ajouté via mots similaires" tag for distinguishing bulk-added words from manual adds.

## Bulk add follow-ups
- Per-word definition preview: small (i) tooltip on each distractor showing a 1-line meaning before adding.
- Per-word failure UX: when partial-success happens (2 of 3 succeed), show which specific word failed.

## Review experience
- Skip rating for trusted suggestions: if user accepts the auto-rating 5+ times in a row, offer a "trust suggestions" toggle.
- Keyboard shortcuts: 1/2/3/4 for ratings, H for hint, Enter to confirm.
- Auto-suggest while typing on /add: dropdown of matching Spanish words after 2-3 chars.

## Onboarding
- First-time user flow: empty state on home + guidance to add their first word.
- Empty state for /review when no cards exist.
- Email verification on signup (currently disabled in Supabase).

## Mobile UX polish
- `select-none` on transient toast text to prevent accidental text-selection.
- Mobile review polish (deferred from milestone 4).

## Data hygiene
- Clean up the duplicate "regañar" entries (specific instance — separate from generic M3 duplicate handling).
- Ensure M3 backfill covers existing weak-example words: alguna, soler, amenecer.

## Gamification (defer aggressively)
- Session streak / XP counters.
- Game mode selection in Settings.

## i18n / future direction
- Support languages other than Spanish (the architecture is mostly language-agnostic but the Anthropic prompt is Spanish-specific).
