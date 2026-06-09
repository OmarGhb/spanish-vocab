'use client'

import type { CSSProperties } from 'react'

// Dependency-free confetti for the dictionary unlock takeover — the ONE sanctioned
// ceremony (no confetti anywhere else in the app). ~12 sparse pieces, warm palette only
// (amber / amber-mid / amber-deep / sage), a mix of dots and tiny squares, drifting via the
// `confetti-drift` keyframe in globals.css. Deterministic (SSR-safe — no Math.random) and
// reduced-motion-aware (base style is invisible; the keyframe only runs under no-preference).
//
// Positions/sizes/rotations are the board's hand-placed set; x is a % of the 390px reference
// frame, y a px top offset, so the spread reads the same at the 430px column width.
type Piece = { x: number; y: number; s: number; color: string; r: number; sq: boolean }

const PIECES: Piece[] = [
  { x: 40, y: 150, s: 9, color: 'bg-accent', r: 18, sq: false },
  { x: 96, y: 116, s: 7, color: 'bg-ok', r: 0, sq: true },
  { x: 150, y: 92, s: 6, color: 'bg-amber-deep', r: 30, sq: false },
  { x: 252, y: 100, s: 8, color: 'bg-accent', r: 24, sq: true },
  { x: 312, y: 132, s: 7, color: 'bg-ok', r: 12, sq: false },
  { x: 352, y: 190, s: 6, color: 'bg-amber-deep', r: 40, sq: true },
  { x: 28, y: 220, s: 7, color: 'bg-accent', r: 8, sq: true },
  { x: 76, y: 280, s: 5, color: 'bg-ok', r: 0, sq: false },
  { x: 326, y: 268, s: 6, color: 'bg-accent', r: 20, sq: false },
  { x: 360, y: 320, s: 7, color: 'bg-amber-deep', r: 15, sq: true },
  { x: 200, y: 70, s: 6, color: 'bg-amber-mid', r: 22, sq: false },
  { x: 130, y: 340, s: 5, color: 'bg-amber-mid', r: 10, sq: true },
]

export default function Confetti() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      {PIECES.map((p, i) => (
        <span
          key={i}
          className={`confetti-piece absolute ${p.color} ${p.sq ? 'rounded-[1.5px]' : 'rounded-full'}`}
          style={
            {
              left: `${(p.x / 390) * 100}%`,
              top: p.y,
              width: p.s,
              height: p.s,
              transform: `rotate(${p.r}deg)`,
              '--r': `${p.r}deg`,
              animationDuration: `${4 + (i % 5) * 0.45}s`,
              animationDelay: `${(i % 6) * 0.32}s`,
            } as CSSProperties
          }
        />
      ))}
    </div>
  )
}
