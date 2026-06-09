'use client'

import Image from 'next/image'
import { useEffect, useRef } from 'react'
import Confetti from '../Confetti'
import Display from '../Display'
import { markDictionaryUnlocked } from './actions'

// The one sanctioned ceremony — the re-skinned dictionary-unlock takeover (board ⑤).
// Full-screen layer (z above the top nav, like the discover overlay). Used in two places:
//   • inline at review-end (grafted onto the bilan) — onPrimary → /dictionary, onDismiss
//     ("Plus tard") resumes the bilan exit the user had tapped;
//   • the safety-net interstitial (/dictionary/unlocked) — onPrimary → /dictionary,
//     onDismiss → home.
// Flips the sticky unlock flag ON MOUNT (markDictionaryUnlocked), so the flag is an honest
// "ceremony has been shown" once-guard: it can't be lost by quitting before tapping, and the
// safety-net stays valid until the celebration actually renders. Idempotent server action;
// fired from the client mount, never an RSC render (the M5.2b prefetch-flip lesson).
export default function UnlockTakeover({
  memorizedCount,
  onPrimary,
  onDismiss,
}: {
  memorizedCount: number
  onPrimary: () => void
  onDismiss: () => void
}) {
  const flipped = useRef(false)
  useEffect(() => {
    if (flipped.current) return
    flipped.current = true
    void markDictionaryUnlocked().catch(() => {})
  }, [])

  return (
    <div className="fixed inset-0 z-[60] bg-page">
      <div className="relative mx-auto flex h-full w-full max-w-[430px] flex-col">
        <Confetti />

        {/* Centered hero — mascot + halo, eyebrow, headline, Fraunces milestone count, body */}
        <div className="relative z-[2] flex flex-1 flex-col items-center justify-center px-9 text-center">
          <div className="lx-pop relative">
            <div
              className="lx-halo absolute -inset-9 rounded-full"
              style={{
                background:
                  'radial-gradient(circle, rgba(246,226,194,0.95) 0%, rgba(245,237,218,0) 70%)',
              }}
            />
            <Image
              src="/paco-feliz.png"
              alt=""
              width={150}
              height={150}
              className="lx-bob relative object-contain"
            />
          </div>

          <p
            className="lx-rise mt-4 text-[11px] font-bold uppercase tracking-[0.18em] text-accent"
            style={{ animationDelay: '0.15s' }}
          >
            Débloqué
          </p>
          <h1
            className="lx-rise mt-2.5 max-w-[300px] font-serif text-[28px] font-bold leading-[1.12] tracking-[-0.02em] text-ink"
            style={{ animationDelay: '0.24s' }}
          >
            Ton dictionnaire est débloqué&nbsp;!
          </h1>
          <div
            className="lx-rise mt-[18px] flex items-baseline gap-2.5"
            style={{ animationDelay: '0.36s' }}
          >
            <Display kind="milestone" className="text-[56px] leading-none text-amber-deep">
              {memorizedCount}
            </Display>
            <span className="font-serif text-[19px] font-bold text-ink">mots mémorisés</span>
          </div>
          <p
            className="lx-rise mt-3.5 max-w-[290px] text-[14.5px] leading-[1.6] text-muted"
            style={{ animationDelay: '0.46s' }}
          >
            Rangés de A à Z, rien que les tiens. Le premier rayon d&apos;une longue étagère.
          </p>
        </div>

        {/* CTA block — one loud direction (amber) + a quiet "Plus tard" ghost dismiss */}
        <div
          className="lx-rise relative z-[2] flex flex-col gap-1.5 px-6"
          style={{
            animationDelay: '0.56s',
            paddingBottom: 'max(2rem, env(safe-area-inset-bottom))',
          }}
        >
          <button
            type="button"
            onClick={onPrimary}
            className="flex w-full items-center justify-center gap-2 rounded-card bg-accent py-[15px] font-serif text-base font-bold text-ivory"
            style={{ boxShadow: 'var(--shadow-amber)' }}
          >
            Ouvrir mon dictionnaire
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.1} strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14M13 6l6 6-6 6" />
            </svg>
          </button>
          <button
            type="button"
            onClick={onDismiss}
            className="w-full py-3 text-center font-serif text-base font-semibold text-muted"
          >
            Plus tard
          </button>
        </div>
      </div>
    </div>
  )
}
