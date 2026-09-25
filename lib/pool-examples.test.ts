import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { maskSentence } from './mask'
import { pickClozeExample } from './review-cloze'
import { classifyBlankAnswer } from './rating'

// ── Roadmap 8b — the pool-example maskability guard ──────────────────────────────────────────────
//
// Every discovery_pool row exists to produce a fill-in-the-blank. That only works if the example
// sentence actually contains the headword in a form the masker can find. Two seeded rows did not
// (`oreja` used `oído`, `malo` used `mal`), and nothing caught it for the life of the corpus —
// because the failure is INVISIBLE: pickClozeExample returns null and FillInBlank quietly falls back
// to its definition prompt. The card still drills, so no error is ever raised.
//
// This asserts the real property — "can this row produce a sentence cloze?" — by running the app's
// OWN masker over every row, rather than re-deriving an inflection heuristic that would need to
// know about stem changes (dormir→duerme), orthographic changes (tocar→toques), suppletion
// (ir→voy) and apocope (malo→mal). The masker is the thing that decides at runtime, so it is the
// thing to test against.
//
// Data: lib/__fixtures__/pool-examples.tsv, derived from the committed seed + data migrations by
// scripts/dump-pool-examples.ts. No database, no credentials.

const FIXTURE = 'lib/__fixtures__/pool-examples.tsv'

type Row = { theme: string; word: string; pos: string; es: string }
const rows: Row[] = readFileSync(FIXTURE, 'utf8')
  .trimEnd()
  .split('\n')
  .slice(1)
  .map((l) => {
    const [theme, word, pos, es] = l.split('\t')
    return { theme, word, pos, es }
  })

// ⚠️ CORRECTED at v0.12.35. This previously hand-rolled the maskOne chain and gated the verb path on
// `canDisplayParadigm` — the DISPLAY gate (TRUSTED_LEMMAS, 78 lemmas). But `maskVerbSentence` gates
// on `isConjugable`, a far looser FORM test (does the lemma end -ar/-er/-ir). The approximation
// therefore reported 21 unmaskable rows when the true figure was **14**: seven regular verbs
// (`andar`, `curarse`, `sudar`, `vivir`, `criar`, `nacer`, `poder`) mask fine from a computed
// paradigm. Same lesson as 8b, one level deeper — so this now calls the real thing.
function isMaskable(r: Row): boolean {
  return (
    pickClozeExample({
      examples: [{ es: r.es, fr: '' }],
      word: r.word,
      id: `${r.theme}-${r.word}`,
      lemma: null,
      pos: r.pos,
      reps: 0,
    }) !== null
  )
}

// Rows that still cannot produce a cloze after 8d. NOT content defects: each example contains a
// valid inflected form the masker cannot reach. Tracked as roadmap item 8e.
//
// The count has moved twice, and both moves were corrections to measurement rather than to code:
//   21 (8b)  — inflated: the guard gated the verb path on canDisplayParadigm instead of isConjugable
//   14       — the true pre-8d figure, measured through pickClozeExample
//   11 (now) — 8d's folded/length-aware fallback cleared `sano`, `último` and `ponerse`
//
// What remains is ONE class plus two phrases. Every entry needs a trusted paradigm (8e):
//   stem-changing verbs — the stem mutates at the vowel, so no prefix of the infinitive is a prefix
//   of the form; `reír` is the degenerate case (stripping -ir leaves "re", too short to be safe).
const KNOWN_UNMASKABLE = new Set([
  // stem-changing verbs — e→ie, o→ue, e→i, o→hue
  'casa/fregar', // "Friego los platos."            freg → frie
  'casa/tender', // "Tiendo la ropa fuera."         tend → tien
  'cuerpo/oler', // "Huele muy bien."               ol   → huel
  'cuerpo/sentarse', // "Siéntate aquí."                sent → sient  (the enclitic is NOT the problem)
  'esencial/impedir', // "La lluvia impidió el partido." imped → impid
  'esencial/soler', // "Suelo levantarme temprano."    sol  → suel
  'ropa/apretar', // "Estos zapatos me aprietan."    apret → apriet
  // stem too short to match safely
  'cuerpo/reír', // "Nos reímos mucho."             stem "re" would match recto/reunión/relación
  'fiesta/reír', // "Reímos sin parar."             same
  // multiword headwords — the inflection lands on the head verb; blanking one token of a phrase is
  // a different exercise, and stripReflexive's (ar|er|ir)se$ anchor is a no-op on them
  'esencial/darse cuenta', // "Me di cuenta de mi error."
  'familia/echar de menos', // "Echo de menos a mi hermana."
])

const key = (r: Row) => `${r.theme}/${r.word}`

