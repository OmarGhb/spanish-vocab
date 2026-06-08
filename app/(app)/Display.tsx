import type { CSSProperties, ReactNode } from 'react'

// Display — the SOLE path by which Fraunces is ever applied (board §02).
//
// The font is loaded in app/layout.tsx as a raw CSS variable (--font-fraunces) and is
// deliberately NOT registered as a Tailwind utility, so this component is the only code
// that names var(--font-fraunces). The `kind` prop is a closed union = the literal board
// allowlist; you cannot render Fraunces without naming one of the three allowed faces, so
// the allowlist is enforced by the type system, not by convention.
//
//   kind="listo"       → "¡Listo!"        (add-flow success headline · render in ink)
//   kind="casi"        → "¡Casi!"         (near-miss verdict — MUST be ink, color rule 6)
//   kind="count"       → big review numbers (e.g. the "70" on the Réviser entry)
//   kind="esoEs"       → "¡Eso es!"       (correct verdict · rendered in sage by the caller)
//   kind="uy"          → "¡Uy!"           (wrong verdict · rendered in terra by the caller)
//   kind="buenTrabajo" → "¡Buen trabajo!" (session-complete header · ink)
//
// Face only: Fraunces italic 700. Size and color come from the caller's className per the
// type scale (Display/emotion 32–40), so `casi` can be inked per color rule 6. No usages
// ship in M5.5a — they land with their screen clusters.
type DisplayKind = 'listo' | 'casi' | 'count' | 'esoEs' | 'uy' | 'buenTrabajo'

// `kind` is required by the type (the allowlist gate) but intentionally not read at runtime —
// it constrains *what* may be set in Fraunces, not how it renders. DO NOT delete it as an
// "unused prop": the closed union IS the structural enforcement of the Fraunces allowlist
// (board §02). Removing it would let any text be set in Fraunces, silently breaking the rule.
export default function Display({
  children,
  className,
  style,
}: {
  kind: DisplayKind
  children: ReactNode
  className?: string
  style?: CSSProperties
}) {
  return (
    <span
      className={className}
      style={{ fontFamily: 'var(--font-fraunces), serif', fontStyle: 'italic', fontWeight: 700, ...style }}
    >
      {children}
    </span>
  )
}
