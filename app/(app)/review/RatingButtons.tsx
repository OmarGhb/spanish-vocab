'use client'

import { useEffect, useRef, useState } from 'react'
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

// FSRS labels kept (NOT the design's fixed 1j/3j/7j/21j intervals). The SUGGESTED rating is
// an accent OUTLINE (not a solid fill — a fill read like an active selection and tapping it
// gave no feedback); the actual SELECTION fills solid. A tap (or Enter) fills the chosen pill,
// then advances after a short beat so the fill is visible. Grading/scheduling unchanged — the
// onRate payload is identical, only delayed by the visual beat.
const ADVANCE_BEAT_MS = 220

export default function RatingButtons({ result, onRate }: Props) {
  const [selected, setSelected] = useState<1 | 2 | 3 | 4 | null>(null)
  const timerRef = useRef<number | null>(null)

  function choose(r: 1 | 2 | 3 | 4) {
    if (selected !== null) return // already committed — ignore further taps/keys
    setSelected(r)
    timerRef.current = window.setTimeout(() => onRate(r), ADVANCE_BEAT_MS)
  }

  // Enter validates with the suggestion — routed through choose() so it shows the same fill beat.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Enter') {
        e.preventDefault()
        choose(result.rating)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
    // choose is stable enough here; gating on result.rating + selected covers the closure.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [result.rating, selected])

  // Clear a pending advance if we unmount (e.g. user navigates away) before it fires.
  useEffect(() => () => {
    if (timerRef.current !== null) window.clearTimeout(timerRef.current)
  }, [])

  return (
    <div>
      <p className="font-serif text-sm text-ink mb-3">Comment tu as trouvé ce mot ?</p>
      <div className="grid grid-cols-4 gap-2">
        {([1, 2, 3, 4] as const).map((r) => {
          const isSelected = selected === r
          const isSuggested = r === result.rating
          // Precedence: selection fills; else the suggestion outlines; else neutral.
          const tone = isSelected
            ? 'bg-accent border-accent text-white'
            : isSuggested
              ? 'bg-card border-accent text-accent'
              : 'bg-card border-line text-muted active:bg-tint'
          return (
            <button
              key={r}
              type="button"
              onClick={() => choose(r)}
              aria-pressed={isSelected}
              className={`rounded-card border py-2.5 text-center font-serif text-xs font-bold leading-tight transition-colors ${tone}`}
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
