# Roadmap

The next committed milestones. Items in `docs/backlog.md` are deferred until promoted here.

> Re-sequenced after the M5 design pass (7 design boards reviewed) + the pill-tab nav deferral.
> The original monolithic **M5.0** was split into **M5.0a–d** (M5.0d later **dropped** — its
> interim conjugation fix folded into M5.3 to avoid throwaway code). The original **M5.2 (game
> modes)** was renumbered to **M5.3**. Pill-tab nav was inserted as **M5.2** (deferred to after
> M5.1 by explicit call).

## Working slate — re-sequenced at v0.6.7

The committed order from here (detail for each lives in its section below or in `backlog.md`):

- **NOW:** M5.3c verb drill ✅ (shipped) · **List management** — M5.4a free-text search + load-on-scroll ✅ (shipped), M5.4b per-word delete + undo + Relearn ✅ (shipped), **M5.4c bulk / multi-select** (next), **archive** (soft-delete + `archived` column, deferred).
- **PRE-BETA:** Full **design pass** (incl. the parked Astuce/tip redesign + request more Paco moods/placements from Claude Design) · **Language balance / immersion toggle** (FR/ES chrome; **English DEFERRED** — the co-students are Francophone) · **M6 login + onboarding** (built on the i18n layer) · **Signup hardening** (**re-enable Supabase email verification** + empty states) · **A2/B1 coverage seeding** (expand `TRUSTED_LEMMAS` — coverage = how often the table/drill can appear) · **Learning-curve review + blank reviews** (analysis-first) · **M5.3d compound (perfect) tenses** for the drill + grid (*he comido* / *había comido* — **IMPORTANT, A2** core; needs `haber` verified).
- **STRATEGIC:** **Crossword** (scoping → build; shares the (iii) generation + cache layer with the drill) · **Native apps** Android + iOS (**approach decision FIRST — Capacitor / PWA / rewrite** — then build).
- **LATER:** **English UI** · **M7 companion** (data-gated on ~100+ words).

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

### v0.6.3 — écriture-polish ✅
Five commits (each diagnosed against the real deck first). Suite 161 → 181.
- **#2 accent-homograph denylist** (`lib/mask.ts`) — the masker never selects a function-word homograph (`de/se/esta/…`) as the verb form, so `dar` masks `"dio"` not the preposition `"de"`. Root cause was deeper than accent-folding: the conjugator also emits **unaccented usted-imperatives** (`de`/`esta`) that sit in the exact map. Guards écriture too.
- **#1 clitic-aware masking** (`maskProcliticReflexive`) — proclitic-reflexive stored words (`"te levantas"`) mask the full clitic+verb unit, `target.surface == word` → coherent cloze-MCQ with full-reflexive options. Reuses the #2-hardened masker (the clitic is denylisted there, so it's never chosen as the verb; #1 extends the matched verb's blank leftward — the #1 × #2 composition). lemma passed raw. Backfill (`scripts/backfill-reflexive-lemmas.ts`, applied): `te levantas/te sientas/te duermes`.
- **#3 reps rotation** (`pickClozeExample`) — cycles the example among the maskable ones across reviews (was first-maskable always); format stays per-card stable (cue from a reps-independent pick).
- **#4 desktop accent-row** (`AccentBar.tsx`) — `á é í ó ú ñ ü` inserts at the caret in the écriture field; desktop-only (`(pointer:fine)` via `useSyncExternalStore`), hidden on touch.
- **#5 prefer the coherent example** (`pickClozeExample`) — among maskable examples, prefer those whose masked form == the stored word, so a mixed example set (`te duermes` vs a `me dormiría` sentence) masks its own form. Deck delta: **6 verb cards definition→cloze, 0 reverse** (monotonic).
- (Detail in `PROJECT_STATE.md` → From v0.6.3.)
- ~~**Known limit:** `te sientas` stays definition-MCQ~~ **RESOLVED in v0.6.4** (sentar e→ie stem added → auto-upgraded to cloze-MCQ).

