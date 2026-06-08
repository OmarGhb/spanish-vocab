'use client'

import Image from 'next/image'
import { useState } from 'react'
import { Check } from 'lucide-react'
import Button from '../Button'
import Display from '../Display'
import StickyActions from '../StickyActions'
import LoadingChecklist from '../LoadingChecklist'
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

export default function LoadingIdiom({ status, word, result, onReveal, onRetry }: Props) {
  // The loading choreography (phase-stepping + floor + reveal gate) lives in the shared
  // LoadingChecklist; this component owns only the ¡Listo! reveal + error + the CTA.
  const [showListo, setShowListo] = useState(false)

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

  // ── LOADING (shared choreography) ──
  return (
    <LoadingChecklist
      title={<>Paco creuse pour <span className="text-accent">{word}</span></>}
      phases={PHASES}
      ready={status === 'ready'}
      onReveal={() => setShowListo(true)}
    />
  )
}
