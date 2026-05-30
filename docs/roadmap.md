# Roadmap

The next committed milestones. Items in `docs/backlog.md` are deferred until promoted here.

## M1 — Deploy to Vercel ✅ (v0.1.0)
- Connect GitHub repo to Vercel
- Add env vars (Supabase URL, Supabase anon key, Anthropic key)
- Add Vercel URL to Supabase auth redirects
- Verify auth + add-word + review work on the public URL

## M2 — /add experience overhaul ✅ (v0.2.4)

### M2.1 — Settings + legal + delete account ✅
- Account info + log out + delete account (real implementation, cascades via FK)
- Privacy policy + Terms of use (boilerplate)
- Service-role key infrastructure for admin operations

### M2.2 — Streaming + idiom card scaffold ✅
- Streaming Anthropic response under the hood
- Idiom card UX (placeholder) on /add loading state
- "Voir la définition" reveal flow (no auto-flip)
- AbortController plumbing for cancellation on navigation

### M2.3 — Real idiom cards ✅
- 10 hand-curated Spanish idioms in `data/idioms.json`
- Per-idiom images in `public/idioms/`
- Origin badge with country flag (Espagne, Mexique, Amérique latine, etc.)
- Soft tinted pill style for origin badge

### M2.4 — Tappable distractors → bulk add ✅
- Distractor pills become tappable
- "Tout sélectionner / Tout désélectionner" toggle
- Bulk add via parallel Anthropic calls
- Background processing — user can navigate during add
- Bottom toast for success/error feedback
- Pedagogical hint text under "MOTS SIMILAIRES" section

### M2-polish — iOS + sticky nav + button placement ✅
- iOS Safari input zoom fix (16px font, locked viewport scale)
- Sticky bottom NavBar across all (app) routes
- Confirm button placement on /add input

## M2.5 — Spanish-first definitions ✅ (v0.2.5)
- Schema migration: `definition` becomes `{ es, fr, pos? }` JSONB
- Anthropic prompt update: generates both Spanish and French definitions
- /add result UI: Spanish definition primary, French behind "Voir en français" reveal
- /review MCQ: Spanish definition primary, French reveal counts as a hint
- Backfill script for existing words

## M3 — Friction fixes

### M3.1 — Two-step add flow + duplicate handling ✅ (v0.3.1)
- Two-step add flow with explicit "Ajouter à ma collection" confirmation
- Duplicate word handling (offer "Reset scheduling" instead of silent insert)

### M3.2 — Wordlist-driven spelling correction ✅ (v0.3.2)
- Bundled Spanish dictionary (`dictionary-es` + `nspell`, ~656k accent-preserving inflected forms)
- Autocomplete dropdown on /add input (prefix match, triggers at 2 chars)
- Post-submit spellcheck: exact match → proceed; fuzzy candidates → confirmation UI; no match → hard block
- Fuzzy match: Levenshtein distance via `fastest-levenshtein` against fully-expanded forms, threshold 1 (≤4 chars) / 2 (≥5 chars)
- Deck cache check runs before spellcheck — pre-M3.2 entries always accessible
- Cache hits skip the idiom loading screen and go directly to the word card
- No LLM involved in spellcheck; zero added cost/latency on the common path
- Architectural pivot from original spec: replaced the proposed Haiku-based LLM spellcheck with deterministic wordlist infrastructure
- Known bug deferred to follow-up: accent-tolerant autocomplete prefix matching not actually working (see backlog)

### M3.3 — Lemma normalization ✅ (v0.3.3)

Shipped in three phases. Architectural pivot from original spec: chose Anthropic-supplied lemma over a bundled inflection→lemma dataset. Zero added bundle, perfect accuracy, leverages the enrichment call we were already making.

