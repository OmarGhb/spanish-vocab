'use client'

import { useEffect, useRef, useState } from 'react'
import { Clock, Pause } from 'lucide-react'
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

// THE single tunable constant. Tune on device.
const AUTO_ADVANCE_MS = 10000
const TICK_MS = 120
// How long the tapped pill shows its SELECTED (solid) state before the card advances — long
// enough to read as committed tap-feedback, short enough to still feel like one tap (M6.1).
const SELECT_BEAT_MS = 160

type Phase = 'counting' | 'stopped'

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const update = () => setReduced(mq.matches)
    update()
    mq.addEventListener('change', update)
    return () => mq.removeEventListener('change', update)
  }, [])
  return reduced
}

export default function RatingButtons({ result, onRate }: Props) {
  const { immersionMode } = useSettings()
  const reduced = usePrefersReducedMotion()
  const [phase, setPhase] = useState<Phase>('counting')
  const [progress, setProgress] = useState(0) // 0..1 bar fill
  const [secondsLeft, setSecondsLeft] = useState(Math.ceil(AUTO_ADVANCE_MS / 1000))
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
  // beat later so the state is legible. Still a single tap — no confirm step (M6.1 handoff).
  function commit(r: 1 | 2 | 3 | 4) {
    if (committedRef.current || selected !== null) return
    setSelected(r)
    setPhase('stopped') // freeze the countdown; we're on our way out
    advanceTimerRef.current = window.setTimeout(() => doAdvance(r), SELECT_BEAT_MS)
  }

  // Countdown — runs once while 'counting' (pause/select → terminal 'stopped', no resume). The
  // interval drives the bar fill (JS, so it visibly progresses) + the reduced-motion numeric, and
  // is the completion authority (applies the SUGGESTED rating at 0).
  useEffect(() => {
    if (phase !== 'counting') return
    const end = Date.now() + AUTO_ADVANCE_MS
    const tick = window.setInterval(() => {
      const remaining = end - Date.now()
      if (remaining <= 0) {
        setProgress(1)
        setSecondsLeft(0)
        doAdvance(result.rating)
        return
      }
      setProgress(1 - remaining / AUTO_ADVANCE_MS)
      setSecondsLeft(Math.ceil(remaining / 1000))
    }, TICK_MS)
    return () => window.clearInterval(tick)
    // result.rating is stable for the card's lifetime; doAdvance reads onRate via a ref.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase])

  // Enter commits the suggestion (shows it selected, then advances).
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
      <p className="font-serif text-[17px] text-ink mb-3">{resolveChrome(REVIEW_CHROME.ratingQuestion, immersionMode)}</p>

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
              {resolveChrome(RATING_LABELS[r], immersionMode)}
            </button>
          )
        })}
      </div>

      {/* Auto-advance countdown — a NEUTRAL clock (faint). Only while counting; pause STOPS it
          (no resume). No captions. */}
      {phase === 'counting' && (
        <div className="mt-4 pt-3 border-t border-border-soft">
          <div className="flex items-center justify-between mb-2">
            <span className="flex items-center gap-1.5 text-[13px] font-semibold text-muted">
              <Clock size={14} />
              {resolveChrome(REVIEW_CHROME.nextQuestion, immersionMode)}
            </span>
            <button
              type="button"
              onClick={() => setPhase('stopped')}
              aria-label={resolveChrome(REVIEW_CHROME.stopTimer, immersionMode)}
              className="w-[30px] h-[30px] rounded-[9px] grid place-items-center text-faint active:bg-amber-tint"
            >
              <Pause size={15} />
            </button>
          </div>

          {reduced ? (
            <p className="text-center text-[13px] font-bold tabular-nums text-faint">{secondsLeft}&nbsp;s</p>
          ) : (
            <div className="h-[5px] rounded-full bg-line overflow-hidden">
              <div
                className="h-full bg-faint rounded-full"
                style={{ width: `${progress * 100}%`, transition: `width ${TICK_MS}ms linear` }}
              />
            </div>
          )}
        </div>
      )}
    </div>
  )
}
