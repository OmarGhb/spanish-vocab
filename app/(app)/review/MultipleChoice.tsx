'use client'

import type React from 'react'
import { useMemo, useState } from 'react'
import { computeRating, type RatingResult } from '@/lib/rating'
import type { ReviewCard } from './page'

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

export default function MultipleChoice({ card, cardStartRef, onRate }: Props) {
  const { word, definition, examples, distractors } = card

  // Lazy initializers run once on mount, not on every render.
  const [seed] = useState(() => (Math.random() * 1e9) | 0)
  const [prompt] = useState<
    { type: 'definition'; text: string } | { type: 'example'; es: string; fr: string }
  >(() => {
    if (examples.length === 0) return { type: 'definition', text: definition }
    const useExample = Math.random() < 0.5
    if (!useExample) return { type: 'definition', text: definition }
    const ex = examples[(Math.random() * examples.length) | 0]
    const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    return { type: 'example', es: ex.es.replace(new RegExp(escaped, 'i'), '_____'), fr: ex.fr }
  })

  // Stable shuffle across re-renders, using the seed captured at mount.
  const options = useMemo(() => shuffle([word, ...distractors], seed), [word, distractors, seed])

  const [chosen, setChosen] = useState<string | null>(null)
  const [result, setResult] = useState<RatingResult | null>(null)
  // timeMs is frozen at pick so handleRate uses the correct elapsed time,
  // not the time after the result has been displayed.
  const [frozenTimeMs, setFrozenTimeMs] = useState(0)

  function handlePick(option: string) {
    if (result) return
    // Timer stops here. cardStartRef.current was set on card mount by ReviewSession.
    // eslint-disable-next-line react-hooks/purity -- Date.now() in an event handler is correct usage
    const timeMs = Date.now() - cardStartRef.current
    setChosen(option)
    setFrozenTimeMs(timeMs)
    const rating = computeRating({ correctWord: word, userAnswer: option, timeMs, hintUsed: false, mode: 'mc' })
    setResult(rating)
  }

  function handleRate(override?: 1 | 2 | 3 | 4) {
    onRate(override ?? result!.rating, frozenTimeMs, false)
  }

  function optionStyle(option: string): string {
    const base = 'w-full text-left rounded border px-4 py-2.5 text-sm'
    if (!result) return `${base} hover:border-gray-400 text-gray-800`
    if (option === word) return `${base} border-black bg-black text-white`
    if (option === chosen && chosen !== word) return `${base} border-red-400 text-red-700`
    return `${base} text-gray-400`
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        {prompt.type === 'definition' ? (
          <p className="font-serif text-sm text-gray-700 leading-relaxed">{prompt.text}</p>
        ) : (
          <>
            <p className="font-serif text-base text-gray-900 leading-relaxed">{prompt.es}</p>
            <p className="font-serif text-sm text-gray-500 mt-1">{prompt.fr}</p>
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
      )}
    </div>
  )
}