**M3.3 core — Lemma flow** (initial pass)
- Anthropic enrichment prompt updated to return `lemma` field on every response
- New `lemma_suggestion` phase in /add (interstitial between submit and revealed card)
- Three states: no inflection (`lemma == input` → straight to revealed), suggestion (`lemma != input`, lemma not in deck), collision (lemma in deck)
- Primary CTA "+ Ajouter «<lemma>»" / secondary "Garder «<input>»" / collision adds "Ouvrir «<lemma>»" routing to home dashboard as placeholder
- Schema: `words.lemma` (nullable TEXT)

**M3.3 Phase A — Form annotation polish**
- Fixed correctness bug: pre-A, the "Garder" path saved the inflected form with the lemma's definition and no acknowledgment of the form
- Added `form_annotation` field (compact Spanish, e.g. `"Comer — 3ª pers. plural, pretérito perfecto simple"`) rendered as a FORME section above DÉFINITION on the revealed card and as preview content in the interstitial's previously-empty middle
- Schema: `words.form_annotation` (nullable TEXT)
- Lemma rule binding tightened: `form_annotation == null` iff `lemma == input`
- Save-route error logging fix: `/api/words/save` now `console.error`s underlying Supabase errors instead of swallowing them under a generic 500
- Migration includes `NOTIFY pgrst, 'reload schema';` to prevent PGRST204 cache-stale errors
- Noun-plural normalization accepted (original spec excluded plurals; with form_annotation, normalization is informative rather than mechanical)

**M3.3 Phase B — Instrumentation**
- New `add_events` table with RLS (`user_id`, `event_type` from a 5-value enum, `input_word`, `lemma`, `created_at`)
- New `/api/events/log` endpoint with Zod validation + server-side user_id from session
- Five fire points in /add (all fire-and-forget via `void fetch().catch(console.error)`): `lemma_suggestion_shown`, `lemma_suggestion_accepted`, `lemma_collision_shown`, `lemma_collision_open_existing`, `lemma_collision_add_anyway`
- Collision context tracked via `useRef` with defensive clear at the start of every `handleSubmit` to prevent stale-fire bugs across navigation paths
- Added the "Ouvrir «lemma»" button itself (specced in M3.3 core but not yet implemented — necessary for `open_existing` to have anywhere to fire from)
- Goal: collect production data on lemma flow usage to decide whether to revisit the bundled-dataset option later

## M4 — Word audio + detail view (next)
- ~1-2 sessions
- Audio playback (word only, browser SpeechSynthesis API)
- `/words/[id]` route with rich detail
- Status tag on detail page ("Déjà ajouté" / "En cours d'apprentissage" / etc.)
- Replaces the M3.3 "Ouvrir «lemma»" home-dashboard placeholder with proper detail routing

## M5.0 — My Dictionary view
- ~1-2 sessions
- Home dashboard shows last 10-15 added words with "Voir tout"
- New `/dictionary` route: alphabetical contact-list-style view
- Sort options: alphabetical, by date, by familiarity
- Dictionary tab unlocks at 10 words
- Milestone celebrations at 10, 50, 100, 250, 500, 1000
- Pagination becomes pressing here — 51 words and growing, list-fatigue starting

## M5.1 — Discovery mode ✅ (v0.5.3)
- Topic grid, lightweight generation + enrich-on-keep, reusable swipe deck, bilan; reuse `words` + discovery flag

## M5.2 — New game modes
- Multiple sessions, pick one to start
- TBD between: write-a-sentence, reorder, crosswords, **verb-conjugation drill** (added during M3.3 — drill specific conjugations of a known verb across tense + person)
- Choice deferred until M5.1 ships and real usage informs which is most needed

## M6 — Companion character (post-M5)

**Visual/voice half landed early in v0.3.3** (Paco visual identity rollout, tu voice, mixed Spanish/French celebration phrases — see project state). Remaining scope:

- Multi-session feature
- Non-pushy, opt-in personalized AI feedback (Anthropic check-ins)
- Costs: small Anthropic call per check-in
- Requires sufficient user data (~100+ words) before launching
