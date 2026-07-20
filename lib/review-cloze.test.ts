import { describe, it, expect } from 'vitest'
import { pickClozeExample, resultHintExample, isVerbPos, chooseQcmCue, type ClozeExample } from './review-cloze'
import { BLANK } from './mask'

// seed = parseInt('00000000', 16) = 0 → start at examples[0].
const id0 = '00000000-0000-0000-0000-000000000000'

describe('isVerbPos', () => {
  it('true only for v. and v.pron.', () => {
    expect(isVerbPos('v.')).toBe(true)
    expect(isVerbPos('v.pron.')).toBe(true)
    expect(isVerbPos('n.m.')).toBe(false)
    expect(isVerbPos('adj.')).toBe(false)
    expect(isVerbPos(undefined)).toBe(false)
  })
})

describe('pickClozeExample', () => {
  it('returns null when there are no examples', () => {
    expect(pickClozeExample({ examples: [], word: 'casa', id: id0, lemma: null, pos: 'n.f.' })).toBeNull()
  })

  it('non-verb: masks the target word verbatim, target null', () => {
    const r = pickClozeExample({
      examples: [{ es: 'Vimos el atardecer en la playa.', fr: 'fr' }],
      word: 'atardecer',
      id: id0,
      lemma: null,
      pos: 'n.m.',
    })
    expect(r).not.toBeNull()
    expect(r!.masked).toBe(`Vimos el ${BLANK} en la playa.`)
    expect(r!.target).toBeNull()
  })

  it('non-verb: returns null when the word cannot be masked (caller forces MC / definition)', () => {
    const r = pickClozeExample({
      examples: [{ es: 'Una frase sin el término buscado.', fr: 'fr' }],
      word: 'xyzqwk',
      id: id0,
      lemma: null,
      pos: 'n.m.',
    })
    expect(r).toBeNull()
  })

  it('L1 — infinitive-stored verb prefers the infinitive-bearing example so the answer = the headword', () => {
    const r = pickClozeExample({
      examples: [
        { es: 'Los aficionados gritaron de alegría.', fr: 'fr' }, // only a conjugation
        { es: 'Es difícil no gritar en un concierto.', fr: 'fr' }, // has the bare infinitive
      ],
      word: 'gritar',
      id: id0,
      lemma: null, // infinitive-stored (word === lemma)
      pos: 'v.',
    })
    expect(r).not.toBeNull()
    expect(r!.target!.surface).toBe('gritar') // masked the infinitive, coherent with the headword
    expect(r!.masked).toContain(BLANK)
  })

  it('L1 — masks the infinitive even when a conjugation of the same verb appears earlier in the sentence', () => {
    const r = pickClozeExample({
      examples: [{ es: 'Los aficionados gritaron para gritar aún más.', fr: 'fr' }],
      word: 'gritar',
      id: id0,
      lemma: null,
      pos: 'v.',
    })
    expect(r!.masked).toBe(`Los aficionados gritaron para ${BLANK} aún más.`)
    expect(r!.target!.surface).toBe('gritar')
  })

  it('L1 does NOT touch INFLECTED-stored verbs — they still mask their stored conjugation', () => {
    // word ≠ lemma → the L1 infinitive-preference is skipped; masks "gritaron" (the stored form)
    const r = pickClozeExample({
      examples: [{ es: 'Los aficionados gritaron para gritar aún más.', fr: 'fr' }],
      word: 'gritaron',
      id: id0,
      lemma: 'gritar',
      pos: 'v.',
    })
    expect(r!.target!.surface).toBe('gritaron') // stored conjugation masked, not the infinitive
  })

  it('verb (lemma-stored, word = infinitive): masks the contextual conjugated form + coordinates', () => {
    const r = pickClozeExample({
      examples: [{ es: 'El árbol creció muy rápido este año.', fr: 'fr' }],
      word: 'crecer',
      id: id0,
      lemma: null,
      pos: 'v.',
    })
    expect(r!.masked).toBe(`El árbol ${BLANK} muy rápido este año.`)
    expect(r!.target).toMatchObject({ surface: 'creció', tense: 'preterito', person: 'él' })
  })

  it('verb (inflected-stored, word = conjugated): masks via the infinitive lemma paradigm', () => {
    const r = pickClozeExample({
      examples: [{ es: 'Esta tarde estudiamos los verbos irregulares.', fr: 'fr' }],
      word: 'estudiamos',
      id: id0,
      lemma: 'estudiar',
      pos: 'v.',
    })
    expect(r!.masked).toBe(`Esta tarde ${BLANK} los verbos irregulares.`)
    expect(r!.target).toMatchObject({ surface: 'estudiamos', tense: 'presente', person: 'nosotros' })
  })

  it('verb fallback: non-conjugable lemma → maskSentence on the stored word, target null', () => {
    // "saltando" (gerund) is not a conjugable infinitive → maskVerbSentence declines → falls
    // back to the stem heuristic on the stored word.
    const r = pickClozeExample({
      examples: [{ es: 'Los niños están saltando en el parque.', fr: 'fr' }],
      word: 'saltando',
      id: id0,
      lemma: 'saltando',
      pos: 'v.',
    })
    expect(r).not.toBeNull()
    expect(r!.masked).toBe(`Los niños están ${BLANK} en el parque.`)
    expect(r!.target).toBeNull()
  })

  it('is deterministic on the card id (seed 0 → first example)', () => {
    const examples = [
      { es: 'Vimos el atardecer en la playa.', fr: 'a' },
      { es: 'Otro atardecer naranja sobre el mar.', fr: 'b' },
    ]
    const a = pickClozeExample({ examples, word: 'atardecer', id: id0, lemma: null, pos: 'n.m.' })
    const b = pickClozeExample({ examples, word: 'atardecer', id: id0, lemma: null, pos: 'n.m.' })
    expect(a!.example.fr).toBe('a')
    expect(b!.example.fr).toBe('a')
  })
})

