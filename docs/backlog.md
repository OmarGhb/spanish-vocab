# Paco — Backlog

> The repo-canonical backlog (as of v0.6.1 — M5.3a). Items here are not yet scheduled.
> Committed work lives in `docs/roadmap.md`. When a backlog item is promoted to a milestone, it moves out of this file.

## On-device testing feedback (from v0.12.3 device pass)

> Logged from real-usage testing after the review restyle. **Log only — no design done here.** (b+c) is
> the priority item and needs a proposal before build.

- **(a) Definition leaks the target word.** The review/definition surface can print the headword inside its
  own definition, giving the answer away. Fix direction: **blank the headword in the definition
  post-enrichment**, preserving a trailing suffix — e.g. word `palabra`, definition contains `palabras` →
  render `____s`. Use an **exact-stem match** and **ignore full inflections for now** (don't try to blank every
  conjugated/derived form yet — just the stem-matched surface).
- **(b+c) MCQ answer ambiguity — ⚠️ PRIORITY, NEEDS DESIGN.** The MCQ marks **only the exact target word
  correct** even when another option also validly fits the sentence; distractors are often **too close**, and
  sometimes **synonyms** of the target that would legitimately work. **Root cause = distractor selection.**
  Needs a proposal, e.g.: an **accept-set** (multiple options can be right) vs. **provably-wrong distractors**;
  **force ≥1 semantically-distant option**; and **never a synonym of the target** as a distractor. Design-first,
  not a quick patch.
- **(d) Review bilan — surface crossings into *mémorisé*.** The end-of-session bilan should **highlight the
  words that crossed into `mémorisé` during this session** (a motivating "you just memorized these" signal),
  distinct from the existing per-word ✓/✗ recap.
- **(e) Écriture hint masked by the mobile keyboard.** On mobile the on-screen keyboard covers the revealed
  hint letters. Fix direction: **move the revealed hint above the input** (out from under the keyboard) **and
  make the hint letters tappable** to enter them into the field. Touches `FillInBlank` / `AnswerBlank` (the
  v0.12.3 review-restyle files).

## Scheduling (FSRS)
- **New-cards-per-day cap — KNOWN, ACCEPTED GAP (parked from M5.5i).** New-card introduction is
  currently **uncapped**: adding a word creates its `review_cards` row with `due = now` (immediately
  due), and the `/review` queue is a flat `due ≤ now ORDER BY due LIMIT cards_per_session` over new
  + review cards mixed — there is no per-day new-card budget anywhere (ts-fsrs runs with default
  params; the cap is an Anki-only feature). M5.5i (Profil) wires **session size**
  (`cards_per_session`, the "Cartes par session" stepper) but deliberately does NOT touch new-card
  introduction; the Profil surface renders **"Nouvelles cartes / jour" as an inert BIENTÔT row**. A
  real daily new-card limit (separate new vs review queues, a per-day introduction budget) is
  deferred — not yet scheduled.

