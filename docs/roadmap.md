# Roadmap

The next committed milestones. Items in `docs/backlog.md` are deferred until promoted here.

> Re-sequenced after the M5 design pass (7 design boards reviewed) + the pill-tab nav deferral.
> The original monolithic **M5.0** was split into **M5.0a–d** (M5.0d later **dropped** — its
> interim conjugation fix folded into M5.3 to avoid throwaway code). The original **M5.2 (game
> modes)** was renumbered to **M5.3**. Pill-tab nav was inserted as **M5.2** (deferred to after
> M5.1 by explicit call).

## M1 — Deploy to Vercel ✅ (v0.1.0)
## M2 — /add experience overhaul ✅ (v0.2.4)
## M2.5 — Spanish-first definitions ✅ (v0.2.5)
## M3.1 — Two-step add flow + duplicate handling ✅ (v0.3.1)
## M3.2 — Wordlist-driven spelling correction ✅ (v0.3.2)
## M3.3 — Lemma normalization ✅ (v0.3.3, three phases)
## M4 — Word audio + detail view ✅ (v0.4.0)
## M4.1 — Definition backfill + styled 404 + empty-DÉFINITION guard ✅ (v0.4.1)
## M4.2 — /add polish ✅ (v0.4.2)
## M4.3 — Audio quality (Google Cloud TTS) ✅ (v0.4.3)

*(Detail for shipped milestones lives in `PROJECT_STATE.md`.)*

---

## M5.0a — Honest status taxonomy ✅ (v0.5.0)
- Canonical `lib/word-status.ts` primitive — single source of truth for word status
- `getWordStatus(card|null)` — 6-state stability-based partition, first-match, uses ts-fsrs `State` enum
- `isMemorized(card|null)` — mastery predicate; excludes `Relearning` regardless of stored stability
- **Two-derivation model**: the pill is action-priority (a due-now card reads "À réviser" even at high stability); the mastery class is stability-based and ignores transient due-ness. M5.0c counts/filters consume `isMemorized`.
- Constants `MEMORIZED_STABILITY_DAYS = 30`, `LEARNING_STABILITY_DAYS = 7`
- `/words/[id]` pill rewired; inline `statusPill` removed; 21 vitest unit tests (incl. the decoupling invariant + `State.Learning` fall-through lock)
- Home list rows out of scope **by design** — rewired in M5.0c

## M5.0b — Add-flow loading polish ✅ (v0.5.1)
- ② Timed phase checklist (Définition / Exemples / Famille / Phonétique) replacing the single-line loader. Last phase stays an indeterminate pulse until real data lands. Label is "Exemples" (not "Trois exemples").
- ③ "¡Listo!" screen **variant A** — informative card preview, hold-plus-tap (no auto-advance), reads as the resolution of ②'s checklist.
- Existing-word routing keyed on `data.status` (early return before any `ready`); 400ms loading-shell delay gate so fast deck-only lookups never paint the loader.
- Extension-hydration one-liner: `suppressHydrationWarning` on `<html>` + `<body>` (Grammarly + Scribe).

## M5.0c — Home + word-list editorial ✅ (v0.5.2)
- ① Home top section **variant A** — editorial weight, "≈ N min de révision" effort estimate (median of recent `review_logs.time_ms`). **No streak. No phrase-du-jour hero.** Review CTA loudest; "Tout est à jour" State B.
- ⑥ Word-list at `/words` — rows on `getWordStatus` via shared `StatusPill`; Tous / À revoir / **Mémorisés** filter pills; familiarity dot meter (`getFamiliarity`); sorts alphabétique / date / familiarité.
- ⑤ End-of-session **variant A** — per-word ✓/✗ recap, honest stats (Révisés / Réussite / Temps), **no streak**, "Encore N mots" only if cards remain.
- Resolves the transient M5.0a→M5.0c list/detail status inconsistency.
- Post-tag polish folded into v0.5.2: list-row redesign (left vertical familiarity meter, bordered/tinted-due rows, italic definition preview, "N révision(s)" reps line), collection-line spec, CTA-bold convention.

