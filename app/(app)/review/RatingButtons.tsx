'use client'

import { useEffect, useRef, useState } from 'react'
import type { RatingResult } from '@/lib/rating'
import { useSettings } from '../SettingsProvider'
import { resolveChrome, REVIEW_CHROME, RATING_LABELS } from '@/lib/immersion'

type Props = {
  result: RatingResult
  onRate: (r: 1 | 2 | 3 | 4) => void
}

// Single-hue amber gradation = effort intensity (darkest = most work). NO dots — the 4-dot atom
// is word-level MASTERY elsewhere; 4 dots here would invert it. Named rating-scale tokens.
//
// Three states (M6.1 reviser handoff), reading neutral → colored-but-hollow → colored-solid:
//   • default     — resting pill (bg-card / neutral line / ink)
//   • preselected — the SYSTEM suggestion, not yet committed: soft tone tint + solid tone border
//   • selected    — the user's committed tap (or the confirmed suggestion): solid tone fill + shadow
const DEFAULT_CLS = 'bg-card border-line text-ink'
const TONE: Record<1 | 2 | 3 | 4, { selected: string; preselected: string }> = {
  1: { selected: 'bg-amber-deep border-amber-deep text-ivory', preselected: 'bg-rate-again-tint border-amber-deep text-rate-again-text' },
  2: { selected: 'bg-accent border-accent text-ivory', preselected: 'bg-rate-hard-tint border-accent text-rate-hard-text' },
  3: { selected: 'bg-amber-mid border-amber-mid text-ivory', preselected: 'bg-rate-good-tint border-amber-mid text-rate-good-text' },
  4: { selected: 'bg-amber-pale border-amber-pale text-ink', preselected: 'bg-rate-easy-tint border-amber-pale text-rate-easy-text' },
}

// How long the tapped pill shows its SELECTED (solid) state before the card advances — long
// enough to read as committed tap-feedback, short enough to still feel like one tap (M6.1).
const SELECT_BEAT_MS = 160

export default function RatingButtons({ result, onRate }: Props) {
  const { chromeCtx } = useSettings()
  // The user's committed tap. null → the suggestion still renders as PRESELECTED (tint); once set,
  // that pill flips to SELECTED (solid) for a brief beat before the card advances.
  const [selected, setSelected] = useState<1 | 2 | 3 | 4 | null>(null)

  const committedRef = useRef(false)
  const advanceTimerRef = useRef<number | null>(null)
  const onRateRef = useRef(onRate)
  useEffect(() => { onRateRef.current = onRate }, [onRate])
  useEffect(() => () => { if (advanceTimerRef.current) window.clearTimeout(advanceTimerRef.current) }, [])

  function doAdvance(r: 1 | 2 | 3 | 4) {
    if (committedRef.current) return
    committedRef.current = true
    onRateRef.current(r)
  }

  // Commit a rating the way the design reads it: paint the SELECTED (solid) pill, then advance a
  // beat later so the state is legible. A single tap — no confirm step, no auto-advance (M6.1
  // handoff): the card moves on only when the user taps a pill (or presses Enter).
  function commit(r: 1 | 2 | 3 | 4) {
    if (committedRef.current || selected !== null) return
    setSelected(r)
    advanceTimerRef.current = window.setTimeout(() => doAdvance(r), SELECT_BEAT_MS)
  }

  // Enter commits the suggestion (shows it selected, then advances). Nothing fires without input.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Enter') {
        e.preventDefault()
        commit(result.rating)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
    // commit reads live state via closures recreated each render; result.rating is the only dep.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [result.rating])

  // One tap commits that rating — the suggested OR any other (no select-then-confirm step).
  function onPillClick(r: 1 | 2 | 3 | 4) {
    commit(r)
  }

  return (
    <div>
      <p className="font-serif text-[17px] text-ink mb-3">{resolveChrome(REVIEW_CHROME.ratingQuestion, chromeCtx)}</p>

      <div className="grid grid-cols-4 gap-[9px]">
        {([1, 2, 3, 4] as const).map((r) => {
          // default → preselected (system suggestion, until a tap) → selected (the committed tap).
          const isSelected = selected === r
          const isPreselected = selected === null && r === result.rating
          const cls = isSelected
            ? `${TONE[r].selected} shadow-amber-sm`
            : isPreselected
              ? TONE[r].preselected
              : DEFAULT_CLS
          return (
            <button
              key={r}
              type="button"
              onClick={() => onPillClick(r)}
              className={`rounded-full border-[1.5px] py-[7px] text-center font-sans text-[13.5px] font-semibold leading-tight transition-colors ${cls}`}
            >
              {resolveChrome(RATING_LABELS[r], chromeCtx)}
            </button>
          )
        })}
      </div>
    </div>
  )
}
