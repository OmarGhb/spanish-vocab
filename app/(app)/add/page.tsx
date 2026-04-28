'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { Loader2 } from 'lucide-react'
import LoadingIdiom from './LoadingIdiom'

type Example = { es: string; fr: string }
type WordResult = {
  word: string
  definition: string
  examples: Example[]
  distractors: string[]
}

type Phase =
  | { tag: 'idle' }
  | { tag: 'loading' }
  | { tag: 'ready'; result: WordResult }
  | { tag: 'error'; word: string }
  | { tag: 'revealed'; result: WordResult }

type Toast =
  | { type: 'adding'; count: number }
  | { type: 'success'; count: number }
  | { type: 'error'; failedWords: string[] }

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
  const [revealedFr, setRevealedFr] = useState<boolean[]>([])
  const [selectedDistractors, setSelectedDistractors] = useState<Set<string>>(new Set())
  const [toast, setToast] = useState<Toast | null>(null)

  const abortRef = useRef<AbortController | null>(null)

  // Cancel in-flight word lookup when navigating away.
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

    try {
      const res = await fetch('/api/words', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ word: targetWord }),
        signal: controller.signal,
      })
      const data: WordResult & { error?: string } = await res.json()

      if (!res.ok) {
        setPhase({ tag: 'error', word: targetWord })
        console.warn('[add] /api/words error:', data.error)
        return
      }

      setPhase({ tag: 'ready', result: data })
      setRevealedFr(new Array(data.examples.length).fill(false))
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
    setWord('')
    setPhase({ tag: 'idle' })
    setRevealedFr([])
    setSelectedDistractors(new Set())
    setToast(null)
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

  // Runs in background — intentionally not awaited by caller.
  async function runBulkAdd(words: string[]) {
    setToast({ type: 'adding', count: words.length })

    const results = await Promise.all(
      words.map(async (w) => {
        try {
          const res = await fetch('/api/words', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ word: w }),
          })
          return { word: w, ok: res.ok }
        } catch {
          return { word: w, ok: false }
        }
      })
    )

    const added = results.filter((r) => r.ok).length
    const failedWords = results.filter((r) => !r.ok).map((r) => r.word)

    if (failedWords.length === 0) {
      setToast({ type: 'success', count: added })
    } else {
      setToast({ type: 'error', failedWords })
    }
  }

  function handleAddDistractors() {
    const words = Array.from(selectedDistractors)
    setSelectedDistractors(new Set()) // immediate deselect → bottom bar restores
    void runBulkAdd(words)
  }

  // ── IDLE ────────────────────────────────────────────────────────────────────
  if (phase.tag === 'idle') {
    return (
      <div className="flex flex-col min-h-screen pb-16">
        <div className="p-5">
          <Link href="/" className="text-muted text-sm">←</Link>
          <div className="mt-4">
            <h1 className="font-serif text-2xl font-bold text-ink">Nouveau mot</h1>
            <p className="text-sm text-muted mt-0.5">Entrez un mot espagnol</p>
          </div>
        </div>

        <div className="px-5 flex flex-col gap-4">
          <input
            id="word-input"
            type="text"
            placeholder="mariposa"
            value={word}
            onChange={(e) => setWord(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && word.trim()) handleSubmit(word.trim()) }}
            className="w-full border border-line rounded-card px-4 py-4 font-serif text-lg bg-card text-ink placeholder:text-muted focus:outline-none focus:border-accent"
          />
          <p className="text-sm text-muted leading-relaxed">
            Claude va générer la définition, des exemples et des mots similaires pour enrichir votre
            apprentissage.
          </p>
        </div>

        <div className="mt-auto p-4">
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

  // ── LOADING / READY / ERROR ─────────────────────────────────────────────────
  if (phase.tag === 'loading' || phase.tag === 'ready' || phase.tag === 'error') {
    return (
      <LoadingIdiom
        status={phase.tag}
        onReveal={handleReveal}
        onRetry={handleRetry}
      />
    )
  }

  // ── REVEALED ────────────────────────────────────────────────────────────────
  const result = phase.result
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
        <h1 className="font-serif text-3xl font-bold text-ink mt-2">{result.word}</h1>
      </div>

      <div className="px-5 flex flex-col gap-4 pb-4">
        {/* DÉFINITION */}
        <div className="bg-card rounded-card shadow-card p-5">
          <p className="text-xs uppercase tracking-widest text-muted mb-3">Définition</p>
          <p className="font-serif italic text-sm text-ink leading-relaxed">{result.definition}</p>
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
            {/* Header row */}
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

            {/* Pedagogical subtext */}
            <p className="text-xs text-muted leading-relaxed mb-3">
              Apprendre des mots de la même famille en parallèle aide votre cerveau à les distinguer
              en contexte. Touchez chaque mot pour l&apos;ajouter à votre vocabulaire.
            </p>

            {/* Selectable pills */}
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
              ? 'bg-ok/10 border border-ok/20'
              : toast.type === 'error'
              ? 'bg-err/10 border border-err/20'
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
                  {toast.count} mot{toast.count > 1 ? 's' : ''} ajouté{toast.count > 1 ? 's' : ''} à votre vocabulaire.
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
        ) : (
          <>
            <button
              type="button"
              onClick={handleAddAnother}
              className="flex-1 border border-line rounded-card py-3.5 font-serif text-sm text-ink"
            >
              + Ajouter un mot
            </button>
            <Link
              href="/review"
              className="flex-[2] bg-accent text-white rounded-card py-3.5 font-serif text-sm text-center"
            >
              Réviser →
            </Link>
          </>
        )}
      </div>
    </div>
  )
}
