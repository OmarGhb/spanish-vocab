'use client'

import Image from 'next/image'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import IdiomCard from './IdiomCard'
import { getRandomIdiom } from '@/lib/idioms'

// Shared loading choreography (the "Paco creuse / choisit" wait) — used by /add enrichment and
// /discover generation. The MOTION-loading.md (canonical) phase-stepping: per-phase ring-pop +
// check stroke-draw (one-shots re-fired via a state-keyed indicator remount), synced center dot,
// rising thinking dots, off-tempo breathing Paco, mount-once "Pendant que tu attends" + idiom
// entrance. Pacing: steps 1–3 dwell deterministically (decoupled from data) so they read as
// deliberate beats; the last phase HOLDS for the real promise; reveal is gated on
// max(dataReady, floor) so even an instant resolve shows the full choreography. All `.paco-*`
// classes live in globals.css (declared only under prefers-reduced-motion:no-preference → honest
// static fallback). The caller owns what comes AFTER (¡Listo! / the deck) via `onReveal`.

type PhaseState = 'done' | 'active' | 'pending'

type Props = {
  /** Header line, e.g. <>Paco creuse pour <span className="text-accent">{word}</span></>. */
  title: ReactNode
  /** Ordered phase labels (4 in practice; the last one holds for `ready`). */
  phases: readonly string[]
  /** Becomes true when the real data has arrived (enrichment / generation resolved). */
  ready: boolean
  /** Called ONCE after the min-floor + a settle beat, to advance to the next screen. */
  onReveal: () => void
  bustSrc?: string
  phaseDwellMs?: number
  minFloorMs?: number
  phase4BeatMs?: number
  shellDelayMs?: number
}

function PhaseDots() {
  return (
    <span className="paco-dots inline-flex items-end gap-1 ml-[9px] pb-[2px]" aria-hidden>
      <span className="paco-dot" />
      <span className="paco-dot" />
      <span className="paco-dot" />
    </span>
  )
}

function PhaseRow({ label, state }: { label: string; state: PhaseState }) {
  // The indicator is KEYED by state so a pending→active→done flip REMOUNTS it — the one-shot
  // pacoRingPop + pacoCheckDraw then fire once per phase (a CSS one-shot on a persistent node
  // would play once for the whole screen). MOTION-loading.md §2e / §3.
  let indicator: ReactNode
  if (state === 'done') {
    indicator = (
      <span
        key="done"
        className="paco-ring-done w-[22px] h-[22px] rounded-full bg-ok-bg border-[1.5px] border-sage-border grid place-items-center shrink-0 text-sage-ink"
      >
        {/* The check DRAWS on (stroke-dashoffset 1→0); pathLength=1 makes the dash math
            resolution-independent. lucide can't stroke-draw, so this is inline SVG. */}
        <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path className="paco-check-draw" d="M5 12l4.5 4.5L19 7" pathLength={1} />
        </svg>
      </span>
    )
  } else if (state === 'active') {
    indicator = (
      <span
        key="active"
        className="paco-ring-active w-[22px] h-[22px] rounded-full border-2 border-accent grid place-items-center shrink-0"
      >
        <span className="paco-ring-core w-[7px] h-[7px] rounded-full bg-accent" />
      </span>
    )
  } else {
    indicator = <span key="pending" className="w-[22px] h-[22px] rounded-full border-[1.5px] border-line shrink-0" />
  }
  return (
    <div className="flex items-center gap-3">
      {indicator}
      <span className={`font-serif text-[16.5px] ${state === 'pending' ? 'text-faint font-normal' : 'text-ink font-semibold'}`}>
        {label}
      </span>
      {state === 'active' && <PhaseDots />}
    </div>
  )
}

export default function LoadingChecklist({
  title,
  phases,
  ready,
  onReveal,
  bustSrc = '/paco-pensando.png',
  phaseDwellMs = 850,
  minFloorMs = 3050,
  phase4BeatMs = 550,
  shellDelayMs = 400,
}: Props) {
  const [idiom] = useState(() => getRandomIdiom())
  const [shellVisible, setShellVisible] = useState(false)
  const [doneCount, setDoneCount] = useState(0) // 0..phases.length; active = doneCount (or none once all done)

  const startAtRef = useRef<number | null>(null)
  const revealScheduledRef = useRef(false)
  // onReveal in a ref so the floor-delayed timeout always calls the latest (avoids stale closure).
  const onRevealRef = useRef(onReveal)
  useEffect(() => { onRevealRef.current = onReveal }, [onReveal])

  // Visible once the shell-delay fires OR data is already here (fast resolves still run the
  // floor-gated choreography). Derived, not synchronously set in an effect.
  const visible = shellVisible || ready

  useEffect(() => {
    if (shellVisible || ready) return
    const t = setTimeout(() => setShellVisible(true), shellDelayMs)
    return () => clearTimeout(t)
  }, [shellVisible, ready, shellDelayMs])

  // Steps 1 .. n-1 timeline — deterministic dwell, started once visible. The last phase holds.
  useEffect(() => {
    if (!visible || startAtRef.current !== null) return
    startAtRef.current = Date.now()
    const steps = Math.max(phases.length - 1, 0)
    const timers = Array.from({ length: steps }, (_, i) =>
      setTimeout(() => setDoneCount((c) => Math.max(c, i + 1)), phaseDwellMs * (i + 1)),
    )
    return () => timers.forEach(clearTimeout)
  }, [visible, phases.length, phaseDwellMs])

  // Reveal gate — once ready, flip the last phase → done at max(dataReady, floor), beat, reveal.
  useEffect(() => {
    if (!ready || !visible || revealScheduledRef.current) return
    revealScheduledRef.current = true
    const start = startAtRef.current ?? Date.now()
    const delay = Math.max(minFloorMs - (Date.now() - start), 0)
    let t2: ReturnType<typeof setTimeout>
    const t1 = setTimeout(() => {
      setDoneCount(phases.length) // last phase → done (check draws, none active)
      t2 = setTimeout(() => onRevealRef.current(), phase4BeatMs)
    }, delay)
    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, [ready, visible, minFloorMs, phase4BeatMs, phases.length])

  if (!visible) return null

  const phaseState = (i: number): PhaseState => (i < doneCount ? 'done' : i === doneCount ? 'active' : 'pending')

  return (
    <div className="flex flex-col gap-4 p-5">
      <div className="bg-card border border-line rounded-2xl shadow-card px-[18px] py-4">
        <div className="flex items-center gap-3 mb-4">
          <Image src={bustSrc} alt="Paco" width={52} height={52} className="paco-breathe object-contain shrink-0" />
          <p className="font-serif text-[18.5px] font-semibold italic leading-tight text-ink">{title}</p>
        </div>
        <div className="flex flex-col gap-[14px]">
          {phases.map((phase, i) => (
            <PhaseRow key={phase} label={phase} state={phaseState(i)} />
          ))}
        </div>
      </div>

      <div className="paco-enter flex items-center gap-3 py-0.5">
        <div className="flex-1 h-px bg-border-soft" />
        <span className="text-[10.5px] uppercase tracking-[0.1em] text-faint font-sans">Pendant que tu attends</span>
        <div className="flex-1 h-px bg-border-soft" />
      </div>
      <div className="paco-enter-2">
        <IdiomCard idiom={idiom} />
      </div>
    </div>
  )
}
