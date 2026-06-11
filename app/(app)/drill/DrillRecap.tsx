'use client'

import Image from 'next/image'
import { PERSON_LABELS } from '@/lib/conjugation-grid'
import { tenseLabel } from '@/lib/drill'
import Button from '../Button'
import type { DrillOutcome } from './DrillResult'

// End-of-drill recap: score X/10, the missed list (verbe · temps · personne — struck réponse →
// bonne réponse), then "Rejouer" / "Terminer". No FSRS, no scheduling — pure practice summary.
export default function DrillRecap({
  outcomes,
  displayName,
  onReplay,
  onFinish,
}: {
  outcomes: DrillOutcome[]
  displayName: string | null
  onReplay: () => void
  onFinish: () => void
}) {
  const total = outcomes.length
  const correct = outcomes.filter((o) => o.verdict === 'correct').length
  const missed = outcomes.filter((o) => o.verdict !== 'correct')
  const pct = total > 0 ? Math.round((correct / total) * 100) : 0

  return (
    <div className="flex-1 min-h-0 flex flex-col">
      <div className="px-6 pt-[max(0.875rem,env(safe-area-inset-top))] text-center">
        <Image src="/paco-feliz.png" alt="Paco" width={88} height={88} className="mx-auto object-contain" />
        <p className="mt-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-accent">Entraînement terminé</p>
        <h1 className="mt-2.5 font-serif text-[26px] font-bold tracking-[-0.02em] text-ink">
          {displayName ? `¡Muy bien, ${displayName}!` : '¡Muy bien!'}
        </h1>
      </div>

      {/* Score */}
      <div className="px-6 pt-5 shrink-0">
        <div className="flex items-center gap-5 bg-card border border-line rounded-2xl p-5">
          <div className="flex items-baseline gap-0.5">
            <span className="font-serif text-[52px] font-bold leading-none tracking-[-0.03em] text-ok">{correct}</span>
            <span className="font-serif text-[26px] font-medium text-muted">/{total}</span>
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-ink">
              {correct} bonne{correct !== 1 ? 's' : ''} réponse{correct !== 1 ? 's' : ''}
            </p>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-surface-alt">
              <div className="h-full rounded-full bg-ok" style={{ width: `${pct}%` }} />
            </div>
            {missed.length > 0 && (
              <p className="mt-2 text-[12.5px] text-muted">{missed.length} à revoir ci-dessous</p>
            )}
          </div>
        </div>
      </div>

      {/* Missed list (scrolls) */}
      <div className="flex-1 min-h-0 overflow-y-auto px-6 pt-5">
        {missed.length > 0 && (
          <>
            <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.14em] text-muted">À revoir</p>
            <ul className="flex flex-col gap-2.5">
              {missed.map((o, i) => (
                <li key={i} className="bg-card border border-line rounded-card px-4 py-3.5">
                  <div className="flex items-baseline gap-2.5">
                    <span className="font-serif text-[17px] font-semibold italic text-ink">{o.prompt.verb}</span>
                    <span className="text-[11.5px] font-semibold text-muted">
                      {tenseLabel(o.prompt.tense)} · {PERSON_LABELS[o.prompt.person]}
                    </span>
                  </div>
                  <div className="mt-2 flex items-center gap-2.5 font-serif text-[15px]">
                    <span className="text-err line-through decoration-err/40">{o.userAnswer}</span>
                    <svg width="9" height="14" viewBox="0 0 9 15" fill="none" className="text-muted">
                      <path d="M1.5 1.5L7 7.5l-5.5 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    <span className="font-bold text-ok">{o.prompt.correctForm}</span>
                  </div>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>

      {/* Footer */}
      <div
        className="flex gap-3 px-6 pt-3.5 shrink-0"
        style={{ paddingBottom: 'max(1.75rem, env(safe-area-inset-bottom))' }}
      >
        {/* Canonical CTA pair (board §03), Rejouer weighted 1.4× as in the review bilan. */}
        <div className="flex-1">
          <Button variant="secondary" full type="button" onClick={onFinish}>
            Terminer
          </Button>
        </div>
        <div className="flex-[1.4]">
          <Button variant="primary" full type="button" onClick={onReplay}>
            Rejouer
          </Button>
        </div>
      </div>
    </div>
  )
}
