'use client'

import type { RatingResult } from '@/lib/rating'

type Props = {
  result: RatingResult
  selectedRating: 1 | 2 | 3 | 4 | null
  onSelect: (r: 1 | 2 | 3 | 4) => void
}

const LABELS: Record<1 | 2 | 3 | 4, string> = {
  1: 'À revoir',
  2: 'Difficile',
  3: 'Bien',
  4: 'Facile',
}

const BG: Record<1 | 2 | 3 | 4, string> = {
  1: 'bg-again',
  2: 'bg-hard',
  3: 'bg-good',
  4: 'bg-easy',
}

export default function RatingButtons({ result, selectedRating, onSelect }: Props) {
  return (
    <div>
      <p className="text-xs text-muted mb-2">
        Suggéré : {LABELS[result.rating]} · {result.reason} · Modifiez si nécessaire
      </p>
      <div className="flex gap-2">
        {([1, 2, 3, 4] as const).map((r) => (
          <button
            key={r}
            onClick={() => onSelect(r)}
            className={`flex-1 rounded-lg py-2 text-xs text-white transition-opacity ${BG[r]} ${
              r === selectedRating ? 'ring-2 ring-offset-1 ring-ink' : 'opacity-55'
            }`}
          >
            {LABELS[r]}
          </button>
        ))}
      </div>
      <p className="text-xs text-muted mt-2">Appuyez sur Entrée pour valider.</p>
    </div>
  )
}
