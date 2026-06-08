import { getMasteryGauge, type WordCard } from '@/lib/word-status'

// §06 (board "Mots" cluster) — the MASTERY axis: a horizontal 4-dot gauge, neutral fill,
// on every row (right column, centered under the status pill) + the detail header.
// Filled = ink, empty = transparent + a hairline border. NO sage "maîtrisé" dot — sage is
// reserved for the Mémorisé pill. Level is getMasteryGauge (presentation-only over
// stability): 0 (New) → 4 (Mémorisé), every step reachable.
export default function MasteryGauge({ card }: { card: WordCard | null }) {
  const level = getMasteryGauge(card)
  return (
    <span className="inline-flex gap-1" aria-label={`Maîtrise ${level} sur 4`}>
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
