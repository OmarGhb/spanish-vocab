'use client'

import { useEffect, useRef, useState } from 'react'
import type React from 'react'
import { Lightbulb } from 'lucide-react'
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
import { verbCue, verbGridCoords } from '@/lib/review-cue'
import { buildConjugationGridForTense } from '@/lib/conjugation-grid'
import { posAbbrev } from '@/lib/discovery'
import { scrambleLetters, seedFromString, usedScrambleTiles } from '@/lib/scramble'
import { wordDiff, type DiffOp } from '@/lib/worddiff'
import type { ReviewCard } from './page'
import RatingButtons from './RatingButtons'
import AnswerBlank from './AnswerBlank'
import AccentBar from './AccentBar'
import ConjugationGrid from '../ConjugationGrid'
import ResultReveal, { type Verdict } from './ResultReveal'

type Props = {
  card: ReviewCard
  cardStartRef: React.RefObject<number>
  onRate: (rating: 1 | 2 | 3 | 4, timeMs: number, hintLevel: number) => void
  onResult?: (quality: BlankQuality) => void
}

// Verdict FACE/colour mapping. wrongForm shares the NEUTRAL ¡Casi! face (M5.5e); only the verdict
// layer is mapped here — computeRating is untouched.
const QUALITY_TO_VERDICT: Record<BlankQuality, Verdict> = {
  exact: 'correct',
  near: 'close',
  wrongForm: 'close',
  wrong: 'wrong',
}

// Highest still-suggestable rating after N hints (matches lib/rating.ts HINT_CAP) — for the caption.
const HINT_CAP_LABEL = ['Facile', 'Bien', 'Difficile', 'À revoir'] as const

