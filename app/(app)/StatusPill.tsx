import { getWordStatus, type WordCard } from '@/lib/word-status'
import { resolveChrome, STATUS_CHROME, type ImmersionMode } from '@/lib/immersion'

// §06 (board "Mots" cluster) — the ACTION pill. Two axes, by design: this pill is
// "what action", the separate MasteryGauge is "how well known".
//
// PRESENTATION-ONLY label-map collapse over the unchanged 6-band getWordStatus:
//   • À réviser / À rappeler (Relearning) → the ONE loud amber pill "À réviser"
//     (folding Relearning in removes the last terracotta status text — terracotta
//      stays destructive-only per the locked v2 system).
//   • En cours + En apprentissage          → merged neutral "En cours" pill
//     (both bands stay distinct underneath; the gauge carries the difference).
//   • Nouveau                              → neutral pill.
//   • Mémorisé                             → sage pill (the only sage usage here).
// The model, bands, getWordStatus, and isMemorized are untouched — this maps that
// module's output label to a pill kind + style.
type PillKind = 'review' | 'progress' | 'new' | 'memorise'

const PILL_FROM_LABEL: Record<string, PillKind> = {
  'À réviser': 'review',
  'À rappeler': 'review', // Relearning folds into the action pill
  'En cours': 'progress',
  'En apprentissage': 'progress', // merged label collapse
  Nouveau: 'new',
  Mémorisé: 'memorise',
}

// The displayed label per kind is now mode-aware (STATUS_CHROME); only the style stays here.
const PILL_STYLE: Record<PillKind, string> = {
  // The one loud pill — amber fill, ivory text (its row card also gets the crème+ tint).
  review: 'bg-accent text-ivory border border-accent',
  // Neutral (sépia) — new / in-progress.
  progress: 'bg-card text-muted border border-line',
  new: 'bg-card text-muted border border-line',
  // Sage — mastered.
  memorise: 'bg-ok-bg text-sage-ink border border-sage-border',
}

export default function StatusPill({
  card,
  className = '',
  mode = 'fr_es',
}: {
  card: WordCard | null
  className?: string
  mode?: ImmersionMode
}) {
  const kind = PILL_FROM_LABEL[getWordStatus(card).label] ?? 'new'
  const cls = PILL_STYLE[kind]
  const label = resolveChrome(STATUS_CHROME[kind], mode)
  return (
    <span
      className={`inline-flex items-center text-[10.5px] font-semibold uppercase tracking-[0.06em] px-2.5 py-1 rounded-full whitespace-nowrap ${cls}${
        className ? ` ${className}` : ''
      }`}
    >
      {label}
    </span>
  )
}
