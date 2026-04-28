import { z } from 'zod'
import rawIdioms from '../data/idioms.json'

const IdiomOriginSchema = z.enum(['es', 'mx', 'ar', 'co', 'cl', 'pe', 'latam', 'universal'])

const IdiomSchema = z.object({
  id: z.string().min(1),
  phrase: z.string().min(1),
  literal: z.string().min(1),
  meaning: z.string().min(1),
  explanation: z.string().min(1),
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
