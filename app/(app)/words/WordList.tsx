'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Search, Plus, ChevronUp, ChevronDown } from 'lucide-react'
import { getFamiliarity, isDue, isMemorized } from '@/lib/word-status'
import { matchesWordSearch } from '@/lib/word-search'
import { resolveChrome, WORDS_CHROME } from '@/lib/immersion'
import { useSettings } from '../SettingsProvider'
import { useDeferredDelete } from '../DeferredDelete'
import { SELECTION_ACTIVE } from '../selection'
import Button from '../Button'
import SwipeRow from './SwipeRow'
import type { WordListItem } from './page'

type Filter = 'tous' | 'arevoir' | 'memorises'
type Sort = 'alpha' | 'date' | 'familiarite'
type Dir = 'asc' | 'desc'

// Each sort opens at a sensible default direction; re-clicking the active sort flips it.
// "asc" is the natural ascending order of the comparator; the default may be desc (Date
// opens newest-first; the base comparator is oldest-first, so its default is desc).
const SORT_DEFAULT_DIR: Record<Sort, Dir> = { alpha: 'asc', date: 'desc', familiarite: 'asc' }

const FILTERS: { key: Filter; chrome: (typeof WORDS_CHROME)[keyof typeof WORDS_CHROME] }[] = [
  { key: 'tous', chrome: WORDS_CHROME.filterAll },
  { key: 'arevoir', chrome: WORDS_CHROME.filterReview },
  { key: 'memorises', chrome: WORDS_CHROME.filterMemorised },
]

const SORTS: { key: Sort; chrome: (typeof WORDS_CHROME)[keyof typeof WORDS_CHROME] }[] = [
  { key: 'alpha', chrome: WORDS_CHROME.sortAlpha },
  { key: 'date', chrome: WORDS_CHROME.sortDate },
  { key: 'familiarite', chrome: WORDS_CHROME.sortFamiliarity },
]

// Progressive append (NOT virtualization): render an initial chunk, reveal the
// next chunk when a bottom sentinel scrolls into view. Tunable constants.
const INITIAL_CHUNK = 40
const CHUNK_INCREMENT = 30

