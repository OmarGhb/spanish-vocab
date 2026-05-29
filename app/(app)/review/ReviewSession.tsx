'use client'

import Image from 'next/image'
import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import type { ReviewCard } from './page'
import FillInBlank from './FillInBlank'
import MultipleChoice from './MultipleChoice'

type Props = { cards: ReviewCard[] }

// One entry per reviewed word, accumulated in-memory during the session.
// correct = final rating was Hard/Good/Easy (2/3/4); ✗ = Again (1).
type Outcome = { word: string; defEs: string; correct: boolean; timeMs: number }

function chooseMode(card: ReviewCard, index: number): 'blank' | 'mc' {
  if (card.distractors.length === 0) return 'blank'
  if (card.examples.length === 0) return 'mc'
  return index % 2 === 0 ? 'blank' : 'mc'
}

export default function ReviewSession({ cards }: Props) {
  const [index, setIndex] = useState(0)
  const [done, setDone] = useState(false)
  const [outcomes, setOutcomes] = useState<Outcome[]>([])
  const [dueRemaining, setDueRemaining] = useState(0)

  // Timer boundary: cardStartRef is written in an effect on each card change and read
  // only inside child event handlers — never during render. Using a ref (not state)
  // avoids a cascading render that setState-in-effect would cause.
  const cardStartRef = useRef(0)
  useEffect(() => {
    cardStartRef.current = Date.now()
  }, [index])

  async function handleRate(rating: 1 | 2 | 3 | 4, timeMs: number, hintUsed: boolean) {
    const card = cards[index]
    // The deck is fixed (one row per word, no re-show), so a single append per
    // rating yields exactly one recap row per word — no dedup needed.
    setOutcomes((prev) => [
      ...prev,
      { word: card.word, defEs: card.definition?.es ?? '', correct: rating !== 1, timeMs },
    ])

    try {
      await fetch('/api/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cardId: card.id, rating, timeMs, hintUsed }),
      })
    } catch {
      // Network failure: silently continue — losing one log entry is acceptable.
      console.warn('[review] POST /api/review failed for card', card.id)
    }

    if (index + 1 >= cards.length) {
      // Session over. Count cards still due now — reflects the reschedule the
      // /api/review POST just wrote — to decide whether to show the "Encore N" CTA.
      try {
        const supabase = createClient()
        const { count } = await supabase
          .from('review_cards')
          .select('*', { count: 'exact', head: true })
          .lte('due', new Date().toISOString())
        setDueRemaining(count ?? 0)
      } catch {
        setDueRemaining(0)
      }
      setDone(true)
    } else {
      setIndex((i) => i + 1)
    }
  }

  if (done) {
    const total = outcomes.length
    const correct = outcomes.filter((o) => o.correct).length
    const successPct = total > 0 ? Math.round((correct / total) * 100) : 0
    const totalMs = outcomes.reduce((sum, o) => sum + o.timeMs, 0)
    const timeLabel = totalMs < 60_000 ? '< 1 min' : `${Math.round(totalMs / 60_000)} min`

    return (
      <div className="px-5 pt-8 pb-24 flex flex-col gap-6">
        {/* Header */}
        <div className="flex flex-col items-center text-center gap-2">
          <Image src="/paco-feliz.png" alt="Paco" width={96} height={96} className="object-contain" />
          <p className="font-serif text-2xl font-bold text-ink">¡Buen trabajo!</p>
          <p className="text-sm text-muted">Session terminée</p>
        </div>

        {/* Words reviewed this session */}
        {outcomes.length > 0 && (
          <ul className="bg-card rounded-card shadow-card divide-y divide-line">
            {outcomes.map((o, i) => (
              <li key={i} className="flex items-center gap-3 px-4 py-3">
                <span className={`text-base leading-none ${o.correct ? 'text-ok' : 'text-err'}`}>
                  {o.correct ? '✓' : '✗'}
                </span>
                <div className="min-w-0">
                  <p className="font-serif text-sm font-bold text-ink">{o.word}</p>
                  {o.defEs && <p className="text-xs text-muted line-clamp-1">{o.defEs}</p>}
                </div>
              </li>
            ))}
          </ul>
        )}

        {/* Stats */}
        <div className="flex">
          {[
            { label: 'Révisés', value: String(total) },
            { label: 'Réussite', value: `${successPct}%` },
            { label: 'Temps', value: timeLabel },
          ].map((s) => (
            <div key={s.label} className="flex-1 flex flex-col items-center gap-1">
              <p className="font-serif text-2xl font-bold text-ink">{s.value}</p>
              <p className="text-[10px] uppercase tracking-widest text-muted">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-3">
          {dueRemaining > 0 && (
            <Link
              href="/review"
              className="block bg-accent text-white rounded-card py-4 font-serif font-semibold text-sm text-center"
            >
              Encore {dueRemaining} mot{dueRemaining !== 1 ? 's' : ''} à revoir →
            </Link>
          )}
          <Link
            href="/"
            className="block border border-line rounded-card py-4 font-serif text-sm text-center text-ink"
          >
            ← Accueil
          </Link>
        </div>
      </div>
    )
  }

  const card = cards[index]
  const mode = chooseMode(card, index)

  return (
    <div className="px-5 pt-5 pb-20">
      {/* Header: × | 1/N | ÉCRITURE */}
      <div className="flex justify-between items-center mb-3">
        <Link href="/" className="text-2xl text-muted hover:text-ink leading-none select-none">
          ×
        </Link>
        <span className="text-sm text-ink">
          {index + 1} / {cards.length}
        </span>
        <span className="text-xs text-accent font-semibold uppercase tracking-widest">
          {mode === 'blank' ? 'Écriture' : 'QCM'}
        </span>
      </div>

      {/* Progress bar */}
      <div className="h-0.5 bg-line rounded-full mb-8">
        <div
          className="h-0.5 bg-accent rounded-full transition-all duration-300"
          style={{ width: `${((index + 1) / cards.length) * 100}%` }}
        />
      </div>

      {mode === 'blank' ? (
        <FillInBlank key={card.id} card={card} cardStartRef={cardStartRef} onRate={handleRate} />
      ) : (
        <MultipleChoice key={card.id} card={card} cardStartRef={cardStartRef} onRate={handleRate} />
      )}
    </div>
  )
}