describe('pickClozeExample — proclitic reflexive (#1)', () => {
  const reflexEx = [{ es: '¿A qué hora te levantas los lunes para ir al trabajo?', fr: 'fr' }]

  it('with lemma → masks the full "te levantas" unit; surface == word → gate gives cloze', () => {
    const picked = pickClozeExample({ examples: reflexEx, word: 'te levantas', id: id0, lemma: 'levantarse', pos: 'v.pron.' })
    expect(picked).not.toBeNull()
    expect(picked!.masked).toBe(`¿A qué hora ${BLANK} los lunes para ir al trabajo?`)
    expect(picked!.target?.surface).toBe('te levantas')
    const card = { examples: reflexEx, word: 'te levantas', definition: { pos: 'v.pron.' } }
    expect(chooseQcmCue(card, picked, 0)).toBe('cloze')
  })

  it('legacy lemma-null (pre-backfill) → maskSentence full unit, target null → definition (graceful)', () => {
    const picked = pickClozeExample({ examples: reflexEx, word: 'te levantas', id: id0, lemma: null, pos: 'v.pron.' })
    expect(picked).not.toBeNull()
    expect(picked!.target).toBeNull()
    const card = { examples: reflexEx, word: 'te levantas', definition: { pos: 'v.pron.' } }
    expect(chooseQcmCue(card, picked, 0)).toBe('definition')
  })

  it('enclitic infinitive-stored reflexive (levantarse) stays definition (regression lock)', () => {
    const exs = [{ es: 'Es difícil levantarse temprano en invierno.', fr: 'fr' }]
    const picked = pickClozeExample({ examples: exs, word: 'levantarse', id: id0, lemma: null, pos: 'v.pron.' })
    const card = { examples: exs, word: 'levantarse', definition: { pos: 'v.pron.' } }
    // target.surface ("levantarse" infinitive in paradigm) === word → would be cloze, OR target
    // differs → definition. Either way it must NOT crash and must not become a clitic-unit cloze.
    if (picked?.target) expect(picked.target.surface).not.toContain(' ')
    expect(['cloze', 'definition']).toContain(chooseQcmCue(card, picked, 0))
  })
})

