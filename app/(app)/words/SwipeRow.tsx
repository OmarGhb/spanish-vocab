'use client'

import { useRef, useState, type PointerEvent as ReactPointerEvent, type MouseEvent } from 'react'
import { Trash2 } from 'lucide-react'
import { clampOffset, resolveSnap, exceedsTapSlop, DRAWER_WIDTH } from '@/lib/swipe-row'
import type { WordCard } from '@/lib/word-status'
import WordRow from '../WordRow'

type Props = {
  id: string
  word: string
  defEs: string
  card: WordCard | null
  reps: number
  isOpen: boolean
  onOpen: () => void
  onClose: () => void
  onDelete: () => void
}

// Reveal-and-tap swipe row: drag left to reveal a red "Supprimer" drawer, snap
// open/closed past a threshold, tap the drawer to commit. WRAPS the existing
// WordRow (content unchanged) — WordRow renders without its own <li> so this one
// supplies it. Pure snap math lives in lib/swipe-row.ts.
export default function SwipeRow({
  id,
  word,
  defEs,
  card,
  reps,
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
      className="relative overflow-hidden rounded-card"
      data-swipe-open={isOpen ? 'true' : undefined}
    >
      {/* Drawer behind the row */}
      <div className="absolute inset-y-0 right-0 flex" style={{ width: DRAWER_WIDTH }}>
        <button
          type="button"
          onClick={onDelete}
          aria-label={`Supprimer ${word}`}
          className="flex-1 flex flex-col items-center justify-center gap-0.5 bg-err text-white text-[11px] font-semibold"
        >
          <Trash2 size={18} />
          Supprimer
        </button>
      </div>
      {/* Foreground row */}
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
        className="relative"
      >
        <WordRow id={id} word={word} defEs={defEs} card={card} reps={reps} asListItem={false} />
      </div>
    </li>
  )
}
