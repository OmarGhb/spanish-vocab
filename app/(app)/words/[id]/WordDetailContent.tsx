'use client'

import { useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'

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

// Board §06 reveal toggle: amber underlined text link with a chevron, toggles BOTH
// ways (closed → "Voir en français" / "Traduction" + down chevron; open → "Masquer …"
// + up chevron). The FR text (Lora italic sépia) sits above the toggle when open.
function TextLink({
  open,
  onClick,
  children,
}: {
  open: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-accent underline underline-offset-[3px]"
    >
      {open ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
      {children}
    </button>
  )
}

function Card({ eyebrow, children }: { eyebrow: string; children: React.ReactNode }) {
  return (
    <div className="bg-card border border-line rounded-[16px] shadow-card p-[18px]">
      <p className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-muted mb-3">{eyebrow}</p>
      {children}
    </div>
  )
}

export default function WordDetailContent({ defEs, defFr, formAnnotation, examples, distractors }: Props) {
  const [revealedDefFr, setRevealedDefFr] = useState(false)
  const [revealedFr, setRevealedFr] = useState<boolean[]>(() => new Array(examples.length).fill(false))

  function toggleFr(i: number) {
    setRevealedFr((prev) => prev.map((v, j) => (j === i ? !v : v)))
  }

  return (
    <div className="flex flex-col gap-3.5">
      {/* FORME */}
      {formAnnotation && (
        <Card eyebrow="Forme">
          <p className="font-serif text-base text-ink leading-relaxed">{formAnnotation}</p>
        </Card>
      )}

      {/* DÉFINITION */}
      {(defEs || defFr) && (
        <Card eyebrow="Définition">
          <p className="font-serif text-[17px] text-ink leading-relaxed">{defEs}</p>
          {defFr && (
            <>
              {revealedDefFr && (
                <p className="font-serif italic text-[15px] text-muted leading-relaxed mt-3 pt-3 border-t border-border-soft">
                  {defFr}
                </p>
              )}
              <div className="mt-3">
                <TextLink open={revealedDefFr} onClick={() => setRevealedDefFr((v) => !v)}>
                  {revealedDefFr ? 'Masquer le français' : 'Voir en français'}
                </TextLink>
              </div>
            </>
          )}
        </Card>
      )}

      {/* EXEMPLES */}
      {examples.length > 0 && (
        <Card eyebrow="Exemples">
          <ul className="flex flex-col">
            {examples.map((ex, i) => (
              <li key={i} className={i > 0 ? 'pt-3.5 mt-3.5 border-t border-border-soft' : ''}>
                <p className="font-serif text-base text-ink leading-relaxed">{ex.es}</p>
                {revealedFr[i] && (
                  <p className="font-serif italic text-[14.5px] text-muted leading-relaxed mt-2">{ex.fr}</p>
                )}
                <div className="mt-2.5">
                  <TextLink open={revealedFr[i]} onClick={() => toggleFr(i)}>
                    {revealedFr[i] ? 'Masquer la traduction' : 'Traduction'}
                  </TextLink>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {/* MOTS SIMILAIRES — these are MCQ confusables (the `distractors` field), NOT
          true family words, so the honest label stays "Mots similaires" (the board's
          "Mots de la même famille" would mislabel the data). */}
      {distractors.length > 0 && (
        <Card eyebrow="Mots similaires">
          <div className="flex flex-wrap gap-2">
            {distractors.map((d) => (
              <span
                key={d}
                className="inline-flex whitespace-nowrap text-[11px] font-bold uppercase tracking-[0.06em] px-3.5 py-[7px] rounded-full border border-tinted-border bg-surface-alt text-muted"
              >
                {d}
              </span>
            ))}
          </div>
        </Card>
      )}
    </div>
  )
}
