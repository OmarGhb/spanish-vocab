import Link from 'next/link'
import type { ComponentProps, ReactNode } from 'react'

// Canonical Button — 4 variants × 3 states, zero exceptions (board §03).
//
// States: `default` is the base; `pressed` is the CSS :active pseudo (active:* below);
// `disabled` is the native disabled attribute (disabled:* below) — so there is no manual
// "state" prop, the three states are real interaction states.
//
// Radius rule (hard, board §03): `full` (full-width block CTA) → 14px; compact → 999 (pill).
// Never the inverse. Primary is ALWAYS amber — there is no dark-brown primary.
//
// Family: Inter (font-sans) per the type system — UI chrome is Inter, even where the old
// bespoke button used a serif label. Adopting this component is what unifies that.
//
// Tokens (globals.css) — the board §01 roles this button consumes: amber-deep / amber-light /
// ivory / faint / border-soft + shadow-amber(-sm). No §01 palette role is inlined here.
//
// The remaining inline hexes are NOT §01 palette roles — they exist ONLY in the board's §03
// button table, so they live here as documented button-state constants (tracked, not stray):
//   #C2A877 — disabled-primary text (an amber-on-amber-light desaturation; board §03 only —
//             deliberately NOT --color-faint #A88F6B nor --color-muted #7A5A3A, which are both
//             darker/different, so it can't reuse either)
//   #DDA994 — destructive resting border (board §03)
//   #8E3A1F — destructive pressed text (board §03)
//   #F7E8D0 / #F4E1D8 — secondary / destructive PRESSED bg (board amber-tint / terra-tint).
//             The existing --color-tint / --color-err-bg approximate these but differ; full
//             semantic-tint reconciliation rides the §06 status/Words cluster (logged in
//             roadmap/backlog), not this additive foundation.
type Variant = 'primary' | 'secondary' | 'text' | 'destructive'

const BASE =
  'inline-flex items-center justify-center gap-2 font-sans font-semibold leading-none border-[1.5px] border-transparent disabled:cursor-not-allowed'

const SHAPE = {
  full: 'w-full text-[15px] px-[22px] py-[15px] rounded-[14px]',
  compact: 'text-[14.5px] px-[18px] py-[11px] rounded-full',
} as const

const VARIANT: Record<Variant, string> = {
  primary:
    'bg-accent text-ivory shadow-amber ' +
    'active:bg-amber-deep active:translate-y-px active:shadow-[0_1px_3px_rgba(154,90,28,0.3)] ' +
    'disabled:bg-amber-light disabled:text-[#C2A877] disabled:shadow-none',
  secondary:
    'bg-card text-ink border-accent ' +
    'active:bg-[#F7E8D0] active:text-amber-deep ' +
    'disabled:text-faint disabled:border-border-soft',
  text:
    'bg-transparent text-accent underline underline-offset-[3px] ' +
    'active:text-amber-deep disabled:text-faint',
  destructive:
    'bg-card text-err border-[#DDA994] ' +
    'active:bg-[#F4E1D8] active:text-[#8E3A1F] active:border-err ' +
    'disabled:text-faint disabled:border-border-soft',
}

type CommonOwn = 'variant' | 'full' | 'className' | 'children'
type BaseProps = { variant?: Variant; full?: boolean; className?: string; children: ReactNode }

// `<button>` has no `href` → presence of `href` is the discriminant between the two shapes.
type ButtonProps = BaseProps & Omit<ComponentProps<'button'>, CommonOwn>
type LinkProps = BaseProps & Omit<ComponentProps<typeof Link>, CommonOwn> & { href: string }

export default function Button(props: ButtonProps | LinkProps) {
  const { variant = 'primary', full = false, className = '', children, ...rest } = props
  const cls = `${BASE} ${full ? SHAPE.full : SHAPE.compact} ${VARIANT[variant]} ${className}`

  if ('href' in rest) {
    return (
      <Link className={cls} {...rest}>
        {children}
      </Link>
    )
  }
  return (
    <button className={cls} {...rest}>
      {children}
    </button>
  )
}
