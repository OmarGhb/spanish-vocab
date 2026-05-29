'use client'

import Image from 'next/image'
import { useEffect, useRef, useState } from 'react'
import type React from 'react'
import { computeRating, type RatingResult } from '@/lib/rating'
import { maskSentence } from '@/lib/mask'
import type { ReviewCard } from './page'
import RatingButtons from './RatingButtons'

type Props = {
  card: ReviewCard
  // cardStartRef is written by ReviewSession on each card mount (in a useEffect) and
  // read here only inside event handlers — never during render.
  cardStartRef: React.RefObject<number>
  onRate: (rating: 1 | 2 | 3 | 4, timeMs: number, hintUsed: boolean) => void
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

function editDistance(a: string, b: string): number {
  const m = a.length, n = b.length
  const dp: number[][] = Array.from({ length: m + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
  )
  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++)
      dp[i][j] = a[i - 1] === b[j - 1] ? dp[i - 1][j - 1] : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1])
  return dp[m][n]
}

export default function FillInBlank({ card, cardStartRef, onRate }: Props) {
  const { word, definition } = card

  // Computed once on mount via lazy initializer — stable across re-renders.
  const [picked] = useState(() => pickExample(card))

  const [answer, setAnswer] = useState('')
  const [hintUsed, setHintUsed] = useState(false)
  const [result, setResult] = useState<RatingResult | null>(null)
  // timeMs frozen at submit — not recomputed when the user taps a rating.
  const [frozenTimeMs, setFrozenTimeMs] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

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
  }

  const trimmedAnswer = answer.trim().toLowerCase()
  const trimmedWord = word.trim().toLowerCase()
  const isCorrect = trimmedAnswer === trimmedWord
  const isClose = !isCorrect && editDistance(trimmedAnswer, trimmedWord) <= 2

  function feedbackCopy() {
    if (isCorrect) return '¡Correcto! Sigue así.'
    if (isClose) return '¡Casi! Inténtalo otra vez.'
    return '¡Inténtalo otra vez!'
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Word name + exercise label */}
      <div>
        <p className="font-serif text-2xl font-bold text-ink">{word}</p>
        <p className="text-xs uppercase tracking-widest text-muted mt-2">
          {picked ? 'Complétez la phrase' : 'Définition'}
        </p>
      </div>

      {/* Sentence / definition card */}
      <div className="bg-card rounded-card shadow-card p-5">
        {picked ? (
          <>
            <p className="font-serif text-lg text-ink leading-relaxed">{picked.masked}</p>
            <p className="font-serif italic text-sm text-muted mt-3">{picked.example.fr}</p>
          </>
        ) : (
          <p className="font-serif text-sm text-ink leading-relaxed">{definition.es}</p>
        )}
      </div>

      {!result ? (
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <input
            ref={inputRef}
            type="text"
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            placeholder="Ta réponse…"
            required
            className="w-full border border-line rounded-card px-4 py-4 text-base bg-card text-ink placeholder:text-muted focus:outline-none focus:border-accent"
          />
          <div className="grid grid-cols-3 gap-2">
            {!hintUsed ? (
              <button
                type="button"
                onClick={handleHint}
                className="col-span-1 font-serif text-sm text-ink border border-line rounded-card py-4 bg-card"
              >
                Indice
              </button>
            ) : (
              <span className="col-span-1 flex items-center justify-center font-serif text-sm text-muted border border-line rounded-card py-4 bg-card">
                {word[0]}…
              </span>
            )}
            <button
              type="submit"
              disabled={!answer.trim()}
              className="col-span-2 font-serif font-semibold bg-accent text-white rounded-card py-4 text-sm disabled:opacity-40 transition-opacity"
            >
              Valider →
            </button>
          </div>
        </form>
      ) : (
        <div className="flex flex-col gap-4">
          {/* Feedback card with Paco */}
          <div
            className={`rounded-card p-4 flex items-center gap-3 border ${
              isCorrect ? 'bg-ok/10 border-ok/25' : 'bg-err/10 border-err/20'
            }`}
          >
            <Image src={isCorrect ? '/paco-feliz.png' : '/paco-sad.png'} alt="Paco" width={64} height={64} className="object-contain shrink-0" />
            <div>
              <p className={`font-serif font-medium text-sm ${isCorrect ? 'text-ok' : 'text-err'}`}>
                {feedbackCopy()}
              </p>
              {!isCorrect && (
                <p className="text-xs text-muted mt-0.5">
                  Réponse :{' '}
                  <span className="font-medium text-ink">{word}</span>
                </p>
              )}
            </div>
          </div>
          <RatingButtons result={result} onRate={(r) => onRate(r, frozenTimeMs, hintUsed)} />
        </div>
      )}
    </div>
  )
}
