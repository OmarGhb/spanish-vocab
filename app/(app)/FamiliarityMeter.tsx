import { getFamiliarity, type WordCard } from '@/lib/word-status'

// Three-dot strength meter. Neutral single tone (filled = muted, empty = line) —
// deliberately NOT multi-color, and independent of the status pill. Dots reflect
// getFamiliarity; the pill reflects getWordStatus; the two may diverge.
export default function FamiliarityMeter({
  card,
  className = '',
}: {
  card: WordCard | null
  className?: string
}) {
  const level = getFamiliarity(card)
  return (
    <div
      className={`flex items-center gap-1${className ? ` ${className}` : ''}`}
      aria-label={`Familiarité ${level}/3`}
    >
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className={`w-1.5 h-1.5 rounded-full ${i < level ? 'bg-muted' : 'bg-line'}`}
        />
      ))}
    </div>
  )
}