## Theming follow-ups (from M5.6)
- **Disabled-primary `Button` contrast on Nuit (from M6.0a) — CD speccing.** The disabled primary (`disabled:bg-amber-light disabled:text-disabled-ink`) reads as a dead/near-invisible button on the **Nuit** palette (`--color-amber-light #3A2E1E` sits very close to the surface). Surfaced when M6.0a's login gated "Se connecter" on email validity — that gate was removed (login now validates on submit), so it's no longer *hit* on that screen, but the underlying disabled-primary-on-Nuit contrast affects every disabled primary (e.g. signup's disable-until-valid, the change-password submit). Not a tag-blocker — logged for CD's spec pass on the disabled-button treatment. Fix is token-level (a more legible Nuit `disabled` fill/label), not per-screen.
- **Remove the 4 dead rating tokens.** `--color-again/hard/good/easy` (the old oklch RGB-ish rating scale) are referenced by **no utility and no direct var** — `RatingButtons` moved to the amber-family gradation (`amber-deep/accent/amber-mid/amber-pale`) in M5.5e, orphaning them. Kept out of the M5.6 commit (theming-only). Trivial deletion from `globals.css`; verify no `bg-/text-again|hard|good|easy` usage first (grep was clean at M5.6).
- **Consolidate the `THEME_SWATCHES` JS duplication.** `lib/theme.ts` re-declares each palette's preview hexes (`page/surface/border/accent/success`) for the picker chips — a *picker must* paint inactive palettes, so the values can't come from the live CSS vars, but they duplicate the `[data-theme]` blocks in `globals.css` and could drift. Options: generate the swatch table from a single shared palette source, or a build-time check that the swatch hexes match the CSS blocks. Low urgency (render-only, both hand-maintained from the same locked table today).
- **`color-mix` legacy fallback — accepted, noted.** Lightning CSS emits a static fallback hex (computed against the *default* `:root` scope, so slightly wrong per non-Sépia theme) before each derived-tint `color-mix`, for browsers without `color-mix` support. Modern mobile browsers (the target) use the correct runtime `color-mix`; only a legacy no-`color-mix` browser would see the off tint. No action unless legacy support becomes a requirement; recorded so it isn't re-diagnosed.

## Error handling / observability
- **`getDictionaryState` swallows its own `words`-fetch error (logged at M5.5i).** `lib/dictionary.ts` does `const { data } = await supabase.from('words')…` and never inspects `.error`, so on a DB read failure it silently returns `memorizedCount: 0` / `totalReviews: 0` / `entries: []` — a real error renders as honest-looking zeros. Shared by **four consumers** (the /dictionary page + unlock actions + Home + the /account stats strip), so a fix should capture/log `.error` once inside the function (mirrors the `console.error` guard M5.5i added for the /account `totalWords` count). Small, isolated; deliberately NOT folded into M5.5i (touches a function shared beyond the surface). Low urgency (single user; a words-table read failure is rare and loud elsewhere).

## Word list improvements
- ~~Pagination: show 10 newest by default, "Voir plus" button or infinite scroll.~~ **SHIPPED as M5.4a (v0.7.0)** — load-on-scroll progressive append (IntersectionObserver, initial 40 / +30).
- ~~Swipe-to-delete: requires a swipeable-list approach.~~ **Delete SHIPPED in M5.4b (v0.7.1)** — swipe-to-reveal on `/words` + a detail-page button, via the deferred-delete/undo primitive. **Bulk / multi-select / select-all** (+ a batch delete endpoint) was scoped as **M5.4c** but **DROPPED** (decided not to build; the deferred-delete primitive stays set-shaped if the need returns). **Archive** (soft-delete + `archived` flag in schema) stays deferred — separate from delete.
- ~~Search/filter on word list.~~ **SHIPPED as M5.4a (v0.7.0)** — client-side forgiving free-text search (`lib/word-search.ts`) over the word + both glosses.
- Smarter truncation of definition preview: truncate at sentence boundary or first clause, not arbitrary character count.

## Status indicators (bundles with M3 follow-up work)
- Status tag on word entries: "Déjà ajouté" / "En cours d'apprentissage" / "Pas dans votre vocabulaire" — at top of definition card.
- "Récemment ajouté via mots similaires" tag for distinguishing bulk-added words from manual adds.

## Bulk add follow-ups
- Per-word definition preview: small (i) tooltip on each distractor showing a 1-line meaning before adding.
- Per-word failure UX: when partial-success happens (2 of 3 succeed), show which specific word failed.
- **⚠️ Background bulk-add (similaires) silent failure — REVISIT BEFORE SOFT-LAUNCH.** M5.5c
  (v0.8.2) moved the multi-similaires add to the ⑥ "N mots en route" in-progress success screen,
  keeping the bulk-add **fire-and-forget** (Omar: don't claim a completed success; the user can
  keep browsing during the ~20 s background run). Consequence: a failed background add is **no
  longer surfaced inline** — only `console.error`'d in `runBulkAdd` (`app/(app)/add/page.tsx`).
  Acceptable now (single user; the word simply won't appear and can be re-added), but **must be
  addressed before external users**: surface failed background adds and/or offer a retry (e.g. a
  layout-level toast like the deferred-delete primitive, or a `/words` "couldn't add N" banner).
  This is the deliberate tradeoff of the in-progress framing, logged so it isn't forgotten.

## Review experience
- **Form-coherence — infinitive-stored verbs carry conjugated distractors (from the v0.12.5
  distractor-quality fix).** Surfaced by the distractor trace: an infinitive-stored verb can hold
  distractors in a *conjugated* form (`hablar → contaron/gritaron/escucharon`, `comer →
  bebes/pruebas/muerdes`) — so the option list mixes an infinitive target with conjugated options.
  This is a **separate, pre-existing issue** from the synonym fix (which only changed *which* words
  are chosen, not their form): it's the cloze-vs-definition-MCQ **form gate** (`chooseQcmCue` in
  `lib/review-cloze.ts` + how distractors are generated for a lemma vs an inflected form). The
  v0.12.5 fix deliberately did NOT touch it. A real fix aligns distractor form with the target's
  stored form (or generates form-matched distractors for the chosen MCQ mode). Low urgency (single
  user; the mismatch reads as odd, not wrong), but log so it isn't re-diagnosed.
- **Countdown hint copy — show only for a user's first few answers ever (from M5.5e).** The
  auto-advance countdown's explanatory captions ("Sans rien faire, la note X s'applique…" /
  "Prends ton temps…") were removed in v0.8.4 (clutter after you know the mechanic). Re-introduce
  them as a **one-time teaching aid** shown only for, say, a user's first ~2–3 graded answers ever,
  then never again. Needs a persisted lifetime answer-count (on `profiles`, or derive from
  `review_logs` count) — so it's a small data dependency, not an inline tweak. Pairs with the
  disable-auto-advance setting below.
