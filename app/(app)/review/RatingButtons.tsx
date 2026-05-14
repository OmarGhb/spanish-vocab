'use client'

import type { RatingResult } from '@/lib/rating'

type Props = {
  result: RatingResult
  onRate: (r: 1 | 2 | 3 | 4) => void
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

export default function RatingButtons({ result, onRate }: Props) {
  return (
    <div>
      <p className="font-serif text-sm text-ink mb-3">
        Comment tu as trouvé ce mot ?
      </p>
      <div className="flex gap-2">
        {([1, 2, 3, 4] as const).map((r) => (
          <button
            key={r}
            onClick={() => onRate(r)}
            className={`flex-1 rounded-lg py-3 text-xs font-semibold text-ink transition-all ${BG[r]} ${
              r === result.rating
                ? 'opacity-100 ring-2 ring-ink/30 ring-offset-1'
                : 'opacity-55'
            }`}
          >
            {LABELS[r]}
          </button>
        ))}
      </div>
    </div>
  )
}
