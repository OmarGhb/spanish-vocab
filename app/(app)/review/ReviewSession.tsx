'use client'

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
      <div className="bg-white rounded border p-8 text-center">
        <p className="text-gray-900 font-semibold mb-4">Révision terminée.</p>
        <Link href="/add" className="text-sm underline text-gray-500 hover:text-gray-800">
          Ajouter un mot
        </Link>
      </div>
    )
  }

  const card = cards[index]
  const mode = chooseMode(card, index)

  return (
    <div className="bg-white rounded border p-8">
      <div className="flex justify-between items-center mb-6">
        <span className="text-xs text-gray-400">
          {index + 1} / {cards.length}
        </span>
        <span className="text-xs text-gray-400 uppercase tracking-wide">
          {mode === 'blank' ? 'Complétez' : 'Choisissez'}
        </span>
      </div>

      {mode === 'blank' ? (
        <FillInBlank
          key={card.id}
          card={card}
          cardStartRef={cardStartRef}
          onRate={handleRate}
        />
      ) : (
        <MultipleChoice
          key={card.id}
          card={card}
          cardStartRef={cardStartRef}
          onRate={handleRate}
        />
      )}
    </div>
  )
}
