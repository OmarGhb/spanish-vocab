'use client'

import Image from 'next/image'
import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import type { BlankQuality } from '@/lib/rating'
import type { ReviewCard } from './page'
import FillInBlank from './FillInBlank'
import MultipleChoice from './MultipleChoice'
import Display from '../Display'
import { mapReviewRow } from './mapCard'
import { useFocusMode } from '../FocusMode'

type Props = { cards: ReviewCard[] }

// One entry per reviewed word, accumulated in-memory during the session.
// correct = final rating was Hard/Good/Easy (2/3/4); ✗ = Again (1).
// firstTry = got it right WITHOUT a hint → the non-punitive "Sus du 1er coup" stat (board ⑥).
type Outcome = { word: string; defEs: string; correct: boolean; firstTry: boolean; timeMs: number }

function chooseMode(card: ReviewCard, index: number): 'blank' | 'mc' {
  if (card.distractors.length === 0) return 'blank'
  if (card.examples.length === 0) return 'mc'
  return index % 2 === 0 ? 'blank' : 'mc'
}

// Same shape + ordering as the server query in page.tsx, run client-side so the
// "Encore N" CTA can continue the session in place without a route navigation
// (a <Link href="/review"> from /review served a stale Router-Cache page — the
// rescheduled cards never came back). Shares mapReviewRow with the server page, so the
// bilingual-field normalization (the M5.5e crash fix) applies to refetched batches too.
async function fetchDueCards(): Promise<ReviewCard[]> {
  const supabase = createClient()
  const { data: rows } = await supabase
    .from('review_cards')
    .select('*, words(word, lemma, definition, examples, distractors)')
    .lte('due', new Date().toISOString())
    .order('due', { ascending: true })
    .limit(20)

  return (rows ?? []).map(mapReviewRow)
}

