'use client'

// Reusable frame-5 conjugation grid (M5.3b). Presentation only — it receives a fully-computed
// ConjugationGrid object (built by lib/conjugation-grid.ts) and renders it; no logic here. Mounted
// by the /add lemma interstitial in this slice; the later /review Astuce slice mounts the same
// component. Layout from mockup A's grille: titled card + 2-col / 3-row paradigm, typed cell in amber.

import type { ConjugationGrid as ConjugationGridData } from '@/lib/conjugation-grid'

export default function ConjugationGrid({ grid }: { grid: ConjugationGridData }) {
  return (
    <div className="bg-card border border-line rounded-card overflow-hidden">
      <div className="flex items-baseline justify-between px-4 py-2.5 bg-surface-alt">
        <span className="text-[10px] font-bold uppercase tracking-widest text-muted">
          {grid.labelEs}
        </span>
        <span className="text-xs italic text-muted">· {grid.glossFr}</span>
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
            <span
              className={`font-serif text-sm ${
                cell.highlighted ? 'font-bold text-accent' : 'text-ink'
              }`}
            >
              {cell.surface}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
