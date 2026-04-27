# Roadmap

The next committed milestones. Items in `docs/backlog.md` are deferred until promoted here.

## M1 — Deploy to Vercel
- ~1 session, ~30-60 min
- Connect GitHub repo to Vercel
- Add env vars (Supabase URL, Supabase anon key, Anthropic key)
- Add Vercel URL to Supabase auth redirects
- Verify auth + add-word + review work on the public URL
- Custom domain deferred

## M2 — /add experience overhaul
- ~2-3 sessions
- Streaming response from Anthropic on word creation
- Tappable distractors → bulk add (1 tap adds selected words to deck)
- Idiom cards on loading screen
  - ~50 hand-curated Spanish idioms
  - Each card: phrase, literal translation, real meaning, origin/usage anecdote, image
  - Conversational voice, not encyclopedic
  - Curation lives in `docs/idioms.md` (created during this milestone)
- Settings page
  - Account info + log out
  - Delete account (real implementation, cascades via FK)
  - Privacy policy + Terms of use (boilerplate placeholder pages)

## M3 — Friction fixes
- ~1-2 sessions
- Duplicate word handling (don't insert; offer "Reset scheduling")
- Spelling correction confirmation flow
- Single-Enter submission in review (review what's already done first)
- Pre-fix legacy data backfill

## M4 — Word audio + detail view
- ~1-2 sessions
- Audio playback (word only, not examples or definition)
- `/words/[id]` route with rich detail
- Bundles audio button onto the detail page

## M5.1 — Discovery mode
- ~2 sessions
- Topic selection screen (comida, fiesta, trabajo, etc.)
- Swipe deck for "knew it / learn it"
- Schema decision: where do "discovered" words live (new column vs new table)

## M5.2 — New game modes
- Multiple sessions, pick one to start
- TBD between: write-a-sentence, reorder, crosswords
- Choice deferred until M5.1 ships and real usage informs which is most needed
