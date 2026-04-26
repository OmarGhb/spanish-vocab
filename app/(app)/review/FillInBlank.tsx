'use client'

import { useEffect, useRef, useState } from 'react'
import type React from 'react'
import { computeRating, type RatingResult } from '@/lib/rating'
import { maskSentence } from '@/lib/mask'
import type { ReviewCard } from './page'

type Props = {
  card: ReviewCard
  // cardStartRef is written by ReviewSession on each card mount (in a useEffect) and
  // read here only inside event handlers — never during render.
  cardStartRef: React.RefObject<number>
  onRate: (rating: 1 | 2 | 3 | 4, timeMs: number, hintUsed: boolean) => void
}

const RATING_LABELS: Record<1 | 2 | 3 | 4, string> = {
  1: 'À revoir',
  2: 'Difficile',
  3: 'Bien',
  4: 'Facile',
}

// Deterministic example selection: server and client use the same seed so the
// rendered sentence is identical during SSR and hydration (no mismatch).
// We try examples starting from the seeded index, wrapping around, and take the
// first one where maskSentence() succeeds. If none mask, `picked` is null and
// the component falls back to showing the definition as the prompt.
function pickExample(card: ReviewCard) {
  const { examples, word, id } = card
  if (examples.length === 0) return null

  // Derive a stable seed from the UUID — same value on server and client.
  const seed = parseInt(id.replace(/-/g, '').slice(0, 8), 16) || id.charCodeAt(0)
  const start = seed % examples.length

  for (let i = 0; i < examples.length; i++) {
    const ex = examples[(start + i) % examples.length]
    const masked = maskSentence(ex.es, word)
    if (masked !== null) return { example: ex, masked }
    // [diagnostic] remove once masking is confirmed working
    console.log(`[mask] miss — word="${word}" es="${ex.es}" fr="${ex.fr}"`)
  }

  // If we reach here no example contained the word (or a 4-char stem match).
  // Likely cause: examples were generated before the updated prompt required
  // the target word to appear verbatim. Re-adding the word will fix it.
  console.log(`[mask] all examples failed for word="${word}" — falling back to definition`)
  return null
}

export default function FillInBlank({ card, cardStartRef, onRate }: Props) {
  const { word, definition } = card

  // Computed once on mount via lazy initializer — stable across re-renders.
  const [picked] = useState(() => pickExample(card))

  const [answer, setAnswer] = useState('')
  const [hintUsed, setHintUsed] = useState(false)
  const [result, setResult] = useState<RatingResult | null>(null)
  // selectedRating tracks the user's current choice (auto-set, then overridable).
  const [selectedRating, setSelectedRating] = useState<1 | 2 | 3 | 4 | null>(null)
  // timeMs frozen at submit — not recomputed when the user taps a rating.
  const [frozenTimeMs, setFrozenTimeMs] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  // Enter key confirms the currently selected rating and advances.
  useEffect(() => {
    if (!result || selectedRating === null) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault()
        onRate(selectedRating, frozenTimeMs, hintUsed)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [result, selectedRating, frozenTimeMs, hintUsed, onRate])

  function handleHint() {
    setHintUsed(true)
  }

  function handleSubmit(e: React.SyntheticEvent) {
    e.preventDefault()
    if (result) return
    // Timer stops here. cardStartRef.current was set on card mount by ReviewSession.
    const timeMs = Date.now() - cardStartRef.current
    setFrozenTimeMs(timeMs)
    const rating = computeRating({ correctWord: word, userAnswer: answer, timeMs, hintUsed, mode: 'blank' })
    setResult(rating)
    setSelectedRating(rating.rating)
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Prompt: masked sentence if one was found, definition otherwise */}
      {picked ? (
        <div>
          <p className="font-serif text-base text-gray-900 leading-relaxed">{picked.masked}</p>
          <p className="font-serif text-sm text-gray-500 mt-1">{picked.example.fr}</p>
        </div>
      ) : (
        <p className="font-serif text-sm text-gray-700 leading-relaxed">{definition}</p>
      )}

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
            {/* Hint shows only "Indice" until clicked — the first letter is revealed after. */}
            {!hintUsed ? (
              <button
                type="button"
                onClick={handleHint}
                className="text-xs text-gray-400 hover:text-gray-600 border rounded px-3 py-1.5"
              >
                Indice
              </button>
            ) : (
              <span className="text-xs text-gray-500 border rounded px-3 py-1.5">
                Première lettre : {word[0]}
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
          {picked && (
            <p className="font-serif text-sm text-gray-500 leading-relaxed">{picked.example.es}</p>
          )}
          <div>
            <p className="text-xs text-gray-500 mb-2">
              Suggéré : {RATING_LABELS[result.rating]} · {result.reason} · Modifiez si nécessaire
            </p>
            <div className="flex gap-2">
              {([1, 2, 3, 4] as const).map((r) => (
                <button
                  key={r}
                  onClick={() => setSelectedRating(r)}
                  className={`flex-1 rounded border py-1.5 text-xs ${
                    r === selectedRating
                      ? 'bg-black text-white border-black'
                      : 'text-gray-600 hover:border-gray-400'
                  }`}
                >
                  {RATING_LABELS[r]}
                </button>
              ))}
            </div>
            <p className="text-xs text-gray-400 mt-2">Appuyez sur Entrée pour valider.</p>
          </div>
        </div>
      )}
    </div>
  )
}