export default function WordList({ items }: { items: WordListItem[] }) {
  const { immersionMode: mode } = useSettings()
  const [filter, setFilter] = useState<Filter>('tous')
  const [sort, setSort] = useState<Sort>('date')
  const [dir, setDir] = useState<Dir>(SORT_DEFAULT_DIR.date)
  const [search, setSearch] = useState('')

  // Re-clicking the active sort flips its direction; clicking another switches to it at
  // its default direction.
  function handleSort(key: Sort) {
    if (key === sort) setDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    else {
      setSort(key)
      setDir(SORT_DEFAULT_DIR[key])
    }
  }
  const [shown, setShown] = useState(INITIAL_CHUNK)
  // Single-open-row coordination for swipe-to-reveal.
  const [openRowId, setOpenRowId] = useState<string | null>(null)

  const { hiddenIds, scheduleDelete } = useDeferredDelete()

  // Pipeline order: (deferred-delete hide) → filter pill → search → sort.
  // `hiddenIds` is the optimistic-removal set owned by the layout-level provider;
  // rendering from `items` minus it means undo just un-hides and the deterministic
  // sort re-places the row for free. Search narrows the ACTIVE pill's full set (it
  // does not reset the pill) and runs over the FULL deck, not the rendered rows.
  const visible = useMemo(() => {
    const filtered = items.filter((it) => {
      if (hiddenIds.has(it.id)) return false
      if (filter === 'arevoir') return isDue(it.card)
      if (filter === 'memorises') return isMemorized(it.card)
      return true
    })

    const searched = filtered.filter((it) => matchesWordSearch(it, search))

    // ASCENDING base comparator per sort; `dir` reverses it (negation flips every key,
    // so familiarité's stability tiebreak reverses too). Base ascending = A→Z /
    // oldest-first / least-familiar-first; the default direction (SORT_DEFAULT_DIR)
    // decides which way each opens.
    const base =
      sort === 'alpha'
        ? (a: WordListItem, b: WordListItem) => a.word.localeCompare(b.word, 'es')
        : sort === 'familiarite'
          ? (a: WordListItem, b: WordListItem) => {
              const diff = getFamiliarity(a.card) - getFamiliarity(b.card)
              if (diff !== 0) return diff
              return (a.card?.stability ?? 0) - (b.card?.stability ?? 0)
            }
          : // Date: ISO timestamps sort lexicographically; ascending = oldest first.
            (a: WordListItem, b: WordListItem) => a.createdAt.localeCompare(b.createdAt)

    const sorted = [...searched].sort(dir === 'asc' ? base : (a, b) => -base(a, b))
    return sorted
  }, [items, hiddenIds, filter, sort, dir, search])

  // The reveal cap resets to the initial chunk whenever the visible set changes
  // (filter / search / sort) — NOT on hiddenIds changes, so an optimistic delete
  // never resets the scroll cap. Adjusting state during render (the React-blessed
  // pattern) rather than an effect — no extra paint. Default date-desc → the
  // initial chunk is the newest N.
  const viewSig = `${filter}|${sort}|${dir}|${search}`
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

  // An open swipe row closes on scroll or on any pointer-down outside it (which
  // covers tapping another row / blank space). The open row marks itself with
  // data-swipe-open so its own drawer button + drag don't self-close.
  useEffect(() => {
    if (openRowId === null) return
    const close = () => setOpenRowId(null)
    const onDown = (e: PointerEvent) => {
      const target = e.target as HTMLElement | null
      if (target?.closest('[data-swipe-open="true"]')) return
      setOpenRowId(null)
    }
    window.addEventListener('scroll', close, { passive: true })
    document.addEventListener('pointerdown', onDown)
    return () => {
      window.removeEventListener('scroll', close)
      document.removeEventListener('pointerdown', onDown)
    }
  }, [openRowId])

  const searching = search.trim() !== ''
  const query = search.trim()

  // Empty deck (first word) — board "Animando" active empty state. Distinct from a
  // filter/search that simply matched nothing (passive / no-results below). Shown
  // without the search/filter/sort chrome (there's nothing to operate on yet).
  if (items.length === 0) {
    return (
      <div className="flex flex-col flex-1">
        <div className="px-5 pt-1 pb-2.5">
          <h1 className="font-serif text-3xl font-bold text-ink leading-none">{resolveChrome(WORDS_CHROME.myWords, mode)}</h1>
          <p className="text-sm text-muted mt-1.5">{mode === 'fr_es' ? '0 mot' : '0 palabra'}</p>
        </div>
        <div className="flex-1 min-h-0 flex flex-col items-center justify-center text-center px-9 pb-16">
          <img src="/paco.png" alt="" className="w-[116px] mb-2.5" />
          <p className="font-serif text-[25px] font-bold text-ink tracking-[-0.01em] leading-tight">
            {resolveChrome(WORDS_CHROME.firstWordWaiting, mode)}
          </p>
          <p className="text-[14.5px] text-muted leading-relaxed mt-2.5 max-w-[268px]">
            {resolveChrome(WORDS_CHROME.firstWordCopy, mode)}
          </p>
          <Button href="/add" full className="mt-6 max-w-[300px]">
            <Plus size={18} />
            {resolveChrome(WORDS_CHROME.addWord, mode)}
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col flex-1">
      <div className="p-5 flex flex-col gap-5">
        {/* Header */}
        <div>
          <h1 className="font-serif text-3xl font-bold text-ink leading-none">{resolveChrome(WORDS_CHROME.myWords, mode)}</h1>
          <p className="text-sm text-muted mt-1.5">
            {mode === 'fr_es'
              ? `${items.length} mot${items.length !== 1 ? 's' : ''}`
              : `${items.length} palabra${items.length !== 1 ? 's' : ''}`}
          </p>
        </div>

        {/* Search — input font ≥16px to avoid the iOS zoom-lock. */}
        <div className="relative flex items-center gap-2.5 rounded-card border-[1.5px] border-line bg-card px-3.5 focus-within:border-accent focus-within:shadow-amber-sm">
          <Search size={18} className="text-faint shrink-0" aria-hidden />
          <input
            type="text"
            inputMode="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={resolveChrome(WORDS_CHROME.searchPlaceholder, mode)}
            aria-label={resolveChrome(WORDS_CHROME.searchAria, mode)}
            className="flex-1 min-w-0 text-base bg-transparent py-3 text-ink placeholder:text-faint placeholder:italic focus:outline-none"
          />
          {searching && (
            <button
              type="button"
              onClick={() => setSearch('')}
              aria-label={resolveChrome(WORDS_CHROME.clearSearch, mode)}
              className="press-icon shrink-0 grid place-items-center w-[22px] h-[22px] rounded-full text-accent text-lg leading-none"
            >
              ×
            </button>
          )}
        </div>

        {/* Filter pills — active = SELECTION_ACTIVE (amber fill, ivory, short shadow). */}
        <div className="flex gap-2">
          {FILTERS.map(({ key, chrome }) => {
            const active = filter === key
            return (
              <button
                key={key}
                type="button"
                onClick={() => setFilter(key)}
                className={`text-[13.5px] px-[17px] py-[9px] rounded-full ${
                  active
                    ? `press-pill-amber font-semibold ${SELECTION_ACTIVE}`
                    : 'press-pill font-medium bg-card text-ink border-[1.5px] border-line'
                }`}
              >
                {resolveChrome(chrome, mode)}
              </button>
            )
          })}
        </div>

        {/* Sort control — active = ink/bold + 2px amber underline + direction caret;
            inactive = faint. Re-clicking the active sort flips its direction. */}
        <div className="flex items-center gap-1.5 text-[13px]">
          <span className="text-faint">{resolveChrome(WORDS_CHROME.sortLabel, mode)}</span>
          {SORTS.map(({ key, chrome }) => {
            const active = sort === key
            return (
              <span key={key} className="flex items-center gap-1.5">
                <span className="text-line" aria-hidden>
                  ·
                </span>
                <button
                  type="button"
                  onClick={() => handleSort(key)}
                  aria-pressed={active}
                  className={
                    active
                      ? 'flex items-center gap-0.5 text-ink font-bold border-b-2 border-accent pb-px'
                      : 'text-faint border-b-2 border-transparent pb-px'
                  }
                >
                  {resolveChrome(chrome, mode)}
                  {active &&
                    (dir === 'asc' ? (
                      <ChevronUp size={13} className="text-accent" aria-hidden />
                    ) : (
                      <ChevronDown size={13} className="text-accent" aria-hidden />
                    ))}
                </button>
              </span>
            )
          })}
        </div>

        {/* List · no-results (Pensando) · passive filter-empty (Durmiendo) */}
        {visible.length > 0 ? (
          <>
            <ul className="flex flex-col gap-2">
              {rendered.map((it) => (
                <SwipeRow
                  key={it.id}
                  id={it.id}
                  word={it.word}
                  defEs={it.defEs}
                  card={it.card}
                  mode={mode}
                  isOpen={openRowId === it.id}
                  onOpen={() => setOpenRowId(it.id)}
                  onClose={() => setOpenRowId((cur) => (cur === it.id ? null : cur))}
                  onDelete={() => {
                    setOpenRowId(null)
                    scheduleDelete({ ids: [it.id], labels: [it.word], mode })
                  }}
                />
              ))}
            </ul>
            {hasMore && <div ref={sentinelRef} aria-hidden className="h-1" />}
          </>
        ) : searching ? (
          // No-results — Paco Pensando (intentional divergence from the board mock,
          // which drew Durmiendo here: a puzzled dog fits a search-miss better).
          <div className="flex flex-col items-center justify-center text-center px-9 pt-12 pb-10">
            <img src="/paco-pensando.png" alt="" className="w-[110px] mb-2" />
            <p className="font-serif text-[22px] font-bold text-ink whitespace-nowrap">{resolveChrome(WORDS_CHROME.noResults, mode)}</p>
            <p className="text-sm text-muted leading-relaxed mt-2 max-w-[250px]">
              {mode === 'fr_es' ? (
                <>Aucun mot ne correspond à «&nbsp;{query}&nbsp;».</>
              ) : (
                <>Ninguna palabra coincide con «{query}».</>
              )}
            </p>
            <Button href="/add" variant="secondary" className="mt-5">
              <Plus size={16} />
              {mode === 'fr_es' ? <>Ajouter «&nbsp;{query}&nbsp;»</> : <>Añadir «{query}»</>}
            </Button>
          </div>
        ) : (
          // Passive filter-empty — Paco Durmiendo. Never punitive. Copy adapts to the
          // active filter (Mémorisés-empty mustn't read "Rien à réviser").
          <div className="flex flex-col items-center justify-center text-center px-9 pt-12 pb-10">
            <img src="/paco-durmiendo.png" alt="" className="w-[200px]" />
            <p className="font-serif text-[23px] font-bold text-ink whitespace-nowrap">
              {resolveChrome(filter === 'memorises' ? WORDS_CHROME.noneMemorised : WORDS_CHROME.nothingToReview, mode)}
            </p>
            <p className="text-[14.5px] text-muted leading-relaxed mt-2 max-w-[256px]">
              {resolveChrome(filter === 'memorises' ? WORDS_CHROME.memorisedEmptyCopy : WORDS_CHROME.caughtUpCopy, mode)}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
