'use client'

import Image from 'next/image'
import { useRouter } from 'next/navigation'
import Confetti from '../../Confetti'

// One-time unlock celebration (full-screen takeover, z above the top nav like the discover
// overlay). CTA uses router.replace so browser-back doesn't land back on the celebration.
export default function UnlockInterstitial() {
  const router = useRouter()
  return (
    <div className="fixed inset-0 z-[60] bg-page">
      <div className="relative mx-auto flex h-full w-full max-w-[430px] flex-col items-center justify-center gap-4 px-8 text-center">
        <Confetti />
        <Image src="/paco-feliz.png" alt="Paco" width={120} height={120} className="object-contain" />
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-accent">Débloqué</p>
        <h1 className="font-serif text-[2.75rem] font-bold italic leading-none tracking-[-0.02em] text-ink">
          ¡Listo&nbsp;!
        </h1>
        <p className="font-serif text-lg text-ink">Ton dictionnaire est ouvert.</p>
        <p className="max-w-[300px] text-sm leading-relaxed text-muted">
          10 mots mémorisés, rangés de A à Z. Le premier rayon d&apos;une longue étagère.
        </p>
        <button
          type="button"
          onClick={() => router.replace('/dictionary')}
          className="mt-2 rounded-card bg-accent px-6 py-3.5 font-serif text-sm font-bold text-white"
          style={{ marginBottom: 'env(safe-area-inset-bottom)' }}
        >
          Ouvrir le dictionnaire →
        </button>
      </div>
    </div>
  )
}
