import { describe, it, expect, vi } from 'vitest'
import {
  isDrillableVerb,
  buildDrillPool,
  triggerFrame,
  buildDrillPrompts,
  gradeDrillAnswer,
  drillTeachingLine,
  personsForScope,
  tenseLabel,
  drillTenseLabel,
  DRILL_PROMPT_COUNT,
  DRILL_TENSES,
  DRILL_TENSES_ORDER,
  type DeckVerbInput,
  type DrillVerb,
  type DrillTense,
} from './drill'

// A seeded LCG so prompt-builder tests are deterministic.
function seededRng(seed: number): () => number {
  let s = seed >>> 0
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0
    return s / 0xffffffff
  }
}

describe('isDrillableVerb', () => {
  it('accepts a trusted non-reflexive verb (infinitive-stored, lemma null)', () => {
    expect(isDrillableVerb({ pos: 'v.', word: 'hablar', lemma: null })).toBe(true)
  })
  it('accepts a trusted verb stored as an inflected form (lemma = infinitive)', () => {
    expect(isDrillableVerb({ pos: 'v.', word: 'comió', lemma: 'comer' })).toBe(true)
  })
  it('rejects a non-verb', () => {
    expect(isDrillableVerb({ pos: 'n.m.', word: 'mercado', lemma: null })).toBe(false)
    expect(isDrillableVerb({ pos: undefined, word: 'mercado', lemma: null })).toBe(false)
  })
  it('rejects reflexives — both v.pron. and an -se infinitive mis-tagged v.', () => {
    expect(isDrillableVerb({ pos: 'v.pron.', word: 'te levantas', lemma: 'levantarse' })).toBe(false)
    expect(isDrillableVerb({ pos: 'v.', word: 'levantarse', lemma: 'levantarse' })).toBe(false)
  })
  it('rejects an untrusted verb (canDisplayParadigm false)', () => {
    expect(isDrillableVerb({ pos: 'v.', word: 'conocer', lemma: null })).toBe(false) // -zco, excluded
    expect(isDrillableVerb({ pos: 'v.', word: 'andar', lemma: null })).toBe(false)
  })
})

describe('buildDrillPool', () => {
  it('keeps only drillable verbs and dedupes by infinitive', () => {
    const words: DeckVerbInput[] = [
      { pos: 'v.', word: 'hablar', lemma: null },
      { pos: 'v.', word: 'comió', lemma: 'comer' },
      { pos: 'v.', word: 'comer', lemma: null }, // same verb as comió → deduped
      { pos: 'n.f.', word: 'casa', lemma: null }, // non-verb
      { pos: 'v.pron.', word: 'se acuesta', lemma: 'acostarse' }, // reflexive
      { pos: 'v.', word: 'conocer', lemma: null }, // untrusted
    ]
    expect(buildDrillPool(words).map((v) => v.verb)).toEqual(['hablar', 'comer'])
  })
})

describe('triggerFrame', () => {
  it('returns a fixed per-tense lead-in', () => {
    expect(triggerFrame('futuro')).toBe('Mañana, ')
    expect(triggerFrame('subjPresente')).toBe('Ojalá ')
    expect(triggerFrame('preterito')).toBe('Ayer, ')
    expect(triggerFrame('condicional')).toBe('En ese caso, ') // verb-neutral (was "Con gusto,")
  })
})

describe('personsForScope', () => {
  it('singular → yo/tú/él; all → six', () => {
    expect(personsForScope('singular')).toEqual(['yo', 'tú', 'él'])
    expect(personsForScope('all')).toHaveLength(6)
  })
})

