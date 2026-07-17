'use client'

import Image from 'next/image'
import { useEffect, useRef, useState } from 'react'
import { Loader2, ArrowLeft, ArrowRight, Plus, ExternalLink } from 'lucide-react'
import AudioButton from '../AudioButton'
import StickyActions from '../StickyActions'
import Button from '../Button'
import WordRow from '../WordRow'
import LoadingIdiom from './LoadingIdiom'
import WordInput from './WordInput'
import ConjugationGrid from '../ConjugationGrid'
import { buildConjugationGrid } from '@/lib/conjugation-grid'
import { posAbbrev } from '@/lib/discovery'
import type { WordCard } from '@/lib/word-status'
import { useSettings } from '../SettingsProvider'
import { glossVisibility, resolveChrome, ADD_CHROME, DETAIL_CHROME, WORDS_CHROME, DRILL_CHROME, DISCOVER_CHROME } from '@/lib/immersion'

type Example = { es: string; fr: string }
type WordResult = {
  word: string
  definition: { es: string; fr: string; pos?: string }
  examples: Example[]
  distractors: string[]
  lemma?: string
  form_annotation?: string | null
  audio_urls?: { es_ES: string } | null
}

type Phase =
  | { tag: 'idle' }
  | { tag: 'loading' }
  | { tag: 'spellcheck_candidates'; word: string; candidates: string[] }
  | { tag: 'lemma_suggestion'; result: WordResult; lemma: string; lemma_status: 'available' | 'already_in_deck'; lemma_word_id?: string; lemma_audio_urls?: { es_ES: string } | null; lemma_reps?: number; lemma_due_days?: number }
  | { tag: 'ready'; result: WordResult }
  | { tag: 'error'; word: string }
  | { tag: 'revealed'; result: WordResult }
  // Typed word is already in the deck (board ④) — route to it, don't re-create.
  | { tag: 'exists'; word: string; defEs: string; wordId: string; card: WordCard | null; dueNow: boolean; daysUntil: number }
  // Save confirmed (board ⑥ single) — awaited, so this is a true "done".
  | { tag: 'success_single'; word: string; defEs: string; id: string }
  // Similaires dispatched to the background bulk-add (board ⑥ multi) — in-progress, not done.
  | { tag: 'success_multi'; words: string[] }

type LemmaEventType =
  | 'lemma_suggestion_shown'
  | 'lemma_suggestion_accepted'
  | 'lemma_collision_shown'
  | 'lemma_collision_open_existing'
  | 'lemma_collision_add_anyway'

function logLemmaEvent(eventType: LemmaEventType, inputWord: string, lemma: string): void {
  void fetch('/api/events/log', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ event_type: eventType, input_word: inputWord, lemma }),
  }).catch(console.error)
}

type EnrichResponse = WordResult & {
  status: 'new' | 'due_now' | 'due_later'
  wordId?: string
  dueDate?: string
  cardState?: number
  cardStability?: number
  error?: string
  candidates?: string[]
  lemma?: string
  lemma_status?: 'available' | 'already_in_deck'
  lemma_word_id?: string
  form_annotation?: string | null
  lemma_audio_urls?: { es_ES: string } | null
  lemma_reps?: number
  lemma_due?: string
}

function highlightWord(sentence: string, word: string): React.ReactNode {
  const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const regex = new RegExp(`(${escaped})`, 'i')
  const parts = sentence.split(regex)
  return parts.map((part, i) =>
    regex.test(part) ? (
      <span key={i} className="text-accent font-semibold">
        {part}
      </span>
    ) : (
      part
    )
  )
}

