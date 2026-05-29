'use client'

import { useState } from 'react'

// The "≈ X min" line with a tappable (i) that reveals how the estimate is derived.
export default function EstimateInfo({ minutes }: { minutes: number }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="relative self-start">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 text-sm text-muted"
        aria-expanded={open}
      >
        <span>≈ {minutes} min</span>
        <span className="w-4 h-4 rounded-full border border-muted/50 text-[10px] leading-none flex items-center justify-center">
          i
        </span>
      </button>
      {open && (
        <p className="absolute left-0 top-full mt-1.5 z-10 w-64 bg-ink text-page text-xs leading-relaxed rounded-lg p-3 shadow-card">
          Estimation d&apos;après ton rythme récent : temps médian par carte × mots à revoir.
        </p>
      )}
    </div>
  )
}
