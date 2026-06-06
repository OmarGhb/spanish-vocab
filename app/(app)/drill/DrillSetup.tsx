'use client'

import { useState } from 'react'
import { Check } from 'lucide-react'
import { DRILL_TENSES, DRILL_PROMPT_COUNT, type DrillTense, type PersonScope } from '@/lib/drill'
import type { DrillPrefs } from './page'

// Setup screen (focus mode): tense multi-select + person-scope toggle, pre-filled from saved prefs.
// "Commencer" hands the selection up; DrillClient persists it + builds the prompts.
export default function DrillSetup({
  prefs,
  onStart,
  onExit,
}: {
  prefs: DrillPrefs
  onStart: (sel: DrillPrefs) => void
  onExit: () => void
}) {
  const [tenses, setTenses] = useState<Set<DrillTense>>(new Set(prefs.tenses))
  const [scope, setScope] = useState<PersonScope>(prefs.personScope)

  const toggle = (t: DrillTense) =>
    setTenses((prev) => {
      const next = new Set(prev)
      if (next.has(t)) next.delete(t)
      else next.add(t)
      return next
    })

  const personCount = scope === 'all' ? 6 : 3
  const canStart = tenses.size > 0

  return (
    <div className="flex-1 min-h-0 flex flex-col">
      {/* Header with its own back affordance (no app nav in focus mode) */}
      <div className="flex items-center gap-3.5 px-6 pt-[max(0.875rem,env(safe-area-inset-top))] pb-1">
        <button
          type="button"
          onClick={onExit}
          aria-label="Retour"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-line bg-card text-ink"
        >
          <svg width="9" height="15" viewBox="0 0 9 15" fill="none">
            <path d="M7.5 1.5L2 7.5l5.5 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted">Entraînement</p>
          <h1 className="font-serif text-[25px] font-bold leading-none tracking-[-0.02em] text-ink">Conjugaison</h1>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto px-6 pt-6">
        {/* Temps */}
        <div className="flex items-baseline justify-between">
          <h2 className="font-serif text-[18px] font-bold text-ink">Temps</h2>
          <span className="text-xs text-muted">plusieurs possibles</span>
        </div>
        <div className="mt-3.5 flex flex-wrap gap-2.5">
          {DRILL_TENSES.map(({ tense, label }) => {
            const on = tenses.has(tense)
            return (
              <button
                key={tense}
                type="button"
                aria-pressed={on}
                onClick={() => toggle(tense)}
                className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-2.5 text-sm transition-colors ${
                  on
                    ? 'border-accent bg-accent font-semibold text-white'
                    : 'border-line bg-card text-muted'
                }`}
              >
                {on && <Check size={13} strokeWidth={3} />}
                {label}
              </button>
            )
          })}
        </div>

        {/* Personnes */}
        <h2 className="mt-8 font-serif text-[18px] font-bold text-ink">Personnes</h2>
        <div className="mt-3.5 flex flex-col gap-2.5">
          <PersonOption
            on={scope === 'singular'}
            title="Singular"
            sub="yo · tú · él / ella"
            onClick={() => setScope('singular')}
          />
          <PersonOption
            on={scope === 'all'}
            title="Singular + plural"
            sub="+ nosotros · vosotros · ellos"
            onClick={() => setScope('all')}
          />
        </div>
      </div>

      {/* Footer CTA */}
      <div
        className="px-6 pt-3.5 shrink-0"
        style={{ paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom))' }}
      >
        <button
          type="button"
          disabled={!canStart}
          onClick={() => onStart({ tenses: [...tenses], personScope: scope })}
          className="w-full rounded-card bg-accent py-4 text-center font-serif text-base font-bold text-white transition-opacity disabled:opacity-40"
        >
          Commencer
        </button>
        <p className="mt-2.5 text-center text-[12.5px] text-muted">
          {tenses.size} temps · {personCount} personnes ·{' '}
          <strong className="font-semibold text-ink">{DRILL_PROMPT_COUNT} questions</strong>
        </p>
      </div>
    </div>
  )
}

function PersonOption({
  on,
  title,
  sub,
  onClick,
}: {
  on: boolean
  title: string
  sub: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onClick}
      className={`flex items-center gap-3.5 rounded-card border px-4 py-3.5 text-left transition-colors ${
        on ? 'border-accent bg-tint' : 'border-line bg-card'
      }`}
    >
      <span
        className={`flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full border-2 ${
          on ? 'border-accent bg-accent' : 'border-line'
        }`}
      >
        {on && <span className="h-2 w-2 rounded-full bg-white" />}
      </span>
      <span className="flex-1">
        <span className="block text-[15.5px] font-semibold text-ink">{title}</span>
        <span className="mt-0.5 block font-serif text-[13.5px] italic text-muted">{sub}</span>
      </span>
    </button>
  )
}
