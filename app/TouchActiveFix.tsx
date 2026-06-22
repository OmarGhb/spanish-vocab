'use client'

import { useEffect } from 'react'

// iOS Safari applies :active styles on TAP only when a touchstart listener exists on the tapped
// element or an ancestor — without one, the M5.7 CSS press-* feedback is silent on iPhone even
// with `cursor: pointer` (which fires :active on desktop but not reliably on iOS). A single empty,
// passive, document-level listener enables :active document-wide for every descendant. No-op on
// desktop; harmless (passive — never calls preventDefault, so it can't affect scrolling).
export default function TouchActiveFix() {
  useEffect(() => {
    const noop = () => {}
    document.addEventListener('touchstart', noop, { passive: true })
    return () => document.removeEventListener('touchstart', noop)
  }, [])
  return null
}