- **"Disable auto-advance" accessibility setting (from M5.5e).** The review auto-advance countdown
  (v0.8.4) always runs after a verdict (tunable `AUTO_ADVANCE_MS`; the user can pause/stop/override
  per card, and reduced-motion gets a discrete numeric, but it still *starts* automatically). Some
  users will want it off entirely — add a persisted per-user toggle (`profiles`) that, when set,
  skips the timer and waits for an explicit ↵/tap. Low urgency (single user; the per-card stop
  affordances cover it for now), but the right a11y end-state before beta.
- **French translation hide/show toggle + synonym / expansion-example work** (parked from v0.6.5 — next slice). Rework how/when the French gloss reveals in review, and add synonym / expanded-example surfacing. Separate from the v0.6.5 hygiene patch.
- Skip rating for trusted suggestions: if user accepts the auto-rating 5+ times in a row, offer a "trust suggestions" toggle.
- Keyboard shortcuts: 1/2/3/4 for ratings, H for hint, Enter to confirm.
- Auto-suggest while typing on /add: dropdown of matching Spanish words after 2-3 chars.

## Onboarding
- ~~First-time user flow: empty state on home + guidance to add their first word.~~ **DONE — the onboarding flow is COMPLETE (M6.2a→c, v0.9.7 / v0.11.0 / v0.12.0):** welcome → tour → prénom · immersion · thème · niveau → starter → first-swipe → real Home handoff (salut banner + kept count). New users arrive with a non-empty collection + a captured name/level/mode/theme.
- ~~Empty state for /review when no cards exist.~~ **SHIPPED as M6.0a (v0.9.0)** — the first-run `/review` vide (Durmiendo + Ajouter/Découvrir + the « prochaine révision » pill bound to `nextReviewLabel` in `lib/review-estimate.ts`).
- Email verification on signup (currently disabled in Supabase). **Re-enable is M6 backend hardening** — M6.0a's signup deliberately leaves it disabled so `signUp` returns a live session and lands on Home.
- **Password-reset flow — deferred (from M6.0a).** The « Mot de passe oublié ? » link ships and routes to a minimal `/forgot-password` stub (kept visible rather than churn re-adding it), but the actual reset (email → token → `updateUser`) is a separate backend slice, not built in M6.0a.
- ~~**Signup → onboarding reroute (forward seam, from M6.0a).**~~ **RESOLVED — M6.2a (v0.9.7).** `app/signup/page.tsx` now `router.push('/onboarding')`; the `(app)/layout.tsx` gate (`onboarding_completed !== true`) is the belt-and-braces backstop.
- ~~**Real display name (M6 onboarding) — replaces the placeholder.**~~ **RESOLVED — M6.2b (v0.11.0).** The prénom step stores `profiles.display_name`; the new `resolveDisplayName(stored, email)` (`lib/display-name.ts`) prefers it and falls back to `displayNameFromEmail`. Wired into the 3 name surfaces (layout greeting, drill recap, account header) — each already fetched `profiles`, so a one-helper swap (not literally zero call-sites, since a pure fn can't read the DB).

## Immersion (FR/ES layer — from M6.1a)

> The substrate + Review shipped in **M6.1a (v0.9.2)** (`lib/immersion.ts` resolver + `glossVisibility`,
> `profiles.immersion_mode`, `SettingsProvider`, `TapReveal`, `ImmersionModePicker`). These are the
> follow-ons.

- ~~**Review chrome copy gap — ES not authored.**~~ **CLOSED — vetted ES folded into M6.1a (v0.9.2, same commit).** All Review chrome is now mode-aware (register: tú, es-ES) via `REVIEW_CHROME` + a shared four-rating lexicon `RATING_LABELS` (reused by `RatingButtons` + the FillInBlank hint-cap caption). Pluralized strings (hint-cap caption, "por n letra(s)", "Aún n palabra(s) por repasar") build per-language at the render site. `fr_es` stays byte-identical. Exclamations + the verb cue stay Spanish by design.
- **M6.1d — Drill immersion.** Make `/drill` mode-aware (same resolver). Folds in the one deferred Review a11y gap: the shared **`AnswerBlank` aria-label "Ta réponse"** (écriture input) — left French in M6.1a because `AnswerBlank` is shared with the still-French drill; swap it to `resolveChrome(REVIEW_CHROME.yourAnswer, mode)` once the drill reads `immersionMode`. (The continue-button "Chargement…" → "Cargando…" was folded into M6.1a.)
- ~~**Shared-components-pending immersion.**~~ **CLOSED — all 3 flipped.** Each shared component was made mode-aware once its LAST French consumer joined the layer (flipping earlier would have leaked ES into a still-French screen):
  - ~~**`AudioButton`** (both aria variants)~~ **DONE (M6.1d-ii, v0.9.6)** — reads `useSettings` → aria via `SHARED_CHROME.audioAria`; its last French consumers (add/dictionary) joined here.
  - ~~**`LoadingChecklist`** ("Pendant que tu attends")~~ **DONE (M6.1d-ii, v0.9.6)** — reads `useSettings` → `SHARED_CHROME.loadingWait`; last consumer was the `/add` loader.
  - ~~**`AnswerBlank`** aria-label~~ **DONE (M6.1d-i, v0.9.5)** — reads `useSettings` → aria via `REVIEW_CHROME.yourAnswer` (review + drill both correct).
- **`ImmersionModePicker` stays FRENCH — by design, not a gap (from M6.1d-ii).** It's the meta-control *about* the FR/ES choice and the escape hatch out of `totale`; documented in `account/page.tsx`. Don't "fix" it in a future immersion sweep.
- **Finish the `deck` → `collection` anglicism drop (from M6.1b).** M6.1b renamed the Discover-flow identifiers (`DeckCard→CollectionCard`, `deckArticle→collectionArticle`, phase `'deck'→'collection'`, API error bodies) + the user-facing `/add` strings. **Deferred internal identifiers** (not user-facing, API-contract risk): `lib/drill.ts` `DeckVerbInput`; the `already_in_deck` **wire value** shared by `app/api/words/enrich/route.ts` ↔ `app/(app)/add/page.tsx` (rename both sides together); `app/(app)/page.tsx` `deckVerbs`; scattered comments + test descriptions. Low urgency (internal), no `mazo`.
- **M6.1b — Discover immersion-awareness.** Card-content flip: ES headword + FR **tap-to-reveal** (reuse `TapReveal`, consuming the mock's `cardTransLabel` "Toca para traducir") in `immersion`; ES-only in `totale`; FR visible in `fr_es`. Plus Discover chrome. **Boundary (README note A):** the onboarding scaffolding *around* the deck (coach-marks, step copy) stays French always — only the product card content follows the mode.
- **M6.1c — TopNav / Home / remaining product chrome** mode-aware (same resolver).
- **Onboarding scaffolding is never mode-aware** (always French — instructional). This is why the resolver is per-surface opt-in, not a global `<html lang>` lock; honor it when the onboarding flow is built.
- **mode-c "no translation" indicator (optional).** The immersion mock shows a "sin traducción" / "solo en español" hint where the FR would be; M6.1a **suppresses entirely** (per brief). Revisit if the empty slot reads as a bug rather than a deliberate choice.

## Design pass — deferred from M5.5a (foundation slice)
- **Inactive nav-pill border — §01-consistency reconciliation.** M5.2 ships the inactive pill with an **accent-tinted** border + accent-tinted icon; board §05 `FinalNav` uses a **neutral** border (`--border`). Left unchanged in M5.5a (it wasn't one of §05's three named "paint" changes, and reconciling it is a redesign beyond visual coherence). ~~Revisit in the nav-IA restructure pass~~ — **the nav-IA header swap shipped as M5.5k (v0.9.1)** but deliberately **kept the pill row verbatim** (incl. this `border-accent/60` inactive border), so it did NOT touch this. Now a **standalone pill-polish decision** (neutral-per-board vs keep the M5.2 tint), no longer blocked on a pass.
- ~~**Semantic-tint drift vs board §01 — reconcile with the §06 status/Words cluster.**~~ **DONE in M5.5b (v0.8.1)** — `--color-ok-bg #D4EDE9 → #DCEAE5` (sage-tint, MÉMORISÉ pill bg), `--color-err-bg #F5E0D8 → #F4E1D8` (terra-tint, swipe Supprimer panel), `--color-tint #F5E0C0 → #F6E7CC` (board tint). Added `--color-amber-tint #F7E8D0` as its own token (active ⋮ button bg). ~~The canonical `Button` still inlines `#F7E8D0`/`#F4E1D8` for its pressed-bg — could now reference `amber-tint` / `err-bg`.~~ **DONE in M5.6 (v0.8.9)** — Phase 1 de-hardcoded all `Button` §03 hexes to tokens (`amber-tint`/`err-bg`/`terra-border`/`terra-ink`/`disabled-ink`) so the button themes with `[data-theme]`.

## Edge-state design audit (not started)
- **Audit the edge-state screens for the v2 design pass.** The success/terminal + empty/error states — review-complete (bilan), conjugaison-complete (drill recap), empty states, and error-state screens — may have missed the v2 design pass. Needs an audit (done / not-done per screen) before any scoping.

## Detail page — possible follow-ups (from M5.5b)
- **el/la article on the noun headword (deferred).** The detail card now shows the `posEyebrow` grammatical eyebrow (reused from discovery) but **not** `deckArticle` (el/la), because the detail headword is the stored surface form — often a conjugated verb ("me acuerdo") — so prepending an article is unsafe in general. If we ever want the article for *bare-noun* entries, gate it on `pos ∈ {n.m., n.f.}` AND the headword being a single token, and reuse `deckArticle` (don't fork it). Low priority.

## Design pass — asset dependencies (from M5.5a)
- **32px nav-avatar crop of Animando** (`paco.png`) — a *tighter crop of the existing asset* (not new art): head + collar, subject ≈ 80% of height, centered, transparent bg, minimal margins. Deliver @1×/2×/3× (32 / 64 / 96px). The raw asset has lots of negative space so the face is tiny at 32px. **Swap point already wired:** a one-line comment at the `TopNav.tsx` lockup `<Image src="/paco.png">` marks where it drops in — no code change beyond the src/size. Asset-gated, non-blocking; the nav uses the current `paco.png` until then.
- **Later / optional (do NOT commission now):** a dedicated full-body "celebration" Paco for milestones — only if Animando/Feliz prove insufficient in use. Conservative: don't design any screen around it.

## Mobile UX polish
- **Hit-target ≥44px expansion (deferred from M5.7).** M5.7's press-feedback pass was scoped feedback-only ("ajoute uniquement le feedback d'interaction" — no layout change), but the guidance also lists a ≥44px minimum tap target. Several interactive elements sit below it — nav pills (~32px tall), the home/avatar round icons (36px), the word-detail ⋮ + discover close (38px), the stepper buttons (36px), the clear-search × (22px). Expanding them (taller pills, invisible tactile padding on the icons) is a **layout pass**, deliberately out of the feedback-only change. Pick it up as its own small slice. Note this also interacts with the deferred nav-IA pass (pill sizing).
- **Press feedback left focus-ring-only on two minor surfaces (from M5.7).** The `/words` sort text-toggles (Trier · Date · Familiarité · Alpha) and the ephemeral discover coming-soon **toast-dismiss ×** got the global keyboard focus ring but no `press-*` veil — a veil over tiny inline text / a caret-adjacent toggle reads worse than the no-op. Low priority; revisit if either feels unresponsive in use (a small scale-only press, no veil, would be the fix).
- ~~`select-none` on transient toast text to prevent accidental text-selection.~~ **DONE in M5.4b (v0.7.1)** — applied to the deferred-delete undo toast. (The add-page toasts can adopt it too if it ever bites there.)
- Mobile review polish (deferred from earlier milestones — revisit after extended mobile use).
- Rating button scan-speed check: amber single-hue gradation was introduced in v0.3.3 (replacing Anki-convention RGB). Worth a deliberate check after a few weeks of daily use — if review pace slows because the buttons are harder to distinguish at a glance, consider reverting to RGB or adding secondary visual cues (icons, position).

## Headword integrity (future slice — separate milestone)

> Grouped from v0.6.5. The v0.6.5 patch fixed the one *deterministic, verb-agnostic* headword bug
> (reflexive proclitic). The remaining headword-integrity work is a dictionary/validation slice,
> not a patch — keep it out of small bug-fix commits.

- **Structured `person` field on the enrichment response** — retire the `form_annotation` regex parse in `lib/reflexive.ts` (`parseReflexiveClitic`). Anthropic returns free-text annotations (`"Acostarse — 2ª pers. sing., reflexiva"`); a structured `{person: '1s'|'2s'|…, reflexive: bool}` field would make the clitic correction (and any future morphology consumer) robust to annotation drift. The v0.6.5 helper already degrades to the lemma on parse failure, so this is hardening, not a live bug.
- **Dictionary-based headword validation** — a general guard that the stored `word` is a well-formed Spanish surface (beyond per-token spellcheck), to catch grammatical malformations the lexical gate can't.
- **`bebep`-style discovery hallucination** — discovery generation can emit a non-word; validate generated headwords before persisting `pending` rows.
- **Corrupted "beber" row — Cyrillic homoglyphs in the stored `word`.** Surfaced by the M5.3a diagnostic: one `beber` row stores the word as `bebер` (Latin `beb` + Cyrillic `е`/`р`), so the non-verb `maskSentence` exact/stem match silently failed and the card fell to MC. Harmless in M5.3a (the verb path masks on the clean `lemma`), but the stored `word` is wrong. Fix: re-save/re-enrich that row (or a one-off homoglyph sweep `[а-яёА-ЯЁ]` over `words.word`). Low urgency, single instance.

## Data hygiene
- Clean up the duplicate "regañar" entries (specific instance — separate from generic M3 duplicate handling).
- Backfill weak-example words from before M2.5 (soler, amanecer, others) — re-enrich to get richer definitions and examples.
- Manual-add of a word currently `pending` in a discovery batch creates a duplicate entry — the filtered duplicate-check can't see pending rows. Folds under the generic duplicate-word handling.

## Lemma flow polish (from M3.3 testing)
- Adjective annotations include POS prefix (`"Alguno — adj. indefinido, femenino plural"`) while verb annotations don't (`"Comer — 3ª pers. plural, pretérito perfecto simple"`). Anthropic's creative interpretation of "grammar info." Could tighten the prompt for strict consistency; currently keeping for the extra pedagogical context on adjectives.
- Lemma interstitial still has vertical empty space below the form_annotation. Annotation filled the most egregious empty middle but layout isn't perfectly balanced. Minor polish.
- Once instrumentation data (from `add_events`) shows clear patterns: revisit whether to swap Option A (Anthropic-supplied lemma) for Option B (bundled inflection→lemma dataset). Trigger: if `lemma_suggestion_accepted` rate climbs above ~10-15% of inflected adds, the wasted-enrichment cost of A starts justifying B.

## Gamification (defer aggressively)
- Achievements section — needs an anti-ceremony philosophy decision before it's a milestone. (M5.2b shipped a single self-contained dictionary unlock; a broader achievements system would need to reconcile with the ceremony-fatigue / no-streaks standing decisions first.)
- Session streak / XP counters.
- Game mode selection in Settings (becomes meaningful only after multiple game modes exist).
- ~~Verb conjugation exercise mode — drill specific conjugations (tense + person) of a verb the user knows.~~ **SHIPPED as M5.3c (v0.6.7)** — the `/drill` flow. (Game-mode *selector* in Settings stays deferred — meaningful only after a 2nd mode.)

## i18n / future direction
- Support languages other than Spanish (the architecture is mostly language-agnostic but the Anthropic prompt is Spanish-specific).

## Branding follow-up (deferred)
- Custom domain (~$12/year — buy when there's a real reason to share broadly)
- Vercel URL rename (currently spanish-vocab-lyart.vercel.app — could become paco.vercel.app or similar)
- GitHub repo rename (currently spanish-vocab → paco)

## Conjugator audit (M5.3c hardening gate) — ✅ RESOLVED in v0.6.4

> Surfaced during v0.6.3, hardened in **v0.6.4** (standalone slice ahead of M5.3b). The audit ran
> against the live deck (51 verbs) + the conjugator's tabled set; the fix landed the display-guard
> primitive (`canDisplayParadigm`) + a self-verifying golden-fixture harness. (Detail in
> `PROJECT_STATE.md` → From v0.6.4.)

- ~~**(a) Unaccented usted-imperative forms.**~~ **FIXED.** Root cause was deeper than the exact map: `imperativeAffirmative()` + the negative-imperative branch built on the rule-computed `present()`/`subjunctive()`, which **bypass `IRREGULAR_FORMS`** — so **all 16** fully-irregular verbs had wrong imperatives (`ser`→`"sa"`, `estar`→`"este"`, `dar`→`"de"`…), not just dar/estar. Systemic fix: route both through `formsFor` (table-aware). Now `dar`→`"dé"`, `estar`→`"está"`/`"esté"`. Locked by a Finding-1 invariant test.
- ~~**(b) Missing `sentar` e→ie present stem.**~~ **FIXED** (`PRES_STEM['sentar']='sient'`), plus the broader A2/B1 stem-change set the audit surfaced: e→ie (despertar, encender, mentir), o→ue (acostar, mostrar, recordar, costar, soñar, almorzar, mover, doler), e→i (vestir, seguir, conseguir — incl. the new `-guir` gu→g ortho rule). `te sientas` auto-upgraded to coherent cloze-MCQ (mask test flipped).

### Conjugator follow-ups (deferred from the v0.6.4 audit — excluded from the trusted set, graceful no-table)

> Each is a single wrong cell that fails the golden-fixture admission rule, so `canDisplayParadigm`
> returns **false** for it (it will simply never get a displayed table) until fixed. Low urgency.

- **`poder` gerund** = `"podiendo"` (should be `"pudiendo"`). poder is a rare -er verb with a weak gerund; can't be fixed via `WEAK_STEM` without breaking its regular subjunctive `"podamos"`→`"pudamos"`. Needs a small special-case (gerund-only weak stem).
- **`creer` preterite hiatus accents** = `"creiste"/"creimos"/"creisteis"` (should be `"creíste"/"creímos"/"creísteis"`). The `-eer`/`-aer` vowel-stem verbs need the hiatus accent on the 2nd-person/1st-plural preterite, which the engine omits (it only adds the i→y on 3rd person). Affects the deck verb `creer`.
- **`haber`** — auxiliary; no meaningful learner imperative (`"ha"`/`"habed"`). Excluded by design.
- **`llover`** — impersonal/weather verb; full personal paradigm is grammatical but pedagogically odd. Excluded; revisit if a weather-verb display is ever wanted.
- **`acordar` (me acuerdo) o→ue** stem-changer not in the v0.6.4 set → `paradigm('acordarse')` lacks `"acuerdo"`/`"acuerdas"`, so an `"me acuerdo"`-type card degrades to definition-MCQ until added. Adding it requires the v0.6.4 golden-fixture admission process (full-paradigm reference verification + `TRUSTED_LEMMAS` entry), NOT an ad-hoc `PRES_STEM` line. (Surfaced v0.6.5.)
- **Comprehensive A2/B1 regular + stem-changer seeding** of `TRUSTED_LEMMAS` — **⛔ REQUIRED PRE-BETA-HANDOVER GATE** (broader coverage is needed before beta testers — a tester's verb that falls outside the trusted set silently gets no conjugation grid / no drill, which reads as a hole). v0.6.4 seeded the deck regulars + the audited stem-changers/irregulars only; M5.3b confirmed the live hit rate is **42/48 verb-pos words (87.5%)** today. Trusted-set coverage = how often the conjugation table (M5.3b) and the drill (M5.3c) can appear, so this must be expanded — with the v0.6.4 vetted-fixture admission process (full-paradigm reference verification, NOT ad-hoc `PRES_STEM` lines) — before opening to testers. **Concrete near-term candidates surfaced by the M5.3b coverage check** (deck verbs currently falling to the no-grid path, each a `-zco`/irregular the rule engine can't safely guess): **`conocer`**, **`crecer`** (both `-zco` yo), **`andar`** (irregular `anduve` preterite). (`creer`/`haber`/`acordar` stay excluded-and-logged below — single-cell defects, separate fixes.)

## M5.3c drill — deferred dependencies (logged at v0.6.7)

> Each is a content/coverage upgrade to the shipped drill, gated on other work — NOT drill-loop bugs.
> The drill's logic seams (`triggerFrame`, the pool source) are built so these slot in without
> touching the loop.

- **(a) Drill "new verbs" (outside the deck)** — ⇐ **A2/B1 coverage seeding**. Today the pool is the
  user's own trusted deck verbs only. A "practice a verb you don't have yet" source unlocks once the
  `TRUSTED_LEMMAS` set is broadly seeded (the same pre-beta gate under Conjugator audit above) — a
  drill prompt on an unseeded verb would silently get no conjugation + no grid.
- **(b) (iii) full generated sentences + FR glosses** — = the **shared generation / cache layer**
  (the crossword needs the same one). Replaces ONLY `triggerFrame(tense)` in `lib/drill.ts` (the
  verb-agnostic lead-in) with a generated, verb-specific contextual sentence; the rest of the drill
  loop is untouched. Build the generation/cache layer once, both modes consume it.
- **(c) Richer ¡Casi! morphology teaching** ("racine devient pud-") — parked **tip content** = the
  **Astuce tip redesign** (M5.3b Astuce half). The drill's ¡Uy! teaching line is deterministic
  tense/person today; the morphological "why" explanation is the same content the Astuce hint needs,
  so they share the redesign.
- **The tip / Astuce redesign needs a dedicated design pass** — it is NOT a quick content tweak; it's
  scheduled as part of the PRE-BETA full design pass (`roadmap.md`), and both the drill's morphology
  "why" line (c) and the parked /review Astuce hint (M5.3b) depend on its output.

## Known bugs (shipped, deferred)

- ~~**⚠️ `review_logs` insert has written the wrong key column since inception → table empty for ALL users.**~~ **FIXED (commit `96c25f7`, post-v0.8.9).** `app/api/review/route.ts`'s log insert sent `word_id: row.word_id`, but `review_logs` has **no `word_id` column** and is keyed by **`card_id` (uuid, NOT NULL)** — so every insert failed with Postgres **42703** and was swallowed (`console.warn` + the route still returned `{ok:true}` since the card update already succeeded). The table had been empty across all users since the feature shipped, while `review_cards` advanced normally; diagnosed because the /account révisions strip read 0 while `sum(review_cards.reps)` = 532 real reviews. **Fix:** payload `word_id` → `card_id: cardId`; `console.warn` → `console.error`. Verified live (count climbed 0→1→2 with matching card_id). **NO backfill (accepted, irreversible):** the ~532 historical reviews were never logged and their `time_ms`/`rating`/`reviewed_at` are unrecoverable; logging accumulates from the fix forward and the Home review-time estimate (which silently ran on the 12000 ms/card fallback) self-heals as new reviews land. (M5.5i had already re-sourced the révisions stat to `Σ review_cards.reps`, so that figure was correct throughout regardless.)

- **Accent-tolerant autocomplete prefix matching is broken** (M3.2 spec).
  Reproduced: typing `bebí` (acute) and `bebì` (grave) both produce the same dropdown of unaccented forms only (`bebi, bebia, bebio, bebian, bebias`). Expected: dropdown should surface `bebí, bebía, bebías, bebíamos, bebían` — actual Spanish forms with accents preserved. Same bug reproduces on `comi`/`comí`. Investigate `prefixMatch` in `lib/wordlist.ts` — the accent normalization branch may not be wired up, OR the prefix comparison is happening before the WORDS array is normalized. Bonus: also handle grave-as-acute (typing `bebì` should still find `bebí`), since Spanish doesn't use grave accents.

- **`.next/types/validator.ts` TypeScript error** carried forward from M3.3 polish work.
  Error: `TS2307: Cannot find module '../../app/page.js' or its corresponding type declarations.` Claude Code dismissed across both M3.3 polish phases as a pre-existing build cache artifact. Want to verify against a pre-M3.3 commit before trusting the diagnosis. Quick check: `git stash`, `git checkout v0.3.2`, `npx tsc --noEmit 2>&1`, see if it appears; pop stash after. Likely benign but worth resolving cleanly when M4 touches the routing layer where it lives.

- ~~**PhaseChecklist active-indicator animation not firing.**~~ **FIXED in M5.5c (v0.8.2),
  completed to spec in the polish pass.** Root cause: `motion-safe:animate-pulse` + a `···` span
  never rendered. The full choreography is now wired **verbatim from `MOTION-loading.md`** in
  `globals.css` (`pacoRing` 1.8s + synced `pacoCore` dot, `pacoDot`, `pacoBreathe` w/ micro-scale,
  the per-phase `pacoRingPop` + `pacoCheckDraw` stroke draw-on, `pacoEnterUp` entrance), gated
  under `no-preference` with an honest `reduce` fallback. The one-shots re-fire per phase because
  `PhaseRow`'s indicator is **keyed by state** (a one-shot on a persistent node plays once for the
  whole screen). Pacing replaced: deterministic ~850ms dwell for steps 1–3, data-gated step 4,
  ~3.05s min-visible floor (tunable). **Confirm on device that it both fires AND degrades** (do
  not assert from spec).
- ~~**¡Listo! "Voir la fiche" CTA clipped through the middle (mobile + desktop).**~~ **FIXED in
  M5.5c (v0.8.2) polish.** Root cause: the `ready` view bottom-anchored its CTA inside a
  hard-coded `min-h-[calc(100svh-4rem)]` column + `flex-1` spacer; the real two-row `TopNav` is
  taller than 64px, so the column overran the viewport and the CTA sat below the fold. Fixed by
  pinning the CTA via the shared `StickyActions` (fixed + safe-area, the fiche's working pattern)
  and dropping the min-h column — no height math.

## Discovery follow-ups (M5.1)

- **"Pour toi" featured collections — wired placeholder shell shipped (M5.5d), features deferred.**
  The Découvrir grid now shows two non-functional featured cards (a neutral "Bientôt" chip → a
  warm Paco "pas encore disponible" note). Activating each is its own milestone, NOT discovery
  re-skin work: **(a) adjacency** = **M5.1b** ("plus de mots comme les tiens" — reuse the swipe
  primitive + generation, seeded from a sample of the user's library; see the M5.1 follow-ons in
  `roadmap.md`); **(b) "L'essentiel A2–B1"** = the **PRE-BETA content-gate seeding** (`roadmap.md`)
  — a curated reference collection. **Open question from the board** (resolve at that milestone):
  120 words is large — selecting it may need a sub-pick by *palier* rather than batching one deck.
  When each lands, wire its `FeaturedCard` to start its flow (replace the coming-soon gate) — the
  shell + the §04 featured-card treatment are already in `DiscoverClient.tsx`.
  **UPDATE (M8, v0.10.0):** the **shared `discovery_pool` + seeding path now exist** — "L'essentiel A2–B1"
  is populated by `POST /api/admin/discovery-fill` `mode:'curate'` (a vetted word list → `getWordData`
  enrichment → `theme_key='esencial'`). What remains for (b) is Omar's **word selection** (the judgment) +
  wiring the `FeaturedCard` to draw the `esencial` pool. The palier sub-pick maps to the `band` column.
- **Generation latency on the Génération screen** (multi-second wait). The delay is
  the live Anthropic call in `/api/discovery/generate` — inherent to generating a batch
  on demand, not a regression. Future fix: prefetch the next topic's batch (warm on grid
  idle / on press-in) and/or a short-lived server-side per-topic cache of generated
  batches, so the deck opens instantly on the common path. Keep the cache-before-API
  resume path; this is purely about cold-generation perceived speed. **LARGELY RESOLVED (M8, v0.10.0):** the shared `discovery_pool` serves pre-generated words on the common path (`/api/discovery/session` draw = no live call), so the multi-second wait only remains on the rare **exhaustion fallback**. Fully closing it = keeping each theme's pool topped up via `/api/admin/discovery-fill`.

  _(The desktop / wide-viewport + content↔nav edge-alignment item was **resolved by M5.2** —
  the top nav lives inside the `max-w-[430px]` column so nav and content share edges by
  construction. Removed from the backlog.)_
