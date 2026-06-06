'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { getFamiliarity, isDue, isMemorized } from '@/lib/word-status'
import { matchesWordSearch } from '@/lib/word-search'
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

// Progressive append (NOT virtualization): render an initial chunk, reveal the
// next chunk when a bottom sentinel scrolls into view. Tunable constants.
const INITIAL_CHUNK = 40
const CHUNK_INCREMENT = 30

export default function WordList({ items }: { items: WordListItem[] }) {
  const [filter, setFilter] = useState<Filter>('tous')
  const [sort, setSort] = useState<Sort>('date')
  const [search, setSearch] = useState('')
  const [shown, setShown] = useState(INITIAL_CHUNK)

  // Pipeline order: filter pill → search → sort. Search narrows the ACTIVE pill's
  // full set (it does not reset the pill) and runs over the FULL deck, not the
  // currently-rendered rows.
  const visible = useMemo(() => {
    const filtered = items.filter((it) => {
      if (filter === 'arevoir') return isDue(it.card)
      if (filter === 'memorises') return isMemorized(it.card)
      return true
    })

    const searched = filtered.filter((it) => matchesWordSearch(it, search))

    const sorted = [...searched]
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
  }, [items, filter, sort, search])

  // The reveal cap resets to the initial chunk whenever the visible set changes
  // (filter / search / sort). Adjusting state during render (the React-blessed
  // pattern) rather than an effect — no extra paint. Default date-desc → the
  // initial chunk is the newest N.
  const viewSig = `${filter}|${sort}|${search}`
  const [prevViewSig, setPrevViewSig] = useState(viewSig)
  if (viewSig !== prevViewSig) {
    setPrevViewSig(viewSig)
    setShown(INITIAL_CHUNK)
  }

  const rendered = visible.slice(0, shown)
  const hasMore = shown < visible.length

  // Load-on-scroll via IntersectionObserver (NOT scroll-event listeners). The
  // sentinel only renders while there's more to reveal, so the observer naturally
  // stops once the full set is shown. The current length is captured in the
  // closure; the cap makes any extra fires harmless.
  const sentinelRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const node = sentinelRef.current
    if (!node) return
    const total = visible.length
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) {
        setShown((s) => Math.min(s + CHUNK_INCREMENT, total))
      }
    })
    observer.observe(node)
    return () => observer.disconnect()
  }, [hasMore, visible.length])

  const searching = search.trim() !== ''

  return (
    <div className="flex flex-col flex-1">
      <div className="p-5 flex flex-col gap-5">
        {/* Header */}
        <div>
          <h1 className="font-serif text-3xl font-bold text-ink leading-none">Mes mots</h1>
          <p className="text-sm text-muted mt-1.5">
            {items.length} mot{items.length !== 1 ? 's' : ''}
          </p>
        </div>

        {/* Search — input font ≥16px to avoid the iOS zoom-lock. */}
        <div className="relative">
          <input
            type="text"
            inputMode="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher…"
            aria-label="Rechercher un mot"
            className="w-full text-base rounded-card border border-line bg-card px-3.5 py-2.5 pr-9 text-ink placeholder:text-muted focus:outline-none focus:border-accent"
          />
          {searching && (
            <button
              type="button"
              onClick={() => setSearch('')}
              aria-label="Effacer la recherche"
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted text-lg leading-none px-1"
            >
              ×
            </button>
          )}
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
          <>
            <ul className="flex flex-col gap-2">
              {rendered.map((it) => (
                <WordRow key={it.id} id={it.id} word={it.word} defEs={it.defEs} card={it.card} reps={it.reps} />
              ))}
            </ul>
            {hasMore && <div ref={sentinelRef} aria-hidden className="h-1" />}
          </>
        ) : (
          <div className="py-16 text-center">
            <p className="text-sm text-muted">
              {searching ? 'Aucun résultat' : 'Aucun mot dans cette vue.'}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