describe('discovery_pool examples are maskable', () => {
  it('parses the full corpus from the committed fixture', () => {
    expect(rows).toHaveLength(672)
    expect(rows.every((r) => r.theme && r.word && r.pos && r.es)).toBe(true)
  })

  it('every row can produce a sentence cloze, except the known 8d set', () => {
    const failing = rows.filter((r) => !isMaskable(r)).map(key).sort()
    expect(failing).toEqual([...KNOWN_UNMASKABLE].sort())
  })

  it('the 8d allowlist is exactly the known set — no silent growth', () => {
    // If a row is fixed, it must leave the allowlist; if one regresses, it must not be added
    // without a decision. Both directions fail here rather than drifting.
    const failing = new Set(rows.filter((r) => !isMaskable(r)).map(key))
    for (const k of KNOWN_UNMASKABLE) {
      expect(failing.has(k), `${k} is now maskable — remove it from KNOWN_UNMASKABLE`).toBe(true)
    }
    expect(KNOWN_UNMASKABLE.size).toBe(11)
  })
})

describe('roadmap 8b — the two fixed rows', () => {
  const find = (theme: string, word: string) => {
    const r = rows.find((x) => x.theme === theme && x.word === word)
    expect(r, `${theme}/${word} missing from the fixture`).toBeDefined()
    return r!
  }

  it('oreja: the example contains its headword and masks cleanly', () => {
    const r = find('cuerpo', 'oreja')
    expect(r.es).toBe('Lleva un pendiente en la oreja.')
    expect(r.es.toLowerCase()).toContain('oreja')
    expect(maskSentence(r.es, r.word)).toBe('Lleva un pendiente en la _____.')
  })

  it('malo: the example uses the full form, not the apocope', () => {
    const r = find('esencial', 'malo')
    expect(r.es).toBe('Este libro es muy malo.')
    // The regression being guarded: "Hace mal tiempo hoy." contains `mal`, never `malo`. 8d's
    // folded-stem fallback could reach it (stem "mal" + an empty remainder) — which would mask
    // successfully and produce an UNGRADEABLE card, since the stored headword is "malo" and the
    // only form fitting the slot is "mal". Rejected both with and without a pos.
    expect(maskSentence('Hace mal tiempo hoy.', 'malo', r.pos)).toBeNull()
    expect(maskSentence('Hace mal tiempo hoy.', 'malo')).toBeNull()
    expect(maskSentence(r.es, r.word, r.pos)).toBe('Este libro es muy _____.')
  })

  it('neither fixed row relies on the 4-char stem fallback', () => {
    // Strategy 1 (exact) should hit, so the blank replaces the whole headword rather than a
    // stem-prefixed token — which is what keeps the rendered blank clean.
    for (const [theme, word] of [
      ['cuerpo', 'oreja'],
      ['esencial', 'malo'],
    ] as const) {
      const r = find(theme, word)
      expect(new RegExp(word, 'i').test(r.es), `${word} not present verbatim`).toBe(true)
    }
  })
})

