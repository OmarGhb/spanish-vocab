'use client'

import Image from 'next/image'
import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import type { ReviewCard } from './page'
import FillInBlank from './FillInBlank'
import MultipleChoice from './MultipleChoice'

type Props = { cards: ReviewCard[] }

function chooseMode(card: ReviewCard, index: number): 'blank' | 'mc' {
  if (card.distractors.length === 0) return 'blank'
  if (card.examples.length === 0) return 'mc'
  return index % 2 === 0 ? 'blank' : 'mc'
}

export default function ReviewSession({ cards }: Props) {
  const [index, setIndex] = useState(0)
  const [done, setDone] = useState(false)

  // Timer boundary: cardStartRef is written in an effect on each card change and read
  // only inside child event handlers — never during render. Using a ref (not state)
  // avoids a cascading render that setState-in-effect would cause.
  const cardStartRef = useRef(0)
  useEffect(() => {
    cardStartRef.current = Date.now()
  }, [index])

  async function handleRate(rating: 1 | 2 | 3 | 4, timeMs: number, hintUsed: boolean) {
    const card = cards[index]
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
      setDone(true)
    } else {
      setIndex((i) => i + 1)
    }
  }

  if (done) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen px-5 pb-20 gap-6 text-center">
        <Image src="/paco-feliz.png" alt="Paco" width={110} height={110} className="object-contain" />
        <div>
          <p className="font-serif text-2xl font-bold text-ink">¡Buen trabajo!</p>
          <p className="text-sm text-muted mt-2">
            {cards.length} carte{cards.length > 1 ? 's' : ''} révisée{cards.length > 1 ? 's' : ''}.
          </p>
        </div>
        <div className="w-full flex flex-col gap-3">
          <Link
            href="/add"
            className="block bg-accent text-white rounded-card py-4 font-serif text-sm text-center"
          >
            + Ajouter un mot
          </Link>
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
