import Image from 'next/image'
import { createClient } from '@/lib/supabase/server'
import Button from '../Button'
import ReviewSession from './ReviewSession'
import { mapReviewRow } from './mapCard'

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
  lemma: string | null
  definition: { es: string; fr: string; pos?: string }
  examples: Array<{ es: string; fr: string }>
  distractors: string[]
}

export default async function ReviewPage() {
  const supabase = await createClient()

  const { data: rows } = await supabase
    .from('review_cards')
    .select('*, words(word, lemma, definition, examples, distractors)')
    .lte('due', new Date().toISOString())
    .order('due', { ascending: true })
    .limit(20)

  const cards: ReviewCard[] = (rows ?? []).map(mapReviewRow)

  // Cheap single-row flag read so the session can skip all unlock-evaluation work in the
  // common case (already unlocked); only an un-crossed user can owe the review-end takeover.
  const { data: profile } = await supabase
    .from('profiles')
    .select('dictionary_unlocked')
    .maybeSingle()
  const dictionaryUnlocked = profile?.dictionary_unlocked === true

  // The Réviser pill goes straight into a session (the entry card lives on Home now). Nothing
  // due → the restful Durmiendo passive state.
  if (cards.length === 0) {
    return (
      <div className="flex flex-col flex-1 items-center justify-center text-center px-8 pb-16">
        <Image src="/paco-durmiendo.png" alt="Paco" width={200} height={200} className="object-contain" />
        <h1 className="font-serif text-[23px] font-bold tracking-[-0.02em] text-ink mt-1">Rien à réviser</h1>
        <p className="text-[14.5px] text-muted leading-relaxed mt-2 max-w-[260px]">
          Tu es à jour. Paco se repose — reviens un peu plus tard.
        </p>
        <div className="mt-6">
          <Button variant="secondary" href="/discover">Découvrir de nouveaux mots</Button>
        </div>
      </div>
    )
  }

  return <ReviewSession cards={cards} dictionaryUnlocked={dictionaryUnlocked} />
}
