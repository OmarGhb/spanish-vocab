'use client'

import { useEffect } from 'react'
import Image from 'next/image'

// One-time Home handoff banner (M6.2c) — greets the just-onboarded user. Rendered by the Home page
// only when `?welcome=1` is present; the `added` count is the swipe kept-count (sanitized server-side,
// NOT the live collection count, since kept words aren't `promoted` yet). Single-fire + tamper-safe:
// on mount it strips the query from the URL (history.replaceState) so a refresh can't re-greet, and a
// hand-edited `?added=999` can't render because the server clamps the value before it reaches here.
export default function SalutBanner({ name, added }: { name: string; added: number }) {
  useEffect(() => {
    // Drop ?welcome/&added so a reload lands on a clean Home with no banner.
    window.history.replaceState(null, '', window.location.pathname)
  }, [])

  return (
    <div className="flex items-center gap-3.5 bg-surface-alt border-[1.5px] border-tinted-border rounded-[16px] px-4 py-3.5 shadow-card">
      <Image src="/paco-feliz.png" alt="" width={50} height={50} className="object-contain shrink-0" />
      <div className="min-w-0">
        <div className="font-serif text-[19px] font-bold tracking-[-0.01em] text-ink">¡Muy bien, {name}&nbsp;!</div>
        <div className="font-sans text-[12.5px] text-muted mt-0.5">
          {added > 0
            ? `${added} mot${added !== 1 ? 's' : ''} ajouté${added !== 1 ? 's' : ''}. Ta collection démarre ici.`
            : 'Bienvenue ! Ajoute tes premiers mots quand tu veux.'}
        </div>
      </div>
    </div>
  )
}
