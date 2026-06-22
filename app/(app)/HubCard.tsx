import Link from 'next/link'
import { ChevronRight } from 'lucide-react'
import type { ReactNode } from 'react'

// M5.5j "Continuer avec Paco" hub — active function card. Crème/white SURFACE with an amber icon
// chip + amber chevron (the ONE interactive hue lives on the chip/chevron, never as a card fill →
// CARTE ≠ CONTRÔLE holds). Whole card is the tap target.
//
// `feature` = the sanctioned emphasis for Ajouter: a warm surface-alt fill (clearly not the white
// of the others) + a 3px amber accent rail + an amber-FILLED icon tile + the heavier shadow-card.
// Still not an amber-filled SURFACE — the rail/chip carry the amber, the card stays crème+.
export default function HubCard({
  icon,
  title,
  desc,
  href,
  feature = false,
}: {
  icon: ReactNode
  title: string
  desc: string
  href: string
  feature?: boolean
}) {
  return (
    <Link
      href={href}
      className={`flex flex-col rounded-2xl p-3.5 min-h-[118px] ${
        feature
          ? 'press-card-feature bg-surface-alt border border-tinted-border border-l-[3px] border-l-accent shadow-card'
          : 'press-card bg-card border border-line shadow-card-sm'
      }`}
    >
      <div className="flex items-center justify-between">
        <span
          className={`w-[38px] h-[38px] rounded-[11px] flex items-center justify-center shrink-0 ${
            feature
              ? 'bg-accent text-ivory border border-accent'
              : 'bg-amber-light text-amber-deep border border-tinted-border'
          }`}
        >
          {icon}
        </span>
        <ChevronRight size={18} strokeWidth={2.1} className="text-accent" />
      </div>
      <p className="mt-2.5 font-serif text-[18px] font-bold text-ink tracking-[-0.01em]">{title}</p>
      <p className="mt-1 text-[12.5px] leading-[1.45] text-muted">{desc}</p>
    </Link>
  )
}
