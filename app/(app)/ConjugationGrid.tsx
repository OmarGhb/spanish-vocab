'use client'

// Reusable frame-5 conjugation grid (M5.3b). Presentation only — it receives a fully-computed
// ConjugationGrid object (built by lib/conjugation-grid.ts) and renders it; no logic here. Mounted
// by the /add lemma interstitial in this slice; the later /review Astuce slice mounts the same
// component. Layout from mockup A's grille: titled card + 2-col / 3-row paradigm, typed cell in amber.

import type { ConjugationGrid as ConjugationGridData } from '@/lib/conjugation-grid'

// Presentation only — receives a fully-computed grid (lib/conjugation-grid.ts). Three review uses
// (M5.5f) via opt-in props (omitted by /add + drill → identical to before):
//   • blankTarget — Indice 2: the highlighted cell renders an amber underline (pattern-completion).
//   • infinitive  — names the verb in the header (the écriture tier-1 pill carries no infinitive).
export default function ConjugationGrid({
  grid,
  blankTarget = false,
  infinitive,
}: {
  grid: ConjugationGridData
  blankTarget?: boolean
  infinitive?: string
}) {
  return (
    <div className="bg-card border border-line rounded-card overflow-hidden">
      <div className="flex items-baseline justify-between px-4 py-2.5 bg-surface-alt">
        {infinitive ? (
          <>
            <span className="font-serif text-sm font-bold italic text-ink">{infinitive}</span>
            <span className="text-[10px] font-bold uppercase tracking-widest text-muted">{grid.labelEs}</span>
          </>
        ) : (
          <>
            <span className="text-[10px] font-bold uppercase tracking-widest text-muted">{grid.labelEs}</span>
            <span className="text-xs italic text-muted">· {grid.glossFr}</span>
          </>
        )}
      </div>
      <div className="grid grid-cols-2">
        {grid.cells.map((cell, i) => (
          <div
            key={cell.person}
            className={`flex items-baseline justify-between gap-2 px-4 py-2.5 border-t border-line ${
              i % 2 === 0 ? 'border-r' : ''
            } ${cell.highlighted ? 'bg-tint' : ''}`}
          >
            <span className="text-xs italic text-muted">{cell.personLabel}</span>
            {blankTarget && cell.highlighted ? (
              <span className="inline-block w-12 border-b-2 border-accent" aria-label="à compléter" />
            ) : (
              <span className={`font-serif text-sm ${cell.highlighted ? 'font-bold text-accent' : 'text-ink'}`}>
                {cell.surface}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