export default function AddPage() {
  const { immersionMode: mode } = useSettings()
  const gloss = glossVisibility(mode)
  const [word, setWord] = useState('')
  const [phase, setPhase] = useState<Phase>({ tag: 'idle' })
  const [inputError, setInputError] = useState<string | null>(null)
  const [revealedFr, setRevealedFr] = useState<boolean[]>([])
  const [revealedDefFr, setRevealedDefFr] = useState(false)
  const [selectedDistractors, setSelectedDistractors] = useState<Set<string>>(new Set())
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'error'>('idle')

  const abortRef = useRef<AbortController | null>(null)
  const collisionContextRef = useRef<{ inputWord: string; lemma: string } | null>(null)

  // Cancel in-flight enrichment when navigating away.
  useEffect(() => {
    return () => { abortRef.current?.abort() }
  }, [])

  async function handleSubmit(targetWord: string) {
    abortRef.current?.abort()
    collisionContextRef.current = null
    const controller = new AbortController()
    abortRef.current = controller
    setPhase({ tag: 'loading' })
    setSaveState('idle')

    try {
      const res = await fetch('/api/words/enrich', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ word: targetWord }),
        signal: controller.signal,
      })
      const data = await res.json() as EnrichResponse

      if (!res.ok) {
        if (data.error === 'SPELLCHECK_CANDIDATES' && data.candidates) {
          setPhase({ tag: 'spellcheck_candidates', word: targetWord, candidates: data.candidates })
        } else if (data.error === 'SPELLCHECK_UNKNOWN') {
          setPhase({ tag: 'idle' })
          setInputError(resolveChrome(ADD_CHROME.notInSpanish, mode))
        } else {
          setPhase({ tag: 'error', word: targetWord })
          console.warn('[add] /api/words/enrich error:', data.error)
        }
        return
      }

      const result: WordResult = {
        word: data.word,
        definition: data.definition,
        examples: data.examples,
        distractors: data.distractors,
        form_annotation: data.form_annotation,
        audio_urls: data.audio_urls,
      }

      // Already-in-deck path (board ④) — route to the existing word, don't re-create.
      if (data.status === 'due_now' || data.status === 'due_later') {
        const dueDate = data.dueDate ?? new Date().toISOString()
        const card: WordCard | null =
          data.cardState !== undefined && data.cardStability !== undefined
            ? { state: data.cardState, due: dueDate, stability: data.cardStability }
            : null
        const daysUntil = Math.max(0, Math.ceil((new Date(dueDate).getTime() - Date.now()) / 86_400_000))
        setPhase({
          tag: 'exists',
          word: data.word,
          defEs: data.definition.es,
          wordId: data.wordId!,
          card,
          dueNow: data.status === 'due_now',
          daysUntil,
        })
        return
      }

      // Lemma suggestion: inflected form submitted and lemma differs.
      if (data.lemma && data.lemma.toLowerCase() !== data.word.toLowerCase()) {
        const lStatus = data.lemma_status ?? 'available'
        // Calendar-delta computed here (event handler), not in render — Date.now() in render is impure.
        const lemmaDueDays =
          data.lemma_due !== undefined
            ? Math.ceil((new Date(data.lemma_due).getTime() - Date.now()) / 86_400_000)
            : undefined
        setPhase({ tag: 'lemma_suggestion', result, lemma: data.lemma, lemma_status: lStatus, lemma_word_id: data.lemma_word_id, lemma_audio_urls: data.lemma_audio_urls ?? null, lemma_reps: data.lemma_reps, lemma_due_days: lemmaDueDays })
        setRevealedFr(new Array(data.examples.length).fill(false))
        setRevealedDefFr(false)
        logLemmaEvent(
          lStatus === 'available' ? 'lemma_suggestion_shown' : 'lemma_collision_shown',
          data.word,
          data.lemma,
        )
        return
      }

      setPhase({ tag: 'ready', result })
      setRevealedFr(new Array(data.examples.length).fill(false))
      setRevealedDefFr(false)
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') return
      setPhase({ tag: 'error', word: targetWord })
      console.warn('[add] fetch failed:', e)
    }
  }

  function handleReveal() {
    if (phase.tag !== 'ready') return
    setPhase({ tag: 'revealed', result: phase.result })
  }

  function handleRetry() {
    if (phase.tag !== 'error') return
    handleSubmit(phase.word)
  }

  function handleAddAnother() {
    collisionContextRef.current = null
    setWord('')
    setPhase({ tag: 'idle' })
    setInputError(null)
    setRevealedFr([])
    setRevealedDefFr(false)
    setSelectedDistractors(new Set())
    setSaveState('idle')
  }

  function toggleFr(i: number) {
    setRevealedFr((prev) => prev.map((v, j) => (j === i ? !v : v)))
  }

  function handleToggleDistractor(d: string) {
    setSelectedDistractors((prev) => {
      const next = new Set(prev)
      if (next.has(d)) next.delete(d)
      else next.add(d)
      return next
    })
  }

  function handleToggleAll(distractors: string[]) {
    const allSelected = distractors.every((d) => selectedDistractors.has(d))
    setSelectedDistractors(allSelected ? new Set() : new Set(distractors))
  }

  async function handleSave() {
    if (phase.tag !== 'revealed') return
    const { result } = phase
    setSaveState('saving')
    try {
      const res = await fetch('/api/words/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          word: result.word,
          definition: result.definition,
          examples: result.examples,
          distractors: result.distractors,
          ...(result.lemma ? { lemma: result.lemma } : {}),
          ...(result.form_annotation ? { form_annotation: result.form_annotation } : {}),
          ...(result.audio_urls ? { audio_urls: result.audio_urls } : {}),
        }),
      })
      if (!res.ok) { setSaveState('error'); return }
      const data = await res.json() as { id?: string }
      if (collisionContextRef.current) {
        const { inputWord, lemma: l } = collisionContextRef.current
        logLemmaEvent('lemma_collision_add_anyway', inputWord, l)
        collisionContextRef.current = null
      }
      setPhase({ tag: 'success_single', word: result.word, defEs: result.definition.es, id: data.id ?? '' })
    } catch {
      setSaveState('error')
    }
  }

  async function handleSaveLemmaWord(lemmaWord: string, result: WordResult, audioUrls?: { es_ES: string } | null) {
    setSaveState('saving')
    try {
      const res = await fetch('/api/words/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          word: lemmaWord,
          definition: result.definition,
          examples: result.examples,
          distractors: result.distractors,
          ...(audioUrls ? { audio_urls: audioUrls } : {}),
        }),
      })
      if (!res.ok) { setSaveState('error'); return }
      const data = await res.json() as { id?: string }
      setPhase({ tag: 'success_single', word: lemmaWord, defEs: result.definition.es, id: data.id ?? '' })
    } catch {
      setSaveState('error')
    }
  }

  // Background bulk-add (board ⑥ multi). Fire-and-forget: the success_multi screen frames it as
  // in-progress ("up to ~20s, keep browsing"), so we do NOT await it here. KNOWN LIMITATION
  // (logged in backlog, revisit before soft-launch): a failed background add is not surfaced
  // inline — only console-logged; the word simply won't appear and can be re-added.
  async function runBulkAdd(wordsToAdd: string[]) {
    const results = await Promise.all(
      wordsToAdd.map(async (w) => {
        try {
          const enrichRes = await fetch('/api/words/enrich', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ word: w }),
          })
          if (!enrichRes.ok) return { word: w, ok: false }

          const enrichData = await enrichRes.json() as EnrichResponse
          if (enrichData.status !== 'new') return { word: w, ok: true }

          const saveRes = await fetch('/api/words/save', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              word: w,
              definition: enrichData.definition,
              examples: enrichData.examples,
              distractors: enrichData.distractors,
            }),
          })
          return { word: w, ok: saveRes.ok }
        } catch {
          return { word: w, ok: false }
        }
      })
    )
    const failed = results.filter((r) => !r.ok).map((r) => r.word)
    if (failed.length > 0) console.error('[add] background bulk-add failed for:', failed)
  }

  function handleAddDistractors() {
    const words = Array.from(selectedDistractors)
    setSelectedDistractors(new Set())
    void runBulkAdd(words) // background — not awaited
    setPhase({ tag: 'success_multi', words })
  }

  // ── IDLE (board ①) ─────────────────────────────────────────────────────────────
  if (phase.tag === 'idle') {
    return (
      <div className="flex flex-col pb-16">
        <div className="p-5">
          <h1 className="font-serif text-[30px] font-bold tracking-[-0.02em] text-ink">{resolveChrome(ADD_CHROME.newWord, mode)}</h1>
          <p className="text-[13.5px] text-muted mt-1">{resolveChrome(ADD_CHROME.enterWord, mode)}</p>
        </div>

        <div className="px-5 flex flex-col gap-4">
          <WordInput
            value={word}
            onChange={(v) => { setWord(v); if (inputError) setInputError(null) }}
            onSubmit={(w) => { void handleSubmit(w) }}
            error={inputError}
          />
          <div className="flex items-start gap-3">
            <Image src="/paco.png" alt="Paco" width={52} height={52} className="object-contain shrink-0" />
            <p className="text-[14px] text-muted leading-relaxed">
              {resolveChrome(ADD_CHROME.helperParagraph, mode)}
            </p>
          </div>
          <Button
            variant="primary"
            full
            type="button"
            disabled={!word.trim()}
            onClick={() => handleSubmit(word.trim())}
          >
            {resolveChrome(ADD_CHROME.search, mode)} →
          </Button>
        </div>
      </div>
    )
  }

  // ── SPELLCHECK CANDIDATES (board ①b "Voulais-tu dire…") ──────────────────────────
  if (phase.tag === 'spellcheck_candidates') {
    const originalWord = phase.word
    const candidates = phase.candidates
    return (
      <div className="flex flex-col p-5 gap-5 pb-16">
        <button
          type="button"
          onClick={() => { setWord(originalWord); setPhase({ tag: 'idle' }) }}
          className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted self-start"
        >
          ← {resolveChrome(DRILL_CHROME.back, mode)}
        </button>
        <div>
          <h1 className="font-serif text-[28px] font-bold tracking-[-0.02em] text-ink">{resolveChrome(ADD_CHROME.didYouMean, mode)}</h1>
          <p className="text-[13.5px] text-muted mt-1.5">
            {mode === 'fr_es'
              ? <>&laquo;&nbsp;{originalWord}&nbsp;&raquo; n&apos;a pas été reconnu</>
              : <>No se ha reconocido &laquo;{originalWord}&raquo;</>}
          </p>
        </div>
        <div className="flex flex-col gap-3">
          {candidates.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => { setWord(c); void handleSubmit(c) }}
              className="flex items-center justify-between bg-card border border-line rounded-[14px] shadow-card px-[17px] py-[15px] text-left"
            >
              <span className="font-serif text-lg font-semibold text-ink">{c}</span>
              <ArrowRight size={17} className="text-faint shrink-0" aria-hidden />
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() => { setWord(originalWord); setPhase({ tag: 'idle' }) }}
          className="text-[14px] font-semibold text-muted underline underline-offset-[3px] self-start"
        >
          {resolveChrome(ADD_CHROME.noneOfThese, mode)}
        </button>
      </div>
    )
  }

  // ── LEMMA SUGGESTION (board ⑤ "Forme conjuguée") ─────────────────────────────────
  if (phase.tag === 'lemma_suggestion') {
    const { result, lemma, lemma_status, lemma_word_id, lemma_audio_urls, lemma_reps, lemma_due_days } = phase
    // Frame-5 grid: renders ONLY for verbs the display guard trusts (canDisplayParadigm) and whose
    // typed form resolves to a finite six-person tense it contains. Null → the FORME card instead.
    const grid = buildConjugationGrid(lemma, result.word, result.form_annotation)
    const dueDays = lemma_due_days ?? null
    return (
      <div className="flex flex-col p-5 gap-5 pb-16">
        <button
          type="button"
          onClick={() => { setWord(result.word); setPhase({ tag: 'idle' }); setSaveState('idle') }}
          className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted self-start"
        >
          ← {resolveChrome(DRILL_CHROME.back, mode)}
        </button>
        <div>
          <h1 className="font-serif text-[28px] font-bold tracking-[-0.02em] text-ink">{resolveChrome(ADD_CHROME.conjugatedForm, mode)}</h1>
          <p className="text-[13.5px] text-muted mt-1.5">
            {mode === 'fr_es'
              ? <>&laquo;&nbsp;{result.word}&nbsp;&raquo; est une forme de{' '}</>
              : <>&laquo;{result.word}&raquo; es una forma de{' '}</>}
            <span className="font-serif font-bold text-ink">{lemma}</span>
          </p>
        </div>

        {grid ? (
          <ConjugationGrid grid={grid} />
        ) : (
          result.form_annotation && (
            <div className="bg-card border border-line rounded-[14px] shadow-card px-4 py-[14px]">
              <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">{resolveChrome(DETAIL_CHROME.formEyebrow, mode)}</p>
              <p className="font-serif text-base text-ink leading-relaxed mt-2">{result.form_annotation}</p>
            </div>
          )
        )}

        {lemma_status === 'already_in_deck' && (
          <p className="flex items-center gap-2 font-serif text-[13.5px] italic text-muted leading-relaxed">
            <span className="w-[5px] h-[5px] rounded-full bg-accent shrink-0" aria-hidden />
            <span>
              {lemma_reps !== undefined && lemma_reps > 0 &&
                (mode === 'fr_es'
                  ? <>Tu as revu <span className="font-bold not-italic text-ink">{lemma}</span> {lemma_reps} fois</>
                  : <>Has repasado <span className="font-bold not-italic text-ink">{lemma}</span> {lemma_reps} {lemma_reps > 1 ? 'veces' : 'vez'}</>)}
              {lemma_reps !== undefined && lemma_reps > 0 && dueDays !== null && ' · '}
              {dueDays !== null &&
                (dueDays <= 0
                  ? resolveChrome(ADD_CHROME.nextReviewToday, mode)
                  : mode === 'fr_es'
                    ? `prochaine révision dans ${dueDays} jour${dueDays > 1 ? 's' : ''}`
                    : `próximo repaso en ${dueDays} día${dueDays > 1 ? 's' : ''}`)}
              {(lemma_reps === undefined || lemma_reps === 0) && dueDays === null &&
                (mode === 'fr_es'
                  ? <><span className="font-bold not-italic text-ink">{lemma}</span> est déjà dans ta collection</>
                  : <><span className="font-bold not-italic text-ink">{lemma}</span> ya está en tu colección</>)}
            </span>
          </p>
        )}

        <div className="flex flex-col gap-3 items-center">
          <Button
            variant="primary"
            full
            type="button"
            disabled={lemma_status === 'already_in_deck' || saveState !== 'idle'}
            onClick={() => {
              logLemmaEvent('lemma_suggestion_accepted', result.word, lemma)
              void handleSaveLemmaWord(lemma, result, lemma_audio_urls)
            }}
          >
            {saveState === 'saving' ? (
              <Loader2 size={16} className="animate-spin" />
            ) : saveState === 'error' ? (
              resolveChrome(ADD_CHROME.errorRetry, mode)
            ) : (
              <><Plus size={17} strokeWidth={2.2} /> {mode === 'fr_es' ? `Ajouter « ${lemma} »` : `Añadir «${lemma}»`}</>
            )}
          </Button>
          {lemma_status === 'already_in_deck' && (
            <Button
              variant="secondary"
              full
              href={`/words/${lemma_word_id ?? ''}`}
              onClick={() => logLemmaEvent('lemma_collision_open_existing', result.word, lemma)}
            >
              <ExternalLink size={16} /> {mode === 'fr_es' ? `Ouvrir « ${lemma} »` : `Abrir «${lemma}»`}
            </Button>
          )}
          <Button
            variant="text"
            type="button"
            onClick={() => {
              if (lemma_status === 'already_in_deck') {
                collisionContextRef.current = { inputWord: result.word, lemma }
              }
              setSaveState('idle')
              setPhase({ tag: 'revealed', result: { ...result, lemma } })
            }}
          >
            {mode === 'fr_es' ? `Garder « ${result.word} »` : `Conservar «${result.word}»`}
          </Button>
        </div>
      </div>
    )
  }

  // ── EXISTS (board ④ "déjà dans ton deck") ────────────────────────────────────────
  if (phase.tag === 'exists') {
    const { word: w, defEs, wordId, card, dueNow, daysUntil } = phase
    const supportive = dueNow
      ? resolveChrome(ADD_CHROME.noNeedRecreateReview, mode)
      : mode === 'fr_es'
        ? `Prochaine révision dans ${daysUntil} jour${daysUntil > 1 ? 's' : ''}. Pas besoin de le re-créer — ouvre-le quand tu veux.`
        : `Próximo repaso en ${daysUntil} día${daysUntil > 1 ? 's' : ''}. No hace falta volver a crearla — ábrela cuando quieras.`
    return (
      <div className="flex flex-col flex-1 p-5">
        <button
          type="button"
          onClick={handleAddAnother}
          className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted self-start"
        >
          ← {resolveChrome(DRILL_CHROME.back, mode)}
        </button>
        <div className="flex-1 flex flex-col items-center justify-center text-center pb-8">
          <Image src="/paco.png" alt="Paco" width={96} height={96} className="object-contain mb-3" />
          <h1 className="font-serif text-2xl font-bold text-ink leading-tight max-w-[280px]">
            {mode === 'fr_es'
              ? <>&laquo;&nbsp;{w}&nbsp;&raquo; est déjà dans ta collection</>
              : <>&laquo;{w}&raquo; ya está en tu colección</>}
          </h1>
          <p className="text-[14px] text-muted leading-relaxed mt-2.5 max-w-[270px]">{supportive}</p>
          <div className="w-full max-w-[320px] mt-[22px]">
            <WordRow id={wordId} word={w} defEs={defEs} card={card} asListItem={false} mode={mode} />
          </div>
          <div className="w-full max-w-[320px] mt-[22px] flex flex-col gap-3 items-center">
            <Button variant="primary" full href={`/words/${wordId}`}>
              {mode === 'fr_es' ? `Ouvrir « ${w} » →` : `Abrir «${w}» →`}
            </Button>
            <Button variant="text" type="button" onClick={handleAddAnother}>
              {resolveChrome(ADD_CHROME.searchAnother, mode)}
            </Button>
          </div>
        </div>
      </div>
    )
  }

  // ── SUCCESS — single (board ⑥) ───────────────────────────────────────────────────
  if (phase.tag === 'success_single') {
    const { word: w, defEs, id } = phase
    return (
      <div className="flex flex-col flex-1 p-5">
        <div className="flex-1 flex flex-col items-center justify-center text-center">
          <Image src="/paco-feliz.png" alt="Paco" width={92} height={92} className="object-contain mb-3" />
          <h1 className="font-serif text-2xl font-bold text-ink leading-tight">
            {mode === 'fr_es'
              ? <>&laquo;&nbsp;{w}&nbsp;&raquo; est dans ta collection</>
              : <>&laquo;{w}&raquo; está en tu colección</>}
          </h1>
          <p className="text-[14px] text-muted leading-relaxed mt-2 max-w-[260px]">
            {resolveChrome(ADD_CHROME.bringTomorrow, mode)}
          </p>
          <div className="w-full max-w-[320px] mt-[22px]">
            <WordRow id={id || undefined} word={w} defEs={defEs} card={null} asListItem={false} mode={mode} />
          </div>
          <div className="w-full max-w-[320px] mt-[22px] flex flex-col gap-3 items-center">
            <Button variant="primary" full type="button" onClick={handleAddAnother}>
              <Plus size={17} strokeWidth={2.2} /> {resolveChrome(ADD_CHROME.addAnother, mode)}
            </Button>
            <Button variant="text" href="/words">
              {resolveChrome(ADD_CHROME.viewMyWords, mode)}
            </Button>
          </div>
        </div>
      </div>
    )
  }

  // ── SUCCESS — multi / similaires (board ⑥, honest in-progress framing) ────────────
  if (phase.tag === 'success_multi') {
    const { words } = phase
    return (
      <div className="flex flex-col flex-1 p-5">
        <div className="flex flex-col items-center text-center pt-3">
          <Image src="/paco-feliz.png" alt="Paco" width={84} height={84} className="object-contain mb-2.5" />
          <h1 className="font-serif text-[23px] font-bold text-ink leading-tight">
            {mode === 'fr_es'
              ? `${words.length} mot${words.length > 1 ? 's' : ''} en route`
              : `${words.length} palabra${words.length > 1 ? 's' : ''} en camino`}
          </h1>
          <p className="text-[14px] text-muted leading-relaxed mt-2 max-w-[290px]">
            {resolveChrome(ADD_CHROME.wordsEnRouteHelp, mode)}
          </p>
        </div>
        <div className="w-full max-w-[330px] mx-auto mt-5 flex flex-col gap-2.5">
          {/* Non-linking rows — the words are still being created in the background (no id yet). */}
          {words.map((w) => (
            <WordRow key={w} word={w} defEs="" card={null} asListItem={false} mode={mode} />
          ))}
        </div>
        <div className="w-full max-w-[330px] mx-auto mt-auto pt-6 flex flex-col gap-3 items-center">
          <Button variant="primary" full type="button" onClick={handleAddAnother}>
            <Plus size={17} strokeWidth={2.2} /> {resolveChrome(ADD_CHROME.addAnother, mode)}
          </Button>
          <Button variant="text" href="/words">
            {resolveChrome(ADD_CHROME.viewMyWords, mode)}
          </Button>
        </div>
      </div>
    )
  }

  // ── LOADING / READY / ERROR (board ② loading + ③ ¡Listo!) ─────────────────────────
  if (phase.tag === 'loading' || phase.tag === 'ready' || phase.tag === 'error') {
    return (
      <LoadingIdiom
        status={phase.tag}
        word={word}
        result={phase.tag === 'ready' ? { word: phase.result.word, definition: phase.result.definition } : undefined}
        onReveal={handleReveal}
        onRetry={handleRetry}
      />
    )
  }

  // ── REVEALED — the locked fiche (board ③a) ───────────────────────────────────────
  const result = phase.result
  const selectionCount = selectedDistractors.size
  const allSelected =
    result.distractors.length > 0 && result.distractors.every((d) => selectedDistractors.has(d))

  return (
    <div className="flex flex-col flex-1 pb-24">
      <div className="p-5">
        <div className="flex items-center gap-2.5">
          {/* Headword + inline abbreviated POS + audio — unified with /words detail (board §3). */}
          <div className="flex items-baseline gap-2.5 min-w-0">
            <h1 className="font-serif text-[32px] font-bold tracking-[-0.02em] text-ink leading-none">{result.word}</h1>
            {result.definition.pos && (
              <span className="text-[14.5px] font-medium text-muted">{posAbbrev(result.definition.pos)}</span>
            )}
          </div>
          <AudioButton word={result.word} audioUrl={result.audio_urls?.es_ES} />
        </div>
      </div>

      <div className="px-5 flex flex-col gap-4 pb-4">
        {/* FORME — only for inflected words */}
        {result.form_annotation && (
          <div className="bg-card border border-line rounded-[14px] shadow-card p-5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted mb-3">{resolveChrome(DETAIL_CHROME.formEyebrow, mode)}</p>
            <p className="font-serif text-sm text-ink leading-relaxed">{result.form_annotation}</p>
          </div>
        )}

        {/* DÉFINITION — FR gloss: shown (fr_es) · tap-to-reveal (immersion) · hidden (totale). */}
        <div className="bg-card border border-line rounded-[14px] shadow-card p-5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted mb-3">{resolveChrome(DETAIL_CHROME.definitionEyebrow, mode)}</p>
          <p className="font-serif text-sm text-ink leading-relaxed">{result.definition.es}</p>
          {gloss !== 'hidden' && (revealedDefFr ? (
            <div className="mt-2">
              <p className="font-serif italic text-sm text-muted">{result.definition.fr}</p>
              <button type="button" onClick={() => setRevealedDefFr(false)} className="text-[13px] font-semibold text-accent underline underline-offset-[3px] mt-1.5">
                {resolveChrome(DETAIL_CHROME.hideDef, mode)}
              </button>
            </div>
          ) : (
            <button type="button" onClick={() => setRevealedDefFr(true)} className="text-[13px] font-semibold text-accent underline underline-offset-[3px] mt-2">
              {resolveChrome(DETAIL_CHROME.revealDef, mode)}
            </button>
          ))}
        </div>

        {/* EXEMPLES */}
        <div className="bg-card border border-line rounded-[14px] shadow-card p-5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted mb-4">{resolveChrome(DETAIL_CHROME.examplesEyebrow, mode)}</p>
          <ul className="flex flex-col divide-y divide-border-soft">
            {result.examples.map((ex, i) => (
              <li key={i} className={i > 0 ? 'pt-4' : ''}>
                <p className="font-serif text-sm text-ink leading-relaxed">
                  {highlightWord(ex.es, result.word)}
                </p>
                {/* Example FR gloss: shown (fr_es) · tap-to-reveal (immersion) · hidden (totale). */}
                {gloss !== 'hidden' && (revealedFr[i] ? (
                  <div className="mt-1">
                    <p className="font-serif italic text-sm text-muted">{ex.fr}</p>
                    <button type="button" onClick={() => toggleFr(i)} className="text-[13px] font-semibold text-accent underline underline-offset-[3px] mt-1.5">
                      {resolveChrome(ADD_CHROME.exampleHide, mode)}
                    </button>
                  </div>
                ) : (
                  <button type="button" onClick={() => toggleFr(i)} className="text-[13px] font-semibold text-accent underline underline-offset-[3px] mt-2">
                    {resolveChrome(DETAIL_CHROME.revealEx, mode)}
                  </button>
                ))}
              </li>
            ))}
          </ul>
        </div>

        {/* MOTS ASSOCIÉS */}
        {result.distractors.length > 0 && (
          <div className="bg-surface-alt border border-tinted-border rounded-[14px] p-5">
            <div className="flex justify-between items-center mb-2">
              <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">
                {resolveChrome(ADD_CHROME.similarNotConfuse, mode)}
              </p>
              <button
                type="button"
                onClick={() => handleToggleAll(result.distractors)}
                className="text-[13px] font-semibold text-accent shrink-0 ml-3 underline underline-offset-[3px]"
              >
                {resolveChrome(allSelected ? ADD_CHROME.deselectAll : ADD_CHROME.selectAll, mode)}
              </button>
            </div>

            <p className="text-[12.5px] text-muted leading-relaxed mb-3">
              {resolveChrome(ADD_CHROME.similarHelper, mode)}
            </p>

            <div className="flex flex-wrap gap-2">
              {result.distractors.map((d) => {
                const on = selectedDistractors.has(d)
                return (
                  <button
                    key={d}
                    type="button"
                    onClick={() => handleToggleDistractor(d)}
                    className={`font-serif text-sm px-3.5 py-1.5 rounded-full border transition-colors ${
                      on
                        ? 'bg-accent text-ivory border-accent'
                        : 'bg-card text-ink border-tinted-border'
                    }`}
                  >
                    {d}
                  </button>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* Bottom actions (board ③a: icon-only back + primary) */}
      <StickyActions>
        {selectionCount > 0 ? (
          <>
            <Button variant="secondary" full className="flex-1" type="button" onClick={() => setSelectedDistractors(new Set())}>
              {resolveChrome(WORDS_CHROME.undo, mode)}
            </Button>
            <Button variant="primary" full className="flex-[2]" type="button" onClick={handleAddDistractors}>
              {mode === 'fr_es'
                ? `Ajouter ${selectionCount} mot${selectionCount > 1 ? 's' : ''} →`
                : `Añadir ${selectionCount} palabra${selectionCount > 1 ? 's' : ''} →`}
            </Button>
          </>
        ) : (
          <>
            <button
              type="button"
              onClick={handleAddAnother}
              aria-label={resolveChrome(ADD_CHROME.newWord, mode)}
              className="shrink-0 w-[52px] h-[52px] grid place-items-center bg-card border-[1.5px] border-line rounded-[14px] text-ink"
            >
              <ArrowLeft size={20} />
            </button>
            <Button
              variant="primary"
              full
              className="flex-1"
              type="button"
              onClick={() => { void handleSave() }}
              disabled={saveState === 'saving'}
            >
              {saveState === 'saving' ? (
                <Loader2 size={16} className="animate-spin" />
              ) : saveState === 'error' ? (
                resolveChrome(ADD_CHROME.errorRetry, mode)
              ) : (
                <><Plus size={17} strokeWidth={2.2} /> {resolveChrome(ADD_CHROME.addToCollection, mode)}</>
              )}
            </Button>
          </>
        )}
      </StickyActions>
    </div>
  )
}
