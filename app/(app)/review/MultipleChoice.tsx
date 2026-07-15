'use client'

import type React from 'react'
import { useMemo, useState } from 'react'
import { computeRating, type RatingResult } from '@/lib/rating'
import { pickClozeExample, isVerbPos, chooseQcmCue } from '@/lib/review-cloze'
import type { ReviewCard } from './page'
import RatingButtons from './RatingButtons'
import ResultReveal from './ResultReveal'
import TapReveal from '../TapReveal'
import { useSettings } from '../SettingsProvider'
import { glossVisibility, resolveChrome, REVIEW_CHROME } from '@/lib/immersion'

type Props = {
  card: ReviewCard
  // cardStartRef is written by ReviewSession on each card mount (in a useEffect) and
  // read here only inside event handlers — never during render.
  cardStartRef: React.RefObject<number>
  onRate: (rating: 1 | 2 | 3 | 4, timeMs: number, hintLevel: number) => void
}

function shuffle<T>(arr: T[], seed: number): T[] {
  const a = [...arr]
  let s = seed
  for (let i = a.length - 1; i > 0; i--) {
    s = (s * 1664525 + 1013904223) & 0xffffffff
    const j = Math.abs(s) % (i + 1)
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

// Derive a stable numeric seed from a UUID string — same value on server and client,
// preventing React hydration mismatches from Math.random() in lazy initializers.
function seedFromId(id: string): number {
  return parseInt(id.replace(/-/g, '').slice(0, 8), 16) || id.charCodeAt(0)
}

export default function MultipleChoice({ card, cardStartRef, onRate }: Props) {
  const { word, definition, examples, distractors } = card
  // Immersion mode gates the French gloss: visible (fr_es) · tap-to-reveal (immersion) · hidden
  // (totale). Chrome strings without authored ES stay French (resolveChrome falls back).
  const { immersionMode } = useSettings()
  const gloss = glossVisibility(immersionMode)

  // Deterministic seed — stable across SSR and hydration.
  const seed = useMemo(() => seedFromId(card.id), [card.id])

  // Prompt chosen deterministically once: definition or masked example.
  const [prompt] = useState<
    | { type: 'definition'; es: string; fr: string }
    | { type: 'example'; es: string; fr: string }
  >(() => {
    const isVerb = isVerbPos(definition.pos)

    // Cue decision uses a reps-INDEPENDENT pick so the FORMAT never changes across reviews — only
    // the example does (#3 non-goal). chooseQcmCue is a PURE, unit-tested helper (locked because the
    // inline version regressed): a verb gets the cloze ONLY when stored in the example's form, so
    // the blank and the options agree; infinitive-stored verbs fall to the lemma-level
    // definition-MCQ until conjugated distractors land (M5.3c).
    const pickedForCue = isVerb
      ? pickClozeExample({ examples, word, id: card.id, lemma: card.lemma, pos: definition.pos })
      : null
    if (chooseQcmCue(card, pickedForCue, seed) === 'definition') {
      return { type: 'definition', es: definition.es, fr: definition.fr }
    }

    // Cloze cue. Verb path: paradigm-aware mask, example rotated by reps. Non-verb path: the
    // existing literal-word replace (unchanged — not part of the maskable-rotation scope).
    if (isVerb) {
      const picked =
        pickClozeExample({ examples, word, id: card.id, lemma: card.lemma, pos: definition.pos, reps: card.reps }) ??
        pickedForCue!
      return { type: 'example', es: picked.masked, fr: picked.example.fr }
    }
    const ex = examples[seed % examples.length]
    const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    return { type: 'example', es: ex.es.replace(new RegExp(escaped, 'i'), '_____'), fr: ex.fr }
  })

  // Stable shuffle across re-renders, keyed on seed.
  const options = useMemo(() => shuffle([word, ...distractors], seed), [word, distractors, seed])

  const [chosen, setChosen] = useState<string | null>(null)
  const [result, setResult] = useState<RatingResult | null>(null)
  const [hintUsed, setHintUsed] = useState(false)
  // timeMs frozen at pick — not recomputed when the user taps a rating.
  const [frozenTimeMs, setFrozenTimeMs] = useState(0)

  function handlePick(option: string) {
    if (result) return
    // Timer stops here. cardStartRef.current was set on card mount by ReviewSession.
    // eslint-disable-next-line react-hooks/purity -- Date.now() in an event handler is correct usage
    const timeMs = Date.now() - cardStartRef.current
    setChosen(option)
    setFrozenTimeMs(timeMs)
    const rating = computeRating({ correctWord: word, userAnswer: option, timeMs, hintLevel: hintUsed ? 1 : 0, mode: 'mc' })
    setResult(rating)
  }

  // Board ②: correct = sage (strong, the loud element); wrong-picked = GENTLE terra (1px + soft
  // strike); others fade. Non-punitive — always surface the right answer over punishing the wrong.
  type OptState = 'rest' | 'correct' | 'wrong' | 'faded'
  function optState(option: string): OptState {
    if (!result) return 'rest'
    if (option === word) return 'correct'
    if (option === chosen && chosen !== word) return 'wrong'
    return 'faded'
  }
  const OPT_CLS: Record<OptState, string> = {
    rest: 'bg-card border-line text-ink',
    correct: 'bg-ok-bg border-[1.5px] border-sage-border text-sage-ink font-semibold',
    wrong: 'bg-err-bg border-terra-border text-terra-ink',
    faded: 'bg-card border-line text-faint opacity-55',
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Verdict at the TOP, matching écriture (verdict → answer detail → rating). Same Paco
          reveal as FillInBlank; MCQ is binary — no ¡Casi!; the correct option stays tinted in
          the list below, so no extra "answer" line is needed. */}
      {result && (
        <ResultReveal
          verdict={chosen === word ? 'correct' : 'wrong'}
          note={
            chosen === word
              ? resolveChrome(hintUsed ? REVIEW_CHROME.noteWithHint : REVIEW_CHROME.noteFirstTry, immersionMode)
              : null
          }
          audioUrl={card.audioUrl}
        />
      )}

      <div>
        {/* Instruction eyebrow — pairs with écriture's "Complétez la phrase" (M5.5f). */}
        <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted mb-3">
          {resolveChrome(REVIEW_CHROME.mcInstruction, immersionMode)}
        </p>
        {prompt.type === 'definition' ? (
          <>
            <p className="font-serif text-sm text-ink leading-relaxed">{prompt.es}</p>
            {/* FR gloss behind the hint button (revealing it costs a hint). Suppressed in totale. */}
            {gloss !== 'hidden' &&
              (hintUsed ? (
                <p className="font-serif italic text-sm text-muted mt-1">{prompt.fr}</p>
              ) : (
                !result && (
                  <button
                    type="button"
                    onClick={() => setHintUsed(true)}
                    className="text-xs text-accent mt-2"
                  >
                    ↓ {resolveChrome(REVIEW_CHROME.revealGloss, immersionMode)}
                  </button>
                )
              ))}
          </>
        ) : (
          <>
            <p className="font-serif text-base text-ink leading-relaxed">{prompt.es}</p>
            {/* Example gloss: shown (fr_es) · tap-to-reveal, free (immersion) · hidden (totale). */}
            {gloss === 'visible' && <p className="font-serif text-sm text-muted mt-1">{prompt.fr}</p>}
            {gloss === 'tap' && (
              <div className="mt-1.5">
                <TapReveal label={resolveChrome(REVIEW_CHROME.revealGloss, immersionMode)}>
                  <p className="font-serif text-sm text-muted">{prompt.fr}</p>
                </TapReveal>
              </div>
            )}
          </>
        )}
      </div>

      <div className="flex flex-col gap-[9px]">
        {options.map((option) => {
          const st = optState(option)
          return (
            <button
              key={option}
              onClick={() => handlePick(option)}
              disabled={!!result}
              className={`w-full flex items-center justify-between gap-3 text-left rounded-card border px-4 py-3.5 font-serif text-[17px] transition-colors ${OPT_CLS[st]}`}
            >
              <span className={st === 'wrong' ? 'line-through decoration-1' : ''}>{option}</span>
              {st === 'correct' && (
                <span className="flex items-center justify-center w-[22px] h-[22px] rounded-full bg-ok text-ivory shrink-0">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 13l4 4L19 7" />
                  </svg>
                </span>
              )}
              {st === 'wrong' && (
                <span className="flex items-center justify-center w-[22px] h-[22px] rounded-full border border-terra-border text-terra-ink shrink-0">
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round">
                    <path d="M6 6l12 12M18 6L6 18" />
                  </svg>
                </span>
              )}
            </button>
          )
        })}
      </div>

      {result && (
        // Quiet fade-up cascade matching écriture's rating slot (verdict already fades itself).
        <div className="fade-up" style={{ animationDelay: '0.18s' }}>
          <RatingButtons result={result} onRate={(r) => onRate(r, frozenTimeMs, hintUsed ? 1 : 0)} />
        </div>
      )}
    </div>
  )
}
