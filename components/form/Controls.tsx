'use client'

import { Minus, Plus } from 'lucide-react'
import { atMinCards, atMaxCards, stepCardsPerSession } from '@/lib/session-cap'

// ── Stepper ("Cartes par session", 10–50) ──────────────────────────────────
// Two 36px round amber-outline buttons flanking the value; the relevant button disables (soft
// border + faint glyph) at the 10/50 bounds. Bounds + stepping come from lib/session-cap.ts.
export function Stepper({ value, onChange }: { value: number; onChange: (next: number) => void }) {
  const atMin = atMinCards(value)
  const atMax = atMaxCards(value)
  const btn = (disabled: boolean) =>
    `press-icon w-9 h-9 rounded-full grid place-items-center border-[1.5px] ${
      disabled ? 'border-border-soft text-faint cursor-not-allowed' : 'border-accent text-accent'
    }`
  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        aria-label="Diminuer"
        disabled={atMin}
        onClick={() => onChange(stepCardsPerSession(value, -1))}
        className={btn(atMin)}
      >
        <Minus size={17} strokeWidth={2.2} />
      </button>
      <span className="font-serif text-[20px] font-bold text-ink min-w-[28px] text-center">{value}</span>
      <button
        type="button"
        aria-label="Augmenter"
        disabled={atMax}
        onClick={() => onChange(stepCardsPerSession(value, 1))}
        className={btn(atMax)}
      >
        <Plus size={17} strokeWidth={2.2} />
      </button>
    </div>
  )
}

// ── Toggle (boolean) ────────────────────────────────────────────────────────
// 46×27 pill: amber track + small shadow when on, line track when off; 21px ivory knob slides
// with a 150ms ease. role=switch for assistive tech.
export function Toggle({ on, onChange }: { on: boolean; onChange: (next: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={() => onChange(!on)}
      className={`w-[46px] h-[27px] rounded-full p-[3px] flex transition-colors ${
        on ? 'bg-accent shadow-amber-sm justify-end' : 'bg-line justify-start'
      }`}
    >
      <span className="w-[21px] h-[21px] rounded-full bg-ivory shadow-[0_1px_3px_rgba(0,0,0,0.2)] transition-transform" />
    </button>
  )
}

// ── Segmented (single-select, e.g. Lent / Normal / Rapide) ──────────────────
// Inline pill group; selected segment = amber fill + ivory text + small shadow, others sépia.
export function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: readonly { value: T; label: string }[]
  value: T
  onChange: (next: T) => void
}) {
  return (
    <div className="inline-flex bg-card border-[1.5px] border-line rounded-full p-[3px]">
      {options.map((o) => {
        const on = o.value === value
        return (
          <button
            key={o.value}
            type="button"
            aria-pressed={on}
            onClick={() => onChange(o.value)}
            className={`px-[15px] py-[7px] rounded-full font-sans text-[13px] whitespace-nowrap transition-colors ${
              on ? 'press-pill-amber bg-accent text-ivory font-semibold shadow-amber-sm' : 'press-pill text-muted font-medium'
            }`}
          >
            {o.label}
          </button>
        )
      })}
    </div>
  )
}
