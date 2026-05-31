import Image from 'next/image'
import { DICTIONARY_UNLOCK_THRESHOLD } from '@/lib/dictionary'

// Shown at /dictionary while the unlock flag is unset (reached from the locked pill or
// the locked Home card). Progress is the live memorized count toward the threshold.
export default function LockedScreen({ memorizedCount }: { memorizedCount: number }) {
  const x = Math.min(memorizedCount, DICTIONARY_UNLOCK_THRESHOLD)
  const remaining = Math.max(DICTIONARY_UNLOCK_THRESHOLD - x, 0)
  const pct = (x / DICTIONARY_UNLOCK_THRESHOLD) * 100
  const encouragement =
    remaining === 1
      ? "Plus qu'1 mot — tu y es presque."
      : `Plus que ${remaining} mots — tu y es presque.`

  return (
    <div className="flex flex-col flex-1 items-center justify-center px-8 text-center gap-5">
      <Image src="/paco-pensando.png" alt="Paco" width={120} height={120} className="object-contain" />
      <h1 className="font-serif text-2xl font-bold text-ink">Ton dictionnaire personnel</h1>
      <p className="text-sm text-muted leading-relaxed max-w-[300px]">
        Mémorise 10 mots pour l&apos;ouvrir. Chacun s&apos;y rangera, classé de A à Z — ta collection à toi.
      </p>
      <div className="w-full max-w-[280px] flex flex-col gap-2">
        <div className="h-2 rounded-full bg-surface-alt overflow-hidden">
          <div className="h-full bg-accent rounded-full transition-[width]" style={{ width: `${pct}%` }} />
        </div>
        <p className="text-xs font-semibold text-muted tabular-nums">{x} / 10 mots mémorisés</p>
      </div>
      {remaining > 0 && <p className="text-sm font-serif text-accent">{encouragement}</p>}
    </div>
  )
}
