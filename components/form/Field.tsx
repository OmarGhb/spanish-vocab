'use client'

import { TriangleAlert } from 'lucide-react'
import type { ReactNode } from 'react'

// Canonical form input — the reusable auth foundation (Profil password flow now; login / signup /
// onboarding later). Board states: default · focus (amber border + short amber shadow, via native
// :focus-within) · error (terra border + alert-led help) · disabled (page fill, soft border).
// `mono` renders the value in Inter with wide tracking for masked passwords. Lives in components/
// (not under account/) so non-(app) auth routes can import it too.

export function FieldLabel({ children }: { children: ReactNode }) {
  // "Form" variant of the section eyebrow — Inter 12.5/600 sépia, normal case (less shouty).
  return <div className="font-sans text-[12.5px] font-semibold text-muted mb-[7px]">{children}</div>
}

type Props = {
  label: string
  value: string
  onChange?: (value: string) => void
  type?: 'text' | 'password' | 'email'
  placeholder?: string
  error?: string | null
  disabled?: boolean
  help?: string
  mono?: boolean
  trailing?: ReactNode
}

export default function Field({
  label,
  value,
  onChange,
  type = 'text',
  placeholder,
  error,
  disabled = false,
  help,
  mono = false,
  trailing,
}: Props) {
  const isError = !!error
  // Border precedence: error (terra) → disabled (soft) → default (line), with focus (amber +
  // shadow) layered on via focus-within only when not error/disabled.
  const wrapperBorder = isError
    ? 'border-err'
    : disabled
      ? 'border-border-soft'
      : 'border-line focus-within:border-accent focus-within:shadow-amber-sm'

  return (
    <div>
      <FieldLabel>{label}</FieldLabel>
      <div
        className={`flex items-center gap-2.5 rounded-[14px] border-[1.5px] px-[15px] py-[13px] ${
          disabled ? 'bg-page' : 'bg-card'
        } ${wrapperBorder}`}
      >
        <input
          type={type}
          value={value}
          onChange={onChange ? (e) => onChange(e.target.value) : undefined}
          placeholder={placeholder}
          disabled={disabled}
          readOnly={!onChange}
          className={`flex-1 min-w-0 bg-transparent outline-none text-ink placeholder:text-faint placeholder:italic disabled:text-faint ${
            mono ? 'font-sans text-[15px] tracking-[0.18em]' : 'font-serif text-base'
          }`}
        />
        {trailing}
      </div>
      {(help || isError) && (
        <div
          className={`mt-[7px] flex items-center gap-1.5 font-sans text-[12px] leading-[1.4] ${
            isError ? 'text-terra-ink' : 'text-faint'
          }`}
        >
          {isError && <TriangleAlert size={13} strokeWidth={2} className="text-err shrink-0" />}
          {error || help}
        </div>
      )}
    </div>
  )
}

// Amber underlined text button for the password "Afficher / Masquer" trailing slot.
export function RevealLink({ shown, onClick }: { shown: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="shrink-0 bg-transparent p-0 font-sans text-[12.5px] font-semibold text-accent underline underline-offset-[3px]"
    >
      {shown ? 'Masquer' : 'Afficher'}
    </button>
  )
}
