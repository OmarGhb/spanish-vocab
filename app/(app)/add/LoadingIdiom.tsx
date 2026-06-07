'use client'

import Image from 'next/image'
import { useEffect, useState } from 'react'
import Button from '../Button'
import IdiomCard from './IdiomCard'
import { getRandomIdiom } from '@/lib/idioms'

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

// Offsets in ms from shell appearance for phases 1–3. Phase 4 resolves on data arrival (component unmounts).
const PHASE_TIMERS = [1100, 1700, 2100] as const
// Loading shell is suppressed until this delay so fast deck-hit responses never flash the loader.
const LOADING_SHELL_DELAY_MS = 400

function PhaseChecklist() {
  const [completedCount, setCompletedCount] = useState(0)

  useEffect(() => {
    const t1 = setTimeout(() => setCompletedCount((c) => Math.max(c, 1)), PHASE_TIMERS[0])
    const t2 = setTimeout(() => setCompletedCount((c) => Math.max(c, 2)), PHASE_TIMERS[1])
    const t3 = setTimeout(() => setCompletedCount((c) => Math.max(c, 3)), PHASE_TIMERS[2])
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3) }
  }, [])

  return (
    <ul className="mt-3 flex flex-col gap-2">
      {PHASES.map((phase, i) => {
        const done = completedCount > i
        const active = completedCount === i
        return (
          <li key={phase} className="flex items-center gap-2">
            {done ? (
              <span className="w-4 h-4 rounded-full bg-ok flex items-center justify-center shrink-0">
                <span className="text-white text-[9px] leading-none">✓</span>
              </span>
            ) : active ? (
              <span className="w-4 h-4 rounded-full border-2 border-accent motion-safe:animate-pulse shrink-0" />
            ) : (
              <span className="w-4 h-4 rounded-full border border-muted opacity-30 shrink-0" />
            )}
            <span className={`text-sm font-serif ${done ? 'text-ink' : active ? 'text-ink font-semibold' : 'text-muted'}`}>
              {phase}{active && <span className="text-muted motion-safe:animate-pulse"> ···</span>}
            </span>
          </li>
        )
      })}
    </ul>
  )
}

export default function LoadingIdiom({ status, word, result, onReveal, onRetry }: Props) {
  const [idiom] = useState(() => getRandomIdiom())
  const [shellVisible, setShellVisible] = useState(false)

  useEffect(() => {
    if (status !== 'loading') return
    const t = setTimeout(() => setShellVisible(true), LOADING_SHELL_DELAY_MS)
    return () => clearTimeout(t)
  }, [status])

  const isReady = status === 'ready'

  // Suppress loading shell until delay fires — fast deck hits never paint the loader.
  if (status === 'loading' && !shellVisible) return null

  return (
    <div className={`flex flex-col gap-5 p-5 ${isReady ? 'min-h-[calc(100svh-4rem)]' : ''}`}>
      <div className={`${isReady ? 'flex-1 flex flex-col' : 'bg-card rounded-card shadow-card p-5'}`}>

        {/* ── LOADING ── */}
        {status === 'loading' && (
          <>
            <div className="flex items-center gap-3">
              <Image src="/paco-pensando.png" alt="Paco" width={56} height={56} className="object-contain shrink-0" />
              <p className="font-serif text-[18px] font-semibold italic tracking-[-0.01em] text-ink">
                Paco creuse pour <span className="text-accent font-bold">{word}</span>
              </p>
            </div>
            <PhaseChecklist />
          </>
        )}

        {/* ── READY (¡Listo! hold) ── */}
        {status === 'ready' && (
          <>
            <div className="flex items-center gap-3">
              <Image src="/paco-feliz.png" alt="Paco" width={80} height={80} className="object-contain shrink-0" />
              <div>
                <p className="font-serif text-[2.75rem] font-bold italic leading-none tracking-[-0.02em] text-ink">¡Listo!</p>
                <p className="font-serif text-sm text-muted mt-2">Voici ce que Paco a trouvé.</p>
              </div>
            </div>

            {result && (
              <div className="mt-4 bg-card border border-line shadow-card rounded-card p-[18px]">
                <div className="flex items-baseline gap-2 min-w-0">
                  <span className="font-serif text-[32px] font-bold tracking-[-0.02em] text-ink leading-none truncate min-w-0">{result.word}</span>
                  {result.definition.pos && (
                    <span className="font-serif text-[11px] italic text-muted shrink-0">{result.definition.pos}</span>
                  )}
                </div>
                <p className="font-serif text-sm italic text-muted mt-1 line-clamp-1">{result.definition.es}</p>
                <div className="border-t border-line mt-4 pt-4">
                  <ul className="flex flex-col gap-2">
                    {PHASES.map((phase) => (
                      <li key={phase} className="flex items-center gap-2">
                        <span className="w-4 text-center text-ok text-sm leading-none">✓</span>
                        <span className="text-sm font-serif text-ink">{phase}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            <div className="flex-1 min-h-6" />
            {/* Unified to the canonical amber primary (board §03 — retires the v0.5.1 dark "ink CTA"
                pilot; the system has no dark-brown primary). */}
            <Button variant="primary" full type="button" onClick={onReveal}>
              Voir la fiche →
            </Button>
          </>
        )}

        {/* ── ERROR ── */}
        {status === 'error' && (
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <Image src="/paco-sad.png" alt="Paco" width={44} height={44} className="object-contain shrink-0" />
              <p className="text-sm text-err font-serif">
                Une erreur s&apos;est produite — veuillez réessayer.
              </p>
            </div>
            <button
              type="button"
              onClick={onRetry}
              className="w-full border border-line rounded-card py-4 font-serif text-sm text-ink"
            >
              Réessayer
            </button>
          </div>
        )}
      </div>

      {status !== 'ready' && (
        <>
          {status === 'loading' && (
            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-line" />
              <span className="text-[10px] uppercase tracking-widest text-muted font-sans">Pendant que tu attends</span>
              <div className="flex-1 h-px bg-line" />
            </div>
          )}
          <IdiomCard idiom={idiom} />
        </>
      )}
    </div>
  )
}
