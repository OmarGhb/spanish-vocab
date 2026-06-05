# Paco — Backlog

> The repo-canonical backlog (as of v0.6.1 — M5.3a). Items here are not yet scheduled.
> Committed work lives in `docs/roadmap.md`. When a backlog item is promoted to a milestone, it moves out of this file.

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
- **French translation hide/show toggle + synonym / expansion-example work** (parked from v0.6.5 — next slice). Rework how/when the French gloss reveals in review, and add synonym / expanded-example surfacing. Separate from the v0.6.5 hygiene patch.
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
- Verb conjugation exercise mode — drill specific conjugations (tense + person) of a verb the user knows. (Now the verb-conjugation drill under M5.3 in roadmap.)

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
- **Comprehensive A2/B1 regular + stem-changer seeding** of `TRUSTED_LEMMAS` is M5.3b-prep — v0.6.4 seeded the deck regulars + the audited stem-changers/irregulars only. Trusted-set coverage = how often M5.3b's table actually appears, so expand it there with a vetted fixture.

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

  _(The desktop / wide-viewport + content↔nav edge-alignment item was **resolved by M5.2** —
  the top nav lives inside the `max-w-[430px]` column so nav and content share edges by
  construction. Removed from the backlog.)_
