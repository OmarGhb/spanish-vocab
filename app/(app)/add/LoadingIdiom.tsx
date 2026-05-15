'use client'

import Image from 'next/image'
import { useState } from 'react'
import IdiomCard from './IdiomCard'
import { getRandomIdiom } from '@/lib/idioms'

type Props = {
  status: 'loading' | 'ready' | 'error'
  onReveal: () => void
  onRetry: () => void
}

export default function LoadingIdiom({ status, onReveal, onRetry }: Props) {
  // Picked once on mount — stable for the entire loading session for this word.
  const [idiom] = useState(() => getRandomIdiom())

  return (
    <div className="flex flex-col gap-5 p-5">
      <div className="bg-card rounded-card shadow-card p-5">
        {status === 'loading' && (
          <div className="flex items-center gap-3">
            <Image src="/paco-pensando.png" alt="Paco" width={44} height={44} className="object-contain shrink-0" />
            <p className="text-sm font-serif text-muted">Paco cherche en coulisses…</p>
          </div>
        )}

        {status === 'ready' && (
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <Image src="/paco-feliz.png" alt="Paco" width={44} height={44} className="object-contain shrink-0" />
              <p className="text-sm text-ok font-serif font-medium">¡Listo! Paco a trouvé ton mot.</p>
            </div>
            <button
              type="button"
              onClick={onReveal}
              className="w-full bg-accent text-white rounded-card py-4 font-serif text-sm"
            >
              Voir la définition →
            </button>
          </div>
        )}

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
