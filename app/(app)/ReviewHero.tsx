import Image from 'next/image'
import { Clock } from 'lucide-react'
import type { HeroState } from '@/lib/home-state'
import { resolveChrome, HOME_CHROME, type ImmersionMode } from '@/lib/immersion'
import Display from './Display'
import Button from './Button'

// Accueil v2 review hero — the thin-card family (three states, one component) over the locked
// review/FSRS logic. Crème+ SURFACE, never amber-FILLED; the count is the SOLE Fraunces here
// (Display kind="count", italic — the handoff's upright variant is deliberately NOT adopted).
//
//   due         → eyebrow "RÉVISION DISPONIBLE" · minutes CHIP top-right · count + "mots à revoir" · CTA.
//   caughtUp    → Durmiendo Paco (78px) · "Tout est à jour" · rest copy · NO CTA (never punitive).
//   firstReview → Animando Paco · "Bientôt ta première révision" · invitation copy · NO CTA.
//
// The two non-due headlines render in Lora (font-serif) to keep the Fraunces allowlist tight.
export default function ReviewHero({
  state,
  count,
  minutes,
  mode = 'fr_es',
}: {
  state: HeroState
  count: number
  minutes: number
  mode?: ImmersionMode
}) {
  if (state === 'due') {
    return (
      <div className="bg-surface-alt border-[1.5px] border-tinted-border rounded-[18px] shadow-card px-5 pt-[13px] pb-[15px]">
        <div className="flex items-center justify-between gap-3">
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-amber-deep">{resolveChrome(HOME_CHROME.reviewAvailable, mode)}</p>
          {/* Minutes CHIP (was bare inline text) — a bordered crème pill top-right. */}
          <span className="inline-flex items-center gap-1.5 shrink-0 whitespace-nowrap rounded-full bg-card border border-line px-2.5 py-1 text-[12px] font-semibold text-muted">
            <Clock size={13} strokeWidth={1.9} className="text-faint" /> ≈ {minutes} min
          </span>
        </div>
        <div className="flex items-baseline gap-2.5 mt-[7px]">
          <Display kind="count" className="text-[46px] leading-[0.9] text-ink">{count}</Display>
          <span className="font-serif text-[19px] font-bold text-ink tracking-[-0.01em]">
            {mode === 'fr_es'
              ? `mot${count !== 1 ? 's' : ''} à revoir`
              : `palabra${count !== 1 ? 's' : ''} por repasar`}
          </span>
        </div>
        <div className="mt-3">
          <Button variant="primary" full href="/review" className="!py-[13px] !text-[15px]">
            {resolveChrome(HOME_CHROME.startReview, mode)} →
          </Button>
        </div>
      </div>
    )
  }

  // Caught-up / before-first-review / preparing share a thin horizontal row (no CTA), differing only
  // by mascot mood + copy. `preparing` = words added but still enriching (fresh onboarding); it reuses
  // the firstReview eyebrow + the Animando mascot but says "your words are being prepared" instead of
  // the (now-only-when-genuinely-empty) "add your first words" invitation.
  const caughtUp = state === 'caughtUp'
  const preparing = state === 'preparing'
  const eyebrow = caughtUp ? HOME_CHROME.reviewEyebrow : HOME_CHROME.firstReviewEyebrow
  const headline = caughtUp
    ? HOME_CHROME.allUpToDate
    : preparing
      ? HOME_CHROME.heroPreparingHeadline
      : HOME_CHROME.firstReviewSoon
  const copy = caughtUp
    ? HOME_CHROME.caughtUpCopy
    : preparing
      ? HOME_CHROME.heroPreparingCopy
      : HOME_CHROME.firstReviewCopy
  return (
    <div className="bg-surface-alt border-[1.5px] border-tinted-border rounded-[18px] shadow-card px-[18px] py-3 flex items-center gap-3.5">
      <Image
        src={caughtUp ? '/paco-durmiendo.png' : '/paco.png'}
        alt=""
        width={78}
        height={78}
        className="object-contain shrink-0 w-[78px] h-auto"
      />
      <div className="flex-1 min-w-0">
        <p
          className={`text-[10px] font-bold uppercase tracking-[0.14em] ${
            caughtUp ? 'text-faint' : 'text-amber-deep'
          }`}
        >
          {resolveChrome(eyebrow, mode)}
        </p>
        <h2 className="mt-1 font-serif text-[19px] font-bold text-ink tracking-[-0.01em]">
          {resolveChrome(headline, mode)}
        </h2>
        <p className="mt-[3px] text-[12.5px] leading-[1.45] text-muted">
          {resolveChrome(copy, mode)}
        </p>
      </div>
    </div>
  )
}
