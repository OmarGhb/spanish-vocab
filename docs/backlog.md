# Paco — Backlog

> Mirrors `docs/backlog.md` in the repo. Items here are not yet scheduled.
> Committed work lives in `PACO_ROADMAP.md`. When a backlog item is promoted to a milestone, it moves out of this file.

## Word list improvements
- Pagination: show 10 newest by default, "Voir plus" button or infinite scroll. Important at 50+ words — now pressing at 51.
- Swipe-to-delete/archive: requires a swipeable-list approach + an `archived` flag in schema.
- Search/filter on word list. Matters at 200+ words.
- Smarter truncation of definition preview: truncate at sentence boundary or first clause, not arbitrary character count.

## Status indicators (bundles with M3 follow-up work)
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
- Rating button scan-speed check: amber single-hue gradation was introduced in v0.3.3 (replacing Anki-convention RGB). Worth a deliberate check after a few weeks of daily use — if review pace slows because the buttons are harder to distinguish at a glance, consider reverting to RGB or adding secondary visual cues (icons, position).

## Data hygiene
- Clean up the duplicate "regañar" entries (specific instance — separate from generic M3 duplicate handling).
- Backfill weak-example words from before M2.5 (soler, amanecer, others) — re-enrich to get richer definitions and examples.

## Lemma flow polish (from M3.3 testing)
- Adjective annotations include POS prefix (`"Alguno — adj. indefinido, femenino plural"`) while verb annotations don't (`"Comer — 3ª pers. plural, pretérito perfecto simple"`). Anthropic's creative interpretation of "grammar info." Could tighten the prompt for strict consistency; currently keeping for the extra pedagogical context on adjectives.
- Lemma interstitial still has vertical empty space below the form_annotation. Annotation filled the most egregious empty middle but layout isn't perfectly balanced. Minor polish.
- Once instrumentation data (from `add_events`) shows clear patterns: revisit whether to swap Option A (Anthropic-supplied lemma) for Option B (bundled inflection→lemma dataset). Trigger: if `lemma_suggestion_accepted` rate climbs above ~10-15% of inflected adds, the wasted-enrichment cost of A starts justifying B.

## Gamification (defer aggressively)
- Session streak / XP counters.
- Game mode selection in Settings (becomes meaningful only after multiple game modes exist).
- Verb conjugation exercise mode — drill specific conjugations (tense + person) of a verb the user knows. (Also listed as an M5.2 candidate in roadmap.)

## i18n / future direction
- Support languages other than Spanish (the architecture is mostly language-agnostic but the Anthropic prompt is Spanish-specific).

## Branding follow-up (deferred)
- Custom domain (~$12/year — buy when there's a real reason to share broadly)
- Vercel URL rename (currently spanish-vocab-lyart.vercel.app — could become paco.vercel.app or similar)
- GitHub repo rename (currently spanish-vocab → paco)

## Known bugs (shipped, deferred)

- **Accent-tolerant autocomplete prefix matching is broken** (M3.2 spec).
  Reproduced: typing `bebí` (acute) and `bebì` (grave) both produce the same dropdown of unaccented forms only (`bebi, bebia, bebio, bebian, bebias`). Expected: dropdown should surface `bebí, bebía, bebías, bebíamos, bebían` — actual Spanish forms with accents preserved. Same bug reproduces on `comi`/`comí`. Investigate `prefixMatch` in `lib/wordlist.ts` — the accent normalization branch may not be wired up, OR the prefix comparison is happening before the WORDS array is normalized. Bonus: also handle grave-as-acute (typing `bebì` should still find `bebí`), since Spanish doesn't use grave accents.

- **`.next/types/validator.ts` TypeScript error** carried forward from M3.3 polish work.
  Error: `TS2307: Cannot find module '../../app/page.js' or its corresponding type declarations.` Claude Code dismissed across both M3.3 polish phases as a pre-existing build cache artifact. Want to verify against a pre-M3.3 commit before trusting the diagnosis. Quick check: `git stash`, `git checkout v0.3.2`, `npx tsc --noEmit 2>&1`, see if it appears; pop stash after. Likely benign but worth resolving cleanly when M4 touches the routing layer where it lives.

- **PhaseChecklist active-indicator animation not firing.** Active phase was
  specced with `motion-safe:animate-pulse` + staggered trailing "···" dots;
  neither renders in practice. Investigate whether Tailwind is emitting
  `animate-pulse` and whether the class lands on the element. Low priority —
  static indicator still conveys state. Means the reduced-motion accessibility
  contract is also untested in practice until this is sorted.

## Discovery follow-ups (M5.1)

- **Generation latency on the Génération screen** (multi-second wait). The delay is
  the live Anthropic call in `/api/discovery/generate` — inherent to generating a batch
  on demand, not a regression. Future fix: prefetch the next topic's batch (warm on grid
  idle / on press-in) and/or a short-lived server-side per-topic cache of generated
  batches, so the deck opens instantly on the common path. Keep the cache-before-API
  resume path; this is purely about cold-generation perceived speed.
