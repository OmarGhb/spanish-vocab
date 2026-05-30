'use client'

import { useRef, useState, type ReactNode, type PointerEvent } from 'react'

type Props = {
  onSwipeLeft: () => void
  onSwipeRight: () => void
  /** Overlay shown while dragging right (e.g. a "keep" stamp); opacity tracks distance. */
  rightStamp?: ReactNode
  /** Overlay shown while dragging left; opacity tracks distance. */
  leftStamp?: ReactNode
  /** Disable interaction (e.g. while the card flings off, or for a behind-stack card). */
  disabled?: boolean
  /** Extra classes on the draggable root (e.g. sizing the card to fill its area). */
  className?: string
  children: ReactNode
}

const COMMIT_PX = 90 // drag distance past which release commits a swipe
const FLING_PX = 600 // how far the card travels when flung off-screen

// Generic horizontal swipe primitive: drag with tilt, threshold commit, stamp feedback,
// and onSwipeLeft / onSwipeRight callbacks. Pointer events cover touch + mouse. Reused by
// the discovery deck now and the backlog swipe-to-delete later.
export default function SwipeCard({
  onSwipeLeft,
  onSwipeRight,
  rightStamp,
  leftStamp,
  disabled = false,
  className,
  children,
}: Props) {
  const [dx, setDx] = useState(0)
  const [animating, setAnimating] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const startX = useRef(0)
  const dragging = useRef(false)

  function handleDown(e: PointerEvent) {
    if (disabled || animating) return
    dragging.current = true
    setIsDragging(true)
    startX.current = e.clientX
    e.currentTarget.setPointerCapture(e.pointerId)
  }

  function handleMove(e: PointerEvent) {
    if (!dragging.current) return
    setDx(e.clientX - startX.current)
  }

  function fling(direction: 1 | -1, onDone: () => void) {
    setAnimating(true)
    setDx(direction * FLING_PX)
    window.setTimeout(() => onDone(), 220)
  }

  function handleUp(e: PointerEvent) {
    if (!dragging.current) return
    dragging.current = false
    setIsDragging(false)
    e.currentTarget.releasePointerCapture(e.pointerId)
    if (dx >= COMMIT_PX) {
      fling(1, onSwipeRight)
    } else if (dx <= -COMMIT_PX) {
      fling(-1, onSwipeLeft)
    } else {
      setDx(0) // spring back
    }
  }

  const rotate = dx / 18 // gentle tilt
  const rightOpacity = Math.min(Math.max(dx / COMMIT_PX, 0), 1)
  const leftOpacity = Math.min(Math.max(-dx / COMMIT_PX, 0), 1)
  // Spring-back and fling are animated; live dragging is not (follows the finger 1:1).
  const transition = isDragging ? 'none' : 'transform 0.22s ease-out'

  return (
    <div
      onPointerDown={handleDown}
      onPointerMove={handleMove}
      onPointerUp={handleUp}
      onPointerCancel={handleUp}
      style={{
        transform: `translateX(${dx}px) rotate(${rotate}deg)`,
        transition,
        touchAction: 'pan-y',
      }}
      className={`relative select-none touch-none ${className ?? ''}`}
    >
      {rightStamp !== undefined && (
        <div
          className="pointer-events-none absolute left-5 top-5 z-10 -rotate-12"
          style={{ opacity: rightOpacity }}
        >
          {rightStamp}
        </div>
      )}
      {leftStamp !== undefined && (
        <div
          className="pointer-events-none absolute right-5 top-5 z-10 rotate-12"
          style={{ opacity: leftOpacity }}
        >
          {leftStamp}
        </div>
      )}
      {children}
    </div>
  )
}
