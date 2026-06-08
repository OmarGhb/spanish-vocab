# Paco — Backlog

> The repo-canonical backlog (as of v0.6.1 — M5.3a). Items here are not yet scheduled.
> Committed work lives in `docs/roadmap.md`. When a backlog item is promoted to a milestone, it moves out of this file.

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
- **French translation hide/show toggle + synonym / expansion-example work** (parked from v0.6.5 — next slice). Rework how/when the French gloss reveals in review, and add synonym / expanded-example surfacing. Separate from the v0.6.5 hygiene patch.
- Skip rating for trusted suggestions: if user accepts the auto-rating 5+ times in a row, offer a "trust suggestions" toggle.
- Keyboard shortcuts: 1/2/3/4 for ratings, H for hint, Enter to confirm.
- Auto-suggest while typing on /add: dropdown of matching Spanish words after 2-3 chars.

## Onboarding
- First-time user flow: empty state on home + guidance to add their first word.
- Empty state for /review when no cards exist.
- Email verification on signup (currently disabled in Supabase).
- **Real display name (M6 onboarding) — replaces the placeholder.** v0.6.7 added `displayNameFromEmail` (`lib/display-name.ts`, pure + tested): a temporary name derived from the email local-part (title-cased first token — "camille.r@…" → "Camille"), used in the drill recap ("¡Muy bien, {name}!"). M6 onboarding should collect a real name and store it on `profiles`; then swap **only this helper's source** (read the stored name, fall back to the email derivation) — every name surface already reads through it, so no call sites to hunt down.

## Design pass — deferred from M5.5a (foundation slice)
- **Inactive nav-pill border — §01-consistency reconciliation.** M5.2 ships the inactive pill with an **accent-tinted** border + accent-tinted icon; board §05 `FinalNav` uses a **neutral** border (`--border`). Left unchanged in M5.5a (it wasn't one of §05's three named "paint" changes, and reconciling it is a redesign beyond visual coherence). **Revisit in the nav-IA restructure pass** (the separate later §05 pass) — decide neutral-per-board vs keep the M5.2 tint deliberately.
- ~~**Semantic-tint drift vs board §01 — reconcile with the §06 status/Words cluster.**~~ **DONE in M5.5b (v0.8.1)** — `--color-ok-bg #D4EDE9 → #DCEAE5` (sage-tint, MÉMORISÉ pill bg), `--color-err-bg #F5E0D8 → #F4E1D8` (terra-tint, swipe Supprimer panel), `--color-tint #F5E0C0 → #F6E7CC` (board tint). Added `--color-amber-tint #F7E8D0` as its own token (active ⋮ button bg). The canonical `Button` still inlines `#F7E8D0`/`#F4E1D8` for its pressed-bg — could now reference `amber-tint` / `err-bg`, left as a tidy-up (no visual change).

## Detail page — possible follow-ups (from M5.5b)
- **el/la article on the noun headword (deferred).** The detail card now shows the `posEyebrow` grammatical eyebrow (reused from discovery) but **not** `deckArticle` (el/la), because the detail headword is the stored surface form — often a conjugated verb ("me acuerdo") — so prepending an article is unsafe in general. If we ever want the article for *bare-noun* entries, gate it on `pos ∈ {n.m., n.f.}` AND the headword being a single token, and reuse `deckArticle` (don't fork it). Low priority.

## Design pass — asset dependencies (from M5.5a)
- **32px nav-avatar crop of Animando** (`paco.png`) — a *tighter crop of the existing asset* (not new art): head + collar, subject ≈ 80% of height, centered, transparent bg, minimal margins. Deliver @1×/2×/3× (32 / 64 / 96px). The raw asset has lots of negative space so the face is tiny at 32px. **Swap point already wired:** a one-line comment at the `TopNav.tsx` lockup `<Image src="/paco.png">` marks where it drops in — no code change beyond the src/size. Asset-gated, non-blocking; the nav uses the current `paco.png` until then.
- **Later / optional (do NOT commission now):** a dedicated full-body "celebration" Paco for milestones — only if Animando/Feliz prove insufficient in use. Conservative: don't design any screen around it.

## Mobile UX polish
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
- **Generation latency on the Génération screen** (multi-second wait). The delay is
  the live Anthropic call in `/api/discovery/generate` — inherent to generating a batch
  on demand, not a regression. Future fix: prefetch the next topic's batch (warm on grid
  idle / on press-in) and/or a short-lived server-side per-topic cache of generated
  batches, so the deck opens instantly on the common path. Keep the cache-before-API
  resume path; this is purely about cold-generation perceived speed. **Cross-ref:** the PRE-BETA **content gate**'s discovery pre-seeding (≥100 words/theme, `roadmap.md`) would address this directly by serving pre-generated words instead of a live call — **not retired here (not shipped).**

  _(The desktop / wide-viewport + content↔nav edge-alignment item was **resolved by M5.2** —
  the top nav lives inside the `max-w-[430px]` column so nav and content share edges by
  construction. Removed from the backlog.)_
