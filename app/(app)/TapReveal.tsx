'use client'

import { useState, type ReactNode } from 'react'
import { Eye } from 'lucide-react'

// Tap-to-reveal (M6.1a) — the immersion-mode-b affordance for a French gloss: collapsed, it shows a
// small amber "reveal" link (eye + label); tapping swaps it in place for the French content. Bespoke,
// reusable: the Review gloss sites use it now; Discover (M6.1b) reuses it for the card FR reveal.
// Purely local state — no mode logic here; the CALLER decides (via glossVisibility) whether to mount
// it (immersion), render the gloss plainly (fr_es), or render nothing (totale).
export default function TapReveal({
  label,
  children,
  className = '',
}: {
  label: string
  children: ReactNode
  className?: string
}) {
  const [shown, setShown] = useState(false)

  if (shown) return <>{children}</>

  return (
    <button
      type="button"
      onClick={() => setShown(true)}
      className={`press-row inline-flex items-center gap-1.5 font-sans text-[12.5px] font-semibold text-accent underline underline-offset-[3px] ${className}`}
    >
      <Eye size={13} strokeWidth={2} />
      {label}
    </button>
  )
}
