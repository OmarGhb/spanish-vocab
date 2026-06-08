import type { ReviewCard } from './page'
import { flatBilingual } from '@/lib/bilingual'

// Single mapper from a `review_cards` + embedded `words` row to a ReviewCard, used by the server
// page AND the client "Encore N" refetch so they can't diverge. Crucially it NORMALIZES the
// bilingual fields (definition.es/fr + every examples[].es/fr) to plain strings via flatBilingual,
// so a malformed/nested historic shape can never reach a raw React render (the M5.5e card-10 crash).
type RawRow = {
  id: string
  word_id: string
  due: string
  stability: number
  difficulty: number
  elapsed_days: number
  scheduled_days: number
  reps: number
  lapses: number
  state: number
  last_review: string | null
  words: {
    word: string
    lemma: string | null
    definition: { es?: unknown; fr?: unknown; pos?: unknown } | null
    examples: Array<{ es?: unknown; fr?: unknown }> | null
    distractors: string[] | null
  }
}

export function mapReviewRow(row: RawRow): ReviewCard {
  const w = row.words
  const def = w.definition ?? {}
  return {
    id: row.id,
    word_id: row.word_id,
    due: row.due,
    stability: row.stability,
    difficulty: row.difficulty,
    elapsed_days: row.elapsed_days,
    scheduled_days: row.scheduled_days,
    reps: row.reps,
    lapses: row.lapses,
    state: row.state,
    last_review: row.last_review ?? null,
    word: w.word,
    lemma: w.lemma,
    definition: {
      es: flatBilingual(def.es, 'es'),
      fr: flatBilingual(def.fr, 'fr'),
      ...(typeof def.pos === 'string' ? { pos: def.pos } : {}),
    },
    examples: (w.examples ?? []).map((e) => ({
      es: flatBilingual(e?.es, 'es'),
      fr: flatBilingual(e?.fr, 'fr'),
    })),
    distractors: w.distractors ?? [],
  }
}
