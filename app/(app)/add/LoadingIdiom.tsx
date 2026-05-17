'use client'

import Image from 'next/image'
import { useEffect, useState } from 'react'
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

// Offsets in ms from mount for phases 1–3. Phase 4 only resolves on data arrival (component unmounts).
const PHASE_TIMERS = [800, 1500, 2400] as const

function PhaseChecklist() {
  const [shown, setShown] = useState(false)
  const [completedCount, setCompletedCount] = useState(0)

  useEffect(() => {
    const t0 = setTimeout(() => setShown(true), 200)
    const t1 = setTimeout(() => setCompletedCount((c) => Math.max(c, 1)), PHASE_TIMERS[0])
    const t2 = setTimeout(() => setCompletedCount((c) => Math.max(c, 2)), PHASE_TIMERS[1])
    const t3 = setTimeout(() => setCompletedCount((c) => Math.max(c, 3)), PHASE_TIMERS[2])
    return () => { clearTimeout(t0); clearTimeout(t1); clearTimeout(t2); clearTimeout(t3) }
  }, [])

  if (!shown) return null

  return (
    <ul className="mt-3 flex flex-col gap-2">
      {PHASES.map((phase, i) => {
        const done = completedCount > i
        const active = completedCount === i
        return (
          <li key={phase} className="flex items-center gap-2">
            {done ? (
              <span className="w-4 text-center text-ok text-sm leading-none">✓</span>
            ) : active ? (
              <span className="w-4 text-center text-muted text-sm leading-none motion-safe:animate-pulse">◉</span>
            ) : (
              <span className="w-4 text-center text-muted text-sm leading-none opacity-40">○</span>
            )}
            <span className={`text-sm font-serif ${done ? 'text-ink' : 'text-muted'}`}>
              {phase}
            </span>
          </li>
        )
      })}
    </ul>
  )
}

export default function LoadingIdiom({ status, word, result, onReveal, onRetry }: Props) {
  const [idiom] = useState(() => getRandomIdiom())

  const isReady = status === 'ready'

  return (
    <div className={`flex flex-col gap-5 p-5 ${isReady ? 'min-h-[calc(100svh-4rem)]' : ''}`}>
      <div className={`bg-card rounded-card shadow-card p-5 ${isReady ? 'flex-1 flex flex-col' : ''}`}>

        {/* ── LOADING ── */}
        {status === 'loading' && (
          <>
            <div className="flex items-center gap-3">
              <Image src="/paco-pensando.png" alt="Paco" width={44} height={44} className="object-contain shrink-0" />
              <p className="text-sm font-serif text-muted">
                Paco creuse pour <span className="text-accent">{word}</span>
              </p>
            </div>
            <PhaseChecklist />
          </>
        )}

        {/* ── READY (¡Listo! hold) ── */}
        {status === 'ready' && (
          <>
            <div className="flex items-center gap-3">
              <Image src="/paco-feliz.png" alt="Paco" width={44} height={44} className="object-contain shrink-0" />
              <p className="text-sm text-ok font-serif font-medium">¡Listo!</p>
            </div>
            <p className="text-sm text-muted font-serif mt-1">Voici ce que Paco a trouvé.</p>

            <ul className="mt-4 flex flex-col gap-2">
              {PHASES.map((phase) => (
                <li key={phase} className="flex items-center gap-2">
                  <span className="w-4 text-center text-ok text-sm leading-none">✓</span>
                  <span className="text-sm font-serif text-ink">{phase}</span>
                </li>
              ))}
            </ul>

            {result && (
              <div className="mt-4 bg-surface-alt rounded-card p-4">
                <p className="font-serif text-xl font-bold text-ink truncate">{result.word}</p>
                <p className="font-serif text-sm text-muted mt-1 line-clamp-2">{result.definition.es}</p>
              </div>
            )}

            <button
              type="button"
              onClick={onReveal}
              className="mt-auto w-full bg-ink text-page rounded-card py-4 font-serif text-sm"
            >
              Voir la fiche →
            </button>
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

      <IdiomCard idiom={idiom} />
    </div>
  )
}
