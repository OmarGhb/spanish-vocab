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

## M2.5 — Spanish-first definitions
- ~2-3 sessions
- Schema migration: `definition` becomes `{ es, fr }` or two columns
- Anthropic prompt update: generate both Spanish and French definitions
- /add result UI: show Spanish definition primary, French as "Voir traduction" reveal
- /review MCQ: Spanish definition primary
- Backfill strategy for existing words (one-time script ~$0.10 in API)

## M3 — Friction fixes

### M3.1 — Two-step add flow + duplicate handling ✅
- Two-step add flow with explicit "Ajouter à ma collection" confirmation
- Duplicate word handling (offer "Reset scheduling" instead of silent insert)

### M3.2 — Wordlist-driven spelling correction ✅
- Bundled Spanish wordlist (~636 k inflected forms via `an-array-of-spanish-words`)
- Autocomplete dropdown on /add input (prefix match, triggers at 2 chars)
- Post-submit spellcheck: exact match → proceed; fuzzy candidates → confirmation UI; no match → hard block
- Fuzzy match: Levenshtein distance via `fastest-levenshtein`, threshold 1 (≤4 chars) / 2 (≥5 chars)
- Deck cache check runs before spellcheck — pre-M3.2 entries always accessible
- Cache hits skip the idiom loading screen and go directly to the word card
- No LLM involved in spellcheck; zero added cost/latency on the common path

### M3.3 — Lemma normalization (upcoming)
- Lemma normalization ("alguna" → suggest "alguno"; "comieron" → suggest "comer")
- Inflection collision detection (warning when conjugation of known lemma is added)
- Uses same wordlist infrastructure as M3.2 + inflection-to-lemma mapping

## M4 — Word audio + detail view
- ~1-2 sessions
- Audio playback (word only, browser SpeechSynthesis API)
- `/words/[id]` route with rich detail
- Status tag on detail page ("Déjà ajouté" / "En cours d'apprentissage" / etc.)

## M5.0 — My Dictionary view
- ~1-2 sessions
- Home dashboard shows last 10-15 added words with "Voir tout"
- New `/dictionary` route: alphabetical contact-list-style view
- Sort options: alphabetical, by date, by familiarity
- Dictionary tab unlocks at 10 words
- Milestone celebrations at 10, 50, 100, 250, 500, 1000

## M5.1 — Discovery mode
- ~2 sessions
- Topic selection screen (comida, fiesta, trabajo, etc.)
- Swipe deck for "knew it / learn it"
- Schema decision: where do "discovered" words live

## M5.2 — New game modes
- Multiple sessions, pick one to start
- TBD between: write-a-sentence, reorder, crosswords
- Choice deferred until M5.1 ships and real usage informs which is most needed

## M6 — Companion character (post-M5)
- Multi-session feature
- Non-pushy, opt-in character with personalized AI feedback
- Visual identity: Spanish/Latin American dog breed (see backlog for candidates)
- Costs: small Anthropic call per check-in
- Requires sufficient user data (~100+ words) before launching