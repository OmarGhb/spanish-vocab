'use client'

import { useRef, useState, type ReactNode, type PointerEvent } from 'react'
import { shouldCommitSwipe, COMMIT_PX } from '@/lib/swipe-commit'

type Props = {
  onSwipeLeft: () => void
  onSwipeRight: () => void
  /** Overlay shown while dragging right (e.g. a "keep" stamp); opacity tracks distance. */
  rightStamp?: ReactNode
  /** Overlay shown while dragging left; opacity tracks distance. */
  leftStamp?: ReactNode
  /** Full-card color wash (CSS color) painted while dragging right/left; opacity tracks distance. */
  rightWash?: string
  leftWash?: string
  /** Raise the card with --shadow-lift while it's being dragged (the §3a "lifted" treatment). */
  lift?: boolean
  /** Disable interaction (e.g. while the card flings off, or for a behind-stack card). */
  disabled?: boolean
  /** Extra classes on the draggable root (e.g. sizing the card to fill its area). */
  className?: string
  children: ReactNode
}

// COMMIT_PX + the flick thresholds live in lib/swipe-commit.ts (tunable in one place).
const FLING_PX = 600 // how far the card travels when flung off-screen

// Generic horizontal swipe primitive: drag with tilt, threshold commit, stamp feedback,
// and onSwipeLeft / onSwipeRight callbacks. Pointer events cover touch + mouse. Reused by
// the discovery deck now and the backlog swipe-to-delete later.
export default function SwipeCard({
  onSwipeLeft,
  onSwipeRight,
  rightStamp,
  leftStamp,
  rightWash,
  leftWash,
  lift = false,
  disabled = false,
  className,
  children,
}: Props) {
  const [dx, setDx] = useState(0)
  const [animating, setAnimating] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const startX = useRef(0)
  const pointerDown = useRef(false)
  const captured = useRef(false)
  // Recent pointer velocity (px/ms, signed) for the flick-commit path — a smoothed instantaneous
  // value so a single jittery sample can't dominate the release decision.
  const velocity = useRef(0)
  const lastX = useRef(0)
  const lastT = useRef(0)

  // Distance the pointer must travel before we treat it as a drag. Below this, the interaction stays a
  // TAP: we never capture the pointer, so the click falls through to children (e.g. TapReveal's button).
  const DRAG_THRESHOLD = 6

  function handleDown(e: PointerEvent) {
    if (disabled || animating) return
    pointerDown.current = true
    captured.current = false
    startX.current = e.clientX
    // Deliberately NOT capturing here — capturing on down would retarget the click and kill taps.
  }

  function handleMove(e: PointerEvent) {
    if (!pointerDown.current) return
    const delta = e.clientX - startX.current
    if (!captured.current) {
      if (Math.abs(delta) <= DRAG_THRESHOLD) return // still a tap — don't capture, don't move
      captured.current = true
      setIsDragging(true)
      e.currentTarget.setPointerCapture(e.pointerId)
      // Reset the velocity baseline at capture start so the initial jump isn't read as a flick.
      lastX.current = e.clientX
      lastT.current = e.timeStamp
      velocity.current = 0
    } else {
      const dt = e.timeStamp - lastT.current
      if (dt > 0) {
        const instant = (e.clientX - lastX.current) / dt
        velocity.current = velocity.current * 0.4 + instant * 0.6 // light smoothing, recent-weighted
      }
      lastX.current = e.clientX
      lastT.current = e.timeStamp
    }
    setDx(delta)
  }

  function fling(direction: 1 | -1, onDone: () => void) {
    setAnimating(true)
    setDx(direction * FLING_PX)
    window.setTimeout(() => onDone(), 220)
  }

  function handleUp(e: PointerEvent) {
    if (!pointerDown.current) return
    pointerDown.current = false
    // A tap (never captured) → do nothing, let the click reach children (TapReveal).
    if (!captured.current) return
    captured.current = false
    setIsDragging(false)
    e.currentTarget.releasePointerCapture(e.pointerId)
    // Commit on distance OR a fast flick (see lib/swipe-commit.ts); else spring back.
    const decision = shouldCommitSwipe({ dx, velocity: velocity.current })
    if (decision === 'right') {
      fling(1, onSwipeRight)
    } else if (decision === 'left') {
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
      className={`relative select-none touch-none ${
        lift && isDragging ? 'shadow-lift rounded-[20px]' : ''
      } ${className ?? ''}`}
    >
      {children}
      {/* Full-card color washes (above the card, below the stamps) — §3a swipe-choice treatment.
          rounded-[20px] matches the discovery card (this primitive's only consumer). */}
      {rightWash !== undefined && (
        <div
          className="pointer-events-none absolute inset-0 rounded-[20px]"
          style={{ background: rightWash, opacity: rightOpacity }}
          aria-hidden
        />
      )}
      {leftWash !== undefined && (
        <div
          className="pointer-events-none absolute inset-0 rounded-[20px]"
          style={{ background: leftWash, opacity: leftOpacity }}
          aria-hidden
        />
      )}
      {/* Stamps — board placement: right-swipe stamp top-right (−11°), left-swipe top-left (+11°). */}
      {rightStamp !== undefined && (
        <div
          className="pointer-events-none absolute right-5 top-6 z-10 rotate-[-11deg]"
          style={{ opacity: rightOpacity }}
        >
          {rightStamp}
        </div>
      )}
      {leftStamp !== undefined && (
        <div
          className="pointer-events-none absolute left-5 top-6 z-10 rotate-[11deg]"
          style={{ opacity: leftOpacity }}
        >
          {leftStamp}
        </div>
      )}
    </div>
  )
}
