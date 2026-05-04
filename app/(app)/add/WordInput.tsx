'use client'

import { useRef, useState } from 'react'

type Props = {
  value: string
  onChange: (v: string) => void
  onSubmit: (word: string) => void
  error?: string | null
  disabled?: boolean
}

export default function WordInput({ value, onChange, onSubmit, error, disabled }: Props) {
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [open, setOpen] = useState(false)
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
        placeholder="mariposa"
        value={value}
        disabled={disabled}
        onChange={(e) => handleChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && value.trim()) { setOpen(false); onSubmit(value.trim()) }
          if (e.key === 'Escape') setOpen(false)
        }}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        className="w-full border border-line rounded-card px-4 py-4 font-serif text-lg bg-card text-ink placeholder:text-muted focus:outline-none focus:border-accent disabled:opacity-50"
      />
      {error && (
        <p className="mt-1.5 text-sm text-err font-serif">{error}</p>
      )}
      {open && (
        <ul className="absolute z-50 top-full mt-1 left-0 right-0 bg-card border border-line rounded-card shadow-card overflow-hidden">
          {suggestions.map((s) => (
            <li key={s}>
              <button
                type="button"
                onMouseDown={() => handleSelect(s)}
                className="w-full text-left px-4 py-3 font-serif text-base text-ink hover:bg-tint active:bg-tint"
              >
                {s}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
