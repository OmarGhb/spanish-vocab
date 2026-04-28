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

type AddStatus = 'idle' | 'adding' | 'done'

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

function addSummaryMessage(added: number, failed: number): string {
  const s = (n: number) => (n > 1 ? 's' : '')
  if (failed === 0) return `${added} mot${s(added)} ajouté${s(added)} à votre vocabulaire.`
  if (added === 0) return `Erreur — aucun mot ajouté.`
  return `${added} mot${s(added)} ajouté${s(added)}, ${failed} erreur${s(failed)}.`
}

export default function AddPage() {
  const [word, setWord] = useState('')
  const [phase, setPhase] = useState<Phase>({ tag: 'idle' })
  const [revealedFr, setRevealedFr] = useState<boolean[]>([])

  // Distractor selection state
  const [selectedDistractors, setSelectedDistractors] = useState<Set<string>>(new Set())
  const [addStatus, setAddStatus] = useState<AddStatus>('idle')
  const [addSummary, setAddSummary] = useState<{ added: number; failed: number } | null>(null)

  // Holds the active AbortController so the useEffect cleanup can cancel it on unmount.
  const abortRef = useRef<AbortController | null>(null)

  // Cancel in-flight request when navigating away.
  useEffect(() => {
    return () => {
      abortRef.current?.abort()
    }
  }, [])

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
      // Ignore abort errors — user navigated away intentionally.
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
    setAddStatus('idle')
    setAddSummary(null)
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

  async function handleAddDistractors() {
    const words = Array.from(selectedDistractors)
    setAddStatus('adding')

    let added = 0
    let failed = 0

    for (const w of words) {
      try {
        const res = await fetch('/api/words', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ word: w }),
        })
        if (res.ok) added++
        else failed++
      } catch {
        failed++
      }
    }

    setSelectedDistractors(new Set())
    setAddSummary({ added, failed })
    setAddStatus('done')
  }

  // ── IDLE ────────────────────────────────────────────────────────────────────
  if (phase.tag === 'idle') {
    return (
      <div className="flex flex-col min-h-screen pb-16">
        <div className="p-5">
          <Link href="/" className="text-muted text-sm">
            ←
          </Link>
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
            onKeyDown={(e) => {
              if (e.key === 'Enter' && word.trim()) handleSubmit(word.trim())
            }}
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
                  <button
                    type="button"
                    onClick={() => toggleFr(i)}
                    className="text-xs text-accent mt-2"
                  >
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
                className="text-xs text-accent shrink-0 ml-3"
              >
                {allSelected ? 'Tout désélectionner' : 'Tout sélectionner'}
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
                  disabled={addStatus === 'adding'}
                  className={`text-[10px] uppercase tracking-widest px-3 py-1.5 rounded-full transition-colors ${
                    selectedDistractors.has(d)
                      ? 'bg-accent text-white border border-accent'
                      : 'bg-tint text-accent border border-accent/20'
                  }`}
                >
                  {d}
                </button>
              ))}
            </div>

            {/* Add result feedback */}
            {addStatus === 'done' && addSummary && (
              <div className={`flex items-center gap-2 mt-3 ${addSummary.failed > 0 && addSummary.added === 0 ? 'text-err' : 'text-ok'}`}>
                <span className="text-sm leading-none">
                  {addSummary.failed > 0 && addSummary.added === 0 ? '✗' : '✓'}
                </span>
                <p className="text-xs font-serif">
                  {addSummaryMessage(addSummary.added, addSummary.failed)}
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Bottom actions */}
      <div className="mt-auto p-4 flex gap-3 border-t border-line bg-page">
        {selectionCount > 0 || addStatus === 'adding' ? (
          <>
            <button
              type="button"
              onClick={() => { setSelectedDistractors(new Set()); setAddStatus('idle') }}
              disabled={addStatus === 'adding'}
              className="flex-1 border border-line rounded-card py-3.5 font-serif text-sm text-ink disabled:opacity-40"
            >
              Annuler
            </button>
            <button
              type="button"
              onClick={handleAddDistractors}
              disabled={addStatus === 'adding' || selectionCount === 0}
              className="flex-[2] bg-accent text-white rounded-card py-3.5 font-serif text-sm disabled:opacity-40 transition-opacity flex items-center justify-center gap-2"
            >
              {addStatus === 'adding' ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  Ajout en cours…
                </>
              ) : (
                `Ajouter ${selectionCount} mot${selectionCount > 1 ? 's' : ''} →`
              )}
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