describe('buildDrillPrompts', () => {
  const pool: DrillVerb[] = [{ verb: 'hablar' }, { verb: 'comer' }, { verb: 'vivir' }]

  it('builds exactly 10 prompts with correct conjugated targets', () => {
    const prompts = buildDrillPrompts(pool, ['presente', 'futuro'], personsForScope('all'), seededRng(1))
    expect(prompts).toHaveLength(DRILL_PROMPT_COUNT)
    for (const p of prompts) {
      expect(p.correctForm.length).toBeGreaterThan(0)
      expect(p.frame).toBe(triggerFrame(p.tense))
    }
    // spot-check a known conjugation surfaces somewhere in the (verb,tense,person) space
    expect(buildDrillPrompts([{ verb: 'hablar' }], ['futuro'], ['tú'], seededRng(1))[0].correctForm).toBe('hablarás')
  })

  it('prefers unique combos, padding with repeats only to reach 10', () => {
    // 1 verb × 1 tense × 3 persons = 3 unique combos → must still return 10 (7 repeats).
    const prompts = buildDrillPrompts([{ verb: 'hablar' }], ['presente'], personsForScope('singular'), seededRng(3))
    expect(prompts).toHaveLength(DRILL_PROMPT_COUNT)
    const keys = new Set(prompts.map((p) => `${p.verb}|${p.tense}|${p.person}`))
    expect(keys.size).toBe(3) // only 3 distinct combos exist
  })

  it('returns 10 distinct combos when the space is large enough', () => {
    const prompts = buildDrillPrompts(pool, ['presente', 'preterito', 'imperfecto'], personsForScope('all'), seededRng(7))
    const keys = new Set(prompts.map((p) => `${p.verb}|${p.tense}|${p.person}`))
    expect(keys.size).toBe(10)
  })

  it('returns [] for an empty pool', () => {
    expect(buildDrillPrompts([], ['presente'], personsForScope('all'), seededRng(1))).toEqual([])
  })

  // PRIORITY LOCK (drill follow-up): every emitted prompt's tense must be in the SELECTED set —
  // a drill must never serve an unselected tense. Swept over seeds + subsets, incl. one that
  // explicitly excludes 'condicional' (the reported symptom).
  it('only ever emits prompts whose tense is in the selected set', () => {
    const subsets: DrillTense[][] = [
      ['presente'],
      ['presente', 'futuro'], // condicional deliberately excluded
      ['preterito', 'imperfecto', 'subjPresente'],
      ['presente', 'preterito', 'imperfecto', 'futuro'], // the default — no condicional
    ]
    for (const tenses of subsets) {
      const allowed = new Set(tenses)
      for (let seed = 1; seed <= 25; seed++) {
        const prompts = buildDrillPrompts(pool, tenses, personsForScope('all'), seededRng(seed))
        expect(prompts).toHaveLength(DRILL_PROMPT_COUNT)
        for (const p of prompts) expect(allowed.has(p.tense)).toBe(true)
      }
    }
  })
})

describe('gradeDrillAnswer (strict)', () => {
  const base = { target: 'hablarás', lemma: 'hablar' }
  it('exact target → correct', () => {
    expect(gradeDrillAnswer({ ...base, userAnswer: 'hablarás' }).verdict).toBe('correct')
  })
  it('accent-only miss → close', () => {
    expect(gradeDrillAnswer({ ...base, userAnswer: 'hablaras' }).verdict).toBe('close')
  })
  it('a different valid form (wrong tense/person) → wrong (NOT close)', () => {
    expect(gradeDrillAnswer({ ...base, userAnswer: 'hablé' }).verdict).toBe('wrong')
    expect(gradeDrillAnswer({ ...base, userAnswer: 'hablo' }).verdict).toBe('wrong')
  })
  it('the lemma typed → wrong', () => {
    expect(gradeDrillAnswer({ ...base, userAnswer: 'hablar' }).verdict).toBe('wrong')
  })
  it('a small typo of the target → close', () => {
    expect(gradeDrillAnswer({ ...base, userAnswer: 'hablrás' }).verdict).toBe('close')
  })
  it('an unrelated word → wrong', () => {
    expect(gradeDrillAnswer({ ...base, userAnswer: 'queso' }).verdict).toBe('wrong')
  })
})

describe('drillTeachingLine', () => {
  // French prose frame, SPANISH tense names (from tenseLabel — the drill's single tense-name source).
  it('names the tense the wrong answer belongs to', () => {
    // "hablé" is the preterite — asked the futuro.
    expect(drillTeachingLine({ userAnswer: 'hablé', lemma: 'hablar', targetTense: 'futuro' })).toBe(
      'Tu as donné Pretérito indefinido, on attendait Futuro.',
    )
  })
  it('flags the infinitive', () => {
    expect(drillTeachingLine({ userAnswer: 'hablar', lemma: 'hablar', targetTense: 'presente' })).toBe(
      "Tu as donné l'infinitif, on attendait Presente.",
    )
  })
  it('right tense, wrong person → person hint', () => {
    // "hablas" (tú present) when the prompt asked yo present.
    expect(drillTeachingLine({ userAnswer: 'hablas', lemma: 'hablar', targetTense: 'presente' })).toBe(
      "C'est bien Presente, mais pas la bonne personne.",
    )
  })
  it('returns null for a pure typo not in the paradigm', () => {
    expect(drillTeachingLine({ userAnswer: 'hablrás', lemma: 'hablar', targetTense: 'futuro' })).toBeNull()
  })
  it('prefers an accent-exact match — "hable" is the subjunctive spelling, not the accented preterite', () => {
    // "hable" exactly equals the subjuntivo form (no accent), so it is named precisely; the accented
    // preterite "hablé" does NOT exact-match, so it does not muddy the result.
    expect(drillTeachingLine({ userAnswer: 'hable', lemma: 'hablar', targetTense: 'futuro' })).toBe(
      'Tu as donné Subjuntivo presente, on attendait Futuro.',
    )
  })
})

