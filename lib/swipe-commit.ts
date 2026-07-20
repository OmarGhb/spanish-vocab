// Swipe-commit decision for the shared SwipeCard primitive (discovery deck + onboarding first-swipe).
// Pure + unit-tested so the tuning values live in ONE place and can be adjusted without touching the
// component. Touch-feel: expect a device-tuning round — change a constant here and retest.
//
// ── TUNING KNOBS ────────────────────────────────────────────────────────────────────────────────
// A release commits the swipe when the card has traveled far enough, OR when it's a fast flick (so a
// quick, short, comfortable flick commits too — the old distance-only 90px felt stiff).
export const COMMIT_PX = 70 // travel (px) past which a release commits, at any speed
export const FLICK_VELOCITY = 0.5 // flick speed (px per ms; ~500 px/s) that commits a shorter drag
export const MIN_FLICK_PX = 30 // ...but a flick still needs at least this much travel (ignore jitter)

// Decide the outcome of a release. `dx` = signed horizontal travel (px, + = right). `velocity` =
// signed recent pointer velocity (px/ms, + = moving right). Returns the swipe direction to commit, or
// null to spring back. A flick only counts when its direction AGREES with the drag (guards against a
// fast reversal at release).
export function shouldCommitSwipe({ dx, velocity }: { dx: number; velocity: number }): 'left' | 'right' | null {
  // Distance commit — either direction, any speed.
  if (dx >= COMMIT_PX) return 'right'
  if (dx <= -COMMIT_PX) return 'left'
  // Flick commit — fast enough, enough travel, and velocity agrees with the drag direction.
  if (velocity >= FLICK_VELOCITY && dx >= MIN_FLICK_PX) return 'right'
  if (velocity <= -FLICK_VELOCITY && dx <= -MIN_FLICK_PX) return 'left'
  return null
}
