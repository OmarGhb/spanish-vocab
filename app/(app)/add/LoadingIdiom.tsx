'use client'

import Image from 'next/image'
import { useEffect, useRef, useState } from 'react'
import { Check } from 'lucide-react'
import Button from '../Button'
import Display from '../Display'
import StickyActions from '../StickyActions'
import IdiomCard from './IdiomCard'
import { getRandomIdiom } from '@/lib/idioms'
import { posAbbrev } from '@/lib/discovery'

type PreviewData = {
  word: string
  definition: { es: string; pos?: string }
}

type Props = {
  status: 'loading' | 'ready' | 'error'
  word: string
  result?: PreviewData
  onReveal: () => void
  onRetry: () => void
}

const PHASES = ['Définition', 'Exemples', 'Mots de la même famille', 'Phonétique'] as const

// Orchestration constants (MOTION-loading.md §1 / §6 — Omar tunes feel on device).
// Steps 1–3 dwell deterministically (decoupled from data) so they read as deliberate beats;
// step 4 (Phonétique) holds for the REAL enrichment promise. The ¡Listo! reveal is gated on
// max(dataReady, floor) so even an instant resolve still shows the choreography.
const PHASE_DWELL = 850 // min "active" dwell for steps 1–3
const MIN_VISIBLE_FLOOR_MS = 3050 // total min visible — phase 4 pulses ≥~once after steps 1–3
const PHASE4_REVEAL_BEAT_MS = 550 // phase-4 check draw + pop settle + crossfade, before ¡Listo!
// Loading shell suppressed until this delay so fast deck/spellcheck/lemma resolves (which
// unmount the loader) never flash it.
const LOADING_SHELL_DELAY_MS = 400

type PhaseState = 'done' | 'active' | 'pending'

// Three rising "Paco réfléchit" dots — animation wired in globals.css, staggered 0/.15/.30,
// degrades to static @ .6 under reduced motion. Mounts with the active phase only.
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
  let indicator: React.ReactNode
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