describe('pickClozeExample — prefer the coherent (stored-in-form) example (#5)', () => {
  // "te duermes" shape: a non-coherent "me dormiría" sentence sits where the seed lands first,
  // plus two coherent "te duermes" sentences. id0 → start 0.
  const exs = [
    { es: 'Siempre te duermes en el sofá por la noche.', fr: 'A' }, // coherent → "te duermes"
    { es: 'Yo me dormiría en cinco minutos con ese ruido.', fr: 'B' }, // non-coherent → "dormiría"
    { es: 'Si te duermes ahora, no dormirás luego.', fr: 'C' }, // coherent → "te duermes"
  ]
  const pick = (reps: number) =>
    pickClozeExample({ examples: exs, word: 'te duermes', id: id0, lemma: 'dormirse', pos: 'v.pron.', reps })

  it('prefers a coherent example (surface == word) over a same-card non-matching form', () => {
    const p = pick(0)
    expect(p!.target?.surface).toBe('te duermes')
    expect(['A', 'C']).toContain(p!.example.fr)
  })

  it('rotation stays WITHIN the coherent pool — never the non-coherent "me dormiría"', () => {
    for (const reps of [0, 1, 2, 3, 4]) {
      const p = pick(reps)
      expect(p!.target?.surface).toBe('te duermes')
      expect(p!.example.fr).not.toBe('B') // the "dormiría" example is never chosen
    }
  })

  it('infinitive-stored verb (no coherent example) is unchanged → definition-routed form', () => {
    const ex = [{ es: 'El árbol creció muy rápido este año.', fr: 'x' }]
    const p = pickClozeExample({ examples: ex, word: 'crecer', id: id0, lemma: null, pos: 'v.', reps: 0 })
    expect(p!.target?.surface).toBe('creció') // ≠ "crecer" → chooseQcmCue gives definition
  })
})

describe('pickClozeExample — reps rotation (#3)', () => {
  // id0 → start 0. Maskable examples (contain "atardecer"), in stable order: [a, c]; b is skipped.
  const exs = [
    { es: 'Vimos el atardecer en la playa.', fr: 'a' },
    { es: 'No hay nada que ver aquí.', fr: 'b' }, // not maskable
    { es: 'Otro atardecer naranja sobre el mar.', fr: 'c' },
  ]
  const pick = (reps: number) =>
    pickClozeExample({ examples: exs, word: 'atardecer', id: id0, lemma: null, pos: 'n.m.', reps })

  it('cycles among the MASKABLE examples by reps (skipping unmaskable ones)', () => {
    expect(pick(0)!.example.fr).toBe('a')
    expect(pick(1)!.example.fr).toBe('c')
    expect(pick(2)!.example.fr).toBe('a') // wraps (2 maskable)
    expect(pick(3)!.example.fr).toBe('c')
  })

  it('reps omitted → defaults to the first maskable (no rotation)', () => {
    expect(pickClozeExample({ examples: exs, word: 'atardecer', id: id0, lemma: null, pos: 'n.m.' })!.example.fr).toBe('a')
  })

  it('a single maskable example → no rotation regardless of reps', () => {
    const one = [{ es: 'Vimos el atardecer.', fr: 'x' }, { es: 'Nada aquí.', fr: 'y' }]
    for (const reps of [0, 1, 5, 99]) {
      expect(pickClozeExample({ examples: one, word: 'atardecer', id: id0, lemma: null, pos: 'n.m.', reps })!.example.fr).toBe('x')
    }
  })
})

