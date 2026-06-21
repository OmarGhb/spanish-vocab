'use client'

import Image from 'next/image'
import { useEffect, useRef } from 'react'
import Display from '../Display'
import { useSettings } from '../SettingsProvider'

// Shared post-answer reveal (Paco + Spanish verdict) used by FillInBlank + MultipleChoice so the
// feedback reads identically across question types. The verdict FACE is Fraunces, routed through
// the Display allowlist gate (never raw Fraunces). Colour comes from the caller side per verdict:
// correct = sage, close (¡Casi!) = NEUTRAL ink (color rule §6), wrong = gentle terra.
//
// This is also the single "answer revealed" chokepoint for both question types, so it carries
// "Lecture auto à la révélation": when the toggle is on and the card has cached audio, the word
// is pronounced once on reveal — applying the same playbackRate (over the baked-0.9 MP3) the
// manual AudioButton uses. Reveal is user-initiated, so browser autoplay policy won't block it.
export type Verdict = 'correct' | 'close' | 'wrong'

const META: Record<Verdict, { img: string; excl: string; kind: 'esoEs' | 'casi' | 'uy'; color: string }> = {
  correct: { img: '/paco-feliz.png', excl: '¡Eso es!', kind: 'esoEs', color: 'text-ok' },
  // ¡Casi! is chromatically NEUTRAL (ink) — not amber/sage/terra (Fix #2). Pensando carries warmth.
  close: { img: '/paco-pensando.png', excl: '¡Casi!', kind: 'casi', color: 'text-ink' },
  // ¡Uy! uses Pensando too (board) — the app's voice surfaces the answer, it doesn't punish.
  wrong: { img: '/paco-pensando.png', excl: '¡Uy!', kind: 'uy', color: 'text-err' },
}

export default function ResultReveal({
  verdict,
  note,
  audioUrl,
}: {
  verdict: Verdict
  note?: string | null
  audioUrl?: string
}) {
  const m = META[verdict]
  const { autoplayAudio, playbackRate } = useSettings()

  // Fire ONCE on reveal (mount). Guarded so a re-render can't replay; cleaned up on unmount.
  const playedRef = useRef(false)
  useEffect(() => {
    if (playedRef.current || !autoplayAudio || !audioUrl) return
    playedRef.current = true
    const audio = new Audio(audioUrl)
    audio.playbackRate = playbackRate // preservesPitch stays at its default (true)
    void audio.play().catch(() => {})
    return () => audio.pause()
  }, [autoplayAudio, audioUrl, playbackRate])

  return (
    <div className="fade-up flex items-end gap-3.5">
      <Image src={m.img} alt="Paco" width={58} height={58} className="object-contain shrink-0" />
      <div className="pb-1.5">
        <Display kind={m.kind} className={`text-[34px] leading-none ${m.color}`}>{m.excl}</Display>
        {note && <p className="mt-1 text-[13px] text-muted">{note}</p>}
      </div>
    </div>
  )
}
