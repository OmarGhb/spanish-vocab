'use client'

import { useMemo, useState } from 'react'
import { getFamiliarity, isDue, isMemorized } from '@/lib/word-status'
import WordRow from '../WordRow'
import type { WordListItem } from './page'

type Filter = 'tous' | 'arevoir' | 'memorises'
type Sort = 'alpha' | 'date' | 'familiarite'

const FILTERS: { key: Filter; label: string }[] = [
  { key: 'tous', label: 'Tous' },
  { key: 'arevoir', label: 'À revoir' },
  { key: 'memorises', label: 'Mémorisés' },
]

const SORTS: { key: Sort; label: string }[] = [
  { key: 'alpha', label: 'Alphabétique' },
  { key: 'date', label: 'Date' },
  { key: 'familiarite', label: 'Familiarité' },
]

export default function WordList({ items }: { items: WordListItem[] }) {
  const [filter, setFilter] = useState<Filter>('tous')
  const [sort, setSort] = useState<Sort>('date')

  const visible = useMemo(() => {
    const filtered = items.filter((it) => {
      if (filter === 'arevoir') return isDue(it.card)
      if (filter === 'memorises') return isMemorized(it.card)
      return true
    })

    const sorted = [...filtered]
    if (sort === 'alpha') {
      sorted.sort((a, b) => a.word.localeCompare(b.word, 'es'))
    } else if (sort === 'familiarite') {
      // Least familiar first: by familiarity level asc, then stability asc within a level.
      sorted.sort((a, b) => {
        const diff = getFamiliarity(a.card) - getFamiliarity(b.card)
        if (diff !== 0) return diff
        return (a.card?.stability ?? 0) - (b.card?.stability ?? 0)
      })
    } else {
      // Date: most recent first. ISO timestamps sort lexicographically.
      sorted.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    }
    return sorted
  }, [items, filter, sort])

  return (
    <div className="flex flex-col min-h-screen pb-16">
      <div className="p-5 flex flex-col gap-5">
        {/* Header */}
        <div>
          <h1 className="font-serif text-3xl font-bold text-ink leading-none">Mes mots</h1>
          <p className="text-sm text-muted mt-1.5">
            {items.length} mot{items.length !== 1 ? 's' : ''}
          </p>
        </div>

        {/* Filter pills */}
        <div className="flex gap-2">
          {FILTERS.map(({ key, label }) => {
            const active = filter === key
            return (
              <button
                key={key}
                type="button"
                onClick={() => setFilter(key)}
                className={`text-xs font-semibold px-3.5 py-1.5 rounded-full ${
                  active ? 'bg-accent text-white' : 'bg-card text-muted border border-line'
                }`}
              >
                {label}
              </button>
            )
          })}
        </div>

        {/* Sort control */}
        <div className="flex items-center gap-1.5 text-xs">
          <span className="text-muted">Trier</span>
          {SORTS.map(({ key, label }) => (
            <span key={key} className="flex items-center gap-1.5">
              <span className="text-line" aria-hidden>
                ·
              </span>
              <button
                type="button"
                onClick={() => setSort(key)}
                className={sort === key ? 'text-accent font-semibold' : 'text-muted'}
              >
                {label}
              </button>
            </span>
          ))}
        </div>

        {/* List */}
        {visible.length > 0 ? (
          <ul className="flex flex-col gap-2">
            {visible.map((it) => (
              <WordRow key={it.id} id={it.id} word={it.word} defEs={it.defEs} card={it.card} />
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted text-center py-8">Aucun mot dans cette vue.</p>
        )}
      </div>
    </div>
  )
}
