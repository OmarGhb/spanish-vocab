'use client'

import { useState } from 'react'

type Example = { es: string; fr: string }
type WordResult = {
  word: string
  definition: string
  examples: Example[]
  distractors: string[]
}

export default function AddPage() {
  const [word, setWord] = useState('')
  const [result, setResult] = useState<WordResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [revealed, setRevealed] = useState<boolean[]>([])

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
    setRevealed(new Array(data.examples.length).fill(false))
    setLoading(false)
  }

  function handleAddAnother() {
    setWord('')
    setResult(null)
    setError(null)
    setRevealed([])
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      <h1 className="font-serif text-2xl text-ink">Ajouter un mot</h1>

      {!result ? (
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <input
            type="text"
            placeholder="Mot en espagnol"
            value={word}
            onChange={(e) => setWord(e.target.value)}
            required
            className="border border-line rounded-lg px-3 py-2.5 text-sm bg-card text-ink placeholder:text-muted focus:outline-none focus:border-accent"
          />
          {error && <p className="text-err text-sm">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="bg-accent text-white rounded-lg px-4 py-2.5 text-sm disabled:opacity-50"
          >
            {loading ? 'Recherche en cours…' : 'Ajouter'}
          </button>
        </form>
      ) : (
        <div className="bg-card rounded-card shadow-card p-5 flex flex-col gap-5">
          <div>
            <h2 className="font-serif text-xl text-ink">{result.word}</h2>
            <p className="mt-2 font-serif italic text-sm text-ink leading-relaxed">
              {result.definition}
            </p>
          </div>

          <div>
            <p className="text-xs uppercase tracking-wide text-muted mb-3">Exemples</p>
            <ul className="flex flex-col gap-4">
              {result.examples.map((ex, i) => (
                <li key={i} className="border-l-2 border-line pl-4">
                  <p className="font-serif text-sm text-muted">{ex.fr}</p>
                  {revealed[i] ? (
                    <p className="font-serif text-sm text-ink mt-1">{ex.es}</p>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setRevealed((prev) => prev.map((v, j) => (j === i ? true : v)))}
                      className="text-xs text-muted mt-1 hover:text-ink"
                    >
                      Voir l&apos;original
                    </button>
                  )}
                </li>
              ))}
            </ul>
          </div>

          {result.distractors.length > 0 && (
            <div>
              <p className="text-xs uppercase tracking-wide text-muted mb-2">
                Mots à ne pas confondre
              </p>
              <div className="flex flex-wrap gap-2">
                {result.distractors.map((d) => (
                  <span key={d} className="bg-tint text-accent text-xs px-2.5 py-1 rounded-full">
                    {d}
                  </span>
                ))}
              </div>
            </div>
          )}

          <button
            onClick={handleAddAnother}
            className="bg-accent text-white rounded-lg px-4 py-2.5 text-sm"
          >
            Ajouter un autre mot
          </button>
        </div>
      )}
    </div>
  )
}
