import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { maskSentence, maskVerbSentence } from './mask'
import { canDisplayParadigm } from './conjugator'

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

// Mirrors lib/review-cloze.ts `maskOne`: a verb with a trusted lemma goes through the paradigm
// masker, everything else through the string masker. Simplified in one direction only — the real
// maskOne also tries maskInfinitive and maskProcliticReflexive first, both of which can only ADD
// maskable cases. So a row this helper calls maskable is genuinely maskable; a row it calls
// unmaskable is the honest worst case.
function isMaskable(r: Row): boolean {
  if (r.pos.startsWith('v.') && canDisplayParadigm(r.word)) {
    if (maskVerbSentence(r.es, r.word) !== null) return true
  }
  return maskSentence(r.es, r.word) !== null
}

// Rows that cannot be masked for a reason that is NOT a content defect: the example DOES contain a
// valid inflected form of the headword, and the masker simply cannot reach it. Every one of these
// was verified by hand. Tracked as roadmap item 8d; grouped by root cause so that work starts from
// a diagnosis rather than a list.
//
// ⚠️ This set is 21 rows, not the 5 estimated when 8b was planned. The plan's estimate came from a
// heuristic that assumed "trusted lemma ⇒ maskable"; in reality maskVerbSentence also needs the
// surface form to be IN the generated paradigm, which excludes imperatives carrying an enclitic.
// Running the app's own masker is what surfaced the true number.
//
// CAUSE 1 — untrusted verb lemma, so maskVerbSentence never runs and maskSentence falls back to a
// 4-char stem prefix. That fails whenever the inflected form diverges inside the first 4 characters:
// a stem change (fregar→friego, poder→puedes), an accent (criar→crían), or simply a short stem where
// character 4 is the ending vowel (vivir→vivo, sudar→sudo, nacer→nació). The 4-char stem is the weak
// point, not the irregularity — `vivir` is perfectly regular and still fails.
//
// CAUSE 2 — adjective gender. The masker has no gender rule at all, so a feminine agreement in the
// example is unreachable (sano→sana, último→última).
//
// CAUSE 3 — imperative with an enclitic pronoun, even for a TRUSTED lemma. maskVerbSentence matches
// bare paradigm surfaces, and "siéntate" / "ponte" are verb+clitic units that no paradigm entry
// equals. Note maskProcliticReflexive handles the PRO-clitic direction ("te levantas"), not this one.
const KNOWN_UNMASKABLE = new Set([
  // cause 1 — untrusted lemma + 4-char stem miss
  'casa/fregar', // "Friego los platos."            freg ≠ frie   (e→ie)
  'casa/tender', // "Tiendo la ropa fuera."         tend ≠ tien   (e→ie)
  'cuerpo/andar', // "Ando media hora cada día."     anda ≠ ando
  'cuerpo/curarse', // "Se curó rápido."               cura ≠ curó
  'cuerpo/oler', // "Huele muy bien."               oler ≠ huel   (o→hue + h-)
  'cuerpo/reír', // "Nos reímos mucho."             reír ≠ reím
  'cuerpo/sudar', // "Sudo mucho cuando corro."      suda ≠ sudo
  'esencial/darse cuenta', // "Me di cuenta de mi error."     phrase lemma; stripReflexive is a no-op
  'esencial/impedir', // "La lluvia impidió el partido." impe ≠ impi  (e→i)
  'esencial/poder', // "¿Puedes ayudarme, por favor?"  pode ≠ pued  (deliberately excluded lemma)
  'esencial/soler', // "Suelo levantarme temprano."    sole ≠ suel  (o→ue)
  'esencial/vivir', // "Vivo en Madrid."               vivi ≠ vivo  ← regular verb, still fails
  'familia/criar', // "Crían a sus hijos con cariño." cria ≠ crí   (accent, no folding in maskSentence)
  'familia/echar de menos', // "Echo de menos a mi hermana."   phrase lemma, untrusted
  'familia/nacer', // "El bebé nació ayer."           nace ≠ naci
  'fiesta/reír', // "Reímos sin parar."             reír ≠ reím
  'ropa/apretar', // "Estos zapatos me aprietan."    apre ≠ apri  (e→ie)
  // cause 2 — adjective gender
  'cuerpo/sano', // "Lleva una vida sana."          sano ≠ sana
  'esencial/último', // "Es la última vez que lo digo."  últi ≠ últa
  // cause 3 — imperative + enclitic, TRUSTED lemma
  'cuerpo/sentarse', // "Siéntate aquí."                paradigm has "siéntate"? no — verb+clitic
  'ropa/ponerse', // "Ponte el abrigo."              same
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
    expect(KNOWN_UNMASKABLE.size).toBe(21)
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
    // The regression being guarded: "Hace mal tiempo hoy." contains `mal`, never `malo`, so the
    // 4-char stem `malo` cannot match a 3-letter token.
    expect(maskSentence('Hace mal tiempo hoy.', 'malo')).toBeNull()
    expect(maskSentence(r.es, r.word)).toBe('Este libro es muy _____.')
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
