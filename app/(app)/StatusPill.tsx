import { getWordStatus, type WordCard } from '@/lib/word-status'

// Single shared status-pill renderer. The state→label→token mapping lives only
// in getWordStatus — every surface (detail, list, home preview) renders through
// this component so they can never drift apart again.
export default function StatusPill({
  card,
  className = '',
}: {
  card: WordCard | null
  className?: string
}) {
  const pill = getWordStatus(card)
  return (
    <span
      className={`text-[10px] font-semibold uppercase tracking-widest px-2.5 py-1 rounded-full ${pill.cls}${
        className ? ` ${className}` : ''
      }`}
    >
      {pill.label}
    </span>
  )
}
