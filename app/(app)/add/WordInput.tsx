'use client'

import { useRef, useState } from 'react'
import { Search, ArrowRight } from 'lucide-react'

type Props = {
  value: string
  onChange: (v: string) => void
  onSubmit: (word: string) => void
  error?: string | null
  disabled?: boolean
}

// Rotating placeholder: a small curated array of clean, unambiguous A2 single words
// (board §1 — replaces the fixed "mariposa"). One is shown per visit (random on mount)
// and it advances on each focus.
const PLACEHOLDERS = [
  'ventana',
  'biblioteca',
  'manzana',
  'estrella',
  'montaña',
  'camino',
  'tortuga',
  'paraguas',
  'cuchara',
  'naranja',
] as const

// Bold the typed prefix of a suggestion (board §1a). Case-insensitive on the visible
// length only — presentation, not the (separate-backlog) accent-tolerant matching.
function PrefixBold({ word, prefix }: { word: string; prefix: string }) {
  const p = prefix.trim()
  if (p && word.toLowerCase().startsWith(p.toLowerCase())) {
    return (
      <>
        <span className="font-semibold">{word.slice(0, p.length)}</span>
        {word.slice(p.length)}
      </>
    )
  }
  return <>{word}</>
}

export default function WordInput({ value, onChange, onSubmit, error, disabled }: Props) {
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [open, setOpen] = useState(false)
  const [focused, setFocused] = useState(false)
  const [phIndex, setPhIndex] = useState(() => Math.floor(Math.random() * PLACEHOLDERS.length))
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  function handleChange(newValue: string) {
    onChange(newValue)

    if (debounceRef.current) clearTimeout(debounceRef.current)

    if (newValue.length < 2) {
      setSuggestions([])
      setOpen(false)
      return
    }

    debounceRef.current = setTimeout(() => {
      void fetch(`/api/words/autocomplete?q=${encodeURIComponent(newValue)}`)
        .then((res) => res.json())
        .then((data: { suggestions: string[] }) => {
          setSuggestions(data.suggestions)
          setOpen(data.suggestions.length > 0)
        })
        .catch(() => {})
    }, 300)
  }

  function handleSelect(word: string) {
    onChange(word)
    setSuggestions([])
    setOpen(false)
    onSubmit(word)
  }

  return (
    <div className="relative">
      <input
        id="word-input"
        type="text"
        placeholder={PLACEHOLDERS[phIndex]}
        value={value}
        disabled={disabled}
        onChange={(e) => handleChange(e.target.value)}
        onFocus={() => {
          setFocused(true)
          setPhIndex((i) => (i + 1) % PLACEHOLDERS.length)
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && value.trim()) { setOpen(false); onSubmit(value.trim()) }
          if (e.key === 'Escape') setOpen(false)
        }}
        onBlur={() => { setFocused(false); setTimeout(() => setOpen(false), 150) }}
        className={`w-full bg-card rounded-[14px] px-4 py-[15px] font-serif text-[19px] text-ink placeholder:italic placeholder:text-faint focus:outline-none border-[1.5px] transition-colors disabled:opacity-50 ${
          error
            ? 'border-err'
            : focused
            ? 'border-accent shadow-amber-sm'
            : 'border-line'
        }`}
      />
      {error && (
        <p className="mt-1.5 text-sm text-err">{error}</p>
      )}
      {open && (
        <ul className="absolute z-50 top-full mt-2 left-0 right-0 bg-card border border-line rounded-[14px] shadow-menu overflow-hidden">
          {suggestions.map((s, i) => (
            <li key={s} className={i > 0 ? 'border-t border-border-soft' : ''}>
              <button
                type="button"
                onMouseDown={() => handleSelect(s)}
                className={`group w-full flex items-center gap-3 px-4 py-[13px] text-left ${
                  i === 0 ? 'bg-amber-tint' : ''
                }`}
              >
                <Search size={15} className="text-faint shrink-0" aria-hidden />
                <span className="flex-1 font-serif text-[17px] text-ink">
                  <PrefixBold word={s} prefix={value} />
                </span>
                {i === 0 && <ArrowRight size={16} className="text-accent shrink-0" aria-hidden />}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
