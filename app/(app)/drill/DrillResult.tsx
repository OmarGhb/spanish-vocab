'use client'

import Image from 'next/image'
import { buildConjugationGridForTense } from '@/lib/conjugation-grid'
import { drillTeachingLine, drillTenseLabel, type DrillPromptItem, type DrillVerdict } from '@/lib/drill'
import Button from '../Button'
import ConjugationGrid from '../ConjugationGrid'
import DrillHeader from './DrillHeader'

// Result screen (manual advance, NO rating/interval buttons): Paco mood + verdict, the correct form,
// the struck user answer on a miss, the frame replayed with the answer, and the deterministic
// teaching line on a ¡Uy!. Uses the same Paco-mood reveal family as /review (paco-feliz/pensando/sad).
export type DrillOutcome = { prompt: DrillPromptItem; userAnswer: string; verdict: DrillVerdict }

const META: Record<DrillVerdict, { img: string; excl: string; color: string; note: string; tone: 'ok' | 'warm' | 'err' }> = {
  correct: { img: '/paco-feliz.png', excl: '¡Eso es!', color: 'text-ok', note: 'du premier coup', tone: 'ok' },
  close: { img: '/paco-pensando.png', excl: '¡Casi!', color: 'text-warm', note: 'presque', tone: 'warm' },
  wrong: { img: '/paco-sad.png', excl: '¡Uy!', color: 'text-err', note: 'pas tout à fait', tone: 'err' },
}

export default function DrillResult({
  outcome,
  count,
  total,
  onNext,
  onExit,
}: {
  outcome: DrillOutcome
  count: number
  total: number
  onNext: () => void
  onExit: () => void
}) {
  const { prompt, userAnswer, verdict } = outcome
  const m = META[verdict]
  const isLast = count >= total
  const teaching =
    verdict === 'wrong'
      ? drillTeachingLine({ userAnswer, lemma: prompt.verb, targetTense: prompt.tense })
      : null
  // Reinforce on a hit / show the correct paradigm on a miss — the same grid as the prompt's hint
  // sheet, asked person highlighted. Always non-null for a trusted drill prompt; guarded regardless.
  const grid = buildConjugationGridForTense(prompt.verb, prompt.tense, prompt.person)

  return (
    <div className="flex-1 min-h-0 flex flex-col">
      <DrillHeader count={count} total={total} tenseLabel={drillTenseLabel(prompt.tense)} tone={m.tone} onExit={onExit} />

      <div className="flex-1 min-h-0 overflow-y-auto px-5 pt-6">
        {/* Reveal */}
        <div className="fade-up flex items-end gap-3.5">
          <Image src={m.img} alt="Paco" width={80} height={80} className="object-contain shrink-0" />
          <div className="pb-1.5">
            <p className={`font-serif text-[2.5rem] font-bold italic leading-none tracking-[-0.02em] ${m.color}`}>
              {m.excl}
            </p>
            <p className="mt-1.5 text-[13.5px] text-muted">{m.note}</p>
          </div>
        </div>

        {/* Answer card */}
        <div className="fade-up mt-6 bg-card border border-line rounded-card p-5" style={{ animationDelay: '0.1s' }}>
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted">
            {verdict === 'correct' ? 'La réponse' : "C'était"}
          </p>
          <p className="mt-2 font-serif text-[30px] font-bold tracking-[-0.01em] text-ink">{prompt.correctForm}</p>
          {verdict !== 'correct' && (
            <p className="mt-2 font-serif text-[14.5px] italic text-muted">
              Ta réponse :{' '}
              <span className="text-err line-through decoration-err/50">{userAnswer}</span>
            </p>
          )}
          <p className="mt-4 border-t border-line pt-3.5 font-serif text-base leading-[1.6] text-ink">
            {prompt.frame}
            <strong className={`font-bold ${m.color}`}>{prompt.correctForm}</strong>
          </p>
        </div>

        {/* Teaching line (¡Uy! only, when the answer is a recognizable form) */}
        {teaching && (
          <div
            className="fade-up mt-3.5 flex gap-3 rounded-r-card border-l-[3px] border-accent bg-tint px-4 py-3.5"
            style={{ animationDelay: '0.18s' }}
          >
            <Image src="/paco-pensando.png" alt="" width={30} height={30} className="object-contain shrink-0 mt-0.5" />
            <p className="text-[13.5px] leading-relaxed text-ink">{teaching}</p>
          </div>
        )}

        {/* Full paradigm of the asked tense, target cell highlighted — on every verdict */}
        {grid && (
          <div className="fade-up mt-4 pb-2" style={{ animationDelay: '0.24s' }}>
            <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.14em] text-muted">La conjugaison</p>
            <ConjugationGrid grid={grid} />
          </div>
        )}
      </div>

      {/* Manual advance */}
      <div className="px-5 pt-3.5 shrink-0 pb-[max(1.75rem,env(safe-area-inset-bottom))]">
        {/* Unified to the canonical amber primary (board §03 — the brown-ink "Suivant →" exits
            the button role; no dark-brown primary). */}
        <Button variant="primary" full type="button" onClick={onNext}>
          {isLast ? 'Voir le bilan' : 'Suivant'}
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.1} strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12h14M13 6l6 6-6 6" />
          </svg>
        </Button>
      </div>
    </div>
  )
}
