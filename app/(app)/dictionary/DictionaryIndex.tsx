'use client'

import Link from 'next/link'
import { useRef } from 'react'
import { AZ_BUCKETS, groupAZ, type Bucket, type DictionaryEntry } from '@/lib/dictionary'
import AudioButton from '../AudioButton'

// A–Z reference of memorized words: word + Spanish gloss + audio, grouped by initial,
// with an iOS-contacts jump rail. No status pills / meter / due-tint / reps / filters / sorts.
export default function DictionaryIndex({ entries }: { entries: DictionaryEntry[] }) {
  const sections = groupAZ(entries)
  const present = new Set<Bucket>(sections.map((s) => s.letter))
  const sectionRefs = useRef<Map<Bucket, HTMLElement | null>>(new Map())
  const railRef = useRef<HTMLDivElement>(null)
  const scrubbing = useRef(false)

  // Rail shows every letter; '#' only when there are non-letter initials.
  const railLetters: Bucket[] = [...AZ_BUCKETS, ...(present.has('#') ? (['#'] as Bucket[]) : [])]

  function nearestPresent(index: number): Bucket | null {
    for (let d = 0; d < railLetters.length; d++) {
      const before = railLetters[index - d]
      if (before && present.has(before)) return before
      const after = railLetters[index + d]
      if (after && present.has(after)) return after
    }
    return null
  }

  function jumpTo(letter: Bucket) {
    sectionRefs.current.get(letter)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  // Pointer-drag scrubbing: map Y within the rail to a letter, snap to the nearest present one.
  function jumpFromY(clientY: number) {
    const rail = railRef.current
    if (!rail) return
    const rect = rail.getBoundingClientRect()
    const ratio = (clientY - rect.top) / rect.height
    const idx = Math.max(0, Math.min(railLetters.length - 1, Math.floor(ratio * railLetters.length)))
    const letter = nearestPresent(idx)
    if (letter) jumpTo(letter)
  }

  const count = entries.length

  return (
    <div className="relative flex flex-col flex-1">
      <div className="px-5 pt-3 pb-10 flex flex-col gap-5">
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

      {/* Jump rail — fixed to the right edge of the content column, vertically centered. */}
      <div
        ref={railRef}
        className="absolute right-0.5 top-1/2 -translate-y-1/2 flex flex-col items-center select-none touch-none"
        onPointerDown={(ev) => {
          scrubbing.current = true
          ev.currentTarget.setPointerCapture(ev.pointerId)
          jumpFromY(ev.clientY)
        }}
        onPointerMove={(ev) => {
          if (scrubbing.current) jumpFromY(ev.clientY)
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
          return (
            <button
              key={letter}
              type="button"
              disabled={!enabled}
              onClick={() => enabled && jumpTo(letter)}
              aria-label={`Aller à ${letter}`}
              className={`text-[9px] font-bold leading-[1.15] w-4 ${
                enabled ? 'text-accent' : 'text-line'
              }`}
            >
              {letter}
            </button>
          )
        })}
      </div>
    </div>
  )
}
