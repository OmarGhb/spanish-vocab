'use client'

import { useEffect, useRef } from 'react'
import type { RefObject } from 'react'
import { insertAtCaret } from '@/lib/caret'

// Insert a character into a CONTROLLED input at its caret (or over its selection), then restore the
// caret after React re-renders the controlled value — which otherwise resets it to the end. Returns a
// stable-enough `insert(ch)` (recreated per render, which is fine: it's only called in event
// handlers). Shared by the desktop AccentBar and the mobile scramble tiles so the caret-restore
// logic isn't duplicated. Callers keep the input focused (onPointerDown/onMouseDown + preventDefault)
// so the soft keyboard stays up; `insert` also refocuses defensively.
export function useCaretInsert(
  inputRef: RefObject<HTMLInputElement | null>,
  value: string,
  onChange: (v: string) => void,
): (ch: string) => void {
  const caret = useRef<number | null>(null)

  useEffect(() => {
    if (caret.current != null && inputRef.current) {
      inputRef.current.setSelectionRange(caret.current, caret.current)
      caret.current = null
    }
  }, [value, inputRef])

  return (ch: string) => {
    const el = inputRef.current
    const start = el?.selectionStart ?? value.length
    const end = el?.selectionEnd ?? value.length
    const next = insertAtCaret(value, start, end, ch)
    caret.current = next.caret
    onChange(next.value)
    el?.focus()
  }
}
