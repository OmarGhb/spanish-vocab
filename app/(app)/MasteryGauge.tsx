import { getMasteryGauge, type WordCard } from '@/lib/word-status'
import type { ImmersionMode } from '@/lib/immersion'

// §06 (board "Mots" cluster) — the MASTERY axis: a horizontal 4-dot gauge, neutral fill,
// on every row (right column, centered under the status pill) + the detail header.
// Filled = ink, empty = transparent + a hairline border. NO sage "maîtrisé" dot — sage is
// reserved for the Mémorisé pill. Level is getMasteryGauge (presentation-only over
// stability): 0 (New) → 4 (Mémorisé), every step reachable. The aria-label is progress-framed
// "Mémorisation" (NOT "Maîtrise" — the Mémorisé-not-Maîtrisé rule), mode-aware (M6.1c).
export default function MasteryGauge({ card, mode = 'fr_es' }: { card: WordCard | null; mode?: ImmersionMode }) {
  const level = getMasteryGauge(card)
  const aria = mode === 'fr_es' ? `Mémorisation : ${level} / 4` : `Memorización : ${level} / 4`
  return (
    <span className="inline-flex gap-1" aria-label={aria}>
      {[0, 1, 2, 3].map((i) => (
        <span
          key={i}
          className={`w-[7px] h-[7px] rounded-full ${
            i < level ? 'bg-ink' : 'border-[1.5px] border-line'
          }`}
        />
      ))}
    </span>
  )
}