export default function ReviewSession({ cards: initialCards }: Props) {
  // Card deck is stateful so "Encore N" can swap in the next due batch in place.
  const [cards, setCards] = useState<ReviewCard[]>(initialCards)
  const [index, setIndex] = useState(0)
  const [done, setDone] = useState(false)
  const [outcomes, setOutcomes] = useState<Outcome[]>([])
  const [dueRemaining, setDueRemaining] = useState(0)
  const [continuing, setContinuing] = useState(false)
  // écriture verdict for the current card → flips the header to success on a correct answer.
  const [verdict, setVerdict] = useState<BlankQuality | null>(null)

  // Full-focus for the WHOLE session, including the bilan (slice 3): suppress the app nav
  // from the first card through the recap, restoring it only on unmount. Encore→next batch
  // stays mounted (nav stays hidden); Accueil navigates away → unmount → nav restored. The
  // 0-due "Tout est à jour" empty-state is a separate component (page.tsx), so it keeps nav.
  const { setFocus } = useFocusMode()
  useEffect(() => {
    setFocus(true)
    return () => setFocus(false)
  }, [setFocus])

  // Timer boundary: cardStartRef is written in an effect on each card change and read
  // only inside child event handlers — never during render. Using a ref (not state)
  // avoids a cascading render that setState-in-effect would cause.
  const cardStartRef = useRef(0)
  useEffect(() => {
    cardStartRef.current = Date.now()
  }, [index])

  async function handleRate(rating: 1 | 2 | 3 | 4, timeMs: number, hintLevel: number) {
    const card = cards[index]
    const hintUsed = hintLevel > 0
    // The deck is fixed (one row per word, no re-show), so a single append per
    // rating yields exactly one recap row per word — no dedup needed.
    setOutcomes((prev) => [
      ...prev,
      { word: card.word, defEs: card.definition?.es ?? '', correct: rating !== 1, firstTry: rating !== 1 && !hintUsed, timeMs },
    ])

    try {
      await fetch('/api/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cardId: card.id, rating, timeMs, hintUsed }),
      })
    } catch {
      // Network failure: silently continue — losing one log entry is acceptable.
      console.warn('[review] POST /api/review failed for card', card.id)
    }

    if (index + 1 >= cards.length) {
      // Session over. Count cards still due now — reflects the reschedule the
      // /api/review POST just wrote — to decide whether to show the "Encore N" CTA.
      try {
        const supabase = createClient()
        const { count } = await supabase
          .from('review_cards')
          .select('*', { count: 'exact', head: true })
          .lte('due', new Date().toISOString())
        setDueRemaining(count ?? 0)
      } catch {
        setDueRemaining(0)
      }
      setDone(true)
    } else {
      setVerdict(null) // reset header color before the next card
      setIndex((i) => i + 1)
    }
  }

  // "Encore N" — pull the next due batch and continue the session in place.
  // Outcomes accumulate, so the recap stays cumulative across batches.
  async function handleContinue() {
    if (continuing) return
    setContinuing(true)
    try {
      const next = await fetchDueCards()
      if (next.length === 0) {
        setDueRemaining(0) // nothing left (raced to 0) — recap now offers only Accueil
        return
      }
      setCards(next)
      setIndex(0)
      cardStartRef.current = Date.now() // index may already be 0 → reset the timer manually
      setVerdict(null)
      setDone(false) // re-enters focus mode via the done effect
    } catch {
      console.warn('[review] continue: failed to load next due batch')
    } finally {
      setContinuing(false)
    }
  }

  if (done) {
    const total = outcomes.length
    const firstTry = outcomes.filter((o) => o.firstTry).length
    const totalMs = outcomes.reduce((sum, o) => sum + o.timeMs, 0)
    const timeLabel = totalMs < 60_000 ? '< 1 min' : `${Math.round(totalMs / 60_000)} min`

    // Fixed vertical frame (fills the column below TopNav); ONLY the word list scrolls.
    return (
      <div className="flex-1 min-h-0 flex flex-col">
        {/* 1 — light warm header (mascot + the one Spanish phrase carry the warmth).
            Nav is hidden through the recap now, so pad the top for the notch (as the
            answering view does) instead of relying on TopNav to supply the inset. */}
        <div
          className="flex items-center gap-3.5 px-6 pb-4 shrink-0"
          style={{ paddingTop: 'max(0.875rem, env(safe-area-inset-top))' }}
        >
          <Image src="/paco-feliz.png" alt="Paco" width={56} height={56} className="object-contain shrink-0" />
          <div>
            <Display kind="buenTrabajo" className="text-[30px] leading-none text-ink">¡Buen trabajo!</Display>
            <p className="text-[13.5px] text-muted mt-[5px]">Session terminée</p>
          </div>
        </div>

        {/* 2 — stats card, kept ABOVE the list (override): summarize before per-word detail */}
        <div className="px-[18px] shrink-0">
          <div className="flex bg-card border border-line rounded-2xl py-3.5">
            {[
              { label: 'Révisés', value: String(total) },
              { label: 'Sus du 1er coup', value: String(firstTry) },
              { label: 'Temps', value: timeLabel },
            ].map((s, i) => (
              <div key={s.label} className={`flex-1 text-center ${i > 0 ? 'border-l border-hair/60' : ''}`}>
                <p className="font-serif text-[23px] font-bold tracking-[-0.02em] text-ink">{s.value}</p>
                <p className="text-[10.5px] font-bold uppercase tracking-[0.12em] text-muted mt-[3px]">{s.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* 3 — words reviewed this session (the scrollable core). Rows stagger in
            top-to-bottom on mount via `.fade-up` (globals.css) + per-row animationDelay
            — the proven, reduced-motion-gated keyframe ResultReveal uses, NOT a Tailwind
            motion-safe utility (the PhaseChecklist `motion-safe:animate-pulse` never
            rendered). Hairline divider between rows; nothing else staggers. */}
        <div className="flex-1 min-h-0 overflow-y-auto px-[18px] pt-3 pb-2 divide-y divide-hair/60">
          {outcomes.map((o, i) => (
            <div
              key={i}
              className="fade-up flex items-center gap-3.5 px-1.5 py-[11px]"
              style={{ animationDelay: `${i * 35}ms` }}
            >
              <span
                className={`flex items-center justify-center w-[26px] h-[26px] rounded-full border shrink-0 ${
                  o.correct ? 'bg-ok-bg border-sage-border text-sage-ink' : 'bg-card border-line text-faint'
                }`}
              >
                {o.correct ? (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
                    <path d="M6 6l12 12M18 6L6 18" />
                  </svg>
                )}
              </span>
              <div className="flex-1 min-w-0">
                <p className="font-serif text-[17px] font-bold tracking-[-0.02em] text-ink">{o.word}</p>
                {o.defEs && <p className="text-[13px] text-muted truncate mt-px">{o.defEs}</p>}
              </div>
            </div>
          ))}
        </div>

        {/* 4 — fixed footer: Encore (continue this session) when cards remain; Accueil kept below */}
        <div
          className="px-[18px] pt-3.5 flex flex-col gap-3 shrink-0"
          style={{ paddingBottom: 'max(1.125rem, env(safe-area-inset-bottom))' }}
        >
          {dueRemaining > 0 && (
            <button
              type="button"
              onClick={handleContinue}
              disabled={continuing}
              className="w-full flex items-center justify-center gap-2.5 rounded-card py-[15px] px-5 bg-accent text-card font-serif text-base font-semibold tracking-[-0.01em] disabled:opacity-60"
              style={{ boxShadow: '0 2px 6px rgba(154,90,28,0.28)' }}
            >
              {continuing ? (
                'Chargement…'
              ) : (
                <>
                  Encore {dueRemaining} mot{dueRemaining !== 1 ? 's' : ''} à revoir
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.1} strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 12h14M13 6l6 6-6 6" />
                  </svg>
                </>
              )}
            </button>
          )}
          <Link
            href="/"
            className="w-full rounded-card border border-line bg-card py-[14px] text-center font-serif text-base font-semibold text-ink"
          >
            ← Accueil
          </Link>
        </div>
      </div>
    )
  }

  const card = cards[index]
  const mode = chooseMode(card, index)
  // Header + progress flip to success once an écriture answer is graded correct.
  const correct = verdict === 'exact'

  return (
    // Nav is hidden in focus-mode, so pad the top for the notch (as the nav used to).
    <div className="px-5 pb-4" style={{ paddingTop: 'max(1.25rem, env(safe-area-inset-top))' }}>
      {/* Header: × | 1/N | ÉCRITURE */}
      <div className="flex justify-between items-center mb-3">
        <Link href="/" className="text-2xl text-muted hover:text-ink leading-none select-none">
          ×
        </Link>
        <span className="text-sm text-ink">
          {index + 1} / {cards.length}
        </span>
        <span className={`text-xs font-semibold uppercase tracking-widest transition-colors ${correct ? 'text-ok' : 'text-accent'}`}>
          {mode === 'blank' ? 'Écriture' : 'QCM'}
        </span>
      </div>

      {/* Progress bar */}
      <div className="h-0.5 bg-line rounded-full mb-8">
        <div
          className={`h-0.5 rounded-full transition-all duration-300 ${correct ? 'bg-ok' : 'bg-accent'}`}
          style={{ width: `${((index + 1) / cards.length) * 100}%` }}
        />
      </div>

      {mode === 'blank' ? (
        <FillInBlank key={card.id} card={card} cardStartRef={cardStartRef} onRate={handleRate} onResult={setVerdict} />
      ) : (
        <MultipleChoice key={card.id} card={card} cardStartRef={cardStartRef} onRate={handleRate} />
      )}
    </div>
  )
}
