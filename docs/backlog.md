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
- Mobile review polish (deferred from earlier milestones — revisit after extended mobile use).

## Data hygiene
- Clean up the duplicate "regañar" entries (specific instance — separate from generic M3 duplicate handling).
- Ensure M3 backfill covers existing weak-example words: alguna, soler, amenecer.

## Gamification (defer aggressively)
- Session streak / XP counters.
- Game mode selection in Settings.
- Verb conjugation exercise mode — drill specific conjugations (tense + person) of a verb the user knows.

## i18n / future direction
- Support languages other than Spanish (the architecture is mostly language-agnostic but the Anthropic prompt is Spanish-specific).

## Identity & motivation (M5+ direction)

### My Dictionary view (M5 candidate)
The word list reframed as a personal, ever-growing dictionary. The user's pride and identity in the app — Pokédex-style collection psychology rather than progress-bar gamification.

Concrete changes:
- Home dashboard shows only last 10-15 added words (with "Voir tout" link)
- New `/dictionary` route: alphabetized contact-list-style view of all words
- Visual emphasis on count milestones (50, 100, 250, 500, 1000)
- Probably bundles with search/filter (already backlogged)
- Sort options: alphabetical, by date added, by familiarity (least known first)

### Dictionary unlock at 10 words (M5 candidate)
The dictionary view doesn't exist as a tab until the user has 10 words. Hitting 10 triggers a brief celebration moment, then the new tab appears in the NavBar. Frames the first 10 words as a quest, not a slog.

### Vocabulary milestone celebrations (M5+ ongoing)
Brief, tasteful celebrations at: 10, 50, 100, 250, 500, 1000 words. Each ties the count to a real Spanish-acquisition threshold (basic conversation, comprehension, fluency, working vocabulary). Format TBD — could be a brief modal, a unique idiom card during the next loading state, or a special home-screen banner that fades after a session.

### Companion character (M6 or later)
A non-pushy, opt-in character offering personalized, AI-generated commentary on the user's progress when invoked — never proactively, never nagging.

Visual identity: a Spanish/Latin American dog breed. Lean candidate: Podenco Ibicenco — sleek, intelligent, distinctly Spanish. Could also be Galgo Español, Xoloitzcuintli, Perro Sin Pelo del Perú, or an imaginary breed.

Appears occasionally in passive UI moments (top corner, after a session ends, etc.) — never as a notification. Tap opens a dialogue surface where the character comments on the user's recent progress, suggests adjacent words, or explains confusing patterns.

Examples of what it could surface:
- "You've been adding a lot of food words — want me to suggest more in that domain?"
- "Your most-confused word is 'echar' — let me explain it more carefully"
- "You're at 247 words, past the everyday-conversation threshold"

### Homograph awareness on word cards
When adding a word, detect if it has a known homograph (accent-distinguished or otherwise visually similar). On the review screen, show a small note: "Attention: papá (papa) ne pas confondre avec papa (pomme de terre)." Could also work in the word detail view (M4).
Implementation needs a curated list of common Spanish homograph pairs (~30-50 pairs would cover most A2-B1 confusables). Could be hand-curated or generated once via Sonnet and reviewed.
Belongs near M4 (word detail view) since that's where the user has time and attention to absorb a "watch out for this" note. Adding it to the M2.5 review screen would crowd it.

Notes:
- Strictly opt-in / pull-only, never push notifications
- Requires sufficient user data to be useful (~100+ words minimum)
- Cost-aware design: each check-in is a small Anthropic call
- Tone: Spanish-tutor quality, never motivational pap

- Add `suppressHydrationWarning` to `<body>` in `app/layout.tsx` to silence Grammarly extension hydration noise (cosmetic, not user-facing)
