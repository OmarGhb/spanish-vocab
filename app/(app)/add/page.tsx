'use client'

import { useState } from 'react'

type Example = { es: string; fr: string }
type WordResult = { word: string; definition: string; examples: Example[] }

export default function AddPage() {
  const [word, setWord] = useState('')
  const [result, setResult] = useState<WordResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
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
    setLoading(false)
  }

  function handleAddAnother() {
    setWord('')
    setResult(null)
    setError(null)
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gray-50 p-6">
      <div className="w-full max-w-lg bg-white rounded border p-8">
        <h1 className="text-2xl font-semibold mb-6 text-gray-900">Ajouter un mot</h1>

        {!result ? (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <input
              type="text"
              placeholder="Mot en espagnol"
              value={word}
              onChange={(e) => setWord(e.target.value)}
              required
              className="border rounded px-3 py-2 text-sm"
            />
            {error && <p className="text-red-600 text-sm">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="bg-black text-white rounded px-4 py-2 text-sm disabled:opacity-50"
            >
              {loading ? 'Recherche en cours…' : 'Ajouter'}
            </button>
          </form>
        ) : (
          <div className="flex flex-col gap-6">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">{result.word}</h2>
              <p className="mt-2 text-gray-700 text-sm leading-relaxed">{result.definition}</p>
            </div>
            <div>
              <h3 className="font-medium mb-3 text-sm uppercase tracking-wide text-gray-500">
                Exemples
              </h3>
              <ul className="flex flex-col gap-4">
                {result.examples.map((ex, i) => (
                  <li key={i} className="border-l-2 border-gray-200 pl-4">
                    <p className="font-medium text-sm">{ex.es}</p>
                    <p className="text-gray-500 text-sm mt-0.5">{ex.fr}</p>
                  </li>
                ))}
              </ul>
            </div>
            <button
              onClick={handleAddAnother}
              className="bg-black text-white rounded px-4 py-2 text-sm"
            >
              Ajouter un autre mot
            </button>
          </div>
        )}
      </div>
    </main>
  )
}
