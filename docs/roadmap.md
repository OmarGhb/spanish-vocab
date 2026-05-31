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

## M5.2b — Dictionary route + unlock gate
- ~0.5–1 session. `/dictionary` alphabetical route + 10-word unlock gate (split from M5.2). Open: what `/dictionary` is (browsable reference vs A-Z of own deck) + its entry point (not one of the five pills).

## M5.3 — Game modes + conjugation substrate
- Multiple sessions
- **OPENER: deterministic Spanish conjugator** (rule engine + irregular table), POS-gated to verbs via `definition.pos`. Library validated by Claude Code at plan time. **Not LLM-sourced** — same lesson as M3.2 (wordlist beat LLM), higher stakes (a wrong conjugation taught to a learner is real harm).
- Inflection-tolerant matching built on the paradigm — the conjugation-mismatch fix lives here **in full** (no interim; M5.0d was dropped)
- ④ "Astuce de Paco" morphology hint; **frame-5** lemma-interstitial conjugation table (the `comieron`→`comer` screen). **Frame 6 rejected** (reintroduces the M3.3 duplicate-fiche confusion).
- Then one game mode: **verb-conjugation drill** (natural first, given the substrate)
- Substrate feeds four things: this interstitial table, the ④ hint, the inflection fix, and the drill — one investment, four payoffs

## M6 — Companion character (post-M5)
- Visual/voice half shipped in v0.3.3. Remaining: non-pushy, opt-in personalized AI check-ins (small Anthropic call per check-in).
- **Data-gated** — needs ~100+ words before it's meaningful (currently ~72); naturally blocked on accumulation, not dev.

---

### Design-pass standing decisions (apply across M5.x)
- **No streaks** anywhere. Streak counters appeared in ①/⑤ mockups — do not reintroduce.
- ④ correction logic is **ours** — designs do not dictate how answers are graded. The near-miss/typo *display* (Levenshtein, already loaded) is decoupled and can ride whenever `/review` is next opened.
- Terminology unified on **"Mémorisé"** everywhere (filter = "Mémorisés", count = "N mémorisés"). "Maîtrisé" not used.
- Ceremony-fatigue rule: informative-over-celebratory on the per-use path; big editorial moments reserved for genuinely low-frequency events.
- The frame-5 "revu N fois · prochaine révision dans Xj" line is a **free, decoupled** near-term slice (pure `review_cards` data) — can land in the existing interstitial anytime, independent of the conjugator.
