import Image from 'next/image'
import Display from '../Display'

// Shared post-answer reveal (Paco + Spanish verdict) used by FillInBlank + MultipleChoice so the
// feedback reads identically across question types. The verdict FACE is Fraunces, routed through
// the Display allowlist gate (never raw Fraunces). Colour comes from the caller side per verdict:
// correct = sage, close (¡Casi!) = NEUTRAL ink (color rule §6), wrong = gentle terra.
export type Verdict = 'correct' | 'close' | 'wrong'

const META: Record<Verdict, { img: string; excl: string; kind: 'esoEs' | 'casi' | 'uy'; color: string }> = {
  correct: { img: '/paco-feliz.png', excl: '¡Eso es!', kind: 'esoEs', color: 'text-ok' },
  // ¡Casi! is chromatically NEUTRAL (ink) — not amber/sage/terra (Fix #2). Pensando carries warmth.
  close: { img: '/paco-pensando.png', excl: '¡Casi!', kind: 'casi', color: 'text-ink' },
  // ¡Uy! uses Pensando too (board) — the app's voice surfaces the answer, it doesn't punish.
  wrong: { img: '/paco-pensando.png', excl: '¡Uy!', kind: 'uy', color: 'text-err' },
}

export default function ResultReveal({ verdict, note }: { verdict: Verdict; note?: string | null }) {
  const m = META[verdict]
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
