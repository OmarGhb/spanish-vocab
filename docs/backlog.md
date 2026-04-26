# Backlog

Captured product ideas, ranked by milestone they might land in.
Don't act on any of these — just preserve them.

## Post-v1 (after review loop is solid)

### Spelling correction flow
When user submits a word, before calling Anthropic for the full lookup:
- Quick LLM check: "is this likely a misspelling?"
- If yes, return 3–5 candidate corrections + the literal input
- User picks one (or confirms original) before the expensive enrichment call
- Saves Anthropic tokens, prevents silently learning the wrong word

### Duplicate word handling
On submit, if the word already exists in user's deck:
- Default: do not insert a new row, show "you already have this"
- Offer: "Reset scheduling and review again?" → updates `review_cards.due` to now, keeps history in `review_logs`
- Edge case: same word, different sense (e.g., banco = bank/bench)
  → maybe allow forced "add as new entry" with a sense label

### Lemma normalization
"alguna" → suggest "alguno"; "comieron" → suggest "comer"
Same UX as spelling correction: candidates + user confirms.

## Captured during milestone 4 + design planning

### Pending UX polish for review flow
- **Single-Enter submission:** Currently the flow needs Tab/click then Enter to confirm rating. Better UX: pressing Enter from the input both submits the answer AND auto-confirms the suggested rating after a brief reveal pause (~800ms). Single-Enter advance.
- **Skip rating for trusted suggestions:** if user accepts the suggested rating 5+ times in a row, offer a "trust suggestions" toggle that auto-confirms with a 300ms reveal animation.

### Pre-fix legacy data
Words added before milestone 4's prompt update may have weak examples that the masker fails on (alguna, soler, possibly amenecer). Two options:
- Delete and re-add manually as you encounter them
- One-time backfill script that regenerates old examples with the new prompt (~$0.05 in API cost)

### From milestone 4 QA findings
- **Spelling correction confirmation flow:** before calling Anthropic for full enrichment, quick LLM check "is this likely a misspelling?" → if yes, show 3–5 candidate corrections + literal input → user confirms before the expensive call.
- **Duplicate word handling:** on submit if word exists, default "you already have this" + offer "Reset scheduling and review again?" (updates `review_cards.due` to now).
- **Lemma normalization:** "alguna" → suggest "alguno"; "comieron" → suggest "comer". Same UX as spelling correction.
- **Spanish-first definitions for MCQ:** show definition in Spanish, user can click "Voir en français" (counts as a hint, downgrades rating). Requires generating both languages + schema migration.
- **Audio playback** of Spanish examples (browser SpeechSynthesis API for v1).
- **Keyboard shortcuts in review:** 1/2/3/4 for rating buttons, H for hint, Enter to confirm.
- **Mobile review polish** — deferred until app is deployed publicly (Vercel).

### From the design integration milestone
- **Real wiring for home dashboard:** Supabase queries for word count + due count.
- **Real wiring for Discovery mode:** swipe gesture logic, recording "known" / "to learn" state, schema decision on which table records this.
- **Word detail view:** /words/[id] route or modal for the DefinitionCard component.
- **Session streak / XP counters** mentioned in design chat — defer until we have real usage data on whether they help.
- **Search / filter** on word list.
