import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import ReviewSession from './ReviewSession'

export type ReviewCard = {
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
  word: string
  definition: string
  examples: Array<{ es: string; fr: string }>
  distractors: string[]
}

export default async function ReviewPage() {
  const supabase = await createClient()

  const { data: rows } = await supabase
    .from('review_cards')
    .select('*, words(word, definition, examples, distractors)')
    .lte('due', new Date().toISOString())
    .order('due', { ascending: true })
    .limit(20)

  const cards: ReviewCard[] = (rows ?? []).map((row) => {
    const w = row.words as {
      word: string
      definition: string
      examples: Array<{ es: string; fr: string }>
      distractors: string[]
    }
    return {
      id: row.id as string,
      word_id: row.word_id as string,
      due: row.due as string,
      stability: row.stability as number,
      difficulty: row.difficulty as number,
      elapsed_days: row.elapsed_days as number,
      scheduled_days: row.scheduled_days as number,
      reps: row.reps as number,
      lapses: row.lapses as number,
      state: row.state as number,
      last_review: row.last_review as string | null,
      word: w.word,
      definition: w.definition,
      examples: w.examples,
      distractors: w.distractors,
    }
  })

  if (cards.length === 0) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-gray-50 p-6">
        <div className="w-full max-w-lg bg-white rounded border p-8 text-center">
          <p className="text-gray-700 mb-4">
            Tout est à jour pour aujourd&apos;hui — vous pouvez toujours ajouter de nouveaux mots.
          </p>
          <Link href="/add" className="text-sm underline text-gray-500 hover:text-gray-800">
            Ajouter un mot
          </Link>
        </div>
      </main>
    )
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gray-50 p-6">
      <div className="w-full max-w-lg">
        <ReviewSession cards={cards} />
      </div>
    </main>
  )
}
