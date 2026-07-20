'use client'

import { useEffect, useRef } from 'react'
import type { RefObject } from 'react'
import { insertAtCaret } from '@/lib/caret'

// Insert a character into a CONTROLLED input at its caret, then restore the caret after React
// re-renders the controlled value (which otherwise resets it to the end). Shared by the desktop
// AccentBar and the mobile scramble tiles so the caret-restore logic isn't duplicated.
//
// Focus rule (v0.12.17): PRESERVE focus if the input already has it — the caller's
// onPointerDown/onMouseDown + preventDefault does that — but NEVER programmatically ACQUIRE it. So
// tapping a hint tile while the keyboard is dismissed inserts the letter WITHOUT re-summoning the soft
// keyboard. When the input is focused → insert at the caret and restore it; when it's not → append at
// end and skip the caret-restore entirely, so nothing (focus() or setSelectionRange) can pull the
// keyboard back. The keyboard returns only when the user deliberately taps the input/blank.
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
    if (el && document.activeElement === el) {
      // Focused → insert at the live caret; the effect restores it while focus stays put.
      const start = el.selectionStart ?? value.length
      const end = el.selectionEnd ?? value.length
      const next = insertAtCaret(value, start, end, ch)
      caret.current = next.caret
      onChange(next.value)
      // No el.focus() — preventDefault on the trigger already preserved the existing focus.
    } else {
      // Not focused (keyboard dismissed) → append at end; no focus() / setSelectionRange so the soft
      // keyboard stays down.
      caret.current = null
      onChange(value + ch)
    }
  }
}
