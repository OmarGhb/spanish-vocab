import Link from 'next/link'
import { isDue, type WordCard } from '@/lib/word-status'
import StatusPill from './StatusPill'
import FamiliarityMeter from './FamiliarityMeter'

// Shared list row, used by /words and the Home preview:
// [familiarity meter] · [word + italic meaning] · [status pill + review count].
// Due rows get a tinted background + accent border to give the list a rhythm.
export default function WordRow({
  id,
  word,
  defEs,
  card,
  reps,
}: {
  id: string
  word: string
  defEs: string
  card: WordCard | null
  reps: number
}) {
  const action = isDue(card)
  return (
    <li>
      <Link
        href={`/words/${id}`}
        className={`flex items-center gap-3 rounded-card border px-3.5 py-3 ${
          action ? 'bg-tint border-accent' : 'bg-card border-line'
        }`}
      >
        <FamiliarityMeter card={card} />
        <div className="flex-1 min-w-0">
          <p className="font-serif text-lg font-bold text-ink leading-none tracking-[-0.02em]">{word}</p>
          {defEs && <p className="text-xs text-muted italic mt-[3px] line-clamp-1">{defEs}</p>}
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0">
          <StatusPill card={card} />
          <p className="text-[10px] text-muted whitespace-nowrap">
            {reps} révision{reps >= 2 ? 's' : ''}
          </p>
        </div>
      </Link>
    </li>
  )
}
