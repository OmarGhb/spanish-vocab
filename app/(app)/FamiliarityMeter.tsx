import { getFamiliarity, type WordCard } from '@/lib/word-status'

// Vertical three-dot strength meter, filled bottom-up. Neutral single tone
// (filled = ink, empty = line) — deliberately NOT multi-color, and independent
// of the status pill. Dots reflect getFamiliarity; the pill reflects
// getWordStatus; the two may diverge.
export default function FamiliarityMeter({ card }: { card: WordCard | null }) {
  const level = getFamiliarity(card)
  return (
    <div className="flex flex-col items-center gap-[3px]" aria-label={`Familiarité ${level}/3`}>
      {[2, 1, 0].map((lvl) => (
        <span
          key={lvl}
          className={`w-1.5 h-1.5 rounded-full ${lvl < level ? 'bg-ink' : 'bg-line'}`}
        />
      ))}
    </div>
  )
}
