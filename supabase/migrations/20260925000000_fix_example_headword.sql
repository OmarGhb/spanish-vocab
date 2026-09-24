-- Roadmap 8b — deck examples that do not contain their own headword (DATA ONLY).
--
-- Two curated seed rows carry an `example_es` that never contains the word it is an example OF:
--   cuerpo/oreja    "Le susurró algo al oído."   -> `oído` is a DIFFERENT word (inner ear/hearing)
--   esencial/malo   "Hace mal tiempo hoy."       -> `mal` is the apocope; the string `malo` is absent
--
-- Consequence: `maskSentence` (lib/mask.ts) matches neither exactly (S1) nor on its 4-char stem (S2),
-- so `pickClozeExample` returns null and FillInBlank falls back to its definition prompt. The card
-- still drills — it just never gets a SENTENCE, and the authored example is dead weight in review.
-- The example is also rendered verbatim on the discovery card and the word-detail page, where a
-- learner sees an example that does not contain the word.
--
-- Both predate the M2.5 prompt rule ("The target word must appear verbatim in the Spanish
-- sentence"); they come from the hand-curated seed, which never passed through that prompt.
--
-- A full sweep of all 672 rows found no other row of this kind. Five further rows cannot be masked
-- either, but for a different reason — the example DOES contain a valid inflected form and the
-- masker cannot reach it (oler, reír x2, echar de menos, darse cuenta: untrusted lemmas and phrase
-- lemmas). That is a conjugator/masker coverage gap, tracked separately as roadmap item 8d, and
-- deliberately NOT patched by rewriting sentences here.
--
-- ⚠️ This is the FIRST French content change since the byte-identity invariant (v0.12.30). It is
-- confined to two rows by construction: the pool UPDATE keys on two literal (theme_key, word) pairs,
-- and the `words` backfill additionally requires the stored example to still be the exact old
-- string. `lib/__fixtures__/prompt-golden.txt` covers the FR prompts and the idiom FR fields, not
-- pool rows, so it is unaffected and must still verify MATCH.
--
-- Both statements MERGE rather than rebuild, so any key added to these JSONB objects in future
-- (a third locale, audio, a sense tag) survives this migration untouched.

-- ── 1. The canonical pool rows ──────────────────────────────────────────────────────────────────
UPDATE discovery_pool AS p
SET example = p.example || jsonb_build_object('es', v.es, 'fr', v.fr, 'en', v.en)
FROM (VALUES
  ('cuerpo','oreja','Lleva un pendiente en la oreja.',
     'Elle porte une boucle à l''oreille.','She wears an earring in her ear.'),
  ('esencial','malo','Este libro es muy malo.',
     'Ce livre est très mauvais.','This book is very bad.')
) AS v(theme_key, word, es, fr, en)
WHERE p.theme_key = v.theme_key AND lower(p.word) = lower(v.word);

-- ── 2. Copies already saved into users' decks ───────────────────────────────────────────────────
-- The discovery draw copies the example BY VALUE (lib/discovery-server.ts `insertPendingCards`
-- writes `examples: [c.example]`), so fixing the pool alone would leave every already-drawn card
-- degraded forever. Guarded twice: only element 0 is touched (jsonb_set on '{0}'), and only when
-- that element's `es` is still exactly the string being replaced — so a user-edited row, or one
-- sourced from live generation rather than the pool, is left alone.
UPDATE words AS w
SET examples = jsonb_set(w.examples, '{0}', w.examples->0 || jsonb_build_object('es', v.es, 'fr', v.fr, 'en', v.en))
FROM (VALUES
  ('oreja','Le susurró algo al oído.','Lleva un pendiente en la oreja.',
     'Elle porte une boucle à l''oreille.','She wears an earring in her ear.'),
  ('malo','Hace mal tiempo hoy.','Este libro es muy malo.',
     'Ce livre est très mauvais.','This book is very bad.')
) AS v(word, old_es, es, fr, en)
WHERE lower(w.word) = v.word
  AND w.examples->0->>'es' = v.old_es;

NOTIFY pgrst, 'reload schema';

-- ── Verification ────────────────────────────────────────────────────────────────────────────────
--
-- Before applying, to size the user impact (read-only):
--
--   SELECT w.word, count(*) AS rows, count(DISTINCT w.user_id) AS users
--   FROM words w
--   WHERE lower(w.word) IN ('oreja','malo')
--     AND w.examples->0->>'es' IN ('Le susurró algo al oído.', 'Hace mal tiempo hoy.')
--   GROUP BY w.word ORDER BY rows DESC;
--
-- After applying, BOTH must return 0:
--
--   SELECT count(*) FROM discovery_pool
--   WHERE (theme_key, lower(word)) IN (('cuerpo','oreja'), ('esencial','malo'))
--     AND position(lower(word) in lower(example->>'es')) = 0;
--
--   SELECT count(*) FROM words
--   WHERE examples->0->>'es' IN ('Le susurró algo al oído.', 'Hace mal tiempo hoy.');
--
-- Idempotent: a replay writes identical values, and the `words` guard stops matching once rewritten.
