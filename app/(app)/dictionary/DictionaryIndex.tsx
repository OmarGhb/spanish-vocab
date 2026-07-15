'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { AZ_BUCKETS, groupAZ, type Bucket, type DictionaryEntry } from '@/lib/dictionary'
import { resolveChrome, DICT_CHROME, NAV_CHROME, type ImmersionMode } from '@/lib/immersion'
import AudioButton from '../AudioButton'

// Offset for the sticky top nav (matches the sections' scroll-mt-28 ≈ 112px) — used both
// for scrollIntoView landing (via scroll-mt) and for resolving the active letter on scroll.
const NAV_OFFSET = 112

// A–Z reference of memorized words: word + Spanish gloss + audio, grouped by initial, with
// an iOS-contacts jump rail (+ held magnify bubble). No status pills / meter / due-tint /
// reps / filters / sorts. The row gloss is the Spanish sense (definition.es): this is an
// index of words the user has ALREADY memorized, so Spanish reinforces the learning frame;
// the French stays available at the word fiche.
export default function DictionaryIndex({ entries, mode = 'fr_es' }: { entries: DictionaryEntry[]; mode?: ImmersionMode }) {
  const sections = groupAZ(entries)
  const present = new Set<Bucket>(sections.map((s) => s.letter))
  const sectionRefs = useRef<Map<Bucket, HTMLElement | null>>(new Map())
  const railRef = useRef<HTMLDivElement>(null)
  const scrubbing = useRef(false)
  const lastLetter = useRef<Bucket | null>(null)
  const [activeLetter, setActiveLetter] = useState<Bucket | null>(null)
  // Held (scrub) state — drives the amber rail pill + the floating magnify bubble. Distinct
  // from activeLetter (which also tracks passive hand-scroll); null whenever not scrubbing.
  const [heldLetter, setHeldLetter] = useState<Bucket | null>(null)
  const [heldY, setHeldY] = useState(0)

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
  // scroll there. The magnify bubble tracks the finger (heldY); the scroll only fires when
  // the resolved letter changes, to avoid churn during a drag.
  function jumpFromY(clientY: number) {
    const rail = railRef.current
    if (!rail) return
    const rect = rail.getBoundingClientRect()
    const ratio = (clientY - rect.top) / rect.height
    const idx = Math.max(0, Math.min(railLetters.length - 1, Math.floor(ratio * railLetters.length)))
    const letter = nearestPresent(idx)
    if (!letter) return
    setHeldLetter(letter)
    setHeldY(Math.max(rect.top, Math.min(rect.bottom, clientY)))
    if (letter === lastLetter.current) return
    lastLetter.current = letter
    setActiveLetter(letter)
    scrollToLetter(letter)
  }

  function endScrub() {
    scrubbing.current = false
    setHeldLetter(null)
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
      <div className="pl-[22px] pr-[30px] pt-1.5 pb-10 flex flex-col">
        {/* Masthead — no back chevron (top-level pill destination) */}
        <div className="pb-3">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-accent">{resolveChrome(DICT_CHROME.personalLexicon, mode)}</p>
          <h1 className="font-serif text-[34px] font-bold text-ink leading-none tracking-[-0.025em] mt-1.5">
            {resolveChrome(NAV_CHROME.dictionary, mode)}
          </h1>
          <p className="text-[13.5px] text-muted mt-[7px]">
            {mode === 'fr_es'
              ? `${count} mot${count !== 1 ? 's' : ''} dans ton dictionnaire`
              : `${count} palabra${count !== 1 ? 's' : ''} en tu diccionario`}
          </p>
        </div>
        <div className="h-px bg-hair" />

        {/* A–Z sections */}
        {sections.map((section) => (
          <section
            key={section.letter}
            ref={(el) => {
              sectionRefs.current.set(section.letter, el)
            }}
            className="scroll-mt-28"
          >
            <div className="flex items-center gap-3 pt-4 pb-1">
              <span className="font-serif text-base font-bold italic text-accent">{section.letter}</span>
              <span className="flex-1 h-px bg-hair" />
            </div>
            <ul className="flex flex-col">
              {section.entries.map((e) => (
                <li key={e.id} className="flex items-center gap-3.5 border-b border-hair py-3">
                  {/* Row taps to the fiche; audio is a SEPARATE sibling tap target. */}
                  <Link href={`/words/${e.id}`} className="press-row flex-1 min-w-0">
                    <p className="font-serif text-xl font-bold text-ink leading-[1.15] tracking-[-0.01em]">
                      {e.word}
                    </p>
                    {e.defEs && (
                      <p className="font-serif text-sm italic text-muted mt-0.5 whitespace-nowrap overflow-hidden text-ellipsis">
                        {e.defEs}
                      </p>
                    )}
                  </Link>
                  <AudioButton word={e.word} audioUrl={e.audioUrl} variant="circle" />
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>

      {/* Bottom fade — implies the list continues below the fold (cosmetic scroll hint).
          Viewport-fixed, pinned to the column, click-through. */}
      <div
        className="fixed inset-x-0 bottom-0 mx-auto w-full max-w-[430px] h-10 z-10 pointer-events-none"
        style={{ background: 'linear-gradient(180deg, transparent, var(--color-page))' }}
      />

      {/* Jump rail — viewport-fixed, centered like the content column so it pins to the column's
          right edge (not the window edge) and stays visible at any scroll position. The wrapper is
          click-through; only the strip is interactive, so it never occludes row tap targets. */}
      <div
        className="fixed inset-y-0 left-1/2 w-full max-w-[430px] -translate-x-1/2 z-20 pointer-events-none flex items-center justify-end"
        style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        {/* Magnify bubble — iOS-Contacts: a large amber letter that tracks the finger while held. */}
        {heldLetter && (
          <div
            className="absolute right-[34px] -translate-y-1/2 flex items-center"
            style={{ top: heldY }}
          >
            <span
              className="w-[62px] h-[62px] rounded-full bg-accent text-ivory grid place-items-center font-serif text-[32px] font-bold italic leading-none"
              style={{ boxShadow: '0 6px 20px rgba(154,90,28,0.34)' }}
            >
              {heldLetter}
            </span>
            <span
              className="w-0 h-0"
              style={{
                borderTop: '7px solid transparent',
                borderBottom: '7px solid transparent',
                borderLeft: '9px solid var(--color-accent)',
              }}
            />
          </div>
        )}

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
          onPointerUp={endScrub}
          onPointerCancel={endScrub}
        >
          {railLetters.map((letter) => {
            const enabled = present.has(letter)
            const held = letter === heldLetter
            const active = enabled && letter === activeLetter
            return (
              <span
                key={letter}
                className={`flex items-center justify-center leading-none transition-all shrink-0 ${
                  held
                    ? 'w-[18px] h-[18px] rounded-full bg-accent text-ivory text-[12px] font-bold'
                    : `w-[18px] h-[15px] text-[10px] ${
                        active ? 'text-accent font-bold scale-110' : enabled ? 'text-accent font-bold' : 'text-faint/40 font-medium'
                      }`
                }`}
                style={held ? { boxShadow: 'var(--shadow-amber-sm)' } : undefined}
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
