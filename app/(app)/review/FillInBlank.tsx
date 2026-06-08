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
import { pickClozeExample, resultHintExample } from '@/lib/review-cloze'
import { isInParadigm } from '@/lib/conjugator'
import { verbCue } from '@/lib/review-cue'
import { posAbbrev } from '@/lib/discovery'
import { wordDiff, type DiffOp } from '@/lib/worddiff'
import type { ReviewCard } from './page'
import RatingButtons from './RatingButtons'
import AnswerBlank from './AnswerBlank'
import AccentBar from './AccentBar'
import ResultReveal, { type Verdict } from './ResultReveal'

type Props = {
  card: ReviewCard
  cardStartRef: React.RefObject<number>
  onRate: (rating: 1 | 2 | 3 | 4, timeMs: number, hintUsed: boolean) => void
  onResult?: (quality: BlankQuality) => void
}

// Verdict FACE/colour mapping. wrongForm now shares the NEUTRAL ¡Casi! face (board ③/⑤) — "le bon
// verbe, l'autre forme" is an "almost", not a punished error. NOTE: only the verdict layer moves;
// computeRating is untouched, so wrongForm still SUGGESTS its existing rating (À revoir).
const QUALITY_TO_VERDICT: Record<BlankQuality, Verdict> = {
  exact: 'correct',
  near: 'close',
  wrongForm: 'close',
  wrong: 'wrong',
}

// Typed answer with the differing letters marked (used in the ¡Casi! near-miss teaching line).
function RenderTyped({ ops }: { ops: DiffOp[] }) {
  return (
    <>
      {ops
        .filter((o) => o.type !== 'ins')
        .map((o, i) => {
          const ch = o.type === 'match' ? o.char : (o as { typed: string }).typed
          return (
            <span key={i} className={o.type !== 'match' ? 'underline' : ''}>
              {ch}
            </span>
          )
        })}
    </>
  )
}

