'use client'

import type { ReactNode } from 'react'
import { ChevronLeft } from 'lucide-react'
import Dots from './Dots'

// Onboarding chrome (onb-flow.jsx `OnbShell`): a fixed header (back · progress dots · "Passer") over
// a centered body, with a pinned footer CTA. Full-screen — onboarding lives OUTSIDE the (app) group,
// so there is no TopNav here. All copy is French (instructional scaffolding, never mode-aware).
export default function OnbShell({
  dots,
  onBack,
  onSkip,
  footer,
  children,
}: {
  dots?: { total: number; current: number }
  onBack?: () => void
  onSkip?: () => void
  footer: ReactNode
  children: ReactNode
}) {
  return (
    <main className="w-full max-w-[430px] mx-auto min-h-screen-safe flex flex-col">
      {/* header: back (left) · dots (center) · Passer (right) — the side cells are fixed-width so
          the dots stay optically centered whether or not back/skip are present. */}
      <div className="flex-shrink-0 flex items-center justify-between px-[22px] pt-[18px] pb-1 min-h-[30px]">
        <div className="w-[60px] flex">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              aria-label="Retour"
              className="press-icon -ml-1 p-1 text-muted flex"
            >
              <ChevronLeft size={20} strokeWidth={2.2} />
            </button>
          )}
        </div>
        {dots ? <Dots total={dots.total} current={dots.current} /> : <span />}
        <div className="w-[60px] flex justify-end">
          {onSkip && (
            <button
              type="button"
              onClick={onSkip}
              className="press-pill p-1 font-sans text-[13.5px] font-semibold text-faint"
            >
              Passer
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 min-h-0 flex flex-col px-[26px] pt-3">{children}</div>

      <div className="flex-shrink-0 px-[26px] pb-[26px] pt-4 flex flex-col gap-3">{footer}</div>
    </main>
  )
}