### v0.6.4 — Conjugator hardening ✅ (standalone slice ahead of M5.3b)
Audit-first (live deck 51 verbs + the tabled set), then the fix. Suite 181 → 298.
- **Finding 1 (systemic):** `imperativeAffirmative` + the negative-imperative branch bypassed `IRREGULAR_FORMS` (built on rule-computed `present()`/`subjunctive()`), so **all 16** fully-irregular verbs had wrong imperatives (`ser`→`"sa"`, `dar`→`"de"`, `estar`→`"este"`…). Rerouted both through `formsFor` (table-aware); `IRREG_IMP_TU` affirmative-tú preserved; `ir` affirmative-nosotros special-cased to `"vamos"` (negative stays `"no vayamos"`).
- **Display-guard primitive** `canDisplayParadigm(lemma)` — conservative allowlist (`TRUSTED_LEMMAS`); true only for full-paradigm reference-verified verbs, false for untabled/uncertain (the guessed-regular-for-irregular trap) — the primitive M5.3b/c consume. **No UI consumer in this slice.**
- **Stem-change expansion:** sentar + despertar/encender/mentir (e→ie), acostar/mostrar/recordar/costar/soñar/almorzar/mover/doler (o→ue), vestir/seguir/conseguir (e→i, incl. `-guir` gu→g ortho).
- **Self-verifying harness:** golden fixture (`lib/conjugator.expected.ts`, reference-authored) + clean-room `regularReference()` for deck regulars; data-driven test asserts every cell == `conjugate()` and `TRUSTED_LEMMAS` is exactly the verified union. Excluded + logged: haber, poder, creer, llover. (Detail in `PROJECT_STATE.md` → From v0.6.4.)

### v0.6.5 — two review/add hygiene bugs ✅ (from v0.6.4 smoke-testing)
Small patch, single commit. Suite 298 → 316.
- **Result-screen example threading** — the écriture result "Exemple" re-read `card.examples[0]` while the exercise masked the reps-rotated / prefer-coherent `picked.example`; they diverged. Lifted into a tested pure helper `resultHintExample(picked, card)` (not inlined — the `chooseQcmCue` lesson). `MultipleChoice` checked: no divergence.
- **Reflexive-clitic correction** — `"ti acuestas"` passed the per-token spellcheck (grammatical, not lexical, malformation) and was stored as the headword. `correctProcliticReflexive` (`lib/reflexive.ts`, deterministic, conjugator-free) corrects the proclitic against the person→clitic map; detection (valid set `{me,te,se,nos,os}`) split from correction (person parse), degrading to the lemma — never the typo — on annotation drift. Wired in `enrich/route.ts` (response `word` + TTS regen). (Detail in `PROJECT_STATE.md` → From v0.6.5.)

### M5.3b — Astuce de Paco + conjugation table
**Conjugation-table half ✅ (v0.6.6)** · Astuce-de-Paco /review hint **PARKED PENDING DESIGN** (the ④ post-answer morphology tip — including the richer ¡Casi! "racine devient pud-" explanation — waits on the tip redesign in the pre-beta design pass; it will mount the same `ConjugationGrid`).
- **✅ frame-5 lemma-interstitial conjugation table** (the `estudié`→`estudiar` screen) — the 2-col/3-row paradigm of the typed form's tense, typed cell in amber, added to the existing `/add` lemma interstitial (additive, not a rebuild). Body blends mockup **B** (calm reference framing — no "Bonne nouvelle" celebration banner, per the ceremony-fatigue standing decision) with mockup **A**'s grid + review-status line. Kept the current top pill nav (mockups showed the pre-v0.5.4 bottom nav). **Frame 6 rejected** (reintroduces M3.3 duplicate-fiche confusion).
- **✅ HARD REQUIREMENT met (carried from M5.3a):** the grid renders ONLY when `canDisplayParadigm(lemma)` is true (v0.6.4 display guard) AND the typed form's tense resolves to a finite six-person tense that contains it; any untabled/uncertain verb → no grid (today's screen unchanged). Never shows a guessed paradigm. Live hit rate **42/48 verb-pos deck words (87.5%)** — the 6 misses are all known/logged exclusions (`andar`/`conocer`/`crecer` untabled, `creer`/`haber`/`acordar` excluded-and-logged), not guard misfires.
- **✅ tested pure helper** `lib/conjugation-grid.ts` (tense resolution from `form_annotation` + six-cell selection + multi-highlight for syncretic tenses + tense-label map) — never inline in the component (the `chooseQcmCue`/`resultHintExample` lesson). Reusable `app/(app)/ConjugationGrid.tsx` (the later Astuce slice mounts the same component; NOT wired into /review here). The review-status line ("Tu as revu N fois · prochaine révision dans X j") is pure `review_cards` data threaded via optional `lemma_reps`/`lemma_due` on enrich, shown only when the lemma is already in the deck.
- **Decisions:** imperative-labeled + non-finite (gerundio/participio) inflected adds → no grid (no clean six-person table); syncretic tenses (imperfecto/condicional/subjPresente, yo == él/ella) highlight BOTH cells (honest — the form is genuinely ambiguous); a typed surface that matches no cell of the resolved tense → no grid (coherence, same principle as the cloze-only-when-masked-token==stored gate). The in-deck "déjà dans ta collection" tint box was replaced by the quiet review-status line (design-driven).
- **Astuce-de-Paco /review hint** (the ④ post-answer morphology tip) — **PARKED PENDING DESIGN** (folded into the pre-beta tip redesign); mounts the same `ConjugationGrid` component. May add the persisted `examples[].target = {lemma,tense,person}` field at enrich if the Astuce actually needs it (deferred from M5.3a).
- **Pre-beta gate flagged:** comprehensive A2/B1 `TRUSTED_LEMMAS` seeding is now a **REQUIRED pre-beta-handover gate** (`backlog.md`) — coverage = how often the table/drill can appear; `conocer`/`crecer`/`andar` are the surfaced near-term candidates.