export default function FillInBlank({ card, cardStartRef, onRate, onResult }: Props) {
  const { word, lemma, definition } = card

  const [picked] = useState(() =>
    pickClozeExample({
      examples: card.examples,
      word: card.word,
      id: card.id,
      lemma: card.lemma,
      pos: card.definition?.pos,
      reps: card.reps,
    }),
  )
  const verbLemma = lemma ?? word
  const correctWord = picked?.target?.surface ?? word
  const isVerbCard = !!picked?.target

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
    inputRef.current?.blur()
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
    // Conditional context chip (Fix #1), deterministic by card type. Verb: infinitive + tense +
    // person (Spanish, degrade-safe) — needed to conjugate; the infinitive ≠ the answer. Non-verb:
    // posAbbrev + FR gloss — never the lemma (that's the answer).
    const cue = isVerbCard ? verbCue(correctWord, verbLemma) : null
    const contextChip = isVerbCard ? (
      <div className="self-start inline-flex items-baseline gap-2 bg-card border border-tinted-border rounded-full px-3.5 py-[7px]">
        <span className="font-serif text-[15px] font-bold text-ink">{cue!.infinitive}</span>
        {(cue!.tense || cue!.person) && (
          <span className="text-[12.5px] font-medium text-muted">
            {[cue!.tense, cue!.person].filter(Boolean).join(' · ')}
          </span>
        )}
      </div>
    ) : definition.pos || definition.fr ? (
      <div className="self-start inline-flex items-baseline gap-2">
        {definition.pos && <span className="text-[13.5px] text-muted">{posAbbrev(definition.pos)}</span>}
        {definition.pos && definition.fr && <span className="text-faint">·</span>}
        {definition.fr && <span className="font-serif italic text-[14.5px] text-muted">{definition.fr}</span>}
      </div>
    ) : null

    // Indice reveals the first letter for ALL cards now (the persistent verb chip subsumes the old
    // lemma/person hint). hintUsed penalty unchanged.
    const hintLabel = `« ${correctWord[0]}… »`

    return (
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted">
          {picked ? 'Complétez la phrase' : 'Définition'}
        </p>

        {contextChip}

        <div ref={sentenceRef} className="bg-card border border-line rounded-card shadow-card p-[18px] scroll-mt-24">
          {picked ? (
            <p className="font-serif text-[19px] text-ink leading-[1.7]">
              {before}
              {blank}
              {after}
            </p>
          ) : (
            <>
              <p className="font-serif text-sm text-ink leading-relaxed">{definition.es}</p>
              <p className="mt-3 font-serif text-[19px] text-ink">{blank}</p>
            </>
          )}
          {picked && <p className="mt-2 font-serif italic text-[13px] text-muted">{picked.example.fr}</p>}
        </div>

        <AccentBar inputRef={inputRef} value={answer} onChange={setAnswer} />

        <div className="flex gap-2">
          {!hintUsed ? (
            <button
              type="button"
              onClick={handleHint}
              className="flex-1 rounded-card border border-line py-3 text-center font-sans text-sm font-semibold text-muted"
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
            className="flex-[2] rounded-card bg-accent py-3 text-center font-sans text-[15px] font-semibold text-ivory disabled:bg-amber-light disabled:text-[#C2A877] transition-colors"
          >
            Valider →
          </button>
        </div>

        <div className="rounded-lg border border-dashed border-border-soft px-3 py-2 text-center text-[12.5px] italic text-faint">
          ↵ Entrée pour valider
        </div>
      </form>
    )
  }

  // ── RESULT CARD ─────────────────────────────────────────────────────────────
  const { quality, distance } = classify(answer)
  const verdict = QUALITY_TO_VERDICT[quality]
  const note =
    quality === 'exact'
      ? hintUsed ? 'avec un indice' : 'du premier coup'
      : quality === 'near'
        ? `${distance} lettre${distance > 1 ? 's' : ''} près`
        : quality === 'wrongForm'
          ? "le bon verbe, l'autre forme"
          : null
  const diffOps = quality === 'near' ? wordDiff(answer.trim(), correctWord) : []
  const example = resultHintExample(picked, card)
  // Conjugation descriptor for the wrong-form reveal (deterministic, never LLM).
  const formCue = quality === 'wrongForm' ? verbCue(correctWord, verbLemma) : null
  const formDescriptor = formCue ? [formCue.tense, formCue.person].filter(Boolean).join(' · ') : ''

  return (
    <div className="flex flex-col gap-4">
      <ResultReveal verdict={verdict} note={note} />

      {/* ¡Eso es! — surface reveal with the answer in sage */}
      {quality === 'exact' && (
        <div className="fade-up bg-card border border-line rounded-card p-4" style={{ animationDelay: '0.1s' }}>
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted">Ta réponse</p>
          <p className="mt-1.5 font-serif text-[17px] text-ink leading-[1.6]">
            {picked ? (
              <>
                {before}
                <strong className="font-bold text-sage-ink">{answer.trim()}</strong>
                {after}
              </>
            ) : (
              <strong className="font-bold text-sage-ink">{answer.trim()}</strong>
            )}
          </p>
        </div>
      )}

      {/* ¡Casi! near-miss — crème+ card, neutral teaching line */}
      {quality === 'near' && (
        <div className="fade-up bg-surface-alt border border-tinted-border rounded-card p-4" style={{ animationDelay: '0.1s' }}>
          <p className="text-sm text-ink leading-snug">
            Tu as écrit{' '}
            <span className="font-bold text-sepia">
              <RenderTyped ops={diffOps} />
            </span>{' '}
            — c&apos;est <span className="font-bold text-ink">{correctWord}</span>.
          </p>
        </div>
      )}

      {/* ¡Casi! verb-form mismatch — crème+ card; the expected form + descriptor, quiet "Ta réponse" */}
      {quality === 'wrongForm' && (
        <div className="fade-up bg-surface-alt border border-tinted-border rounded-card p-4" style={{ animationDelay: '0.1s' }}>
          <p className="text-sm text-ink leading-snug">Tu connais le verbe — ce n&apos;est pas la forme attendue ici.</p>
          <p className="mt-3 text-[11px] font-bold uppercase tracking-[0.14em] text-muted">La forme attendue</p>
          <p className="mt-1 font-serif text-[1.875rem] font-bold tracking-[-0.02em] text-ink">{correctWord}</p>
          {formDescriptor && <p className="mt-1 text-[12.5px] text-muted">{formDescriptor}</p>}
          <p className="mt-2 text-xs italic text-faint">Ta réponse : {answer.trim()}</p>
        </div>
      )}

      {/* ¡Uy! genuinely wrong — surface reveal; the ANSWER is the loud element, the miss is quiet */}
      {quality === 'wrong' && (
        <div className="fade-up bg-card border border-line rounded-card p-4" style={{ animationDelay: '0.1s' }}>
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted">La réponse</p>
          <p className="mt-1 font-serif text-[1.875rem] font-bold tracking-[-0.02em] text-ink">{correctWord}</p>
          {(definition.pos || definition.fr) && (
            <p className="mt-1 text-[13px] text-muted">
              {definition.pos ? posAbbrev(definition.pos) : ''}
              {definition.pos && definition.fr ? ' · ' : ''}
              <span className="italic">{definition.fr}</span>
            </p>
          )}
          <div className="my-2.5 border-t border-border-soft" />
          <p className="text-xs italic text-faint">Ta réponse : {answer.trim()}</p>
        </div>
      )}

      {/* Example callout (close + wrong) */}
      {quality !== 'exact' && example && (
        <div
          className="fade-up bg-card border-l-[3px] border-accent rounded-r-card px-3.5 py-3"
          style={{ animationDelay: '0.18s' }}
        >
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-accent">Exemple</p>
          <p className="mt-1 font-serif text-base text-ink leading-snug">{example.es}</p>
          {example.fr && <p className="font-serif italic text-[13.5px] text-muted">{example.fr}</p>}
        </div>
      )}

      <div className="fade-up" style={{ animationDelay: '0.18s' }}>
        <RatingButtons result={result} onRate={(r) => onRate(r, frozenTimeMs, hintUsed)} />
      </div>
    </div>
  )
}
