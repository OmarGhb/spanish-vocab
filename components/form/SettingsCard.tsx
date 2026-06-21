import type { ReactNode } from 'react'

// Section eyebrow — 6px amber dot + Inter 11/700 .14em uppercase sépia label (board GroupHead).
export function GroupHead({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-center gap-[9px] px-[22px] pb-2.5">
      <span className="w-1.5 h-1.5 rounded-full bg-accent shrink-0" />
      <span className="font-sans text-[11px] font-bold tracking-[0.14em] uppercase text-muted">{children}</span>
    </div>
  )
}

// A SURFACE that holds rows. Carte ≠ contrôle — NEVER amber-filled (amber is accent/control only).
export function SettingsCard({ children }: { children: ReactNode }) {
  return (
    <div className="mx-4 bg-card border border-line rounded-[16px] shadow-card overflow-hidden">{children}</div>
  )
}

// Shared row geometry: 15×16 padding, soft top divider (none on the first row in a card).
export function RowWrap({ children, first }: { children: ReactNode; first?: boolean }) {
  return (
    <div className={`flex items-center gap-3.5 px-4 py-[15px] ${first ? '' : 'border-t border-border-soft'}`}>
      {children}
    </div>
  )
}
