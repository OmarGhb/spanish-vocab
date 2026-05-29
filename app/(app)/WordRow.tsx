import Link from 'next/link'
import type { WordCard } from '@/lib/word-status'
import StatusPill from './StatusPill'
import FamiliarityMeter from './FamiliarityMeter'

// Shared list row: Spanish word + one-line muted French-free meaning preview +
// status pill + familiarity meter. Used by the /words list and the Home preview.
export default function WordRow({
  id,
  word,
  defEs,
  card,
}: {
  id: string
  word: string
  defEs: string
  card: WordCard | null
}) {
  return (
    <li className="bg-card rounded-card shadow-card">
      <Link href={`/words/${id}`} className="flex items-center justify-between gap-3 px-4 py-3">
        <div className="min-w-0">
          <p className="font-serif text-sm font-bold text-ink">{word}</p>
          {defEs && <p className="text-xs text-muted mt-0.5 line-clamp-1">{defEs}</p>}
        </div>
        <div className="flex flex-col items-end gap-1.5 shrink-0">
          <StatusPill card={card} />
          <FamiliarityMeter card={card} />
        </div>
      </Link>
    </li>
  )
}