// ── Invariant locks (the imperative-leak hardening) ───────────────────────────────────────────────
const SIX_FINITE = ['presente', 'preterito', 'imperfecto', 'futuro', 'condicional', 'subjPresente']

describe('drill tense pool is EXACTLY the six finite tenses', () => {
  it('the canonical order + DRILL_TENSES keys are exactly the six (no imperativo/gerundio/participio)', () => {
    expect([...DRILL_TENSES_ORDER].sort()).toEqual([...SIX_FINITE].sort())
    expect(DRILL_TENSES.map((t) => t.tense).sort()).toEqual([...SIX_FINITE].sort())
  })

  it('buildDrillPrompts drops any non-finite tense, even one injected past the type (regression: bebed)', () => {
    // Cast past the DrillTense type to simulate a future widening / cast — the defensive filter must
    // still refuse imperativo/gerundio/participio so no non-finite form ever reaches a prompt.
    // Silence (and assert) the dev-only warn the filter emits when it drops a non-finite tense.
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    try {
      const polluted = ['imperativoAfirmativo', 'gerundio', 'participio', 'presente'] as unknown as DrillTense[]
      const prompts = buildDrillPrompts([{ verb: 'beber' }], polluted, personsForScope('all'), seededRng(1))
      expect(prompts).toHaveLength(DRILL_PROMPT_COUNT)
      for (const p of prompts) {
        expect(SIX_FINITE).toContain(p.tense)
        expect(p.correctForm).not.toBe('bebed') // the reported imperativo-afirmativo-vosotros leak
      }
      // The filter announced exactly the dropped non-finite tenses.
      expect(warn).toHaveBeenCalledWith('[drill] non-finite tense dropped:', [
        'imperativoAfirmativo',
        'gerundio',
        'participio',
      ])

      // Only non-finite tenses → nothing buildable.
      const onlyNonFinite = ['imperativoAfirmativo', 'gerundio', 'participio'] as unknown as DrillTense[]
      expect(buildDrillPrompts([{ verb: 'beber' }], onlyNonFinite, personsForScope('all'), seededRng(1))).toEqual([])
    } finally {
      warn.mockRestore()
    }
  })
})

describe('tenseLabel ↔ conjugator key round-trip (a future mislabel/rekey fails CI)', () => {
  // tenseLabel is the SINGLE tense-name source for every drill surface. A mislabel keeps the key
  // valid while the label lies — the sweep test can't catch that, so this pins the mapping to an
  // independent expectation: the FULL Spanish display names.
  const EXPECTED: Record<DrillTense, string> = {
    presente: 'Presente',
    preterito: 'Pretérito indefinido',
    imperfecto: 'Imperfecto',
    futuro: 'Futuro',
    condicional: 'Condicional',
    subjPresente: 'Subjuntivo presente',
  }

  it('DRILL_TENSES is exactly the six finite keys (no missing / extra)', () => {
    expect(DRILL_TENSES).toHaveLength(DRILL_TENSES_ORDER.length)
    expect(DRILL_TENSES.map((t) => t.tense)).toEqual([...DRILL_TENSES_ORDER])
  })

  it('tenseLabel round-trips each key to its full Spanish display name', () => {
    for (const key of DRILL_TENSES_ORDER) {
      expect(tenseLabel(key)).toBe(EXPECTED[key])
    }
  })
})

describe('drillTenseLabel (short — review-cue surface only)', () => {
  it('maps to the short accented Spanish label', () => {
    expect(drillTenseLabel('preterito')).toBe('Pretérito')
    expect(drillTenseLabel('subjPresente')).toBe('Subjuntivo')
    expect(drillTenseLabel('imperfecto')).toBe('Imperfecto')
  })
})
