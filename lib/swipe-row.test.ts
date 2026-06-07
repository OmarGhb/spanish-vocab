import { describe, it, expect } from 'vitest'
import {
  clampOffset,
  resolveSnap,
  exceedsTapSlop,
  DRAWER_WIDTH,
  OPEN_THRESHOLD,
  TAP_SLOP_PX,
} from './swipe-row'

describe('clampOffset', () => {
  it('clamps a rightward (positive) drag to 0 — only left reveals the drawer', () => {
    expect(clampOffset(40)).toBe(0)
  })

  it('clamps past the drawer width', () => {
    expect(clampOffset(-(DRAWER_WIDTH + 50))).toBe(-DRAWER_WIDTH)
  })

  it('passes a mid-range left offset through', () => {
    expect(clampOffset(-30)).toBe(-30)
  })
})

describe('resolveSnap', () => {
  it('a small left drag from closed snaps back closed', () => {
    expect(resolveSnap(0, -(OPEN_THRESHOLD - 1))).toBe(0)
  })

  it('a left drag past the threshold from closed snaps open', () => {
    expect(resolveSnap(0, -OPEN_THRESHOLD)).toBe(-DRAWER_WIDTH)
  })

  it('a tiny rightward nudge from open stays open', () => {
    expect(resolveSnap(-DRAWER_WIDTH, 10)).toBe(-DRAWER_WIDTH)
  })

  it('a large rightward drag from open snaps closed', () => {
    // start -88, +60 → -28 reveal → below threshold → closed
    expect(resolveSnap(-DRAWER_WIDTH, 60)).toBe(0)
  })

  it('over-dragging left is clamped before the threshold test', () => {
    expect(resolveSnap(0, -500)).toBe(-DRAWER_WIDTH)
  })
})

describe('exceedsTapSlop', () => {
  it('treats no movement as a tap', () => {
    expect(exceedsTapSlop(0)).toBe(false)
  })

  it('stays a tap up to and including the slop', () => {
    expect(exceedsTapSlop(TAP_SLOP_PX - 1)).toBe(false)
    expect(exceedsTapSlop(TAP_SLOP_PX)).toBe(false)
  })

  it('becomes a drag past the slop, in either direction', () => {
    expect(exceedsTapSlop(TAP_SLOP_PX + 1)).toBe(true)
    expect(exceedsTapSlop(-(TAP_SLOP_PX + 1))).toBe(true)
  })

  it('honours a custom slop', () => {
    expect(exceedsTapSlop(8, 10)).toBe(false)
    expect(exceedsTapSlop(11, 10)).toBe(true)
  })
})
