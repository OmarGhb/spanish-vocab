'use client'

// Dependency-free confetti: deterministic (SSR-safe — no Math.random) token-colored
// squares falling via the `confetti-piece` CSS keyframe in globals.css. Decorative only.
const PIECES = Array.from({ length: 24 })
const COLORS = ['bg-accent', 'bg-ok', 'bg-err', 'bg-tint']

export default function Confetti() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      {PIECES.map((_, i) => {
        const left = (i * 37) % 100
        const delay = (i % 6) * 0.15
        const duration = 2.4 + (i % 4) * 0.4
        return (
          <span
            key={i}
            className={`confetti-piece absolute top-0 h-2 w-2 rounded-[2px] ${COLORS[i % COLORS.length]}`}
            style={{ left: `${left}%`, animationDelay: `${delay}s`, animationDuration: `${duration}s` }}
          />
        )
      })}
    </div>
  )
}
