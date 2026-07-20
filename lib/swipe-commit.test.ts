import { describe, it, expect } from 'vitest'
import { shouldCommitSwipe, COMMIT_PX, FLICK_VELOCITY, MIN_FLICK_PX } from './swipe-commit'

describe('shouldCommitSwipe', () => {
  it('commits on distance alone, either direction, at any speed', () => {
    expect(shouldCommitSwipe({ dx: COMMIT_PX, velocity: 0 })).toBe('right')
    expect(shouldCommitSwipe({ dx: COMMIT_PX + 40, velocity: 0 })).toBe('right')
    expect(shouldCommitSwipe({ dx: -COMMIT_PX, velocity: 0 })).toBe('left')
  })

  it('springs back on a slow, short drag (below distance AND flick thresholds)', () => {
    expect(shouldCommitSwipe({ dx: 50, velocity: 0.1 })).toBeNull()
    expect(shouldCommitSwipe({ dx: -50, velocity: -0.1 })).toBeNull()
  })

  it('commits a fast flick that is shorter than the distance threshold', () => {
    expect(shouldCommitSwipe({ dx: MIN_FLICK_PX, velocity: FLICK_VELOCITY })).toBe('right')
    expect(shouldCommitSwipe({ dx: -MIN_FLICK_PX, velocity: -FLICK_VELOCITY })).toBe('left')
    expect(shouldCommitSwipe({ dx: 40, velocity: 0.6 })).toBe('right')
  })

  it('does NOT commit a micro-flick below MIN_FLICK_PX even when fast', () => {
    expect(shouldCommitSwipe({ dx: MIN_FLICK_PX - 1, velocity: 0.9 })).toBeNull()
    expect(shouldCommitSwipe({ dx: -(MIN_FLICK_PX - 1), velocity: -0.9 })).toBeNull()
  })

  it('does NOT commit when the flick direction disagrees with the drag (late reversal)', () => {
    // dragged right a bit, but flicked left at release → ambiguous, spring back
    expect(shouldCommitSwipe({ dx: 40, velocity: -0.9 })).toBeNull()
    expect(shouldCommitSwipe({ dx: -40, velocity: 0.9 })).toBeNull()
  })
})
