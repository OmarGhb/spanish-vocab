import { getFamiliarity, getWordStatus, type WordCard } from '@/lib/word-status'

// Vertical three-dot strength meter, filled bottom-up. The number of filled dots
// is getFamiliarity; their colour matches the word's status (getWordStatus.dot),
// empty dots stay on the line tone. Level and colour are independent signals.
export default function FamiliarityMeter({ card }: { card: WordCard | null }) {
  const level = getFamiliarity(card)
  const { dot } = getWordStatus(card)
  return (
    <div className="flex flex-col items-center gap-[3px]" aria-label={`Familiarité ${level}/3`}>
      {[2, 1, 0].map((lvl) => (
        <span
          key={lvl}
          className={`w-1.5 h-1.5 rounded-full ${lvl < level ? dot : 'bg-line'}`}
        />
      ))}
    </div>
  )
}
