import Image from 'next/image'
import { Plus, Compass, RefreshCw } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import Button from '../Button'
import ReviewSession from './ReviewSession'
import { mapReviewRow } from './mapCard'
import { clampCardsPerSession } from '@/lib/session-cap'
import { nextReviewLabel } from '@/lib/review-estimate'

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
  // Cached MP3 URL for the "Lecture auto à la révélation" autoplay (undefined → no audio).
  audioUrl?: string
}

export default async function ReviewPage() {
  const supabase = await createClient()

  // Cheap single-row read: unlock flag (skips unlock-evaluation work when already unlocked) +
  // the user's session cap. Read BEFORE the deck query so the cap bounds the .limit().
  const { data: profile } = await supabase
    .from('profiles')
    .select('dictionary_unlocked, cards_per_session')
    .maybeSingle()
  const dictionaryUnlocked = profile?.dictionary_unlocked === true
  const cardsPerSession = clampCardsPerSession(profile?.cards_per_session)

  const { data: rows } = await supabase
    .from('review_cards')
    .select('*, words(word, lemma, definition, examples, distractors, audio_urls)')
    .lte('due', new Date().toISOString())
    .order('due', { ascending: true })
    .limit(cardsPerSession)

  const cards: ReviewCard[] = (rows ?? []).map(mapReviewRow)

  // The Réviser pill goes straight into a session (the entry card lives on Home now). Nothing
  // due → the restful Durmiendo passive state.
  if (cards.length === 0) {
    // Earliest not-yet-due card → the "prochaine révision" label. Null (nothing scheduled at all,
    // e.g. a brand-new account) → omit the pill entirely (nextReviewLabel returns null → the buttons
    // already cover that path). RLS scopes this to the current user.
    const nowMs = new Date().getTime()
    const { data: nextRow } = await supabase
      .from('review_cards')
      .select('due')
      .gt('due', new Date(nowMs).toISOString())
      .order('due', { ascending: true })
      .limit(1)
      .maybeSingle()
    const nextDueMs = nextRow?.due ? Date.parse(nextRow.due) : null
    const nextLabel = nextReviewLabel(nextDueMs, nowMs)

    return (
      <div className="flex flex-col flex-1 items-center justify-center text-center px-[26px] pb-10">
        <Image src="/paco-durmiendo.png" alt="Paco se repose" width={200} height={200} className="object-contain mb-2" />
        <div className="font-sans text-[10.5px] font-bold tracking-[0.14em] uppercase text-faint">Révision</div>
        <h1 className="font-serif text-[25px] font-bold tracking-[-0.02em] text-ink mt-2.5">Rien à réviser pour l’instant</h1>
        <p className="text-[14px] text-muted leading-[1.55] mt-2.5 max-w-[280px]">
          Tu es à jour. Paco se repose — reviens un peu plus tard, ou ajoute de nouveaux mots en attendant.
        </p>
        <div className="flex gap-2.5 mt-[26px]">
          <Button variant="primary" href="/add">
            <Plus size={17} strokeWidth={1.9} />
            Ajouter un mot
          </Button>
          <Button variant="secondary" href="/discover">
            <Compass size={17} strokeWidth={1.9} />
            Découvrir
          </Button>
        </div>
        {nextLabel && (
          <div className="mt-[18px] inline-flex items-center gap-2 rounded-full bg-card border border-line px-3.5 py-2 shadow-card-sm">
            <RefreshCw size={14} strokeWidth={1.8} className="text-faint" />
            <span className="font-sans text-[12.5px] text-muted">
              Prochaine révision <b className="text-ink font-semibold">{nextLabel}</b>
            </span>
          </div>
        )}
      </div>
    )
  }

  return <ReviewSession cards={cards} dictionaryUnlocked={dictionaryUnlocked} cardsPerSession={cardsPerSession} />
}
