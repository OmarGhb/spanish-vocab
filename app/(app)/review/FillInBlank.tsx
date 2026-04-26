'use client'

import { useEffect, useRef, useState } from 'react'
import type React from 'react'
import { computeRating, type RatingResult } from '@/lib/rating'
import type { ReviewCard } from './page'

type Props = {
  card: ReviewCard
  // cardStartRef is written by ReviewSession on each card mount (in a useEffect) and
  // read here only inside event handlers — never during render.
  cardStartRef: React.RefObject<number>
  onRate: (rating: 1 | 2 | 3 | 4, timeMs: number, hintUsed: boolean) => void
}

function maskWord(sentence: string, word: string): string {
  const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return sentence.replace(new RegExp(escaped, 'i'), '_____')
}

export default function FillInBlank({ card, cardStartRef, onRate }: Props) {
  const { word, examples } = card

  // Lazy initializer runs once on mount, not on every render.
  const [example] = useState(() => examples[Math.floor(Math.random() * examples.length)])
  const masked = maskWord(example.es, word)

  const [answer, setAnswer] = useState('')
  const [hintUsed, setHintUsed] = useState(false)
  const [result, setResult] = useState<RatingResult | null>(null)
  // timeMs is frozen at submit so handleRate uses the correct elapsed time,
  // not the time after the result card has been displayed.
  const [frozenTimeMs, setFrozenTimeMs] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  function handleHint() {
    setHintUsed(true)
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (result) return
    // Timer stops here. cardStartRef.current was set on card mount by ReviewSession.
    const timeMs = Date.now() - cardStartRef.current
    setFrozenTimeMs(timeMs)
    const rating = computeRating({ correctWord: word, userAnswer: answer, timeMs, hintUsed, mode: 'blank' })
    setResult(rating)
  }

  function handleRate(override?: 1 | 2 | 3 | 4) {
    onRate(override ?? result!.rating, frozenTimeMs, hintUsed)
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="font-serif text-base text-gray-900 leading-relaxed">{masked}</p>
        <p className="font-serif text-sm text-gray-500 mt-1">{example.fr}</p>
      </div>

      {!result ? (
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <input
            ref={inputRef}
            type="text"
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            placeholder="Votre réponse…"
            required
            className="border rounded px-3 py-2 text-sm placeholder:text-gray-500"
          />
          <div className="flex gap-2">
            {!hintUsed && (
              <button
                type="button"
                onClick={handleHint}
                className="text-xs text-gray-400 hover:text-gray-600 border rounded px-3 py-1.5"
              >
                Indice — première lettre : {word[0]}
              </button>
            )}
            {hintUsed && (
              <span className="text-xs text-gray-400 border rounded px-3 py-1.5">
                Indice utilisé
              </span>
            )}
            <button
              type="submit"
              className="ml-auto bg-black text-white rounded px-4 py-1.5 text-sm"
            >
              Valider
            </button>
          </div>
        </form>
      ) : (
        <div className="flex flex-col gap-4">
          {/* Always show both the user's answer and the correct answer side-by-side. */}
          <div className="flex gap-6 text-sm">
            <div>
              <p className="text-xs uppercase tracking-wide text-gray-400 mb-1">Votre réponse</p>
              <p className="font-serif text-gray-900">{answer || '—'}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-gray-400 mb-1">Correct</p>
              <p className="font-serif font-medium text-gray-900">{word}</p>
            </div>
          </div>
          <p className="font-serif text-sm text-gray-500 leading-relaxed">{example.es}</p>
          <div>
            <p className="text-xs text-gray-400 mb-2">{result.reason}</p>
            <div className="flex gap-2">
              {([1, 2, 3, 4] as const).map((r) => (
                <button
                  key={r}
                  onClick={() => handleRate(r)}
                  className={`flex-1 rounded border py-1.5 text-xs ${r === result.rating ? 'bg-black text-white border-black' : 'text-gray-600 hover:border-gray-400'}`}
                >
                  {r === 1 ? 'À revoir' : r === 2 ? 'Difficile' : r === 3 ? 'Bien' : 'Facile'}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
