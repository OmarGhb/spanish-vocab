'use client'

// Focus-mode header shared by the drill prompt + result: close (×) · "i / N" · tense label, over a
// thin progress bar. The app TopNav is suppressed in focus mode, so this carries the notch inset.
type Tone = 'accent' | 'ok' | 'warm' | 'err'

const TEXT: Record<Tone, string> = {
  accent: 'text-accent',
  ok: 'text-ok',
  warm: 'text-warm',
  err: 'text-err',
}
const BAR: Record<Tone, string> = {
  accent: 'bg-accent',
  ok: 'bg-ok',
  warm: 'bg-warm',
  err: 'bg-err',
}

export default function DrillHeader({
  count,
  total,
  tenseLabel,
  tone = 'accent',
  onExit,
}: {
  count: number // 1-based
  total: number
  tenseLabel: string
  tone?: Tone
  onExit: () => void
}) {
  const pct = (count / total) * 100
  return (
    <div className="px-5 pt-[max(0.5rem,env(safe-area-inset-top))]">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={onExit}
          aria-label="Quitter l'entraînement"
          className="-ml-1 flex h-8 w-8 items-center justify-center text-2xl leading-none text-muted hover:text-ink"
        >
          ×
        </button>
        <span className="text-sm font-semibold text-muted tabular-nums">
          {count} / {total}
        </span>
        <span className={`text-xs font-semibold uppercase tracking-widest ${TEXT[tone]}`}>
          {tenseLabel}
        </span>
      </div>
      <div className="mt-3 h-1 rounded-full bg-line">
        <div className={`h-1 rounded-full transition-all duration-300 ${BAR[tone]}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}
