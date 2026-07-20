'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
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
import { blankTargetInDefinition } from '@/lib/blank-definition'
import { renderCloze } from './renderCloze'
import { wordDiff, type DiffOp } from '@/lib/worddiff'
import type { ReviewCard } from './page'
import RatingButtons from './RatingButtons'
import StickyActions from '../StickyActions'
import AnswerBlank from './AnswerBlank'
import AccentBar from './AccentBar'
import { useCaretInsert } from './useCaretInsert'
import ConjugationGrid from '../ConjugationGrid'
import ResultReveal, { type Verdict } from './ResultReveal'
import TapReveal from '../TapReveal'
import { useSettings } from '../SettingsProvider'
import { glossVisibility, resolveChrome, REVIEW_CHROME, RATING_LABELS } from '@/lib/immersion'

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

// Highest still-suggestable rating after N hints (matches lib/rating.ts HINT_CAP) — indexes the
// shared RATING_LABELS lexicon by ts-fsrs rating (0 hints → Easy(4) … 3 hints → Again(1)).
const HINT_CAP_RATING = [4, 3, 2, 1] as const

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
  // Immersion mode gates the French gloss: visible (fr_es) · tap-to-reveal (immersion) · hidden
  // (totale). Chrome strings without authored ES stay French (resolveChrome falls back).
  const { immersionMode } = useSettings()
  const gloss = glossVisibility(immersionMode)
  const revealLabel = resolveChrome(REVIEW_CHROME.revealGloss, immersionMode)

  // Definition-as-hint leak guard: blank the headword where it appears in its own ES definition,
  // at RENDER time only (the stored definition + the dictionary detail view keep the full text).
  // `word` IS the answer at both écriture definition sites — the no-example prompt and the T2 Indice
  // (non-verb → correctWord === word; a verb with a grid shows the table, not the definition).
  const blankedDefEs = useMemo(() => blankTargetInDefinition(definition.es, word), [definition.es, word])

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
  // Defensive: blank the Spanish headword in the cloze example's FR translation too, so a translation
  // that happens to contain the raw Spanish word can't leak it (a no-match is a pure passthrough; the
  // French translation of the word is a different stem and stays visible).
  const blankedExampleFr = useMemo(
    () => (picked ? blankTargetInDefinition(picked.example.fr, word) : ''),
    [picked, word],
  )

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
  // Tap-to-insert for the scramble tiles (shares the caret mechanic with AccentBar).
  const insertLetter = useCaretInsert(inputRef, answer, setAnswer)

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
          {resolveChrome(picked ? REVIEW_CHROME.blankInstruction : REVIEW_CHROME.definitionEyebrow, immersionMode)}
        </p>

        {/* Scramble (Indice tier 3) — placed ABOVE the prompt so the on-screen mobile keyboard
            (which covers the lower half of the viewport) can't hide the letters while typing. Tiles
            are tappable: tapping a letter inserts it into the answer at the caret — the mobile
            counterpart to the desktop AccentBar, and the easiest way to enter accents on a phone. */}
        {showScramble && (
          <div className="bg-card border border-line rounded-card p-4">
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted mb-2">{resolveChrome(REVIEW_CHROME.scramble, immersionMode)}</p>
            <div className="flex flex-wrap gap-1.5">
              {/* Tiles deplete as their letters are entered (typed OR tapped); a used tile is
                  disabled so it can't over-insert. */}
              {usedScrambleTiles(scrambled, answer).map((used, i) => (
                <button
                  key={i}
                  type="button"
                  disabled={used}
                  aria-label={scrambled[i]}
                  // onPointerDown + preventDefault keeps the input focused so the soft keyboard stays
                  // up (the primary iOS-Safari risk); insertLetter() also refocuses defensively.
                  onPointerDown={(e) => {
                    if (used) return
                    e.preventDefault()
                    insertLetter(scrambled[i])
                  }}
                  className={`inline-flex items-center justify-center w-[30px] h-[34px] rounded-lg border font-serif text-[17px] transition-colors ${
                    used
                      ? 'bg-page border-border-soft text-faint opacity-50'
                      : 'bg-tint border-tinted-border text-ink active:bg-amber-tint'
                  }`}
                >
                  {scrambled[i]}
                </button>
              ))}
            </div>
          </div>
        )}

        <div ref={sentenceRef} className="bg-card border border-line rounded-card shadow-card p-[18px] scroll-mt-24">
          {picked ? (
            <p className="font-serif text-[19px] text-ink leading-[1.7]">
              {before}
              {blank}
              {after}
            </p>
          ) : (
            <>
              <p className="font-serif text-sm text-ink leading-relaxed">{renderCloze(blankedDefEs)}</p>
              <p className="mt-3 font-serif text-[19px] text-ink">{blank}</p>
            </>
          )}
          {/* Sentence FR gloss: shown (fr_es) · tap-to-reveal (immersion) · hidden (totale).
              Blanked defensively — a translation that contains the raw Spanish word can't leak it. */}
          {picked && gloss === 'visible' && (
            <p className="mt-2 font-serif italic text-[13px] text-muted">{renderCloze(blankedExampleFr)}</p>
          )}
          {picked && gloss === 'tap' && (
            <div className="mt-2">
              <TapReveal label={revealLabel}>
                <p className="font-serif italic text-[13px] text-muted">{renderCloze(blankedExampleFr)}</p>
              </TapReveal>
            </div>
          )}
        </div>

        {/* HintZone — the read-once reference tiers (form pill / verb table / definition) stack below
            the prompt (tier-1 first letter lives in the blank). The scramble tier is rendered ABOVE
            the prompt instead — see the keyboard-occlusion note there. */}
        {(showFormPill || showVerbTable || showDefinition) && (
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
                <p className="mt-1.5 font-serif text-sm text-ink leading-relaxed">{renderCloze(blankedDefEs)}</p>
              </div>
            )}
          </div>
        )}

        <AccentBar inputRef={inputRef} value={answer} onChange={setAnswer} />

        <div className="flex gap-2">
          <button
            type="button"
            // Return focus to the blank so the user can keep typing without re-tapping it (the
            // button steals focus on tap; refocusing inside the click gesture also keeps the
            // mobile keyboard up).
            onClick={() => {
              setHintLevel((l) => Math.min(3, l + 1))
              inputRef.current?.focus()
            }}
            disabled={hintLevel >= 3}
            className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-card border border-line py-3 font-sans text-sm font-semibold text-muted disabled:bg-page disabled:text-faint"
          >
            <Lightbulb size={15} />
            {resolveChrome(REVIEW_CHROME.hintLabel, immersionMode)} · {hintLevel}/3
          </button>
          <button
            type="submit"
            disabled={!answer.trim()}
            className="flex-[2] rounded-card bg-accent py-3 text-center font-sans text-[15px] font-semibold text-ivory disabled:bg-amber-light disabled:text-disabled-ink transition-colors"
          >
            {resolveChrome(REVIEW_CHROME.submit, immersionMode)} →
          </button>
        </div>

        {hintLevel > 0 && (
          <p className="text-center text-[12px] text-faint">
            {immersionMode === 'fr_es'
              ? `${hintLevel} indice${hintLevel > 1 ? 's' : ''} utilisé${hintLevel > 1 ? 's' : ''} · note max suggérée :`
              : `${hintLevel} pista${hintLevel > 1 ? 's' : ''} usada${hintLevel > 1 ? 's' : ''} · nota máxima sugerida:`}
            {' '}
            <b className="text-sepia">{resolveChrome(RATING_LABELS[HINT_CAP_RATING[hintLevel]], immersionMode)}</b>
          </p>
        )}

        <div className="rounded-lg border border-dashed border-border-soft px-3 py-2 text-center text-[12.5px] italic text-faint">
          ↵ {resolveChrome(REVIEW_CHROME.submitHelp, immersionMode)}
        </div>
      </form>
    )
  }

  // ── RESULT CARD ─────────────────────────────────────────────────────────────
  const { quality, distance } = classify(answer)
  const verdict = QUALITY_TO_VERDICT[quality]
  const note =
    quality === 'exact'
      ? resolveChrome(hintLevel > 0 ? REVIEW_CHROME.noteWithHint : REVIEW_CHROME.noteFirstTry, immersionMode)
      : quality === 'near'
        ? immersionMode === 'fr_es'
          ? `${distance} lettre${distance > 1 ? 's' : ''} près`
          : `por ${distance} letra${distance > 1 ? 's' : ''}`
        : quality === 'wrongForm'
          ? resolveChrome(REVIEW_CHROME.noteWrongForm, immersionMode)
          : null
  const diffOps = quality === 'near' ? wordDiff(answer.trim(), correctWord) : []
  const example = resultHintExample(picked, card)
  // Verb verdicts reuse the conjugation table (expected form highlighted) when coords resolve.
  const showVerdictTable = (quality === 'wrongForm' || quality === 'wrong') && isVerbCard && !!verbGrid

  return (
    // RESULT state only (keyboard already dismissed on submit) — rating pinned to a fixed footer; the
    // ANSWERING state keeps Indice/Valider in flow so a fixed bar never fights the on-screen keyboard
    // or re-occludes the v0.12.8 scramble tiles (↵ still validates). pb reserves space for the footer.
    <div className="flex flex-col gap-4 pb-44">
      <ResultReveal verdict={verdict} note={note} audioUrl={card.audioUrl} />

      {/* ¡Eso es! — surface reveal with the answer in sage */}
      {quality === 'exact' && (
        <div className="fade-up bg-card border border-line rounded-card p-4" style={{ animationDelay: '0.1s' }}>
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted">{resolveChrome(REVIEW_CHROME.yourAnswer, immersionMode)}</p>
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
            {resolveChrome(REVIEW_CHROME.nearWrote, immersionMode)}{' '}
            <span className="font-bold text-sepia">
              <RenderTyped ops={diffOps} />
            </span>{' '}
            {resolveChrome(REVIEW_CHROME.nearIs, immersionMode)} <span className="font-bold text-ink">{correctWord}</span>.
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
          <p className="text-sm text-ink leading-snug">{resolveChrome(REVIEW_CHROME.verbFormTeaching, immersionMode)}</p>
          {showVerdictTable && verbGrid ? (
            <ConjugationGrid grid={verbGrid} infinitive={verbLemma} />
          ) : (
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted">{resolveChrome(REVIEW_CHROME.expectedForm, immersionMode)}</p>
              <p className="mt-1 font-serif text-[1.875rem] font-bold tracking-[-0.02em] text-ink">{correctWord}</p>
            </div>
          )}
          <p className="text-xs italic text-faint">{resolveChrome(REVIEW_CHROME.yourAnswer, immersionMode)} : {answer.trim()}</p>
        </div>
      )}

      {/* ¡Uy! genuinely wrong — the ANSWER is the loud element (verb: the conjugation table). */}
      {quality === 'wrong' && (
        <div className="fade-up bg-card border border-line rounded-card p-4" style={{ animationDelay: '0.1s' }}>
          {showVerdictTable && verbGrid ? (
            <>
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted mb-2">{resolveChrome(REVIEW_CHROME.theAnswer, immersionMode)}</p>
              <ConjugationGrid grid={verbGrid} infinitive={verbLemma} />
            </>
          ) : (
            <>
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted">{resolveChrome(REVIEW_CHROME.theAnswer, immersionMode)}</p>
              <p className="mt-1 font-serif text-[1.875rem] font-bold tracking-[-0.02em] text-ink">{correctWord}</p>
              {/* FR meaning: shown (fr_es) · tap-to-reveal (immersion) · hidden (totale). */}
              {gloss === 'visible' && (definition.pos || definition.fr) && (
                <p className="mt-1 text-[13px] text-muted">
                  {definition.pos ? posAbbrev(definition.pos) : ''}
                  {definition.pos && definition.fr ? ' · ' : ''}
                  <span className="italic">{definition.fr}</span>
                </p>
              )}
              {gloss === 'tap' && (definition.pos || definition.fr) && (
                <div className="mt-1">
                  <TapReveal label={revealLabel}>
                    <p className="text-[13px] text-muted">
                      {definition.pos ? posAbbrev(definition.pos) : ''}
                      {definition.pos && definition.fr ? ' · ' : ''}
                      <span className="italic">{definition.fr}</span>
                    </p>
                  </TapReveal>
                </div>
              )}
            </>
          )}
          <div className="my-2.5 border-t border-border-soft" />
          <p className="text-xs italic text-faint">{resolveChrome(REVIEW_CHROME.yourAnswer, immersionMode)} : {answer.trim()}</p>
        </div>
      )}

      {/* Example callout (close + wrong) */}
      {quality !== 'exact' && example && (
        <div
          className="fade-up bg-card border-l-[3px] border-accent rounded-r-card px-3.5 py-3"
          style={{ animationDelay: '0.18s' }}
        >
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-accent">{resolveChrome(REVIEW_CHROME.example, immersionMode)}</p>
          <p className="mt-1 font-serif text-base text-ink leading-snug">{example.es}</p>
          {/* Example FR gloss: shown (fr_es) · tap-to-reveal (immersion) · hidden (totale). */}
          {gloss === 'visible' && example.fr && (
            <p className="font-serif italic text-[13.5px] text-muted">{example.fr}</p>
          )}
          {gloss === 'tap' && example.fr && (
            <div className="mt-1">
              <TapReveal label={revealLabel}>
                <p className="font-serif italic text-[13.5px] text-muted">{example.fr}</p>
              </TapReveal>
            </div>
          )}
        </div>
      )}

      <StickyActions>
        <div className="fade-up w-full" style={{ animationDelay: '0.18s' }}>
          <RatingButtons result={result} onRate={(r) => onRate(r, frozenTimeMs, hintLevel)} />
        </div>
      </StickyActions>
    </div>
  )
}
