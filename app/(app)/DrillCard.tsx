import Image from 'next/image'
import Link from 'next/link'
import { Lock } from 'lucide-react'
import { DRILL_UNLOCK_THRESHOLD } from '@/lib/drill'

// Home entry card for the verb-conjugation drill (M5.3c). Active at ≥5 trusted deck verbs → links
// into /drill; soft-locked below that → greyed card + "N / 5 verbes ajoutés", not a link. Also
// rendered (locked variant) on /drill itself for deep-links. Pure presentation — `count` is the
// trusted-verb count computed server-side via buildDrillPool.
export default function DrillCard({ count }: { count: number }) {
  const unlocked = count >= DRILL_UNLOCK_THRESHOLD

  if (!unlocked) {
    return (
      <div className="bg-surface-alt border border-line rounded-card p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1">
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted">
              Nouveau · entraînement
            </p>
            <h2 className="mt-2 font-serif text-[28px] font-bold leading-none tracking-[-0.02em] text-muted">
              Conjugaison
            </h2>
            <p className="mt-2 text-[13.5px] leading-relaxed text-muted max-w-[26ch]">
              Ajoute quelques verbes pour débloquer l&apos;entraînement.
            </p>
          </div>
          <Image
            src="/paco-feliz.png"
            alt="Paco"
            width={72}
            height={72}
            className="object-contain shrink-0 opacity-50 grayscale"
          />
        </div>
        <div className="mt-4 flex items-center justify-center gap-2 rounded-card border border-line bg-card/60 py-3">
          <Lock size={15} strokeWidth={1.8} className="text-muted" />
          <span className="text-sm font-semibold text-muted">
            {Math.min(count, DRILL_UNLOCK_THRESHOLD)} / {DRILL_UNLOCK_THRESHOLD} verbes ajoutés
          </span>
        </div>
      </div>
    )
  }

  return (
    <Link href="/drill" className="block bg-card border border-line rounded-card p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-accent">
            Nouveau · entraînement
          </p>
          <h2 className="mt-2 font-serif text-[28px] font-bold leading-none tracking-[-0.02em] text-ink">
            Conjugaison
          </h2>
          <p className="mt-2 text-[13.5px] leading-relaxed text-muted max-w-[26ch]">
            Révise tes verbes en contexte — un temps, une personne, une phrase à compléter.
          </p>
        </div>
        <Image src="/paco-feliz.png" alt="Paco" width={72} height={72} className="object-contain shrink-0" />
      </div>
      <span className="mt-4 block rounded-card bg-accent py-3.5 text-center font-serif text-sm font-bold text-white">
        S&apos;entraîner →
      </span>
    </Link>
  )
}