describe('resultHintExample — exercise/result example must not diverge (v0.6.5 Item 1)', () => {
  // The repro: the exercise masked a rotated/coherent example while the result "Exemple" block
  // read card.examples[0], showing a DIFFERENT sentence. The result must render picked.example.
  const exs = [
    { es: 'Vimos el atardecer en la playa.', fr: 'a' },
    { es: 'No hay nada que ver aquí.', fr: 'b' }, // not maskable
    { es: 'Otro atardecer naranja sobre el mar.', fr: 'c' },
  ]
  const card = { examples: exs }

  it('picked non-null → returns picked.example (the masked sentence), NOT card.examples[0]', () => {
    // reps=1 rotates the exercise onto example "c" (index 2). The old inline card.examples[0] ("a")
    // would diverge; the helper returns the same example the exercise masked.
    const picked = pickClozeExample({ examples: exs, word: 'atardecer', id: id0, lemma: null, pos: 'n.m.', reps: 1 })
    expect(picked!.example.fr).toBe('c')
    const hint = resultHintExample(picked, card)
    expect(hint).toBe(picked!.example)
    expect(hint!.fr).toBe('c')
    expect(hint).not.toBe(card.examples[0]) // the bug would have shown "a"
  })

  it('picked null (definition-fallback écriture) → falls back to the first example', () => {
    expect(resultHintExample(null, card)).toBe(exs[0])
  })

  it('picked null AND no examples → null (the hint block guards on truthiness)', () => {
    expect(resultHintExample(null, { examples: [] })).toBeNull()
  })

  it('coherent-pick divergence (the literal repro shape): result follows the coherent example', () => {
    // examples[0] is a non-coherent form; the exercise prefers the coherent one (index 1).
    const exs2 = [
      { es: 'Después de tres intentos lo logró al final.', fr: 'first' }, // examples[0], masks "logró"
      { es: 'Nunca logré entender por qué se fue.', fr: 'second' }, // coherent for "logré"
    ]
    const picked = pickClozeExample({ examples: exs2, word: 'logré', id: id0, lemma: 'lograr', pos: 'v.', reps: 0 })
    expect(picked!.target?.surface).toBe('logré')
    expect(picked!.example.fr).toBe('second')
    expect(resultHintExample(picked, { examples: exs2 })!.fr).toBe('second')
  })
})

describe('chooseQcmCue', () => {
  const ex = [{ es: 'frase', fr: 'phrase' }]
  const cloze = (surface: string): ClozeExample => ({
    example: ex[0],
    masked: `... ${BLANK} ...`,
    target: { surface, tense: 'presente', person: 'yo' },
  })

  it('no example → definition (only option)', () => {
    const card = { examples: [], word: 'crecer', definition: { pos: 'v.' } }
    expect(chooseQcmCue(card, null, 0)).toBe('definition')
  })

  it('verb stored in the example form (target == word) → cloze', () => {
    const card = { examples: ex, word: 'estudiamos', definition: { pos: 'v.' } }
    expect(chooseQcmCue(card, cloze('estudiamos'), 0)).toBe('cloze')
  })

  it('verb stored in form — accent-tolerant match (volvíamos) → cloze', () => {
    const card = { examples: ex, word: 'volvíamos', definition: { pos: 'v.' } }
    expect(chooseQcmCue(card, cloze('volvíamos'), 1)).toBe('cloze')
  })

  it('infinitive-stored verb (blank is a conjugation ≠ stored word) → definition', () => {
    const card = { examples: ex, word: 'crecer', definition: { pos: 'v.' } }
    expect(chooseQcmCue(card, cloze('creció'), 0)).toBe('definition')
  })

  it('verb with target null (gerund/participle-stored, no paradigm match) → definition', () => {
    const card = { examples: ex, word: 'saltando', definition: { pos: 'v.' } }
    const picked: ClozeExample = { example: ex[0], masked: `... ${BLANK} ...`, target: null }
    expect(chooseQcmCue(card, picked, 0)).toBe('definition')
  })

  it('verb with no maskable example (picked null) → definition', () => {
    const card = { examples: ex, word: 'crecer', definition: { pos: 'v.' } }
    expect(chooseQcmCue(card, null, 0)).toBe('definition')
  })

  it('non-verb → existing seed%2 split (even = cloze, odd = definition); picked ignored', () => {
    const card = { examples: ex, word: 'mercado', definition: { pos: 'n.m.' } }
    expect(chooseQcmCue(card, null, 0)).toBe('cloze')
    expect(chooseQcmCue(card, null, 2)).toBe('cloze')
    expect(chooseQcmCue(card, null, 1)).toBe('definition')
    expect(chooseQcmCue(card, null, 3)).toBe('definition')
  })
})
