# Paco — Project State

> Snapshot of where the project stands. Update this when major milestones ship.
> Last updated: end of session that shipped v0.5.5 (M5.2b — Dictionnaire personnel). Prior: v0.5.4 (M5.2 — Top pill-tab nav), v0.5.3 (M5.1 — Discovery mode), v0.5.2 (M5.0c — Home + word-list editorial: `/words` list, editorial Home top with effort estimate, end-of-session recap, shared status/familiarity renderers, list-row redesign), v0.5.1 (M5.0b — add-flow loading polish), v0.5.0 (M5.0a — honest status taxonomy), v0.4.3 (M4.3 — Google Cloud TTS), v0.4.2, v0.4.1, v0.4.0.

## What Paco is

A Spanish vocabulary learning app for French speakers (A2-B1 level). User adds Spanish words; the app generates bilingual definitions, contextual examples, confusable distractors, and lemma metadata via Anthropic. Words enter an FSRS spaced-repetition schedule. Daily review sessions mix fill-in-blank and multiple-choice formats with auto-rated answers the user can override.

The product is mobile-first, French UI, designed for the user (Omar) to actually use daily — not a demo or portfolio piece.

## Current state

- **Live URL:** https://spanish-vocab-lyart.vercel.app (Vercel hobby tier, free)
- **Repo:** https://github.com/OmarGhb/spanish-vocab (name unchanged — only product naming/visual is "Paco")
- **Latest tag:** v0.5.5 (M5.2b — Dictionnaire personnel) — personal A–Z dictionary + 10-word sticky unlock (tag the milestone-close commit). Prior: v0.5.4 (M5.2 — Top pill-tab nav) @ 1a3153e
- **Recent migration:** `supabase/migrations/20260529000000_discovery_words.sql` (M5.1) — already applied to live Supabase
- **Real usage:** Omar uses it daily; deck at ~72 words and growing
- **Active dev environment:** Mac, `/Users/gahbicheomar/spanish-vocab`, VS Code + integrated terminal, SSH key auth to GitHub

## Tech stack

- **Frontend:** Next.js 16 (App Router) + React 19 + TypeScript strict + Tailwind 4
- **Database/Auth:** Supabase (Postgres + Auth + RLS-protected); region eu-west-3 or eu-central-1
- **AI:** Anthropic API (`claude-sonnet-4-6` for enrichment — generates definition + lemma + form_annotation + examples + distractors in a single call)
- **Spaced repetition:** ts-fsrs library
- **Spellcheck:** `dictionary-es` + `nspell` (~656k accent-preserving inflected forms, loaded server-side at module init), `fastest-levenshtein` for fuzzy matching
- **Audio:** Google Cloud TTS Neural2 (`es-ES-Neural2-F`, MP3 @ 0.9× rate), generated at enrichment time, cached in Supabase Storage (`word-audio` public bucket). Browser SpeechSynthesis retained as fallback for words with no `audio_urls`. `@google-cloud/text-to-speech` marked `serverExternalPackages` in next.config (Turbopack breaks the bundled gRPC client — see M4.3 notes).
- **Testing:** vitest (^4) — added in M5.0a; first test runner in the repo. Scoped to pure-logic modules (no Next.js / browser APIs). `npm test` = `vitest run`.
- **Deploy:** Vercel auto-deploy on push to main; v0.x.x git tags as version markers

## Schema (Supabase Postgres, all RLS-protected)

- `words` (id, user_id, word, definition JSONB `{es, fr, pos?, gender?}`, examples JSONB `[{es, fr}]` (default `'[]'`), distractors JSONB (default `'[]'`), lemma TEXT nullable, form_annotation TEXT nullable, **audio_urls JSONB nullable `{es_ES: url}`**, **origin TEXT NOT NULL DEFAULT 'manual'** (`'manual' | 'discovery'`), **discovery_status TEXT** (`'pending' | 'kept' | 'promoted' | 'known'`; CHECK `origin='discovery' OR discovery_status IS NULL`), **discovery_topic TEXT**, **discovery_claimed_at TIMESTAMPTZ**, created_at)
- Index `words_discovery_idx (user_id, discovery_topic, discovery_status) WHERE origin='discovery'`
- `review_cards` — FSRS state per word: due, stability, difficulty, elapsed_days, scheduled_days, reps, lapses, state, last_review, learning_steps. **`UNIQUE (word_id)`** (M5.1 duplicate-card backstop — note the PostgREST embed-cardinality consequence in SESSION_PROTOCOL)
- `review_logs` — full review history per card: rating, reviewed_at, scheduled_days, time_ms, hint_used
- `add_events` — instrumentation for the lemma flow (5 event types, see M3.3 notes)
- `profiles` (M5.2b) — **first per-user settings table**: `user_id` PK → `auth.users` (CASCADE), `dictionary_unlocked BOOLEAN NOT NULL DEFAULT false`, `created_at`. RLS own-row (select/insert/update). Holds the sticky dictionary-unlock flag.
- All FK use `ON DELETE CASCADE` so account deletion removes everything cleanly

