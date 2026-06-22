import Link from 'next/link'
import { ChevronRight } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { RowWrap } from './SettingsCard'

// The row system has TWO core states (locked contract): ACTIVE (a live control) vs BIENTÔT
// (muted label + dashed ghost pill, inert). Plus supporting Display / Nav variants.

function RowText({ label, help, muted }: { label: string; help?: string; muted?: boolean }) {
  return (
    <div className="flex-1 min-w-0">
      <div
        className={`font-serif text-[16.5px] font-semibold tracking-[-0.01em] leading-[1.2] ${
          muted ? 'text-faint' : 'text-ink'
        }`}
      >
        {label}
      </div>
      {help && (
        <div className={`font-sans text-[12.5px] leading-[1.4] mt-1 ${muted ? 'text-faint' : 'text-muted'}`}>
          {help}
        </div>
      )}
    </div>
  )
}

// (a) ACTIVE — usable now: label + optional help, live control on the right.
export function ActiveRow({
  label,
  help,
  control,
  first,
}: {
  label: string
  help?: string
  control: ReactNode
  first?: boolean
}) {
  return (
    <RowWrap first={first}>
      <RowText label={label} help={help} />
      <div className="shrink-0">{control}</div>
    </RowWrap>
  )
}

// (b) BIENTÔT — inert, on-brand, unmistakable: faint label + dashed-border ghost pill.
// Distinct from the system's SOLID status pills. No tap target, not focusable.
function SoonBadge() {
  return (
    <span className="inline-flex items-center rounded-full border-[1.5px] border-dashed border-line px-3 py-[5px] font-sans text-[10.5px] font-bold tracking-[0.08em] uppercase text-faint whitespace-nowrap">
      Bientôt
    </span>
  )
}
export function SoonRow({ label, help, first }: { label: string; help?: string; first?: boolean }) {
  return (
    <RowWrap first={first}>
      <RowText label={label} help={help} muted />
      <div className="shrink-0">
        <SoonBadge />
      </div>
    </RowWrap>
  )
}

// Static value, not a control (e.g. E-mail, Version). Optional leading icon.
export function DisplayRow({
  label,
  value,
  icon: Icon,
  first,
}: {
  label: string
  value: string
  icon?: LucideIcon
  first?: boolean
}) {
  return (
    <RowWrap first={first}>
      {Icon && <Icon size={18} strokeWidth={1.8} className="text-faint shrink-0" />}
      <div className="flex-1 min-w-0">
        <div className="font-serif text-[16.5px] font-semibold tracking-[-0.01em] text-ink">{label}</div>
      </div>
      <div className="font-sans text-[14px] text-muted shrink-0 max-w-[190px] truncate">{value}</div>
    </RowWrap>
  )
}

// ACTIVE row that opens a sub-screen (chevron affordance). `tone="danger"` turns the label terra.
export function NavRow({
  label,
  help,
  value,
  href,
  tone,
  first,
}: {
  label: string
  help?: string
  value?: string
  href: string
  tone?: 'danger'
  first?: boolean
}) {
  const danger = tone === 'danger'
  // mailto:/external hrefs render a plain anchor; internal routes use next/link for prefetch.
  const external = /^(mailto:|https?:)/.test(href)
  const inner = (
    <RowWrap first={first}>
      <div className="flex-1 min-w-0">
        <div
          className={`font-serif text-[16.5px] font-semibold tracking-[-0.01em] ${danger ? 'text-err' : 'text-ink'}`}
        >
          {label}
        </div>
        {help && <div className="font-sans text-[12.5px] text-muted mt-1">{help}</div>}
      </div>
      {value && <span className="font-sans text-[13.5px] text-muted shrink-0">{value}</span>}
      <ChevronRight size={18} strokeWidth={2} className={`shrink-0 ${danger ? 'text-terra-border' : 'text-faint'}`} />
    </RowWrap>
  )
  return external ? (
    <a href={href} className="press-row block">
      {inner}
    </a>
  ) : (
    <Link href={href} className="press-row block">
      {inner}
    </Link>
  )
}
