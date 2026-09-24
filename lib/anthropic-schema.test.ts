import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { z } from 'zod'
import {
  SYSTEM_PROMPT,
  EN_SYSTEM_PROMPT,
  discoverySystemPrompt,
  enDiscoverySystemPrompt,
  systemPromptFor,
  discoveryPromptFor,
  userPromptFor,
  discoveryUserPromptFor,
} from './anthropic'

// ── M8 Phase 1a — the FR byte-identity proof ─────────────────────────────────────────────────────
// Same rule as Phase 0's chrome fixture: the proof must not import the code it proves. The golden
// file was captured at pre-change HEAD (v0.12.31) by scripts/dump-prompts.ts, which imports only the
// prompt CONSTANTS and reads data/idioms.json straight off disk — never systemPromptFor, never the
// EN prompts, never lib/idioms.ts. This test re-derives the same projection and compares bytes.

const FIXTURE = readFileSync('lib/__fixtures__/prompt-golden.txt', 'utf8')
const sha256 = (s: string) => createHash('sha256').update(s, 'utf8').digest('hex')

// Pull one section's body out of the fixture by heading. Sections are separated by a '=' rule and
// each carries `sha256:` / `bytes:` lines then `---` then the payload.
function section(heading: string): { sha: string; body: string } {
  const start = FIXTURE.indexOf(`## ${heading}\n`)
  expect(start, `fixture section missing: ${heading}`).toBeGreaterThan(-1)
  const after = FIXTURE.slice(start)
  const sha = /sha256: ([0-9a-f]{64})/.exec(after)?.[1] ?? ''
  const bodyStart = after.indexOf('\n---\n') + 5
  const end = after.indexOf('\n' + '='.repeat(100) + '\n', bodyStart)
  const raw = end === -1 ? after.slice(bodyStart) : after.slice(bodyStart, end)
  // The generator joins sections with '\n' and every section already opens with the rule's own
  // leading '\n', so exactly one newline separates a payload from the next separator. Drop it.
  const body = raw.endsWith('\n') ? raw.slice(0, -1) : raw
  return { sha, body }
}

describe('FR prompts are byte-identical to v0.12.31', () => {
  it('SYSTEM_PROMPT matches the golden fixture exactly', () => {
    const { sha, body } = section('SYSTEM_PROMPT (FR word enrichment)')
    expect(sha256(SYSTEM_PROMPT)).toBe(sha)
    expect(SYSTEM_PROMPT).toBe(body)
  })

  it('discoverySystemPrompt matches for every captured count', () => {
    for (const n of [1, 10, 12, 16, 18, 60]) {
      const { sha, body } = section(`discoverySystemPrompt(${n}) (FR discovery batch)`)
      expect(sha256(discoverySystemPrompt(n)), `count ${n}`).toBe(sha)
      expect(discoverySystemPrompt(n), `count ${n}`).toBe(body)
    }
  })

  it("systemPromptFor('fr') returns the untouched constant, by identity", () => {
    // Identity, not equality: proves the selector routes to the same object rather than to a copy
    // that merely happens to match today.
    expect(systemPromptFor('fr')).toBe(SYSTEM_PROMPT)
    expect(discoveryPromptFor('fr', 12)).toBe(discoverySystemPrompt(12))
  })

  it('both FR user turns are unchanged', () => {
    expect(userPromptFor('fr', 'casa')).toBe('Mot espagnol : « casa »')
    expect(discoveryUserPromptFor('fr', 'La casa', '')).toBe('Thème : « La casa »')
    expect(discoveryUserPromptFor('fr', 'La casa', '\n\nEXCLUDE: a, b')).toBe(
      'Thème : « La casa »\n\nEXCLUDE: a, b',
    )
  })
})

describe('data/idioms.json FR fields are untouched', () => {
  it('every FR field on all 10 entries matches the golden projection', () => {
    // Read off disk, exactly as the generator did — NOT through lib/idioms.ts, so the schema change
    // in this milestone cannot influence what is compared.
    type Idiom = {
      id: string
      phrase: string
      literal: string
      meaning: string
      explanation: string
      origin: string[]
    }
    const idioms = JSON.parse(readFileSync('data/idioms.json', 'utf8')) as Idiom[]
    const projection = idioms
      .map((i) =>
        [
          `id:          ${i.id}`,
          `phrase:      ${i.phrase}`,
          `literal:     ${i.literal}`,
          `meaning:     ${i.meaning}`,
          `explanation: ${i.explanation}`,
          `origin:      ${JSON.stringify(i.origin)}`,
        ].join('\n'),
      )
      .join('\n\n')

    const { sha, body } = section(`data/idioms.json — FR fields (${idioms.length} entries)`)
    expect(sha256(projection)).toBe(sha)
    expect(projection).toBe(body)
  })

  it("pins the known `literal` inconsistency so a future tidy can't land by accident", () => {
    // Entry 1's literal is already English, entry 2's is French. That is logged for Phase 2 and
    // deliberately NOT fixed here — this assertion is what makes "deliberately" checkable.
    const idioms = JSON.parse(readFileSync('data/idioms.json', 'utf8')) as Array<{ literal: string }>
    expect(idioms[0].literal).toBe('There were few of us and grandma gave birth')
    expect(idioms[1].literal).toBe('Être comme une chèvre')
  })
})

