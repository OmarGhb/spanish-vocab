import { z } from 'zod'
import rawIdioms from '../data/idioms.json'

const IdiomOriginSchema = z.enum(['es', 'mx', 'ar', 'co', 'cl', 'pe', 'latam', 'universal'])

// M8 Phase 1a — the three EN keys are ADDITIVE and OPTIONAL. No existing field changes shape or
// value: `literal`, `meaning` and `explanation` stay exactly as authored, including the known
// inconsistency that entry 1's `literal` is already English while entry 2's is French. That is
// logged for Phase 2 and deliberately NOT fixed here — editing it would break the byte-identical
// invariant this milestone is built on (the FR projection is pinned in
// lib/__fixtures__/prompt-golden.txt).
//
// Optional means a file with no EN content still parses, so the module-level parse() below keeps its
// fail-at-server-start guarantee both before and after 1b fills these in.
const IdiomSchema = z.object({
  id: z.string().min(1),
  phrase: z.string().min(1),
  literal: z.string().min(1),
  meaning: z.string().min(1),
  explanation: z.string().min(1),
  literal_en: z.string().min(1).optional(),
  meaning_en: z.string().min(1).optional(),
  explanation_en: z.string().min(1).optional(),
  origin: z.array(IdiomOriginSchema).min(1),
})

// Top-level parse — throws at module import if idioms.json is malformed.
// This means a bad entry fails at server start, not silently when a user draws that card.
const idioms = z.array(IdiomSchema).parse(rawIdioms)

export type IdiomOrigin = z.infer<typeof IdiomOriginSchema>
export type Idiom = z.infer<typeof IdiomSchema>

export function getRandomIdiom(): Idiom {
  return idioms[Math.floor(Math.random() * idioms.length)]
}
