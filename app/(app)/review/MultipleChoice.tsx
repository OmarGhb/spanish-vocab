'use client'

import type React from 'react'
import { useMemo, useState } from 'react'
import { computeRating, type RatingResult } from '@/lib/rating'
import type { ReviewCard } from './page'
import RatingButtons from './RatingButtons'
import ResultReveal from './ResultReveal'

type Props = {
  card: ReviewCard
  // cardStartRef is written by ReviewSession on each card mount (in a useEffect) and
  // read here only inside event handlers — never during render.
  cardStartRef: React.RefObject<number>
  onRate: (rating: 1 | 2 | 3 | 4, timeMs: number, hintUsed: boolean) => void
}

function shuffle<T>(arr: T[], seed: number): T[] {
  const a = [...arr]
  let s = seed
  for (let i = a.length - 1; i > 0; i--) {
    s = (s * 1664525 + 1013904223) & 0xffffffff
    const j = Math.abs(s) % (i + 1)
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

// Derive a stable numeric seed from a UUID string — same value on server and client,
// preventing React hydration mismatches from Math.random() in lazy initializers.
function seedFromId(id: string): number {
  return parseInt(id.replace(/-/g, '').slice(0, 8), 16) || id.charCodeAt(0)
}

export default function MultipleChoice({ card, cardStartRef, onRate }: Props) {
  const { word, definition, examples, distractors } = card

  // Deterministic seed — stable across SSR and hydration.
  const seed = useMemo(() => seedFromId(card.id), [card.id])

  // Prompt chosen deterministically once: definition or masked example.
  const [prompt] = useState<
    | { type: 'definition'; es: string; fr: string }
    | { type: 'example'; es: string; fr: string }
  >(() => {
    if (examples.length === 0) return { type: 'definition', es: definition.es, fr: definition.fr }
    const useExample = seed % 2 === 0
    if (!useExample) return { type: 'definition', es: definition.es, fr: definition.fr }
    const ex = examples[seed % examples.length]
    const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    return { type: 'example', es: ex.es.replace(new RegExp(escaped, 'i'), '_____'), fr: ex.fr }
  })

  // Stable shuffle across re-renders, keyed on seed.
  const options = useMemo(() => shuffle([word, ...distractors], seed), [word, distractors, seed])

  const [chosen, setChosen] = useState<string | null>(null)
  const [result, setResult] = useState<RatingResult | null>(null)
  const [hintUsed, setHintUsed] = useState(false)
  // timeMs frozen at pick — not recomputed when the user taps a rating.
  const [frozenTimeMs, setFrozenTimeMs] = useState(0)

  function handlePick(option: string) {
    if (result) return
    // Timer stops here. cardStartRef.current was set on card mount by ReviewSession.
    // eslint-disable-next-line react-hooks/purity -- Date.now() in an event handler is correct usage
    const timeMs = Date.now() - cardStartRef.current
    setChosen(option)
    setFrozenTimeMs(timeMs)
    const rating = computeRating({ correctWord: word, userAnswer: option, timeMs, hintUsed, mode: 'mc' })
    setResult(rating)
  }

  function optionStyle(option: string): string {
    const base = 'w-full text-left rounded-lg border px-4 py-3 text-sm transition-colors'
    if (!result) return `${base} border-line bg-card text-ink hover:border-accent`
    // Canonical success/danger tint tokens (same hue + intensity as the écriture result
    // surfaces and the bilan ✓/✗ circles) — not the old math-derived bg-ok/10 alphas.
    if (option === word) return `${base} border-ok bg-ok-bg text-ok`
    if (option === chosen && chosen !== word) return `${base} border-err bg-err-bg text-err`
    return `${base} border-line text-muted opacity-50`
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Verdict at the TOP, matching écriture (verdict → answer detail → rating). Same Paco
          reveal as FillInBlank; MCQ is binary — no ¡Casi!; the correct option stays tinted in
          the list below, so no extra "answer" line is needed. */}
      {result && (
        <ResultReveal
          verdict={chosen === word ? 'correct' : 'wrong'}
          note={chosen === word ? (hintUsed ? 'avec un indice' : 'du premier coup') : null}
        />
      )}

      <div>
        {prompt.type === 'definition' ? (
          <>
            <p className="font-serif text-sm text-ink leading-relaxed">{prompt.es}</p>
            {hintUsed ? (
              <p className="font-serif italic text-sm text-muted mt-1">{prompt.fr}</p>
            ) : (
              !result && (
                <button
                  type="button"
                  onClick={() => setHintUsed(true)}
                  className="text-xs text-accent mt-2"
                >
                  ↓ Voir en français
                </button>
              )
            )}
          </>
        ) : (
          <>
            <p className="font-serif text-base text-ink leading-relaxed">{prompt.es}</p>
            <p className="font-serif text-sm text-muted mt-1">{prompt.fr}</p>
          </>
        )}
      </div>

      <div className="flex flex-col gap-2">
        {options.map((option) => (
          <button key={option} onClick={() => handlePick(option)} className={optionStyle(option)}>
            {option}
          </button>
        ))}
      </div>

      {result && (
        // Quiet fade-up cascade matching écriture's rating slot (verdict already fades itself).
        <div className="fade-up" style={{ animationDelay: '0.18s' }}>
          <RatingButtons result={result} onRate={(r) => onRate(r, frozenTimeMs, hintUsed)} />
        </div>
      )}
    </div>
  )
}