// ── Schema equivalence ───────────────────────────────────────────────────────────────────────────
// A VERBATIM inlined copy of the pre-Phase-1a schemas. Never re-point these at the live module —
// the whole point is that they cannot move with the code under test.

const OldDistractorPoolSchema = z.object({
  target_gloss: z.string().min(1),
  candidates: z.array(z.object({ word: z.string().min(1), fr: z.string().min(1) })).min(6),
})

const OldRawWordDataSchema = z.object({
  definition: z.object({ es: z.string().min(1), fr: z.string().min(1), pos: z.string().min(1) }),
  lemma: z.string().min(1),
  form_annotation: z.string().min(1).nullable(),
  examples: z
    .array(z.object({ es: z.string().min(1), fr: z.string().min(1) }))
    .min(2)
    .max(3),
  distractor_pool: OldDistractorPoolSchema,
  lemma_distractor_pool: OldDistractorPoolSchema.nullable().optional(),
})

// The live schemas are module-private by design (only getWordData should parse), so the equivalence
// is exercised through the exported surface that uses them — see below. To compare accept/reject
// directly we rebuild the NEW shape here from its documented rule, then assert the rule itself
// against the old schema over a payload table. If the rule and the implementation ever diverge, the
// getWordData-level tests in the app catch it; this table pins the rule.
const GlossSides = z.object({
  fr: z.string().min(1).optional(),
  en: z.string().min(1).optional(),
})
const requiresLocale = (locale: 'fr' | 'en') => (o: { fr?: string; en?: string }) =>
  typeof o[locale] === 'string'

const NewDistractorPoolSchema = (locale: 'fr' | 'en') =>
  z.object({
    target_gloss: z.string().min(1),
    candidates: z
      .array(GlossSides.extend({ word: z.string().min(1) }).refine(requiresLocale(locale)))
      .min(6),
  })

const NewRawWordDataSchema = (locale: 'fr' | 'en') =>
  z.object({
    definition: GlossSides.extend({ es: z.string().min(1), pos: z.string().min(1) }).refine(
      requiresLocale(locale),
    ),
    lemma: z.string().min(1),
    form_annotation: z.string().min(1).nullable(),
    examples: z
      .array(GlossSides.extend({ es: z.string().min(1) }).refine(requiresLocale(locale)))
      .min(2)
      .max(3),
    distractor_pool: NewDistractorPoolSchema(locale),
    lemma_distractor_pool: NewDistractorPoolSchema(locale).nullable().optional(),
  })

type GlossKey = 'fr' | 'en' | 'both' | 'none'

const sideFor = (key: GlossKey, v: string) =>
  key === 'both' ? { fr: v, en: v } : key === 'none' ? {} : { [key]: v }

const cands = (key: GlossKey, n = 6) =>
  Array.from({ length: n }, (_, i) => ({ word: `w${i}`, ...sideFor(key, `g${i}`) }))

const pool = (key: GlossKey, n = 6) => ({ target_gloss: 'voiture', candidates: cands(key, n) })

function payload(key: GlossKey) {
  const side = (v: string) => sideFor(key, v)
  const candKey = key
  return {
    definition: { es: 'una casa', ...side('maison'), pos: 'n.f.' },
    lemma: 'casa',
    form_annotation: null,
    examples: [
      { es: 'Estoy en casa.', ...side('Je suis à la maison.') },
      { es: 'Mi casa es azul.', ...side('Ma maison est bleue.') },
    ],
    distractor_pool: pool(candKey),
  }
}

