'use client'

import { useEffect, useRef, useState } from 'react'
import type React from 'react'
import { buildConjugationGridForTense, PERSON_LABELS } from '@/lib/conjugation-grid'
import { tenseLabel, type DrillPromptItem } from '@/lib/drill'
import { resolveChrome, DRILL_CHROME, REVIEW_CHROME, DISCOVER_CHROME, type ImmersionMode } from '@/lib/immersion'
import Button from '../Button'
import ConjugationGrid from '../ConjugationGrid'
import AnswerBlank from '../review/AnswerBlank'
import AccentBar from '../review/AccentBar'
import DrillHeader from './DrillHeader'

// One drill question (focus mode): a fixed per-tense trigger frame + an EMPTY write-in blank + a cue
// chip (infinitive · person). Reuses the review écriture input (AnswerBlank) + desktop AccentBar.
// "Voir la conjugaison" opens a bottom sheet with the reusable ConjugationGrid (target cell amber).
export default function DrillPrompt({
  prompt,
  count,
  total,
  onSubmit,
  onExit,
  mode,
}: {
  prompt: DrillPromptItem
  count: number
  total: number
  onSubmit: (answer: string) => void
  onExit: () => void
  mode: ImmersionMode
}) {
  const [answer, setAnswer] = useState('')
  const [sheetOpen, setSheetOpen] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const cardRef = useRef<HTMLDivElement>(null)

  // Autofocus on mount (gesture-gated on iOS); keep the prompt visible when the keyboard opens.
  useEffect(() => {
    inputRef.current?.focus()
    const bring = () => cardRef.current?.scrollIntoView({ block: 'center', behavior: 'smooth' })
    const vv = window.visualViewport
    vv?.addEventListener('resize', bring)
    return () => vv?.removeEventListener('resize', bring)
  }, [])

  const grid = buildConjugationGridForTense(prompt.verb, prompt.tense, prompt.person)

  function handleSubmit(e: React.SyntheticEvent) {
    e.preventDefault()
    if (!answer.trim()) return
    inputRef.current?.blur()
    onSubmit(answer.trim())
  }

  return (
    <div className="flex-1 min-h-0 flex flex-col">
      <DrillHeader count={count} total={total} tenseLabel={tenseLabel(prompt.tense)} onExit={onExit} mode={mode} />

      <form onSubmit={handleSubmit} className="flex-1 min-h-0 flex flex-col px-5 pt-7">
        <p className="text-center text-[10px] font-bold uppercase tracking-[0.14em] text-muted opacity-80">
          {resolveChrome(DRILL_CHROME.instruction, mode)}
        </p>

        <div ref={cardRef} className="mt-6 bg-card border border-line rounded-card p-5 shadow-card scroll-mt-24">
          <p className="font-serif text-[20px] leading-[1.7] text-ink">
            {prompt.frame}
            <AnswerBlank value={answer} onChange={setAnswer} inputRef={inputRef} />
          </p>
          <div className="mt-4 flex items-center gap-3 border-t border-dashed border-line pt-3.5">
            <span className="inline-flex items-baseline gap-1.5 font-serif text-[15px] italic text-muted">
              <span className="font-semibold not-italic text-accent">{prompt.verb}</span>
              <span className="opacity-50">·</span>
              <span>{PERSON_LABELS[prompt.person]}</span>
              <span className="opacity-50">·</span>
              <span>{tenseLabel(prompt.tense).toLowerCase()}</span>
            </span>
          </div>
        </div>

        {/* Hint — opens the conjugation sheet */}
        {grid && (
          <button
            type="button"
            onClick={() => setSheetOpen(true)}
            className="mt-4 inline-flex items-center gap-1.5 self-center text-[13.5px] font-semibold text-accent"
          >
            <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
              <rect x="2.5" y="2.5" width="11" height="11" rx="2.5" stroke="currentColor" strokeWidth="1.4" />
              <line x1="8" y1="6" x2="8" y2="11" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
              <line x1="5" y1="8.5" x2="11" y2="8.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
            </svg>
            <span className="border-b border-tint pb-px">{resolveChrome(DRILL_CHROME.seeConjugation, mode)}</span>
          </button>
        )}

        <div className="flex-1" />

        {/* Accent row (desktop-only) + Valider, pinned bottom */}
        <div className="flex flex-col gap-3 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
          <AccentBar inputRef={inputRef} value={answer} onChange={setAnswer} />
          <Button variant="primary" full type="submit" disabled={!answer.trim()}>
            {resolveChrome(REVIEW_CHROME.submit, mode)}
          </Button>
        </div>
      </form>

      {sheetOpen && grid && (
        <div className="fixed inset-0 z-50 flex justify-center">
          <div className="absolute inset-0 bg-ink/30" onClick={() => setSheetOpen(false)} aria-hidden />
          <div className="relative mt-auto w-full max-w-[430px] rounded-t-3xl bg-page px-5 pb-[max(1.75rem,env(safe-area-inset-bottom))] pt-3.5 shadow-card">
            <div className="mx-auto mb-4 h-1.5 w-10 rounded-full bg-line" />
            <div className="mb-3.5 flex items-baseline justify-between">
              <h3 className="font-serif text-2xl font-bold italic tracking-[-0.02em] text-ink">{prompt.verb}</h3>
              <button
                type="button"
                onClick={() => setSheetOpen(false)}
                className="text-[13px] font-semibold text-muted underline underline-offset-2"
              >
                {resolveChrome(DISCOVER_CHROME.close, mode)}
              </button>
            </div>
            {/* Before answering, the asked cell is BLANKED (pattern-completion, like the réviser
                Indice) — the sheet helps you find the form, it never hands it to you. */}
            <ConjugationGrid grid={grid} blankTarget />
            <p className="mt-3.5 text-[12.5px] leading-relaxed text-muted">
              {resolveChrome(DRILL_CHROME.promptHint, mode)}{' '}
              <strong className="font-semibold text-ink">{PERSON_LABELS[prompt.person]}</strong>.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
