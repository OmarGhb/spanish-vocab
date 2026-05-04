'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { Loader2 } from 'lucide-react'
import LoadingIdiom from './LoadingIdiom'
import WordInput from './WordInput'

type Example = { es: string; fr: string }
type WordResult = {
  word: string
  definition: { es: string; fr: string; pos?: string }
  examples: Example[]
  distractors: string[]
}

type DeckStatus =
  | { tag: 'new' }
  | { tag: 'due_now'; wordId: string; dueDate: string }
  | { tag: 'due_later'; wordId: string; dueDate: string; daysUntil: number }

type Phase =
  | { tag: 'idle' }
  | { tag: 'loading' }
  | { tag: 'spellcheck_candidates'; word: string; candidates: string[] }
  | { tag: 'ready'; result: WordResult; status: DeckStatus }
  | { tag: 'error'; word: string }
  | { tag: 'revealed'; result: WordResult; status: DeckStatus }

type Toast =
  | { type: 'adding'; count: number }
  | { type: 'success'; count: number; skipped: number }
  | { type: 'error'; failedWords: string[] }

type EnrichResponse = WordResult & {
  status: 'new' | 'due_now' | 'due_later'
  wordId?: string
  dueDate?: string
  error?: string
  candidates?: string[]
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
  const [word, setWord] = useState('')
  const [phase, setPhase] = useState<Phase>({ tag: 'idle' })
  const [inputError, setInputError] = useState<string | null>(null)
  const [revealedFr, setRevealedFr] = useState<boolean[]>([])
  const [revealedDefFr, setRevealedDefFr] = useState(false)
  const [selectedDistractors, setSelectedDistractors] = useState<Set<string>>(new Set())
  const [toast, setToast] = useState<Toast | null>(null)
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')

  const abortRef = useRef<AbortController | null>(null)

  // Cancel in-flight enrichment when navigating away.
  useEffect(() => {
    return () => { abortRef.current?.abort() }
  }, [])

  // Auto-dismiss success toast after 3 s.
  useEffect(() => {
    if (toast?.type !== 'success') return
    const id = setTimeout(() => setToast(null), 3000)
    return () => clearTimeout(id)
  }, [toast])

  async function handleSubmit(targetWord: string) {
    abortRef.current?.abort()
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
          setInputError("Ce mot n'existe pas en espagnol")
        } else {
          setPhase({ tag: 'error', word: targetWord })
          console.warn('[add] /api/words/enrich error:', data.error)
        }
        return
      }

      let status: DeckStatus
      if (data.status === 'due_now' && data.wordId && data.dueDate) {
        status = { tag: 'due_now', wordId: data.wordId, dueDate: data.dueDate }
      } else if (data.status === 'due_later' && data.wordId && data.dueDate) {
        const daysUntil = Math.ceil((new Date(data.dueDate).getTime() - Date.now()) / 86_400_000)
        status = { tag: 'due_later', wordId: data.wordId, dueDate: data.dueDate, daysUntil }
      } else {
        status = { tag: 'new' }
      }

      const result: WordResult = {
        word: data.word,
        definition: data.definition,
        examples: data.examples,
        distractors: data.distractors,
      }

      // Cache hits skip the idiom card — no latency to fill.
      if (status.tag === 'due_now' || status.tag === 'due_later') {
        setPhase({ tag: 'revealed', result, status })
      } else {
        setPhase({ tag: 'ready', result, status })
      }
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
    setPhase({ tag: 'revealed', result: phase.result, status: phase.status })
  }

  function handleRetry() {
    if (phase.tag !== 'error') return
    handleSubmit(phase.word)
  }

  function handleAddAnother() {
    setWord('')
    setPhase({ tag: 'idle' })
    setInputError(null)
    setRevealedFr([])
    setRevealedDefFr(false)
    setSelectedDistractors(new Set())
    setToast(null)
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
    if (phase.tag !== 'revealed' || phase.status.tag !== 'new') return
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
        }),
      })
      setSaveState(res.ok ? 'saved' : 'error')
    } catch {
      setSaveState('error')
    }
  }

  async function handleResetSchedule() {
    if (phase.tag !== 'revealed' || phase.status.tag === 'new') return
    const { wordId } = phase.status
    setSaveState('saving')
    try {
      const res = await fetch('/api/words/reset-schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ wordId }),
      })
      setSaveState(res.ok ? 'saved' : 'error')
    } catch {
      setSaveState('error')
    }
  }

  // Runs in background — intentionally not awaited by caller.
  async function runBulkAdd(wordsToAdd: string[]) {
    setToast({ type: 'adding', count: wordsToAdd.length })

    const results = await Promise.all(
      wordsToAdd.map(async (w) => {
        try {
          const enrichRes = await fetch('/api/words/enrich', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ word: w }),
          })
          if (!enrichRes.ok) return { word: w, ok: false, skipped: false }

          const enrichData = await enrichRes.json() as EnrichResponse
          if (enrichData.status !== 'new') return { word: w, ok: true, skipped: true }

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
          return { word: w, ok: saveRes.ok, skipped: false }
        } catch {
          return { word: w, ok: false, skipped: false }
        }
      })
    )

    const added = results.filter((r) => r.ok && !r.skipped).length
    const skipped = results.filter((r) => r.skipped).length
    const failedWords = results.filter((r) => !r.ok && !r.skipped).map((r) => r.word)

    if (failedWords.length === 0) {
      setToast({ type: 'success', count: added, skipped })
    } else {
      setToast({ type: 'error', failedWords })
    }
  }

  function handleAddDistractors() {
    const words = Array.from(selectedDistractors)
    setSelectedDistractors(new Set()) // immediate deselect → bottom bar restores
    void runBulkAdd(words)
  }

  // ── IDLE ─────────────────────────────────────────────────────────────────────
  if (phase.tag === 'idle') {
    return (
      <div className="flex flex-col pb-16">
        <div className="p-5">
          <Link href="/" className="text-muted text-sm">←</Link>
          <div className="mt-4">
            <h1 className="font-serif text-2xl font-bold text-ink">Nouveau mot</h1>
            <p className="text-sm text-muted mt-0.5">Entrez un mot espagnol</p>
          </div>
        </div>

        <div className="px-5 flex flex-col gap-4">
          <WordInput
            value={word}
            onChange={(v) => { setWord(v); if (inputError) setInputError(null) }}
            onSubmit={(w) => { void handleSubmit(w) }}
            error={inputError}
          />
          <p className="text-sm text-muted leading-relaxed">
            Claude va générer la définition, des exemples et des mots similaires pour enrichir votre
            apprentissage.
          </p>
          <button
            type="button"
            disabled={!word.trim()}
            onClick={() => handleSubmit(word.trim())}
            className="w-full bg-accent text-white rounded-card py-4 font-serif text-sm disabled:opacity-40 transition-opacity"
          >
            Rechercher →
          </button>
        </div>
      </div>
    )
  }

  // ── SPELLCHECK CANDIDATES ─────────────────────────────────────────────────────
  if (phase.tag === 'spellcheck_candidates') {
    const originalWord = phase.word
    const candidates = phase.candidates
    return (
      <div className="flex flex-col p-5 gap-5 pb-16">
        <button
          type="button"
          onClick={() => { setWord(originalWord); setPhase({ tag: 'idle' }) }}
          className="text-muted text-sm self-start"
        >
          ← Retour
        </button>
        <div>
          <h1 className="font-serif text-2xl font-bold text-ink">Voulais-tu dire…</h1>
          <p className="text-sm text-muted mt-1">&laquo;&nbsp;{originalWord}&nbsp;&raquo; n&apos;a pas été reconnu</p>
        </div>
        <div className="flex flex-col gap-3">
          {candidates.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => { setWord(c); void handleSubmit(c) }}
              className="bg-card rounded-card shadow-card px-5 py-4 font-serif text-lg text-ink text-left"
            >
              {c}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() => { setWord(originalWord); setPhase({ tag: 'idle' }) }}
          className="text-sm text-muted underline underline-offset-2 self-start"
        >
          Aucune de ces propositions
        </button>
      </div>
    )
  }

  // ── LOADING / READY / ERROR ───────────────────────────────────────────────────
  if (phase.tag === 'loading' || phase.tag === 'ready' || phase.tag === 'error') {
    return (
      <LoadingIdiom
        status={phase.tag}
        onReveal={handleReveal}
        onRetry={handleRetry}
      />
    )
  }

  // ── REVEALED ──────────────────────────────────────────────────────────────────
  const result = phase.result
  const status = phase.status
  const allSelected =
    result.distractors.length > 0 && result.distractors.every((d) => selectedDistractors.has(d))
  const selectionCount = selectedDistractors.size
  const isAdding = toast?.type === 'adding'

  return (
    <div className="flex flex-col min-h-screen pb-16">
      <div className="p-5">
        <button
          type="button"
          onClick={handleAddAnother}
          className="text-xs text-muted uppercase tracking-wide"
        >
          ← Nouveau mot
        </button>
        <div className="flex items-baseline gap-2 mt-2">
          <h1 className="font-serif text-3xl font-bold text-ink">{result.word}</h1>
          {result.definition.pos && (
            <span className="text-sm text-muted">{result.definition.pos}</span>
          )}
        </div>
      </div>

      <div className="px-5 flex flex-col gap-4 pb-4">
        {/* STATUT DECK */}
        {(status.tag === 'due_now' || status.tag === 'due_later') && (
          <div className="bg-tint border border-line rounded-card px-4 py-3">
            <p className="text-xs text-muted font-serif">
              {status.tag === 'due_now'
                ? "Déjà dans votre vocabulaire — prochaine révision aujourd'hui."
                : `Déjà dans votre vocabulaire — prochaine révision dans ${status.daysUntil} jour${status.daysUntil > 1 ? 's' : ''}.`}
            </p>
          </div>
        )}

        {/* DÉFINITION */}
        <div className="bg-card rounded-card shadow-card p-5">
          <p className="text-xs uppercase tracking-widest text-muted mb-3">Définition</p>
          <p className="font-serif text-sm text-ink leading-relaxed">{result.definition.es}</p>
          {revealedDefFr ? (
            <p className="font-serif italic text-sm text-muted mt-2">{result.definition.fr}</p>
          ) : (
            <button type="button" onClick={() => setRevealedDefFr(true)} className="text-xs text-accent mt-2">
              ↓ Voir en français
            </button>
          )}
        </div>

        {/* EXEMPLES */}
        <div className="bg-card rounded-card shadow-card p-5">
          <p className="text-xs uppercase tracking-widest text-muted mb-4">Exemples</p>
          <ul className="flex flex-col divide-y divide-line">
            {result.examples.map((ex, i) => (
              <li key={i} className={i > 0 ? 'pt-4 mt-0' : ''}>
                <p className="font-serif text-sm text-ink leading-relaxed">
                  {highlightWord(ex.es, result.word)}
                </p>
                {revealedFr[i] ? (
                  <p className="font-serif italic text-sm text-muted mt-1">{ex.fr}</p>
                ) : (
                  <button type="button" onClick={() => toggleFr(i)} className="text-xs text-accent mt-2">
                    ↓ Traduction
                  </button>
                )}
              </li>
            ))}
          </ul>
        </div>

        {/* MOTS SIMILAIRES */}
        {result.distractors.length > 0 && (
          <div className="bg-card rounded-card shadow-card p-5">
            <div className="flex justify-between items-center mb-2">
              <p className="text-xs uppercase tracking-widest text-muted">
                Mots similaires à ne pas confondre
              </p>
              <button
                type="button"
                onClick={() => handleToggleAll(result.distractors)}
                disabled={isAdding}
                className={`text-xs text-accent shrink-0 ml-3 underline underline-offset-2 decoration-accent/50 ${
                  isAdding ? 'opacity-50 pointer-events-none' : ''
                }`}
              >
                {isAdding || allSelected ? 'Tout désélectionner' : 'Tout sélectionner'}
              </button>
            </div>

            <p className="text-xs text-muted leading-relaxed mb-3">
              Apprendre des mots de la même famille en parallèle aide votre cerveau à les distinguer
              en contexte. Touchez chaque mot pour l&apos;ajouter à votre vocabulaire.
            </p>

            <div className="flex flex-wrap gap-2">
              {result.distractors.map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => handleToggleDistractor(d)}
                  disabled={isAdding}
                  className={`text-[10px] uppercase tracking-widest px-3 py-1.5 rounded-full transition-colors ${
                    selectedDistractors.has(d)
                      ? 'bg-accent text-white border border-accent'
                      : 'bg-tint text-accent border border-accent/20'
                  } ${isAdding ? 'opacity-50 pointer-events-none' : ''}`}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Toast — floats above the NavBar */}
      {toast && (
        <div className="fixed bottom-16 inset-x-0 z-40 px-4 pointer-events-none">
          <div className={`max-w-[430px] mx-auto rounded-card px-4 py-3 shadow-card pointer-events-auto flex items-center gap-3 ${
            toast.type === 'success'
              ? 'bg-card border border-ok/25'
              : toast.type === 'error'
              ? 'bg-card border border-err/25'
              : 'bg-card border border-line'
          }`}>
            {toast.type === 'adding' && (
              <>
                <Loader2 size={14} className="animate-spin text-muted shrink-0" />
                <p className="text-sm font-serif text-ink">
                  Ajout en cours pour {toast.count} mot{toast.count > 1 ? 's' : ''}…
                </p>
              </>
            )}
            {toast.type === 'success' && (
              <>
                <span className="text-ok text-base leading-none shrink-0">✓</span>
                <p className="text-sm font-serif text-ok">
                  {toast.count} mot{toast.count > 1 ? 's' : ''} ajouté{toast.count > 1 ? 's' : ''}.
                  {toast.skipped > 0 && ` (${toast.skipped} déjà présent${toast.skipped > 1 ? 's' : ''})`}
                </p>
              </>
            )}
            {toast.type === 'error' && (
              <>
                <span className="text-err text-base leading-none shrink-0">✗</span>
                <p className="text-sm font-serif text-err flex-1">Erreur — veuillez réessayer.</p>
                <button
                  type="button"
                  onClick={() => { void runBulkAdd(toast.failedWords) }}
                  className="text-xs text-err underline underline-offset-2 shrink-0"
                >
                  Réessayer
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Bottom actions */}
      <div className="mt-auto p-4 flex gap-3 border-t border-line bg-page">
        {selectionCount > 0 ? (
          // Distractor selection mode — unchanged
          <>
            <button
              type="button"
              onClick={() => setSelectedDistractors(new Set())}
              className="flex-1 border border-line rounded-card py-3.5 font-serif text-sm text-ink"
            >
              Annuler
            </button>
            <button
              type="button"
              onClick={handleAddDistractors}
              className="flex-[2] bg-accent text-white rounded-card py-3.5 font-serif text-sm"
            >
              Ajouter {selectionCount} mot{selectionCount > 1 ? 's' : ''} →
            </button>
          </>
        ) : status.tag === 'new' ? (
          // Not in deck — primary save action
          <>
            <button
              type="button"
              onClick={handleAddAnother}
              className="flex-1 border border-line rounded-card py-3.5 font-serif text-sm text-ink"
            >
              ← Nouveau mot
            </button>
            <button
              type="button"
              onClick={() => { void handleSave() }}
              disabled={saveState !== 'idle'}
              className="flex-[2] bg-accent text-white rounded-card py-3.5 font-serif text-sm disabled:opacity-40 transition-opacity"
            >
              {saveState === 'saving' ? (
                <Loader2 size={14} className="animate-spin inline" />
              ) : saveState === 'saved' ? (
                '✓ Ajouté'
              ) : saveState === 'error' ? (
                'Erreur — réessayer'
              ) : (
                '+ Ajouter à ma collection'
              )}
            </button>
          </>
        ) : status.tag === 'due_now' ? (
          // Already in deck, due — offer schedule reset
          <>
            <button
              type="button"
              onClick={handleAddAnother}
              className="flex-1 border border-line rounded-card py-3.5 font-serif text-sm text-ink"
            >
              ← Nouveau mot
            </button>
            <button
              type="button"
              onClick={() => { void handleResetSchedule() }}
              disabled={saveState !== 'idle'}
              className="flex-[2] bg-accent text-white rounded-card py-3.5 font-serif text-sm disabled:opacity-40 transition-opacity"
            >
              {saveState === 'saving' ? (
                <Loader2 size={14} className="animate-spin inline" />
              ) : saveState === 'saved' ? (
                '✓ Calendrier réinitialisé'
              ) : saveState === 'error' ? (
                'Erreur — réessayer'
              ) : (
                '↻ Réinitialiser le calendrier'
              )}
            </button>
          </>
        ) : (
          // Already in deck, not yet due — no save action
          <button
            type="button"
            onClick={handleAddAnother}
            className="flex-1 border border-line rounded-card py-3.5 font-serif text-sm text-ink"
          >
            ← Nouveau mot
          </button>
        )}
      </div>
    </div>
  )
}