export default function LoadingIdiom({ status, word, result, onReveal, onRetry }: Props) {
  const [idiom] = useState(() => getRandomIdiom())
  const [shellVisible, setShellVisible] = useState(false)
  const [doneCount, setDoneCount] = useState(0) // 0..4; active phase = doneCount (or -1 once 4)
  const [showListo, setShowListo] = useState(false)

  const startAtRef = useRef<number | null>(null) // when the choreography began (shell visible)
  const revealScheduledRef = useRef(false)

  // The loader is visible once the shell-delay timer fires, OR immediately if data/error is
  // already here (a fast resolve still runs the floor-gated choreography → ¡Listo!). Derived,
  // not synchronously set in an effect (avoids the cascading-render rule).
  const visible = shellVisible || status !== 'loading'

  // Shell-delay timer — only needed while still loading; reveals the loader after the delay.
  useEffect(() => {
    if (status !== 'loading' || shellVisible) return
    const t = setTimeout(() => setShellVisible(true), LOADING_SHELL_DELAY_MS)
    return () => clearTimeout(t)
  }, [status, shellVisible])

  // Steps 1–3 timeline — deterministic dwell, started once the loader is visible. Step 4 holds.
  useEffect(() => {
    if (!visible || startAtRef.current !== null) return
    startAtRef.current = Date.now()
    const timers = [
      setTimeout(() => setDoneCount((c) => Math.max(c, 1)), PHASE_DWELL),
      setTimeout(() => setDoneCount((c) => Math.max(c, 2)), PHASE_DWELL * 2),
      setTimeout(() => setDoneCount((c) => Math.max(c, 3)), PHASE_DWELL * 3),
    ]
    return () => timers.forEach(clearTimeout)
  }, [visible])

  // Reveal gate — once data is ready, flip phase 4 → done at max(dataReady, floor), then beat
  // out to ¡Listo!. Honest hold if data is slow (reveals immediately on late arrival).
  useEffect(() => {
    if (status !== 'ready' || !visible || revealScheduledRef.current) return
    revealScheduledRef.current = true
    const start = startAtRef.current ?? Date.now()
    const delay = Math.max(MIN_VISIBLE_FLOOR_MS - (Date.now() - start), 0)
    let t2: ReturnType<typeof setTimeout>
    const t1 = setTimeout(() => {
      setDoneCount(4) // phase 4 → done (check draws, active → none)
      t2 = setTimeout(() => setShowListo(true), PHASE4_REVEAL_BEAT_MS)
    }, delay)
    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, [status, visible])

  // ── ERROR ──
  if (status === 'error') {
    return (
      <div className="flex flex-col gap-4 p-5">
        <div className="flex items-center gap-3">
          <Image src="/paco-sad.png" alt="Paco" width={44} height={44} className="object-contain shrink-0" />
          <p className="text-sm text-err font-serif">
            Une erreur s&apos;est produite — veuillez réessayer.
          </p>
        </div>
        <Button variant="secondary" full type="button" onClick={onRetry}>
          Réessayer
        </Button>
      </div>
    )
  }

  // Suppress until the shell-delay fires (fast resolves never paint the loader).
  if (!visible) return null

  // ── ¡Listo! (revealed after the floor) ──
  if (showListo) {
    return (
      <>
        <div className="flex flex-col gap-4 p-5 pb-24 fade-up">
          <div className="flex items-center gap-3.5">
            <Image src="/paco-feliz.png" alt="Paco" width={58} height={58} className="object-contain shrink-0" />
            <div>
              {/* The SOLE Fraunces usage in the add flow — the allowlist Display primitive. */}
              <Display kind="listo" className="text-[34px] leading-none text-ink">¡Listo!</Display>
              <p className="text-[13.5px] text-muted mt-2">Voici ce que Paco a trouvé.</p>
            </div>
          </div>

          {result && (
            <div className="bg-card border border-line shadow-card rounded-[18px] p-[22px]">
              <div className="flex items-baseline gap-2.5 min-w-0">
                <span className="font-serif text-[30px] font-bold tracking-[-0.02em] text-ink leading-none truncate min-w-0">{result.word}</span>
                {result.definition.pos && (
                  <span className="text-[14.5px] font-medium text-muted shrink-0">{posAbbrev(result.definition.pos)}</span>
                )}
              </div>
              <p className="font-serif text-[14.5px] italic text-muted mt-1 line-clamp-1">{result.definition.es}</p>
              <div className="border-t border-border-soft mt-4 pt-4">
                <ul className="flex flex-col gap-2.5">
                  {PHASES.map((phase) => (
                    <li key={phase} className="flex items-center gap-2.5">
                      <Check size={15} strokeWidth={2.4} className="text-ok shrink-0" />
                      <span className="font-serif text-[15.5px] text-ink">{phase}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>
        {/* CTA pinned bottom via the shared fixed/safe-area bar (board §3 "pinned bottom") —
            same proven pattern as the fiche; replaces the brittle min-h column that clipped it. */}
        <StickyActions>
          <Button variant="primary" full type="button" onClick={onReveal}>
            Voir la fiche →
          </Button>
        </StickyActions>
      </>
    )
  }

  // ── LOADING (checklist + idiom) ──
  const phaseState = (i: number): PhaseState => (i < doneCount ? 'done' : i === doneCount ? 'active' : 'pending')
  return (
    <div className="flex flex-col gap-4 p-5">
      <div className="bg-card border border-line rounded-2xl shadow-card px-[18px] py-4">
        <div className="flex items-center gap-3 mb-4">
          <Image src="/paco-pensando.png" alt="Paco" width={52} height={52} className="paco-breathe object-contain shrink-0" />
          <p className="font-serif text-[18.5px] font-semibold italic leading-tight text-ink">
            Paco creuse pour <span className="text-accent">{word}</span>
          </p>
        </div>
        <div className="flex flex-col gap-[14px]">
          {PHASES.map((phase, i) => (
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
