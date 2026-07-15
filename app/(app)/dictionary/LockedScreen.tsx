import Image from 'next/image'
import { DICTIONARY_UNLOCK_THRESHOLD } from '@/lib/dictionary'
import { resolveChrome, DICT_CHROME, type ImmersionMode } from '@/lib/immersion'

// Shown at /dictionary while the unlock flag is unset (reached from the locked pill or the
// locked Home card). Anticipation, never punitive — progress is the live memorized count
// toward the threshold. Re-skinned to board ③: Pensando + a calm progress card.
export default function LockedScreen({ memorizedCount, mode = 'fr_es' }: { memorizedCount: number; mode?: ImmersionMode }) {
  const x = Math.min(memorizedCount, DICTIONARY_UNLOCK_THRESHOLD)
  const remaining = Math.max(DICTIONARY_UNLOCK_THRESHOLD - x, 0)
  const pct = (x / DICTIONARY_UNLOCK_THRESHOLD) * 100
  const encouragement =
    mode === 'fr_es'
      ? remaining === 1 ? 'Plus qu’un — tu y es presque.' : `Plus que ${remaining} — tu y es presque.`
      : remaining === 1 ? 'Solo una más — ya casi estás.' : `Solo ${remaining} más — ya casi estás.`

  return (
    <div className="flex flex-col flex-1 items-center justify-center px-9 pb-14 text-center">
      <Image src="/paco-pensando.png" alt="Paco" width={128} height={128} className="object-contain" />
      <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-accent mt-4">{resolveChrome(DICT_CHROME.personalLexicon, mode)}</p>
      <h1 className="font-serif text-[27px] font-bold text-ink leading-[1.12] tracking-[-0.02em] mt-2">
        {resolveChrome(DICT_CHROME.dictWaits, mode)}
      </h1>
      <p className="text-[14.5px] text-muted leading-relaxed max-w-[290px] mt-3">
        {resolveChrome(DICT_CHROME.lockedBody, mode)}
      </p>

      <div className="w-full max-w-[300px] mt-[30px] bg-card border border-line rounded-2xl shadow-card px-[18px] pt-[18px] pb-5">
        <div className="flex items-baseline justify-between mb-2.5">
          <span className="text-[13.5px] font-bold tracking-[0.02em] text-muted tabular-nums">
            {x} / {DICTIONARY_UNLOCK_THRESHOLD} {mode === 'fr_es' ? 'mémorisés' : 'memorizadas'}
          </span>
          <span className="text-[13px] text-faint">
            {mode === 'fr_es'
              ? `${remaining} restant${remaining !== 1 ? 's' : ''}`
              : `${remaining} restante${remaining !== 1 ? 's' : ''}`}
          </span>
        </div>
        <div className="h-[9px] rounded-full bg-surface-alt border border-tinted-border overflow-hidden">
          <div className="h-full bg-accent rounded-full transition-[width]" style={{ width: `${pct}%` }} />
        </div>
        {remaining > 0 && (
          <p className="font-serif text-[15px] italic text-amber-deep mt-3.5">{encouragement}</p>
        )}
      </div>
    </div>
  )
}