## Architecture decisions worth remembering

### From M2-M3 (still relevant)

- **Spanish-first definitions** (M2.5): definition stored as `{es, fr, pos?}` JSONB. Spanish primary in UI. French behind a "Voir en français" reveal that counts as a hint in MCQ.
- **Two-step add flow** (M3.1): enrichment is reviewed before saving. `/api/words/enrich` checks the user's deck first; if word exists, returns stored data (no Anthropic call). `/api/words/save` actually inserts. `/api/words/reset-schedule` for due-now duplicates.
- **Wordlist-driven spellcheck over LLM** (M3.2): bundled Spanish dictionary loaded once at module init. No LLM in the spellcheck path.
- **Lemma normalization via Anthropic** (M3.3): the inverse of the M3.2 lesson. When the LLM call is already happening, layering on a separate dataset is overkill. Lemma + form_annotation come back as fields on the existing enrichment response.
- **Form annotation, not duplicate definitions** (M3.3): when a user types "comieron," Anthropic generates the definition for the lemma (*comer*), and a separate `form_annotation` field labels the conjugation (`"Comer — 3ª pers. plural, pretérito perfecto simple"`).
- **Schema cache reload in migrations** (M3.3): every migration that adds a column ends with `NOTIFY pgrst, 'reload schema';` to prevent PGRST204 errors after migrating. Was critical for M4.3's `audio_urls` column.
- **Save-route error logging** (M3.3): API routes `console.error` underlying Supabase errors instead of swallowing them under generic 500s.
- **Server-only admin client** (`lib/supabase/admin.ts`): hard `import 'server-only'` guard. Used only by account deletion. Backfill scripts create their own service-role client inline.
- **AbortController plumbing**: navigation away during enrichment cancels the request all the way through to Anthropic SDK.
- **Fire-and-forget event logging** (M3.3 phase B): the five lemma events log via `void fetch().catch(console.error)` — no await, no UI feedback.
- **Bulk distractor add** (M2.4): per-word parallel Anthropic calls via `Promise.all`. Background processing. Toast feedback.

### From M4 (v0.4.0)

