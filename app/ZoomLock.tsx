'use client'

import { useEffect } from 'react'

// iOS Safari (and iOS Chrome) persist the last pinch-zoom per site and sometimes land
// a fresh load above 100%. Re-asserting the viewport meta after load clamps the scale
// back to 1 (setting maximum-scale=1 forces WebKit to snap a stuck zoom down) and
// unsticks devices that already saved a zoomed state. Runs on first paint and on
// pageshow (covers bfcache restores) + orientation changes.
const VIEWPORT = 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no'

export default function ZoomLock() {
  useEffect(() => {
    const meta = document.querySelector('meta[name="viewport"]')
    if (!(meta instanceof HTMLMetaElement)) return

    let raf = 0
    const snap = () => {
      // Clear then re-set so the attribute genuinely changes — re-setting an identical
      // string is a no-op and won't trigger WebKit to re-evaluate the scale.
      meta.setAttribute('content', '')
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => meta.setAttribute('content', VIEWPORT))
    }

    snap()
    window.addEventListener('pageshow', snap)
    window.addEventListener('orientationchange', snap)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('pageshow', snap)
      window.removeEventListener('orientationchange', snap)
    }
  }, [])

  return null
}
