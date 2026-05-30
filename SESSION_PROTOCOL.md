# Session Protocol — lessons learned

Hard-won lessons from past sessions. Read before making schema or data-layer changes.

## Lessons

### A UNIQUE constraint on an FK column flips PostgREST embed cardinality

Adding a `UNIQUE` (or unique index) on the foreign-key column of a child table changes
how PostgREST infers the relationship: a `to-many` relationship (embed returns an
**array**) becomes `to-one` (embed returns a **single object**, or `null`).

This silently breaks every embed read that indexes the array — `data.child[0]`,
`cards?.[0]`, `as Child[]` — because the value is no longer an array. The query still
succeeds and rows still return, so it looks like a cosmetic/null-data bug, not a schema
change. (M5.1: adding `UNIQUE(review_cards.word_id)` made `words → review_cards` to-one;
the whole `/words` list silently showed every word as "Nouveau / 0 révision".)

**Rule:** when adding a UNIQUE/identity constraint to an FK column, audit **every** embed
read of that relationship (`grep` the table name in `.select(...)` embeds and every
`[0]` / array-typed read of it) and normalize the read to tolerate both shapes — e.g.
`oneEmbed()` in `lib/word-status.ts`:

```ts
export function oneEmbed<T>(embed: T | T[] | null | undefined): T | null {
  if (Array.isArray(embed)) return embed[0] ?? null
  return embed ?? null
}
```

Normalizing (rather than dropping the constraint) is the correct end state when the
to-one cardinality is a true invariant: PostgREST is now reading the relationship
correctly, and the old array-indexing was relying on the prior to-many mis-inference.