### M5.3c — Verb-conjugation drill ✅ (v0.6.7)
- **Shipped:** Paco's first game mode — a self-contained practice flow at `/drill` (Home `DrillCard` → Setup → 10 prompts, prompt→result manual-advance → Recap), gated on ≥5 trusted deck verbs. The `(ii)` trigger-frame format. **Pure practice — no FSRS** (never writes review_logs / touches review_cards). All logic in the pure tested `lib/drill.ts` (pool/unlock gate · prompt builder, prefer-unique-then-repeat-to-10 · the single swappable `triggerFrame` seam · strict grading via the existing `classifyVerbBlank`, 4 qualities → 3 verdicts · deterministic teaching line via accent-exact `paradigm` matching). Reuses `AnswerBlank` + desktop-only `AccentBar` + `ResultReveal` + the v0.6.6 `ConjugationGrid` (new `buildConjugationGridForTense` builder) for the hint sheet. Drill prefs (tenses + person scope) persisted to `profiles`. Reflexives + untrusted verbs excluded from the pool; the conjugator is untouched. **Follow-up polish (pre-tag):** grammar terms shown in accented Spanish everywhere (chips/headers/cue/recap — `Presente·Pretérito·Imperfecto·Futuro·Condicional·Subjuntivo`); cue shows `verb·person·tense`; conjugation table on all three result screens; conditional frame "En ese caso,"; the "unselected tense" report diagnosed as a display defect (raw key on the result header), filter proven correct + lock-tested. (Detail in `PROJECT_STATE.md` → From v0.6.7.)
- **Deferrals (logged below + in `backlog.md`):** drill "new verbs" (outside the deck) ⇐ A2/B1 coverage seeding; (iii) full generated sentences = the shared generation/cache layer (crossword shares it; only `triggerFrame` swaps); richer ¡Casi! morphology = the parked Astuce tip redesign. No game-mode selector (Home-card entry only — a selector waits for a 2nd mode).
- **Original framing (for reference):** verb-conjugation drill (natural first, given the substrate); multiple sessions / session infra.
- **Format-philosophy note (canonical).** M5.3c — review formats: cue must match the answer's level. Inflected-form cards → cloze; lemma/infinitive cards → definition for MCQ, or cloze for écriture (type the conjugation). Interim gate (shipped): verb cloze-MCQ only when masked-token == stored-word, else definition-MCQ. Cloze-MCQ for verbs uses conjugator-generated wrong-FORM distractors (conozco/conoces/conoció/conocer) so options match the blank — lets infinitive-stored verbs do a coherent form-test MCQ. Verb format leans écriture (production); cloze-MCQ is the gentler recognition rung for new/low-stability cards. Non-verbs keep definition-MCQ but stay eligible for cloze-écriture.
- **GATE — conjugator hardening: ✅ DONE in v0.6.4** (was ⛔ blocking). The two prerequisites are met: (1) the **display guard exists** — `canDisplayParadigm(lemma)` returns false for any untabled/uncertain verb; M5.3c wires it into the drill + distractor generation (refuse to prompt/distract on a verb the guard rejects). (2) The **tabled irregulars are fixed** — the systemic imperative-table-bypass (all 16 irregulars) + the stem-change set (sentar/seguir/… ). **Remaining M5.3c conjugator work is wiring, not correctness:** consume `canDisplayParadigm` at the drill/distractor seam, and source wrong-FORM distractors only from trusted paradigms. Expand `TRUSTED_LEMMAS` coverage (with a vetted fixture) as needed for drill breadth — coverage = how often the drill can offer a given verb.

