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
// All button-state colours read through tokens (theming milestone Phase 1 — de-hardcoded the inline
// §03 hexes so a [data-theme] override re-themes the button): secondary pressed → amber-tint,
// destructive border → terra-border, destructive pressed bg/text → err-bg / terra-ink, and the
// disabled-primary label → the role token --color-disabled-ink (was the bespoke #C2A877).
type Variant = 'primary' | 'secondary' | 'text' | 'destructive'

// `active:scale` adds the spec's depress lever on top of each variant's existing colour/shadow
// press states (board §03). A native disabled <button> never receives :active, so it stays inert
// without an explicit guard; the keyboard focus ring is the global a/button:focus-visible rule.
const BASE =
  'inline-flex items-center justify-center gap-2 font-sans font-semibold leading-none border-[1.5px] border-transparent transition-transform duration-100 ease-out active:scale-[0.98] disabled:cursor-not-allowed'

const SHAPE = {
  full: 'w-full text-[15px] px-[22px] py-[15px] rounded-[14px]',
  compact: 'text-[14.5px] px-[18px] py-[11px] rounded-full',
} as const

const VARIANT: Record<Variant, string> = {
  primary:
    'bg-accent text-ivory shadow-amber ' +
    'active:bg-amber-deep active:translate-y-px active:shadow-[0_1px_3px_rgba(154,90,28,0.3)] ' +
    'disabled:bg-amber-light disabled:text-disabled-ink disabled:shadow-none',
  secondary:
    'bg-card text-ink border-accent ' +
    'active:bg-amber-tint active:text-amber-deep ' +
    'disabled:text-faint disabled:border-border-soft',
  text:
    'bg-transparent text-accent underline underline-offset-[3px] ' +
    'active:text-amber-deep disabled:text-faint',
  destructive:
    'bg-card text-err border-terra-border ' +
    'active:bg-err-bg active:text-terra-ink active:border-err ' +
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
