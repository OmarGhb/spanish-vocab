import Image from 'next/image'

// Shared post-answer reveal (Paco + Spanish exclamation, ¡Listo! type convention) used by
// both FillInBlank and MultipleChoice so the feedback reads identically across question types.
export type Verdict = 'correct' | 'close' | 'wrong'

const META: Record<Verdict, { img: string; excl: string; color: string }> = {
  correct: { img: '/paco-feliz.png', excl: '¡Eso es!', color: 'text-ok' },
  close: { img: '/paco-pensando.png', excl: '¡Casi!', color: 'text-warm' },
  wrong: { img: '/paco-sad.png', excl: '¡Uy!', color: 'text-err' },
}

export default function ResultReveal({ verdict, note }: { verdict: Verdict; note?: string | null }) {
  const m = META[verdict]
  return (
    <div className="fade-up flex items-end gap-3.5">
      <Image src={m.img} alt="Paco" width={72} height={72} className="object-contain shrink-0" />
      <div className="pb-1.5">
        <p className={`font-serif text-[2.375rem] font-bold italic leading-none tracking-[-0.02em] ${m.color}`}>
          {m.excl}
        </p>
        {note && <p className="mt-1 text-[13px] text-muted">{note}</p>}
      </div>
    </div>
  )
}
