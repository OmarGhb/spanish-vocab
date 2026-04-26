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
