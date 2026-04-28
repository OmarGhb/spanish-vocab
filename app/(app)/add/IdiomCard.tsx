'use client'

import { useState } from 'react'
import Image from 'next/image'
import type { Idiom, IdiomOrigin } from '@/lib/idioms'

const FLAGS: Record<IdiomOrigin, string> = {
  es:        '🇪🇸',
  mx:        '🇲🇽',
  ar:        '🇦🇷',
  co:        '🇨🇴',
  cl:        '🇨🇱',
  pe:        '🇵🇪',
  latam:     '🌎',
  universal: '',
}

const LABELS: Partial<Record<IdiomOrigin, string>> = {
  latam: 'AMÉRIQUE LATINE',
  es:    'ESPAGNE',
  mx:    'MEXIQUE',
  ar:    'ARGENTINE',
  co:    'COLOMBIE',
  cl:    'CHILI',
  pe:    'PÉROU',
}

function OriginTag({ origin }: { origin: IdiomOrigin[] }) {
  if (origin.length === 1 && origin[0] === 'universal') return null

  let badge: string
  if (origin.length === 1) {
    const key = origin[0]
    const flag = FLAGS[key]
    const label = LABELS[key]
    badge = label ? `${flag} ${label}` : flag
  } else {
    badge = origin.map((o) => FLAGS[o]).join(' ')
  }

  return (
    <span className="bg-tint/40 px-2 py-0.5 rounded-md text-xs uppercase tracking-widest text-muted">
      ORIGINE : {badge}
    </span>
  )
}

type Props = { idiom: Idiom }

export default function IdiomCard({ idiom }: Props) {
  const [imgError, setImgError] = useState(false)

  return (
    <div className="bg-card rounded-card shadow-card overflow-hidden">
      {/* Image block — falls back to colored placeholder if file is missing */}
      {!imgError ? (
        <div className="relative w-full aspect-video">
          <Image
            src={`/idioms/${idiom.id}.jpg`}
            alt=""
            fill
            sizes="430px"
            className="object-cover"
            onError={() => setImgError(true)}
          />
        </div>
      ) : (
        <div className="w-full aspect-video bg-tint flex items-center justify-center">
          <span className="text-accent/30 text-4xl select-none">¿</span>
        </div>
      )}

      <div className="p-5 flex flex-col gap-3">
        {/* Header row: label left, origin badge right */}
        <div className="flex justify-between items-center">
          <p className="text-xs uppercase tracking-widest text-muted">Le saviez-vous ?</p>
          <OriginTag origin={idiom.origin} />
        </div>

        {/* Phrase */}
        <p className="font-serif text-xl font-bold text-ink leading-snug">{idiom.phrase}</p>

        {/* Literal translation */}
        <p className="font-serif italic text-sm text-muted">Lit. : {idiom.literal}</p>

        {/* Meaning */}
        <p className="font-serif text-base text-ink">{idiom.meaning}</p>

        {/* Explanation */}
        <p className="text-sm text-muted leading-relaxed">{idiom.explanation}</p>
      </div>
    </div>
  )
}