## M5.0d — Interim inflection-tolerant matching — **DROPPED**
- Was: a cheap `nspell` stem-heuristic stopgap for the fill-in-blank conjugation mismatch. **Dropped** — it would be thrown away the moment M5.3's deterministic conjugator lands, so the whole fix lives in M5.3 instead. (Daily workaround until then: type the dictionary form.)

## M5.1 — Discovery mode ✅ (v0.5.3)
- Topic grid, lightweight generation + enrich-on-keep, reusable swipe deck, bilan; reuse `words` + discovery flag (**Model A**).
- Built the **reusable `SwipeCard` primitive** (also unblocks backlog swipe-to-delete/archive). Schema: `words` discovery columns + `UNIQUE(review_cards.word_id)` backstop. (Detail in `PROJECT_STATE.md` → From M5.1.)

### M5.1 follow-ons (designed-for in M5.1, not built)
- **M5.1b — Adjacency mode** ("plus de mots comme les tiens"): same swipe primitive + generation, seeded from a sample of the user's library instead of a topic; new entry tile on Découvrir.
- **Onboarding slice:** empty-state Home → the same discovery flow (pairs with the backlog first-run item).

## M5.2 — Top pill-tab nav ✅ (v0.5.4)
- Top sticky nav replaces the bottom NavBar entirely. Lives inside the `max-w-[430px]` column so nav + content share edges by construction (resolves the M5.1 wide-viewport/edge-alignment pain point).
- Row 1: home circle (house) far-left + centered Paco brand lockup (mascot + wordmark + APRENDE·RECUERDA·HABLA, → /) + account avatar far-right. Row 2: horizontally-scrollable pills — Accueil, Mes mots, Ajouter, Réviser, Découvrir.
- Brand de-duplicated: old large home-body hero removed; tagline now lives in the nav lockup.
- Mes mots is now a first-class destination (supersedes M5.0c's "sole entry = TA COLLECTION block"; the block stays as redundant entry). Accueil is both a pill and the corner circle so a tab is always selected.
- StickyActions `bottom-16` → `bottom-0`; z simplified; every `pb-*` consumer revised; iOS top+bottom safe-area.
- `/dictionary` + unlock gate split out → M5.2b.

## M5.2b — Dictionnaire personnel ✅ (v0.5.5)
- `/dictionary` — A–Z reference of the user's **memorized words only** (strict subset of `/words`: `isMemorized`); deliberately bare (word + gloss + audio; no pills/meter/filters/sorts), iOS-contacts jump rail, Ñ-after-N bucketing.
- 10-word **sticky** unlock (`profiles.dictionary_unlocked`, never resets); flip via Server Action (prefetch-safe) → one-time confetti interstitial. Locked pill / Home card / `/dictionary` all show the locked state until then.
- Resolved the open questions: `/dictionary` is the **A–Z of the user's own (memorized) deck**, and it **IS a 6th nav pill** (locked = dashed + lock glyph) — superseding "not one of the pills". (Detail in `PROJECT_STATE.md` → From M5.2b.)

## Review rework ✅ (v0.5.6 + v0.6.0)
- **v0.5.6 — slices 1–2:** review focus-mode (`FocusModeContext`; TopNav suppressed through the bilan); write-in mechanic (`AnswerBlank` — transparent input over an inline blank); three-verdict result card (¡Eso es! / ¡Casi! / ¡Uy!) with letter-level diff (`lib/worddiff.ts`); shared `ResultReveal` (MCQ reuses the Paco reveal); uniform rating-pill restyle; `--color-warm` token.
- **v0.6.0 — slice 3 close:** bilan recap redesign (fixed vertical frame, scrolling word list, stats-above-list override, `--color-hair` token, staggered row reveal); **"Encore N" continues the session in place** (client-fetches the next due batch — the old `<Link href="/review">` served a stale Router-Cache page); QCM result-state aligned to the écriture card (canonical tint tokens, verdict-on-top, shared `RatingButtons` selection-fill beat).
- Grading was extracted to `classifyBlankAnswer` in `lib/rating.ts` (shared by `computeRating` + the result card) — the seam M5.3a's verb grading extends. (Detail in `PROJECT_STATE.md` → review-rework sections.)

## M5.3 — Game modes + conjugation substrate
*Split into M5.3a/b/c. The conjugator is built once (M5.3a) and feeds four consumers across the three slices: the inflection-fix (a), the ④ Astuce hint + frame-5 table (b), and the verb drill (c).*

### M5.3a — Conjugation substrate + fill-in-blank matching fix + in-question hint ✅ (this milestone)
- **Deterministic hand-rolled conjugator** (`lib/conjugator.ts`, pure/unit-tested, client-safe). Library-vs-handrolled was demonstrated at plan time: `spanish-verbs` (RosaeNLG) **failed the battery** (no stem changes — `pedir→"pedo"`; no imperative/gerund/participle), `verbos` is CC-BY-NC. Hand-rolled passes 67 battery + regression tests. A2/B1 tense union; **not LLM-sourced** (M3.2 lesson, higher stakes).
- **Paradigm-aware masking** (`maskVerbSentence`) blanks the contextually-correct conjugated form — fixes the lemma-vs-conjugation mismatch AND the dio/fue MC-gap (irregular stems the 4-char heuristic missed). `maskSentence` kept as non-verb + no-match fallback.
- **5-branch verb grading** (`classifyVerbBlank`, POS-gated): target form → ¡Eso es!; lemma → ¡Casi!; other valid inflection → ¡Casi!; typo near-miss → ¡Casi!; else ¡Uy!. Reuses the existing ¡Casi! verdict + FSRS rating. Non-verb grading untouched.
- **In-question hint**: blank → tap → `(lemma, person)`, tense withheld, lemma-only on ambiguous person. Coordinates **derived on the fly** (no stored data).
- **Storage of {lemma,tense,person} DEFERRED to M5.3b** — derive is deterministic + self-healing and grading never reads stored coords; nothing to persist yet.
- **Safety property:** M5.3a never DISPLAYS a generated conjugation (the answer shown is the real blanked token; the hint shows facts). So an untabled-irregular verb degrades verdict generosity, never miseducates.

### v0.6.2 — post-M5.3a review-format coherence ✅
Three independent fixes after M5.3a, each diagnosed against the real deck before coding.
- **Token-aware spellcheck gate** (`lib/wordlist.ts` `checkSpelling`) — multi-word adds (`"te acuestas"`, `"a menudo"`) no longer 422 before the Anthropic call; per-token validity, one-miss reconstructs the full corrected phrase. Single-word unchanged.
- **Verb cloze-MCQ stored-in-form gate** (`lib/review-cloze.ts` `chooseQcmCue`, pure + unit-tested) — a verb gets the cloze only when `normalize(target.surface) === normalize(word)`; infinitive-stored verbs use the lemma-level definition-MCQ. Supersedes the intermediate "force cloze for all maskable verbs" over-correction (which made an infinitive-stored blank/option mismatch on 16/45 verbs). Decision lifted out of the inline initializer into a tested helper because the inline version regressed.
- **Écriture word-header removed** (`FillInBlank.tsx`) — the answering screen no longer prints the headword above the sentence.
- (Detail in `PROJECT_STATE.md` → From v0.6.2.)

### v0.6.3 — écriture-polish (NEXT — scoped separately, not open backlog)
- **Clitic-aware masking** — clitic-stored reflexives (`"te duermes"`) currently route to definition-MCQ because `maskVerbSentence` masks only the finite verb token (`duermes` ≠ `te duermes`); mask both tokens (or strip the clitic from the option) so they get a coherent cloze.
- **`maskVerbSentence` accent-homograph false positive** — `dé→de`, `sé→se`, `él→el`, `té→te` accent-fold to function words, so the verb path can mask a preposition/article instead of the verb (confirmed: `dar` blanks `"de"`). Affects **écriture too** (no cue-gate there), so écriture would test the function word. Real `maskVerbSentence` fix.
- **Spanish accent-row** — accent input affordance for the écriture answer field (á/é/í/ó/ú/ñ), so typed conjugations can carry accents (M5.3a noted accents aren't handled in the plain input; near-miss grading currently cushions).

### M5.3b — Astuce de Paco + conjugation table (NOT YET BUILT)
- ④ "Astuce de Paco" post-answer morphology hint; **frame-5** lemma-interstitial conjugation table (the `comieron`→`comer` screen). **Frame 6 rejected** (reintroduces M3.3 duplicate-fiche confusion).
- **HARD REQUIREMENT (carried from M5.3a):** once the conjugator's output is DISPLAYED, it must **refuse to show a paradigm for an untabled/uncertain verb** rather than show a guessed one (the M5.3a "regular-rule fallback is OK because nothing is shown" property no longer holds once forms are displayed). Add an irregular-coverage guard / known-verb gate here.
- May add the persisted `examples[].target = {lemma,tense,person}` field at enrich if the Astuce/table actually need it (deferred from M5.3a).

### M5.3c — Verb-conjugation drill (NOT YET BUILT)
- One game mode: **verb-conjugation drill** (natural first, given the substrate). Multiple sessions / session infra.
- **Format-philosophy note (the coherence principle behind the v0.6.2 gate, carried into M5.3c).** A question may only ask what its materials can coherently test. An MCQ's **options and its blank must be the same morphological form** — so a verb card can form-test via MCQ only when it is stored in the example's form (blank == option, the v0.6.2 cloze case) OR when the option set contains the right **conjugated** wrong-form distractors. Until those exist, an infinitive-stored verb is tested at the **lemma level** (definition-MCQ: meaning, not form). Écriture already form-tests — the user types the conjugation, graded against the blanked token. **M5.3c is what makes form-level MCQ coherent for *any* verb:** the drill generates wrong-FORM distractors (same lemma, wrong tense/person) from the conjugator, so the options finally match a conjugated blank. Form-testing is M5.3c's natural home; the v0.6.2 `chooseQcmCue` gate is the interim that keeps every other path coherent until then. (Corollary: do NOT widen the v0.6.2 gate to force conjugated blanks into the existing semantic-distractor MCQ — that's the incoherence the gate exists to prevent. The fix is conjugated distractors here, not a looser gate.)
> ⚠️ Drafted by Claude Code from this session's decisions — Omar's "text provided separately" was never pasted into the thread. Replace with the intended wording if it differs.

## M6 - App onboarding & login screen upgrade
- App's first opening should trigger an onboarding with interactive steps showing how the app works.
- Login screen should be reworked to have Paco's branded content, to actually allow to login or to create a new account.

## M7 — Companion character
- Visual/voice half shipped in v0.3.3. Remaining: non-pushy, opt-in personalized AI check-ins (small Anthropic call per check-in).
- **Data-gated** — needs ~100+ words before it's meaningful (currently ~72); naturally blocked on accumulation, not dev.

---

### Design-pass standing decisions (apply across M5.x)
- **No streaks** anywhere. Streak counters appeared in ①/⑤ mockups — do not reintroduce.
- ④ correction logic is **ours** — designs do not dictate how answers are graded. The near-miss/typo *display* (Levenshtein, already loaded) is decoupled and can ride whenever `/review` is next opened.
- Terminology unified on **"Mémorisé"** everywhere (filter = "Mémorisés", count = "N mémorisés"). "Maîtrisé" not used.
- Ceremony-fatigue rule: informative-over-celebratory on the per-use path; big editorial moments reserved for genuinely low-frequency events.
- The frame-5 "revu N fois · prochaine révision dans Xj" line is a **free, decoupled** near-term slice (pure `review_cards` data) — can land in the existing interstitial anytime, independent of the conjugator.
