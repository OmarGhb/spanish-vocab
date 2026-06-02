'use client'

import { useEffect } from 'react'
import type { RatingResult } from '@/lib/rating'

type Props = {
  result: RatingResult
  onRate: (r: 1 | 2 | 3 | 4) => void
}

const LABELS: Record<1 | 2 | 3 | 4, string> = {
  1: 'À revoir',
  2: 'Difficile',
  3: 'Bien',
  4: 'Facile',
}

// FSRS labels kept (NOT the design's fixed 1j/3j/7j/21j intervals). One consistent
// treatment across every verdict: the suggested rating is a solid accent pill, the rest
// are outlined — and Enter advances with the suggestion (no need to move to tap it).
export default function RatingButtons({ result, onRate }: Props) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Enter') {
        e.preventDefault()
        onRate(result.rating)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [result.rating, onRate])

  return (
    <div>
      <p className="font-serif text-sm text-ink mb-3">Comment tu as trouvé ce mot ?</p>
      <div className="grid grid-cols-4 gap-2">
        {([1, 2, 3, 4] as const).map((r) => {
          const suggested = r === result.rating
          return (
            <button
              key={r}
              type="button"
              onClick={() => onRate(r)}
              aria-pressed={suggested}
              className={`rounded-card border py-2.5 text-center font-serif text-xs font-bold leading-tight transition-colors ${
                suggested
                  ? 'bg-accent border-accent text-white'
                  : 'bg-card border-line text-muted active:bg-tint'
              }`}
            >
              {LABELS[r]}
            </button>
          )
        })}
      </div>
      <p className="mt-2 text-center text-[11px] text-muted">
        Suggestion : {LABELS[result.rating]} · <span className="whitespace-nowrap">↵ pour valider</span>
      </p>
    </div>
  )
}
