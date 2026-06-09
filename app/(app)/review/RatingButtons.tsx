'use client'

import { useEffect, useRef, useState } from 'react'
import { Clock, Pause } from 'lucide-react'
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

// Single-hue amber gradation = effort intensity (darkest = most work). NO dots — the 4-dot atom
// is word-level MASTERY elsewhere; 4 dots here would invert it. Named rating-scale tokens.
const TONE: Record<1 | 2 | 3 | 4, { fill: string; text: string }> = {
  1: { fill: 'bg-amber-deep border-amber-deep', text: 'text-ivory' },
  2: { fill: 'bg-accent border-accent', text: 'text-ivory' },
  3: { fill: 'bg-amber-mid border-amber-mid', text: 'text-ivory' },
  4: { fill: 'bg-amber-pale border-amber-pale', text: 'text-ink' },
}

// THE single tunable constant. Tune on device.
const AUTO_ADVANCE_MS = 10000
const TICK_MS = 120

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
  const reduced = usePrefersReducedMotion()
  const [phase, setPhase] = useState<Phase>('counting')
  const [progress, setProgress] = useState(0) // 0..1 bar fill
  const [secondsLeft, setSecondsLeft] = useState(Math.ceil(AUTO_ADVANCE_MS / 1000))

  const committedRef = useRef(false)
  const onRateRef = useRef(onRate)
  useEffect(() => { onRateRef.current = onRate }, [onRate])

  function doAdvance(r: 1 | 2 | 3 | 4) {
    if (committedRef.current) return
    committedRef.current = true
    onRateRef.current(r)
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

  // Enter advances now with the suggestion.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Enter') {
        e.preventDefault()
        doAdvance(result.rating)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [result.rating])

  // One tap advances with that rating — the suggested OR any other (no select-then-confirm step).
  function onPillClick(r: 1 | 2 | 3 | 4) {
    doAdvance(r)
  }

  return (
    <div>
      <p className="font-serif text-[17px] text-ink mb-3">Comment tu as trouvé ce mot ?</p>

      <div className="grid grid-cols-4 gap-[9px]">
        {([1, 2, 3, 4] as const).map((r) => {
          const filled = r === result.rating // pre-filled suggestion; any pill is a one-tap choice
          const cls = filled
            ? `${TONE[r].fill} ${TONE[r].text} shadow-amber-sm`
            : 'bg-card border-line text-ink'
          return (
            <button
              key={r}
              type="button"
              onClick={() => onPillClick(r)}
              className={`rounded-full border-[1.5px] py-[7px] text-center font-sans text-[13.5px] font-semibold leading-tight transition-colors ${cls}`}
            >
              {LABELS[r]}
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
              Prochaine question…
            </span>
            <button
              type="button"
              onClick={() => setPhase('stopped')}
              aria-label="Arrêter le minuteur"
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
