'use client'

import { useEffect, useRef, useState } from 'react'
import type React from 'react'
import {
  classifyBlankAnswer,
  classifyVerbBlank,
  computeRating,
  type BlankQuality,
  type BlankReason,
  type RatingResult,
} from '@/lib/rating'
import { maskSentence, maskVerbSentence, type VerbTarget } from '@/lib/mask'
import { isInParadigm, unambiguousPerson } from '@/lib/conjugator'
import { wordDiff, type DiffOp } from '@/lib/worddiff'
import type { ReviewCard } from './page'
import RatingButtons from './RatingButtons'
import AnswerBlank from './AnswerBlank'
import ResultReveal, { type Verdict } from './ResultReveal'

type Props = {
  card: ReviewCard
  cardStartRef: React.RefObject<number>
  onRate: (rating: 1 | 2 | 3 | 4, timeMs: number, hintUsed: boolean) => void
  // Reported when the answer is graded, so the session header can flip to success on correct.
  onResult?: (quality: BlankQuality) => void
}

const QUALITY_TO_VERDICT: Record<BlankQuality, Verdict> = {
  exact: 'correct',
  near: 'close',
  // wrongForm shares the ¡Uy! chrome (no new badge/label/colour — the dedicated "right verb,
  // wrong form" visual is deferred to M5.3b); only the result-card copy differs (below).
  wrongForm: 'wrong',
  wrong: 'wrong',
}

const WRONG_FORM_COPY = 'Tu connais le verbe — mais ce n’est pas la forme attendue ici'

const isVerbPos = (pos?: string) => pos === 'v.' || pos === 'v.pron.'

type Picked = {
  example: { es: string; fr: string }
  masked: string
  // Verb cards: the blanked token's surface + coordinates (paradigm-aware masking). null for
  // non-verbs and for the verb fallback to plain maskSentence.
  target: VerbTarget | null
}

// Deterministic example selection (server + client agree — no hydration mismatch). For verb
// cards, paradigm-aware masking blanks the contextually-correct conjugated form (M5.3a); the
// plain stem-heuristic maskSentence is the fallback for non-verbs and unmatched verb sentences.
function pickExample(card: ReviewCard): Picked | null {
  const { examples, word, id, lemma, definition } = card
  if (examples.length === 0) return null
  const seed = parseInt(id.replace(/-/g, '').slice(0, 8), 16) || id.charCodeAt(0)
  const start = seed % examples.length

  if (isVerbPos(definition?.pos)) {
    const verbLemma = lemma ?? word
    for (let i = 0; i < examples.length; i++) {
      const ex = examples[(start + i) % examples.length]
      const vr = maskVerbSentence(ex.es, verbLemma)
      if (vr) return { example: ex, masked: vr.masked, target: vr.target }
    }
  }

  for (let i = 0; i < examples.length; i++) {
    const ex = examples[(start + i) % examples.length]
    const masked = maskSentence(ex.es, word)
    if (masked !== null) return { example: ex, masked, target: null }
  }
  return null
}

// Typed answer with the differing letters marked. allDanger=true (close): whole answer in
// danger, slipped letters underlined. allDanger=false (wrong): neutral, only wrong letters danger.
function RenderTyped({ ops, allDanger }: { ops: DiffOp[]; allDanger?: boolean }) {
  return (
    <>
      {ops
        .filter((o) => o.type !== 'ins')
        .map((o, i) => {
          const ch = o.type === 'match' ? o.char : (o as { typed: string }).typed
          const wrong = o.type !== 'match'
          const cls = allDanger ? (wrong ? 'underline' : '') : wrong ? 'text-err' : ''
          return (
            <span key={i} className={cls}>
              {ch}
            </span>
          )
        })}
    </>
  )
}

// Correct word with the corrected letters underlined in success (wrong-state big word).
function RenderCorrect({ ops }: { ops: DiffOp[] }) {
  return (
    <>
      {ops
        .filter((o) => o.type !== 'del')
        .map((o, i) => {
          const ch = o.type === 'match' ? o.char : (o as { correct: string }).correct
          const diff = o.type !== 'match'
          return (
            <span key={i} className={diff ? 'text-ok underline decoration-2 underline-offset-4' : ''}>
              {ch}
            </span>
          )
        })}
    </>
  )
}

