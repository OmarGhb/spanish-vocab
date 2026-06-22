import Image from 'next/image'
import { Clock } from 'lucide-react'
import type { HeroState } from '@/lib/home-state'
import Display from './Display'
import Button from './Button'

// M5.5j Home review hero — four states, one component family, over the locked review/FSRS logic.
// Settled anatomy (M5.5e): crème+ surface, never amber-FILLED (a SURFACE, not a control); the big
// count is the SOLE Fraunces here (Display kind="count"); the amber primary CTA auto-starts /review.
//
//   due         → eyebrow "RÉVISION DISPONIBLE" · "≈ N min" · big count + "mots à revoir" · CTA.
//   caughtUp    → Durmiendo Paco · "Tout est à jour" · rest copy · NO CTA (never punitive).
//   firstReview → Animando Paco · "Bientôt ta première révision" · invitation copy · NO CTA.
//
// The two non-due headlines render in Lora (font-serif) — the same heading serif as the hub-card
// titles and word headwords — to keep the Fraunces allowlist tight (counts/verdicts only).
export default function ReviewHero({
  state,
  count,
  minutes,
}: {
  state: HeroState
  count: number
  minutes: number
}) {
  if (state === 'due') {
    return (
      <div className="bg-surface-alt border-[1.5px] border-tinted-border rounded-[18px] shadow-card px-[22px] pt-[18px] pb-5">
        <div className="flex items-center justify-between gap-3">
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-amber-deep">Révision disponible</p>
          <span className="flex items-center gap-1.5 text-[13px] text-muted shrink-0 whitespace-nowrap">
            <Clock size={14} strokeWidth={1.9} className="text-faint" /> ≈ {minutes} min
          </span>
        </div>
        <div className="flex items-baseline gap-3 mt-2.5">
          <Display kind="count" className="text-[56px] leading-[0.92] text-ink">{count}</Display>
          <span className="font-serif text-[23px] font-bold text-ink tracking-[-0.01em]">
            mot{count !== 1 ? 's' : ''} à revoir
          </span>
        </div>
        <div className="mt-4">
          <Button variant="primary" full href="/review">Commencer la révision →</Button>
        </div>
      </div>
    )
  }

  // Caught-up vs before-first-review share a layout (horizontal, footprint-matched, no CTA) and
  // differ only by mascot mood + copy.
  const caughtUp = state === 'caughtUp'
  return (
    <div className="bg-surface-alt border-[1.5px] border-tinted-border rounded-[18px] shadow-card px-[22px] py-[18px] min-h-[191px] flex items-center gap-4">
      <Image
        src={caughtUp ? '/paco-durmiendo.png' : '/paco.png'}
        alt=""
        width={caughtUp ? 118 : 104}
        height={caughtUp ? 118 : 104}
        className="object-contain shrink-0"
      />
      <div className="flex-1 min-w-0">
        <p
          className={`text-[11px] font-bold uppercase tracking-[0.14em] ${
            caughtUp ? 'text-faint' : 'text-amber-deep'
          }`}
        >
          {caughtUp ? 'Révision' : 'Première révision'}
        </p>
        <h2 className="mt-[7px] font-serif text-[22px] font-bold text-ink tracking-[-0.01em]">
          {caughtUp ? 'Tout est à jour' : 'Bientôt ta première révision'}
        </h2>
        <p className="mt-1.5 text-[13px] leading-[1.5] text-muted">
          {caughtUp
            ? 'Rien à réviser. Paco se repose — reviens un peu plus tard.'
            : 'Tu pourras lancer ta première révision dès que tu auras ajouté tes premiers mots.'}
        </p>
      </div>
    </div>
  )
}