// ── Roadmap 8d — the append-only drift guard ─────────────────────────────────────────────────────
// Asserted at the CLOZE level (pickClozeExample), not raw maskSentence. That distinction is the
// whole point: `esencial/poner` and `familia/reunirse` DO change at the maskSentence level in 8d,
// and are unchanged here, because maskVerbSentence resolves them first from a computed paradigm.
// A raw-maskSentence drift test would report two regressions the learner never sees.
//
// lib/__fixtures__/pool-mask-expectations.tsv holds `before` (captured at pre-change HEAD, then
// preserved verbatim on every re-emit) and `after` (recomputed). Generated by
// scripts/dump-mask-expectations.ts.
describe('8d — masking is append-only', () => {
  type Exp = { theme: string; word: string; pos: string; before: string; after: string; note: string }
  const exp: Exp[] = readFileSync('lib/__fixtures__/pool-mask-expectations.tsv', 'utf8')
    .trimEnd()
    .split('\n')
    .slice(1)
    .map((l) => {
      const [theme, word, pos, before, after, note] = l.split('\t')
      return { theme, word, pos, before, after, note: note ?? '' }
    })

  const NONE = 'NULL'

  it('covers the whole corpus', () => {
    expect(exp).toHaveLength(672)
  })

  it('no row that masked before masks differently now — 0 regressions', () => {
    const regressions = exp
      .filter((e) => e.before !== NONE && e.before !== e.after)
      .map((e) => `${e.theme}/${e.word}: ${e.before} -> ${e.after}`)
    expect(regressions).toEqual([])
  })

  it('the live masker still produces exactly what the snapshot records', () => {
    // Catches drift that a stale fixture would hide: the committed `after` must equal what the code
    // does right now, for every row, not just the ones that changed.
    for (const e of exp) {
      const src = rows.find((r) => r.theme === e.theme && r.word === e.word)
      expect(src, `${e.theme}/${e.word} missing from pool-examples.tsv`).toBeDefined()
      const picked = pickClozeExample({
        examples: [{ es: src!.es, fr: '' }],
        word: src!.word,
        id: `${src!.theme}-${src!.word}`,
        lemma: null,
        pos: src!.pos,
        reps: 0,
      })
      expect(picked ? picked.masked : NONE, `${e.theme}/${e.word}`).toBe(e.after)
    }
  })

  it('records exactly the three rows 8d newly masks', () => {
    const newlyMasked = exp.filter((e) => e.before === NONE && e.after !== NONE)
    expect(newlyMasked.map((e) => `${e.theme}/${e.word}`).sort()).toEqual([
      'cuerpo/sano',
      'esencial/último',
      'ropa/ponerse',
    ])
    // The reviewed sentences. Changing any of these is a content decision, not a refactor.
    expect(newlyMasked.find((e) => e.word === 'sano')!.after).toBe('Lleva una vida _____.')
    expect(newlyMasked.find((e) => e.word === 'último')!.after).toBe('Es la _____ vez que lo digo.')
    expect(newlyMasked.find((e) => e.word === 'ponerse')!.after).toBe('_____ el abrigo.')
  })

  it('notes the two rows that differ at the maskSentence level but not at the cloze level', () => {
    const noted = exp.filter((e) => e.note !== '')
    expect(noted.map((e) => `${e.theme}/${e.word}`).sort()).toEqual([
      'esencial/poner',
      'familia/reunirse',
    ])
    for (const e of noted) {
      expect(e.before, `${e.word} must be unchanged at the cloze level`).toBe(e.after)
      expect(e.note).toContain('trusted paradigm masks it first')
    }
  })
})

// ── Roadmap 8d review — the blanked form is what gets graded ─────────────────────────────────────
// The three rows 8d newly masks all blank a form that is NOT the stored headword. Before this fix
// `correctWord` fell back to the headword, so a learner typing the only word that fits the slot was
// marked down. These assert the whole path: what is blanked, what is graded, and what each answer
// scores.
describe('8d — grading the three newly-masked rows', () => {
  const pick = (theme: string, word: string) => {
    const r = rows.find((x) => x.theme === theme && x.word === word)!
    return pickClozeExample({
      examples: [{ es: r.es, fr: '' }],
      word: r.word,
      id: `${r.theme}-${r.word}`,
      lemma: null,
      pos: r.pos,
      reps: 0,
    })!
  }
  const grade = (correctWord: string, userAnswer: string) =>
    classifyBlankAnswer(correctWord, userAnswer).quality

  it('sano: blanks "sana", grades against it', () => {
    const p = pick('cuerpo', 'sano')
    expect(p.masked).toBe('Lleva una vida _____.')
    expect(p.surface).toBe('sana')
    expect(grade(p.surface!, 'sana')).toBe('exact')
    expect(grade(p.surface!, 'sano')).toBe('near') // the headword: right word, wrong agreement
  })

  it('último: blanks "última", grades against it', () => {
    const p = pick('esencial', 'último')
    expect(p.masked).toBe('Es la _____ vez que lo digo.')
    expect(p.surface).toBe('última')
    expect(grade(p.surface!, 'última')).toBe('exact')
    expect(grade(p.surface!, 'último')).toBe('near')
  })

  it('ponerse: blanks "Ponte", grades against it', () => {
    const p = pick('ropa', 'ponerse')
    expect(p.masked).toBe('_____ el abrigo.')
    expect(p.surface).toBe('Ponte')
    expect(grade(p.surface!, 'Ponte')).toBe('exact')
    expect(grade(p.surface!, 'ponte')).toBe('exact') // case-insensitive
    // NOTE: the headword scores 'wrong', not 'near' — levenshtein("ponte","ponerse") is 3, past the
    // near-miss cushion of 2. That is the honest outcome of the existing grader, and it is arguably
    // right: "ponerse" is an infinitive where the slot needs an imperative, which is a form error
    // rather than a typo. Pinned so the behaviour is a recorded decision, not a surprise.
    expect(grade(p.surface!, 'ponerse')).toBe('wrong')
  })

  it('a row whose blank IS the headword records no surface', () => {
    // The overwhelming majority. `surface` is only set when it differs, so nothing changes for them.
    const p = pick('casa', 'cama')
    expect(p.surface).toBeUndefined()
  })
})