export default function FillInBlank({ card, cardStartRef, onRate, onResult }: Props) {
  const { word, lemma, definition } = card
  const pos = definition?.pos

  const [picked] = useState(() => pickExample(card))
  // The answer to grade against = the blanked token (the conjugated form) for verb cards,
  // else the stored word. This is the M5.3a fix: grade against the contextual form, not the lemma.
  const verbLemma = lemma ?? word
  const correctWord = picked?.target?.surface ?? word

  // One classification path, used for both the FSRS rating and the result-card verdict/copy
  // (so they can't diverge). Verb cards route through classifyVerbBlank (lemma → ¡Casi!, other
  // valid inflection → ¡Casi!); everything else keeps the existing classifyBlankAnswer.
  const classify = (
    ans: string,
  ): { quality: BlankQuality; reason: BlankReason; distance: number } => {
    if (picked?.target) {
      return classifyVerbBlank({
        target: picked.target.surface,
        lemma: verbLemma,
        userAnswer: ans,
        inParadigm: (a) => isInParadigm(a, verbLemma),
      })
    }
    const { quality, distance } = classifyBlankAnswer(correctWord, ans)
    const reason: BlankReason = quality === 'exact' ? 'exact' : quality === 'near' ? 'typo' : 'wrong'
    return { quality, reason, distance }
  }
  const [answer, setAnswer] = useState('')
  const [hintUsed, setHintUsed] = useState(false)
  const [result, setResult] = useState<RatingResult | null>(null)
  const [frozenTimeMs, setFrozenTimeMs] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const sentenceRef = useRef<HTMLDivElement>(null)

  // Autofocus on mount (still gesture-gated — iOS won't open the keyboard without a tap).
  // When the keyboard does open, keep the sentence + blank visible (slice-1 carry, retargeted
  // to the sentence card now that the answer is typed inline in the blank).
  useEffect(() => {
    inputRef.current?.focus()
    const bring = () => sentenceRef.current?.scrollIntoView({ block: 'center', behavior: 'smooth' })
    const vv = window.visualViewport
    vv?.addEventListener('resize', bring)
    return () => vv?.removeEventListener('resize', bring)
  }, [])

  function handleHint() {
    setHintUsed(true)
  }

  function handleSubmit(e: React.SyntheticEvent) {
    e.preventDefault()
    if (result || !answer.trim()) return
    const timeMs = Date.now() - cardStartRef.current
    setFrozenTimeMs(timeMs)
    const verb = picked?.target
      ? { target: picked.target.surface, lemma: verbLemma, inParadigm: (a: string) => isInParadigm(a, verbLemma) }
      : undefined
    setResult(computeRating({ correctWord, userAnswer: answer, timeMs, hintUsed, mode: 'blank', verb }))
    inputRef.current?.blur() // close the keyboard — the result is a reading beat
    onResult?.(classify(answer).quality)
  }

  const parts = picked ? picked.masked.split('_____') : null
  const before = parts?.[0] ?? ''
  const after = parts?.[1] ?? ''

  // ── ANSWERING STATE ─────────────────────────────────────────────────────────
  if (!result) {
    const blank = (
      <AnswerBlank
        value={answer}
        onChange={setAnswer}
        inputRef={inputRef}
        onFocus={() => sentenceRef.current?.scrollIntoView({ block: 'center', behavior: 'smooth' })}
      />
    )
    // Hint reveal: verb cards show (lemma, person) with the tense withheld (context is the cue);
    // person is the unambiguous one or omitted (e.g. imperfecto yo/él). Non-verbs keep the
    // first-letter cue. Coordinates derived on the fly — no stored data.
    const hintPerson = picked?.target ? unambiguousPerson(picked.target.surface, verbLemma) : null
    const hintLabel = picked?.target
      ? hintPerson
        ? `(${verbLemma}, ${hintPerson})`
        : `(${verbLemma})`
      : `« ${word[0]}… »`
    return (
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <span className="font-serif text-lg font-bold text-ink tracking-[-0.02em]">{word}</span>
          {pos && <span className="text-[11px] text-muted italic">· {pos}</span>}
        </div>

        <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted">
          {picked ? 'Complétez la phrase' : 'Définition'}
        </p>

        <div ref={sentenceRef} className="bg-card border border-line rounded-card p-4 scroll-mt-24">
          {picked ? (
            <p className="font-serif text-[17px] text-ink leading-[1.65]">
              {before}
              {blank}
              {after}
            </p>
          ) : (
            <>
              <p className="font-serif text-sm text-ink leading-relaxed">{definition.es}</p>
              <p className="mt-3 font-serif text-[17px] text-ink">{blank}</p>
            </>
          )}
          {picked && <p className="mt-2 font-serif italic text-[13px] text-muted">{picked.example.fr}</p>}
        </div>

        <div className="flex gap-2">
          {!hintUsed ? (
            <button
              type="button"
              onClick={handleHint}
              className="flex-1 rounded-card border border-line py-3 text-center font-serif text-sm font-semibold text-muted"
            >
              Indice
            </button>
          ) : (
            <span className="flex-1 rounded-card border border-line py-3 text-center font-serif text-sm text-muted">
              {hintLabel}
            </span>
          )}
          <button
            type="submit"
            disabled={!answer.trim()}
            className="flex-[2] rounded-card bg-accent py-3 text-center font-serif text-sm font-bold text-white disabled:opacity-40 transition-opacity"
          >
            Valider →
          </button>
        </div>

        <div className="rounded-lg bg-surface-alt px-3 py-2 text-[11px] italic text-muted">
          ↵ Entrée pour valider
        </div>
      </form>
    )
  }

  // ── RESULT CARD ─────────────────────────────────────────────────────────────
  const { quality, distance } = classify(answer)
  const verdict = QUALITY_TO_VERDICT[quality]
  // ¡Casi! (close) is now only ever a near-miss of the correct form (accent or genuine typo) —
  // lemma/other-inflection moved to wrongForm. So the close subline is always the distance.
  const note =
    verdict === 'correct'
      ? hintUsed
        ? 'avec un indice'
        : 'du premier coup'
      : verdict === 'close'
        ? `${distance} lettre${distance > 1 ? 's' : ''} près`
        : null
  // Letter-diff is meaningful for close (near-miss) and a genuine wrong word; for wrongForm the
  // answer is a different valid form, so a letter-diff would be noise — shown plain instead.
  const diffOps = verdict === 'correct' || quality === 'wrongForm' ? [] : wordDiff(answer.trim(), correctWord)
  const example = card.examples[0]

  return (
    <div className="flex flex-col gap-4">
      <ResultReveal verdict={verdict} note={note} />

      {/* Body */}
      {verdict === 'correct' && (
        <div className="fade-up bg-card border border-line rounded-card p-4" style={{ animationDelay: '0.1s' }}>
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted">Ta réponse</p>
          <p className="mt-1.5 font-serif text-[17px] text-ink leading-[1.6]">
            {picked ? (
              <>
                {before}
                <strong className="font-bold text-ok">{answer.trim()}</strong>
                {after}
              </>
            ) : (
              <strong className="font-bold text-ok">{answer.trim()}</strong>
            )}
          </p>
        </div>
      )}

      {verdict === 'close' && (
        <p className="fade-up text-sm text-ink leading-snug" style={{ animationDelay: '0.1s' }}>
          Tu as écrit{' '}
          <span className="font-bold text-err">
            <RenderTyped ops={diffOps} allDanger />
          </span>{' '}
          — c&apos;est <span className="font-bold text-ok">{correctWord}</span>.
        </p>
      )}

      {/* Right verb, wrong form: ¡Uy! chrome (above) + distinct copy, the expected form shown
          plain, no letter-diff. À revoir rating comes through computeRating (rating 1). */}
      {quality === 'wrongForm' && (
        <div className="fade-up bg-card border border-line rounded-card p-4" style={{ animationDelay: '0.1s' }}>
          <p className="text-sm text-ink leading-snug">{WRONG_FORM_COPY}</p>
          <p className="mt-3 text-[10px] font-bold uppercase tracking-[0.14em] text-muted">La forme attendue</p>
          <p className="mt-1 font-serif text-[1.75rem] font-bold tracking-[-0.02em] text-ink">{correctWord}</p>
          <p className="mt-2 text-xs italic text-muted">Ta réponse : {answer.trim()}</p>
        </div>
      )}

      {quality === 'wrong' && (
        <div className="fade-up bg-card border border-line rounded-card p-4" style={{ animationDelay: '0.1s' }}>
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted">La bonne réponse</p>
          <p className="mt-1 font-serif text-[1.75rem] font-bold tracking-[-0.02em] text-ink">
            <RenderCorrect ops={diffOps} />
          </p>
          <p className="mt-2 text-xs italic text-muted">
            Ta réponse : <RenderTyped ops={diffOps} />
          </p>
        </div>
      )}

      {/* Hint slot (close + wrong) — example sentence for now; M5.3 swaps in the conjugation hint */}
      {verdict !== 'correct' && example && (
        <div
          className="fade-up bg-tint border-l-[3px] border-accent rounded-r-card px-3.5 py-3"
          style={{ animationDelay: '0.18s' }}
        >
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-accent">Exemple</p>
          <p className="mt-1 font-serif text-sm text-ink leading-snug">{example.es}</p>
          {example.fr && <p className="font-serif italic text-xs text-muted">{example.fr}</p>}
        </div>
      )}

      {/* Rating — unchanged FSRS labels + suggestion (NOT the design's fixed-interval chips) */}
      <div className="fade-up" style={{ animationDelay: '0.18s' }}>
        <RatingButtons result={result} onRate={(r) => onRate(r, frozenTimeMs, hintUsed)} />
      </div>
    </div>
  )
}
