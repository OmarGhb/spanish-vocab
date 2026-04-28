'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
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
  }

  function toggleFr(i: number) {
    setRevealedFr((prev) => prev.map((v, j) => (j === i ? !v : v)))
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
            <p className="text-xs uppercase tracking-widest text-muted mb-3">
              Mots similaires à ne pas confondre
            </p>
            <div className="flex flex-wrap gap-2">
              {result.distractors.map((d) => (
                <span
                  key={d}
                  className="bg-tint text-accent border border-accent/20 text-[10px] uppercase tracking-widest px-3 py-1.5 rounded-full"
                >
                  {d}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Bottom actions */}
      <div className="mt-auto p-4 flex gap-3 border-t border-line bg-page">
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
      </div>
    </div>
  )
}
