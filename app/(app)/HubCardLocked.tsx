import { Lock } from 'lucide-react'
import type { ReactNode } from 'react'

// M5.5j hub — gated function card (Conjugaison < 5 trusted verbs · Dictionnaire < 10 memorized).
// Non-interactive (no link, no access): muted page surface, dashed border, faint icon tile + lock
// glyph. The gate is rendered honestly as a "distance to unlock" meter, NOT an achievement bar:
// NEUTRAL track (border-soft) + muted-brown fill (faint) — never amber/sage (those are reserved,
// and an amber/sage fill would read as a reward). `have`/`need`/`unit` are the real counts.
export default function HubCardLocked({
  icon,
  title,
  have,
  need,
  unit,
  className = '',
}: {
  icon: ReactNode
  title: string
  have: number
  need: number
  unit: string
  // Rail sizing (Accueil v2): the Home rail passes h-[132px] so all cards share one height.
  className?: string
}) {
  const pct = need > 0 ? Math.max(0, Math.min(1, have / need)) : 0
  return (
    <div className={`flex flex-col rounded-2xl p-3.5 min-h-[118px] bg-page border border-dashed border-line ${className}`}>
      <div className="flex items-center justify-between">
        <span className="w-[38px] h-[38px] rounded-xl flex items-center justify-center shrink-0 bg-page text-faint border border-border-soft">
          {icon}
        </span>
        <Lock size={16} strokeWidth={1.8} className="text-faint" />
      </div>
      <p className="mt-2 font-serif text-[18px] font-bold text-faint tracking-[-0.01em]">{title}</p>
      {/* Gate meter pushed to the card bottom. */}
      <div className="mt-auto pt-2.5">
        <div className="flex items-baseline justify-between mb-[5px]">
          <span className="text-[11px] font-semibold text-muted tabular-nums">
            <b className="text-ink">{Math.min(have, need)}</b> / {need}
          </span>
          <span className="text-[10.5px] text-faint">{unit}</span>
        </div>
        <div className="h-[5px] rounded-full bg-border-soft overflow-hidden">
          <div
            className="h-full bg-faint rounded-full"
            style={{ width: `${pct * 100}%`, minWidth: pct > 0 ? 5 : 0 }}
          />
        </div>
      </div>
    </div>
  )
}
