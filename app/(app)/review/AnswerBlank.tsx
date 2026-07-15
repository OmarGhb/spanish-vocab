'use client'

import { useState } from 'react'
import type { RefObject } from 'react'
import { useSettings } from '../SettingsProvider'
import { resolveChrome, REVIEW_CHROME } from '@/lib/immersion'

type Props = {
  value: string
  onChange: (v: string) => void
  // FillInBlank owns the ref (mount autofocus, blur-on-submit, keyboard scroll-into-view).
  inputRef: RefObject<HTMLInputElement | null>
  onFocus?: () => void
  // Optional first-letter hint shown faint INSIDE the blank while it's empty (écriture Indice
  // tier 1); disappears on type. Drill omits this → unchanged.
  ghost?: string
}

// The write-in blank: a real <input> overlaid transparently on a visible inline blank.
// The input captures keystrokes and raises the native keyboard on tap (still gesture-gated —
// we never auto-open it); its own text + caret are transparent, and the visible span renders
// the typed value plus a faux blinking caret on top. Self-contained so the mechanic can be
// iterated/reverted on its own if iOS fights it, without touching the result card.
// Accents are not handled here (plain text input) — see the custom-keyboard milestone.
export default function AnswerBlank({ value, onChange, inputRef, onFocus, ghost }: Props) {
  // The faux caret only blinks while the input actually holds focus — otherwise an idle blank reads
  // as editable when it isn't (the user thinks they can type but the field is blurred).
  const [focused, setFocused] = useState(false)
  // Aria-label follows the mode (shared by review écriture + drill; both immersion-aware). Reuses the
  // Review "Ta réponse" pair.
  const { immersionMode } = useSettings()
  return (
    <span className="relative inline-block min-w-[64px] border-b-2 border-accent px-1.5 pb-px text-center font-serif font-bold text-accent">
      {/* Visible value + faux caret (clicks fall through to the input on top). */}
      <span className="pointer-events-none whitespace-pre">{value}</span>
      {ghost && !value && <span className="pointer-events-none text-accent/45">{ghost}</span>}
      {focused && <span className="caret" aria-hidden />}
      <input
        ref={inputRef}
        type="text"
        inputMode="text"
        autoCapitalize="off"
        autoCorrect="off"
        autoComplete="off"
        spellCheck={false}
        aria-label={resolveChrome(REVIEW_CHROME.yourAnswer, immersionMode)}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => {
          setFocused(true)
          onFocus?.()
        }}
        onBlur={() => setFocused(false)}
        // Hit area extends past the thin visible blank (transparent input, so the look is unchanged)
        // — a blurred blank is easy to re-tap and start typing again, esp. with a thumb.
        className="absolute -inset-y-3 -inset-x-2 w-[calc(100%+1rem)] border-0 bg-transparent p-0 text-transparent caret-transparent outline-none"
      />
    </span>
  )
}
