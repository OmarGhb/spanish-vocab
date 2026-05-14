'use client'

import { useState } from 'react'

type Example = { es: string; fr: string }

type Props = {
  word: string
  defEs: string
  defFr: string | null
  pos?: string
  formAnnotation?: string | null
  examples: Example[]
  distractors: string[]
}

export default function WordDetailContent({ defEs, defFr, formAnnotation, examples, distractors }: Props) {
  const [revealedDefFr, setRevealedDefFr] = useState(false)
  const [revealedFr, setRevealedFr] = useState<boolean[]>(() => new Array(examples.length).fill(false))

  function toggleFr(i: number) {
    setRevealedFr((prev) => prev.map((v, j) => (j === i ? !v : v)))
  }

  return (
    <div className="flex flex-col gap-4">
      {/* FORME */}
      {formAnnotation && (
        <div className="bg-card rounded-card shadow-card p-5">
          <p className="text-xs uppercase tracking-widest text-muted mb-3">Forme</p>
          <p className="font-serif text-sm text-ink leading-relaxed">{formAnnotation}</p>
        </div>
      )}

      {/* DÉFINITION */}
      <div className="bg-card rounded-card shadow-card p-5">
        <p className="text-xs uppercase tracking-widest text-muted mb-3">Définition</p>
        <p className="font-serif text-sm text-ink leading-relaxed">{defEs}</p>
        {defFr && (
          revealedDefFr ? (
            <div className="mt-2">
              <p className="font-serif italic text-sm text-muted">{defFr}</p>
              <button type="button" onClick={() => setRevealedDefFr(false)} className="text-xs text-accent mt-1">
                ↑ Masquer
              </button>
            </div>
          ) : (
            <button type="button" onClick={() => setRevealedDefFr(true)} className="text-xs text-accent mt-2">
              ↓ Voir en français
            </button>
          )
        )}
      </div>

      {/* EXEMPLES */}
      {examples.length > 0 && (
        <div className="bg-card rounded-card shadow-card p-5">
          <p className="text-xs uppercase tracking-widest text-muted mb-4">Exemples</p>
          <ul className="flex flex-col divide-y divide-line">
            {examples.map((ex, i) => (
              <li key={i} className={i > 0 ? 'pt-4 mt-0' : ''}>
                <p className="font-serif text-sm text-ink leading-relaxed">{ex.es}</p>
                {revealedFr[i] ? (
                  <div className="mt-1">
                    <p className="font-serif italic text-sm text-muted">{ex.fr}</p>
                    <button type="button" onClick={() => toggleFr(i)} className="text-xs text-accent mt-1">
                      ↑ Masquer
                    </button>
                  </div>
                ) : (
                  <button type="button" onClick={() => toggleFr(i)} className="text-xs text-accent mt-2">
                    ↓ Traduction
                  </button>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* MOTS SIMILAIRES */}
      {distractors.length > 0 && (
        <div className="bg-card rounded-card shadow-card p-5">
          <p className="text-xs uppercase tracking-widest text-muted mb-3">Mots similaires</p>
          <div className="flex flex-wrap gap-2">
            {distractors.map((d) => (
              <span
                key={d}
                className="text-[10px] uppercase tracking-widest px-3 py-1.5 rounded-full border border-line text-muted bg-surface-alt"
              >
                {d}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
