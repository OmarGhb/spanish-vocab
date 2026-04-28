'use client'

import { useState } from 'react'
import Link from 'next/link'

type Example = { es: string; fr: string }
type WordResult = {
  word: string
  definition: string
  examples: Example[]
  distractors: string[]
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
  const [result, setResult] = useState<WordResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [revealedFr, setRevealedFr] = useState<boolean[]>([])

  async function handleSubmit(e: React.SyntheticEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setResult(null)

    const res = await fetch('/api/words', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ word: word.trim() }),
    })

    const data: WordResult & { error?: string } = await res.json()

    if (!res.ok) {
      setError(data.error ?? 'Une erreur est survenue.')
      setLoading(false)
      return
    }

    setResult(data)
    setRevealedFr(new Array(data.examples.length).fill(false))
    setLoading(false)
  }

  function handleAddAnother() {
    setWord('')
    setResult(null)
    setError(null)
    setRevealedFr([])
  }

  function toggleFr(i: number) {
    setRevealedFr((prev) => prev.map((v, j) => (j === i ? !v : v)))
  }

  if (!result) {
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
            className="w-full border border-line rounded-card px-4 py-4 font-serif text-lg bg-card text-ink placeholder:text-muted focus:outline-none focus:border-accent"
          />
          {error && <p className="text-err text-sm">{error}</p>}
          <p className="text-sm text-muted leading-relaxed">
            Claude va générer la définition, des exemples et des mots similaires pour enrichir votre
            apprentissage.
          </p>
        </div>

        <div className="mt-auto p-4">
          <button
            type="button"
            disabled={!word.trim() || loading}
            onClick={handleSubmit}
            className="w-full bg-accent text-white rounded-card py-4 font-serif text-sm disabled:opacity-40 transition-opacity"
          >
            {loading ? 'Recherche en cours…' : 'Rechercher →'}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-screen">
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
