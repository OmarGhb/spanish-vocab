'use client'

import { useEffect, useRef, useSyncExternalStore } from 'react'
import type { RefObject } from 'react'

const ACCENTS = ['á', 'é', 'í', 'ó', 'ú', 'ñ', 'ü']
const POINTER_QUERY = '(pointer: fine) and (hover: hover)'

// SSR-safe, reactive pointer detection (same pattern as AudioButton's support detection): server
// renders nothing, the client subscribes to the media query so plugging in a mouse flips it on.
function subscribe(cb: () => void) {
  const mq = window.matchMedia(POINTER_QUERY)
  mq.addEventListener('change', cb)
  return () => mq.removeEventListener('change', cb)
}
const getSnapshot = () => window.matchMedia(POINTER_QUERY).matches
const getServerSnapshot = () => false

type Props = {
  // FillInBlank owns the answer input; the bar inserts into it and restores its caret.
  inputRef: RefObject<HTMLInputElement | null>
  value: string
  onChange: (v: string) => void
}

// Desktop-only Spanish accent row for the écriture answer field. Hidden on touch — mobile has the
// long-press accent menu plus the near-miss grading cushion. Inserts the glyph at the caret and
// keeps focus + caret position. Rendered only in the écriture answering state (FillInBlank).
export default function AccentBar({ inputRef, value, onChange }: Props) {
  const show = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
  const caret = useRef<number | null>(null)

  // Restore the caret after the controlled value updates (React resets it to the end otherwise).
  useEffect(() => {
    if (caret.current != null && inputRef.current) {
      inputRef.current.setSelectionRange(caret.current, caret.current)
      caret.current = null
    }
  }, [value, inputRef])

  if (!show) return null

  const insert = (ch: string) => {
    const el = inputRef.current
    const start = el?.selectionStart ?? value.length
    const end = el?.selectionEnd ?? value.length
    caret.current = start + ch.length
    onChange(value.slice(0, start) + ch + value.slice(end))
    el?.focus()
  }

  return (
    // -mt-2 pulls the row up toward the sentence/blank above so it reads as an input helper,
    // not a detached third button group. Renders nothing on touch, so no empty gap there.
    <div className="-mt-2 flex flex-wrap justify-center gap-1.5" aria-label="Accents espagnols">
      {ACCENTS.map((ch) => (
        <button
          key={ch}
          type="button"
          // onMouseDown + preventDefault keeps the input focused (no blur/refocus flicker).
          onMouseDown={(e) => {
            e.preventDefault()
            insert(ch)
          }}
          className="h-9 w-9 rounded-card border border-line bg-card font-serif text-[16px] text-ink transition-colors hover:border-accent hover:text-accent active:bg-tint"
        >
          {ch}
        </button>
      ))}
    </div>
  )
}
