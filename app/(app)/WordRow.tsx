import Link from 'next/link'
import { isDue, type WordCard } from '@/lib/word-status'
import { SELECTION_PERSISTENT } from './selection'
import StatusPill from './StatusPill'
import MasteryGauge from './MasteryGauge'

// Shared list row (board §06), used by /words and the Home preview. Anatomy, every row:
//   [7px leading dot] · [word + italic gloss] · [status pill ▸ 4-dot gauge].
// Two scannable axes: the pill = action, the gauge = mastery. The right cluster stacks
// vertically and is right-aligned in the row, but within it the gauge is centered UNDER
// the pill (align-items center — the pill is wider than the dots). The crème+ tint (via
// SELECTION_PERSISTENT) + amber leading dot appear ONLY on À réviser rows. No reps line —
// the revision count lives on the detail only (it's detail-grain, and the gauge already
// carries "how worked-in").
export default function WordRow({
  id,
  word,
  defEs,
  card,
  asListItem = true,
  flush = false,
}: {
  // Optional: when absent the row renders as a non-link <div> (same anatomy). Used by
  // the add-flow ⑥ multi-success screen, where the similaire words are still being
  // created in the background and have no /words/[id] yet. Reuse, not a parallel row.
  id?: string
  word: string
  defEs: string
  card: WordCard | null
  // When false, render just the row <Link> without its own <li> wrapper, so a
  // caller (e.g. SwipeRow) can supply the list item and avoid nested <li>.
  asListItem?: boolean
  // When true, drop the row's own border + radius (just the fill) so a wrapping
  // swipe container can supply ONE clipped rounded rectangle flush with the
  // Supprimer panel. The container's border (tinted-border / line) + this fill
  // together reconstruct the SELECTION_PERSISTENT treatment.
  flush?: boolean
}) {
  const action = isDue(card)
  const wrapperCls = flush
    ? `${action ? 'bg-surface-alt' : 'bg-card'}`
    : `rounded-card border ${action ? SELECTION_PERSISTENT : 'bg-card border-line'}`
  const inner = (
    <>
      <span
        className={`w-[7px] h-[7px] rounded-full shrink-0 ${action ? 'bg-accent' : 'bg-border-soft'}`}
        aria-hidden
      />
      <div className="flex-1 min-w-0">
        <p className="font-serif text-lg font-bold text-ink leading-none tracking-[-0.01em]">{word}</p>
        {defEs && <p className="font-serif text-[13px] text-muted italic mt-[3px] line-clamp-1">{defEs}</p>}
      </div>
      <div className="flex flex-col items-center gap-2 shrink-0">
        <StatusPill card={card} />
        <MasteryGauge card={card} />
      </div>
    </>
  )
  const cls = `flex items-center gap-3 px-3.5 py-3 ${wrapperCls}`
  const row = id ? (
    <Link href={`/words/${id}`} className={cls}>
      {inner}
    </Link>
  ) : (
    <div className={cls}>{inner}</div>
  )
  return asListItem ? <li>{row}</li> : row
}
