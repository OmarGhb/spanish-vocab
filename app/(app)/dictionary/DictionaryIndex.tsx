'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { AZ_BUCKETS, groupAZ, type Bucket, type DictionaryEntry } from '@/lib/dictionary'
import AudioButton from '../AudioButton'

// Offset for the sticky top nav (matches the sections' scroll-mt-28 ≈ 112px) — used both
// for scrollIntoView landing (via scroll-mt) and for resolving the active letter on scroll.
const NAV_OFFSET = 112

// A–Z reference of memorized words: word + Spanish gloss + audio, grouped by initial,
// with an iOS-contacts jump rail. No status pills / meter / due-tint / reps / filters / sorts.
export default function DictionaryIndex({ entries }: { entries: DictionaryEntry[] }) {
  const sections = groupAZ(entries)
  const present = new Set<Bucket>(sections.map((s) => s.letter))
  const sectionRefs = useRef<Map<Bucket, HTMLElement | null>>(new Map())
  const railRef = useRef<HTMLDivElement>(null)
  const scrubbing = useRef(false)
  const lastLetter = useRef<Bucket | null>(null)
  const [activeLetter, setActiveLetter] = useState<Bucket | null>(null)

  // Rail shows every letter; '#' only when there are non-letter initials.
  const railLetters: Bucket[] = [...AZ_BUCKETS, ...(present.has('#') ? (['#'] as Bucket[]) : [])]
  const sectionKey = sections.map((s) => s.letter).join('')

  function nearestPresent(index: number): Bucket | null {
    for (let d = 0; d < railLetters.length; d++) {
      const before = railLetters[index - d]
      if (before && present.has(before)) return before
      const after = railLetters[index + d]
      if (after && present.has(after)) return after
    }
    return null
  }

  function scrollToLetter(letter: Bucket) {
    // Instant (not smooth): during a continuous scrub, smooth scrolls queue up and fight
    // the finger. scroll-mt-28 on the section lands it below the sticky nav.
    sectionRefs.current.get(letter)?.scrollIntoView({ behavior: 'auto', block: 'start' })
  }

  // Map the pointer Y over the rail strip to a letter, snap to the nearest present one, and
  // scroll there — but only when the resolved letter changes, to avoid churn during a drag.
  function jumpFromY(clientY: number) {
    const rail = railRef.current
    if (!rail) return
    const rect = rail.getBoundingClientRect()
    const ratio = (clientY - rect.top) / rect.height
    const idx = Math.max(0, Math.min(railLetters.length - 1, Math.floor(ratio * railLetters.length)))
    const letter = nearestPresent(idx)
    if (!letter || letter === lastLetter.current) return
    lastLetter.current = letter
    setActiveLetter(letter)
    scrollToLetter(letter)
  }

  // Keep the active letter in sync when the user scrolls the list by hand (rAF-throttled).
  useEffect(() => {
    let frame = 0
    function sync() {
      frame = 0
      let current: Bucket | null = null
      for (const { letter } of sections) {
        const el = sectionRefs.current.get(letter)
        if (el && el.getBoundingClientRect().top <= NAV_OFFSET + 1) current = letter
      }
      if (!current && sections.length > 0) current = sections[0].letter
      setActiveLetter((prev) => (prev === current ? prev : current))
    }
    function onScroll() {
      if (frame === 0) frame = requestAnimationFrame(sync)
    }
    sync()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', onScroll)
      if (frame !== 0) cancelAnimationFrame(frame)
    }
    // sectionKey captures the set/order of sections; refs are read live from the ref map.
  }, [sectionKey]) // eslint-disable-line react-hooks/exhaustive-deps

  const count = entries.length

  return (
    <div className="flex flex-col flex-1">
      <div className="pl-5 pr-9 pt-3 pb-10 flex flex-col gap-5">
        {/* Header — no back chevron (top-level pill destination) */}
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-accent">Lexique personnel</p>
          <h1 className="font-serif text-3xl font-bold text-ink leading-none mt-1.5">Dictionnaire</h1>
          <p className="text-sm text-muted mt-1.5">
            {count} mot{count !== 1 ? 's' : ''} dans ton dictionnaire
          </p>
        </div>

        {/* A–Z sections */}
        {sections.map((section) => (
          <section
            key={section.letter}
            ref={(el) => {
              sectionRefs.current.set(section.letter, el)
            }}
            className="scroll-mt-28"
          >
            <h2 className="font-serif text-sm font-bold text-accent mb-1 px-1">{section.letter}</h2>
            <ul className="flex flex-col">
              {section.entries.map((e) => (
                <li key={e.id} className="flex items-center gap-3 border-b border-line px-1 py-3">
                  {/* Row taps to the fiche; audio is a SEPARATE sibling tap target. */}
                  <Link href={`/words/${e.id}`} className="flex-1 min-w-0">
                    <p className="font-serif text-lg font-bold text-ink leading-none tracking-[-0.02em]">
                      {e.word}
                    </p>
                    {e.defEs && <p className="text-xs text-muted italic mt-[3px] line-clamp-1">{e.defEs}</p>}
                  </Link>
                  <AudioButton word={e.word} audioUrl={e.audioUrl} />
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>

      {/* Jump rail — viewport-fixed, centered like the content column so it pins to the column's
          right edge (not the window edge) and stays visible at any scroll position. The wrapper is
          click-through; only the strip is interactive, so it never occludes row tap targets. */}
      <div
        className="fixed inset-y-0 left-1/2 w-full max-w-[430px] -translate-x-1/2 z-20 pointer-events-none flex items-center justify-end"
        style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <div
          ref={railRef}
          aria-hidden
          className="pointer-events-auto touch-none select-none flex flex-col items-center pr-1.5 py-2"
          onPointerDown={(ev) => {
            ev.preventDefault()
            scrubbing.current = true
            lastLetter.current = null
            ev.currentTarget.setPointerCapture(ev.pointerId)
            jumpFromY(ev.clientY)
          }}
          onPointerMove={(ev) => {
            if (!scrubbing.current) return
            ev.preventDefault()
            jumpFromY(ev.clientY)
          }}
          onPointerUp={() => {
            scrubbing.current = false
          }}
          onPointerCancel={() => {
            scrubbing.current = false
          }}
        >
          {railLetters.map((letter) => {
            const enabled = present.has(letter)
            const active = enabled && letter === activeLetter
            return (
              <span
                key={letter}
                className={`w-4 text-center text-[9px] font-bold leading-[1.15] transition-transform ${
                  active ? 'text-accent scale-125' : enabled ? 'text-accent' : 'text-line'
                }`}
              >
                {letter}
              </span>
            )
          })}
        </div>
      </div>
    </div>
  )
}