### M5.3d — Compound (perfect) tenses for the drill + grid (committed; not built)
- **Compound (perfect) tenses for the drill + grid:** pretérito perfecto compuesto (*he comido*) + pluscuamperfecto (*había comido*). **IMPORTANT — A2, core for the beta cohort.**
- **Scope:** compose `conjugate(haber, <matching simple tense>, person)` + the participle (`conjugate(verb, 'participio')`). **PREREQUISITE:** verify `haber`'s auxiliary forms — `haber` is excluded from the v0.6.4 golden fixture (`canDisplayParadigm('haber')` is false), so its paradigm must be reference-verified + admitted before it can drive displayed/drilled compound forms.
- **Drill + grid ONLY** — these introduce **two-word cells** (grid) and **multi-word grading** (drill answer = `he comido`). Leave the `/review` masker untouched (single-token blanks). New `DrillTense`-adjacent keys would need the two-word answer/grid handling; keep them out of `buildDrillPrompts`' single-token finite set until that lands.
- Pairs with the PRE-BETA **A2/B1 coverage seeding** gate. Not built now.

## M5.4 — List management

### M5.4a — /words list scale: free-text search + load-on-scroll ✅ (v0.7.0)
- **Forgiving free-text search** over the FULL already-fetched deck — a search input above the filter pills (`text-base` 16px, the iOS zoom-lock rule). Matches the Spanish word AND both glosses (`definition.es` + `definition.fr`); `normalizeSearch` = lowercase + NFD diacritic-strip so "bebi"→"bebí", "nino"→"niño" (the plain strip folds ñ→n — wanted here, the opposite of `lib/dictionary.ts`'s Ñ-preserving bucketing guard). Pure tested predicate `lib/word-search.ts` (not inlined — the `chooseQcmCue` lesson). Composition: **filter pill → search → sort → render** (search narrows the active pill, doesn't reset it). Empty results → "Aucun résultat".
- **Load-on-scroll (progressive append, NOT virtualization).** Initial 40 rows, +30 when a bottom sentinel hits the viewport via IntersectionObserver (not scroll events). `list.slice(0, shown)`; no new fetch, no react-window dep. Cap resets to the initial chunk on any visible-set change (filter / search / sort); default date-desc → initial chunk = newest N.
- **All client-side over the already-fetched list** — NO schema, NO new API route, NO server pagination. `page.tsx` threads `defFr` onto `WordListItem` for the predicate (never rendered — Spanish-first). (Detail in `PROJECT_STATE.md` → From M5.4a.)
- **Out of scope (later M5.4 slices):** swipe delete/archive, Relearn/reset-a-word, bulk/multi-select, `archived` schema column, server pagination.

### M5.4b — /words per-word actions: delete + undo + Relearn ✅ (v0.7.1)
- **Single-word `DELETE /api/words/[id]`** — RLS + explicit `user_id` scope; FK cascade verified against the live schema (`review_cards.word_id → words`, `review_logs.card_id → review_cards` both CASCADE), so no manual child cleanup / no migration. Error `console.error`d (M3.3 convention).
- **Deferred-delete + undo-toast primitive** (`app/(app)/DeferredDelete.tsx`) — a layout-level provider (sibling of `FocusModeProvider`) so the toast/timer survive a detail→list navigation. **Set-shaped** (`scheduleDelete({ ids, labels })`, 1 here / N in M5.4c) but NO batch route or bulk UI built. Optimistic-remove via a provider-owned `hiddenIds` Set (`/words` renders `items` minus it → undo + deterministic re-sort fall out for free); ~5s timer; commit fires the DELETE(s) + `router.refresh()`; unmount clears the timer WITHOUT committing (word survives). Folded in the backlog `select-none` toast item.
- **Swipe-to-reveal delete** (`SwipeRow.tsx`) — reveal-and-tap (NOT the discovery `SwipeCard` fling-commit; a fresh component, pure snap math in tested `lib/swipe-row.ts`), wraps the unchanged `WordRow` (new `asListItem` prop avoids nested `<li>`). Single-open-row, closes on scroll / outside tap; composes with 4a (optimistic removal doesn't reset the scroll cap).
- **Detail-page Delete + Relearn** — Delete → primitive → back to `/words` (toast carries over); Relearn → `reset-schedule` (= reschedule-only → **no confirm modal**, consequence copy; New-card graceful no-op).
- **Out of scope → M5.4c:** bulk / multi-select / select-all + a batch delete endpoint; archive/soft-delete schema; swipe on the detail page.

## M6 - App onboarding & login screen upgrade
- App's first opening should trigger an onboarding with interactive steps showing how the app works.
- Login screen should be reworked to have Paco's branded content, to actually allow to login or to create a new account.
- **Collect a real display name → replace the placeholder.** The drill recap ("¡Muy bien, {name}!") currently derives the name from the email local-part via `displayNameFromEmail` (`lib/display-name.ts`) as a placeholder. Onboarding should capture a real name, store it on `profiles`, and swap **only that helper's source** (read the stored name, fall back to the email derivation) — every name surface already reads through the helper, so no call sites to chase. (Detail in `backlog.md` → Onboarding.)

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
