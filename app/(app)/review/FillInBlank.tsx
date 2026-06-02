'use client'

import Image from 'next/image'
import { useEffect, useRef, useState } from 'react'
import type React from 'react'
import { classifyBlankAnswer, computeRating, type BlankQuality, type RatingResult } from '@/lib/rating'
import { maskSentence } from '@/lib/mask'
import { wordDiff, type DiffOp } from '@/lib/worddiff'
import type { ReviewCard } from './page'
import RatingButtons from './RatingButtons'
import AnswerBlank from './AnswerBlank'

type Verdict = 'correct' | 'close' | 'wrong'

type Props = {
  card: ReviewCard
  cardStartRef: React.RefObject<number>
  onRate: (rating: 1 | 2 | 3 | 4, timeMs: number, hintUsed: boolean) => void
  // Reported when the answer is graded, so the session header can flip to success on correct.
  onResult?: (quality: BlankQuality) => void
}

const VERDICT_META: Record<Verdict, { img: string; excl: string; color: string }> = {
  correct: { img: '/paco-feliz.png', excl: '¡Eso es!', color: 'text-ok' },
  close: { img: '/paco-pensando.png', excl: '¡Casi!', color: 'text-warm' },
  wrong: { img: '/paco-sad.png', excl: '¡Uy!', color: 'text-err' },
}

const QUALITY_TO_VERDICT: Record<BlankQuality, Verdict> = {
  exact: 'correct',
  near: 'close',
  wrong: 'wrong',
}

// Deterministic example selection (server + client agree — no hydration mismatch).
function pickExample(card: ReviewCard) {
  const { examples, word, id } = card
  if (examples.length === 0) return null
  const seed = parseInt(id.replace(/-/g, '').slice(0, 8), 16) || id.charCodeAt(0)
  const start = seed % examples.length
  for (let i = 0; i < examples.length; i++) {
    const ex = examples[(start + i) % examples.length]
    const masked = maskSentence(ex.es, word)
    if (masked !== null) return { example: ex, masked }
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
  const { word, definition } = card
  const pos = definition?.pos

  const [picked] = useState(() => pickExample(card))
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
    setResult(computeRating({ correctWord: word, userAnswer: answer, timeMs, hintUsed, mode: 'blank' }))
    inputRef.current?.blur() // close the keyboard — the result is a reading beat
    onResult?.(classifyBlankAnswer(word, answer).quality)
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
              « {word[0]}… »
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
  const { quality, distance } = classifyBlankAnswer(word, answer)
  const verdict = QUALITY_TO_VERDICT[quality]
  const meta = VERDICT_META[verdict]
  const note =
    verdict === 'correct'
      ? hintUsed
        ? 'avec un indice'
        : 'du premier coup'
      : verdict === 'close'
        ? `${distance} lettre${distance > 1 ? 's' : ''} près`
        : null
  const diffOps = verdict === 'correct' ? [] : wordDiff(answer.trim(), word)
  const example = card.examples[0]

  return (
    <div className="flex flex-col gap-4">
      {/* Reveal */}
      <div className="fade-up flex items-end gap-3.5">
        <Image src={meta.img} alt="Paco" width={72} height={72} className="object-contain shrink-0" />
        <div className="pb-1.5">
          <p className={`font-serif text-[2.375rem] font-bold italic leading-none tracking-[-0.02em] ${meta.color}`}>
            {meta.excl}
          </p>
          {note && <p className="mt-1 text-[13px] text-muted">{note}</p>}
        </div>
      </div>

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
          — c&apos;est <span className="font-bold text-ok">{word}</span>.
        </p>
      )}

      {verdict === 'wrong' && (
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
