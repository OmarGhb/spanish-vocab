# Roadmap 8b — before/after capture

The **first French content change since the byte-identity invariant** (v0.12.30). Committed as an
auditable record: `lib/__fixtures__/prompt-golden.txt` pins the FR *prompts* and the *idiom* FR
fields, but nothing pinned `discovery_pool` row content, so this file is the small-scale analogue —
every field of every changed row, in all three languages, before and after.

Applied by `supabase/migrations/20260925000000_fix_example_headword.sql`. Only `example` changes;
`theme_key`, `word`, `fr`, `en`, `pos`, `gender`, `band`, `fill_source` and `status` are untouched.

---

## cuerpo / oreja

Glosses (unchanged): `fr` = *oreille* · `en` = *ear (outer)*

| | value |
|---|---|
| **es BEFORE** | `Le susurró algo al oído.` |
| **es AFTER** | `Lleva un pendiente en la oreja.` |
| **fr BEFORE** | `Il lui a chuchoté quelque chose à l'oreille.` |
| **fr AFTER** | `Elle porte une boucle à l'oreille.` |
| **en BEFORE** | `She whispered something in his ear.` |
| **en AFTER** | `She wears an earring in her ear.` |

**Why.** `oído` is a different word — the inner ear / the sense of hearing — not an inflection of
`oreja`. `maskSentence` matched neither exactly nor on the stem `orej`, so the row could never
produce a sentence cloze.

**Why this sentence.** An earring sits on the outer ear, which is exactly the sense our reviewed
gloss records (`ear (outer)`). A first draft used *"Se tapó la oreja con la mano."* and was rejected
at review: **`taparse los oídos`** is the idiomatic Spanish for covering one's ears, so that sentence
would have taught an unnatural collocation while fixing the masking. Singular, so Strategy 1 matches
the whole word and the blank is clean.

## esencial / malo

Glosses (unchanged): `fr` = *mauvais* · `en` = *bad*

| | value |
|---|---|
| **es BEFORE** | `Hace mal tiempo hoy.` |
| **es AFTER** | `Este libro es muy malo.` |
| **fr BEFORE** | `Il fait mauvais temps aujourd'hui.` |
| **fr AFTER** | `Ce livre est très mauvais.` |
| **en BEFORE** | `The weather is bad today.` |
| **en AFTER** | `This book is very bad.` |

**Why.** `mal` is the apocope of `malo` — morphologically a form of it, but the string `malo` never
appears. The stem fallback takes the first 4 characters (`malo`) and cannot match a 3-letter token,
so the row could never be masked.

**Why this sentence.** Predicative position keeps the full form, where the original context (*hace
mal tiempo*) is one of the few that forces the apocope. Teaching the full form is also better for a
learner whose stored headword is `malo`.

---

## Verification

- `maskSentence('Lleva un pendiente en la oreja.', 'oreja')` → `Lleva un pendiente en la _____.`
- `maskSentence('Este libro es muy malo.', 'malo')` → `Este libro es muy _____.`
- `maskSentence('Hace mal tiempo hoy.', 'malo')` → `null` (the regression being guarded)

All three are asserted in `lib/pool-examples.test.ts`.
