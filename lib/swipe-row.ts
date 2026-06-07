// Pure snap math for the /words swipe-to-reveal row. Kept out of the stateful
// SwipeRow component (the chooseQcmCue / resultHintExample lesson).

// Width of the revealed "Supprimer" drawer, in px.
export const DRAWER_WIDTH = 88
// Reveal depth (px) past which releasing snaps the drawer open; below it snaps closed.
export const OPEN_THRESHOLD = 44
// Horizontal movement (px) past which a pointer interaction counts as a drag, not a tap.
export const TAP_SLOP_PX = 6

// Whether a horizontal delta has crossed the tap-slop, i.e. this is a drag (not a
// tap). Drives the lazy pointer-capture acquisition + click suppression in SwipeRow.
export function exceedsTapSlop(deltaX: number, slop: number = TAP_SLOP_PX): boolean {
  return Math.abs(deltaX) > slop
}

// Clamp a raw horizontal offset to the legal range: only a LEFT drag (negative)
// reveals the drawer, and never further than its width.
export function clampOffset(raw: number, drawerWidth: number = DRAWER_WIDTH): number {
  if (raw > 0) return 0
  if (raw < -drawerWidth) return -drawerWidth
  return raw
}

// Given the offset the row started the drag at and the drag delta, decide the
// resting offset: fully open (-drawerWidth) or closed (0). The decision keys on
// the resulting reveal depth vs the threshold — so it works the same whether the
// drag started from a closed (0) or already-open (-drawerWidth) row.
export function resolveSnap(
  startOffset: number,
  dx: number,
  drawerWidth: number = DRAWER_WIDTH,
  openThreshold: number = OPEN_THRESHOLD,
): number {
  const reveal = -clampOffset(startOffset + dx, drawerWidth) // 0..drawerWidth
  return reveal >= openThreshold ? -drawerWidth : 0
}