describe('locale-aware schemas — FR accept/reject is unchanged', () => {
  const table: Array<{ name: string; value: unknown }> = [
    { name: 'FR-only (the shipped shape)', value: payload('fr') },
    { name: 'both sides present', value: payload('both') },
    { name: 'EN-only', value: payload('en') },
    { name: 'neither gloss side', value: payload('none') },
    { name: 'empty-string FR gloss', value: { ...payload('fr'), definition: { es: 'x', fr: '', pos: 'n.f.' } } },
    { name: 'missing pos', value: { ...payload('fr'), definition: { es: 'x', fr: 'y' } } },
    { name: 'one example only', value: { ...payload('fr'), examples: [{ es: 'a', fr: 'b' }] } },
    { name: 'five candidates', value: { ...payload('fr'), distractor_pool: pool('fr', 5) } },
    { name: 'weak nested gloss', value: { ...payload('fr'), definition: { es: 'x', fr: { es: 'y' }, pos: 'n.f.' } } },
    { name: 'not an object', value: 'nope' },
    { name: 'null', value: null },
  ]

  it('matches the pre-Phase-1a schema on every payload, for locale fr', () => {
    for (const { name, value } of table) {
      const oldOk = OldRawWordDataSchema.safeParse(value).success
      const newOk = NewRawWordDataSchema('fr').safeParse(value).success
      expect(newOk, `${name}: old=${oldOk} new=${newOk}`).toBe(oldOk)
    }
  })

  it('parses FR-shaped payloads to identical values', () => {
    // The shape production actually sends today. Anything the old schema accepted must come out of
    // the new one byte-for-byte the same, or a stored definition would change shape under FR users.
    for (const { name, value } of table.filter((t) => !t.name.includes('both'))) {
      const oldRes = OldRawWordDataSchema.safeParse(value)
      if (!oldRes.success) continue
      const newRes = NewRawWordDataSchema('fr').safeParse(value)
      expect(newRes.success, name).toBe(true)
      if (newRes.success) expect(newRes.data, name).toEqual(oldRes.data)
    }
  })

  it('keeps the EN side when both are present — the one intended difference', () => {
    // The old schema had no `en` key, so zod stripped it; the new one retains it. This is the whole
    // feature, pinned here so it reads as intent rather than as a regression in the test above.
    const both = payload('both')
    const oldData = OldRawWordDataSchema.parse(both) as { definition: Record<string, unknown> }
    const newData = NewRawWordDataSchema('fr').parse(both) as { definition: Record<string, unknown> }
    expect(oldData.definition.en).toBeUndefined()
    expect(newData.definition.en).toBe('maison')
    expect(newData.definition.fr).toBe(oldData.definition.fr)
  })

  it('an EN request rejects an FR-only response — the point of the refine', () => {
    expect(NewRawWordDataSchema('en').safeParse(payload('fr')).success).toBe(false)
    expect(NewRawWordDataSchema('en').safeParse(payload('en')).success).toBe(true)
    expect(NewRawWordDataSchema('en').safeParse(payload('both')).success).toBe(true)
  })

  it('an FR request rejects an EN-only response, symmetrically', () => {
    expect(NewRawWordDataSchema('fr').safeParse(payload('en')).success).toBe(false)
  })
})

describe('the EN prompt is authored, not translated', () => {
  it('is a different prompt from the FR one', () => {
    expect(systemPromptFor('en')).toBe(EN_SYSTEM_PROMPT)
    expect(systemPromptFor('en')).not.toBe(systemPromptFor('fr'))
    expect(discoveryPromptFor('en', 12)).toBe(enDiscoverySystemPrompt(12))
  })

  it('addresses an English speaker and asks for English output', () => {
    expect(EN_SYSTEM_PROMPT).toContain('for an English speaker learning intermediate Spanish')
    expect(EN_SYSTEM_PROMPT).toContain('"definition.en"')
    expect(EN_SYSTEM_PROMPT).not.toContain('"definition.fr"')
  })

  it('drops the French-article rule rather than translating it', () => {
    // The FR discovery prompt says: for nouns include the French article ("le marché"). Translating
    // that rule would produce "the market" for every noun, which is not how English glosses read.
    expect(discoverySystemPrompt(12)).toContain('include the French article')
    expect(enDiscoverySystemPrompt(12)).not.toContain('include the French article')
    expect(enDiscoverySystemPrompt(12)).toContain('NO article')
  })

  it('carries English false friends, not the French ones', () => {
    expect(SYSTEM_PROMPT).toContain('embarrassée')
    expect(EN_SYSTEM_PROMPT).not.toContain('embarrassée')
    expect(EN_SYSTEM_PROMPT).toContain('"éxito" ≠ exit')
  })

  it('keeps the Spanish-side rules identical across locales — they are about Spanish', () => {
    for (const rule of [
      'Spanish grammar terminology only',
      '"v.pron."',
      'the target word is the only natural fit for the blank',
      'BARE INFINITIVE form',
    ]) {
      expect(SYSTEM_PROMPT, rule).toContain(rule)
      expect(EN_SYSTEM_PROMPT, rule).toContain(rule)
    }
  })

  it('addresses the user turn in the learner’s language', () => {
    expect(userPromptFor('en', 'casa')).toBe('Spanish word: "casa"')
    expect(userPromptFor('en', 'casa')).not.toBe(userPromptFor('fr', 'casa'))
    expect(discoveryUserPromptFor('en', 'La casa', '')).toBe('Theme: "La casa"')
  })
})
