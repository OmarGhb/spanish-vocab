'use client'

import { useRef, useState, type PointerEvent as ReactPointerEvent, type MouseEvent } from 'react'
import { Trash2 } from 'lucide-react'
import { clampOffset, resolveSnap, exceedsTapSlop, DRAWER_WIDTH } from '@/lib/swipe-row'
import { isDue, type WordCard } from '@/lib/word-status'
import { resolveChrome, WORDS_CHROME, type ImmersionMode } from '@/lib/immersion'
import WordRow from '../WordRow'

type Props = {
  id: string
  word: string
  defEs: string
  card: WordCard | null
  mode?: ImmersionMode
  isOpen: boolean
  onOpen: () => void
  onClose: () => void
  onDelete: () => void
}

// Reveal-and-tap swipe row (board §06). The row + the Supprimer panel form ONE
// continuous clipped rounded rectangle (overflow-hidden): an inner flex track holds
// the borderless WordRow (full width) + the flush terracotta panel, and the track
// translates left to reveal the panel — same top/bottom edges, full row height, a
// straight word→Supprimer junction, no gap/inset/corner mismatch. Snap math lives in
// lib/swipe-row.ts. The clipped container supplies the single border (tinted on À
// réviser rows, matching SELECTION_PERSISTENT).
export default function SwipeRow({
  id,
  word,
  defEs,
  card,
  mode = 'fr_es',
  isOpen,
  onOpen,
  onClose,
  onDelete,
}: Props) {
  const [dx, setDx] = useState(0)
  const [dragging, setDragging] = useState(false)
  const [dragBase, setDragBase] = useState(0)
  const startX = useRef(0)
  const draggingRef = useRef(false)
  const movedRef = useRef(false)
  // Pointer capture is acquired LAZILY, only once the drag crosses the slop —
  // never on pointerdown. Capturing on the foreground <div> (the <a>'s ancestor)
  // retargets the desktop mouse `click` to the div, so a clean click never
  // reaches the inner Link. capturedRef tracks whether we hold capture to release.
  const capturedRef = useRef(false)

  const offset = dragging ? clampOffset(dragBase + dx) : isOpen ? -DRAWER_WIDTH : 0
  const action = isDue(card)

  function handleDown(e: ReactPointerEvent) {
    draggingRef.current = true
    movedRef.current = false
    capturedRef.current = false
    setDragging(true)
    setDragBase(isOpen ? -DRAWER_WIDTH : 0)
    setDx(0)
    startX.current = e.clientX
  }

  function handleMove(e: ReactPointerEvent) {
    if (!draggingRef.current) return
    const delta = e.clientX - startX.current
    if (!movedRef.current && exceedsTapSlop(delta)) {
      movedRef.current = true
      // Acquire capture now so the drag survives the pointer leaving the row.
      e.currentTarget.setPointerCapture(e.pointerId)
      capturedRef.current = true
    }
    setDx(delta)
  }

  function handleUp(e: ReactPointerEvent) {
    if (!draggingRef.current) return
    draggingRef.current = false
    setDragging(false)
    if (capturedRef.current) {
      e.currentTarget.releasePointerCapture(e.pointerId)
      capturedRef.current = false
    }
    const snapped = resolveSnap(dragBase, dx)
    setDx(0)
    if (snapped === -DRAWER_WIDTH) onOpen()
    else onClose()
  }

  // Capture-phase click guard: a drag never navigates; while open, a tap closes
  // instead of navigating (Next's Link bails when defaultPrevented).
  function handleClickCapture(e: MouseEvent) {
    if (movedRef.current) {
      e.preventDefault()
      movedRef.current = false
      return
    }
    if (isOpen) {
      e.preventDefault()
      onClose()
    }
  }

  return (
    <li
      className={`relative overflow-hidden rounded-card border ${
        action ? 'border-tinted-border' : 'border-line'
      }`}
      data-swipe-open={isOpen ? 'true' : undefined}
    >
      {/* One continuous track: borderless row (full width) + flush Supprimer panel. */}
      <div
        onPointerDown={handleDown}
        onPointerMove={handleMove}
        onPointerUp={handleUp}
        onPointerCancel={handleUp}
        onClickCapture={handleClickCapture}
        style={{
          transform: `translateX(${offset}px)`,
          transition: dragging ? 'none' : 'transform 0.22s ease-out',
          touchAction: 'pan-y',
        }}
        className="flex"
      >
        <div className="w-full shrink-0">
          <WordRow id={id} word={word} defEs={defEs} card={card} mode={mode} asListItem={false} flush />
        </div>
        {/* Destructive panel — flush, full height, terracotta variant (rare). */}
        <button
          type="button"
          onClick={onDelete}
          aria-label={`${resolveChrome(WORDS_CHROME.delete, mode)} ${word}`}
          style={{ width: DRAWER_WIDTH }}
          className="shrink-0 flex flex-col items-center justify-center gap-1 border-l-[1.5px] border-err bg-err-bg text-terra-ink text-[13px] font-semibold"
        >
          <Trash2 size={19} />
          {resolveChrome(WORDS_CHROME.delete, mode)}
        </button>
      </div>
    </li>
  )
}