- **`/words/[id]` detail view**: server component for shell + data fetch with RLS-protected `maybeSingle()` + `notFound()` on null (no existence leak). Client component (`WordDetailContent`) for interactive bits.
- **`AudioButton`**: `useSyncExternalStore` for SSR-safe support detection. Two-tier voice fallback. `speechSynthesis.cancel()` before every `speak()` for iOS Safari. Rate 0.9. **Superseded in M4.3 by cloud TTS; this is now the fallback-only branch.**
- **Status pill mapping** (M4 original — superseded by M5.0a's `lib/word-status.ts`): state-based mapping with the "Mémorisé too broad" flaw that M5.0a fixed.
- **Stats line** uses calendar-day delta via midnight normalization, not 24h delta.
- **M3.3 placeholder rewire**: `lemma_word_id` threaded through to the "Ouvrir «lemma»" button → `/words/[id]`.

### From M4.1 (v0.4.1)

- **Definition backfill via fetch-all + filter-in-JS**, not PostgREST `.or()`. At 51 words, client-side filtering is trivial and unambiguous. **Lesson:** when a script-side filter needs a complex SQL WHERE involving JSON shape checks, fetch-and-filter client-side is more reliable than translating to PostgREST `.or()`.
- **The pre-M2.5 weak data shape** was `{"es": "", "fr": {"es": "<actual Spanish text>"}}` — a nested object instead of a flat bilingual string. All 47 broken rows shared this. Repaired via full re-enrichment.
- **Script env-var loading**: standalone tsx scripts don't auto-load `.env.local`. Prefer `import { loadEnvConfig } from '@next/env'; loadEnvConfig(process.cwd())` at script top.
- **Shared enrichment logic** already in `lib/anthropic.ts` (`getWordData`).
- **DÉFINITION hide-when-empty guard** in `WordDetailContent.tsx`: `{(defEs || defFr) && (...)}`.
- **Styled 404 page**: `app/not-found.tsx`, sad Paco PNG at `/paco-sad.png`.

### From M4.2 (v0.4.2)

- **`<StickyActions>` shared primitive**: `position: fixed` at `bottom-16` (above NavBar), `z-[39]`, cream backdrop, iOS safe-area via `paddingBottom: calc(1rem + env(safe-area-inset-bottom))`. Consumers add `pb-36`. **(Superseded by M5.2: `bottom-0` / `z-30` / `pb-20` now there's no bottom NavBar — see From M5.2.)**
- **Pattern decision**: sticky bottom for long-scrolling primary-action surfaces; natural flow for short surfaces.
- **LoadingIdiom reorder**: Paco status card + copy FIRST, idiom card BELOW.

### From M4.3 (v0.4.3)

- **TTS pipeline**: `lib/tts.ts` (server-only). `es-ES-Neural2-F`, MP3, `speakingRate: 0.9`. Deterministic Storage filename, `upsert: true` (idempotent). Duplicate adds share one object.
- **Parallel TTS at enrich**: cache-miss path runs Anthropic + input-word TTS in one `Promise.all`; a second `Promise.all` batches lemma deck-check + lemma TTS. TTS failure non-fatal everywhere.
- **`serverExternalPackages` for Google Cloud SDKs (expensive lesson)**: Turbopack breaks the bundled gRPC client (`Error: undefined undefined: undefined`). Fix: top-level `serverExternalPackages` (NOT `experimental.serverComponentsExternalPackages`). **General rule: any `@google-cloud/*` SDK in a Next route → mark external first.**
- **Service-account JSON env transport**: `.env.local` needs single quotes (dotenv strips them); Vercel does NOT strip — paste bare JSON. Base64-encoding is the durable fix if it recurs.
- **IAM Editor trade-off**: `roles/texttospeech.user` doesn't reliably appear in the picker; granted broad Editor to `paco-tts`. Acceptable (server-only key, single-user project). Tighten via gcloud CLI — backlog.
- **AudioButton dual-branch**: `audioUrl` present → HTMLAudioElement; absent → SpeechSynthesis fallback.
- **Backfill**: `scripts/backfill-audio.ts`, concurrency 3, idempotent. 51 words backfilled.

### From M5.0a (v0.5.0)

- **Canonical status primitive** (`lib/word-status.ts`): pure derivation module, no I/O, no Next.js, no Supabase, no `server-only` (safe for Server and future Client consumers). Single source of truth — the old inline `statusPill` in `/words/[id]` is removed.
- **Two-derivation model** (load-bearing): `getWordStatus(card|null)` is action-priority — a due-now card reads "À réviser" even at high stability. `isMemorized(card|null)` is stability-based and ignores transient due-ness — a stability≥30 card that is currently due is still "memorized" for counting/filtering. M5.0c counts/filters consume `isMemorized`, not the pill label. A regression test locks this divergence.
- **6-state stability partition**, first-match precedence (every card resolves to exactly one): (1) no card OR `State.New` → "Nouveau"; (2) `State.Relearning` → "À rappeler"; (3) `due <= now` (instantaneous timestamp) → "À réviser"; (4) `stability >= 30` → "Mémorisé"; (5) `stability >= 7` → "En cours"; (6) else → "En apprentissage".
- **Nouveau-before-due** is deliberate: new cards are due immediately and would otherwise read "À réviser".
- **Tone discipline**: only `stability >= 30` (Mémorisé) gets the sage/success token. Nouveau / En cours / En apprentissage are neutral. Chip color carries only act / done / not-done. No gamified progress bar.
- **State.Learning has no special branch** — falls through to the stability bands. A test locks the fall-through.
- **`isMemorized` excludes `State.Relearning`** regardless of stored stability.
- Constants: `MEMORIZED_STABILITY_DAYS = 30`, `LEARNING_STABILITY_DAYS = 7`.
- `stability` added to the `/words/[id]` Supabase select + `CardRow` type (no schema change).

### From M5.0b (v0.5.1)

- **¡Listo! is a hold, not auto-advance.** The post-enrichment ¡Listo! screen reuses the pre-existing ready-phase hold (handleReveal tap → revealed) — zero new state-machine surface. Driven by the "no auto-flip" watch-item.
- **Existing-word routing keys on `data.status` directly**, NOT the derived DeckStatus. The existing-word guard early-returns to `revealed` before any `ready` is set, so ¡Listo! is unreachable for a deck hit BY CONSTRUCTION. Replaced a buggy `else → {tag:'new'}` fallback that misclassified deck hits when `data.dueDate` was absent.
- **dueDate hygiene.** `const dueDate = data.dueDate ?? new Date().toISOString()`. No non-null assertion on dueDate (a `!` would surface "prochaine révision dans NaN jour(s)").
- **The orphan misdiagnosis (institutional lesson — keep this).** The proposed root cause for the dueDate-absent flash — "a save-route double-failure orphans a `words` row with no `review_cards` row" — was plausible, code-cited, survived several review rounds, and was FALSE. The diagnostic `SELECT ... LEFT JOIN review_cards ... WHERE rc.id IS NULL` returned zero rows. The apparatus built on the phantom was ripped. The real protection is routing-on-`data.status`. Lesson: a confident, code-cited root cause is still a hypothesis until a diagnostic confirms it.
- **Loading-shell delay gate.** The entire loading branch is gated behind `LOADING_SHELL_DELAY_MS = 400` (renders null until the gate fires). Fast deck-only lookups resolve before the gate, so the loader never paints. Phase offsets `[1100, 1700, 2100]` relative to shell appearance; timer clears on unmount and on `status` leaving 'loading'.
- **PhaseChecklist.** Phase 4 (Phonétique) holds and never auto-completes; the loading → ready/revealed flip IS the data-wins transition. Label is **"Exemples"**, NOT "Trois exemples" (enrich schema is `examples: z.array().min(2).max(3)`).
- **¡Listo! preview card is `bg-card` (light), NOT `bg-surface-alt`.** Separation via subtle border + soft shadow; outer card low-weight (flattened nesting).
- **Ink CTA pilot.** The ¡Listo! "Voir la fiche" button is `bg-ink text-page` (existing tokens). Scoped as a pilot; system-wide dark-button propagation is a separate, deferred decision.
- **Extension-hydration.** `suppressHydrationWarning` on both `<html>` and `<body>` (Grammarly + Scribe land on different elements).

### From M5.0c (v0.5.2)

- **word-status.ts extended**: `getFamiliarity(card) → 0|1|2|3` (New → 0; stability ≥30 → 3, ≥7 → 2, else → 1; no state special-casing beyond New) and `isDue(card)` (instantaneous `due ≤ now` — NOT the calendar-day normalization the stats line uses). 15 new tests incl. the divergence lock: a due, stability-≥30 card is `getWordStatus` "À réviser" AND `getFamiliarity` 3 at once.
- **Shared renderers extracted** to `app/(app)/`: `StatusPill` (the SOLE `getWordStatus` renderer — `/words/[id]`, the list, and the Home preview all consume it; finally resolves the M5.0a→M5.0c list/detail inconsistency), `FamiliarityMeter`, `WordRow`. Pill = `getWordStatus`; dots = `getFamiliarity` — independent, may diverge.
- **`/words` list route.** Entry point: tapping the Home "TA COLLECTION" block (superseded by M5.2 — `/words` is now also a first-class "Mes mots" pill; the block stays as a redundant entry). Filters Tous / À revoir (`isDue`) / Mémorisés (`isMemorized`). Sorts Alphabétique (`localeCompare 'es'`), Date (desc, default), Familiarité (least familiar first: `getFamiliarity` asc, stability asc within a level).
- **Home editorial top.** State A: amber review CTA — "N mots à revoir", "≈ X min" + (i) infotip, "Commencer la révision". Effort estimate = median of the most recent 200 `review_logs.time_ms` (>0); flat 12000 ms/card fallback under 20 logs; `minutes = max(1, round(dueCount × perCardMs / 60000))`. State B: "Tout est à jour", no CTA/estimate. Removed the hand-rolled `statusLabel(reps, due)` and the pinned bottom action bar. Last-10 preview kept below the collection line.
- **Collection line spec**: "TA COLLECTION" eyebrow (Lora 700 / 10px / 0.16em / uppercase) + "N mots enregistrés" value (Lora 400 / 14px) on one row, separated from content above by a 1px hairline. Designer hexes mapped to existing tokens — no raw hex. The bare "→" see-all cue was intentionally dropped (felt crowded); the whole collection block is the tap target to `/words`.
- **End-of-session recap**: in-memory outcomes accumulated during the session (NOT re-queried from `review_logs`). Per-word ✓ (sage) / ✗ (terracotta) — a bounded correct/incorrect signal, NOT the status-pill taxonomy (the sage-only-for-Mémorisé rule does not reach here). Stats Révisés / Réussite (NaN-guarded) / Temps ("< 1 min" under 60 s). Conditional "Encore N mots à revoir" via a browser-client count (`review_cards` due ≤ now) taken after the final reschedule; hidden at 0. Session deck is fixed (single due≤now query, limit 20, index-only advance — no intra-session re-show), so append-per-rate yields no duplicate rows — confirmed and smoke-tested with an Again rating.
- **List-row redesign** (post-tag polish, folded into v0.5.2): `FamiliarityMeter` → left, vertical 3-dot column, filled bottom-up (ink filled / line empty). Word Lora 18px/700; definition italic, one line. Rows bordered (no shadow); due rows (`isDue`) get a tint background + accent border. A "N révision(s)" line under the pill (`reps`; singular 0–1, plural 2+). **`reps` is DISPLAY-ONLY metadata — it does not feed status** (status stays `getWordStatus`/stability; the révision count and the pill can diverge by design).
- **CTA-weight convention**: primary CTA buttons use bold text ("Commencer la révision", "Encore N mots à revoir").

### From M5.1 (v0.5.3)

- **Reuse `words` + flag (Model A).** Discovery words persist in `words`; a flag filters them out of every full-word consumer. Canonical filter: `origin='manual' OR discovery_status='promoted'`. Applied to: `/words` list, Home count + last-10 preview, `/words/[id]` (guard → `notFound()` for non-promoted), both `/api/words/enrich` duplicate checks (deck + lemma-collision), both backfill scripts. `/review` + Home dueCount read `review_cards` directly → safe by construction.
- **Lightweight generation, not full.** `getDiscoveryBatch(topic, exclude, signal)` → one Anthropic call returning compact `{word, fr, pos, gender, example:{es,fr}}`, zod-validated. `/api/discovery/generate`: resume-before-API (return existing `pending` rows, no call) → else generate, dedup against ALL seen words (any status), persist as `pending`. Empty-deck safe; × aborts through to the SDK.
- **`gender` is explicit.** `gender:'m'|'f'|null` stored inside `definition` JSONB → drives the el/la display article + the NOM·MASCULIN/FÉMININ eyebrow. The **bare** word is stored (`"mercado"`, not `"el mercado"`) so dedup matches manual adds; the article is display-only. (Flipped the original "derive from `pos`" plan — `pos` is too inconsistent to teach el/la from, and a wrong article is real miseducation.)
- **Enrich-on-keep, deferred + concurrency-safe.** `/api/discovery/decide` flips `pending`→`kept`/`known` per swipe (fire-and-forget; a failed decide leaves it `pending` → self-heals on resume). `/api/discovery/enrich` (fired on bilan-mount + grid-mount): per-chunk **atomic claim** via `discovery_claimed_at` (2-min stale recovery), reuses `getWordData` + `getAudioForWord` + `createInitialCard`, flips `kept`→`promoted` **only on success** (a half-enriched word never shows broken in `/words`); `UNIQUE(review_cards.word_id)` backstops duplicate cards; TTS failure non-fatal.
- **Reusable `SwipeCard` primitive** (`app/(app)/SwipeCard.tsx`): pointer + touch, drag threshold, tilt, stamp-opacity; buttons trigger the same outcome as swipes. Also unblocks the backlog swipe-to-delete/archive.
- **`DiscoverClient` phase machine** (grid → generating → deck → bilan / exhausted) rendered as a focused overlay; × exits and preserves `pending` rows for resume. (M5.2: overlay is `z-[60]`, above the new top nav `z-30`.)
- **Design:** discovery card is a portrait card filling the focused column (eyebrow top-left, word + gloss centered, example pinned to bottom; mid-swipe stamps sage "À APPRENDRE" right / terracotta "JE CONNAIS" left; bottom buttons amber "À apprendre" + terracotta-outline "Je connais"). Bilan: "Réviser maintenant" (primary) + "Retour à l'accueil" + tertiary "Découvrir un autre thème"; enrichment caption only when ≥1 word kept. Découvrir grid: portrait-ish tiles, rounded-square icon badge, "N MOTS" uppercase, Paco mascot beside the flush-left title.

### From M5.2 (v0.5.4)

- Top sticky pill-tab nav (`app/(app)/TopNav.tsx`) replaces the deleted bottom NavBar. `sticky top-0`, inside the `max-w-[430px]` column so nav + content share edges by construction. z below toast (40) and discover overlay (60).
- Layout: `(app)/layout.tsx` is `flex-col`, TopNav first + `flex-1` children (six wrappers switched `min-h-screen` → `flex-1`).
- Corner buttons vs pills: home circle + account avatar never show active state; the 5 pills carry it. Accueil is a pill AND the circle (both → `/`) so a tab is always selected — signals the row is nav.
- Active match: `path === href || path.startsWith(href + '/')` — exact for leaves, section-active for `/words/[id]`, safe for Accueil (`'//'` never false-matches; no bare `startsWith('/')`).
- StickyActions ripple: `bottom-16` → `bottom-0`; `z-[39]` → `z-30`; `/add` `pb-36` → `pb-20` (drop 64px NavBar height, keep bar clearance); toast `bottom-36` → `bottom-24`.
- Top-only nav (decision): no second bottom bar — two navs for the same destinations is an anti-pattern, and the bottom thumb-zone is reserved for in-task review actions. Don't relitigate.
- Pill styling: Lora serif bold labels (deliberate brand-chrome departure from Inter-for-UI); inactive = card fill + subtle accent-tinted border with the icon in that same tone; active = amber fill + white. No divider under the nav (tried, removed).

### From M5.2b (v0.5.5)

- **Personal dictionary** (`/dictionary`): an A–Z reference of the user's **memorized words only** — `isMemorized(card)`, the strict memorized SUBSET of `/words` (reuses the exact `origin.eq.manual,discovery_status.eq.promoted` filter, so no word is in one but not the other). Deliberately bare vs `/words`: NO status pills, familiarity meter, due-tint, reps, filters, or sorts — just word + gloss + audio. Content is LIVE (words enter/leave as mastery shifts). **Spanish-first override:** the spec asked for a French gloss; kept the inline gloss Spanish (`definition.es`) per the standing Spanish-first rule (French stays a fiche/reveal).
- **A–Z bucketing** (`lib/dictionary.ts`, pure + unit-tested): Ñ is its own bucket AFTER N (checked before accent-folding, else NFD would fold it into N); accented initials fold to base letter for BUCKETING ONLY (display keeps accents); non-letter → `'#'`. iOS-contacts jump rail (right edge) with tap + pointer-drag scrubbing that snaps to the nearest present letter; empty letters greyed/disabled.
- **`profiles` table — sticky unlock.** `DICTIONARY_UNLOCK_THRESHOLD = 10` memorized words. ACCESS is governed SOLELY by `dictionary_unlocked` — once true it **never resets**, even if the memorized count later drops below 10 (locked↔unlocked is driven by the flag, not the live count).
- **Unlock flip is a Server Action** (`app/(app)/dictionary/actions.ts` `syncDictionaryUnlock`), triggered from a mounted `<UnlockSync/>` on Home + `/dictionary` — **NOT an RSC-render side effect**, so a route prefetch can't flip the flag. `getDictionaryState` (`lib/dictionary.ts`) is **read-only**. On the false→true transition the action `redirect`s to the one-time interstitial (`/dictionary/unlocked`).
- **Dictionary IS a pill destination** (6th pill, last): unlocked = normal pill → `/dictionary`; locked = dashed border + lock glyph → `/dictionary` (which renders the locked screen). The locked pill never shows active styling. **Supersedes the M5.2b roadmap open question ("its entry point — not one of the five pills").** Layout does a cheap single-row flag read for the pill state.
- **Accepted v1 limits** (single-user, harmless): (1) the interstitial re-shows on a direct visit / browser-back — the page renders whenever the flag is set; `router.replace` on the CTA mitigates the normal-flow back; (2) a double-show race if two loads cross the threshold simultaneously. Revisit with an `unlock_celebrated` column only if it ever matters.
- **Dependency-free confetti** (`Confetti.tsx` + `confetti-fall` keyframe in globals.css): deterministic (SSR-safe, no `Math.random`), reduced-motion-aware. No new dep.

### Review focus-mode (review rework, slice 1)

- **`FocusModeContext`** (`app/(app)/FocusMode.tsx`): a `FocusModeProvider` wraps `TopNav` + children in `(app)/layout.tsx`; `TopNav` returns `null` when `focus` is set. An active `/review` session flips `setFocus(!done)` so the app nav is suppressed **only while answering** (recap + 0-due empty-state keep the nav). Chosen over a route group (auth-layout duplication) and over a discovery-style `fixed inset-0` overlay (an overlay blocks the soft keyboard from scrolling the answer field into view). The active session adds `paddingTop: max(1.25rem, env(safe-area-inset-top))` since the nav no longer supplies the notch inset.
- **Answer-field keyboard visibility** (`FillInBlank.tsx`): autofocus on mount (no programmatic keyboard-open — iOS needs the gesture) + `scrollIntoView({block:'center'})` on `onFocus` and on `visualViewport` `resize`, so when the keyboard opens the question + field stay visible without a manual scroll.

### Review result card + write-in mechanic (slice 2)

- **Answering state** (`AnswerBlank.tsx`): the answer is typed **inline into the blank** in the sentence. Mechanic = a real `<input>` overlaid transparently on a visible inline blank (`color`/`caret-color` transparent) — it captures keystrokes + raises the native keyboard **on tap** (still gesture-gated; no auto-open), while the span renders the typed value + a faux `caretBlink` caret. Self-contained so it can be reverted/iterated alone if iOS fights it. No active-field chrome (so the blinking caret reads as "tap to type", not keyboard-up). **Accents not handled** here (plain input) — near-miss grading cushions a missing accent; real fix is the custom-keyboard milestone.
- **Result card** (`FillInBlank.tsx`, three verdicts ¡Eso es! / ¡Casi! / ¡Uy!): Paco + exclamation (¡Listo! type convention at 38px; success/`warm`/danger) + per-verdict body (filled sentence / diff line / correct word + your answer) with letter-level highlighting from **`lib/worddiff.ts`** (`wordDiff` backtrace). Verdict = the **existing grading** via `classifyBlankAnswer` extracted from `lib/rating.ts` (shared by `computeRating` — no grading change). Quiet `fadeUp` cascade, reduced-motion-gated.
- **Kept FSRS / dropped design framing**: rating stays the 4 `RatingButtons` labels + suggestion ring (NOT the design's `1j/3j/7j/21j` interval chips). Hint slot built but filled with the card's example sentence ("Exemple"), not a generated conjugation hint (deferred to M5.3).
- **Rating button restyle** (slice-2 polish): dropped the amber per-button gradation (`bg-again/hard/good/easy`) for **uniform pills** — one consistent treatment across all verdicts: the suggested rating is a solid `accent` pill, the rest are `border-line` outline. **Enter advances with the suggestion** (window keydown in `RatingButtons`, mounted only on the result screen — the answering form is unmounted by then). Styling/affordance only; suggestion logic + `hintUsed` penalty unchanged.
- **Shared `ResultReveal`** (`app/(app)/review/ResultReveal.tsx`): the Paco + ¡Eso es!/¡Casi!/¡Uy! reveal extracted so **MultipleChoice now uses the same treatment** as FillInBlank (replaced its old "¡Correcto! Sigue así" light-green card — it read disconnected). MCQ is binary → correct/wrong only (no ¡Casi!); the correct option stays `ok`-tinted in the list. FillInBlank refactored onto the shared component (no visual change) so the two can't drift.
- **`--color-warm` (#E8A24A)** added to `globals.css` `@theme` for the close/¡Casi! accent (no inline hex). Header label + progress bar flip to `ok` on a correct écriture answer (`ReviewSession` tracks the verdict via `FillInBlank`'s `onResult`).

## Lemma flow UX (M3.3)

When a user submits a Spanish word and Anthropic returns `lemma != input`, the /add page transitions to a `lemma_suggestion` phase before revealing the card:

- Heading: "Forme conjuguée"; subheading `"« <input> » est une forme de <lemma>"`; form annotation as centered subtitle.
- **`+ Ajouter «<lemma>»`** (primary burgundy CTA) — saves the lemma, skips the inflected form.
- **`Garder «<input>»`** (subtle text link) — proceeds to the inflected form's card, which has a FORME section above DÉFINITION.
- If the lemma is already in the deck, the primary CTA is disabled and an **`Ouvrir «<lemma>»`** button routes to `/words/[id]`.

Definitions for inflected forms = definitions of the lemma. Examples and distractors are form-matched. As of M4.3, both input and lemma receive their own TTS audio at enrich time.

## Branding (as of v0.3.3)

- App name: **Paco**; tagline: **APRENDE · RECUERDA · HABLA**
- Visual identity: illustrated Podenco Ibicenco named Paco. Appears throughout the UI (the nav brand lockup, empty states, review completion, discover page, /add helper text, loading screen). **(v0.5.4: the old large home-body hero was removed; the wordmark + tagline now live in the top-nav brand lockup.)**
- Favicon: real Paco illustration; Apple touch icon: rounded-square Paco; 404: sad Paco at `/paco-sad.png`
- Voice: informal "tu" across all touchpoints
- Celebration copy: French chrome + Spanish celebration phrases (¡Correcto!, ¡Casi!, ¡Buen trabajo!, ¡Inténtalo otra vez!)
- Vercel URL still spanish-vocab-lyart.vercel.app; GitHub repo still spanish-vocab; custom domain deferred

## Persistent design system (Chaleureuse + Paco palette)

- Hex palette: background cream `#F5EDDA`; card surface `#FFFBF3`; ink (dark brown text) `#3D2B1A`; accent (amber) `#C27A2C`; success (sage) `#4A7C6F`; danger (terracotta) `#B84C2A`
- OKLCH tokens in `app/globals.css`; radius 14px; warm brown RGBA shadow
- Lora serif for headlines and word names; Inter for UI (exception: the top-nav pill labels use Lora bold as deliberate brand chrome)
- Rating buttons: amber single-hue gradation (darkest = Again, lightest = Easy)
- Status pills mapped to FSRS state via `lib/word-status.ts` (v0.5.0) with accent/sage/neutral palette
- Mobile-first 430px max-width centered layout; top sticky pill-tab nav (v0.5.4); bottom freed for in-task actions
- `<StickyActions>` primitive (v0.4.2, repositioned to `bottom-0` in v0.5.4) for surfaces with long-scrolling primary actions
- Shared row renderers (v0.5.2): `StatusPill` (canonical `getWordStatus` pill), `FamiliarityMeter` (3-dot stability strength), `WordRow`. Primary CTAs use bold text.
- iOS Safari zoom locked (16px input minimum, viewport scale locked); safe-area handled top (nav) + bottom (StickyActions)

## Current pain points

- **Fill-in-blank verb conjugation mismatch.** The expected answer is the lemma ("estudiar"), but example sentences typically require conjugated forms ("estudiamos"). Fix committed to **M5.3** (deterministic conjugator, POS-gated to verbs); the M5.0d `nspell` interim was considered and **dropped** to avoid throwaway code. Daily workaround: type the dictionary form.
- Definitions still feel inconsistent across words (Anthropic non-determinism). The pre-M2.5 weak data was fully resolved in M4.1.
- Word list **pagination + free-text search** still deferred (M5.0c shipped the list, filter pills, and sorts — pagination/search not).
- No way to delete or archive a word once added. **Unblocked by the M5.1 swipe primitive — revisit.**
- No first-time onboarding for new users.
- `.next/types/validator.ts` TypeScript error — likely benign build cache artifact; verify against a pre-M3.3 commit before fully trusting.
- Adjective annotations include POS prefix (`"Alguno — adj. indefinido, femenino plural"`) while verb annotations don't. Keeping the extra pedagogical context for now.
- Rating buttons in /review flow with content instead of using `<StickyActions>` — small follow-up. Bundle with the ④ near-miss/typo display whenever /review is next opened.
- `paco-tts` GCP service account has project-level Editor (workaround for the unfindable `roles/texttospeech.user`). Tighten via gcloud CLI — backlog, low urgency.
- **PhaseChecklist active-indicator animation not firing** (from M5.0b). `motion-safe:animate-pulse` + staggered "···" specced but not rendering. Non-blocking; static indicator still conveys state. Logged to backlog.
- **Duplicate-word entries** (e.g. "a menudo" ×2) are now more visible in the cleaner M5.0c list. Existing data-hygiene backlog item, not introduced by the redesign.