// Typed answer with the differing letters marked (the ¡Casi! near-miss teaching line).
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

  // Deterministic verb cue (tier-1 form text) + raw grid coords (tier-2 table + verb verdicts).
  const cue = isVerbCard ? verbCue(correctWord, verbLemma) : null
  const verbHasForm = !!(cue && (cue.tense || cue.person))
  const coords = isVerbCard ? verbGridCoords(correctWord, verbLemma) : null
  const verbGrid = coords ? buildConjugationGridForTense(verbLemma, coords.tense, coords.person) : null

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
  const [hintLevel, setHintLevel] = useState(0) // 0–3 tiered Indice
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

  function handleSubmit(e: React.SyntheticEvent) {
    e.preventDefault()
    if (result || !answer.trim()) return
    const timeMs = Date.now() - cardStartRef.current
    setFrozenTimeMs(timeMs)
    const verb = picked?.target
      ? { target: picked.target.surface, lemma: verbLemma, inParadigm: (a: string) => isInParadigm(a, verbLemma) }
      : undefined
    setResult(computeRating({ correctWord, userAnswer: answer, timeMs, hintLevel, mode: 'blank', verb }))
    inputRef.current?.blur()
    onResult?.(classify(answer).quality)
  }

  const parts = picked ? picked.masked.split('_____') : null
  const before = parts?.[0] ?? ''
  const after = parts?.[1] ?? ''

  // ── ANSWERING STATE ─────────────────────────────────────────────────────────
  if (!result) {
    // Tier plan. Verb with a determinable form → tier-1 form pill; otherwise tier 1 is the
    // first-letter (in the blank). Tier 2 → the conjugation table for verbs (when coords resolve),
    // else the ES definition. Tier 3 → scramble. Each tier still counts toward the cap regardless.
    const showFormPill = hintLevel >= 1 && verbHasForm
    const showFirstLetter = hintLevel >= 1 && !showFormPill
    const showVerbTable = hintLevel >= 2 && !!verbGrid
    const showDefinition = hintLevel >= 2 && !showVerbTable && !!definition.es
    const showScramble = hintLevel >= 3
    const scrambled = showScramble ? scrambleLetters(correctWord, seedFromString(card.id)) : []

    const blank = (
      <AnswerBlank
        value={answer}
        onChange={setAnswer}
        inputRef={inputRef}
        ghost={showFirstLetter ? correctWord[0] : undefined}
        onFocus={() => sentenceRef.current?.scrollIntoView({ block: 'center', behavior: 'smooth' })}
      />
    )

    return (
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted">
          {picked ? 'Complétez la phrase' : 'Définition'}
        </p>

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

        {/* HintZone — revealed tiers stack below the prompt (tier-1 first letter lives in the blank). */}
        {(showFormPill || showVerbTable || showDefinition || showScramble) && (
          <div className="flex flex-col gap-2.5">
            {showFormPill && (
              <span className="self-start inline-flex items-baseline gap-2 bg-card border border-tinted-border rounded-full px-3.5 py-[7px]">
                <span className="text-[13px] font-semibold text-muted">v.</span>
                <span className="text-[12.5px] text-muted">{[cue!.tense, cue!.person].filter(Boolean).join(' · ')}</span>
              </span>
            )}
            {showVerbTable && verbGrid && <ConjugationGrid grid={verbGrid} blankTarget infinitive={verbLemma} />}
            {showDefinition && (
              <div className="bg-card border border-line rounded-card p-4">
                <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted">Definición · ES</p>
                <p className="mt-1.5 font-serif text-sm text-ink leading-relaxed">{definition.es}</p>
              </div>
            )}
            {showScramble && (
              <div className="bg-card border border-line rounded-card p-4">
                <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted mb-2">Lettres mélangées</p>
                <div className="flex flex-wrap gap-1.5">
                  {/* Tiles deplete as the user types the matching letters (multiset, accent-folded). */}
                  {usedScrambleTiles(scrambled, answer).map((used, i) => (
                    <span
                      key={i}
                      className={`inline-flex items-center justify-center w-[30px] h-[34px] rounded-lg border font-serif text-[17px] transition-colors ${
                        used
                          ? 'bg-page border-border-soft text-faint opacity-50'
                          : 'bg-tint border-tinted-border text-ink'
                      }`}
                    >
                      {scrambled[i]}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        <AccentBar inputRef={inputRef} value={answer} onChange={setAnswer} />

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setHintLevel((l) => Math.min(3, l + 1))}
            disabled={hintLevel >= 3}
            className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-card border border-line py-3 font-sans text-sm font-semibold text-muted disabled:bg-page disabled:text-faint"
          >
            <Lightbulb size={15} />
            Indice · {hintLevel}/3
          </button>
          <button
            type="submit"
            disabled={!answer.trim()}
            className="flex-[2] rounded-card bg-accent py-3 text-center font-sans text-[15px] font-semibold text-ivory disabled:bg-amber-light disabled:text-[#C2A877] transition-colors"
          >
            Valider →
          </button>
        </div>

        {hintLevel > 0 && (
          <p className="text-center text-[12px] text-faint">
            {hintLevel} indice{hintLevel > 1 ? 's' : ''} utilisé{hintLevel > 1 ? 's' : ''} · note max suggérée :{' '}
            <b className="text-sepia">{HINT_CAP_LABEL[hintLevel]}</b>
          </p>
        )}

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
      ? hintLevel > 0 ? 'avec un indice' : 'du premier coup'
      : quality === 'near'
        ? `${distance} lettre${distance > 1 ? 's' : ''} près`
        : quality === 'wrongForm'
          ? "le bon verbe, l'autre forme"
          : null
  const diffOps = quality === 'near' ? wordDiff(answer.trim(), correctWord) : []
  const example = resultHintExample(picked, card)
  // Verb verdicts reuse the conjugation table (expected form highlighted) when coords resolve.
  const showVerdictTable = (quality === 'wrongForm' || quality === 'wrong') && isVerbCard && !!verbGrid

  return (
    <div className="flex flex-col gap-4">
      <ResultReveal verdict={verdict} note={note} audioUrl={card.audioUrl} />

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

      {/* Conjugation table also on ¡Eso es! (correct) + ¡Casi! near-miss verb verdicts — the full
          paradigm with the expected form highlighted (deterministic, never LLM). wrongForm/wrong
          embed it in their own reveal below. */}
      {(quality === 'exact' || quality === 'near') && isVerbCard && verbGrid && (
        <div className="fade-up" style={{ animationDelay: '0.14s' }}>
          <ConjugationGrid grid={verbGrid} infinitive={verbLemma} />
        </div>
      )}

      {/* ¡Casi! verb-form mismatch — crème+ card; the conjugation table with the expected form
          highlighted (deterministic, never LLM), then the quiet "Ta réponse" line. */}
      {quality === 'wrongForm' && (
        <div className="fade-up bg-surface-alt border border-tinted-border rounded-card p-4 flex flex-col gap-3" style={{ animationDelay: '0.1s' }}>
          <p className="text-sm text-ink leading-snug">Tu connais le verbe — ce n&apos;est pas la forme attendue ici.</p>
          {showVerdictTable && verbGrid ? (
            <ConjugationGrid grid={verbGrid} infinitive={verbLemma} />
          ) : (
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted">La forme attendue</p>
              <p className="mt-1 font-serif text-[1.875rem] font-bold tracking-[-0.02em] text-ink">{correctWord}</p>
            </div>
          )}
          <p className="text-xs italic text-faint">Ta réponse : {answer.trim()}</p>
        </div>
      )}

      {/* ¡Uy! genuinely wrong — the ANSWER is the loud element (verb: the conjugation table). */}
      {quality === 'wrong' && (
        <div className="fade-up bg-card border border-line rounded-card p-4" style={{ animationDelay: '0.1s' }}>
          {showVerdictTable && verbGrid ? (
            <>
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted mb-2">La réponse</p>
              <ConjugationGrid grid={verbGrid} infinitive={verbLemma} />
            </>
          ) : (
            <>
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted">La réponse</p>
              <p className="mt-1 font-serif text-[1.875rem] font-bold tracking-[-0.02em] text-ink">{correctWord}</p>
              {(definition.pos || definition.fr) && (
                <p className="mt-1 text-[13px] text-muted">
                  {definition.pos ? posAbbrev(definition.pos) : ''}
                  {definition.pos && definition.fr ? ' · ' : ''}
                  <span className="italic">{definition.fr}</span>
                </p>
              )}
            </>
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
        <RatingButtons result={result} onRate={(r) => onRate(r, frozenTimeMs, hintLevel)} />
      </div>
    </div>
  )
}
