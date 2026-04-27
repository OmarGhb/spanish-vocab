> Items here are not yet scheduled. Committed work lives in `docs/roadmap.md`.
> When a backlog item is promoted to a milestone, it moves out of this file.

# Backlog

Captured product ideas, ranked by milestone they might land in.
Don't act on any of these — just preserve them.

## Post-v1 (after review loop is solid)

### Lemma normalization
"alguna" → suggest "alguno"; "comieron" → suggest "comer"
Same UX as spelling correction: candidates + user confirms.

## Captured during milestone 4 + design planning

### From milestone 4 QA findings
- **Lemma normalization:** "alguna" → suggest "alguno"; "comieron" → suggest "comer". Same UX as spelling correction.
- **Spanish-first definitions for MCQ:** show definition in Spanish, user can click "Voir en français" (counts as a hint, downgrades rating). Requires generating both languages + schema migration.
- **Keyboard shortcuts in review:** 1/2/3/4 for rating buttons, H for hint, Enter to confirm.
- **Mobile review polish** — deferred until app is deployed publicly (Vercel).

### From the design integration milestone
- **Real wiring for Discovery mode:** swipe gesture logic, recording "known" / "to learn" state, schema decision on which table records this.
- **Session streak / XP counters** mentioned in design chat — defer until we have real usage data on whether they help.
- **Search / filter** on word list.

## Captured during milestone 5 (design implementation)

### Auto-suggest as the user types
When the user has typed ≥ 2–3 characters in the "Nouveau mot" input, show a dropdown of matching Spanish words (from a local dictionary or an API). Tapping a suggestion fills the input. Goal: reduce typing friction + catch the canonical lemma before submitting.
